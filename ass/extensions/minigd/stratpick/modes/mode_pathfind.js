(function () {
  "use strict";
  const SP = window.StratPick = window.StratPick || {};
  SP.modes = SP.modes || {};

  const PF_UNIT_RADIUS = 7.5;
  const PF_CELL_SIZE = 14;
  const PF_MAX_FIELDS = 16;
  const PF_DRAG_THRESH = 12;

  const pf = {
    rocks: [],
    currentRockSeed: 2026,
    nav: {
      cols: 0,
      rows: 0,
      cellW: PF_CELL_SIZE,
      cellH: PF_CELL_SIZE,
      blocked: null,
      clearance: null,
      flowCache: new Map()
    },
    hashCols: 1,
    hashRows: 1,
    hashCell: 26,
    spatialBuckets: [],
    dragging: false,
    dragStart: { x: 0, y: 0 },
    dragCur: { x: 0, y: 0 },
    lastTapTs: 0,
    lastTapUnitId: -1,
    saveGroupArmed: false,
    activeGroupBtn: 0, // 0 none, 1..3 group
    beacons: [],
    previewPath: [],
    aiSquadTimer: 0.6,
    nextUnitId: 1
  };

  // =========================================================================
  // IRREGULAR ROCK GENERATION & POLYGON GEOMETRY (zero rectangular walls)
  // =========================================================================
  function isRockCenterSafe(nx, ny, nRad, targetObj) {
    if (nx - nRad < 0.03 || nx + nRad > 0.97) return false;
    if (ny - nRad < 0.145 || ny + nRad > 0.855) return false;
    const minDist = (cx, cy, clearR) => Math.hypot(nx - cx, ny - cy) >= nRad + clearR;
    if (targetObj === "koth") {
      if (!minDist(0.5, 0.5, 0.13)) return false;
    } else if (targetObj === "domination") {
      if (!minDist(0.28, 0.28, 0.09)) return false;
      if (!minDist(0.5, 0.5, 0.09)) return false;
      if (!minDist(0.72, 0.72, 0.09)) return false;
    } else if (targetObj === "escort") {
      if (Math.abs(nx - 0.5) < nRad + 0.085) return false;
    }
    return true;
  }

  function makeIrregularRock(nx, ny, nrx, nry, rot, rng) {
    const numVerts = 10 + Math.floor(rng() * 5);
    const p1 = rng() * Math.PI * 2;
    const p2 = rng() * Math.PI * 2;
    const p3 = rng() * Math.PI * 2;
    const normPts = [];
    const innerNormPts = [];
    const cosR = Math.cos(rot), sinR = Math.sin(rot);

    for (let i = 0; i < numVerts; i++) {
      const th = (i / numVerts) * Math.PI * 2;
      const wobble = 1.0
        + 0.20 * Math.sin(th * 2 + p1)
        + 0.14 * Math.cos(th * 3 + p2)
        + 0.08 * Math.sin(th * 5 + p3)
        + (rng() - 0.5) * 0.14;
      const lx = Math.cos(th) * nrx * wobble;
      const ly = Math.sin(th) * nry * wobble;
      const rx = nx + (lx * cosR - ly * sinR);
      const ry = ny + (lx * sinR + ly * cosR);
      normPts.push({ x: SP.clamp(rx, 0.02, 0.98), y: SP.clamp(ry, 0.12, 0.88) });
      innerNormPts.push({
        x: nx + (rx - nx) * 0.58 - nrx * 0.08,
        y: ny + (ry - ny) * 0.58 - nry * 0.08
      });
    }
    const crA = Math.floor(rng() * numVerts);
    const crB = (crA + Math.floor(numVerts * 0.45)) % numVerts;
    return {
      nx,
      ny,
      nrx,
      nry,
      normPts,
      innerNormPts,
      crackIdx: [crA, crB],
      pts: [],
      innerPts: [],
      cx: 0,
      cy: 0,
      boundR: 0,
      shade: 0.85 + rng() * 0.3
    };
  }

  function buildRockNorms(styleIn, densityPct, targetObj, seedVal) {
    const rng = SP.mulberry32(seedVal);
    const dens = SP.clamp((Number(densityPct) || 50) / 100, 0.15, 1.0);
    const styles = ["canyon", "archipelago", "craters", "scattered"];
    let style = String(styleIn || "canyon").toLowerCase();
    if (style === "random" || !styles.includes(style)) {
      style = styles[Math.floor(rng() * styles.length)];
    }

    const out = [];
    const tryAdd = (nx, ny, nrx, nry, rot, gap) => {
      const mRad = Math.max(nrx, nry) * 1.15;
      if (!isRockCenterSafe(nx, ny, mRad, targetObj)) return false;
      const pad = gap ?? 0.032;
      for (const ex of out) {
        const exR = Math.max(ex.nrx, ex.nry) * 1.15;
        if (Math.hypot(nx - ex.nx, ny - ex.ny) < mRad + exR + pad) return false;
      }
      out.push(makeIrregularRock(nx, ny, nrx, nry, rot, rng));
      return true;
    };

    const tryAddMirror = (nx, ny, nrx, nry, rot, gap) => {
      const mRad = Math.max(nrx, nry) * 1.15;
      const mx = 1 - nx, my = 1 - ny;
      if (!isRockCenterSafe(nx, ny, mRad, targetObj) || !isRockCenterSafe(mx, my, mRad, targetObj)) return false;
      const pad = gap ?? 0.034;
      if (Math.hypot(nx - mx, ny - my) < mRad * 2 + pad) return false;
      for (const ex of out) {
        const exR = Math.max(ex.nrx, ex.nry) * 1.15;
        if (Math.hypot(nx - ex.nx, ny - ex.ny) < mRad + exR + pad) return false;
        if (Math.hypot(mx - ex.nx, my - ex.ny) < mRad + exR + pad) return false;
      }
      out.push(makeIrregularRock(nx, ny, nrx, nry, rot, rng));
      out.push(makeIrregularRock(mx, my, nrx, nry, rot + Math.PI, rng));
      return true;
    };

    if (style === "canyon") {
      const pairs = Math.round(4 + dens * 5);
      for (let i = 0; i < pairs * 5 && out.length < pairs * 2; i++) {
        const side = i % 2 === 0 ? 0.14 + rng() * 0.24 : 0.62 + rng() * 0.24;
        const ny = 0.20 + rng() * 0.26;
        const nrx = 0.055 + rng() * 0.055;
        const nry = 0.036 + rng() * 0.034;
        tryAddMirror(side, ny, nrx, nry, (rng() - 0.5) * 1.2, 0.035);
      }
      // A couple of mid flank boulders
      for (let m = 0; m < Math.round(1 + dens * 2); m++) {
        tryAddMirror(0.24 + rng() * 0.52, 0.34 + rng() * 0.12, 0.042 + rng() * 0.025, 0.032 + rng() * 0.02, rng() * Math.PI, 0.045);
      }
    } else if (style === "archipelago") {
      const clusters = Math.round(3 + dens * 4);
      for (let c = 0; c < clusters; c++) {
        const cx = 0.16 + rng() * 0.68;
        const cy = 0.22 + rng() * 0.24;
        const baseR = 0.048 + rng() * 0.032;
        tryAddMirror(cx, cy, baseR * 1.2, baseR * 0.85, rng() * Math.PI, 0.04);
        if (rng() < 0.7) {
          const ang = rng() * Math.PI * 2;
          tryAddMirror(cx + Math.cos(ang) * 0.08, cy + Math.sin(ang) * 0.06, 0.032 + rng() * 0.02, 0.028 + rng() * 0.015, rng() * Math.PI, 0.022);
        }
      }
    } else if (style === "craters") {
      const rimNodes = Math.round(6 + dens * 5);
      const ringRx = 0.28 + rng() * 0.07;
      const ringRy = 0.19 + rng() * 0.05;
      for (let k = 0; k < rimNodes; k++) {
        const ang = (k / rimNodes) * Math.PI * 2 + (rng() - 0.5) * 0.25;
        const rx = 0.5 + Math.cos(ang) * ringRx;
        const ry = 0.5 + Math.sin(ang) * ringRy;
        tryAdd(rx, ry, 0.044 + rng() * 0.032, 0.036 + rng() * 0.024, ang + Math.PI * 0.5, 0.042);
      }
    } else {
      const targetCount = Math.round(7 + dens * 11);
      for (let a = 0; a < targetCount * 6 && out.length < targetCount; a++) {
        const nx = 0.10 + rng() * 0.80;
        const ny = 0.19 + rng() * 0.62;
        const nrx = 0.035 + rng() * 0.052;
        const nry = 0.030 + rng() * 0.040;
        tryAdd(nx, ny, nrx, nry, rng() * Math.PI, 0.036);
      }
    }
    return out;
  }

  function rebuildRockPolygons(rockList, targetArena) {
    for (const r of rockList) {
      let sx = 0, sy = 0;
      r.pts = r.normPts.map((np) => {
        const p = { x: targetArena.x + np.x * targetArena.w, y: targetArena.y + np.y * targetArena.h };
        sx += p.x; sy += p.y;
        return p;
      });
      r.innerPts = r.innerNormPts.map((np) => ({
        x: targetArena.x + np.x * targetArena.w,
        y: targetArena.y + np.y * targetArena.h
      }));
      const len = Math.max(1, r.pts.length);
      r.cx = sx / len;
      r.cy = sy / len;
      let maxR = 0;
      for (const pt of r.pts) {
        const d = Math.hypot(pt.x - r.cx, pt.y - r.cy);
        if (d > maxR) maxR = d;
      }
      r.boundR = maxR;
    }
  }

  function pointInPoly(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function closestPointOnPolyEdges(px, py, pts) {
    let bestD2 = Infinity, bestX = px, bestY = py;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const ax = pts[j].x, ay = pts[j].y;
      const bx = pts[i].x, by = pts[i].y;
      const abx = bx - ax, aby = by - ay;
      const len2 = abx * abx + aby * aby;
      const t = len2 > 1e-6 ? SP.clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1) : 0;
      const qx = ax + abx * t;
      const qy = ay + aby * t;
      const dx = px - qx, dy = py - qy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestX = qx;
        bestY = qy;
      }
    }
    return { d2: bestD2, qx: bestX, qy: bestY };
  }

  function pushOutOfRocks(x, y, rad) {
    const pos = SP.walls.clampArena(x, y, rad);
    for (let pass = 0; pass < 2; pass++) {
      for (const r of pf.rocks) {
        const dxC = pos.x - r.cx, dyC = pos.y - r.cy;
        const maxReach = r.boundR + rad + 2;
        if (dxC * dxC + dyC * dyC > maxReach * maxReach) continue;

        const inside = pointInPoly(pos.x, pos.y, r.pts);
        const edge = closestPointOnPolyEdges(pos.x, pos.y, r.pts);
        if (inside) {
          let nx = edge.qx - pos.x, ny = edge.qy - pos.y;
          let d = Math.hypot(nx, ny);
          if (d < 1e-4) {
            nx = pos.x - r.cx; ny = pos.y - r.cy;
            d = Math.hypot(nx, ny) || 1;
          }
          pos.x = edge.qx + (nx / d) * rad;
          pos.y = edge.qy + (ny / d) * rad;
        } else if (edge.d2 < rad * rad) {
          const d = Math.sqrt(edge.d2);
          if (d > 1e-4) {
            const push = rad - d;
            pos.x += ((pos.x - edge.qx) / d) * push;
            pos.y += ((pos.y - edge.qy) / d) * push;
          } else {
            const nx = pos.x - r.cx, ny = pos.y - r.cy;
            const nd = Math.hypot(nx, ny) || 1;
            pos.x += (nx / nd) * rad;
            pos.y += (ny / nd) * rad;
          }
        }
      }
      const cl = SP.walls.clampArena(pos.x, pos.y, rad);
      pos.x = cl.x; pos.y = cl.y;
    }
    return pos;
  }

  function pointInRock(x, y, pad) {
    const p = pad || 0;
    for (const r of pf.rocks) {
      const dx = x - r.cx, dy = y - r.cy;
      const mr = r.boundR + p;
      if (dx * dx + dy * dy > mr * mr) continue;
      if (pointInPoly(x, y, r.pts)) return true;
      if (p > 0 && closestPointOnPolyEdges(x, y, r.pts).d2 <= p * p) return true;
    }
    return false;
  }

  function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const rx = bx - ax, ry = by - ay;
    const sx = dx - cx, sy = dy - cy;
    const denom = rx * sy - ry * sx;
    if (Math.abs(denom) < 1e-8) return false;
    const u = ((cx - ax) * ry - (cy - ay) * rx) / denom;
    const t = ((cx - ax) * sy - (cy - ay) * sx) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  function segmentIntersectsPoly(x1, y1, x2, y2, pts) {
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      if (segmentsIntersect(x1, y1, x2, y2, pts[j].x, pts[j].y, pts[i].x, pts[i].y)) return true;
    }
    return pointInPoly((x1 + x2) * 0.5, (y1 + y2) * 0.5, pts);
  }

  function hasRockLos(x1, y1, x2, y2) {
    if (!pf.rocks.length) return true;
    const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5;
    const halfLen = Math.hypot(x2 - x1, y2 - y1) * 0.5;
    for (const r of pf.rocks) {
      const reach = r.boundR + halfLen;
      if (SP.dist2(mx, my, r.cx, r.cy) > reach * reach) continue;
      if (segmentIntersectsPoly(x1, y1, x2, y2, r.pts)) return false;
    }
    return true;
  }

  // =========================================================================
  // OPTIMIZED FLOW-FIELD PATHFINDING + CONNECTIVITY GUARANTEE
  // =========================================================================
  function rasterizeNavGrid() {
    const ar = SP.state.arena;
    const nav = pf.nav;
    nav.cols = Math.max(12, Math.round(ar.w / PF_CELL_SIZE));
    nav.rows = Math.max(14, Math.round(ar.h / PF_CELL_SIZE));
    nav.cellW = ar.w / nav.cols;
    nav.cellH = ar.h / nav.rows;
    const total = nav.cols * nav.rows;
    nav.blocked = new Uint8Array(total);
    nav.clearance = new Uint8Array(total);
    nav.flowCache.clear();

    const inflate = PF_UNIT_RADIUS + 2.5;
    for (let gy = 0; gy < nav.rows; gy++) {
      const cy = ar.y + (gy + 0.5) * nav.cellH;
      for (let gx = 0; gx < nav.cols; gx++) {
        const cx = ar.x + (gx + 0.5) * nav.cellW;
        if (pointInRock(cx, cy, inflate)) {
          nav.blocked[gy * nav.cols + gx] = 1;
        }
      }
    }

    // Multi-source BFS clearance distance from blocked cells
    const clr = nav.clearance;
    clr.fill(255);
    const q = [];
    for (let i = 0; i < total; i++) {
      if (nav.blocked[i]) { clr[i] = 0; q.push(i); }
    }
    let h = 0;
    const cDirs = [1, -1, nav.cols, -nav.cols];
    while (h < q.length) {
      const cur = q[h++];
      const curX = cur % nav.cols;
      const curY = (cur / nav.cols) | 0;
      const nd = clr[cur] + 1;
      if (nd > 5) continue;
      if (curX + 1 < nav.cols && clr[cur + 1] > nd) { clr[cur + 1] = nd; q.push(cur + 1); }
      if (curX - 1 >= 0 && clr[cur - 1] > nd) { clr[cur - 1] = nd; q.push(cur - 1); }
      if (curY + 1 < nav.rows && clr[cur + nav.cols] > nd) { clr[cur + nav.cols] = nd; q.push(cur + nav.cols); }
      if (curY - 1 >= 0 && clr[cur - nav.cols] > nd) { clr[cur - nav.cols] = nd; q.push(cur - nav.cols); }
    }
    void cDirs;
  }

  function verifyNavConnectivity() {
    const nav = pf.nav;
    const cols = nav.cols, rows = nav.rows;
    const sx = Math.floor(cols * 0.5), sy = rows - 2;
    const tx = Math.floor(cols * 0.5), ty = 1;
    // Unblock spawn anchors locally just in case
    const startIdx = sy * cols + sx;
    const goalIdx = ty * cols + tx;
    const vis = new Uint8Array(cols * rows);
    const q = [startIdx];
    vis[startIdx] = 1;
    let h = 0;
    while (h < q.length) {
      const cur = q[h++];
      if (cur === goalIdx) return true;
      const x = cur % cols, y = (cur / cols) | 0;
      const nbrs = [];
      if (x > 0) nbrs.push(cur - 1);
      if (x + 1 < cols) nbrs.push(cur + 1);
      if (y > 0) nbrs.push(cur - cols);
      if (y + 1 < rows) nbrs.push(cur + cols);
      for (const n of nbrs) {
        if (!vis[n] && !nav.blocked[n]) {
          vis[n] = 1;
          q.push(n);
        }
      }
    }
    return false;
  }

  function rebuildNavGrid() {
    rasterizeNavGrid();
    for (let fix = 0; fix < 8 && pf.rocks.length > 0; fix++) {
      if (verifyNavConnectivity()) break;
      // Remove rock closest to horizontal center corridor to open a pass
      const ar = SP.state.arena;
      const midX = ar.x + ar.w * 0.5;
      let bestIdx = 0, bestD = Infinity;
      for (let i = 0; i < pf.rocks.length; i++) {
        const d = Math.abs(pf.rocks[i].cx - midX);
        if (d < bestD) { bestD = d; bestIdx = i; }
      }
      pf.rocks.splice(bestIdx, 1);
      rasterizeNavGrid();
    }
  }

  function generateRockMap(forceNewSeed) {
    const st = SP.state;
    const ap = SP.activeParams;
    if (forceNewSeed || ap.pf_rock_seed <= 0) {
      pf.currentRockSeed = ap.pf_rock_seed > 0 ? ap.pf_rock_seed : SP.resolveSeedInt(0);
    } else {
      pf.currentRockSeed = ap.pf_rock_seed;
    }
    pf.rocks = buildRockNorms(ap.pf_rock_style, ap.pf_rock_density, st.objId, pf.currentRockSeed);
    rebuildRockPolygons(pf.rocks, st.arena);
    rebuildNavGrid();
  }

  function worldToCell(x, y) {
    const ar = SP.state.arena;
    const nav = pf.nav;
    const gx = SP.clamp(Math.floor((x - ar.x) / nav.cellW), 0, nav.cols - 1);
    const gy = SP.clamp(Math.floor((y - ar.y) / nav.cellH), 0, nav.rows - 1);
    return { gx, gy };
  }

  function cellCenter(gx, gy) {
    const ar = SP.state.arena;
    const nav = pf.nav;
    return { x: ar.x + (gx + 0.5) * nav.cellW, y: ar.y + (gy + 0.5) * nav.cellH };
  }

  function findNearestWalkableCell(gx, gy) {
    const nav = pf.nav;
    if (!nav.cols || !nav.rows) return { gx: 0, gy: 0 };
    if (!nav.blocked[gy * nav.cols + gx]) return { gx, gy };
    for (let rad = 1; rad < Math.max(nav.cols, nav.rows); rad++) {
      let best = null, bestD2 = Infinity;
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          if (Math.abs(dx) !== rad && Math.abs(dy) !== rad) continue;
          const cx = gx + dx, cy = gy + dy;
          if (cx < 0 || cy < 0 || cx >= nav.cols || cy >= nav.rows) continue;
          if (nav.blocked[cy * nav.cols + cx]) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) { bestD2 = d2; best = { gx: cx, gy: cy }; }
        }
      }
      if (best) return best;
    }
    return { gx, gy };
  }

  const FF_DIRS = [
    { dx: 0, dy: -1, cost: 10 },
    { dx: 1, dy: 0, cost: 10 },
    { dx: 0, dy: 1, cost: 10 },
    { dx: -1, dy: 0, cost: 10 },
    { dx: 1, dy: -1, cost: 14 },
    { dx: 1, dy: 1, cost: 14 },
    { dx: -1, dy: 1, cost: 14 },
    { dx: -1, dy: -1, cost: 14 }
  ];

  function getFlowField(targetX, targetY) {
    const nav = pf.nav;
    if (!nav.blocked || !nav.cols || !nav.rows) return null;
    const raw = worldToCell(targetX, targetY);
    const goal = findNearestWalkableCell(raw.gx, raw.gy);
    const key = goal.gx + "," + goal.gy;

    if (nav.flowCache.has(key)) {
      const cached = nav.flowCache.get(key);
      nav.flowCache.delete(key);
      nav.flowCache.set(key, cached);
      return cached;
    }

    const cols = nav.cols, rows = nav.rows, total = cols * rows;
    const distArr = new Int32Array(total);
    distArr.fill(0x3fffffff);
    const goalIdx = goal.gy * cols + goal.gx;
    distArr[goalIdx] = 0;

    // Lightweight binary min-heap on flat arrays
    const heapIdx = [goalIdx];
    const heapDist = [0];
    const pushHeap = (idx, d) => {
      let i = heapIdx.length;
      heapIdx.push(idx);
      heapDist.push(d);
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heapDist[p] <= d) break;
        heapIdx[i] = heapIdx[p];
        heapDist[i] = heapDist[p];
        i = p;
      }
      heapIdx[i] = idx;
      heapDist[i] = d;
    };
    const popHeap = () => {
      const topIdx = heapIdx[0];
      const topDist = heapDist[0];
      const lastIdx = heapIdx.pop();
      const lastDist = heapDist.pop();
      if (heapIdx.length > 0) {
        let i = 0;
        const len = heapIdx.length;
        while (true) {
          let l = i * 2 + 1, r = l + 1, smallest = i;
          if (l < len && heapDist[l] < lastDist) smallest = l;
          if (r < len && heapDist[r] < (smallest === i ? lastDist : heapDist[smallest])) smallest = r;
          if (smallest === i) break;
          heapIdx[i] = heapIdx[smallest];
          heapDist[i] = heapDist[smallest];
          i = smallest;
        }
        heapIdx[i] = lastIdx;
        heapDist[i] = lastDist;
      }
      return { idx: topIdx, d: topDist };
    };

    const blocked = nav.blocked;
    const clearance = nav.clearance;
    while (heapIdx.length > 0) {
      const node = popHeap();
      const cur = node.idx;
      if (node.d !== distArr[cur]) continue;
      const cx = cur % cols;
      const cy = (cur / cols) | 0;

      for (let di = 0; di < 8; di++) {
        const d = FF_DIRS[di];
        const nx = cx + d.dx, ny = cy + d.dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = ny * cols + nx;
        if (blocked[ni]) continue;
        // Prevent diagonal corner cutting across rocks
        if (d.dx !== 0 && d.dy !== 0) {
          if (blocked[cy * cols + nx] || blocked[ny * cols + cx]) continue;
        }
        const hugPen = clearance[ni] <= 1 ? 4 : 0;
        const nd = node.d + d.cost + hugPen;
        if (nd < distArr[ni]) {
          distArr[ni] = nd;
          pushHeap(ni, nd);
        }
      }
    }

    // Build smooth unit vector per walkable cell pointing down-gradient
    const vx = new Float32Array(total);
    const vy = new Float32Array(total);
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const idx = gy * cols + gx;
        if (blocked[idx] || idx === goalIdx || distArr[idx] >= 0x3ffffff0) continue;
        let bestD = distArr[idx], bx = 0, by = 0;
        for (let di = 0; di < 8; di++) {
          const d = FF_DIRS[di];
          const nx = gx + d.dx, ny = gy + d.dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const ni = ny * cols + nx;
          if (blocked[ni]) continue;
          if (d.dx !== 0 && d.dy !== 0 && (blocked[gy * cols + nx] || blocked[ny * cols + gx])) continue;
          if (distArr[ni] < bestD) {
            bestD = distArr[ni];
            bx = d.dx;
            by = d.dy;
          }
        }
        const l = Math.hypot(bx, by) || 1;
        vx[idx] = bx / l;
        vy[idx] = by / l;
      }
    }

    const field = { gx: goal.gx, gy: goal.gy, cols, rows, dist: distArr, vx, vy };
    nav.flowCache.set(key, field);
    if (nav.flowCache.size > PF_MAX_FIELDS) {
      const oldestKey = nav.flowCache.keys().next().value;
      nav.flowCache.delete(oldestKey);
    }
    return field;
  }

  function sampleFlowVector(field, x, y) {
    if (!field) return { x: 0, y: 0 };
    const nav = pf.nav;
    const c = worldToCell(x, y);
    const idx = c.gy * field.cols + c.gx;
    if (!nav.blocked[idx]) {
      return { x: field.vx[idx], y: field.vy[idx] };
    }
    const w = findNearestWalkableCell(c.gx, c.gy);
    const pt = cellCenter(w.gx, w.gy);
    const dx = pt.x - x, dy = pt.y - y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  }

  function computePreviewPath(startX, startY, endX, endY) {
    const field = getFlowField(endX, endY);
    if (!field) return [{ x: startX, y: startY }, { x: endX, y: endY }];
    const pts = [{ x: startX, y: startY }];
    let cx = startX, cy = startY;
    const step = PF_CELL_SIZE * 0.9;
    for (let k = 0; k < 64; k++) {
      if (SP.dist(cx, cy, endX, endY) <= step * 1.4 || hasRockLos(cx, cy, endX, endY)) {
        pts.push({ x: endX, y: endY });
        break;
      }
      const fv = sampleFlowVector(field, cx, cy);
      if (fv.x === 0 && fv.y === 0) break;
      const nx = cx + fv.x * step, ny = cy + fv.y * step;
      const cl = pushOutOfRocks(nx, ny, PF_UNIT_RADIUS);
      cx = cl.x; cy = cl.y;
      pts.push({ x: cx, y: cy });
    }
    return pts;
  }

  // =========================================================================
  // SPATIAL HASH FOR MANY UNITS (60 vs 60 @ 60fps)
  // =========================================================================
  function rebuildSpatialHash() {
    const st = SP.state;
    const ar = st.arena;
    const cs = pf.hashCell;
    pf.hashCols = Math.max(1, Math.ceil(ar.w / cs));
    pf.hashRows = Math.max(1, Math.ceil(ar.h / cs));
    const total = pf.hashCols * pf.hashRows;
    if (pf.spatialBuckets.length !== total) {
      pf.spatialBuckets = Array.from({ length: total }, () => []);
    } else {
      for (let i = 0; i < total; i++) pf.spatialBuckets[i].length = 0;
    }
    for (let i = 0; i < st.units.length; i++) {
      const u = st.units[i];
      const hx = SP.clamp(Math.floor((u.x - ar.x) / cs), 0, pf.hashCols - 1);
      const hy = SP.clamp(Math.floor((u.y - ar.y) / cs), 0, pf.hashRows - 1);
      pf.spatialBuckets[hy * pf.hashCols + hx].push(i);
    }
  }

  // =========================================================================
  // SELECTION, GROUPS & ORDERS
  // =========================================================================
  function getPlayerUnits() {
    return SP.state.units.filter((u) => u.team === SP.TEAM_PLAYER);
  }

  function getSelectedUnits() {
    return SP.state.units.filter((u) => u.team === SP.TEAM_PLAYER && u.selected);
  }

  function clearSelection() {
    for (const u of SP.state.units) u.selected = false;
    pf.activeGroupBtn = 0;
    pf.previewPath = [];
  }

  function selectAllUnits() {
    for (const u of SP.state.units) {
      if (u.team === SP.TEAM_PLAYER) u.selected = true;
    }
    pf.activeGroupBtn = 0;
    SP.playSfx("select");
    syncPfHud(true);
  }

  function stopSelectedUnits() {
    let any = false;
    for (const u of getSelectedUnits()) {
      u.order = null;
      any = true;
    }
    pf.previewPath = [];
    if (any) SP.playSfx("step");
    syncPfHud(true);
  }

  function handleGroupButton(slot) {
    const st = SP.state;
    if (!st.running || st.externalPaused || st.destroyed || st.menuOpen) return;
    if (pf.saveGroupArmed) {
      const sel = getSelectedUnits();
      if (sel.length) {
        for (const u of SP.state.units) {
          if (u.group === slot) u.group = 0;
        }
        for (const u of sel) u.group = slot;
        pf.activeGroupBtn = slot;
        SP.playSfx("order");
      }
      pf.saveGroupArmed = false;
      syncPfHud(true);
      return;
    }

    const members = SP.state.units.filter((u) => u.team === SP.TEAM_PLAYER && u.group === slot);
    if (members.length) {
      clearSelection();
      for (const u of members) { u.selected = true; u.pop = 1.25; }
      pf.activeGroupBtn = slot;
      SP.playSfx("select");
    } else {
      const sel = getSelectedUnits();
      if (sel.length) {
        for (const u of sel) u.group = slot;
        pf.activeGroupBtn = slot;
        SP.playSfx("order");
      }
    }
    syncPfHud(true);
  }

  function toggleSaveGroupArmed() {
    pf.saveGroupArmed = !pf.saveGroupArmed;
    SP.playSfx("step");
    syncPfHud(true);
  }

  function issueMoveOrder(selectedList, tx, ty, isAttack) {
    if (!selectedList.length) return;
    const targetSafe = pushOutOfRocks(tx, ty, PF_UNIT_RADIUS + 2);
    const count = selectedList.length;
    const spacing = PF_UNIT_RADIUS * 2.25;

    // Centroid for preview path
    let cx = 0, cy = 0;
    for (const u of selectedList) { cx += u.x; cy += u.y; }
    cx /= count; cy /= count;
    pf.previewPath = computePreviewPath(cx, cy, targetSafe.x, targetSafe.y);

    // Golden-angle spiral formation offsets around destination
    for (let k = 0; k < count; k++) {
      const u = selectedList[k];
      let gx = targetSafe.x, gy = targetSafe.y;
      if (count > 1) {
        const ang = k * 2.39996;
        const rad = spacing * Math.sqrt(k) * 0.62;
        const p = pushOutOfRocks(targetSafe.x + Math.cos(ang) * rad, targetSafe.y + Math.sin(ang) * rad, PF_UNIT_RADIUS + 1);
        gx = p.x; gy = p.y;
      }
      u.order = { tx: gx, ty: gy, rawX: targetSafe.x, rawY: targetSafe.y, attack: !!isAttack };
      u.pop = 1.2;
    }
    // Pre-warm shared flow field once for the entire group
    getFlowField(targetSafe.x, targetSafe.y);
    pf.beacons.push({
      x: targetSafe.x,
      y: targetSafe.y,
      color: isAttack ? SP.activeParams.ai_color : SP.activeParams.player_color,
      life: 1.0,
      maxLife: 1.0
    });
    SP.playSfx("order");
    syncPfHud(true);
  }

  function spawnPathfindSquads() {
    const st = SP.state;
    const ap = SP.activeParams;
    const pCount = ap.pf_player_units;
    const aCount = ap.pf_ai_units;
    const hp = ap.pf_unit_hp;
    const ar = st.arena;

    // Deploy player units in 3 natural squads (G1 left, G2 center, G3 right)
    for (let i = 0; i < pCount; i++) {
      const squad = i < Math.ceil(pCount / 3) ? 1 : (i < Math.ceil((pCount * 2) / 3) ? 2 : 3);
      const pos = SP.arena.getBaseSpawn(SP.TEAM_PLAYER, i, pCount, pushOutOfRocks, PF_UNIT_RADIUS + 2);
      const u = SP.arena.createUnit(SP.TEAM_PLAYER, pos, hp);
      u.id = pf.nextUnitId++;
      u.selected = squad === 2; // Pre-select central squad so first tap works immediately!
      u.group = squad;
      u.order = null;
      st.units.push(u);
    }
    pf.activeGroupBtn = 2;

    // Deploy AI army across upper staging zone
    for (let i = 0; i < aCount; i++) {
      const squad = i % 3;
      const pos = SP.arena.getBaseSpawn(SP.TEAM_AI, i, aCount, pushOutOfRocks, PF_UNIT_RADIUS + 2);
      const u = SP.arena.createUnit(SP.TEAM_AI, pos, hp);
      u.id = pf.nextUnitId++;
      u.selected = false;
      u.group = squad;
      u.order = {
        tx: ar.x + ar.w * (0.22 + squad * 0.28),
        ty: ar.y + ar.h * 0.42,
        rawX: ar.x + ar.w * (0.22 + squad * 0.28),
        rawY: ar.y + ar.h * 0.42,
        attack: true
      };
      st.units.push(u);
    }
  }

  // =========================================================================
  // AI COMMANDER USING FLOW-FIELDS
  // =========================================================================
  function updatePfAi(dt) {
    const st = SP.state;
    const ap = SP.activeParams;
    pf.aiSquadTimer -= dt;
    if (pf.aiSquadTimer > 0) return;
    pf.aiSquadTimer = SP.arena.getAiInterval() * 1.1;

    const aiUnits = st.units.filter((u) => u.team === SP.TEAM_AI);
    if (!aiUnits.length) return;
    const ar = st.arena;

    // Assign each of 3 AI squads to a distinct tactical goal using flow-fields
    for (let s = 0; s < 3; s++) {
      const squadUnits = aiUnits.filter((u) => (u.group % 3) === s);
      if (!squadUnits.length) continue;

      let goal = null;
      if (st.objId === "domination" && st.zones.length >= 3) {
        const z = st.zones[s % st.zones.length];
        goal = pushOutOfRocks(z.x + SP.randRange(-24, 24), z.y + SP.randRange(-24, 24), PF_UNIT_RADIUS + 2);
      } else if (st.objId === "koth" && st.zones.length) {
        const z = st.zones[0];
        const ang = (s - 1) * 0.8 + Math.PI * 0.5;
        goal = pushOutOfRocks(z.x + Math.cos(ang) * z.r * 0.45, z.y + Math.sin(ang) * z.r * 0.45, PF_UNIT_RADIUS + 2);
      } else if (st.objId === "escort") {
        goal = pushOutOfRocks(st.payloadPos.x + (s - 1) * 32, st.payloadPos.y - 16, PF_UNIT_RADIUS + 2);
      } else if (st.objId === "coin_rush" && st.stars.length) {
        const star = st.stars[s % st.stars.length];
        goal = pushOutOfRocks(star.x, star.y, PF_UNIT_RADIUS + 2);
      } else {
        const pUnits = getPlayerUnits();
        if (pUnits.length && (st.objId === "elimination" || ap.ai_style === "aggressive" || s === 1)) {
          const targetP = pUnits[Math.floor((s * 7 + Math.random() * pUnits.length)) % pUnits.length];
          goal = pushOutOfRocks(targetP.x + (s - 1) * 36, targetP.y, PF_UNIT_RADIUS + 2);
        } else {
          goal = pushOutOfRocks(ar.x + ar.w * (0.2 + s * 0.3), ar.y + ar.h * 0.52, PF_UNIT_RADIUS + 2);
        }
      }

      if (goal) {
        getFlowField(goal.x, goal.y);
        for (let k = 0; k < squadUnits.length; k++) {
          const u = squadUnits[k];
          const ang = k * 2.39996;
          const off = PF_UNIT_RADIUS * 2.0 * Math.sqrt(k % 9);
          const tp = pushOutOfRocks(goal.x + Math.cos(ang) * off, goal.y + Math.sin(ang) * off, PF_UNIT_RADIUS + 1);
          u.order = { tx: tp.x, ty: tp.y, rawX: goal.x, rawY: goal.y, attack: true };
        }
      }
    }
  }

  // =========================================================================
  // MAIN SIMULATION TICK (Flow-Field + Spatial Hash + Polygon Rocks)
  // =========================================================================
  function updatePf(dt) {
    const st = SP.state;
    const ap = SP.activeParams;
    st.animTime += dt;
    if (!st.running || st.externalPaused || st.destroyed || st.menuOpen) return;
    st.matchHasTicked = true;
    st.timeLeft = Math.max(0, st.timeLeft - dt);

    for (let i = pf.beacons.length - 1; i >= 0; i--) {
      pf.beacons[i].life -= dt;
      if (pf.beacons[i].life <= 0) pf.beacons.splice(i, 1);
    }

    updatePfAi(dt);

    if (ap.pf_respawn_enabled && st.respawnQueue.length) {
      for (let i = st.respawnQueue.length - 1; i >= 0; i--) {
        st.respawnQueue[i].t -= dt;
        if (st.respawnQueue[i].t <= 0) {
          const team = st.respawnQueue[i].team;
          const pos = SP.arena.getBaseSpawn(team, -1, 1, pushOutOfRocks, PF_UNIT_RADIUS + 2);
          const nu = SP.arena.createUnit(team, pos, ap.pf_unit_hp);
          nu.id = pf.nextUnitId++;
          nu.selected = false;
          nu.group = team === SP.TEAM_PLAYER ? 2 : (Math.floor(Math.random() * 3));
          nu.order = null;
          st.units.push(nu);
          SP.arena.spawnRing(pos.x, pos.y, team === SP.TEAM_PLAYER ? ap.player_color : ap.ai_color, 5);
          st.respawnQueue.splice(i, 1);
        }
      }
    }

    rebuildSpatialHash();

    const unitSpeed = ap.pf_unit_speed;
    const shootRange = ap.pf_shoot_range;
    const shootRange2 = shootRange * shootRange;
    const fireInt = 1 / Math.max(ap.fire_rate, 0.25);
    const ar = st.arena;
    const hCols = pf.hashCols, hRows = pf.hashRows, cs = pf.hashCell;
    const buckets = pf.spatialBuckets;
    const sepRad = PF_UNIT_RADIUS * 2.15;
    const sepRad2 = sepRad * sepRad;
    const searchCells = Math.ceil(shootRange / cs);

    for (let i = 0; i < st.units.length; i++) {
      const u = st.units[i];
      u.hitFlash = Math.max(0, u.hitFlash - dt * 5);
      u.muzzle = Math.max(0, u.muzzle - dt * 10);
      u.pop += (1 - u.pop) * Math.min(dt * 12, 1);

      const uhx = SP.clamp(Math.floor((u.x - ar.x) / cs), 0, hCols - 1);
      const uhy = SP.clamp(Math.floor((u.y - ar.y) / cs), 0, hRows - 1);

      // 1. Local unit-unit separation via 3x3 neighborhood buckets
      let sx = 0, sy = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const cy = uhy + dy;
        if (cy < 0 || cy >= hRows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const cx = uhx + dx;
          if (cx < 0 || cx >= hCols) continue;
          const bkt = buckets[cy * hCols + cx];
          for (let k = 0; k < bkt.length; k++) {
            const j = bkt[k];
            if (j === i) continue;
            const o = st.units[j];
            const rx = u.x - o.x, ry = u.y - o.y;
            const d2 = rx * rx + ry * ry;
            if (d2 < sepRad2 && d2 > 0.001) {
              const d = Math.sqrt(d2);
              const f = (sepRad - d) * 6.2;
              sx += (rx / d) * f;
              sy += (ry / d) * f;
            }
          }
        }
      }

      // 2. Nearest visible enemy in range via spatial hash
      let visibleTarget = null, visibleD2 = Infinity;
      const minX = Math.max(0, uhx - searchCells), maxX = Math.min(hCols - 1, uhx + searchCells);
      const minY = Math.max(0, uhy - searchCells), maxY = Math.min(hRows - 1, uhy + searchCells);
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          const bkt = buckets[cy * hCols + cx];
          for (let k = 0; k < bkt.length; k++) {
            const o = st.units[bkt[k]];
            if (o.team === u.team) continue;
            const d2 = SP.dist2(u.x, u.y, o.x, o.y);
            if (d2 <= shootRange2 && d2 < visibleD2) {
              if (!ap.pf_rocks_block_bullets || hasRockLos(u.x, u.y, o.x, o.y)) {
                visibleD2 = d2;
                visibleTarget = o;
              }
            }
          }
        }
      }

      // 3. Flow-field / direct movement goal
      let gx = 0, gy = 0;
      if (u.order) {
        const odx = u.order.tx - u.x, ody = u.order.ty - u.y;
        const od = Math.hypot(odx, ody);
        if (od <= 9) {
          u.order = null;
        } else if (od < 56 || hasRockLos(u.x, u.y, u.order.tx, u.order.ty)) {
          const ramp = od < 22 ? od / 22 : 1;
          gx = (odx / od) * ramp;
          gy = (ody / od) * ramp;
        } else {
          const field = getFlowField(u.order.rawX, u.order.rawY);
          const fv = sampleFlowVector(field, u.x, u.y);
          gx = fv.x;
          gy = fv.y;
          if (gx === 0 && gy === 0) {
            gx = odx / od;
            gy = ody / od;
          }
        }
      }

      let dvx = gx * unitSpeed + sx;
      let dvy = gy * unitSpeed + sy;
      const dl = Math.hypot(dvx, dvy);
      if (dl > unitSpeed * 1.45) {
        dvx = (dvx / dl) * unitSpeed * 1.45;
        dvy = (dvy / dl) * unitSpeed * 1.45;
      }
      const blend = Math.min(dt * 9, 1);
      u.vx += (dvx - u.vx) * blend;
      u.vy += (dvy - u.vy) * blend;

      const cp = pushOutOfRocks(u.x + u.vx * dt, u.y + u.vy * dt, PF_UNIT_RADIUS + 0.5);
      u.x = cp.x;
      u.y = cp.y;

      const spd = Math.hypot(u.vx, u.vy);
      if (spd > 6) u.walk += dt * (6 + spd * 0.11);

      u.fireCd -= dt;
      if (visibleTarget) {
        u.aim = Math.atan2(visibleTarget.y - u.y, visibleTarget.x - u.x);
        if (u.fireCd <= 0) {
          u.fireCd = fireInt * SP.randRange(0.86, 1.14);
          u.muzzle = 1;
          const ang = u.aim + SP.randRange(-0.08, 0.08);
          const dx = Math.cos(ang), dy = Math.sin(ang);
          st.bullets.push({
            team: u.team,
            x: u.x + dx * (PF_UNIT_RADIUS + 3),
            y: u.y + dy * (PF_UNIT_RADIUS + 3),
            vx: dx * SP.BULLET_SPEED,
            vy: dy * SP.BULLET_SPEED,
            life: Math.max(0.4, (shootRange * 1.3) / SP.BULLET_SPEED)
          });
          SP.playSfx("shoot");
        }
      } else if (spd > 10) {
        u.aim = Math.atan2(u.vy, u.vx);
      }
    }

    // 4. Bullets vs irregular rocks & units
    const bulletDmg = Math.max(6, Math.round(ap.bullet_damage * 0.72));
    const pBulletLight = SP.lightenHex(ap.player_color, 0.55);
    const aBulletLight = SP.lightenHex(ap.ai_color, 0.45);
    const hitR2 = (PF_UNIT_RADIUS + 4) * (PF_UNIT_RADIUS + 4);

    for (let bi = st.bullets.length - 1; bi >= 0; bi--) {
      const b = st.bullets[bi];
      const prevX = b.x, prevY = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let hit = b.life <= 0 || b.x < ar.x || b.x > ar.x + ar.w || b.y < ar.y || b.y > ar.y + ar.h;

      if (!hit && ap.pf_rocks_block_bullets && pf.rocks.length) {
        for (const r of pf.rocks) {
          const mr = r.boundR + 14;
          if (SP.dist2(b.x, b.y, r.cx, r.cy) > mr * mr) continue;
          if (segmentIntersectsPoly(prevX, prevY, b.x, b.y, r.pts)) {
            SP.arena.spawnRing(prevX, prevY, "#cbd5e1", 2);
            hit = true;
            break;
          }
        }
      }

      if (!hit) {
        const bx = SP.clamp(Math.floor((b.x - ar.x) / cs), 0, hCols - 1);
        const by = SP.clamp(Math.floor((b.y - ar.y) / cs), 0, hRows - 1);
        outer: for (let dy = -1; dy <= 1; dy++) {
          const cy = by + dy;
          if (cy < 0 || cy >= hRows) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const cx = bx + dx;
            if (cx < 0 || cx >= hCols) continue;
            const bkt = buckets[cy * hCols + cx];
            for (let k = 0; k < bkt.length; k++) {
              const ui = bkt[k];
              if (ui >= st.units.length) continue;
              const u = st.units[ui];
              if (!u || u.team === b.team || u.hp <= 0) continue;
              if (SP.dist2(b.x, b.y, u.x, u.y) <= hitR2) {
                u.hp -= bulletDmg;
                u.hitFlash = 1;
                SP.arena.spawnRing(b.x, b.y, b.team === SP.TEAM_PLAYER ? pBulletLight : aBulletLight, 2);
                if (u.hp <= 0) {
                  SP.arena.spawnRing(u.x, u.y, u.team === SP.TEAM_PLAYER ? ap.player_color : ap.ai_color, 8);
                  SP.playSfx("ko");
                  if (b.team === SP.TEAM_PLAYER) {
                    st.playerKills++;
                    if (st.objId === "elimination") { st.playerScore++; SP.arena.spawnFloat(u.x, u.y, "+1", ap.player_color); }
                  } else {
                    st.aiKills++;
                    if (st.objId === "elimination") { st.aiScore++; SP.arena.spawnFloat(u.x, u.y, "+1", ap.ai_color); }
                  }
                  if (ap.pf_respawn_enabled) st.respawnQueue.push({ team: u.team, t: ap.respawn_delay });
                }
                hit = true;
                break outer;
              }
            }
          }
        }
      }
      if (hit) st.bullets.splice(bi, 1);
    }

    // Prune dead units once cleanly after spatial-hash bullet loop
    for (let ui = st.units.length - 1; ui >= 0; ui--) {
      if (st.units[ui].hp <= 0) st.units.splice(ui, 1);
    }

    SP.arena.updateObjectives(dt, pointInRock, pushOutOfRocks);
    SP.arena.tickVfx(dt);

    const ended = SP.arena.checkRealtimeEnd(ap.pf_respawn_enabled, 0, syncPfHud);
    if (!ended) syncPfHud(false);
  }

  // =========================================================================
  // HUD & RENDERING
  // =========================================================================
  function syncPfHud(force) {
    const st = SP.state;
    const dom = SP.dom;
    if (st.gameMode !== "pathfind") return;
    const now = performance.now();
    if (!force && now - st.lastHudSync < 65) return;
    st.lastHudSync = now;

    const ps = Math.round(st.playerScore);
    const as = Math.round(st.aiScore);
    dom.pScoreEl.textContent = ps;
    dom.aScoreEl.textContent = as;
    dom.timerEl.textContent = SP.formatTime(st.timeLeft);
    dom.objBadgeEl.textContent = st.objInfo.name + " • PATHFIND";
    dom.objBadgeEl.style.color = "";

    const pAlive = getPlayerUnits();
    const sel = getSelectedUnits();
    dom.pfSelLbl.textContent = `${sel.length} / ${pAlive.length} sél.`;
    dom.btnPfAll.classList.toggle("active", pAlive.length > 0 && sel.length === pAlive.length);
    dom.btnPfSaveGrp.classList.toggle("active", pf.saveGroupArmed);

    const grpBtns = [dom.btnPfG1, dom.btnPfG2, dom.btnPfG3];
    for (let g = 1; g <= 3; g++) {
      const btn = grpBtns[g - 1];
      const cnt = pAlive.filter((u) => u.group === g).length;
      const allSelInGrp = cnt > 0 && sel.length === cnt && sel.every((u) => u.group === g);
      btn.textContent = cnt > 0 ? `G${g} (${cnt})` : `G${g}`;
      btn.classList.toggle("has-units", cnt > 0);
      btn.classList.toggle("active", !pf.saveGroupArmed && (allSelInGrp || pf.activeGroupBtn === g && cnt > 0));
      btn.classList.toggle("save-armed", pf.saveGroupArmed);
    }

    dom.btnPfStop.disabled = sel.length === 0;
    dom.btnPfClear.disabled = sel.length === 0;

    if (pf.saveGroupArmed) {
      dom.pfHintLbl.textContent = "💾 Touchez G1, G2 ou G3 pour enregistrer la sélection";
      dom.pfHintLbl.style.color = "#ffd638";
    } else if (sel.length > 0) {
      dom.pfHintLbl.textContent = "Touchez le terrain pour déplacer la sélection • Glissez pour sélectionner";
      dom.pfHintLbl.style.color = "";
    } else {
      dom.pfHintLbl.textContent = "Touchez une unité ou glissez un cadre pour sélectionner un groupe";
      dom.pfHintLbl.style.color = "";
    }

    if (st.isEmbedded && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: "minigd_stats",
          id: SP.GAME_ID,
          text: `Pathfind (${sel.length} sél.) • Bleu ${ps} - ${as} Rouge • ${SP.formatTime(st.timeLeft)}`,
          over: Boolean(st.matchEnded)
        }, "*");
      } catch (_e) {}
    }
  }

  function drawRockPoly(ctx, pts) {
    if (!pts || !pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }

  function renderRocks(ctx, rockList, shadowOff) {
    const off = shadowOff !== undefined ? shadowOff : 4;
    for (const r of rockList) {
      // Drop shadow
      ctx.save();
      ctx.translate(off, off + 1);
      drawRockPoly(ctx, r.pts);
      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.fill();
      ctx.restore();

      // Main organic rock body
      drawRockPoly(ctx, r.pts);
      const b = Math.round(58 * r.shade);
      ctx.fillStyle = `rgb(${b}, ${b + 10}, ${b + 22})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(176, 198, 224, 0.42)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Lit upper facet ridge
      drawRockPoly(ctx, r.innerPts);
      ctx.fillStyle = `rgb(${b + 24}, ${b + 36}, ${b + 50})`;
      ctx.fill();

      // Mineral crack line
      if (r.pts.length >= 6 && r.crackIdx) {
        const pA = r.pts[r.crackIdx[0]];
        const pB = r.pts[r.crackIdx[1]];
        ctx.strokeStyle = "rgba(18, 24, 34, 0.55)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(r.cx + 2, r.cy - 1);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      }
    }
  }

  function renderPf(ctx) {
    const st = SP.state;
    const ap = SP.activeParams;
    const pCol = ap.player_color;
    const aCol = ap.ai_color;
    const pDark = SP.darkenHex(pCol, 0.48);
    const aDark = SP.darkenHex(aCol, 0.48);
    const pRgb = SP.hexToRgbStr(pCol);

    SP.arena.renderArenaBaseAndObjectives(ctx);

    // Pathfinding flow preview line for active command
    if (pf.previewPath.length >= 2) {
      ctx.save();
      ctx.strokeStyle = `rgba(${pRgb}, 0.52)`;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -(st.animTime * 28);
      ctx.beginPath();
      ctx.moveTo(pf.previewPath[0].x, pf.previewPath[0].y);
      for (let i = 1; i < pf.previewPath.length; i++) {
        ctx.lineTo(pf.previewPath[i].x, pf.previewPath[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Individual active target lines for selected units
    for (const u of st.units) {
      if (u.team === SP.TEAM_PLAYER && u.selected && u.order) {
        ctx.strokeStyle = `rgba(${pRgb}, 0.22)`;
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(u.order.tx, u.order.ty); ctx.stroke();
      }
    }

    // Destination beacons
    for (const bc of pf.beacons) {
      const f = SP.clamp(bc.life / bc.maxLife, 0, 1);
      const rad = 8 + (1 - f) * 20;
      ctx.globalAlpha = f * 0.9;
      ctx.strokeStyle = bc.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(bc.x, bc.y, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(bc.x, bc.y, 4, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Organic irregular rock formations
    renderRocks(ctx, pf.rocks, 4);

    // Numerous compact units
    const selPulse = 1 + 0.08 * Math.sin(st.animTime * 6);
    for (const u of st.units) {
      const r = PF_UNIT_RADIUS * u.pop;
      const isP = u.team === SP.TEAM_PLAYER;
      const mainCol = u.hitFlash > 0.25 ? "#ffffff" : (isP ? pCol : aCol);
      const darkCol = isP ? pDark : aDark;
      const bob = Math.sin(u.walk) * 1.2;

      if (isP && u.selected) {
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(u.x, u.y, (r + 3.5) * selPulse, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.fillStyle = "rgba(0,0,0,0.34)";
      ctx.beginPath(); ctx.arc(u.x, u.y + r * 0.65, r * 0.78, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = darkCol;
      ctx.beginPath(); ctx.arc(u.x, u.y + bob, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mainCol;
      ctx.beginPath(); ctx.arc(u.x, u.y + bob - 0.6, r * 0.82, 0, Math.PI * 2); ctx.fill();

      const ax = Math.cos(u.aim), ay = Math.sin(u.aim);
      ctx.strokeStyle = "#e2ecfc"; ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(u.x + ax * r * 0.35, u.y + bob + ay * r * 0.35);
      ctx.lineTo(u.x + ax * (r + 4.2), u.y + bob + ay * (r + 4.2));
      ctx.stroke();

      if (u.muzzle > 0.15) {
        ctx.fillStyle = "#ffeb73";
        ctx.beginPath(); ctx.arc(u.x + ax * (r + 4.5), u.y + bob + ay * (r + 4.5), 3.0 * u.muzzle, 0, Math.PI * 2); ctx.fill();
      }

      const hpR = SP.clamp(u.hp / u.maxHp, 0, 1);
      if (hpR < 0.99 || (isP && u.selected)) {
        const bw = 14;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(u.x - bw * 0.5, u.y - r - 5.5, bw, 2.5);
        ctx.fillStyle = isP ? "#4df273" : "#ff7361";
        ctx.fillRect(u.x - bw * 0.5, u.y - r - 5.5, bw * hpR, 2.5);
      }
    }

    SP.arena.renderBulletsAndVfx(ctx);

    // Drag selection marquee box
    if (pf.dragging) {
      const d = Math.hypot(pf.dragCur.x - pf.dragStart.x, pf.dragCur.y - pf.dragStart.y);
      if (d >= PF_DRAG_THRESH) {
        const rx = Math.min(pf.dragStart.x, pf.dragCur.x);
        const ry = Math.min(pf.dragStart.y, pf.dragCur.y);
        const rw = Math.abs(pf.dragCur.x - pf.dragStart.x);
        const rh = Math.abs(pf.dragCur.y - pf.dragStart.y);
        ctx.fillStyle = `rgba(${pRgb}, 0.15)`;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = "#fde68a";
        ctx.lineWidth = 1.8;
        ctx.strokeRect(rx, ry, rw, rh);
      }
    }

    SP.arena.renderFloatTexts(ctx);
  }

  // =========================================================================
  // MODULE PUBLIC API
  // =========================================================================
  SP.modes.pathfind = {
    state: pf,
    buildRockNorms,
    rebuildRockPolygons,
    renderRocks,
    generateRockMap,
    rebuildNavGrid,
    getFlowField,
    sampleFlowVector,
    pushOutOfRocks,
    pointInRock,
    hasRockLos,
    selectAllUnits,
    stopSelectedUnits,
    clearSelection() {
      clearSelection();
      syncPfHud(true);
    },
    handleGroupButton,
    toggleSaveGroupArmed,
    syncHud: syncPfHud,
    update: updatePf,
    render: renderPf,

    onEnter() {
      const dom = SP.dom;
      const ap = SP.activeParams;
      dom.startTitleEl.textContent = "STRATPATH";
      dom.startObjEl.textContent = `Pathfind (${ap.pf_player_units} vs ${ap.pf_ai_units}) • ${SP.state.objInfo.name}`;
      dom.startDescEl.textContent = SP.state.objInfo.desc;
      dom.startHowEl.innerHTML =
        "• <b>Glissez</b> pour encadrer des unités (ou <b>G1 / G2 / G3 / Tous</b>)<br />" +
        "• <b>Touchez le terrain</b> pour envoyer vos troupes en <b>pathfinding optimisé</b><br />" +
        "• Contournez les <b>roches irrégulières</b> et dominez l'arène !";
    },

    onPrepare() {
      pf.dragging = false;
      pf.saveGroupArmed = false;
      pf.beacons = [];
      pf.previewPath = [];
      pf.aiSquadTimer = 0.6;
      pf.nextUnitId = 1;
      generateRockMap(false);
      SP.arena.setupObjectiveLayout(pointInRock, pushOutOfRocks);
      spawnPathfindSquads();
      syncPfHud(true);
    },

    onResize() {
      rebuildRockPolygons(pf.rocks, SP.state.arena);
      rebuildNavGrid();
      SP.arena.resizeObjectiveLayout(pushOutOfRocks);
      for (const u of SP.state.units) {
        const cp = pushOutOfRocks(u.x, u.y, PF_UNIT_RADIUS + 1);
        u.x = cp.x; u.y = cp.y;
      }
      renderPf(SP.ctx);
    },

    resetInput() {
      pf.dragging = false;
    },

    onPointerDown(pt, e) {
      const st = SP.state;
      if (!st.running || st.externalPaused || st.destroyed || st.menuOpen) return;
      if (e && e.button === 2) {
        const sel = getSelectedUnits();
        if (sel.length) issueMoveOrder(sel, pt.x, pt.y, false);
        pf.dragging = false;
        return;
      }
      pf.dragging = true;
      pf.dragStart = { x: pt.x, y: pt.y };
      pf.dragCur = { x: pt.x, y: pt.y };
    },

    onPointerMove(pt) {
      if (!pf.dragging) return;
      pf.dragCur = { x: pt.x, y: pt.y };
    },

    onPointerUp(pt) {
      if (!pf.dragging) return;
      pf.dragging = false;
      const dist = Math.hypot(pt.x - pf.dragStart.x, pt.y - pf.dragStart.y);

      if (dist >= PF_DRAG_THRESH) {
        const x0 = Math.min(pf.dragStart.x, pt.x), x1 = Math.max(pf.dragStart.x, pt.x);
        const y0 = Math.min(pf.dragStart.y, pt.y), y1 = Math.max(pf.dragStart.y, pt.y);
        const inside = SP.state.units.filter((u) =>
          u.team === SP.TEAM_PLAYER && u.x >= x0 - 6 && u.x <= x1 + 6 && u.y >= y0 - 6 && u.y <= y1 + 6
        );
        clearSelection();
        for (const u of inside) { u.selected = true; u.pop = 1.25; }
        if (inside.length) SP.playSfx("select");
        syncPfHud(true);
        return;
      }

      // Single tap: check allied unit first
      let bestAlly = null, bestAllyD2 = 22 * 22;
      for (const u of SP.state.units) {
        if (u.team !== SP.TEAM_PLAYER) continue;
        const d2 = SP.dist2(pt.x, pt.y, u.x, u.y);
        if (d2 <= bestAllyD2) { bestAllyD2 = d2; bestAlly = u; }
      }
      if (bestAlly) {
        const now = performance.now();
        const isDouble = (now - pf.lastTapTs < 360) && pf.lastTapUnitId === bestAlly.id;
        pf.lastTapTs = now;
        pf.lastTapUnitId = bestAlly.id;
        clearSelection();
        if (isDouble) {
          for (const u of SP.state.units) {
            if (u.team === SP.TEAM_PLAYER && SP.dist2(bestAlly.x, bestAlly.y, u.x, u.y) <= 82 * 82) {
              u.selected = true;
              u.pop = 1.25;
            }
          }
        } else {
          bestAlly.selected = true;
          bestAlly.pop = 1.3;
        }
        SP.playSfx("select");
        syncPfHud(true);
        return;
      }

      // Check if tapping on an enemy -> attack-move order
      let enemyTap = false;
      for (const u of SP.state.units) {
        if (u.team === SP.TEAM_AI && SP.dist2(pt.x, pt.y, u.x, u.y) <= 22 * 22) {
          enemyTap = true;
          break;
        }
      }

      const sel = getSelectedUnits();
      if (sel.length) {
        issueMoveOrder(sel, pt.x, pt.y, enemyTap);
      }
    },

    onKeyDown(e) {
      const st = SP.state;
      if (!st.running || st.menuOpen || st.externalPaused || st.destroyed) return false;
      if (e.key === "a" || e.key === "A") { selectAllUnits(); return true; }
      if (e.key === "s" || e.key === "S") { stopSelectedUnits(); return true; }
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        const slot = Number(e.key);
        if (e.shiftKey) pf.saveGroupArmed = true;
        handleGroupButton(slot);
        return true;
      }
      if (e.key === "Backspace") { clearSelection(); syncPfHud(true); return true; }
      return false;
    }
  };
})();
