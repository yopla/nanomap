(function () {
  "use strict";
  const SP = window.StratPick = window.StratPick || {};

  function payloadPosFromProgress(prog) {
    const ar = SP.state.arena;
    const cx = ar.x + ar.w * 0.5;
    const yBot = ar.y + ar.h * 0.86;
    const yTop = ar.y + ar.h * 0.14;
    return { x: cx, y: yBot + (yTop - yBot) * SP.clamp(prog, 0, 1) };
  }

  function setupObjectiveLayout(pointBlockedFn, pushSafeFn) {
    const st = SP.state;
    const ar = st.arena;
    st.zones = [];
    st.stars = [];
    const cx = ar.x + ar.w * 0.5;
    const cy = ar.y + ar.h * 0.5;
    if (st.objId === "koth") {
      st.zones.push({
        x: cx,
        y: cy,
        r: SP.clamp(Math.min(ar.w, ar.h) * 0.21, 52, 110),
        owner: -1,
        capture: 0,
        pCount: 0,
        aCount: 0,
        label: "COLLINE"
      });
    } else if (st.objId === "domination") {
      const r = SP.clamp(Math.min(ar.w, ar.h) * 0.145, 36, 76);
      st.zones.push({ x: cx - ar.w * 0.22, y: ar.y + ar.h * 0.28, r, owner: -1, capture: 0, pCount: 0, aCount: 0, label: "A" });
      st.zones.push({ x: cx, y: cy, r, owner: -1, capture: 0, pCount: 0, aCount: 0, label: "B" });
      st.zones.push({ x: cx + ar.w * 0.22, y: ar.y + ar.h * 0.72, r, owner: -1, capture: 0, pCount: 0, aCount: 0, label: "C" });
    } else if (st.objId === "escort") {
      st.payloadProgress = 0.5;
      st.payloadPos = payloadPosFromProgress(0.5);
    } else if (st.objId === "coin_rush") {
      st.starTimer = 0.2;
      for (let i = 0; i < 4; i++) spawnStar(pointBlockedFn, pushSafeFn);
    }
  }

  function resizeObjectiveLayout(pushSafeFn) {
    const st = SP.state;
    const ar = st.arena;
    const cx = ar.x + ar.w * 0.5;
    const cy = ar.y + ar.h * 0.5;
    if (st.objId === "koth" && st.zones.length) {
      st.zones[0].x = cx;
      st.zones[0].y = cy;
      st.zones[0].r = SP.clamp(Math.min(ar.w, ar.h) * 0.21, 52, 110);
    } else if (st.objId === "domination" && st.zones.length >= 3) {
      const r = SP.clamp(Math.min(ar.w, ar.h) * 0.145, 36, 76);
      st.zones[0].x = cx - ar.w * 0.22; st.zones[0].y = ar.y + ar.h * 0.28; st.zones[0].r = r;
      st.zones[1].x = cx; st.zones[1].y = cy; st.zones[1].r = r;
      st.zones[2].x = cx + ar.w * 0.22; st.zones[2].y = ar.y + ar.h * 0.72; st.zones[2].r = r;
    } else if (st.objId === "escort") {
      st.payloadPos = payloadPosFromProgress(st.payloadProgress);
    }
    const safePush = pushSafeFn || SP.walls.pushOutOfWalls;
    for (const star of st.stars) {
      const sp = safePush(
        SP.clamp(star.x, ar.x + 36, ar.x + ar.w - 36),
        SP.clamp(star.y, ar.y + 64, ar.y + ar.h - 64),
        18
      );
      star.x = sp.x; star.y = sp.y;
    }
  }

  function spawnStar(pointBlockedFn, pushSafeFn) {
    const st = SP.state;
    const ar = st.arena;
    const isBlocked = pointBlockedFn || SP.walls.pointInWall;
    const safePush = pushSafeFn || SP.walls.pushOutOfWalls;
    const xPad = Math.min(42, ar.w * 0.14);
    const yPad = Math.min(82, ar.h * 0.2);
    for (let attempt = 0; attempt < 15; attempt++) {
      const sx = SP.randRange(ar.x + xPad, ar.x + ar.w - xPad);
      const sy = SP.randRange(ar.y + yPad, ar.y + ar.h - yPad);
      if (!isBlocked(sx, sy, 20)) {
        st.stars.push({ x: sx, y: sy, phase: SP.randRange(0, Math.PI * 2) });
        return;
      }
    }
    const safe = safePush(SP.randRange(ar.x + xPad, ar.x + ar.w - xPad), SP.randRange(ar.y + yPad, ar.y + ar.h - yPad), 20);
    st.stars.push({ x: safe.x, y: safe.y, phase: SP.randRange(0, Math.PI * 2) });
  }

  function getBaseSpawn(team, idx, total, pushSafeFn, radOverride) {
    const ar = SP.state.arena;
    const safePush = pushSafeFn || SP.walls.pushOutOfWalls;
    const rad = radOverride || (SP.UNIT_RADIUS + 2);
    const xMin = ar.x + 36;
    const xMax = ar.x + ar.w - 36;
    const yBase = team === SP.TEAM_PLAYER ? ar.y + ar.h - 44 : ar.y + 44;
    if (idx >= 0 && total > 1) {
      const cols = Math.min(total, Math.max(6, Math.floor((xMax - xMin) / (total > 16 ? 26 : 46))));
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const t = (col + 0.5) / cols;
      const x = xMin + (xMax - xMin) * t + SP.randRange(-6, 6);
      const yOff = row * (total > 16 ? 18 : 28) * (team === SP.TEAM_PLAYER ? -1 : 1);
      return safePush(x, yBase + yOff, rad);
    }
    return safePush(SP.randRange(xMin, xMax), yBase + SP.randRange(-14, 14), rad);
  }

  function createUnit(team, pos, hpOverride) {
    const hp = hpOverride || SP.activeParams.unit_hp;
    return {
      team,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      fireCd: SP.randRange(0.15, 0.7),
      aim: team === SP.TEAM_PLAYER ? -Math.PI * 0.5 : Math.PI * 0.5,
      walk: SP.randRange(0, Math.PI * 2),
      hitFlash: 0,
      muzzle: 0,
      pop: 1.35,
      glidePath: []
    };
  }

  function getAiInterval() {
    const diff = SP.activeParams.ai_difficulty;
    if (diff === "easy") return 2.9;
    if (diff === "hard") return 1.2;
    if (diff === "expert") return 0.78;
    return 1.85;
  }

  function getAiBatch() {
    const diff = SP.activeParams.ai_difficulty;
    if (diff === "easy") return 2;
    if (diff === "hard") return 4;
    if (diff === "expert") return 5;
    return 3;
  }

  function spawnRing(x, y, color, count) {
    const ps = SP.state.particles;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = SP.randRange(40, 125);
      const life = SP.randRange(0.2, 0.38);
      ps.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life, maxLife: life, r: SP.randRange(2.5, 4.8), color });
    }
  }

  function spawnFloat(x, y, text, color) {
    SP.state.floatTexts.push({ x, y, text, color, life: 0.75, maxLife: 0.75 });
  }

  function findClosestAlly(x, y, maxR) {
    const units = SP.state.units;
    let best = -1, bestD2 = maxR * maxR;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (u.team !== SP.TEAM_PLAYER) continue;
      const d2 = SP.dist2(x, y, u.x, u.y);
      if (d2 <= bestD2) { bestD2 = d2; best = i; }
    }
    return best;
  }

  function findNearestStar(x, y, maxR) {
    let best = null, bestD2 = maxR * maxR;
    for (const s of SP.state.stars) {
      const d2 = SP.dist2(x, y, s.x, s.y);
      if (d2 < bestD2) { bestD2 = d2; best = s; }
    }
    return best;
  }

  function chooseAiTarget(pushSafeFn) {
    const st = SP.state;
    const ar = st.arena;
    const ap = SP.activeParams;
    const safePush = pushSafeFn || SP.walls.pushOutOfWalls;
    const cx = ar.x + ar.w * 0.5;
    const cy = ar.y + ar.h * 0.5;
    let huntChance = 0.25;
    if (ap.ai_style === "aggressive") huntChance = 0.7;
    else if (ap.ai_style === "objective") huntChance = 0.08;

    if (st.objId === "elimination" || Math.random() < huntChance) {
      const pList = st.units.filter((u) => u.team === SP.TEAM_PLAYER);
      if (pList.length) {
        const pick = pList[Math.floor(Math.random() * pList.length)];
        return safePush(pick.x + SP.randRange(-70, 70), pick.y + SP.randRange(-90, -35), SP.UNIT_RADIUS + 4);
      }
    }
    if (st.objId === "koth" && st.zones.length) {
      return safePush(st.zones[0].x + SP.randRange(-35, 35), st.zones[0].y + SP.randRange(-35, 35), SP.UNIT_RADIUS + 4);
    }
    if (st.objId === "domination" && st.zones.length) {
      const cands = st.zones.filter((z) => z.owner !== SP.TEAM_AI);
      const z = (cands.length ? cands : st.zones)[Math.floor(Math.random() * (cands.length || st.zones.length))];
      return safePush(z.x + SP.randRange(-28, 28), z.y + SP.randRange(-28, 28), SP.UNIT_RADIUS + 4);
    }
    if (st.objId === "escort") {
      return safePush(st.payloadPos.x + SP.randRange(-32, 32), st.payloadPos.y + SP.randRange(-32, 20), SP.UNIT_RADIUS + 4);
    }
    if (st.objId === "coin_rush" && st.stars.length) {
      const star = st.stars[Math.floor(Math.random() * st.stars.length)];
      return safePush(star.x, star.y, SP.UNIT_RADIUS + 4);
    }
    return safePush(cx + SP.randRange(-90, 90), cy + SP.randRange(-90, 90), SP.UNIT_RADIUS + 4);
  }

  function updatePickGlideAi(dt) {
    const st = SP.state;
    const ap = SP.activeParams;
    if (st.aiTelTimer > 0) st.aiTelTimer = Math.max(0, st.aiTelTimer - dt);
    st.aiActionTimer -= dt;
    if (st.aiActionTimer > 0) return;
    st.aiActionTimer = getAiInterval() * SP.randRange(0.85, 1.15);

    const aiList = st.units.filter((u) => u.team === SP.TEAM_AI);
    if (!aiList.length) return;
    const target = chooseAiTarget(SP.walls.pushOutOfWalls);
    aiList.sort((a, b) => SP.dist2(b.x, b.y, target.x, target.y) - SP.dist2(a.x, a.y, target.x, target.y));

    const batch = Math.min(getAiBatch(), aiList.length);
    let moved = false;
    const firstFrom = { x: aiList[0].x, y: aiList[0].y };
    for (let k = 0; k < batch; k++) {
      const u = aiList[k];
      if (SP.dist(u.x, u.y, target.x, target.y) < 85) continue;
      const p = SP.walls.pushOutOfWalls(target.x + SP.randRange(-34, 34), target.y + SP.randRange(-34, 34), SP.UNIT_RADIUS + 3);
      if (st.gameMode === "glide") {
        const mid = SP.walls.pushOutOfWalls((u.x + p.x) * 0.5 + SP.randRange(-25, 25), (u.y + p.y) * 0.5 + SP.randRange(-25, 25), SP.UNIT_RADIUS + 3);
        u.glidePath = [mid, p];
        u.pop = 1.25;
      } else {
        const ox = u.x, oy = u.y;
        u.x = p.x; u.y = p.y; u.pop = 1.45;
        st.trails.push({ fx: ox, fy: oy, tx: u.x, ty: u.y, t: 0, dur: 0.22, color: ap.ai_color });
        spawnRing(u.x, u.y, ap.ai_color, 4);
      }
      moved = true;
    }
    if (moved) {
      st.aiTelFrom = firstFrom;
      st.aiTelTo = target;
      st.aiTelTimer = 0.55;
    }
  }

  function getUnitGoal(u, enemy, enemyD2, dt) {
    const st = SP.state;
    const ap = SP.activeParams;
    if (u.glidePath && u.glidePath.length) {
      // Skip ahead if already closer to a subsequent waypoint (avoids backtracking around corners)
      while (u.glidePath.length > 1) {
        const d0 = SP.dist(u.x, u.y, u.glidePath[0].x, u.glidePath[0].y);
        const d1 = SP.dist(u.x, u.y, u.glidePath[1].x, u.glidePath[1].y);
        if (d1 < d0) {
          u.glidePath.shift();
          u.glideStuckT = 0;
          u.glideBestD = Infinity;
        } else {
          break;
        }
      }
      while (u.glidePath.length) {
        const wp = u.glidePath[0];
        const dx = wp.x - u.x, dy = wp.y - u.y;
        const d = Math.hypot(dx, dy);
        const isLast = u.glidePath.length === 1;
        const thresh = isLast ? 16 : 18;
        if (d <= thresh) {
          u.glidePath.shift();
          u.glideStuckT = 0;
          u.glideBestD = Infinity;
          continue;
        }
        // Anti-stuck: if unit isn't making progress toward current waypoint, skip/release it
        if (u.glideBestD === undefined) u.glideBestD = Infinity;
        if (u.glideStuckT === undefined) u.glideStuckT = 0;
        if (d < u.glideBestD - 1.5) {
          u.glideBestD = d;
          u.glideStuckT = 0;
        } else {
          u.glideStuckT += (dt || 0.016);
          const maxStuck = isLast ? (d < 44 ? 0.55 : 1.35) : 0.70;
          if (u.glideStuckT >= maxStuck) {
            u.glidePath.shift();
            u.glideStuckT = 0;
            u.glideBestD = Infinity;
            continue;
          }
        }
        return { x: (dx / d) * 1.15, y: (dy / d) * 1.15 };
      }
    }
    const shootRange = ap.shoot_range;
    const comfort = shootRange * 0.72;
    if (enemy && enemyD2 < comfort * comfort) {
      if (st.objId === "coin_rush") {
        const ns = findNearestStar(u.x, u.y, 120);
        if (ns) {
          const d = Math.hypot(ns.x - u.x, ns.y - u.y) || 1;
          return { x: (ns.x - u.x) / d, y: (ns.y - u.y) / d };
        }
      }
      return { x: 0, y: 0 };
    }
    if (st.objId === "koth" && st.zones.length) {
      const z = st.zones[0], dx = z.x - u.x, dy = z.y - u.y, d = Math.hypot(dx, dy);
      if (d > z.r * 0.75) return { x: (dx / d) * 0.65, y: (dy / d) * 0.65 };
    } else if (st.objId === "domination" && st.zones.length) {
      let bestZ = st.zones[0], bestW = Infinity;
      for (const z of st.zones) {
        const w = SP.dist(u.x, u.y, z.x, z.y) * (z.owner === u.team ? 1.45 : 0.75);
        if (w < bestW) { bestW = w; bestZ = z; }
      }
      const dx = bestZ.x - u.x, dy = bestZ.y - u.y, d = Math.hypot(dx, dy);
      if (d > bestZ.r * 0.65) return { x: (dx / d) * 0.6, y: (dy / d) * 0.6 };
    } else if (st.objId === "escort") {
      const dx = st.payloadPos.x - u.x, dy = st.payloadPos.y - u.y, d = Math.hypot(dx, dy);
      if (d > 54) return { x: (dx / d) * 0.7, y: (dy / d) * 0.7 };
    } else if (st.objId === "coin_rush") {
      const ns = findNearestStar(u.x, u.y, 220);
      if (ns) {
        const d = Math.hypot(ns.x - u.x, ns.y - u.y) || 1;
        return { x: ((ns.x - u.x) / d) * 0.9, y: ((ns.y - u.y) / d) * 0.9 };
      }
    }
    if (enemy) {
      const dx = enemy.x - u.x, dy = enemy.y - u.y, d = Math.hypot(dx, dy) || 1;
      return { x: (dx / d) * 0.55, y: (dy / d) * 0.55 };
    }
    return { x: 0, y: 0 };
  }

  function tickVfx(dt) {
    const st = SP.state;
    for (let i = st.particles.length - 1; i >= 0; i--) {
      const p = st.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - dt * 5; p.vy *= 1 - dt * 5;
      p.life -= dt;
      if (p.life <= 0) st.particles.splice(i, 1);
    }
    for (let i = st.trails.length - 1; i >= 0; i--) {
      st.trails[i].t += dt;
      if (st.trails[i].t >= st.trails[i].dur) st.trails.splice(i, 1);
    }
    for (let i = st.floatTexts.length - 1; i >= 0; i--) {
      const f = st.floatTexts[i];
      f.y -= 34 * dt; f.life -= dt;
      if (f.life <= 0) st.floatTexts.splice(i, 1);
    }
  }

  function updateObjectives(dt, pointBlockedFn, pushSafeFn) {
    const st = SP.state;
    const ap = SP.activeParams;
    if (st.objId === "koth" && st.zones.length) {
      const z = st.zones[0];
      let pc = 0, ac = 0;
      const r2 = z.r * z.r;
      for (const u of st.units) {
        if (SP.dist2(u.x, u.y, z.x, z.y) <= r2) { if (u.team === SP.TEAM_PLAYER) pc++; else ac++; }
      }
      z.pCount = pc; z.aCount = ac;
      if (pc > ac) { z.owner = SP.TEAM_PLAYER; st.playerScore += dt * (2.2 + 0.25 * (pc - ac)); }
      else if (ac > pc) { z.owner = SP.TEAM_AI; st.aiScore += dt * (2.2 + 0.25 * (ac - pc)); }
      else z.owner = -1;
    } else if (st.objId === "domination") {
      for (const z of st.zones) {
        let pc = 0, ac = 0;
        const r2 = z.r * z.r;
        for (const u of st.units) {
          if (SP.dist2(u.x, u.y, z.x, z.y) <= r2) { if (u.team === SP.TEAM_PLAYER) pc++; else ac++; }
        }
        z.pCount = pc; z.aCount = ac;
        if (pc > ac) z.capture = SP.clamp(z.capture + dt * 0.55 * (pc - ac), -1, 1);
        else if (ac > pc) z.capture = SP.clamp(z.capture - dt * 0.55 * (ac - pc), -1, 1);
        if (z.capture >= 0.99) z.owner = SP.TEAM_PLAYER;
        else if (z.capture <= -0.99) z.owner = SP.TEAM_AI;
        if (z.owner === SP.TEAM_PLAYER) st.playerScore += dt * 1.4;
        else if (z.owner === SP.TEAM_AI) st.aiScore += dt * 1.4;
      }
    } else if (st.objId === "escort") {
      let pc = 0, ac = 0;
      for (const u of st.units) {
        if (SP.dist2(u.x, u.y, st.payloadPos.x, st.payloadPos.y) <= 78 * 78) { if (u.team === SP.TEAM_PLAYER) pc++; else ac++; }
      }
      const net = pc - ac;
      if (net !== 0) {
        st.payloadProgress = SP.clamp(st.payloadProgress + SP.clamp(net * 0.022, -0.11, 0.11) * dt, 0, 1);
        st.payloadPos = payloadPosFromProgress(st.payloadProgress);
      }
      st.playerScore = st.payloadProgress * 100;
      st.aiScore = (1 - st.payloadProgress) * 100;
    } else if (st.objId === "coin_rush") {
      st.starTimer -= dt;
      if (st.starTimer <= 0 && st.stars.length < 5) { spawnStar(pointBlockedFn, pushSafeFn); st.starTimer = 1.6; }
      for (let si = st.stars.length - 1; si >= 0; si--) {
        const star = st.stars[si];
        let by = -1;
        for (const u of st.units) {
          if (SP.dist2(u.x, u.y, star.x, star.y) <= 26 * 26) { by = u.team; break; }
        }
        if (by !== -1) {
          if (by === SP.TEAM_PLAYER) { st.playerScore++; spawnFloat(star.x, star.y, "+1 ★", "#ffd638"); }
          else { st.aiScore++; spawnFloat(star.x, star.y, "+1 ★", ap.ai_color); }
          spawnRing(star.x, star.y, "#ffd638", 9);
          SP.playSfx("star");
          st.stars.splice(si, 1);
        }
      }
    }
  }

  function finishRealtimeMatch(reason, syncHudFn) {
    const st = SP.state;
    const ap = SP.activeParams;
    const dom = SP.dom;
    st.running = false;
    st.matchEnded = true;
    st.isTouching = false;
    const ps = Math.round(st.playerScore), as = Math.round(st.aiScore);
    let winner = "draw";
    if (ps > as) { winner = "player"; SP.playSfx("win"); }
    else if (as > ps) { winner = "ai"; SP.playSfx("lose"); }
    if (syncHudFn) syncHudFn(true);

    dom.endTitleEl.textContent = winner === "player" ? SP.activeTexts.victoryTitle : winner === "ai" ? SP.activeTexts.defeatTitle : SP.activeTexts.drawTitle;
    dom.endTitleEl.style.color = winner === "player" ? SP.lightenHex(ap.player_color, 0.25) : winner === "ai" ? ap.ai_color : "#ffd638";
    dom.endReasonEl.textContent = st.objInfo.name + " — " + reason;
    dom.endStatsEl.innerHTML = `Vous : ${ps} &nbsp; vs &nbsp; IA : ${as}<br/>Éliminations : ${st.playerKills} vs ${st.aiKills}`;
    dom.endOverlay.classList.remove("hidden");
  }

  function checkRealtimeEnd(respawnEnabled, extraPlayerCount, syncHudFn) {
    const st = SP.state;
    let reason = "";
    if (st.objId === "escort") {
      if (st.payloadProgress >= 0.995) reason = "Convoi livré !";
      else if (st.payloadProgress <= 0.005) reason = "L'IA a livré le convoi !";
    }
    if (st.objId === "elimination" && !respawnEnabled) {
      const pAlive = (extraPlayerCount || 0) + st.units.filter((u) => u.team === SP.TEAM_PLAYER).length;
      const aAlive = st.units.filter((u) => u.team === SP.TEAM_AI).length;
      if (aAlive === 0) reason = "Équipe adverse éliminée !";
      else if (pAlive === 0) reason = "Toute votre équipe est KO !";
    }
    if (!reason && st.timeLeft <= 0) reason = SP.activeTexts.timeoutTitle;
    if (reason) {
      finishRealtimeMatch(reason, syncHudFn);
      return true;
    }
    return false;
  }

  function updateRealtimeArena(dt) {
    const st = SP.state;
    const ap = SP.activeParams;

    st.timeLeft = Math.max(0, st.timeLeft - dt);
    updatePickGlideAi(dt);

    if (ap.respawn_enabled && st.respawnQueue.length) {
      for (let i = st.respawnQueue.length - 1; i >= 0; i--) {
        st.respawnQueue[i].t -= dt;
        if (st.respawnQueue[i].t <= 0) {
          const team = st.respawnQueue[i].team;
          const pos = getBaseSpawn(team, -1, 1);
          st.units.push(createUnit(team, pos));
          spawnRing(pos.x, pos.y, team === SP.TEAM_PLAYER ? ap.player_color : ap.ai_color, 6);
          st.respawnQueue.splice(i, 1);
        }
      }
    }

    for (const w of st.walls) {
      if (!w.broken && w.hitFlash > 0) w.hitFlash = Math.max(0, w.hitFlash - dt * 6);
    }

    const fireInt = 1 / Math.max(ap.fire_rate, 0.25);
    const shootRange = ap.shoot_range;
    const unitSpeed = ap.unit_speed;
    const n = st.units.length;
    for (let i = 0; i < n; i++) {
      const u = st.units[i];
      u.hitFlash = Math.max(0, u.hitFlash - dt * 5);
      u.muzzle = Math.max(0, u.muzzle - dt * 10);
      u.pop += (1 - u.pop) * Math.min(dt * 12, 1);

      let nearest = null, nearestD2 = Infinity;
      let visibleTarget = null, visibleD2 = Infinity;
      let sx = 0, sy = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const o = st.units[j];
        const dx = u.x - o.x, dy = u.y - o.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 784 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (28 - d) * 3.8;
          sx += (dx / d) * f;
          sy += (dy / d) * f;
        }
        if (o.team !== u.team) {
          if (d2 < nearestD2) { nearestD2 = d2; nearest = o; }
          if (d2 <= shootRange * shootRange && d2 < visibleD2 && SP.walls.hasLineOfSight(u.x, u.y, o.x, o.y)) {
            visibleD2 = d2;
            visibleTarget = o;
          }
        }
      }

      const shootTarget = visibleTarget || (ap.wall_destructible ? nearest : null);
      const shootTargetD2 = visibleTarget ? visibleD2 : nearestD2;
      const gRaw = getUnitGoal(u, visibleTarget || nearest, visibleTarget ? visibleD2 : nearestD2, dt);
      const g = SP.walls.steerAroundWalls(u, gRaw.x, gRaw.y);
      let dvx = g.x * unitSpeed + sx;
      let dvy = g.y * unitSpeed + sy;
      const dl = Math.hypot(dvx, dvy);
      if (dl > unitSpeed * 1.45) {
        dvx = (dvx / dl) * unitSpeed * 1.45;
        dvy = (dvy / dl) * unitSpeed * 1.45;
      }
      const blend = Math.min(dt * 7, 1);
      u.vx += (dvx - u.vx) * blend;
      u.vy += (dvy - u.vy) * blend;
      const cp = SP.walls.pushOutOfWalls(u.x + u.vx * dt, u.y + u.vy * dt, SP.UNIT_RADIUS + 1);
      u.x = cp.x; u.y = cp.y;

      const spd = Math.hypot(u.vx, u.vy);
      if (spd > 6) u.walk += dt * (6 + spd * 0.09);

      u.fireCd -= dt;
      if (shootTarget && shootTargetD2 <= shootRange * shootRange) {
        const rot = SP.stepAimAngle(u.aim, Math.atan2(shootTarget.y - u.y, shootTarget.x - u.x), ap.aim_turn_time, dt);
        u.aim = rot.angle;
        if (rot.aligned && u.fireCd <= 0) {
          u.fireCd = fireInt * SP.randRange(0.88, 1.12);
          u.muzzle = 1;
          const ang = u.aim + SP.randRange(-0.075, 0.075);
          const dx = Math.cos(ang), dy = Math.sin(ang);
          st.bullets.push({
            team: u.team,
            x: u.x + dx * (SP.UNIT_RADIUS + 4),
            y: u.y + dy * (SP.UNIT_RADIUS + 4),
            vx: dx * SP.BULLET_SPEED,
            vy: dy * SP.BULLET_SPEED,
            life: Math.max(0.45, (shootRange * 1.35) / SP.BULLET_SPEED)
          });
          SP.playSfx("shoot");
        }
      } else if (spd > 8) {
        u.aim = SP.stepAimAngle(u.aim, Math.atan2(u.vy, u.vx), Math.max(ap.aim_turn_time, 0.18), dt).angle;
      }
    }

    const bulletDmg = ap.bullet_damage;
    const pBulletLight = SP.lightenHex(ap.player_color, 0.55);
    const aBulletLight = SP.lightenHex(ap.ai_color, 0.45);
    const ar = st.arena;
    for (let bi = st.bullets.length - 1; bi >= 0; bi--) {
      const b = st.bullets[bi];
      const prevX = b.x, prevY = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let hit = b.life <= 0 || b.x < ar.x || b.x > ar.x + ar.w || b.y < ar.y || b.y > ar.y + ar.h;
      if (!hit && ap.wall_blocks_bullets && st.walls.length) {
        for (const w of st.walls) {
          if (w.broken) continue;
          if (SP.walls.segmentIntersectsRect(prevX, prevY, b.x, b.y, w)) {
            spawnRing(prevX, prevY, SP.lightenHex(ap.wall_color, 0.35), 3);
            if (ap.wall_destructible) {
              w.hp -= bulletDmg;
              w.hitFlash = 1;
              if (w.hp <= 0) {
                w.broken = true;
                spawnRing(w.x + w.w * 0.5, w.y + w.h * 0.5, ap.wall_color, 12);
                SP.playSfx("ko");
              }
            }
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        for (let ui = st.units.length - 1; ui >= 0; ui--) {
          const u = st.units[ui];
          if (u.team === b.team) continue;
          if (SP.dist2(b.x, b.y, u.x, u.y) <= (SP.UNIT_RADIUS + 4.5) * (SP.UNIT_RADIUS + 4.5)) {
            u.hp -= bulletDmg;
            u.hitFlash = 1;
            spawnRing(b.x, b.y, b.team === SP.TEAM_PLAYER ? pBulletLight : aBulletLight, 3);
            if (u.hp <= 0) {
              const dead = st.units.splice(ui, 1)[0];
              spawnRing(dead.x, dead.y, dead.team === SP.TEAM_PLAYER ? ap.player_color : ap.ai_color, 10);
              SP.playSfx("ko");
              if (b.team === SP.TEAM_PLAYER) {
                st.playerKills++;
                if (st.objId === "elimination") { st.playerScore++; spawnFloat(dead.x, dead.y, "+1", ap.player_color); }
              } else {
                st.aiKills++;
                if (st.objId === "elimination") { st.aiScore++; spawnFloat(dead.x, dead.y, "+1", ap.ai_color); }
              }
              if (ap.respawn_enabled) st.respawnQueue.push({ team: dead.team, t: ap.respawn_delay });
            }
            hit = true;
            break;
          }
        }
      }
      if (hit) st.bullets.splice(bi, 1);
    }

    updateObjectives(dt, SP.walls.pointInWall, SP.walls.pushOutOfWalls);
    tickVfx(dt);

    const pickMode = SP.modes.pick;
    const handCount = pickMode && pickMode.handUnits ? pickMode.handUnits.length : 0;
    const modeMod = SP.modes[st.gameMode];
    const syncFn = modeMod && modeMod.syncHud ? modeMod.syncHud : SP.syncHud;
    const ended = checkRealtimeEnd(ap.respawn_enabled, handCount, syncFn);
    if (!ended && syncFn) syncFn(false);
  }

  function drawStar(ctx, cx, cy, rOut, rIn, color) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI * 0.5 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? rOut : rIn;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function renderArenaBaseAndObjectives(ctx) {
    const st = SP.state;
    const ap = SP.activeParams;
    const ar = st.arena;
    const pCol = ap.player_color;
    const aCol = ap.ai_color;
    const pRgb = SP.hexToRgbStr(pCol);
    const aRgb = SP.hexToRgbStr(aCol);

    ctx.fillStyle = "#171f2b";
    ctx.fillRect(0, 0, st.viewW, st.viewH);

    ctx.fillStyle = ap.arena_bg_color;
    ctx.fillRect(ar.x, ar.y, ar.w, ar.h);

    ctx.fillStyle = `rgba(${aRgb}, 0.11)`;
    ctx.fillRect(ar.x, ar.y, ar.w, 54);
    ctx.fillStyle = `rgba(${pRgb}, 0.11)`;
    ctx.fillRect(ar.x, ar.y + ar.h - 54, ar.w, 54);

    ctx.strokeStyle = "rgba(42, 54, 74, 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = ar.x + 44; gx < ar.x + ar.w; gx += 44) {
      ctx.moveTo(gx, ar.y); ctx.lineTo(gx, ar.y + ar.h);
    }
    for (let gy = ar.y + 44; gy < ar.y + ar.h; gy += 44) {
      ctx.moveTo(ar.x, gy); ctx.lineTo(ar.x + ar.w, gy);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ar.x, ar.y + ar.h * 0.5);
    ctx.lineTo(ar.x + ar.w, ar.y + ar.h * 0.5);
    ctx.stroke();

    ctx.strokeStyle = "rgba(82, 108, 145, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(ar.x, ar.y, ar.w, ar.h);

    if (st.objId === "koth" || st.objId === "domination") {
      for (const z of st.zones) {
        const col = z.owner === SP.TEAM_PLAYER ? pRgb : z.owner === SP.TEAM_AI ? aRgb : "190,204,228";
        ctx.fillStyle = `rgba(${col},0.14)`;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(${col},0.85)`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke();
        if (st.objId === "domination" && Math.abs(z.capture) > 0.02) {
          ctx.strokeStyle = z.capture > 0 ? pCol : aCol;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(z.x, z.y, z.r - 5, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * Math.abs(z.capture));
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        ctx.font = "700 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${z.label}  ${z.pCount}-${z.aCount}`, z.x, z.y + 4);
      }
    } else if (st.objId === "escort") {
      const pTop = payloadPosFromProgress(1), pBot = payloadPosFromProgress(0);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(pBot.x, pBot.y); ctx.lineTo(pTop.x, pTop.y); ctx.stroke();

      ctx.fillStyle = `rgba(${pRgb},0.25)`; ctx.strokeStyle = pCol; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(pTop.x, pTop.y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = `rgba(${aRgb},0.25)`; ctx.strokeStyle = aCol;
      ctx.beginPath(); ctx.arc(pBot.x, pBot.y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.fillStyle = "rgba(140,198,255,0.08)"; ctx.strokeStyle = "rgba(140,198,255,0.35)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(st.payloadPos.x, st.payloadPos.y, 78, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.fillStyle = "#f2c738"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5;
      ctx.fillRect(st.payloadPos.x - 20, st.payloadPos.y - 14, 40, 28);
      ctx.strokeRect(st.payloadPos.x - 20, st.payloadPos.y - 14, 40, 28);
      ctx.fillStyle = "#121722"; ctx.font = "800 12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(Math.round(st.payloadProgress * 100) + "%", st.payloadPos.x, st.payloadPos.y + 4);
    } else if (st.objId === "coin_rush") {
      for (const star of st.stars) {
        const pulse = 1 + 0.14 * Math.sin(st.animTime * 5 + star.phase);
        ctx.fillStyle = "rgba(255,214,56,0.18)";
        ctx.beginPath(); ctx.arc(star.x, star.y, 16 * pulse, 0, Math.PI * 2); ctx.fill();
        drawStar(ctx, star.x, star.y, 11.5 * pulse, 5.2 * pulse, "#ffd638");
      }
    }
  }

  function renderBulletsAndVfx(ctx) {
    const st = SP.state;
    const ap = SP.activeParams;
    const pBulletCol = SP.lightenHex(ap.player_color, 0.55);
    const aBulletCol = SP.lightenHex(ap.ai_color, 0.45);
    for (const b of st.bullets) {
      const col = b.team === SP.TEAM_PLAYER ? pBulletCol : aBulletCol;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - (b.vx / sp) * 11, b.y - (b.vy / sp) * 11);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(b.x, b.y, 3.2, 0, Math.PI * 2); ctx.fill();
    }

    for (const p of st.particles) {
      const a = SP.clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function renderFloatTexts(ctx) {
    const st = SP.state;
    ctx.font = "800 14px sans-serif";
    ctx.textAlign = "center";
    for (const f of st.floatTexts) {
      ctx.globalAlpha = SP.clamp(f.life / f.maxLife, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function renderRealtimeArena(ctx) {
    const st = SP.state;
    const ap = SP.activeParams;
    const pCol = ap.player_color;
    const aCol = ap.ai_color;
    const pDark = SP.darkenHex(pCol, 0.48);
    const aDark = SP.darkenHex(aCol, 0.48);
    const aRgb = SP.hexToRgbStr(aCol);

    renderArenaBaseAndObjectives(ctx);
    SP.walls.renderWalls(ctx);

    if (st.aiTelTimer > 0) {
      const a = st.aiTelTimer / 0.55;
      ctx.strokeStyle = `rgba(${aRgb},${0.35 * a})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(st.aiTelFrom.x, st.aiTelFrom.y); ctx.lineTo(st.aiTelTo.x, st.aiTelTo.y); ctx.stroke();
      ctx.strokeStyle = `rgba(${aRgb},${0.65 * a})`;
      ctx.beginPath(); ctx.arc(st.aiTelTo.x, st.aiTelTo.y, 38 * (1.2 - 0.2 * a), 0, Math.PI * 2); ctx.stroke();
    }

    const modeMod = SP.modes[st.gameMode];
    if (modeMod && modeMod.renderUnderUnits) modeMod.renderUnderUnits(ctx);

    for (const tr of st.trails) {
      const f = SP.clamp(tr.t / tr.dur, 0, 1);
      const cx = tr.fx + (tr.tx - tr.fx) * f;
      const cy = tr.fy + (tr.ty - tr.fy) * f;
      ctx.globalAlpha = 1 - f;
      ctx.strokeStyle = tr.color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tr.fx, tr.fy); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.fillStyle = tr.color;
      ctx.beginPath(); ctx.arc(cx, cy, 5.5 * (1 - f * 0.5), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const u of st.units) {
      const r = SP.UNIT_RADIUS * u.pop;
      const isP = u.team === SP.TEAM_PLAYER;
      const mainCol = u.hitFlash > 0.25 ? "#ffffff" : (isP ? pCol : aCol);
      const darkCol = isP ? pDark : aDark;
      const bob = Math.sin(u.walk) * 2;
      const footOff = Math.sin(u.walk) * 2.4;

      ctx.fillStyle = "rgba(0,0,0,0.34)";
      ctx.beginPath(); ctx.arc(u.x, u.y + 7, r * 0.76, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = darkCol;
      ctx.beginPath(); ctx.arc(u.x - 4.5 * u.pop, u.y + 7.5 + footOff, 3 * u.pop, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(u.x + 4.5 * u.pop, u.y + 7.5 - footOff, 3 * u.pop, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = darkCol;
      ctx.beginPath(); ctx.arc(u.x, u.y + bob, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mainCol;
      ctx.beginPath(); ctx.arc(u.x, u.y + bob - 1, r * 0.82, 0, Math.PI * 2); ctx.fill();

      const ax = Math.cos(u.aim), ay = Math.sin(u.aim);
      ctx.fillStyle = "rgba(242,250,255,0.92)";
      ctx.beginPath(); ctx.arc(u.x + ax * r * 0.36, u.y + bob - 1.5 + ay * r * 0.36, r * 0.32, 0, Math.PI * 2); ctx.fill();

      const gx0 = u.x + ax * r * 0.45, gy0 = u.y + bob + ay * r * 0.45;
      const gx1 = u.x + ax * (r + 6.5), gy1 = u.y + bob + ay * (r + 6.5);
      ctx.strokeStyle = "#e0e9f7"; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx1, gy1); ctx.stroke();

      if (u.muzzle > 0.15) {
        ctx.fillStyle = "#ffeb73";
        ctx.beginPath(); ctx.arc(gx1, gy1, 4.5 * u.muzzle, 0, Math.PI * 2); ctx.fill();
      }

      const hpR = SP.clamp(u.hp / u.maxHp, 0, 1);
      if (hpR < 0.99) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(u.x - 11, u.y - r - 8, 22, 3.5);
        ctx.fillStyle = isP ? "#4df273" : "#ff7361";
        ctx.fillRect(u.x - 11, u.y - r - 8, 22 * hpR, 3.5);
      }
    }

    renderBulletsAndVfx(ctx);
    if (modeMod && modeMod.renderOverlay) modeMod.renderOverlay(ctx);
    renderFloatTexts(ctx);
  }

  SP.arena = {
    payloadPosFromProgress,
    setupObjectiveLayout,
    resizeObjectiveLayout,
    spawnStar,
    getBaseSpawn,
    createUnit,
    getAiInterval,
    getAiBatch,
    spawnRing,
    spawnFloat,
    findClosestAlly,
    findNearestStar,
    chooseAiTarget,
    tickVfx,
    updateObjectives,
    finishRealtimeMatch,
    checkRealtimeEnd,
    updateRealtimeArena,
    drawStar,
    renderArenaBaseAndObjectives,
    renderBulletsAndVfx,
    renderFloatTexts,
    renderRealtimeArena
  };
})();
