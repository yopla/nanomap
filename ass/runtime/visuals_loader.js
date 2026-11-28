// Moteur vectoriel Canvas 2D, packs visuels lazy-load, spritesheets & fetch helpers.
(function () {
  const RT = (window.AssemblageRuntime = window.AssemblageRuntime || {});

  RT.createVisualsLoader = function createVisualsLoader(deps) {
    const getAssetBase = deps.getAssetBase;
    const getManifest = deps.getManifest;
    const setManifest = deps.setManifest;
    const getVisualsLibrary = deps.getVisualsLibrary;
    const getAnimationsLibrary = deps.getAnimationsLibrary;

  const AssemblageVisuals = (() => {
    const spriteCache = new Map();
    const sheetCache = new Map();
    const spriteSheetCache = new Map();
    const spriteSheetLoading = new Map();
    const tintedSheetCache = new Map();
    const loadedPacks = new Map();
    const loadedPackHashes = new Map();
    const loadingPacks = new Map();
    const failedPacks = new Map();
    const failedSpriteSheets = new Map();
    const FAIL_RETRY_MS = 15000;
    const visualToPack = new Map();
    const symbolToPack = new Map();
    const MAX_SPRITE_PX = 512;

    const hashPackText = (str) => {
      const s = String(str || "");
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return `${s.length}:${(h >>> 0).toString(36)}`;
    };

    const rebuildManifestIndex = () => {
      visualToPack.clear();
      symbolToPack.clear();
      const packs = getManifest() && Array.isArray(getManifest().packs) ? getManifest().packs : [];
      for (const p of packs) {
        if (!p || !p.id) continue;
        if (Array.isArray(p.visualIds)) for (const vid of p.visualIds) visualToPack.set(vid, p.id);
        if (Array.isArray(p.symbolIds)) for (const sid of p.symbolIds) symbolToPack.set(sid, p.id);
      }
    };
    rebuildManifestIndex();

    const loadPack = async (packId, forceReload = false) => {
      if (!packId) return null;
      if (!forceReload && loadedPacks.has(packId)) return loadedPacks.get(packId);
      if (!forceReload && loadingPacks.has(packId)) return loadingPacks.get(packId);
      if (!forceReload && failedPacks.has(packId) && (Date.now() - failedPacks.get(packId)) < FAIL_RETRY_MS) return null;
      const packs = getManifest() && Array.isArray(getManifest().packs) ? getManifest().packs : [];
      const meta = packs.find((p) => p && p.id === packId);
      const relFile = meta && meta.file ? meta.file : `packs/${packId}.json`;
      const url = `${getAssetBase()}config/visuals/${relFile}`;
      const prom = (async () => {
        try {
          const sep = url.includes("?") ? "&" : "?";
          const r = await fetch(`${url}${sep}_ts=${Date.now()}`, { cache: "no-store" });
          if (!r.ok) { failedPacks.set(packId, Date.now()); return null; }
          const rawText = await r.text();
          const nextHash = hashPackText(rawText);
          if (forceReload && loadedPackHashes.get(packId) === nextHash && loadedPacks.has(packId)) {
            failedPacks.delete(packId);
            return { unchanged: true };
          }
          let data = null;
          try { data = JSON.parse(rawText); } catch (_je) { failedPacks.set(packId, Date.now()); return null; }
          if (!data || typeof data !== "object") { failedPacks.set(packId, Date.now()); return null; }
          failedPacks.delete(packId);
          const prevInfo = loadedPacks.get(packId);
          const pv = data.visuals && typeof data.visuals === "object" ? data.visuals : {};
          const ps = data.symbols && typeof data.symbols === "object" ? data.symbols : {};
          if (prevInfo) {
            for (const oldVid of prevInfo.visuals) {
              if (!Object.prototype.hasOwnProperty.call(pv, oldVid)) delete getVisualsLibrary().visuals[oldVid];
            }
            for (const oldSid of prevInfo.symbols) {
              if (!Object.prototype.hasOwnProperty.call(ps, oldSid)) delete getAnimationsLibrary().symbols[oldSid];
            }
          }
          for (const k of Object.keys(pv)) {
            getVisualsLibrary().visuals[k] = pv[k];
            visualToPack.set(k, packId);
          }
          for (const k of Object.keys(ps)) {
            getAnimationsLibrary().symbols[k] = ps[k];
            symbolToPack.set(k, packId);
          }
          loadedPacks.set(packId, { visuals: Object.keys(pv), symbols: Object.keys(ps) });
          loadedPackHashes.set(packId, nextHash);
          spriteCache.clear();
          sheetCache.clear();
          return data;
        } catch (_e) {
          failedPacks.set(packId, Date.now());
          return null;
        } finally {
          loadingPacks.delete(packId);
        }
      })();
      loadingPacks.set(packId, prom);
      return prom;
    };

    const unloadPack = (packId) => {
      const info = loadedPacks.get(packId);
      if (!info) return;
      for (const vid of info.visuals) delete getVisualsLibrary().visuals[vid];
      for (const sid of info.symbols) delete getAnimationsLibrary().symbols[sid];
      loadedPacks.delete(packId);
      spriteCache.clear();
      sheetCache.clear();
    };

    const preloadCore = async () => {
      const packs = getManifest() && Array.isArray(getManifest().packs) ? getManifest().packs : [];
      const tasks = packs.filter((p) => p && p.preload).map((p) => loadPack(p.id, false));
      await Promise.all(tasks);
    };

    const loadAllUnloadedPacks = async () => {
      const packs = getManifest() && Array.isArray(getManifest().packs) ? getManifest().packs : [];
      const tasks = packs.filter((p) => p && p.id && !loadedPacks.has(p.id)).map((p) => loadPack(p.id, false));
      if (tasks.length) await Promise.all(tasks);
    };

    const easeT = (t, mode) => {
      if (mode === "hold") return 0;
      if (mode === "easeInOut") return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) * 0.5;
      if (mode === "easeOut") return 1 - (1 - t) * (1 - t);
      return t;
    };

    const sampleLayer = (layer, frame) => {
      const keys = Array.isArray(layer.keys) ? layer.keys : [];
      if (!keys.length) {
        return {
          x: Number(layer.x || 0), y: Number(layer.y || 0),
          rot: Number(layer.rot || 0),
          sx: layer.sx !== undefined ? Number(layer.sx) : 1,
          sy: layer.sy !== undefined ? Number(layer.sy) : 1,
          alpha: layer.alpha !== undefined ? Number(layer.alpha) : 1,
          pins: {},
        };
      }
      if (keys.length === 1) {
        const k0 = keys[0];
        return {
          x: Number(k0.x || 0), y: Number(k0.y || 0), rot: Number(k0.rot || 0),
          sx: k0.sx !== undefined ? Number(k0.sx) : 1,
          sy: k0.sy !== undefined ? Number(k0.sy) : 1,
          alpha: k0.alpha !== undefined ? Number(k0.alpha) : 1,
          pins: k0.pins && typeof k0.pins === "object" ? k0.pins : {},
        };
      }
      let prev = keys[0], next = keys[keys.length - 1];
      if (frame <= Number(prev.f || 0)) next = prev;
      else if (frame >= Number(next.f || 0)) prev = next;
      else {
        for (let i = 0; i < keys.length - 1; i++) {
          const ka = keys[i], kb = keys[i + 1];
          if (frame >= Number(ka.f || 0) && frame <= Number(kb.f || 0)) { prev = ka; next = kb; break; }
        }
      }
      const fa = Number(prev.f || 0), fb = Number(next.f || 0);
      const span = fb - fa;
      const rawT = span > 0.0001 ? Math.max(0, Math.min(1, (frame - fa) / span)) : 0;
      const t = easeT(rawT, prev.ease || "linear");
      const pinsOut = {};
      const pa = prev.pins && typeof prev.pins === "object" ? prev.pins : {};
      const pb = next.pins && typeof next.pins === "object" ? next.pins : {};
      const restPins = Array.isArray(layer.pins) ? layer.pins : [];
      for (const rp of restPins) {
        if (!rp || !rp.id) continue;
        const va = Array.isArray(pa[rp.id]) ? pa[rp.id] : [0, 0];
        const vb = Array.isArray(pb[rp.id]) ? pb[rp.id] : [0, 0];
        pinsOut[rp.id] = [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t];
      }
      const lerp = (a, b) => a + (b - a) * t;
      return {
        x: lerp(Number(prev.x || 0), Number(next.x || 0)),
        y: lerp(Number(prev.y || 0), Number(next.y || 0)),
        rot: lerp(Number(prev.rot || 0), Number(next.rot || 0)),
        sx: lerp(prev.sx !== undefined ? Number(prev.sx) : 1, next.sx !== undefined ? Number(next.sx) : 1),
        sy: lerp(prev.sy !== undefined ? Number(prev.sy) : 1, next.sy !== undefined ? Number(next.sy) : 1),
        alpha: lerp(prev.alpha !== undefined ? Number(prev.alpha) : 1, next.alpha !== undefined ? Number(next.alpha) : 1),
        pins: pinsOut,
      };
    };

    const roundedRectPts = (w, h, r) => {
      const hw = w * 0.5, hh = h * 0.5;
      const cr = Math.min(r, Math.min(hw, hh));
      if (cr <= 0.5) return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
      const pts = [];
      const segs = 6;
      const corners = [
        [hw - cr, -hh + cr, -Math.PI * 0.5, 0],
        [hw - cr, hh - cr, 0, Math.PI * 0.5],
        [-hw + cr, hh - cr, Math.PI * 0.5, Math.PI],
        [-hw + cr, -hh + cr, Math.PI, Math.PI * 1.5],
      ];
      for (const [cx, cy, a0, a1] of corners) {
        for (let i = 0; i <= segs; i++) {
          const a = a0 + (a1 - a0) * (i / segs);
          pts.push([cx + Math.cos(a) * cr, cy + Math.sin(a) * cr]);
        }
      }
      return pts;
    };

    const ellipsePts = (rx, ry, segs = 28) => {
      const pts = [];
      for (let i = 0; i < segs; i++) {
        const a = (Math.PI * 2 * i) / segs;
        pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
      }
      return pts;
    };

    const bezierPts = (nodes, closed, segs = 12) => {
      const pts = [];
      const n = Array.isArray(nodes) ? nodes.length : 0;
      if (n < 2) return pts;
      const count = closed ? n : n - 1;
      for (let i = 0; i < count; i++) {
        const a = nodes[i], b = nodes[(i + 1) % n];
        const p0x = Number(a.x || 0), p0y = Number(a.y || 0);
        const p1x = p0x + Number(a.outX || 0), p1y = p0y + Number(a.outY || 0);
        const p3x = Number(b.x || 0), p3y = Number(b.y || 0);
        const p2x = p3x + Number(b.inX || 0), p2y = p3y + Number(b.inY || 0);
        for (let s = 0; s < segs; s++) {
          const t = s / segs, u = 1 - t;
          const u2 = u * u, t2 = t * t;
          pts.push([
            u2 * u * p0x + 3 * u2 * t * p1x + 3 * u * t2 * p2x + t2 * t * p3x,
            u2 * u * p0y + 3 * u2 * t * p1y + 3 * u * t2 * p2y + t2 * t * p3y,
          ]);
        }
      }
      if (!closed) {
        const last = nodes[n - 1];
        pts.push([Number(last.x || 0), Number(last.y || 0)]);
      }
      return pts;
    };

    const subdividePts = (pts, closed, maxLen = 10) => {
      const out = [];
      const n = pts.length;
      const count = closed ? n : n - 1;
      for (let i = 0; i < count; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const steps = Math.max(1, Math.ceil(dist / maxLen));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
      if (!closed && n > 0) out.push(pts[n - 1]);
      return out;
    };

    const applyPuppetPins = (pts, restPins, pinOffsets, softness = 36) => {
      const soft2 = Math.max(64, softness * softness);
      const pr = [], pd = [];
      for (const rp of restPins) {
        if (!rp) continue;
        pr.push([Number(rp.rx || 0), Number(rp.ry || 0)]);
        if (pinOffsets && rp.id && Array.isArray(pinOffsets[rp.id])) {
          pd.push([Number(pinOffsets[rp.id][0] || 0), Number(pinOffsets[rp.id][1] || 0)]);
        } else {
          pd.push([Number(rp.dx || 0), Number(rp.dy || 0)]);
        }
      }
      if (!pr.length) return pts;
      return pts.map(([vx, vy]) => {
        let sumW = 0, dx = 0, dy = 0;
        for (let j = 0; j < pr.length; j++) {
          const ddx = vx - pr[j][0], ddy = vy - pr[j][1];
          const w = 1 / (ddx * ddx + ddy * ddy + soft2);
          sumW += w;
          dx += pd[j][0] * w;
          dy += pd[j][1] * w;
        }
        return sumW > 1e-6 ? [vx + dx / sumW, vy + dy / sumW] : [vx, vy];
      });
    };

    const getLayerPoints = (layer, pinOffsets) => {
      const ltype = layer.type || "rect";
      let closed = true;
      let pts = [];
      if (ltype === "rect") pts = roundedRectPts(Number(layer.w || 40), Number(layer.h || 40), Number(layer.rx || 0));
      else if (ltype === "ellipse") pts = ellipsePts(Number(layer.rx || 20), Number(layer.ry || 20));
      else if (ltype === "polygon") {
        closed = layer.closed !== false;
        pts = Array.isArray(layer.pts) ? layer.pts.map((p) => [Number(p[0] || 0), Number(p[1] || 0)]) : [];
      } else if (ltype === "bezier") {
        closed = layer.closed !== false;
        pts = bezierPts(layer.nodes || [], closed);
      }
      const restPins = Array.isArray(layer.pins) ? layer.pins : [];
      if (pts.length >= 2 && restPins.length > 0) {
        pts = subdividePts(pts, closed, 10);
        pts = applyPuppetPins(pts, restPins, pinOffsets, Number(layer.pinSoftness || 36));
      }
      return { pts, closed };
    };

    const drawShape = (c, layer, tint, pinOffsets) => {
      const { pts, closed } = getLayerPoints(layer, pinOffsets);
      if (pts.length < 2) return;
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      if (closed && pts.length >= 3) c.closePath();
      const fillStr = layer.fill || "";
      if (closed && pts.length >= 3 && fillStr) {
        c.fillStyle = fillStr === "$tint" ? tint : fillStr;
        c.fill();
      }
      const strokeStr = layer.stroke || "";
      const strokeW = Number(layer.strokeW || 0);
      if (strokeStr && strokeW > 0.1) {
        c.strokeStyle = strokeStr === "$tint" ? tint : strokeStr;
        c.lineWidth = strokeW;
        c.lineJoin = "round";
        c.lineCap = "round";
        c.stroke();
      }
    };

    const drawVisualDirect = (c, visualId, tint = "#6be5b8", depth = 0) => {
      if (depth > 6) return;
      const visuals = getVisualsLibrary() && getVisualsLibrary().visuals ? getVisualsLibrary().visuals : {};
      const vis = visuals[visualId];
      if (!vis || !Array.isArray(vis.layers)) return;
      for (const layer of vis.layers) {
        if (!layer || layer.visible === false) continue;
        const alpha = layer.alpha !== undefined ? Number(layer.alpha) : 1;
        if (alpha <= 0.005) continue;
        c.save();
        c.globalAlpha *= alpha;
        c.translate(Number(layer.x || 0), Number(layer.y || 0));
        if (layer.rot) c.rotate((Number(layer.rot) * Math.PI) / 180);
        const sx = layer.sx !== undefined ? Number(layer.sx) : 1;
        const sy = layer.sy !== undefined ? Number(layer.sy) : 1;
        if (sx !== 1 || sy !== 1) c.scale(sx, sy);
        if (layer.type === "instance" && layer.visualId && layer.visualId !== visualId) {
          drawVisualDirect(c, layer.visualId, tint, depth + 1);
        } else {
          drawShape(c, layer, tint, null);
        }
        c.restore();
      }
    };

    const drawSymbolDirect = (c, symbolId, timeSec, tint = "#6be5b8", frameOverride = -1, depth = 0) => {
      if (depth > 6) return;
      const syms = getAnimationsLibrary() && getAnimationsLibrary().symbols ? getAnimationsLibrary().symbols : {};
      const sym = syms[symbolId];
      if (!sym || !Array.isArray(sym.layers)) return;
      const fps = Math.max(1, Number(sym.fps || 60));
      const dur = Math.max(1, Number(sym.duration || 60));
      const curFrame = frameOverride >= 0 ? frameOverride : (((timeSec * fps) % dur) + dur) % dur;
      for (const layer of sym.layers) {
        if (!layer || layer.visible === false) continue;
        const tr = sampleLayer(layer, curFrame);
        if (tr.alpha <= 0.005) continue;
        c.save();
        c.globalAlpha *= tr.alpha;
        c.translate(tr.x, tr.y);
        if (tr.rot) c.rotate((tr.rot * Math.PI) / 180);
        if (tr.sx !== 1 || tr.sy !== 1) c.scale(tr.sx, tr.sy);
        if (layer.type === "instance" && layer.symbolId && layer.symbolId !== symbolId) {
          const cSym = syms[layer.symbolId];
          let cf = -1;
          if (cSym) {
            const cDur = Math.max(1, Number(cSym.duration || 60));
            const cFps = Math.max(1, Number(cSym.fps || 60));
            const f0 = Number(layer.firstFrame || 0);
            const mode = layer.mode || "clip";
            if (mode === "graphic_single") cf = ((f0 % cDur) + cDur) % cDur;
            else if (mode === "graphic_loop") cf = (((curFrame + f0) % cDur) + cDur) % cDur;
            else cf = (((timeSec * cFps + f0) % cDur) + cDur) % cDur;
          }
          drawSymbolDirect(c, layer.symbolId, timeSec, tint, cf, depth + 1);
        } else {
          drawShape(c, layer, tint, tr.pins);
        }
        c.restore();
      }
    };

    const getCachedSprite = (visualId, tint, dprVal) => {
      const key = `${visualId}|${tint}|${dprVal}`;
      if (spriteCache.has(key)) return spriteCache.get(key);
      const half = 110;
      const px = Math.min(MAX_SPRITE_PX, Math.ceil(half * 2 * dprVal));
      const off = document.createElement("canvas");
      off.width = px;
      off.height = px;
      const oc = off.getContext("2d");
      oc.scale(px / (half * 2), px / (half * 2));
      oc.translate(half, half);
      drawVisualDirect(oc, visualId, tint, 0);
      const entry = { canvas: off, half };
      spriteCache.set(key, entry);
      return entry;
    };

    const getBakedSheet = (symbolId, tint, bakeFrames, dprVal) => {
      const count = Math.max(2, Math.min(32, Math.round(bakeFrames)));
      const key = `${symbolId}|${tint}|${count}|${dprVal}`;
      if (sheetCache.has(key)) return sheetCache.get(key);
      const syms = getAnimationsLibrary() && getAnimationsLibrary().symbols ? getAnimationsLibrary().symbols : {};
      const sym = syms[symbolId];
      if (!sym) return null;
      const dur = Math.max(1, Number(sym.duration || 60));
      const fps = Math.max(1, Number(sym.fps || 60));
      const half = 110;
      const framePx = Math.min(256, Math.ceil(half * 2 * dprVal));
      const off = document.createElement("canvas");
      off.width = framePx * count;
      off.height = framePx;
      const oc = off.getContext("2d");
      for (let i = 0; i < count; i++) {
        const f = (i / count) * dur;
        oc.save();
        oc.beginPath();
        oc.rect(i * framePx, 0, framePx, framePx);
        oc.clip();
        oc.translate(i * framePx + framePx * 0.5, framePx * 0.5);
        const s = framePx / (half * 2);
        oc.scale(s, s);
        drawSymbolDirect(oc, symbolId, f / fps, tint, f, 0);
        oc.restore();
      }
      const entry = { canvas: off, framePx, count, half, dur, fps };
      sheetCache.set(key, entry);
      return entry;
    };

    const loadImageAsync = (url) => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });

    const loadSpriteSheet = async (sheetId, forceReload = false) => {
      if (!sheetId) return null;
      if (!forceReload && spriteSheetCache.has(sheetId)) return spriteSheetCache.get(sheetId);
      if (!forceReload && spriteSheetLoading.has(sheetId)) return spriteSheetLoading.get(sheetId);
      if (!forceReload && failedSpriteSheets.has(sheetId) && (Date.now() - failedSpriteSheets.get(sheetId)) < FAIL_RETRY_MS) return null;
      const baseUrl = `${getAssetBase()}config/visuals/sprites/`;
      const jsonUrl = `${baseUrl}${sheetId}.json`;
      const prom = (async () => {
        try {
          const sep = jsonUrl.includes("?") ? "&" : "?";
          const r = await fetch(`${jsonUrl}${sep}_ts=${Date.now()}`, { cache: "no-store" });
          if (!r.ok) { failedSpriteSheets.set(sheetId, Date.now()); return null; }
          const meta = await r.json();
          if (!meta || !Array.isArray(meta.frames)) { failedSpriteSheets.set(sheetId, Date.now()); return null; }
          const imgFile = meta.image || `${sheetId}.png`;
          const imgUrl = `${baseUrl}${imgFile}?_ts=${Date.now()}`;
          const img = await loadImageAsync(imgUrl);
          if (!img) { failedSpriteSheets.set(sheetId, Date.now()); return null; }
          failedSpriteSheets.delete(sheetId);
          let tintImg = null;
          if (meta.tintImage) {
            tintImg = await loadImageAsync(`${baseUrl}${meta.tintImage}?_ts=${Date.now()}`);
          }
          const framesById = new Map();
          const frameIndexById = new Map();
          meta.frames.forEach((fr, idx) => {
            if (fr && fr.id) {
              const fid = String(fr.id).trim();
              if (fid) {
                framesById.set(fid, fr);
                frameIndexById.set(fid, idx);
              }
            }
          });
          const entry = { id: sheetId, meta, img, imgUrl, tintImg, framesById, frameIndexById };
          spriteSheetCache.set(sheetId, entry);
          for (const k of Array.from(tintedSheetCache.keys())) {
            if (k.startsWith(`${sheetId}|`)) tintedSheetCache.delete(k);
          }
          return entry;
        } catch (_e) {
          failedSpriteSheets.set(sheetId, Date.now());
          return null;
        } finally {
          spriteSheetLoading.delete(sheetId);
        }
      })();
      spriteSheetLoading.set(sheetId, prom);
      return prom;
    };

    const getTintedSpriteCanvas = (entry, tint, strength) => {
      if (!entry || !entry.img) return null;
      const effStr = Math.max(0, Math.min(1, Number(strength !== undefined ? strength : (entry.meta.tintStrength ?? 0.85))));
      if (!tint || effStr <= 0.01 || !entry.tintImg) return entry.img;
      const key = `${entry.id}|${tint}|${effStr.toFixed(2)}`;
      if (tintedSheetCache.has(key)) return tintedSheetCache.get(key);
      const w = entry.img.naturalWidth || entry.img.width;
      const h = entry.img.naturalHeight || entry.img.height;
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = w;
      maskCanvas.height = h;
      const mc = maskCanvas.getContext("2d");
      mc.drawImage(entry.tintImg, 0, 0, w, h);
      mc.globalCompositeOperation = "source-in";
      mc.fillStyle = tint;
      mc.fillRect(0, 0, w, h);

      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const oc = out.getContext("2d");
      oc.drawImage(entry.img, 0, 0, w, h);
      oc.save();
      oc.globalAlpha = effStr;
      oc.drawImage(maskCanvas, 0, 0, w, h);
      oc.restore();
      tintedSheetCache.set(key, out);
      return out;
    };

    return {
      hasVisual: (id) => Boolean((getVisualsLibrary().visuals && getVisualsLibrary().visuals[id]) || visualToPack.has(id)),
      hasAnimation: (id) => Boolean((getAnimationsLibrary().symbols && getAnimationsLibrary().symbols[id]) || symbolToPack.has(id)),
      listVisuals: () => Object.keys((getVisualsLibrary() && getVisualsLibrary().visuals) || {}),
      listAnimations: () => Object.keys((getAnimationsLibrary() && getAnimationsLibrary().symbols) || {}),
      listPacks: () => (getManifest() && Array.isArray(getManifest().packs) ? getManifest().packs.map((p) => p.id) : []),
      loadPack,
      unloadPack,
      preloadCore,
      reloadLoadedPacks: async () => {
        const ids = Array.from(loadedPacks.keys());
        if (!ids.length) return false;
        let changed = false;
        await Promise.all(ids.map(async (pid) => {
          const res = await loadPack(pid, true);
          if (res && !res.unchanged) changed = true;
        }));
        return changed;
      },
      ensureVisual: (id) => {
        if (getVisualsLibrary().visuals && getVisualsLibrary().visuals[id]) return Promise.resolve(true);
        const pid = visualToPack.get(id);
        if (pid) return loadPack(pid, false).then((d) => Boolean(d));
        return loadAllUnloadedPacks().then(() => Boolean(getVisualsLibrary().visuals && getVisualsLibrary().visuals[id]));
      },
      ensureAnimation: (id) => {
        if (getAnimationsLibrary().symbols && getAnimationsLibrary().symbols[id]) return Promise.resolve(true);
        const pid = symbolToPack.get(id);
        if (pid) return loadPack(pid, false).then((d) => Boolean(d));
        return loadAllUnloadedPacks().then(() => Boolean(getAnimationsLibrary().symbols && getAnimationsLibrary().symbols[id]));
      },
      setManifest: (m) => {
        if (m && Array.isArray(m.packs)) {
          setManifest(m);
          rebuildManifestIndex();
        }
      },
      clearCache: () => { spriteCache.clear(); sheetCache.clear(); tintedSheetCache.clear(); },
      ensureSpriteSheet: (sheetId) => loadSpriteSheet(sheetId, false).then((e) => Boolean(e)),
      reloadSpriteSheet: (sheetId) => loadSpriteSheet(sheetId, true),
      getSpriteSheet: (sheetId) => spriteSheetCache.get(sheetId) || null,
      drawSpriteSheet: (c, sheetId, x, y, opts = {}) => {
        const entry = spriteSheetCache.get(sheetId);
        if (!entry || !entry.meta || !Array.isArray(entry.meta.frames) || !entry.meta.frames.length) {
          loadSpriteSheet(sheetId, false);
          return false;
        }
        const frames = entry.meta.frames;
        let frameIdx = 0;
        if (opts.frameId !== undefined && opts.frameId !== null && entry.frameIndexById && entry.frameIndexById.has(String(opts.frameId))) {
          frameIdx = entry.frameIndexById.get(String(opts.frameId));
        } else if (opts.frame !== undefined && opts.frame !== null) {
          frameIdx = Math.max(0, Math.min(frames.length - 1, Math.round(Number(opts.frame) || 0)));
        } else {
          const clipName = opts.clip || "";
          const clip = clipName && entry.meta.clips ? entry.meta.clips[clipName] : null;
          const seq = clip && Array.isArray(clip.frames) && clip.frames.length ? clip.frames : frames.map((_, i) => i);
          if (opts.progress !== undefined && opts.progress !== null) {
            const p = Math.max(0, Math.min(1, Number(opts.progress) || 0));
            const pos = Math.min(seq.length - 1, Math.floor(p * seq.length));
            frameIdx = Math.max(0, Math.min(frames.length - 1, Number(seq[pos]) || 0));
          } else {
            const fps = Math.max(1, Number((clip && clip.fps) || opts.fps || 10));
            const loop = clip ? clip.loop !== false : true;
            const rawStep = Math.floor(Math.max(0, Number(opts.timeSec || 0)) * fps);
            const pos = loop ? (rawStep % seq.length) : Math.min(seq.length - 1, rawStep);
            frameIdx = Math.max(0, Math.min(frames.length - 1, Number(seq[pos]) || 0));
          }
        }
        const fr = frames[frameIdx];
        if (!fr) return false;
        const fx = Number(fr.x || 0);
        const fy = Number(fr.y || 0);
        const fw = Math.max(1, Number(fr.w || 1));
        const fh = Math.max(1, Number(fr.h || 1));
        const pivX = fr.pivotX !== undefined ? Number(fr.pivotX) : fw * 0.5;
        const pivY = fr.pivotY !== undefined ? Number(fr.pivotY) : fh;
        const scale = opts.scale !== undefined ? Number(opts.scale) : 1;
        const rot = Number(opts.rot || 0);
        const alpha = opts.alpha !== undefined ? Number(opts.alpha) : 1;
        const flipX = Boolean(opts.flipX);
        const srcImg = getTintedSpriteCanvas(entry, opts.tint || "", opts.tintStrength);
        if (!srcImg) return false;

        c.save();
        c.globalAlpha *= alpha;
        if (opts.pixelated) c.imageSmoothingEnabled = false;
        c.translate(x, y);
        if (rot) c.rotate(rot);
        if (scale !== 1 || flipX) c.scale(flipX ? -scale : scale, scale);
        c.drawImage(srcImg, fx, fy, fw, fh, -pivX, -pivY, fw, fh);
        c.restore();
        return true;
      },
      drawVisual: (c, visualId, x, y, opts = {}) => {
        if (!getVisualsLibrary() || !getVisualsLibrary().visuals || !getVisualsLibrary().visuals[visualId]) {
          const pid = visualToPack.get(visualId);
          if (pid) loadPack(pid, false);
          else loadAllUnloadedPacks();
          return false;
        }
        const tint = opts.tint || "#6be5b8";
        const scale = opts.scale !== undefined ? Number(opts.scale) : 1;
        const rot = Number(opts.rot || 0);
        const alpha = opts.alpha !== undefined ? Number(opts.alpha) : 1;
        c.save();
        c.globalAlpha *= alpha;
        c.translate(x, y);
        if (rot) c.rotate(rot);
        if (scale !== 1) c.scale(scale, scale);
        if (opts.direct) {
          drawVisualDirect(c, visualId, tint, 0);
        } else {
          const entry = getCachedSprite(visualId, tint, Math.min(window.devicePixelRatio || 1, 2));
          c.drawImage(entry.canvas, -entry.half, -entry.half, entry.half * 2, entry.half * 2);
        }
        c.restore();
        return true;
      },
      drawAnimation: (c, symbolId, x, y, timeSec = 0, opts = {}) => {
        if (!getAnimationsLibrary() || !getAnimationsLibrary().symbols || !getAnimationsLibrary().symbols[symbolId]) {
          const pid = symbolToPack.get(symbolId);
          if (pid) loadPack(pid, false);
          else loadAllUnloadedPacks();
          return false;
        }
        const tint = opts.tint || "#6be5b8";
        const scale = opts.scale !== undefined ? Number(opts.scale) : 1;
        const rot = Number(opts.rot || 0);
        const alpha = opts.alpha !== undefined ? Number(opts.alpha) : 1;
        c.save();
        c.globalAlpha *= alpha;
        c.translate(x, y);
        if (rot) c.rotate(rot);
        if (scale !== 1) c.scale(scale, scale);
        if (opts.bakeFrames && Number(opts.bakeFrames) >= 2) {
          const sheet = getBakedSheet(symbolId, tint, Number(opts.bakeFrames), Math.min(window.devicePixelRatio || 1, 2));
          if (sheet) {
            const f = (((timeSec * sheet.fps) % sheet.dur) + sheet.dur) % sheet.dur;
            const idx = Math.floor((f / sheet.dur) * sheet.count) % sheet.count;
            c.drawImage(sheet.canvas, idx * sheet.framePx, 0, sheet.framePx, sheet.framePx, -sheet.half, -sheet.half, sheet.half * 2, sheet.half * 2);
          }
        } else {
          drawSymbolDirect(c, symbolId, timeSec, tint, opts.frame !== undefined ? Number(opts.frame) : -1, 0);
        }
        c.restore();
        return true;
      },
    };
  })();
  window.AssemblageVisuals = AssemblageVisuals;

  const fetchJsonNoCache = async (url) => {
    try {
      const sep = url.includes("?") ? "&" : "?";
      const r = await fetch(`${url}${sep}_ts=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch (_e) { return null; }
  };

  const extractEmbeddedJsonFromHtml = (htmlText, tagName) => {
    const startMarker = "/*" + tagName + "*/";
    const endMarker = "/*" + tagName + "_END*/";
    const startIdx = htmlText.indexOf(startMarker);
    if (startIdx < 0) return null;
    const jsonStart = startIdx + startMarker.length;
    const endIdx = htmlText.indexOf(endMarker, jsonStart);
    if (endIdx < 0) return null;
    try {
      return JSON.parse(htmlText.slice(jsonStart, endIdx));
    } catch (_e) {
      return null;
    }
  };

  const fetchEmbeddedDataFromHtml = async () => {
    try {
      const path = window.location.pathname || "index.html";
      const pageUrl = path.endsWith("/") ? `${path}index.html` : path;
      const sep = pageUrl.includes("?") ? "&" : "?";
      const r = await fetch(`${pageUrl}${sep}_ts=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) return null;
      const htmlText = await r.text();
      return {
        cfg: extractEmbeddedJsonFromHtml(htmlText, "GAME_CONFIG_JSON"),
        elems: extractEmbeddedJsonFromHtml(htmlText, "ELEMENTS_DATA_JSON"),
        exts: extractEmbeddedJsonFromHtml(htmlText, "EXTENSIONS_DATA_JSON"),
        anchors: extractEmbeddedJsonFromHtml(htmlText, "ANCHORS_DATA_JSON"),
        actors: extractEmbeddedJsonFromHtml(htmlText, "ACTORS_DATA_JSON"),
        tags: extractEmbeddedJsonFromHtml(htmlText, "TAGS_DATA_JSON"),
        visualPacks: extractEmbeddedJsonFromHtml(htmlText, "VISUAL_PACKS_MANIFEST_JSON"),
      };
    } catch (_e) {
      return null;
    }
  };
  window.AssemblageVisuals = AssemblageVisuals;

  return {
    AssemblageVisuals,
    fetchJsonNoCache,
    extractEmbeddedJsonFromHtml,
    fetchEmbeddedDataFromHtml,
  };
  };
})();
