(function () {
  "use strict";
  const SP = window.StratPick = window.StratPick || {};
  SP.modes = SP.modes || {};

  const MODE_IDLE = 0;
  const MODE_PICKUP = 1;
  const MODE_DROP = 2;
  const HIT_RADIUS = 44;

  const pick = {
    handUnits: [],
    pickPaused: false,
    touchMode: MODE_IDLE,
    dropTimer: 0,
    lastDropPos: { x: 0, y: 0 },
    fullPulse: 0,

    buildPips() {
      const dom = SP.dom || {};
      if (!dom.handPipsEl) return;
      const cap = SP.activeParams.hand_capacity;
      dom.handPipsEl.innerHTML = "";
      for (let i = 0; i < cap; i++) {
        const d = document.createElement("div");
        d.className = "pip";
        dom.handPipsEl.appendChild(d);
      }
    },

    onEnter() {
      const dom = SP.dom;
      pick.pickPaused = false;
      dom.startTitleEl.textContent = "STRATPICK";
      dom.startHowEl.innerHTML =
        "• Touchez un <b>bleu</b> et maintenez pour <b>ASPIRER</b><br />" +
        "• Touchez le <b>sol vide</b> et maintenez pour <b>LÂCHER</b><br />" +
        "• Vos bonhommes tirent automatiquement !";
    },

    onPrepare() {
      pick.handUnits = [];
      pick.pickPaused = false;
      pick.touchMode = MODE_IDLE;
      pick.dropTimer = 0;
      pick.fullPulse = 0;
    },

    resetInput() {
      pick.touchMode = MODE_IDLE;
    },

    togglePause() {
      const st = SP.state;
      if (!st.running || st.gameMode !== "pick" || st.externalPaused || st.destroyed || st.menuOpen) return;
      pick.pickPaused = !pick.pickPaused;
      SP.playSfx(pick.pickPaused ? "pickup" : "drop");
      pick.syncHud(true);
      if (SP.render) SP.render();
    },

    absorbUnit(idx) {
      const st = SP.state;
      const ap = SP.activeParams;
      const u = st.units.splice(idx, 1)[0];
      pick.handUnits.push(u);
      st.trails.push({ fx: u.x, fy: u.y, tx: st.touchPos.x, ty: st.touchPos.y, t: 0, dur: 0.16, color: ap.player_color });
      SP.arena.spawnRing(u.x, u.y, ap.player_color, 5);
      SP.playSfx("pickup");
      if (pick.handUnits.length >= ap.hand_capacity) {
        pick.fullPulse = 0.4;
        SP.arena.spawnFloat(st.touchPos.x, st.touchPos.y - 28, "MAIN PLEINE !", "#ffd638");
      }
    },

    dropOneUnit(x, y) {
      const st = SP.state;
      const ap = SP.activeParams;
      if (!pick.handUnits.length) return;
      const u = pick.handUnits.pop();
      const p = SP.walls.pushOutOfWalls(x + SP.randRange(-10, 10), y + SP.randRange(-10, 10), SP.UNIT_RADIUS + 2);
      u.x = p.x; u.y = p.y; u.vx = 0; u.vy = 0;
      u.pop = 1.55;
      u.fireCd = Math.min(u.fireCd, 0.22);
      st.units.push(u);
      SP.arena.spawnRing(u.x, u.y, SP.lightenHex(ap.player_color, 0.45), 7);
      SP.playSfx("drop");
    },

    onPointerDown(pt) {
      const st = SP.state;
      const ap = SP.activeParams;
      const hit = SP.arena.findClosestAlly(pt.x, pt.y, HIT_RADIUS);
      if (hit !== -1) {
        if (pick.handUnits.length < ap.hand_capacity) {
          pick.touchMode = MODE_PICKUP;
          pick.absorbUnit(hit);
        } else {
          pick.touchMode = MODE_IDLE;
          pick.fullPulse = 0.45;
          SP.playSfx("full");
          SP.arena.spawnFloat(pt.x, pt.y - 24, "MAIN PLEINE !", "#ffd638");
        }
      } else if (pick.handUnits.length > 0) {
        pick.touchMode = MODE_DROP;
        pick.dropOneUnit(pt.x, pt.y);
        pick.dropTimer = ap.drop_interval;
        pick.lastDropPos = { x: pt.x, y: pt.y };
      } else {
        pick.touchMode = MODE_IDLE;
      }
    },

    onPointerMove() {},

    onPointerUp() {
      pick.touchMode = MODE_IDLE;
    },

    _handleTouchHold(dt) {
      const st = SP.state;
      const ap = SP.activeParams;
      if (!st.isTouching) return;
      if (pick.touchMode === MODE_PICKUP) {
        while (pick.handUnits.length < ap.hand_capacity) {
          const idx = SP.arena.findClosestAlly(st.touchPos.x, st.touchPos.y, ap.pickup_radius);
          if (idx === -1) break;
          pick.absorbUnit(idx);
        }
      } else if (pick.touchMode === MODE_DROP) {
        if (!pick.handUnits.length) {
          pick.touchMode = MODE_IDLE;
        } else {
          pick.dropTimer -= dt;
          if (pick.dropTimer <= 0 || SP.dist(st.touchPos.x, st.touchPos.y, pick.lastDropPos.x, pick.lastDropPos.y) >= 34) {
            pick.dropOneUnit(st.touchPos.x, st.touchPos.y);
            pick.dropTimer = ap.drop_interval;
            pick.lastDropPos = { x: st.touchPos.x, y: st.touchPos.y };
          }
        }
      }
    },

    update(dt) {
      const st = SP.state;
      st.animTime += dt;
      if (pick.fullPulse > 0) pick.fullPulse = Math.max(0, pick.fullPulse - dt);
      if (!st.running || st.externalPaused || st.destroyed || st.menuOpen) return;
      st.matchHasTicked = true;

      pick._handleTouchHold(dt);

      if (pick.pickPaused) {
        for (const u of st.units) {
          u.pop += (1 - u.pop) * Math.min(dt * 12, 1);
        }
        SP.arena.tickVfx(dt);
        pick.syncHud(false);
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

      dom.handPipsEl.style.display = "flex";
      dom.btnGlidePlay.classList.add("hidden");
      dom.btnPickPause.classList.toggle("hidden", !st.running);
      dom.btnPickPause.classList.toggle("paused", pick.pickPaused);
      dom.btnPickPause.textContent = pick.pickPaused ? "▶" : "⏸";
      dom.btnPickPause.title = pick.pickPaused ? "Reprendre la partie" : "Mettre en pause";
      dom.handLblEl.style.color = pick.pickPaused ? "#ffd638" : ap.player_color;
      const hc = pick.handUnits.length;
      const cap = ap.hand_capacity;
      dom.handLblEl.textContent = `MAIN ${hc} / ${cap}`;
      const pips = dom.handPipsEl.children;
      for (let i = 0; i < pips.length; i++) {
        pips[i].classList.toggle("filled", i < hc);
      }
      if (pick.pickPaused) {
        dom.hintLblEl.textContent = "⏸ PAUSE — Aspirez/lâchez vos bleus puis appuyez sur ▶";
        dom.hintLblEl.classList.add("full");
      } else if (hc >= cap) {
        dom.hintLblEl.textContent = "MAIN PLEINE ! Touchez le sol vide pour lâcher";
        dom.hintLblEl.classList.add("full");
      } else if (hc > 0) {
        dom.hintLblEl.textContent = "Touchez un bleu pour aspirer, ou le sol pour lâcher";
        dom.hintLblEl.classList.remove("full");
      } else {
        dom.hintLblEl.textContent = "Touchez un bonhomme bleu et glissez pour aspirer";
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
      if (!pick.pickPaused) return;
      const ar = st.arena;
      const pa = 0.55 + 0.25 * Math.sin(st.animTime * 5);
      ctx.fillStyle = "rgba(250, 210, 64, 0.06)";
      ctx.fillRect(ar.x, ar.y, ar.w, ar.h);
      ctx.strokeStyle = `rgba(250, 210, 64, ${pa})`;
      ctx.lineWidth = 3.5;
      ctx.strokeRect(ar.x, ar.y, ar.w, ar.h);
    },

    renderOverlay(ctx) {
      const st = SP.state;
      const ap = SP.activeParams;
      if (!st.isTouching && pick.fullPulse <= 0) return;
      const pCol = ap.player_color;
      const pDark = SP.darkenHex(pCol, 0.48);
      const pRgb = SP.hexToRgbStr(pCol);
      const isDrop = pick.touchMode === MODE_DROP;
      const col = (isDrop || pick.fullPulse > 0) ? "255,214,56" : pRgb;
      const rad = isDrop ? 36 : (pick.fullPulse > 0 && !st.isTouching ? 46 + (0.45 - pick.fullPulse) * 30 : ap.pickup_radius);

      if (st.isTouching) {
        ctx.fillStyle = `rgba(${col},0.12)`;
        ctx.beginPath(); ctx.arc(st.touchPos.x, st.touchPos.y, rad, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(${col},0.88)`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(st.touchPos.x, st.touchPos.y, rad, 0, Math.PI * 2); ctx.stroke();

        const hc = pick.handUnits.length;
        for (let i = 0; i < hc; i++) {
          const ang = st.animTime * 3.4 + (Math.PI * 2 * i) / Math.max(hc, 1);
          const ox = st.touchPos.x + Math.cos(ang) * (rad * 0.62);
          const oy = st.touchPos.y + Math.sin(ang) * (rad * 0.62);
          ctx.fillStyle = pDark;
          ctx.beginPath(); ctx.arc(ox, oy, 5.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = pCol;
          ctx.beginPath(); ctx.arc(ox, oy, 4.2, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.strokeStyle = `rgba(255,214,56,${Math.min(1, pick.fullPulse * 2)})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(st.touchPos.x, st.touchPos.y, rad, 0, Math.PI * 2); ctx.stroke();
      }
    },

    render(ctx) {
      SP.arena.renderRealtimeArena(ctx);
    }
  };

  SP.modes.pick = pick;
})();
