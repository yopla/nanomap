// Utilitaires déterministes, mathématiques, couleurs et paramètres pour le biome Les Marais.
(function () {
  const M = (window.MaraisBiome = window.MaraisBiome || {});

  M.PARAMS_SCHEMA = [
    { key: "maraisTentacleDensity", label: "Plantes tentacules", min: 0, max: 2.5, step: 0.1, default: 1.0, rebuildChunks: true },
    { key: "maraisEyeSpitRate", label: "Fréquence tir d'œil", min: 0, max: 2.5, step: 0.1, default: 1.0, rebuildChunks: false },
    { key: "maraisOctopusDensity", label: "Poulpes marcheurs", min: 0, max: 2.5, step: 0.1, default: 1.0, rebuildChunks: true },
    { key: "maraisOctopusHp", label: "Vie des poulpes", min: 20, max: 200, step: 10, default: 60, rebuildChunks: false },
    { key: "maraisPuyoDensity", label: "Troupes de Puyos", min: 0, max: 2.5, step: 0.1, default: 1.0, rebuildChunks: true },
    { key: "maraisMelonDensity", label: "Zones tactiles (Melon)", min: 0, max: 2.5, step: 0.1, default: 1.0, rebuildChunks: true },
    { key: "maraisVineDensity", label: "Lianes physiques", min: 0, max: 2.5, step: 0.1, default: 1.0, rebuildChunks: true },
    { key: "maraisPuddleDensity", label: "Flaques & bulles", min: 0, max: 2.5, step: 0.1, default: 1.0, rebuildChunks: true },
    { key: "maraisWindStrength", label: "Vent / brise", min: 0, max: 2.5, step: 0.1, default: 1.0, rebuildChunks: false },
    { key: "maraisMistIntensity", label: "Brume des marais", min: 0, max: 1.0, step: 0.05, default: 0.45, rebuildChunks: false },
    { key: "maraisHeterogeneity", label: "Hétérogénéité (zonage)", min: 0, max: 1.0, step: 0.05, default: 0.75, rebuildChunks: true },
    { key: "maraisZoneScale", label: "Taille des zones", min: 0.4, max: 3.0, step: 0.1, default: 1.3, rebuildChunks: true },
    { key: "maraisMinSeparation", label: "Espacement min (px)", min: 0, max: 140, step: 4, default: 56, rebuildChunks: true },
    { key: "maraisTentacleWriggle", label: "Tortillement tentacules", min: 0.4, max: 2.5, step: 0.1, default: 1.2, rebuildChunks: false }
  ];

  const NICHES = ["tentacles", "puddles", "puyos", "octopus", "melons", "vines", "clearing"];

  function sampleTerritory(wx, wy, env, params) {
    const p = params || getParams(env);
    const het = clamp(Number(p.maraisHeterogeneity ?? 0.75), 0, 1);
    const zScale = clamp(Number(p.maraisZoneScale ?? 1.3), 0.4, 3.0);
    const seed = (env && env.worldSeed) || 314159;
    const cellSize = 520 * zScale;

    // Domain warp organique pour éviter des frontières de cellules rectilignes
    const warpX = fbm(wx * 0.0012, wy * 0.0012, seed + 511, 2) * cellSize * 0.34;
    const warpY = fbm(wx * 0.0012, wy * 0.0012, seed + 733, 2) * cellSize * 0.34;
    const sx = (wx + warpX) / cellSize;
    const sy = (wy + warpY) / cellSize;
    const gx0 = Math.floor(sx);
    const gy0 = Math.floor(sy);

    let bestDist = 1e9;
    let secondDist = 1e9;
    let bestNiche = "clearing";
    let secondNiche = "clearing";

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = gx0 + dx;
        const cy = gy0 + dy;
        const px = cx + 0.18 + hash2u(cx, cy, seed + 31) * 0.64;
        const py = cy + 0.18 + hash2u(cx, cy, seed + 59) * 0.64;
        const d = Math.hypot(sx - px, sy - py);
        const nIdx = Math.floor(hash2u(cx, cy, seed + 97) * NICHES.length) % NICHES.length;
        const niche = NICHES[nIdx];
        if (d < bestDist) {
          secondDist = bestDist;
          secondNiche = bestNiche;
          bestDist = d;
          bestNiche = niche;
        } else if (d < secondDist) {
          secondDist = d;
          secondNiche = niche;
        }
      }
    }

    // Transition douce près de la frontière de Voronoi
    const edgeMix = clamp((secondDist - bestDist) * 3.2, 0, 1);
    const weights = {};
    for (const k of NICHES) {
      let spec = 0.08;
      if (k === bestNiche) {
        spec = 1.65;
      } else if (k === secondNiche && edgeMix < 0.7) {
        spec = lerp(0.85, 0.12, edgeMix / 0.7);
      } else if (bestNiche === "puddles" && k === "vines") {
        spec = 0.45; // quelques lianes en bord de marécage
      } else if (bestNiche === "tentacles" && k === "vines") {
        spec = 0.52;
      } else if (bestNiche === "clearing") {
        spec = 0.04;
      }
      weights[k] = lerp(1.0, spec, het);
    }

    return {
      niche: bestNiche,
      edgeMix,
      weights,
    };
  }

  function canPlaceSpot(spots, x, y, r, minSep) {
    if (!spots || minSep <= 0) return true;
    const pad = Math.max(0, Number(minSep) || 0);
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      const d = Math.hypot(x - s.x, y - s.y);
      if (d < r + s.r + pad) return false;
    }
    return true;
  }

  function registerSpot(spots, x, y, r) {
    if (spots) spots.push({ x, y, r });
  }

  function getViewBounds(env, pad = 180) {
    if (!env || !env.cam) return null;
    const cam = env.cam;
    const zoom = Math.max(0.15, Number(env.currentZoom) || 1);
    const viewW = Number(env.viewW) || 1280;
    const viewH = Number(env.viewH) || 720;
    const is25D = typeof window !== "undefined" && Boolean(window.Assemblage25DActive);
    const rawHW = (viewW * 0.5) / zoom;
    const rawHH = (viewH * (is25D ? 0.65 : 0.5)) / (zoom * (is25D ? 0.6 : 1));
    let halfW, halfH;
    if (cam.angle) {
      const ac = Math.abs(Math.cos(cam.angle));
      const as = Math.abs(Math.sin(cam.angle));
      halfW = rawHW * ac + rawHH * as + pad;
      halfH = rawHW * as + rawHH * ac + pad;
    } else {
      halfW = rawHW + pad;
      halfH = rawHH + pad;
    }
    return {
      minX: cam.x - halfW,
      maxX: cam.x + halfW,
      minY: cam.y - halfH,
      maxY: cam.y + halfH,
    };
  }

  function isChunkVisible(st, bounds, chunkSize = 512) {
    if (!bounds) return true;
    const ox = st.cx * chunkSize;
    const oy = st.cy * chunkSize;
    return !(ox + chunkSize < bounds.minX || ox > bounds.maxX || oy + chunkSize < bounds.minY || oy > bounds.maxY);
  }

  function isPointVisible(x, y, bounds, r = 0) {
    if (!bounds) return true;
    return x + r >= bounds.minX && x - r <= bounds.maxX && y + r >= bounds.minY && y - r <= bounds.maxY;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function lerpAngle(a, b, t) {
    const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + diff * t;
  }

  function mixRGB(c1, c2, t) {
    return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
  }

  function shadeRGB(c, amount) {
    if (amount >= 0) {
      return [lerp(c[0], 255, amount), lerp(c[1], 255, amount), lerp(c[2], 255, amount)];
    }
    const f = 1 + amount;
    return [c[0] * f, c[1] * f, c[2] * f];
  }

  function rgbStr(c, a = 1) {
    return `rgba(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))},${clamp(a, 0, 1).toFixed(3)})`;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(ix, iy, seed) {
    let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
    n = (n ^ (n >>> 13)) >>> 0;
    n = Math.imul(n, 1274126177) >>> 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296 * 2 - 1;
  }

  function hash2u(ix, iy, seed) {
    return (hash2(ix, iy, seed) + 1) * 0.5;
  }

  function valueNoise2D(x, y, seed) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy, seed);
    const b = hash2(ix + 1, iy, seed);
    const c = hash2(ix, iy + 1, seed);
    const d = hash2(ix + 1, iy + 1, seed);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm(x, y, seed, octaves = 3) {
    let val = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      val += valueNoise2D(x * freq, y * freq, seed + i * 31) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.02;
    }
    return norm > 0 ? val / norm : 0;
  }

  function chunkRng(worldSeed, cx, cy, salt = 0) {
    const h = (
      Math.imul(worldSeed | 0, 73856093) ^
      Math.imul(cx | 0, 19349663) ^
      Math.imul(cy | 0, 83492791) ^
      Math.imul(salt | 0, 2654435761)
    ) >>> 0;
    return mulberry32(h || 1);
  }

  function getParams(env) {
    const b = (env && env.biome) || {};
    const out = {};
    for (const def of M.PARAMS_SCHEMA) {
      const raw = b[def.key];
      const num = raw === undefined || raw === null || Number.isNaN(Number(raw)) ? def.default : Number(raw);
      out[def.key] = clamp(num, def.min, def.max);
    }
    return out;
  }

  M.lerp = lerp;
  M.clamp = clamp;
  M.smoothstep = smoothstep;
  M.lerpAngle = lerpAngle;
  M.mixRGB = mixRGB;
  M.shadeRGB = shadeRGB;
  M.rgbStr = rgbStr;
  M.mulberry32 = mulberry32;
  M.hash2 = hash2;
  M.hash2u = hash2u;
  M.valueNoise2D = valueNoise2D;
  M.fbm = fbm;
  M.chunkRng = chunkRng;
  M.getParams = getParams;
  M.sampleTerritory = sampleTerritory;
  M.canPlaceSpot = canPlaceSpot;
  M.registerSpot = registerSpot;
  M.getViewBounds = getViewBounds;
  M.isChunkVisible = isChunkVisible;
  M.isPointVisible = isPointVisible;
})();
