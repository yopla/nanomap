// Zones tactiles molles inspirées de refJeu/03_alglules/3_melon/melon.as avec skin texture marécageux.
(function () {
  const M = (window.MaraisBiome = window.MaraisBiome || {});

  const SKIN_VARIANTS = [
    { base: [44, 110, 66], rib: [24, 62, 38], glow: [164, 240, 108], rim: [130, 212, 118] },
    { base: [108, 92, 42], rib: [58, 46, 22], glow: [232, 206, 92], rim: [198, 174, 88] },
    { base: [56, 86, 102], rib: [28, 44, 58], glow: [118, 232, 208], rim: [104, 198, 186] },
  ];

  let skinCanvases = null;
  let activeDragZone = null;
  const ripples = [];

  function ensureSkins() {
    if (skinCanvases || typeof document === "undefined") return;
    skinCanvases = SKIN_VARIANTS.map((v, idx) => {
      const size = 128;
      const cv = document.createElement("canvas");
      cv.width = size;
      cv.height = size;
      const g = cv.getContext("2d");
      if (!g) return cv;

      const cx = size * 0.5;
      const cy = size * 0.5;
      const rad = size * 0.47;

      // Pré-masque circulaire + contour intégrés une seule fois (évite ctx.clip() par frame)
      g.beginPath();
      g.arc(cx, cy, rad, 0, Math.PI * 2);
      g.clip();

      const grad = g.createRadialGradient(cx - rad * 0.25, cy - rad * 0.28, rad * 0.08, cx, cy, rad);
      grad.addColorStop(0, M.rgbStr(M.shadeRGB(v.base, 0.35)));
      grad.addColorStop(0.55, M.rgbStr(v.base));
      grad.addColorStop(1, M.rgbStr(M.shadeRGB(v.rib, -0.35)));
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);

      // Côtes organiques façon melon / courge des marais
      const ribs = 10 + idx * 2;
      g.strokeStyle = M.rgbStr(v.rib, 0.55);
      g.lineWidth = 2.0;
      for (let i = 0; i < ribs; i++) {
        const a = (Math.PI * 2 * i) / ribs;
        const cpA = a + 0.18;
        g.beginPath();
        g.moveTo(cx, cy);
        g.quadraticCurveTo(
          cx + Math.cos(cpA) * rad * 0.55,
          cy + Math.sin(cpA) * rad * 0.55,
          cx + Math.cos(a) * rad,
          cy + Math.sin(a) * rad
        );
        g.stroke();
      }

      // Taches bioluminescentes et pores moussus
      const rng = M.mulberry32(9001 + idx * 137);
      for (let i = 0; i < 36; i++) {
        const a = rng() * Math.PI * 2;
        const d = Math.sqrt(rng()) * rad * 0.88;
        const sx = cx + Math.cos(a) * d;
        const sy = cy + Math.sin(a) * d;
        const sr = 1.6 + rng() * 3.4;
        g.fillStyle = i % 3 === 0 ? M.rgbStr(v.glow, 0.42) : M.rgbStr(v.rib, 0.32);
        g.beginPath();
        g.arc(sx, sy, sr, 0, Math.PI * 2);
        g.fill();
      }

      // Cerne léger intégré au sprite
      g.strokeStyle = M.rgbStr(v.rim, 0.36);
      g.lineWidth = 2.2;
      g.beginPath();
      g.arc(cx, cy, rad - 1, 0, Math.PI * 2);
      g.stroke();

      return cv;
    });
  }

  function reset() {
    activeDragZone = null;
    ripples.length = 0;
  }

  // CircFunction fidèle à melon.as : r(h) = alpha * sqrt(1 - ((h + gamma)/beta)^2)
  function createMelonZone(x, y, r, variantIdx) {
    const h = r;
    const depth = 0.1 * h;
    const beta = h + depth;
    const inv0 = Math.sqrt(Math.max(0.0001, 1 - (depth / beta) * (depth / beta)));
    const alpha = r / inv0;
    const diskCount = 6;
    const thickness = h / diskCount;
    const disks = [];

    for (let i = diskCount - 1; i >= 0; i--) {
      const height = i * thickness;
      const yNorm = (height + depth) / beta;
      const diskR = alpha * Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
      disks.push({
        x: 0,
        y: 0,
        r: Math.max(4, diskR),
        z: Math.max(2, height),
        mass: Math.max(10, thickness * diskR * diskR),
        spring: h * r * r,
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
      });
    }

    return {
      x,
      y,
      r,
      h,
      variantIdx,
      disks,
      touchPulse: 0,
      isTouched: false,
      pointerWorldX: x,
      pointerWorldY: y,
    };
  }

  function spawnChunkMelons(cx, cy, env, rng, params, placedSpots) {
    const CHUNK_SIZE = env.CHUNK_SIZE || 512;
    const clearR = (env.LANDING_CLEAR_RADIUS || 230) + 15;
    const ox = cx * CHUNK_SIZE;
    const oy = cy * CHUNK_SIZE;
    const density = params.maraisMelonDensity;
    if (density <= 0.05) return [];

    const centerW = M.sampleTerritory(ox + CHUNK_SIZE * 0.5, oy + CHUNK_SIZE * 0.5, env, params).weights.melons;
    const baseCount = rng() < 0.72 ? 1 : 2;
    const targetCount = Math.round(baseCount * density * M.clamp(centerW, 0.15, 1.7));
    const list = [];
    const maxAttempts = Math.max(4, targetCount * 5);

    for (let attempt = 0; attempt < maxAttempts && list.length < targetCount; attempt++) {
      const x = ox + 80 + rng() * (CHUNK_SIZE - 160);
      const y = oy + 80 + rng() * (CHUNK_SIZE - 160);
      if (Math.hypot(x, y) < clearR) continue;
      const w = M.sampleTerritory(x, y, env, params).weights.melons;
      if (rng() > M.clamp(w * 0.85, 0.03, 1)) continue;
      const r = 44 + rng() * 18;
      if (!M.canPlaceSpot(placedSpots, x, y, r, params.maraisMinSeparation)) continue;
      M.registerSpot(placedSpots, x, y, r);
      const variantIdx = Math.floor(rng() * SKIN_VARIANTS.length);
      list.push(createMelonZone(x, y, r, variantIdx));
    }
    return list;
  }

  function applyForceToZone(zone, fx, fy, impulseScale = 1) {
    // Indice 0 = sommet, disks.length - 1 = base fixe au sol
    for (let i = zone.disks.length - 2; i >= 0; i--) {
      const d = zone.disks[i];
      const param = (d.z / d.mass) * impulseScale;
      d.vx += param * fx;
      d.vy += param * fy;
    }
  }

  function findZoneAt(wx, wy, chunkStates) {
    for (const st of chunkStates.values()) {
      for (const z of st.melons) {
        if (Math.hypot(wx - z.x, wy - z.y) <= z.r * 1.1) {
          return z;
        }
      }
    }
    return null;
  }

  function handlePointerDown(wx, wy, chunkStates) {
    const z = findZoneAt(wx, wy, chunkStates);
    if (!z) return false;

    activeDragZone = z;
    z.isTouched = true;
    z.touchPulse = 1.0;
    z.pointerWorldX = wx;
    z.pointerWorldY = wy;

    const dx = wx - z.x;
    const dy = wy - z.y;
    const dist = Math.hypot(dx, dy);
    const f0 = 0.024 * z.h * z.r * z.r;
    if (dist > 2) {
      applyForceToZone(z, (dx / dist) * f0, (dy / dist) * f0, 1.3);
    } else {
      const a = Math.random() * Math.PI * 2;
      applyForceToZone(z, Math.cos(a) * f0, Math.sin(a) * f0, 1.2);
    }

    ripples.push({
      x: z.x,
      y: z.y,
      r: z.r * 0.85,
      maxR: z.r * 1.65,
      life: 0.55,
      maxLife: 0.55,
      col: SKIN_VARIANTS[z.variantIdx].glow,
    });
    return true;
  }

  function handlePointerMove(wx, wy) {
    if (!activeDragZone) return false;
    activeDragZone.pointerWorldX = wx;
    activeDragZone.pointerWorldY = wy;
    activeDragZone.touchPulse = Math.max(activeDragZone.touchPulse, 0.75);
    return true;
  }

  function handlePointerUp() {
    if (!activeDragZone) return false;
    activeDragZone.isTouched = false;
    // Petit rebond élastique au relâchement
    const top = activeDragZone.disks[0];
    if (top) {
      top.vx -= top.ox * 2.5;
      top.vy -= top.oy * 2.5;
    }
    activeDragZone = null;
    return true;
  }

  function updateMelons(dt, timeSec, env, chunkStates) {
    const dtFrame = M.clamp(dt * 60, 0.25, 2.5);
    const K = 0.45;
    const damp = Math.pow(0.955, dtFrame);
    const bounds = M.getViewBounds ? M.getViewBounds(env, 320) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;

    for (const st of chunkStates.values()) {
      const inView = !bounds || M.isChunkVisible(st, bounds, chunkSize);
      for (const z of st.melons) {
        if (!inView && !z.isTouched && z.touchPulse <= 0.001) continue;
        if (z.touchPulse > 0 && !z.isTouched) {
          z.touchPulse = Math.max(0, z.touchPulse - dt * 2.2);
        }

        // Force continue pendant le toucher (comme isMouseOn dans melon.as)
        if (z.isTouched) {
          const dx = z.pointerWorldX - z.x;
          const dy = z.pointerWorldY - z.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2) {
            const clamped = Math.min(dist, z.r * 1.4) / z.r;
            const f0 = 0.0028 * z.h * z.r * z.r * clamped;
            applyForceToZone(z, (dx / dist) * f0, (dy / dist) * f0, dtFrame);
          }
        }

        const disks = z.disks;
        for (let i = disks.length - 2; i >= 0; i--) {
          const d = disks[i];
          const dBelow = disks[i + 1];
          const param = (K * d.spring) / d.z / d.mass;
          d.vx = (d.vx - param * d.ox * dtFrame) * damp;
          d.vy = (d.vy - param * d.oy * dtFrame) * damp;
          d.ox = M.clamp(d.ox + d.vx * dtFrame, -z.r * 0.45, z.r * 0.45);
          d.oy = M.clamp(d.oy + d.vy * dtFrame, -z.r * 0.45, z.r * 0.45);
          d.x = dBelow.x + d.ox;
          d.y = dBelow.y + d.oy;
        }
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].life -= dt;
      if (ripples[i].life <= 0) ripples.splice(i, 1);
    }
  }

  function drawMelons(ctx, timeSec, env, chunkStates) {
    ensureSkins();
    const bounds = M.getViewBounds ? M.getViewBounds(env, 140) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;
    for (const st of chunkStates.values()) {
      if (bounds && !M.isChunkVisible(st, bounds, chunkSize)) continue;
      for (const z of st.melons) {
        if (bounds && !M.isPointVisible(z.x, z.y, bounds, z.r * 1.2)) continue;
        const pal = SKIN_VARIANTS[z.variantIdx] || SKIN_VARIANTS[0];
        const skin = skinCanvases ? skinCanvases[z.variantIdx] : null;
        const pulse = 0.5 + 0.5 * Math.sin(timeSec * 2.8 + z.x * 0.02);

        ctx.save();
        // Halo discret indiquant une zone tactile interactive
        ctx.strokeStyle = M.rgbStr(pal.glow, 0.24 + pulse * 0.16 + z.touchPulse * 0.35);
        ctx.lineWidth = 2 + z.touchPulse * 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 1.07, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ombre portée
        ctx.fillStyle = "rgba(6, 14, 10, 0.38)";
        ctx.beginPath();
        ctx.ellipse(z.x + 4, z.y + 6, z.r * 1.04, z.r * 0.94, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dessin empilé des disques pré-masqués de la base vers le sommet (zéro ctx.clip)
        const disks = z.disks;
        for (let i = disks.length - 1; i >= 0; i--) {
          const d = disks[i];
          const cx = z.x + d.x;
          const cy = z.y + d.y;
          if (skin) {
            ctx.drawImage(skin, cx - d.r, cy - d.r, d.r * 2, d.r * 2);
          } else {
            ctx.fillStyle = M.rgbStr(pal.base);
            ctx.beginPath();
            ctx.arc(cx, cy, d.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = M.rgbStr(pal.rim, 0.22);
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }

        // Apex brillant qui suit le sommet
        const top = disks[0];
        if (top) {
          const tx = z.x + top.x * 1.15;
          const ty = z.y + top.y * 1.15;
          ctx.fillStyle = M.rgbStr(pal.glow, 0.45 + z.touchPulse * 0.35);
          ctx.beginPath();
          ctx.arc(tx - top.r * 0.25, ty - top.r * 0.25, Math.max(3, top.r * 0.45), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    for (const rp of ripples) {
      const t = 1 - rp.life / rp.maxLife;
      const r = M.lerp(rp.r, rp.maxR, t);
      ctx.strokeStyle = M.rgbStr(rp.col, (1 - t) * 0.65);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  M.melon = {
    reset,
    spawnChunkMelons,
    updateMelons,
    drawMelons,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    SKIN_VARIANTS,
    getSkinCanvas: (idx) => {
      ensureSkins();
      return skinCanvases ? skinCanvases[idx % skinCanvases.length] : null;
    },
    getRipples: () => ripples,
  };
})();
