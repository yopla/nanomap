// SDK commun MiniGD Assemblage (extensions/minigd/sdk.js)
// Mutualise tout le protocole postMessage (ready, config, pause, start, reset, destroy, stats, audio, résultat).
// Usage dans un MiniGD HTML :
//   <script src="../sdk.js"></script>
//   const sdk = window.AssemblageMiniGDSDK.create({
//     id: "mon_jeu",
//     defaultParams: { durationSec: 45 },
//     defaultTexts: { victoryTitle: "VICTOIRE !" },
//     onConfig(params, texts, meta) { ... },
//     onStart() { ... },
//     onPause(paused) { ... },
//     onReset() { ... },
//     onAction(action, payload) { ... },
//     onDestroy() { ... },
//   });
//   sdk.ready({ actionLabel: "⚡ ACTION" });
//   sdk.sendStats("Score 120 • 30s");
//   sdk.finish({ won: true, score: 120, stats: { ... } });
(() => {
  if (window.AssemblageMiniGDSDK) return;

  function readEmbeddedMeta() {
    const el = document.querySelector("script[data-spawn-minigame], script[data-minigd]");
    if (!el || !el.textContent) return {};
    try {
      const parsed = JSON.parse(el.textContent);
      return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (_e) {
      return {};
    }
  }

  function create(opts = {}) {
    const meta = Object.assign({}, readEmbeddedMeta(), opts.meta || {});
    const gameId = String(opts.id || meta.id || "minigd");
    const params = Object.assign({}, opts.defaultParams || {});
    const texts = Object.assign({}, opts.defaultTexts || {});
    const isEmbedded = Boolean(window.parent && window.parent !== window);
    let paused = isEmbedded;
    let destroyed = false;
    let audioEnabled = true;

    function postToHost(payload) {
      if (!isEmbedded || destroyed) return;
      try { window.parent.postMessage(payload, "*"); } catch (_e) {}
    }

    function applyConfig(nextParams, nextTexts, nextMeta) {
      if (nextMeta && typeof nextMeta === "object") Object.assign(meta, nextMeta);
      if (nextParams && typeof nextParams === "object") Object.assign(params, nextParams);
      if (nextTexts && typeof nextTexts === "object") Object.assign(texts, nextTexts);
      if (typeof opts.onConfig === "function") {
        try { opts.onConfig(params, texts, meta); } catch (e) { console.error(`[MiniGDSDK ${gameId}] onConfig`, e); }
      }
    }

    function setPaused(nextPaused) {
      const val = Boolean(nextPaused);
      if (paused === val) return;
      paused = val;
      if (typeof opts.onPause === "function") {
        try { opts.onPause(paused); } catch (e) { console.error(`[MiniGDSDK ${gameId}] onPause`, e); }
      }
    }

    const onMessage = (ev) => {
      const d = ev && ev.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "minigd_config" || d.type === "spawn_minigame_init") {
        applyConfig(d.params, d.texts, d.meta);
      } else if (d.type === "minigd_pause") {
        setPaused(true);
      } else if (d.type === "minigd_start") {
        setPaused(false);
        if (typeof opts.onStart === "function") {
          try { opts.onStart(); } catch (e) { console.error(`[MiniGDSDK ${gameId}] onStart`, e); }
        }
      } else if (d.type === "minigd_reset") {
        if (typeof opts.onReset === "function") {
          try { opts.onReset(); } catch (e) { console.error(`[MiniGDSDK ${gameId}] onReset`, e); }
        }
      } else if (d.type === "minigd_action") {
        if (typeof opts.onAction === "function") {
          try { opts.onAction(String(d.action || ""), d); } catch (e) { console.error(`[MiniGDSDK ${gameId}] onAction`, e); }
        }
      } else if (d.type === "minigd_toggle_audio") {
        audioEnabled = d.enabled !== undefined ? Boolean(d.enabled) : !audioEnabled;
        postToHost({ type: "minigd_audio_state", enabled: audioEnabled });
        if (typeof opts.onAudioToggle === "function") {
          try { opts.onAudioToggle(audioEnabled); } catch (_e) {}
        }
      } else if (d.type === "minigd_destroy") {
        destroyed = true;
        paused = true;
        window.removeEventListener("message", onMessage);
        if (typeof opts.onDestroy === "function") {
          try { opts.onDestroy(); } catch (_e) {}
        }
      }
    };
    window.addEventListener("message", onMessage);

    return {
      id: gameId,
      meta,
      params,
      texts,
      isEmbedded: () => isEmbedded,
      isPaused: () => paused,
      isAudioEnabled: () => audioEnabled,
      ready(extra = {}) {
        postToHost(Object.assign({ type: "minigd_ready", id: gameId, meta }, extra));
      },
      sendStats(text, extra = {}) {
        postToHost(Object.assign({ type: "minigd_stats", text: String(text || "") }, extra));
      },
      sendAudioState(enabled) {
        audioEnabled = Boolean(enabled);
        postToHost({ type: "minigd_audio_state", enabled: audioEnabled });
      },
      finish({ won = false, score = 0, stats = null, reason = "" } = {}) {
        postToHost({
          type: "spawn_minigame_result",
          id: gameId,
          won: Boolean(won),
          score: Number(score) || 0,
          stats: stats || {},
          reason: String(reason || ""),
        });
      },
      exit() {
        postToHost({ type: "minigd_exit", id: gameId });
      },
    };
  }

  window.AssemblageMiniGDSDK = { create, readEmbeddedMeta };
})();
