// Raccord complet du biome Les Marais avec le mode Parallaxe 2.5D (extensions/parallaxe_25d.html).
// Les acteurs (poulpe_marcheur, plante_tentacule, troupe_puyos) fournissent leur propre rendu 2.5D depuis config/actors/.
(function () {
  const M = (window.MaraisBiome = window.MaraisBiome || {});

  const SOURCE_KEY = "marais_biome_25d";
  let currentCollector = null;

  function drawMelon25D(ctx, z, projectPoint, eased, timeSec) {
    const pal = M.melon.SKIN_VARIANTS[z.variantIdx] || M.melon.SKIN_VARIANTS[0];
    const skin = M.melon.getSkinCanvas(z.variantIdx);
    const pulse = 0.5 + 0.5 * Math.sin(timeSec * 2.8 + z.x * 0.02);

    const ground = projectPoint(z.x, z.y, 0);
    const gsc = ground.scale;
    const pitchY = 1 - 0.38 * eased;

    ctx.save();
    // Anneau tactile au sol
    ctx.strokeStyle = M.rgbStr(pal.glow, 0.24 + pulse * 0.16 + z.touchPulse * 0.35);
    ctx.lineWidth = (2 + z.touchPulse * 2) * gsc;
    ctx.setLineDash([6 * gsc, 6 * gsc]);
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y, z.r * 1.07 * gsc, z.r * 1.07 * gsc * pitchY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ombre portée
    ctx.fillStyle = "rgba(6, 14, 10, 0.38)";
    ctx.beginPath();
    ctx.ellipse(ground.x + 4 * gsc, ground.y + 5 * gsc, z.r * 1.04 * gsc, z.r * 0.88 * gsc * pitchY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Disques empilés en vraie hauteur Z
    const disks = z.disks;
    for (let i = disks.length - 1; i >= 0; i--) {
      const d = disks[i];
      const liftZ = d.z * 0.65 * eased;
      const pt = projectPoint(z.x + d.x, z.y + d.y, liftZ);
      const rPx = d.r * pt.scale;
      const ryPx = rPx * (1 - 0.18 * eased);

      if (skin) {
        ctx.drawImage(skin, pt.x - rPx, pt.y - ryPx, rPx * 2, ryPx * 2);
      } else {
        ctx.fillStyle = M.rgbStr(pal.base);
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, rPx, ryPx, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = M.rgbStr(pal.rim, 0.24);
        ctx.lineWidth = Math.max(1, 1.2 * pt.scale);
        ctx.stroke();
      }
    }

    const top = disks[0];
    if (top) {
      const topPt = projectPoint(z.x + top.x * 1.15, z.y + top.y * 1.15, top.z * 0.65 * eased + 3);
      ctx.fillStyle = M.rgbStr(pal.glow, 0.45 + z.touchPulse * 0.35);
      ctx.beginPath();
      ctx.arc(topPt.x - top.r * 0.25 * topPt.scale, topPt.y - top.r * 0.22 * topPt.scale, Math.max(2.5, top.r * 0.45 * topPt.scale), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawVine25D(ctx, v, projectPoint, eased) {
    const nd = v.nodes;
    if (nd.length < 6) return;
    const getBez4 = M.vines.getBez4;

    const basePt = projectPoint(v.anchorX, v.anchorY, 0);
    const topPt = projectPoint(v.anchorX, v.anchorY, 54 * eased);

    ctx.save();
    ctx.strokeStyle = "#3a4d2c";
    ctx.lineWidth = Math.max(1.5, 3.2 * basePt.scale);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(basePt.x, basePt.y);
    ctx.lineTo(topPt.x, topPt.y);
    ctx.stroke();

    ctx.fillStyle = "#2b2418";
    ctx.beginPath();
    ctx.arc(topPt.x, topPt.y, 4.8 * topPt.scale, 0, Math.PI * 2);
    ctx.fill();

    const samples = 11;
    const pts = v._pts25d || (v._pts25d = new Array(samples));
    const gPts = v._gPts25d || (v._gPts25d = new Array(samples));
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      const wx = getBez4(nd[0].cx, nd[1].cx, nd[2].cx, nd[3].cx, nd[4].cx, nd[5].cx, t);
      const wy = getBez4(nd[0].cy, nd[1].cy, nd[2].cy, nd[3].cy, nd[4].cy, nd[5].cy, t);
      const z = M.lerp(52, 8, t) * eased;
      pts[i] = projectPoint(wx, wy, z);
      gPts[i] = projectPoint(wx + 4, wy + 5, 0);
    }

    ctx.strokeStyle = "rgba(5, 12, 8, 0.24)";
    ctx.lineWidth = v.thick * basePt.scale;
    ctx.beginPath();
    ctx.moveTo(gPts[0].x, gPts[0].y);
    for (let i = 1; i < samples; i++) {
      ctx.lineTo(gPts[i].x, gPts[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = v.col;
    ctx.lineWidth = v.thick * topPt.scale;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = v.hi;
    ctx.lineWidth = Math.max(0.8, 1.1 * topPt.scale);
    ctx.stroke();

    for (const lp of v.leafPositions) {
      const idx = Math.min(pts.length - 2, Math.max(1, Math.floor(lp * (pts.length - 1))));
      const p = pts[idx];
      const pPrev = pts[idx - 1];
      const ang = Math.atan2(p.y - pPrev.y, p.x - pPrev.x) + 0.8;
      ctx.fillStyle = v.hi;
      ctx.beginPath();
      ctx.ellipse(p.x + Math.cos(ang) * 4 * p.scale, p.y + Math.sin(ang) * 4 * p.scale, 4.5 * p.scale, 2.2 * p.scale, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSolidBubble25D(ctx, b, projectPoint, eased) {
    const wobble = 0.06 * Math.sin(b.wobblePhase);
    const scaleY = M.clamp(1 + b.squash + wobble, 0.58, 1.42);
    const scaleX = M.clamp(1 / Math.sqrt(scaleY), 0.72, 1.38);
    const ground = projectPoint(b.x, b.y, 0);
    const air = projectPoint(b.x, b.y, b.z + b.r * scaleY * 0.55);
    const gsc = ground.scale;
    const asc = air.scale;
    const shadowScale = M.clamp(1 - b.z * 0.005, 0.45, 1);

    ctx.save();
    ctx.fillStyle = "rgba(6, 18, 14, 0.28)";
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y + 2 * gsc, b.r * shadowScale * gsc, b.r * 0.55 * shadowScale * gsc * (1 - 0.2 * eased), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(air.x, air.y);
    ctx.scale(scaleX * asc, scaleY * asc);

    const fade = b.state === "settle" && b.settleTimer < 0.14 ? M.clamp(b.settleTimer / 0.14, 0, 1) : 1;
    const sprite = M.puddles && M.puddles.getBubbleSprite ? M.puddles.getBubbleSprite(b.hue) : null;
    if (sprite) {
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = prevAlpha * fade;
      ctx.drawImage(sprite, -b.r * 1.15, -b.r * 1.15, b.r * 2.3, b.r * 2.3);
      ctx.globalAlpha = prevAlpha;
    } else {
      ctx.fillStyle = M.rgbStr(b.hue, 0.62 * fade);
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(225, 255, 232, ${(0.75 * fade).toFixed(3)})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.85 * fade).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(-b.r * 0.34, -b.r * 0.34, b.r * 0.24, b.r * 0.13, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function attach(chunkStates, getEnvFn) {
    if (typeof window === "undefined") return;
    const p25d = window.AssemblageRuntime && window.AssemblageRuntime.parallax25d;
    if (!p25d) window.Assemblage25DBillboardSources = window.Assemblage25DBillboardSources || new Map();

    currentCollector = function collectMarais25DBillboards(push) {
      const env = typeof getEnvFn === "function" ? getEnvFn() : null;
      if (!env || (env.generator !== "marais/biome_marais" && env.generator !== "biome_marais")) return;

      const bounds = M.getViewBounds ? M.getViewBounds(env, 240) : null;
      const chunkSize = Number(env.CHUNK_SIZE || env.chunkSize) || 512;
      const A = window.AssemblageActors || {};
      const tentacleMod = A["plante_tentacule"] || M.tentacles;
      const octopusMod = A["poulpe_marcheur"] || M.octopus;
      const puyoMod = A["troupe_puyos"] || M.puyos;

      for (const st of chunkStates.values()) {
        if (bounds && M.isChunkVisible && !M.isChunkVisible(st, bounds, chunkSize)) continue;
        for (const z of st.melons) {
          if (bounds && M.isPointVisible && !M.isPointVisible(z.x, z.y, bounds, (z.r || z.maxR || 46) + 20)) continue;
          push(z.y, (ctx, projectPoint, eased, timeSec) => drawMelon25D(ctx, z, projectPoint, eased, timeSec), z.x);
        }
        if (tentacleMod && typeof tentacleMod.draw25D === "function") {
          for (const p of st.tentacles) {
            if (bounds && M.isPointVisible && !M.isPointVisible(p.x, p.y, bounds, 95)) continue;
            push(p.y, (ctx, projectPoint, eased) => tentacleMod.draw25D(ctx, p, projectPoint, eased), p.x);
          }
        }
        if (octopusMod && typeof octopusMod.draw25D === "function") {
          for (const oct of st.octopuses) {
            if (bounds && M.isPointVisible && !M.isPointVisible(oct.x, oct.y, bounds, 85)) continue;
            push(oct.y, (ctx, projectPoint, eased, timeSec) => octopusMod.draw25D(ctx, oct, projectPoint, eased, timeSec), oct.x);
          }
        }
        if (puyoMod && typeof puyoMod.draw25D === "function") {
          for (const puyo of st.puyos) {
            if (bounds && M.isPointVisible && !M.isPointVisible(puyo.x, puyo.y, bounds, (puyo.r || 24) + 28)) continue;
            push(puyo.y, (ctx, projectPoint, eased, timeSec) => puyoMod.draw25D(ctx, puyo, projectPoint, eased, timeSec, env), puyo.x);
          }
        }
        for (const v of st.vines) {
          if (bounds && M.isPointVisible && !M.isPointVisible(v.anchorX, v.anchorY, bounds, (v.length || 90) + 25)) continue;
          push(v.anchorY, (ctx, projectPoint, eased) => drawVine25D(ctx, v, projectPoint, eased), v.anchorX);
        }
      }

      for (const b of M.puddles.getSolidBubbles()) {
        if (bounds && M.isPointVisible && !M.isPointVisible(b.x, b.y, bounds, (b.r || 18) + 20)) continue;
        push(b.y, (ctx, projectPoint, eased) => drawSolidBubble25D(ctx, b, projectPoint, eased), b.x);
      }

      const droplets = M.puddles.getDroplets();
      for (const dr of droplets) {
        if (bounds && M.isPointVisible && !M.isPointVisible(dr.x, dr.y, bounds, 18)) continue;
        push(dr.y, (ctx, projectPoint) => {
          const pt = projectPoint(dr.x, dr.y, dr.z);
          const a = M.clamp(dr.life / dr.maxLife, 0, 1);
          ctx.fillStyle = M.rgbStr(dr.col, a * 0.85);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, dr.r * a * pt.scale, 0, Math.PI * 2);
          ctx.fill();
        }, dr.x);
      }

      if (M.melon && typeof M.melon.getRipples === "function") {
        for (const rp of M.melon.getRipples()) {
          if (bounds && M.isPointVisible && !M.isPointVisible(rp.x, rp.y, bounds, (rp.maxR || 90) + 12)) continue;
          push(rp.y, (ctx, projectPoint, eased) => {
            const pt = projectPoint(rp.x, rp.y, 1);
            const t = 1 - rp.life / rp.maxLife;
            const r = M.lerp(rp.r, rp.maxR, t) * pt.scale;
            const pitchY = 1 - 0.38 * eased;
            ctx.strokeStyle = M.rgbStr(rp.col, (1 - t) * 0.65);
            ctx.lineWidth = Math.max(1.2, 2.4 * pt.scale);
            ctx.beginPath();
            ctx.ellipse(pt.x, pt.y, r, r * pitchY, 0, 0, Math.PI * 2);
            ctx.stroke();
          }, rp.x);
        }
      }

      if (tentacleMod && typeof tentacleMod.collect25DEffects === "function") {
        tentacleMod.collect25DEffects(push, bounds);
      }
      if (octopusMod && typeof octopusMod.collect25DEffects === "function") {
        octopusMod.collect25DEffects(push, bounds);
      }
      if (puyoMod && typeof puyoMod.collect25DEffects === "function") {
        puyoMod.collect25DEffects(push, bounds);
      }
    };

    if (p25d && typeof p25d.registerSource === "function") {
      p25d.registerSource(SOURCE_KEY, currentCollector);
    } else {
      window.Assemblage25DBillboardSources.set(SOURCE_KEY, currentCollector);
    }
  }

  function detach() {
    if (typeof window !== "undefined") {
      const p25d = window.AssemblageRuntime && window.AssemblageRuntime.parallax25d;
      if (p25d && typeof p25d.unregisterSource === "function") {
        p25d.unregisterSource(SOURCE_KEY);
      } else if (window.Assemblage25DBillboardSources) {
        window.Assemblage25DBillboardSources.delete(SOURCE_KEY);
      }
    }
    currentCollector = null;
  }

  M.parallax25D = {
    attach,
    detach,
  };
})();
