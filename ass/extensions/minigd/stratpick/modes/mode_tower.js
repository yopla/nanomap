(function () {
  "use strict";
  const SP = window.StratPick = window.StratPick || {};
  SP.modes = SP.modes || {};

  const TURRET_RADIUS = 15;
  const TURRET_HIT_RADIUS = 28;
  const SOLDIER_RADIUS = 9;
  const SOLDIER_SHOOT_RANGE = 105;
  const SOLDIER_BULLET_SPEED = 360;
  const DRAG_THRESH = 10;

  const tw = {
    turrets: [],
    soldiers: [],
    shockwaves: [],
    relocateTrails: [],
    respawnQueue: [],
    selectedBuildType: "mg",
    selectedTurretId: -1,
    dragTurretId: -1,
    dragStart: { x: 0, y: 0 },
    dragCur: { x: 0, y: 0 },
    isDragging: false,
    dragValid: true,
    nextTurretId: 1,
    baseHp: 300,
    baseMaxHp: 300,
    waveNum: 0,
    waveTimer: 1.0,
    aiActionTimer: 0.8,
    aiRedeployCd: 2.6
  };

  function getVariant() {
    return SP.TW_VARIANTS[SP.activeParams.tw_variant] ? SP.activeParams.tw_variant : "hybrid";
  }

  function countTurrets(team) {
    let c = 0;
    for (const t of tw.turrets) if (t.team === team) c++;
    return c;
  }

  function countRespawning(team) {
    let c = 0;
    for (const rq of tw.respawnQueue) if (rq.team === team) c++;
    return c;
  }

  function getPlayerReserve() {
    return Math.max(0, SP.activeParams.tw_max_turrets - countTurrets(SP.TEAM_PLAYER) - countRespawning(SP.TEAM_PLAYER));
  }

  function findTurretIdx(tid) {
    for (let i = 0; i < tw.turrets.length; i++) if (tw.turrets[i].id === tid) return i;
    return -1;
  }

  function findClosestPlayerTurretId(x, y, maxDist) {
    let bestId = -1, bestD2 = maxDist * maxDist;
    for (const t of tw.turrets) {
      if (t.team !== SP.TEAM_PLAYER) continue;
      const d2 = SP.dist2(x, y, t.x, t.y);
      if (d2 <= bestD2) { bestD2 = d2; bestId = t.id; }
    }
    return bestId;
  }

  function clampToArena(x, y, rad) {
    const ar = SP.state.arena;
    const pad = rad + 4;
    return {
      x: SP.clamp(x, ar.x + pad, ar.x + ar.w - pad),
      y: SP.clamp(y, ar.y + pad, ar.y + ar.h - pad)
    };
  }

  function clampTurretPos(x, y) {
    const ar = SP.state.arena;
    const isWaves = getVariant() === "waves";
    const padX = TURRET_RADIUS + 6;
    const padTop = isWaves ? 32 : TURRET_RADIUS + 6;
    const padBot = isWaves ? 38 : TURRET_RADIUS + 6;
    return {
      x: SP.clamp(x, ar.x + padX, ar.x + ar.w - padX),
      y: SP.clamp(y, ar.y + padTop, ar.y + ar.h - padBot)
    };
  }

  function isValidTurretPos(x, y, ignoreId) {
    const minD2 = SP.activeParams.tw_min_spacing * SP.activeParams.tw_min_spacing;
    for (const t of tw.turrets) {
      if (t.id === ignoreId) continue;
      if (SP.dist2(x, y, t.x, t.y) < minD2) return false;
    }
    return true;
  }

  function findValidSnapPos(rawX, rawY, ignoreId) {
    const p = clampTurretPos(rawX, rawY);
    if (isValidTurretPos(p.x, p.y, ignoreId)) return p;
    const sp = SP.activeParams.tw_min_spacing;
    for (const r of [sp * 0.65, sp * 1.1]) {
      for (let k = 0; k < 10; k++) {
        const ang = (Math.PI * 2 * k) / 10;
        const cand = clampTurretPos(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r);
        if (isValidTurretPos(cand.x, cand.y, ignoreId)) return cand;
      }
    }
    return null;
  }

  function collectStarsNear(x, y, rad, team) {
    const st = SP.state;
    const ap = SP.activeParams;
    const r2 = rad * rad;
    for (let si = st.stars.length - 1; si >= 0; si--) {
      const star = st.stars[si];
      if (SP.dist2(x, y, star.x, star.y) <= r2) {
        if (team === SP.TEAM_PLAYER) { st.playerScore++; SP.arena.spawnFloat(star.x, star.y, "+1 ★", "#ffd638"); }
        else { st.aiScore++; SP.arena.spawnFloat(star.x, star.y, "+1 ★", ap.ai_color); }
        SP.arena.spawnRing(star.x, star.y, "#ffd638", 9);
        SP.playSfx("star");
        st.stars.splice(si, 1);
      }
    }
  }

  function placeTurret(team, typeId, x, y, instantReady) {
    const ap = SP.activeParams;
    const info = SP.TW_TURRET_TYPES[typeId] || SP.TW_TURRET_TYPES.mg;
    const maxHp = ap.tw_turret_hp * info.hpMult;
    const rd = instantReady ? 0 : Math.max(0, ap.tw_redeploy_time);
    const t = {
      id: tw.nextTurretId++,
      team,
      type: info.id,
      x, y,
      hp: maxHp,
      maxHp,
      range: info.range,
      fireRate: info.fireRate,
      damage: info.damage,
      bulletSpeed: info.bulletSpeed,
      splash: info.splash,
      turnMult: info.turnMult || 1.0,
      fireCd: SP.randRange(0.05, 0.25),
      aim: team === SP.TEAM_PLAYER ? -Math.PI * 0.5 : Math.PI * 0.5,
      redeployTimer: rd,
      redeployTotal: Math.max(rd, 0.001),
      hitFlash: 0,
      muzzle: 0,
      pop: 1.45
    };
    tw.turrets.push(t);
    SP.arena.spawnRing(x, y, team === SP.TEAM_PLAYER ? ap.player_color : ap.ai_color, 7);
    if (SP.state.objId === "coin_rush" && getVariant() !== "waves") collectStarsNear(x, y, 30, team);
    return t;
  }

  function moveTurret(idx, nx, ny) {
    const ap = SP.activeParams;
    const t = tw.turrets[idx];
    const ox = t.x, oy = t.y;
    const rd = Math.max(0, ap.tw_redeploy_time);
    t.x = nx; t.y = ny;
    t.redeployTimer = rd;
    t.redeployTotal = Math.max(rd, 0.001);
    t.pop = 1.45;
    const col = t.team === SP.TEAM_PLAYER ? ap.player_color : ap.ai_color;
    tw.relocateTrails.push({ fx: ox, fy: oy, tx: nx, ty: ny, life: 0.35, maxLife: 0.35, color: col });
    SP.arena.spawnRing(nx, ny, col, 6);
    if (SP.state.objId === "coin_rush" && getVariant() !== "waves") collectStarsNear(nx, ny, 30, t.team);
  }

  function selectBuildType(typeId) {
    if (!SP.TW_TURRET_TYPES[typeId]) return;
    tw.selectedBuildType = typeId;
    SP.playSfx("step");
    syncTwHud(true);
  }

  function clearSelection() {
    tw.selectedTurretId = -1;
    tw.dragTurretId = -1;
    tw.isDragging = false;
    syncTwHud(true);
  }

  function recallSelectedTurret() {
    const st = SP.state;
    if (!st.running || tw.selectedTurretId === -1) return;
    const idx = findTurretIdx(tw.selectedTurretId);
    if (idx === -1) { tw.selectedTurretId = -1; syncTwHud(true); return; }
    const t = tw.turrets[idx];
    if (t.team !== SP.TEAM_PLAYER) return;
    tw.turrets.splice(idx, 1);
    tw.selectedTurretId = -1;
    SP.arena.spawnRing(t.x, t.y, SP.activeParams.player_color, 7);
    SP.arena.spawnFloat(t.x, t.y - 16, "RAPPELÉE", SP.activeParams.player_color);
    SP.playSfx("pickup");
    syncTwHud(true);
  }

  function chooseAiTurretPos(typeId, ignoreId) {
    const st = SP.state;
    const ap = SP.activeParams;
    const ar = st.arena;
    const cx = ar.x + ar.w * 0.5, cy = ar.y + ar.h * 0.5;
    let tx = cx, ty = cy - ar.h * 0.12;
    const huntChance = ap.ai_style === "aggressive" ? 0.65 : (ap.ai_style === "objective" ? 0.12 : 0.30);

    if (st.objId === "elimination" || Math.random() < huntChance) {
      const pts = [];
      for (const t of tw.turrets) if (t.team === SP.TEAM_PLAYER) pts.push(t);
      for (const s of tw.soldiers) if (s.team === SP.TEAM_PLAYER) pts.push(s);
      if (pts.length) {
        const p = pts[Math.floor(Math.random() * pts.length)];
        const standoff = typeId === "sniper" ? -155 : (typeId === "mg" ? -95 : -75);
        tx = p.x + SP.randRange(-65, 65);
        ty = p.y + standoff;
      }
    } else if (st.objId === "koth" && st.zones.length) {
      const offY = typeId === "sniper" ? -95 : SP.randRange(-34, 34);
      tx = st.zones[0].x + SP.randRange(-52, 52);
      ty = st.zones[0].y + offY;
    } else if (st.objId === "domination" && st.zones.length) {
      const cands = st.zones.filter((z) => z.owner !== SP.TEAM_AI);
      const z = cands.length ? cands[Math.floor(Math.random() * cands.length)] : st.zones[Math.floor(Math.random() * st.zones.length)];
      tx = z.x + SP.randRange(-40, 40);
      ty = z.y + (typeId === "sniper" ? -25 : 0);
    } else if (st.objId === "escort") {
      tx = st.payloadPos.x + SP.randRange(-55, 55);
      ty = st.payloadPos.y + (typeId === "sniper" ? -48 : -15);
    } else if (st.objId === "coin_rush" && st.stars.length) {
      const star = st.stars[Math.floor(Math.random() * st.stars.length)];
      tx = star.x; ty = star.y;
    }
    if (typeId === "sniper") ty = Math.min(ty, cy + 20);
    return findValidSnapPos(tx, ty, ignoreId);
  }

  function spawnSoldier(team, x, y, kind) {
    let hp = 55, spd = 54, rad = SOLDIER_RADIUS, dmg = 10;
    if (getVariant() === "waves") {
      const scaleHp = 1 + Math.max(0, tw.waveNum - 1) * 0.10;
      if (kind === "runner") { hp = 38 * scaleHp; spd = 86; rad = 7.5; dmg = 8; }
      else if (kind === "tank") { hp = 155 * scaleHp; spd = 36; rad = 12; dmg = 18; }
      else { hp = 64 * scaleHp; spd = 52; rad = 9; dmg = 11; }
    }
    const p = clampToArena(x, y, rad);
    tw.soldiers.push({
      team, kind, x: p.x, y: p.y, vx: 0, vy: 0,
      hp, maxHp: hp, speed: spd, radius: rad, damage: dmg,
      fireCd: SP.randRange(0.1, 0.5),
      aim: team === SP.TEAM_PLAYER ? -Math.PI * 0.5 : Math.PI * 0.5,
      walk: SP.randRange(0, Math.PI * 2),
      hitFlash: 0, muzzle: 0
    });
  }

  function applyDamageToSoldier(si, dmg, killerTeam) {
    const s = tw.soldiers[si];
    if (!s) return;
    s.hp -= dmg;
    s.hitFlash = 1;
    const ap = SP.activeParams;
    const st = SP.state;
    SP.arena.spawnRing(s.x, s.y, killerTeam === SP.TEAM_PLAYER ? ap.player_color : ap.ai_color, 2);
    if (s.hp <= 0) {
      tw.soldiers.splice(si, 1);
      SP.arena.spawnRing(s.x, s.y, killerTeam === SP.TEAM_PLAYER ? ap.ai_color : ap.player_color, 6);
      SP.playSfx("ko");
      if (killerTeam === SP.TEAM_PLAYER) {
        st.playerKills++;
        if (getVariant() === "waves") st.playerScore++;
        else if (st.objId === "elimination") { st.playerScore++; SP.arena.spawnFloat(s.x, s.y, "+1", ap.player_color); }
      } else {
        st.aiKills++;
        if (st.objId === "elimination" && getVariant() !== "waves") { st.aiScore++; SP.arena.spawnFloat(s.x, s.y, "+1", ap.ai_color); }
      }
    }
  }

  function applyDamageToTurret(ti, dmg, killerTeam) {
    const t = tw.turrets[ti];
    if (!t) return;
    t.hp -= dmg;
    t.hitFlash = 1;
    const ap = SP.activeParams;
    const st = SP.state;
    SP.arena.spawnRing(t.x, t.y, killerTeam === SP.TEAM_PLAYER ? ap.player_color : ap.ai_color, 3);
    if (t.hp <= 0) {
      tw.turrets.splice(ti, 1);
      if (t.id === tw.selectedTurretId) tw.selectedTurretId = -1;
      if (t.id === tw.dragTurretId) { tw.dragTurretId = -1; tw.isDragging = false; }
      SP.arena.spawnRing(t.x, t.y, t.team === SP.TEAM_PLAYER ? ap.player_color : ap.ai_color, 12);
      SP.playSfx("ko");
      if (killerTeam === SP.TEAM_PLAYER) {
        st.playerKills++;
        if (st.objId === "elimination" && getVariant() !== "waves") { st.playerScore += 3; SP.arena.spawnFloat(t.x, t.y, "+3", ap.player_color); }
      } else {
        st.aiKills++;
        if (st.objId === "elimination" && getVariant() !== "waves") { st.aiScore += 3; SP.arena.spawnFloat(t.x, t.y, "+3", ap.ai_color); }
      }
      if (ap.respawn_enabled || t.team === SP.TEAM_PLAYER) {
        tw.respawnQueue.push({ team: t.team, t: ap.tw_respawn_delay });
      }
    }
  }

  function triggerSplash(cx, cy, radius, dmg, killerTeam) {
    tw.shockwaves.push({ x: cx, y: cy, radius, life: 0.25, maxLife: 0.25, color: "#ff943d" });
    SP.arena.spawnRing(cx, cy, "#ffa640", 7);
    const r2 = radius * radius;
    for (let si = tw.soldiers.length - 1; si >= 0; si--) {
      const s = tw.soldiers[si];
      if (s.team !== killerTeam && SP.dist2(cx, cy, s.x, s.y) <= r2) applyDamageToSoldier(si, dmg, killerTeam);
    }
    for (let ti = tw.turrets.length - 1; ti >= 0; ti--) {
      const t = tw.turrets[ti];
      if (t.team !== killerTeam && SP.dist2(cx, cy, t.x, t.y) <= r2) applyDamageToTurret(ti, dmg, killerTeam);
    }
  }

  function finishWavesMatch(winner, reason) {
    const st = SP.state;
    const ap = SP.activeParams;
    const dom = SP.dom;
    st.running = false;
    st.matchEnded = true;
    st.isTouching = false;
    SP.playSfx(winner === "player" ? "win" : "lose");
    syncTwHud(true);
    dom.endTitleEl.textContent = winner === "player" ? SP.activeTexts.victoryTitle : SP.activeTexts.defeatTitle;
    dom.endTitleEl.style.color = winner === "player" ? SP.lightenHex(ap.player_color, 0.25) : ap.ai_color;
    dom.endReasonEl.textContent = `Vagues (${tw.waveNum}) — ${reason}`;
    dom.endStatsEl.innerHTML = `Vous : ${Math.round(st.playerScore)} &nbsp; vs &nbsp; IA : ${Math.round(st.aiScore)}<br/>Éliminations : ${st.playerKills} vs ${st.aiKills}`;
    dom.endOverlay.classList.remove("hidden");
  }

  function updateTw(dt) {
    const st = SP.state;
    const ap = SP.activeParams;
    const ar = st.arena;
    if (!st.running || st.menuOpen || st.externalPaused || st.destroyed) return;
    st.matchHasTicked = true;
    st.animTime += dt;
    st.timeLeft = Math.max(0, st.timeLeft - dt);
    const variant = getVariant();

    for (let i = tw.respawnQueue.length - 1; i >= 0; i--) {
      tw.respawnQueue[i].t -= dt;
      if (tw.respawnQueue[i].t <= 0) {
        const team = tw.respawnQueue[i].team;
        tw.respawnQueue.splice(i, 1);
        if (team === SP.TEAM_PLAYER) {
          SP.arena.spawnFloat(ar.x + ar.w * 0.5, ar.y + ar.h - 36, "+1 TOURELLE DISPO", ap.player_color);
        }
      }
    }

    if (variant !== "duel") {
      tw.waveTimer -= dt;
      if (tw.waveTimer <= 0) {
        if (variant === "waves") {
          tw.waveNum++;
          const dm = ap.ai_difficulty === "easy" ? 0.75 : (ap.ai_difficulty === "hard" ? 1.25 : (ap.ai_difficulty === "expert" ? 1.55 : 1.0));
          tw.waveTimer = Math.max(2.2, ap.tw_wave_interval - tw.waveNum * 0.14);
          const count = Math.round((3 + tw.waveNum * 1.15) * dm);
          for (let k = 0; k < count; k++) {
            let kind = "grunt";
            if (tw.waveNum >= 3 && k % 5 === 4) kind = "tank";
            else if (tw.waveNum >= 2 && k % 3 === 2) kind = "runner";
            const x = ar.x + 28 + ((ar.w - 56) * ((k % 6) + 0.5)) / 6 + SP.randRange(-10, 10);
            const y = ar.y + 18 + Math.floor(k / 6) * 20;
            spawnSoldier(SP.TEAM_AI, x, y, kind);
          }
          SP.arena.spawnFloat(ar.x + ar.w * 0.5, ar.y + 38, `VAGUE ${tw.waveNum} (${count})`, ap.ai_color);
        } else {
          tw.waveTimer = ap.tw_wave_interval;
          let pCnt = 0, aCnt = 0;
          for (const s of tw.soldiers) { if (s.team === SP.TEAM_PLAYER) pCnt++; else aCnt++; }
          for (let k = 0; k < 3; k++) {
            if (pCnt + k < 14) {
              const px = ar.x + 42 + ((ar.w - 84) * (k + 0.5)) / 3 + SP.randRange(-14, 14);
              spawnSoldier(SP.TEAM_PLAYER, px, ar.y + ar.h - 26, "grunt");
            }
            if (aCnt + k < 14) {
              const ax = ar.x + 42 + ((ar.w - 84) * (k + 0.5)) / 3 + SP.randRange(-14, 14);
              spawnSoldier(SP.TEAM_AI, ax, ar.y + 26, "grunt");
            }
          }
        }
      }
    }

    if (variant !== "waves") {
      tw.aiActionTimer -= dt;
      tw.aiRedeployCd -= dt;
      if (tw.aiActionTimer <= 0) {
        const aiInt = ap.ai_difficulty === "easy" ? 3.2 : (ap.ai_difficulty === "hard" ? 1.35 : (ap.ai_difficulty === "expert" ? 0.85 : 2.1));
        tw.aiActionTimer = aiInt * SP.randRange(0.85, 1.15);
        const aiCur = countTurrets(SP.TEAM_AI);
        const aiResp = countRespawning(SP.TEAM_AI);
        const types = ["mg", "sniper", "cannon"];
        if (aiCur + aiResp < ap.tw_max_turrets) {
          const tp = types[(aiCur + Math.floor(Math.random() * 3)) % 3];
          const dest = chooseAiTurretPos(tp, -1);
          if (dest) placeTurret(SP.TEAM_AI, tp, dest.x, dest.y, false);
        } else if (tw.aiRedeployCd <= 0 && aiCur > 0) {
          tw.aiRedeployCd = aiInt * 1.4;
          const cands = [];
          for (let i = 0; i < tw.turrets.length; i++) {
            if (tw.turrets[i].team === SP.TEAM_AI && tw.turrets[i].redeployTimer <= 0) cands.push(i);
          }
          if (cands.length) {
            const ci = cands[Math.floor(Math.random() * cands.length)];
            const t = tw.turrets[ci];
            const dest = chooseAiTurretPos(t.type, t.id);
            if (dest && SP.dist(dest.x, dest.y, t.x, t.y) > 48) moveTurret(ci, dest.x, dest.y);
          }
        }
      }
    }

    for (const t of tw.turrets) {
      t.hitFlash = Math.max(0, t.hitFlash - dt * 5);
      t.muzzle = Math.max(0, t.muzzle - dt * 9);
      t.pop += (1 - t.pop) * Math.min(dt * 12, 1);
      if (t.redeployTimer > 0) {
        t.redeployTimer = Math.max(0, t.redeployTimer - dt);
        continue;
      }
      t.fireCd -= dt;
      const r2 = t.range * t.range;
      let bestTarget = null, bestScore = Infinity;
      for (const s of tw.soldiers) {
        if (s.team === t.team) continue;
        const d2 = SP.dist2(t.x, t.y, s.x, s.y);
        if (d2 <= r2) {
          const score = variant === "waves" ? (ar.y + ar.h - s.y) : d2;
          if (score < bestScore) { bestScore = score; bestTarget = s; }
        }
      }
      for (const ot of tw.turrets) {
        if (ot.team === t.team) continue;
        const d2 = SP.dist2(t.x, t.y, ot.x, ot.y);
        if (d2 <= r2 && d2 * 1.1 < bestScore) { bestScore = d2 * 1.1; bestTarget = ot; }
      }
      if (bestTarget) {
        const tgtAng = Math.atan2(bestTarget.y - t.y, bestTarget.x - t.x);
        const rot = SP.stepAimAngle(t.aim, tgtAng, ap.aim_turn_time * (t.turnMult || 1.0), dt);
        t.aim = rot.angle;
        if (rot.aligned && t.fireCd <= 0) {
          t.fireCd = 1 / Math.max(0.25, t.fireRate);
          t.muzzle = 1;
          const spread = t.type === "sniper" ? 0.015 : 0.06;
          const ang = t.aim + SP.randRange(-spread, spread);
          const dx = Math.cos(ang), dy = Math.sin(ang);
          st.bullets.push({
            team: t.team, kind: t.type,
            x: t.x + dx * (TURRET_RADIUS + 6), y: t.y + dy * (TURRET_RADIUS + 6),
            vx: dx * t.bulletSpeed, vy: dy * t.bulletSpeed,
            life: (t.range * 1.25) / t.bulletSpeed,
            damage: t.damage, splash: t.splash
          });
          SP.playSfx("shoot");
        }
      }
    }

    for (let i = tw.soldiers.length - 1; i >= 0; i--) {
      const s = tw.soldiers[i];
      s.hitFlash = Math.max(0, s.hitFlash - dt * 5);
      s.muzzle = Math.max(0, s.muzzle - dt * 10);
      if (variant === "waves") {
        let nearTPos = null, nearTD2 = 78 * 78;
        for (const t of tw.turrets) {
          if (t.team !== SP.TEAM_PLAYER) continue;
          const d2 = SP.dist2(s.x, s.y, t.x, t.y);
          if (d2 < nearTD2) { nearTD2 = d2; nearTPos = t; }
        }
        let sx = 0, sy = 0;
        for (let j = 0; j < tw.soldiers.length; j++) {
          if (i === j) continue;
          const dx = s.x - tw.soldiers[j].x, dy = s.y - tw.soldiers[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 484 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            sx += (dx / d) * (22 - d) * 2.5;
            sy += (dy / d) * (22 - d) * 2.5;
          }
        }
        s.vx = sx; s.vy = s.speed + sy;
        const p = clampToArena(s.x + s.vx * dt, s.y + s.vy * dt, s.radius);
        s.x = p.x; s.y = p.y;
        s.walk += dt * (5 + s.speed * 0.08);
        s.fireCd -= dt;
        if (nearTPos) {
          const rot = SP.stepAimAngle(s.aim, Math.atan2(nearTPos.y - s.y, nearTPos.x - s.x), ap.aim_turn_time, dt);
          s.aim = rot.angle;
          if (rot.aligned && s.fireCd <= 0) {
            s.fireCd = 1.15; s.muzzle = 1;
            const dx = Math.cos(s.aim), dy = Math.sin(s.aim);
            st.bullets.push({
              team: s.team, kind: "soldier",
              x: s.x + dx * (s.radius + 3), y: s.y + dy * (s.radius + 3),
              vx: dx * SOLDIER_BULLET_SPEED, vy: dy * SOLDIER_BULLET_SPEED,
              life: 0.42, damage: s.damage, splash: 0
            });
          }
        } else {
          s.aim = SP.stepAimAngle(s.aim, Math.PI * 0.5, Math.max(ap.aim_turn_time, 0.18), dt).angle;
        }
        if (s.y >= ar.y + ar.h - 26) {
          const leakDmg = s.kind === "runner" ? 15 : (s.kind === "tank" ? 45 : 20);
          tw.baseHp = Math.max(0, tw.baseHp - leakDmg);
          st.aiScore++;
          SP.arena.spawnRing(s.x, s.y, ap.ai_color, 9);
          SP.arena.spawnFloat(s.x, s.y - 18, `-${leakDmg} BASE`, ap.ai_color);
          SP.playSfx("ko");
          tw.soldiers.splice(i, 1);
        }
      } else {
        let nearE = null, nearD2 = Infinity;
        let sx = 0, sy = 0;
        for (let j = 0; j < tw.soldiers.length; j++) {
          if (i === j) continue;
          const o = tw.soldiers[j];
          const dx = s.x - o.x, dy = s.y - o.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 529 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            sx += (dx / d) * (23 - d) * 3;
            sy += (dy / d) * (23 - d) * 3;
          }
          if (o.team !== s.team && d2 < nearD2) { nearD2 = d2; nearE = o; }
        }
        for (const t of tw.turrets) {
          if (t.team !== s.team) {
            const d2 = SP.dist2(s.x, s.y, t.x, t.y);
            if (d2 < nearD2) { nearD2 = d2; nearE = t; }
          }
        }
        let gx = 0, gy = 0;
        if (!(nearE && nearD2 <= (SOLDIER_SHOOT_RANGE * 0.72) * (SOLDIER_SHOOT_RANGE * 0.72))) {
          if (st.objId === "koth" && st.zones.length) {
            const dx = st.zones[0].x - s.x, dy = st.zones[0].y - s.y, d = Math.hypot(dx, dy);
            if (d > st.zones[0].r * 0.65 && d > 0) { gx = (dx / d) * 0.85; gy = (dy / d) * 0.85; }
          } else if (st.objId === "domination" && st.zones.length) {
            let bz = st.zones[0], bw = Infinity;
            for (const z of st.zones) {
              const w = SP.dist(s.x, s.y, z.x, z.y) * (z.owner === s.team ? 1.45 : 0.75);
              if (w < bw) { bw = w; bz = z; }
            }
            const dx = bz.x - s.x, dy = bz.y - s.y, d = Math.hypot(dx, dy);
            if (d > bz.r * 0.6 && d > 0) { gx = (dx / d) * 0.85; gy = (dy / d) * 0.85; }
          } else if (st.objId === "escort") {
            const dx = st.payloadPos.x - s.x, dy = st.payloadPos.y - s.y, d = Math.hypot(dx, dy);
            if (d > 48 && d > 0) { gx = (dx / d) * 0.85; gy = (dy / d) * 0.85; }
          } else if (st.objId === "coin_rush" && st.stars.length) {
            let bs = null, bd2 = 240 * 240;
            for (const star of st.stars) {
              const d2 = SP.dist2(s.x, s.y, star.x, star.y);
              if (d2 < bd2) { bd2 = d2; bs = star; }
            }
            if (bs) { const d = Math.sqrt(bd2) || 1; gx = ((bs.x - s.x) / d) * 0.95; gy = ((bs.y - s.y) / d) * 0.95; }
          } else if (nearE) {
            const d = Math.sqrt(nearD2) || 1;
            gx = ((nearE.x - s.x) / d) * 0.75; gy = ((nearE.y - s.y) / d) * 0.75;
          } else {
            gy = s.team === SP.TEAM_PLAYER ? -0.6 : 0.6;
          }
        }
        let dvx = gx * s.speed + sx, dvy = gy * s.speed + sy;
        const dl = Math.hypot(dvx, dvy);
        if (dl > s.speed * 1.4) { dvx = (dvx / dl) * s.speed * 1.4; dvy = (dvy / dl) * s.speed * 1.4; }
        const blend = Math.min(dt * 7, 1);
        s.vx += (dvx - s.vx) * blend; s.vy += (dvy - s.vy) * blend;
        const p = clampToArena(s.x + s.vx * dt, s.y + s.vy * dt, s.radius);
        s.x = p.x; s.y = p.y;
        const spd = Math.hypot(s.vx, s.vy);
        if (spd > 6) s.walk += dt * (6 + spd * 0.08);
        s.fireCd -= dt;
        if (nearE && nearD2 <= SOLDIER_SHOOT_RANGE * SOLDIER_SHOOT_RANGE) {
          const rot = SP.stepAimAngle(s.aim, Math.atan2(nearE.y - s.y, nearE.x - s.x), ap.aim_turn_time, dt);
          s.aim = rot.angle;
          if (rot.aligned && s.fireCd <= 0) {
            s.fireCd = 0.85 * SP.randRange(0.88, 1.12); s.muzzle = 1;
            const ang = s.aim + SP.randRange(-0.07, 0.07);
            const dx = Math.cos(ang), dy = Math.sin(ang);
            st.bullets.push({
              team: s.team, kind: "soldier",
              x: s.x + dx * (s.radius + 3), y: s.y + dy * (s.radius + 3),
              vx: dx * SOLDIER_BULLET_SPEED, vy: dy * SOLDIER_BULLET_SPEED,
              life: 0.48, damage: s.damage, splash: 0
            });
          }
        } else if (spd > 8) {
          s.aim = SP.stepAimAngle(s.aim, Math.atan2(s.vy, s.vx), Math.max(ap.aim_turn_time, 0.18), dt).angle;
        }
      }
    }

    for (let bi = st.bullets.length - 1; bi >= 0; bi--) {
      const b = st.bullets[bi];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let hit = b.life <= 0 || b.x < ar.x || b.x > ar.x + ar.w || b.y < ar.y || b.y > ar.y + ar.h;
      if (!hit) {
        for (let si = tw.soldiers.length - 1; si >= 0; si--) {
          const s = tw.soldiers[si];
          if (s.team === b.team) continue;
          const sr = s.radius + 4.5;
          if (SP.dist2(b.x, b.y, s.x, s.y) <= sr * sr) {
            applyDamageToSoldier(si, b.damage, b.team);
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        for (let ti = tw.turrets.length - 1; ti >= 0; ti--) {
          const t = tw.turrets[ti];
          if (t.team === b.team) continue;
          const tr = TURRET_RADIUS + 4;
          if (SP.dist2(b.x, b.y, t.x, t.y) <= tr * tr) {
            applyDamageToTurret(ti, b.damage, b.team);
            hit = true;
            break;
          }
        }
      }
      if (hit && b.splash > 0) triggerSplash(b.x, b.y, b.splash, b.damage * 0.70, b.team);
      if (hit) st.bullets.splice(bi, 1);
    }

    if (variant !== "waves") {
      if (st.objId === "koth" && st.zones.length) {
        const z = st.zones[0], r2 = z.r * z.r;
        let pc = 0, ac = 0;
        for (const t of tw.turrets) if (SP.dist2(t.x, t.y, z.x, z.y) <= r2) { if (t.team === SP.TEAM_PLAYER) pc += 2; else ac += 2; }
        for (const s of tw.soldiers) if (SP.dist2(s.x, s.y, z.x, z.y) <= r2) { if (s.team === SP.TEAM_PLAYER) pc += 1; else ac += 1; }
        z.pCount = pc; z.aCount = ac;
        if (pc > ac) { z.owner = SP.TEAM_PLAYER; st.playerScore += dt * (2.2 + 0.25 * (pc - ac)); }
        else if (ac > pc) { z.owner = SP.TEAM_AI; st.aiScore += dt * (2.2 + 0.25 * (ac - pc)); }
        else z.owner = -1;
      } else if (st.objId === "domination") {
        for (const z of st.zones) {
          const r2 = z.r * z.r;
          let pc = 0, ac = 0;
          for (const t of tw.turrets) if (SP.dist2(t.x, t.y, z.x, z.y) <= r2) { if (t.team === SP.TEAM_PLAYER) pc += 2; else ac += 2; }
          for (const s of tw.soldiers) if (SP.dist2(s.x, s.y, z.x, z.y) <= r2) { if (s.team === SP.TEAM_PLAYER) pc += 1; else ac += 1; }
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
        for (const t of tw.turrets) if (SP.dist2(t.x, t.y, st.payloadPos.x, st.payloadPos.y) <= 84 * 84) { if (t.team === SP.TEAM_PLAYER) pc += 2; else ac += 2; }
        for (const s of tw.soldiers) if (SP.dist2(s.x, s.y, st.payloadPos.x, st.payloadPos.y) <= 78 * 78) { if (s.team === SP.TEAM_PLAYER) pc += 1; else ac += 1; }
        const net = pc - ac;
        if (net !== 0) {
          st.payloadProgress = SP.clamp(st.payloadProgress + SP.clamp(net * 0.022, -0.11, 0.11) * dt, 0, 1);
          st.payloadPos = SP.arena.payloadPosFromProgress(st.payloadProgress);
        }
        st.playerScore = st.payloadProgress * 100;
        st.aiScore = (1 - st.payloadProgress) * 100;
      } else if (st.objId === "coin_rush") {
        st.starTimer -= dt;
        if (st.starTimer <= 0 && st.stars.length < 5) { SP.arena.spawnStar(); st.starTimer = 1.6; }
        for (let si = st.stars.length - 1; si >= 0; si--) {
          const star = st.stars[si];
          let by = -1;
          for (const s of tw.soldiers) if (SP.dist2(s.x, s.y, star.x, star.y) <= 24 * 24) { by = s.team; break; }
          if (by === -1) for (const t of tw.turrets) if (SP.dist2(t.x, t.y, star.x, star.y) <= 30 * 30) { by = t.team; break; }
          if (by !== -1) {
            if (by === SP.TEAM_PLAYER) { st.playerScore++; SP.arena.spawnFloat(star.x, star.y, "+1 ★", "#ffd638"); }
            else { st.aiScore++; SP.arena.spawnFloat(star.x, star.y, "+1 ★", ap.ai_color); }
            SP.arena.spawnRing(star.x, star.y, "#ffd638", 9);
            SP.playSfx("star");
            st.stars.splice(si, 1);
          }
        }
      }
    }

    for (let i = tw.shockwaves.length - 1; i >= 0; i--) {
      tw.shockwaves[i].life -= dt;
      if (tw.shockwaves[i].life <= 0) tw.shockwaves.splice(i, 1);
    }
    for (let i = tw.relocateTrails.length - 1; i >= 0; i--) {
      tw.relocateTrails[i].life -= dt;
      if (tw.relocateTrails[i].life <= 0) tw.relocateTrails.splice(i, 1);
    }
    SP.arena.tickVfx(dt);

    if (variant === "waves") {
      if (tw.baseHp <= 0) { finishWavesMatch("ai", "Base détruite !"); return; }
      if (st.timeLeft <= 0) { finishWavesMatch("player", `Base défendue (${Math.round(tw.baseHp)} PV) !`); return; }
    } else {
      let reason = "";
      if (st.objId === "escort") {
        if (st.payloadProgress >= 0.995) reason = "Convoi livré !";
        else if (st.payloadProgress <= 0.005) reason = "L'IA a livré le convoi !";
      }
      if (st.objId === "elimination" && !ap.respawn_enabled && variant === "duel") {
        if (countTurrets(SP.TEAM_AI) === 0 && tw.turrets.length > 0) reason = "Tourelles adverses détruites !";
      }
      if (!reason && st.timeLeft <= 0) reason = SP.activeTexts.timeoutTitle;
      if (reason) { SP.arena.finishRealtimeMatch(reason, syncTwHud); return; }
    }

    syncTwHud(false);
  }

  function syncTwHud(force) {
    const st = SP.state;
    const ap = SP.activeParams;
    const dom = SP.dom;
    if (st.gameMode !== "tower") return;
    const now = performance.now();
    if (!force && now - st.lastHudSync < 65) return;
    st.lastHudSync = now;

    dom.pScoreEl.textContent = Math.round(st.playerScore);
    dom.aScoreEl.textContent = Math.round(st.aiScore);
    dom.timerEl.textContent = SP.formatTime(st.timeLeft);

    const variant = getVariant();
    if (variant === "waves") {
      dom.objBadgeEl.textContent = `VAGUE ${tw.waveNum} • Base ${Math.round(tw.baseHp)}/${Math.round(tw.baseMaxHp)} PV`;
      dom.objBadgeEl.style.color = tw.baseHp > tw.baseMaxHp * 0.35 ? "#8ce9ff" : "#ff7373";
    } else {
      dom.objBadgeEl.textContent = `${st.objInfo.name} • TOWER`;
      dom.objBadgeEl.style.color = "";
    }

    const placed = countTurrets(SP.TEAM_PLAYER);
    const res = getPlayerReserve();
    dom.twCountLbl.textContent = `🗼 ${placed}/${ap.tw_max_turrets} • Rés:${res}`;
    dom.btnTwMg.classList.toggle("active", tw.selectedBuildType === "mg");
    dom.btnTwSniper.classList.toggle("active", tw.selectedBuildType === "sniper");
    dom.btnTwCannon.classList.toggle("active", tw.selectedBuildType === "cannon");
    const hasSel = tw.selectedTurretId !== -1;
    dom.btnTwRecall.disabled = !hasSel;
    if (hasSel) {
      dom.twHintLbl.textContent = `Touchez pour déplacer (${ap.tw_redeploy_time.toFixed(2)}s) ou ↩ rappeler`;
    } else if (res > 0) {
      dom.twHintLbl.textContent = "Touchez pour poser • Glissez une tourelle pour déplacer";
    } else {
      dom.twHintLbl.textContent = "Tourelles au max — Glissez pour repositionner";
    }
  }

  function renderTw(ctx) {
    const st = SP.state;
    const ap = SP.activeParams;
    const ar = st.arena;
    const variant = getVariant();
    const pCol = ap.player_color, aCol = ap.ai_color;
    const pDark = SP.darkenHex(pCol, 0.48), aDark = SP.darkenHex(aCol, 0.48);

    if (variant === "waves") {
      ctx.fillStyle = "#171f2b";
      ctx.fillRect(0, 0, st.viewW, st.viewH);
      ctx.fillStyle = ap.arena_bg_color;
      ctx.fillRect(ar.x, ar.y, ar.w, ar.h);
      ctx.fillStyle = `rgba(${SP.hexToRgbStr(aCol)}, 0.14)`;
      ctx.fillRect(ar.x, ar.y, ar.w, 32);
      ctx.fillStyle = `rgba(${SP.hexToRgbStr(pCol)}, 0.22)`;
      ctx.fillRect(ar.x, ar.y + ar.h - 34, ar.w, 34);
      ctx.strokeStyle = pCol; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(ar.x, ar.y + ar.h - 34); ctx.lineTo(ar.x + ar.w, ar.y + ar.h - 34); ctx.stroke();

      ctx.strokeStyle = "rgba(42, 54, 74, 0.7)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = ar.x + 44; gx < ar.x + ar.w; gx += 44) { ctx.moveTo(gx, ar.y); ctx.lineTo(gx, ar.y + ar.h); }
      for (let gy = ar.y + 44; gy < ar.y + ar.h; gy += 44) { ctx.moveTo(ar.x, gy); ctx.lineTo(ar.x + ar.w, gy); }
      ctx.stroke();
      ctx.strokeStyle = "rgba(82, 108, 145, 0.85)"; ctx.lineWidth = 2.5;
      ctx.strokeRect(ar.x, ar.y, ar.w, ar.h);

      const hpFrac = SP.clamp(tw.baseHp / Math.max(tw.baseMaxHp, 1), 0, 1);
      const bw = ar.w - 40, bx = ar.x + 20, by = ar.y + ar.h - 20;
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bx, by, bw, 10);
      ctx.fillStyle = hpFrac > 0.35 ? "#47e08c" : aCol; ctx.fillRect(bx, by, bw * hpFrac, 10);
      ctx.fillStyle = "#eaf4ff"; ctx.font = "800 11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`BASE ${Math.round(tw.baseHp)} / ${Math.round(tw.baseMaxHp)} PV`, ar.x + ar.w * 0.5, by - 3);
    } else {
      SP.arena.renderArenaBaseAndObjectives(ctx);
    }

    for (const tr of tw.relocateTrails) {
      const a = SP.clamp(tr.life / tr.maxLife, 0, 1);
      ctx.globalAlpha = a * 0.7;
      ctx.strokeStyle = tr.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tr.fx, tr.fy); ctx.lineTo(tr.tx, tr.ty); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (tw.selectedTurretId !== -1) {
      const si = findTurretIdx(tw.selectedTurretId);
      if (si !== -1) {
        const stT = tw.turrets[si];
        ctx.fillStyle = "rgba(77, 217, 255, 0.08)";
        ctx.strokeStyle = "rgba(97, 230, 255, 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(stT.x, stT.y, stT.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }

    if (tw.isDragging && tw.dragTurretId !== -1) {
      const di = findTurretIdx(tw.dragTurretId);
      if (di !== -1) {
        const dtT = tw.turrets[di];
        const gCol = tw.dragValid ? "#52f299" : "#ff5959";
        ctx.strokeStyle = gCol; ctx.globalAlpha = 0.6; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(dtT.x, dtT.y); ctx.lineTo(tw.dragCur.x, tw.dragCur.y); ctx.stroke();
        ctx.fillStyle = gCol; ctx.globalAlpha = 0.1;
        ctx.beginPath(); ctx.arc(tw.dragCur.x, tw.dragCur.y, dtT.range, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.72; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(tw.dragCur.x, tw.dragCur.y, dtT.range, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(tw.dragCur.x, tw.dragCur.y, TURRET_RADIUS, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(tw.dragCur.x, tw.dragCur.y, TURRET_RADIUS, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    for (const t of tw.turrets) {
      const isP = t.team === SP.TEAM_PLAYER;
      const r = TURRET_RADIUS * t.pop;
      const info = SP.TW_TURRET_TYPES[t.type] || SP.TW_TURRET_TYPES.mg;
      const baseCol = t.hitFlash > 0.2 ? "#ffffff" : (isP ? pCol : aCol);
      const darkCol = isP ? pDark : aDark;

      if (t.id === tw.selectedTurretId) {
        ctx.strokeStyle = "#ffd638"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(t.x, t.y, r + 5.5, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.fillStyle = "rgba(0,0,0,0.36)";
      ctx.beginPath(); ctx.arc(t.x, t.y + 4, r + 1.5, 0, Math.PI * 2); ctx.fill();

      const sides = t.type === "mg" ? 8 : (t.type === "sniper" ? 6 : 4);
      const rotOff = sides === 4 ? Math.PI * 0.25 : 0;
      const drawPoly = (rad, col) => {
        ctx.beginPath();
        for (let k = 0; k < sides; k++) {
          const ang = rotOff + (Math.PI * 2 * k) / sides;
          const px = t.x + Math.cos(ang) * rad, py = t.y + Math.sin(ang) * rad;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fillStyle = col; ctx.fill();
      };
      drawPoly(r, darkCol);
      drawPoly(r * 0.78, baseCol);

      ctx.fillStyle = "#192338";
      ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = info.color;
      ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.34, 0, Math.PI * 2); ctx.fill();

      const ax = Math.cos(t.aim), ay = Math.sin(t.aim);
      const px = -ay, py = ax;
      if (t.type === "sniper") {
        ctx.strokeStyle = "#f2f5ff"; ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.moveTo(t.x + ax * 4, t.y + ay * 4); ctx.lineTo(t.x + ax * (r + 12), t.y + ay * (r + 12)); ctx.stroke();
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.arc(t.x + ax * (r + 12), t.y + ay * (r + 12), 2.2, 0, Math.PI * 2); ctx.fill();
      } else if (t.type === "cannon") {
        ctx.strokeStyle = "#e0e6f5"; ctx.lineWidth = 6.5;
        ctx.beginPath(); ctx.moveTo(t.x + ax * 3, t.y + ay * 3); ctx.lineTo(t.x + ax * (r + 8), t.y + ay * (r + 8)); ctx.stroke();
      } else {
        ctx.strokeStyle = "#e6f0ff"; ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(t.x + px * 3 + ax * 3, t.y + py * 3 + ay * 3); ctx.lineTo(t.x + px * 3 + ax * (r + 7.5), t.y + py * 3 + ay * (r + 7.5));
        ctx.moveTo(t.x - px * 3 + ax * 3, t.y - py * 3 + ay * 3); ctx.lineTo(t.x - px * 3 + ax * (r + 7.5), t.y - py * 3 + ay * (r + 7.5));
        ctx.stroke();
      }

      if (t.muzzle > 0.15) {
        const tipDist = r + (t.type === "sniper" ? 12 : 8);
        ctx.fillStyle = "#ffeb73";
        ctx.beginPath(); ctx.arc(t.x + ax * tipDist, t.y + ay * tipDist, 5.5 * t.muzzle, 0, Math.PI * 2); ctx.fill();
      }

      if (t.redeployTimer > 0.001) {
        const frac = SP.clamp(1 - t.redeployTimer / Math.max(t.redeployTotal, 0.001), 0, 1);
        ctx.fillStyle = "rgba(12, 20, 36, 0.45)";
        ctx.beginPath(); ctx.arc(t.x, t.y, r + 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ffd638"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(t.x, t.y, r + 3.5, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * frac); ctx.stroke();
      }

      const hpR = SP.clamp(t.hp / t.maxHp, 0, 1);
      if (hpR < 0.99) {
        ctx.fillStyle = "rgba(0,0,0,0.68)"; ctx.fillRect(t.x - 13, t.y - r - 9, 26, 4);
        ctx.fillStyle = isP ? "#4df273" : "#ff7361"; ctx.fillRect(t.x - 13, t.y - r - 9, 26 * hpR, 4);
      }
    }

    for (const s of tw.soldiers) {
      const isP = s.team === SP.TEAM_PLAYER;
      const r = s.radius;
      let col = isP ? pCol : aCol;
      if (s.kind === "runner") col = "#ff9440";
      else if (s.kind === "tank") col = "#d1335c";
      if (s.hitFlash > 0.2) col = "#ffffff";
      const bob = Math.sin(s.walk) * 1.6;
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.beginPath(); ctx.arc(s.x, s.y + 5, r * 0.78, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isP ? pDark : aDark;
      ctx.beginPath(); ctx.arc(s.x, s.y + bob, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(s.x, s.y + bob - 0.8, r * 0.8, 0, Math.PI * 2); ctx.fill();
      const ax = Math.cos(s.aim), ay = Math.sin(s.aim);
      ctx.strokeStyle = "#e0e9f7"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(s.x + ax * r * 0.4, s.y + ay * r * 0.4); ctx.lineTo(s.x + ax * (r + 4.5), s.y + ay * (r + 4.5)); ctx.stroke();
      const hpR = SP.clamp(s.hp / s.maxHp, 0, 1);
      if (hpR < 0.99) {
        ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(s.x - 9, s.y - r - 7, 18, 3);
        ctx.fillStyle = isP ? "#4df273" : "#ff7361"; ctx.fillRect(s.x - 9, s.y - r - 7, 18 * hpR, 3);
      }
    }

    for (const sw of tw.shockwaves) {
      const frac = 1 - SP.clamp(sw.life / sw.maxLife, 0, 1);
      ctx.globalAlpha = (1 - frac) * 0.85;
      ctx.strokeStyle = sw.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.radius * (0.35 + 0.65 * frac), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const b of st.bullets) {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const dx = b.vx / sp, dy = b.vy / sp;
      if (b.kind === "sniper") {
        ctx.strokeStyle = "rgba(255, 235, 97, 0.85)"; ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(b.x - dx * 22, b.y - dy * 22); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, 3.6, 0, Math.PI * 2); ctx.fill();
      } else if (b.kind === "cannon") {
        ctx.strokeStyle = "rgba(255, 158, 64, 0.65)"; ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.moveTo(b.x - dx * 10, b.y - dy * 10); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.fillStyle = "#ff9e40"; ctx.beginPath(); ctx.arc(b.x, b.y, 5.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffeb99"; ctx.beginPath(); ctx.arc(b.x, b.y, 2.8, 0, Math.PI * 2); ctx.fill();
      } else {
        const col = b.team === SP.TEAM_PLAYER ? SP.lightenHex(pCol, 0.55) : SP.lightenHex(aCol, 0.45);
        ctx.strokeStyle = col; ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.moveTo(b.x - dx * 10, b.y - dy * 10); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const p of st.particles) {
      const a = SP.clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    SP.arena.renderFloatTexts(ctx);
  }

  SP.modes.tower = {
    state: tw,
    selectBuildType,
    clearSelection,
    recallSelectedTurret,
    syncHud: syncTwHud,
    update: updateTw,
    render: renderTw,

    onEnter() {
      const dom = SP.dom;
      const ap = SP.activeParams;
      const tv = SP.TW_VARIANTS[getVariant()] || SP.TW_VARIANTS.hybrid;
      dom.startTitleEl.textContent = "TOWER FIXE";
      dom.startObjEl.textContent = `${tv.name} • ${ap.tw_max_turrets} tourelles • ${ap.tw_redeploy_time.toFixed(2)}s`;
      dom.startDescEl.textContent = tv.desc;
      dom.startHowEl.innerHTML =
        "• <b>Choisissez un type</b> (Mitrailleuse / Sniper / Canon) et <b>touchez le sol</b> pour poser<br />" +
        `• <b>Glissez une tourelle</b> (ou touchez puis destination) pour la déplacer (${ap.tw_redeploy_time.toFixed(2)}s)<br />` +
        "• Touchez <b>↩</b> ou clic droit pour <b>rappeler</b> une tourelle en réserve";
    },

    onPrepare() {
      const ap = SP.activeParams;
      const variant = getVariant();
      tw.turrets = [];
      tw.soldiers = [];
      tw.shockwaves = [];
      tw.relocateTrails = [];
      tw.respawnQueue = [];
      tw.selectedTurretId = -1;
      tw.dragTurretId = -1;
      tw.isDragging = false;
      tw.nextTurretId = 1;
      tw.baseHp = ap.tw_base_hp;
      tw.baseMaxHp = ap.tw_base_hp;
      tw.waveNum = 0;
      tw.waveTimer = variant === "waves" ? 1.0 : 0.8;
      tw.aiActionTimer = 0.6;
      tw.aiRedeployCd = 2.6;
      if (variant !== "waves") {
        SP.arena.setupObjectiveLayout();
        const initCount = Math.min(2, ap.tw_max_turrets);
        const types = ["mg", "sniper", "cannon"];
        for (let i = 0; i < initCount; i++) {
          const p = chooseAiTurretPos(types[i % 3], -1);
          if (p) placeTurret(SP.TEAM_AI, types[i % 3], p.x, p.y, true);
        }
      } else {
        const ar = SP.state.arena;
        const p = clampTurretPos(ar.x + ar.w * 0.5, ar.y + ar.h * 0.72);
        placeTurret(SP.TEAM_PLAYER, tw.selectedBuildType, p.x, p.y, true);
      }
      syncTwHud(true);
    },

    onResize() {
      for (const t of tw.turrets) {
        const p = clampTurretPos(t.x, t.y);
        t.x = p.x; t.y = p.y;
      }
      for (const s of tw.soldiers) {
        const p = clampToArena(s.x, s.y, s.radius);
        s.x = p.x; s.y = p.y;
      }
      if (getVariant() !== "waves") SP.arena.resizeObjectiveLayout();
      renderTw(SP.ctx);
    },

    resetInput() {
      tw.dragTurretId = -1;
      tw.isDragging = false;
    },

    onPointerDown(pt, e) {
      const st = SP.state;
      if (!st.running || st.externalPaused || st.destroyed || st.menuOpen) return;
      if (e && e.button === 2) {
        const hid = findClosestPlayerTurretId(pt.x, pt.y, TURRET_HIT_RADIUS);
        if (hid !== -1) { tw.selectedTurretId = hid; recallSelectedTurret(); }
        else { tw.selectedTurretId = -1; syncTwHud(true); }
        return;
      }
      const hid = findClosestPlayerTurretId(pt.x, pt.y, TURRET_HIT_RADIUS);
      if (hid !== -1) {
        tw.dragTurretId = hid;
        tw.dragStart = { x: pt.x, y: pt.y };
        tw.dragCur = clampTurretPos(pt.x, pt.y);
        tw.isDragging = false;
        tw.dragValid = true;
      } else {
        tw.dragTurretId = -1;
        tw.isDragging = false;
      }
    },

    onPointerMove(pt) {
      if (tw.dragTurretId === -1) return;
      if (!tw.isDragging && SP.dist(pt.x, pt.y, tw.dragStart.x, tw.dragStart.y) >= DRAG_THRESH) {
        tw.isDragging = true;
      }
      if (tw.isDragging) {
        tw.dragCur = clampTurretPos(pt.x, pt.y);
        tw.dragValid = isValidTurretPos(tw.dragCur.x, tw.dragCur.y, tw.dragTurretId);
      }
    },

    onPointerUp(pt) {
      const ap = SP.activeParams;
      if (tw.dragTurretId !== -1) {
        const idx = findTurretIdx(tw.dragTurretId);
        const wasDrag = tw.isDragging;
        const tid = tw.dragTurretId;
        tw.dragTurretId = -1;
        tw.isDragging = false;
        if (idx === -1) return;
        if (wasDrag) {
          const snapped = findValidSnapPos(pt.x, pt.y, tid);
          if (!snapped) {
            const cp = clampTurretPos(pt.x, pt.y);
            SP.playSfx("full");
            SP.arena.spawnFloat(cp.x, cp.y, "TROP PROCHE !", "#ffd638");
          } else {
            moveTurret(idx, snapped.x, snapped.y);
            tw.selectedTurretId = tid;
            SP.playSfx("drop");
          }
        } else {
          if (tw.selectedTurretId === tid) tw.selectedTurretId = -1;
          else { tw.selectedTurretId = tid; SP.playSfx("step"); }
        }
        syncTwHud(true);
        return;
      }

      if (tw.selectedTurretId !== -1) {
        const idx = findTurretIdx(tw.selectedTurretId);
        if (idx !== -1) {
          const snapped = findValidSnapPos(pt.x, pt.y, tw.selectedTurretId);
          if (!snapped) {
            const cp = clampTurretPos(pt.x, pt.y);
            SP.playSfx("full");
            SP.arena.spawnFloat(cp.x, cp.y, "TROP PROCHE !", "#ffd638");
          } else {
            moveTurret(idx, snapped.x, snapped.y);
            SP.playSfx("drop");
          }
        }
        tw.selectedTurretId = -1;
        syncTwHud(true);
        return;
      }

      if (getPlayerReserve() <= 0) {
        const cp = clampTurretPos(pt.x, pt.y);
        SP.playSfx("full");
        SP.arena.spawnFloat(cp.x, cp.y, `MAX ${countTurrets(SP.TEAM_PLAYER)}/${ap.tw_max_turrets} — GLISSEZ`, "#ffd638");
        syncTwHud(true);
        return;
      }

      const validPos = findValidSnapPos(pt.x, pt.y, -1);
      if (!validPos) {
        const cp = clampTurretPos(pt.x, pt.y);
        SP.playSfx("full");
        SP.arena.spawnFloat(cp.x, cp.y, "TROP PROCHE !", "#ffd638");
        return;
      }
      placeTurret(SP.TEAM_PLAYER, tw.selectedBuildType, validPos.x, validPos.y, false);
      SP.playSfx("drop");
      syncTwHud(true);
    },

    onKeyDown(e) {
      const st = SP.state;
      if (!st.running || st.menuOpen || st.externalPaused || st.destroyed) return false;
      if (e.key === "1") { selectBuildType("mg"); return true; }
      if (e.key === "2") { selectBuildType("sniper"); return true; }
      if (e.key === "3") { selectBuildType("cannon"); return true; }
      if (e.key === "Backspace" || e.key === "Delete") { recallSelectedTurret(); return true; }
      if (e.key === "Escape") { clearSelection(); return true; }
      return false;
    }
  };
})();
