// Troupes de Puyos gélatineux inspirés de refJeu/03_alglules/2_puyo/pac.as :
// corps en bulle souple (12 nœuds + curveTo), 1, 2 ou 3 gros yeux, sauts et déformation au contact,
// approche curieuse puis fuite rapide si l'alien est trop près.
(function () {
  const M = (window.MaraisBiome = window.MaraisBiome || {});

  const PALETTES = [
    [98, 214, 152],
    [136, 224, 92],
    [96, 198, 224],
    [188, 134, 232],
    [232, 196, 92],
  ];

  const popBursts = [];

  function reset() {
    popBursts.length = 0;
  }

  function spawnPopBurst(x, y, col, count, scale = 1) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (35 + Math.random() * 110) * scale;
      popBursts.push({
        x,
        y,
        z: 6 + Math.random() * 14,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        vz: (65 + Math.random() * 95) * scale,
        r: (3 + Math.random() * 4.5) * scale,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        col,
      });
    }
  }

  function createPuyo(x, y, troopX, troopY, rng) {
    const r = 13 + rng() * 5;
    const nodeCount = 12;
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const a = (Math.PI * 2 * i) / nodeCount;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      nodes.push({
        a,
        cosA,
        sinA,
        ox: cosA * r,
        oy: sinA * r,
        vx: 0,
        vy: 0,
      });
    }

    // Répartition des yeux : ~65% 2 yeux, ~20% 3 yeux, ~15% 1 gros œil
    const roll = rng();
    const eyeCount = roll < 0.15 ? 1 : (roll < 0.80 ? 2 : 3);
    const col = PALETTES[Math.floor(rng() * PALETTES.length)];

    return {
      x,
      y,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      r,
      col,
      nodes,
      eyeCount,
      squash: 0,
      squashV: 0,
      hopTimer: 0.4 + rng() * 1.8,
      blinkTimer: 1.5 + rng() * 4.0,
      isBlinking: false,
      blinkT: 0,
      troopX,
      troopY,
      maxHp: 30,
      hp: 30,
      hitFlash: 0,
      state: "wander", // wander | approach | flee
      phase: rng() * Math.PI * 2,
    };
  }

  function spawnChunkPuyos(cx, cy, env, rng, params, placedSpots) {
    const CHUNK_SIZE = env.CHUNK_SIZE || 512;
    const clearR = (env.LANDING_CLEAR_RADIUS || 230) + 20;
    const ox = cx * CHUNK_SIZE;
    const oy = cy * CHUNK_SIZE;
    const density = params.maraisPuyoDensity;
    if (density <= 0.05) return [];

    const centerW = M.sampleTerritory(ox + CHUNK_SIZE * 0.5, oy + CHUNK_SIZE * 0.5, env, params).weights.puyos;
    const targetTroops = Math.max(0, Math.round((rng() < 0.8 ? 1 : 2) * density * M.clamp(centerW, 0.15, 1.7)));
    const list = [];
    const maxAttempts = Math.max(4, targetTroops * 5);

    let placedTroops = 0;
    for (let attempt = 0; attempt < maxAttempts && placedTroops < targetTroops; attempt++) {
      const troopX = ox + 80 + rng() * (CHUNK_SIZE - 160);
      const troopY = oy + 80 + rng() * (CHUNK_SIZE - 160);
      if (Math.hypot(troopX, troopY) < clearR) continue;
      const w = M.sampleTerritory(troopX, troopY, env, params).weights.puyos;
      if (rng() > M.clamp(w * 0.85, 0.03, 1)) continue;
      if (!M.canPlaceSpot(placedSpots, troopX, troopY, 36, params.maraisMinSeparation * 0.7)) continue;
      M.registerSpot(placedSpots, troopX, troopY, 36);
      placedTroops++;

      const memberCount = 4 + Math.floor(rng() * 3);
      for (let i = 0; i < memberCount; i++) {
        const a = (Math.PI * 2 * i) / memberCount + rng() * 0.4;
        const d = 18 + rng() * 26;
        list.push(createPuyo(troopX + Math.cos(a) * d, troopY + Math.sin(a) * d, troopX, troopY, rng));
      }
    }
    return list;
  }

  function deformRing(puyo, nx, ny, amount) {
    for (const nd of puyo.nodes) {
      const dot = nd.cosA * nx + nd.sinA * ny;
      if (dot > 0.1) {
        // Comprime les nœuds côté contact et pousse légèrement les flancs
        nd.vx -= nx * dot * amount;
        nd.vy -= ny * dot * amount;
      } else {
        nd.vx += nd.cosA * amount * 0.25;
        nd.vy += nd.sinA * amount * 0.25;
      }
    }
  }

  function applyDamageToPuyo(p, st, idx, dmg, knockX = 0, knockY = 0) {
    p.hp = Math.max(0, (p.hp ?? 30) - dmg);
    p.hitFlash = 1.0;
    p.squash = -0.4;
    p.squashV = 3.2;
    const kLen = Math.hypot(knockX, knockY);
    if (kLen > 0.001) {
      const nx = knockX / kLen;
      const ny = knockY / kLen;
      p.vx += nx * 190;
      p.vy += ny * 190;
      p.vz = Math.max(p.vz, 115);
      deformRing(p, -nx, -ny, 4.2);
    } else {
      p.vz = Math.max(p.vz, 100);
      deformRing(p, 0, 1, 3.4);
    }
    spawnPopBurst(p.x, p.y, p.col, 6, 0.85);
    if (p.hp <= 0) {
      spawnPopBurst(p.x, p.y, p.col, 14, 1.25);
      st.puyos.splice(idx, 1);
      return true;
    }
    return false;
  }

  function damageAt(wx, wy, radius, dmg, chunkStates, knockX = 0, knockY = 0) {
    let hitAny = false;
    let killedAny = false;
    for (const st of chunkStates.values()) {
      for (let i = st.puyos.length - 1; i >= 0; i--) {
        const p = st.puyos[i];
        const dist = Math.hypot(wx - p.x, wy - (p.y - p.z - p.r * 0.35));
        if (dist <= p.r + radius + 6) {
          const killed = applyDamageToPuyo(p, st, i, dmg, knockX, knockY);
          hitAny = true;
          if (killed) killedAny = true;
          break;
        }
      }
      if (hitAny) break;
    }
    return { hit: hitAny, killed: killedAny };
  }

  function updatePuyos(dt, timeSec, env, chunkStates) {
    const alien = env && env.alien;
    const bounds = M.getViewBounds ? M.getViewBounds(env, 320) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;
    const allPuyos = [];
    for (const st of chunkStates.values()) {
      if (bounds && !M.isChunkVisible(st, bounds, chunkSize)) continue;
      for (const p of st.puyos) allPuyos.push(p);
    }

    const g = 340;
    const dtFrame = M.clamp(dt * 60, 0.25, 2.2);

    for (const p of allPuyos) {
      if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt * 4.5);
      if (!p.isBlinking) {
        p.blinkTimer -= dt;
        if (p.blinkTimer <= 0) {
          p.isBlinking = true;
          p.blinkT = 0;
          p.blinkTimer = 2.0 + Math.random() * 4.5;
        }
      } else {
        p.blinkT += dt * 7;
        if (p.blinkT >= 1) {
          p.isBlinking = false;
          p.blinkT = 0;
        }
      }

      // Ressort vertical squash & stretch
      const sqAcc = -110 * p.squash - 9.5 * p.squashV;
      p.squashV += sqAcc * dt;
      p.squash += p.squashV * dt;

      const dxA = alien ? alien.x - p.x : 9999;
      const dyA = alien ? alien.y - p.y : 9999;
      const distA = Math.hypot(dxA, dyA);

      if (alien && distA < 125) {
        p.state = "flee";
      } else if (alien && distA < 340) {
        p.state = "approach";
      } else {
        p.state = "wander";
      }

      // Mouvement et sauts périodiques
      p.hopTimer -= dt;
      if (p.z <= 0.1 && p.hopTimer <= 0) {
        if (p.state === "flee" && alien) {
          p.hopTimer = 0.28 + Math.random() * 0.22;
          const awayA = Math.atan2(p.y - alien.y, p.x - alien.x) + (Math.random() - 0.5) * 0.45;
          p.vx = Math.cos(awayA) * 165;
          p.vy = Math.sin(awayA) * 165;
          p.vz = 115 + Math.random() * 35;
          p.squash = 0.28;
        } else if (p.state === "approach" && alien) {
          p.hopTimer = 0.55 + Math.random() * 0.45;
          const toA = Math.atan2(dyA, dxA) + (Math.random() - 0.5) * 0.55;
          p.vx = Math.cos(toA) * 85;
          p.vy = Math.sin(toA) * 85;
          p.vz = 95 + Math.random() * 35;
          p.squash = 0.22;
        } else {
          p.hopTimer = 0.7 + Math.random() * 1.1;
          const toTroopA = Math.atan2(p.troopY - p.y, p.troopX - p.x) + (Math.random() - 0.5) * 1.6;
          p.vx = Math.cos(toTroopA) * (42 + Math.random() * 38);
          p.vy = Math.sin(toTroopA) * (42 + Math.random() * 38);
          p.vz = 85 + Math.random() * 45;
          p.squash = 0.18;
        }
      }

      // Gravité et frottement
      if (p.z > 0 || p.vz > 0) {
        p.vz -= g * dt;
        p.z += p.vz * dt;
        if (p.z <= 0) {
          p.z = 0;
          p.vz = 0;
          p.squash = -0.34;
          p.squashV = 2.6;
          deformRing(p, 0, 1, 2.2);
        }
      } else {
        p.vx *= Math.exp(-5.0 * dt);
        p.vy *= Math.exp(-5.0 * dt);
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Mise à jour des 12 nœuds souples autour du périmètre (pac.as)
      const len = p.nodes.length;
      const springK = 0.24 * dtFrame;
      const damp = Math.pow(0.82, dtFrame);
      for (let i = 0; i < len; i++) {
        const nd = p.nodes[i];
        const targetX = nd.cosA * p.r;
        const targetY = nd.sinA * p.r;
        nd.vx = (nd.vx + (targetX - nd.ox) * springK) * damp;
        nd.vy = (nd.vy + (targetY - nd.oy) * springK) * damp;
        // Léger frémissement gélatineux
        nd.vx += Math.sin(timeSec * 5 + p.phase + i) * 0.08 * dtFrame;
        nd.ox += nd.vx * dtFrame;
        nd.oy += nd.vy * dtFrame;
      }
    }

    // Contacts entre Puyos : se sautent dessus et se déforment au contact
    for (let i = 0; i < allPuyos.length; i++) {
      const a = allPuyos[i];
      for (let j = i + 1; j < allPuyos.length; j++) {
        const b = allPuyos[j];
        const minD = a.r + b.r;
        const dx = b.x - a.x;
        if (dx >= minD || dx <= -minD) continue;
        const dy = b.y - a.y;
        if (dy >= minD || dy <= -minD) continue;
        const dist = Math.hypot(dx, dy);
        if (dist < minD && dist > 0.01 && Math.abs(a.z - b.z) < 22) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minD - dist;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;

          const relVx = a.vx - b.vx;
          const relVy = a.vy - b.vy;
          const impact = Math.max(25, Math.hypot(relVx, relVy) * 0.35 + overlap * 4);
          a.vx -= nx * impact * 0.4;
          a.vy -= ny * impact * 0.4;
          b.vx += nx * impact * 0.4;
          b.vy += ny * impact * 0.4;

          // Déformation visible sur la membrane des deux bulles
          const deformStrength = M.clamp(overlap * 0.32, 1.2, 4.5);
          deformRing(a, nx, ny, deformStrength);
          deformRing(b, -nx, -ny, deformStrength);
          a.squash = -0.22;
          b.squash = -0.22;
        }
      }
    }

    for (let i = popBursts.length - 1; i >= 0; i--) {
      const b = popBursts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vz -= g * dt;
      b.z = Math.max(0, b.z + b.vz * dt);
      b.vx *= Math.exp(-3.0 * dt);
      b.vy *= Math.exp(-3.0 * dt);
      b.life -= dt;
      if (b.life <= 0) popBursts.splice(i, 1);
    }
  }

  function drawPuyoBody(ctx, p, alien) {
    const scaleY = M.clamp(1 + p.squash, 0.62, 1.38);
    const scaleX = M.clamp(1 / Math.sqrt(scaleY), 0.75, 1.32);
    const drawY = p.y - p.z - p.r * 0.35;

    ctx.save();
    // Ombre au sol
    const shScale = M.clamp(1 - p.z * 0.005, 0.45, 1);
    ctx.fillStyle = "rgba(8, 14, 12, 0.3)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 4, p.r * shScale * 1.05, p.r * 0.55 * shScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(p.x, drawY);
    ctx.scale(scaleX, scaleY);

    // Corps bulle avec curveTo entre points milieux (pac.as) — sans gradient coûteux par frame
    const nodes = p.nodes;
    const len = nodes.length;
    const bodyCol = p.hitFlash > 0.08 ? M.mixRGB(p.col, [255, 255, 255], p.hitFlash * 0.78) : p.col;
    ctx.fillStyle = M.rgbStr(bodyCol, 0.86);
    ctx.strokeStyle = "rgba(240, 255, 245, 0.72)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    let mx = (nodes[len - 1].ox + nodes[0].ox) * 0.5;
    let my = (nodes[len - 1].oy + nodes[0].oy) * 0.5;
    ctx.moveTo(mx, my);
    for (let i = 0; i < len; i++) {
      const next = nodes[(i + 1) % len];
      mx = (nodes[i].ox + next.ox) * 0.5;
      my = (nodes[i].oy + next.oy) * 0.5;
      ctx.quadraticCurveTo(nodes[i].ox, nodes[i].oy, mx, my);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Lueur interne douce + reflet bulle
    ctx.fillStyle = M.rgbStr(M.shadeRGB(bodyCol, 0.38), 0.34);
    ctx.beginPath();
    ctx.ellipse(-p.r * 0.14, -p.r * 0.16, p.r * 0.58, p.r * 0.48, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
    ctx.beginPath();
    ctx.ellipse(-p.r * 0.35, -p.r * 0.38, p.r * 0.26, p.r * 0.13, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Yeux : 1, 2 ou 3 gros yeux qui suivent l'alien
    const lookAng = alien ? Math.atan2(alien.y - p.y, alien.x - p.x) : 0;
    const blinkY = p.isBlinking ? Math.max(0.1, Math.abs(Math.cos(p.blinkT * Math.PI))) : 1;
    const eyeSpecs = p.eyeCount === 1
      ? [{ x: 0, y: -1, r: p.r * 0.36 }]
      : (p.eyeCount === 2
        ? [{ x: -p.r * 0.32, y: -1, r: p.r * 0.27 }, { x: p.r * 0.32, y: -1, r: p.r * 0.27 }]
        : [
            { x: -p.r * 0.36, y: 1, r: p.r * 0.22 },
            { x: 0, y: -p.r * 0.26, r: p.r * 0.25 },
            { x: p.r * 0.36, y: 1, r: p.r * 0.22 },
          ]);

    const pupOff = p.state === "flee" ? 0.22 : 0.32;
    for (const es of eyeSpecs) {
      ctx.save();
      ctx.translate(es.x, es.y);
      ctx.scale(1, blinkY);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, es.r, 0, Math.PI * 2);
      ctx.fill();

      const px = Math.cos(lookAng) * es.r * pupOff;
      const py = Math.sin(lookAng) * es.r * pupOff;
      ctx.fillStyle = "#16201c";
      ctx.beginPath();
      ctx.arc(px, py, es.r * (p.state === "flee" ? 0.34 : 0.48), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px - es.r * 0.14, py - es.r * 0.14, es.r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    if (p.hp < p.maxHp) {
      const bw = 24;
      const bh = 3.5;
      const bx = p.x - bw * 0.5;
      const by = drawY - p.r - 10;
      const ratio = M.clamp(p.hp / Math.max(1, p.maxHp), 0, 1);
      ctx.fillStyle = "rgba(8, 12, 14, 0.78)";
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = "#7cf5a4";
      ctx.fillRect(bx, by, bw * ratio, bh);
    }
  }

  function drawPuyos(ctx, timeSec, env, chunkStates) {
    const alien = env && env.alien;
    const bounds = M.getViewBounds ? M.getViewBounds(env, 120) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;
    const list = [];
    for (const st of chunkStates.values()) {
      if (bounds && !M.isChunkVisible(st, bounds, chunkSize)) continue;
      for (const p of st.puyos) {
        if (bounds && !M.isPointVisible(p.x, p.y, bounds, p.r * 2.2)) continue;
        list.push(p);
      }
    }
    list.sort((a, b) => a.y - b.y);
    for (const p of list) {
      drawPuyoBody(ctx, p, alien);
    }
    for (const b of popBursts) {
      if (bounds && !M.isPointVisible(b.x, b.y, bounds, b.r * 2)) continue;
      const a = M.clamp(b.life / b.maxLife, 0, 1);
      ctx.fillStyle = M.rgbStr(b.col, a * 0.82);
      ctx.beginPath();
      ctx.arc(b.x, b.y - b.z, b.r * (0.4 + 0.6 * a), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  M.puyos = {
    reset,
    spawnChunkPuyos,
    updatePuyos,
    drawPuyos,
    damageAt,
    applyDamageToPuyo,
    getPopBursts: () => popBursts,
  };
})();
