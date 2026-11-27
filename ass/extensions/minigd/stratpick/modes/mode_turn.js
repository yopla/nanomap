(function () {
  "use strict";
  const SP = window.StratPick = window.StratPick || {};
  SP.modes = SP.modes || {};

  const TB_COLS = 9, TB_ROWS = 10;
  const TB_DIRS = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
  const TB_ALL_DIRS = [
    { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
    { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }
  ];
  const TB_PHASE_PLAYER = 0;
  const TB_PHASE_PLAYER_ANIM = 1;
  const TB_PHASE_AUTO_END = 2;
  const TB_PHASE_AI_INTRO = 3;
  const TB_PHASE_AI_TELEGRAPH = 4;
  const TB_PHASE_AI_ANIMATE = 5;
  const TB_PHASE_AI_POST = 6;

  function calcTbHitChance(weapon, d, cfgOverride) {
    const src = cfgOverride || SP.activeParams;
    const curve = src.tb_accuracy_curve || "linear";
    const mult = Number(src.tb_dist_falloff_mult) || 1.0;
    let minP = Number(src.tb_min_hit_chance ?? 10);
    let maxP = Number(src.tb_max_hit_chance ?? 95);
    if (minP > maxP) { const t = minP; minP = maxP; maxP = t; }
    const base = Number(weapon.base_acc ?? 85);
    const opt = Number(weapon.optimal_range ?? 3);
    const fall = Number(weapon.falloff ?? 10) * mult;
    const closePen = Number(weapon.close_penalty ?? 0) * mult;
    const excess = Math.max(0, d - opt);
    const tooClose = Math.max(0, opt - d);
    let acc = base;
    if (curve === "steep") {
      acc = base - (excess * excess * 0.45 + excess * 0.65) * fall - (closePen > 0 ? tooClose * closePen : 0);
    } else if (curve === "optimal_band") {
      const nearPen = Math.max(closePen, fall * 0.65);
      acc = base - excess * fall - tooClose * nearPen;
    } else if (curve === "soft") {
      acc = base - Math.sqrt(excess) * fall * 1.35 - (closePen > 0 ? Math.sqrt(tooClose) * closePen : 0);
    } else {
      acc = base - excess * fall - (closePen > 0 ? tooClose * closePen : 0);
    }
    return Math.round(SP.clamp(acc, minP, maxP));
  }

  function getTbShootCost(weapon) {
    if (SP.activeParams.tb_weapon_custom_cost !== false) {
      return Math.max(1, Number(weapon.shoot_cost ?? 2));
    }
    return Math.max(1, Number(SP.activeParams.tb_shoot_cost ?? 2));
  }

  const tb = {
    running: false,
    ox: 16, oy: 16, tile: 36, gw: 324, gh: 360,
    walls: new Set(),
    units: [],
    turn: 1,
    phase: TB_PHASE_PLAYER,
    phaseTimer: 0,
    apMode: "pool",
    apPoolMax: 6,
    apPerUnitMax: 3,
    apCarry: 0,
    moveCost: 1,
    autoEnd: true,
    diagLimitOne: true,
    aiSpeed: 1.0,
    playerAp: 6,
    aiAp: 6,
    pKills: 0,
    aKills: 0,
    selId: -1,
    tgtId: -1,
    anim: null,
    trails: [],
    particles: [],
    floats: [],
    aiPending: null,
    aiRecent: {},
    aiStatus: "",
    aiActingId: -1
  };

  function tbKey(x, y) { return x + "," + y; }
  function tbInBounds(x, y) { return x >= 0 && x < TB_COLS && y >= 0 && y < TB_ROWS; }
  function tbGridToScreen(gx, gy) { return { x: tb.ox + (gx + 0.5) * tb.tile, y: tb.oy + (gy + 0.5) * tb.tile }; }
  function tbUnitAt(x, y) { return tb.units.find((u) => u.alive && u.gx === x && u.gy === y) || null; }
  function tbUnitById(id) { return tb.units.find((u) => u.id === id) || null; }
  function tbAliveUnits(team) { return tb.units.filter((u) => u.team === team && u.alive).sort((a, b) => a.slot - b.slot); }
  function tbUnitAp(u) { return tb.apMode === "per_unit" ? u.ap : (u.team === SP.TEAM_PLAYER ? tb.playerAp : tb.aiAp); }
  function tbUnitMaxAp() {
    return tb.apMode === "per_unit"
      ? (tb.apCarry > 0 ? tb.apPerUnitMax + tb.apCarry : tb.apPerUnitMax)
      : (tb.apCarry > 0 ? tb.apPoolMax + tb.apCarry : tb.apPoolMax);
  }
  function tbSpendAp(u, cost) {
    if (tb.apMode === "per_unit") u.ap = Math.max(0, u.ap - cost);
    else if (u.team === SP.TEAM_PLAYER) tb.playerAp = Math.max(0, tb.playerAp - cost);
    else tb.aiAp = Math.max(0, tb.aiAp - cost);
  }

  function updateTbGridRect() {
    const st = SP.state;
    const availW = Math.max(st.viewW - 16, 180);
    const availH = Math.max(st.viewH - 16, 200);
    tb.tile = Math.max(22, Math.floor(Math.min(availW / TB_COLS, availH / TB_ROWS)));
    tb.gw = tb.tile * TB_COLS;
    tb.gh = tb.tile * TB_ROWS;
    tb.ox = Math.floor((st.viewW - tb.gw) * 0.5);
    tb.oy = Math.floor((st.viewH - tb.gh) * 0.5);
  }

  function tbVerifyConnectivity() {
    const start = { x: 1, y: 9 };
    const vis = new Set([tbKey(start.x, start.y)]);
    const q = [start];
    let h = 0;
    while (h < q.length) {
      const c = q[h++];
      for (const d of TB_DIRS) {
        const nx = c.x + d.x, ny = c.y + d.y, k = tbKey(nx, ny);
        if (tbInBounds(nx, ny) && !tb.walls.has(k) && !vis.has(k)) {
          vis.add(k); q.push({ x: nx, y: ny });
        }
      }
    }
    const req = [[1,9],[3,9],[5,9],[7,9],[1,0],[3,0],[5,0],[7,0]];
    return req.every(([rx, ry]) => vis.has(tbKey(rx, ry)));
  }

  function generateTbWalls(layoutId) {
    const presetBunker = [[2,2],[6,2],[3,3],[5,3],[1,4],[7,4]];
    const applyHalf = (pts) => {
      tb.walls.clear();
      for (const [x, y] of pts) {
        tb.walls.add(tbKey(x, y));
        tb.walls.add(tbKey(x, TB_ROWS - 1 - y));
      }
    };
    if (layoutId === "corridors") {
      applyHalf([[1,2],[2,2],[6,2],[7,2],[3,4],[4,4],[5,4]]);
    } else if (layoutId === "arena") {
      applyHalf([[4,2],[1,3],[7,3],[3,4],[5,4]]);
    } else if (layoutId === "random") {
      let ok = false;
      for (let att = 0; att < 25; att++) {
        tb.walls.clear();
        const cands = [];
        for (let y = 2; y <= 4; y++) for (let x = 0; x < TB_COLS; x++) cands.push([x, y]);
        for (let i = cands.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cands[i], cands[j]] = [cands[j], cands[i]];
        }
        const nPairs = 6 + Math.floor(Math.random() * 3);
        for (let k = 0; k < Math.min(nPairs, cands.length); k++) {
          const [x, y] = cands[k];
          tb.walls.add(tbKey(x, y));
          tb.walls.add(tbKey(x, TB_ROWS - 1 - y));
        }
        if (tbVerifyConnectivity()) { ok = true; break; }
      }
      if (!ok) applyHalf(presetBunker);
    } else {
      applyHalf(presetBunker);
    }
  }

  function tbSegIntersectsAabb(p0x, p0y, dx, dy, minX, minY, maxX, maxY) {
    let tmin = 0, tmax = 1;
    const axes = [[p0x, dx, minX, maxX], [p0y, dy, minY, maxY]];
    for (const [o, dir, mn, mx] of axes) {
      if (Math.abs(dir) < 1e-5) {
        if (o < mn || o > mx) return false;
      } else {
        const inv = 1 / dir;
        let t1 = (mn - o) * inv, t2 = (mx - o) * inv;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
      }
    }
    return tmin <= tmax && tmax >= 0 && tmin <= 1;
  }

  function hasTbLos(fx, fy, tx, ty) {
    if (fx === tx && fy === ty) return true;
    const p0x = fx + 0.5, p0y = fy + 0.5, p1x = tx + 0.5, p1y = ty + 0.5;
    if (Math.hypot(p1x - p0x, p1y - p0y) <= 1.05) return true;
    const dx = p1x - p0x, dy = p1y - p0y;
    for (const wk of tb.walls) {
      const [wx, wy] = wk.split(",").map(Number);
      if ((wx === fx && wy === fy) || (wx === tx && wy === ty)) continue;
      if (tbSegIntersectsAabb(p0x, p0y, dx, dy, wx + 0.05, wy + 0.05, wx + 0.95, wy + 0.95)) return false;
    }
    return true;
  }

  function getTbTargetsInRange(shooter, cx = null, cy = null) {
    if (!shooter || !shooter.alive) return [];
    const sx = cx === null ? shooter.gx : cx;
    const sy = cy === null ? shooter.gy : cy;
    const maxR = Number(shooter.weapon.range ?? 5);
    const eTeam = shooter.team === SP.TEAM_PLAYER ? SP.TEAM_AI : SP.TEAM_PLAYER;
    return tbAliveUnits(eTeam).filter((e) => Math.hypot(e.gx - sx, e.gy - sy) <= maxR + 0.01 && hasTbLos(sx, sy, e.gx, e.gy));
  }

  function tbCanMoveDir(u, dir) {
    if (!u || !u.alive || tbUnitAp(u) < tb.moveCost) return false;
    const isDiag = dir.x !== 0 && dir.y !== 0;
    if (isDiag && tb.diagLimitOne && u.diagUsed) return false;
    const nx = u.gx + dir.x, ny = u.gy + dir.y;
    if (!tbInBounds(nx, ny) || tb.walls.has(tbKey(nx, ny)) || tbUnitAt(nx, ny)) return false;
    if (isDiag && tb.walls.has(tbKey(u.gx + dir.x, u.gy)) && tb.walls.has(tbKey(u.gx, u.gy + dir.y))) return false;
    return true;
  }

  function tbCanShoot(u) {
    if (!u || !u.alive || tbUnitAp(u) < getTbShootCost(u.weapon)) return false;
    return getTbTargetsInRange(u).length > 0;
  }

  function tbAnyPlayerAction() {
    for (const u of tbAliveUnits(SP.TEAM_PLAYER)) {
      if (tbCanShoot(u)) return true;
      for (const d of TB_ALL_DIRS) if (tbCanMoveDir(u, d)) return true;
    }
    return false;
  }

  function tbPointAt(shooter, target) {
    const dx = target.gx - shooter.gx, dy = target.gy - shooter.gy;
    if (dx * dx + dy * dy > 0.01) shooter.aim = Math.atan2(dy, dx);
  }

  function tbSyncAimedTarget(shooter) {
    const targets = getTbTargetsInRange(shooter);
    if (!targets.length) { tb.tgtId = -1; return; }
    const found = targets.find((t) => t.id === tb.tgtId);
    if (found) { tbPointAt(shooter, found); return; }
    tb.tgtId = targets[0].id;
    tbPointAt(shooter, targets[0]);
  }

  function tbEnsureSelection() {
    const pList = tbAliveUnits(SP.TEAM_PLAYER);
    if (!pList.length) { tb.selId = -1; tb.tgtId = -1; return; }
    let cur = tbUnitById(tb.selId);
    if (!cur || !cur.alive || cur.team !== SP.TEAM_PLAYER) {
      cur = pList.find((u) => tbUnitAp(u) > 0) || pList[0];
      tb.selId = cur.id;
    }
    tbSyncAimedTarget(cur);
  }

  function startTbMatch(shouldStartRunning) {
    const ap = SP.activeParams;
    updateTbGridRect();
    tb.apMode = ap.tb_ap_mode || "pool";
    tb.apPoolMax = Math.max(1, Number(ap.tb_ap_pool) || 6);
    tb.apPerUnitMax = Math.max(1, Number(ap.tb_ap_per_unit) || 3);
    tb.apCarry = Math.max(0, Number(ap.tb_ap_carryover) || 0);
    tb.moveCost = Math.max(1, Number(ap.tb_move_cost) || 1);
    tb.autoEnd = ap.tb_auto_end_turn !== false;
    tb.diagLimitOne = ap.tb_diag_limit_one !== false;
    tb.aiSpeed = SP.clamp(Number(ap.tb_ai_speed) || 1.0, 0.5, 2.0);
    const maxHp = Math.max(10, Number(ap.tb_unit_hp) || 100);
    const weapons = ap.tb_weapons;

    tb.turn = 1;
    tb.phase = TB_PHASE_PLAYER;
    tb.phaseTimer = 0;
    tb.playerAp = tb.apPoolMax;
    tb.aiAp = tb.apPoolMax;
    tb.pKills = 0;
    tb.aKills = 0;
    tb.anim = null;
    tb.trails = [];
    tb.particles = [];
    tb.floats = [];
    tb.aiPending = null;
    tb.aiRecent = {};
    tb.aiStatus = "";
    tb.aiActingId = -1;

    generateTbWalls(ap.tb_map_layout || "bunker");
    tb.units = [];
    const pSpawns = [[1,9],[3,9],[5,9],[7,9]];
    const aSpawns = [[1,0],[3,0],[5,0],[7,0]];
    let nid = 1;
    for (let i = 0; i < 4; i++) {
      tb.units.push({
        id: nid++, slot: i + 1, team: SP.TEAM_PLAYER,
        gx: pSpawns[i][0], gy: pSpawns[i][1], dx: pSpawns[i][0], dy: pSpawns[i][1],
        hp: maxHp, maxHp, alive: true, weapon: Object.assign({}, weapons[i]),
        ap: tb.apPerUnitMax, diagUsed: false, aim: -Math.PI * 0.5, hitFlash: 0, muzzle: 0, pop: 1.25
      });
    }
    for (let i = 0; i < 4; i++) {
      tb.units.push({
        id: nid++, slot: i + 1, team: SP.TEAM_AI,
        gx: aSpawns[i][0], gy: aSpawns[i][1], dx: aSpawns[i][0], dy: aSpawns[i][1],
        hp: maxHp, maxHp, alive: true, weapon: Object.assign({}, weapons[i]),
        ap: tb.apPerUnitMax, diagUsed: false, aim: Math.PI * 0.5, hitFlash: 0, muzzle: 0, pop: 1.25
      });
    }
    tb.selId = -1; tb.tgtId = -1;
    tbEnsureSelection();
    tb.running = Boolean(shouldStartRunning);
    if (tb.running) {
      const mid = tbGridToScreen(4, 4.5);
      tb.floats.push({ x: mid.x, y: mid.y, text: "TOUR 1 — À VOUS !", color: ap.player_color, life: 1.0, maxLife: 1.0 });
      SP.playSfx("turn");
    }
    syncTbHud();
    renderTb();
  }

  function tbSelectUnitDelta(delta) {
    const st = SP.state;
    if (!tb.running || tb.phase !== TB_PHASE_PLAYER || st.externalPaused || st.destroyed || st.menuOpen) return;
    const pList = tbAliveUnits(SP.TEAM_PLAYER);
    if (!pList.length) return;
    let idx = pList.findIndex((u) => u.id === tb.selId);
    if (idx < 0) idx = 0;
    idx = (idx + delta + pList.length) % pList.length;
    tb.selId = pList[idx].id;
    pList[idx].pop = 1.28;
    tbSyncAimedTarget(pList[idx]);
    SP.playSfx("step");
    syncTbHud();
    renderTb();
  }

  function tbCycleTargetDelta(delta) {
    const st = SP.state;
    if (!tb.running || tb.phase !== TB_PHASE_PLAYER || st.externalPaused || st.destroyed || st.menuOpen) return;
    const shooter = tbUnitById(tb.selId);
    if (!shooter || !shooter.alive) return;
    const targets = getTbTargetsInRange(shooter);
    if (!targets.length) { tb.tgtId = -1; syncTbHud(); renderTb(); return; }
    let idx = targets.findIndex((t) => t.id === tb.tgtId);
    if (idx < 0) idx = 0;
    idx = (idx + delta + targets.length) % targets.length;
    tb.tgtId = targets[idx].id;
    tbPointAt(shooter, targets[idx]);
    SP.playSfx("step");
    syncTbHud();
    renderTb();
  }

  function tbStartMove(u, dir, isAi) {
    const ap = SP.activeParams;
    const fx = u.gx, fy = u.gy, tx = fx + dir.x, ty = fy + dir.y;
    tbSpendAp(u, tb.moveCost);
    if (dir.x !== 0 && dir.y !== 0) u.diagUsed = true;
    u.gx = tx; u.gy = ty;
    u.aim = Math.atan2(dir.y, dir.x);
    u.pop = 1.18;
    tb.trails.push({ fx, fy, tx, ty, color: isAi ? ap.ai_color : ap.player_color, life: 1.2, maxLife: 1.2 });
    SP.playSfx("step");
    tb.anim = { type: "move", uid: u.id, fx, fy, tx, ty, t: 0, dur: 0.22 / (isAi ? tb.aiSpeed : 1), isAi };
    tb.phase = isAi ? TB_PHASE_AI_ANIMATE : TB_PHASE_PLAYER_ANIM;
    syncTbHud();
  }

  function tbStartShot(shooter, target, isAi) {
    tbSpendAp(shooter, getTbShootCost(shooter.weapon));
    tbPointAt(shooter, target);
    shooter.muzzle = 1;
    shooter.pop = 1.22;
    const d = Math.hypot(target.gx - shooter.gx, target.gy - shooter.gy);
    const pct = calcTbHitChance(shooter.weapon, d);
    const hit = Math.random() * 100 < pct;
    const dmg = Number(shooter.weapon.damage ?? 30);
    SP.playSfx("shoot");
    tb.anim = {
      type: "shot", sid: shooter.id, tid: target.id,
      fx: shooter.gx, fy: shooter.gy, tx: target.gx, ty: target.gy,
      t: 0, dur: 0.22 / (isAi ? tb.aiSpeed : 1),
      hit, dmg, pct, team: shooter.team, isAi
    };
    tb.phase = isAi ? TB_PHASE_AI_ANIMATE : TB_PHASE_PLAYER_ANIM;
    syncTbHud();
  }

  function tbMoveSelected(dx, dy) {
    const st = SP.state;
    if (!tb.running || tb.phase !== TB_PHASE_PLAYER || st.externalPaused || st.destroyed || st.menuOpen) return;
    const u = tbUnitById(tb.selId);
    const dir = { x: dx, y: dy };
    if (!tbCanMoveDir(u, dir)) return;
    tbStartMove(u, dir, false);
  }

  function tbFireSelected() {
    const st = SP.state;
    if (!tb.running || tb.phase !== TB_PHASE_PLAYER || st.externalPaused || st.destroyed || st.menuOpen) return;
    const s = tbUnitById(tb.selId);
    if (!s || !s.alive || tbUnitAp(s) < getTbShootCost(s.weapon)) return;
    const targets = getTbTargetsInRange(s);
    const tgt = targets.find((t) => t.id === tb.tgtId);
    if (!tgt) return;
    tbStartShot(s, tgt, false);
  }

  function tbSpawnParticles(sx, sy, color, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2, spd = SP.randRange(35, 115), life = SP.randRange(0.22, 0.42);
      tb.particles.push({ x: sx, y: sy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life, maxLife: life, r: SP.randRange(2.2, 4.4), color });
    }
  }

  function checkTbMatchEnd() {
    const st = SP.state;
    const ap = SP.activeParams;
    const dom = SP.dom;
    const pAlive = tbAliveUnits(SP.TEAM_PLAYER).length;
    const aAlive = tbAliveUnits(SP.TEAM_AI).length;
    if (pAlive > 0 && aAlive > 0) return false;
    tb.running = false;
    st.matchEnded = true;
    tb.anim = null;
    tb.aiPending = null;
    st.playerScore = pAlive;
    st.aiScore = aAlive;
    st.playerKills = tb.pKills;
    st.aiKills = tb.aKills;
    const winner = aAlive === 0 ? "player" : "ai";
    const reason = winner === "player"
      ? `Escouade ennemie éliminée en ${tb.turn} tours !`
      : `Votre escouade a été éliminée au tour ${tb.turn} !`;
    SP.playSfx(winner === "player" ? "win" : "lose");
    syncTbHud();

    dom.endTitleEl.textContent = winner === "player" ? SP.activeTexts.victoryTitle : SP.activeTexts.defeatTitle;
    dom.endTitleEl.style.color = winner === "player" ? SP.lightenHex(ap.player_color, 0.25) : ap.ai_color;
    dom.endReasonEl.textContent = `Tour par Tour (Tour ${tb.turn}) — ${reason}`;
    dom.endStatsEl.innerHTML = `Survivants : ${pAlive} &nbsp; vs &nbsp; ${aAlive}<br/>Éliminations : ${tb.pKills} vs ${tb.aKills}`;
    dom.endOverlay.classList.remove("hidden");
    return true;
  }

  function finishTbAnim() {
    const ap = SP.activeParams;
    const a = tb.anim;
    tb.anim = null;
    if (a.type === "move") {
      const u = tbUnitById(a.uid);
      if (u) { u.dx = a.tx; u.dy = a.ty; }
    } else if (a.type === "shot") {
      const tgt = tbUnitById(a.tid);
      const sp = tbGridToScreen(a.tx, a.ty);
      const col = a.team === SP.TEAM_PLAYER ? ap.player_color : ap.ai_color;
      if (a.hit && tgt && tgt.alive) {
        tgt.hp = Math.max(0, tgt.hp - a.dmg);
        tgt.hitFlash = 1; tgt.pop = 1.28;
        tbSpawnParticles(sp.x, sp.y, col, 8);
        tb.floats.push({ x: sp.x, y: sp.y - 14, text: "-" + a.dmg, color: "#ff7361", life: 1.0, maxLife: 1.0 });
        if (tgt.hp <= 0) {
          tgt.alive = false;
          tbSpawnParticles(sp.x, sp.y, "#ffd638", 14);
          tb.floats.push({ x: sp.x, y: sp.y - 30, text: "K.O. !", color: "#ffd638", life: 1.0, maxLife: 1.0 });
          SP.playSfx("ko");
          if (a.team === SP.TEAM_PLAYER) tb.pKills++; else tb.aKills++;
        } else {
          SP.playSfx("drop");
        }
      } else {
        tbSpawnParticles(sp.x, sp.y, "#bfcbe0", 5);
        tb.floats.push({ x: sp.x, y: sp.y - 14, text: "RATÉ !", color: "#d7e3f5", life: 1.0, maxLife: 1.0 });
        SP.playSfx("miss");
      }
      if (checkTbMatchEnd()) return;
    }

    if (a.isAi) {
      tb.phase = TB_PHASE_AI_POST;
      tb.phaseTimer = 0.24 / tb.aiSpeed;
      syncTbHud();
    } else {
      tbEnsureSelection();
      if (tb.autoEnd && !tbAnyPlayerAction()) {
        tb.phase = TB_PHASE_AUTO_END;
        tb.phaseTimer = 0.5;
      } else {
        tb.phase = TB_PHASE_PLAYER;
      }
      syncTbHud();
    }
  }

  function tbBeginAiTurn() {
    const ap = SP.activeParams;
    tb.phase = TB_PHASE_AI_INTRO;
    tb.phaseTimer = 0.45 / tb.aiSpeed;
    tb.aiPending = null;
    tb.aiRecent = {};
    tb.aiActingId = -1;
    if (tb.apMode === "pool") {
      tb.aiAp = tb.apCarry > 0 ? Math.min(tb.aiAp + tb.apPoolMax, tb.apPoolMax + tb.apCarry) : tb.apPoolMax;
    } else {
      for (const u of tbAliveUnits(SP.TEAM_AI)) {
        u.ap = tb.apCarry > 0 ? Math.min(u.ap + tb.apPerUnitMax, tb.apPerUnitMax + tb.apCarry) : tb.apPerUnitMax;
      }
    }
    for (const u of tbAliveUnits(SP.TEAM_AI)) u.diagUsed = false;
    tb.aiStatus = "🤖 Tour de l'IA...";
    const mid = tbGridToScreen(4, 4.5);
    tb.floats.push({ x: mid.x, y: mid.y, text: "TOUR DE L'IA", color: ap.ai_color, life: 1.0, maxLife: 1.0 });
    SP.playSfx("turn");
    syncTbHud();
  }

  function tbBeginPlayerTurn() {
    const ap = SP.activeParams;
    tb.turn++;
    tb.aiStatus = "";
    tb.aiActingId = -1;
    tb.aiPending = null;
    if (tb.apMode === "pool") {
      tb.playerAp = tb.apCarry > 0 ? Math.min(tb.playerAp + tb.apPoolMax, tb.apPoolMax + tb.apCarry) : tb.apPoolMax;
    } else {
      for (const u of tbAliveUnits(SP.TEAM_PLAYER)) {
        u.ap = tb.apCarry > 0 ? Math.min(u.ap + tb.apPerUnitMax, tb.apPerUnitMax + tb.apCarry) : tb.apPerUnitMax;
      }
    }
    for (const u of tbAliveUnits(SP.TEAM_PLAYER)) u.diagUsed = false;
    tb.phase = TB_PHASE_PLAYER;
    tbEnsureSelection();
    const mid = tbGridToScreen(4, 4.5);
    tb.floats.push({ x: mid.x, y: mid.y, text: `TOUR ${tb.turn} — À VOUS !`, color: ap.player_color, life: 1.0, maxLife: 1.0 });
    SP.playSfx("turn");
    syncTbHud();
  }

  function tbComputeBfsToPlayers() {
    const map = {};
    const q = [];
    for (const p of tbAliveUnits(SP.TEAM_PLAYER)) {
      const k = tbKey(p.gx, p.gy);
      map[k] = 0; q.push({ x: p.gx, y: p.gy });
    }
    let h = 0;
    while (h < q.length) {
      const c = q[h++];
      const cd = map[tbKey(c.x, c.y)];
      for (const d of TB_DIRS) {
        const nx = c.x + d.x, ny = c.y + d.y, nk = tbKey(nx, ny);
        if (tbInBounds(nx, ny) && !tb.walls.has(nk) && map[nk] === undefined) {
          map[nk] = cd + 1; q.push({ x: nx, y: ny });
        }
      }
    }
    return map;
  }

  function tbPickNextAiAction() {
    const aiList = tbAliveUnits(SP.TEAM_AI);
    const pList = tbAliveUnits(SP.TEAM_PLAYER);
    if (!aiList.length || !pList.length) return null;
    const bfs = tbComputeBfsToPlayers();
    const diff = SP.activeParams.ai_difficulty || "normal";
    let bestScore = -Infinity, best = null;
    const noise = diff === "easy" ? 16 : diff === "normal" ? 5 : diff === "hard" ? 1.5 : 0;

    for (const u of aiList) {
      const uap = tbUnitAp(u);
      const sCost = getTbShootCost(u.weapon);
      const dmg = Number(u.weapon.damage ?? 30);
      const optR = Number(u.weapon.optimal_range ?? 3);

      if (uap >= sCost) {
        for (const t of getTbTargetsInRange(u)) {
          const d = Math.hypot(t.gx - u.gx, t.gy - u.gy);
          const pct = calcTbHitChance(u.weapon, d);
          let sc = ((pct / 100) * dmg / Math.max(1, sCost)) * 1.4;
          if (t.hp <= dmg) sc += 24 * (pct / 100);
          if (pct < 25 && diff !== "easy") sc -= 10;
          sc += SP.randRange(-noise, noise);
          if (sc > bestScore) { bestScore = sc; best = { type: "shot", unit: u, target: t, pct }; }
        }
      }

      if (uap >= tb.moveCost) {
        const curBfs = bfs[tbKey(u.gx, u.gy)] ?? 99;
        let curBestShot = 0;
        for (const t of getTbTargetsInRange(u)) {
          const d = Math.hypot(t.gx - u.gx, t.gy - u.gy);
          curBestShot = Math.max(curBestShot, (calcTbHitChance(u.weapon, d) / 100) * dmg);
        }
        const rec = tb.aiRecent[u.id] || [];
        for (const dir of TB_ALL_DIRS) {
          if (!tbCanMoveDir(u, dir)) continue;
          const nx = u.gx + dir.x, ny = u.gy + dir.y, nk = tbKey(nx, ny);
          if (rec.includes(nk)) continue;
          const nxtBfs = bfs[nk] ?? 99;
          let sc = Math.min(1.45, curBfs - nxtBfs) * 7.0;
          let nxtBestShot = 0;
          const canAfter = (uap - tb.moveCost) >= sCost;
          for (const t of getTbTargetsInRange(u, nx, ny)) {
            const d = Math.hypot(t.gx - nx, t.gy - ny);
            nxtBestShot = Math.max(nxtBestShot, (calcTbHitChance(u.weapon, d) / 100) * dmg);
          }
          if (nxtBestShot > curBestShot + 2) sc += (nxtBestShot - curBestShot) * (canAfter ? 1.2 : 0.55);
          else if (curBestShot <= 0.1 && nxtBestShot > 0.1) sc += 12;
          let nearestD = Infinity;
          for (const p of pList) nearestD = Math.min(nearestD, Math.hypot(p.gx - nx, p.gy - ny));
          if (nearestD < optR - 0.8 && curBestShot > 0) sc -= 4;
          sc += SP.randRange(-noise, noise);
          if (sc > bestScore) { bestScore = sc; best = { type: "move", unit: u, dir }; }
        }
      }
    }
    return bestScore >= 1.5 ? best : null;
  }

  function tbAdvanceAiStep() {
    const act = tbPickNextAiAction();
    if (!act) { tbBeginPlayerTurn(); return; }
    tb.aiPending = act;
    const u = act.unit;
    tb.aiActingId = u.id;
    if (act.type === "shot") {
      tbPointAt(u, act.target);
      tb.aiStatus = `🤖 IA #${u.slot} ${u.weapon.short} vise #${act.target.slot} (${act.pct}%)`;
      tb.phase = TB_PHASE_AI_TELEGRAPH;
      tb.phaseTimer = 0.52 / tb.aiSpeed;
    } else {
      if (!tb.aiRecent[u.id]) tb.aiRecent[u.id] = [];
      tb.aiRecent[u.id].push(tbKey(u.gx, u.gy));
      u.aim = Math.atan2(act.dir.y, act.dir.x);
      tb.aiStatus = `🤖 IA #${u.slot} ${u.weapon.short} se déplace`;
      tb.phase = TB_PHASE_AI_TELEGRAPH;
      tb.phaseTimer = 0.36 / tb.aiSpeed;
    }
    syncTbHud();
  }

  function tbEndPlayerTurn() {
    const st = SP.state;
    if (!tb.running || tb.phase !== TB_PHASE_PLAYER || st.externalPaused || st.destroyed || st.menuOpen) return;
    tbBeginAiTurn();
  }

  function syncTbHud() {
    const st = SP.state;
    if (st.gameMode !== "turn") return;
    const ap = SP.activeParams;
    const dom = SP.dom;
    const pAlive = tbAliveUnits(SP.TEAM_PLAYER).length;
    const aAlive = tbAliveUnits(SP.TEAM_AI).length;
    dom.pScoreEl.textContent = String(pAlive);
    dom.aScoreEl.textContent = String(aAlive);
    dom.timerEl.textContent = "TOUR " + tb.turn;

    const isP = tb.phase === TB_PHASE_PLAYER || tb.phase === TB_PHASE_PLAYER_ANIM || tb.phase === TB_PHASE_AUTO_END;
    const isIdle = tb.running && tb.phase === TB_PHASE_PLAYER && !st.externalPaused && !st.menuOpen;
    const sel = tbUnitById(tb.selId);
    const tgt = tbUnitById(tb.tgtId);
    const targets = sel ? getTbTargetsInRange(sel) : [];
    const selAp = sel ? tbUnitAp(sel) : 0;
    const maxAp = sel ? tbUnitMaxAp() : tb.apPoolMax;
    const sCost = sel ? getTbShootCost(sel.weapon) : 2;

    if (isP) {
      dom.objBadgeEl.textContent = `À VOUS • ${selAp}/${maxAp} PA`;
      dom.objBadgeEl.style.color = ap.player_color;
    } else {
      dom.objBadgeEl.textContent = "🤖 TOUR IA";
      dom.objBadgeEl.style.color = ap.ai_color;
    }

    dom.tbUnitLbl.textContent = sel && sel.alive ? `U${sel.slot} ${sel.weapon.short} (${Math.round(sel.hp)}PV)` : "AUCUNE";
    let pct = 0;
    if (sel && tgt && tgt.alive && targets.length) {
      pct = calcTbHitChance(sel.weapon, Math.hypot(tgt.gx - sel.gx, tgt.gy - sel.gy));
    }

    dom.btnTbPrevUnit.disabled = !isIdle;
    dom.btnTbNextUnit.disabled = !isIdle;
    dom.btnTbPrevTgt.disabled = !isIdle || targets.length <= 1;
    dom.btnTbNextTgt.disabled = !isIdle || targets.length <= 1;

    dom.tbMoveCostLbl.textContent = tb.moveCost + " PA";
    dom.btnTbUpLeft.disabled = !(isIdle && tbCanMoveDir(sel, { x: -1, y: -1 }));
    dom.btnTbUp.disabled = !(isIdle && tbCanMoveDir(sel, { x: 0, y: -1 }));
    dom.btnTbUpRight.disabled = !(isIdle && tbCanMoveDir(sel, { x: 1, y: -1 }));
    dom.btnTbLeft.disabled = !(isIdle && tbCanMoveDir(sel, { x: -1, y: 0 }));
    dom.btnTbRight.disabled = !(isIdle && tbCanMoveDir(sel, { x: 1, y: 0 }));
    dom.btnTbDownLeft.disabled = !(isIdle && tbCanMoveDir(sel, { x: -1, y: 1 }));
    dom.btnTbDown.disabled = !(isIdle && tbCanMoveDir(sel, { x: 0, y: 1 }));
    dom.btnTbDownRight.disabled = !(isIdle && tbCanMoveDir(sel, { x: 1, y: 1 }));

    dom.btnTbFire.disabled = !(isIdle && tgt && selAp >= sCost && targets.length > 0);
    dom.btnTbFire.textContent = (tgt && targets.length > 0) ? `🎯 TIRER C#${tgt.slot} • ${pct}% (${sCost} PA)` : "🎯 TIRER — HORS PORTÉE";
    dom.btnTbEndTurn.disabled = !isIdle;
    dom.btnTbEndTurn.classList.toggle("ready", isIdle && !tbAnyPlayerAction());

    if (st.isEmbedded && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: "minigd_stats",
          id: SP.GAME_ID,
          text: `Tour ${tb.turn} • Bleu ${pAlive} - ${aAlive} Rouge`,
          over: Boolean(st.matchEnded)
        }, "*");
      } catch (_e) {}
    }
  }

  function updateTb(dt) {
    const st = SP.state;
    st.animTime += dt;
    if (!tb.running || st.externalPaused || st.destroyed || st.menuOpen) return;
    st.matchHasTicked = true;
    for (const u of tb.units) {
      u.hitFlash = Math.max(0, u.hitFlash - dt * 5);
      u.muzzle = Math.max(0, u.muzzle - dt * 8);
      u.pop += (1 - u.pop) * Math.min(dt * 12, 1);
    }
    for (let i = tb.trails.length - 1; i >= 0; i--) {
      tb.trails[i].life -= dt;
      if (tb.trails[i].life <= 0) tb.trails.splice(i, 1);
    }
    for (let i = tb.particles.length - 1; i >= 0; i--) {
      const p = tb.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - dt * 5.5; p.vy *= 1 - dt * 5.5;
      p.life -= dt;
      if (p.life <= 0) tb.particles.splice(i, 1);
    }
    for (let i = tb.floats.length - 1; i >= 0; i--) {
      const f = tb.floats[i];
      f.y -= 28 * dt; f.life -= dt;
      if (f.life <= 0) tb.floats.splice(i, 1);
    }

    if ((tb.phase === TB_PHASE_PLAYER_ANIM || tb.phase === TB_PHASE_AI_ANIMATE) && tb.anim) {
      tb.anim.t += dt;
      const frac = SP.clamp(tb.anim.t / Math.max(tb.anim.dur, 0.01), 0, 1);
      if (tb.anim.type === "move") {
        const u = tbUnitById(tb.anim.uid);
        if (u) {
          const e = 1 - Math.pow(1 - frac, 2);
          u.dx = tb.anim.fx + (tb.anim.tx - tb.anim.fx) * e;
          u.dy = tb.anim.fy + (tb.anim.ty - tb.anim.fy) * e;
        }
      }
      if (frac >= 1) finishTbAnim();
    } else if (tb.phase === TB_PHASE_AUTO_END) {
      tb.phaseTimer -= dt;
      if (tb.phaseTimer <= 0) tbBeginAiTurn();
    } else if (tb.phase === TB_PHASE_AI_INTRO || tb.phase === TB_PHASE_AI_POST) {
      tb.phaseTimer -= dt;
      if (tb.phaseTimer <= 0) tbAdvanceAiStep();
    } else if (tb.phase === TB_PHASE_AI_TELEGRAPH) {
      tb.phaseTimer -= dt;
      if (tb.phaseTimer <= 0) {
        const act = tb.aiPending;
        tb.aiPending = null;
        if (!act) tbAdvanceAiStep();
        else if (act.type === "shot") tbStartShot(act.unit, act.target, true);
        else tbStartMove(act.unit, act.dir, true);
      }
    }
  }

  function tbHitColor(pct) { return pct >= 75 ? "#52f28c" : pct >= 45 ? "#ffd638" : "#ff6b61"; }

  function drawTbPill(ctx, cx, cy, text, bg, border) {
    ctx.font = "800 11.5px sans-serif";
    const w = SP.clamp(ctx.measureText(text).width + 16, 44, tb.gw - 16);
    const h = 21;
    const x = SP.clamp(cx - w * 0.5, tb.ox + 4, tb.ox + tb.gw - w - 4);
    const y = SP.clamp(cy - h * 0.5, tb.oy + 4, tb.oy + tb.gh - h - 4);
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = border; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    ctx.fillText(text, x + w * 0.5, y + 14.5);
  }

  function renderTb(ctxOverride) {
    const st = SP.state;
    const ap = SP.activeParams;
    const ctx = ctxOverride || SP.ctx;
    if (!ctx) return;
    const pCol = ap.player_color;
    const aCol = ap.ai_color;
    const pDark = SP.darkenHex(pCol, 0.48);
    const aDark = SP.darkenHex(aCol, 0.48);
    const pRgb = SP.hexToRgbStr(pCol);
    const aRgb = SP.hexToRgbStr(aCol);
    const wBase = ap.wall_color;
    const wTop = SP.lightenHex(wBase, 0.22);
    const wDark = SP.darkenHex(wBase, 0.55);
    const wEdge = SP.lightenHex(wBase, 0.45);

    ctx.fillStyle = "#141c29";
    ctx.fillRect(0, 0, st.viewW, st.viewH);

    for (let y = 0; y < TB_ROWS; y++) {
      for (let x = 0; x < TB_COLS; x++) {
        const rx = tb.ox + x * tb.tile, ry = tb.oy + y * tb.tile;
        if (tb.walls.has(tbKey(x, y))) {
          ctx.fillStyle = wDark;
          ctx.fillRect(rx, ry, tb.tile, tb.tile);
          const ins = tb.tile * 0.08;
          ctx.fillStyle = wTop;
          ctx.fillRect(rx + ins, ry + ins, tb.tile - ins * 2, tb.tile - ins * 2.4);
          ctx.strokeStyle = wEdge;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(rx, ry, tb.tile, tb.tile);
        } else {
          ctx.fillStyle = ap.arena_bg_color;
          ctx.fillRect(rx, ry, tb.tile, tb.tile);
          if ((x + y) % 2 === 1) {
            ctx.fillStyle = "rgba(255,255,255,0.025)";
            ctx.fillRect(rx, ry, tb.tile, tb.tile);
          }
          if (y === 0) {
            ctx.fillStyle = `rgba(${aRgb}, 0.12)`;
            ctx.fillRect(rx, ry, tb.tile, tb.tile);
          } else if (y === TB_ROWS - 1) {
            ctx.fillStyle = `rgba(${pRgb}, 0.12)`;
            ctx.fillRect(rx, ry, tb.tile, tb.tile);
          }
          ctx.strokeStyle = "rgba(51, 69, 94, 0.45)";
          ctx.lineWidth = 1;
          ctx.strokeRect(rx, ry, tb.tile, tb.tile);
        }
      }
    }
    ctx.strokeStyle = "rgba(87, 117, 158, 0.9)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(tb.ox, tb.oy, tb.gw, tb.gh);

    const sel = tbUnitById(tb.selId);
    const isPIdle = tb.running && tb.phase === TB_PHASE_PLAYER && !st.externalPaused && !st.menuOpen;

    if (isPIdle && sel && sel.alive) {
      const sp = tbGridToScreen(sel.dx, sel.dy);
      ctx.strokeStyle = `rgba(${pRgb}, 0.20)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, Number(sel.weapon.range) * tb.tile, 0, Math.PI * 2); ctx.stroke();

      if (tbUnitAp(sel) >= tb.moveCost) {
        for (const d of TB_ALL_DIRS) {
          if (!tbCanMoveDir(sel, d)) continue;
          const isDiag = d.x !== 0 && d.y !== 0;
          const nx = sel.gx + d.x, ny = sel.gy + d.y;
          const rx = tb.ox + nx * tb.tile + 2, ry = tb.oy + ny * tb.tile + 2;
          ctx.fillStyle = isDiag ? "rgba(255, 214, 56, 0.16)" : `rgba(${pRgb}, 0.18)`;
          ctx.fillRect(rx, ry, tb.tile - 4, tb.tile - 4);
          ctx.strokeStyle = isDiag ? "rgba(255, 214, 56, 0.72)" : `rgba(${pRgb}, 0.68)`;
          ctx.lineWidth = 1.8;
          ctx.strokeRect(rx, ry, tb.tile - 4, tb.tile - 4);
          const cp = tbGridToScreen(nx, ny);
          const sz = tb.tile * 0.18;
          const dl = Math.hypot(d.x, d.y) || 1;
          const ux = d.x / dl, uy = d.y / dl;
          const px = -uy, py = ux;
          ctx.fillStyle = isDiag ? "rgba(253, 230, 138, 0.88)" : "rgba(180, 244, 255, 0.85)";
          ctx.beginPath();
          ctx.moveTo(cp.x + ux * sz, cp.y + uy * sz);
          ctx.lineTo(cp.x - ux * sz * 0.55 + px * sz * 0.75, cp.y - uy * sz * 0.55 + py * sz * 0.75);
          ctx.lineTo(cp.x - ux * sz * 0.55 - px * sz * 0.75, cp.y - uy * sz * 0.55 - py * sz * 0.75);
          ctx.closePath(); ctx.fill();
        }
      }
    }

    for (const tr of tb.trails) {
      const a = SP.clamp(tr.life / tr.maxLife, 0, 1);
      const p0 = tbGridToScreen(tr.fx, tr.fy), p1 = tbGridToScreen(tr.tx, tr.ty);
      ctx.globalAlpha = a * 0.65;
      ctx.strokeStyle = tr.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      ctx.fillStyle = tr.color; ctx.beginPath(); ctx.arc(p1.x, p1.y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const u of tb.units) {
      if (!u.alive) continue;
      const p = tbGridToScreen(u.dx, u.dy);
      const r = SP.clamp(tb.tile * 0.29, 9, 14.5) * u.pop;
      const isP = u.team === SP.TEAM_PLAYER;
      const mainCol = u.hitFlash > 0.25 ? "#ffffff" : (isP ? pCol : aCol);
      const darkCol = isP ? pDark : aDark;

      if (isP && u.id === tb.selId && (tb.phase === TB_PHASE_PLAYER || tb.phase === TB_PHASE_PLAYER_ANIM || tb.phase === TB_PHASE_AUTO_END)) {
        const pulse = 1 + 0.08 * Math.sin(st.animTime * 6);
        ctx.strokeStyle = "#ffd638"; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 6.5 * pulse, 0, Math.PI * 2); ctx.stroke();
      } else if (!isP && u.id === tb.aiActingId) {
        const pulse = 1 + 0.08 * Math.sin(st.animTime * 8);
        ctx.strokeStyle = aCol; ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 6.5 * pulse, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.arc(p.x, p.y + r * 0.62, r * 0.78, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = darkCol;
      ctx.beginPath(); ctx.arc(p.x - r * 0.36, p.y + r * 0.65, r * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x + r * 0.36, p.y + r * 0.65, r * 0.25, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = darkCol;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mainCol;
      ctx.beginPath(); ctx.arc(p.x, p.y - 1, r * 0.82, 0, Math.PI * 2); ctx.fill();

      const ax = Math.cos(u.aim), ay = Math.sin(u.aim);
      ctx.fillStyle = "rgba(242,250,255,0.92)";
      ctx.beginPath(); ctx.arc(p.x + ax * r * 0.36, p.y - 1.5 + ay * r * 0.36, r * 0.3, 0, Math.PI * 2); ctx.fill();
      const gx0 = p.x + ax * r * 0.42, gy0 = p.y + ay * r * 0.42;
      const gx1 = p.x + ax * (r + 6), gy1 = p.y + ay * (r + 6);
      ctx.strokeStyle = "#e6eefc"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx1, gy1); ctx.stroke();
      if (u.muzzle > 0.15) {
        ctx.fillStyle = "#ffeb73"; ctx.beginPath(); ctx.arc(gx1, gy1, 4.5 * u.muzzle, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = "rgba(10,16,28,0.95)";
      ctx.font = "900 10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(String(u.slot), p.x, p.y + 3.5);

      const bw = tb.tile * 0.72, bh = 4;
      const hpR = SP.clamp(u.hp / u.maxHp, 0, 1);
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(p.x - bw * 0.5, p.y - r - 8.5, bw, bh);
      ctx.fillStyle = isP ? "#4df27a" : "#ff7061";
      ctx.fillRect(p.x - bw * 0.5, p.y - r - 8.5, bw * hpR, bh);

      if (tb.apMode === "per_unit") {
        const mp = Math.min(Math.max(tb.apPerUnitMax, u.ap), 6);
        const pw = 4, gap = 2, tw = mp * pw + Math.max(0, mp - 1) * gap;
        const sx = p.x - tw * 0.5, py = p.y + r + 5;
        for (let k = 0; k < mp; k++) {
          ctx.fillStyle = k < u.ap ? "#ffd638" : "rgba(55,66,87,0.85)";
          ctx.fillRect(sx + k * (pw + gap), py, pw, 3.5);
        }
      } else {
        ctx.fillStyle = "rgba(214, 230, 250, 0.85)";
        ctx.font = "800 8.5px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(u.weapon.short, p.x, p.y + r + 10);
      }
    }

    if (isPIdle && sel && sel.alive) {
      const targets = getTbTargetsInRange(sel);
      for (const t of targets) {
        const tp = tbGridToScreen(t.dx, t.dy);
        const pct = calcTbHitChance(sel.weapon, Math.hypot(t.gx - sel.gx, t.gy - sel.gy));
        if (t.id !== tb.tgtId) {
          ctx.strokeStyle = "rgba(255, 184, 77, 0.48)"; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.arc(tp.x, tp.y, tb.tile * 0.42, 0, Math.PI * 2); ctx.stroke();
          drawTbPill(ctx, tp.x, tp.y + tb.tile * 0.56, pct + "%", "rgba(22,28,42,0.88)", "#f2d161");
        }
      }
      const aimed = tbUnitById(tb.tgtId);
      if (aimed && aimed.alive && targets.length) {
        const fp = tbGridToScreen(sel.dx, sel.dy), tp = tbGridToScreen(aimed.dx, aimed.dy);
        const pct = calcTbHitChance(sel.weapon, Math.hypot(aimed.gx - sel.gx, aimed.gy - sel.gy));
        const col = tbHitColor(pct);
        ctx.save();
        ctx.strokeStyle = col; ctx.lineWidth = 2.6;
        ctx.setLineDash([8, 6]); ctx.lineDashOffset = -(st.animTime * 28);
        ctx.beginPath(); ctx.moveTo(fp.x, fp.y); ctx.lineTo(tp.x, tp.y); ctx.stroke();
        ctx.restore();
        const pr = tb.tile * (0.46 + 0.04 * Math.sin(st.animTime * 7));
        ctx.strokeStyle = col; ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.arc(tp.x, tp.y, pr, 0, Math.PI * 2); ctx.stroke();
        let by = tp.y - tb.tile * 0.68;
        if (by < tb.oy + 14) by = tp.y + tb.tile * 0.68;
        drawTbPill(ctx, tp.x, by, `${pct}% • -${sel.weapon.damage} PV`, "rgba(15,23,36,0.94)", col);
      }
    }

    if (tb.phase === TB_PHASE_AI_TELEGRAPH && tb.aiPending && tb.aiPending.type === "shot") {
      const fp = tbGridToScreen(tb.aiPending.unit.dx, tb.aiPending.unit.dy);
      const tp = tbGridToScreen(tb.aiPending.target.dx, tb.aiPending.target.dy);
      ctx.save();
      ctx.strokeStyle = aCol; ctx.lineWidth = 3;
      ctx.setLineDash([9, 5]); ctx.lineDashOffset = -(st.animTime * 28);
      ctx.beginPath(); ctx.moveTo(fp.x, fp.y); ctx.lineTo(tp.x, tp.y); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = aCol; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.arc(tp.x, tp.y, tb.tile * 0.48, 0, Math.PI * 2); ctx.stroke();
      drawTbPill(ctx, (fp.x + tp.x) * 0.5, (fp.y + tp.y) * 0.5, `IA ${tb.aiPending.pct}%`, "rgba(61,15,25,0.94)", aCol);
    }

    if (tb.anim && tb.anim.type === "shot") {
      const f = SP.clamp(tb.anim.t / Math.max(tb.anim.dur, 0.01), 0, 1);
      const p0 = tbGridToScreen(tb.anim.fx, tb.anim.fy), p1 = tbGridToScreen(tb.anim.tx, tb.anim.ty);
      const cx = p0.x + (p1.x - p0.x) * f, cy = p0.y + (p1.y - p0.y) * f;
      const tf = Math.max(0, f - 0.18);
      const tx = p0.x + (p1.x - p0.x) * tf, ty = p0.y + (p1.y - p0.y) * tf;
      const col = tb.anim.team === SP.TEAM_PLAYER ? SP.lightenHex(pCol, 0.5) : SP.lightenHex(aCol, 0.45);
      ctx.strokeStyle = col; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, 4.2, 0, Math.PI * 2); ctx.fill();
    }

    for (const p of tb.particles) {
      const a = SP.clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = "800 14px sans-serif"; ctx.textAlign = "center";
    for (const f of tb.floats) {
      ctx.globalAlpha = SP.clamp(f.life / f.maxLife, 0, 1);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    if (tb.aiStatus && tb.phase >= TB_PHASE_AI_INTRO) {
      drawTbPill(ctx, tb.ox + tb.gw * 0.5, tb.oy + 18, tb.aiStatus, "rgba(71,18,28,0.92)", aCol);
    }
  }

  SP.modes.turn = {
    state: tb,
    calcHitChance: calcTbHitChance,
    getShootCost: getTbShootCost,
    updateGridRect: updateTbGridRect,
    startMatch: startTbMatch,
    selectUnitDelta: tbSelectUnitDelta,
    cycleTargetDelta: tbCycleTargetDelta,
    moveSelected: tbMoveSelected,
    fireSelected: tbFireSelected,
    endPlayerTurn: tbEndPlayerTurn,
    syncHud: syncTbHud,
    update: updateTb,
    render: renderTb,

    onEnter() {
      const dom = SP.dom;
      const ap = SP.activeParams;
      dom.startTitleEl.textContent = "STRATTOUR";
      const tbHp = ap.tb_unit_hp;
      const apTxt = ap.tb_ap_mode === "per_unit" ? `${ap.tb_ap_per_unit} PA/unité` : `${ap.tb_ap_pool} PA/tour`;
      dom.startObjEl.textContent = `Tour par Tour : 4 vs 4 (${tbHp} PV • ${apTxt})`;
      dom.startDescEl.textContent = "Escouade de 4 unités sur grille avec murs, points d'action (PA), visée à probabilité selon la distance et IA tour par tour !";
      dom.startHowEl.innerHTML =
        "• <b>4 unités vs 4</b> sur grille avec <b>murs</b> et <b>PA</b><br />" +
        "• Touchez une unité (ou ◀ ▶) et déplacez-la (<b>▲ ▼ ◀ ▶</b>)<br />" +
        "• Choisissez une cible à portée (◀ ▶) et appuyez sur <b>TIRER</b> !";
      syncTbHud();
    },

    onResize() {
      updateTbGridRect();
      renderTb();
    },

    onPointerDown(pt) {
      const st = SP.state;
      if (!tb.running || tb.phase !== TB_PHASE_PLAYER || st.externalPaused || st.destroyed || st.menuOpen) return;
      const gx = Math.floor((pt.x - tb.ox) / tb.tile);
      const gy = Math.floor((pt.y - tb.oy) / tb.tile);
      if (!tbInBounds(gx, gy)) return;
      const clicked = tbUnitAt(gx, gy);
      if (clicked) {
        if (clicked.team === SP.TEAM_PLAYER) {
          tb.selId = clicked.id;
          clicked.pop = 1.3;
          tbSyncAimedTarget(clicked);
          SP.playSfx("step");
          syncTbHud();
          renderTb();
        } else {
          const shooter = tbUnitById(tb.selId);
          if (shooter && getTbTargetsInRange(shooter).some((t) => t.id === clicked.id)) {
            tb.tgtId = clicked.id;
            tbPointAt(shooter, clicked);
            SP.playSfx("step");
            syncTbHud();
            renderTb();
          }
        }
      } else {
        const sel = tbUnitById(tb.selId);
        if (sel && sel.alive) {
          const dx = gx - sel.gx, dy = gy - sel.gy;
          if ((dx !== 0 || dy !== 0) && Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
            tbMoveSelected(dx, dy);
          }
        }
      }
    },

    onKeyDown(e) {
      const st = SP.state;
      if (!tb.running || st.menuOpen || st.externalPaused || st.destroyed) return false;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); tbMoveSelected(0, -1); return true; }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); tbMoveSelected(0, 1); return true; }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); tbMoveSelected(-1, 0); return true; }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); tbMoveSelected(1, 0); return true; }
      if (e.key === "q" || e.key === "Q") { tbSelectUnitDelta(-1); return true; }
      if (e.key === "e" || e.key === "E") { tbSelectUnitDelta(1); return true; }
      if (e.key === "Tab") { e.preventDefault(); tbCycleTargetDelta(e.shiftKey ? -1 : 1); return true; }
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); tbFireSelected(); return true; }
      if (e.key === "x" || e.key === "X") { tbEndPlayerTurn(); return true; }
      return false;
    }
  };
})();
