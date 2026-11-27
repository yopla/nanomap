(function () {
  "use strict";
  const SP = window.StratPick = window.StratPick || {};
  let audioCtx = null;
  let lastShootMs = 0;

  function ensure() {
    const st = SP.state;
    if (!st.soundEnabled || st.destroyed) return null;
    if (!audioCtx && typeof window !== "undefined") {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      try { audioCtx.resume(); } catch (_e) {}
    }
    return audioCtx;
  }

  function emitState() {
    const st = SP.state;
    if (SP.dom && SP.dom.btnSound) {
      SP.dom.btnSound.textContent = st.soundEnabled ? "🔊" : "🔇";
    }
    if (typeof window !== "undefined" && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: "minigd_audio_state",
          id: SP.GAME_ID,
          enabled: !!st.soundEnabled
        }, "*");
      } catch (_e) {}
    }
  }

  function playSfx(type) {
    const st = SP.state;
    if (!st.soundEnabled || st.destroyed) return;
    const ac = ensure();
    if (!ac) return;
    const now = ac.currentTime;
    if (type === "shoot") {
      const ms = performance.now();
      if (ms - lastShootMs < 60) return;
      lastShootMs = ms;
    }
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    const jit = 0.94 + Math.random() * 0.12;
    if (type === "pickup") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(420 * jit, now);
      osc.frequency.exponentialRampToValueAtTime(880 * jit, now + 0.08);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc.start(now); osc.stop(now + 0.09);
    } else if (type === "drop") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(560 * jit, now);
      osc.frequency.exponentialRampToValueAtTime(240 * jit, now + 0.09);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === "full") {
      osc.type = "square";
      osc.frequency.setValueAtTime(290, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.1);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.start(now); osc.stop(now + 0.12);
    } else if (type === "shoot") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(760 * jit, now);
      osc.frequency.exponentialRampToValueAtTime(210 * jit, now + 0.05);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.start(now); osc.stop(now + 0.06);
    } else if (type === "ko") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240 * jit, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.13);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now); osc.stop(now + 0.145);
    } else if (type === "star") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(660 * jit, now);
      osc.frequency.exponentialRampToValueAtTime(1320 * jit, now + 0.13);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now); osc.stop(now + 0.145);
    } else if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.5, now + 0.3);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
      osc.start(now); osc.stop(now + 0.47);
    } else if (type === "lose") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.36);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now); osc.stop(now + 0.39);
    } else if (type === "step") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(260 * jit, now);
      osc.frequency.linearRampToValueAtTime(350 * jit, now + 0.045);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.055);
    } else if (type === "miss") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(340 * jit, now);
      osc.frequency.exponentialRampToValueAtTime(170 * jit, now + 0.09);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === "turn") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now); osc.stop(now + 0.23);
    } else if (type === "select") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(520 * jit, now);
      osc.frequency.exponentialRampToValueAtTime(720 * jit, now + 0.045);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.055);
    } else if (type === "order") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.setValueAtTime(680, now + 0.05);
      gain.gain.setValueAtTime(0.10, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now); osc.stop(now + 0.125);
    }
  }

  function close() {
    if (audioCtx) {
      try { audioCtx.close(); } catch (_e) {}
      audioCtx = null;
    }
  }

  SP.audio = { ensure, emitState, playSfx, close };
  SP.playSfx = playSfx;
  SP.ensureAudio = ensure;
  SP.emitAudioState = emitState;
})();
