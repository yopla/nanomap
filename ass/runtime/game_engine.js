// Moteur principal Assemblage (jeu, rendu Canvas 2D, sauvegardes, scénarios, extensions & boucle).
(async () => {
  const BOOT_DATA = window.__ASSEMBLAGE_BOOT_DATA || {};
  const SCENARIO_META = BOOT_DATA.scenarioMeta || { id: "base", name: "Campagne de base", assetBase: "" };
  const ASSET_BASE = String(SCENARIO_META?.assetBase || "");
  window.ASSEMBLAGE_ASSET_BASE = ASSET_BASE;
  window.ASSEMBLAGE_SCENARIO_ID = String(SCENARIO_META?.id || "base");

  // Mémorisation et reprise automatique du dernier scénario actif (évite de revenir au scénario d'origine à la réouverture)
  const LAST_SCENARIO_KEY = "assemblage_last_scenario_v1";
  const BOOT_SCENARIO_ID = String(SCENARIO_META?.id || "base");
  try {
    const bootUrlParams = new URLSearchParams(window.location.search);
    const isSwitched = bootUrlParams.get("switched") === "1";
    const isDirect = bootUrlParams.get("direct") === "1";
    const isRestart = bootUrlParams.get("restart") === "1";
    const hasTransferred = Boolean(window.__ASSEMBLAGE_TRANSFERRED_STATE);
    if (isSwitched || isDirect) {
      try { window.localStorage.setItem(LAST_SCENARIO_KEY, BOOT_SCENARIO_ID); } catch (_) {}
      try {
        bootUrlParams.delete("switched");
        bootUrlParams.delete("direct");
        const cleanQs = bootUrlParams.toString();
        const cleanUrl = `${window.location.pathname}${cleanQs ? `?${cleanQs}` : ""}${window.location.hash || ""}`;
        window.history.replaceState({}, "", cleanUrl);
      } catch (_) {}
    } else if (!isRestart && !hasTransferred && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
      let savedSid = "";
      try { savedSid = String(window.localStorage.getItem(LAST_SCENARIO_KEY) || "").trim(); } catch (_) {}
      if (savedSid && savedSid !== BOOT_SCENARIO_ID) {
        const enc = encodeURIComponent(savedSid);
        const candidates = savedSid === "base"
          ? (ASSET_BASE ? [`${ASSET_BASE}index.html`] : ["index.html"])
          : (ASSET_BASE ? [`../${enc}/index.html`] : [`scenarios/${enc}/index.html`, `export/web/scenarios/${enc}/index.html`]);
        for (const c of candidates) {
          try {
            const res = await fetch(c, { method: "HEAD", cache: "no-store" });
            if (res.ok) {
              const sep = c.includes("?") ? "&" : "?";
              window.location.replace(`${c}${sep}switched=1`);
              return;
            }
          } catch (_) {}
        }
        try { window.localStorage.setItem(LAST_SCENARIO_KEY, BOOT_SCENARIO_ID); } catch (_) {}
      }
    }
  } catch (_) {}

  const GAME_CONFIG = BOOT_DATA.gameConfig || {};
  let ELEMENTS_DATA = BOOT_DATA.elementsData || { version: 1, elements: [] };
  let EXTENSIONS_DATA = BOOT_DATA.extensionsData || { version: 1, extensions: [] };
  let ANCHORS_DATA = BOOT_DATA.anchorsData || { version: 1, anchors: [] };
  let TAGS_DATA = BOOT_DATA.tagsData || { version: 1, tags: [] };
  let ACTORS_DATA = BOOT_DATA.actorsData || { version: 1, actors: [] };
  let VISUAL_PACKS_MANIFEST = BOOT_DATA.visualPacksManifest || { version: 1, packs: [] };
  let MINIGD_MANIFEST = BOOT_DATA.minigdManifest || { version: 1, games: [] };
  window.AssemblageMiniGDManifest = MINIGD_MANIFEST;
  let VISUALS_LIBRARY = { version: 1, visuals: {} };
  let ANIMATIONS_LIBRARY = { version: 1, symbols: {} };


  const {
    AssemblageVisuals,
    fetchJsonNoCache,
    extractEmbeddedJsonFromHtml,
    fetchEmbeddedDataFromHtml,
  } = window.AssemblageRuntime.createVisualsLoader({
    getAssetBase: () => ASSET_BASE,
    getManifest: () => VISUAL_PACKS_MANIFEST,
    setManifest: (m) => { VISUAL_PACKS_MANIFEST = m; },
    getVisualsLibrary: () => VISUALS_LIBRARY,
    getAnimationsLibrary: () => ANIMATIONS_LIBRARY,
  });
  let lastRemoteCfgSnap = "";
  let lastRemoteElemsSnap = "";
  let lastRemoteExtsSnap = "";
  let lastRemoteAnchorsSnap = "";
  let lastRemoteActorsSnap = "";
  let lastRemoteTagsSnap = "";
  let lastRemoteVisualsManifestSnap = "";

  // En HTTP/HTTPS (ou pop-up blob avec <base href="http...">) : charge les JSON externes en priorité
  const canFetchRemoteJson = (
    window.location.protocol === "http:" ||
    window.location.protocol === "https:" ||
    (window.location.protocol === "blob:" && Boolean(document.querySelector('base[href^="http"]')))
  );
  if (canFetchRemoteJson) {
    const [remoteCfg, remoteElems, remoteExts, remoteAnchors, remoteActors, remoteTags, remotePacksManifest, remoteScenarioMiniGD, remoteGlobalMiniGD] = await Promise.all([
      fetchJsonNoCache("game_config.json"),
      fetchJsonNoCache("config/elements/elements_data.json"),
      fetchJsonNoCache("config/extensions.json"),
      fetchJsonNoCache("config/anchors.json"),
      fetchJsonNoCache("config/actors.json"),
      fetchJsonNoCache("config/tags.json"),
      fetchJsonNoCache("config/visuals/manifest.json"),
      fetchJsonNoCache("config/minigd_manifest.json"),
      fetchJsonNoCache(`${ASSET_BASE}extensions/minigd/manifest.json`),
    ]);
    const remoteMiniGDManifest = (remoteScenarioMiniGD && Array.isArray(remoteScenarioMiniGD.games)) ? remoteScenarioMiniGD : remoteGlobalMiniGD;
    if (remoteCfg && typeof remoteCfg === "object") {
      Object.assign(GAME_CONFIG, remoteCfg);
      lastRemoteCfgSnap = JSON.stringify(remoteCfg);
    }
    if (remoteElems && Array.isArray(remoteElems.elements)) {
      ELEMENTS_DATA = remoteElems;
      lastRemoteElemsSnap = JSON.stringify(remoteElems);
    }
    if (remoteExts && Array.isArray(remoteExts.extensions)) {
      EXTENSIONS_DATA = remoteExts;
      lastRemoteExtsSnap = JSON.stringify(remoteExts);
    }
    if (remoteAnchors && Array.isArray(remoteAnchors.anchors)) {
      ANCHORS_DATA = remoteAnchors;
      lastRemoteAnchorsSnap = JSON.stringify(remoteAnchors);
    }
    if (remoteActors && Array.isArray(remoteActors.actors)) {
      ACTORS_DATA = remoteActors;
      lastRemoteActorsSnap = JSON.stringify(remoteActors);
    }
    if (remoteTags && Array.isArray(remoteTags.tags)) {
      TAGS_DATA = remoteTags;
      lastRemoteTagsSnap = JSON.stringify(remoteTags);
    }
    if (remotePacksManifest && Array.isArray(remotePacksManifest.packs)) {
      AssemblageVisuals.setManifest(remotePacksManifest);
      lastRemoteVisualsManifestSnap = JSON.stringify(remotePacksManifest);
    }
    if (remoteMiniGDManifest && Array.isArray(remoteMiniGDManifest.games)) {
      MINIGD_MANIFEST = remoteMiniGDManifest;
      window.AssemblageMiniGDManifest = MINIGD_MANIFEST;
    }
    await AssemblageVisuals.preloadCore();
  }

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hintEl = document.getElementById("hint");
  const toastEl = document.getElementById("toast");
  const overlayEl = document.getElementById("ship-overlay");
  const shipTitleEl = document.getElementById("ship-title");
  const shipStatsEl = document.getElementById("ship-stats");
  const shipBackBtnEl = document.getElementById("ship-back-btn");
  const exitBtnEl = document.getElementById("exit-btn");
  const shipViewHubEl = document.getElementById("ship-view-hub");
  const shipViewCraftEl = document.getElementById("ship-view-craft");
  const shipViewBiomesEl = document.getElementById("ship-view-biomes");
  const shipViewSavesEl = document.getElementById("ship-view-saves");
  const hubBiomeBadgeEl = document.getElementById("hub-biome-badge");
  const hubCraftBtnEl = document.getElementById("hub-craft-btn");
  const hubBiomesBtnEl = document.getElementById("hub-biomes-btn");
  const hubSavesBtnEl = document.getElementById("hub-saves-btn");
  const biomesListEl = document.getElementById("biomes-list");
  const savesInfoEl = document.getElementById("saves-info");
  const savesFeedbackEl = document.getElementById("saves-feedback");
  const savesListEl = document.getElementById("saves-list");
  let savesFeedbackTimer = null;
  const saveNowBtnEl = document.getElementById("save-now-btn");
  const saveExportBtnEl = document.getElementById("save-export-btn");
  const saveImportBtnEl = document.getElementById("save-import-btn");
  const saveImportInputEl = document.getElementById("save-import-input");
  const slotAEl = document.getElementById("slot-a");
  const slotBEl = document.getElementById("slot-b");
  const assembleBtnEl = document.getElementById("assemble-btn");
  const benchFeedbackEl = document.getElementById("bench-feedback");
  const filterDiscoveredBtnEl = document.getElementById("filter-discovered-btn");
  const craftHintsBtnEl = document.getElementById("craft-hints-btn");
  const lvlBarEl = document.getElementById("lvl-bar");
  const gridWrapEl = document.querySelector("#ship-view-craft .grid-wrap");
  const elementsGridEl = document.getElementById("elements-grid");
  const emptyMsgEl = document.getElementById("empty-msg");
  const descPanelEl = document.getElementById("desc-panel");
  const descTitleEl = document.getElementById("desc-title");
  const descBodyEl = document.getElementById("desc-body");
  const descColRightEl = descPanelEl ? descPanelEl.querySelector(".desc-col-right") : null;
  const descDetailsBtnEl = document.getElementById("desc-details-btn");
  const descDetailsEl = document.getElementById("desc-details");
  const descRecipeEl = document.getElementById("desc-recipe");
  const descUsesBtnEl = document.getElementById("desc-uses-btn");
  const descUsesEl = document.getElementById("desc-uses");
  const descExtActionsEl = document.getElementById("desc-ext-actions");
  const extElementActions = [];
  const descCloseBtnEl = document.getElementById("desc-close-btn");
  const dragGhostEl = document.getElementById("drag-ghost");
  const settingsBtnEl = document.getElementById("settings-btn");
  const settingsOverlayEl = document.getElementById("settings-overlay");
  const settingsCloseBtnEl = document.getElementById("settings-close-btn");
  const joystickToggleEl = document.getElementById("joystick-toggle");
  const settingsReturnShipBtnEl = document.getElementById("settings-return-ship-btn");
  const settingsScenarioRowEl = document.getElementById("settings-scenario-row");
  const settingsScenarioSelectEl = document.getElementById("settings-scenario-select");
  const settingsScenarioConfirmEl = document.getElementById("settings-scenario-confirm");
  const settingsScenarioCancelBtnEl = document.getElementById("settings-scenario-cancel-btn");
  const settingsScenarioResumeBtnEl = document.getElementById("settings-scenario-resume-btn");
  const settingsScenarioRestartBtnEl = document.getElementById("settings-scenario-restart-btn");
  const settingsRestartBtnEl = document.getElementById("settings-restart-btn");
  const settingsRestartConfirmEl = document.getElementById("settings-restart-confirm");
  const settingsRestartCancelBtnEl = document.getElementById("settings-restart-cancel-btn");
  const settingsRestartConfirmBtnEl = document.getElementById("settings-restart-confirm-btn");

  // Elements & Recipes index (base + couche d'éléments ajoutés par les extensions actives)
  let BASE_ELEMENTS_DATA = ELEMENTS_DATA;
  const extensionElementsByFile = new Map(); // extKey -> Array<Element>
  const knownExtensionElementIdsByExt = new Map(); // extKey -> Set<elementId> (protège l'inventaire si l'extension est temporairement inactive)
  let pendingChunkRefresh = false;
  let elementsList = [];
  const elementsById = new Map();
  const recipeMap = new Map();
  const tagRecipes = [];
  const level1Elements = [];
  let maxElementLevel = 1;
  const pairKey = (a, b) => (a <= b ? `${a}|${b}` : `${b}|${a}`);
  const isTagIngredient = (ing) => String(ing || "").trim().startsWith("#");
  function elementMatchesIngredient(el, ing) {
    if (!el || !ing) return false;
    const s = String(ing).trim();
    if (s.startsWith("#")) {
      const tid = s.replace(/^#+/, "").trim();
      return Boolean(tid) && itemMatchesTag(el, tid);
    }
    return el.id === s;
  }
  function findRecipeResult(idA, idB) {
    if (!idA || !idB) return "";
    const exact = recipeMap.get(pairKey(idA, idB));
    if (exact) return exact;
    const elA = elementsById.get(idA);
    const elB = elementsById.get(idB);
    if (!elA || !elB) return "";
    for (const tr of tagRecipes) {
      const direct = elementMatchesIngredient(elA, tr.ingA) && elementMatchesIngredient(elB, tr.ingB);
      const swapped = elementMatchesIngredient(elA, tr.ingB) && elementMatchesIngredient(elB, tr.ingA);
      if (direct || swapped) return tr.resultId;
    }
    return "";
  }

  function sanitizeExtensionElement(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = String(raw.id || "").trim();
    if (!id) return null;
    const lvl = Math.max(1, Math.floor(Number(raw.level) || 1));
    const recipe = Array.isArray(raw.recipe)
      ? raw.recipe.map(r => String(r || "").trim()).filter(Boolean)
      : [];
    const biome = lvl === 1 ? (String(raw.biome || "").trim() || "plaine_astrale") : String(raw.biome || "").trim();
    const out = {
      id,
      name: String(raw.name || id).trim(),
      level: lvl,
      biome,
      icon: String(raw.icon || "🔹").trim(),
      color: String(raw.color || "#66d9ff").trim(),
      description: String(raw.description || "").trim(),
      recipe,
      tags: Array.isArray(raw.tags) ? raw.tags.map(t => String(t || "").trim()).filter(Boolean) : [],
    };
    if (Array.isArray(raw.biomes)) out.biomes = raw.biomes.map(b => String(b || "").trim()).filter(Boolean);
    if (Array.isArray(raw.biomeSpawns)) out.biomeSpawns = raw.biomeSpawns;
    if (raw.visualId) out.visualId = String(raw.visualId).trim();
    if (raw.animationId) out.animationId = String(raw.animationId).trim();
    return out;
  }

  function rebuildElementsIndex() {
    const mergedById = new Map();
    const baseList = Array.isArray(BASE_ELEMENTS_DATA?.elements) ? BASE_ELEMENTS_DATA.elements : [];
    for (const el of baseList) {
      if (el && el.id) mergedById.set(el.id, el);
    }
    for (const extEls of extensionElementsByFile.values()) {
      if (!Array.isArray(extEls)) continue;
      for (const el of extEls) {
        if (el && el.id) mergedById.set(el.id, el);
      }
    }
    elementsList = Array.from(mergedById.values());
    ELEMENTS_DATA = {
      version: Number(BASE_ELEMENTS_DATA?.version || 1),
      spriteSheet: String(BASE_ELEMENTS_DATA?.spriteSheet || "").trim(),
      elements: elementsList,
    };
    elementsById.clear();
    recipeMap.clear();
    tagRecipes.length = 0;
    level1Elements.length = 0;
    maxElementLevel = 1;
    for (const el of elementsList) {
      if (!el || !el.id) continue;
      elementsById.set(el.id, el);
      maxElementLevel = Math.max(maxElementLevel, Number(el.level) || 1);
      if (Number(el.level) === 1) level1Elements.push(el);
      if (Array.isArray(el.recipe) && el.recipe.length === 2) {
        const ra = String(el.recipe[0] || "").trim();
        const rb = String(el.recipe[1] || "").trim();
        if (isTagIngredient(ra) || isTagIngredient(rb)) {
          const spec = (isTagIngredient(ra) ? 0 : 1) + (isTagIngredient(rb) ? 0 : 1);
          tagRecipes.push({ resultId: el.id, ingA: ra, ingB: rb, specificity: spec });
        } else {
          const k = pairKey(ra, rb);
          if (!recipeMap.has(k)) recipeMap.set(k, el.id);
        }
      }
    }
    tagRecipes.sort((x, y) => y.specificity - x.specificity);
    ensureElementsSpriteSheetLoaded();
    ensureBiomesSpriteSheetLoaded();
  }

  function getActiveElementsSpriteSheetId() {
    return String(ELEMENTS_DATA?.spriteSheet || BASE_ELEMENTS_DATA?.spriteSheet || "").trim();
  }

  function isPixelSpriteSheet(sheetId, entry) {
    if (String(sheetId || "").toLowerCase().includes("pixel")) return true;
    const tags = entry && entry.meta && Array.isArray(entry.meta.tags) ? entry.meta.tags : [];
    return tags.some(t => String(t).toLowerCase() === "pixel_art" || String(t).toLowerCase() === "pixel");
  }

  let _loadingElemSheetId = "";
  function ensureElementsSpriteSheetLoaded(forceReload = false) {
    const sheetId = getActiveElementsSpriteSheetId();
    if (!sheetId || !window.AssemblageVisuals) return;
    const cached = window.AssemblageVisuals.getSpriteSheet(sheetId);
    if (cached && !forceReload) return;
    if (_loadingElemSheetId === sheetId && !forceReload) return;
    _loadingElemSheetId = sheetId;
    const loader = forceReload
      ? window.AssemblageVisuals.reloadSpriteSheet(sheetId)
      : window.AssemblageVisuals.ensureSpriteSheet(sheetId);
    Promise.resolve(loader).then((ok) => {
      if (_loadingElemSheetId === sheetId) _loadingElemSheetId = "";
      if (ok && typeof uiOpen !== "undefined" && uiOpen && typeof renderShipUI === "function") {
        renderShipUI();
      }
    });
  }

  function getElementSpriteInfo(elOrId) {
    const el = (typeof elOrId === "string") ? elementsById.get(elOrId) : elOrId;
    if (!el || !window.AssemblageVisuals) return null;
    const sheetId = getActiveElementsSpriteSheetId();
    if (!sheetId) return null;
    const entry = window.AssemblageVisuals.getSpriteSheet(sheetId);
    if (!entry || !entry.img || !entry.framesById) {
      ensureElementsSpriteSheetLoaded();
      return null;
    }
    const frameId = String(el.spriteFrame || el.id || "").trim();
    const frame = entry.framesById.get(frameId);
    if (!frame) return null;
    return {
      sheetId,
      entry,
      frame,
      frameId,
      isPixel: isPixelSpriteSheet(sheetId, entry),
    };
  }
  function escapeHtmlText(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderElementIconHtml(el, sizePx = 32, extraClass = "") {
    if (!el) return "";
    const info = getElementSpriteInfo(el);
    if (!info) return escapeHtmlText(el.icon || "🔹");
    const { entry, frame, isPixel } = info;
    const imgW = entry.img.naturalWidth || entry.img.width || 1;
    const imgH = entry.img.naturalHeight || entry.img.height || 1;
    const fw = Math.max(1, Number(frame.w || 1));
    const fh = Math.max(1, Number(frame.h || 1));
    const scale = sizePx / Math.max(fw, fh);
    const dispW = (fw * scale).toFixed(2);
    const dispH = (fh * scale).toFixed(2);
    const bgW = (imgW * scale).toFixed(2);
    const bgH = (imgH * scale).toFixed(2);
    const bgX = (-Number(frame.x || 0) * scale).toFixed(2);
    const bgY = (-Number(frame.y || 0) * scale).toFixed(2);
    const cls = `el-sprite${isPixel ? " pixelated" : ""}${extraClass ? " " + extraClass : ""}`;
    const safeUrl = String(entry.imgUrl || entry.img.src || "").replace(/"/g, "&quot;");
    return `<span class="${cls}" style="width:${dispW}px;height:${dispH}px;background-image:url(&quot;${safeUrl}&quot;);background-size:${bgW}px ${bgH}px;background-position:${bgX}px ${bgY}px;" aria-hidden="true"></span>`;
  }

  function getActiveBiomesSpriteSheetId() {
    if (GAME_CONFIG && Object.prototype.hasOwnProperty.call(GAME_CONFIG, "biomesSpriteSheet")) {
      return String(GAME_CONFIG.biomesSpriteSheet || "").trim();
    }
    return "biomes_icons";
  }

  let _loadingBiomesSheetId = "";
  function ensureBiomesSpriteSheetLoaded(forceReload = false) {
    const sheetId = getActiveBiomesSpriteSheetId();
    if (!sheetId || !window.AssemblageVisuals) return;
    const cached = window.AssemblageVisuals.getSpriteSheet(sheetId);
    if (cached && !forceReload) return;
    if (_loadingBiomesSheetId === sheetId && !forceReload) return;
    _loadingBiomesSheetId = sheetId;
    const loader = forceReload
      ? window.AssemblageVisuals.reloadSpriteSheet(sheetId)
      : window.AssemblageVisuals.ensureSpriteSheet(sheetId);
    Promise.resolve(loader).then((ok) => {
      if (_loadingBiomesSheetId === sheetId) _loadingBiomesSheetId = "";
      if (ok && typeof uiOpen !== "undefined" && uiOpen && typeof renderShipUI === "function") {
        renderShipUI();
      }
    });
  }

  function getBiomeSpriteInfo(bOrId) {
    const b = (typeof bOrId === "string")
      ? (Array.isArray(BIOMES) ? BIOMES.find(x => x && x.id === bOrId) : null)
      : bOrId;
    if (!b || !window.AssemblageVisuals) return null;
    const sheetId = getActiveBiomesSpriteSheetId();
    if (!sheetId) return null;
    const entry = window.AssemblageVisuals.getSpriteSheet(sheetId);
    if (!entry || !entry.img || !entry.framesById) {
      ensureBiomesSpriteSheetLoaded();
      return null;
    }
    const frameId = String(b.spriteFrame || b.id || "").trim();
    const frame = entry.framesById.get(frameId);
    if (!frame) return null;
    return {
      sheetId,
      entry,
      frame,
      frameId,
      isPixel: isPixelSpriteSheet(sheetId, entry),
    };
  }

  function renderBiomeIconHtml(b, sizePx = 56, extraClass = "", fallbackIcon = "🌍") {
    if (!b) return escapeHtmlText(fallbackIcon);
    const info = getBiomeSpriteInfo(b);
    if (!info) return escapeHtmlText(b.icon || fallbackIcon);
    const { entry, frame, isPixel } = info;
    const imgW = entry.img.naturalWidth || entry.img.width || 1;
    const imgH = entry.img.naturalHeight || entry.img.height || 1;
    const fw = Math.max(1, Number(frame.w || 1));
    const fh = Math.max(1, Number(frame.h || 1));
    const scale = sizePx / Math.max(fw, fh);
    const dispW = (fw * scale).toFixed(2);
    const dispH = (fh * scale).toFixed(2);
    const bgW = (imgW * scale).toFixed(2);
    const bgH = (imgH * scale).toFixed(2);
    const bgX = (-Number(frame.x || 0) * scale).toFixed(2);
    const bgY = (-Number(frame.y || 0) * scale).toFixed(2);
    const cls = `biome-sprite${isPixel ? " pixelated" : ""}${extraClass ? " " + extraClass : ""}`;
    const safeUrl = String(entry.imgUrl || entry.img.src || "").replace(/"/g, "&quot;");
    return `<span class="${cls}" style="width:${dispW}px;height:${dispH}px;background-image:url(&quot;${safeUrl}&quot;);background-size:${bgW}px ${bgH}px;background-position:${bgX}px ${bgY}px;" aria-hidden="true"></span>`;
  }

  function formatBiomeInlineHtml(bOrId, sizePx = 18) {
    const b = (typeof bOrId === "string")
      ? (Array.isArray(BIOMES) ? BIOMES.find(x => x && x.id === bOrId) : null)
      : bOrId;
    if (!b) return escapeHtmlText(typeof bOrId === "string" ? bOrId : "");
    return `${renderBiomeIconHtml(b, sizePx, "el-sprite-inline")} ${escapeHtmlText(b.name || b.id || "")}`;
  }

  function formatElementInlineHtml(elOrId, sizePx = 18) {
    const el = (typeof elOrId === "string") ? elementsById.get(elOrId) : elOrId;
    if (!el) return escapeHtmlText(typeof elOrId === "string" ? elOrId : "");
    return `${renderElementIconHtml(el, sizePx, "el-sprite-inline")} ${escapeHtmlText(el.name || el.id || "")}`;
  }

  function formatRichElementTextHtml(text, sizePx = 18) {
    const raw = String(text ?? "");
    const re = /\{\{(el|el_icon|biome|biome_icon):([^}]+)\}\}/g;
    let out = "";
    let last = 0;
    let m;
    while ((m = re.exec(raw)) !== null) {
      if (m.index > last) out += escapeHtmlText(raw.slice(last, m.index));
      const kind = m[1];
      const targetId = String(m[2] || "").trim();
      if (kind === "biome_icon") {
        const b = Array.isArray(BIOMES) ? BIOMES.find(x => x && x.id === targetId) : null;
        out += b ? renderBiomeIconHtml(b, sizePx, "el-sprite-inline") : escapeHtmlText(targetId);
      } else if (kind === "biome") {
        out += formatBiomeInlineHtml(targetId, sizePx);
      } else if (kind === "el_icon") {
        const el = elementsById.get(targetId);
        out += el ? renderElementIconHtml(el, sizePx, "el-sprite-inline") : escapeHtmlText(targetId);
      } else {
        const el = elementsById.get(targetId);
        out += formatElementInlineHtml(el || targetId, sizePx);
      }
      last = m.index + m[0].length;
    }
    if (last < raw.length) out += escapeHtmlText(raw.slice(last));
    return out;
  }

  window.AssemblageBiomes = {
    getActiveSpriteSheetId: getActiveBiomesSpriteSheetId,
    getSpriteInfo: (bOrId) => getBiomeSpriteInfo(bOrId),
    renderIconHtml: (bOrId, sizePx = 32, extraClass = "") => {
      const b = (typeof bOrId === "string")
        ? (Array.isArray(BIOMES) ? BIOMES.find(x => x && x.id === bOrId) : null)
        : bOrId;
      return renderBiomeIconHtml(b, sizePx, extraClass);
    },
    formatInlineHtml: (bOrId, sizePx = 18) => formatBiomeInlineHtml(bOrId, sizePx),
  };

  window.AssemblageElements = {
    getActiveSpriteSheetId: getActiveElementsSpriteSheetId,
    getSpriteInfo: (elOrId) => getElementSpriteInfo(elOrId),
    renderIconHtml: (elOrId, sizePx = 24, extraClass = "") => {
      const el = (typeof elOrId === "string") ? elementsById.get(elOrId) : elOrId;
      return renderElementIconHtml(el, sizePx, extraClass);
    },
    formatInlineHtml: (elOrId, sizePx = 18) => formatElementInlineHtml(elOrId, sizePx),
    formatRichTextHtml: (text, sizePx = 18) => formatRichElementTextHtml(text, sizePx),
  };
  rebuildElementsIndex();

  function refreshWorldAndUiAfterElementsChange({ pruneState = false, refreshChunks = true } = {}) {
    rebuildElementsIndex();
    if (typeof getSpawnableElementsForBiome === "function") {
      activeLevel1Elements = getSpawnableElementsForBiome(activeBiomeId);
    } else if (typeof getLevel1ElementsForBiome === "function") {
      activeLevel1Elements = getLevel1ElementsForBiome(activeBiomeId);
    }
    let statePruned = false;
    if (pruneState) {
      const protectedExtIds = new Set();
      const enabledKeys = new Set();
      const curExts = Array.isArray(EXTENSIONS_DATA?.extensions) ? EXTENSIONS_DATA.extensions : [];
      for (const ed of curExts) {
        if (!ed || ed.enabled === false) continue;
        const k = (typeof getExtKey === "function") ? getExtKey(ed) : String(ed.id || ed.filename || "");
        if (k) enabledKeys.add(k);
        if (ed.filename) enabledKeys.add(String(ed.filename));
      }
      for (const [extKey, idSet] of knownExtensionElementIdsByExt.entries()) {
        if (enabledKeys.has(extKey)) {
          for (const eid of idSet) protectedExtIds.add(eid);
        }
      }
      for (const id of Array.from(inventory.keys())) {
        if (!elementsById.has(id) && !protectedExtIds.has(id)) {
          inventory.delete(id);
          statePruned = true;
        }
      }
      for (const id of Array.from(discovered.values())) {
        if (!elementsById.has(id) && !protectedExtIds.has(id)) {
          discovered.delete(id);
          statePruned = true;
        }
      }
      for (const pair of Array.from(failedRecipes.values())) {
        const sep = pair.indexOf("|");
        if (sep <= 0 || sep >= pair.length - 1) {
          failedRecipes.delete(pair);
          statePruned = true;
          continue;
        }
        const a = pair.slice(0, sep);
        const b = pair.slice(sep + 1);
        const missingA = !elementsById.has(a) && !protectedExtIds.has(a);
        const missingB = !elementsById.has(b) && !protectedExtIds.has(b);
        if (missingA || missingB || findRecipeResult(a, b)) {
          failedRecipes.delete(pair);
          statePruned = true;
        }
      }
      if (slotA && !elementsById.has(slotA)) slotA = "";
      if (slotB && !elementsById.has(slotB)) slotB = "";
      if (inspectedId && !elementsById.has(inspectedId)) inspectedId = "";
      if (statePruned && typeof saveCurrentSlot === "function") saveCurrentSlot(true);
    }
    if (refreshChunks && typeof chunks !== "undefined" && typeof updateChunks === "function" && typeof alien !== "undefined") {
      chunks.clear();
      lastCenterKey = "";
      updateChunks(alien.x, alien.y);
    }
    if (typeof uiOpen !== "undefined" && uiOpen && typeof renderShipUI === "function") {
      renderShipUI();
    }
    return statePruned;
  }

  const inventory = new Map();
  const discovered = new Set();

  // Option 1 + 2 : Bitmask par chunk + LRU borné avant repousse + chunks pérennes (habillages)
  let MAX_COLLECTED_CHUNKS = Math.max(0, Math.floor(Number(GAME_CONFIG.maxCollectedChunks ?? 1000)));
  let MAX_DECORATED_CHUNKS = Math.max(0, Math.floor(Number(GAME_CONFIG.maxDecoratedChunks ?? 500)));
  const collectedChunks = new Map(); // "biomeId|cx,cy" -> bitmask
  const collectedChunkOrder = []; // LRU (plus ancien en tête, plus récent en queue)
  const pinnedChunks = new Map(); // "biomeId|cx,cy" -> Set<ownerKey>

  function makeChunkMaskKey(biomeId, cx, cy) {
    return `${biomeId}|${cx},${cy}`;
  }
  function getEffectiveCollectedChunksLimit() {
    return Math.max(0, MAX_COLLECTED_CHUNKS - pinnedChunks.size);
  }
  function getChunkMask(biomeId, cx, cy) {
    if (pinnedChunks.has(makeChunkMaskKey(biomeId, cx, cy))) return 0x7FFFFFFF;
    if (MAX_COLLECTED_CHUNKS <= 0) return 0;
    return collectedChunks.get(makeChunkMaskKey(biomeId, cx, cy)) || 0;
  }
  function enforceCollectedChunksLimit() {
    const limit = getEffectiveCollectedChunksLimit();
    if (limit <= 0) {
      collectedChunks.clear();
      collectedChunkOrder.length = 0;
      return;
    }
    while (collectedChunkOrder.length > limit) {
      const evicted = collectedChunkOrder.shift();
      collectedChunks.delete(evicted);
    }
  }
  function markPickupCollected(biomeId, cx, cy, pickupIdx) {
    const key = makeChunkMaskKey(biomeId, cx, cy);
    if (pinnedChunks.has(key)) return;
    if (getEffectiveCollectedChunksLimit() <= 0 || pickupIdx < 0 || pickupIdx > 30) return;
    const prev = collectedChunks.get(key) || 0;
    collectedChunks.set(key, prev | (1 << pickupIdx));
    const idx = collectedChunkOrder.indexOf(key);
    if (idx >= 0) collectedChunkOrder.splice(idx, 1);
    collectedChunkOrder.push(key);
    enforceCollectedChunksLimit();
  }
  function isChunkPinned(biomeId, cx, cy) {
    return pinnedChunks.has(makeChunkMaskKey(biomeId, cx, cy));
  }
  function isChunkPinnedByOther(biomeId, cx, cy, excludeOwnerKey) {
    const owners = pinnedChunks.get(makeChunkMaskKey(biomeId, cx, cy));
    if (!owners || owners.size === 0) return false;
    for (const ow of owners) {
      if (ow !== excludeOwnerKey) return true;
    }
    return false;
  }
  function getPinnedChunkKeys(biomeId = activeBiomeId) {
    const prefix = `${String(biomeId || "")}|`;
    const out = [];
    for (const key of pinnedChunks.keys()) {
      if (!key.startsWith(prefix)) continue;
      const parts = key.slice(prefix.length).split(",");
      if (parts.length === 2) {
        out.push({ cx: Number(parts[0]) | 0, cy: Number(parts[1]) | 0 });
      }
    }
    return out;
  }
  function refreshLoadedChunksForKeys(keysSet) {
    if (!keysSet || keysSet.size === 0) return;
    const prefix = `${activeBiomeId}|`;
    for (const fullKey of keysSet) {
      if (!fullKey.startsWith(prefix)) continue;
      const coordKey = fullKey.slice(prefix.length);
      if (!chunks.has(coordKey)) continue;
      const parts = coordKey.split(",");
      if (parts.length !== 2) continue;
      chunks.set(coordKey, generateChunk(Number(parts[0]) | 0, Number(parts[1]) | 0));
    }
  }
  function setPinnedChunksForOwner(ownerKey, chunkList) {
    const owner = String(ownerKey || "").trim();
    if (!owner) return;
    const touched = new Set();
    for (const [key, owners] of Array.from(pinnedChunks.entries())) {
      if (owners.has(owner)) {
        owners.delete(owner);
        touched.add(key);
        if (owners.size === 0) pinnedChunks.delete(key);
      }
    }
    if (Array.isArray(chunkList)) {
      for (const item of chunkList) {
        if (!item) continue;
        const bid = String(item.biomeId || activeBiomeId || "");
        if (!bid) continue;
        const cx = Number(item.cx) | 0;
        const cy = Number(item.cy) | 0;
        const key = makeChunkMaskKey(bid, cx, cy);
        let owners = pinnedChunks.get(key);
        if (!owners) {
          owners = new Set();
          pinnedChunks.set(key, owners);
        }
        owners.add(owner);
        touched.add(key);
        if (collectedChunks.has(key)) {
          collectedChunks.delete(key);
          const idx = collectedChunkOrder.indexOf(key);
          if (idx >= 0) collectedChunkOrder.splice(idx, 1);
        }
      }
    }
    enforceCollectedChunksLimit();
    refreshLoadedChunksForKeys(touched);
  }
  function clearPinnedChunksByPrefix(prefix) {
    const p = String(prefix || "");
    if (!p) return;
    const touched = new Set();
    for (const [key, owners] of Array.from(pinnedChunks.entries())) {
      for (const ow of Array.from(owners)) {
        if (ow.startsWith(p)) {
          owners.delete(ow);
          touched.add(key);
        }
      }
      if (owners.size === 0) pinnedChunks.delete(key);
    }
    refreshLoadedChunksForKeys(touched);
  }
  function inspectChunkPickups(biomeId, cx, cy) {
    const bid = String(biomeId || activeBiomeId || "");
    const cxi = Number(cx) | 0;
    const cyi = Number(cy) | 0;
    if (isChunkPinned(bid, cxi, cyi)) {
      return { remaining: 0, cleared: true, pinned: true };
    }
    if (bid === activeBiomeId) {
      const coordKey = `${cxi},${cyi}`;
      if (chunks.has(coordKey)) {
        const ch = chunks.get(coordKey);
        const list = Array.isArray(ch?.pickups) ? ch.pickups : [];
        let rem = 0;
        for (let i = 0; i < list.length; i++) {
          if (!list[i].collected) rem++;
        }
        return { remaining: rem, cleared: rem === 0, pinned: false };
      }
      const env = Object.assign({}, getBiomeGeneratorEnv(), { dryRun: true });
      const gen = getActiveBiomeGenerator(env.generator);
      const tmp = (gen && typeof gen.generateChunk === "function") ? gen.generateChunk(cxi, cyi, env) : null;
      const list = Array.isArray(tmp?.pickups) ? tmp.pickups : [];
      let rem = 0;
      for (let i = 0; i < list.length; i++) {
        if (!list[i].collected) rem++;
      }
      return { remaining: rem, cleared: rem === 0, pinned: false };
    }
    return { remaining: 0, cleared: true, pinned: false };
  }
  function isPositionWalkable(wx, wy) {
    const gen = getActiveBiomeGenerator();
    if (gen && typeof gen.isWalkable === "function") {
      return Boolean(gen.isWalkable(wx, wy, getBiomeGeneratorEnv()));
    }
    return true;
  }
  function exportCollectedChunksLRU() {
    if (MAX_COLLECTED_CHUNKS <= 0) return [];
    const out = [];
    for (const key of collectedChunkOrder) {
      const mask = collectedChunks.get(key) || 0;
      if (mask <= 0) continue;
      const sep = key.indexOf("|");
      if (sep < 0) continue;
      const bid = key.slice(0, sep);
      const parts = key.slice(sep + 1).split(",");
      if (parts.length === 2) out.push([bid, Number(parts[0]) | 0, Number(parts[1]) | 0, mask]);
    }
    return out;
  }
  function importCollectedChunksLRU(entries) {
    collectedChunks.clear();
    collectedChunkOrder.length = 0;
    if (getEffectiveCollectedChunksLimit() <= 0 || !Array.isArray(entries)) return;
    for (const entry of entries) {
      if (!Array.isArray(entry) || entry.length !== 4) continue;
      const bid = String(entry[0] || "");
      const cx = Number(entry[1]) | 0;
      const cy = Number(entry[2]) | 0;
      const mask = (Number(entry[3]) | 0) & 0x7FFFFFFF;
      if (!bid || mask <= 0) continue;
      const key = makeChunkMaskKey(bid, cx, cy);
      if (pinnedChunks.has(key)) continue;
      if (!collectedChunks.has(key)) collectedChunkOrder.push(key);
      collectedChunks.set(key, mask);
    }
    enforceCollectedChunksLimit();
  }

  let slotA = "";
  let slotB = "";
  let showAllDiscovered = false;
  let showCraftHints = false;
  const LEVEL_FILTER_MENU = "menu";
  let levelFilter = 0;
  let inspectedId = "";
  let showDescDetails = false;
  let showUses = false;
  const failedRecipes = new Set();
  let dragState = null;
  let suppressClickUntil = 0;
  let suppressGridClickUntil = 0;
  let suppressSlotClickUntil = 0;
  let lastCardTapId = "";
  let lastCardTapAt = 0;
  const DOUBLE_TAP_WINDOW_MS = 340;
  let toastTimer = null;

  function showToast(msg, opts = null) {
    const raw = String(msg ?? "");
    if (opts && opts.html) {
      toastEl.innerHTML = raw;
    } else if (raw.includes("{{el:") || raw.includes("{{el_icon:") || raw.includes("{{biome:") || raw.includes("{{biome_icon:")) {
      toastEl.innerHTML = formatRichElementTextHtml(raw, 20);
    } else {
      toastEl.textContent = raw;
    }
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2300);
  }

  function getQty(id) { return inventory.get(id) || 0; }
  function addItem(id, amount = 1) {
    if (!elementsById.has(id) || amount <= 0) return false;
    const isNew = !discovered.has(id);
    inventory.set(id, getQty(id) + amount);
    discovered.add(id);
    return isNew;
  }
  function consumeItem(id, amount = 1) {
    const cur = getQty(id);
    if (cur < amount) return false;
    if (cur - amount <= 0) inventory.delete(id);
    else inventory.set(id, cur - amount);
    return true;
  }
  function canAffordPair(a, b) {
    if (!a || !b) return false;
    return a === b ? getQty(a) >= 2 : (getQty(a) >= 1 && getQty(b) >= 1);
  }

  const CHUNK_SIZE = 512;
  const TILE_COUNT = 8;
  const TILE_SIZE = CHUNK_SIZE / TILE_COUNT;
  const LANDING_CLEAR_RADIUS = 230;
  const SHIP_CLICK_RADIUS = 86;
  const SHIP_COLLISION_RADIUS = 66;
  const ALIEN_RADIUS = 15;
  const SHIP_CONTACT_ENTER_DIST = SHIP_COLLISION_RADIUS + ALIEN_RADIUS + 4;
  const SHIP_CONTACT_EXIT_DIST = SHIP_CONTACT_ENTER_DIST + 13;

  function hexToRgb(hex, fallback) {
    if (typeof hex !== "string") return fallback;
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const DEFAULT_BIOMES = [
    {
      id: "plaine_astrale",
      name: "Plaines Astrales",
      icon: "🌌",
      description: "Plaines violettes et moussues parsemées de cratères et de spores bioluminescentes.",
      theme: "astral",
      generator: "biome_base",
      worldSeed: Math.floor(Number(GAME_CONFIG.worldSeed ?? 4242)),
      rockDensity: Number(GAME_CONFIG.rockDensity ?? 1.0),
      crystalDensity: Number(GAME_CONFIG.crystalDensity ?? 1.0),
      biomeScale: Number(GAME_CONFIG.biomeScale ?? 1.0),
      groundColorA: "#2b243d",
      groundColorB: "#47352e",
      groundColorC: "#213838",
      accentColor: "#38e0d1"
    }
  ];

  let BIOMES = (Array.isArray(GAME_CONFIG.biomes) && GAME_CONFIG.biomes.length > 0)
    ? GAME_CONFIG.biomes
    : DEFAULT_BIOMES;

  function getBiomeById(id) {
    return BIOMES.find(b => b && b.id === id) || BIOMES[0];
  }

  function getElementBiomeSpawns(el) {
    const out = [];
    const seen = new Set();
    const lvl = Math.max(1, Number(el && el.level) || 1);
    if (el && Array.isArray(el.biomeSpawns)) {
      for (const raw of el.biomeSpawns) {
        if (!raw || typeof raw !== "object") continue;
        const b = String(raw.biome || "").trim();
        if (!b || seen.has(b)) continue;
        seen.add(b);
        const w = Math.max(0.1, Math.min(1000, Number(raw.weight ?? 100) || 100));
        const show = raw.showInBiomeMenu !== undefined ? Boolean(raw.showInBiomeMenu) : true;
        out.push({ biome: b, weight: w, showInBiomeMenu: show });
      }
    } else if (el) {
      let legacy = [];
      if (Array.isArray(el.biomes)) {
        legacy = el.biomes.map(x => String(x || "").trim()).filter(Boolean);
      }
      if (legacy.length === 0 && el.biome) {
        legacy = String(el.biome).split(",").map(x => x.trim()).filter(Boolean);
      }
      for (const b of legacy) {
        if (!seen.has(b)) {
          seen.add(b);
          out.push({ biome: b, weight: 100, showInBiomeMenu: true });
        }
      }
    }
    if (lvl === 1 && out.length === 0) {
      out.push({ biome: "plaine_astrale", weight: 100, showInBiomeMenu: true });
    }
    return out;
  }

  function getElementSpawnForBiome(el, biomeId) {
    const spawns = getElementBiomeSpawns(el);
    if (!biomeId) return spawns[0] || null;
    let allFallback = null;
    for (const sp of spawns) {
      if (sp.biome === biomeId) return sp;
      if (sp.biome === "all" && !allFallback) allFallback = sp;
    }
    return allFallback;
  }

  function getLevel1ElementsForBiome(biomeId) {
    const filtered = level1Elements.filter(el => Boolean(getElementSpawnForBiome(el, biomeId)));
    return filtered.length > 0 ? filtered : level1Elements;
  }

  function getSpawnableElementsForBiome(biomeId) {
    const filtered = [];
    for (const el of elementsList) {
      const sp = getElementSpawnForBiome(el, biomeId);
      if (sp) {
        filtered.push(Object.assign({}, el, {
          spawnWeight: Number(sp.weight ?? 100),
          showInBiomeMenu: sp.showInBiomeMenu !== undefined ? Boolean(sp.showInBiomeMenu) : true
        }));
      }
    }
    if (biomeId && filtered.length === 0) {
      return level1Elements.map(el => Object.assign({}, el, { spawnWeight: 100, showInBiomeMenu: true }));
    }
    return filtered;
  }

  function getBiomeMenuElementsForBiome(biomeId) {
    const n1 = [];
    const other = [];
    for (const el of getSpawnableElementsForBiome(biomeId)) {
      if (!el.showInBiomeMenu) continue;
      if (Number(el.level) === 1) n1.push(el);
      else other.push(el);
    }
    other.sort((a, b) => {
      const la = Number(a.level) || 2;
      const lb = Number(b.level) || 2;
      if (la !== lb) return la - lb;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    return { n1, other };
  }

  const {
    DEFAULT_BIOME_GENERATOR,
    loadedBiomeGenHtmlHash,
    loadedBiomeGenDeps,
    normalizeBiomeGeneratorId,
    getBiomeGeneratorUrl,
    hashBiomeGenHtml,
    resolveBiomeRelativeUrl,
    getBiomeLoadingUi,
    ensureBiomeGeneratorLoaded,
    getActiveBiomeGenerator,
  } = window.AssemblageRuntime.createBiomeLoader({
    defaultGeneratorId: "biome_base",
    getAssetBase: () => ASSET_BASE,
    getActiveBiomeGeneratorId: () => activeBiomeGeneratorId,
  });

  const {
    getActorModule,
    ensureActorScriptLoaded,
    ensureActorsLoadedForList,
    reloadModifiedActorScripts,
  } = window.AssemblageRuntime.createActorLoader({
    getAssetBase: () => ASSET_BASE,
  });

  let activeBiome = getBiomeById(String(GAME_CONFIG.activeBiomeId || BIOMES[0].id));
  let activeBiomeId = activeBiome.id;
  let activeBiomeTheme = activeBiome.theme || "astral";
  let activeBiomeGeneratorId = normalizeBiomeGeneratorId(activeBiome.generator);
  let WORLD_SEED = Math.floor(Number(activeBiome.worldSeed ?? 4242));
  let ROCK_DENSITY = Math.max(0, Math.min(2.5, Number(activeBiome.rockDensity ?? 1.0)));
  let CRYSTAL_DENSITY = Math.max(0, Math.min(2.5, Number(activeBiome.crystalDensity ?? 1.0)));
  let BIOME_SCALE = Math.max(0.25, Math.min(4.0, Number(activeBiome.biomeScale ?? 1.0)));
  let groundColA = hexToRgb(activeBiome.groundColorA, [43, 36, 61]);
  let groundColB = hexToRgb(activeBiome.groundColorB, [71, 54, 46]);
  let groundColC = hexToRgb(activeBiome.groundColorC, [33, 56, 56]);
  let accentRgb = hexToRgb(activeBiome.accentColor, [56, 224, 209]);
  let activeLevel1Elements = getSpawnableElementsForBiome(activeBiomeId);
  let shipViewMode = "hub";

  const THEME_FALLBACK_PALETTES = {
    volcanic: { groundA: [38, 22, 20], groundB: [61, 30, 20], groundC: [28, 26, 36], accent: [255, 106, 43] },
    glacial:  { groundA: [26, 42, 61], groundB: [39, 63, 89], groundC: [22, 51, 66], accent: [123, 227, 255] },
    fungal:   { groundA: [26, 38, 31], groundB: [44, 31, 54], groundC: [23, 51, 42], accent: [182, 109, 255] },
    marais:   { groundA: [34, 51, 38], groundB: [59, 58, 38], groundC: [22, 43, 41], accent: [155, 229, 100] },
    default:  { groundA: [43, 36, 61], groundB: [71, 54, 46], groundC: [33, 56, 56], accent: [56, 224, 209] },
  };

  function applyActiveBiomeParams(biomeId) {
    activeBiome = getBiomeById(biomeId);
    activeBiomeId = activeBiome.id;
    activeBiomeTheme = activeBiome.theme || "astral";
    activeBiomeGeneratorId = normalizeBiomeGeneratorId(activeBiome.generator);
    WORLD_SEED = Math.floor(Number(activeBiome.worldSeed ?? 4242));
    ROCK_DENSITY = Math.max(0, Math.min(2.5, Number(activeBiome.rockDensity ?? 1.0)));
    CRYSTAL_DENSITY = Math.max(0, Math.min(2.5, Number(activeBiome.crystalDensity ?? 1.0)));
    BIOME_SCALE = Math.max(0.25, Math.min(4.0, Number(activeBiome.biomeScale ?? 1.0)));
    const fb = THEME_FALLBACK_PALETTES[activeBiomeTheme] || THEME_FALLBACK_PALETTES.default;
    groundColA = hexToRgb(activeBiome.groundColorA, fb.groundA);
    groundColB = hexToRgb(activeBiome.groundColorB, fb.groundB);
    groundColC = hexToRgb(activeBiome.groundColorC, fb.groundC);
    accentRgb = hexToRgb(activeBiome.accentColor, fb.accent);
    activeLevel1Elements = getSpawnableElementsForBiome(activeBiomeId);
    resolveAnchors();
    if (typeof ensureBiomeGeneratorLoaded === "function" && (!window.AssemblageBiomeGenerators || !window.AssemblageBiomeGenerators[activeBiomeGeneratorId])) {
      const targetGenId = activeBiomeGeneratorId;
      ensureBiomeGeneratorLoaded(targetGenId).then((loaded) => {
        if (loaded && activeBiomeGeneratorId === targetGenId && typeof chunks !== "undefined" && typeof updateChunks === "function" && typeof alien !== "undefined") {
          resolveAnchors();
          if (typeof clearAllChunkActors === "function") clearAllChunkActors();
          chunks.clear();
          lastCenterKey = "";
          updateChunks(alien.x, alien.y);
        }
      });
    }
  }

  const ANCHOR_PIXELS_PER_METER = 18;
  const DEFAULT_ANCHOR_DISCOVERY_RADIUS_M = 14;
  const resolvedAnchorsById = new Map();
  const discoveredAnchorsByBiome = new Map();

  function getDiscoveredAnchorSet(biomeId = activeBiomeId, create = false) {
    const bid = String(biomeId || activeBiomeId || "").trim();
    if (!bid) return null;
    let set = discoveredAnchorsByBiome.get(bid);
    if (!set && create) {
      set = new Set();
      discoveredAnchorsByBiome.set(bid, set);
    }
    return set || null;
  }

  function discoverAnchor(anchorId, biomeId = activeBiomeId) {
    const aid = String(anchorId || "").trim();
    const bid = String(biomeId || activeBiomeId || "").trim();
    if (!aid || !bid) return false;
    const set = getDiscoveredAnchorSet(bid, true);
    if (!set || set.has(aid)) return false;
    set.add(aid);
    autosaveDirty = true;
    emitHostEvent("anchor_discovered", {
      anchorId: aid,
      biomeId: bid,
      anchor: resolvedAnchorsById.get(aid) || null,
    });
    return true;
  }

  function isAnchorDiscovered(anchorId, biomeId = activeBiomeId) {
    const aid = String(anchorId || "").trim();
    const set = getDiscoveredAnchorSet(biomeId, false);
    return Boolean(aid && set && set.has(aid));
  }

  function getDiscoveredAnchors(biomeId = activeBiomeId) {
    const set = getDiscoveredAnchorSet(biomeId, false);
    return set ? Array.from(set).sort() : [];
  }

  function exportDiscoveredAnchorsObj() {
    const out = {};
    for (const [bid, set] of discoveredAnchorsByBiome.entries()) {
      if (set && set.size > 0) out[bid] = Array.from(set).sort();
    }
    return out;
  }

  function importDiscoveredAnchorsObj(obj) {
    discoveredAnchorsByBiome.clear();
    if (!obj || typeof obj !== "object") return;
    for (const [rawBid, list] of Object.entries(obj)) {
      const bid = String(rawBid || "").trim();
      if (!bid || !Array.isArray(list)) continue;
      const set = getDiscoveredAnchorSet(bid, true);
      for (const rawAid of list) {
        const aid = String(rawAid || "").trim();
        if (aid) set.add(aid);
      }
    }
  }

  function hashAnchorSeed(worldSeed, key) {
    let h = (2166136261 ^ (worldSeed >>> 0)) >>> 0;
    const bytes = new TextEncoder().encode(String(key));
    for (let i = 0; i < bytes.length; i++) {
      h = (h ^ bytes[i]) >>> 0;
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function nextAnchorPrng(state) {
    const t = (state + 0x6D2B79F5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), (t | 1) >>> 0) >>> 0;
    x = (x ^ ((x + Math.imul(x ^ (x >>> 7), (x | 61) >>> 0)) >>> 0)) >>> 0;
    const out = (x ^ (x >>> 14)) >>> 0;
    return { state: t, value: out / 4294967296 };
  }

  function anchorMatchesBiome(a, biomeId) {
    if (!biomeId) return true;
    if (Array.isArray(a?.biomes)) {
      return a.biomes.includes("all") || a.biomes.includes(biomeId);
    }
    const single = String(a?.biome || "").trim();
    if (single) {
      const parts = single.split(",").map((s) => s.trim()).filter(Boolean);
      return parts.includes("all") || parts.includes(biomeId);
    }
    return true;
  }

  function resolveAnchors() {
    resolvedAnchorsById.clear();
    const list = Array.isArray(ANCHORS_DATA?.anchors) ? ANCHORS_DATA.anchors : [];
    const byId = new Map();
    for (const a of list) {
      if (!a || typeof a !== "object") continue;
      if (!anchorMatchesBiome(a, activeBiomeId)) continue;
      const aid = String(a.id || "").trim();
      if (aid && !byId.has(aid)) byId.set(aid, a);
    }

    const ordered = [];
    const seenOrder = new Set();
    for (const a of byId.values()) {
      const aid = String(a.id || "").trim();
      if (String(a.positionMode || "fixed") === "fixed") {
        ordered.push(a);
        seenOrder.add(aid);
      }
    }
    for (const a of byId.values()) {
      const aid = String(a.id || "").trim();
      if (seenOrder.has(aid)) continue;
      if (String(a.positionMode || "fixed") === "generative_ship") {
        ordered.push(a);
        seenOrder.add(aid);
      }
    }
    let progress = true;
    while (progress) {
      progress = false;
      for (const a of byId.values()) {
        const aid = String(a.id || "").trim();
        if (seenOrder.has(aid)) continue;
        const refId = String(a.referenceAnchorId || "").trim();
        if (!refId || seenOrder.has(refId) || !byId.has(refId)) {
          ordered.push(a);
          seenOrder.add(aid);
          progress = true;
        }
      }
    }
    for (const a of byId.values()) {
      const aid = String(a.id || "").trim();
      if (!seenOrder.has(aid)) {
        ordered.push(a);
        seenOrder.add(aid);
      }
    }

    const activeGen = (window.AssemblageBiomeGenerators && window.AssemblageBiomeGenerators[activeBiomeGeneratorId]) || null;
    const hasTerrainAnchorCheck = Boolean(
      activeGen && (typeof activeGen.isAnchorValid === "function" || typeof activeGen.isWalkable === "function")
    );
    const anchorEnv = hasTerrainAnchorCheck ? {
      CHUNK_SIZE,
      TILE_COUNT,
      TILE_SIZE,
      LANDING_CLEAR_RADIUS,
      worldSeed: WORLD_SEED,
      rockDensity: ROCK_DENSITY,
      crystalDensity: CRYSTAL_DENSITY,
      biomeScale: BIOME_SCALE,
      biomeId: activeBiomeId,
      theme: activeBiomeTheme,
      generator: activeBiomeGeneratorId,
      biome: activeBiome,
      groundColA,
      groundColB,
      groundColC,
      accentRgb,
    } : null;

    const isTerrainValidForAnchor = (wxM, wyM) => {
      if (!hasTerrainAnchorCheck) return true;
      const wxPx = wxM * ANCHOR_PIXELS_PER_METER;
      const wyPx = wyM * ANCHOR_PIXELS_PER_METER;
      if (typeof activeGen.isAnchorValid === "function") {
        return Boolean(activeGen.isAnchorValid(wxPx, wyPx, anchorEnv));
      }
      return Boolean(activeGen.isWalkable(wxPx, wyPx, anchorEnv));
    };

    const placedList = [];
    for (const a of ordered) {
      const aid = String(a.id || "").trim();
      const mode = String(a.positionMode || "fixed");
      let xm = 0;
      let ym = 0;

      if (mode === "fixed") {
        xm = Number(a.x || 0);
        ym = Number(a.y || 0);
        if (hasTerrainAnchorCheck && !isTerrainValidForAnchor(xm, ym) && typeof activeGen.findNearestValidAnchorPos === "function") {
          const snapped = activeGen.findNearestValidAnchorPos(
            xm * ANCHOR_PIXELS_PER_METER,
            ym * ANCHOR_PIXELS_PER_METER,
            anchorEnv,
            {
              placedPx: placedList.map((p) => ({
                x: p.x,
                y: p.y,
                minSepPx: p.minSeparation * ANCHOR_PIXELS_PER_METER,
              })),
              minSepPx: 0,
            }
          );
          if (snapped && Number.isFinite(snapped.x) && Number.isFinite(snapped.y)) {
            xm = snapped.x / ANCHOR_PIXELS_PER_METER;
            ym = snapped.y / ANCHOR_PIXELS_PER_METER;
          }
        }
      } else {
        let refXm = 0;
        let refYm = 0;
        if (mode === "generative_anchor") {
          const refEntry = resolvedAnchorsById.get(String(a.referenceAnchorId || "").trim());
          if (refEntry) {
            refXm = refEntry.xm;
            refYm = refEntry.ym;
          }
        }
        const minD = Math.max(0, Number(a.minDistance ?? 20));
        const maxD = Math.max(minD, Number(a.maxDistance ?? 60));
        const minSep = Math.max(0, Number(a.minSeparation ?? 15));
        const useAngleRange = Boolean(a.useAngleRange);
        const minAngleDeg = Number(a.minAngle ?? 0);
        const maxAngleDeg = Number(a.maxAngle ?? 360);
        let adjMaxDeg = maxAngleDeg;
        while (adjMaxDeg < minAngleDeg) adjMaxDeg += 360;
        const angleSpanDeg = Math.max(0, Math.min(360, adjMaxDeg - minAngleDeg));

        let st = hashAnchorSeed(WORLD_SEED, "anchor|" + aid);
        let found = false;
        const initAngle = useAngleRange ? ((minAngleDeg + angleSpanDeg * 0.5) * Math.PI / 180) : 0;
        let bestXm = refXm + Math.cos(initAngle) * minD;
        let bestYm = refYm + Math.sin(initAngle) * minD;
        let bestClearance = -1e9;
        let hasValidCandidate = false;
        let bestValidXm = bestXm;
        let bestValidYm = bestYm;
        let bestValidClearance = -1e9;

        const evaluateSeparation = (cx, cy) => {
          let worstClearance = 1e9;
          let ok = true;
          for (const other of placedList) {
            const reqSep = Math.max(minSep, other.minSeparation);
            if (reqSep <= 0) continue;
            const dOther = Math.hypot(cx - other.xm, cy - other.ym);
            const clearance = dOther - reqSep;
            if (clearance < worstClearance) worstClearance = clearance;
            if (dOther < reqSep) ok = false;
          }
          return { ok, worstClearance };
        };

        for (let attempt = 0; attempt < 256; attempt++) {
          const r1 = nextAnchorPrng(st);
          st = r1.state;
          const r2 = nextAnchorPrng(st);
          st = r2.state;

          const angle = useAngleRange
            ? ((minAngleDeg + r1.value * angleSpanDeg) * Math.PI / 180)
            : (r1.value * Math.PI * 2);
          const dist = minD + r2.value * (maxD - minD);
          const cx = refXm + Math.cos(angle) * dist;
          const cy = refYm + Math.sin(angle) * dist;

          const sep = evaluateSeparation(cx, cy);
          const terrainOk = isTerrainValidForAnchor(cx, cy);

          if (sep.ok && terrainOk) {
            xm = cx;
            ym = cy;
            found = true;
            hasValidCandidate = true;
            break;
          }
          if (terrainOk && (!hasValidCandidate || sep.worstClearance > bestValidClearance)) {
            hasValidCandidate = true;
            bestValidClearance = sep.worstClearance;
            bestValidXm = cx;
            bestValidYm = cy;
          }
          if (sep.worstClearance > bestClearance) {
            bestClearance = sep.worstClearance;
            bestXm = cx;
            bestYm = cy;
          }
        }

        // Si le biome filtre le terrain (ex: archipel avec eau) et qu'aucun point valide
        // n'a été trouvé dans l'anneau strict, élargit la recherche sur la terre ferme atteignable
        if (!found && hasTerrainAnchorCheck) {
          const expMinD = Math.max(7, minD * 0.45);
          const expMaxD = Math.max(maxD * 1.85, maxD + 25);
          const searchPasses = useAngleRange
            ? [{ useAng: true, attempts: 256 }, { useAng: false, attempts: 192 }]
            : [{ useAng: false, attempts: 256 }];

          let bestExpScore = -1e9;
          let foundExpOk = false;

          for (const pass of searchPasses) {
            if (foundExpOk) break;
            for (let attempt = 0; attempt < pass.attempts; attempt++) {
              const r1 = nextAnchorPrng(st);
              st = r1.state;
              const r2 = nextAnchorPrng(st);
              st = r2.state;

              const angle = pass.useAng
                ? ((minAngleDeg + r1.value * angleSpanDeg) * Math.PI / 180)
                : (r1.value * Math.PI * 2);
              const dist = expMinD + r2.value * (expMaxD - expMinD);
              const cx = refXm + Math.cos(angle) * dist;
              const cy = refYm + Math.sin(angle) * dist;
              if (!isTerrainValidForAnchor(cx, cy)) continue;

              const sep = evaluateSeparation(cx, cy);
              const distPenalty = dist < minD ? (minD - dist) : (dist > maxD ? (dist - maxD) : 0);
              if (sep.ok) {
                const score = -distPenalty;
                if (!foundExpOk || score > bestExpScore) {
                  foundExpOk = true;
                  bestExpScore = score;
                  xm = cx;
                  ym = cy;
                  found = true;
                  hasValidCandidate = true;
                }
              } else if (!hasValidCandidate || sep.worstClearance > bestValidClearance) {
                hasValidCandidate = true;
                bestValidClearance = sep.worstClearance;
                bestValidXm = cx;
                bestValidYm = cy;
              }
            }
          }
        }

        if (!found) {
          if (hasValidCandidate) {
            xm = bestValidXm;
            ym = bestValidYm;
          } else {
            xm = bestXm;
            ym = bestYm;
            if (hasTerrainAnchorCheck && typeof activeGen.findNearestValidAnchorPos === "function") {
              const snapped = activeGen.findNearestValidAnchorPos(
                xm * ANCHOR_PIXELS_PER_METER,
                ym * ANCHOR_PIXELS_PER_METER,
                anchorEnv,
                {
                  placedPx: placedList.map((p) => ({
                    x: p.x,
                    y: p.y,
                    minSepPx: p.minSeparation * ANCHOR_PIXELS_PER_METER,
                  })),
                  minSepPx: minSep * ANCHOR_PIXELS_PER_METER,
                }
              );
              if (snapped && Number.isFinite(snapped.x) && Number.isFinite(snapped.y)) {
                xm = snapped.x / ANCHOR_PIXELS_PER_METER;
                ym = snapped.y / ANCHOR_PIXELS_PER_METER;
              }
            }
          }
        }
      }

      const entry = {
        id: aid,
        emoji: String(a.emoji || a.icon || "⚓"),
        description: String(a.description || ""),
        showOnMap: Boolean(a.showOnMap),
        positionMode: mode,
        xm: Math.round(xm * 10) / 10,
        ym: Math.round(ym * 10) / 10,
        x: xm * ANCHOR_PIXELS_PER_METER,
        y: ym * ANCHOR_PIXELS_PER_METER,
        minSeparation: mode !== "fixed" ? Math.max(0, Number(a.minSeparation ?? 0)) : 0,
        zoneRadiusM: Math.max(0, Number(a.zoneRadiusM ?? 0)),
      };
      resolvedAnchorsById.set(aid, entry);
      placedList.push(entry);
    }
  }

  function getDistanceToAnchorMeters(anchorId) {
    const entry = resolvedAnchorsById.get(String(anchorId || "").trim());
    if (!entry) return null;
    return Math.hypot(alien.x - entry.x, alien.y - entry.y) / ANCHOR_PIXELS_PER_METER;
  }

  applyActiveBiomeParams(activeBiomeId);

  let MOVE_SPEED = Math.max(60, Math.min(800, Number(GAME_CONFIG.moveSpeed ?? 240)));
  let DEADZONE_PX = Math.max(0, Math.min(120, Number(GAME_CONFIG.deadzonePx ?? 14)));
  let CRAFT_LONG_PRESS_MS = Math.max(0, Math.min(800, Math.round(Number(GAME_CONFIG.craftLongPressMs ?? 150))));
  let CAM_SMOOTH = Math.max(1, Math.min(25, Number(GAME_CONFIG.cameraSmoothing ?? 6.5)));
  let CAM_ZOOM = Math.max(0.4, Math.min(2.5, Number(GAME_CONFIG.cameraZoom ?? 1.0)));
  let SHOW_COMPASS = GAME_CONFIG.showCompass !== false;
  let SHIP_TITLE = String(GAME_CONFIG.shipTitle || "VAISSEAU");
  let SHIP_SUBTITLE = String(GAME_CONFIG.shipSubtitle || "Systèmes nominaux • Base (0, 0)");
  let EXIT_BTN_TEXT = String(GAME_CONFIG.exitButtonText || "Sortir");

  function applyGameConfigParams() {
    MAX_COLLECTED_CHUNKS = Math.max(0, Math.floor(Number(GAME_CONFIG.maxCollectedChunks ?? 1000)));
    MAX_DECORATED_CHUNKS = Math.max(0, Math.floor(Number(GAME_CONFIG.maxDecoratedChunks ?? 500)));
    enforceCollectedChunksLimit();
    BIOMES = (Array.isArray(GAME_CONFIG.biomes) && GAME_CONFIG.biomes.length > 0)
      ? GAME_CONFIG.biomes
      : DEFAULT_BIOMES;
    MOVE_SPEED = Math.max(60, Math.min(800, Number(GAME_CONFIG.moveSpeed ?? 240)));
    DEADZONE_PX = Math.max(0, Math.min(120, Number(GAME_CONFIG.deadzonePx ?? 14)));
    CRAFT_LONG_PRESS_MS = Math.max(0, Math.min(800, Math.round(Number(GAME_CONFIG.craftLongPressMs ?? 150))));
    CAM_SMOOTH = Math.max(1, Math.min(25, Number(GAME_CONFIG.cameraSmoothing ?? 6.5)));
    CAM_ZOOM = Math.max(0.4, Math.min(2.5, Number(GAME_CONFIG.cameraZoom ?? 1.0)));
    SHOW_COMPASS = GAME_CONFIG.showCompass !== false;
    SHIP_TITLE = String(GAME_CONFIG.shipTitle || "VAISSEAU");
    SHIP_SUBTITLE = String(GAME_CONFIG.shipSubtitle || "Systèmes nominaux • Base (0, 0)");
    EXIT_BTN_TEXT = String(GAME_CONFIG.exitButtonText || "Sortir");
    shipTitleEl.textContent = SHIP_TITLE;
    exitBtnEl.setAttribute("aria-label", EXIT_BTN_TEXT);
    applyActiveBiomeParams(activeBiomeId);
  }

  exitBtnEl.textContent = "✕";
  exitBtnEl.classList.add("icon-close-lg");
  applyGameConfigParams();

  let viewW = window.innerWidth;
  let viewH = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let safeTop = 0;
  let safeRight = 0;
  let mainLoopReady = false;

  function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rootStyle = getComputedStyle(document.documentElement);
    safeTop = parseFloat(rootStyle.getPropertyValue("--sat")) || 0;
    safeRight = parseFloat(rootStyle.getPropertyValue("--sar")) || 0;
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    if (mainLoopReady && isGamePaused() && pausedFrameRendered) {
      pausedFrameRendered = false;
      scheduleMainFrame();
    }
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => {
    resize();
    setTimeout(resize, 120);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resize);
  }
  resize();

  // Deterministic PRNG (Mulberry32)
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerpAngle(a, b, t) {
    const twoPi = Math.PI * 2;
    const diff = ((((b - a + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
    return a + diff * t;
  }
  function rgbStr(c, a = 1) {
    return `rgba(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))},${a})`;
  }

  let currentFrameTimeSec = 0;
  let alienKnockbackVx = 0;
  let alienKnockbackVy = 0;
  let alienKnockbackTimer = 0;
  let alienHitFlash = 0;

  function worldToScreenPos(wx, wy) {
    const dx = wx - cam.x;
    const dy = wy - cam.y;
    let rx = dx;
    let ry = dy;
    if (cam.angle) {
      const c = Math.cos(cam.angle);
      const s = Math.sin(cam.angle);
      rx = dx * c - dy * s;
      ry = dx * s + dy * c;
    }
    return {
      x: viewW * 0.5 + rx * currentZoom,
      y: viewH * 0.5 + ry * currentZoom,
    };
  }

  function isPointNearScreenEdge(wx, wy, marginPx = 72) {
    const sp = worldToScreenPos(wx, wy);
    return (
      sp.x <= marginPx ||
      sp.x >= viewW - marginPx ||
      sp.y <= marginPx ||
      sp.y >= viewH - marginPx
    );
  }

  function stopAlienMovement() {
    alien.vx = 0;
    alien.vy = 0;
    hasTarget = false;
    isHolding = false;
    joyActive = false;
    joyDirX = 0;
    joyDirY = 0;
    joyMag = 0;
  }

  function applyAlienKnockback(dx, dy, distPx = 46, opts = null) {
    stopAlienMovement();
    const len = Math.hypot(dx, dy);
    if (len > 0.001) {
      const speed = Math.max(120, distPx * 6.2);
      alienKnockbackVx = (dx / len) * speed;
      alienKnockbackVy = (dy / len) * speed;
      alienKnockbackTimer = (opts && Number.isFinite(opts.duration)) ? opts.duration : 0.24;
      if (!opts || opts.flash !== false) {
        alienHitFlash = 1.0;
      }
    }
  }

  function getBiomeGeneratorEnv(timeSecOverride) {
    return {
      CHUNK_SIZE,
      TILE_COUNT,
      TILE_SIZE,
      LANDING_CLEAR_RADIUS,
      worldSeed: WORLD_SEED,
      rockDensity: ROCK_DENSITY,
      crystalDensity: CRYSTAL_DENSITY,
      biomeScale: BIOME_SCALE,
      biomeId: activeBiomeId,
      theme: activeBiomeTheme,
      generator: activeBiomeGeneratorId,
      biome: activeBiome,
      groundColA,
      groundColB,
      groundColC,
      accentRgb,
      spawnableElements: activeLevel1Elements,
      timeSec: timeSecOverride !== undefined ? timeSecOverride : currentFrameTimeSec,
      alien,
      cam,
      viewW,
      viewH,
      currentZoom,
      chunks,
      screenToWorld,
      worldToScreen: worldToScreenPos,
      isPointNearScreenEdge,
      stopAlienMovement,
      applyAlienKnockback,
      checkColliderHit: (wx, wy, r = 0) => {
        if (Math.hypot(wx, wy) <= SHIP_COLLISION_RADIUS + r) return true;
        const cx = Math.floor(wx / CHUNK_SIZE);
        const cy = Math.floor(wy / CHUNK_SIZE);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ch = chunks.get((cx + dx) + "," + (cy + dy));
            if (!ch || !ch.colliders) continue;
            for (const col of ch.colliders) {
              if (Math.hypot(wx - col.x, wy - col.y) <= col.r + r) return true;
            }
          }
        }
        return false;
      },
      getChunkMask,
      drawPickups,
      hasActorCatalog: Boolean(ACTORS_DATA && Array.isArray(ACTORS_DATA.actors) && ACTORS_DATA.actors.length > 0),
      getActorConfig: (actorId) => {
        if (!hostActorsApi || typeof hostActorsApi.getForBiome !== "function") return null;
        return hostActorsApi.getForBiome(activeBiomeId).find((a) => a && a.id === actorId) || null;
      },
      onActorKilled: (actorId, wx, wy) => {
        if (hostActorsApi && typeof hostActorsApi.recordKill === "function") {
          hostActorsApi.recordKill(actorId, wx, wy, { biomeId: activeBiomeId });
        }
      },
      emitActorDamaged: (payload) => {
        emitHostEvent("actor:damaged", payload);
      },
    };
  }

  function sampleBiome(wx, wy) {
    const gen = getActiveBiomeGenerator();
    return (gen && typeof gen.sampleBiome === "function") ? gen.sampleBiome(wx, wy, getBiomeGeneratorEnv()) : 0;
  }
  function sampleElev(wx, wy) {
    const gen = getActiveBiomeGenerator();
    return (gen && typeof gen.sampleElev === "function") ? gen.sampleElev(wx, wy, getBiomeGeneratorEnv()) : 0;
  }
  function sampleDetail(wx, wy) {
    const gen = getActiveBiomeGenerator();
    return (gen && typeof gen.sampleDetail === "function") ? gen.sampleDetail(wx, wy, getBiomeGeneratorEnv()) : 0;
  }
  function sampleGroundColor(wx, wy) {
    const gen = getActiveBiomeGenerator();
    return (gen && typeof gen.sampleGroundColor === "function")
      ? gen.sampleGroundColor(wx, wy, getBiomeGeneratorEnv())
      : rgbStr(groundColA);
  }

  // Procedural chunks cache
  const chunks = new Map();

  function generateChunk(cx, cy) {
    const env = getBiomeGeneratorEnv();
    const gen = getActiveBiomeGenerator(env.generator);
    if (gen && typeof gen.generateChunk === "function") {
      return gen.generateChunk(cx, cy, env);
    }
    const ox = cx * CHUNK_SIZE;
    const oy = cy * CHUNK_SIZE;
    const fallbackColor = rgbStr(groundColA);
    const tiles = new Array(TILE_COUNT * TILE_COUNT).fill(fallbackColor);
    return {
      cx, cy, ox, oy,
      generator: env.generator,
      theme: activeBiomeTheme,
      accent: accentRgb,
      tiles,
      craters: [],
      rocks: [],
      crystals: [],
      flora: [],
      pickups: [],
      colliders: []
    };
  }

  // Camera zoom levels cycled by clicking the compass: normal -> zoom out 1 -> zoom out 2 -> normal
  const ZOOM_FACTORS = [1.0, 0.55, 0.32];
  let zoomStep = 0;
  function getResponsiveZoomFactor() {
    if (viewH > viewW && viewW < 500) {
      return clamp(viewW / 480, 0.76, 1.0);
    }
    const refSize = 660;
    const effSize = Math.sqrt(Math.max(1, viewW) * Math.max(1, viewH));
    if (effSize <= refSize) return 1.0;
    return Math.min(2.1, Math.pow(effSize / refSize, 0.55));
  }
  let currentZoom = CAM_ZOOM * getResponsiveZoomFactor();
  function getTargetZoom() { return CAM_ZOOM * getResponsiveZoomFactor() * ZOOM_FACTORS[zoomStep]; }
  function resetZoomToAlien() { if (zoomStep !== 0) zoomStep = 0; }

  let lastCenterKey = "";
  function updateChunks(px, py) {
    const cx = Math.floor(px / CHUNK_SIZE);
    const cy = Math.floor(py / CHUNK_SIZE);
    const minZoom = Math.max(0.2, Math.min(currentZoom, getTargetZoom()));
    const p25d = window.AssemblageRuntime && window.AssemblageRuntime.parallax25d;
    const is25D = Boolean((p25d && p25d.isActive()) || window.Assemblage25DActive);
    const viewSpan = (cam.angle || is25D)
      ? Math.hypot(viewW, viewH) * 0.5
      : Math.max(viewW, viewH) * 0.5;
    const neededR = Math.ceil(viewSpan / (minZoom * CHUNK_SIZE)) + 1;
    const loadR = Math.max(3, Math.min(7, neededR));
    const unloadR = loadR + 2;
    const key = cx + "," + cy + "," + loadR;
    if (key === lastCenterKey) return;
    lastCenterKey = key;

    for (let dy = -loadR; dy <= loadR; dy++) {
      for (let dx = -loadR; dx <= loadR; dx++) {
        const k = (cx + dx) + "," + (cy + dy);
        if (!chunks.has(k)) {
          chunks.set(k, generateChunk(cx + dx, cy + dy));
          if (typeof spawnActorsForChunk === "function") spawnActorsForChunk(cx + dx, cy + dy);
        }
      }
    }
    for (const [k, ch] of chunks.entries()) {
      if (Math.abs(ch.cx - cx) > unloadR || Math.abs(ch.cy - cy) > unloadR) {
        chunks.delete(k);
        if (typeof unloadActorsForChunk === "function") unloadActorsForChunk(k);
      }
    }
  }

  // Game state (alien spawns clearly beside the spaceship)
  const alien = {
    x: 115, y: 70,
    vx: 0, vy: 0,
    facing: Math.PI * 0.25,
    walkCycle: 0,
    distance: 0
  };
  const cam = { x: alien.x, y: alien.y, angle: 0 };
  const lastMoveDir = { x: 0, y: 0, active: false };
  let uiOpen = false;
  let settingsOpen = false;
  const JOYSTICK_STORAGE_KEY = (SCENARIO_META?.id && SCENARIO_META.id !== "base")
    ? `assemblage_use_joystick_${SCENARIO_META.id}`
    : "assemblage_use_joystick";
  let useJoystick = false;
  try {
    useJoystick = localStorage.getItem(JOYSTICK_STORAGE_KEY) === "1";
  } catch (_) {}
  let hintDismissed = false;
  let compassAngle = Math.atan2(-alien.y, -alien.x);
  let isHoveredShip = false;
  let shipContactLocked = false;

  // Input state: tap/drag-to-move OR pop-up directional joystick
  let isHolding = false;
  let moveTouchId = null;
  let hasTarget = false;
  let targetWorldX = alien.x;
  let targetWorldY = alien.y;
  let clickRippleTime = 0;
  let pointerScreenX = 0;
  let pointerScreenY = 0;
  let lastTouchMs = 0;
  const keys = new Set();
  const extClaimedTouchIds = new Set();

  // Floating directional joystick state
  const JOY_MAX_RADIUS = 56;
  const JOY_DEADZONE = 8;
  let joyActive = false;
  let joyTouchId = null;
  let joyOriginX = 0;
  let joyOriginY = 0;
  let joyKnobX = 0;
  let joyKnobY = 0;
  let joyDirX = 0;
  let joyDirY = 0;
  let joyMag = 0;

  let extTitleCardOpen = false;
  let extModalOpen = false;
  let extFrameOpen = false;
  let fsPaused = false;
  const gamePausedReasons = new Set();
  let pauseStartedAtMs = null;
  let pausedTotalOffsetMs = 0;
  let mainRafId = null;
  let pausedFrameRendered = false;
  function scheduleMainFrame() {
    if (mainRafId === null) {
      mainRafId = requestAnimationFrame(frame);
    }
  }
  function isGamePaused() { return gamePausedReasons.size > 0; }
  function setGamePaused(reason, paused) {
    const key = String(reason || "default");
    const wasPaused = isGamePaused();
    if (paused) gamePausedReasons.add(key);
    else gamePausedReasons.delete(key);
    const nowPaused = isGamePaused();
    if (!wasPaused && nowPaused) {
      pauseStartedAtMs = performance.now();
      pausedFrameRendered = false;
      handlePressEnd();
      keys.clear();
    } else if (wasPaused && !nowPaused) {
      if (pauseStartedAtMs !== null) {
        pausedTotalOffsetMs += (performance.now() - pauseStartedAtMs);
        pauseStartedAtMs = null;
      }
      pausedFrameRendered = false;
      lastTs = null;
      scheduleMainFrame();
    }
  }
  function isAnyUIOpen() { return uiOpen || settingsOpen || extTitleCardOpen || extModalOpen || extFrameOpen || fsPaused || isGamePaused(); }

  function updateHintText() {
    hintEl.textContent = useJoystick
      ? "Posez le doigt pour faire apparaître le joystick • Récoltez les ressources • Appuyez sur le vaisseau pour assembler"
      : "Touchez l'écran pour déplacer l'alien • Récoltez les ressources • Appuyez sur le vaisseau pour assembler";
  }
  function setUseJoystick(enabled, persist = true) {
    useJoystick = Boolean(enabled);
    if (joystickToggleEl) joystickToggleEl.checked = useJoystick;
    if (persist) {
      try {
        localStorage.setItem(JOYSTICK_STORAGE_KEY, useJoystick ? "1" : "0");
      } catch (_) {}
    }
    cancelActivePointer();
    updateHintText();
  }
  joystickToggleEl.checked = useJoystick;
  updateHintText();

  function getCompassLayout() {
    const isNarrowPortrait = viewH > viewW && viewW <= 500;
    const r = isNarrowPortrait ? 30 : 34;
    return {
      cx: viewW - (isNarrowPortrait ? 46 : 58) - safeRight,
      cy: (isNarrowPortrait ? 52 : 56) + safeTop,
      r
    };
  }

  function isPointOnCompass(sx, sy) {
    if (!SHOW_COMPASS) return false;
    const { cx, cy, r } = getCompassLayout();
    const inNeedle = Math.hypot(sx - cx, sy - cy) <= r + 10;
    const inLabel = Math.abs(sx - cx) <= 44 && sy >= cy && sy <= cy + r + 42;
    return inNeedle || inLabel;
  }

  function getCanvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function baseScreenToWorld(sx, sy) {
    const rx = (sx - viewW * 0.5) / currentZoom;
    const ry = (sy - viewH * 0.5) / currentZoom;
    if (!cam.angle) {
      return { x: cam.x + rx, y: cam.y + ry };
    }
    const c = Math.cos(cam.angle);
    const s = Math.sin(cam.angle);
    return {
      x: cam.x + rx * c + ry * s,
      y: cam.y - rx * s + ry * c
    };
  }

  function screenToWorld(sx, sy) {
    return runHook("screenToWorld", baseScreenToWorld, sx, sy);
  }

  function validateSlots() {
    if (slotA && getQty(slotA) <= 0) slotA = "";
    if (slotB) {
      if (slotB === slotA && getQty(slotB) < 2) slotB = "";
      else if (getQty(slotB) <= 0) slotB = "";
    }
  }

  function renderSlotButton(btnEl, id, placeholder) {
    if (id && elementsById.has(id)) {
      const el = elementsById.get(id);
      btnEl.innerHTML = `<span class="slot-icon">${renderElementIconHtml(el, 56)}</span>`;
      btnEl.title = `${el.name} (Niveau ${el.level}) • Cliquer pour vider • Glisser pour échanger`;
      btnEl.setAttribute("aria-label", `${el.name}, niveau ${el.level} — Cliquer pour vider`);
      btnEl.classList.add("filled");
      btnEl.classList.remove("can-place");
      btnEl.style.borderColor = el.color || "#66d9ff";
    } else {
      const selEl = (inspectedId && elementsById.has(inspectedId) && getRemainingQty(inspectedId) > 0)
        ? elementsById.get(inspectedId)
        : null;
      if (selEl) {
        btnEl.innerHTML = `<span class="slot-title">${placeholder}</span><span class="slot-sub">Cliquer pour placer ${selEl.name}</span>`;
        btnEl.title = `Cliquer pour placer ${selEl.name} ou glisser un élément ici`;
        btnEl.setAttribute("aria-label", `${placeholder} — Cliquer pour placer ${selEl.name}`);
        btnEl.classList.add("can-place");
      } else {
        btnEl.innerHTML = `<span class="slot-title">${placeholder}</span><span class="slot-sub">Glisser un élément ici</span>`;
        btnEl.title = "Glissez-déposez un élément de l'inventaire ici";
        btnEl.setAttribute("aria-label", placeholder);
        btnEl.classList.remove("can-place");
      }
      btnEl.classList.remove("filled");
      btnEl.style.borderColor = "";
    }
  }

  function renderWorkbench() {
    renderSlotButton(slotAEl, slotA, "Emplacement A");
    renderSlotButton(slotBEl, slotB, "Emplacement B");

    assembleBtnEl.disabled = !canAffordPair(slotA, slotB);
  }

  function renderToolbar() {
    filterDiscoveredBtnEl.textContent = showAllDiscovered
      ? "📖 Tous découverts"
      : "📦 Inventaire";
    filterDiscoveredBtnEl.classList.toggle("active", !showAllDiscovered);

    if (craftHintsBtnEl) {
      craftHintsBtnEl.classList.toggle("active", showCraftHints);
      craftHintsBtnEl.setAttribute("aria-pressed", showCraftHints ? "true" : "false");
    }

    lvlBarEl.innerHTML = "";
    for (let lvl = 0; lvl <= maxElementLevel; lvl++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lvl-btn" + (levelFilter === lvl ? " active" : "");
      b.textContent = lvl === 0 ? "Tous" : String(lvl);
      b.addEventListener("click", () => {
        levelFilter = lvl;
        renderToolbar();
        renderGrid();
      });
      lvlBarEl.appendChild(b);
    }
    const menuFilterBtn = document.createElement("button");
    menuFilterBtn.type = "button";
    menuFilterBtn.className = "lvl-btn" + (levelFilter === LEVEL_FILTER_MENU ? " active" : "");
    menuFilterBtn.textContent = "🧩 Menus";
    menuFilterBtn.title = "Afficher uniquement les éléments ayant un menu qui s'ouvre";
    menuFilterBtn.addEventListener("click", () => {
      levelFilter = LEVEL_FILTER_MENU;
      renderToolbar();
      renderGrid();
    });
    lvlBarEl.appendChild(menuFilterBtn);
  }

  function getElementActionsFor(el) {
    if (!el) return [];
    return extElementActions.filter(act => {
      if (typeof act.match === "function") {
        try { return Boolean(act.match(el)); } catch (_e) { return false; }
      }
      return Boolean(act.elementId) && act.elementId === el.id;
    });
  }

  function hasElementAction(el) {
    return getElementActionsFor(el).length > 0;
  }

  function getUsesOf(id) {
    const elSelf = elementsById.get(id);
    const uses = [];
    for (const u of elementsList) {
      if (!Array.isArray(u.recipe)) continue;
      if (u.recipe.includes(id)) {
        uses.push(u);
        continue;
      }
      if (elSelf && u.id !== id) {
        for (const ing of u.recipe) {
          if (isTagIngredient(ing) && elementMatchesIngredient(elSelf, ing)) {
            uses.push(u);
            break;
          }
        }
      }
    }
    return uses;
  }

  function isDeadEndElement(id) {
    return getUsesOf(id).length === 0;
  }

  function isFailedRecipePair(idA, idB) {
    return Boolean(idA && idB) && failedRecipes.has(pairKey(idA, idB)) && !findRecipeResult(idA, idB);
  }

  function getFailedPartnerNamesForCard(elId) {
    if (!elId) return [];
    const anchors = [];
    if (slotA && slotB) {
      if (slotA === slotB) {
        anchors.push(slotA);
      } else if (elId === slotA) {
        anchors.push(slotB);
      } else if (elId === slotB) {
        anchors.push(slotA);
      } else {
        if (isFailedRecipePair(slotA, elId) && isFailedRecipePair(slotB, elId)) {
          anchors.push(slotA, slotB);
        }
        return anchors.map(aid => elementsById.get(aid)?.name || aid);
      }
    } else if (slotA || slotB) {
      anchors.push(slotA || slotB);
    } else {
      return [];
    }
    const out = [];
    for (const aid of anchors) {
      if (isFailedRecipePair(aid, elId)) {
        out.push(elementsById.get(aid)?.name || aid);
      }
    }
    return out;
  }

  function renderDescriptionPanel() {
    if (!inspectedId || !elementsById.has(inspectedId)) {
      descPanelEl.classList.remove("open");
      return;
    }
    descPanelEl.classList.add("open");
    const el = elementsById.get(inspectedId);
    descTitleEl.innerHTML = `${renderElementIconHtml(el, 28)}<span>${el.name}</span>`;
    descBodyEl.textContent = el.description || "";

    if (Number(el.level) === 1 || !Array.isArray(el.recipe) || el.recipe.length === 0) {
      const spawns = getElementBiomeSpawns(el);
      const bIds = spawns.map(sp => sp.biome);
      let bLabelHtml = "";
      if (bIds.includes("all")) {
        bLabelHtml = escapeHtmlText("🌐 Tous les biomes");
      } else {
        bLabelHtml = bIds.map(bid => {
          const bInfo = getBiomeById(bid);
          return bInfo ? formatBiomeInlineHtml(bInfo, 17) : escapeHtmlText(bid);
        }).join(", ");
      }
      const prefix = (bIds.length > 1 || bIds.includes("all")) ? "Biomes" : "Biome";
      descRecipeEl.innerHTML = bLabelHtml
        ? `🌍 Ressource naturelle (Niveau 1)<br>${prefix} : ${bLabelHtml}`
        : "🌍 Ressource naturelle (Niveau 1)";
    } else if (el.recipe.length === 2) {
      const a = elementsById.get(el.recipe[0]);
      const b = elementsById.get(el.recipe[1]);
      const aHtml = a ? formatElementInlineHtml(a, 16) : escapeHtmlText(el.recipe[0]);
      const bHtml = b ? formatElementInlineHtml(b, 16) : escapeHtmlText(el.recipe[1]);
      let recHtml = `🧪 Recette : ${aHtml} + ${bHtml}`;
      const visSpawns = getElementBiomeSpawns(el).filter(sp => sp.showInBiomeMenu);
      if (visSpawns.length > 0) {
        const bIds = visSpawns.map(sp => sp.biome);
        const bLabelHtml = bIds.includes("all")
          ? escapeHtmlText("🌐 Tous les biomes")
          : bIds.map(bid => {
              const bInfo = getBiomeById(bid);
              return bInfo ? formatBiomeInlineHtml(bInfo, 17) : escapeHtmlText(bid);
            }).join(", ");
        recHtml += `<br>🌍 Aussi trouvable dans : ${bLabelHtml}`;
      }
      descRecipeEl.innerHTML = recHtml;
    } else {
      descRecipeEl.textContent = "";
    }

    if (descDetailsBtnEl) {
      descDetailsBtnEl.textContent = `ℹ️ Détails ${showDescDetails ? "▴" : "▾"}`;
      descDetailsBtnEl.classList.toggle("active", showDescDetails);
      descDetailsBtnEl.setAttribute("aria-expanded", showDescDetails ? "true" : "false");
    }
    if (descDetailsEl) {
      descDetailsEl.classList.toggle("open", showDescDetails);
    }

    const uses = getUsesOf(el.id);
    if (uses.length === 0) {
      descUsesBtnEl.disabled = true;
      descUsesBtnEl.textContent = "🏁 Élément final (0 assemblage)";
      descUsesEl.classList.remove("open");
      descUsesEl.textContent = "";
    } else {
      descUsesBtnEl.disabled = false;
      descUsesBtnEl.textContent = `🔗 Utilisé dans (${uses.length})  ${showUses ? "▴" : "▾"}`;
      descUsesEl.classList.toggle("open", showUses);
      if (showUses) {
        const lines = [];
        let unknownCount = 0;
        for (const u of uses) {
          if (discovered.has(u.id)) lines.push(`• ${formatElementInlineHtml(u, 15)}`);
          else unknownCount++;
        }
        if (unknownCount > 0) lines.push(escapeHtmlText(`• ❓ ${unknownCount} assemblage(s) encore à découvrir`));
        descUsesEl.innerHTML = lines.join("\n");
      }
    }

    if (descExtActionsEl) {
      descExtActionsEl.innerHTML = "";
      const matching = getElementActionsFor(el);
      if (matching.length > 0) {
        for (const act of matching) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "desc-ext-action-btn";
          if (act.accentColor) btn.style.setProperty("--ext-action-accent", act.accentColor);
          const prefix = act.icon ? `${act.icon} ` : "";
          btn.textContent = `${prefix}${act.buttonText || "Ouvrir l'élément"}`;
          btn.addEventListener("click", () => {
            if (typeof act.onClick === "function") {
              try { act.onClick(el); } catch (err) { console.error(err); }
            }
          });
          descExtActionsEl.appendChild(btn);
        }
        descExtActionsEl.classList.add("open");
      } else {
        descExtActionsEl.classList.remove("open");
      }
    }

    if (descColRightEl) {
      descColRightEl.classList.toggle("details-open", showDescDetails);
    }
  }

  function getHoveredSlot(clientX, clientY, isTouch = false) {
    const pad = isTouch ? 14 : 8;
    const ra = slotAEl.getBoundingClientRect();
    if (clientX >= ra.left - pad && clientX <= ra.right + pad && clientY >= ra.top - pad && clientY <= ra.bottom + pad) {
      return "a";
    }
    const rb = slotBEl.getBoundingClientRect();
    if (clientX >= rb.left - pad && clientX <= rb.right + pad && clientY >= rb.top - pad && clientY <= rb.bottom + pad) {
      return "b";
    }
    return "";
  }

  function updateDragHoverVisual(slotKey) {
    slotAEl.classList.toggle("drag-over", slotKey === "a");
    slotBEl.classList.toggle("drag-over", slotKey === "b");
  }

  function positionDragGhost(clientX, clientY, isTouch) {
    dragGhostEl.style.left = `${clientX}px`;
    dragGhostEl.style.top = `${clientY - (isTouch ? 28 : 0)}px`;
  }

  function activateDragVisual(state, clientX, clientY) {
    const el = elementsById.get(state.id);
    if (!el) return;
    state.active = true;
    if (state.sourceEl) state.sourceEl.classList.add("dragging");
    dragGhostEl.innerHTML = `${renderElementIconHtml(el, 24)}<span>${el.name}</span>`;
    dragGhostEl.style.borderColor = el.color || "#66d9ff";
    positionDragGhost(clientX, clientY, state.isTouch);
    dragGhostEl.style.display = "inline-flex";
    updateDragHoverVisual(getHoveredSlot(clientX, clientY, state.isTouch));
  }

  function dropElementOnSlot(targetSlot, id, source) {
    if (!id || !elementsById.has(id)) return;
    if ((source === "slot_a" && targetSlot === "b") || (source === "slot_b" && targetSlot === "a")) {
      const tmp = slotA;
      slotA = slotB;
      slotB = tmp;
    } else if ((source === "slot_a" && targetSlot === "a") || (source === "slot_b" && targetSlot === "b")) {
      return;
    } else {
      const qty = getQty(id);
      if (qty <= 0) {
        benchFeedbackEl.textContent = "Cet élément n'est pas en stock (×0).";
        benchFeedbackEl.style.color = "#ffc86b";
        return;
      }
      if (targetSlot === "a") {
        if (slotB === id && qty < 2) {
          benchFeedbackEl.textContent = "Il faut ×2 de cet élément pour l'assembler avec lui-même.";
          benchFeedbackEl.style.color = "#ffb86b";
          return;
        }
        slotA = id;
      } else {
        if (slotA === id && qty < 2) {
          benchFeedbackEl.textContent = "Il faut ×2 de cet élément pour l'assembler avec lui-même.";
          benchFeedbackEl.style.color = "#ffb86b";
          return;
        }
        slotB = id;
      }
    }
    benchFeedbackEl.textContent = "";
    renderWorkbench();
    renderGrid();
  }

  function flashSlotPlaced(targetSlot) {
    const btnEl = targetSlot === "a" ? slotAEl : slotBEl;
    if (!btnEl) return;
    btnEl.classList.remove("slot-placed-flash");
    void btnEl.offsetWidth;
    btnEl.classList.add("slot-placed-flash");
    setTimeout(() => btnEl.classList.remove("slot-placed-flash"), 340);
  }

  function placeElementInSlot(targetSlot, id) {
    if (!id || !elementsById.has(id)) return false;
    if (getRemainingQty(id) <= 0) {
      benchFeedbackEl.textContent = getQty(id) <= 0
        ? "Cet élément n'est pas en stock (×0)."
        : "Tous vos exemplaires de cet élément sont déjà placés.";
      benchFeedbackEl.style.color = "#ffc86b";
      return false;
    }
    dropElementOnSlot(targetSlot, id, "grid");
    flashSlotPlaced(targetSlot);
    renderDescriptionPanel();
    return true;
  }

  function placeElementInNextSlot(id) {
    const targetSlot = !slotA ? "a" : "b";
    return placeElementInSlot(targetSlot, id);
  }

  let pendingGridTouch = null;

  function clearPendingGridTouch() {
    if (!pendingGridTouch) return;
    if (pendingGridTouch.timer) clearTimeout(pendingGridTouch.timer);
    if (pendingGridTouch.card) pendingGridTouch.card.classList.remove("hold-arming");
    pendingGridTouch = null;
  }

  function endDrag(clientX, clientY, cancelled = false) {
    clearPendingGridTouch();
    if (gridWrapEl) {
      gridWrapEl.style.overflowY = "";
      gridWrapEl.classList.remove("drag-locked");
    }
    if (!dragState) return;
    const st = dragState;
    dragState = null;
    if (st.sourceEl) st.sourceEl.classList.remove("dragging", "drag-grabbed", "hold-arming");
    dragGhostEl.classList.remove("grab-pop");
    dragGhostEl.style.display = "none";
    updateDragHoverVisual("");
    if (st.active) {
      suppressClickUntil = performance.now() + 400;
      if (!cancelled) {
        const target = getHoveredSlot(clientX, clientY, st.isTouch);
        if (target) {
          dropElementOnSlot(target, st.id, st.source);
        } else if (st.source === "slot_a" && slotA) {
          slotA = "";
          benchFeedbackEl.textContent = "";
          renderWorkbench();
          renderGrid();
        } else if (st.source === "slot_b" && slotB) {
          slotB = "";
          benchFeedbackEl.textContent = "";
          renderWorkbench();
          renderGrid();
        }
      }
    } else if (!cancelled && st.isTouch) {
      if (st.source === "grid") {
        onElementCardClick(st.id, true);
        suppressGridClickUntil = performance.now() + 400;
      } else if (st.source === "slot_a" && slotA) {
        slotA = "";
        renderWorkbench();
        renderGrid();
        suppressSlotClickUntil = performance.now() + 400;
      } else if (st.source === "slot_b" && slotB) {
        slotB = "";
        renderWorkbench();
        renderGrid();
        suppressSlotClickUntil = performance.now() + 400;
      }
    }
  }

  function getRemainingQty(id) {
    const used = (slotA === id ? 1 : 0) + (slotB === id ? 1 : 0);
    return Math.max(0, getQty(id) - used);
  }

  function beginDragCandidate(id, source, sourceEl, clientX, clientY, isTouch, touchId = null) {
    if (!id || !elementsById.has(id)) return;
    if (source === "grid" && getRemainingQty(id) <= 0) {
      benchFeedbackEl.textContent = getQty(id) <= 0
        ? "Cet élément n'est pas en stock (×0)."
        : "Tous vos exemplaires de cet élément sont déjà placés.";
      benchFeedbackEl.style.color = "#ffc86b";
      return;
    }
    if (dragState) endDrag(clientX, clientY, true);
    dragState = {
      id,
      source,
      sourceEl,
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY,
      isTouch,
      touchId,
      active: false
    };
  }

  window.addEventListener("mousemove", (e) => {
    if (!dragState || dragState.isTouch) return;
    dragState.lastX = e.clientX;
    dragState.lastY = e.clientY;
    if (!dragState.active) {
      if (Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY) >= 6) {
        activateDragVisual(dragState, e.clientX, e.clientY);
      }
    } else {
      positionDragGhost(e.clientX, e.clientY, false);
      updateDragHoverVisual(getHoveredSlot(e.clientX, e.clientY, false));
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (!dragState || dragState.isTouch) return;
    endDrag(e.clientX, e.clientY, false);
  });

  function findDragTouch(touchList, touchId) {
    if (!touchList || touchList.length === 0) return null;
    if (touchId === null || touchId === undefined) return touchList[0];
    for (let i = 0; i < touchList.length; i++) {
      if (touchList[i].identifier === touchId) return touchList[i];
    }
    return null;
  }

  window.addEventListener("touchmove", (e) => {
    if (pendingGridTouch) {
      const pt = findDragTouch(e.touches, pendingGridTouch.touchId);
      if (pt) {
        pendingGridTouch.lastX = pt.clientX;
        pendingGridTouch.lastY = pt.clientY;
        if (Math.hypot(pt.clientX - pendingGridTouch.startX, pt.clientY - pendingGridTouch.startY) >= 10) {
          clearPendingGridTouch();
        }
      }
    }
    if (!dragState || !dragState.isTouch) return;
    const t = findDragTouch(e.touches, dragState.touchId);
    if (!t) return;
    e.preventDefault();
    dragState.lastX = t.clientX;
    dragState.lastY = t.clientY;
    if (!dragState.active) {
      const dx = t.clientX - dragState.startX;
      const dy = t.clientY - dragState.startY;
      if (Math.hypot(dx, dy) >= 6) {
        activateDragVisual(dragState, t.clientX, t.clientY);
      }
    } else {
      positionDragGhost(t.clientX, t.clientY, true);
      updateDragHoverVisual(getHoveredSlot(t.clientX, t.clientY, true));
    }
  }, { passive: false });

  window.addEventListener("touchend", (e) => {
    if (pendingGridTouch) {
      const pt = findDragTouch(e.changedTouches, pendingGridTouch.touchId);
      if (pt || e.touches.length === 0) clearPendingGridTouch();
    }
    if (!dragState || !dragState.isTouch) return;
    const t = findDragTouch(e.changedTouches, dragState.touchId);
    if (!t && dragState.touchId !== null && dragState.touchId !== undefined) return;
    endDrag(t ? t.clientX : dragState.lastX, t ? t.clientY : dragState.lastY, false);
  }, { passive: false });

  window.addEventListener("touchcancel", (e) => {
    if (pendingGridTouch) {
      const pt = findDragTouch(e.changedTouches, pendingGridTouch.touchId);
      if (pt || e.touches.length === 0) clearPendingGridTouch();
    }
    if (!dragState || !dragState.isTouch) return;
    const t = findDragTouch(e.changedTouches, dragState.touchId);
    if (!t && dragState.touchId !== null && dragState.touchId !== undefined) return;
    endDrag(dragState.lastX, dragState.lastY, true);
  });

  function renderGrid() {
    elementsGridEl.innerHTML = "";
    const filtered = elementsList.filter(el => {
      const qty = getQty(el.id);
      if (showAllDiscovered ? !discovered.has(el.id) : qty <= 0) return false;
      if (levelFilter === LEVEL_FILTER_MENU) {
        if (!hasElementAction(el)) return false;
      } else if (levelFilter > 0 && Number(el.level) !== levelFilter) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      emptyMsgEl.style.display = "block";
      if (levelFilter === LEVEL_FILTER_MENU) {
        emptyMsgEl.textContent = showAllDiscovered
          ? "Aucun élément découvert ne possède de menu interactif pour le moment."
          : "Aucun élément avec un menu interactif dans votre inventaire. Activez « Tous découverts » ou récoltez-en un !";
      } else {
        emptyMsgEl.textContent = showAllDiscovered
          ? "Aucun élément découvert dans ce filtre. Explorez la planète pour récolter des éléments !"
          : "Inventaire vide pour ce filtre. Promenez-vous sur la planète pour récolter des éléments, ou activez « Tous découverts ».";
      }
      return;
    }
    emptyMsgEl.style.display = "none";

    for (const el of filtered) {
      const qty = getQty(el.id);
      const rem = getRemainingQty(el.id);
      const isDeadEnd = showCraftHints && isDeadEndElement(el.id);
      const failedPartners = showCraftHints ? getFailedPartnerNamesForCard(el.id) : [];
      const isFailedPair = failedPartners.length > 0;
      const card = document.createElement("button");
      card.type = "button";
      card.dataset.elId = el.id;
      card.className = "el-card"
        + (rem <= 0 ? " zero" : "")
        + (isDeadEnd ? " hint-dead-end" : "")
        + (isFailedPair ? " hint-failed-pair" : "")
        + (inspectedId === el.id ? " selected" : "")
        + (rem > 0 && (slotA === el.id || slotB === el.id) ? " in-slot" : "");
      if (rem > 0 && el.color && !isDeadEnd && !isFailedPair) card.style.borderColor = el.color;
      let titleText = rem !== qty
        ? `${el.name} • Dispo : ×${rem} (stock : ×${qty})\nCliquer : description • Double-clic ou glisser : emplacement`
        : `${el.name} • ×${qty}\nCliquer : description • Double-clic ou glisser : emplacement`;
      if (isDeadEnd) titleText += "\n🏁 Cul-de-sac (aucun assemblage possible)";
      if (isFailedPair) titleText += `\n🚫 Déjà testé sans résultat avec : ${failedPartners.join(", ")}`;
      card.title = titleText;
      card.setAttribute("aria-label", `${el.name}, niveau ${el.level}, disponible ${rem}`);
      let hintBadgesHtml = "";
      if (isDeadEnd) hintBadgesHtml += `<span class="el-hint-badge dead-end" aria-hidden="true">🏁</span>`;
      if (isFailedPair) hintBadgesHtml += `<span class="el-hint-badge failed-pair" aria-hidden="true">🚫</span>`;
      card.innerHTML = `${hintBadgesHtml}<span class="el-icon">${renderElementIconHtml(el, 48)}</span><span class="el-qty-watermark">×${rem}</span>`;
      card.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        beginDragCandidate(el.id, "grid", card, e.clientX, e.clientY, false);
      });
      card.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1 || getRemainingQty(el.id) <= 0) return;
        const t = e.touches[0];
        const needsScroll = gridWrapEl && (gridWrapEl.scrollHeight > gridWrapEl.clientHeight + 4);
        if (!needsScroll || CRAFT_LONG_PRESS_MS <= 0) {
          e.preventDefault();
          beginDragCandidate(el.id, "grid", card, t.clientX, t.clientY, true, t.identifier);
          return;
        }
        clearPendingGridTouch();
        card.style.setProperty("--hold-ms", `${CRAFT_LONG_PRESS_MS}ms`);
        card.classList.add("hold-arming");
        pendingGridTouch = {
          id: el.id,
          card,
          touchId: t.identifier,
          startX: t.clientX,
          startY: t.clientY,
          lastX: t.clientX,
          lastY: t.clientY,
          timer: setTimeout(() => {
            const p = pendingGridTouch;
            pendingGridTouch = null;
            if (!p) return;
            if (p.card) {
              p.card.classList.remove("hold-arming");
              p.card.classList.add("drag-grabbed");
            }
            if (gridWrapEl) {
              gridWrapEl.style.overflowY = "hidden";
              gridWrapEl.classList.add("drag-locked");
            }
            beginDragCandidate(p.id, "grid", p.card, p.lastX, p.lastY, true, p.touchId);
            if (dragState) {
              activateDragVisual(dragState, p.lastX, p.lastY);
              dragGhostEl.classList.remove("grab-pop");
              void dragGhostEl.offsetWidth;
              dragGhostEl.classList.add("grab-pop");
            }
            if (navigator.vibrate) {
              try { navigator.vibrate(14); } catch (_) {}
            }
          }, CRAFT_LONG_PRESS_MS)
        };
      }, { passive: false });
      card.addEventListener("click", () => onElementCardClick(el.id, false));
      elementsGridEl.appendChild(card);
    }
  }

  function onElementCardClick(id, fromTouchEnd = false) {
    const now = performance.now();
    if (now < suppressClickUntil) return;
    if (!fromTouchEnd && now < suppressGridClickUntil) return;
    if (lastCardTapId === id && (now - lastCardTapAt) <= DOUBLE_TAP_WINDOW_MS) {
      lastCardTapId = "";
      lastCardTapAt = 0;
      placeElementInNextSlot(id);
      return;
    }
    lastCardTapId = id;
    lastCardTapAt = now;
    inspectedId = (inspectedId === id) ? "" : id;
    showDescDetails = false;
    showUses = false;
    renderWorkbench();
    renderGrid();
    renderDescriptionPanel();
  }

  function spawnCraftSparkles(cx, cy, accentColor, count = 8) {
    const glyphs = ["✨", "✦", "★", "✧"];
    for (let i = 0; i < count; i++) {
      const sp = document.createElement("div");
      sp.className = "craft-sparkle";
      sp.textContent = glyphs[i % glyphs.length];
      sp.style.color = (i % 2 === 0) ? accentColor : "#fff09e";
      sp.style.fontSize = (i % 2 === 0) ? "18px" : "13px";
      sp.style.left = `${cx}px`;
      sp.style.top = `${cy}px`;
      document.body.appendChild(sp);
      const angle = (Math.PI * 2 * i / count) + (Math.random() * 0.44 - 0.22);
      const dist = 42 + Math.random() * 38;
      const rot = Math.round(Math.random() * 140 - 70);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          sp.style.left = `${cx + Math.cos(angle) * dist}px`;
          sp.style.top = `${cy + Math.sin(angle) * dist}px`;
          sp.style.transform = `translate(-50%, -50%) scale(1.2) rotate(${rot}deg)`;
          sp.style.opacity = "0";
        });
      });
      setTimeout(() => sp.remove(), 700);
    }
  }

  function animateAndFocusNewElement(resId, isNew = false) {
    const el = elementsById.get(resId);
    const card = elementsGridEl.querySelector(`.el-card[data-el-id="${CSS.escape(resId)}"]`);
    if (!card) return;

    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    card.focus({ preventScroll: true });

    const accentColor = isNew ? "#ffe066" : ((el && el.color) || "#73fad1");

    assembleBtnEl.classList.remove("craft-pulse");
    void assembleBtnEl.offsetWidth;
    assembleBtnEl.classList.add("craft-pulse");
    setTimeout(() => assembleBtnEl.classList.remove("craft-pulse"), 450);

    const triggerCardImpact = () => {
      const rect = card.getBoundingClientRect();
      spawnCraftSparkles(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5, accentColor, isNew ? 10 : 6);
      card.classList.remove("just-created");
      void card.offsetWidth;
      card.classList.add("just-created");
      setTimeout(() => card.classList.remove("just-created"), 1100);
    };

    if (el) {
      const startRect = assembleBtnEl.getBoundingClientRect();
      const sx = startRect.left + startRect.width * 0.5;
      const sy = startRect.top + startRect.height * 0.5;
      spawnCraftSparkles(sx, sy, accentColor, isNew ? 10 : 7);

      const flyer = document.createElement("div");
      flyer.className = "fly-icon";
      flyer.innerHTML = renderElementIconHtml(el, 44);
      flyer.style.borderColor = accentColor;
      flyer.style.boxShadow = `0 0 24px ${accentColor}cc`;
      flyer.style.left = `${sx}px`;
      flyer.style.top = `${sy}px`;
      document.body.appendChild(flyer);

      const popDur = 300;
      const flightDur = 560;
      const fadeDur = 180;
      const t0 = performance.now();
      let impactTriggered = false;

      const step = (now) => {
        const dt = now - t0;
        const endRect = card.getBoundingClientRect();
        const ex = endRect.left + endRect.width * 0.5;
        const ey = endRect.top + endRect.height * 0.5;
        const cx = (sx + ex) * 0.5;
        const cy = Math.min(sy, ey) - 95;

        if (dt < popDur) {
          const p = dt / popDur;
          const sc = p < 0.6
            ? 0.25 + (1.42 - 0.25) * (1 - Math.pow(1 - p / 0.6, 3))
            : 1.42 - (1.42 - 1.18) * ((p - 0.6) / 0.4);
          const deg = Math.sin(p * Math.PI * 1.5) * -10;
          flyer.style.left = `${sx}px`;
          flyer.style.top = `${sy}px`;
          flyer.style.transform = `translate(-50%, -50%) scale(${sc.toFixed(3)}) rotate(${deg.toFixed(1)}deg)`;
          requestAnimationFrame(step);
        } else if (dt < popDur + flightDur) {
          const raw = (dt - popDur) / flightDur;
          const t = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
          const inv = 1 - t;
          const px = inv * inv * sx + 2 * inv * t * cx + t * t * ex;
          const py = inv * inv * sy + 2 * inv * t * cy + t * t * ey;
          const sc = 1.18 + Math.sin(t * Math.PI) * 0.38 - t * 0.26;
          const deg = Math.sin(t * Math.PI * 2) * 12;
          flyer.style.left = `${px}px`;
          flyer.style.top = `${py}px`;
          flyer.style.transform = `translate(-50%, -50%) scale(${sc.toFixed(3)}) rotate(${deg.toFixed(1)}deg)`;
          requestAnimationFrame(step);
        } else {
          if (!impactTriggered) {
            impactTriggered = true;
            triggerCardImpact();
          }
          const f = Math.min(1, (dt - popDur - flightDur) / fadeDur);
          const sc = 0.92 + f * 0.62;
          flyer.style.left = `${ex}px`;
          flyer.style.top = `${ey}px`;
          flyer.style.transform = `translate(-50%, -50%) scale(${sc.toFixed(3)})`;
          flyer.style.opacity = `${(1 - f).toFixed(3)}`;
          if (f < 1) {
            requestAnimationFrame(step);
          } else {
            flyer.remove();
          }
        }
      };
      requestAnimationFrame(step);
    } else {
      triggerCardImpact();
    }
  }

  function switchShipView(mode) {
    shipViewMode = mode;
    const isCraft = mode === "craft";
    const isBiomes = mode === "biomes";
    const isSaves = mode === "saves";
    shipViewHubEl.classList.toggle("active", mode === "hub");
    shipViewCraftEl.classList.toggle("active", isCraft);
    shipViewBiomesEl.classList.toggle("active", isBiomes);
    shipViewSavesEl.classList.toggle("active", isSaves);
    shipBackBtnEl.style.display = mode === "hub" ? "none" : "";
    shipStatsEl.style.display = mode === "hub" ? "" : "none";
    exitBtnEl.textContent = "✕";
    exitBtnEl.classList.remove("icon-close");
    exitBtnEl.classList.add("icon-close-lg");
    exitBtnEl.setAttribute("aria-label", EXIT_BTN_TEXT);
    if (isBiomes) {
      renderBiomesView();
      const scrollWrap = shipViewBiomesEl.querySelector(".biomes-scroll-wrap");
      if (scrollWrap) scrollWrap.scrollTop = 0;
    } else if (isSaves) {
      renderSavesView();
    } else if (isCraft) {
      renderToolbar();
      renderWorkbench();
      renderGrid();
      renderDescriptionPanel();
    }
  }

  function renderBiomesView() {
    biomesListEl.innerHTML = "";
    for (const b of BIOMES) {
      if (!b || !b.id) continue;
      if (isBiomeLocked(b)) {
        const card = document.createElement("div");
        card.className = "biome-card locked";
        card.setAttribute("aria-disabled", "true");
        card.innerHTML = `
          <div class="biome-card-icon">${renderBiomeIconHtml(b, 56, "", "🔒")}</div>
          <div class="biome-card-title">${b.name || b.id}</div>
          <div class="biome-status-pill locked">🔒 Bloqué</div>
          <div class="biome-n1-icons">
            <div class="biome-n1-badge unknown">?</div>
            <div class="biome-n1-badge unknown">?</div>
            <div class="biome-n1-badge unknown">?</div>
          </div>
        `;
        biomesListEl.appendChild(card);
        continue;
      }
      const isCurrent = b.id === activeBiomeId;
      const accent = b.accentColor || "#38e0d1";
      const card = document.createElement("div");
      card.className = isCurrent ? "biome-card current" : "biome-card clickable";
      card.style.setProperty("--biome-accent", accent);
      card.style.borderColor = isCurrent ? "#73fad1" : accent;
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      if (isCurrent) {
        card.setAttribute("aria-current", "location");
        card.setAttribute("aria-label", `${b.name || b.id} — Biome actuel`);
      } else {
        card.setAttribute("aria-label", `Voyager vers ${b.name || b.id}`);
      }

      const menuElems = getBiomeMenuElementsForBiome(b.id);
      const n1BadgesHtml = menuElems.n1.map(el => {
        const isDisc = discovered.has(el.id);
        if (isDisc) {
          const col = el.color || "#66d9ff";
          return `<div class="biome-n1-badge" style="border-color:${col}" title="${el.name}">${renderElementIconHtml(el, 24)}</div>`;
        }
        return `<div class="biome-n1-badge unknown" title="Élément non découvert">?</div>`;
      }).join("");

      const otherBadgesHtml = menuElems.other.length > 0
        ? `<div class="biome-other-icons">${menuElems.other.map(el => {
            const isDisc = discovered.has(el.id);
            const lvl = Number(el.level) || 2;
            if (isDisc) {
              const col = el.color || "#ffd166";
              return `<div class="biome-other-badge" style="border-color:${col}" title="${el.name} (N${lvl})">${renderElementIconHtml(el, 20)}</div>`;
            }
            return `<div class="biome-other-badge unknown" title="Élément rare non découvert (N${lvl})">?</div>`;
          }).join("")}</div>`
        : "";

      const currentPillHtml = isCurrent
        ? `<div class="biome-status-pill current"><span class="biome-status-dot"></span>Biome actuel</div>`
        : "";

      card.innerHTML = `
        <div class="biome-card-icon">${renderBiomeIconHtml(b, 60, "", "🌍")}</div>
        <div class="biome-card-title">${b.name || b.id}</div>
        ${currentPillHtml}
        <div class="biome-elems-wrap">
          <div class="biome-n1-icons">${n1BadgesHtml}</div>
          ${otherBadgesHtml}
        </div>
      `;

      const activateBiomeCard = (ev) => {
        if (isCurrent) {
          card.classList.remove("current-ping");
          void card.offsetWidth;
          card.classList.add("current-ping");
          showToast(`📍 Vous êtes déjà dans : ${formatBiomeInlineHtml(b, 20)}`, { html: true });
          return;
        }
        travelToBiome(b.id);
      };
      card.addEventListener("click", activateBiomeCard);
      card.addEventListener("keydown", (ev) => {
        if (ev.target !== card) return;
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          activateBiomeCard(ev);
        }
      });

      biomesListEl.appendChild(card);
    }
  }

  let isTravelingBiome = false;

  async function travelToBiome(biomeId) {
    if (isTravelingBiome) return;
    const targetB = BIOMES.find(x => x && x.id === biomeId);
    if (!targetB || isBiomeLocked(targetB)) return;
    const targetGenId = normalizeBiomeGeneratorId(targetB.generator);
    isTravelingBiome = true;
    try {
      let loadingUi = getBiomeLoadingUi(targetGenId);
      if (loadingUi) {
        const alreadyLoaded = Boolean(window.AssemblageBiomeGenerators && window.AssemblageBiomeGenerators[targetGenId]);
        await loadingUi.show(
          targetB,
          alreadyLoaded ? "Préparation du terrain…" : "Chargement des modules du biome…"
        );
      }
      const prevGen = getActiveBiomeGenerator();
      if (prevGen && typeof prevGen.onUnload === "function") {
        try { prevGen.onUnload(); } catch (_e) {}
      }
      await ensureBiomeGeneratorLoaded(targetGenId, false, targetB);
      loadingUi = getBiomeLoadingUi(targetGenId);
      if (loadingUi) {
        loadingUi.update("Génération du terrain…");
        await loadingUi.waitFrame();
      }
      applyActiveBiomeParams(biomeId);
      const nextGen = getActiveBiomeGenerator();
      if (nextGen && typeof nextGen.reset === "function") {
        try { nextGen.reset(); } catch (_e) {}
      }
      if (typeof clearAllChunkActors === "function") clearAllChunkActors();
      if (typeof ensureActorsLoadedForList === "function" && hostActorsApi) {
        await ensureActorsLoadedForList(hostActorsApi.getForBiome(activeBiomeId));
      }
      chunks.clear();
      lastCenterKey = "";
      pendingChunkRefresh = false;
      alien.x = 115;
      alien.y = 70;
      alien.vx = 0;
      alien.vy = 0;
      cam.x = alien.x;
      cam.y = alien.y;
      hasTarget = false;
      shipContactLocked = false;
      updateChunks(alien.x, alien.y);
      runHook("onBiomeChange", () => {}, activeBiomeId);
      emitHostEvent("biome:changed", { biomeId: activeBiomeId });
      saveCurrentSlot(true);
      syncUnlockedExtensions(false);
      closeShipUI();
      showToast(`🚀 Atterrissage : ${formatBiomeInlineHtml(activeBiome, 20)} !`, { html: true });
    } finally {
      isTravelingBiome = false;
      const loadingUi = getBiomeLoadingUi(targetGenId);
      if (loadingUi) loadingUi.hide();
    }
  }

  // --- Système de sauvegarde multi-slots (localStorage + validation MAJ) ---
  const SAVE_VERSION = 1;
  function getGameVersion() {
    const el = document.getElementById("version-badge");
    const txt = el ? el.textContent.trim() : "";
    return txt.replace(/^v/i, "") || "0.1.0";
  }
  const SCENARIO_STORAGE_SUFFIX = (SCENARIO_META?.id && SCENARIO_META.id !== "base") ? `${SCENARIO_META.id}_` : "";
  const SAVE_KEY_PREFIX = `assemblage_save_v1_${SCENARIO_STORAGE_SUFFIX}`;
  const SAVE_LAST_KEY = SCENARIO_STORAGE_SUFFIX ? `assemblage_last_slot_v1_${SCENARIO_META.id}` : "assemblage_last_slot_v1";
  const DEFAULT_SLOTS = ["slot_1", "slot_2", "slot_3"];
  const ID_ALIASES = {};

  let currentSlotId = "slot_1";
  let currentSlotCreatedAt = "";
  let playTimeSec = 0;
  let autosaveDirty = false;
  let autosaveTimer = 0;
  let lastSavedPosX = 115;
  let lastSavedPosY = 70;
  let isSwitchingScenario = false;
  const AUTOSAVE_INTERVAL_SEC = 5;
  const extensionStates = new Map(); // instanceKey (id || filename) -> { unlocked: bool, enabled: bool, unlocked_at: string, state: {} }
  const unlockedBiomes = new Set(); // biome_id débloqués par condition de campagne ou extension
  const lockedBiomes = new Set(); // biome_id verrouillés dynamiquement par une extension
  const campaignFlags = new Map(); // flagKey -> boolean | primitive
  const campaignStats = new Map(); // statKey -> number
  const minigdResults = new Map(); // targetKey (path or path#preset) -> { plays, wins, bestScore, lastWon, lastScore, lastPlayedAt }

  function mapToPlainObj(m) {
    const out = {};
    for (const [k, v] of m.entries()) out[k] = v;
    return out;
  }

  function computeContentHash() {
    const elIds = elementsList.map(e => String(e?.id || "")).sort();
    const bParts = BIOMES.map(b => `${b?.id || ""}:${Number(b?.worldSeed ?? 4242) | 0}`).sort();
    const raw = `v${Number(ELEMENTS_DATA?.version || 1)}|el:${elIds.join(",")}|b:${bParts.join(",")}`;
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ((h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0"));
  }

  function defaultSlotName(slotId) {
    return slotId.startsWith("slot_") ? `Partie ${slotId.slice(5)}` : `Partie ${slotId}`;
  }

  function storageGet(k) {
    try { return window.localStorage.getItem(k); } catch { return null; }
  }
  function storageSet(k, v) {
    try { window.localStorage.setItem(k, v); return true; } catch { return false; }
  }
  function storageRemove(k) {
    try { window.localStorage.removeItem(k); return true; } catch { return false; }
  }

  let p2pSoloSnapshot = null; // Sauvegarde en RAM du monde solo pendant une session P2P (invité)

  function buildSavePayload(slotId) {
    const nowIso = new Date().toISOString();
    const snap = p2pSoloSnapshot;
    const biomeSeeds = {};
    if (snap && snap.biomeSeeds) {
      Object.assign(biomeSeeds, snap.biomeSeeds);
    } else {
      for (const b of BIOMES) {
        if (b && b.id) biomeSeeds[b.id] = Number(b.worldSeed ?? 4242) | 0;
      }
    }
    const invObj = {};
    for (const [id, qty] of inventory.entries()) {
      if (qty > 0) invObj[id] = qty;
    }
    const chunksLru = (snap && Array.isArray(snap.collectedChunks)) ? snap.collectedChunks : exportCollectedChunksLRU();
    const saveBiomeId = (snap && snap.activeBiomeId) ? snap.activeBiomeId : activeBiomeId;
    const savePosX = (snap && Number.isFinite(snap.playerX)) ? snap.playerX : alien.x;
    const savePosY = (snap && Number.isFinite(snap.playerY)) ? snap.playerY : alien.y;
    return {
      meta: {
        save_version: SAVE_VERSION,
        game_version: getGameVersion(),
        elements_db_version: Number(ELEMENTS_DATA?.version || 1),
        content_hash: computeContentHash(),
        slot_id: slotId,
        slot_name: defaultSlotName(slotId),
        created_at: currentSlotCreatedAt || nowIso,
        updated_at: nowIso,
        play_time_sec: Math.max(0, Math.round(playTimeSec)),
        summary: {
          biome_id: saveBiomeId,
          discovered_count: discovered.size,
          total_count: elementsList.length,
          collected_chunks_count: chunksLru.length,
          extensions_count: Array.from(extensionStates.values()).filter(s => s && s.unlocked).length,
        },
      },
      player: {
        position: { x: Math.round(savePosX * 10) / 10, y: Math.round(savePosY * 10) / 10 },
        facing_angle: Math.round(alien.facing * 1000) / 1000,
        distance_traveled: Math.round(Math.max(0, alien.distance) * 10) / 10,
        hint_dismissed: hintDismissed,
      },
      world: {
        active_biome_id: saveBiomeId,
        biome_seeds: biomeSeeds,
        collected_chunks: chunksLru,
      },
      progress: {
        inventory: invObj,
        discovered: Array.from(discovered).sort(),
        failed_recipes: Array.from(failedRecipes).sort(),
        extensions: exportExtensionStatesObj(),
        unlocked_biomes: Array.from(unlockedBiomes).sort(),
        locked_biomes: Array.from(lockedBiomes).sort(),
        flags: mapToPlainObj(campaignFlags),
        stats: mapToPlainObj(campaignStats),
        minigd: mapToPlainObj(minigdResults),
        actor_kills: mapToPlainObj(actorKillsById),
        discovered_anchors: exportDiscoveredAnchorsObj(),
      },
    };
  }

  function validateAndPrepareSave(rawData) {
    const warnings = [];
    const errors = [];
    if (!rawData || typeof rawData !== "object" || !rawData.meta || !rawData.player || !rawData.world || !rawData.progress) {
      errors.push("Structure de sauvegarde incomplète ou corrompue.");
      return { status: "invalid", data: null, warnings, errors, needsResave: false };
    }
    const data = JSON.parse(JSON.stringify(rawData));
    const saveVer = Number(data.meta.save_version || 0);
    let migrated = false;
    if (saveVer <= 0) {
      errors.push(`Version de sauvegarde invalide (${saveVer}).`);
      return { status: "invalid", data: null, warnings, errors, needsResave: false };
    }
    if (saveVer > SAVE_VERSION) {
      errors.push(`Sauvegarde d'une version plus récente (v${saveVer} > v${SAVE_VERSION}).`);
      return { status: "invalid", data: null, warnings, errors, needsResave: false };
    }
    if (saveVer < SAVE_VERSION) {
      data.meta.save_version = SAVE_VERSION;
      migrated = true;
      warnings.push(`Format migré de v${saveVer} vers v${SAVE_VERSION}.`);
    }

    const hashChanged = Boolean(data.meta.content_hash && data.meta.content_hash !== computeContentHash());
    const biomeMap = new Map();
    for (const b of BIOMES) if (b && b.id) biomeMap.set(b.id, b);
    const firstBiomeId = BIOMES[0]?.id || "plaine_astrale";
    const origBiomeId = String(data.world.active_biome_id || firstBiomeId);
    let biomeMissing = false;
    if (!biomeMap.has(origBiomeId)) {
      biomeMissing = true;
      warnings.push(`Biome « ${origBiomeId} » disparu : retour sur « ${firstBiomeId} ».`);
      data.world.active_biome_id = firstBiomeId;
      data.player.position = { x: 115, y: 70 };
    }

    const savedSeeds = (data.world.biome_seeds && typeof data.world.biome_seeds === "object") ? data.world.biome_seeds : {};
    const cleanSeeds = {};
    for (const [bid, b] of biomeMap.entries()) {
      if (bid in savedSeeds && Number.isFinite(Number(savedSeeds[bid]))) {
        cleanSeeds[bid] = Math.floor(Number(savedSeeds[bid]));
      } else {
        cleanSeeds[bid] = Math.floor(Number(b.worldSeed ?? 4242));
      }
    }
    data.world.biome_seeds = cleanSeeds;

    const cleanChunks = [];
    if (Array.isArray(data.world.collected_chunks) && MAX_COLLECTED_CHUNKS > 0) {
      for (const entry of data.world.collected_chunks) {
        if (!Array.isArray(entry) || entry.length !== 4) continue;
        const bid = String(entry[0] || "");
        if (!biomeMap.has(bid)) continue;
        const mask = (Number(entry[3]) | 0) & 0x7FFFFFFF;
        if (mask > 0) cleanChunks.push([bid, Number(entry[1]) | 0, Number(entry[2]) | 0, mask]);
      }
    }
    data.world.collected_chunks = cleanChunks.slice(-MAX_COLLECTED_CHUNKS);

    const cleanInv = {};
    const removedInv = [];
    if (data.progress.inventory && typeof data.progress.inventory === "object") {
      for (const [rawId, rawQty] of Object.entries(data.progress.inventory)) {
        const id = ID_ALIASES[rawId] || rawId;
        const qty = Math.floor(Number(rawQty) || 0);
        if (qty <= 0) continue;
        if (elementsById.has(id)) cleanInv[id] = (cleanInv[id] || 0) + qty;
        else removedInv.push(id);
      }
    }
    const cleanDiscSet = new Set();
    const removedDisc = [];
    if (Array.isArray(data.progress.discovered)) {
      for (const rawId of data.progress.discovered) {
        const id = ID_ALIASES[rawId] || String(rawId);
        if (elementsById.has(id)) cleanDiscSet.add(id);
        else if (!removedDisc.includes(id)) removedDisc.push(id);
      }
    }
    for (const id of Object.keys(cleanInv)) cleanDiscSet.add(id);
    if (removedInv.length > 0) warnings.push(`${removedInv.length} élément(s) obsolète(s) retiré(s) de l'inventaire.`);
    if (removedDisc.length > 0) warnings.push(`${removedDisc.length} découverte(s) obsolète(s) retirée(s).`);

    data.progress.inventory = cleanInv;
    data.progress.discovered = Array.from(cleanDiscSet).sort();
    const cleanFailedSet = new Set();
    if (Array.isArray(data.progress.failed_recipes)) {
      for (const rawPair of data.progress.failed_recipes) {
        const s = String(rawPair || "").trim();
        const sep = s.indexOf("|");
        if (sep <= 0 || sep >= s.length - 1) continue;
        const rawA = s.slice(0, sep);
        const rawB = s.slice(sep + 1);
        const a = ID_ALIASES[rawA] || rawA;
        const b = ID_ALIASES[rawB] || rawB;
        if (!elementsById.has(a) || !elementsById.has(b)) continue;
        if (findRecipeResult(a, b)) continue;
        cleanFailedSet.add(pairKey(a, b));
      }
    }
    data.progress.failed_recipes = Array.from(cleanFailedSet).sort();
    const cleanExts = {};
    if (data.progress.extensions && typeof data.progress.extensions === "object") {
      for (const [fname, st] of Object.entries(data.progress.extensions)) {
        if (!fname || !st || typeof st !== "object") continue;
        cleanExts[String(fname)] = {
          unlocked: Boolean(st.unlocked),
          enabled: st.enabled === undefined ? true : Boolean(st.enabled),
          unlocked_at: String(st.unlocked_at || ""),
          condition_sig: String(st.condition_sig || ""),
          deactivate_sig: String(st.deactivate_sig || ""),
          permanently_disabled: Boolean(st.permanently_disabled),
          manually_locked: Boolean(st.manually_locked),
          state: (st.state && typeof st.state === "object") ? st.state : {},
        };
      }
    }
    data.progress.extensions = cleanExts;
    data.progress.unlocked_biomes = Array.isArray(data.progress.unlocked_biomes)
      ? data.progress.unlocked_biomes.map(String).filter(id => biomeMap.has(id))
      : [];
    data.progress.flags = (data.progress.flags && typeof data.progress.flags === "object" && !Array.isArray(data.progress.flags)) ? data.progress.flags : {};
    data.progress.stats = (data.progress.stats && typeof data.progress.stats === "object" && !Array.isArray(data.progress.stats)) ? data.progress.stats : {};
    data.progress.minigd = (data.progress.minigd && typeof data.progress.minigd === "object" && !Array.isArray(data.progress.minigd)) ? data.progress.minigd : {};
    data.progress.actor_kills = (data.progress.actor_kills && typeof data.progress.actor_kills === "object" && !Array.isArray(data.progress.actor_kills)) ? data.progress.actor_kills : {};

    const px = Number(data.player.position?.x);
    const py = Number(data.player.position?.y);
    data.player.position = (Number.isFinite(px) && Number.isFinite(py)) ? { x: px, y: py } : { x: 115, y: 70 };
    data.player.facing_angle = Number.isFinite(Number(data.player.facing_angle)) ? Number(data.player.facing_angle) : Math.PI * 0.25;
    data.player.distance_traveled = Number.isFinite(Number(data.player.distance_traveled)) ? Math.max(0, Number(data.player.distance_traveled)) : 0;
    data.player.hint_dismissed = Boolean(data.player.hint_dismissed);

    let status = "valid";
    if (removedInv.length > 0 || removedDisc.length > 0 || biomeMissing) status = "partial";
    else if (migrated) status = "migrated";
    return { status, data, warnings, errors, needsResave: migrated || status === "partial" || hashChanged };
  }

  function showSaveFeedback(slotId, msg, isOverwrite = false, isError = false) {
    if (savesFeedbackEl) {
      savesFeedbackEl.textContent = msg;
      savesFeedbackEl.classList.remove("overwrite", "error", "show");
      if (isError) savesFeedbackEl.classList.add("error");
      else if (isOverwrite) savesFeedbackEl.classList.add("overwrite");
      if (msg) {
        savesFeedbackEl.classList.add("show");
        savesFeedbackEl.style.opacity = "1";
      }
      clearTimeout(savesFeedbackTimer);
      savesFeedbackTimer = setTimeout(() => {
        if (!savesFeedbackEl) return;
        savesFeedbackEl.style.opacity = "0";
        setTimeout(() => {
          if (savesFeedbackEl && savesFeedbackEl.style.opacity === "0") {
            savesFeedbackEl.classList.remove("show");
          }
        }, 420);
      }, 3000);
    }
    if (slotId && savesListEl) {
      const card = savesListEl.querySelector(`.save-card[data-slot-id="${slotId}"]`);
      if (card) {
        card.classList.remove("flash-overwrite", "flash-new");
        void card.offsetWidth;
        card.classList.add(isOverwrite ? "flash-overwrite" : "flash-new");
      }
    }
  }

  function saveCurrentSlot(silent = false, targetSlotId = "") {
    const sid = targetSlotId || currentSlotId || "slot_1";
    const wasExisting = Boolean(storageGet(SAVE_KEY_PREFIX + sid));
    currentSlotId = sid;
    const payload = buildSavePayload(sid);
    currentSlotCreatedAt = payload.meta.created_at;
    const slotLabel = payload.meta.slot_name || defaultSlotName(sid);
    const ok = storageSet(SAVE_KEY_PREFIX + sid, JSON.stringify(payload));
    if (ok) {
      storageSet(SAVE_LAST_KEY, sid);
      if (!isSwitchingScenario) storageSet(LAST_SCENARIO_KEY, BOOT_SCENARIO_ID);
      autosaveDirty = false;
      autosaveTimer = 0;
      lastSavedPosX = alien.x;
      lastSavedPosY = alien.y;
      if (shipViewMode === "saves") renderSavesView();
      if (!silent) {
        if (wasExisting) {
          showToast(`💾 Sauvegarde « ${slotLabel} » écrasée !`);
          showSaveFeedback(sid, `✅ Sauvegarde « ${slotLabel} » écrasée avec la partie en cours.`, true, false);
        } else {
          showToast(`💾 Partie sauvegardée dans « ${slotLabel} » !`);
          showSaveFeedback(sid, `✅ Partie sauvegardée dans « ${slotLabel} ».`, false, false);
        }
      }
    } else if (!silent) {
      showToast("❌ Stockage local indisponible ou plein.");
      showSaveFeedback("", "❌ Stockage local indisponible ou plein.", false, true);
    }
  }

  let slotBiomeSeeds = {};

  function applySlotBiomeSeeds(seedsObj) {
    if (!seedsObj || typeof seedsObj !== "object") return;
    slotBiomeSeeds = {};
    for (const b of BIOMES) {
      if (b.id in seedsObj && Number.isFinite(Number(seedsObj[b.id]))) {
        const s = Math.floor(Number(seedsObj[b.id]));
        b.worldSeed = s;
        slotBiomeSeeds[b.id] = s;
      }
    }
  }

  function randomizeBiomeSeeds() {
    slotBiomeSeeds = {};
    for (const b of BIOMES) {
      const s = 1 + Math.floor(Math.random() * 999999);
      b.worldSeed = s;
      slotBiomeSeeds[b.id] = s;
    }
  }

  function applySaveObject(parsed, slotId, silentIfValid = false, rawStr = "") {
    const val = validateAndPrepareSave(parsed);
    if (val.status === "invalid") {
      if (!silentIfValid) showToast(`❌ Invalide : ${val.errors.join("; ")}`);
      return false;
    }
    if (val.needsResave && rawStr) storageSet(SAVE_KEY_PREFIX + slotId + "_bak", rawStr);

    const d = val.data;
    currentSlotId = slotId || "slot_1";
    currentSlotCreatedAt = String(d.meta.created_at || "");
    playTimeSec = Number(d.meta.play_time_sec || 0);
    inventory.clear();
    for (const [id, qty] of Object.entries(d.progress.inventory)) inventory.set(id, qty);
    discovered.clear();
    for (const id of d.progress.discovered) discovered.add(id);
    failedRecipes.clear();
    if (Array.isArray(d.progress.failed_recipes)) {
      for (const k of d.progress.failed_recipes) failedRecipes.add(String(k));
    }
    deactivateAllExtensions();
    importExtensionStatesObj(d.progress.extensions || {});
    unlockedBiomes.clear();
    if (Array.isArray(d.progress.unlocked_biomes)) {
      for (const bid of d.progress.unlocked_biomes) unlockedBiomes.add(String(bid));
    }
    lockedBiomes.clear();
    if (Array.isArray(d.progress.locked_biomes)) {
      for (const bid of d.progress.locked_biomes) lockedBiomes.add(String(bid));
    }
    campaignFlags.clear();
    if (d.progress.flags && typeof d.progress.flags === "object") {
      for (const [k, v] of Object.entries(d.progress.flags)) campaignFlags.set(String(k), v);
    }
    campaignStats.clear();
    if (d.progress.stats && typeof d.progress.stats === "object") {
      for (const [k, v] of Object.entries(d.progress.stats)) {
        const n = Number(v);
        if (Number.isFinite(n)) campaignStats.set(String(k), n);
      }
    }
    minigdResults.clear();
    if (d.progress.minigd && typeof d.progress.minigd === "object") {
      for (const [k, v] of Object.entries(d.progress.minigd)) {
        if (v && typeof v === "object") minigdResults.set(String(k), Object.assign({}, v));
      }
    }
    actorKillsById.clear();
    if (d.progress.actor_kills && typeof d.progress.actor_kills === "object") {
      for (const [k, v] of Object.entries(d.progress.actor_kills)) {
        const n = Math.max(0, Math.floor(Number(v) || 0));
        if (n > 0) actorKillsById.set(String(k), n);
      }
    }
    importDiscoveredAnchorsObj(d.progress.discovered_anchors || {});

    const prevGen = getActiveBiomeGenerator();
    if (prevGen && typeof prevGen.onUnload === "function") {
      try { prevGen.onUnload(); } catch (_e) {}
    }
    if (typeof clearAllChunkActors === "function") clearAllChunkActors();
    applySlotBiomeSeeds(d.world.biome_seeds);
    applyActiveBiomeParams(d.world.active_biome_id);
    const nextGen = getActiveBiomeGenerator();
    if (nextGen && typeof nextGen.reset === "function") {
      try { nextGen.reset(); } catch (_e) {}
    }
    importCollectedChunksLRU(d.world.collected_chunks);
    pinnedChunks.clear();
    chunks.clear();
    lastCenterKey = "";
    alien.x = d.player.position.x;
    alien.y = d.player.position.y;
    alien.vx = 0;
    alien.vy = 0;
    alien.facing = d.player.facing_angle;
    alien.distance = d.player.distance_traveled;
    cam.x = alien.x;
    cam.y = alien.y;
    hintDismissed = d.player.hint_dismissed;
    if (hintDismissed) hintEl.style.opacity = "0";
    else hintEl.style.opacity = "1";
    updateChunks(alien.x, alien.y);

    storageSet(SAVE_LAST_KEY, currentSlotId);
    storageSet(LAST_SCENARIO_KEY, BOOT_SCENARIO_ID);
    autosaveDirty = false;
    autosaveTimer = 0;
    lastSavedPosX = alien.x;
    lastSavedPosY = alien.y;
    if (val.needsResave) saveCurrentSlot(true, currentSlotId);
    renderShipUI();
    if (shipViewMode === "saves") renderSavesView();
    syncUnlockedExtensions(true);

    if (val.status === "partial") showToast(`⚠️ Partie chargée avec ${val.warnings.length} ajustement(s)`);
    else if (val.status === "migrated") showToast(`🔄 Sauvegarde migrée (${currentSlotId}) !`);
    else if (!silentIfValid) showToast(`📂 Partie chargée (${currentSlotId}) !`);
    return true;
  }

  function loadSlot(slotId, silentIfValid = false) {
    const rawStr = storageGet(SAVE_KEY_PREFIX + slotId);
    if (!rawStr) {
      if (!silentIfValid) showToast(`❌ Emplacement ${slotId} vide.`);
      return false;
    }
    let parsed = null;
    try { parsed = JSON.parse(rawStr); } catch {
      if (!silentIfValid) showToast("❌ Sauvegarde corrompue (JSON invalide).");
      return false;
    }
    return applySaveObject(parsed, slotId, silentIfValid, rawStr);
  }

  function startNewGame(slotId) {
    currentSlotId = slotId;
    currentSlotCreatedAt = "";
    playTimeSec = 0;
    inventory.clear();
    discovered.clear();
    failedRecipes.clear();
    deactivateAllExtensions();
    extensionStates.clear();
    unlockedBiomes.clear();
    lockedBiomes.clear();
    campaignFlags.clear();
    campaignStats.clear();
    minigdResults.clear();
    actorKillsById.clear();
    discoveredAnchorsByBiome.clear();
    collectedChunks.clear();
    collectedChunkOrder.length = 0;
    pinnedChunks.clear();
    const prevGen = getActiveBiomeGenerator();
    if (prevGen && typeof prevGen.onUnload === "function") {
      try { prevGen.onUnload(); } catch (_e) {}
    }
    if (typeof clearAllChunkActors === "function") clearAllChunkActors();
    randomizeBiomeSeeds();
    const startBiome = BIOMES.find((b) => b && !b.locked) || BIOMES[0];
    applyActiveBiomeParams(startBiome?.id || "plaine_astrale");
    const nextGen = getActiveBiomeGenerator();
    if (nextGen && typeof nextGen.reset === "function") {
      try { nextGen.reset(); } catch (_e) {}
    }
    chunks.clear();
    lastCenterKey = "";
    alien.x = 115;
    alien.y = 70;
    alien.vx = 0;
    alien.vy = 0;
    alien.facing = Math.PI * 0.25;
    alien.distance = 0;
    cam.x = alien.x;
    cam.y = alien.y;
    setUseJoystick(false, true);
    hintDismissed = false;
    hintEl.style.opacity = "1";
    shipContactLocked = false;
    updateChunks(alien.x, alien.y);
    saveCurrentSlot(true, slotId);
    renderShipUI();
    if (shipViewMode === "saves") renderSavesView();
    syncUnlockedExtensions(false);
    showToast(`✨ Nouvelle partie démarrée (${slotId}) !`);
  }

  function deleteSlot(slotId) {
    storageRemove(SAVE_KEY_PREFIX + slotId);
    storageRemove(SAVE_KEY_PREFIX + slotId + "_bak");
    renderSavesView();
    showToast(`🗑 Sauvegarde supprimée (${slotId})`);
  }

  function exportSaveToFile() {
    const sid = currentSlotId || "slot_1";
    const payload = buildSavePayload(sid);
    const jsonStr = JSON.stringify(payload, null, 2);
    const datePart = new Date().toISOString().slice(0, 10);
    const filename = `assemblage_${sid}_${datePart}.json`;
    try {
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`⬇ Sauvegarde exportée (${filename})`);
      showSaveFeedback(sid, `✅ Fichier « ${filename} » téléchargé.`, false, false);
    } catch {
      showToast("❌ Impossible d'exporter le fichier de sauvegarde.");
      showSaveFeedback("", "❌ Impossible d'exporter le fichier de sauvegarde.", false, true);
    }
  }

  function importSaveFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rawStr = String(reader.result || "");
      let parsed = null;
      try {
        parsed = JSON.parse(rawStr);
      } catch {
        showToast("❌ Fichier JSON invalide.");
        showSaveFeedback("", "❌ Le fichier sélectionné n'est pas un JSON valide.", false, true);
        return;
      }
      const val = validateAndPrepareSave(parsed);
      if (val.status === "invalid") {
        const errMsg = val.errors.join("; ") || "format non reconnu";
        showToast(`❌ Sauvegarde invalide : ${errMsg}`);
        showSaveFeedback("", `❌ Sauvegarde invalide : ${errMsg}`, false, true);
        return;
      }
      const sid = currentSlotId || "slot_1";
      const wasExisting = Boolean(storageGet(SAVE_KEY_PREFIX + sid));
      if (wasExisting) {
        const slotLabel = defaultSlotName(sid);
        if (!window.confirm(`Charger « ${file.name} » dans « ${slotLabel} » ? La sauvegarde actuelle de cet emplacement sera remplacée.`)) {
          return;
        }
      }
      const ok = applySaveObject(parsed, sid, true, rawStr);
      if (ok) {
        saveCurrentSlot(true, sid);
        const msg = val.status === "partial"
          ? `⚠️ Fichier « ${file.name} » chargé dans ${sid} (${val.warnings.length} ajustement(s)).`
          : `✅ Fichier « ${file.name} » chargé dans ${sid}.`;
        showToast(`⬆ ${file.name} chargé (${sid}) !`);
        showSaveFeedback(sid, msg, wasExisting, false);
      }
    };
    reader.onerror = () => {
      showToast("❌ Erreur lors de la lecture du fichier.");
      showSaveFeedback("", "❌ Erreur lors de la lecture du fichier.", false, true);
    };
    reader.readAsText(file);
  }

  function formatPlayTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
    if (m > 0) return `${m}m${String(r).padStart(2, "0")}s`;
    return `${r}s`;
  }

  function renderSavesView() {
    if (!savesListEl) return;
    const capTxt = MAX_COLLECTED_CHUNKS <= 0 ? "Repousse immédiate (0 chunk)" : `Repousse au-delà de ${MAX_COLLECTED_CHUNKS} chunks`;
    savesInfoEl.textContent = `Slot actif : ${currentSlotId}  •  ${capTxt}`;
    savesListEl.innerHTML = "";

    for (const sid of DEFAULT_SLOTS) {
      const rawStr = storageGet(SAVE_KEY_PREFIX + sid);
      const isActive = sid === currentSlotId;
      const card = document.createElement("div");
      card.className = "save-card" + (isActive ? " active" : "");
      card.dataset.slotId = sid;

      let status = "empty";
      let meta = null;
      let warnings = [];
      let errors = [];

      if (rawStr) {
        try {
          const parsed = JSON.parse(rawStr);
          const val = validateAndPrepareSave(parsed);
          status = val.status;
          meta = parsed.meta || {};
          warnings = val.warnings;
          errors = val.errors;
        } catch {
          status = "invalid";
          errors = ["JSON corrompu."];
        }
      }
      if (status === "partial") card.classList.add("partial");
      if (status === "invalid") card.classList.add("invalid");

      const badge = status === "valid" ? "✅ Valide"
        : status === "migrated" ? "🔄 Migrable"
        : status === "partial" ? "⚠️ Partielle (MAJ)"
        : status === "invalid" ? "❌ Invalide" : "🆕 Vide";

      const metaDiv = document.createElement("div");
      metaDiv.className = "save-meta";
      const titleDiv = document.createElement("div");
      titleDiv.className = "save-title";
      titleDiv.textContent = `${meta?.slot_name || defaultSlotName(sid)}${isActive ? "  ★ ACTIF" : ""}  —  ${badge}`;
      metaDiv.appendChild(titleDiv);

      const subDiv = document.createElement("div");
      subDiv.className = status === "invalid" ? "save-err" : "save-sub";
      if (status === "empty") {
        subDiv.textContent = "Emplacement libre — démarrez une nouvelle partie ou sauvegardez ici.";
      } else if (status === "invalid") {
        subDiv.textContent = `Erreur : ${errors.join("; ")}`;
      } else {
        const sum = meta?.summary || {};
        const bObj = BIOMES.find(b => b.id === sum.biome_id);
        const bHtml = bObj ? formatBiomeInlineHtml(bObj, 16) : escapeHtmlText(sum.biome_id || "");
        const dt = String(meta?.updated_at || "").replace("T", " ").slice(0, 19);
        const extCount = Number(sum.extensions_count || 0);
        const extPart = extCount > 0 ? `  •  🧩 ${extCount} ext.` : "";
        subDiv.innerHTML = `${bHtml}${escapeHtmlText(`  •  Découverts : ${sum.discovered_count || 0}/${elementsList.length}${extPart}  •  Chunks : ${sum.collected_chunks_count || 0}  •  Temps : ${formatPlayTime(meta?.play_time_sec || 0)}  •  ${dt}`)}`;
      }
      metaDiv.appendChild(subDiv);

      if (warnings.length > 0 && status !== "invalid") {
        const wDiv = document.createElement("div");
        wDiv.className = "save-warn";
        wDiv.textContent = "⚠️ " + warnings.join(" | ");
        metaDiv.appendChild(wDiv);
      }
      card.appendChild(metaDiv);

      const actions = document.createElement("div");
      actions.className = "save-actions";
      if (status !== "empty" && status !== "invalid") {
        const btnLoad = document.createElement("button");
        btnLoad.type = "button";
        btnLoad.className = "save-btn";
        btnLoad.textContent = "📂 Charger";
        btnLoad.addEventListener("click", () => loadSlot(sid, false));
        actions.appendChild(btnLoad);
      }
      const btnSave = document.createElement("button");
      btnSave.type = "button";
      btnSave.className = "save-btn primary";
      btnSave.textContent = status === "empty" ? "💾 Sauver" : "💾 Écraser";
      btnSave.title = status === "empty"
        ? "Enregistrer la partie en cours dans cet emplacement"
        : "Écraser cette sauvegarde avec la partie en cours";
      btnSave.addEventListener("click", () => saveCurrentSlot(false, sid));
      actions.appendChild(btnSave);

      if (status === "empty") {
        const btnNew = document.createElement("button");
        btnNew.type = "button";
        btnNew.className = "save-btn new-game";
        btnNew.textContent = "✨ Nouvelle";
        btnNew.title = "Réinitialise la partie en cours à zéro et démarre une nouvelle partie sur cet emplacement";
        btnNew.addEventListener("click", () => startNewGame(sid));
        actions.appendChild(btnNew);
      }

      if (status !== "empty") {
        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "save-btn danger";
        btnDel.textContent = "🗑";
        btnDel.title = "Supprime uniquement le fichier de sauvegarde (sans réinitialiser la partie en cours)";
        btnDel.addEventListener("click", () => {
          if (window.confirm(`Supprimer définitivement « ${meta?.slot_name || defaultSlotName(sid)} » ?`)) {
            deleteSlot(sid);
          }
        });
        actions.appendChild(btnDel);
      }

      card.appendChild(actions);
      savesListEl.appendChild(card);
    }
  }

  function renderShipUI() {
    const meters = Math.round(alien.distance / 18);
    const biomeInlineHtml = formatBiomeInlineHtml(activeBiome, 18);
    shipStatsEl.innerHTML = `${biomeInlineHtml}${escapeHtmlText(`  •  ${SHIP_SUBTITLE}  •  Exploré : ${meters} m  •  Découverts : ${discovered.size} / ${elementsList.length}`)}`;
    hubBiomeBadgeEl.innerHTML = `Biome actuel : ${formatBiomeInlineHtml(activeBiome, 20)}`;
    validateSlots();
    renderToolbar();
    renderWorkbench();
    renderGrid();
    renderDescriptionPanel();
    if (shipViewMode === "biomes") renderBiomesView();
  }

  function cancelActivePointer() {
    isHolding = false;
    moveTouchId = null;
    hasTarget = false;
    joyActive = false;
    joyTouchId = null;
    joyDirX = 0;
    joyDirY = 0;
    joyMag = 0;
  }

  function hasUnsavedProgress() {
    if (autosaveDirty) return true;
    return Math.hypot(alien.x - lastSavedPosX, alien.y - lastSavedPosY) >= 8;
  }

  function openShipUI() {
    if (Math.hypot(alien.x, alien.y) <= SHIP_CONTACT_ENTER_DIST) {
      shipContactLocked = true;
    }
    if (hasUnsavedProgress()) saveCurrentSlot(true);
    uiOpen = true;
    cancelActivePointer();
    alien.vx = 0;
    alien.vy = 0;
    benchFeedbackEl.textContent = "";
    inspectedId = "";
    showUses = false;
    switchShipView("hub");
    renderShipUI();
    overlayEl.classList.add("open");
    if (pendingChunkRefresh) {
      pendingChunkRefresh = false;
      chunks.clear();
      lastCenterKey = "";
      updateChunks(alien.x, alien.y);
    }
    emitHostEvent("ship:entered", { biomeId: activeBiomeId });
    hotRefreshRemoteData(false);
  }

  function closeShipUI() {
    if (dragState) endDrag(dragState.lastX, dragState.lastY, true);
    if (hasUnsavedProgress()) saveCurrentSlot(true);
    uiOpen = false;
    overlayEl.classList.remove("open");
    emitHostEvent("ship:exited", { biomeId: activeBiomeId });
  }

  function resetSettingsRestartConfirm() {
    if (settingsRestartConfirmEl) settingsRestartConfirmEl.classList.remove("open");
    if (settingsRestartBtnEl) settingsRestartBtnEl.style.display = "";
  }

  // --- Sélecteur de scénario dans le menu Paramètres ---
  const CURRENT_SCENARIO_ID = String(SCENARIO_META?.id || "base");
  let availableScenariosCache = [];
  let scenariosResolvedOnce = false;
  let pendingScenarioTarget = null;

  async function urlExistsHead(relUrl) {
    try {
      const res = await fetch(relUrl, { method: "HEAD", cache: "no-store" });
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  async function resolveScenarioTargetUrl(scenarioId) {
    const sid = String(scenarioId || "base");
    if (sid === CURRENT_SCENARIO_ID) {
      return window.location.pathname;
    }
    if (window.location.protocol !== "http:" && window.location.protocol !== "https:") {
      return "";
    }
    const candidates = [];
    if (sid === "base") {
      if (ASSET_BASE) {
        candidates.push(`${ASSET_BASE}index.html`);
      } else {
        candidates.push("index.html");
      }
    } else {
      const enc = encodeURIComponent(sid);
      if (ASSET_BASE) {
        candidates.push(`../${enc}/index.html`);
      } else {
        candidates.push(`scenarios/${enc}/index.html`);
        candidates.push(`export/web/scenarios/${enc}/index.html`);
      }
    }
    for (const c of candidates) {
      if (await urlExistsHead(c)) return c;
    }
    return "";
  }

  async function refreshAvailableScenarios() {
    if (window.location.protocol !== "http:" && window.location.protocol !== "https:") {
      availableScenariosCache = [];
      renderSettingsScenarioSelector();
      return;
    }
    let rawList = Array.isArray(SCENARIO_META?.scenarios) ? SCENARIO_META.scenarios.slice() : [];
    const manifestCandidates = ASSET_BASE
      ? [`${ASSET_BASE}config/scenarios/manifest.json`]
      : ["config/scenarios/manifest.json", "export/web/config/scenarios/manifest.json"];
    for (const mUrl of manifestCandidates) {
      const m = await fetchJsonNoCache(mUrl);
      if (m && Array.isArray(m.scenarios) && m.scenarios.length > 0) {
        rawList = m.scenarios;
        break;
      }
    }
    // Toujours inclure le scénario courant en secours
    if (!rawList.some((s) => s && String(s.id) === CURRENT_SCENARIO_ID)) {
      rawList.unshift({
        id: CURRENT_SCENARIO_ID,
        name: String(SCENARIO_META?.name || CURRENT_SCENARIO_ID),
        icon: String(SCENARIO_META?.icon || "🎬"),
        description: "",
        isBase: CURRENT_SCENARIO_ID === "base",
        exported: true,
      });
    }
    const resolved = [];
    for (const sc of rawList) {
      if (!sc || !sc.id) continue;
      const sid = String(sc.id);
      const url = await resolveScenarioTargetUrl(sid);
      if (!url) continue;
      resolved.push({
        id: sid,
        name: String(sc.name || sid),
        icon: String(sc.icon || "🎬"),
        description: String(sc.description || ""),
        url,
      });
    }
    availableScenariosCache = resolved;
    scenariosResolvedOnce = true;
    renderSettingsScenarioSelector();
  }

  function resetSettingsScenarioConfirm() {
    pendingScenarioTarget = null;
    if (settingsScenarioConfirmEl) settingsScenarioConfirmEl.classList.remove("open");
    if (settingsScenarioSelectEl) settingsScenarioSelectEl.value = CURRENT_SCENARIO_ID;
  }

  function renderSettingsScenarioSelector() {
    if (!settingsScenarioRowEl || !settingsScenarioSelectEl) return;
    if (availableScenariosCache.length < 2) {
      settingsScenarioRowEl.style.display = "none";
      resetSettingsScenarioConfirm();
      return;
    }
    settingsScenarioRowEl.style.display = "";
    settingsScenarioSelectEl.innerHTML = "";
    for (const sc of availableScenariosCache) {
      const opt = document.createElement("option");
      opt.value = sc.id;
      opt.textContent = `${sc.icon} ${sc.name}`;
      settingsScenarioSelectEl.appendChild(opt);
    }
    settingsScenarioSelectEl.value = pendingScenarioTarget ? pendingScenarioTarget.id : CURRENT_SCENARIO_ID;
  }

  function openScenarioSwitchConfirm(targetScenario) {
    if (!targetScenario || !settingsScenarioConfirmEl) return;
    resetSettingsRestartConfirm();
    pendingScenarioTarget = targetScenario;
    settingsScenarioConfirmEl.classList.add("open");
    try { settingsScenarioConfirmEl.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (_) {}
  }

  function navigateToScenario(targetScenario, forceRestart) {
    if (!targetScenario || !targetScenario.url) return;
    isSwitchingScenario = true;
    try {
      const hasExistingSave = Boolean(storageGet(SAVE_KEY_PREFIX + (currentSlotId || "slot_1")));
      if (hasUnsavedProgress() || hasExistingSave) {
        saveCurrentSlot(true);
      }
    } catch (_) {}
    storageSet(LAST_SCENARIO_KEY, String(targetScenario.id || "base"));
    let dest = targetScenario.url;
    const sep1 = dest.includes("?") ? "&" : "?";
    dest = `${dest}${sep1}switched=1`;
    if (forceRestart) {
      dest = `${dest}&restart=1`;
    }
    window.location.href = dest;
  }

  function isPositionBlockedNearShip(wx, wy, radius = 20) {
    if (Math.hypot(wx, wy) <= SHIP_COLLISION_RADIUS + radius) return true;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ch = chunks.get((cx + dx) + "," + (cy + dy));
        if (!ch || !ch.colliders) continue;
        for (const col of ch.colliders) {
          if (Math.hypot(wx - col.x, wy - col.y) <= col.r + radius) return true;
        }
      }
    }
    return false;
  }

  function returnAlienToShipDistance(distanceMeters = 30) {
    const distPx = Math.max(1, Number(distanceMeters) || 30) * ANCHOR_PIXELS_PER_METER;
    const currentDist = Math.hypot(alien.x, alien.y);
    const baseAngle = currentDist > 1 ? Math.atan2(alien.y, alien.x) : Math.atan2(70, 115);

    let targetX = Math.cos(baseAngle) * distPx;
    let targetY = Math.sin(baseAngle) * distPx;
    updateChunks(targetX, targetY);

    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      const offsetStep = Math.ceil(i / 2);
      const angle = baseAngle + sign * offsetStep * ((Math.PI * 2) / steps);
      const cx = Math.cos(angle) * distPx;
      const cy = Math.sin(angle) * distPx;
      if (!isPositionBlockedNearShip(cx, cy, 20) && isPositionWalkable(cx, cy)) {
        targetX = cx;
        targetY = cy;
        break;
      }
    }

    cancelActivePointer();
    hasTarget = false;
    shipContactLocked = false;
    alien.x = targetX;
    alien.y = targetY;
    alien.vx = 0;
    alien.vy = 0;
    alien.facing = Math.atan2(-alien.y, -alien.x);
    cam.x = alien.x;
    cam.y = alien.y;
    resetZoomToAlien();
    updateChunks(alien.x, alien.y);
    autosaveDirty = true;
    closeSettingsUI();
    showToast(`🛸 Retour à ${Math.round(distanceMeters)} m du vaisseau !`);
  }

  function restartGameFromSettings() {
    resetSettingsRestartConfirm();
    closeSettingsUI();
    cancelActivePointer();
    hasTarget = false;
    resetZoomToAlien();
    if (p2pSoloSnapshot) p2pSoloSnapshot = null;
    startNewGame(currentSlotId || "slot_1");
  }

  function openSettingsUI() {
    if (uiOpen) return;
    resetSettingsRestartConfirm();
    resetSettingsScenarioConfirm();
    settingsOpen = true;
    cancelActivePointer();
    alien.vx = 0;
    alien.vy = 0;
    settingsOverlayEl.classList.add("open");
    if (!scenariosResolvedOnce) {
      refreshAvailableScenarios();
    } else {
      renderSettingsScenarioSelector();
    }
  }

  function closeSettingsUI() {
    resetSettingsRestartConfirm();
    resetSettingsScenarioConfirm();
    settingsOpen = false;
    settingsOverlayEl.classList.remove("open");
  }

  settingsBtnEl.addEventListener("click", openSettingsUI);
  settingsCloseBtnEl.addEventListener("click", closeSettingsUI);
  settingsOverlayEl.addEventListener("click", (e) => {
    if (e.target === settingsOverlayEl) closeSettingsUI();
  });
  if (settingsReturnShipBtnEl) {
    settingsReturnShipBtnEl.addEventListener("click", () => returnAlienToShipDistance(30));
  }
  if (settingsScenarioSelectEl) {
    settingsScenarioSelectEl.addEventListener("change", () => {
      const chosenId = settingsScenarioSelectEl.value;
      if (!chosenId || chosenId === CURRENT_SCENARIO_ID) {
        resetSettingsScenarioConfirm();
        return;
      }
      const target = availableScenariosCache.find((s) => s.id === chosenId);
      if (target) openScenarioSwitchConfirm(target);
      else resetSettingsScenarioConfirm();
    });
  }
  if (settingsScenarioCancelBtnEl) {
    settingsScenarioCancelBtnEl.addEventListener("click", resetSettingsScenarioConfirm);
  }
  if (settingsScenarioResumeBtnEl) {
    settingsScenarioResumeBtnEl.addEventListener("click", () => {
      if (pendingScenarioTarget) navigateToScenario(pendingScenarioTarget, false);
    });
  }
  if (settingsScenarioRestartBtnEl) {
    settingsScenarioRestartBtnEl.addEventListener("click", () => {
      if (pendingScenarioTarget) navigateToScenario(pendingScenarioTarget, true);
    });
  }
  if (settingsRestartBtnEl) {
    settingsRestartBtnEl.addEventListener("click", () => {
      resetSettingsScenarioConfirm();
      if (settingsRestartConfirmEl) settingsRestartConfirmEl.classList.add("open");
      settingsRestartBtnEl.style.display = "none";
      if (settingsRestartConfirmEl) {
        try { settingsRestartConfirmEl.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (_) {}
      }
    });
  }
  if (settingsRestartCancelBtnEl) {
    settingsRestartCancelBtnEl.addEventListener("click", resetSettingsRestartConfirm);
  }
  if (settingsRestartConfirmBtnEl) {
    settingsRestartConfirmBtnEl.addEventListener("click", restartGameFromSettings);
  }
  joystickToggleEl.addEventListener("change", () => {
    setUseJoystick(joystickToggleEl.checked, true);
  });

  // Permettre de glisser le doigt (ou la souris) sur un interrupteur pour le basculer
  function enableSwipeSwitch(switchEl) {
    const inputEl = switchEl.querySelector('input[type="checkbox"]');
    const sliderEl = switchEl.querySelector(".slider");
    const rowEl = switchEl.closest("label.setting-row");
    if (!inputEl || !sliderEl) return;

    const MAX_TRAVEL = 20;
    let activePointerId = null;
    let startX = 0;
    let startChecked = false;
    let currentX = 0;
    let hasDragged = false;
    let suppressNextClickUntil = 0;

    const suppressClick = (e) => {
      if (performance.now() < suppressNextClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    switchEl.addEventListener("click", suppressClick, true);
    if (rowEl) rowEl.addEventListener("click", suppressClick, true);

    switchEl.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      activePointerId = e.pointerId;
      startX = e.clientX;
      startChecked = inputEl.checked;
      currentX = startChecked ? MAX_TRAVEL : 0;
      hasDragged = false;
      try { switchEl.setPointerCapture(e.pointerId); } catch (_) {}
    });

    switchEl.addEventListener("pointermove", (e) => {
      if (e.pointerId !== activePointerId) return;
      const dx = e.clientX - startX;
      if (!hasDragged && Math.abs(dx) >= 4) {
        hasDragged = true;
        sliderEl.classList.add("dragging");
      }
      if (hasDragged) {
        currentX = Math.max(0, Math.min(MAX_TRAVEL, (startChecked ? MAX_TRAVEL : 0) + dx));
        sliderEl.style.setProperty("--thumb-x", `${currentX}px`);
        const isOn = currentX >= MAX_TRAVEL * 0.5;
        sliderEl.classList.toggle("drag-on", isOn);
        sliderEl.classList.toggle("drag-off", !isOn);
      }
    });

    const finishSwipe = (e, cancelled) => {
      if (e.pointerId !== activePointerId) return;
      activePointerId = null;
      try { switchEl.releasePointerCapture(e.pointerId); } catch (_) {}
      sliderEl.classList.remove("dragging", "drag-on", "drag-off");
      sliderEl.style.removeProperty("--thumb-x");
      if (hasDragged) {
        suppressNextClickUntil = performance.now() + 350;
        if (!cancelled) {
          const newChecked = currentX >= MAX_TRAVEL * 0.5;
          if (newChecked !== inputEl.checked) {
            inputEl.checked = newChecked;
            inputEl.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      }
      hasDragged = false;
    };

    switchEl.addEventListener("pointerup", (e) => finishSwipe(e, false));
    switchEl.addEventListener("pointercancel", (e) => finishSwipe(e, true));
  }

  document.querySelectorAll("#settings-card .switch").forEach(enableSwipeSwitch);

  shipBackBtnEl.addEventListener("click", () => switchShipView("hub"));
  hubCraftBtnEl.addEventListener("click", () => switchShipView("craft"));
  hubBiomesBtnEl.addEventListener("click", () => switchShipView("biomes"));
  hubSavesBtnEl.addEventListener("click", () => switchShipView("saves"));
  saveNowBtnEl.addEventListener("click", () => saveCurrentSlot(false, currentSlotId));
  saveExportBtnEl.addEventListener("click", exportSaveToFile);
  saveImportBtnEl.addEventListener("click", () => saveImportInputEl.click());
  saveImportInputEl.addEventListener("change", () => {
    const file = saveImportInputEl.files && saveImportInputEl.files[0];
    saveImportInputEl.value = "";
    if (file) importSaveFromFile(file);
  });
  exitBtnEl.addEventListener("click", closeShipUI);
  slotAEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || !slotA) return;
    beginDragCandidate(slotA, "slot_a", slotAEl, e.clientX, e.clientY, false);
  });
  slotAEl.addEventListener("touchstart", (e) => {
    if (!slotA || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    beginDragCandidate(slotA, "slot_a", slotAEl, t.clientX, t.clientY, true, t.identifier);
  }, { passive: false });
  slotAEl.addEventListener("click", () => {
    const now = performance.now();
    if (now < suppressClickUntil || now < suppressSlotClickUntil) return;
    if (slotA) {
      slotA = "";
      renderWorkbench();
      renderGrid();
    } else if (inspectedId) {
      placeElementInSlot("a", inspectedId);
    }
  });
  slotBEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || !slotB) return;
    beginDragCandidate(slotB, "slot_b", slotBEl, e.clientX, e.clientY, false);
  });
  slotBEl.addEventListener("touchstart", (e) => {
    if (!slotB || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    beginDragCandidate(slotB, "slot_b", slotBEl, t.clientX, t.clientY, true, t.identifier);
  }, { passive: false });
  slotBEl.addEventListener("click", () => {
    const now = performance.now();
    if (now < suppressClickUntil || now < suppressSlotClickUntil) return;
    if (slotB) {
      slotB = "";
      renderWorkbench();
      renderGrid();
    } else if (inspectedId) {
      placeElementInSlot("b", inspectedId);
    }
  });
  filterDiscoveredBtnEl.addEventListener("click", () => { showAllDiscovered = !showAllDiscovered; renderToolbar(); renderGrid(); });
  if (craftHintsBtnEl) {
    craftHintsBtnEl.addEventListener("click", () => {
      showCraftHints = !showCraftHints;
      renderToolbar();
      renderGrid();
    });
  }
  descCloseBtnEl.addEventListener("click", () => { inspectedId = ""; showDescDetails = false; showUses = false; renderWorkbench(); renderDescriptionPanel(); renderGrid(); });
  if (descDetailsBtnEl) {
    descDetailsBtnEl.addEventListener("click", () => {
      showDescDetails = !showDescDetails;
      renderDescriptionPanel();
    });
  }
  descUsesBtnEl.addEventListener("click", () => { showUses = !showUses; renderDescriptionPanel(); });
  assembleBtnEl.addEventListener("click", () => {
    if (!canAffordPair(slotA, slotB)) return;
    const resId = findRecipeResult(slotA, slotB);
    if (!resId || !elementsById.has(resId)) {
      failedRecipes.add(pairKey(slotA, slotB));
      saveCurrentSlot(true);
      renderGrid();
      benchFeedbackEl.textContent = "Aucun assemblage connu pour cette combinaison.";
      benchFeedbackEl.style.color = "#ff8f85";
      return;
    }
    failedRecipes.delete(pairKey(slotA, slotB));
    consumeItem(slotA, 1);
    consumeItem(slotB, 1);
    const isNew = addItem(resId, 1);
    const el = elementsById.get(resId);
    inspectedId = resId;
    showDescDetails = false;
    showUses = false;
    benchFeedbackEl.innerHTML = isNew
      ? `✨ NOUVELLE DÉCOUVERTE : ${formatElementInlineHtml(el, 18)} !`
      : `✅ Assemblé : ${formatElementInlineHtml(el, 18)}`;
    benchFeedbackEl.style.color = isNew ? "#ffe066" : "#73fad1";
    saveCurrentSlot(true);
    runHook("onCraft", () => {}, resId, slotA, slotB, isNew);
    emitHostEvent("element:crafted", { id: resId, slotA, slotB, isNew });
    syncUnlockedExtensions(false);
    if (levelFilter === LEVEL_FILTER_MENU ? !hasElementAction(el) : (levelFilter > 0 && Number(el.level) !== levelFilter)) {
      levelFilter = 0;
    }
    renderShipUI();
    requestAnimationFrame(() => animateAndFocusNewElement(resId, isNew));
  });

  let biomeClaimedPointer = false;
  let biomeClaimedTouchId = null;

  function handlePressStart(clientX, clientY, touchId = null) {
    if (isAnyUIOpen()) return;
    const pos = getCanvasPos(clientX, clientY);

    // Compass click cycles zoom: normal -> zoom out 1 -> zoom out 2 -> normal
    if (isPointOnCompass(pos.x, pos.y)) {
      zoomStep = (zoomStep + 1) % ZOOM_FACTORS.length;
      cancelActivePointer();
      return;
    }

    const w = screenToWorld(pos.x, pos.y);
    if (Math.hypot(w.x, w.y) <= SHIP_CLICK_RADIUS) {
      openShipUI();
      return;
    }

    const activeGen = getActiveBiomeGenerator();
    if (activeGen && typeof activeGen.onPointerDown === "function") {
      if (activeGen.onPointerDown(w.x, w.y, pos.x, pos.y, touchId, getBiomeGeneratorEnv()) === true) {
        biomeClaimedPointer = true;
        biomeClaimedTouchId = touchId;
        return;
      }
    }

    if (useJoystick) {
      joyActive = true;
      joyTouchId = touchId;
      joyOriginX = pos.x;
      joyOriginY = pos.y;
      joyKnobX = pos.x;
      joyKnobY = pos.y;
      joyDirX = 0;
      joyDirY = 0;
      joyMag = 0;
      isHolding = false;
      hasTarget = false;
      return;
    }

    resetZoomToAlien();
    isHolding = true;
    moveTouchId = touchId;
    pointerScreenX = pos.x;
    pointerScreenY = pos.y;
    targetWorldX = w.x;
    targetWorldY = w.y;
    hasTarget = true;
    clickRippleTime = 0.45;
  }

  function handlePressMove(clientX, clientY) {
    const pos = getCanvasPos(clientX, clientY);
    if (!isAnyUIOpen()) {
      const w = screenToWorld(pos.x, pos.y);
      if (biomeClaimedPointer) {
        const activeGen = getActiveBiomeGenerator();
        if (activeGen && typeof activeGen.onPointerMove === "function") {
          activeGen.onPointerMove(w.x, w.y, pos.x, pos.y, getBiomeGeneratorEnv());
        }
        return;
      }
      isHoveredShip = !isPointOnCompass(pos.x, pos.y) && Math.hypot(w.x, w.y) <= SHIP_CLICK_RADIUS;
      if (useJoystick) {
        if (joyActive) {
          const dx = pos.x - joyOriginX;
          const dy = pos.y - joyOriginY;
          const dist = Math.hypot(dx, dy);
          const clamped = Math.min(dist, JOY_MAX_RADIUS);
          joyKnobX = joyOriginX + (dist > 0.001 ? (dx / dist) * clamped : 0);
          joyKnobY = joyOriginY + (dist > 0.001 ? (dy / dist) * clamped : 0);
          if (dist > JOY_DEADZONE) {
            joyDirX = dx / dist;
            joyDirY = dy / dist;
            const rawMag = clamp((dist - JOY_DEADZONE) / (JOY_MAX_RADIUS - JOY_DEADZONE), 0, 1);
            joyMag = 0.3 + 0.7 * rawMag;
            resetZoomToAlien();
          } else {
            joyDirX = 0;
            joyDirY = 0;
            joyMag = 0;
          }
        }
      } else if (isHolding) {
        pointerScreenX = pos.x;
        pointerScreenY = pos.y;
        targetWorldX = w.x;
        targetWorldY = w.y;
        hasTarget = true;
        resetZoomToAlien();
      }
    } else {
      isHoveredShip = false;
    }
  }

  function handlePressEnd() {
    if (biomeClaimedPointer) {
      const activeGen = getActiveBiomeGenerator();
      if (activeGen && typeof activeGen.onPointerUp === "function") {
        activeGen.onPointerUp(getBiomeGeneratorEnv());
      }
      biomeClaimedPointer = false;
      biomeClaimedTouchId = null;
      return;
    }
    isHolding = false;
    moveTouchId = null;
    joyActive = false;
    joyTouchId = null;
    joyDirX = 0;
    joyDirY = 0;
    joyMag = 0;
    // In tap-to-move mode, keep hasTarget = true so quick taps walk smoothly to the destination.
  }

  // Universal Mouse + Touch events (100% compatible Safari, Chrome, Firefox, iOS, Android, iframes)
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
  canvas.addEventListener("mousedown", (e) => {
    if (performance.now() - lastTouchMs < 500) return;
    if (e.button !== 0) return;
    handlePressStart(e.clientX, e.clientY, null);
  });
  window.addEventListener("mousemove", (e) => {
    if (performance.now() - lastTouchMs < 500) return;
    handlePressMove(e.clientX, e.clientY);
  });
  window.addEventListener("mouseup", (e) => {
    if (performance.now() - lastTouchMs < 500) return;
    if (e.button !== 0) return;
    handlePressEnd();
  });

  canvas.addEventListener("touchstart", (e) => {
    if (e.changedTouches.length === 0) return;
    lastTouchMs = performance.now();
    e.preventDefault();
    if (biomeClaimedPointer && biomeClaimedTouchId !== null) return;
    if (useJoystick && joyActive && joyTouchId !== null) return;
    if (!useJoystick && isHolding && moveTouchId !== null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (extClaimedTouchIds.has(t.identifier)) continue;
      handlePressStart(t.clientX, t.clientY, t.identifier);
      break;
    }
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 0) return;
    lastTouchMs = performance.now();
    e.preventDefault();
    const activeId = biomeClaimedPointer ? biomeClaimedTouchId : (useJoystick ? joyTouchId : moveTouchId);
    if (activeId === null) return;
    let found = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === activeId) { found = e.touches[i]; break; }
    }
    if (!found) return;
    handlePressMove(found.clientX, found.clientY);
  }, { passive: false });
  canvas.addEventListener("touchend", (e) => {
    lastTouchMs = performance.now();
    const activeId = biomeClaimedPointer ? biomeClaimedTouchId : (useJoystick ? joyTouchId : moveTouchId);
    if (activeId === null) return;
    let ended = e.touches.length === 0;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeId) { ended = true; break; }
    }
    if (!ended) return;
    handlePressEnd();
  });
  canvas.addEventListener("touchcancel", (e) => {
    lastTouchMs = performance.now();
    const activeId = biomeClaimedPointer ? biomeClaimedTouchId : (useJoystick ? joyTouchId : moveTouchId);
    if (activeId === null) return;
    let ended = e.touches.length === 0;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeId) { ended = true; break; }
    }
    if (!ended) return;
    handlePressEnd();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (extTitleCardOpen) closeTitleCard("escape");
      else if (extFrameOpen) closeExtFrame();
      else if (extModalOpen) closeExtModal();
      else if (settingsOpen) closeSettingsUI();
      else if (uiOpen) closeShipUI();
      return;
    }
    if (isGamePaused()) return;
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener("keyup", (e) => { keys.delete(e.key.toLowerCase()); });

  function resolveCollisions() {
    // Spaceship hull collision
    const dShip = Math.hypot(alien.x, alien.y);
    const minShip = SHIP_COLLISION_RADIUS + ALIEN_RADIUS;
    if (dShip < minShip && dShip > 0.001) {
      const nx = alien.x / dShip;
      const ny = alien.y / dShip;
      alien.x = nx * minShip;
      alien.y = ny * minShip;
    }
    // Nearby chunk colliders
    const cx = Math.floor(alien.x / CHUNK_SIZE);
    const cy = Math.floor(alien.y / CHUNK_SIZE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ch = chunks.get((cx + dx) + "," + (cy + dy));
        if (!ch) continue;
        for (const col of ch.colliders) {
          const rx = alien.x - col.x;
          const ry = alien.y - col.y;
          const d = Math.hypot(rx, ry);
          const minD = col.r + ALIEN_RADIUS;
          if (d < minD && d > 0.001) {
            alien.x = col.x + (rx / d) * minD;
            alien.y = col.y + (ry / d) * minD;
          }
        }
      }
    }
  }

  function update(dt, timeSec) {
    let dirX = 0, dirY = 0;
    let moveScale = 1;

    if (!isAnyUIOpen()) {
      if (!useJoystick && isHolding) {
        const w = screenToWorld(pointerScreenX, pointerScreenY);
        targetWorldX = w.x;
        targetWorldY = w.y;
        hasTarget = true;
      }

      let kbX = 0, kbY = 0;
      if (keys.has("arrowleft") || keys.has("a") || keys.has("q")) kbX -= 1;
      if (keys.has("arrowright") || keys.has("d")) kbX += 1;
      if (keys.has("arrowup") || keys.has("w") || keys.has("z")) kbY -= 1;
      if (keys.has("arrowdown") || keys.has("s")) kbY += 1;
      const kl = Math.hypot(kbX, kbY);

      if (kl > 0.01) {
        hasTarget = false;
        const sx = kbX / kl, sy = kbY / kl;
        if (cam.angle) {
          const c = Math.cos(cam.angle), s = Math.sin(cam.angle);
          dirX = sx * c + sy * s;
          dirY = -sx * s + sy * c;
        } else {
          dirX = sx;
          dirY = sy;
        }
        moveScale = 1;
        resetZoomToAlien();
      } else if (useJoystick && joyActive && joyMag > 0) {
        if (cam.angle) {
          const c = Math.cos(cam.angle), s = Math.sin(cam.angle);
          dirX = joyDirX * c + joyDirY * s;
          dirY = -joyDirX * s + joyDirY * c;
        } else {
          dirX = joyDirX;
          dirY = joyDirY;
        }
        moveScale = joyMag;
        resetZoomToAlien();
      } else if (!useJoystick && hasTarget) {
        const dx = targetWorldX - alien.x;
        const dy = targetWorldY - alien.y;
        const dist = Math.hypot(dx, dy);
        const stopDist = Math.max(DEADZONE_PX, 8);
        if (dist > stopDist) {
          dirX = dx / dist;
          dirY = dy / dist;
          moveScale = 1;
        } else if (!isHolding) {
          hasTarget = false;
        }
      }
    }

    lastMoveDir.x = dirX;
    lastMoveDir.y = dirY;
    lastMoveDir.active = (dirX !== 0 || dirY !== 0);

    const accel = 1400;
    const fric = 1600;
    const prevX = alien.x, prevY = alien.y;

    if (alienHitFlash > 0) alienHitFlash = Math.max(0, alienHitFlash - dt * 4.5);

    if (alienKnockbackTimer > 0) {
      alienKnockbackTimer = Math.max(0, alienKnockbackTimer - dt);
      const decay = Math.exp(-8.5 * dt);
      alienKnockbackVx *= decay;
      alienKnockbackVy *= decay;
      alien.vx = alienKnockbackVx;
      alien.vy = alienKnockbackVy;
    } else if (dirX !== 0 || dirY !== 0) {
      const tx = dirX * MOVE_SPEED * moveScale;
      const ty = dirY * MOVE_SPEED * moveScale;
      const dvx = tx - alien.vx, dvy = ty - alien.vy;
      const dv = Math.hypot(dvx, dvy);
      const step = accel * dt;
      if (dv <= step) { alien.vx = tx; alien.vy = ty; }
      else { alien.vx += (dvx / dv) * step; alien.vy += (dvy / dv) * step; }
      alien.facing = lerpAngle(alien.facing, Math.atan2(dirY, dirX), clamp(dt * 12, 0, 1));
    } else {
      const spd = Math.hypot(alien.vx, alien.vy);
      const step = fric * dt;
      if (spd <= step) { alien.vx = 0; alien.vy = 0; }
      else { alien.vx -= (alien.vx / spd) * step; alien.vy -= (alien.vy / spd) * step; }
    }

    alien.x += alien.vx * dt;
    alien.y += alien.vy * dt;
    const activeGen = getActiveBiomeGenerator();
    if (activeGen && typeof activeGen.resolveTerrainConstraint === "function") {
      activeGen.resolveTerrainConstraint(alien, prevX, prevY, getBiomeGeneratorEnv(timeSec));
    }
    resolveCollisions();
    if (activeGen && typeof activeGen.update === "function") {
      activeGen.update(dt, timeSec, getBiomeGeneratorEnv(timeSec));
    }

    const moved = Math.hypot(alien.x - prevX, alien.y - prevY);
    alien.distance += moved;
    const speedNow = Math.hypot(alien.vx, alien.vy);
    if (speedNow > 15) {
      alien.walkCycle += dt * (speedNow / MOVE_SPEED) * 12;
    } else {
      alien.walkCycle = lerp(alien.walkCycle, 0, clamp(dt * 6, 0, 1));
    }

    const camT = 1 - Math.exp(-CAM_SMOOTH * dt);
    cam.x = lerp(cam.x, alien.x, camT);
    cam.y = lerp(cam.y, alien.y, camT);
    currentZoom = lerp(currentZoom, getTargetZoom(), camT);

    updateChunks(alien.x, alien.y);

    // Collect nearby Level 1 pickups
    if (!isAnyUIOpen()) {
      playTimeSec += dt;
      const pcx = Math.floor(alien.x / CHUNK_SIZE);
      const pcy = Math.floor(alien.y / CHUNK_SIZE);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ch = chunks.get((pcx + dx) + "," + (pcy + dy));
          if (!ch || !ch.pickups) continue;
          for (const p of ch.pickups) {
            if (p.collected) continue;
            if (Math.hypot(alien.x - p.x, alien.y - p.y) <= 36) {
              p.collected = true;
              markPickupCollected(activeBiomeId, ch.cx, ch.cy, p.index);
              autosaveDirty = true;
              const isNew = addItem(p.elementId, 1);
              const el = elementsById.get(p.elementId);
              if (el) {
                showToast(isNew
                  ? `✨ Nouveau ! +1 ${formatElementInlineHtml(el, 20)}`
                  : `+1 ${formatElementInlineHtml(el, 20)} (×${getQty(el.id)})`, { html: true });
              }
              runHook("onCollect", () => {}, p.elementId, isNew, {
                biomeId: activeBiomeId,
                cx: ch.cx,
                cy: ch.cy,
                pickupIdx: p.index,
                x: p.x,
                y: p.y,
              });
              emitHostEvent("element:collected", { id: p.elementId, isNew, biomeId: activeBiomeId, x: p.x, y: p.y });
              syncUnlockedExtensions(false);
            }
          }
        }
      }
      extCheckAccum += dt;
      if (extCheckAccum >= 0.5) {
        extCheckAccum = 0;
        syncUnlockedExtensions(false);
      }
      if (!autosaveDirty && Math.hypot(alien.x - lastSavedPosX, alien.y - lastSavedPosY) >= 24) {
        autosaveDirty = true;
      }
      if (autosaveDirty) {
        autosaveTimer += dt;
        if (autosaveTimer >= AUTOSAVE_INTERVAL_SEC) {
          autosaveTimer = 0;
          saveCurrentSlot(true);
        }
      }
    }

    const toShipDist = Math.hypot(-alien.x, -alien.y);
    if (!isAnyUIOpen()) {
      if (toShipDist <= SHIP_CONTACT_ENTER_DIST) {
        if (!shipContactLocked) {
          shipContactLocked = true;
          openShipUI();
        }
      } else if (toShipDist >= SHIP_CONTACT_EXIT_DIST) {
        shipContactLocked = false;
      }
    }
    if (toShipDist > 4) {
      compassAngle = lerpAngle(compassAngle, Math.atan2(-alien.y, -alien.x), clamp(dt * 10, 0, 1));
    }

    if (resolvedAnchorsById.size > 0) {
      const discRadiusPx = DEFAULT_ANCHOR_DISCOVERY_RADIUS_M * ANCHOR_PIXELS_PER_METER;
      for (const a of resolvedAnchorsById.values()) {
        if (Math.hypot(alien.x - a.x, alien.y - a.y) <= discRadiusPx) {
          discoverAnchor(a.id, activeBiomeId);
        }
      }
    }

    if (!hintDismissed && alien.distance > 80) {
      hintDismissed = true;
      hintEl.style.opacity = "0";
    }
  }

  function drawPickups(drawCtx, ch) {
    if (!ch || !ch.pickups) return;
    for (const p of ch.pickups) {
      if (p.collected) continue;
      drawCtx.save();
      drawCtx.globalAlpha = 0.18;
      drawCtx.fillStyle = p.color;
      drawCtx.beginPath(); drawCtx.arc(p.x, p.y, 21, 0, Math.PI * 2); drawCtx.fill();
      drawCtx.globalAlpha = 0.88;
      drawCtx.fillStyle = "#141c30";
      drawCtx.beginPath(); drawCtx.arc(p.x, p.y, 15, 0, Math.PI * 2); drawCtx.fill();
      drawCtx.globalAlpha = 0.82;
      drawCtx.strokeStyle = p.color;
      drawCtx.lineWidth = 2;
      drawCtx.beginPath(); drawCtx.arc(p.x, p.y, 15.5, 0, Math.PI * 2); drawCtx.stroke();
      drawCtx.globalAlpha = 1;
      const elDef = p.elementId ? elementsById.get(p.elementId) : null;
      const sprInfo = elDef ? getElementSpriteInfo(elDef) : null;
      if (sprInfo && window.AssemblageVisuals) {
        const fw = Math.max(1, Number(sprInfo.frame.w || 1));
        const fh = Math.max(1, Number(sprInfo.frame.h || 1));
        const sc = 26 / Math.max(fw, fh);
        window.AssemblageVisuals.drawSpriteSheet(drawCtx, sprInfo.sheetId, p.x, p.y, {
          frameId: sprInfo.frameId,
          scale: sc,
          rot: cam.angle ? -cam.angle : 0,
          pixelated: sprInfo.isPixel,
        });
      } else if (p.icon) {
        drawCtx.font = '17px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        drawCtx.textAlign = "center";
        drawCtx.textBaseline = "middle";
        drawCtx.fillStyle = "#ffffff";
        if (cam.angle) {
          drawCtx.translate(p.x, p.y);
          drawCtx.rotate(-cam.angle);
          drawCtx.fillText(p.icon, 0, 1);
        } else {
          drawCtx.fillText(p.icon, p.x, p.y + 1);
        }
      } else {
        drawCtx.fillStyle = p.color;
        drawCtx.beginPath();
        drawCtx.moveTo(p.x, p.y - 6.5);
        drawCtx.lineTo(p.x + 5.5, p.y);
        drawCtx.lineTo(p.x, p.y + 6.5);
        drawCtx.lineTo(p.x - 5.5, p.y);
        drawCtx.closePath();
        drawCtx.fill();
        drawCtx.fillStyle = "rgba(255,255,255,0.85)";
        drawCtx.beginPath(); drawCtx.arc(p.x - 1.5, p.y - 2, 2, 0, Math.PI * 2); drawCtx.fill();
      }
      drawCtx.restore();
    }
  }

  function drawChunk(ch) {
    const env = getBiomeGeneratorEnv();
    const gen = getActiveBiomeGenerator(ch && ch.generator ? ch.generator : env.generator);
    if (gen && typeof gen.drawChunk === "function") {
      gen.drawChunk(ctx, ch, env);
      return;
    }
    // Fallback minimal si le fichier générateur n'est pas encore chargé
    for (let ty = 0; ty < TILE_COUNT; ty++) {
      for (let tx = 0; tx < TILE_COUNT; tx++) {
        ctx.fillStyle = (ch.tiles && ch.tiles[ty * TILE_COUNT + tx]) || rgbStr(groundColA);
        ctx.fillRect(ch.ox + tx * TILE_SIZE, ch.oy + ty * TILE_SIZE, TILE_SIZE + 1, TILE_SIZE + 1);
      }
    }
    drawPickups(ctx, ch);
  }

  function drawAnchors(timeSec) {
    if (resolvedAnchorsById.size === 0) return;
    const rawHW = (viewW * 0.5) / currentZoom;
    const rawHH = (viewH * 0.5) / currentZoom;
    let halfW, halfH;
    if (cam.angle) {
      const ac = Math.abs(Math.cos(cam.angle));
      const as = Math.abs(Math.sin(cam.angle));
      halfW = rawHW * ac + rawHH * as + 120;
      halfH = rawHW * as + rawHH * ac + 120;
    } else {
      halfW = rawHW + 120;
      halfH = rawHH + 120;
    }
    const pulse = 0.5 + 0.5 * Math.sin(timeSec * 2.6);

    for (const a of resolvedAnchorsById.values()) {
      if (!a.showOnMap) continue;
      if (a.x < cam.x - halfW || a.x > cam.x + halfW || a.y < cam.y - halfH || a.y > cam.y + halfH) continue;

      ctx.save();
      ctx.translate(a.x, a.y);
      if (cam.angle) ctx.rotate(-cam.angle);

      // Halo pulsant
      ctx.fillStyle = `rgba(250, 194, 76, ${(0.14 + pulse * 0.08).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(0, 0, 26 + pulse * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(250, 199, 87, 0.38)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();

      // Badge sombre + anneau doré
      ctx.fillStyle = "rgba(0, 0, 0, 0.40)";
      ctx.beginPath();
      ctx.arc(0, 2, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(23, 28, 46, 0.92)";
      ctx.beginPath();
      ctx.arc(0, 0, 17.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(250, 194, 82, 0.92)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Emoji centré
      ctx.font = "20px system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(a.emoji || "⚓", 0, 1);

      // Étiquette ID sous le badge
      if (a.id) {
        ctx.font = "600 11px system-ui, -apple-system, sans-serif";
        const tw = ctx.measureText(a.id).width;
        const pw = tw + 12;
        const ph = 16;
        ctx.fillStyle = "rgba(15, 20, 36, 0.80)";
        ctx.strokeStyle = "rgba(250, 194, 82, 0.45)";
        ctx.lineWidth = 1;
        ctx.fillRect(-pw * 0.5, 21, pw, ph);
        ctx.strokeRect(-pw * 0.5, 21, pw, ph);
        ctx.fillStyle = "rgba(255, 235, 184, 0.95)";
        ctx.fillText(a.id, 0, 29.5);
      }

      ctx.restore();
    }
  }

  function drawSpaceship(timeSec) {
    const pulse = 0.5 + 0.5 * Math.sin(timeSec * 3);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath(); ctx.arc(8, 12, 76, 0, Math.PI * 2); ctx.fill();

    // Halo
    const haloAlpha = isHoveredShip ? (0.28 + 0.16 * pulse) : (0.10 + 0.08 * pulse);
    ctx.strokeStyle = `rgba(89, 230, 255, ${haloAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 84 + pulse * 3, 0, Math.PI * 2); ctx.stroke();

    // Ramp
    ctx.fillStyle = "#4d5970";
    ctx.beginPath();
    ctx.moveTo(-18, 48); ctx.lineTo(18, 48); ctx.lineTo(24, 90); ctx.lineTo(-24, 90);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8ca6c7"; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = "#333d52"; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const ry = 60 + i * 10;
      ctx.beginPath(); ctx.moveTo(-15, ry); ctx.lineTo(15, ry); ctx.stroke();
    }

    // Struts
    for (const deg of [-150, -30]) {
      const a = deg * Math.PI / 180;
      const dx = Math.cos(a), dy = Math.sin(a);
      const px = -dy, py = dx;
      ctx.fillStyle = "#424d61";
      ctx.beginPath();
      ctx.moveTo(dx * 45 + px * 9, dy * 45 + py * 9);
      ctx.lineTo(dx * 82 + px * 6, dy * 82 + py * 6);
      ctx.lineTo(dx * 82 - px * 6, dy * 82 - py * 6);
      ctx.lineTo(dx * 45 - px * 9, dy * 45 - py * 9);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#66758f";
      ctx.beginPath(); ctx.arc(dx * 82, dy * 82, 8, 0, Math.PI * 2); ctx.fill();
    }

    // Top thruster fin
    ctx.fillStyle = "#525e75";
    ctx.beginPath();
    ctx.moveTo(-16, -56); ctx.lineTo(16, -56); ctx.lineTo(10, -82); ctx.lineTo(-10, -82);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(89, 217, 255, 0.75)";
    ctx.beginPath(); ctx.arc(0, -76, 6 + pulse * 1.5, 0, Math.PI * 2); ctx.fill();

    // Main hull
    ctx.fillStyle = "#8a99b3";
    ctx.beginPath(); ctx.arc(0, 0, 68, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#adbdd1";
    ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#3d475c"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 68, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = "#61708a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 47, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#6b7a94"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 32, Math.sin(a) * 32);
      ctx.lineTo(Math.cos(a) * 62, Math.sin(a) * 62);
      ctx.stroke();
    }

    // Rim lights
    ctx.fillStyle = `rgba(71, 242, 224, ${0.65 + 0.35 * pulse})`;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 55, Math.sin(a) * 55, 4.2, 0, Math.PI * 2); ctx.fill();
    }

    // Cockpit dome
    ctx.fillStyle = "#29384d";
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2eadcf";
    ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(166, 245, 255, 0.65)";
    ctx.beginPath(); ctx.arc(-7, -7, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath(); ctx.arc(-10, -10, 4.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawAlien(timeSec) {
    ctx.save();
    ctx.translate(alien.x, alien.y);

    const stride = Math.sin(alien.walkCycle) * 5;
    const bob = Math.abs(Math.cos(alien.walkCycle)) * 1.5;
    const fx = Math.cos(alien.facing), fy = Math.sin(alien.facing);
    const rx = -fy, ry = fx;

    if (hasTarget && !isAnyUIOpen()) {
      const ltx = targetWorldX - alien.x;
      const lty = targetWorldY - alien.y;
      if (Math.hypot(ltx, lty) > 22) {
        const pulse = 0.5 + 0.5 * Math.sin(timeSec * 6);
        ctx.strokeStyle = "rgba(107, 240, 224, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ltx, lty, 9 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(107, 240, 224, 0.65)";
        ctx.beginPath(); ctx.arc(ltx, lty, 3, 0, Math.PI * 2); ctx.fill();
      }
      const ax = fx * 30, ay = fy * 30;
      ctx.fillStyle = "rgba(115, 242, 217, 0.55)";
      ctx.beginPath();
      ctx.moveTo(ax + fx * 7, ay + fy * 7);
      ctx.lineTo(ax - fx * 2 + rx * 6, ay - fy * 2 + ry * 6);
      ctx.lineTo(ax - fx * 2 - rx * 6, ay - fy * 2 - ry * 6);
      ctx.closePath(); ctx.fill();
    } else if (useJoystick && joyActive && joyMag > 0 && !isAnyUIOpen()) {
      const ax = fx * 30, ay = fy * 30;
      ctx.fillStyle = "rgba(115, 242, 217, 0.55)";
      ctx.beginPath();
      ctx.moveTo(ax + fx * 7, ay + fy * 7);
      ctx.lineTo(ax - fx * 2 + rx * 6, ay - fy * 2 + ry * 6);
      ctx.lineTo(ax - fx * 2 - rx * 6, ay - fy * 2 - ry * 6);
      ctx.closePath(); ctx.fill();
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath(); ctx.arc(3, 5, 17, 0, Math.PI * 2); ctx.fill();

    // Feet
    ctx.fillStyle = "#2e3857";
    ctx.beginPath(); ctx.arc(-rx * 7.5 + fx * stride, -ry * 7.5 + fy * stride, 5.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rx * 7.5 - fx * stride, ry * 7.5 - fy * stride, 5.2, 0, Math.PI * 2); ctx.fill();

    // Backpack & torso
    ctx.fillStyle = "#3d5c85";
    ctx.beginPath(); ctx.arc(-fx * 6, -fy * 6, 10.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#527aa8";
    ctx.beginPath(); ctx.arc(0, 0, 14.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#293d5c"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, 0, 14.5, 0, Math.PI * 2); ctx.stroke();

    // Arms
    ctx.fillStyle = "#6bdb6b";
    ctx.beginPath(); ctx.arc(-rx * 13.5 - fx * stride * 0.6, -ry * 13.5 - fy * stride * 0.6, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rx * 13.5 + fx * stride * 0.6, ry * 13.5 + fy * stride * 0.6, 4.5, 0, Math.PI * 2); ctx.fill();

    // Head
    const hx = fx * (2.5 + bob * 0.3);
    const hy = fy * (2.5 + bob * 0.3);
    ctx.fillStyle = "#5cd661";
    ctx.beginPath(); ctx.arc(hx, hy, 12.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(128, 240, 122, 0.75)";
    ctx.beginPath(); ctx.arc(hx - fx * 1.5 - rx * 2, hy - fy * 1.5 - ry * 2, 8.5, 0, Math.PI * 2); ctx.fill();

    // Antennae
    const sway = Math.sin(timeSec * 4.5 + alien.walkCycle * 0.5) * 2.2;
    for (const side of [-1, 1]) {
      const bx = hx + rx * 5.5 * side - fx * 4;
      const by = hy + ry * 5.5 * side - fy * 4;
      const tx = bx + rx * 5 * side - fx * 9 + rx * sway;
      const ty = by + ry * 5 * side - fy * 9 + ry * sway;
      ctx.strokeStyle = "#47b852"; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = "#d1ff6b";
      ctx.beginPath(); ctx.arc(tx, ty, 3.2, 0, Math.PI * 2); ctx.fill();
    }

    // Eyes
    const lex = hx + fx * 6.2 - rx * 4.6, ley = hy + fy * 6.2 - ry * 4.6;
    const rex = hx + fx * 6.2 + rx * 4.6, rey = hy + fy * 6.2 + ry * 4.6;
    ctx.fillStyle = "#0f1424";
    ctx.beginPath(); ctx.arc(lex, ley, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rex, rey, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath(); ctx.arc(lex + fx - rx, ley + fy - ry, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rex + fx - rx, rey + fy - ry, 1.2, 0, Math.PI * 2); ctx.fill();

    if (alienHitFlash > 0.01) {
      ctx.strokeStyle = `rgba(255, 118, 96, ${(alienHitFlash * 0.78).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 19 + (1 - alienHitFlash) * 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function formatCompactMeters(meters) {
    const m = Math.max(0, Math.floor(meters));
    if (m < 1000) return `${m}m`;
    if (m < 10000) {
      const tenths = Math.floor(m / 100);
      const whole = Math.floor(tenths / 10);
      const dec = tenths % 10;
      return dec === 0 ? `${whole}K` : `${whole},${dec}K`;
    }
    if (m < 1000000) return `${Math.floor(m / 1000)}K`;
    if (m < 10000000) {
      const tenthsM = Math.floor(m / 100000);
      const wholeM = Math.floor(tenthsM / 10);
      const decM = tenthsM % 10;
      return decM === 0 ? `${wholeM}M` : `${wholeM},${decM}M`;
    }
    return `${Math.floor(m / 1000000)}M`;
  }

  function drawCompass() {
    if (!SHOW_COMPASS || isAnyUIOpen()) return;
    const { cx, cy, r } = getCompassLayout();
    const distPx = Math.hypot(alien.x, alien.y);
    const nearShip = distPx < 150;

    ctx.save();
    const screenCompassAngle = compassAngle + (cam.angle || 0);
    const dx = Math.cos(screenCompassAngle), dy = Math.sin(screenCompassAngle);
    const px = -dy, py = dx;

    // Subtle drop shadow behind needle (no circle around compass)
    ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
    ctx.beginPath();
    ctx.moveTo(cx + 1.5 - dx * (r - 12), cy + 2.5 - dy * (r - 12));
    ctx.lineTo(cx + 1.5 + px * 8.5, cy + 2.5 + py * 8.5);
    ctx.lineTo(cx + 1.5 + dx * (r - 6), cy + 2.5 + dy * (r - 6));
    ctx.lineTo(cx + 1.5 - px * 8.5, cy + 2.5 - py * 8.5);
    ctx.closePath();
    ctx.fill();

    // Tail of needle
    ctx.fillStyle = "rgba(128, 156, 196, 0.92)";
    ctx.beginPath();
    ctx.moveTo(cx - dx * (r - 12), cy - dy * (r - 12));
    ctx.lineTo(cx + px * 5.5, cy + py * 5.5);
    ctx.lineTo(cx + dx * 2, cy + dy * 2);
    ctx.lineTo(cx - px * 5.5, cy - py * 5.5);
    ctx.closePath();
    ctx.fill();

    // Pointer tip toward spaceship
    ctx.fillStyle = nearShip ? "#47f2c7" : "#ff943d";
    ctx.beginPath();
    ctx.moveTo(cx + dx * (r - 6), cy + dy * (r - 6));
    ctx.lineTo(cx + px * 8, cy + py * 8);
    ctx.lineTo(cx - dx * 3, cy - dy * 3);
    ctx.lineTo(cx - px * 8, cy - py * 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(12, 18, 32, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Center pivot
    ctx.fillStyle = "#ebf5ff";
    ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a293d";
    ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();

    // Distance label
    ctx.font = "600 14px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const label = nearShip ? "Vaisseau" : `${Math.round(distPx / 18)} m`;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillText(label, cx + 1, cy + r + 5);
    ctx.fillStyle = "#dbf2ff";
    ctx.fillText(label, cx, cy + r + 4);

    // Total distance traveled (compact format)
    const totalLabel = formatCompactMeters(alien.distance / 18);
    ctx.font = "600 11.5px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillText(totalLabel, cx + 1, cy + r + 22);
    ctx.fillStyle = "#9ecce8";
    ctx.fillText(totalLabel, cx, cy + r + 21);
    ctx.restore();
  }

  function drawJoystick() {
    if (!useJoystick || !joyActive || isAnyUIOpen()) return;
    ctx.save();

    // Outer translucent base
    ctx.fillStyle = "rgba(18, 28, 46, 0.36)";
    ctx.beginPath();
    ctx.arc(joyOriginX, joyOriginY, JOY_MAX_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(82, 209, 245, 0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(joyOriginX, joyOriginY, JOY_MAX_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle center dot
    ctx.fillStyle = "rgba(140, 234, 255, 0.38)";
    ctx.beginPath();
    ctx.arc(joyOriginX, joyOriginY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Direction stem
    if (joyMag > 0) {
      ctx.strokeStyle = "rgba(115, 242, 217, 0.45)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(joyOriginX, joyOriginY);
      ctx.lineTo(joyKnobX, joyKnobY);
      ctx.stroke();
    }

    // Knob glow + thumbstick
    ctx.fillStyle = "rgba(72, 214, 245, 0.22)";
    ctx.beginPath();
    ctx.arc(joyKnobX, joyKnobY, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(45, 168, 204, 0.86)";
    ctx.beginPath();
    ctx.arc(joyKnobX, joyKnobY, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(166, 245, 255, 0.92)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(joyKnobX, joyKnobY, 22, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(joyKnobX - 5, joyKnobY - 5, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- Système d'extensions HTML (chargement par nom de fichier, hooks d'interception & carton titre) ---
  const settingsExtSlotEl = document.getElementById("settings-extensions-slot");
  const extTitleCardOverlayEl = document.getElementById("ext-titlecard-overlay");
  const extTitleCardEl = document.getElementById("ext-titlecard");
  const extTcBadgeEl = document.getElementById("ext-tc-badge");
  const extTcIconEl = document.getElementById("ext-tc-icon");
  const extTcTitleEl = document.getElementById("ext-tc-title");
  const extTcDescEl = document.getElementById("ext-tc-desc");
  const extTcFileEl = document.getElementById("ext-tc-file");
  const extTcCloseBtnEl = document.getElementById("ext-tc-close-btn");
  const extTcSkipAllBtnEl = document.getElementById("ext-tc-skip-all-btn");
  const extModalOverlayEl = document.getElementById("ext-modal-overlay");
  const extModalTitleEl = document.getElementById("ext-modal-title");
  const extModalBodyEl = document.getElementById("ext-modal-body");
  const extModalCloseBtnEl = document.getElementById("ext-modal-close");
  const extFrameOverlayEl = document.getElementById("ext-frame-overlay");
  const extFrameTitleEl = document.getElementById("ext-frame-title");
  const extFrameCloseBtnEl = document.getElementById("ext-frame-close");
  const extFrameIframeEl = document.getElementById("ext-frame-iframe");
  const shipHubChoicesEl = document.querySelector("#ship-view-hub .hub-choices");

  const customExprCache = new Map(); // expr -> Function | null
  const isExtensionUnlockedFn = (f) => {
    const k = String(f || "");
    if (!k) return false;
    const def = getExtensionsByFilenameMap().get(k);
    const st = (def ? extensionStates.get(getExtKey(def)) : null) || extensionStates.get(k);
    return Boolean(st && st.unlocked);
  };

  function hashExtensionHtml(str) {
    const s = String(str || "");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `${s.length}:${(h >>> 0).toString(36)}`;
  }

  window.AssemblageExtensions = window.AssemblageExtensions || {};
  const hookWrappers = new Map(); // hookName -> Array<{ id, fn }>
  let nextHookId = 1;
  const activeExtensions = new Map(); // filename -> { cleanups: Array<Function>, iframe: HTMLIFrameElement | null }
  const loadingExtensions = new Set();
  const loadedExtensionHtmlHash = new Map(); // filename -> hash léger du dernier HTML (+ deps) chargé (évite de garder tout le HTML en RAM)
  const loadedExtensionDeps = new Map(); // filename -> Array<depUrl>
  const loadedExtensionStyles = new Map(); // filename -> Array<string> de CSS à réinjecter si réactivation
  let extSlotGeneration = 0;
  const titleCardQueue = [];
  let titleCardTimer = null;
  let currentTitleCardItem = null;
  const titleCardCloseListeners = new Set();
  let extCheckAccum = 0;
  const EXT_FETCH_CONCURRENCY = 6;
  const EXT_HTML_CHECK_COOLDOWN_MS = 30000;
  const EXT_HTML_AUTO_CHECK_MAX = 40;
  let lastExtHtmlCheckAt = 0;

  function getExtKey(extDef) {
    if (!extDef || typeof extDef !== "object") return "";
    const id = String(extDef.id || "").trim();
    if (id) return id;
    return String(extDef.filename || "").trim();
  }

  let cachedExtListRef = null;
  let cachedExtByFilename = new Map();
  function getExtensionsByFilenameMap() {
    const list = Array.isArray(EXTENSIONS_DATA?.extensions) ? EXTENSIONS_DATA.extensions : [];
    if (list !== cachedExtListRef) {
      cachedExtListRef = list;
      cachedExtByFilename = new Map();
      for (const extDef of list) {
        const key = getExtKey(extDef);
        const fname = String(extDef?.filename || "");
        if (key) cachedExtByFilename.set(key, extDef);
        if (fname && !cachedExtByFilename.has(fname)) cachedExtByFilename.set(fname, extDef);
      }
    }
    return cachedExtByFilename;
  }

  async function runWithConcurrency(items, limit, worker) {
    if (!Array.isArray(items) || items.length === 0) return;
    const cap = Math.max(1, Math.min(limit || 6, items.length));
    let cursor = 0;
    const runners = [];
    for (let i = 0; i < cap; i++) {
      runners.push((async () => {
        while (cursor < items.length) {
          const idx = cursor++;
          await worker(items[idx], idx);
        }
      })());
    }
    await Promise.all(runners);
  }

  let pendingElementsRefreshTimer = null;
  let pendingElementsRefreshOpts = { pruneState: false, refreshChunks: false };
  function scheduleElementsRefresh({ pruneState = false, refreshChunks = true } = {}) {
    pendingElementsRefreshOpts.pruneState = pendingElementsRefreshOpts.pruneState || Boolean(pruneState);
    pendingElementsRefreshOpts.refreshChunks = pendingElementsRefreshOpts.refreshChunks || Boolean(refreshChunks);
    if (pendingElementsRefreshTimer !== null) return;
    pendingElementsRefreshTimer = setTimeout(() => {
      const opts = pendingElementsRefreshOpts;
      pendingElementsRefreshTimer = null;
      pendingElementsRefreshOpts = { pruneState: false, refreshChunks: false };
      refreshWorldAndUiAfterElementsChange(opts);
    }, 30);
  }

  function runHook(name, baseFn, ...args) {
    const list = hookWrappers.get(name);
    if (!list || list.length === 0) return baseFn(...args);
    let idx = list.length - 1;
    const invoke = (...callArgs) => {
      if (idx < 0) return baseFn(...callArgs);
      const entry = list[idx--];
      try {
        return entry.fn(invoke, ...callArgs);
      } catch (err) {
        console.error(`[Extension Hook ${name}]`, err);
        return invoke(...callArgs);
      }
    };
    return invoke(...args);
  }

  function addHookWrapper(name, wrapperFn, priority = 0) {
    const id = nextHookId++;
    const prio = Number.isFinite(Number(priority)) ? Number(priority) : 0;
    if (!hookWrappers.has(name)) hookWrappers.set(name, []);
    const list = hookWrappers.get(name);
    list.push({ id, fn: wrapperFn, priority: prio });
    list.sort((a, b) => (a.priority - b.priority) || (a.id - b.id));
    return () => {
      const cur = hookWrappers.get(name);
      if (!cur) return;
      const i = cur.findIndex(x => x.id === id);
      if (i >= 0) cur.splice(i, 1);
    };
  }

  const {
    itemMatchesTag,
    hostTagsApi,
    emitHostEvent,
    onHostEvent,
    hostServicesMap,
    worldEntitiesMap,
    worldEntities,
    actorKillsById,
    hostActorsApi,
    spawnActorsForChunk,
    unloadActorsForChunk,
    clearAllChunkActors,
    respawnAllLoadedChunkActors,
    hostAudio,
    getOrCreateHudSlot,
  } = window.AssemblageRuntime.createHostCore({
    getTagsData: () => TAGS_DATA,
    getAnchorsData: () => ANCHORS_DATA,
    getActorsData: () => ACTORS_DATA,
    getMiniGDManifest: () => MINIGD_MANIFEST,
    getElementsList: () => elementsList,
    getElementsById: () => elementsById,
    getActiveBiomeId: () => activeBiomeId,
    getWorldSeed: () => WORLD_SEED,
    getActiveBiomeGenerator,
    getBiomeGeneratorEnv,
    getActorModule,
    ensureActorScriptLoaded,
    getChunks: () => chunks,
    getAlien: () => alien,
    CHUNK_SIZE,
    LANDING_CLEAR_RADIUS,
    addItem,
    showToast,
    markAutosaveDirty: () => { autosaveDirty = true; },
    syncUnlockedExtensions: (...args) => syncUnlockedExtensions(...args),
  });
  // Progression globale : flags, stats, résultats MiniGD & récompenses génériques
  const hostProgressApi = {
    getFlag: (key, fallback = false) => (campaignFlags.has(String(key)) ? campaignFlags.get(String(key)) : fallback),
    setFlag(key, value = true, persist = true) {
      const k = String(key || "").trim();
      if (!k) return;
      if (value === null || value === undefined || value === false) campaignFlags.delete(k);
      else campaignFlags.set(k, value);
      emitHostEvent("progress:flag", { key: k, value });
      if (persist) saveCurrentSlot(true);
      syncUnlockedExtensions(false);
    },
    getAllFlags: () => mapToPlainObj(campaignFlags),
    getStat: (key) => Number(campaignStats.get(String(key)) || 0),
    setStat(key, value, persist = true) {
      const k = String(key || "").trim();
      const v = Number(value);
      if (!k || !Number.isFinite(v)) return;
      campaignStats.set(k, v);
      emitHostEvent("progress:stat", { key: k, value: v });
      if (persist) saveCurrentSlot(true);
      syncUnlockedExtensions(false);
    },
    incStat(key, delta = 1, persist = true) {
      const k = String(key || "").trim();
      if (!k) return 0;
      const next = Number(campaignStats.get(k) || 0) + (Number(delta) || 0);
      campaignStats.set(k, next);
      emitHostEvent("progress:stat", { key: k, value: next, delta });
      if (persist) saveCurrentSlot(true);
      syncUnlockedExtensions(false);
      return next;
    },
    getAllStats: () => mapToPlainObj(campaignStats),
    getMiniGDResult(targetKey) {
      const k = String(targetKey || "").trim();
      if (!k) return null;
      return minigdResults.get(k) || minigdResults.get(k.split("#")[0]) || null;
    },
    getAllMiniGDResults: () => mapToPlainObj(minigdResults),
    recordMiniGDResult(targetKey, result = {}) {
      const rawKey = String(targetKey || "").trim();
      if (!rawKey) return null;
      const baseKey = rawKey.split("#")[0];
      const won = Boolean(result.won);
      const score = Number.isFinite(Number(result.score)) ? Number(result.score) : 0;
      const updateKey = (k) => {
        const prev = minigdResults.get(k) || { plays: 0, wins: 0, bestScore: 0, lastWon: false, lastScore: 0, lastPlayedAt: "" };
        const isFirstWin = won && prev.wins === 0;
        const next = {
          plays: prev.plays + 1,
          wins: prev.wins + (won ? 1 : 0),
          bestScore: Math.max(prev.bestScore, score),
          lastWon: won,
          lastScore: score,
          lastPlayedAt: new Date().toISOString(),
        };
        minigdResults.set(k, next);
        return { record: next, isFirstWin };
      };
      const primary = updateKey(rawKey);
      if (baseKey && baseKey !== rawKey) updateKey(baseKey);
      emitHostEvent("minigd:result", { target: rawKey, basePath: baseKey, won, score, isFirstWin: primary.isFirstWin, record: primary.record, raw: result });
      saveCurrentSlot(true);
      syncUnlockedExtensions(false);
      return primary;
    },
    grantRewards(rewards, opts = {}) {
      if (!rewards || typeof rewards !== "object") return [];
      const granted = [];
      const grantedHtml = [];
      const isFirstWin = Boolean(opts.isFirstWin);
      const score = Number(opts.score || 0);
      if (rewards.minScoreForReward && score < Number(rewards.minScoreForReward)) return granted;
      const itemBatches = [];
      if (isFirstWin && Array.isArray(rewards.firstWinItems)) itemBatches.push(...rewards.firstWinItems);
      if (Array.isArray(rewards.winItems)) itemBatches.push(...rewards.winItems);
      for (const it of itemBatches) {
        if (!it || !it.id) continue;
        const qty = Math.max(1, Number(it.qty || it.count || 1));
        addItem(String(it.id), qty);
        const el = elementsById.get(String(it.id));
        granted.push(`+${qty} ${el ? `${el.icon} ${el.name}` : it.id}`);
        grantedHtml.push(`+${qty} ${el ? formatElementInlineHtml(el, 18) : escapeHtmlText(it.id)}`);
      }
      if (rewards.setFlag) hostProgressApi.setFlag(rewards.setFlag, true, false);
      if (rewards.incStat) hostProgressApi.incStat(rewards.incStat, 1, false);
      if (rewards.unlockBiome) {
        const bid = String(rewards.unlockBiome).trim();
        if (bid && !unlockedBiomes.has(bid)) {
          unlockedBiomes.add(bid);
          const b = BIOMES.find((x) => x && x.id === bid);
          const bTxt = `🌍 ${b ? b.name : bid}`;
          granted.push(bTxt);
          grantedHtml.push(escapeHtmlText(bTxt));
        }
      }
      if (rewards.unlockExtension) {
        unlockExtensionByFilename(String(rewards.unlockExtension), true);
      }
      if (granted.length > 0) {
        renderShipUI();
        saveCurrentSlot(true);
        syncUnlockedExtensions(false);
        showToast(`🎁 Récompense : ${grantedHtml.join(" • ")}`, { html: true });
      }
      return granted;
    },
  };

  function hasMeaningfulExtensionState(st) {
    if (!st || typeof st !== "object") return false;
    if (st.unlocked || st.permanently_disabled || st.manually_locked || st.enabled === false) return true;
    if (st.state && typeof st.state === "object" && Object.keys(st.state).length > 0) return true;
    return false;
  }

  function exportExtensionStatesObj() {
    const out = {};
    for (const [fname, st] of extensionStates.entries()) {
      if (!hasMeaningfulExtensionState(st)) continue;
      out[fname] = {
        unlocked: Boolean(st.unlocked),
        enabled: st.enabled === undefined ? true : Boolean(st.enabled),
        unlocked_at: String(st.unlocked_at || ""),
        condition_sig: String(st.condition_sig || ""),
        deactivate_sig: String(st.deactivate_sig || ""),
        permanently_disabled: Boolean(st.permanently_disabled),
        manually_locked: Boolean(st.manually_locked),
        state: (st.state && typeof st.state === "object") ? st.state : {},
      };
    }
    return out;
  }

  function importExtensionStatesObj(obj) {
    extensionStates.clear();
    if (!obj || typeof obj !== "object") return;
    for (const [fname, st] of Object.entries(obj)) {
      if (!fname || !hasMeaningfulExtensionState(st)) continue;
      extensionStates.set(String(fname), {
        unlocked: Boolean(st.unlocked),
        enabled: st.enabled === undefined ? true : Boolean(st.enabled),
        unlocked_at: String(st.unlocked_at || ""),
        condition_sig: String(st.condition_sig || ""),
        deactivate_sig: String(st.deactivate_sig || ""),
        permanently_disabled: Boolean(st.permanently_disabled),
        manually_locked: Boolean(st.manually_locked),
        state: (st.state && typeof st.state === "object") ? JSON.parse(JSON.stringify(st.state)) : {},
      });
    }
  }

  function getExtensionStateRecord(filename) {
    if (!extensionStates.has(filename)) {
      extensionStates.set(filename, { unlocked: false, enabled: true, unlocked_at: "", condition_sig: "", deactivate_sig: "", permanently_disabled: false, manually_locked: false, state: {} });
    }
    return extensionStates.get(filename);
  }

  function ensureSettingsExtContainer() {
    let sec = settingsExtSlotEl.querySelector(".settings-ext-section");
    if (!sec) {
      sec = document.createElement("div");
      sec.className = "settings-ext-section";
      const heading = document.createElement("div");
      heading.className = "settings-ext-heading";
      heading.textContent = "🧩 EXTENSIONS ACTIVÉES";
      sec.appendChild(heading);
      const searchInp = document.createElement("input");
      searchInp.type = "search";
      searchInp.className = "settings-ext-search";
      searchInp.placeholder = "🔍 Filtrer les options d'extensions...";
      searchInp.style.cssText = "display:none;width:100%;margin:4px 0 8px 0;padding:7px 10px;border-radius:8px;border:1px solid rgba(115,250,209,0.28);background:rgba(10,18,32,0.85);color:#eefcff;font-size:12.5px;outline:none;";
      searchInp.addEventListener("input", () => {
        const q = searchInp.value.trim().toLowerCase();
        sec.querySelectorAll("[data-ext-setting]").forEach((row) => {
          const txt = (row.textContent || "").toLowerCase();
          row.style.display = (!q || txt.includes(q)) ? "" : "none";
        });
      });
      sec.appendChild(searchInp);
      settingsExtSlotEl.appendChild(sec);
    }
    const rowsCount = sec.querySelectorAll("[data-ext-setting]").length;
    const searchEl = sec.querySelector(".settings-ext-search");
    if (searchEl) searchEl.style.display = rowsCount >= 6 ? "" : "none";
    return sec;
  }

  function cleanupSettingsExtContainerIfEmpty() {
    const sec = settingsExtSlotEl.querySelector(".settings-ext-section");
    if (sec && sec.querySelectorAll("[data-ext-setting]").length === 0) {
      sec.remove();
    }
  }

  function showExtModal({ icon = "🧩", title = "Extension", html = "", text = "", onMount = null }) {
    extModalTitleEl.textContent = `${icon} ${title}`;
    if (html) extModalBodyEl.innerHTML = html;
    else extModalBodyEl.textContent = text;
    extModalOpen = true;
    extModalOverlayEl.classList.add("open");
    if (typeof onMount === "function") {
      try { onMount(extModalBodyEl); } catch (e) { console.error(e); }
    }
    return extModalBodyEl;
  }

  function closeExtModal() {
    extModalOpen = false;
    extModalOverlayEl.classList.remove("open");
  }

  extModalCloseBtnEl.addEventListener("click", closeExtModal);
  extModalOverlayEl.addEventListener("click", (e) => { if (e.target === extModalOverlayEl) closeExtModal(); });

  function openExtFrame({ filename = "", icon = "🧩", title = "Module" } = {}) {
    if (!filename) return;
    extFrameTitleEl.textContent = `${icon} ${title}`;
    extFrameIframeEl.src = `${ASSET_BASE}extensions/${encodeURIComponent(filename)}`;
    extFrameOpen = true;
    extFrameOverlayEl.classList.add("open");
    extFrameIframeEl.onload = () => {
      try {
        extFrameIframeEl.contentWindow.postMessage({
          channel: "assemblage_host",
          event: "frame_init",
          slotId: currentSlotId,
          filename,
          state: getExtensionStateRecord(filename).state,
        }, "*");
      } catch (_e) {}
    };
  }

  function closeExtFrame() {
    extFrameOpen = false;
    extFrameOverlayEl.classList.remove("open");
    extFrameIframeEl.src = "about:blank";
  }

  extFrameCloseBtnEl.addEventListener("click", closeExtFrame);
  extFrameOverlayEl.addEventListener("click", (e) => { if (e.target === extFrameOverlayEl) closeExtFrame(); });

  function updateTitleCardSkipBtn() {
    if (!extTcSkipAllBtnEl) return;
    if (titleCardQueue.length > 0) {
      extTcSkipAllBtnEl.textContent = `Tout passer (${titleCardQueue.length + 1})`;
      extTcSkipAllBtnEl.style.display = "inline-block";
    } else {
      extTcSkipAllBtnEl.style.display = "none";
    }
  }

  function interpolateExtText(template, extDef, extraVars = null) {
    const raw = String(template ?? "");
    const fname = String(extDef?.filename || "");
    const name = String(extDef?.name || fname);
    const icon = String(extDef?.icon || "🧩");
    let out = raw
      .replaceAll("{filename}", fname)
      .replaceAll("{name}", name)
      .replaceAll("{icon}", icon);
    if (extraVars && typeof extraVars === "object") {
      for (const [k, v] of Object.entries(extraVars)) {
        out = out.replaceAll(`{${k}}`, String(v ?? ""));
      }
    }
    return out;
  }

  function buildExtTitleCardOptions(extDef, overrides = null) {
    const fname = String(extDef?.filename || "");
    const ui = (extDef && typeof extDef.ui === "object" && extDef.ui) ? extDef.ui : {};
    const rawBadge = String(ui.titleCardBadge || "").trim();
    const rawTitle = String(ui.titleCardTitle || "").trim();
    const rawText = String(ui.titleCardText || "").trim();
    const rawBtn = String(ui.titleCardButtonText || "").trim();
    const durationVal = (ui.titleCardDurationMs !== undefined && ui.titleCardDurationMs !== null)
      ? Math.max(0, Number(ui.titleCardDurationMs))
      : 6500;
    const base = {
      filename: fname,
      badge: rawBadge ? interpolateExtText(rawBadge, extDef) : "NOUVELLE EXTENSION ACTIVÉE",
      icon: extDef?.icon || "🧩",
      title: rawTitle ? interpolateExtText(rawTitle, extDef) : (extDef?.name || fname),
      description: rawText ? interpolateExtText(rawText, extDef) : (extDef?.description || extDef?.activationBehavior || ""),
      buttonText: rawBtn ? interpolateExtText(rawBtn, extDef) : "Continuer",
      showFile: ui.titleCardShowFile !== false,
      durationMs: Number.isFinite(durationVal) ? durationVal : 6500,
      accentColor: extDef?.accentColor || "#73fad1",
    };
    return overrides ? Object.assign(base, overrides) : base;
  }

  function buildExtToastMessage(extDef) {
    const fname = String(extDef?.filename || "");
    const ui = (extDef && typeof extDef.ui === "object" && extDef.ui) ? extDef.ui : {};
    const customToast = String(ui.toastText || "").trim();
    if (customToast) return interpolateExtText(customToast, extDef);
    return `${extDef?.icon || "🧩"} Extension activée : ${extDef?.name || fname}`;
  }

  function notifyTitleCardClosed(item, reason) {
    if (!item) return;
    for (const listener of Array.from(titleCardCloseListeners)) {
      try { listener(item, reason); } catch (err) { console.error("[TitleCard listener]", err); }
    }
  }

  function showNextTitleCard() {
    if (extTitleCardOpen || titleCardQueue.length === 0) return;
    const item = titleCardQueue.shift();
    currentTitleCardItem = item;
    setGamePaused("title_card", true);
    extTitleCardEl.style.setProperty("--ext-accent", item.accentColor || "#73fad1");
    extTcBadgeEl.textContent = item.badge || "NOUVELLE EXTENSION ACTIVÉE";
    extTcIconEl.textContent = item.icon || "🧩";
    extTcTitleEl.textContent = item.title || item.filename || "Extension";
    extTcDescEl.style.whiteSpace = "pre-line";
    extTcDescEl.textContent = item.description || "";
    extTcFileEl.textContent = item.fileLabel || `📄 ${item.filename || ""}`;
    extTcFileEl.style.display = (item.showFile === false) ? "none" : "";
    extTcCloseBtnEl.textContent = item.buttonText || "Continuer";
    updateTitleCardSkipBtn();
    extTitleCardOpen = true;
    extTitleCardOverlayEl.classList.add("open");
    if (titleCardTimer) { clearTimeout(titleCardTimer); titleCardTimer = null; }
    const dur = (item.durationMs !== undefined && item.durationMs !== null) ? Number(item.durationMs) : 6500;
    if (Number.isFinite(dur) && dur > 0) {
      titleCardTimer = setTimeout(() => closeTitleCard("timeout"), dur);
    }
  }

  function closeTitleCard(reason = "button") {
    const closedItem = currentTitleCardItem;
    currentTitleCardItem = null;
    if (titleCardTimer) { clearTimeout(titleCardTimer); titleCardTimer = null; }
    extTitleCardOpen = false;
    extTitleCardOverlayEl.classList.remove("open");
    if (closedItem) notifyTitleCardClosed(closedItem, reason);
    if (titleCardQueue.length > 0) {
      setTimeout(showNextTitleCard, 220);
    } else {
      setGamePaused("title_card", false);
    }
  }

  function skipAllTitleCards() {
    const skippedItems = [];
    if (currentTitleCardItem) skippedItems.push(currentTitleCardItem);
    while (titleCardQueue.length > 0) skippedItems.push(titleCardQueue.shift());
    currentTitleCardItem = null;
    if (titleCardTimer) { clearTimeout(titleCardTimer); titleCardTimer = null; }
    extTitleCardOpen = false;
    extTitleCardOverlayEl.classList.remove("open");
    updateTitleCardSkipBtn();
    for (const item of skippedItems) {
      notifyTitleCardClosed(item, "skip_all");
    }
    setGamePaused("title_card", false);
  }

  extTcCloseBtnEl.addEventListener("click", () => closeTitleCard("button"));
  if (extTcSkipAllBtnEl) extTcSkipAllBtnEl.addEventListener("click", skipAllTitleCards);
  extTitleCardOverlayEl.addEventListener("click", (e) => {
    if (e.target === extTitleCardOverlayEl) {
      if (currentTitleCardItem && currentTitleCardItem.requireValidationButton) return;
      closeTitleCard("backdrop");
    }
  });

  function queueTitleCard(opts) {
    titleCardQueue.push(opts);
    if (extTitleCardOpen) updateTitleCardSkipBtn();
    else showNextTitleCard();
  }

  function createScopedHost(extKey, extDef) {
    const filename = String(extDef?.filename || extKey || "");
    const cleanups = [];
    const registerCleanup = (fn) => { if (typeof fn === "function") cleanups.push(fn); };
    const ownedTouchIds = new Set();
    const ownedPauseKeys = new Set();
    const defaultHookPriority = Number(extDef?.priority || 0);
    const lifecycleState = {
      inDuration: 0,
      outDuration: 0,
      alpha: 1,
      deactivating: false,
    };
    registerCleanup(() => {
      for (const id of ownedTouchIds) extClaimedTouchIds.delete(id);
      ownedTouchIds.clear();
      for (const pk of ownedPauseKeys) setGamePaused(pk, false);
      ownedPauseKeys.clear();
      worldEntities.removeByOwner(extKey);
    });

    const scopedHost = {
      version: 2,
      id: extKey,
      instanceId: extKey,
      filename,
      ext: extDef,
      registerCleanup,
      lifecycle: {
        setFade(opts = {}) {
          const dur = typeof opts === "number" ? opts : undefined;
          const inD = Math.max(0, Number((dur !== undefined ? dur : (opts?.inDuration ?? opts?.duration)) ?? 0) || 0);
          const outD = Math.max(0, Number((dur !== undefined ? dur : (opts?.outDuration ?? opts?.duration)) ?? 0) || 0);
          lifecycleState.inDuration = inD;
          lifecycleState.outDuration = outD;
          if (!lifecycleState.deactivating) {
            lifecycleState.alpha = inD > 0 ? 0 : 1;
          }
        },
        getAlpha: () => lifecycleState.alpha,
        getEasedAlpha: () => {
          const t = Math.max(0, Math.min(1, lifecycleState.alpha));
          return 1 - Math.pow(1 - t, 3);
        },
        isFadingOut: () => lifecycleState.deactivating,
      },
      tags: hostTagsApi,
      actors: hostActorsApi,
      progress: hostProgressApi,
      audio: hostAudio,
      events: {
        on(eventName, fn) {
          const unsub = onHostEvent(eventName, fn);
          registerCleanup(unsub);
          return unsub;
        },
        once(eventName, fn) {
          let unsub = null;
          unsub = onHostEvent(eventName, (payload, ev) => {
            if (unsub) unsub();
            fn(payload, ev);
          });
          registerCleanup(unsub);
          return unsub;
        },
        emit(eventName, payload, opts = null) {
          emitHostEvent(eventName, payload, opts);
        },
      },
      services: {
        provide(name, api) {
          const k = String(name || "").trim();
          if (!k) return;
          hostServicesMap.set(k, api);
          registerCleanup(() => {
            if (hostServicesMap.get(k) === api) hostServicesMap.delete(k);
          });
        },
        get: (name) => hostServicesMap.get(String(name || "").trim()) || null,
        has: (name) => hostServicesMap.has(String(name || "").trim()),
      },
      world: {
        spawnEntity(def) {
          const ent = worldEntities.spawn(def, extKey);
          if (ent) registerCleanup(() => worldEntities.remove(ent.id));
          return ent;
        },
        removeEntity: (id) => worldEntities.remove(id),
        getEntity: (id) => worldEntities.get(id),
        queryEntities: (opts) => worldEntities.query(opts),
        damageEntitiesAt: (wx, wy, radius, dmg, opts) => worldEntities.damageAt(wx, wy, radius, dmg, opts),
        drawGroundEntities: (ctxRef, timeSec) => worldEntities.drawAll(ctxRef, timeSec),
      },
      hooks: {
        wrap(hookName, wrapperFn, priority = defaultHookPriority) {
          const unhook = addHookWrapper(hookName, wrapperFn, priority);
          registerCleanup(unhook);
          return unhook;
        },
        before(hookName, beforeFn, priority = defaultHookPriority) {
          return scopedHost.hooks.wrap(hookName, (orig, ...args) => {
            beforeFn(...args);
            return orig(...args);
          }, priority);
        },
        after(hookName, afterFn, priority = defaultHookPriority) {
          return scopedHost.hooks.wrap(hookName, (orig, ...args) => {
            const res = orig(...args);
            afterFn(res, ...args);
            return res;
          }, priority);
        },
      },
      ui: {
        mountHudSlot(slotName, el) {
          if (!el) return () => {};
          const slot = getOrCreateHudSlot(slotName);
          el.style.pointerEvents = "auto";
          slot.appendChild(el);
          const removeFn = () => { if (el.parentNode === slot) el.remove(); };
          registerCleanup(removeFn);
          return removeFn;
        },
        showToast(msg) { showToast(String(msg || "")); },
        showTitleCard(opts) { queueTitleCard(buildExtTitleCardOptions(extDef, opts || {})); },
        showModal(opts) { return showExtModal(Object.assign({ icon: extDef.icon || "🧩", title: extDef.name || filename }, opts || {})); },
        closeModal: closeExtModal,
        addElementAction({ id = "", elementId = "", match = null, buttonText = "Ouvrir l'élément", icon = "", accentColor = "", onClick = null }) {
          const entry = {
            id: id || `${filename}_${Date.now()}`,
            filename,
            elementId: String(elementId || ""),
            match: typeof match === "function" ? match : null,
            buttonText: String(buttonText || "Ouvrir l'élément"),
            icon: String(icon || ""),
            accentColor: String(accentColor || extDef.accentColor || "#73fad1"),
            onClick,
          };
          const existingIdx = extElementActions.findIndex(a => a.filename === filename && a.id === entry.id);
          if (existingIdx >= 0) extElementActions[existingIdx] = entry;
          else extElementActions.push(entry);
          if (typeof renderDescriptionPanel === "function") renderDescriptionPanel();
          if (levelFilter === LEVEL_FILTER_MENU && typeof renderGrid === "function") renderGrid();
          const removeAction = () => {
            const idx = extElementActions.indexOf(entry);
            if (idx >= 0) extElementActions.splice(idx, 1);
            if (typeof renderDescriptionPanel === "function") renderDescriptionPanel();
            if (levelFilter === LEVEL_FILTER_MENU && typeof renderGrid === "function") renderGrid();
          };
          registerCleanup(removeAction);
          return removeAction;
        },
        getConfig(key, fallback = "") {
          const custom = (extDef && extDef.ui && typeof extDef.ui.custom === "object" && extDef.ui.custom) ? extDef.ui.custom : null;
          if (!custom || !Object.prototype.hasOwnProperty.call(custom, key)) return fallback;
          const val = custom[key];
          return (val === undefined || val === null) ? fallback : val;
        },
        getAllConfig() {
          return Object.assign({}, (extDef && extDef.ui && typeof extDef.ui.custom === "object" && extDef.ui.custom) ? extDef.ui.custom : {});
        },
        interpolate(template, extraVars = null) {
          return interpolateExtText(template, extDef, extraVars);
        },
        addSettingToggle({ id, label, desc = "", checked = false, onChange }) {
          const sec = ensureSettingsExtContainer();
          const rowId = `ext-setting-${id || filename.replace(/[^a-z0-9]/gi, "_")}`;
          const existing = document.getElementById(rowId);
          if (existing) existing.remove();

          const row = document.createElement("label");
          row.className = "setting-row";
          row.id = rowId;
          row.dataset.extSetting = filename;
          const inputId = rowId + "-input";
          row.setAttribute("for", inputId);

          const info = document.createElement("div");
          info.className = "setting-info";
          const lblEl = document.createElement("div");
          lblEl.className = "setting-label";
          lblEl.textContent = label || extDef.name || filename;
          const descEl = document.createElement("div");
          descEl.className = "setting-desc";
          descEl.textContent = desc;
          info.appendChild(lblEl);
          if (desc) info.appendChild(descEl);

          const sw = document.createElement("span");
          sw.className = "switch";
          const inp = document.createElement("input");
          inp.id = inputId;
          inp.type = "checkbox";
          inp.checked = Boolean(checked);
          const slider = document.createElement("span");
          slider.className = "slider";
          sw.appendChild(inp);
          sw.appendChild(slider);

          row.appendChild(info);
          row.appendChild(sw);
          sec.appendChild(row);
          enableSwipeSwitch(sw);
          inp.addEventListener("change", () => { if (typeof onChange === "function") onChange(inp.checked); });

          registerCleanup(() => {
            row.remove();
            cleanupSettingsExtContainerIfEmpty();
          });
          return inp;
        },
        addSettingButton({ id, label, desc = "", buttonText = "Ouvrir", onClick }) {
          const sec = ensureSettingsExtContainer();
          const rowId = `ext-btn-${id || filename.replace(/[^a-z0-9]/gi, "_")}`;
          const existing = document.getElementById(rowId);
          if (existing) existing.remove();

          const row = document.createElement("div");
          row.className = "setting-row";
          row.id = rowId;
          row.dataset.extSetting = filename;

          const info = document.createElement("div");
          info.className = "setting-info";
          const lblEl = document.createElement("div");
          lblEl.className = "setting-label";
          lblEl.textContent = label || extDef.name || filename;
          const descEl = document.createElement("div");
          descEl.className = "setting-desc";
          descEl.textContent = desc;
          info.appendChild(lblEl);
          if (desc) info.appendChild(descEl);

          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "ext-action-btn";
          btn.textContent = buttonText;
          btn.addEventListener("click", () => { if (typeof onClick === "function") onClick(); });

          row.appendChild(info);
          row.appendChild(btn);
          sec.appendChild(row);

          registerCleanup(() => {
            row.remove();
            cleanupSettingsExtContainerIfEmpty();
          });
          return btn;
        },
        addShipHubButton({ id, icon = "🧩", title, subtitle = "", accentColor = "", onClick }) {
          if (!shipHubChoicesEl) return null;
          const btnId = `ext-hub-${id || filename.replace(/[^a-z0-9]/gi, "_")}`;
          const existing = document.getElementById(btnId);
          if (existing) existing.remove();

          const btn = document.createElement("button");
          btn.id = btnId;
          btn.type = "button";
          btn.className = "hub-btn ext-hub";
          btn.dataset.extHub = filename;
          if (accentColor || extDef.accentColor) {
            btn.style.setProperty("--ext-accent", accentColor || extDef.accentColor);
          }

          const ic = document.createElement("span");
          ic.className = "hub-btn-icon";
          ic.textContent = icon || extDef.icon || "🧩";
          const tt = document.createElement("span");
          tt.className = "hub-btn-title";
          tt.textContent = title || extDef.name || filename;
          btn.appendChild(ic);
          btn.appendChild(tt);
          if (subtitle) {
            const sub = document.createElement("span");
            sub.className = "hub-btn-sub";
            sub.textContent = subtitle;
            btn.appendChild(sub);
          }
          btn.addEventListener("click", () => { if (typeof onClick === "function") onClick(); });
          shipHubChoicesEl.appendChild(btn);

          registerCleanup(() => btn.remove());
          return btn;
        },
        openExtensionFrame(opts) {
          const cfg = typeof opts === "string" ? { filename: opts } : (opts || {});
          openExtFrame({
            filename: cfg.filename || filename,
            icon: cfg.icon || extDef.icon || "🧩",
            title: cfg.title || extDef.name || filename,
          });
        },
        closeExtensionFrame: closeExtFrame,
        isTitleCardOpen() { return extTitleCardOpen; },
        isTitleCardPending(targetFilename = filename) {
          const t = String(targetFilename || "");
          if (currentTitleCardItem && String(currentTitleCardItem.filename || "") === t) return true;
          return titleCardQueue.some((item) => item && String(item.filename || "") === t);
        },
        onTitleCardClosed(cb, opts = null) {
          if (typeof cb !== "function") return () => {};
          const targetFile = (opts && opts.filename !== undefined) ? String(opts.filename || "") : filename;
          const listener = (item, reason) => {
            if (targetFile && String(item?.filename || "") !== targetFile) return;
            cb(item, reason);
          };
          titleCardCloseListeners.add(listener);
          const unsub = () => titleCardCloseListeners.delete(listener);
          registerCleanup(unsub);
          return unsub;
        },
      },
      unlockExtension(targetFilename, announce = true) {
        return unlockExtensionByFilename(targetFilename, announce);
      },
      lockExtension(targetFilename, announce = false, permanent = false) {
        return lockExtensionByFilename(targetFilename, announce, permanent);
      },
      state: {
        get() {
          return getExtensionStateRecord(extKey).state;
        },
        set(patch, persist = true) {
          const rec = getExtensionStateRecord(extKey);
          rec.state = Object.assign({}, rec.state, patch || {});
          if (persist) saveCurrentSlot(true);
          return rec.state;
        },
      },
      game: {
        get ctx() { return ctx; },
        get canvas() { return canvas; },
        get alien() { return alien; },
        get cam() { return cam; },
        get lastMoveDir() { return lastMoveDir; },
        get currentZoom() { return currentZoom; },
        get viewW() { return viewW; },
        get viewH() { return viewH; },
        get showCompass() { return SHOW_COMPASS; },
        get useJoystick() { return useJoystick; },
        get chunks() { return chunks; },
        get CHUNK_SIZE() { return CHUNK_SIZE; },
        get TILE_COUNT() { return TILE_COUNT; },
        get TILE_SIZE() { return TILE_SIZE; },
        get LANDING_CLEAR_RADIUS() { return LANDING_CLEAR_RADIUS; },
        get ANCHOR_PIXELS_PER_METER() { return ANCHOR_PIXELS_PER_METER; },
        get MAX_COLLECTED_CHUNKS() { return MAX_COLLECTED_CHUNKS; },
        get MAX_DECORATED_CHUNKS() { return MAX_DECORATED_CHUNKS; },
        getPinnedChunkCount() { return pinnedChunks.size; },
        getPinnedChunkKeys(biomeId = activeBiomeId) { return getPinnedChunkKeys(biomeId); },
        isChunkPinned(biomeId, cx, cy) { return isChunkPinned(biomeId, cx, cy); },
        isChunkPinnedByOther(biomeId, cx, cy, excludeOwnerKey) { return isChunkPinnedByOther(biomeId, cx, cy, excludeOwnerKey); },
        setPinnedChunksForOwner(ownerKey, chunkList) { return setPinnedChunksForOwner(ownerKey, chunkList); },
        clearPinnedChunksByPrefix(prefix) { return clearPinnedChunksByPrefix(prefix); },
        inspectChunkPickups(biomeId, cx, cy) { return inspectChunkPickups(biomeId, cx, cy); },
        isPositionWalkable(wx, wy) { return isPositionWalkable(wx, wy); },
        getCollectedChunksCount() { return collectedChunkOrder.length; },
        isChunkInCollectedLru(biomeId, cx, cy) { return collectedChunks.has(makeChunkMaskKey(biomeId, cx, cy)); },
        get isHoveredShip() { return isHoveredShip; },
        get hasTarget() { return hasTarget; },
        get targetWorldX() { return targetWorldX; },
        get targetWorldY() { return targetWorldY; },
        get joyActive() { return joyActive; },
        get joyMag() { return joyMag; },
        getBiomeGeneratorEnv(t) { return getBiomeGeneratorEnv(t); },
        getActiveBiomeGenerator(id) { return getActiveBiomeGenerator(id); },
        runHook(name, baseFn, ...args) { return runHook(name, baseFn, ...args); },
        isAnyUIOpen() { return isAnyUIOpen(); },
        getCompassLayout() { return getCompassLayout(); },
        isPointOnCompass(sx, sy) { return isPointOnCompass(sx, sy); },
        worldToScreenPos(wx, wy) { return worldToScreenPos(wx, wy); },
        getCanvasPos(clientX, clientY) { return getCanvasPos(clientX, clientY); },
        screenToWorld(sx, sy) { return screenToWorld(sx, sy); },
        isMoveActive() { return useJoystick ? joyActive : isHolding; },
        getMoveTouchId() { return useJoystick ? joyTouchId : moveTouchId; },
        claimTouch(id) {
          if (id === null || id === undefined) return;
          extClaimedTouchIds.add(id);
          ownedTouchIds.add(id);
        },
        releaseTouch(id) {
          extClaimedTouchIds.delete(id);
          ownedTouchIds.delete(id);
        },
        checkColliderHit(wx, wy, radius = 0, opts = null) {
          const activeGen = getActiveBiomeGenerator();
          if (activeGen && typeof activeGen.onProjectileHit === "function") {
            if (activeGen.onProjectileHit(wx, wy, radius, getBiomeGeneratorEnv(), opts)) return true;
          }
          for (const ent of worldEntitiesMap.values()) {
            if (ent.dead) continue;
            if (!ent.solid && !ent.damageable) continue;
            if (opts && opts.excludeOwner && ent.owner === opts.excludeOwner) continue;
            if (Math.hypot(wx - ent.x, wy - ent.y) <= (Number(ent.radius) || 16) + radius) {
              if (!(opts && opts.remote) && ent.damageable && opts && Number(opts.damage) > 0) {
                worldEntities.damageAt(wx, wy, radius, Number(opts.damage), opts);
              }
              return true;
            }
          }
          if (Math.hypot(wx, wy) <= SHIP_COLLISION_RADIUS + radius) return true;
          const cx = Math.floor(wx / CHUNK_SIZE);
          const cy = Math.floor(wy / CHUNK_SIZE);
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ch = chunks.get((cx + dx) + "," + (cy + dy));
              if (!ch || !ch.colliders) continue;
              for (const col of ch.colliders) {
                if (Math.hypot(wx - col.x, wy - col.y) <= col.r + radius) return true;
              }
            }
          }
          return false;
        },
        get activeBiomeId() { return activeBiomeId; },
        get discovered() { return discovered; },
        get inventory() { return inventory; },
        get elementsById() { return elementsById; },
        getElementSpriteInfo(elOrId) { return getElementSpriteInfo(elOrId); },
        get anchors() { return Array.from(resolvedAnchorsById.values()); },
        getAnchor(id) { return resolvedAnchorsById.get(String(id || "").trim()) || null; },
        getAnchorDistance(id) { return getDistanceToAnchorMeters(id); },
        getDiscoveredAnchors(biomeId = activeBiomeId) { return getDiscoveredAnchors(biomeId); },
        isAnchorDiscovered(id, biomeId = activeBiomeId) { return isAnchorDiscovered(id, biomeId); },
        discoverAnchor(id, biomeId = activeBiomeId) { return discoverAnchor(id, biomeId); },
        get playTimeSec() { return playTimeSec; },
        getDistanceTraveled() { return Math.floor(alien.distance / 18); },
        isExtensionUnlocked(targetFilename) { return isExtensionUnlockedFn(targetFilename); },
        getBiomes() { return BIOMES.slice(); },
        isBiomeUnlocked(biomeId) {
          const b = BIOMES.find((x) => x && x.id === String(biomeId || ""));
          return b ? !isBiomeLocked(b) : false;
        },
        evaluateCondition(cond, defaultType = "always") {
          if (!cond || typeof cond !== "object") return defaultType === "always";
          return combineWithExtraConditions(evaluateSingleCondition(cond, defaultType), cond);
        },
        getQty(id) { return getQty(id); },
        addItem(id, amount = 1) {
          const isNew = addItem(id, amount);
          saveCurrentSlot(true);
          renderShipUI();
          syncUnlockedExtensions(false);
          return isNew;
        },
        consumeItem(id, amount = 1) {
          consumeItem(id, amount);
          saveCurrentSlot(true);
          renderShipUI();
        },
        selectBiome(biomeId) { travelToBiome(biomeId); },
        unlockBiome(biomeId, announce = true) {
          return unlockBiomeById(biomeId, announce);
        },
        lockBiome(biomeId, announce = false) {
          return lockBiomeById(biomeId, announce);
        },
        unlockAllBiomes(silent = true) {
          let count = 0;
          for (const b of BIOMES) {
            if (!b || !b.id) continue;
            const isDynLocked = lockedBiomes.has(b.id);
            const isStaticLocked = Boolean(b.locked) && !unlockedBiomes.has(b.id);
            if (!isDynLocked && !isStaticLocked) continue;
            lockedBiomes.delete(b.id);
            unlockedBiomes.add(b.id);
            count++;
            emitHostEvent("biome:unlocked", { biomeId: b.id, biome: b });
            if (!silent) showToast(`🌍 Nouveau biome débloqué : ${formatBiomeInlineHtml(b, 20)} !`, { html: true });
          }
          if (count > 0) {
            if (uiOpen && shipViewMode === "biomes") renderBiomesView();
            saveCurrentSlot(true);
          }
          return count;
        },
        unlockAllExtensions(silent = true) {
          const rawList = Array.isArray(EXTENSIONS_DATA?.extensions) ? EXTENSIONS_DATA.extensions : [];
          let count = 0;
          for (const ext of rawList) {
            if (!ext || ext.enabled === false || !ext.filename) continue;
            if (ext.filename === filename) continue;
            if (unlockExtensionByFilename(ext.filename, !silent)) count++;
          }
          if (count > 0) saveCurrentSlot(true);
          return count;
        },
        restartGame() {
          closeExtModal();
          closeShipUI();
          closeSettingsUI();
          cancelActivePointer();
          hasTarget = false;
          resetZoomToAlien();
          if (p2pSoloSnapshot) p2pSoloSnapshot = null;
          startNewGame(currentSlotId || "slot_1");
        },
        exportWorldSyncState() {
          const biomeSeeds = {};
          for (const b of BIOMES) {
            if (b && b.id) biomeSeeds[b.id] = Number(b.worldSeed ?? 4242) | 0;
          }
          return {
            activeBiomeId,
            biomeName: activeBiome?.name || activeBiomeId,
            biomeSeeds,
            collectedChunks: exportCollectedChunksLRU(),
          };
        },
        async enterRemoteWorld(remoteState, spawnX = null, spawnY = null) {
          if (!remoteState || typeof remoteState !== "object") return false;
          if (!p2pSoloSnapshot) {
            const soloSeeds = {};
            for (const b of BIOMES) {
              if (b && b.id) soloSeeds[b.id] = Number(b.worldSeed ?? 4242) | 0;
            }
            p2pSoloSnapshot = {
              activeBiomeId,
              biomeSeeds: soloSeeds,
              collectedChunks: exportCollectedChunksLRU(),
              playerX: alien.x,
              playerY: alien.y,
            };
          }
          if (remoteState.biomeSeeds && typeof remoteState.biomeSeeds === "object") {
            for (const b of BIOMES) {
              if (b && b.id && Object.prototype.hasOwnProperty.call(remoteState.biomeSeeds, b.id)) {
                const s = Math.floor(Number(remoteState.biomeSeeds[b.id]));
                if (Number.isFinite(s)) b.worldSeed = s;
              }
            }
          }
          const targetBiomeId = String(remoteState.activeBiomeId || activeBiomeId);
          const targetB = BIOMES.find(x => x && x.id === targetBiomeId) || BIOMES[0];
          const targetGenId = targetB ? normalizeBiomeGeneratorId(targetB.generator) : "";
          try {
            let loadingUi = targetGenId ? getBiomeLoadingUi(targetGenId) : null;
            if (loadingUi) {
              await loadingUi.show(targetB, "Chargement des modules du biome…");
            }
            const prevGen = getActiveBiomeGenerator();
            if (prevGen && typeof prevGen.onUnload === "function") {
              try { prevGen.onUnload(); } catch (_e) {}
            }
            if (targetB) {
              await ensureBiomeGeneratorLoaded(targetGenId, false, targetB);
              loadingUi = getBiomeLoadingUi(targetGenId);
              if (loadingUi) {
                loadingUi.update("Génération du terrain…");
                await loadingUi.waitFrame();
              }
              applyActiveBiomeParams(targetB.id);
            }
            const nextGen = getActiveBiomeGenerator();
            if (nextGen && typeof nextGen.reset === "function") {
              try { nextGen.reset(); } catch (_e) {}
            }
            if (Array.isArray(remoteState.collectedChunks)) {
              importCollectedChunksLRU(remoteState.collectedChunks);
            }
            if (typeof clearAllChunkActors === "function") clearAllChunkActors();
            if (typeof ensureActorsLoadedForList === "function" && hostActorsApi) {
              await ensureActorsLoadedForList(hostActorsApi.getForBiome(activeBiomeId));
            }
            chunks.clear();
            lastCenterKey = "";
            if (Number.isFinite(spawnX) && Number.isFinite(spawnY)) {
              alien.x = spawnX;
              alien.y = spawnY;
            } else {
              alien.x = 135;
              alien.y = 70;
            }
            alien.vx = 0;
            alien.vy = 0;
            cam.x = alien.x;
            cam.y = alien.y;
            hasTarget = false;
            shipContactLocked = false;
            updateChunks(alien.x, alien.y);
            return true;
          } finally {
            const loadingUi = targetGenId ? getBiomeLoadingUi(targetGenId) : null;
            if (loadingUi) loadingUi.hide();
          }
        },
        async leaveRemoteWorld() {
          if (!p2pSoloSnapshot) return false;
          const snap = p2pSoloSnapshot;
          p2pSoloSnapshot = null;
          if (snap.biomeSeeds) {
            for (const b of BIOMES) {
              if (b && b.id && Object.prototype.hasOwnProperty.call(snap.biomeSeeds, b.id)) {
                b.worldSeed = snap.biomeSeeds[b.id];
              }
            }
          }
          const targetB = BIOMES.find(x => x && x.id === snap.activeBiomeId) || BIOMES[0];
          const targetGenId = targetB ? normalizeBiomeGeneratorId(targetB.generator) : "";
          try {
            let loadingUi = targetGenId ? getBiomeLoadingUi(targetGenId) : null;
            if (loadingUi) {
              await loadingUi.show(targetB, "Chargement des modules du biome…");
            }
            const prevGen = getActiveBiomeGenerator();
            if (prevGen && typeof prevGen.onUnload === "function") {
              try { prevGen.onUnload(); } catch (_e) {}
            }
            if (targetB) {
              await ensureBiomeGeneratorLoaded(targetGenId, false, targetB);
              loadingUi = getBiomeLoadingUi(targetGenId);
              if (loadingUi) {
                loadingUi.update("Génération du terrain…");
                await loadingUi.waitFrame();
              }
              applyActiveBiomeParams(targetB.id);
            }
            const nextGen = getActiveBiomeGenerator();
            if (nextGen && typeof nextGen.reset === "function") {
              try { nextGen.reset(); } catch (_e) {}
            }
            importCollectedChunksLRU(snap.collectedChunks || []);
            if (typeof clearAllChunkActors === "function") clearAllChunkActors();
            if (typeof ensureActorsLoadedForList === "function" && hostActorsApi) {
              await ensureActorsLoadedForList(hostActorsApi.getForBiome(activeBiomeId));
            }
            chunks.clear();
            lastCenterKey = "";
            alien.x = Number.isFinite(snap.playerX) ? snap.playerX : 115;
            alien.y = Number.isFinite(snap.playerY) ? snap.playerY : 70;
            alien.vx = 0;
            alien.vy = 0;
            cam.x = alien.x;
            cam.y = alien.y;
            hasTarget = false;
            shipContactLocked = false;
            updateChunks(alien.x, alien.y);
            saveCurrentSlot(true);
            return true;
          } finally {
            const loadingUi = targetGenId ? getBiomeLoadingUi(targetGenId) : null;
            if (loadingUi) loadingUi.hide();
          }
        },
        applyRemotePickup(biomeId, cx, cy, pickupIdx) {
          const bid = String(biomeId || activeBiomeId);
          markPickupCollected(bid, cx, cy, pickupIdx);
          if (bid === activeBiomeId) {
            const ch = chunks.get(cx + "," + cy);
            if (ch && Array.isArray(ch.pickups)) {
              for (const p of ch.pickups) {
                if (p.index === pickupIdx) {
                  p.collected = true;
                  break;
                }
              }
            }
          }
        },
        isInRemoteWorld() { return Boolean(p2pSoloSnapshot); },
        getConfig() { return GAME_CONFIG; },
        openShipUI() { openShipUI(); },
        closeShipUI() { closeShipUI(); },
        closeSettingsUI() { closeSettingsUI(); },
        pause(key = "default") {
          const fullKey = `ext:${filename}:${String(key || "default")}`;
          ownedPauseKeys.add(fullKey);
          setGamePaused(fullKey, true);
        },
        resume(key = "default") {
          const fullKey = `ext:${filename}:${String(key || "default")}`;
          ownedPauseKeys.delete(fullKey);
          setGamePaused(fullKey, false);
        },
        stopMovement() {
          handlePressEnd();
          hasTarget = false;
          clickRippleTime = 0;
          keys.clear();
          alien.vx = 0;
          alien.vy = 0;
        },
        isPaused() { return isGamePaused(); },
        saveNow() { saveCurrentSlot(true); },
        refreshRemote(opts = null) {
          const force = Boolean(opts && typeof opts === "object" && opts.force);
          return hotRefreshRemoteData(force, opts);
        },
        registerElements(list) {
          const cleanList = Array.isArray(list)
            ? list.map(sanitizeExtensionElement).filter(Boolean)
            : [];
          const hadEntry = extensionElementsByFile.has(extKey);
          if (cleanList.length === 0) {
            if (extensionElementsByFile.delete(extKey)) {
              scheduleElementsRefresh({ pruneState: false, refreshChunks: true });
            }
            return 0;
          }
          extensionElementsByFile.set(extKey, cleanList);
          if (!knownExtensionElementIdsByExt.has(extKey)) {
            knownExtensionElementIdsByExt.set(extKey, new Set());
          }
          const knownSet = knownExtensionElementIdsByExt.get(extKey);
          for (const el of cleanList) knownSet.add(el.id);
          if (!hadEntry) {
            registerCleanup(() => {
              if (extensionElementsByFile.delete(extKey)) {
                scheduleElementsRefresh({ pruneState: false, refreshChunks: true });
              }
            });
          }
          scheduleElementsRefresh({ pruneState: false, refreshChunks: true });
          return cleanList.length;
        },
        unregisterElements() {
          if (extensionElementsByFile.delete(extKey)) {
            scheduleElementsRefresh({ pruneState: false, refreshChunks: true });
          }
        },
      },
    };
    return { scopedHost, cleanups, lifecycleState };
  }

  // Pont postMessage (fallback lorsque index.html est ouvert en file:// et que fetch() est bloqué)
  const iframeBridgeHosts = new Map(); // filename -> scopedHost
  window.addEventListener("message", (ev) => {
    const msg = ev.data;
    if (!msg || typeof msg !== "object" || msg.channel !== "assemblage_ext") return;
    const fname = String(msg.filename || "");
    const host = iframeBridgeHosts.get(fname);
    if (!host) return;
    if (msg.cmd === "toast") host.ui.showToast(msg.text || "");
    else if (msg.cmd === "modal") {
      const opts = Object.assign({}, msg.opts || {});
      opts.onMount = (bodyEl) => {
        bodyEl.querySelectorAll("[data-ext-click]").forEach((el) => {
          el.addEventListener("click", () => {
            const rec = activeExtensions.get(fname);
            if (rec && rec.iframe && rec.iframe.contentWindow) {
              rec.iframe.contentWindow.postMessage({
                channel: "assemblage_host",
                event: "modal_click",
                action: String(el.dataset.extClick || ""),
                value: String(el.dataset.extValue || ""),
              }, "*");
            }
          });
        });
      };
      host.ui.showModal(opts);
    } else if (msg.cmd === "inject_style") {
      const cssText = String(msg.css || "");
      if (cssText) {
        const stId = `ext-iframe-style-${fname.replace(/[^a-z0-9]/gi, "_")}`;
        const prev = document.getElementById(stId);
        if (prev) prev.remove();
        const st = document.createElement("style");
        st.id = stId;
        st.dataset.extFile = fname;
        st.textContent = cssText;
        document.head.appendChild(st);
      }
    } else if (msg.cmd === "state_set") host.state.set(msg.patch || {}, true);
    else if (msg.cmd === "register_elements") host.game.registerElements(Array.isArray(msg.elements) ? msg.elements : []);
    else if (msg.cmd === "unregister_elements") host.game.unregisterElements();
    else if (msg.cmd === "add_element_action") {
      const actionId = String(msg.id || fname);
      host.ui.addElementAction({
        id: actionId,
        elementId: String(msg.elementId || ""),
        buttonText: msg.buttonText || "Ouvrir l'élément",
        icon: msg.icon || "",
        accentColor: msg.accentColor || "",
        onClick: (el) => {
          const rec = activeExtensions.get(fname);
          if (rec && rec.iframe && rec.iframe.contentWindow) {
            rec.iframe.contentWindow.postMessage({
              channel: "assemblage_host",
              event: "element_action_click",
              id: actionId,
              elementId: el ? el.id : "",
            }, "*");
          }
        },
      });
    } else if (msg.cmd === "set_alien_color_map") {
      if (host._alienColorMapUnhook) { host._alienColorMapUnhook(); host._alienColorMapUnhook = null; }
      const colorMap = (msg.colorMap && typeof msg.colorMap === "object") ? msg.colorMap : null;
      if (colorMap && Object.keys(colorMap).length > 0) {
        if (!ctx.__assemblageColorHooked) {
          const proto = Object.getPrototypeOf(ctx);
          const fillDesc = Object.getOwnPropertyDescriptor(proto, "fillStyle");
          const strokeDesc = Object.getOwnPropertyDescriptor(proto, "strokeStyle");
          if (fillDesc && fillDesc.set && strokeDesc && strokeDesc.set) {
            ctx.__assemblageColorMapper = null;
            ctx.__assemblageColorHooked = true;
            Object.defineProperty(ctx, "fillStyle", {
              configurable: true,
              get() { return fillDesc.get.call(this); },
              set(val) { fillDesc.set.call(this, this.__assemblageColorMapper ? this.__assemblageColorMapper(val) : val); },
            });
            Object.defineProperty(ctx, "strokeStyle", {
              configurable: true,
              get() { return strokeDesc.get.call(this); },
              set(val) { strokeDesc.set.call(this, this.__assemblageColorMapper ? this.__assemblageColorMapper(val) : val); },
            });
          }
        }
        host._alienColorMapUnhook = host.hooks.wrap("drawAlien", (orig, t) => {
          const prevMapper = ctx.__assemblageColorMapper;
          ctx.__assemblageColorMapper = (value) => {
            const mapped = (typeof value === "string" && Object.prototype.hasOwnProperty.call(colorMap, value))
              ? colorMap[value]
              : value;
            return prevMapper ? prevMapper(mapped) : mapped;
          };
          try {
            return orig(t);
          } finally {
            ctx.__assemblageColorMapper = prevMapper;
          }
        });
      }
    } else if (msg.cmd === "add_setting_toggle") {
      const toggleId = String(msg.id || fname);
      host.ui.addSettingToggle({
        id: toggleId,
        label: msg.label,
        desc: msg.desc,
        checked: Boolean(msg.checked),
        onChange: (val) => {
          const rec = activeExtensions.get(fname);
          if (rec && rec.iframe && rec.iframe.contentWindow) {
            rec.iframe.contentWindow.postMessage({ channel: "assemblage_host", event: "toggle_change", id: toggleId, value: val }, "*");
          }
        },
      });
    } else if (msg.cmd === "add_setting_button") {
      const btnId = String(msg.id || fname);
      host.ui.addSettingButton({
        id: btnId,
        label: msg.label,
        desc: msg.desc,
        buttonText: msg.buttonText || "Ouvrir",
        onClick: () => {
          const rec = activeExtensions.get(fname);
          if (rec && rec.iframe && rec.iframe.contentWindow) {
            rec.iframe.contentWindow.postMessage({ channel: "assemblage_host", event: "button_click", id: btnId }, "*");
          }
        },
      });
    } else if (msg.cmd === "set_alien_filter") {
      const filterStr = String(msg.filter || "none").trim();
      if (host._alienFilterUnhook) { host._alienFilterUnhook(); host._alienFilterUnhook = null; }
      if (filterStr && filterStr !== "none") {
        // Optimisation : pour un filtre grayscale/contrast, remapper fillStyle/strokeStyle en JS
        // au lieu d'utiliser ctx.filter (très lent sur Canvas2D à chaque primitive).
        const isSimpleGrayscale = /^(?:\s*(?:grayscale\([^)]*\)|contrast\([^)]*\))\s*)+$/i.test(filterStr) && /grayscale\(/i.test(filterStr);
        if (isSimpleGrayscale) {
          const contrastMatch = /contrast\(\s*([\d.]+)(%?)\s*\)/i.exec(filterStr);
          let contrast = 1;
          if (contrastMatch) {
            contrast = Number(contrastMatch[1]);
            if (contrastMatch[2] === "%") contrast /= 100;
          }
          const cache = new Map();
          const toGray = (value) => {
            if (typeof value !== "string") return value;
            const hit = cache.get(value);
            if (hit !== undefined) return hit;
            const s = value.trim();
            let rgba = null;
            if (s.charCodeAt(0) === 35) {
              const hex = s.slice(1);
              if (hex.length === 3 || hex.length === 4) {
                rgba = [
                  parseInt(hex[0] + hex[0], 16),
                  parseInt(hex[1] + hex[1], 16),
                  parseInt(hex[2] + hex[2], 16),
                  hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1,
                ];
              } else if (hex.length === 6 || hex.length === 8) {
                rgba = [
                  parseInt(hex.slice(0, 2), 16),
                  parseInt(hex.slice(2, 4), 16),
                  parseInt(hex.slice(4, 6), 16),
                  hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
                ];
              }
            } else {
              const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(s);
              if (m) rgba = [Number(m[1]), Number(m[2]), Number(m[3]), m[4] !== undefined ? Number(m[4]) : 1];
            }
            if (!rgba) { cache.set(value, value); return value; }
            let lum = 0.2126 * rgba[0] + 0.7152 * rgba[1] + 0.0722 * rgba[2];
            lum = Math.max(0, Math.min(255, Math.round((lum - 128) * contrast + 128)));
            const out = rgba[3] >= 0.999 ? `rgb(${lum},${lum},${lum})` : `rgba(${lum},${lum},${lum},${rgba[3]})`;
            cache.set(value, out);
            return out;
          };
          if (!ctx.__assemblageColorHooked) {
            const proto = Object.getPrototypeOf(ctx);
            const fillDesc = Object.getOwnPropertyDescriptor(proto, "fillStyle");
            const strokeDesc = Object.getOwnPropertyDescriptor(proto, "strokeStyle");
            if (fillDesc && fillDesc.set && strokeDesc && strokeDesc.set) {
              ctx.__assemblageColorMapper = null;
              ctx.__assemblageColorHooked = true;
              Object.defineProperty(ctx, "fillStyle", {
                configurable: true,
                get() { return fillDesc.get.call(this); },
                set(v) { const fn = this.__assemblageColorMapper; fillDesc.set.call(this, fn ? fn(v) : v); },
              });
              Object.defineProperty(ctx, "strokeStyle", {
                configurable: true,
                get() { return strokeDesc.get.call(this); },
                set(v) { const fn = this.__assemblageColorMapper; strokeDesc.set.call(this, fn ? fn(v) : v); },
              });
            }
          }
          host._alienFilterUnhook = host.hooks.wrap("drawAlien", (orig, t) => {
            const prevMapper = ctx.__assemblageColorMapper;
            ctx.__assemblageColorMapper = (value) => toGray(prevMapper ? prevMapper(value) : value);
            try {
              return orig(t);
            } finally {
              ctx.__assemblageColorMapper = prevMapper;
            }
          });
        } else {
          host._alienFilterUnhook = host.hooks.wrap("drawAlien", (orig, t) => {
            ctx.save();
            ctx.filter = filterStr;
            orig(t);
            ctx.restore();
          });
        }
      }
    }
  });

  function finalizeDeactivateExtension(extKey) {
    const rec = activeExtensions.get(extKey);
    if (!rec) return;
    const fname = String(rec.extDef?.filename || extKey);
    const mod = window.AssemblageExtensions[fname];
    if (mod && typeof mod.onDeactivate === "function") {
      try { mod.onDeactivate(rec.scopedHost, rec.extDef); } catch (e) { console.error(e); }
    }
    for (const fn of rec.cleanups) {
      try { fn(); } catch (e) { console.error(e); }
    }
    const stillUsesFile = Array.from(activeExtensions.entries()).some(([k, r]) => k !== extKey && String(r.extDef?.filename || k) === fname);
    if (!stillUsesFile) {
      document.querySelectorAll(`style[data-ext-file="${fname}"]`).forEach(el => el.remove());
    }
    if (rec.iframe) rec.iframe.remove();
    iframeBridgeHosts.delete(extKey);
    activeExtensions.delete(extKey);
  }

  function deactivateExtension(extKey, opts = null) {
    const rec = activeExtensions.get(extKey);
    if (!rec) return;
    const immediate = Boolean(opts && opts.immediate);
    const ls = rec.lifecycleState;
    if (!immediate && ls && ls.outDuration > 0 && ls.alpha > 0.001) {
      ls.deactivating = true;
      return;
    }
    finalizeDeactivateExtension(extKey);
  }

  function updateExtensionLifecycles(dt) {
    if (activeExtensions.size === 0) return;
    const safeDt = Math.max(0, Number(dt) || 0);
    const toFinalize = [];
    for (const [extKey, rec] of activeExtensions.entries()) {
      const ls = rec && rec.lifecycleState;
      if (!ls) continue;
      if (ls.deactivating) {
        if (ls.outDuration > 0) {
          ls.alpha = Math.max(0, ls.alpha - safeDt / ls.outDuration);
        } else {
          ls.alpha = 0;
        }
        if (ls.alpha <= 0.001) {
          ls.alpha = 0;
          toFinalize.push(extKey);
        }
      } else if (ls.alpha < 1) {
        if (ls.inDuration > 0) {
          ls.alpha = Math.min(1, ls.alpha + safeDt / ls.inDuration);
        } else {
          ls.alpha = 1;
        }
      }
    }
    for (const extKey of toFinalize) {
      finalizeDeactivateExtension(extKey);
    }
  }

  function deactivateAllExtensions() {
    extSlotGeneration++;
    for (const k of Array.from(activeExtensions.keys())) {
      deactivateExtension(k, { immediate: true });
    }
  }

  async function loadAndActivateExtension(extDef, isFreshUnlock, forceReload = false, isSilentRestore = false) {
    const filename = String(extDef?.filename || "");
    const extKey = getExtKey(extDef);
    if (!filename || !extKey || activeExtensions.has(extKey) || loadingExtensions.has(extKey)) return;
    loadingExtensions.add(extKey);
    const gen = extSlotGeneration;

    const { scopedHost, cleanups, lifecycleState } = createScopedHost(extKey, extDef);
    const url = `${ASSET_BASE}extensions/${encodeURIComponent(filename)}`;
    const baseDir = `${ASSET_BASE}extensions/`;
    const isHttp = (window.location.protocol === "http:" || window.location.protocol === "https:");
    const fetchUrl = isHttp ? `${url}?_ts=${Date.now()}` : url;

    const injectCachedStyles = () => {
      const styles = loadedExtensionStyles.get(filename);
      if (!Array.isArray(styles) || styles.length === 0) return;
      document.querySelectorAll(`style[data-ext-file="${filename}"]`).forEach(el => el.remove());
      for (const cssText of styles) {
        const clone = document.createElement("style");
        clone.dataset.extFile = filename;
        clone.textContent = cssText;
        document.head.appendChild(clone);
      }
    };

    const finishActivateModule = (mod) => {
      if (gen !== extSlotGeneration) return;
      const st = getExtensionStateRecord(extKey);
      if (st.permanently_disabled || evaluateDeactivateCondition(extDef)) return;
      injectCachedStyles();
      activeExtensions.set(extKey, { cleanups, iframe: null, scopedHost, extDef, lifecycleState });
      if (mod && typeof mod.onActivate === "function") {
        try {
          mod.onActivate(scopedHost, Object.assign({}, extDef, { id: extKey, isFreshUnlock, isSilentRestore }));
        } catch (err) {
          console.error(`[Extension ${extKey}] onActivate error:`, err);
        }
      }
    };

    try {
      // Si déjà chargé dans le registre global (sauf si rechargement forcé à chaud)
      if (!forceReload && window.AssemblageExtensions[filename]) {
        finishActivateModule(window.AssemblageExtensions[filename]);
        loadingExtensions.delete(extKey);
        return;
      }

      const resp = await fetch(fetchUrl, { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const htmlText = await resp.text();
      if (gen !== extSlotGeneration) return;
      const doc = new DOMParser().parseFromString(htmlText, "text/html");

      const extractedStyles = [];
      doc.querySelectorAll("style").forEach(st => {
        if (st.textContent) extractedStyles.push(st.textContent);
      });
      loadedExtensionStyles.set(filename, extractedStyles);

      const depUrls = [];
      let combinedSource = htmlText;
      const scripts = Array.from(doc.querySelectorAll("script"));
      const scriptBodies = [];
      for (const sc of scripts) {
        const stype = String(sc.getAttribute("type") || "").trim().toLowerCase();
        if (sc.hasAttribute("data-assemblage-ui-schema") || (stype && stype !== "text/javascript" && stype !== "application/javascript")) {
          continue;
        }
        const srcAttr = sc.getAttribute("src");
        if (srcAttr) {
          const depUrl = resolveBiomeRelativeUrl(baseDir, srcAttr);
          if (!depUrl) continue;
          const depFetchUrl = isHttp ? `${depUrl}?_ts=${Date.now()}` : depUrl;
          const depResp = await fetch(depFetchUrl, { cache: "no-store" });
          if (!depResp.ok) throw new Error(`HTTP ${depResp.status} (${depUrl})`);
          const depCode = await depResp.text();
          if (gen !== extSlotGeneration) return;
          depUrls.push(depUrl);
          combinedSource += "\n/*DEP:" + depUrl + "*/\n" + depCode;
          if (depCode.trim()) scriptBodies.push(depCode);
        } else if (sc.textContent && sc.textContent.trim()) {
          scriptBodies.push(sc.textContent);
        }
      }
      loadedExtensionDeps.set(filename, depUrls);
      loadedExtensionHtmlHash.set(filename, hashExtensionHtml(combinedSource));
      for (const code of scriptBodies) {
        const fn = new Function("host", "ext", code);
        fn(scopedHost, extDef);
      }
      finishActivateModule(window.AssemblageExtensions[filename] || null);
    } catch (_fetchErr) {
      if (gen !== extSlotGeneration) return;
      const st = getExtensionStateRecord(extKey);
      if (st.permanently_disabled || evaluateDeactivateCondition(extDef)) return;
      // Fallback file:// via iframe + postMessage
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.dataset.extFile = filename;
      iframe.src = url;
      iframeBridgeHosts.set(extKey, scopedHost);
      activeExtensions.set(extKey, { cleanups, iframe, scopedHost, extDef, lifecycleState });
      iframe.addEventListener("load", () => {
        try {
          iframe.contentWindow.postMessage({
            channel: "assemblage_host",
            event: "init",
            ext: Object.assign({}, extDef, { id: extKey, isFreshUnlock, isSilentRestore }),
            state: scopedHost.state.get(),
          }, "*");
        } catch (e) { console.error(e); }
      });
      document.body.appendChild(iframe);
    } finally {
      loadingExtensions.delete(extKey);
    }
  }

  function evaluateSingleConditionRaw(cond, defaultType = "always") {
    const c = (cond && typeof cond === "object") ? cond : {};
    const ctype = String(c.type || defaultType);
    const cnt = Math.max(0, Number(c.count || 0));
    if (ctype === "none") return false;
    if (ctype === "always") return true;
    if (ctype === "crafted_element") {
      const eid = String(c.elementId || "");
      return Boolean(eid) && discovered.has(eid);
    }
    if (ctype === "element_count") {
      const eid = String(c.elementId || "");
      return Boolean(eid) && getQty(eid) >= Math.max(1, cnt);
    }
    if (ctype === "element_count_below") {
      const eid = String(c.elementId || "");
      return Boolean(eid) && getQty(eid) < Math.max(1, cnt);
    }
    if (ctype === "discovered_count") {
      return discovered.size >= Math.max(1, cnt);
    }
    if (ctype === "tag_discovered_count") {
      const tid = String(c.tagId || "");
      if (!tid) return false;
      let n = 0;
      for (const el of elementsList) {
        if (discovered.has(el.id) && itemMatchesTag(el, tid)) n++;
      }
      return n >= Math.max(1, cnt);
    }
    if (ctype === "tag_element_count") {
      const tid = String(c.tagId || "");
      if (!tid) return false;
      let total = 0;
      for (const el of elementsList) {
        if (itemMatchesTag(el, tid)) total += getQty(el.id);
      }
      return total >= Math.max(1, cnt);
    }
    if (ctype === "distance_traveled") {
      return Math.floor(alien.distance / 18) >= Math.max(1, cnt);
    }
    if (ctype === "anchor_near") {
      const aid = String(c.anchorId || "");
      const distM = getDistanceToAnchorMeters(aid);
      return distM !== null && distM <= Math.max(1, cnt);
    }
    if (ctype === "anchor_far") {
      const aid = String(c.anchorId || "");
      const distM = getDistanceToAnchorMeters(aid);
      return distM !== null && distM >= Math.max(1, cnt);
    }
    if (ctype === "anchor_tag_near") {
      const tid = String(c.tagId || "");
      if (!tid) return false;
      const maxM = Math.max(1, cnt);
      for (const a of hostTagsApi.getAnchorsByTag(tid)) {
        const d = getDistanceToAnchorMeters(a.id);
        if (d !== null && d <= maxM) return true;
      }
      return false;
    }
    if (ctype === "anchor_tag_far") {
      const tid = String(c.tagId || "");
      if (!tid) return false;
      const minM = Math.max(1, cnt);
      const list = hostTagsApi.getAnchorsByTag(tid);
      if (!list.length) return false;
      return list.every((a) => {
        const d = getDistanceToAnchorMeters(a.id);
        return d === null || d >= minM;
      });
    }
    if (ctype === "biome_visited") {
      const bid = String(c.biomeId || "");
      return Boolean(bid) && activeBiomeId === bid;
    }
    if (ctype === "biome_tag_active") {
      const tid = String(c.tagId || "");
      if (!tid) return false;
      const curB = (Array.isArray(GAME_CONFIG?.biomes) ? GAME_CONFIG.biomes : []).find((b) => b && b.id === activeBiomeId);
      return Boolean(curB && itemMatchesTag(curB, tid));
    }
    if (ctype === "actor_near") {
      const ref = String(c.actorId || "").trim() || String(c.tagId || "").trim();
      if (!ref) return false;
      const maxPx = Math.max(1, cnt) * 18;
      for (const ent of worldEntitiesMap.values()) {
        if (ent.dead) continue;
        const match = (ent.actorId && ent.actorId === ref) || itemMatchesTag(ent, ref);
        if (match && Math.hypot(ent.x - alien.x, ent.y - alien.y) <= maxPx) return true;
      }
      if (hostActorsApi && typeof hostActorsApi.getLiveCreatures === "function") {
        for (const cr of hostActorsApi.getLiveCreatures()) {
          if (!cr || cr.isWorldEntity) continue;
          const arch = cr.actorId ? hostActorsApi.get(cr.actorId) : null;
          const match = (cr.actorId && cr.actorId === ref) || (cr.kind && cr.kind === ref) || (arch && itemMatchesTag(arch, ref));
          if (match && Math.hypot(cr.x - alien.x, cr.y - alien.y) <= maxPx) return true;
        }
      }
      return false;
    }
    if (ctype === "actor_killed_count") {
      const ref = String(c.actorId || "").trim() || String(c.tagId || "").trim();
      if (!ref) return false;
      return hostActorsApi.getKilledCount(ref) >= Math.max(1, cnt);
    }
    if (ctype === "play_time") {
      return playTimeSec >= Math.max(1, cnt);
    }
    if (ctype === "extension_unlocked") {
      const req = String(c.requiredExtension || "");
      if (!req) return false;
      const reqDef = getExtensionsByFilenameMap().get(req);
      if (!reqDef || reqDef.enabled === false) return false;
      const st = extensionStates.get(getExtKey(reqDef)) || extensionStates.get(req);
      return Boolean(st && st.unlocked);
    }
    if (ctype === "minigd_won") {
      const mid = String(c.minigdId || "").trim();
      if (!mid) return false;
      const res = hostProgressApi.getMiniGDResult(mid);
      return Boolean(res && Number(res.wins || 0) >= Math.max(1, cnt));
    }
    if (ctype === "minigd_score") {
      const mid = String(c.minigdId || "").trim();
      if (!mid) return false;
      const res = hostProgressApi.getMiniGDResult(mid);
      return Boolean(res && Number(res.bestScore || 0) >= Math.max(1, cnt));
    }
    if (ctype === "flag_set") {
      const fk = String(c.flagKey || "").trim();
      return Boolean(fk) && Boolean(hostProgressApi.getFlag(fk, false));
    }
    if (ctype === "stat_gte") {
      const fk = String(c.flagKey || "").trim();
      return Boolean(fk) && hostProgressApi.getStat(fk) >= Math.max(1, cnt);
    }
    if (ctype === "custom_expr") {
      const expr = String(c.expression || "").trim();
      if (!expr) return false;
      if (!customExprCache.has(expr)) {
        try {
          customExprCache.set(expr, new Function(
            "discovered", "inventory", "getQty", "alien", "activeBiomeId", "playTimeSec", "isUnlocked", "anchors", "getAnchorDist", "progress", "tags",
            `return Boolean(${expr});`
          ));
        } catch (err) {
          console.error("[Extension custom_expr compile error]", expr, err);
          customExprCache.set(expr, null);
        }
      }
      const fn = customExprCache.get(expr);
      if (!fn) return false;
      try {
        return Boolean(fn(
          discovered,
          inventory,
          getQty,
          alien,
          activeBiomeId,
          playTimeSec,
          isExtensionUnlockedFn,
          resolvedAnchorsById,
          getDistanceToAnchorMeters,
          hostProgressApi,
          hostTagsApi
        ));
      } catch (_e) {
        return false;
      }
    }
    return false;
  }

  function evaluateSingleCondition(cond, defaultType = "always") {
    const raw = evaluateSingleConditionRaw(cond, defaultType);
    return (cond && cond.negate) ? !raw : raw;
  }

  // Conditions multiples : une condition principale + des conditions supplémentaires
  // (cond.extra = [...]) combinées selon cond.logic ("and" = toutes, "or" = au moins une).
  function getExtraConditions(cond) {
    if (!cond || typeof cond !== "object" || !Array.isArray(cond.extra)) return [];
    return cond.extra.filter((e) => e && typeof e === "object");
  }

  function combineWithExtraConditions(primaryResult, cond) {
    const extras = getExtraConditions(cond);
    if (!extras.length) return Boolean(primaryResult);
    if (String(cond.logic || "and") === "or") {
      return Boolean(primaryResult) || extras.some((e) => evaluateSingleCondition(e, "none"));
    }
    return Boolean(primaryResult) && extras.every((e) => evaluateSingleCondition(e, "none"));
  }

  function conditionUsesType(cond, types) {
    if (!cond || typeof cond !== "object") return false;
    if (types.includes(String(cond.type || ""))) return true;
    return getExtraConditions(cond).some((e) => types.includes(String(e.type || "")));
  }

  function serializeConditionForSig(c, defaultType) {
    return {
      type: String(c.type || defaultType),
      elementId: String(c.elementId || ""),
      biomeId: String(c.biomeId || ""),
      anchorId: String(c.anchorId || ""),
      minigdId: String(c.minigdId || ""),
      flagKey: String(c.flagKey || ""),
      tagId: String(c.tagId || ""),
      negate: Boolean(c.negate),
      count: Math.max(0, Number(c.count || 0)),
      requiredExtension: String(c.requiredExtension || ""),
      expression: String(c.expression || ""),
    };
  }

  function evaluateExtensionCondition(extDef) {
    if (!extDef || extDef.enabled === false) return false;
    return combineWithExtraConditions(evaluateSingleCondition(extDef.condition, "always"), extDef.condition);
  }

  function evaluateDeactivateCondition(extDef) {
    if (!extDef || extDef.enabled === false) return false;
    const deact = extDef.deactivateCondition;
    if (!deact || typeof deact !== "object") return false;
    const dtype = String(deact.type || "none");
    if (dtype === "none") return false;
    if (dtype === "condition_not_met") return combineWithExtraConditions(!evaluateExtensionCondition(extDef), deact);
    return combineWithExtraConditions(evaluateSingleCondition(deact, "none"), deact);
  }

  function getExtensionConditionSignature(extDef) {
    const c = (extDef && extDef.condition && typeof extDef.condition === "object") ? extDef.condition : {};
    const sig = serializeConditionForSig(c, "always");
    const extras = getExtraConditions(c);
    if (extras.length) {
      sig.logic = String(c.logic || "and") === "or" ? "or" : "and";
      sig.extra = extras.map((e) => serializeConditionForSig(e, "none"));
    }
    return JSON.stringify(sig);
  }

  function getExtensionDeactivateSignature(extDef) {
    const d = (extDef && extDef.deactivateCondition && typeof extDef.deactivateCondition === "object") ? extDef.deactivateCondition : {};
    const sig = serializeConditionForSig(d, "none");
    sig.permanent = Boolean(d.permanent);
    const extras = getExtraConditions(d);
    if (extras.length) {
      sig.logic = String(d.logic || "and") === "or" ? "or" : "and";
      sig.extra = extras.map((e) => serializeConditionForSig(e, "none"));
    }
    return JSON.stringify(sig);
  }

  function revokeChangedExtensions(prevCondSigs = null, prevDeactSigs = null) {
    const list = Array.isArray(EXTENSIONS_DATA?.extensions) ? EXTENSIONS_DATA.extensions : [];
    let revokedAny = false;

    for (const extDef of list) {
      const extKey = getExtKey(extDef);
      if (!extKey || extDef.enabled === false) continue;
      const rec = extensionStates.get(extKey);
      if (!rec) continue;

      // Si la condition de désactivation a été modifiée ou retirée, réinitialise le verrouillage définitif
      if (rec.permanently_disabled) {
        const newDeactSig = getExtensionDeactivateSignature(extDef);
        const knownDeactSig = String(rec.deactivate_sig || (prevDeactSigs ? prevDeactSigs.get(extKey) : "") || "");
        if (knownDeactSig && knownDeactSig !== newDeactSig) {
          const isStillPermanent = Boolean(extDef.deactivateCondition?.permanent) && String(extDef.deactivateCondition?.type || "none") !== "none";
          if (!isStillPermanent || !evaluateDeactivateCondition(extDef)) {
            rec.permanently_disabled = false;
            rec.deactivate_sig = newDeactSig;
            revokedAny = true;
          }
        } else if (!rec.deactivate_sig) {
          rec.deactivate_sig = newDeactSig;
        }
      }

      if (!rec.unlocked) continue;
      const newSig = getExtensionConditionSignature(extDef);
      const knownSig = String(rec.condition_sig || (prevCondSigs ? prevCondSigs.get(extKey) : "") || "");
      if (knownSig && knownSig !== newSig) {
        if (!evaluateExtensionCondition(extDef)) {
          deactivateExtension(extKey, { immediate: true });
          rec.unlocked = false;
          rec.unlocked_at = "";
          rec.condition_sig = "";
          rec.permanently_disabled = false;
          rec.deactivate_sig = "";
          revokedAny = true;
        } else {
          rec.condition_sig = newSig;
        }
      } else if (!rec.condition_sig) {
        rec.condition_sig = newSig;
      }
    }

    // Propagation en cascade si une extension dépendait d'une extension re-verrouillée ou désactivée
    let changed = true;
    while (changed) {
      changed = false;
      for (const extDef of list) {
        const extKey = getExtKey(extDef);
        if (!extKey || extDef.enabled === false) continue;
        const rec = extensionStates.get(extKey);
        if (!rec || !rec.unlocked) continue;
        const cond = extDef?.condition;
        if (conditionUsesType(cond, ["extension_unlocked"]) || (revokedAny && conditionUsesType(cond, ["custom_expr"]))) {
          if (!evaluateExtensionCondition(extDef)) {
            deactivateExtension(extKey, { immediate: true });
            rec.unlocked = false;
            rec.unlocked_at = "";
            rec.condition_sig = "";
            rec.permanently_disabled = false;
            rec.deactivate_sig = "";
            revokedAny = true;
            changed = true;
          }
        }
      }
    }

    return revokedAny;
  }

  function unlockExtensionByFilename(targetFilename, announce = true) {
    const target = String(targetFilename || "");
    const extDef = getExtensionsByFilenameMap().get(target);
    if (!extDef || extDef.enabled === false) return false;
    const extKey = getExtKey(extDef);
    const rec = getExtensionStateRecord(extKey);
    if (rec.permanently_disabled || evaluateDeactivateCondition(extDef)) return false;
    rec.manually_locked = false;
    if (rec.unlocked) {
      if (!rec.condition_sig) rec.condition_sig = getExtensionConditionSignature(extDef);
      const activeRec = activeExtensions.get(extKey);
      if (rec.enabled) {
        if (activeRec && activeRec.lifecycleState?.deactivating) {
          activeRec.lifecycleState.deactivating = false;
        } else if (!activeRec) {
          loadAndActivateExtension(extDef, false, false, false);
        }
      }
      return false;
    }
    rec.unlocked = true;
    rec.enabled = true;
    rec.unlocked_at = new Date().toISOString();
    rec.condition_sig = getExtensionConditionSignature(extDef);
    if (announce) {
      const mode = String(extDef.announcementMode || "title_card");
      if (mode === "title_card") {
        queueTitleCard(buildExtTitleCardOptions(extDef));
      } else if (mode === "toast") {
        showToast(buildExtToastMessage(extDef));
      }
    }
    loadAndActivateExtension(extDef, announce, false, !announce);
    emitHostEvent("extension:unlocked", { filename: target, extKey });
    saveCurrentSlot(true);
    return true;
  }

  function lockExtensionByFilename(targetFilename, announce = false, permanent = false) {
    const target = String(targetFilename || "");
    const extDef = getExtensionsByFilenameMap().get(target);
    if (!extDef) return false;
    const extKey = getExtKey(extDef);
    const rec = getExtensionStateRecord(extKey);
    const wasActive = activeExtensions.has(extKey);
    const wasUnlocked = Boolean(rec.unlocked);
    const wasManuallyLocked = Boolean(rec.manually_locked);
    const wasPermDisabled = Boolean(rec.permanently_disabled);
    if (wasActive) deactivateExtension(extKey, { immediate: true });
    rec.unlocked = false;
    rec.enabled = false;
    rec.manually_locked = true;
    if (permanent) rec.permanently_disabled = true;
    const changed = wasActive || wasUnlocked || !wasManuallyLocked || (permanent && !wasPermDisabled);
    if (announce && (wasActive || wasUnlocked)) {
      showToast(`🛑 Extension verrouillée : ${extDef.name || target}`);
    }
    if (changed) {
      emitHostEvent("extension:locked", { filename: target, extKey, permanent: Boolean(permanent) });
      saveCurrentSlot(true);
    }
    return wasActive || wasUnlocked;
  }

  function unlockBiomeById(biomeId, announce = true) {
    const bid = String(biomeId || "").trim();
    if (!bid) return false;
    const b = BIOMES.find((x) => x && x.id === bid);
    if (!b) return false;
    const wasLocked = isBiomeLocked(b);
    lockedBiomes.delete(b.id);
    unlockedBiomes.add(b.id);
    if (!wasLocked) return false;
    emitHostEvent("biome:unlocked", { biomeId: b.id, biome: b });
    if (announce) {
      showToast(`🌍 Nouveau biome débloqué : ${formatBiomeInlineHtml(b, 20)} !`, { html: true });
    }
    if (uiOpen && shipViewMode === "biomes") renderBiomesView();
    saveCurrentSlot(true);
    return true;
  }

  function lockBiomeById(biomeId, announce = false) {
    const bid = String(biomeId || "").trim();
    if (!bid) return false;
    const b = BIOMES.find((x) => x && x.id === bid);
    if (!b) return false;
    const wasLocked = isBiomeLocked(b);
    unlockedBiomes.delete(b.id);
    lockedBiomes.add(b.id);
    if (wasLocked) return false;
    emitHostEvent("biome:locked", { biomeId: b.id, biome: b });
    if (announce) {
      showToast(`🔒 Biome verrouillé : ${formatBiomeInlineHtml(b, 20)}`, { html: true });
    }
    if (uiOpen && shipViewMode === "biomes") renderBiomesView();
    saveCurrentSlot(true);
    return true;
  }

  function isBiomeLocked(b) {
    if (!b || !b.id) return false;
    if (lockedBiomes.has(b.id)) return true;
    if (!b.locked) return false;
    if (unlockedBiomes.has(b.id)) return false;
    const uc = b.unlockCondition;
    if (uc && typeof uc === "object" && uc.type && uc.type !== "none") {
      if (combineWithExtraConditions(evaluateSingleCondition(uc, "none"), uc)) {
        unlockedBiomes.add(b.id);
        return false;
      }
    }
    return true;
  }

  function syncUnlockedBiomes(silentRestore = false) {
    let unlockedAny = false;
    for (const b of BIOMES) {
      if (!b || !b.id || !b.locked || unlockedBiomes.has(b.id)) continue;
      const uc = b.unlockCondition;
      if (!uc || typeof uc !== "object" || !uc.type || uc.type === "none") continue;
      if (combineWithExtraConditions(evaluateSingleCondition(uc, "none"), uc)) {
        unlockedBiomes.add(b.id);
        unlockedAny = true;
        if (!silentRestore) {
          showToast(`🌍 Nouveau biome débloqué : ${formatBiomeInlineHtml(b, 20)} !`, { html: true });
        }
      }
    }
    if (unlockedAny) {
      if (uiOpen && shipViewMode === "biomes") renderBiomesView();
      saveCurrentSlot(true);
    }
    return unlockedAny;
  }

  function syncUnlockedExtensions(silentRestore = false) {
    syncUnlockedBiomes(silentRestore);
    const rawList = Array.isArray(EXTENSIONS_DATA?.extensions) ? EXTENSIONS_DATA.extensions : [];
    const list = rawList.slice().sort((a, b) => Number(a?.priority || 0) - Number(b?.priority || 0));
    const toLoad = [];
    const plannedLoadKeys = new Set();
    const freshTitleCards = [];
    const freshToasts = [];
    const freshDeactTitleCards = [];
    const freshDeactToasts = [];
    let anyStateChange = false;
    if (silentRestore && revokeChangedExtensions(null, null)) {
      anyStateChange = true;
    }
    for (const extDef of list) {
      const fname = String(extDef?.filename || "");
      const extKey = getExtKey(extDef);
      if (!fname || !extKey || extDef.enabled === false) continue;
      if (Array.isArray(extDef.requires) && extDef.requires.length > 0) {
        const missingReq = extDef.requires.some((r) => !isExtensionUnlockedFn(r));
        if (missingReq) continue;
      }
      if (Array.isArray(extDef.conflictsWith) && extDef.conflictsWith.length > 0) {
        const extMap = getExtensionsByFilenameMap();
        const hasConflict = extDef.conflictsWith.some((c) => {
          const cStr = String(c || "").trim();
          if (!cStr) return false;
          const cDef = extMap.get(cStr);
          const cKey = cDef ? getExtKey(cDef) : cStr;
          return activeExtensions.has(cKey) || plannedLoadKeys.has(cKey);
        });
        if (hasConflict) {
          if (activeExtensions.has(extKey)) deactivateExtension(extKey, { immediate: true });
          continue;
        }
      }
      const rec = extensionStates.get(extKey);

      if (rec && (rec.permanently_disabled || rec.manually_locked)) {
        if (activeExtensions.has(extKey)) deactivateExtension(extKey, { immediate: true });
        continue;
      }

      if (rec && rec.unlocked) {
        const shouldDeactivate = evaluateDeactivateCondition(extDef);
        if (shouldDeactivate) {
          const activeRec = activeExtensions.get(extKey);
          const wasActive = Boolean(activeRec && !activeRec.lifecycleState?.deactivating);
          if (wasActive) {
            deactivateExtension(extKey);
            if (!silentRestore) {
              const dmode = String(extDef.deactivateCondition?.announcementMode || "toast");
              if (dmode === "title_card") {
                freshDeactTitleCards.push({
                  badge: "EXTENSION DÉSACTIVÉE",
                  filename: fname,
                  icon: extDef.icon || "🛑",
                  title: extDef.name || fname,
                  description: extDef.description || "Condition de désactivation atteinte.",
                  accentColor: "#ff6b8a",
                });
              } else if (dmode === "toast") {
                freshDeactToasts.push(`🛑 Extension désactivée : ${extDef.name || fname}`);
              }
            }
          }
          if (Boolean(extDef.deactivateCondition?.permanent)) {
            rec.permanently_disabled = true;
            rec.deactivate_sig = getExtensionDeactivateSignature(extDef);
            anyStateChange = true;
          }
          continue;
        }
        if (rec.enabled) {
          if (!rec.condition_sig) rec.condition_sig = getExtensionConditionSignature(extDef);
          const activeRec = activeExtensions.get(extKey);
          if (activeRec && activeRec.lifecycleState?.deactivating) {
            activeRec.lifecycleState.deactivating = false;
          } else if (!activeRec && !loadingExtensions.has(extKey)) {
            plannedLoadKeys.add(extKey);
            toLoad.push({ extDef, isFreshUnlock: false });
          }
        }
        continue;
      }

      // Extension non encore débloquée : on évalue la condition d'activation d'abord,
      // et la condition de désactivation uniquement si l'activation est remplie.
      if (!evaluateExtensionCondition(extDef)) continue;
      const deact = extDef.deactivateCondition;
      const dtype = (deact && typeof deact === "object") ? String(deact.type || "none") : "none";
      if (dtype !== "none" && dtype !== "condition_not_met" && combineWithExtraConditions(evaluateSingleCondition(deact, "none"), deact)) {
        continue;
      }

      const targetRec = getExtensionStateRecord(extKey);
      targetRec.unlocked = true;
      targetRec.enabled = true;
      targetRec.unlocked_at = new Date().toISOString();
      targetRec.condition_sig = getExtensionConditionSignature(extDef);
      anyStateChange = true;

      if (!silentRestore) {
        const mode = String(extDef.announcementMode || "title_card");
        if (mode === "title_card") {
          freshTitleCards.push(buildExtTitleCardOptions(extDef));
        } else if (mode === "toast") {
          freshToasts.push(buildExtToastMessage(extDef));
        }
      }
      plannedLoadKeys.add(extKey);
      toLoad.push({ extDef, isFreshUnlock: !silentRestore });
    }

    if (freshTitleCards.length > 3) {
      const preview = freshTitleCards.slice(0, 4).map(c => `${c.icon} ${c.title}`).join(" • ");
      const extra = freshTitleCards.length > 4 ? ` (+${freshTitleCards.length - 4} autres)` : "";
      queueTitleCard({
        badge: "EXTENSIONS ACTIVÉES",
        icon: "🧩",
        title: `${freshTitleCards.length} extensions activées`,
        description: `${preview}${extra}`,
        fileLabel: `📦 ${freshTitleCards.length} modules HTML chargés`,
        accentColor: "#73fad1",
      });
    } else {
      for (const tc of freshTitleCards) queueTitleCard(tc);
    }
    if (freshToasts.length === 1) {
      showToast(freshToasts[0]);
    } else if (freshToasts.length > 1) {
      showToast(`🧩 ${freshToasts.length} extensions activées !`);
    }
    if (freshDeactTitleCards.length > 3) {
      const preview = freshDeactTitleCards.slice(0, 4).map(c => `${c.icon} ${c.title}`).join(" • ");
      const extra = freshDeactTitleCards.length > 4 ? ` (+${freshDeactTitleCards.length - 4} autres)` : "";
      queueTitleCard({
        badge: "EXTENSIONS DÉSACTIVÉES",
        icon: "🛑",
        title: `${freshDeactTitleCards.length} extensions désactivées`,
        description: `${preview}${extra}`,
        fileLabel: `📦 ${freshDeactTitleCards.length} modules HTML désactivés`,
        accentColor: "#ff6b8a",
      });
    } else {
      for (const tc of freshDeactTitleCards) queueTitleCard(tc);
    }
    if (freshDeactToasts.length === 1) {
      showToast(freshDeactToasts[0]);
    } else if (freshDeactToasts.length > 1) {
      showToast(`🛑 ${freshDeactToasts.length} extensions désactivées`);
    }

    if (anyStateChange) saveCurrentSlot(true);
    return toLoad.length > 0
      ? runWithConcurrency(toLoad, EXT_FETCH_CONCURRENCY, (item) => loadAndActivateExtension(item.extDef, item.isFreshUnlock, false, Boolean(silentRestore)))
      : Promise.resolve();
  }

  let lastHotRefreshAt = 0;
  let hotRefreshInFlight = false;
  const HOT_REFRESH_COOLDOWN_MS = 3000;
  if (!lastRemoteCfgSnap) lastRemoteCfgSnap = JSON.stringify(GAME_CONFIG);
  if (!lastRemoteElemsSnap) lastRemoteElemsSnap = JSON.stringify(BASE_ELEMENTS_DATA);
  if (!lastRemoteExtsSnap) lastRemoteExtsSnap = JSON.stringify(EXTENSIONS_DATA);
  if (!lastRemoteAnchorsSnap) lastRemoteAnchorsSnap = JSON.stringify(ANCHORS_DATA);
  if (!lastRemoteActorsSnap) lastRemoteActorsSnap = JSON.stringify(ACTORS_DATA);
  if (!lastRemoteTagsSnap) lastRemoteTagsSnap = JSON.stringify(TAGS_DATA);
  if (!lastRemoteVisualsManifestSnap) lastRemoteVisualsManifestSnap = JSON.stringify(VISUAL_PACKS_MANIFEST);

  function isLocalDevEnvironment() {
    if (window.location.protocol !== "http:" && window.location.protocol !== "https:") return false;
    const qs = String(window.location.search || "");
    if (/[?&](hotreload|dev)=1\b/i.test(qs)) return true;
    if (/[?&]hotreload=0\b/i.test(qs)) return false;
    const host = String(window.location.hostname || "").toLowerCase();
    if (!host || host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".local")) return true;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return true;
    return false;
  }

  async function hotRefreshRemoteData(force = false, opts = null) {
    if (window.location.protocol !== "http:" && window.location.protocol !== "https:") return false;
    if (!force && !isLocalDevEnvironment()) return false;
    const silent = Boolean(opts && typeof opts === "object" && opts.silent);
    const deferChunkRefresh = Boolean(opts && typeof opts === "object" && opts.deferChunkRefresh);
    const now = Date.now();
    if (hotRefreshInFlight) return false;
    if (!force && (now - lastHotRefreshAt) < HOT_REFRESH_COOLDOWN_MS) return false;
    hotRefreshInFlight = true;
    lastHotRefreshAt = now;

    try {
      let [remoteCfg, remoteElems, remoteExts, remoteAnchors, remoteActors, remoteTags, remoteVisualsManifest, remoteScenarioMiniGD, remoteGlobalMiniGD] = await Promise.all([
        fetchJsonNoCache("game_config.json"),
        fetchJsonNoCache("config/elements/elements_data.json"),
        fetchJsonNoCache("config/extensions.json"),
        fetchJsonNoCache("config/anchors.json"),
        fetchJsonNoCache("config/actors.json"),
        fetchJsonNoCache("config/tags.json"),
        fetchJsonNoCache("config/visuals/manifest.json"),
        fetchJsonNoCache("config/minigd_manifest.json"),
        fetchJsonNoCache(`${ASSET_BASE}extensions/minigd/manifest.json`),
      ]);
      const remoteMiniGD = (remoteScenarioMiniGD && Array.isArray(remoteScenarioMiniGD.games)) ? remoteScenarioMiniGD : remoteGlobalMiniGD;
      if (remoteMiniGD && Array.isArray(remoteMiniGD.games)) {
        MINIGD_MANIFEST = remoteMiniGD;
        window.AssemblageMiniGDManifest = MINIGD_MANIFEST;
      }

      // Fallback si les JSON séparés ne sont pas publiés (ex: seul index.html + extensions/ sur GitHub Pages)
      if (!remoteCfg || !remoteElems || !remoteExts || !remoteAnchors || !remoteActors || !remoteTags || !remoteVisualsManifest) {
        const embedded = await fetchEmbeddedDataFromHtml();
        if (embedded) {
          if (!remoteCfg && embedded.cfg) remoteCfg = embedded.cfg;
          if (!remoteElems && embedded.elems) remoteElems = embedded.elems;
          if (!remoteExts && embedded.exts) remoteExts = embedded.exts;
          if (!remoteAnchors && embedded.anchors) remoteAnchors = embedded.anchors;
          if (!remoteActors && embedded.actors) remoteActors = embedded.actors;
          if (!remoteTags && embedded.tags) remoteTags = embedded.tags;
          if (!remoteVisualsManifest && embedded.visualPacks) remoteVisualsManifest = embedded.visualPacks;
        }
      }

      let uiChanged = false;
      let baseElementsChanged = false;
      let extManifestChanged = false;
      let extHotReloaded = false;
      let visualsChanged = false;

      if (remoteCfg && typeof remoteCfg === "object") {
        const snap = JSON.stringify(remoteCfg);
        if (snap !== lastRemoteCfgSnap) {
          lastRemoteCfgSnap = snap;
          const prevBiomeKey = JSON.stringify(activeBiome || {});
          for (const k of Object.keys(GAME_CONFIG)) delete GAME_CONFIG[k];
          Object.assign(GAME_CONFIG, remoteCfg);
          ensureBiomesSpriteSheetLoaded(true);
          applyGameConfigParams();
          if (Object.keys(slotBiomeSeeds).length > 0) {
            applySlotBiomeSeeds(slotBiomeSeeds);
            applyActiveBiomeParams(activeBiomeId);
          }
          await ensureBiomeGeneratorLoaded(activeBiomeGeneratorId, false);
          resolveAnchors();
          const nextBiomeKey = JSON.stringify(activeBiome || {});
          if (prevBiomeKey !== nextBiomeKey) {
            if (deferChunkRefresh && !uiOpen) {
              pendingChunkRefresh = true;
            } else {
              if (typeof clearAllChunkActors === "function") clearAllChunkActors();
              chunks.clear();
              lastCenterKey = "";
              updateChunks(alien.x, alien.y);
            }
          }
          uiChanged = true;
        }
      }

      // Recharge à chaud le générateur de biome actif si son fichier HTML ou un de ses scripts a été modifié
      if (force || loadedBiomeGenHtmlHash.has(activeBiomeGeneratorId)) {
        try {
          const genResp = await fetch(`${getBiomeGeneratorUrl(activeBiomeGeneratorId)}?_ts=${Date.now()}`, { cache: "no-store" });
          if (genResp.ok) {
            const genHtml = await genResp.text();
            let combined = genHtml;
            const deps = loadedBiomeGenDeps.get(activeBiomeGeneratorId) || [];
            if (deps.length > 0) {
              const depTexts = await Promise.all(deps.map(async (depUrl) => {
                try {
                  const dr = await fetch(`${depUrl}?_ts=${Date.now()}`, { cache: "no-store" });
                  return dr.ok ? await dr.text() : "";
                } catch (_de) {
                  return "";
                }
              }));
              for (let di = 0; di < deps.length; di++) {
                combined += "\n/*DEP:" + deps[di] + "*/\n" + depTexts[di];
              }
            }
            const genHash = hashBiomeGenHtml(combined);
            if (loadedBiomeGenHtmlHash.get(activeBiomeGeneratorId) !== genHash) {
              await ensureBiomeGeneratorLoaded(activeBiomeGeneratorId, true);
              resolveAnchors();
              if (deferChunkRefresh && !uiOpen) {
                pendingChunkRefresh = true;
              } else {
                chunks.clear();
                lastCenterKey = "";
                updateChunks(alien.x, alien.y);
              }
              uiChanged = true;
            }
          }
        } catch (_e) {}
      }

      // Recharge à chaud les scripts d'acteurs (config/actors/*.js) modifiés sur disque
      if (typeof reloadModifiedActorScripts === "function" && await reloadModifiedActorScripts()) {
        respawnAllLoadedChunkActors();
        const curGen = getActiveBiomeGenerator();
        if (curGen && Array.isArray(curGen.nativeActorIds) && curGen.nativeActorIds.length > 0) {
          if (deferChunkRefresh && !uiOpen) {
            pendingChunkRefresh = true;
          } else {
            chunks.clear();
            lastCenterKey = "";
            updateChunks(alien.x, alien.y);
          }
        }
        uiChanged = true;
      }

      if (remoteElems && Array.isArray(remoteElems.elements)) {
        const snap = JSON.stringify(remoteElems);
        if (snap !== lastRemoteElemsSnap) {
          lastRemoteElemsSnap = snap;
          BASE_ELEMENTS_DATA = remoteElems;
          baseElementsChanged = true;
          uiChanged = true;
          ensureElementsSpriteSheetLoaded(true);
        }
      }

      if (remoteTags && Array.isArray(remoteTags.tags)) {
        const snap = JSON.stringify(remoteTags);
        if (snap !== lastRemoteTagsSnap) {
          lastRemoteTagsSnap = snap;
          TAGS_DATA = remoteTags;
          extManifestChanged = true;
          uiChanged = true;
        }
      }

      if (remoteVisualsManifest && Array.isArray(remoteVisualsManifest.packs)) {
        const snap = JSON.stringify(remoteVisualsManifest);
        if (snap !== lastRemoteVisualsManifestSnap) {
          lastRemoteVisualsManifestSnap = snap;
          AssemblageVisuals.setManifest(remoteVisualsManifest);
          visualsChanged = true;
        }
      }
      if (await AssemblageVisuals.reloadLoadedPacks()) {
        visualsChanged = true;
      }
      if (visualsChanged) {
        uiChanged = true;
      }

      const prevCondSigs = new Map();
      const prevDeactSigs = new Map();
      const prevUiSigs = new Map();

      if (remoteExts && Array.isArray(remoteExts.extensions)) {
        const snap = JSON.stringify(remoteExts);
        if (snap !== lastRemoteExtsSnap) {
          const prevExtList = Array.isArray(EXTENSIONS_DATA?.extensions) ? EXTENSIONS_DATA.extensions : [];
          for (const prevDef of prevExtList) {
            const pkey = getExtKey(prevDef);
            if (!pkey) continue;
            // Ne calcule les signatures que pour les extensions qui ont un état enregistré ou sont actives
            if (extensionStates.has(pkey) || activeExtensions.has(pkey)) {
              prevCondSigs.set(pkey, getExtensionConditionSignature(prevDef));
              prevDeactSigs.set(pkey, getExtensionDeactivateSignature(prevDef));
            }
            if (activeExtensions.has(pkey)) {
              prevUiSigs.set(pkey, JSON.stringify({
                name: prevDef.name || "",
                icon: prevDef.icon || "",
                accentColor: prevDef.accentColor || "",
                description: prevDef.description || "",
                ui: prevDef.ui || {},
              }));
            }
          }
          lastRemoteExtsSnap = snap;
          EXTENSIONS_DATA = remoteExts;
          extManifestChanged = true;
          uiChanged = true;
        }
      }

      if (remoteAnchors && Array.isArray(remoteAnchors.anchors)) {
        const snap = JSON.stringify(remoteAnchors);
        if (snap !== lastRemoteAnchorsSnap) {
          lastRemoteAnchorsSnap = snap;
          ANCHORS_DATA = remoteAnchors;
          resolveAnchors();
          extManifestChanged = true;
        }
      }

      if (remoteActors && Array.isArray(remoteActors.actors)) {
        const snap = JSON.stringify(remoteActors);
        if (snap !== lastRemoteActorsSnap) {
          lastRemoteActorsSnap = snap;
          ACTORS_DATA = remoteActors;
          respawnAllLoadedChunkActors();
          const curGen = getActiveBiomeGenerator();
          if (curGen && Array.isArray(curGen.nativeActorIds) && curGen.nativeActorIds.length > 0) {
            if (deferChunkRefresh && !uiOpen) {
              pendingChunkRefresh = true;
            } else {
              if (typeof clearAllChunkActors === "function") clearAllChunkActors();
              chunks.clear();
              lastCenterKey = "";
              updateChunks(alien.x, alien.y);
            }
          }
          uiChanged = true;
        }
      }

      // Désactive les extensions retirées ou passées à enabled: false (indexées par extKey = id || filename)
      const enabledByKey = new Map();
      const extList = Array.isArray(EXTENSIONS_DATA?.extensions) ? EXTENSIONS_DATA.extensions : [];
      if (extManifestChanged || activeExtensions.size > 0) {
        for (const extDef of extList) {
          const ekey = getExtKey(extDef);
          if (ekey && extDef.enabled !== false) enabledByKey.set(ekey, extDef);
        }
      }
      if (extManifestChanged) {
        for (const ekey of Array.from(activeExtensions.keys())) {
          if (!enabledByKey.has(ekey)) {
            const rec = activeExtensions.get(ekey);
            const fname = String(rec?.extDef?.filename || ekey);
            deactivateExtension(ekey, { immediate: true });
            const stillUsesFile = Array.from(activeExtensions.values()).some((r) => String(r?.extDef?.filename || "") === fname);
            if (!stillUsesFile) {
              delete window.AssemblageExtensions[fname];
              loadedExtensionHtmlHash.delete(fname);
              loadedExtensionDeps.delete(fname);
              loadedExtensionStyles.delete(fname);
            }
            extHotReloaded = true;
          }
        }

        // Re-verrouille à chaud les extensions dont la condition a changé ou dont une dépendance a été désactivée
        if (revokeChangedExtensions(prevCondSigs, prevDeactSigs)) {
          extHotReloaded = true;
          saveCurrentSlot(true);
        }

        // Recharge à chaud les extensions actives dont la personnalisation d'interface a changé
        for (const ekey of Array.from(activeExtensions.keys())) {
          const curDef = enabledByKey.get(ekey);
          if (!curDef) continue;
          const nextUiSig = JSON.stringify({
            name: curDef.name || "",
            icon: curDef.icon || "",
            accentColor: curDef.accentColor || "",
            description: curDef.description || "",
            ui: curDef.ui || {},
          });
          if (prevUiSigs.has(ekey) && prevUiSigs.get(ekey) !== nextUiSig) {
            deactivateExtension(ekey, { immediate: true });
            await loadAndActivateExtension(curDef, false, false, true);
            extHotReloaded = true;
          }
        }
      }

      // Vérifie si le fichier HTML (ou ses <script src>) d'une extension déjà active a été modifié ou supprimé en ligne
      // Regroupe par filename pour ne fetcher chaque fichier qu'une fois même en cas de multi-instanciation.
      const activeKeysByFile = new Map();
      for (const ekey of activeExtensions.keys()) {
        const curDef = enabledByKey.get(ekey);
        if (!curDef) continue;
        const fname = String(curDef.filename || "");
        if (!fname) continue;
        if (!activeKeysByFile.has(fname)) activeKeysByFile.set(fname, []);
        activeKeysByFile.get(fname).push(ekey);
      }
      const filesToCheck = Array.from(activeKeysByFile.keys());
      const shouldCheckExtHtml = filesToCheck.length > 0 && (
        force ||
        extManifestChanged ||
        (filesToCheck.length <= EXT_HTML_AUTO_CHECK_MAX && (now - lastExtHtmlCheckAt) >= EXT_HTML_CHECK_COOLDOWN_MS)
      );
      if (shouldCheckExtHtml) {
        lastExtHtmlCheckAt = now;
        await runWithConcurrency(filesToCheck, EXT_FETCH_CONCURRENCY, async (fname) => {
          try {
            const resp = await fetch(`${ASSET_BASE}extensions/${encodeURIComponent(fname)}?_ts=${Date.now()}`, { cache: "no-store" });
            const instanceKeys = activeKeysByFile.get(fname) || [];
            if (resp.status === 404) {
              for (const k of instanceKeys) deactivateExtension(k, { immediate: true });
              delete window.AssemblageExtensions[fname];
              loadedExtensionHtmlHash.delete(fname);
              loadedExtensionDeps.delete(fname);
              loadedExtensionStyles.delete(fname);
              extHotReloaded = true;
              return;
            }
            if (!resp.ok) return;
            const newHtml = await resp.text();
            let combined = newHtml;
            const deps = loadedExtensionDeps.get(fname) || [];
            if (deps.length > 0) {
              const depTexts = await Promise.all(deps.map(async (depUrl) => {
                try {
                  const dr = await fetch(`${depUrl}?_ts=${Date.now()}`, { cache: "no-store" });
                  return dr.ok ? await dr.text() : "";
                } catch (_de) {
                  return "";
                }
              }));
              for (let di = 0; di < deps.length; di++) {
                combined += "\n/*DEP:" + deps[di] + "*/\n" + depTexts[di];
              }
            }
            const newHash = hashExtensionHtml(combined);
            if (loadedExtensionHtmlHash.has(fname) && loadedExtensionHtmlHash.get(fname) !== newHash) {
              for (const k of instanceKeys) deactivateExtension(k, { immediate: true });
              delete window.AssemblageExtensions[fname];
              loadedExtensionHtmlHash.delete(fname);
              loadedExtensionDeps.delete(fname);
              loadedExtensionStyles.delete(fname);
              let first = true;
              for (const k of instanceKeys) {
                const def = enabledByKey.get(k);
                if (def) {
                  await loadAndActivateExtension(def, false, first, true);
                  first = false;
                }
              }
              extHotReloaded = true;
            }
          } catch (_e) {}
        });
      }

      await syncUnlockedExtensions(false);

      // Reconstruit l'index fusionné (base + extensions actives) et purge les IDs réellement supprimés
      let statePruned = false;
      const shouldRefreshChunksNow = !(deferChunkRefresh && !uiOpen);
      if (baseElementsChanged || extHotReloaded || extManifestChanged) {
        statePruned = refreshWorldAndUiAfterElementsChange({ pruneState: true, refreshChunks: shouldRefreshChunksNow });
        if (!shouldRefreshChunksNow) pendingChunkRefresh = true;
      } else if (uiChanged && uiOpen) {
        renderShipUI();
      }
      if (uiChanged || extHotReloaded) {
        emitHostEvent("content:hot_reloaded", {
          uiChanged,
          baseElementsChanged,
          extManifestChanged,
          extHotReloaded,
          visualsChanged,
          statePruned,
          deferredChunks: pendingChunkRefresh,
        });
        if (!silent) {
          showToast(statePruned ? "🔄 Contenu mis à jour (inventaire synchronisé)" : "🔄 Contenu mis à jour");
        }
      }
      return uiChanged || extHotReloaded;
    } catch (_e) {
      return false;
    } finally {
      hotRefreshInFlight = false;
    }
  }

  async function tryRefreshExtensionsManifestFromDisk() {
    return hotRefreshRemoteData(true);
  }

  window.AssemblageHost = {
    version: 1,
    getExtensions: () => (Array.isArray(EXTENSIONS_DATA?.extensions) ? EXTENSIONS_DATA.extensions : []),
    getStates: exportExtensionStatesObj,
    checkNow: () => syncUnlockedExtensions(false),
    refreshRemote: (opts = null) => hotRefreshRemoteData(true, opts),
    unlockExtension: unlockExtensionByFilename,
    lockExtension: lockExtensionByFilename,
    unlockBiome: unlockBiomeById,
    lockBiome: lockBiomeById,
    openExtensionFrame: openExtFrame,
    closeExtensionFrame: closeExtFrame,
    getBiomeGenerators: () => window.AssemblageBiomeGenerators,
    loadBiomeGenerator: ensureBiomeGeneratorLoaded,
    tags: hostTagsApi,
    actors: hostActorsApi,
    hooks: { wrap: addHookWrapper },
  };

  const {
    notifyOpenerState,
    requestScreenWakeLock,
    releaseScreenWakeLock,
  } = window.AssemblageRuntime.initFullscreenAndWakeLock({
    getCurrentScenarioId: () => CURRENT_SCENARIO_ID,
    getCurrentSlotId: () => currentSlotId,
    getUseJoystick: () => useJoystick,
    setUseJoystick: (v, persist) => setUseJoystick(v, persist),
    getFsPaused: () => fsPaused,
    setFsPaused: (v) => { fsPaused = Boolean(v); },
    buildSavePayload,
    saveCurrentSlot,
    applySaveObject,
    showToast,
  });
  try {
    await ensureBiomeGeneratorLoaded(activeBiomeGeneratorId, false, activeBiome);
  } finally {
    const initLoadingUi = getBiomeLoadingUi(activeBiomeGeneratorId);
    if (initLoadingUi) initLoadingUi.hide();
  }
  resolveAnchors();

  async function loadBootBiomeWithNotice() {
    try {
      let loadingUi = getBiomeLoadingUi(activeBiomeGeneratorId);
      if (loadingUi) {
        await loadingUi.show(activeBiome, "Chargement des modules du biome…");
      }
      await ensureBiomeGeneratorLoaded(activeBiomeGeneratorId, false, activeBiome);
      loadingUi = getBiomeLoadingUi(activeBiomeGeneratorId);
      if (loadingUi) {
        loadingUi.update("Génération du terrain…");
        await loadingUi.waitFrame();
      }
      if (typeof ensureActorsLoadedForList === "function" && hostActorsApi) {
        await ensureActorsLoadedForList(hostActorsApi.getForBiome(activeBiomeId));
      }
      resolveAnchors();
      if (typeof clearAllChunkActors === "function") clearAllChunkActors();
      chunks.clear();
      lastCenterKey = "";
      updateChunks(alien.x, alien.y);
    } finally {
      const loadingUi = getBiomeLoadingUi(activeBiomeGeneratorId);
      if (loadingUi) loadingUi.hide();
    }
  }

  if (typeof ensureActorsLoadedForList === "function" && hostActorsApi) {
    await ensureActorsLoadedForList(hostActorsApi.getForBiome(activeBiomeId));
  }

  let lastTs = null;
  const transferredState = window.__ASSEMBLAGE_TRANSFERRED_STATE;
  if (transferredState && typeof transferredState === "object" && transferredState.payload) {
    if (typeof transferredState.useJoystick === "boolean") {
      setUseJoystick(transferredState.useJoystick, false);
    }
    if (!applySaveObject(transferredState.payload, transferredState.slotId || "slot_1", true)) {
      updateChunks(alien.x, alien.y);
      syncUnlockedExtensions(false);
    } else {
      await loadBootBiomeWithNotice();
      saveCurrentSlot(true, currentSlotId);
    }
  } else {
    const bootParams = new URLSearchParams(window.location.search);
    const bootForceRestart = bootParams.get("restart") === "1";
    if (bootForceRestart) {
      try {
        bootParams.delete("restart");
        const cleanQs = bootParams.toString();
        const cleanUrl = `${window.location.pathname}${cleanQs ? `?${cleanQs}` : ""}${window.location.hash || ""}`;
        window.history.replaceState({}, "", cleanUrl);
      } catch (_) {}
    }
    currentSlotId = storageGet(SAVE_LAST_KEY) || "slot_1";
    if (bootForceRestart) {
      startNewGame(currentSlotId);
      if (!window.AssemblageBiomeGenerators[activeBiomeGeneratorId]) {
        await loadBootBiomeWithNotice();
      }
    } else if (storageGet(SAVE_KEY_PREFIX + currentSlotId)) {
      loadSlot(currentSlotId, true);
      if (!window.AssemblageBiomeGenerators[activeBiomeGeneratorId]) {
        await loadBootBiomeWithNotice();
      }
    } else {
      updateChunks(alien.x, alien.y);
      syncUnlockedExtensions(false);
    }
  }
  function handlePageHidden(isUnload) {
    if (!isSwitchingScenario && hasUnsavedProgress()) saveCurrentSlot(true);
    notifyOpenerState(isUnload ? "assemblage_popup_closed" : "assemblage_state_sync");
    setGamePaused("page_hidden", true);
    hostAudio.suspend();
    releaseScreenWakeLock();
  }

  function handlePageVisible() {
    setGamePaused("page_hidden", false);
    hostAudio.resume();
    requestScreenWakeLock();
  }

  window.addEventListener("beforeunload", () => {
    handlePageHidden(true);
  });
  window.addEventListener("pagehide", () => {
    handlePageHidden(true);
  });
  window.addEventListener("pageshow", () => {
    if (!document.hidden) handlePageVisible();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      handlePageHidden(false);
    } else {
      handlePageVisible();
    }
  });

  function drawWorld(timeSec) {
    // World space
    ctx.save();
    ctx.translate(viewW * 0.5, viewH * 0.5);
    ctx.scale(currentZoom, currentZoom);
    if (cam.angle) ctx.rotate(cam.angle);
    ctx.translate(-cam.x, -cam.y);

    const rawHW = (viewW * 0.5) / currentZoom;
    const rawHH = (viewH * 0.5) / currentZoom;
    let halfW, halfH;
    if (cam.angle) {
      const ac = Math.abs(Math.cos(cam.angle));
      const as = Math.abs(Math.sin(cam.angle));
      halfW = rawHW * ac + rawHH * as + CHUNK_SIZE;
      halfH = rawHW * as + rawHH * ac + CHUNK_SIZE;
    } else {
      halfW = rawHW + CHUNK_SIZE;
      halfH = rawHH + CHUNK_SIZE;
    }
    for (const ch of chunks.values()) {
      if (ch.ox + CHUNK_SIZE < cam.x - halfW || ch.ox > cam.x + halfW ||
          ch.oy + CHUNK_SIZE < cam.y - halfH || ch.oy > cam.y + halfH) continue;
      runHook("drawChunk", drawChunk, ch);
    }
    const worldGen = getActiveBiomeGenerator();
    const worldEnv = worldGen ? getBiomeGeneratorEnv(timeSec) : null;
    if (worldGen && typeof worldGen.drawWorldBefore === "function") {
      worldGen.drawWorldBefore(ctx, timeSec, worldEnv);
    }
    runHook("drawGroundAfter", () => {}, timeSec);
    runHook("drawAnchors", drawAnchors, timeSec);
    runHook("drawSpaceship", drawSpaceship, timeSec);
    runHook("drawAlien", drawAlien, timeSec);
    if (worldGen && typeof worldGen.drawWorldAfter === "function") {
      worldGen.drawWorldAfter(ctx, timeSec, worldEnv);
    }
    worldEntities.drawAll(ctx, timeSec);
    runHook("drawWorldAfter", () => {}, timeSec);
    ctx.restore();
  }

  function frame(now) {
    mainRafId = null;
    const pausedNow = isGamePaused();
    if (pausedNow && pausedFrameRendered) {
      return;
    }

    const dt = lastTs === null ? (1 / 60) : Math.max(0.001, Math.min((now - lastTs) / 1000, 0.05));
    lastTs = now;
    const effectiveNowMs = (pausedNow && pauseStartedAtMs !== null)
      ? (pauseStartedAtMs - pausedTotalOffsetMs)
      : (now - pausedTotalOffsetMs);
    const timeSec = effectiveNowMs / 1000;
    currentFrameTimeSec = timeSec;
    if (!pausedNow) {
      if (clickRippleTime > 0) clickRippleTime = Math.max(0, clickRippleTime - dt);
      updateExtensionLifecycles(dt);
      runHook("update", update, dt, timeSec);
      worldEntities.updateAll(dt, timeSec);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#14121f";
    ctx.fillRect(0, 0, viewW, viewH);

    runHook("drawWorld", drawWorld, timeSec);

    // Superposition météo / atmosphère du générateur de biome
    const overlayGen = getActiveBiomeGenerator();
    if (overlayGen && typeof overlayGen.drawOverlay === "function") {
      overlayGen.drawOverlay(ctx, viewW, viewH, timeSec, getBiomeGeneratorEnv(timeSec));
    }

    // Screen-space HUD
    runHook("drawCompass", drawCompass);
    drawJoystick();
    runHook("drawHudAfter", () => {}, timeSec);

    if (pausedNow) {
      pausedFrameRendered = true;
    } else {
      pausedFrameRendered = false;
      scheduleMainFrame();
    }
  }
  mainLoopReady = true;
  scheduleMainFrame();

  window.AssemblageRuntime.initDebugPanel({
    getResolvedAnchorsById: () => resolvedAnchorsById,
    getMiniGDManifest: () => MINIGD_MANIFEST,
    getExtensionsData: () => EXTENSIONS_DATA,
    getExtKey,
    getActiveExtensions: () => activeExtensions,
    getHostProgressApi: () => hostProgressApi,
    getWorldEntitiesMap: () => worldEntitiesMap,
    getAlien: () => alien,
    getCam: () => cam,
    updateChunks,
    showToast,
    getElementsList: () => elementsList,
    addItem,
    renderShipUI,
    saveCurrentSlot,
    syncUnlockedExtensions,
    getLockedBiomes: () => lockedBiomes,
    getUnlockedBiomes: () => unlockedBiomes,
    getBiomes: () => BIOMES,
    renderBiomesView,
    deactivateExtension,
    unlockExtensionByFilename,
  });
})();