// Raccord complet du biome Les Marais avec le mode Parallaxe 2.5D (extensions/parallaxe_25d.html).
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

  function drawTentacle25D(ctx, p, projectPoint, eased) {
    const n = p.segments;
    const base = projectPoint(p.x, p.y, 0);
    const bsc = base.scale;

    ctx.save();
    // Base racinaire au sol
    ctx.fillStyle = "rgba(8, 16, 12, 0.42)";
    ctx.beginPath();
    ctx.ellipse(base.x, base.y + 3 * bsc, 14 * p.scale * bsc, 8 * p.scale * bsc * (1 - 0.28 * eased), 0, 0, Math.PI * 2);
    ctx.fill();

    // Projette les articulations de la tige : en 2D pur (eased=0), tout est en XY ; en 2.5D (eased=1), la hauteur verticale devient Z
    const spine = new Array(n + 1);
    const lx = new Array(n + 1);
    const ly = new Array(n + 1);
    const rx = new Array(n + 1);
    const ry = new Array(n + 1);

    for (let i = 0; i <= n; i++) {
      const offX = p.posx[i] - p.x;
      const offY = p.posy[i] - p.y;
      const heightZ = Math.max(0, -offY) * eased;
      const worldY = p.y + offY * (1 - eased * 0.72);
      const pt = projectPoint(p.x + offX, worldY, heightZ);
      spine[i] = pt;
    }

    for (let i = 0; i <= n; i++) {
      const prev = spine[Math.max(0, i - 1)];
      const next = spine[Math.min(n, i + 1)];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.max(0.001, Math.hypot(dx, dy));
      const nx = -dy / len;
      const ny = dx / len;
      const w = p.thick[i] * spine[i].scale;
      rx[i] = spine[i].x - nx * w;
      ry[i] = spine[i].y - ny * w;
      lx[i] = spine[i].x + nx * w;
      ly[i] = spine[i].y + ny * w;
    }

    const fillCol = p.hitFlash > 0.05 ? M.mixRGB(p.bodyCol, [255, 255, 255], p.hitFlash * 0.78) : p.bodyCol;
    ctx.fillStyle = M.rgbStr(fillCol, 0.96);
    ctx.strokeStyle = M.rgbStr(p.strokeCol, 0.85);
    ctx.lineWidth = Math.max(1, 1.6 * bsc);
    ctx.beginPath();
    ctx.moveTo(lx[0], ly[0]);
    ctx.lineTo(rx[0], ry[0]);
    for (let i = 1; i < n; i++) {
      const mx = (rx[i] + rx[i + 1]) * 0.5;
      const my = (ry[i] + ry[i + 1]) * 0.5;
      ctx.quadraticCurveTo(rx[i], ry[i], mx, my);
    }
    ctx.lineTo(rx[n], ry[n]);
    ctx.lineTo(lx[n], ly[n]);
    for (let i = n - 1; i >= 1; i--) {
      const mx = (lx[i] + lx[i - 1]) * 0.5;
      const my = (ly[i] + ly[i - 1]) * 0.5;
      ctx.quadraticCurveTo(lx[i], ly[i], mx, my);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Boule montante lors de la repousse
    if (p.spitState === "regrowing") {
      const idxF = p.bulgeT * n;
      const idx0 = Math.min(n - 1, Math.floor(idxF));
      const frac = idxF - idx0;
      const bx = M.lerp(spine[idx0].x, spine[idx0 + 1].x, frac);
      const by = M.lerp(spine[idx0].y, spine[idx0 + 1].y, frac);
      ctx.fillStyle = "rgba(218, 255, 165, 0.55)";
      ctx.beginPath();
      ctx.arc(bx, by, 7.2 * p.scale * spine[idx0].scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Œil entre la tige et la touffe de poils
    const tipOffX = p.eyeX - p.x;
    const tipOffY = p.eyeY - p.y;
    const eyePt = projectPoint(p.x + tipOffX, p.y + tipOffY * (1 - eased * 0.72), Math.max(0, -tipOffY) * eased);
    const esc = eyePt.scale;
    const er = p.eyeR * p.eyePopScale * esc;

    if (p.spitState === "empty" || p.spitState === "regrowing") {
      ctx.fillStyle = "rgba(18, 28, 22, 0.9)";
      ctx.beginPath();
      ctx.arc(eyePt.x, eyePt.y, p.eyeR * 0.72 * esc, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = M.rgbStr(p.strokeCol, 0.7);
      ctx.lineWidth = Math.max(1, 1.4 * esc);
      ctx.stroke();
    } else {
      const blinkScaleY = p.isBlinking ? Math.max(0.08, Math.abs(Math.cos(p.blinkProgress * Math.PI))) : 1;
      ctx.save();
      ctx.translate(eyePt.x, eyePt.y);
      ctx.scale(1, blinkScaleY);
      ctx.fillStyle = p.spitState === "windup" ? "#ffe3c2" : "#f7faee";
      ctx.beginPath();
      ctx.arc(0, 0, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#263a28";
      ctx.lineWidth = Math.max(1, 1.4 * esc);
      ctx.stroke();

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

    // Touffe de poils IK projetée en 2.5D (batchée par profondeur de segment)
    const strands = p.hairStrands;
    if (strands.length > 0) {
      const maxSegs = strands[0].segs.length;
      const projTuft = p._projTuft || (p._projTuft = []);
      for (let sIdx = 0; sIdx < strands.length; sIdx++) {
        const segs = strands[sIdx].segs;
        const projSegs = projTuft[sIdx] || (projTuft[sIdx] = new Array(segs.length));
        for (let i = 0; i < segs.length; i++) {
          const sxOff = segs[i].x - p.x;
          const syOff = segs[i].y - p.y;
          projSegs[i] = projectPoint(p.x + sxOff, p.y + syOff * (1 - eased * 0.72), Math.max(0, -syOff) * eased);
        }
      }
      ctx.lineCap = "round";
      for (let i = 0; i < maxSegs - 1; i++) {
        const t = i / Math.max(1, maxSegs - 1);
        ctx.strokeStyle = M.rgbStr(strands[0].color, 0.92 * (1 - t * 0.65));
        ctx.lineWidth = Math.max(0.8, 3.2 * (1 - t * 0.72) * projTuft[0][i].scale);
        ctx.beginPath();
        for (let sIdx = 0; sIdx < strands.length; sIdx++) {
          const projSegs = projTuft[sIdx];
          if (i >= projSegs.length - 1) continue;
          const xc = (projSegs[i].x + projSegs[i + 1].x) * 0.5;
          const yc = (projSegs[i].y + projSegs[i + 1].y) * 0.5;
          ctx.moveTo(projSegs[i].x, projSegs[i].y);
          ctx.quadraticCurveTo(projSegs[i].x, projSegs[i].y, xc, yc);
        }
        ctx.stroke();
      }
    }
    if (p.hp < p.maxHp) {
      const bw = 28 * esc;
      const bh = 3.5 * esc;
      const bx = eyePt.x - bw * 0.5;
      const by = eyePt.y - 24 * p.scale * esc;
      const ratio = M.clamp(p.hp / Math.max(1, p.maxHp), 0, 1);
      ctx.fillStyle = "rgba(8, 12, 14, 0.78)";
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = "#b8f564";
      ctx.fillRect(bx, by, bw * ratio, bh);
    }
    ctx.restore();
  }

  function drawOctopus25D(ctx, oct, projectPoint, eased, timeSec) {
    const bob = Math.sin(timeSec * 4.5 + oct.phase) * 2.2;
    const ground = projectPoint(oct.x, oct.y, 0);
    const headPt = projectPoint(oct.x, oct.y, oct.bodyHeight + bob);
    const gsc = ground.scale;
    const hsc = headPt.scale;

    const baseRgb = oct.state === "flee"
      ? [106, 152, 198]
      : (oct.state === "attack" ? [178, 72, 108] : [124, 82, 148]);
    const bodyRgb = oct.hitFlash > 0.1 ? M.mixRGB(baseRgb, [255, 255, 255], oct.hitFlash * 0.75) : baseRgb;

    ctx.save();
    // Ombre au sol
    ctx.fillStyle = "rgba(8, 14, 12, 0.34)";
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y + 4 * gsc, oct.bodyR * 0.95 * gsc, oct.bodyR * 0.56 * gsc * (1 - 0.25 * eased), 0, 0, Math.PI * 2);
    ctx.fill();

    // Pattes triées du fond vers l'avant (tableau réutilisé)
    const sortedLegs = oct._sortedLegs || (oct._sortedLegs = oct.legs.slice());
    sortedLegs.sort((a, b) => a.footY - b.footY);
    for (const leg of sortedLegs) {
      const shX = oct.x + Math.cos(leg.restAngle + oct.facing * 0.2) * (oct.bodyR * 0.55);
      const shY = oct.y + Math.sin(leg.restAngle + oct.facing * 0.2) * (oct.bodyR * 0.35);
      const shPt = projectPoint(shX, shY, oct.bodyHeight * 0.8 + bob);
      const fgPt = projectPoint(leg.footX, leg.footY, 0);
      const fAirPt = projectPoint(leg.footX, leg.footY, leg.liftZ);
      const kneePt = projectPoint(
        (shX + leg.footX) * 0.5 + (leg.footX - oct.x) * 0.2,
        (shY + leg.footY) * 0.5 + (leg.footY - oct.y) * 0.2,
        oct.bodyHeight * 0.72 + 8 + leg.liftZ * 0.45
      );

      // Ombre du pied posé au sol
      ctx.fillStyle = "rgba(8, 14, 12, 0.24)";
      ctx.beginPath();
      ctx.ellipse(fgPt.x, fgPt.y, 4.8 * fgPt.scale, 2.8 * fgPt.scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = M.rgbStr(M.shadeRGB(bodyRgb, -0.22));
      ctx.lineWidth = Math.max(2, 6.0 * hsc);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(shPt.x, shPt.y);
      ctx.quadraticCurveTo(kneePt.x, kneePt.y, fAirPt.x, fAirPt.y);
      ctx.stroke();

      ctx.strokeStyle = M.rgbStr(bodyRgb);
      ctx.lineWidth = Math.max(1.4, 3.6 * hsc);
      ctx.beginPath();
      ctx.moveTo(shPt.x, shPt.y);
      ctx.quadraticCurveTo(kneePt.x, kneePt.y, fAirPt.x, fAirPt.y);
      ctx.stroke();

      ctx.fillStyle = M.rgbStr(M.shadeRGB(bodyRgb, 0.35));
      ctx.beginPath();
      ctx.arc(fAirPt.x, fAirPt.y, 3.0 * fAirPt.scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Manteau bulbeux (sans gradient radial par frame)
    const br = oct.bodyR * hsc;
    ctx.fillStyle = M.rgbStr(M.shadeRGB(bodyRgb, -0.06));
    ctx.beginPath();
    ctx.ellipse(headPt.x, headPt.y - 2 * hsc, br, br * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = M.rgbStr(M.shadeRGB(bodyRgb, 0.45), 0.7);
    ctx.lineWidth = Math.max(1, 1.6 * hsc);
    ctx.stroke();
    ctx.fillStyle = M.rgbStr(M.shadeRGB(bodyRgb, 0.34), 0.55);
    ctx.beginPath();
    ctx.ellipse(headPt.x - 4 * hsc, headPt.y - 6 * hsc, br * 0.52, br * 0.4, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Yeux
    const fwdX = Math.cos(oct.facing);
    const fwdY = Math.sin(oct.facing);
    const perpX = -fwdY;
    const perpY = fwdX;
    const eyeBaseX = headPt.x + fwdX * br * 0.38;
    const eyeBaseY = headPt.y + fwdY * br * 0.25 + 2 * hsc;

    for (const side of [-1, 1]) {
      const ex = eyeBaseX + perpX * 6.5 * side * hsc;
      const ey = eyeBaseY + perpY * 4.5 * side * hsc;
      ctx.fillStyle = oct.state === "attack" ? "#ffe0d6" : "#f5f9e8";
      ctx.beginPath();
      ctx.arc(ex, ey, (oct.state === "flee" ? 4.8 : 4.0) * hsc, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = oct.state === "attack" ? "#9e1c24" : "#18221e";
      ctx.beginPath();
      ctx.arc(ex + fwdX * 1.3 * hsc, ey + fwdY * 1.1 * hsc, (oct.state === "flee" ? 1.5 : 2.1) * hsc, 0, Math.PI * 2);
      ctx.fill();
    }

    if (oct.hp < oct.maxHp) {
      const bw = 30 * hsc;
      const bh = 4 * hsc;
      const bx = headPt.x - bw * 0.5;
      const by = headPt.y - br - 11 * hsc;
      const ratio = M.clamp(oct.hp / oct.maxHp, 0, 1);
      ctx.fillStyle = "rgba(8, 12, 14, 0.78)";
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = ratio < 0.5 ? "#5cd6ff" : "#ff6b6b";
      ctx.fillRect(bx, by, bw * ratio, bh);
    }
    ctx.restore();
  }

  function drawPuyo25D(ctx, p, projectPoint, eased, env) {
    const scaleY = M.clamp(1 + p.squash, 0.62, 1.38);
    const scaleX = M.clamp(1 / Math.sqrt(scaleY), 0.75, 1.32);
    const ground = projectPoint(p.x, p.y, 0);
    const bodyPt = projectPoint(p.x, p.y, p.z + p.r * 0.45);
    const bsc = bodyPt.scale;
    const gsc = ground.scale;
    const shScale = M.clamp(1 - p.z * 0.005, 0.45, 1);

    ctx.save();
    ctx.fillStyle = "rgba(8, 14, 12, 0.3)";
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y + 3 * gsc, p.r * shScale * 1.05 * gsc, p.r * 0.55 * shScale * gsc * (1 - 0.25 * eased), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(bodyPt.x, bodyPt.y);
    ctx.scale(scaleX * bsc, scaleY * bsc);

    const nodes = p.nodes;
    const len = nodes.length;
    const bodyCol = p.hitFlash > 0.08 ? M.mixRGB(p.col, [255, 255, 255], p.hitFlash * 0.78) : p.col;
    ctx.fillStyle = M.rgbStr(bodyCol, 0.88);
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

    ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
    ctx.beginPath();
    ctx.ellipse(-p.r * 0.35, -p.r * 0.38, p.r * 0.26, p.r * 0.13, -0.5, 0, Math.PI * 2);
    ctx.fill();

    const alien = env && env.alien;
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
      const bw = 24 * bsc;
      const bh = 3.5 * bsc;
      const bx = bodyPt.x - bw * 0.5;
      const by = bodyPt.y - (p.r + 10) * bsc;
      const ratio = M.clamp(p.hp / Math.max(1, p.maxHp), 0, 1);
      ctx.fillStyle = "rgba(8, 12, 14, 0.78)";
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = "#7cf5a4";
      ctx.fillRect(bx, by, bw * ratio, bh);
    }
  }

  function drawVine25D(ctx, v, projectPoint, eased) {
    const nd = v.nodes;
    if (nd.length < 6) return;
    const getBez4 = M.vines.getBez4;

    const basePt = projectPoint(v.anchorX, v.anchorY, 0);
    const topPt = projectPoint(v.anchorX, v.anchorY, 54 * eased);

    ctx.save();
    // Souche / perche verticale
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

    // Points échantillonnés une seule fois pour ombre au sol + liane 2.5D
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

    // Ombre au sol
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

  function drawEyeProjectile25D(ctx, pr, projectPoint, eased) {
    const ground = projectPoint(pr.x, pr.y, 0);
    const air = projectPoint(pr.x, pr.y, pr.z);
    const shScale = M.clamp(1 - pr.z * 0.005, 0.45, 1);

    ctx.save();
    ctx.fillStyle = "rgba(8, 16, 12, 0.34)";
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y + 2 * ground.scale, pr.r * shScale * ground.scale, pr.r * 0.55 * shScale * ground.scale * (1 - 0.2 * eased), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(air.x, air.y);
    ctx.scale(air.scale, air.scale);
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

  function attach(chunkStates, getEnvFn) {
    if (typeof window === "undefined") return;
    window.Assemblage25DBillboardSources = window.Assemblage25DBillboardSources || new Map();

    currentCollector = function collectMarais25DBillboards(push) {
      const env = typeof getEnvFn === "function" ? getEnvFn() : null;
      if (!env || (env.generator !== "marais/biome_marais" && env.generator !== "biome_marais")) return;

      const bounds = M.getViewBounds ? M.getViewBounds(env, 240) : null;
      const chunkSize = Number(env.chunkSize) || 512;

      for (const st of chunkStates.values()) {
        if (bounds && M.isChunkVisible && !M.isChunkVisible(st, bounds, chunkSize)) continue;
        for (const z of st.melons) {
          if (bounds && M.isPointVisible && !M.isPointVisible(z.x, z.y, bounds, (z.maxR || 46) + 20)) continue;
          push(z.y, (ctx, projectPoint, eased, timeSec) => drawMelon25D(ctx, z, projectPoint, eased, timeSec), z.x);
        }
        for (const p of st.tentacles) {
          if (bounds && M.isPointVisible && !M.isPointVisible(p.x, p.y, bounds, 95)) continue;
          push(p.y, (ctx, projectPoint, eased) => drawTentacle25D(ctx, p, projectPoint, eased), p.x);
        }
        for (const oct of st.octopuses) {
          if (bounds && M.isPointVisible && !M.isPointVisible(oct.x, oct.y, bounds, 85)) continue;
          push(oct.y, (ctx, projectPoint, eased, timeSec) => drawOctopus25D(ctx, oct, projectPoint, eased, timeSec), oct.x);
        }
        for (const puyo of st.puyos) {
          if (bounds && M.isPointVisible && !M.isPointVisible(puyo.x, puyo.y, bounds, (puyo.r || 24) + 28)) continue;
          push(puyo.y, (ctx, projectPoint, eased) => drawPuyo25D(ctx, puyo, projectPoint, eased, env), puyo.x);
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
      for (const pr of M.tentacles.getEyeProjectiles()) {
        if (bounds && M.isPointVisible && !M.isPointVisible(pr.x, pr.y, bounds, 30)) continue;
        push(pr.y, (ctx, projectPoint, eased) => drawEyeProjectile25D(ctx, pr, projectPoint, eased), pr.x);
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

      const inks = M.octopus.getInkPuffs();
      for (const pk of inks) {
        if (bounds && M.isPointVisible && !M.isPointVisible(pk.x, pk.y, bounds, (pk.r || 16) + 12)) continue;
        push(pk.y, (ctx, projectPoint) => {
          const pt = projectPoint(pk.x, pk.y, 12);
          const a = M.clamp(pk.life / pk.maxLife, 0, 1);
          ctx.fillStyle = M.rgbStr(pk.col, a * 0.65);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pk.r * (1.2 - a * 0.4) * pt.scale, 0, Math.PI * 2);
          ctx.fill();
        }, pk.x);
      }

      if (typeof M.puyos.getPopBursts === "function") {
        for (const b of M.puyos.getPopBursts()) {
          if (bounds && M.isPointVisible && !M.isPointVisible(b.x, b.y, bounds, (b.r || 16) + 12)) continue;
          push(b.y, (ctx, projectPoint) => {
            const pt = projectPoint(b.x, b.y, b.z);
            const a = M.clamp(b.life / b.maxLife, 0, 1);
            ctx.fillStyle = M.rgbStr(b.col, a * 0.82);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, b.r * (0.4 + 0.6 * a) * pt.scale, 0, Math.PI * 2);
            ctx.fill();
          }, b.x);
        }
      }

      const bursts = M.tentacles.getImpactBursts();
      for (const b of bursts) {
        if (bounds && M.isPointVisible && !M.isPointVisible(b.x, b.y, bounds, (b.r || 24) + 12)) continue;
        push(b.y, (ctx, projectPoint) => {
          const pt = projectPoint(b.x, b.y, 8);
          const p = 1 - b.life / b.maxLife;
          ctx.strokeStyle = M.rgbStr(b.col, (1 - p) * 0.75);
          ctx.lineWidth = Math.max(1, 2 * pt.scale);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, M.lerp(4, b.r, p) * pt.scale, 0, Math.PI * 2);
          ctx.stroke();
        }, b.x);
      }
    };

    window.Assemblage25DBillboardSources.set(SOURCE_KEY, currentCollector);
  }

  function detach() {
    if (typeof window !== "undefined" && window.Assemblage25DBillboardSources) {
      window.Assemblage25DBillboardSources.delete(SOURCE_KEY);
    }
    currentCollector = null;
  }

  M.parallax25D = {
    attach,
    detach,
  };
})();
