// Poulpes marcheurs des marais avec pattes strictement posées au sol (cinématique inverse sans glissement),
// attaque à vue (sauf au bord de l'écran) et fuite quand la vie passe sous la moitié.
(function () {
  const M = (window.MaraisBiome = window.MaraisBiome || {});

  const inkPuffs = [];
  const stepRipples = [];

  function reset() {
    inkPuffs.length = 0;
    stepRipples.length = 0;
  }

  function createOctopus(x, y, rng, maxHp) {
    const legCount = 6;
    const strideR = 30 + rng() * 6;
    const legs = [];
    for (let i = 0; i < legCount; i++) {
      const restAngle = (Math.PI * 2 * i) / legCount + 0.3;
      const fx = x + Math.cos(restAngle) * strideR;
      const fy = y + Math.sin(restAngle) * strideR * 0.82;
      legs.push({
        restAngle,
        footX: fx,
        footY: fy,
        startX: fx,
        startY: fy,
        targetX: fx,
        targetY: fy,
        stepping: false,
        stepT: 0,
        liftZ: 0,
      });
    }

    return {
      x,
      y,
      vx: 0,
      vy: 0,
      facing: rng() * Math.PI * 2,
      bodyR: 17 + rng() * 4,
      bodyHeight: 22,
      strideR,
      legs,
      hp: maxHp,
      maxHp,
      state: "patrol", // patrol | attack | flee
      patrolTargetX: x,
      patrolTargetY: y,
      patrolTimer: 1 + rng() * 2.5,
      attackCd: 0,
      hitFlash: 0,
      inkTimer: 0,
      phase: rng() * Math.PI * 2,
    };
  }

  function spawnChunkOctopuses(cx, cy, env, rng, params, placedSpots) {
    const CHUNK_SIZE = env.CHUNK_SIZE || 512;
    const clearR = (env.LANDING_CLEAR_RADIUS || 230) + 80;
    const ox = cx * CHUNK_SIZE;
    const oy = cy * CHUNK_SIZE;
    const density = params.maraisOctopusDensity;
    if (density <= 0.05) return [];

    const centerW = M.sampleTerritory(ox + CHUNK_SIZE * 0.5, oy + CHUNK_SIZE * 0.5, env, params).weights.octopus;
    const base = rng() < 0.65 ? 1 : 2;
    const targetCount = Math.round(base * density * M.clamp(centerW, 0.15, 1.7));
    const list = [];
    const maxAttempts = Math.max(4, targetCount * 5);

    for (let attempt = 0; attempt < maxAttempts && list.length < targetCount; attempt++) {
      const x = ox + 64 + rng() * (CHUNK_SIZE - 128);
      const y = oy + 64 + rng() * (CHUNK_SIZE - 128);
      if (Math.hypot(x, y) < clearR) continue;
      const w = M.sampleTerritory(x, y, env, params).weights.octopus;
      if (rng() > M.clamp(w * 0.85, 0.03, 1)) continue;
      if (!M.canPlaceSpot(placedSpots, x, y, 28, params.maraisMinSeparation * 0.75)) continue;
      M.registerSpot(placedSpots, x, y, 28);
      list.push(createOctopus(x, y, rng, params.maraisOctopusHp));
    }
    return list;
  }

  function spawnInkBurst(x, y, count, col) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * 80;
      inkPuffs.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: 4 + Math.random() * 6,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
        col,
      });
    }
  }

  function damageAt(wx, wy, radius, dmg, chunkStates) {
    let hitAny = false;
    for (const st of chunkStates.values()) {
      for (let i = st.octopuses.length - 1; i >= 0; i--) {
        const oct = st.octopuses[i];
        const dist = Math.hypot(wx - oct.x, wy - (oct.y - oct.bodyHeight * 0.5));
        if (dist <= oct.bodyR + radius + 6) {
          oct.hp = Math.max(0, oct.hp - dmg);
          oct.hitFlash = 1.0;
          hitAny = true;
          spawnInkBurst(oct.x, oct.y - oct.bodyHeight * 0.5, 6, [85, 58, 125]);
          if (oct.hp <= 0) {
            spawnInkBurst(oct.x, oct.y - oct.bodyHeight * 0.5, 16, [110, 74, 158]);
            st.octopuses.splice(i, 1);
          }
          break;
        }
      }
    }
    return hitAny;
  }

  function updateOctopusLegs(oct, dt) {
    const legCount = oct.legs.length;
    const speed = Math.hypot(oct.vx, oct.vy);
    const stepDuration = speed > 65 ? 0.14 : 0.21;
    const stepThreshold = speed > 45 ? 18 : 22;

    for (let i = 0; i < legCount; i++) {
      const leg = oct.legs[i];
      if (leg.stepping) {
        leg.stepT += dt / stepDuration;
        if (leg.stepT >= 1) {
          leg.stepT = 0;
          leg.stepping = false;
          leg.footX = leg.targetX;
          leg.footY = leg.targetY;
          leg.liftZ = 0;
          stepRipples.push({ x: leg.footX, y: leg.footY, r: 2, maxR: 11, life: 0.24, maxLife: 0.24 });
        } else {
          const t = M.smoothstep(0, 1, leg.stepT);
          leg.footX = M.lerp(leg.startX, leg.targetX, t);
          leg.footY = M.lerp(leg.startY, leg.targetY, t);
          leg.liftZ = Math.sin(leg.stepT * Math.PI) * 13;
        }
      } else {
        // Pied posé : strictement immobile au sol en coordonnées monde (aucun glissement)
        leg.liftZ = 0;
        const idealX = oct.x + Math.cos(leg.restAngle + oct.facing * 0.2) * oct.strideR;
        const idealY = oct.y + Math.sin(leg.restAngle + oct.facing * 0.2) * oct.strideR * 0.82;
        const err = Math.hypot(idealX - leg.footX, idealY - leg.footY);
        if (err > stepThreshold) {
          const prevLeg = oct.legs[(i - 1 + legCount) % legCount];
          const nextLeg = oct.legs[(i + 1) % legCount];
          if (!prevLeg.stepping && !nextLeg.stepping) {
            leg.stepping = true;
            leg.stepT = 0;
            leg.startX = leg.footX;
            leg.startY = leg.footY;
            const leadScale = speed > 1 ? 0.22 : 0;
            leg.targetX = idealX + oct.vx * leadScale;
            leg.targetY = idealY + oct.vy * leadScale;
          }
        }
      }
    }
  }

  function updateOctopuses(dt, timeSec, env, chunkStates, params) {
    const alien = env && env.alien;
    const isNearEdge = typeof env.isPointNearScreenEdge === "function"
      ? (x, y) => env.isPointNearScreenEdge(x, y, 72)
      : () => false;
    const bounds = M.getViewBounds ? M.getViewBounds(env, 380) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;

    for (const st of chunkStates.values()) {
      if (bounds && !M.isChunkVisible(st, bounds, chunkSize)) continue;
      for (const oct of st.octopuses) {
        if (oct.hp === oct.maxHp && oct.maxHp !== params.maraisOctopusHp) {
          oct.maxHp = params.maraisOctopusHp;
          oct.hp = params.maraisOctopusHp;
        } else {
          oct.maxHp = params.maraisOctopusHp;
          oct.hp = Math.min(oct.hp, oct.maxHp);
        }

        if (oct.hitFlash > 0) oct.hitFlash = Math.max(0, oct.hitFlash - dt * 4.5);
        if (oct.attackCd > 0) oct.attackCd -= dt;

        const dxA = alien ? alien.x - oct.x : 9999;
        const dyA = alien ? alien.y - oct.y : 9999;
        const distA = Math.hypot(dxA, dyA);
        const lowHp = oct.hp < oct.maxHp * 0.5;
        const nearScreenEdge = isNearEdge(oct.x, oct.y);

        // Décision d'état :
        // - S'il a perdu plus de la moitié de sa vie -> fuite
        // - Sinon attaque à vue sauf s'il est au bord de l'écran
        if (lowHp && alien && distA < 460) {
          oct.state = "flee";
        } else if (alien && distA < 330 && !nearScreenEdge) {
          oct.state = "attack";
        } else {
          oct.state = "patrol";
        }

        let desiredVx = 0;
        let desiredVy = 0;

        if (oct.state === "flee" && alien) {
          const awayA = Math.atan2(oct.y - alien.y, oct.x - alien.x);
          desiredVx = Math.cos(awayA) * 145;
          desiredVy = Math.sin(awayA) * 145;
          oct.facing = M.lerpAngle(oct.facing, awayA, M.clamp(dt * 8, 0, 1));
          oct.inkTimer -= dt;
          if (oct.inkTimer <= 0) {
            oct.inkTimer = 0.28;
            spawnInkBurst(oct.x, oct.y - 10, 2, [45, 58, 92]);
          }
        } else if (oct.state === "attack" && alien) {
          const toA = Math.atan2(dyA, dxA);
          const chaseSpd = distA < 52 ? 40 : 108;
          desiredVx = Math.cos(toA) * chaseSpd;
          desiredVy = Math.sin(toA) * chaseSpd;
          oct.facing = M.lerpAngle(oct.facing, toA, M.clamp(dt * 8, 0, 1));

          if (distA < oct.bodyR + 24 && oct.attackCd <= 0) {
            oct.attackCd = 1.1;
            if (typeof env.applyAlienKnockback === "function") {
              env.applyAlienKnockback(dxA, dyA, 34);
            }
            spawnInkBurst(alien.x, alien.y, 7, [215, 78, 98]);
          }
        } else {
          oct.patrolTimer -= dt;
          if (oct.patrolTimer <= 0) {
            oct.patrolTimer = 2.0 + Math.random() * 2.5;
            const ang = Math.random() * Math.PI * 2;
            const d = 50 + Math.random() * 70;
            oct.patrolTargetX = oct.x + Math.cos(ang) * d;
            oct.patrolTargetY = oct.y + Math.sin(ang) * d;
          }
          const pdx = oct.patrolTargetX - oct.x;
          const pdy = oct.patrolTargetY - oct.y;
          const pdist = Math.hypot(pdx, pdy);
          if (pdist > 14) {
            const pAng = Math.atan2(pdy, pdx);
            desiredVx = Math.cos(pAng) * 44;
            desiredVy = Math.sin(pAng) * 44;
            oct.facing = M.lerpAngle(oct.facing, pAng, M.clamp(dt * 4, 0, 1));
          }
        }

        oct.vx = M.lerp(oct.vx, desiredVx, M.clamp(dt * 7, 0, 1));
        oct.vy = M.lerp(oct.vy, desiredVy, M.clamp(dt * 7, 0, 1));
        oct.x += oct.vx * dt;
        oct.y += oct.vy * dt;

        // Évite d'entrer dans la zone du vaisseau
        const shipDist = Math.hypot(oct.x, oct.y);
        if (shipDist < 120 && shipDist > 0.1) {
          oct.x = (oct.x / shipDist) * 120;
          oct.y = (oct.y / shipDist) * 120;
        }

        updateOctopusLegs(oct, dt);
      }
    }

    for (let i = inkPuffs.length - 1; i >= 0; i--) {
      const p = inkPuffs[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-3.2 * dt);
      p.vy *= Math.exp(-3.2 * dt);
      p.life -= dt;
      if (p.life <= 0) inkPuffs.splice(i, 1);
    }

    for (let i = stepRipples.length - 1; i >= 0; i--) {
      stepRipples[i].life -= dt;
      if (stepRipples[i].life <= 0) stepRipples.splice(i, 1);
    }
  }

  function drawOctopuses(ctx, timeSec, env, chunkStates) {
    const bounds = M.getViewBounds ? M.getViewBounds(env, 140) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;

    for (const sr of stepRipples) {
      if (bounds && !M.isPointVisible(sr.x, sr.y, bounds, sr.maxR)) continue;
      const p = 1 - sr.life / sr.maxLife;
      ctx.strokeStyle = `rgba(170, 232, 188, ${((1 - p) * 0.45).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(sr.x, sr.y, M.lerp(sr.r, sr.maxR, p), M.lerp(sr.r, sr.maxR, p) * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const st of chunkStates.values()) {
      if (bounds && !M.isChunkVisible(st, bounds, chunkSize)) continue;
      for (const oct of st.octopuses) {
        if (bounds && !M.isPointVisible(oct.x, oct.y, bounds, oct.strideR + oct.bodyR + 24)) continue;
        const bob = Math.sin(timeSec * 4.5 + oct.phase) * 2.2;
        const headX = oct.x;
        const headY = oct.y - oct.bodyHeight + bob;

        const baseRgb = oct.state === "flee"
          ? [106, 152, 198]
          : (oct.state === "attack" ? [178, 72, 108] : [124, 82, 148]);
        const bodyRgb = oct.hitFlash > 0.1 ? M.mixRGB(baseRgb, [255, 255, 255], oct.hitFlash * 0.75) : baseRgb;

        ctx.save();
        // Ombre du corps au sol
        ctx.fillStyle = "rgba(8, 14, 12, 0.34)";
        ctx.beginPath();
        ctx.ellipse(oct.x, oct.y + 4, oct.bodyR * 0.95, oct.bodyR * 0.56, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tentacules posés au sol (arrière d'abord selon footY, puis avant)
        if (!oct._sortedLegs) oct._sortedLegs = oct.legs.slice();
        const sortedLegs = oct._sortedLegs;
        sortedLegs.sort((a, b) => a.footY - b.footY);
        for (const leg of sortedLegs) {
          const sx = headX + Math.cos(leg.restAngle + oct.facing * 0.2) * (oct.bodyR * 0.55);
          const sy = headY + 4 + Math.sin(leg.restAngle + oct.facing * 0.2) * (oct.bodyR * 0.35);
          const fx = leg.footX;
          const fy = leg.footY - leg.liftZ;
          const kx = (sx + fx) * 0.5 + (fx - headX) * 0.24;
          const ky = Math.min(sy, fy) - 10 - leg.liftZ * 0.35;

          // Ombre de la patte
          ctx.fillStyle = "rgba(8, 14, 12, 0.24)";
          ctx.beginPath();
          ctx.ellipse(leg.footX, leg.footY + 1, 4.8, 2.8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Tentacule courbé
          ctx.strokeStyle = M.rgbStr(M.shadeRGB(bodyRgb, -0.22));
          ctx.lineWidth = 6.2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(kx, ky, fx, fy);
          ctx.stroke();

          ctx.strokeStyle = M.rgbStr(bodyRgb);
          ctx.lineWidth = 3.8;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(kx, ky, fx, fy);
          ctx.stroke();

          // Ventouse / coussinet bien posé au sol
          ctx.fillStyle = M.rgbStr(M.shadeRGB(bodyRgb, 0.35));
          ctx.beginPath();
          ctx.arc(fx, fy, 3.1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Corps (manteau bulbeux sans allocation de gradient par frame)
        ctx.fillStyle = M.rgbStr(M.shadeRGB(bodyRgb, -0.14));
        ctx.beginPath();
        ctx.ellipse(headX, headY - 2, oct.bodyR, oct.bodyR * 0.88, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = M.rgbStr(M.shadeRGB(bodyRgb, 0.22), 0.72);
        ctx.beginPath();
        ctx.ellipse(headX - oct.bodyR * 0.16, headY - 2 - oct.bodyR * 0.18, oct.bodyR * 0.68, oct.bodyR * 0.54, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = M.rgbStr(M.shadeRGB(bodyRgb, 0.45), 0.7);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(headX, headY - 2, oct.bodyR, oct.bodyR * 0.88, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Yeux expressifs
        const fwdX = Math.cos(oct.facing);
        const fwdY = Math.sin(oct.facing);
        const perpX = -fwdY;
        const perpY = fwdX;
        const eyeBaseX = headX + fwdX * oct.bodyR * 0.38;
        const eyeBaseY = headY + fwdY * oct.bodyR * 0.25 + 2;

        for (const side of [-1, 1]) {
          const ex = eyeBaseX + perpX * 6.5 * side;
          const ey = eyeBaseY + perpY * 4.5 * side;
          ctx.fillStyle = oct.state === "attack" ? "#ffe0d6" : "#f5f9e8";
          ctx.beginPath();
          ctx.arc(ex, ey, oct.state === "flee" ? 4.8 : 4.0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = oct.state === "attack" ? "#9e1c24" : "#18221e";
          ctx.beginPath();
          ctx.arc(ex + fwdX * 1.3, ey + fwdY * 1.1, oct.state === "flee" ? 1.5 : 2.1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Barre de vie si blessé
        if (oct.hp < oct.maxHp) {
          const bw = 30;
          const bh = 4;
          const bx = headX - bw * 0.5;
          const by = headY - oct.bodyR - 11;
          const ratio = M.clamp(oct.hp / oct.maxHp, 0, 1);
          ctx.fillStyle = "rgba(8, 12, 14, 0.78)";
          ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
          ctx.fillStyle = ratio < 0.5 ? "#5cd6ff" : "#ff6b6b";
          ctx.fillRect(bx, by, bw * ratio, bh);
        }
        ctx.restore();
      }
    }

    for (const pk of inkPuffs) {
      const a = M.clamp(pk.life / pk.maxLife, 0, 1);
      ctx.fillStyle = M.rgbStr(pk.col, a * 0.65);
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, pk.r * (1.2 - a * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  M.octopus = {
    reset,
    spawnChunkOctopuses,
    updateOctopuses,
    drawOctopuses,
    damageAt,
    getInkPuffs: () => inkPuffs,
    getStepRipples: () => stepRipples,
  };
})();
