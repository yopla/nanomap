// Flaques de marais avec bulles de surface et geysers lents éjectant des bulles solides rebondissantes.
(function () {
  const M = (window.MaraisBiome = window.MaraisBiome || {});

  const solidBubbles = [];
  const droplets = [];
  const ripples = [];
  const bubbleSprites = new Map();

  function getBubbleSprite(hue) {
    if (typeof document === "undefined") return null;
    const key = `${hue[0]},${hue[1]},${hue[2]}`;
    if (bubbleSprites.has(key)) return bubbleSprites.get(key);
    const size = 64;
    const cv = document.createElement("canvas");
    cv.width = size;
    cv.height = size;
    const g = cv.getContext("2d");
    if (!g) return null;
    const c = size * 0.5;
    const r = size * 0.44;
    const grad = g.createRadialGradient(c - r * 0.28, c - r * 0.32, r * 0.12, c, c, r);
    grad.addColorStop(0, "rgba(245, 255, 248, 0.88)");
    grad.addColorStop(0.45, M.rgbStr(hue, 0.55));
    grad.addColorStop(1, M.rgbStr(M.shadeRGB(hue, -0.35), 0.72));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(225, 255, 232, 0.75)";
    g.lineWidth = 2.2;
    g.stroke();
    g.fillStyle = "rgba(255, 255, 255, 0.85)";
    g.beginPath();
    g.ellipse(c - r * 0.34, c - r * 0.34, r * 0.24, r * 0.13, -0.6, 0, Math.PI * 2);
    g.fill();
    bubbleSprites.set(key, cv);
    return cv;
  }

  function ensurePuddleCache(p) {
    if (p._cacheCanvas || typeof document === "undefined") return p._cacheCanvas;
    const size = Math.ceil(p.r * 3.4);
    const half = size * 0.5;
    const cv = document.createElement("canvas");
    cv.width = size;
    cv.height = size;
    const g = cv.getContext("2d");
    if (!g) return null;

    g.save();
    g.translate(half - p.x, half - p.y);
    g.fillStyle = "rgba(18, 28, 22, 0.55)";
    for (const l of p.lobes) {
      g.beginPath();
      g.ellipse(l.x, l.y, l.rx * 1.12, l.ry * 1.12, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = p.isGeyser ? "rgba(38, 92, 82, 0.72)" : "rgba(28, 68, 56, 0.68)";
    for (const l of p.lobes) {
      g.beginPath();
      g.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "rgba(148, 224, 168, 0.14)";
    g.beginPath();
    g.ellipse(p.x - p.r * 0.16, p.y - p.r * 0.12, p.r * 0.52, p.r * 0.34, -0.2, 0, Math.PI * 2);
    g.fill();
    g.restore();

    p._cacheCanvas = cv;
    p._cacheHalf = half;
    return cv;
  }

  function reset() {
    solidBubbles.length = 0;
    droplets.length = 0;
    ripples.length = 0;
  }

  function spawnChunkPuddles(cx, cy, env, rng, params, placedSpots) {
    const CHUNK_SIZE = env.CHUNK_SIZE || 512;
    const clearR = (env.LANDING_CLEAR_RADIUS || 230) - 20;
    const ox = cx * CHUNK_SIZE;
    const oy = cy * CHUNK_SIZE;
    const density = params.maraisPuddleDensity;
    const centerW = M.sampleTerritory(ox + CHUNK_SIZE * 0.5, oy + CHUNK_SIZE * 0.5, env, params).weights.puddles;
    const targetCount = Math.round((2 + Math.floor(rng() * 3)) * density * M.clamp(centerW, 0.2, 1.7));
    const list = [];
    const maxAttempts = Math.max(4, targetCount * 4);

    for (let attempt = 0; attempt < maxAttempts && list.length < targetCount; attempt++) {
      const x = ox + 55 + rng() * (CHUNK_SIZE - 110);
      const y = oy + 55 + rng() * (CHUNK_SIZE - 110);
      if (Math.hypot(x, y) < clearR) continue;
      const w = M.sampleTerritory(x, y, env, params).weights.puddles;
      if (rng() > M.clamp(w * 0.85, 0.03, 1)) continue;

      const baseR = 26 + rng() * 30;
      if (!M.canPlaceSpot(placedSpots, x, y, baseR, params.maraisMinSeparation * 0.65)) continue;
      M.registerSpot(placedSpots, x, y, baseR * 0.9);
      const lobeCount = 7 + Math.floor(rng() * 4);
      const lobes = [];
      for (let k = 0; k < lobeCount; k++) {
        const a = (Math.PI * 2 * k) / lobeCount + (rng() - 0.5) * 0.35;
        const lr = baseR * (0.72 + rng() * 0.44);
        lobes.push({
          x: x + Math.cos(a) * lr * 0.35,
          y: y + Math.sin(a) * lr * 0.28,
          rx: lr * (0.68 + rng() * 0.26),
          ry: lr * (0.56 + rng() * 0.22),
        });
      }

      const isGeyser = rng() < 0.45;
      const surfaceBubbles = [];
      const sbCount = 3 + Math.floor(rng() * 4);
      for (let b = 0; b < sbCount; b++) {
        const ba = rng() * Math.PI * 2;
        const bd = rng() * baseR * 0.65;
        surfaceBubbles.push({
          ox: Math.cos(ba) * bd,
          oy: Math.sin(ba) * bd * 0.78,
          phase: rng(),
          speed: 0.32 + rng() * 0.45,
          maxR: 3.5 + rng() * 5.0,
        });
      }

      list.push({
        x,
        y,
        r: baseR,
        lobes,
        isGeyser,
        surfaceBubbles,
        geyserTimer: 1.5 + rng() * 4.5,
        geyserInterval: 4.5 + rng() * 4.0,
        ventPulse: 0,
        eruptQueue: 0,
        eruptDelay: 0,
        stepRippleCd: 0,
      });
    }
    return list;
  }

  function spawnSolidBubble(puddle) {
    if (solidBubbles.length > 90) return;
    const angle = Math.random() * Math.PI * 2;
    const horizSpeed = 28 + Math.random() * 58;
    const r = 9 + Math.random() * 8;
    const maxBounces = Math.random() < 0.5 ? 2 : 3;
    solidBubbles.push({
      x: puddle.x + (Math.random() - 0.5) * 8,
      y: puddle.y + (Math.random() - 0.5) * 6,
      z: 4,
      vx: Math.cos(angle) * horizSpeed,
      vy: Math.sin(angle) * horizSpeed * 0.85,
      vz: 118 + Math.random() * 52,
      r,
      squash: 0,
      squashV: 0,
      bounces: 0,
      maxBounces,
      state: "air",
      settleTimer: 0.4 + Math.random() * 0.45,
      hue: Math.random() < 0.55 ? [142, 232, 138] : [116, 224, 212],
      wobblePhase: Math.random() * Math.PI * 2,
    });
    ripples.push({
      x: puddle.x,
      y: puddle.y,
      r: 5,
      maxR: puddle.r * 0.65,
      life: 0.65,
      maxLife: 0.65,
      col: [176, 245, 178],
    });
  }

  function spawnBubblePop(b) {
    ripples.push({
      x: b.x,
      y: b.y,
      r: b.r * 0.7,
      maxR: b.r * 2.3,
      life: 0.42,
      maxLife: 0.42,
      col: b.hue,
    });
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
      const spd = 45 + Math.random() * 75;
      droplets.push({
        x: b.x,
        y: b.y,
        z: b.z + b.r * 0.5,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        vz: 50 + Math.random() * 60,
        r: 2 + Math.random() * 2.2,
        life: 0.42,
        maxLife: 0.42,
        col: b.hue,
      });
    }
  }

  function updatePuddles(dt, timeSec, env, chunkStates) {
    const alien = env && env.alien;
    const alienSpd = alien ? Math.hypot(alien.vx || 0, alien.vy || 0) : 0;
    const bounds = M.getViewBounds ? M.getViewBounds(env, 260) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;

    for (const st of chunkStates.values()) {
      if (bounds && !M.isChunkVisible(st, bounds, chunkSize)) continue;
      for (const p of st.puddles) {
        if (p.stepRippleCd > 0) p.stepRippleCd -= dt;
        if (p.ventPulse > 0) p.ventPulse = Math.max(0, p.ventPulse - dt * 1.8);

        for (const sb of p.surfaceBubbles) {
          sb.phase += dt * sb.speed;
          if (sb.phase >= 1) {
            sb.phase -= 1;
            if (Math.random() < 0.45) {
              ripples.push({
                x: p.x + sb.ox,
                y: p.y + sb.oy,
                r: sb.maxR * 0.4,
                maxR: sb.maxR * 2.2,
                life: 0.55,
                maxLife: 0.55,
                col: [152, 224, 158],
              });
            }
          }
        }

        // Clapotis sous les pas de l'alien
        if (alien && alienSpd > 25 && p.stepRippleCd <= 0) {
          const d = Math.hypot(alien.x - p.x, alien.y - p.y);
          if (d < p.r * 0.92) {
            p.stepRippleCd = 0.28;
            ripples.push({
              x: alien.x,
              y: alien.y,
              r: 4,
              maxR: 22,
              life: 0.5,
              maxLife: 0.5,
              col: [164, 232, 178],
            });
          }
        }

        // Geyser de bulles solides (mou et assez lent)
        if (p.isGeyser) {
          p.geyserTimer -= dt;
          if (p.geyserTimer <= 0) {
            p.geyserTimer = p.geyserInterval * (0.85 + Math.random() * 0.35);
            p.eruptQueue = 4 + Math.floor(Math.random() * 4);
            p.eruptDelay = 0;
            p.ventPulse = 1;
          }
          if (p.eruptQueue > 0) {
            p.eruptDelay -= dt;
            if (p.eruptDelay <= 0) {
              p.eruptDelay = 0.22 + Math.random() * 0.16;
              p.eruptQueue--;
              p.ventPulse = 0.9;
              spawnSolidBubble(p);
            }
          }
        }
      }
    }

    // Physique des bulles solides éjectées
    const g = 225;
    for (let i = solidBubbles.length - 1; i >= 0; i--) {
      const b = solidBubbles[i];
      b.wobblePhase += dt * 7;

      // Ressort squash & stretch
      const sqAcc = -95 * b.squash - 9 * b.squashV;
      b.squashV += sqAcc * dt;
      b.squash += b.squashV * dt;

      if (b.state === "air") {
        b.vz -= g * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        b.vx *= Math.exp(-0.55 * dt);
        b.vy *= Math.exp(-0.55 * dt);

        if (b.z <= 0) {
          b.z = 0;
          b.bounces++;
          if (b.bounces <= b.maxBounces) {
            b.vz = Math.max(48, Math.abs(b.vz) * 0.62);
            b.squash = -0.34;
            b.squashV = 2.6;
            ripples.push({
              x: b.x,
              y: b.y,
              r: b.r * 0.4,
              maxR: b.r * 1.7,
              life: 0.35,
              maxLife: 0.35,
              col: b.hue,
            });
          } else {
            b.state = "settle";
            b.squash = -0.28;
            b.squashV = 2.0;
          }
        }
      } else if (b.state === "settle") {
        b.vx *= Math.exp(-4.5 * dt);
        b.vy *= Math.exp(-4.5 * dt);
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.settleTimer -= dt;
        if (b.settleTimer <= 0) {
          spawnBubblePop(b);
          solidBubbles.splice(i, 1);
          continue;
        }
      }

      // Petit rebond ludique si l'alien touche une bulle solide
      if (alien && b.z < 24) {
        const dx = b.x - alien.x;
        const dy = b.y - alien.y;
        const dist = Math.hypot(dx, dy);
        const minD = b.r + 14;
        if (dist > 0.01 && dist < minD) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = alien.x + nx * minD;
          b.y = alien.y + ny * minD;
          b.vx += nx * 110;
          b.vy += ny * 110;
          b.vz = Math.max(b.vz, 65);
          b.state = "air";
          b.squash = -0.26;
          b.squashV = 2.4;
        }
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.life -= dt;
      if (rp.life <= 0) ripples.splice(i, 1);
    }

    for (let i = droplets.length - 1; i >= 0; i--) {
      const dr = droplets[i];
      dr.vz -= 260 * dt;
      dr.x += dr.vx * dt;
      dr.y += dr.vy * dt;
      dr.z = Math.max(0, dr.z + dr.vz * dt);
      dr.life -= dt;
      if (dr.life <= 0) droplets.splice(i, 1);
    }
  }

  function drawPuddlesGround(ctx, timeSec, env, chunkStates) {
    const bounds = M.getViewBounds ? M.getViewBounds(env, 140) : null;
    const chunkSize = (env && env.CHUNK_SIZE) || 512;
    for (const st of chunkStates.values()) {
      if (bounds && !M.isChunkVisible(st, bounds, chunkSize)) continue;
      for (const p of st.puddles) {
        if (bounds && !M.isPointVisible(p.x, p.y, bounds, p.r * 1.4)) continue;
        const cached = ensurePuddleCache(p);
        if (cached) {
          ctx.drawImage(cached, p.x - p._cacheHalf, p.y - p._cacheHalf);
        } else {
          ctx.fillStyle = "rgba(18, 28, 22, 0.55)";
          for (const l of p.lobes) {
            ctx.beginPath();
            ctx.ellipse(l.x, l.y, l.rx * 1.12, l.ry * 1.12, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = p.isGeyser ? "rgba(38, 92, 82, 0.72)" : "rgba(28, 68, 56, 0.68)";
          for (const l of p.lobes) {
            ctx.beginPath();
            ctx.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "rgba(148, 224, 168, 0.14)";
          ctx.beginPath();
          ctx.ellipse(p.x - p.r * 0.16, p.y - p.r * 0.12, p.r * 0.52, p.r * 0.34, -0.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bouche du geyser au centre
        if (p.isGeyser) {
          const pulse = 1 + p.ventPulse * 0.45 + 0.1 * Math.sin(timeSec * 3.5);
          ctx.fillStyle = "rgba(18, 48, 44, 0.8)";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 10 * pulse, 7.5 * pulse, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(165, 245, 175, ${(0.25 + p.ventPulse * 0.45).toFixed(3)})`;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        // Bulles de surface
        for (const sb of p.surfaceBubbles) {
          const t = sb.phase;
          const r = sb.maxR * Math.sin(t * Math.PI);
          if (r <= 0.6) continue;
          const bx = p.x + sb.ox;
          const by = p.y + sb.oy;
          ctx.fillStyle = "rgba(165, 242, 185, 0.28)";
          ctx.beginPath();
          ctx.arc(bx, by, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(220, 255, 228, 0.55)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Ondes sur l'eau
    for (const rp of ripples) {
      if (bounds && !M.isPointVisible(rp.x, rp.y, bounds, rp.maxR)) continue;
      const p = 1 - rp.life / rp.maxLife;
      const r = M.lerp(rp.r, rp.maxR, p);
      ctx.strokeStyle = M.rgbStr(rp.col, (1 - p) * 0.55);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, r, r * 0.78, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawSolidBubbles(ctx, timeSec) {
    for (const b of solidBubbles) {
      const wobble = 0.06 * Math.sin(b.wobblePhase);
      const scaleY = M.clamp(1 + b.squash + wobble, 0.58, 1.42);
      const scaleX = M.clamp(1 / Math.sqrt(scaleY), 0.72, 1.38);
      const shadowScale = M.clamp(1 - b.z * 0.005, 0.45, 1);

      ctx.save();
      ctx.fillStyle = "rgba(6, 18, 14, 0.28)";
      ctx.beginPath();
      ctx.ellipse(b.x, b.y + 3, b.r * shadowScale, b.r * 0.55 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      const drawY = b.y - b.z - b.r * scaleY * 0.55;
      ctx.translate(b.x, drawY);
      ctx.scale(scaleX, scaleY);

      const fade = b.state === "settle" && b.settleTimer < 0.14 ? M.clamp(b.settleTimer / 0.14, 0, 1) : 1;
      const sprite = getBubbleSprite(b.hue);
      if (sprite) {
        if (fade < 0.99) ctx.globalAlpha = fade;
        const dr = b.r * 1.14;
        ctx.drawImage(sprite, -dr, -dr, dr * 2, dr * 2);
      } else {
        ctx.fillStyle = M.rgbStr(b.hue, 0.65 * fade);
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(225, 255, 232, ${(0.75 * fade).toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const dr of droplets) {
      const a = M.clamp(dr.life / dr.maxLife, 0, 1);
      ctx.fillStyle = M.rgbStr(dr.col, a * 0.85);
      ctx.beginPath();
      ctx.arc(dr.x, dr.y - dr.z, dr.r * a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  M.puddles = {
    reset,
    spawnChunkPuddles,
    updatePuddles,
    drawPuddlesGround,
    drawSolidBubbles,
    getSolidBubbles: () => solidBubbles,
    getDroplets: () => droplets,
    getRipples: () => ripples,
    getBubbleSprite,
  };
})();
