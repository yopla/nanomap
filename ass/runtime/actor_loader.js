// Chargeur dynamique de scripts d'acteurs (config/actors/<id>.js) et utilitaires partagés.
(function () {
  const RT = (window.AssemblageRuntime = window.AssemblageRuntime || {});
  const A = (window.AssemblageActors = window.AssemblageActors || {});

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
    const twoPi = Math.PI * 2;
    const diff = ((((b - a + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
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

  function hexToRgb(hex, fallback) {
    const s = String(hex || "").trim().replace(/^#/, "");
    if (/^[0-9a-f]{6}$/i.test(s)) {
      return [
        parseInt(s.slice(0, 2), 16),
        parseInt(s.slice(2, 4), 16),
        parseInt(s.slice(4, 6), 16),
      ];
    }
    return fallback ? fallback.slice() : [128, 200, 180];
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
    const is25D = Boolean((RT.parallax25d && RT.parallax25d.isActive()) || (typeof window !== "undefined" && window.Assemblage25DActive));
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

  function migrateChunkEntities(chunkStates, listKey, chunkSize = 512) {
    if (!chunkStates || !listKey) return;
    const cs = Math.max(1, Number(chunkSize) || 512);
    let pending = null;
    for (const st of chunkStates.values()) {
      const list = st[listKey];
      if (!Array.isArray(list) || list.length === 0) continue;
      for (let i = list.length - 1; i >= 0; i--) {
        const ent = list[i];
        const ncx = Math.floor(ent.x / cs);
        const ncy = Math.floor(ent.y / cs);
        if (ncx === st.cx && ncy === st.cy) continue;
        const target = chunkStates.get(ncx + "," + ncy);
        if (!target || !Array.isArray(target[listKey])) continue;
        list.splice(i, 1);
        if (!pending) pending = [];
        pending.push({ target, ent });
      }
    }
    if (pending) {
      for (let i = 0; i < pending.length; i++) {
        pending[i].target[listKey].push(pending[i].ent);
      }
    }
  }

  A.utils = {
    lerp,
    clamp,
    smoothstep,
    lerpAngle,
    mixRGB,
    shadeRGB,
    rgbStr,
    hexToRgb,
    canPlaceSpot,
    registerSpot,
    getViewBounds,
    isChunkVisible,
    isPointVisible,
    migrateChunkEntities,
  };

  RT.createActorLoader = function createActorLoader(deps = {}) {
    const getAssetBase = deps.getAssetBase || (() => "");
    const loadingScripts = new Map();
    const loadedScriptHashes = new Map();

    function normalizeActorScriptId(raw) {
      let s = String(raw || "").trim().replace(/\\/g, "/");
      if (!s) return "";
      s = s.replace(/^\/+/, "").replace(/^config\/actors\//i, "").replace(/\.js$/i, "").trim();
      return s;
    }

    function getActorScriptUrl(scriptId) {
      const relPath = normalizeActorScriptId(scriptId)
        .split("/")
        .filter(Boolean)
        .map((seg) => encodeURIComponent(seg))
        .join("/");
      return `${getAssetBase()}config/actors/${relPath}.js`;
    }

    function hashScript(str) {
      let h = 2166136261 >>> 0;
      const s = String(str || "");
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h.toString(16);
    }

    function getActorModule(actorIdOrScript) {
      const key = normalizeActorScriptId(actorIdOrScript);
      if (!key) return null;
      const registry = window.AssemblageActors || {};
      if (registry[key] && key !== "utils") return registry[key];
      const base = key.includes("/") ? key.split("/").pop() : key;
      if (base && registry[base] && base !== "utils") return registry[base];
      return null;
    }

    async function ensureActorScriptLoaded(rawScript, forceReload = false) {
      const scriptId = normalizeActorScriptId(rawScript);
      if (!scriptId) return null;
      const existing = getActorModule(scriptId);
      if (!forceReload && existing) return existing;
      if (!forceReload && loadingScripts.has(scriptId)) {
        return loadingScripts.get(scriptId);
      }

      const loadPromise = (async () => {
        const url = getActorScriptUrl(scriptId);
        const isHttp = (window.location.protocol === "http:" || window.location.protocol === "https:");
        const fetchUrl = isHttp ? `${url}?_ts=${Date.now()}` : url;
        try {
          const resp = await fetch(fetchUrl, { cache: "no-store" });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const code = await resp.text();
          if (!code.trim()) return getActorModule(scriptId);
          const runner = new Function(code + `\n//# sourceURL=${url}`);
          runner();
          loadedScriptHashes.set(scriptId, hashScript(code));
          return getActorModule(scriptId);
        } catch (err) {
          console.warn(`Impossible de charger le script d'acteur ${scriptId} (${url}):`, err);
          return getActorModule(scriptId);
        } finally {
          loadingScripts.delete(scriptId);
        }
      })();

      loadingScripts.set(scriptId, loadPromise);
      return loadPromise;
    }

    async function ensureActorsLoadedForList(actorsList, forceReload = false) {
      if (!Array.isArray(actorsList) || actorsList.length === 0) return [];
      const uniqueScripts = new Set();
      for (const a of actorsList) {
        if (!a || a._enabled === false) continue;
        const sc = normalizeActorScriptId(a.script || "");
        if (sc) uniqueScripts.add(sc);
      }
      if (uniqueScripts.size === 0) return [];
      return Promise.all(Array.from(uniqueScripts).map((sc) => ensureActorScriptLoaded(sc, forceReload)));
    }

    async function reloadModifiedActorScripts() {
      if (loadedScriptHashes.size === 0) return false;
      const isHttp = (window.location.protocol === "http:" || window.location.protocol === "https:");
      if (!isHttp) return false;
      let anyChanged = false;
      const entries = Array.from(loadedScriptHashes.entries());
      await Promise.all(entries.map(async ([scriptId, prevHash]) => {
        const url = getActorScriptUrl(scriptId);
        try {
          const resp = await fetch(`${url}?_ts=${Date.now()}`, { cache: "no-store" });
          if (!resp.ok) return;
          const code = await resp.text();
          if (!code.trim()) return;
          const nextHash = hashScript(code);
          if (nextHash !== prevHash) {
            const runner = new Function(code + `\n//# sourceURL=${url}`);
            runner();
            loadedScriptHashes.set(scriptId, nextHash);
            anyChanged = true;
          }
        } catch (_e) {}
      }));
      return anyChanged;
    }

    return {
      normalizeActorScriptId,
      getActorScriptUrl,
      getActorModule,
      ensureActorScriptLoaded,
      ensureActorsLoadedForList,
      reloadModifiedActorScripts,
      loadedScriptHashes,
    };
  };
})();
