// Terrain, sol marécageux, rochers moussus, roseaux lumineux, flore et ressources pour Les Marais.
(function () {
  const M = (window.MaraisBiome = window.MaraisBiome || {});

  function sampleBiome(wx, wy, env) {
    const scale = (env && env.biomeScale) || 1.0;
    const seed = (env && env.worldSeed) || 314159;
    return M.fbm(wx * (0.0008 / scale), wy * (0.0008 / scale), seed + 101, 2);
  }

  function sampleElev(wx, wy, env) {
    const scale = (env && env.biomeScale) || 1.0;
    const seed = (env && env.worldSeed) || 314159;
    return M.fbm(wx * (0.0019 / scale), wy * (0.0019 / scale), seed + 17, 3);
  }

  function sampleDetail(wx, wy, env) {
    const seed = (env && env.worldSeed) || 314159;
    return M.valueNoise2D(wx * 0.014, wy * 0.014, seed + 202);
  }

  function sampleGroundColor(wx, wy, env) {
    const elev = sampleElev(wx, wy, env);
    const biome = sampleBiome(wx, wy, env);
    const detail = sampleDetail(wx, wy, env);
    const params = M.getParams(env);
    const territory = typeof M.sampleTerritory === "function" ? M.sampleTerritory(wx, wy, env, params) : null;

    const colA = (env && env.groundColA) || [34, 51, 38];   // Tourbe moussue
    const colB = (env && env.groundColB) || [59, 58, 38];   // Berge vaseuse
    const colC = (env && env.groundColC) || [22, 43, 41];   // Bas-fond humide

    let col;
    if (elev < -0.14) {
      const t = M.smoothstep(-0.55, -0.14, elev);
      col = M.mixRGB(M.shadeRGB(colC, -0.18), colC, t);
    } else if (biome < 0) {
      col = M.mixRGB(colA, colB, M.clamp(-biome * 1.45, 0, 1));
    } else {
      col = M.mixRGB(colA, colC, M.clamp(biome * 1.35, 0, 1));
    }

    if (territory && params.maraisHeterogeneity > 0.05) {
      const tintStrength = 0.22 * params.maraisHeterogeneity * territory.edgeMix;
      if (territory.niche === "puddles") col = M.mixRGB(col, colC, tintStrength);
      else if (territory.niche === "melons") col = M.mixRGB(col, colB, tintStrength);
      else if (territory.niche === "tentacles") col = M.mixRGB(col, M.shadeRGB(colA, -0.16), tintStrength);
      else if (territory.niche === "puyos") col = M.mixRGB(col, M.shadeRGB(colA, 0.14), tintStrength);
    }

    col = M.shadeRGB(col, elev * 0.13 + detail * 0.055);

    const clearR = (env && env.LANDING_CLEAR_RADIUS) || 230;
    const dist = Math.hypot(wx, wy);
    if (dist < clearR) {
      const t = M.clamp(1 - dist / clearR, 0, 1);
      col = M.mixRGB(col, [48, 64, 58], t * 0.65);
    }
    return M.rgbStr(col);
  }

  function generateTerrainData(cx, cy, env, rng) {
    const CHUNK_SIZE = env.CHUNK_SIZE || 512;
    const TILE_COUNT = env.TILE_COUNT || 8;
    const LANDING_CLEAR_RADIUS = env.LANDING_CLEAR_RADIUS || 230;
    const ROCK_DENSITY = Number(env.rockDensity ?? 1.0);
    const CRYSTAL_DENSITY = Number(env.crystalDensity ?? 1.0);
    const activeBiomeId = env.biomeId || "marais";
    const activeLevel1Elements = Array.isArray(env.spawnableElements) ? env.spawnableElements : [];

    const ox = cx * CHUNK_SIZE;
    const oy = cy * CHUNK_SIZE;
    const subCount = TILE_COUNT * 2;
    const subSize = CHUNK_SIZE / subCount;
    const tiles = new Array(subCount * subCount);

    for (let ty = 0; ty < subCount; ty++) {
      for (let tx = 0; tx < subCount; tx++) {
        const wx = ox + (tx + 0.5) * subSize;
        const wy = oy + (ty + 0.5) * subSize;
        tiles[ty * subCount + tx] = sampleGroundColor(wx, wy, env);
      }
    }

    const randRange = (a, b) => a + rng() * (b - a);
    const randInt = (a, b) => Math.floor(a + rng() * (b - a + 1));

    const rocks = [];
    const crystals = [];
    const flora = [];
    const pickups = [];
    const colliders = [];

    // Rochers et souches moussues
    const rockCount = Math.round(randInt(2, 5) * ROCK_DENSITY);
    for (let i = 0; i < rockCount; i++) {
      const wx = ox + randRange(30, CHUNK_SIZE - 30);
      const wy = oy + randRange(30, CHUNK_SIZE - 30);
      if (Math.hypot(wx, wy) < LANDING_CLEAR_RADIUS) continue;
      const radius = randRange(9, 21);
      const sides = randInt(5, 8);
      const pts = [];
      for (let s = 0; s < sides; s++) {
        const a = (Math.PI * 2 * s) / sides + randRange(-0.22, 0.22);
        const r = radius * randRange(0.74, 1.12);
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      const base = M.shadeRGB(rng() > 0.45 ? [52, 62, 54] : [64, 56, 45], randRange(-0.08, 0.1));
      const mossStr = M.rgbStr(M.mixRGB(base, [104, 168, 78], 0.55));
      rocks.push({
        x: wx,
        y: wy,
        pts,
        col: M.rgbStr(base),
        moss: mossStr,
        hi: mossStr,
      });
      if (radius >= 15) {
        colliders.push({ x: wx, y: wy, r: radius * 0.76 });
      }
    }

    // Cristaux / bulbes luminescents des marais
    const crystalCount = Math.round(randInt(1, 3) * CRYSTAL_DENSITY);
    for (let i = 0; i < crystalCount; i++) {
      const wx = ox + randRange(32, CHUNK_SIZE - 32);
      const wy = oy + randRange(32, CHUNK_SIZE - 32);
      if (Math.hypot(wx, wy) < LANDING_CLEAR_RADIUS) continue;
      const rgb = rng() > 0.4 ? [155, 229, 100] : [92, 224, 192];
      const sc = randRange(0.75, 1.25);
      const rot = randRange(0, Math.PI * 2);
      crystals.push({ x: wx, y: wy, rgb, sc, rot });
      if (sc >= 1.12) {
        colliders.push({ x: wx, y: wy, r: 10 * sc });
      }
    }

    // Touffes d'herbes, nénuphars et mousses
    const floraCount = randInt(5, 10);
    for (let i = 0; i < floraCount; i++) {
      const wx = ox + randRange(18, CHUNK_SIZE - 18);
      const wy = oy + randRange(18, CHUNK_SIZE - 18);
      if (Math.hypot(wx, wy) < LANDING_CLEAR_RADIUS - 25) continue;
      const kind = rng() < 0.4 ? "pad" : "tuft";
      const r = randRange(5, 11);
      const col = kind === "pad" ? [56, 114, 68] : [76, 134, 62];
      flora.push({
        x: wx,
        y: wy,
        r,
        kind,
        rot: randRange(0, Math.PI * 2),
        blades: randInt(4, 7),
        dark: M.rgbStr(M.shadeRGB(col, -0.22)),
        light: M.rgbStr(M.shadeRGB(col, 0.24)),
      });
    }

    // Ressources récoltables N1
    if (activeLevel1Elements.length > 0) {
      let totalWeight = 0;
      for (const elW of activeLevel1Elements) {
        totalWeight += Math.max(0, Number(elW.spawnWeight ?? 100));
      }
      const pickupCount = randInt(3, 5);
      const chunkMask = typeof env.getChunkMask === "function" ? env.getChunkMask(activeBiomeId, cx, cy) : 0;
      for (let i = 0; i < pickupCount; i++) {
        const wx = ox + randRange(40, CHUNK_SIZE - 40);
        const wy = oy + randRange(40, CHUNK_SIZE - 40);
        if (Math.hypot(wx, wy) < LANDING_CLEAR_RADIUS - 35) continue;
        let elIdx = 0;
        if (totalWeight > 0) {
          const roll = rng() * totalWeight;
          let acc = 0;
          elIdx = activeLevel1Elements.length - 1;
          for (let j = 0; j < activeLevel1Elements.length; j++) {
            acc += Math.max(0, Number(activeLevel1Elements[j].spawnWeight ?? 100));
            if (roll <= acc) {
              elIdx = j;
              break;
            }
          }
        } else {
          elIdx = randInt(0, activeLevel1Elements.length - 1);
        }
        const el = activeLevel1Elements[elIdx];
        if ((chunkMask & (1 << i)) !== 0) continue;
        pickups.push({
          index: i,
          x: wx,
          y: wy,
          elementId: el.id,
          icon: el.icon || "",
          color: el.color || "#9be564",
          collected: false,
        });
      }
    }

    return {
      subCount,
      subSize,
      tiles,
      craters: [],
      rocks,
      crystals,
      flora,
      pickups,
      colliders,
    };
  }

  function renderStaticChunkCanvas(ch, env) {
    if (typeof document === "undefined") return null;
    const CHUNK_SIZE = env.CHUNK_SIZE || 512;
    const canvas = document.createElement("canvas");
    canvas.width = CHUNK_SIZE;
    canvas.height = CHUNK_SIZE;
    const g = canvas.getContext("2d");
    if (!g) return null;

    const subCount = ch.subCount || env.TILE_COUNT || 8;
    const subSize = ch.subSize || CHUNK_SIZE / subCount;
    for (let ty = 0; ty < subCount; ty++) {
      for (let tx = 0; tx < subCount; tx++) {
        g.fillStyle = ch.tiles[ty * subCount + tx];
        g.fillRect(tx * subSize, ty * subSize, subSize + 1, subSize + 1);
      }
    }

    g.save();
    g.translate(-ch.ox, -ch.oy);

    // Flore statique (nénuphars & touffes)
    for (const f of ch.flora) {
      if (f.kind === "pad") {
        g.fillStyle = "rgba(6, 16, 12, 0.25)";
        g.beginPath();
        g.arc(f.x + 2, f.y + 3, f.r, 0, Math.PI * 2);
        g.fill();

        g.fillStyle = f.dark;
        g.beginPath();
        g.moveTo(f.x, f.y);
        g.arc(f.x, f.y, f.r, f.rot + 0.28, f.rot + Math.PI * 2 - 0.28);
        g.closePath();
        g.fill();

        g.fillStyle = f.light;
        g.beginPath();
        g.arc(f.x - f.r * 0.18, f.y - f.r * 0.18, f.r * 0.45, 0, Math.PI * 2);
        g.fill();
      } else {
        g.strokeStyle = f.light;
        g.lineWidth = 2.2;
        g.lineCap = "round";
        for (let i = 0; i < f.blades; i++) {
          const a = f.rot + (Math.PI * 2 * i) / f.blades;
          g.beginPath();
          g.moveTo(f.x, f.y);
          g.lineTo(f.x + Math.cos(a) * f.r, f.y + Math.sin(a) * f.r);
          g.stroke();
        }
      }
    }

    // Rochers moussus
    for (const r of ch.rocks) {
      g.fillStyle = "rgba(6, 12, 10, 0.34)";
      g.beginPath();
      r.pts.forEach((p, idx) => (idx ? g.lineTo(r.x + p[0] + 4, r.y + p[1] + 5) : g.moveTo(r.x + p[0] + 4, r.y + p[1] + 5)));
      g.closePath();
      g.fill();

      g.fillStyle = r.col;
      g.beginPath();
      r.pts.forEach((p, idx) => (idx ? g.lineTo(r.x + p[0], r.y + p[1]) : g.moveTo(r.x + p[0], r.y + p[1])));
      g.closePath();
      g.fill();

      g.fillStyle = r.moss;
      g.beginPath();
      r.pts.forEach((p, idx) => (idx ? g.lineTo(r.x + p[0] * 0.56 - 2, r.y + p[1] * 0.56 - 2) : g.moveTo(r.x + p[0] * 0.56 - 2, r.y + p[1] * 0.56 - 2)));
      g.closePath();
      g.fill();
    }

    // Cristaux des marais
    for (const cr of ch.crystals) {
      g.fillStyle = M.rgbStr(cr.rgb, 0.16);
      g.beginPath();
      g.arc(cr.x, cr.y, 18 * cr.sc, 0, Math.PI * 2);
      g.fill();
      for (let i = 0; i < 3; i++) {
        const a = cr.rot + i * 2.1;
        const len = (13 - i * 2.2) * cr.sc;
        const wid = 4.2 * cr.sc;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        const px = -dy;
        const py = dx;
        g.fillStyle = M.rgbStr(M.shadeRGB(cr.rgb, -0.14 * i));
        g.beginPath();
        g.moveTo(cr.x - dx * 3 * cr.sc, cr.y - dy * 3 * cr.sc);
        g.lineTo(cr.x + px * wid, cr.y + py * wid);
        g.lineTo(cr.x + dx * len, cr.y + dy * len);
        g.lineTo(cr.x - px * wid, cr.y - py * wid);
        g.closePath();
        g.fill();
      }
    }

    g.restore();
    return canvas;
  }

  function drawTerrainChunk(ctx, ch, env) {
    const CHUNK_SIZE = env.CHUNK_SIZE || 512;
    const LANDING_CLEAR_RADIUS = env.LANDING_CLEAR_RADIUS || 230;

    if (!ch._groundCanvas && typeof document !== "undefined") {
      ch._groundCanvas = renderStaticChunkCanvas(ch, env);
    }

    if (ch._groundCanvas) {
      ctx.drawImage(ch._groundCanvas, ch.ox, ch.oy);
    } else {
      const subCount = ch.subCount || env.TILE_COUNT || 8;
      const subSize = ch.subSize || CHUNK_SIZE / subCount;
      for (let ty = 0; ty < subCount; ty++) {
        for (let tx = 0; tx < subCount; tx++) {
          ctx.fillStyle = ch.tiles[ty * subCount + tx];
          ctx.fillRect(ch.ox + tx * subSize, ch.oy + ty * subSize, subSize + 1, subSize + 1);
        }
      }
    }

    if (ch.ox <= LANDING_CLEAR_RADIUS && ch.ox + CHUNK_SIZE >= -LANDING_CLEAR_RADIUS &&
        ch.oy <= LANDING_CLEAR_RADIUS && ch.oy + CHUNK_SIZE >= -LANDING_CLEAR_RADIUS) {
      const acc = ch.accent || (env && env.accentRgb) || [155, 229, 100];
      ctx.beginPath();
      ctx.arc(0, 0, 165, 0, Math.PI * 2);
      ctx.strokeStyle = M.rgbStr(acc, 0.24);
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 130, 0, Math.PI * 2);
      ctx.strokeStyle = M.rgbStr(acc, 0.14);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (typeof env.drawPickups === "function") {
      env.drawPickups(ctx, ch);
    }
  }

  M.terrain = {
    sampleBiome,
    sampleElev,
    sampleDetail,
    sampleGroundColor,
    generateTerrainData,
    drawTerrainChunk,
  };
})();
