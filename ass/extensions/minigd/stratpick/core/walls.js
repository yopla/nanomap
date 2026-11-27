(function () {
  "use strict";
  const SP = window.StratPick = window.StratPick || {};

  function isNormRectSafe(r, targetObj) {
    if (!r || r.nw < 0.02 || r.nh < 0.02) return false;
    if (r.nx < 0.02 || r.ny < 0.145 || r.nx + r.nw > 0.98 || r.ny + r.nh > 0.855) return false;
    const expandDistSq = (cx, cy, rad) => {
      const qx = SP.clamp(cx, r.nx, r.nx + r.nw);
      const qy = SP.clamp(cy, r.ny, r.ny + r.nh);
      const dx = cx - qx, dy = cy - qy;
      return dx * dx + dy * dy < rad * rad;
    };
    if (targetObj === "koth") {
      if (expandDistSq(0.5, 0.5, 0.135)) return false;
    } else if (targetObj === "domination") {
      if (expandDistSq(0.28, 0.28, 0.095)) return false;
      if (expandDistSq(0.5, 0.5, 0.095)) return false;
      if (expandDistSq(0.72, 0.72, 0.095)) return false;
    } else if (targetObj === "escort") {
      if (r.nx < 0.58 && r.nx + r.nw > 0.42) return false;
    }
    return true;
  }

  function normRectsOverlap(a, b, pad) {
    return (
      a.nx - pad < b.nx + b.nw &&
      a.nx + a.nw + pad > b.nx &&
      a.ny - pad < b.ny + b.nh &&
      a.ny + a.nh + pad > b.ny
    );
  }

  function buildWallNorms(pattern, densityPct, targetObj, seedVal) {
    const rng = SP.mulberry32(seedVal);
    const dens = SP.clamp((Number(densityPct) || 50) / 100, 0.15, 1.0);
    const styles = ["symmetrical", "bunkers", "pillars", "maze", "fortress", "chokepoints"];
    let style = String(pattern || "symmetrical").toLowerCase();
    if (style === "random" || !styles.includes(style)) {
      style = styles[Math.floor(rng() * styles.length)];
    }

    const out = [];
    const tryAdd = (nx, ny, nw, nh, minGap) => {
      const r = { nx, ny, nw, nh };
      if (!isNormRectSafe(r, targetObj)) return false;
      const gap = minGap ?? 0.025;
      for (const ex of out) {
        if (normRectsOverlap(r, ex, gap)) return false;
      }
      out.push(r);
      return true;
    };

    const tryAddMirror = (nx, ny, nw, nh, minGap) => {
      const r1 = { nx, ny, nw, nh };
      const r2 = { nx: 1 - nx - nw, ny: 1 - ny - nh, nw, nh };
      if (!isNormRectSafe(r1, targetObj) || !isNormRectSafe(r2, targetObj)) return false;
      const gap = minGap ?? 0.025;
      if (normRectsOverlap(r1, r2, gap)) return false;
      for (const ex of out) {
        if (normRectsOverlap(r1, ex, gap) || normRectsOverlap(r2, ex, gap)) return false;
      }
      out.push(r1, r2);
      return true;
    };

    if (style === "symmetrical") {
      const count = Math.round(3 + dens * 5);
      for (let i = 0; i < count * 6 && out.length < count * 2; i++) {
        const horiz = rng() < 0.65;
        const nw = horiz ? (0.11 + rng() * 0.14) : (0.032 + rng() * 0.018);
        const nh = horiz ? (0.028 + rng() * 0.016) : (0.09 + rng() * 0.12);
        const nx = 0.06 + rng() * (0.88 - nw);
        const ny = 0.16 + rng() * 0.30;
        if (tryAddMirror(nx, ny, nw, nh, 0.035) && rng() < 0.35) {
          const capW = horiz ? 0.032 : 0.085;
          const capH = horiz ? 0.075 : 0.030;
          const cx = horiz ? (rng() < 0.5 ? nx : nx + nw - capW) : (nx > 0.5 ? nx - capW + nw : nx);
          const cy = horiz ? ny + nh : (rng() < 0.5 ? ny : ny + nh - capH);
          tryAddMirror(cx, cy, capW, capH, 0.002);
        }
      }
    } else if (style === "bunkers") {
      const pairs = Math.round(2 + dens * 3);
      for (let p = 0; p < pairs; p++) {
        for (let attempt = 0; attempt < 18; attempt++) {
          const bw = 0.14 + rng() * 0.08;
          const bh = 0.08 + rng() * 0.05;
          const thick = 0.028;
          const bx = 0.07 + rng() * (0.86 - bw);
          const by = 0.18 + rng() * 0.24;
          const topSeg = { nx: bx, ny: by, nw: bw, nh: thick };
          const leftWing = { nx: bx, ny: by + thick, nw: thick, nh: bh - thick };
          const rightWing = { nx: bx + bw - thick, ny: by + thick, nw: thick, nh: bh - thick };
          const mir = (s) => ({ nx: 1 - s.nx - s.nw, ny: 1 - s.ny - s.nh, nw: s.nw, nh: s.nh });
          const cands = [topSeg, leftWing];
          if (rng() < 0.72) cands.push(rightWing);
          const all = cands.concat(cands.map(mir));
          let ok = true;
          for (const c of all) {
            if (!isNormRectSafe(c, targetObj)) { ok = false; break; }
            for (const ex of out) {
              if (normRectsOverlap(c, ex, 0.035)) { ok = false; break; }
            }
            if (!ok) break;
          }
          if (ok) {
            for (const c of all) out.push(c);
            break;
          }
        }
      }
    } else if (style === "pillars") {
      const cols = Math.round(3 + dens * 2.2);
      const rows = Math.round(3 + dens * 1.5);
      const pw = 0.044, ph = 0.038;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rng() > 0.45 + dens * 0.45) continue;
          const stagger = (r % 2 === 1) ? 0.045 : -0.02;
          const nx = SP.clamp(0.11 + (c / Math.max(1, cols - 1)) * 0.74 + stagger + (rng() - 0.5) * 0.04, 0.05, 0.91);
          const ny = SP.clamp(0.20 + (r / Math.max(1, rows - 1)) * 0.56 + (rng() - 0.5) * 0.03, 0.16, 0.80);
          tryAdd(nx, ny, pw, ph, 0.045);
        }
      }
    } else if (style === "maze") {
      const cols = Math.round(3 + dens * 2);
      const rows = Math.round(3 + dens * 1.5);
      const cellW = 0.84 / cols;
      const cellH = 0.62 / rows;
      for (let r = 0; r < rows; r++) {
        const y = 0.18 + r * cellH;
        const skipCol = Math.floor(rng() * cols);
        const skipCol2 = cols > 3 ? Math.floor(rng() * cols) : -1;
        for (let c = 0; c < cols; c++) {
          if (c === skipCol || c === skipCol2) continue;
          const x = 0.08 + c * cellW;
          if (rng() < 0.35 + dens * 0.48) {
            tryAdd(x + cellW * 0.12, y, cellW * 0.76, 0.026, 0.015);
          }
          if (rng() < 0.30 + dens * 0.42 && c < cols - 1) {
            tryAdd(x + cellW - 0.015, y + cellH * 0.15, 0.028, cellH * 0.70, 0.015);
          }
        }
      }
    } else if (style === "fortress") {
      const fortYTop = 0.21;
      const fortYBot = 0.76;
      const wallH = 0.030;
      const gateCount = dens > 0.65 ? 2 : 3;
      const gates = [];
      for (let g = 0; g < gateCount; g++) {
        gates.push(0.18 + ((g + 0.5) / gateCount) * 0.64 + (rng() - 0.5) * 0.06);
      }
      const gateW = 0.14 - dens * 0.03;
      const buildRampart = (ry) => {
        let cursor = 0.05;
        const sorted = gates.slice().sort((a, b) => a - b);
        for (const gx of sorted) {
          const end = SP.clamp(gx - gateW * 0.5, 0.05, 0.95);
          if (end - cursor >= 0.07) {
            tryAdd(cursor, ry, end - cursor, wallH, 0.015);
          }
          cursor = Math.max(cursor, SP.clamp(gx + gateW * 0.5, 0.05, 0.95));
        }
        if (0.95 - cursor >= 0.07) {
          tryAdd(cursor, ry, 0.95 - cursor, wallH, 0.015);
        }
      };
      buildRampart(fortYTop);
      buildRampart(fortYBot);
      const midCount = Math.round(1 + dens * 2);
      for (let m = 0; m < midCount; m++) {
        const mw = 0.12 + rng() * 0.08;
        const mx = 0.10 + rng() * (0.80 - mw);
        const my = 0.36 + rng() * 0.12;
        tryAddMirror(mx, my, mw, 0.028, 0.04);
      }
    } else if (style === "chokepoints") {
      const lines = dens >= 0.65 ? [0.30, 0.50, 0.70] : [0.34, 0.66];
      for (const ly of lines) {
        const gaps = (ly === 0.50 || rng() < 0.5) ? 2 : 3;
        const gapW = 0.155 - dens * 0.025;
        const centers = [];
        for (let g = 0; g < gaps; g++) {
          centers.push(0.18 + ((g + 0.5) / gaps) * 0.64 + (rng() - 0.5) * 0.08);
        }
        centers.sort((a, b) => a - b);
        let cur = 0.04;
        for (const gc of centers) {
          const end = SP.clamp(gc - gapW * 0.5, 0.04, 0.96);
          if (end - cur >= 0.06) {
            tryAdd(cur, ly - 0.015, end - cur, 0.030, 0.015);
          }
          cur = Math.max(cur, SP.clamp(gc + gapW * 0.5, 0.04, 0.96));
        }
        if (0.96 - cur >= 0.06) {
          tryAdd(cur, ly - 0.015, 0.96 - cur, 0.030, 0.015);
        }
      }
    }
    return out;
  }

  function rebuildWallRects(wallList, targetArena) {
    for (const w of wallList) {
      w.x = targetArena.x + w.nx * targetArena.w;
      w.y = targetArena.y + w.ny * targetArena.h;
      w.w = Math.max(10, w.nw * targetArena.w);
      w.h = Math.max(10, w.nh * targetArena.h);
    }
  }

  function generateWallMap(forceNewSeed) {
    const st = SP.state;
    const ap = SP.activeParams;
    st.walls = [];
    if (!ap.walls_enabled) return;
    if (forceNewSeed || ap.wall_seed <= 0) {
      st.currentMapSeed = ap.wall_seed > 0 ? ap.wall_seed : SP.resolveSeedInt(0);
    } else {
      st.currentMapSeed = ap.wall_seed;
    }
    const norms = buildWallNorms(ap.wall_pattern, ap.wall_density, st.objId, st.currentMapSeed);
    const maxHp = Math.max(40, ap.wall_hp);
    for (const nr of norms) {
      st.walls.push({
        nx: nr.nx, ny: nr.ny, nw: nr.nw, nh: nr.nh,
        x: 0, y: 0, w: 0, h: 0,
        hp: maxHp, maxHp, hitFlash: 0, broken: false
      });
    }
    rebuildWallRects(st.walls, st.arena);
  }

  function clampArena(x, y, customRad) {
    const ar = SP.state.arena;
    const p = (customRad || SP.UNIT_RADIUS) + 6;
    return {
      x: SP.clamp(x, ar.x + p, ar.x + ar.w - p),
      y: SP.clamp(y, ar.y + p, ar.y + ar.h - p)
    };
  }

  function pushCircleOutOfWall(pos, rad, w) {
    const cx = SP.clamp(pos.x, w.x, w.x + w.w);
    const cy = SP.clamp(pos.y, w.y, w.y + w.h);
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rad * rad) return;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      const push = rad - d;
      pos.x += (dx / d) * push;
      pos.y += (dy / d) * push;
    } else {
      const dl = pos.x - w.x;
      const dr = w.x + w.w - pos.x;
      const dt = pos.y - w.y;
      const db = w.y + w.h - pos.y;
      const m = Math.min(dl, dr, dt, db);
      if (m === dl) pos.x = w.x - rad;
      else if (m === dr) pos.x = w.x + w.w + rad;
      else if (m === dt) pos.y = w.y - rad;
      else pos.y = w.y + w.h + rad;
    }
  }

  function pushOutOfWalls(x, y, rad) {
    const pos = clampArena(x, y, rad);
    const walls = SP.state.walls;
    if (!walls.length) return pos;
    for (let pass = 0; pass < 2; pass++) {
      for (const w of walls) {
        if (w.broken) continue;
        pushCircleOutOfWall(pos, rad, w);
      }
      const c = clampArena(pos.x, pos.y, rad);
      pos.x = c.x; pos.y = c.y;
    }
    return pos;
  }

  function pointInWall(x, y, pad) {
    const p = pad || 0;
    for (const w of SP.state.walls) {
      if (w.broken) continue;
      if (x >= w.x - p && x <= w.x + w.w + p && y >= w.y - p && y <= w.y + w.h + p) return true;
    }
    return false;
  }

  function segmentIntersectsRect(x1, y1, x2, y2, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    let t0 = 0, t1 = 1;
    const checks = [
      [-dx, x1 - r.x],
      [dx, r.x + r.w - x1],
      [-dy, y1 - r.y],
      [dy, r.y + r.h - y1]
    ];
    for (const [p, q] of checks) {
      if (Math.abs(p) < 1e-8) {
        if (q < 0) return false;
      } else {
        const t = q / p;
        if (p < 0) {
          if (t > t1) return false;
          if (t > t0) t0 = t;
        } else {
          if (t < t0) return false;
          if (t < t1) t1 = t;
        }
      }
    }
    return t0 <= t1;
  }

  function hasLineOfSight(x1, y1, x2, y2) {
    if (!SP.activeParams.wall_blocks_bullets || !SP.state.walls.length) return true;
    for (const w of SP.state.walls) {
      if (w.broken) continue;
      if (segmentIntersectsRect(x1, y1, x2, y2, w)) return false;
    }
    return true;
  }

  function steerAroundWalls(u, gx, gy) {
    const walls = SP.state.walls;
    if (!walls.length || (gx === 0 && gy === 0)) {
      u.wallSteerWall = null;
      return { x: gx, y: gy };
    }
    const gl = Math.hypot(gx, gy) || 1;
    const nx = gx / gl, ny = gy / gl;
    const pad = SP.UNIT_RADIUS + 4;
    const looks = [SP.UNIT_RADIUS + 6, SP.UNIT_RADIUS + 18];
    let hitW = null;
    for (const look of looks) {
      const px = u.x + nx * look;
      const py = u.y + ny * look;
      for (const w of walls) {
        if (w.broken) continue;
        if (px >= w.x - pad && px <= w.x + w.w + pad && py >= w.y - pad && py <= w.y + w.h + pad) {
          hitW = w;
          break;
        }
      }
      if (hitW) break;
    }
    if (!hitW) {
      u.wallSteerWall = null;
      return { x: gx, y: gy };
    }

    const w = hitW;
    const wcx = w.x + w.w * 0.5;
    const wcy = w.y + w.h * 0.5;
    // Choose a sticky slide direction along the wall face to prevent left/right oscillation
    let sign = (u.wallSteerWall === w && u.wallSteerSign) ? u.wallSteerSign : 0;
    if (w.w >= w.h) {
      if (!sign) {
        if (Math.abs(nx) > 0.28) sign = nx > 0 ? 1 : -1;
        else sign = u.x <= wcx ? -1 : 1;
      }
      // Flip if blocked on chosen slide side by arena border or another wall
      const probeX = u.x + sign * (SP.UNIT_RADIUS + 14);
      const ar = SP.state.arena;
      if (probeX < ar.x + SP.UNIT_RADIUS + 6 || probeX > ar.x + ar.w - SP.UNIT_RADIUS - 6 || pointInWall(probeX, u.y, SP.UNIT_RADIUS + 2)) {
        sign = -sign;
      }
      u.wallSteerWall = w;
      u.wallSteerSign = sign;
      return { x: sign * 1.0, y: ny * 0.12 };
    } else {
      if (!sign) {
        if (Math.abs(ny) > 0.28) sign = ny > 0 ? 1 : -1;
        else sign = u.y <= wcy ? -1 : 1;
      }
      const probeY = u.y + sign * (SP.UNIT_RADIUS + 14);
      const ar = SP.state.arena;
      if (probeY < ar.y + SP.UNIT_RADIUS + 6 || probeY > ar.y + ar.h - SP.UNIT_RADIUS - 6 || pointInWall(u.x, probeY, SP.UNIT_RADIUS + 2)) {
        sign = -sign;
      }
      u.wallSteerWall = w;
      u.wallSteerSign = sign;
      return { x: nx * 0.12, y: sign * 1.0 };
    }
  }

  function renderWalls(ctx) {
    const walls = SP.state.walls;
    if (!walls.length) return;
    const ap = SP.activeParams;
    const wBase = ap.wall_color;
    const wTop = SP.lightenHex(wBase, 0.22);
    const wDark = SP.darkenHex(wBase, 0.55);
    const wEdge = SP.lightenHex(wBase, 0.45);
    for (const w of walls) {
      if (w.broken) continue;
      ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
      ctx.fillRect(w.x + 3, w.y + 5, w.w, w.h);
      ctx.fillStyle = w.hitFlash > 0.2 ? "#e2f1ff" : wDark;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      const faceH = Math.max(4, w.h - 4);
      ctx.fillStyle = w.hitFlash > 0.2 ? "#ffffff" : wBase;
      ctx.fillRect(w.x + 1, w.y + 1, Math.max(2, w.w - 2), faceH);
      ctx.fillStyle = w.hitFlash > 0.2 ? "#ffffff" : wTop;
      ctx.fillRect(w.x + 2, w.y + 2, Math.max(2, w.w - 4), Math.min(5, faceH * 0.45));

      ctx.strokeStyle = wEdge;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);

      ctx.strokeStyle = "rgba(10, 16, 26, 0.35)";
      ctx.lineWidth = 1;
      if (w.w > w.h * 1.6 && w.w > 36) {
        const segs = Math.floor(w.w / 28);
        for (let s = 1; s < segs; s++) {
          const sx = w.x + (w.w * s) / segs;
          ctx.beginPath(); ctx.moveTo(sx, w.y + 2); ctx.lineTo(sx, w.y + faceH); ctx.stroke();
        }
      } else if (w.h > w.w * 1.6 && w.h > 36) {
        const segs = Math.floor(w.h / 28);
        for (let s = 1; s < segs; s++) {
          const sy = w.y + (w.h * s) / segs;
          ctx.beginPath(); ctx.moveTo(w.x + 2, sy); ctx.lineTo(w.x + w.w - 2, sy); ctx.stroke();
        }
      }

      if (ap.wall_destructible && w.hp < w.maxHp) {
        const ratio = SP.clamp(w.hp / w.maxHp, 0, 1);
        ctx.strokeStyle = "rgba(12, 18, 28, 0.72)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(w.x + w.w * 0.25, w.y + 2);
        ctx.lineTo(w.x + w.w * 0.5, w.y + w.h * 0.55);
        if (ratio < 0.55) ctx.lineTo(w.x + w.w * 0.78, w.y + w.h - 3);
        ctx.stroke();

        const bw = Math.min(34, w.w - 4);
        if (bw >= 12) {
          const bx = w.x + (w.w - bw) * 0.5;
          const by = w.y - 6;
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(bx, by, bw, 3);
          ctx.fillStyle = ratio > 0.5 ? "#fbbf24" : "#f87171";
          ctx.fillRect(bx, by, bw * ratio, 3);
        }
      }
    }
  }

  SP.walls = {
    isNormRectSafe,
    normRectsOverlap,
    buildWallNorms,
    rebuildWallRects,
    generateWallMap,
    clampArena,
    pushCircleOutOfWall,
    pushOutOfWalls,
    pointInWall,
    segmentIntersectsRect,
    hasLineOfSight,
    steerAroundWalls,
    renderWalls
  };
  SP.clampArena = clampArena;
})();
