// Orchestrateur principal du biome Les Marais (config/biomes/marais/biome_marais.html)
(function () {
  const GENERATOR_ID = "marais/biome_marais";
  const M = window.MaraisBiome;

  const chunkStates = new Map();
  const mistBands = [];
  const fireflies = [];
  let mistSprite = null;
  let latestEnv = null;

  function ensureAtmosphere() {
    if (!mistSprite && typeof document !== "undefined") {
      const size = 256;
      const cv = document.createElement("canvas");
      cv.width = size;
      cv.height = size;
      const g = cv.getContext("2d");
      if (g) {
        const c = size * 0.5;
        const grad = g.createRadialGradient(c, c, c * 0.05, c, c, c);
        grad.addColorStop(0, "rgba(170, 212, 168, 1)");
        grad.addColorStop(1, "rgba(170, 212, 168, 0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, size, size);
      }
      mistSprite = cv;
    }
    if (mistBands.length === 0) {
      const rng = M.mulberry32(73109);
      for (let i = 0; i < 6; i++) {
        mistBands.push({
          x: rng(),
          y: 0.08 + (i / 6) * 0.85,
          w: 0.38 + rng() * 0.34,
          h: 0.16 + rng() * 0.14,
          spd: 0.009 + rng() * 0.015,
        });
      }
      for (let i = 0; i < 26; i++) {
        fireflies.push({
          x: rng(),
          y: rng(),
          vx: (rng() - 0.5) * 0.025,
          vy: (rng() - 0.5) * 0.02,
          phase: rng() * Math.PI * 2,
          r: 1.6 + rng() * 1.8,
        });
      }
    }
  }

  function reset() {
    chunkStates.clear();
    if (M.puddles && typeof M.puddles.reset === "function") M.puddles.reset();
    if (M.melon && typeof M.melon.reset === "function") M.melon.reset();
    if (M.puyos && typeof M.puyos.reset === "function") M.puyos.reset();
    if (M.tentacles && typeof M.tentacles.reset === "function") M.tentacles.reset();
    if (M.octopus && typeof M.octopus.reset === "function") M.octopus.reset();
  }

  function onUnload() {
    if (M.loading && typeof M.loading.hide === "function") M.loading.hide();
    if (M.parallax25D && typeof M.parallax25D.detach === "function") M.parallax25D.detach();
    reset();
  }

  function pruneOldChunks(env) {
    if (!env || !env.chunks) return;
    for (const key of chunkStates.keys()) {
      if (!env.chunks.has(key)) {
        chunkStates.delete(key);
      }
    }
  }

  function buildActorParams(actorId, baseParams, env) {
    const cfg = env && typeof env.getActorConfig === "function" ? env.getActorConfig(actorId) : null;
    if (env && typeof env.getActorConfig === "function" && env.hasActorCatalog && !cfg) {
      return { enabled: false, density: 0, sampleTerritory: M.sampleTerritory };
    }
    if (cfg && cfg._enabled === false) {
      return { enabled: false, density: 0, sampleTerritory: M.sampleTerritory };
    }
    const out = Object.assign({}, baseParams, { sampleTerritory: M.sampleTerritory });
    if (cfg) {
      out.enabled = true;
      if (cfg._density !== undefined) out.density = cfg._density;
      if (cfg.hp !== undefined) out.hp = cfg.hp;
      if (cfg.speed !== undefined) out.speed = cfg.speed;
      if (cfg.scale !== undefined) out.scale = cfg.scale;
      if (cfg.aggroRadius !== undefined) out.aggroRadius = cfg.aggroRadius;
      if (cfg.attackRate !== undefined) out.attackRate = cfg.attackRate;
      if (cfg.minSeparation !== undefined) out.minSeparation = cfg.minSeparation;
      if (cfg._overrides && cfg._overrides.tint) out.tintOverride = cfg._overrides.tint;
    }
    return out;
  }

  function generateChunk(cx, cy, env) {
    if (env && env.dryRun) {
      const CHUNK_SIZE = env.CHUNK_SIZE || 512;
      const seed = env.worldSeed || 314159;
      const terrainRng = M.chunkRng(seed, cx, cy, 11);
      const terrain = M.terrain.generateTerrainData(cx, cy, env, terrainRng);
      return {
        cx,
        cy,
        ox: cx * CHUNK_SIZE,
        oy: cy * CHUNK_SIZE,
        generator: GENERATOR_ID,
        pickups: terrain.pickups,
      };
    }
    latestEnv = env;
    if (M.parallax25D && typeof M.parallax25D.attach === "function") {
      M.parallax25D.attach(chunkStates, () => latestEnv);
    }
    const CHUNK_SIZE = env.CHUNK_SIZE || 512;
    const ox = cx * CHUNK_SIZE;
    const oy = cy * CHUNK_SIZE;
    const seed = env.worldSeed || 314159;
    const params = M.getParams(env);
    const key = cx + "," + cy;

    const terrainRng = M.chunkRng(seed, cx, cy, 11);
    const terrain = M.terrain.generateTerrainData(cx, cy, env, terrainRng);

    // Partage des emplacements occupés pour éviter tout chevauchement anarchique
    const placedSpots = [];
    for (const col of terrain.colliders) {
      M.registerSpot(placedSpots, col.x, col.y, col.r);
    }

    const tentacleMod = (window.AssemblageActors && window.AssemblageActors["plante_tentacule"]) || M.tentacles;
    const octopusMod = (window.AssemblageActors && window.AssemblageActors["poulpe_marcheur"]) || M.octopus;
    const puyoMod = (window.AssemblageActors && window.AssemblageActors["troupe_puyos"]) || M.puyos;
    const tentacleParams = buildActorParams("plante_tentacule", params, env);
    const octopusParams = buildActorParams("poulpe_marcheur", params, env);
    const puyoParams = buildActorParams("troupe_puyos", params, env);

    const state = {
      key,
      cx,
      cy,
      melons: M.melon.spawnChunkMelons(cx, cy, env, M.chunkRng(seed, cx, cy, 37), params, placedSpots),
      puddles: M.puddles.spawnChunkPuddles(cx, cy, env, M.chunkRng(seed, cx, cy, 23), params, placedSpots),
      tentacles: (tentacleMod && tentacleParams.enabled !== false) ? tentacleMod.spawnChunkTentacles(cx, cy, env, M.chunkRng(seed, cx, cy, 53), tentacleParams, placedSpots) : [],
      vines: M.vines.spawnChunkVines(cx, cy, env, M.chunkRng(seed, cx, cy, 103), params, placedSpots),
      octopuses: (octopusMod && octopusParams.enabled !== false) ? octopusMod.spawnChunkOctopuses(cx, cy, env, M.chunkRng(seed, cx, cy, 71), octopusParams, placedSpots) : [],
      puyos: (puyoMod && puyoParams.enabled !== false) ? puyoMod.spawnChunkPuyos(cx, cy, env, M.chunkRng(seed, cx, cy, 89), puyoParams, placedSpots) : [],
    };
    chunkStates.set(key, state);

    return {
      cx,
      cy,
      ox,
      oy,
      generator: GENERATOR_ID,
      theme: env.theme || "marais",
      accent: env.accentRgb || [155, 229, 100],
      subCount: terrain.subCount,
      subSize: terrain.subSize,
      tiles: terrain.tiles,
      craters: terrain.craters,
      rocks: terrain.rocks,
      crystals: terrain.crystals,
      flora: terrain.flora,
      pickups: terrain.pickups,
      colliders: terrain.colliders,
    };
  }

  function drawChunk(ctx, ch, env) {
    M.terrain.drawTerrainChunk(ctx, ch, env);
  }

  function is25DActive() {
    const p25d = window.AssemblageRuntime && window.AssemblageRuntime.parallax25d;
    return Boolean((p25d && p25d.isActive()) || window.Assemblage25DActive);
  }

  function drawWorldBefore(ctx, timeSec, env) {
    M.puddles.drawPuddlesGround(ctx, timeSec, env, chunkStates);
    if (!is25DActive()) {
      M.melon.drawMelons(ctx, timeSec, env, chunkStates);
    }
  }

  function drawWorldAfter(ctx, timeSec, env) {
    if (is25DActive()) return;
    M.puyos.drawPuyos(ctx, timeSec, env, chunkStates);
    M.octopus.drawOctopuses(ctx, timeSec, env, chunkStates);
    M.tentacles.drawTentacles(ctx, timeSec, env, chunkStates);
    M.vines.drawVines(ctx, env, chunkStates);
    M.puddles.drawSolidBubbles(ctx, timeSec);
    M.tentacles.drawEyeProjectiles(ctx);
  }

  function update(dt, timeSec, env) {
    latestEnv = env;
    if (M.parallax25D && typeof M.parallax25D.attach === "function") {
      M.parallax25D.attach(chunkStates, () => latestEnv);
    }
    pruneOldChunks(env);
    ensureAtmosphere();
    const params = M.getParams(env);

    M.puddles.updatePuddles(dt, timeSec, env, chunkStates);
    M.melon.updateMelons(dt, timeSec, env, chunkStates);
    M.tentacles.updateTentacles(dt, timeSec, env, chunkStates, buildActorParams("plante_tentacule", params, env));
    M.octopus.updateOctopuses(dt, timeSec, env, chunkStates, buildActorParams("poulpe_marcheur", params, env));
    M.puyos.updatePuyos(dt, timeSec, env, chunkStates);
    M.vines.updateVines(dt, timeSec, env, chunkStates, params);

    const wind = params.maraisWindStrength;
    for (const m of mistBands) {
      m.x += dt * m.spd * (0.45 + wind * 0.55);
      if (m.x > 1.38) m.x = -0.38;
    }
    for (const ff of fireflies) {
      ff.x = (ff.x + (ff.vx + Math.sin(timeSec + ff.phase) * 0.008 * wind) * dt + 1) % 1;
      ff.y = (ff.y + (ff.vy + Math.cos(timeSec * 0.9 + ff.phase) * 0.008) * dt + 1) % 1;
    }
  }

  function drawOverlay(ctx, viewW, viewH, timeSec, env) {
    ensureAtmosphere();
    const params = M.getParams(env);
    const mist = params.maraisMistIntensity;
    if (mist <= 0.01) return;

    ctx.save();
    const mistAlpha = M.clamp(mist * 0.22, 0, 0.25);
    if (mistSprite) {
      ctx.globalAlpha = mistAlpha;
      for (let i = 0; i < mistBands.length; i++) {
        const m = mistBands[i];
        const cx = m.x * viewW;
        const cy = m.y * viewH;
        const rx = m.w * viewW * 0.5;
        const ry = m.h * viewH * 0.5;
        if (cx + rx < 0 || cx - rx > viewW || cy + ry < 0 || cy - ry > viewH) continue;
        ctx.drawImage(mistSprite, cx - rx, cy - ry, rx * 2, ry * 2);
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = `rgba(170, 212, 168, ${(mistAlpha * 0.45).toFixed(3)})`;
      for (let i = 0; i < mistBands.length; i++) {
        const m = mistBands[i];
        const cx = m.x * viewW;
        const cy = m.y * viewH;
        const rx = m.w * viewW * 0.5;
        const ry = m.h * viewH * 0.5;
        if (cx + rx < 0 || cx - rx > viewW || cy + ry < 0 || cy - ry > viewH) continue;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Regroupement des lucioles en 3 niveaux d'opacité (3 draw calls au lieu de 26)
    const baseAlpha = M.clamp(mist + 0.25, 0.2, 0.75);
    ctx.fillStyle = "#b6f880";
    for (let b = 0; b < 3; b++) {
      const bucketAlpha = (0.33 + b * 0.31) * baseAlpha;
      ctx.globalAlpha = bucketAlpha;
      ctx.beginPath();
      let hasAny = false;
      for (let i = 0; i < fireflies.length; i++) {
        const ff = fireflies[i];
        const pulse = 0.5 + 0.5 * Math.sin(timeSec * 3.2 + ff.phase);
        const bucket = pulse < 0.34 ? 0 : (pulse < 0.68 ? 1 : 2);
        if (bucket !== b) continue;
        const fx = ff.x * viewW;
        const fy = ff.y * viewH;
        ctx.moveTo(fx + ff.r, fy);
        ctx.arc(fx, fy, ff.r, 0, Math.PI * 2);
        hasAny = true;
      }
      if (hasAny) ctx.fill();
    }
    ctx.restore();
  }

  function onPointerDown(wx, wy, sx, sy, touchId, env) {
    return M.melon.handlePointerDown(wx, wy, chunkStates);
  }

  function onPointerMove(wx, wy, sx, sy, env) {
    return M.melon.handlePointerMove(wx, wy);
  }

  function onPointerUp(env) {
    return M.melon.handlePointerUp();
  }

  function notifyCreatureDamaged(env, kind, actorId, x, y, dmg, kx, ky, killed, remote = false) {
    const e = env || latestEnv;
    if (e && typeof e.emitActorDamaged === "function") {
      e.emitActorDamaged({ kind, actorId, x, y, dmg, kx: kx || 0, ky: ky || 0, killed: Boolean(killed), remote: Boolean(remote) });
    }
    if (killed && !remote && e && typeof e.onActorKilled === "function") {
      e.onActorKilled(actorId, x, y);
    }
  }

  function onProjectileHit(wx, wy, radius, env, opts = null) {
    if (opts && opts.remote) {
      for (const st of chunkStates.values()) {
        for (const oct of st.octopuses) {
          if (Math.hypot(wx - oct.x, wy - (oct.y - oct.bodyHeight * 0.5)) <= oct.bodyR + radius + 6) return true;
        }
        for (const p of st.tentacles) {
          const dBase = Math.hypot(wx - p.x, wy - (p.y - 22 * p.scale));
          const dTip = Math.hypot(wx - (p.eyeX || p.x), wy - (p.eyeY || (p.y - 48 * p.scale)));
          if (Math.min(dBase, dTip) <= 22 * p.scale + radius + 6) return true;
        }
        for (const pu of st.puyos) {
          if (Math.hypot(wx - pu.x, wy - (pu.y - pu.z - pu.r * 0.35)) <= pu.r + radius + 6) return true;
        }
      }
      return false;
    }
    const dmg = Number(opts && opts.damage) > 0 ? Number(opts.damage) : (radius >= 10 ? 35 : 15);
    if (M.octopus && typeof M.octopus.damageAt === "function") {
      const rOct = M.octopus.damageAt(wx, wy, radius, dmg, chunkStates);
      const hitOct = typeof rOct === "object" ? Boolean(rOct && rOct.hit) : Boolean(rOct);
      if (hitOct) {
        notifyCreatureDamaged(env, "octopus", "poulpe_marcheur", rOct.x ?? wx, rOct.y ?? wy, dmg, 0, 0, Boolean(rOct && rOct.killed));
        return true;
      }
    }
    if (M.tentacles && typeof M.tentacles.damageAt === "function") {
      const rTent = M.tentacles.damageAt(wx, wy, radius, dmg, chunkStates);
      if (rTent && rTent.hit) {
        notifyCreatureDamaged(env, "tentacle", "plante_tentacule", rTent.x ?? wx, rTent.y ?? wy, dmg, 0, 0, rTent.killed);
        return true;
      }
    }
    if (M.puyos && typeof M.puyos.damageAt === "function") {
      const rPuyo = M.puyos.damageAt(wx, wy, radius, dmg, chunkStates);
      if (rPuyo && rPuyo.hit) {
        notifyCreatureDamaged(env, "puyo", "troupe_puyos", rPuyo.x ?? wx, rPuyo.y ?? wy, dmg, 0, 0, rPuyo.killed);
        return true;
      }
    }
    return false;
  }

  function getCreatures() {
    const out = [];
    for (const st of chunkStates.values()) {
      if (Array.isArray(st.octopuses)) {
        for (const oct of st.octopuses) {
          out.push({
            kind: "octopus",
            actorId: "poulpe_marcheur",
            ref: oct,
            chunkState: st,
            x: oct.x,
            y: oct.y,
            r: oct.bodyR || 20,
            hp: oct.hp,
            maxHp: oct.maxHp,
            hostile: oct.state === "attack" || oct.hp >= oct.maxHp * 0.5,
          });
        }
      }
      if (Array.isArray(st.puyos)) {
        for (const p of st.puyos) {
          out.push({
            kind: "puyo",
            actorId: "troupe_puyos",
            ref: p,
            chunkState: st,
            x: p.x,
            y: p.y,
            r: p.r || 15,
            hp: p.hp ?? 30,
            maxHp: p.maxHp ?? 30,
            hostile: p.state === "approach",
          });
        }
      }
      if (Array.isArray(st.tentacles)) {
        for (const t of st.tentacles) {
          out.push({
            kind: "tentacle",
            actorId: "plante_tentacule",
            ref: t,
            chunkState: st,
            x: t.x,
            y: t.y,
            r: 20 * (t.scale || 1),
            hp: t.hp ?? 45,
            maxHp: t.maxHp ?? 45,
            hostile: Boolean(t.canSpit),
          });
        }
      }
    }
    return out;
  }

  function damageCreature(creature, dmg, knockX = 0, knockY = 0, opts = null) {
    if (!creature || !creature.ref || !creature.chunkState) return { hit: false, killed: false };
    const isRemote = Boolean(opts && opts.remote);
    const st = creature.chunkState;
    const ref = creature.ref;
    if (creature.kind === "octopus") {
      const idx = st.octopuses.indexOf(ref);
      if (idx < 0) return { hit: false, killed: false };
      const res = M.octopus && typeof M.octopus.applyDamageToOne === "function"
        ? M.octopus.applyDamageToOne(ref, dmg, knockX, knockY)
        : { hit: false, killed: false };
      const hit = Boolean(res && res.hit);
      const killed = Boolean((res && res.killed) || ref.hp <= 0);
      if (killed) st.octopuses.splice(idx, 1);
      if (hit) notifyCreatureDamaged(latestEnv, "octopus", "poulpe_marcheur", ref.x, ref.y, dmg, knockX, knockY, killed, isRemote);
      return { hit, killed };
    }
    if (creature.kind === "puyo" && M.puyos && typeof M.puyos.applyDamageToPuyo === "function") {
      const idx = st.puyos.indexOf(ref);
      if (idx < 0) return { hit: false, killed: false };
      const killed = M.puyos.applyDamageToPuyo(ref, st, idx, dmg, knockX, knockY);
      notifyCreatureDamaged(latestEnv, "puyo", "troupe_puyos", ref.x, ref.y, dmg, knockX, knockY, killed, isRemote);
      return { hit: true, killed };
    }
    if (creature.kind === "tentacle" && M.tentacles && typeof M.tentacles.applyDamageToTentacle === "function") {
      const idx = st.tentacles.indexOf(ref);
      if (idx < 0) return { hit: false, killed: false };
      const killed = M.tentacles.applyDamageToTentacle(ref, st, idx, dmg, knockX);
      notifyCreatureDamaged(latestEnv, "tentacle", "plante_tentacule", ref.x, ref.y, dmg, knockX, knockY, killed, isRemote);
      return { hit: true, killed };
    }
    return { hit: false, killed: false };
  }

  function deflectProjectilesAt(wx, wy, radius) {
    if (M.tentacles && typeof M.tentacles.deflectProjectilesAt === "function") {
      return M.tentacles.deflectProjectilesAt(wx, wy, radius);
    }
    return 0;
  }

  const generatorObj = {
    id: GENERATOR_ID,
    name: "Les Marais (Faune, Flore & Zones Tactiles)",
    description: "Marais vivants avec tentacules cracheurs d'yeux, poulpes marcheurs, puyos gélatineux, zones tactiles molles, lianes physiques et flaques à bulles.",
    nativeActorIds: ["poulpe_marcheur", "plante_tentacule", "troupe_puyos"],
    paramsSchema: M.PARAMS_SCHEMA,
    sampleBiome: M.terrain.sampleBiome,
    sampleElev: M.terrain.sampleElev,
    sampleDetail: M.terrain.sampleDetail,
    sampleGroundColor: M.terrain.sampleGroundColor,
    generateChunk,
    drawChunk,
    drawWorldBefore,
    drawWorldAfter,
    update,
    drawOverlay,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onProjectileHit,
    getCreatures,
    damageCreature,
    deflectProjectilesAt,
    reset,
    onUnload,
    showLoading: (biomeObj, statusText) => (M.loading ? M.loading.show(biomeObj, statusText) : Promise.resolve()),
    updateLoading: (statusText) => { if (M.loading) M.loading.update(statusText); },
    hideLoading: () => { if (M.loading) M.loading.hide(); },
    waitLoadingFrame: () => (M.loading ? M.loading.waitFrame() : Promise.resolve()),
    getChunkStates: () => chunkStates,
  };

  window.AssemblageBiomeGenerators = window.AssemblageBiomeGenerators || {};
  window.AssemblageBiomeGenerators[GENERATOR_ID] = generatorObj;
  window.AssemblageBiomeGenerators["biome_marais"] = generatorObj;
})();
