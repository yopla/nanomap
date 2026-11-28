// Chargeur dynamique de générateurs de biomes (config/biomes/<id>.html) et pré-chargeurs UI.
(function () {
  const RT = (window.AssemblageRuntime = window.AssemblageRuntime || {});

  RT.createBiomeLoader = function createBiomeLoader(deps) {
    const DEFAULT_BIOME_GENERATOR = deps.defaultGeneratorId || "biome_base";
    const getAssetBase = deps.getAssetBase || (() => "");
    const getActiveBiomeGeneratorId = deps.getActiveBiomeGeneratorId || (() => DEFAULT_BIOME_GENERATOR);

    window.AssemblageBiomeGenerators = window.AssemblageBiomeGenerators || {};
    const loadedBiomeGenHtmlHash = new Map();
    const loadedBiomeGenDeps = new Map();
    const loadingBiomeGenerators = new Map();

    function normalizeBiomeGeneratorId(raw) {
      let s = String(raw || "").trim().replace(/\\/g, "/");
      if (!s) return DEFAULT_BIOME_GENERATOR;
      s = s.replace(/^\/+/, "").replace(/^config\/biomes\//i, "").replace(/\.html?$/i, "").trim();
      return s || DEFAULT_BIOME_GENERATOR;
    }

    function getBiomeGeneratorUrl(genId) {
      const relPath = String(genId || DEFAULT_BIOME_GENERATOR)
        .split("/")
        .filter(Boolean)
        .map((seg) => encodeURIComponent(seg))
        .join("/");
      return `${getAssetBase()}config/biomes/${relPath}.html`;
    }

    function hashBiomeGenHtml(str) {
      let h = 2166136261 >>> 0;
      const s = String(str || "");
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h.toString(16);
    }

    function resolveBiomeRelativeUrl(baseDir, rawSrc) {
      const clean = String(rawSrc || "").trim();
      if (!clean) return "";
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(clean) || clean.startsWith("//") || clean.startsWith("/")) return clean;
      const baseStr = String(baseDir || "");
      let prefix = "";
      let basePath = baseStr;
      const schemeMatch = baseStr.match(/^([a-z][a-z0-9+.-]*:\/\/[^/]*)(\/.*)?$/i);
      if (schemeMatch) {
        prefix = schemeMatch[1] + "/";
        basePath = (schemeMatch[2] || "/").slice(1);
      } else if (baseStr.startsWith("/")) {
        prefix = "/";
        basePath = baseStr.slice(1);
      }
      const parts = (basePath + clean).split("/");
      const resolved = [];
      for (const part of parts) {
        if (!part || part === ".") continue;
        if (part === "..") {
          if (resolved.length > 0 && resolved[resolved.length - 1] !== "..") resolved.pop();
          else if (!prefix) resolved.push("..");
        } else {
          resolved.push(part);
        }
      }
      return prefix + resolved.join("/");
    }

    function getBiomeLoadingUi(rawGenId) {
      const genId = normalizeBiomeGeneratorId(rawGenId);
      const baseId = genId.includes("/") ? genId.split("/").pop() : genId;
      const gens = window.AssemblageBiomeGenerators || {};
      const gen = gens[genId] || (baseId ? gens[baseId] : null);
      if (gen && typeof gen.showLoading === "function" && typeof gen.hideLoading === "function") {
        return {
          show: (b, txt) => gen.showLoading(b, txt),
          update: (txt) => { if (typeof gen.updateLoading === "function") gen.updateLoading(txt); },
          hide: () => gen.hideLoading(),
          waitFrame: () => (typeof gen.waitLoadingFrame === "function" ? gen.waitLoadingFrame() : Promise.resolve()),
        };
      }
      const preloaders = window.AssemblageBiomePreloaders || {};
      const pre = preloaders[genId] || (baseId ? preloaders[baseId] : null);
      if (pre && typeof pre.show === "function" && typeof pre.hide === "function") {
        return pre;
      }
      return null;
    }

    async function ensureBiomeGeneratorLoaded(rawId, forceReload = false, biomeContext = null) {
      const genId = normalizeBiomeGeneratorId(rawId);
      if (!forceReload && window.AssemblageBiomeGenerators[genId]) {
        return window.AssemblageBiomeGenerators[genId];
      }
      if (!forceReload && loadingBiomeGenerators.has(genId)) {
        return loadingBiomeGenerators.get(genId);
      }

      const loadPromise = (async () => {
        const url = getBiomeGeneratorUrl(genId);
        const isHttp = (window.location.protocol === "http:" || window.location.protocol === "https:");
        const fetchUrl = isHttp ? `${url}?_ts=${Date.now()}` : url;
        try {
          if (forceReload && window.AssemblageBiomeGenerators[genId] && typeof window.AssemblageBiomeGenerators[genId].onUnload === "function") {
            try { window.AssemblageBiomeGenerators[genId].onUnload(); } catch (_e) {}
          }
          const resp = await fetch(fetchUrl, { cache: "no-store" });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const htmlText = await resp.text();
          const slashIdx = url.lastIndexOf("/");
          const baseDir = slashIdx >= 0 ? url.slice(0, slashIdx + 1) : "";
          const doc = new DOMParser().parseFromString(htmlText, "text/html");
          const scripts = Array.from(doc.querySelectorAll("script"));
          const depUrls = [];
          const scriptBodies = [];
          let combinedSource = htmlText;

          const preloadScripts = [];
          const mainScripts = [];
          for (const sc of scripts) {
            const stype = String(sc.getAttribute("type") || "").trim().toLowerCase();
            if (stype && stype !== "text/javascript" && stype !== "application/javascript") continue;
            const isPreload = sc.getAttribute("data-preload") === "true" || sc.hasAttribute("data-preload");
            (isPreload ? preloadScripts : mainScripts).push(sc);
          }

          const fetchScriptGroup = async (group) => {
            const entries = [];
            for (const sc of group) {
              const srcAttr = sc.getAttribute("src");
              if (srcAttr) {
                const depUrl = resolveBiomeRelativeUrl(baseDir, srcAttr);
                if (!depUrl) continue;
                const depFetchUrl = isHttp ? `${depUrl}?_ts=${Date.now()}` : depUrl;
                entries.push({
                  depUrl,
                  promise: fetch(depFetchUrl, { cache: "no-store" }).then(async (depResp) => {
                    if (!depResp.ok) throw new Error(`HTTP ${depResp.status} (${depUrl})`);
                    return depResp.text();
                  }),
                });
              } else if (sc.textContent && sc.textContent.trim()) {
                entries.push({ depUrl: "", inline: sc.textContent });
              }
            }
            return Promise.all(
              entries.map(async (entry) => ({
                depUrl: entry.depUrl,
                code: entry.promise ? await entry.promise : (entry.inline || ""),
              }))
            );
          };

          if (preloadScripts.length > 0) {
            const resolvedPreload = await fetchScriptGroup(preloadScripts);
            for (const item of resolvedPreload) {
              if (item.depUrl) {
                depUrls.push(item.depUrl);
                combinedSource += "\n/*DEP:" + item.depUrl + "*/\n" + item.code;
              }
              if (item.code && item.code.trim()) {
                const fn = new Function(item.code);
                fn();
              }
            }
            const preUi = getBiomeLoadingUi(genId);
            if (preUi) {
              await preUi.show(biomeContext, "Chargement des modules du biome…");
            }
          }

          const resolvedMain = await fetchScriptGroup(mainScripts);
          for (const item of resolvedMain) {
            if (item.depUrl) {
              depUrls.push(item.depUrl);
              combinedSource += "\n/*DEP:" + item.depUrl + "*/\n" + item.code;
            }
            if (item.code && item.code.trim()) scriptBodies.push(item.code);
          }

          loadedBiomeGenDeps.set(genId, depUrls);
          loadedBiomeGenHtmlHash.set(genId, hashBiomeGenHtml(combinedSource));

          for (const code of scriptBodies) {
            const fn = new Function(code);
            fn();
          }

          let loaded = window.AssemblageBiomeGenerators[genId] || null;
          if (!loaded && genId.includes("/")) {
            const baseId = genId.split("/").pop();
            if (baseId && window.AssemblageBiomeGenerators[baseId]) {
              window.AssemblageBiomeGenerators[genId] = window.AssemblageBiomeGenerators[baseId];
              loaded = window.AssemblageBiomeGenerators[genId];
            }
          }
          if (!loaded) {
            console.warn(`[BiomeGenerator] ${url} chargé mais n'a pas enregistré window.AssemblageBiomeGenerators["${genId}"].`);
          }
          return loaded;
        } catch (err) {
          console.warn(`[BiomeGenerator] Impossible de charger ${url} :`, err);
          if (genId !== DEFAULT_BIOME_GENERATOR) {
            return ensureBiomeGeneratorLoaded(DEFAULT_BIOME_GENERATOR, false);
          }
          return null;
        } finally {
          loadingBiomeGenerators.delete(genId);
        }
      })();

      loadingBiomeGenerators.set(genId, loadPromise);
      return loadPromise;
    }

    function getActiveBiomeGenerator(preferredId = "") {
      const targetId = normalizeBiomeGeneratorId(preferredId || getActiveBiomeGeneratorId());
      return (
        window.AssemblageBiomeGenerators[targetId] ||
        window.AssemblageBiomeGenerators[DEFAULT_BIOME_GENERATOR] ||
        null
      );
    }

    return {
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
    };
  };
})();
