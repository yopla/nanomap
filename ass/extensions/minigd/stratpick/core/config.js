(function () {
  "use strict";
  const SP = window.StratPick = window.StratPick || {};
  SP.modes = SP.modes || {};

  const params = new URLSearchParams(window.location.search);

  SP.GAME_ID = "stratpick";
  SP.TEAM_PLAYER = 0;
  SP.TEAM_AI = 1;
  SP.UNIT_RADIUS = 12;
  SP.BULLET_SPEED = 390;

  SP.DEFAULT_PARAMS = {
    game_mode: "pick",
    objective: "koth",
    match_duration: 45,
    hand_capacity: 6,
    player_units: 10,
    ai_units: 10,
    respawn_enabled: true,
    respawn_delay: 4.0,
    ai_difficulty: "normal",
    ai_style: "balanced",
    unit_hp: 100,
    fire_rate: 1.6,
    unit_speed: 62,
    shoot_range: 165,
    bullet_damage: 18,
    pickup_radius: 60,
    drop_interval: 0.13,
    sound_enabled: true,
    allow_mode_switch: true,
    player_color: "#33b8ff",
    ai_color: "#ff5761",
    arena_bg_color: "#1f293b",
    walls_enabled: true,
    wall_pattern: "symmetrical",
    wall_density: 50,
    wall_blocks_bullets: true,
    wall_destructible: false,
    wall_hp: 160,
    wall_seed: 0,
    wall_color: "#4a607a",
    tb_unit_hp: 100,
    tb_map_layout: "bunker",
    tb_ap_mode: "pool",
    tb_ap_pool: 6,
    tb_ap_per_unit: 3,
    tb_ap_carryover: 0,
    tb_move_cost: 1,
    tb_shoot_cost: 2,
    tb_weapon_custom_cost: true,
    tb_auto_end_turn: true,
    tb_diag_limit_one: true,
    tb_accuracy_curve: "linear",
    tb_dist_falloff_mult: 1.0,
    tb_min_hit_chance: 10,
    tb_max_hit_chance: 95,
    tb_ai_speed: 1.0,
    tb_weapons: [
      { id: "assault", name: "Fusil d'assaut", short: "FUSIL", damage: 35, range: 6, optimal_range: 3, base_acc: 88, falloff: 9, close_penalty: 0, shoot_cost: 2 },
      { id: "shotgun", name: "Fusil à pompe", short: "POMPE", damage: 55, range: 4, optimal_range: 1, base_acc: 95, falloff: 22, close_penalty: 0, shoot_cost: 2 },
      { id: "sniper", name: "Sniper", short: "SNIPER", damage: 50, range: 9, optimal_range: 6, base_acc: 92, falloff: 4, close_penalty: 18, shoot_cost: 3 },
      { id: "smg", name: "Mitraillette", short: "PM", damage: 26, range: 5, optimal_range: 2, base_acc: 85, falloff: 13, close_penalty: 0, shoot_cost: 1 }
    ],
    pf_player_units: 28,
    pf_ai_units: 28,
    pf_rock_style: "canyon",
    pf_rock_density: 50,
    pf_rock_seed: 0,
    pf_rocks_block_bullets: true,
    pf_unit_hp: 80,
    pf_unit_speed: 78,
    pf_shoot_range: 135,
    pf_respawn_enabled: false
  };

  SP.DEFAULT_TEXTS = {
    modePickLabel: "🤏 PICK",
    modeGlideLabel: "🏹 GLIDE",
    modeTurnLabel: "♟ TOUR",
    modePathfindLabel: "🧭 PATHFIND",
    glidePlayButtonLabel: "▶ PLAY",
    victoryTitle: "VICTOIRE !",
    defeatTitle: "DÉFAITE !",
    drawTitle: "ÉGALITÉ !",
    timeoutTitle: "Temps écoulé !",
    replayButtonLabel: "↻ REJOUER",
    returnButtonLabel: "← RETOUR AU JEU",
    endReturnHint: "Cliquez pour revenir au jeu principal"
  };

  SP.OBJECTIVES = {
    elimination: {
      name: "Élimination",
      desc: "Éliminez un maximum de bonhommes adverses avant la fin du temps !"
    },
    koth: {
      name: "Roi de la Colline",
      desc: "Contrôlez la zone centrale avec plus d'unités que l'IA pour marquer des points."
    },
    domination: {
      name: "3 Zones (Domination)",
      desc: "Capturez et tenez les 3 zones tactiques (A, B, C) pour accumuler des points."
    },
    escort: {
      name: "Escorte du Convoi",
      desc: "Placez vos bonhommes près du convoi pour le pousser vers la base ennemie (en haut) !"
    },
    coin_rush: {
      name: "Chasse aux Étoiles",
      desc: "Des étoiles dorées apparaissent dans l'arène : lâchez vos bonhommes dessus !"
    }
  };

  SP.WALL_PATTERNS = {
    symmetrical: {
      name: "Symétrique",
      desc: "Couvertures en miroir central à 180° pour une équité tactique parfaite."
    },
    bunkers: {
      name: "Bunkers",
      desc: "Abris en U/L orientés vers le centre pour protéger vos tireurs."
    },
    pillars: {
      name: "Piliers",
      desc: "Colonnes en quinconce créant des lignes de tir croisées et des esquives."
    },
    maze: {
      name: "Labyrinthe",
      desc: "Couloirs ouverts et brèches multiples favorisant l'infiltration et le mode Glide."
    },
    fortress: {
      name: "Forteresses",
      desc: "Remparts crénelés devant chaque base avec brèches d'assaut."
    },
    chokepoints: {
      name: "Goulets",
      desc: "Lignes transversales percées de passages étroits à contrôler."
    },
    random: {
      name: "Aléatoire",
      desc: "Tire au sort un style de construction différent à chaque nouvelle carte."
    }
  };

  SP.PF_ROCK_STYLES = {
    canyon: {
      name: "Canyon",
      desc: "Crêtes rocheuses irrégulières formant plusieurs passes sinueuses vers le centre."
    },
    archipelago: {
      name: "Archipel",
      desc: "Massifs rocheux arrondis et contourables pour manœuvrer vos groupes en tenaille."
    },
    craters: {
      name: "Cratères",
      desc: "Anneaux d'éperons rocheux brisés protégeant les flancs et approches centrales."
    },
    scattered: {
      name: "Éboulis",
      desc: "Rochers organiques dispersés de tailles variées sans murs rectangulaires."
    },
    random: {
      name: "Aléatoire",
      desc: "Choisit une formation géologique différente à chaque carte."
    }
  };

  SP.activeParams = Object.assign({}, SP.DEFAULT_PARAMS, {
    tb_weapons: SP.DEFAULT_PARAMS.tb_weapons.map((w) => Object.assign({}, w))
  });
  SP.activeTexts = Object.assign({}, SP.DEFAULT_TEXTS);

  SP.state = {
    externalPaused: params.get("minigd_paused") === "1",
    isEmbedded: params.get("minigd_embedded") === "1",
    isFullFrame: params.get("minigd_fullframe") === "1",
    activeOwnExit: false,
    destroyed: false,
    rafId: null,
    lastTs: 0,
    matchHasTicked: false,
    lastAppliedSig: "",
    gameMode: SP.DEFAULT_PARAMS.game_mode,
    objId: SP.DEFAULT_PARAMS.objective,
    objInfo: SP.OBJECTIVES[SP.DEFAULT_PARAMS.objective],
    menuOpen: false,
    currentMapSeed: 1337,
    walls: [],
    soundEnabled: SP.DEFAULT_PARAMS.sound_enabled,
    viewW: 480,
    viewH: 640,
    arena: { x: 12, y: 12, w: 456, h: 616 },
    running: false,
    matchEnded: false,
    timeLeft: SP.DEFAULT_PARAMS.match_duration,
    playerScore: 0,
    aiScore: 0,
    playerKills: 0,
    aiKills: 0,
    animTime: 0,
    units: [],
    bullets: [],
    particles: [],
    trails: [],
    floatTexts: [],
    respawnQueue: [],
    zones: [],
    stars: [],
    starTimer: 0,
    payloadProgress: 0.5,
    payloadPos: { x: 240, y: 320 },
    isTouching: false,
    activePointerId: null,
    touchPos: { x: 0, y: 0 },
    aiActionTimer: 1.5,
    aiTelFrom: { x: 0, y: 0 },
    aiTelTo: { x: 0, y: 0 },
    aiTelTimer: 0,
    lastHudSync: 0
  };

  if (SP.state.isFullFrame && typeof document !== "undefined" && document.body) {
    document.body.classList.add("minigd-fullframe");
  }

  // Math, Seed & Color Helpers
  SP.clamp = function (v, mn, mx) { return Math.max(mn, Math.min(mx, v)); };
  SP.clampNum = function (val, lo, hi, fallback) {
    const n = Number(val);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
  };
  SP.randRange = function (a, b) { return a + Math.random() * (b - a); };
  SP.dist2 = function (ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  SP.dist = function (ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); };
  SP.formatTime = function (s) {
    const sec = Math.max(0, Math.ceil(s));
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  };

  SP.normalizeHex = function (raw, fallback) {
    const s = String(raw || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
    if (/^#[0-9a-fA-F]{3}$/.test(s)) return "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return fallback;
  };
  SP.hexToRgb = function (hex) {
    const h = SP.normalizeHex(hex, "#33b8ff").slice(1);
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  };
  SP.hexToRgbStr = function (hex) {
    const c = SP.hexToRgb(hex);
    return c.r + "," + c.g + "," + c.b;
  };
  SP.darkenHex = function (hex, factor) {
    const c = SP.hexToRgb(hex);
    const f = Math.max(0, Math.min(1, factor));
    const r = Math.round(c.r * f);
    const g = Math.round(c.g * f);
    const b = Math.round(c.b * f);
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  };
  SP.lightenHex = function (hex, mixWhite) {
    const c = SP.hexToRgb(hex);
    const m = Math.max(0, Math.min(1, mixWhite));
    const r = Math.round(c.r + (255 - c.r) * m);
    const g = Math.round(c.g + (255 - c.g) * m);
    const b = Math.round(c.b + (255 - c.b) * m);
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  };

  SP.mulberry32 = function (seed) {
    let a = (Number(seed) || 1) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  SP.resolveSeedInt = function (explicitSeed) {
    const s = Math.round(Number(explicitSeed) || 0);
    if (s > 0) return s;
    return Math.floor(1 + Math.random() * 99998);
  };

  SP.readMeta = function () {
    const el = typeof document !== "undefined" ? document.querySelector("script[data-spawn-minigame]") : null;
    if (!el) return {};
    try { return JSON.parse(el.textContent || "{}") || {}; } catch (_e) { return {}; }
  };

  SP.applyVisualTheme = function () {
    const ap = SP.activeParams;
    const st = SP.state;
    const dom = SP.dom || {};
    const pCol = SP.normalizeHex(ap.player_color, SP.DEFAULT_PARAMS.player_color);
    const aCol = SP.normalizeHex(ap.ai_color, SP.DEFAULT_PARAMS.ai_color);
    const bgCol = SP.normalizeHex(ap.arena_bg_color, SP.DEFAULT_PARAMS.arena_bg_color);
    ap.player_color = pCol;
    ap.ai_color = aCol;
    ap.arena_bg_color = bgCol;

    if (typeof document !== "undefined") {
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty("--blue", pCol);
      rootStyle.setProperty("--blue-dark", SP.darkenHex(pCol, 0.48));
      rootStyle.setProperty("--red", aCol);
      rootStyle.setProperty("--red-dark", SP.darkenHex(aCol, 0.48));
      rootStyle.setProperty("--arena-bg", bgCol);
      document.body.classList.toggle("has-own-exit", st.activeOwnExit);
    }

    const showSwitch = Boolean(ap.allow_mode_switch);
    if (dom.btnGameMenu) dom.btnGameMenu.classList.toggle("hidden", !showSwitch);
    if (dom.btnTbMenu) dom.btnTbMenu.classList.toggle("hidden", !showSwitch);
    if (dom.btnPfMenu) dom.btnPfMenu.classList.toggle("hidden", !showSwitch);
    if (dom.startModeRowEl) dom.startModeRowEl.classList.toggle("hidden", !showSwitch);

    if (dom.btnExitTop) dom.btnExitTop.classList.toggle("visible", !st.isEmbedded || st.activeOwnExit);
    if (dom.btnEndReturn) dom.btnEndReturn.classList.toggle("hidden", !st.isEmbedded);
    if (dom.endHintEl) dom.endHintEl.classList.toggle("hidden", !st.isEmbedded);

    if (dom.btnMenuPick) dom.btnMenuPick.textContent = SP.activeTexts.modePickLabel;
    if (dom.btnMenuGlide) dom.btnMenuGlide.textContent = SP.activeTexts.modeGlideLabel;
    if (dom.btnMenuTurn) dom.btnMenuTurn.textContent = SP.activeTexts.modeTurnLabel;
    if (dom.btnMenuPathfind) dom.btnMenuPathfind.textContent = SP.activeTexts.modePathfindLabel;
    if (dom.btnStartPick) dom.btnStartPick.textContent = SP.activeTexts.modePickLabel;
    if (dom.btnStartGlide) dom.btnStartGlide.textContent = SP.activeTexts.modeGlideLabel;
    if (dom.btnStartTurn) dom.btnStartTurn.textContent = SP.activeTexts.modeTurnLabel;
    if (dom.btnStartPathfind) dom.btnStartPathfind.textContent = SP.activeTexts.modePathfindLabel;
    if (dom.btnGlidePlay) dom.btnGlidePlay.textContent = SP.activeTexts.glidePlayButtonLabel;
    if (dom.btnReplay) dom.btnReplay.textContent = SP.activeTexts.replayButtonLabel;
    if (dom.btnEndReturn) dom.btnEndReturn.textContent = SP.activeTexts.returnButtonLabel;
    if (dom.endHintEl) dom.endHintEl.textContent = SP.activeTexts.endReturnHint;
  };

  SP.normalizeModeId = function (raw) {
    const gm = String(raw || "").trim().toLowerCase();
    if (gm === "turn" || gm === "glide" || gm === "pathfind") return gm;
    return "pick";
  };

  SP.applyRuntimeConfig = function (initData) {
    if (!initData || typeof initData !== "object") return false;
    const st = SP.state;
    const ap = SP.activeParams;
    const defs = SP.DEFAULT_PARAMS;

    const m = (initData.meta && typeof initData.meta === "object") ? initData.meta : null;
    if (m && typeof m.ownExit === "boolean") st.activeOwnExit = m.ownExit;

    const p = (initData.params && typeof initData.params === "object")
      ? initData.params
      : ((initData.custom && typeof initData.custom === "object" && initData.custom.params)
        ? initData.custom.params
        : ((initData.custom && typeof initData.custom === "object") ? initData.custom : initData));

    if (p && typeof p === "object") {
      if (typeof p.game_mode === "string") ap.game_mode = SP.normalizeModeId(p.game_mode);
      if (typeof p.objective === "string") {
        const ob = p.objective.trim().toLowerCase();
        ap.objective = SP.OBJECTIVES[ob] ? ob : defs.objective;
      }
      ap.match_duration = Math.round(SP.clampNum(p.match_duration ?? ap.match_duration, 15, 180, defs.match_duration));
      ap.hand_capacity = Math.round(SP.clampNum(p.hand_capacity ?? ap.hand_capacity, 1, 15, defs.hand_capacity));
      ap.player_units = Math.round(SP.clampNum(p.player_units ?? ap.player_units, 2, 30, defs.player_units));
      ap.ai_units = Math.round(SP.clampNum(p.ai_units ?? ap.ai_units, 2, 30, defs.ai_units));
      if (typeof p.respawn_enabled === "boolean") ap.respawn_enabled = p.respawn_enabled;
      ap.respawn_delay = SP.clampNum(p.respawn_delay ?? ap.respawn_delay, 1.0, 12.0, defs.respawn_delay);
      if (typeof p.ai_difficulty === "string") {
        const d = p.ai_difficulty.trim().toLowerCase();
        if (["easy", "normal", "hard", "expert"].includes(d)) ap.ai_difficulty = d;
      }
      if (typeof p.ai_style === "string") {
        const stl = p.ai_style.trim().toLowerCase();
        if (["balanced", "aggressive", "objective"].includes(stl)) ap.ai_style = stl;
      }
      ap.unit_hp = Math.round(SP.clampNum(p.unit_hp ?? ap.unit_hp, 30, 300, defs.unit_hp));
      ap.fire_rate = SP.clampNum(p.fire_rate ?? ap.fire_rate, 0.4, 4.0, defs.fire_rate);
      ap.unit_speed = SP.clampNum(p.unit_speed ?? ap.unit_speed, 25, 140, defs.unit_speed);
      ap.shoot_range = Math.round(SP.clampNum(p.shoot_range ?? ap.shoot_range, 80, 320, defs.shoot_range));
      ap.bullet_damage = Math.round(SP.clampNum(p.bullet_damage ?? ap.bullet_damage, 5, 60, defs.bullet_damage));
      ap.pickup_radius = Math.round(SP.clampNum(p.pickup_radius ?? ap.pickup_radius, 30, 120, defs.pickup_radius));
      ap.drop_interval = SP.clampNum(p.drop_interval ?? ap.drop_interval, 0.05, 0.40, defs.drop_interval);
      if (typeof p.sound_enabled === "boolean") {
        ap.sound_enabled = p.sound_enabled;
        st.soundEnabled = p.sound_enabled;
      }
      if (typeof p.allow_mode_switch === "boolean") ap.allow_mode_switch = p.allow_mode_switch;
      if (typeof p.player_color === "string" && p.player_color.trim()) ap.player_color = p.player_color.trim();
      if (typeof p.ai_color === "string" && p.ai_color.trim()) ap.ai_color = p.ai_color.trim();
      if (typeof p.arena_bg_color === "string" && p.arena_bg_color.trim()) ap.arena_bg_color = p.arena_bg_color.trim();
      if (typeof p.walls_enabled === "boolean") ap.walls_enabled = p.walls_enabled;
      if (typeof p.wall_pattern === "string") {
        const wp = p.wall_pattern.trim().toLowerCase();
        if (SP.WALL_PATTERNS[wp]) ap.wall_pattern = wp;
      }
      ap.wall_density = Math.round(SP.clampNum(p.wall_density ?? ap.wall_density, 15, 100, defs.wall_density));
      if (typeof p.wall_blocks_bullets === "boolean") ap.wall_blocks_bullets = p.wall_blocks_bullets;
      if (typeof p.wall_destructible === "boolean") ap.wall_destructible = p.wall_destructible;
      ap.wall_hp = Math.round(SP.clampNum(p.wall_hp ?? ap.wall_hp, 40, 400, defs.wall_hp));
      ap.wall_seed = Math.round(SP.clampNum(p.wall_seed ?? ap.wall_seed, 0, 99999, defs.wall_seed));
      if (typeof p.wall_color === "string" && p.wall_color.trim()) ap.wall_color = SP.normalizeHex(p.wall_color, defs.wall_color);

      ap.tb_unit_hp = Math.round(SP.clampNum(p.tb_unit_hp ?? ap.tb_unit_hp, 40, 250, defs.tb_unit_hp));
      if (typeof p.tb_map_layout === "string") {
        const ml = p.tb_map_layout.trim().toLowerCase();
        if (["bunker", "corridors", "arena", "random"].includes(ml)) ap.tb_map_layout = ml;
      }
      if (typeof p.tb_ap_mode === "string") {
        const am = p.tb_ap_mode.trim().toLowerCase();
        if (["pool", "per_unit"].includes(am)) ap.tb_ap_mode = am;
      }
      ap.tb_ap_pool = Math.round(SP.clampNum(p.tb_ap_pool ?? ap.tb_ap_pool, 3, 12, defs.tb_ap_pool));
      ap.tb_ap_per_unit = Math.round(SP.clampNum(p.tb_ap_per_unit ?? ap.tb_ap_per_unit, 2, 6, defs.tb_ap_per_unit));
      ap.tb_ap_carryover = Math.round(SP.clampNum(p.tb_ap_carryover ?? ap.tb_ap_carryover, 0, 4, defs.tb_ap_carryover));
      ap.tb_move_cost = Math.round(SP.clampNum(p.tb_move_cost ?? ap.tb_move_cost, 1, 3, defs.tb_move_cost));
      ap.tb_shoot_cost = Math.round(SP.clampNum(p.tb_shoot_cost ?? ap.tb_shoot_cost, 1, 4, defs.tb_shoot_cost));
      if (typeof p.tb_weapon_custom_cost === "boolean") ap.tb_weapon_custom_cost = p.tb_weapon_custom_cost;
      if (typeof p.tb_auto_end_turn === "boolean") ap.tb_auto_end_turn = p.tb_auto_end_turn;
      if (typeof p.tb_diag_limit_one === "boolean") ap.tb_diag_limit_one = p.tb_diag_limit_one;
      if (typeof p.tb_accuracy_curve === "string") {
        const ac = p.tb_accuracy_curve.trim().toLowerCase();
        if (["linear", "steep", "optimal_band", "soft"].includes(ac)) ap.tb_accuracy_curve = ac;
      }
      ap.tb_dist_falloff_mult = SP.clampNum(p.tb_dist_falloff_mult ?? ap.tb_dist_falloff_mult, 0.2, 2.0, defs.tb_dist_falloff_mult);
      ap.tb_min_hit_chance = Math.round(SP.clampNum(p.tb_min_hit_chance ?? ap.tb_min_hit_chance, 5, 40, defs.tb_min_hit_chance));
      ap.tb_max_hit_chance = Math.round(SP.clampNum(p.tb_max_hit_chance ?? ap.tb_max_hit_chance, 75, 100, defs.tb_max_hit_chance));
      ap.tb_ai_speed = SP.clampNum(p.tb_ai_speed ?? ap.tb_ai_speed, 0.5, 2.0, defs.tb_ai_speed);
      if (Array.isArray(p.tb_weapons)) {
        ap.tb_weapons = defs.tb_weapons.map((def, i) =>
          Object.assign({}, def, (p.tb_weapons[i] && typeof p.tb_weapons[i] === "object") ? p.tb_weapons[i] : {})
        );
      }

      // Pathfind params
      ap.pf_player_units = Math.round(SP.clampNum(p.pf_player_units ?? ap.pf_player_units, 10, 60, defs.pf_player_units));
      ap.pf_ai_units = Math.round(SP.clampNum(p.pf_ai_units ?? ap.pf_ai_units, 10, 60, defs.pf_ai_units));
      if (typeof p.pf_rock_style === "string") {
        const rs = p.pf_rock_style.trim().toLowerCase();
        if (SP.PF_ROCK_STYLES[rs]) ap.pf_rock_style = rs;
      }
      ap.pf_rock_density = Math.round(SP.clampNum(p.pf_rock_density ?? ap.pf_rock_density, 15, 100, defs.pf_rock_density));
      ap.pf_rock_seed = Math.round(SP.clampNum(p.pf_rock_seed ?? ap.pf_rock_seed, 0, 999999, defs.pf_rock_seed));
      if (typeof p.pf_rocks_block_bullets === "boolean") ap.pf_rocks_block_bullets = p.pf_rocks_block_bullets;
      ap.pf_unit_hp = Math.round(SP.clampNum(p.pf_unit_hp ?? ap.pf_unit_hp, 30, 220, defs.pf_unit_hp));
      ap.pf_unit_speed = Math.round(SP.clampNum(p.pf_unit_speed ?? ap.pf_unit_speed, 35, 150, defs.pf_unit_speed));
      ap.pf_shoot_range = Math.round(SP.clampNum(p.pf_shoot_range ?? ap.pf_shoot_range, 60, 240, defs.pf_shoot_range));
      if (typeof p.pf_respawn_enabled === "boolean") ap.pf_respawn_enabled = p.pf_respawn_enabled;
    }

    const t = (initData.texts && typeof initData.texts === "object")
      ? initData.texts
      : ((initData.custom && typeof initData.custom === "object" && initData.custom.texts) ? initData.custom.texts : null);
    if (t && typeof t === "object") {
      for (const k of Object.keys(SP.DEFAULT_TEXTS)) {
        if (typeof t[k] === "string" && t[k].trim()) {
          SP.activeTexts[k] = t[k].trim();
        }
      }
    }

    st.objId = SP.OBJECTIVES[ap.objective] ? ap.objective : defs.objective;
    st.objInfo = SP.OBJECTIVES[st.objId];
    SP.applyVisualTheme();
    if (SP.audio) SP.audio.emitState();
    if (SP.modes.pick && SP.modes.pick.buildPips) SP.modes.pick.buildPips();

    const sig = JSON.stringify(ap);
    const changed = sig !== st.lastAppliedSig;
    st.lastAppliedSig = sig;
    return changed;
  };
})();
