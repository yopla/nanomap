// Panneau Debug / Playtest (Ctrl+Shift+D ou ?debug=1).
(function () {
  const RT = (window.AssemblageRuntime = window.AssemblageRuntime || {});

  RT.initDebugPanel = function initDebugPanel(deps) {
    const getResolvedAnchorsById = deps.getResolvedAnchorsById;
    const getMiniGDManifest = deps.getMiniGDManifest;
    const getExtensionsData = deps.getExtensionsData;
    const getExtKey = deps.getExtKey;
    const getActiveExtensions = deps.getActiveExtensions;
    const getHostProgressApi = deps.getHostProgressApi;
    const getWorldEntitiesMap = deps.getWorldEntitiesMap;
    const getAlien = deps.getAlien;
    const getCam = deps.getCam;
    const updateChunks = deps.updateChunks;
    const showToast = deps.showToast;
    const getElementsList = deps.getElementsList;
    const addItem = deps.addItem;
    const renderShipUI = deps.renderShipUI;
    const saveCurrentSlot = deps.saveCurrentSlot;
    const syncUnlockedExtensions = deps.syncUnlockedExtensions;
    const getLockedBiomes = deps.getLockedBiomes;
    const getUnlockedBiomes = deps.getUnlockedBiomes;
    const getBiomes = deps.getBiomes;
    const renderBiomesView = deps.renderBiomesView;
    const deactivateExtension = deps.deactivateExtension;
    const unlockExtensionByFilename = deps.unlockExtensionByFilename;

    let dbgEl = null;

    function renderDebugPanel() {
      if (!dbgEl) return;
      const anchorsOpts = Array.from(getResolvedAnchorsById().values())
        .map((a) => `<option value="${a.id}">${a.emoji || "⚓"} ${a.id} (${a.xm}m, ${a.ym}m)</option>`).join("");
      const mgd = getMiniGDManifest();
      const gamesList = Array.isArray(mgd?.games) ? mgd.games : [];
      const mgdOpts = gamesList.flatMap((g) => {
        const base = [`<option value="${g.path}">${g.icon || "🕹️"} ${g.name || g.path}</option>`];
        if (Array.isArray(g.presets)) {
          for (const p of g.presets) base.push(`<option value="${g.path}#${p.id}">${p.icon || "⭐"} ${g.name} — ${p.name}</option>`);
        }
        return base;
      }).join("");
      const extsData = getExtensionsData();
      const extList = Array.isArray(extsData?.extensions) ? extsData.extensions : [];
      const activeExtensions = getActiveExtensions();
      const extRows = extList.map((e) => {
        const k = getExtKey(e);
        const active = activeExtensions.has(k);
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:2px 0;font-size:11.5px;">
          <span>${active ? "🟢" : "⚪"} ${e.icon || "🧩"} ${e.name || k}</span>
          <button type="button" data-dbg-ext="${k}" style="padding:2px 7px;border-radius:5px;border:1px solid #38d6ff;background:#12243a;color:#dff6ff;cursor:pointer;font-size:11px;">${active ? "Stop" : "Activer"}</button>
        </div>`;
      }).join("");
      const hostProgressApi = getHostProgressApi();
      dbgEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="color:#73fad1;">🛠️ Playtest Debug (Ctrl+Shift+D)</strong>
          <button type="button" data-dbg-close style="background:#26344d;color:#fff;border:0;border-radius:6px;padding:2px 8px;cursor:pointer;">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
          <div>
            <div style="color:#9fc4dc;margin-bottom:3px;">Téléporter sur une ancre :</div>
            <div style="display:flex;gap:5px;">
              <select data-dbg-anchor style="flex:1;background:#0d1729;color:#eefcff;border:1px solid #2b4c6e;border-radius:6px;padding:4px;">${anchorsOpts || "<option>Aucune</option>"}</select>
              <button type="button" data-dbg-tp style="padding:4px 9px;border-radius:6px;border:1px solid #73fad1;background:#13333d;color:#b8ffea;cursor:pointer;">TP</button>
            </div>
          </div>
          <div>
            <div style="color:#9fc4dc;margin-bottom:3px;">Lancer un MiniGD / Preset :</div>
            <div style="display:flex;gap:5px;">
              <select data-dbg-mgd style="flex:1;background:#0d1729;color:#eefcff;border:1px solid #2b4c6e;border-radius:6px;padding:4px;">${mgdOpts || "<option>Aucun</option>"}</select>
              <button type="button" data-dbg-launch style="padding:4px 9px;border-radius:6px;border:1px solid #38d6ff;background:#102944;color:#d6f4ff;cursor:pointer;">▶</button>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" data-dbg-give-all style="flex:1;padding:5px 8px;border-radius:6px;border:1px solid #ffd166;background:#2f2612;color:#ffe69b;cursor:pointer;">🎁 +5 tous éléments</button>
            <button type="button" data-dbg-unlock-biomes style="flex:1;padding:5px 8px;border-radius:6px;border:1px solid #9be564;background:#182e1b;color:#c9ff9e;cursor:pointer;">🌍 Débloquer biomes</button>
          </div>
          <div style="color:#9fc4dc;">Flags: ${Object.keys(hostProgressApi.getAllFlags()).length} • Stats: ${Object.keys(hostProgressApi.getAllStats()).length} • Entités: ${getWorldEntitiesMap().size}</div>
          <div style="max-height:150px;overflow:auto;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px;">${extRows}</div>
        </div>
      `;
      dbgEl.querySelector("[data-dbg-close]")?.addEventListener("click", toggleDebugPanel);
      dbgEl.querySelector("[data-dbg-tp]")?.addEventListener("click", () => {
        const aid = dbgEl.querySelector("[data-dbg-anchor]")?.value;
        const a = getResolvedAnchorsById().get(aid);
        if (a) {
          const alien = getAlien();
          const cam = getCam();
          alien.x = a.x;
          alien.y = a.y;
          cam.x = a.x;
          cam.y = a.y;
          updateChunks(a.x, a.y);
          showToast(`⚡ TP → ${a.id}`);
        }
      });
      dbgEl.querySelector("[data-dbg-launch]")?.addEventListener("click", () => {
        const target = dbgEl.querySelector("[data-dbg-mgd]")?.value;
        if (target && window.AssemblageMiniGD && typeof window.AssemblageMiniGD.launch === "function") {
          window.AssemblageMiniGD.launch(target);
        }
      });
      dbgEl.querySelector("[data-dbg-give-all]")?.addEventListener("click", () => {
        for (const el of getElementsList()) addItem(el.id, 5);
        renderShipUI();
        saveCurrentSlot(true);
        syncUnlockedExtensions(false);
        showToast("🎁 +5 de chaque élément !");
      });
      dbgEl.querySelector("[data-dbg-unlock-biomes]")?.addEventListener("click", () => {
        getLockedBiomes().clear();
        const unlocked = getUnlockedBiomes();
        for (const b of getBiomes()) if (b && b.id) unlocked.add(b.id);
        renderBiomesView();
        saveCurrentSlot(true);
        showToast("🌍 Tous les biomes débloqués !");
      });
      dbgEl.querySelectorAll("[data-dbg-ext]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const k = btn.dataset.dbgExt;
          if (getActiveExtensions().has(k)) deactivateExtension(k);
          else unlockExtensionByFilename(k, false);
          renderDebugPanel();
        });
      });
    }

    function toggleDebugPanel() {
      if (dbgEl) { dbgEl.remove(); dbgEl = null; return; }
      dbgEl = document.createElement("div");
      dbgEl.style.cssText = "position:fixed;bottom:14px;right:14px;z-index:9999;width:min(340px,calc(100vw - 28px));padding:12px;border-radius:12px;background:rgba(9,15,28,0.94);border:1px solid rgba(115,250,209,0.5);box-shadow:0 12px 32px rgba(0,0,0,0.65);color:#eefcff;font-family:system-ui,sans-serif;";
      document.body.appendChild(dbgEl);
      renderDebugPanel();
    }

    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggleDebugPanel();
      }
    });
    if (new URLSearchParams(window.location.search).get("debug") === "1") {
      setTimeout(toggleDebugPanel, 400);
    }

    return { toggleDebugPanel, renderDebugPanel };
  };
})();
