// Host v2 Core : Tags (hiérarchie), Event Bus, Services, Entités Monde, Acteurs procéduraux, Audio & HUD Slots.
(function () {
  const RT = (window.AssemblageRuntime = window.AssemblageRuntime || {});

  RT.createHostCore = function createHostCore(deps) {
    const getTagsData = deps.getTagsData;
    const getAnchorsData = deps.getAnchorsData;
    const getActorsData = deps.getActorsData;
    const getMiniGDManifest = deps.getMiniGDManifest;
    const getElementsList = deps.getElementsList;
    const getElementsById = deps.getElementsById;
    const getActiveBiomeId = deps.getActiveBiomeId;
    const getWorldSeed = deps.getWorldSeed;
    const getActiveBiomeGenerator = deps.getActiveBiomeGenerator;
    const getBiomeGeneratorEnv = deps.getBiomeGeneratorEnv || (() => ({ alien: getAlien(), CHUNK_SIZE, LANDING_CLEAR_RADIUS }));
    const getActorModule = deps.getActorModule || ((id) => (window.AssemblageActors && window.AssemblageActors[id]) || null);
    const ensureActorScriptLoaded = deps.ensureActorScriptLoaded || (() => Promise.resolve(null));
    const getChunks = deps.getChunks;
    const getAlien = deps.getAlien;
    const CHUNK_SIZE = deps.CHUNK_SIZE || 512;
    const LANDING_CLEAR_RADIUS = deps.LANDING_CLEAR_RADIUS || 230;
    const addItem = deps.addItem;
    const showToast = deps.showToast;
    const markAutosaveDirty = deps.markAutosaveDirty;
    const syncUnlockedExtensions = deps.syncUnlockedExtensions;

    // --- Tags (hiérarchie) ---
    function normalizeTagId(raw) {
      return String(raw || "").trim().replace(/^#+/, "").trim().toLowerCase();
    }
    function getTagIndex() {
      const byId = new Map();
      const tagsData = getTagsData();
      const list = Array.isArray(tagsData?.tags) ? tagsData.tags : [];
      for (const t of list) {
        if (!t || typeof t !== "object") continue;
        const tid = normalizeTagId(t.id || t.label);
        if (tid) byId.set(tid, t);
      }
      return byId;
    }
    function getTagAncestors(rawTagId) {
      const start = normalizeTagId(rawTagId);
      const out = new Set();
      if (!start) return out;
      out.add(start);
      const byId = getTagIndex();
      const queue = [start];
      while (queue.length > 0) {
        const cur = queue.shift();
        const rec = byId.get(cur);
        if (!rec || !Array.isArray(rec.parents)) continue;
        for (const p of rec.parents) {
          const pid = normalizeTagId(p);
          if (pid && !out.has(pid)) {
            out.add(pid);
            queue.push(pid);
          }
        }
      }
      return out;
    }
    function itemMatchesTag(item, targetTag) {
      const want = normalizeTagId(targetTag);
      if (!want) return true;
      const rawTags = Array.isArray(item?.tags) ? item.tags : (Array.isArray(item) ? item : []);
      for (const rt of rawTags) {
        if (getTagAncestors(rt).has(want)) return true;
      }
      return false;
    }
    const hostTagsApi = {
      all: () => {
        const tagsData = getTagsData();
        return Array.isArray(tagsData?.tags) ? tagsData.tags.slice() : [];
      },
      get: (id) => getTagIndex().get(normalizeTagId(id)) || null,
      ancestors: (id) => Array.from(getTagAncestors(id)),
      matches: (item, tagId) => itemMatchesTag(item, tagId),
      getElementsByTag: (tagId) => getElementsList().filter((el) => itemMatchesTag(el, tagId)),
      getAnchorsByTag: (tagId) => {
        const anchorsData = getAnchorsData();
        return Array.isArray(anchorsData?.anchors) ? anchorsData.anchors.filter((a) => itemMatchesTag(a, tagId)) : [];
      },
      getActorsByTag: (tagId) => {
        const actorsData = getActorsData();
        return Array.isArray(actorsData?.actors) ? actorsData.actors.filter((a) => itemMatchesTag(a, tagId)) : [];
      },
      getMinigdsByTag: (tagId) => {
        const mgd = getMiniGDManifest();
        return Array.isArray(mgd?.games) ? mgd.games.filter((g) => itemMatchesTag(g, tagId)) : [];
      },
    };

    // --- Services système intégrés (2.5D, caméra) ---
    let parallax25DActive = false;
    const parallax25DBillboardSources = (typeof window !== "undefined" && window.Assemblage25DBillboardSources instanceof Map)
      ? window.Assemblage25DBillboardSources
      : new Map();
    if (typeof window !== "undefined") {
      window.Assemblage25DBillboardSources = parallax25DBillboardSources;
    }
    const parallax25dService = {
      isActive: () => parallax25DActive,
      setActive(val) {
        parallax25DActive = Boolean(val);
        if (typeof window !== "undefined") window.Assemblage25DActive = parallax25DActive;
      },
      registerSource(key, collectorFn) {
        if (!key || typeof collectorFn !== "function") return;
        parallax25DBillboardSources.set(String(key), collectorFn);
      },
      unregisterSource(key) {
        if (!key) return;
        parallax25DBillboardSources.delete(String(key));
      },
      getSources: () => parallax25DBillboardSources,
    };
    let cameraRotating = false;
    const cameraService = {
      isRotating: () => cameraRotating,
      setRotating(val) {
        cameraRotating = Boolean(val);
        if (typeof window !== "undefined") window.AssemblageCamRotActive = cameraRotating;
      },
    };
    RT.parallax25d = parallax25dService;
    RT.camera = cameraService;

    // --- Event Bus central (avec relais P2P optionnel) ---
    const hostEventListeners = new Map();
    function emitHostEvent(eventName, payload, opts = null) {
      const ev = String(eventName || "").trim();
      if (!ev) return;
      const set = hostEventListeners.get(ev);
      if (set) {
        for (const fn of Array.from(set)) {
          try { fn(payload, ev); } catch (err) { console.error(`[HostEvent ${ev}]`, err); }
        }
      }
      const p2pBus = hostServicesMap.get("p2p") || (typeof window !== "undefined" ? window.AssemblageP2PBus : null);
      if (opts && opts.p2p && p2pBus && typeof p2pBus.emit === "function") {
        try { p2pBus.emit(`host:${ev}`, payload); } catch (_e) {}
      }
    }
    function onHostEvent(eventName, fn) {
      const ev = String(eventName || "").trim();
      if (!ev || typeof fn !== "function") return () => {};
      if (!hostEventListeners.has(ev)) hostEventListeners.set(ev, new Set());
      hostEventListeners.get(ev).add(fn);
      return () => {
        const set = hostEventListeners.get(ev);
        if (set) {
          set.delete(fn);
          if (set.size === 0) hostEventListeners.delete(ev);
        }
      };
    }

    // --- Registre de services inter-extensions ---
    const hostServicesMap = new Map();
    hostServicesMap.set("parallax25d", parallax25dService);
    hostServicesMap.set("camera", cameraService);

    // --- Registre générique d'entités du monde ---
    const worldEntitiesMap = new Map();
    const usedActorMods = new Set();
    let nextWorldEntityId = 1;
    const worldEntities = {
      spawn(def, ownerKey = "") {
        if (!def || typeof def !== "object") return null;
        const id = String(def.id || `ent_${nextWorldEntityId++}`);
        const ent = Object.assign({
          id,
          owner: ownerKey,
          x: 0,
          y: 0,
          z: 0,
          radius: 18,
          solid: false,
          damageable: false,
          hp: 100,
          maxHp: 100,
          tags: [],
          billboard25d: true,
          dead: false,
        }, def, { id, owner: ownerKey });
        worldEntitiesMap.set(id, ent);
        return ent;
      },
      remove(id) {
        return worldEntitiesMap.delete(String(id));
      },
      get(id) {
        return worldEntitiesMap.get(String(id)) || null;
      },
      removeByOwner(ownerKey) {
        for (const [id, ent] of Array.from(worldEntitiesMap.entries())) {
          if (ent.owner === ownerKey) worldEntitiesMap.delete(id);
        }
      },
      query(opts = null) {
        const q = opts || {};
        const res = [];
        const hasPos = Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.radius);
        for (const ent of worldEntitiesMap.values()) {
          if (ent.dead) continue;
          if (q.tag && !itemMatchesTag(ent, q.tag)) continue;
          if (q.damageable && !ent.damageable) continue;
          if (hasPos) {
            const d = Math.hypot(ent.x - q.x, ent.y - q.y);
            if (d > q.radius + (ent.radius || 0)) continue;
          }
          res.push(ent);
        }
        return res;
      },
      damageAt(wx, wy, radius, dmg, opts = null) {
        let hitCount = 0;
        const isRemote = Boolean(opts && opts.remote);
        const kx = Number(opts?.knockX ?? opts?.kx ?? 0);
        const ky = Number(opts?.knockY ?? opts?.ky ?? 0);
        const targets = worldEntities.query({ x: wx, y: wy, radius, damageable: true, tag: opts?.tag || "" });
        for (const ent of targets) {
          if (opts && opts.excludeOwner && ent.owner === opts.excludeOwner) continue;
          hitCount++;
          if (typeof ent.onDamage === "function") {
            try { ent.onDamage(dmg, opts || {}, ent); } catch (e) { console.error(e); }
          } else {
            ent.hp = Math.max(0, (Number(ent.hp) || 0) - Number(dmg || 0));
            if (ent.hp <= 0) {
              ent.dead = true;
              if (typeof ent.onDeath === "function") {
                try { ent.onDeath(opts || {}, ent); } catch (e) { console.error(e); }
              }
              worldEntitiesMap.delete(ent.id);
            }
          }
          emitHostEvent("actor:damaged", {
            kind: ent.actorId || "entity",
            actorId: ent.actorId || "",
            entityId: ent.id,
            x: ent.x,
            y: ent.y,
            dmg: Number(dmg || 0),
            kx,
            ky,
            killed: Boolean(ent.dead || ent.hp <= 0),
            remote: isRemote,
          });
        }
        return hitCount;
      },
      updateAll(dt, timeSec) {
        for (const [id, ent] of Array.from(worldEntitiesMap.entries())) {
          if (ent.dead) { worldEntitiesMap.delete(id); continue; }
          if (typeof ent.update === "function") {
            try { ent.update(dt, timeSec, ent); } catch (e) { console.error(`[WorldEntity ${id}]`, e); }
          }
        }
        if (usedActorMods.size > 0) {
          const env = getBiomeGeneratorEnv(timeSec);
          for (const mod of usedActorMods) {
            if (typeof mod.updateEffects === "function" && mod._lastEffectsTick !== timeSec) {
              mod._lastEffectsTick = timeSec;
              try { mod.updateEffects(dt, env); } catch (e) { console.error("[ActorEffects update]", e); }
            }
          }
        }
      },
      drawAll(ctxRef, timeSec) {
        if (worldEntitiesMap.size === 0 && usedActorMods.size === 0) return;
        const is25d = parallax25dService.isActive();
        for (const ent of worldEntitiesMap.values()) {
          if (ent.dead || (is25d && ent.billboard25d)) continue;
          if (typeof ent.draw === "function") {
            try { ent.draw(ctxRef, timeSec, ent); } catch (e) { console.error(e); }
          } else if (ent.visualId && window.AssemblageVisuals) {
            window.AssemblageVisuals.drawVisual(ctxRef, ent.visualId, ent.x, ent.y, { scale: ent.scale || 1, tint: ent.tint || "" });
          }
        }
        if (!is25d && usedActorMods.size > 0) {
          const env = getBiomeGeneratorEnv(timeSec);
          for (const mod of usedActorMods) {
            if (typeof mod.drawEffects === "function" && mod._lastEffectsDraw !== timeSec) {
              mod._lastEffectsDraw = timeSec;
              try { mod.drawEffects(ctxRef, env); } catch (e) { console.error("[ActorEffects draw]", e); }
            }
          }
        }
      },
    };

    // --- API Acteurs (Archétypes + Surcharges par biome + Spawn procédural par chunk) ---
    const actorKillsById = new Map();
    function getActorList() {
      const actorsData = getActorsData();
      return Array.isArray(actorsData?.actors) ? actorsData.actors : [];
    }
    function getActorArchetype(actorId) {
      const target = String(actorId || "").trim();
      return getActorList().find((a) => a && a.id === target) || null;
    }
    function resolveActorForBiome(archetype, biomeId) {
      if (!archetype) return null;
      const spawns = Array.isArray(archetype.biomeSpawns) ? archetype.biomeSpawns : [];
      const bid = String(biomeId || getActiveBiomeId() || "");
      const sp = spawns.find((s) => s && s.biome === bid) || spawns.find((s) => s && s.biome === "all") || null;
      const ov = (sp && sp.overrides && typeof sp.overrides === "object") ? sp.overrides : {};
      return Object.assign({}, archetype, ov, {
        _density: sp ? Number(sp.density ?? 1.0) : 1.0,
        _enabled: sp ? (sp.enabled !== false) : true,
        _overrides: ov,
      });
    }
    function recordActorKill(actorId, wx, wy, opts = null) {
      const aid = String(actorId || "").trim();
      if (!aid) return;
      actorKillsById.set(aid, (actorKillsById.get(aid) || 0) + 1);
      markAutosaveDirty();
      const arch = getActorArchetype(aid);
      const eff = arch ? resolveActorForBiome(arch, opts?.biomeId || getActiveBiomeId()) : null;
      const tags = Array.isArray(opts?.tags) ? opts.tags : (Array.isArray(eff?.tags) ? eff.tags.slice() : []);
      emitHostEvent("actor:killed", {
        actorId: aid,
        entityId: String(opts?.entityId || ""),
        x: Number(wx) || 0,
        y: Number(wy) || 0,
        tags,
      });
      if (eff && !(opts && opts.skipLoot)) {
        const lootRef = String(eff.lootElementId || "").trim();
        const chance = Number(eff.lootChance ?? 0.5);
        if (lootRef && Math.random() <= chance) {
          const elementsById = getElementsById();
          let dropId = "";
          if (lootRef.startsWith("#")) {
            const cands = hostTagsApi.getElementsByTag(lootRef.replace(/^#+/, ""));
            if (cands.length > 0) dropId = cands[Math.floor(Math.random() * cands.length)].id;
          } else if (elementsById.has(lootRef)) {
            dropId = lootRef;
          }
          if (dropId) {
            addItem(dropId, 1);
            const el = elementsById.get(dropId);
            if (el) showToast(`✨ Butin : +1 ${el.icon} ${el.name}`);
          }
        }
      }
      syncUnlockedExtensions(false);
    }

    const hostActorsApi = {
      all: () => getActorList().slice(),
      get: (id) => getActorArchetype(id),
      recordKill: (actorId, wx, wy, opts = null) => recordActorKill(actorId, wx, wy, opts),
      getLiveCreatures() {
        const out = [];
        const activeGen = getActiveBiomeGenerator();
        if (activeGen && typeof activeGen.getCreatures === "function") {
          const genList = activeGen.getCreatures() || [];
          for (const c of genList) out.push(c);
        }
        for (const ent of worldEntitiesMap.values()) {
          if (!ent || ent.dead || !ent.damageable) continue;
          out.push({
            kind: ent.actorId || "entity",
            actorId: ent.actorId || "",
            entityId: ent.id,
            isWorldEntity: true,
            ref: ent,
            x: ent.x,
            y: ent.y,
            r: Number(ent.radius) || 18,
            hp: Number(ent.hp ?? 30),
            maxHp: Number(ent.maxHp ?? 30),
            hostile: ent.faction === "hostile",
          });
        }
        return out;
      },
      damageCreature(creature, dmg, knockX = 0, knockY = 0, opts = null) {
        if (!creature) return { hit: false, killed: false };
        const isRemote = Boolean(opts && opts.remote);
        if (creature.isWorldEntity || creature.entityId) {
          const ent = creature.ref || worldEntitiesMap.get(String(creature.entityId || ""));
          if (!ent || ent.dead) return { hit: false, killed: false };
          const info = { knockX, knockY, kx: knockX, ky: knockY, remote: isRemote, skipLoot: isRemote };
          if (typeof ent.onDamage === "function") {
            try { ent.onDamage(dmg, info, ent); } catch (e) { console.error(e); }
          } else {
            const kLen = Math.hypot(knockX, knockY);
            if (kLen > 0.001) {
              ent.x += (knockX / kLen) * 14;
              ent.y += (knockY / kLen) * 14;
            }
            ent.hp = Math.max(0, (Number(ent.hp) || 0) - Number(dmg || 0));
            if (ent.hp <= 0) {
              ent.dead = true;
              if (typeof ent.onDeath === "function") {
                try { ent.onDeath(info, ent); } catch (e) { console.error(e); }
              }
              worldEntitiesMap.delete(ent.id);
            }
          }
          const killed = Boolean(ent.dead || ent.hp <= 0);
          emitHostEvent("actor:damaged", {
            kind: ent.actorId || "entity",
            actorId: ent.actorId || "",
            entityId: ent.id,
            x: ent.x,
            y: ent.y,
            dmg: Number(dmg || 0),
            kx: knockX,
            ky: knockY,
            killed,
            remote: isRemote,
          });
          return { hit: true, killed };
        }
        const activeGen = getActiveBiomeGenerator();
        if (activeGen && typeof activeGen.damageCreature === "function") {
          return activeGen.damageCreature(creature, dmg, knockX, knockY, opts);
        }
        return { hit: false, killed: false };
      },
      deflectProjectilesAt(wx, wy, radius) {
        let count = 0;
        const activeGen = getActiveBiomeGenerator();
        const handledMods = new Set();
        if (activeGen && typeof activeGen.deflectProjectilesAt === "function") {
          count += Number(activeGen.deflectProjectilesAt(wx, wy, radius)) || 0;
          if (Array.isArray(activeGen.nativeActorIds)) {
            for (const nid of activeGen.nativeActorIds) {
              const m = getActorModule(nid);
              if (m) handledMods.add(m);
            }
          }
        }
        const reg = window.AssemblageActors || {};
        for (const [key, mod] of Object.entries(reg)) {
          if (key === "utils" || !mod || handledMods.has(mod)) continue;
          if (typeof mod.deflectProjectilesAt === "function") {
            handledMods.add(mod);
            count += Number(mod.deflectProjectilesAt(wx, wy, radius)) || 0;
          }
        }
        return count;
      },
      getForBiome: (biomeId) => {
        const bid = String(biomeId || getActiveBiomeId() || "");
        const out = [];
        for (const a of getActorList()) {
          const spawns = Array.isArray(a.biomeSpawns) ? a.biomeSpawns : [];
          const hasMatch = spawns.some((s) => s && (s.biome === bid || s.biome === "all"));
          if (hasMatch) out.push(resolveActorForBiome(a, bid));
        }
        return out;
      },
      getByTag: (tagId) => getActorList().filter((a) => itemMatchesTag(a, tagId)),
      getKilledCount: (idOrTag) => {
        const raw = String(idOrTag || "").trim();
        if (!raw) return 0;
        if (raw.startsWith("#")) {
          const tid = raw.replace(/^#+/, "").trim();
          let sum = 0;
          for (const [aid, cnt] of actorKillsById.entries()) {
            const arch = getActorArchetype(aid);
            if (arch && itemMatchesTag(arch, tid)) sum += cnt;
          }
          return sum;
        }
        if (actorKillsById.has(raw)) return actorKillsById.get(raw) || 0;
        let sum = 0;
        for (const [aid, cnt] of actorKillsById.entries()) {
          const arch = getActorArchetype(aid);
          if (arch && itemMatchesTag(arch, raw)) sum += cnt;
        }
        return sum;
      },
      spawnFromArchetype(actorId, wx, wy, opts = {}) {
        const arch = getActorArchetype(actorId);
        if (!arch) return null;
        const eff = Object.assign({}, resolveActorForBiome(arch, opts.biomeId || getActiveBiomeId()), opts.overrides || {});
        const maxHp = Math.max(1, Number(eff.hp ?? 60));
        const spd = Math.max(0, Number(eff.speed ?? 95));
        const aggro = Math.max(0, Number(eff.aggroRadius ?? 260));
        const beh = String(eff.behavior || "wander");
        const scriptKey = String(eff.script || "").trim();
        const actorMod = scriptKey ? getActorModule(scriptKey) : null;

        const handleDeath = (info, self) => {
          recordActorKill(arch.id, self.x, self.y, {
            entityId: self.id,
            tags: self.tags,
            biomeId: opts.biomeId || getActiveBiomeId(),
            skipLoot: Boolean(info && (info.skipLoot || info.remote)),
          });
        };

        if (actorMod && typeof actorMod.create === "function" && typeof actorMod.updateOne === "function" && typeof actorMod.drawOne === "function") {
          usedActorMods.add(actorMod);
          const actorState = actorMod.create(Number(wx) || 0, Number(wy) || 0, Math.random, eff);
          const ent = worldEntities.spawn({
            actorId: arch.id,
            name: eff.name || arch.id,
            icon: eff.icon || "👾",
            faction: eff.faction || "neutral",
            behavior: beh,
            x: actorState.x,
            y: actorState.y,
            radius: Number(eff.radius || 22) * Number(eff.scale || 1),
            scale: Number(eff.scale || 1),
            tint: eff.tint || "#73fad1",
            damageable: eff.faction !== "ambient" || Boolean(opts.damageable),
            hp: actorState.hp ?? maxHp,
            maxHp: actorState.maxHp ?? maxHp,
            tags: Array.isArray(eff.tags) ? eff.tags.slice() : [],
            _actorMod: actorMod,
            _actorState: actorState,
            update(dt, timeSec, self) {
              const env = getBiomeGeneratorEnv(timeSec);
              actorMod.updateOne(self._actorState, dt, timeSec, env, eff);
              if (typeof actorMod.updateEffects === "function" && actorMod._lastEffectsTick !== timeSec) {
                actorMod._lastEffectsTick = timeSec;
                actorMod.updateEffects(dt, env);
              }
              self.x = self._actorState.x;
              self.y = self._actorState.y;
              self.hp = self._actorState.hp;
              self.maxHp = self._actorState.maxHp;
            },
            draw(ctxRef, timeSec, self) {
              const env = getBiomeGeneratorEnv(timeSec);
              actorMod.drawOne(ctxRef, self._actorState, timeSec, env);
              if (typeof actorMod.drawEffects === "function" && actorMod._lastEffectsDraw !== timeSec) {
                actorMod._lastEffectsDraw = timeSec;
                actorMod.drawEffects(ctxRef, env);
              }
            },
            onDamage(dmg, info, self) {
              const kx = Number(info?.knockX || 0);
              const ky = Number(info?.knockY || 0);
              const res = typeof actorMod.applyDamageToOne === "function"
                ? actorMod.applyDamageToOne(self._actorState, Number(dmg || 0), kx, ky)
                : { hit: true, killed: (self._actorState.hp = Math.max(0, self._actorState.hp - Number(dmg || 0))) <= 0 };
              self.hp = self._actorState.hp;
              if (res.killed || self.hp <= 0) {
                self.dead = true;
                handleDeath(info, self);
                worldEntitiesMap.delete(self.id);
              }
            },
            onDeath: handleDeath,
          }, String(opts.owner || "__actors_runtime__"));
          ensureCustomActors25DCollector();
          return ent;
        }

        const ent = worldEntities.spawn({
          actorId: arch.id,
          name: eff.name || arch.id,
          icon: eff.icon || "👾",
          faction: eff.faction || "neutral",
          behavior: beh,
          x: Number(wx) || 0,
          y: Number(wy) || 0,
          vx: 0,
          vy: 0,
          wanderAngle: Math.random() * Math.PI * 2,
          wanderTimer: 1 + Math.random() * 2,
          radius: Number(eff.radius || 22) * Number(eff.scale || 1),
          scale: Number(eff.scale || 1),
          tint: eff.tint || "#73fad1",
          visualId: eff.visualId || "",
          animationId: eff.animationId || "",
          damageable: eff.faction !== "ambient" || Boolean(opts.damageable),
          hp: maxHp,
          maxHp,
          tags: Array.isArray(eff.tags) ? eff.tags.slice() : [],
          update(dt, _t, self) {
            const alien = getAlien();
            const dx = alien.x - self.x;
            const dy = alien.y - self.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            if (beh === "chase" && dist <= aggro && dist > self.radius + 14) {
              self.x += (dx / dist) * spd * dt;
              self.y += (dy / dist) * spd * dt;
            } else if (beh === "flee" && dist <= aggro) {
              self.x -= (dx / dist) * spd * dt;
              self.y -= (dy / dist) * spd * dt;
            } else if (beh === "companion" && dist > 68) {
              self.x += (dx / dist) * spd * dt;
              self.y += (dy / dist) * spd * dt;
            } else if ((beh === "wander" || beh === "swarm") && spd > 0) {
              self.wanderTimer -= dt;
              if (self.wanderTimer <= 0) {
                self.wanderAngle += (Math.random() - 0.5) * 2.2;
                self.wanderTimer = 1.2 + Math.random() * 2.5;
              }
              self.x += Math.cos(self.wanderAngle) * spd * 0.45 * dt;
              self.y += Math.sin(self.wanderAngle) * spd * 0.45 * dt;
            }
          },
          draw(ctxRef, timeSec, self) {
            let drawn = false;
            if (self.animationId && window.AssemblageVisuals) {
              drawn = Boolean(window.AssemblageVisuals.drawAnimation(ctxRef, self.animationId, self.x, self.y, timeSec || 0, { scale: self.scale, tint: self.tint }));
            }
            if (!drawn && self.visualId && window.AssemblageVisuals) {
              drawn = Boolean(window.AssemblageVisuals.drawVisual(ctxRef, self.visualId, self.x, self.y, { scale: self.scale, tint: self.tint }));
            }
            if (!drawn) {
              ctxRef.save();
              ctxRef.beginPath();
              ctxRef.arc(self.x, self.y, self.radius, 0, Math.PI * 2);
              ctxRef.fillStyle = self.tint || "#73fad1";
              ctxRef.globalAlpha = 0.28;
              ctxRef.fill();
              ctxRef.globalAlpha = 0.92;
              ctxRef.strokeStyle = self.tint || "#73fad1";
              ctxRef.lineWidth = 2;
              ctxRef.stroke();
              ctxRef.font = `${Math.round(self.radius * 1.15)}px sans-serif`;
              ctxRef.textAlign = "center";
              ctxRef.textBaseline = "middle";
              ctxRef.fillText(self.icon || "👾", self.x, self.y + 1);
              ctxRef.restore();
            }
            if (self.damageable && self.hp < self.maxHp) {
              const bw = Math.max(28, self.radius * 1.8);
              const bx = self.x - bw * 0.5;
              const by = self.y - self.radius - 10;
              ctxRef.fillStyle = "rgba(0,0,0,0.65)";
              ctxRef.fillRect(bx, by, bw, 5);
              ctxRef.fillStyle = "#ff6e7a";
              ctxRef.fillRect(bx, by, bw * Math.max(0, self.hp / self.maxHp), 5);
            }
          },
          onDeath: handleDeath,
        }, String(opts.owner || "__actors_runtime__"));
        return ent;
      },
    };

    let customActors25DAttached = false;
    function ensureCustomActors25DCollector() {
      if (customActors25DAttached || typeof window === "undefined") return;
      customActors25DAttached = true;
      parallax25dService.registerSource("__custom_actors_25d__", (push) => {
        const env = getBiomeGeneratorEnv();
        const U = (window.AssemblageActors && window.AssemblageActors.utils) || null;
        const bounds = U && U.getViewBounds ? U.getViewBounds(env, 240) : null;
        const activeMods = new Set(usedActorMods);
        for (const ent of worldEntitiesMap.values()) {
          if (ent.dead || !ent._actorMod || !ent._actorState) continue;
          const mod = ent._actorMod;
          activeMods.add(mod);
          if (typeof mod.draw25D !== "function") continue;
          if (bounds && U && U.isPointVisible && !U.isPointVisible(ent.x, ent.y, bounds, (ent.radius || 30) + 60)) continue;
          const st = ent._actorState;
          push(ent.y, (ctx, projectPoint, eased, timeSec) => mod.draw25D(ctx, st, projectPoint, eased, timeSec, env), ent.x);
        }
        for (const mod of activeMods) {
          if (typeof mod.collect25DEffects === "function") {
            mod.collect25DEffects(push, bounds);
          }
        }
      });
    }

    const spawnedActorChunkKeys = new Set();

    function hashActorChunkSeed(worldSeed, cx, cy, strId) {
      let h = (Math.imul(worldSeed | 0, 374761393) ^ Math.imul(cx | 0, 668265263) ^ Math.imul(cy | 0, 2147483647)) >>> 0;
      for (let i = 0; i < strId.length; i++) {
        h = Math.imul(h ^ strId.charCodeAt(i), 16777619) >>> 0;
      }
      return h || 1;
    }

    function makeActorChunkRng(seed) {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function spawnActorsForChunk(cx, cy) {
      const chunkKey = `${cx},${cy}`;
      if (spawnedActorChunkKeys.has(chunkKey)) return;
      spawnedActorChunkKeys.add(chunkKey);
      const activeBiomeId = getActiveBiomeId();
      const biomeActors = hostActorsApi.getForBiome(activeBiomeId);
      if (!biomeActors.length) return;
      const ox = cx * CHUNK_SIZE;
      const oy = cy * CHUNK_SIZE;
      const ownerTag = `__actors_chunk_${chunkKey}`;
      const placed = [];

      // Évite de dupliquer les acteurs déjà simulés nativement par le générateur du biome actif
      const activeGenObj = getActiveBiomeGenerator();
      const nativeActorIds = Array.isArray(activeGenObj?.nativeActorIds)
        ? new Set(activeGenObj.nativeActorIds)
        : null;
      const worldSeed = getWorldSeed();

      for (const eff of biomeActors) {
        if (!eff || !eff.id || eff._enabled === false) continue;
        if (nativeActorIds && nativeActorIds.has(eff.id)) continue;
        if (eff.script && !getActorModule(eff.script)) {
          ensureActorScriptLoaded(eff.script).then((mod) => {
            if (mod && spawnedActorChunkKeys.has(chunkKey)) {
              unloadActorsForChunk(chunkKey);
              spawnActorsForChunk(cx, cy);
            }
          });
          continue;
        }
        const density = Math.max(0, Number(eff._density ?? 1.0));
        if (density <= 0.01) continue;
        const rng = makeActorChunkRng(hashActorChunkSeed(worldSeed, cx, cy, `${activeBiomeId}:${eff.id}`));
        const baseCount = Math.floor(density);
        const frac = density - baseCount;
        const targetCount = baseCount + (rng() < frac ? 1 : 0);
        const minSep = Math.max(24, Number(eff.minSeparation || 56));
        const pad = 48;

        for (let i = 0; i < targetCount; i++) {
          let px = 0, py = 0, ok = false;
          for (let attempt = 0; attempt < 8; attempt++) {
            px = ox + pad + rng() * (CHUNK_SIZE - pad * 2);
            py = oy + pad + rng() * (CHUNK_SIZE - pad * 2);
            if (Math.hypot(px, py) < LANDING_CLEAR_RADIUS + 44) continue;
            if (placed.some((p) => Math.hypot(px - p.x, py - p.y) < minSep)) continue;
            ok = true;
            break;
          }
          if (!ok) continue;
          placed.push({ x: px, y: py });
          hostActorsApi.spawnFromArchetype(eff.id, px, py, { owner: ownerTag, biomeId: activeBiomeId });
        }
      }
    }

    function unloadActorsForChunk(chunkKey) {
      spawnedActorChunkKeys.delete(chunkKey);
      worldEntities.removeByOwner(`__actors_chunk_${chunkKey}`);
    }

    function clearAllChunkActors() {
      for (const ck of Array.from(spawnedActorChunkKeys)) {
        worldEntities.removeByOwner(`__actors_chunk_${ck}`);
      }
      spawnedActorChunkKeys.clear();
      for (const mod of usedActorMods) {
        if (typeof mod.reset === "function") {
          try { mod.reset(); } catch (_e) {}
        }
      }
      usedActorMods.clear();
    }

    function respawnAllLoadedChunkActors() {
      clearAllChunkActors();
      for (const ch of getChunks().values()) {
        spawnActorsForChunk(ch.cx, ch.cy);
      }
    }

    parallax25dService.registerSource("__host_world_entities__", (pushBillboard) => {
      for (const ent of worldEntitiesMap.values()) {
        if (ent.dead || !ent.billboard25d || (ent._actorMod && typeof ent._actorMod.draw25D === "function")) continue;
        if (typeof ent.draw !== "function" && !ent.visualId && !ent.animationId) continue;
        pushBillboard(ent.y, (ctxRef, projectPoint, _blend, timeSec) => {
          const pt = projectPoint(ent.x, ent.y, Number(ent.z || 0));
          if (typeof ent.drawBillboard === "function") {
            ent.drawBillboard(ctxRef, pt, timeSec, ent);
          } else if (ent.animationId && window.AssemblageVisuals && window.AssemblageVisuals.drawAnimation(ctxRef, ent.animationId, pt.x, pt.y, timeSec || 0, { scale: (ent.scale || 1) * pt.scale, tint: ent.tint || "" })) {
            // drawn via animation symbol
          } else if (ent.visualId && window.AssemblageVisuals && window.AssemblageVisuals.drawVisual(ctxRef, ent.visualId, pt.x, pt.y, { scale: (ent.scale || 1) * pt.scale, tint: ent.tint || "" })) {
            // drawn via vector visual
          } else if (typeof ent.draw === "function") {
            ctxRef.save();
            ctxRef.translate(pt.x, pt.y);
            ctxRef.scale(pt.scale, pt.scale);
            ctxRef.translate(-ent.x, -ent.y);
            ent.draw(ctxRef, timeSec, ent);
            ctxRef.restore();
          }
        }, ent.x);
      }
    });

    // --- Bus Audio central (WebAudio léger + mute/ducking) ---
    const hostAudio = (() => {
      let audioCtx = null;
      let muted = false;
      let masterVolume = 0.8;
      let ducked = false;
      try { muted = localStorage.getItem("assemblage_audio_muted") === "1"; } catch (_e) {}
      function ensureCtx() {
        if (muted) return null;
        if (!audioCtx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          try { audioCtx = new AC(); } catch (_e) { return null; }
        }
        if (audioCtx && audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }
        return audioCtx;
      }
      return {
        isMuted: () => muted,
        setMuted(v) {
          muted = Boolean(v);
          try { localStorage.setItem("assemblage_audio_muted", muted ? "1" : "0"); } catch (_e) {}
          emitHostEvent("audio:mute_changed", { muted });
        },
        setMasterVolume(v) { masterVolume = Math.max(0, Math.min(1, Number(v) || 0)); },
        getMasterVolume: () => masterVolume,
        setDucked(v) { ducked = Boolean(v); },
        playTone({ freq = 440, duration = 0.12, type = "sine", gain = 0.18 } = {}) {
          const ac = ensureCtx();
          if (!ac) return;
          const vol = masterVolume * (ducked ? 0.25 : 1) * gain;
          if (vol <= 0.001) return;
          const now = ac.currentTime;
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, now);
          g.gain.setValueAtTime(vol, now);
          g.gain.exponentialRampToValueAtTime(0.0008, now + Math.max(0.02, duration));
          osc.connect(g);
          g.connect(ac.destination);
          osc.start(now);
          osc.stop(now + Math.max(0.02, duration) + 0.01);
        },
        playUrl(url, volume = 1.0) {
          if (muted || !url) return null;
          try {
            const a = new Audio(url);
            a.volume = Math.max(0, Math.min(1, masterVolume * (ducked ? 0.25 : 1) * volume));
            a.play().catch(() => {});
            return a;
          } catch (_e) { return null; }
        },
        suspend() {
          if (audioCtx && audioCtx.state === "running") {
            try { audioCtx.suspend().catch(() => {}); } catch (_e) {}
          }
        },
        resume() {
          if (!muted && audioCtx && audioCtx.state === "suspended") {
            try { audioCtx.resume().catch(() => {}); } catch (_e) {}
          }
        },
      };
    })();

    // --- Slots HUD centralisés ---
    const hudSlotsMap = new Map();
    function getOrCreateHudSlot(slotName) {
      const key = String(slotName || "top-left");
      if (hudSlotsMap.has(key)) return hudSlotsMap.get(key);
      const el = document.createElement("div");
      el.dataset.assemblageHudSlot = key;
      const baseStyle = "position:fixed;z-index:35;display:flex;flex-direction:column;gap:8px;pointer-events:none;";
      const posStyles = {
        "top-left": "top:max(12px,env(safe-area-inset-top,12px));left:max(12px,env(safe-area-inset-left,12px));align-items:flex-start;",
        "top-center": "top:max(12px,env(safe-area-inset-top,12px));left:50%;transform:translateX(-50%);align-items:center;",
        "bottom-left": "bottom:max(14px,env(safe-area-inset-bottom,14px));left:max(12px,env(safe-area-inset-left,12px));align-items:flex-start;",
        "bottom-center": "bottom:max(18px,env(safe-area-inset-bottom,18px));left:50%;transform:translateX(-50%);align-items:center;",
        "action-prompt": "bottom:max(72px,env(safe-area-inset-bottom,72px));left:50%;transform:translateX(-50%);align-items:center;",
      };
      el.style.cssText = baseStyle + (posStyles[key] || posStyles["top-left"]);
      document.body.appendChild(el);
      hudSlotsMap.set(key, el);
      return el;
    }

    return {
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
    };
  };
})();
