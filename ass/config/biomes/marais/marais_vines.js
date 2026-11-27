// Lianes physiques inspirées de refJeu/itbw.as (chaîne de ressorts + courbe de Bézier degré 5 getBez4).
(function () {
  const M = (window.MaraisBiome = window.MaraisBiome || {});

  function getBez4(x0, x1, x2, x3, x4, x5, t) {
    let k0 = x0 + (x1 - x0) * t;
    let k1 = x1 + (x2 - x1) * t;
    let k2 = x2 + (x3 - x2) * t;
    let k3 = x3 + (x4 - x3) * t;
    const k4 = x4 + (x5 - x4) * t;

    k0 = k0 + (k1 - k0) * t;
    k1 = k1 + (k2 - k1) * t;
    k2 = k2 + (k3 - k2) * t;
    k3 = k3 + (k4 - k3) * t;

    k0 = k0 + (k1 - k0) * t;
    k1 = k1 + (k2 - k1) * t;
    k2 = k2 + (k3 - k2) * t;

    k0 = k0 + (k1 - k0) * t;
    k1 = k1 + (k2 - k1) * t;
    return k0 + (k1 - k0) * t;
  }

  function doSpring(a, b, rest, dtNorm) {
    const dx = a.cx - b.cx;
    const dy = a.cy - b.cy;
    let mag = Math.hypot(dx, dy);
    if (mag < 0.0001) mag = 0.0001;
    const nx = dx / mag;
    const ny = dy / mag;
    const ax = a.vx - b.vx;
    const ay = a.vy - b.vy;
    const imp = (((ax * nx + ay * ny) + (mag - rest) / 10) * 0.5) * 0.5 * dtNorm;
    a.vx += imp * (-0.5 * nx);
    a.vy += imp * (-0.5 * ny);
    b.vx += imp * (0.5 * nx);
    b.vy += imp * (0.5 * ny);
  }

  function spawnChunkVines(cx, cy, env, rng, params, placedSpots) {
    const CHUNK_SIZE = env.CHUNK_SIZE || 512;
    const clearR = (env.LANDING_CLEAR_RADIUS || 230) - 10;
    const ox = cx * CHUNK_SIZE;
    const oy = cy * CHUNK_SIZE;
    const centerW = M.sampleTerritory(ox + CHUNK_SIZE * 0.5, oy + CHUNK_SIZE * 0.5, env, params).weights.vines;
    const targetCount = Math.round((2 + Math.floor(rng() * 4)) * params.maraisVineDensity * M.clamp(centerW, 0.15, 1.75));
    const list = [];
    const maxAttempts = Math.max(4, targetCount * 4);

    for (let attempt = 0; attempt < maxAttempts && list.length < targetCount; attempt++) {
      const anchorX = ox + 36 + rng() * (CHUNK_SIZE - 72);
      const anchorY = oy + 36 + rng() * (CHUNK_SIZE - 72);
      if (Math.hypot(anchorX, anchorY) < clearR) continue;
      const w = M.sampleTerritory(anchorX, anchorY, env, params).weights.vines;
      if (rng() > M.clamp(w * 0.85, 0.03, 1)) continue;
      if (!M.canPlaceSpot(placedSpots, anchorX, anchorY, 18, params.maraisMinSeparation * 0.65)) continue;
      M.registerSpot(placedSpots, anchorX, anchorY, 18);

      const rest = 12 + rng() * 5;
      const numNodes = 6;
      const nodes = [];
      const driftSign = rng() < 0.5 ? -1 : 1;
      for (let n = 0; n < numNodes; n++) {
        nodes.push({
          cx: anchorX + n * 2.5 * driftSign,
          cy: anchorY + n * rest * 0.72,
          vx: 0,
          vy: 0,
        });
      }

      const col = rng() < 0.5 ? [72, 128, 62] : [92, 146, 74];
      list.push({
        anchorX,
        anchorY,
        rest,
        phase: rng() * Math.PI * 2,
        thick: 3.2 + rng() * 1.8,
        col: M.rgbStr(col),
        hi: M.rgbStr(M.shadeRGB(col, 0.25)),
        leafPositions: [0.38 + rng() * 0.14, 0.72 + rng() * 0.14],
        nodes,
      });
    }
    return list;
  }

  function nudgeVinesAt(wx, wy, radius, vx, vy, chunkStates) {
    for (const st of chunkStates.values()) {
      for (const v of st.vines) {
        for (let i = 1; i < v.nodes.length; i++) {
          const nd = v.nodes[i];
          const dx = nd.cx - wx;
          const dy = nd.cy - wy;
          const d = Math.hypot(dx, dy);
          if (d < radius) {
            const f = 1 - d / radius;
            nd.vx += vx * f * 0.12 + (dx / (d + 1)) * f * 1.8;
            nd.vy += vy * f * 0.12 + (dy / (d + 1)) * f * 1.8;
          }
        }
      }
    }
  }

  function updateVines(dt, timeSec, env, chunkStates, params) {
    const alien = env && env.alien;
    const alienVx = alien ? alien.vx || 0 : 0;
    const alienVy = alien ? alien.vy || 0 : 0;
    const alienSpd = Math.hypot(alienVx, alienVy);
    const wind = params.maraisWindStrength;

    // Normalise les sous-pas d'intégration à l'échelle itbw.as (~60fps)
    const subSteps = 6;
    const stepScale = M.clamp((dt * 60) / subSteps, 0.1, 0.5);
    const bounds = M.getViewBounds ? M.getViewBounds(env, 260) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;

    for (const st of chunkStates.values()) {
      if (bounds && !M.isChunkVisible(st, bounds, chunkSize)) continue;
      for (const v of st.vines) {
        if (alien && Math.hypot(alien.x - v.anchorX, alien.y - v.anchorY) > 760) continue;
        const nodes = v.nodes;
        const n0 = nodes[0];
        n0.cx = v.anchorX;
        n0.cy = v.anchorY;
        n0.vx = 0;
        n0.vy = 0;

        // Brise générée quand l'alien passe à proximité
        if (alien) {
          for (let i = 1; i < nodes.length; i++) {
            const nd = nodes[i];
            const dx = nd.cx - alien.x;
            const dy = nd.cy - alien.y;
            const d = Math.hypot(dx, dy);
            if (d < 118 && d > 0.5) {
              const prox = 1 - d / 118;
              const swirl = Math.sin(timeSec * 6.5 + v.phase + i) * 0.45;
              const push = (0.35 + alienSpd * 0.008) * prox * dt * 28;
              nd.vx += ((dx / d) * 0.65 + (alienVx / (alienSpd + 1)) * 0.35 + swirl * 0.25) * push;
              nd.vy += ((dy / d) * 0.45 + (alienVy / (alienSpd + 1)) * 0.35) * push;
            }
          }
        }

        const ambientWindX = (Math.sin(timeSec * 1.8 + v.phase) * 0.028 + Math.cos(timeSec * 3.1 + v.phase * 1.7) * 0.014) * wind;
        const ambientWindY = Math.sin(timeSec * 1.3 + v.phase * 0.8) * 0.008 * wind;

        for (let k = 0; k < subSteps; k++) {
          for (let i = 1; i < nodes.length; i++) {
            const a = nodes[i];
            const b = nodes[i - 1];
            doSpring(a, b, v.rest, stepScale * 2.2);
            const damp = Math.pow(0.985, stepScale * 2.2);
            a.vx = a.vx * damp + ambientWindX * stepScale;
            a.vy = a.vy * damp + (0.025 + ambientWindY) * stepScale;
            a.cx += a.vx * stepScale * 3.5;
            a.cy += a.vy * stepScale * 3.5;
          }
          n0.cx = v.anchorX;
          n0.cy = v.anchorY;
          n0.vx = 0;
          n0.vy = 0;
        }
      }
    }
  }

  function drawVines(ctx, env, chunkStates) {
    const bounds = M.getViewBounds ? M.getViewBounds(env, 140) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;
    const samples = 11;

    for (const st of chunkStates.values()) {
      if (bounds && !M.isChunkVisible(st, bounds, chunkSize)) continue;
      for (const v of st.vines) {
        if (bounds && !M.isPointVisible(v.anchorX, v.anchorY, bounds, 95)) continue;
        const nd = v.nodes;
        if (nd.length < 6) continue;

        const pts = new Array(samples + 1);
        for (let s = 0; s <= samples; s++) {
          const t = s / samples;
          pts[s] = [
            getBez4(nd[0].cx, nd[1].cx, nd[2].cx, nd[3].cx, nd[4].cx, nd[5].cx, t),
            getBez4(nd[0].cy, nd[1].cy, nd[2].cy, nd[3].cy, nd[4].cy, nd[5].cy, t),
          ];
        }

        ctx.save();
        // Petit nœud/souche d'attache en hauteur
        ctx.fillStyle = "#2b2418";
        ctx.beginPath();
        ctx.arc(v.anchorX, v.anchorY - 12, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#4d6b38";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(v.anchorX, v.anchorY - 12);
        ctx.lineTo(v.anchorX, v.anchorY);
        ctx.stroke();

        // Ombre portée douce au sol (réutilise pts)
        ctx.strokeStyle = "rgba(5, 12, 8, 0.24)";
        ctx.lineWidth = v.thick + 1;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let s = 0; s <= samples; s += 2) {
          const sx = pts[s][0] + 6;
          const sy = pts[s][1] + 8;
          if (s === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        // Liane principale (courbe de Bézier itbw.as)
        ctx.strokeStyle = v.col;
        ctx.lineWidth = v.thick;
        ctx.beginPath();
        for (let s = 0; s <= samples; s++) {
          if (s === 0) ctx.moveTo(pts[s][0], pts[s][1]);
          else ctx.lineTo(pts[s][0], pts[s][1]);
        }
        ctx.stroke();

        // Reflet fin et petites feuilles accrochées
        ctx.strokeStyle = v.hi;
        ctx.lineWidth = 1.1;
        ctx.stroke();

        for (const lp of v.leafPositions) {
          const idx = Math.min(pts.length - 2, Math.max(1, Math.floor(lp * (pts.length - 1))));
          const p = pts[idx];
          const pPrev = pts[idx - 1];
          const ang = Math.atan2(p[1] - pPrev[1], p[0] - pPrev[0]) + 0.8;
          ctx.fillStyle = v.hi;
          ctx.beginPath();
          ctx.ellipse(p[0] + Math.cos(ang) * 4, p[1] + Math.sin(ang) * 4, 4.5, 2.2, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  M.vines = {
    spawnChunkVines,
    updateVines,
    drawVines,
    nudgeVinesAt,
    getBez4,
  };
})();
