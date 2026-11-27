(function () {
  "use strict";
  const SP = window.StratPick = window.StratPick || {};
  SP.modes = SP.modes || {};

  const GLIDE_SELECT_RADIUS = 54;

  const glide = {
    glidePaused: false,
    glideDrawingUnits: [],
    glideActivePath: [],
    drawingPath: false,

    onEnter() {
      const dom = SP.dom;
      const st = SP.state;
      dom.startTitleEl.textContent = "STRATGLIDE";
      dom.startHowEl.innerHTML =
        "• Touchez un <b>bonhomme bleu</b> : le jeu se met en <b>PAUSE</b><br />" +
        "• Glissez le doigt pour dessiner des <b>FLÈCHES de déplacement</b><br />" +
        "• Appuyez sur <b>▶ PLAY</b> pour relancer la simulation !";
      const pickMod = SP.modes.pick;
      if (pickMod && pickMod.handUnits) {
        while (pickMod.handUnits.length) {
          const u = pickMod.handUnits.pop();
          const pos = SP.arena.getBaseSpawn(SP.TEAM_PLAYER, -1, 1);
          u.x = pos.x; u.y = pos.y; u.vx = 0; u.vy = 0;
          st.units.push(u);
        }
      }
    },

    onPrepare() {
      glide.glidePaused = false;
      glide.glideDrawingUnits = [];
      glide.glideActivePath = [];
      glide.drawingPath = false;
    },

    resetInput() {
      glide.glideDrawingUnits = [];
      glide.glideActivePath = [];
      glide.drawingPath = false;
    },

    resumeSimulation() {
      const st = SP.state;
      if (!st.running || st.gameMode !== "glide") return;
      if (glide.glidePaused) {
        glide.glidePaused = false;
        st.isTouching = false;
        glide.resetInput();
        SP.playSfx("drop");
        glide.syncHud(true);
      }
    },

    assignActivePath() {
      const units = SP.state.units;
      if (!glide.glideDrawingUnits.length || glide.glideActivePath.length < 2) return;
      const count = glide.glideDrawingUnits.length;
      for (let k = 0; k < count; k++) {
        const idx = glide.glideDrawingUnits[k];
        if (idx < 0 || idx >= units.length) continue;
        const u = units[idx];
        let offX = 0, offY = 0;
        if (count > 1) {
          const ang = (Math.PI * 2 * k) / count;
          offX = Math.cos(ang) * 22;
          offY = Math.sin(ang) * 22;
        }
        const newPath = [];
        for (let pi = 1; pi < glide.glideActivePath.length; pi++) {
          let wp = glide.glideActivePath[pi];
          if (pi === glide.glideActivePath.length - 1 && count > 1) {
            wp = SP.walls.pushOutOfWalls(wp.x + offX, wp.y + offY, SP.UNIT_RADIUS + 3);
          } else {
            wp = SP.walls.pushOutOfWalls(wp.x, wp.y, SP.UNIT_RADIUS + 3);
          }
          newPath.push({ x: wp.x, y: wp.y });
        }
        u.glidePath = newPath;
        u.glideStuckT = 0;
        u.glideBestD = Infinity;
        if (newPath.length) {
          const dx = newPath[0].x - u.x, dy = newPath[0].y - u.y;
          if (dx * dx + dy * dy > 4) u.aim = Math.atan2(dy, dx);
        }
      }
    },

    onPointerDown(pt) {
      const st = SP.state;
      if (!glide.glidePaused) {
        glide.glidePaused = true;
        SP.playSfx("pickup");
      }
      glide.glideDrawingUnits = [];
      glide.glideActivePath = [];
      const r2 = GLIDE_SELECT_RADIUS * GLIDE_SELECT_RADIUS;
      for (let i = 0; i < st.units.length; i++) {
        const u = st.units[i];
        if (u.team !== SP.TEAM_PLAYER) continue;
        if (SP.dist2(pt.x, pt.y, u.x, u.y) <= r2) {
          glide.glideDrawingUnits.push(i);
        }
      }
      if (!glide.glideDrawingUnits.length) {
        const closest = SP.arena.findClosestAlly(pt.x, pt.y, 95);
        if (closest !== -1) glide.glideDrawingUnits.push(closest);
      }
      if (glide.glideDrawingUnits.length) {
        glide.drawingPath = true;
        glide.glideActivePath.push(SP.walls.pushOutOfWalls(pt.x, pt.y, SP.UNIT_RADIUS + 3));
        for (const idx of glide.glideDrawingUnits) {
          st.units[idx].pop = 1.4;
          st.units[idx].glidePath = [];
          st.units[idx].glideStuckT = 0;
          st.units[idx].glideBestD = Infinity;
        }
      } else {
        glide.drawingPath = false;
      }
      glide.syncHud(true);
    },

    onPointerMove(pt) {
      if (!glide.drawingPath) return;
      const cp = SP.walls.pushOutOfWalls(pt.x, pt.y, SP.UNIT_RADIUS + 3);
      const last = glide.glideActivePath[glide.glideActivePath.length - 1];
      if (!last || SP.dist(last.x, last.y, cp.x, cp.y) >= 18) {
        glide.glideActivePath.push(cp);
        glide.assignActivePath();
      }
    },

    onPointerUp() {
      if (glide.drawingPath) {
        glide.assignActivePath();
        glide.resetInput();
        glide.syncHud(true);
      }
    },

    update(dt) {
      const st = SP.state;
      st.animTime += dt;
      if (!st.running || st.externalPaused || st.destroyed || st.menuOpen) return;
      st.matchHasTicked = true;

      if (glide.glidePaused) {
        for (const u of st.units) {
          u.pop += (1 - u.pop) * Math.min(dt * 12, 1);
        }
        SP.arena.tickVfx(dt);
        glide.syncHud(false);
        return;
      }

      SP.arena.updateRealtimeArena(dt);
    },

    syncHud(force) {
      const st = SP.state;
      const ap = SP.activeParams;
      const dom = SP.dom;
      const now = performance.now();
      if (!force && now - st.lastHudSync < 65) return;
      st.lastHudSync = now;
      const ps = Math.round(st.playerScore);
      const as = Math.round(st.aiScore);
      dom.pScoreEl.textContent = ps;
      dom.aScoreEl.textContent = as;
      dom.timerEl.textContent = SP.formatTime(st.timeLeft);
      dom.objBadgeEl.textContent = st.objInfo.name;

      dom.handPipsEl.style.display = "none";
      dom.btnPickPause.classList.add("hidden");
      dom.btnGlidePlay.classList.toggle("hidden", !glide.glidePaused || !st.running);
      let orders = 0, pAlive = 0;
      for (const u of st.units) {
        if (u.team === SP.TEAM_PLAYER) {
          pAlive++;
          if (u.glidePath && u.glidePath.length) orders++;
        }
      }
      if (glide.glidePaused) {
        dom.handLblEl.textContent = `⏸ PAUSE TACTIQUE (${orders}/${pAlive} flèches)`;
        dom.handLblEl.style.color = "#ffd638";
        dom.hintLblEl.textContent = "Glissez depuis vos bleus pour tracer des flèches, puis ▶ PLAY";
        dom.hintLblEl.classList.add("full");
      } else {
        dom.handLblEl.textContent = `🏹 GLIDE EN COURS (${orders} en mouvement)`;
        dom.handLblEl.style.color = ap.player_color;
        dom.hintLblEl.textContent = "Touchez l'arène pour mettre en PAUSE et tracer vos flèches";
        dom.hintLblEl.classList.remove("full");
      }

      if (st.isEmbedded && window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({
            type: "minigd_stats",
            id: SP.GAME_ID,
            text: `${st.objInfo.name} • Bleu ${ps} - ${as} Rouge • ${SP.formatTime(st.timeLeft)}`,
            over: Boolean(st.matchEnded)
          }, "*");
        } catch (_e) {}
      }
    },

    renderUnderUnits(ctx) {
      const st = SP.state;
      const ar = st.arena;
      const pRgb = SP.hexToRgbStr(SP.activeParams.player_color);
      if (glide.glidePaused) {
        const pa = 0.55 + 0.25 * Math.sin(st.animTime * 5);
        ctx.fillStyle = "rgba(250, 210, 64, 0.06)";
        ctx.fillRect(ar.x, ar.y, ar.w, ar.h);
        ctx.strokeStyle = `rgba(250, 210, 64, ${pa})`;
        ctx.lineWidth = 3.5;
        ctx.strokeRect(ar.x, ar.y, ar.w, ar.h);
      }

      for (let i = 0; i < st.units.length; i++) {
        const u = st.units[i];
        if (u.team !== SP.TEAM_PLAYER || !u.glidePath || !u.glidePath.length) continue;
        const isSel = glide.glideDrawingUnits.includes(i);
        const col = isSel ? "89, 235, 255" : pRgb;
        const alpha = (glide.glidePaused || isSel) ? 0.92 : 0.65;
        if (isSel) {
          ctx.strokeStyle = "rgba(255, 220, 72, 0.9)";
          ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.arc(u.x, u.y, SP.UNIT_RADIUS + 6, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.strokeStyle = `rgba(${col}, ${alpha})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(u.x, u.y);
        for (let wi = 0; wi < u.glidePath.length; wi++) {
          ctx.lineTo(u.glidePath[wi].x, u.glidePath[wi].y);
        }
        ctx.stroke();

        for (let wi = 0; wi < u.glidePath.length - 1; wi++) {
          ctx.fillStyle = `rgba(${col}, ${alpha * 0.85})`;
          ctx.beginPath(); ctx.arc(u.glidePath[wi].x, u.glidePath[wi].y, 3.2, 0, Math.PI * 2); ctx.fill();
        }

        const lastPt = u.glidePath[u.glidePath.length - 1];
        const fromPt = u.glidePath.length >= 2 ? u.glidePath[u.glidePath.length - 2] : u;
        const dx = lastPt.x - fromPt.x, dy = lastPt.y - fromPt.y;
        const d = Math.hypot(dx, dy);
        if (d > 2) {
          const nx = dx / d, ny = dy / d;
          const px = -ny, py = nx;
          const hs = 13;
          ctx.fillStyle = `rgba(255, 224, 77, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(lastPt.x + nx * 2, lastPt.y + ny * 2);
          ctx.lineTo(lastPt.x - nx * hs + px * hs * 0.58, lastPt.y - ny * hs + py * hs * 0.58);
          ctx.lineTo(lastPt.x - nx * hs - px * hs * 0.58, lastPt.y - ny * hs - py * hs * 0.58);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = `rgba(255, 224, 77, ${alpha * 0.9})`;
        ctx.beginPath(); ctx.arc(lastPt.x, lastPt.y, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    },

    renderOverlay(ctx) {
      const st = SP.state;
      if (!st.isTouching) return;
      const pRgb = SP.hexToRgbStr(SP.activeParams.player_color);
      const rad = GLIDE_SELECT_RADIUS * 0.55;
      ctx.fillStyle = `rgba(${pRgb}, 0.14)`;
      ctx.beginPath(); ctx.arc(st.touchPos.x, st.touchPos.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255, 220, 72, 0.85)";
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(st.touchPos.x, st.touchPos.y, rad, 0, Math.PI * 2); ctx.stroke();
    },

    render(ctx) {
      SP.arena.renderRealtimeArena(ctx);
    }
  };

  SP.modes.glide = glide;
})();
