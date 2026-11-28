// Cadre de pré-chargement sur fond transparent pour le biome Les Marais.
// Chargé en priorité (data-preload="true") avant les autres modules du biome.
(function () {
  const M = (window.MaraisBiome = window.MaraisBiome || {});
  const STYLE_ID = "marais-loading-style";
  const OVERLAY_ID = "marais-loading-overlay";

  let overlayEl = null;
  let cardEl = null;
  let iconEl = null;
  let titleEl = null;
  let msgEl = null;
  let statusEl = null;

  function ensureDom() {
    if (typeof document === "undefined") return false;

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        #${OVERLAY_ID} {
          position: fixed;
          inset: 0;
          z-index: 960;
          display: none;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: transparent;
          pointer-events: auto;
        }
        #${OVERLAY_ID}.open {
          display: flex;
          animation: maraisLoadFadeIn 0.2s ease-out both;
        }
        #marais-loading-card {
          --marais-load-accent: #9be564;
          width: min(420px, 90vw);
          border-radius: 20px;
          padding: 22px 24px 20px;
          background: rgba(11, 22, 18, 0.72);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 2px solid var(--marais-load-accent);
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45), 0 0 28px rgba(155, 229, 100, 0.22);
          color: #eefcf4;
          text-align: center;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          animation: maraisLoadCardPop 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        #marais-loading-icon {
          font-size: 40px;
          line-height: 1.1;
          filter: drop-shadow(0 0 12px var(--marais-load-accent));
        }
        #marais-loading-title {
          font-size: 19px;
          font-weight: 800;
          color: #f3fff6;
          letter-spacing: 0.3px;
        }
        #marais-loading-msg {
          font-size: 13.5px;
          line-height: 1.45;
          color: rgba(226, 248, 232, 0.92);
          max-width: 340px;
        }
        .marais-loading-status-row {
          margin-top: 4px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(155, 229, 100, 0.14);
          border: 1px solid rgba(155, 229, 100, 0.42);
          font-size: 12.5px;
          font-weight: 700;
          color: var(--marais-load-accent);
        }
        .marais-loading-spinner {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid rgba(155, 229, 100, 0.28);
          border-top-color: var(--marais-load-accent);
          animation: maraisLoadSpin 0.8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes maraisLoadFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes maraisLoadCardPop {
          0% { opacity: 0; transform: translateY(16px) scale(0.94); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes maraisLoadSpin {
          to { transform: rotate(360deg); }
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    overlayEl = document.getElementById(OVERLAY_ID);
    if (!overlayEl) {
      overlayEl = document.createElement("div");
      overlayEl.id = OVERLAY_ID;
      overlayEl.setAttribute("role", "status");
      overlayEl.setAttribute("aria-live", "polite");
      overlayEl.setAttribute("aria-labelledby", "marais-loading-title");
      overlayEl.innerHTML = `
        <div id="marais-loading-card">
          <div id="marais-loading-icon">🪷</div>
          <div id="marais-loading-title">Chargement : Les Marais</div>
          <div id="marais-loading-msg">Ce biome est particulièrement riche et peut prendre quelques secondes à charger. Merci de patienter…</div>
          <div class="marais-loading-status-row">
            <span class="marais-loading-spinner" aria-hidden="true"></span>
            <span id="marais-loading-status">Préparation du biome…</span>
          </div>
        </div>
      `;
      (document.body || document.documentElement).appendChild(overlayEl);
    }

    cardEl = document.getElementById("marais-loading-card");
    iconEl = document.getElementById("marais-loading-icon");
    titleEl = document.getElementById("marais-loading-title");
    msgEl = document.getElementById("marais-loading-msg");
    statusEl = document.getElementById("marais-loading-status");
    return true;
  }

  function waitFrame() {
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      } else {
        setTimeout(resolve, 16);
      }
    });
  }

  async function show(biomeObj, statusText = "Chargement des modules du biome…") {
    if (!ensureDom()) return;
    const icon = biomeObj?.icon || "🪷";
    const name = biomeObj?.name || biomeObj?.id || "Les Marais";
    const accent = biomeObj?.accentColor || "#9be564";
    if (cardEl) cardEl.style.setProperty("--marais-load-accent", accent);
    if (iconEl) iconEl.textContent = icon;
    if (titleEl) titleEl.textContent = `Chargement : ${name}`;
    if (msgEl) {
      msgEl.textContent = "Ce biome est particulièrement riche et peut prendre quelques secondes à charger. Merci de patienter…";
    }
    if (statusEl) statusEl.textContent = statusText;
    overlayEl.classList.add("open");
    await waitFrame();
  }

  function update(statusText) {
    if (!ensureDom()) return;
    if (statusEl && statusText) statusEl.textContent = statusText;
  }

  function hide() {
    if (overlayEl) overlayEl.classList.remove("open");
  }

  const loadingApi = { show, update, hide, waitFrame };
  M.loading = loadingApi;

  if (typeof window !== "undefined") {
    window.AssemblageBiomePreloaders = window.AssemblageBiomePreloaders || {};
    window.AssemblageBiomePreloaders["marais/biome_marais"] = loadingApi;
    window.AssemblageBiomePreloaders["biome_marais"] = loadingApi;
  }
})();
