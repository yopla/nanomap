// Plantes-tentacules des marais inspirées de 8A_tentacule_danseur (corp.as + TailLine.as)
// avec œil clignant entre le corps et la touffe de poils, suivi du joueur, tir d'œil rebondissant
// (2 à 3 rebonds au sol, recul de l'alien) et repousse par boule montante dans la tige.
(function () {
  const M = (window.MaraisBiome = window.MaraisBiome || {});

  const DTR = Math.PI / 180;
  const eyeProjectiles = [];
  const impactBursts = [];

  function reset() {
    eyeProjectiles.length = 0;
    impactBursts.length = 0;
  }

  function createHairTuft(tipX, tipY, rng) {
    const strands = [];
    const strandCount = 9 + Math.floor(rng() * 4);
    for (let i = 0; i < strandCount; i++) {
      const spreadR = rng() * 6.5;
      const spreadA = rng() * Math.PI * 2;
      const segNum = 4 + Math.floor(rng() * 2);
      const segLen = 3.6 + rng() * 2.4;
      const segs = [];
      for (let s = 0; s < segNum; s++) {
        segs.push({
          x: tipX + Math.cos(spreadA) * spreadR,
          y: tipY + Math.sin(spreadA) * spreadR - s * segLen * 0.4,
          prevX: tipX,
          prevY: tipY,
          vx: 0,
          vy: 0,
          angle: -Math.PI * 0.5,
          len: Math.max(1.8, segLen - s * 0.25),
        });
      }
      strands.push({
        ox: Math.cos(spreadA) * spreadR,
        oy: Math.sin(spreadA) * spreadR,
        friction: 0.72 + rng() * 0.16,
        color: rng() < 0.5 ? [178, 240, 128] : [224, 248, 178],
        segs,
      });
    }
    return strands;
  }

  function createTentacle(x, y, rng) {
    const segments = 9;
    const scale = 0.85 + rng() * 0.35;
    const baseThick = [11, 10, 9.2, 8.4, 7.6, 6.8, 6.0, 5.2, 4.4, 3.6].map((v) => v * scale);
    const heights = [0, 9, 9, 9, 8.5, 8, 7.5, 7, 6.5, 6].map((v) => v * scale);
    const da = [0, 0, 5, 7, 9, 11, 13, 15, 17, 19];
    const frec = [0, 0, 1.3, 1.5, 1.8, 2.0, 2.3, 2.5, 2.8, 3.1];
    const tors = new Array(segments + 1).fill(0);

    const posx = new Array(segments + 1).fill(x);
    const posy = new Array(segments + 1).fill(y);
    const a = new Array(segments + 1).fill(-90);
    const rx = new Array(segments + 1).fill(x);
    const ry = new Array(segments + 1).fill(y);
    const lx = new Array(segments + 1).fill(x);
    const ly = new Array(segments + 1).fill(y);
    const rmx = new Array(segments + 1).fill(x);
    const rmy = new Array(segments + 1).fill(y);
    const lmx = new Array(segments + 1).fill(x);
    const lmy = new Array(segments + 1).fill(y);

    const tipX = x;
    const tipY = y - 62 * scale;
    const wriggleRoll = rng();
    const isWildWriggler = wriggleRoll >= 0.7;
    const wriggleFactor = wriggleRoll < 0.35
      ? 0.65 + rng() * 0.30
      : (wriggleRoll < 0.70 ? 1.15 + rng() * 0.50 : 1.95 + rng() * 0.95);
    const phaseLag = isWildWriggler ? 0.52 + rng() * 0.35 : 0.25 + rng() * 0.22;

    return {
      x,
      y,
      scale,
      segments,
      baseThick,
      thick: baseThick.slice(),
      heights,
      da,
      frec,
      tors,
      posx,
      posy,
      a,
      rx,
      ry,
      lx,
      ly,
      rmx,
      rmy,
      lmx,
      lmy,
      tipX,
      tipY,
      eyeX: tipX,
      eyeY: tipY,
      eyeR: 7.4 * scale,
      hairX: tipX,
      hairY: tipY - 6 * scale,
      phase: rng() * Math.PI * 2,
      wriggleFactor,
      isWildWriggler,
      phaseLag,
      wriggleSpeed: isWildWriggler ? 1.35 + rng() * 0.45 : 0.95 + rng() * 0.25,
      leanAngle: -90,
      lookAngle: -Math.PI * 0.5,
      watchingAlien: rng() < 0.75,
      watchTimer: 1.5 + rng() * 3.5,
      wanderAngle: (rng() - 0.5) * 2.4 - Math.PI * 0.5,
      blinkTimer: 1.5 + rng() * 4.0,
      blinkProgress: 0,
      isBlinking: false,
      canSpit: rng() < 0.55,
      spitState: "ready", // ready | windup | empty | regrowing
      spitTimer: 2.0 + rng() * 4.5,
      bulgeT: 0,
      eyePopScale: 1,
      bodyCol: rng() < 0.5 ? [58, 94, 72] : [74, 86, 56],
      strokeCol: [148, 212, 118],
      maxHp: 45,
      hp: 45,
      hitFlash: 0,
      hairStrands: createHairTuft(tipX, tipY, rng),
    };
  }

  function spawnChunkTentacles(cx, cy, env, rng, params, placedSpots) {
    const CHUNK_SIZE = env.CHUNK_SIZE || 512;
    const clearR = (env.LANDING_CLEAR_RADIUS || 230) + 10;
    const ox = cx * CHUNK_SIZE;
    const oy = cy * CHUNK_SIZE;
    const centerW = M.sampleTerritory(ox + CHUNK_SIZE * 0.5, oy + CHUNK_SIZE * 0.5, env, params).weights.tentacles;
    const targetCount = Math.round((2 + Math.floor(rng() * 3)) * params.maraisTentacleDensity * M.clamp(centerW, 0.15, 1.8));
    const list = [];
    const maxAttempts = Math.max(5, targetCount * 4);

    for (let attempt = 0; attempt < maxAttempts && list.length < targetCount; attempt++) {
      const x = ox + 46 + rng() * (CHUNK_SIZE - 92);
      const y = oy + 68 + rng() * (CHUNK_SIZE - 96);
      if (Math.hypot(x, y) < clearR) continue;
      const w = M.sampleTerritory(x, y, env, params).weights.tentacles;
      if (rng() > M.clamp(w * 0.85, 0.03, 1)) continue;
      if (!M.canPlaceSpot(placedSpots, x, y, 24, params.maraisMinSeparation * 0.7)) continue;
      M.registerSpot(placedSpots, x, y, 24);
      list.push(createTentacle(x, y, rng));
    }
    return list;
  }

  function updateHairStrand(strand, anchorX, anchorY, dtFrame, windStrength, timeSec, phase) {
    const segs = strand.segs;
    const grav = 0.34 * dtFrame;
    const windX = Math.sin(timeSec * 2.4 + phase + strand.ox * 0.2) * 0.24 * windStrength * dtFrame;

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const tx = i === 0 ? anchorX + strand.ox : segs[i - 1].x;
      const ty = i === 0 ? anchorY + strand.oy : segs[i - 1].y;
      const ajout = i === 0 ? 0 : 1.1;

      seg.x += seg.vx * dtFrame;
      seg.y += seg.vy * dtFrame;

      const dx = tx - seg.x;
      const dy = ty - seg.y;
      const rad = Math.atan2(dy, dx);
      seg.angle = rad;

      const pinLen = seg.len + ajout;
      const w = Math.cos(rad) * pinLen;
      const h = Math.sin(rad) * pinLen;
      seg.x = tx - w;
      seg.y = ty - h;

      if (seg.prevX !== undefined) {
        seg.vx = (seg.x - seg.prevX) * strand.friction;
        seg.vy = (seg.y - seg.prevY) * strand.friction + grav;
        seg.vx += windX;
      }
      seg.prevX = seg.x;
      seg.prevY = seg.y;
    }
  }

  function spawnEyeProjectile(plant, targetX, targetY) {
    const dx = targetX - plant.eyeX;
    const dy = targetY - plant.eyeY;
    const dist = Math.max(40, Math.hypot(dx, dy));
    const speed = M.clamp(215 + dist * 0.28, 210, 320);
    const ux = dx / dist;
    const uy = dy / dist;
    const maxBounces = Math.random() < 0.5 ? 2 : 3;

    eyeProjectiles.push({
      x: plant.eyeX,
      y: plant.eyeY + 26 * plant.scale,
      z: 36 * plant.scale,
      vx: ux * speed,
      vy: uy * speed,
      vz: 96,
      r: plant.eyeR * 1.05,
      rot: 0,
      spin: (Math.random() < 0.5 ? -1 : 1) * 9,
      bounces: 0,
      maxBounces,
      life: 4.5,
      owner: plant,
    });
  }

  function applyDamageToTentacle(p, st, idx, dmg, knockX = 0) {
    p.hp = Math.max(0, (p.hp ?? 45) - dmg);
    p.hitFlash = 1.0;
    p.leanAngle = M.clamp(p.leanAngle + (knockX >= 0 ? 18 : -18), -122, -58);
    impactBursts.push({ x: p.eyeX || p.x, y: p.eyeY || (p.y - 36 * p.scale), r: 22 * p.scale, life: 0.3, maxLife: 0.3, col: [182, 245, 132] });
    if (p.hp <= 0) {
      impactBursts.push({ x: p.x, y: p.y - 24 * p.scale, r: 36 * p.scale, life: 0.42, maxLife: 0.42, col: [255, 215, 96] });
      st.tentacles.splice(idx, 1);
      return true;
    }
    return false;
  }

  function damageAt(wx, wy, radius, dmg, chunkStates, knockX = 0) {
    let hitAny = false;
    let killedAny = false;
    for (const st of chunkStates.values()) {
      for (let i = st.tentacles.length - 1; i >= 0; i--) {
        const p = st.tentacles[i];
        const dBase = Math.hypot(wx - p.x, wy - (p.y - 22 * p.scale));
        const dTip = Math.hypot(wx - (p.eyeX || p.x), wy - (p.eyeY || (p.y - 48 * p.scale)));
        if (Math.min(dBase, dTip) <= 22 * p.scale + radius + 6) {
          const killed = applyDamageToTentacle(p, st, i, dmg, knockX);
          hitAny = true;
          if (killed) killedAny = true;
          break;
        }
      }
      if (hitAny) break;
    }
    return { hit: hitAny, killed: killedAny };
  }

  function deflectProjectilesAt(wx, wy, radius) {
    let count = 0;
    for (let i = eyeProjectiles.length - 1; i >= 0; i--) {
      const pr = eyeProjectiles[i];
      if (Math.hypot(wx - pr.x, wy - pr.y) <= pr.r + radius + 12) {
        impactBursts.push({ x: pr.x, y: pr.y - pr.z, r: 22, life: 0.28, maxLife: 0.28, col: [255, 215, 75] });
        eyeProjectiles.splice(i, 1);
        count++;
      }
    }
    return count;
  }

  function updateTentacles(dt, timeSec, env, chunkStates, params) {
    const alien = env && env.alien;
    const spitRate = params.maraisEyeSpitRate;
    const wind = params.maraisWindStrength;
    const dtFrame = M.clamp(dt * 60, 0.25, 2.2);
    const bounds = M.getViewBounds ? M.getViewBounds(env, 340) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;

    for (const st of chunkStates.values()) {
      if (bounds && !M.isChunkVisible(st, bounds, chunkSize)) continue;
      for (const p of st.tentacles) {
        if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt * 4.5);
        const distToAlien = alien ? Math.hypot(alien.x - p.x, alien.y - p.y) : 9999;
        const isNear = bounds ? M.isPointVisible(p.x, p.y, bounds, 120) : distToAlien < 920;

        // Comportement de regard (la plupart du temps vers l'alien, mais pas tout le temps)
        p.watchTimer -= dt;
        if (p.watchTimer <= 0) {
          p.watchingAlien = Math.random() < 0.72;
          p.watchTimer = p.watchingAlien ? 2.2 + Math.random() * 3.4 : 1.0 + Math.random() * 1.8;
          p.wanderAngle = -Math.PI * 0.5 + (Math.random() - 0.5) * 2.2;
        }

        if (alien && p.watchingAlien && distToAlien < 560) {
          const targetAng = Math.atan2(alien.y - p.eyeY, alien.x - p.eyeX);
          p.lookAngle = M.lerpAngle(p.lookAngle, targetAng, M.clamp(dt * 7, 0, 1));
        } else {
          p.lookAngle = M.lerpAngle(p.lookAngle, p.wanderAngle + Math.sin(timeSec * 1.4 + p.phase) * 0.35, M.clamp(dt * 3, 0, 1));
        }

        // Clignement d'œil périodique
        if (!p.isBlinking) {
          p.blinkTimer -= dt;
          if (p.blinkTimer <= 0) {
            p.isBlinking = true;
            p.blinkProgress = 0;
            p.blinkTimer = 2.2 + Math.random() * 4.2;
          }
        } else {
          p.blinkProgress += dt * 7.5;
          if (p.blinkProgress >= 1) {
            p.isBlinking = false;
            p.blinkProgress = 0;
          }
        }

        // Cycle crachat d'œil & repousse par boule montante
        if (p.eyePopScale < 1) {
          p.eyePopScale = Math.min(1, p.eyePopScale + dt * 4.5);
        }

        if (p.canSpit && spitRate > 0.02) {
          if (p.spitState === "ready") {
            p.spitTimer -= dt * spitRate;
            if (p.spitTimer <= 0 && alien && p.watchingAlien && distToAlien > 75 && distToAlien < 390) {
              p.spitState = "windup";
              p.spitTimer = 0.48;
            }
          } else if (p.spitState === "windup") {
            p.spitTimer -= dt;
            if (p.spitTimer <= 0) {
              if (alien) {
                spawnEyeProjectile(p, alien.x, alien.y);
              }
              p.spitState = "empty";
              p.spitTimer = 0.55;
            }
          } else if (p.spitState === "empty") {
            p.spitTimer -= dt;
            if (p.spitTimer <= 0) {
              p.spitState = "regrowing";
              p.bulgeT = 0;
            }
          } else if (p.spitState === "regrowing") {
            p.bulgeT += dt * (0.42 + spitRate * 0.12);
            if (p.bulgeT >= 1) {
              p.bulgeT = 0;
              p.spitState = "ready";
              p.eyePopScale = 0.25;
              p.spitTimer = (3.4 + Math.random() * 3.0) / Math.max(0.3, spitRate);
            }
          }
        }

        // Épaisseur dynamique (gonflement par boule montante lors de la repousse d'œil)
        for (let i = 0; i <= p.segments; i++) {
          let th = p.baseThick[i];
          if (p.spitState === "regrowing") {
            const segFrac = i / p.segments;
            const dBulge = (segFrac - p.bulgeT) / 0.19;
            const bump = Math.exp(-dBulge * dBulge);
            th += bump * 8.2 * p.scale;
          } else if (p.spitState === "windup") {
            th *= 1.0 + 0.14 * Math.sin((1 - p.spitTimer / 0.48) * Math.PI);
          }
          p.thick[i] = th;
        }

        if (!isNear) continue;

        // Cinématique de la tige façon corp.as (8A_tentacule_danseur)
        const leanBias = p.watchingAlien && alien && distToAlien < 520
          ? M.clamp((alien.x - p.x) * 0.06, -16, 16)
          : Math.sin(timeSec * 0.9 + p.phase) * 8;
        const windLean = Math.sin(timeSec * 1.5 + p.phase) * 7 * wind;
        const recoil = p.spitState === "windup" ? -14 * Math.sin((1 - p.spitTimer / 0.48) * Math.PI) : 0;

        p.leanAngle = M.lerp(p.leanAngle, -90 + leanBias + windLean + recoil, M.clamp(dt * 4, 0, 1));
        p.a[0] = -90 + (p.leanAngle + 90) * 0.25;
        p.a[1] = p.a[0];
        p.posx[0] = p.x;
        p.posy[0] = p.y;
        p.posx[1] = p.x + p.heights[1] * Math.cos(p.a[1] * DTR);
        p.posy[1] = p.y + p.heights[1] * Math.sin(p.a[1] * DTR);

        const tDeg = timeSec * 58 * (p.wriggleSpeed || 1) + p.phase * 57;
        const wriggleMult = (p.wriggleFactor || 1) * (params.maraisTentacleWriggle ?? 1.2)
          * (p.spitState === "windup" || p.spitState === "regrowing" ? 1.25 : 1.0);
        const phaseLag = p.phaseLag || 0.3;
        for (let i = 2; i <= p.segments; i++) {
          p.tors[i] = ((p.leanAngle + 90) / p.segments) * 0.9;
          const wave1 = Math.sin(p.frec[i] * tDeg * DTR - i * phaseLag * 0.35);
          const wave2 = 0.42 * Math.sin(p.frec[i] * 1.85 * tDeg * DTR - i * phaseLag);
          p.a[i] = p.a[i - 1] + p.tors[i] + p.da[i] * wriggleMult * (wave1 + wave2);
          p.posx[i] = p.posx[i - 1] + p.heights[i] * Math.cos(p.a[i] * DTR);
          p.posy[i] = p.posy[i - 1] + p.heights[i] * Math.sin(p.a[i] * DTR);
        }

        // Contour gauche/droite avec compensation de charnière comme corp.as
        p.rx[0] = p.posx[0] - p.thick[0] * Math.sin(p.a[1] * DTR);
        p.ry[0] = p.posy[0] + p.thick[0] * Math.cos(p.a[1] * DTR);
        p.lx[0] = p.posx[0] + p.thick[0] * Math.sin(p.a[1] * DTR);
        p.ly[0] = p.posy[0] - p.thick[0] * Math.cos(p.a[1] * DTR);

        for (let i = 1; i < p.segments; i++) {
          const halfDiff = 0.5 * (p.a[i + 1] - p.a[i]) * DTR;
          const cosH = Math.max(0.4, Math.cos(halfDiff));
          const midA = 0.5 * (p.a[i + 1] + p.a[i]) * DTR;
          const sinM = Math.sin(midA);
          const cosM = Math.cos(midA);
          const w = p.thick[i] / cosH;
          p.rx[i] = p.posx[i] - w * sinM;
          p.ry[i] = p.posy[i] + w * cosM;
          p.lx[i] = p.posx[i] + w * sinM;
          p.ly[i] = p.posy[i] - w * cosM;
          p.rmx[i] = 0.5 * (p.rx[i] + p.rx[i - 1]);
          p.rmy[i] = 0.5 * (p.ry[i] + p.ry[i - 1]);
          p.lmx[i] = 0.5 * (p.lx[i] + p.lx[i - 1]);
          p.lmy[i] = 0.5 * (p.ly[i] + p.ly[i - 1]);
        }

        const n = p.segments;
        p.rx[n] = p.posx[n] - p.thick[n] * Math.sin(p.a[n] * DTR);
        p.ry[n] = p.posy[n] + p.thick[n] * Math.cos(p.a[n] * DTR);
        p.lx[n] = p.posx[n] + p.thick[n] * Math.sin(p.a[n] * DTR);
        p.ly[n] = p.posy[n] - p.thick[n] * Math.cos(p.a[n] * DTR);

        // Extrémité du corps : l'œil se place entre le sommet du corps et la touffe de poils
        p.tipX = 0.5 * (p.rx[n] + p.lx[n]);
        p.tipY = 0.5 * (p.ry[n] + p.ly[n]);
        const tipDirX = Math.cos(p.a[n] * DTR);
        const tipDirY = Math.sin(p.a[n] * DTR);
        p.eyeX = p.tipX + tipDirX * p.eyeR * 0.72;
        p.eyeY = p.tipY + tipDirY * p.eyeR * 0.72;
        p.hairX = p.eyeX + tipDirX * p.eyeR * 0.85;
        p.hairY = p.eyeY + tipDirY * p.eyeR * 0.85;

        for (const strand of p.hairStrands) {
          updateHairStrand(strand, p.hairX, p.hairY, dtFrame, wind, timeSec, p.phase);
        }
      }
    }

    // Mise à jour des projectiles-yeux crachés
    const g = 290;
    for (let i = eyeProjectiles.length - 1; i >= 0; i--) {
      const pr = eyeProjectiles[i];
      pr.life -= dt;
      pr.rot += pr.spin * dt;
      pr.vz -= g * dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.z += pr.vz * dt;

      if (pr.z <= 0) {
        pr.z = 0;
        pr.bounces++;
        impactBursts.push({ x: pr.x, y: pr.y, r: pr.r * 1.4, life: 0.3, maxLife: 0.3, col: [148, 212, 118] });
        if (pr.bounces <= pr.maxBounces) {
          pr.vz = Math.max(72, Math.abs(pr.vz) * 0.65);
          pr.vx *= 0.88;
          pr.vy *= 0.88;
        } else {
          eyeProjectiles.splice(i, 1);
          continue;
        }
      }

      // Collision avec l'alien : stoppe son déplacement et le fait reculer dans l'axe du tir
      if (alien && pr.z < 36) {
        const d = Math.hypot(pr.x - alien.x, pr.y - alien.y);
        if (d <= pr.r + 16) {
          if (typeof env.applyAlienKnockback === "function") {
            env.applyAlienKnockback(pr.vx, pr.vy, 52);
          }
          impactBursts.push({ x: alien.x, y: alien.y, r: 24, life: 0.36, maxLife: 0.36, col: [255, 130, 120] });
          eyeProjectiles.splice(i, 1);
          continue;
        }
      }

      // Collision éventuelle avec des rochers/obstacles
      if (typeof env.checkColliderHit === "function" && pr.life < 4.3 && env.checkColliderHit(pr.x, pr.y, pr.r * 0.5)) {
        impactBursts.push({ x: pr.x, y: pr.y - pr.z, r: 16, life: 0.25, maxLife: 0.25, col: [220, 240, 195] });
        eyeProjectiles.splice(i, 1);
        continue;
      }

      if (pr.life <= 0) {
        eyeProjectiles.splice(i, 1);
      }
    }

    for (let i = impactBursts.length - 1; i >= 0; i--) {
      impactBursts[i].life -= dt;
      if (impactBursts[i].life <= 0) impactBursts.splice(i, 1);
    }
  }

  function drawTentacles(ctx, timeSec, env, chunkStates) {
    const bounds = M.getViewBounds ? M.getViewBounds(env, 160) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;
    const cam = env && env.cam;
    for (const st of chunkStates.values()) {
      if (bounds && !M.isChunkVisible(st, bounds, chunkSize)) continue;
      for (const p of st.tentacles) {
        if (bounds ? !M.isPointVisible(p.x, p.y, bounds, 95 * p.scale) : (cam && Math.hypot(p.x - cam.x, p.y - cam.y) > 950)) continue;
        const n = p.segments;

        ctx.save();
        // Base racinaire au sol
        ctx.fillStyle = "rgba(8, 16, 12, 0.42)";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 3, 14 * p.scale, 8 * p.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corps articulé (corp.as)
        const fillCol = p.hitFlash > 0.05 ? M.mixRGB(p.bodyCol, [255, 255, 255], p.hitFlash * 0.78) : p.bodyCol;
        ctx.fillStyle = M.rgbStr(fillCol, 0.96);
        ctx.strokeStyle = M.rgbStr(p.strokeCol, 0.85);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(p.lx[0], p.ly[0]);
        ctx.lineTo(p.rx[0], p.ry[0]);
        ctx.quadraticCurveTo(p.rx[1], p.ry[1], p.rmx[2], p.rmy[2]);
        for (let i = 2; i < n - 1; i++) {
          ctx.quadraticCurveTo(p.rx[i], p.ry[i], p.rmx[i + 1], p.rmy[i + 1]);
        }
        ctx.quadraticCurveTo(p.rx[n - 1], p.ry[n - 1], p.rx[n], p.ry[n]);
        ctx.lineTo(p.lx[n], p.ly[n]);
        ctx.quadraticCurveTo(p.lx[n - 1], p.ly[n - 1], p.lmx[n - 1], p.lmy[n - 1]);
        for (let i = n - 2; i >= 2; i--) {
          ctx.quadraticCurveTo(p.lx[i], p.ly[i], p.lmx[i], p.lmy[i]);
        }
        ctx.quadraticCurveTo(p.lx[1], p.ly[1], p.lx[0], p.ly[0]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lueur interne de la boule qui monte dans la tige lors de la repousse
        if (p.spitState === "regrowing") {
          const idxF = p.bulgeT * n;
          const idx0 = Math.min(n - 1, Math.floor(idxF));
          const frac = idxF - idx0;
          const bx = M.lerp(p.posx[idx0], p.posx[idx0 + 1], frac);
          const by = M.lerp(p.posy[idx0], p.posy[idx0 + 1], frac);
          ctx.fillStyle = "rgba(218, 255, 165, 0.52)";
          ctx.beginPath();
          ctx.arc(bx, by, 7.2 * p.scale, 0, Math.PI * 2);
          ctx.fill();
        }

        // Œil entre le corps et la touffe de poils
        if (p.spitState === "empty" || p.spitState === "regrowing") {
          ctx.fillStyle = "rgba(18, 28, 22, 0.9)";
          ctx.beginPath();
          ctx.arc(p.eyeX, p.eyeY, p.eyeR * 0.72, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = M.rgbStr(p.strokeCol, 0.7);
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } else {
          const er = p.eyeR * p.eyePopScale;
          const blinkScaleY = p.isBlinking ? Math.max(0.08, Math.abs(Math.cos(p.blinkProgress * Math.PI))) : 1;
          ctx.save();
          ctx.translate(p.eyeX, p.eyeY);
          ctx.scale(1, blinkScaleY);

          ctx.fillStyle = p.spitState === "windup" ? "#ffe3c2" : "#f7faee";
          ctx.beginPath();
          ctx.arc(0, 0, er, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#263a28";
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Pupille orientée vers l'alien (ou ailleurs)
          const pupOff = er * 0.34;
          const px = Math.cos(p.lookAngle) * pupOff;
          const py = Math.sin(p.lookAngle) * pupOff;
          ctx.fillStyle = p.spitState === "windup" ? "#d94136" : "#1c2d24";
          ctx.beginPath();
          ctx.arc(px, py, er * 0.44, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(px - er * 0.14, py - er * 0.14, er * 0.16, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Touffe de poils IK au-dessus de l'œil (regroupée par profondeur de segment pour limiter les appels stroke)
        ctx.lineCap = "round";
        let maxSegs = 0;
        for (let s = 0; s < p.hairStrands.length; s++) {
          if (p.hairStrands[s].segs.length > maxSegs) maxSegs = p.hairStrands[s].segs.length;
        }
        for (let i = 0; i < maxSegs - 1; i++) {
          const t = i / Math.max(1, maxSegs - 1);
          ctx.strokeStyle = `rgba(196, 244, 150, ${(0.90 * (1 - t * 0.62)).toFixed(3)})`;
          ctx.lineWidth = Math.max(0.9, 3.2 * (1 - t * 0.72));
          ctx.beginPath();
          for (let s = 0; s < p.hairStrands.length; s++) {
            const segs = p.hairStrands[s].segs;
            if (i >= segs.length - 1) continue;
            const xc = (segs[i].x + segs[i + 1].x) * 0.5;
            const yc = (segs[i].y + segs[i + 1].y) * 0.5;
            ctx.moveTo(segs[i].x, segs[i].y);
            ctx.quadraticCurveTo(segs[i].x, segs[i].y, xc, yc);
          }
          ctx.stroke();
        }
        if (p.hp < p.maxHp) {
          const bw = 28;
          const bh = 3.5;
          const bx = p.hairX - bw * 0.5;
          const by = p.hairY - 22 * p.scale;
          const ratio = M.clamp(p.hp / Math.max(1, p.maxHp), 0, 1);
          ctx.fillStyle = "rgba(8, 12, 14, 0.78)";
          ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
          ctx.fillStyle = "#b8f564";
          ctx.fillRect(bx, by, bw * ratio, bh);
        }
        ctx.restore();
      }
    }
  }

  function drawEyeProjectiles(ctx) {
    for (const pr of eyeProjectiles) {
      const shScale = M.clamp(1 - pr.z * 0.005, 0.45, 1);
      ctx.save();
      ctx.fillStyle = "rgba(8, 16, 12, 0.34)";
      ctx.beginPath();
      ctx.ellipse(pr.x, pr.y + 3, pr.r * shScale, pr.r * 0.55 * shScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(pr.x, pr.y - pr.z);
      ctx.rotate(pr.rot);

      ctx.fillStyle = "#f9fbe8";
      ctx.beginPath();
      ctx.arc(0, 0, pr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#527848";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = "#d94b3d";
      ctx.beginPath();
      ctx.arc(pr.r * 0.25, 0, pr.r * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#162018";
      ctx.beginPath();
      ctx.arc(pr.r * 0.28, 0, pr.r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const b of impactBursts) {
      const p = 1 - b.life / b.maxLife;
      ctx.strokeStyle = M.rgbStr(b.col, (1 - p) * 0.75);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, M.lerp(4, b.r, p), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  M.tentacles = {
    reset,
    spawnChunkTentacles,
    updateTentacles,
    drawTentacles,
    drawEyeProjectiles,
    damageAt,
    applyDamageToTentacle,
    deflectProjectilesAt,
    getEyeProjectiles: () => eyeProjectiles,
    getImpactBursts: () => impactBursts,
  };
})();
