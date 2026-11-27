(function () {
  "use strict";
  const SP = window.StratPick = window.StratPick || {};

  let menuTab = "game";
  let pendingMode = "pick";
  let pendingObj = "koth";
  let pendingWallsEnabled = true;
  let pendingWallPattern = "symmetrical";
  let pendingWallDensity = 50;
  let pendingWallBlocks = true;
  let pendingWallDestruct = false;
  let pendingWallSeed = 0;
  let pendingTb = null;
  let pendingTbWeaponIdx = 0;
  let pendingPf = null;

  function setMenuTab(tabId) {
    const dom = SP.dom;
    menuTab = ["walls", "turn", "pathfind"].includes(tabId) ? tabId : "game";
    dom.tabMenuGame.classList.toggle("active", menuTab === "game");
    dom.tabMenuWalls.classList.toggle("active", menuTab === "walls");
    dom.tabMenuTurn.classList.toggle("active", menuTab === "turn");
    dom.tabMenuPathfind.classList.toggle("active", menuTab === "pathfind");
    dom.paneMenuGame.classList.toggle("hidden", menuTab !== "game");
    dom.paneMenuWalls.classList.toggle("hidden", menuTab !== "walls");
    dom.paneMenuTurn.classList.toggle("hidden", menuTab !== "turn");
    dom.paneMenuPathfind.classList.toggle("hidden", menuTab !== "pathfind");
    if (menuTab === "walls") {
      drawWallPreview();
    } else if (menuTab === "turn") {
      refreshTurnMenuUI();
    } else if (menuTab === "pathfind") {
      refreshPfMenuUI();
    }
  }

  function refreshTurnWeaponPreview() {
    const dom = SP.dom;
    const turnMod = SP.modes.turn;
    if (!pendingTb || !turnMod) return;
    const w = pendingTb.weapons[pendingTbWeaponIdx];
    const maxR = Math.max(1, Number(w.range) || 5);
    const tmpCfg = {
      tb_accuracy_curve: pendingTb.tb_accuracy_curve,
      tb_dist_falloff_mult: pendingTb.tb_dist_falloff_mult,
      tb_min_hit_chance: pendingTb.tb_min_hit_chance,
      tb_max_hit_chance: pendingTb.tb_max_hit_chance
    };
    const parts = [];
    for (let d = 1; d <= maxR; d++) {
      parts.push(`${d}c:${turnMod.calcHitChance(w, d, tmpCfg)}%`);
    }
    dom.lblTbWeaponPreview.textContent = `Aperçu ${w.short} : ${parts.join(" • ")}`;
  }

  function loadTurnWeaponEditor(idx) {
    const dom = SP.dom;
    if (!pendingTb) return;
    pendingTbWeaponIdx = SP.clamp(idx, 0, pendingTb.weapons.length - 1);
    dom.selTbWeapon.value = String(pendingTbWeaponIdx);
    const w = pendingTb.weapons[pendingTbWeaponIdx];
    dom.rngTbWDmg.value = w.damage; dom.lblTbWDmg.textContent = w.damage + " PV";
    dom.rngTbWRng.value = w.range; dom.lblTbWRng.textContent = w.range + " c";
    dom.rngTbWOpt.value = w.optimal_range; dom.lblTbWOpt.textContent = w.optimal_range + " c";
    dom.rngTbWAcc.value = w.base_acc; dom.lblTbWAcc.textContent = w.base_acc + "%";
    dom.rngTbWFall.value = w.falloff; dom.lblTbWFall.textContent = w.falloff + "%";
    dom.rngTbWClose.value = w.close_penalty; dom.lblTbWClose.textContent = w.close_penalty + "%";
    dom.rngTbWCost.value = w.shoot_cost; dom.lblTbWCost.textContent = w.shoot_cost + " PA";
    refreshTurnWeaponPreview();
  }

  function refreshTurnMenuUI() {
    const dom = SP.dom;
    if (!pendingTb) return;
    dom.rngTbHp.value = pendingTb.tb_unit_hp; dom.lblTbHp.textContent = pendingTb.tb_unit_hp + " PV";
    dom.selTbMap.value = pendingTb.tb_map_layout;
    dom.rngTbAiSpd.value = pendingTb.tb_ai_speed; dom.lblTbAiSpd.textContent = pendingTb.tb_ai_speed.toFixed(2) + "x";
    dom.selTbApMode.value = pendingTb.tb_ap_mode;
    const isPool = pendingTb.tb_ap_mode === "pool";
    dom.rowTbApPool.classList.toggle("hidden", !isPool);
    dom.rowTbApUnit.classList.toggle("hidden", isPool);
    dom.rngTbApPool.value = pendingTb.tb_ap_pool; dom.lblTbApPool.textContent = pendingTb.tb_ap_pool + " PA";
    dom.rngTbApUnit.value = pendingTb.tb_ap_per_unit; dom.lblTbApUnit.textContent = pendingTb.tb_ap_per_unit + " PA";
    dom.rngTbCarry.value = pendingTb.tb_ap_carryover; dom.lblTbCarry.textContent = pendingTb.tb_ap_carryover + " PA";
    dom.rngTbMoveCost.value = pendingTb.tb_move_cost; dom.lblTbMoveCost.textContent = pendingTb.tb_move_cost + " PA";
    dom.rngTbShootCost.value = pendingTb.tb_shoot_cost; dom.lblTbShootCost.textContent = pendingTb.tb_shoot_cost + " PA";
    dom.chkTbCustomCost.checked = pendingTb.tb_weapon_custom_cost;
    dom.rngTbShootCost.disabled = pendingTb.tb_weapon_custom_cost;
    dom.rngTbWCost.disabled = !pendingTb.tb_weapon_custom_cost;
    dom.chkTbAutoEnd.checked = pendingTb.tb_auto_end_turn;
    dom.chkTbDiagLimit.checked = pendingTb.tb_diag_limit_one;
    dom.selTbCurve.value = pendingTb.tb_accuracy_curve;
    dom.rngTbFallMult.value = pendingTb.tb_dist_falloff_mult; dom.lblTbFallMult.textContent = pendingTb.tb_dist_falloff_mult.toFixed(1) + "x";
    dom.rngTbMinHit.value = pendingTb.tb_min_hit_chance; dom.lblTbMinHit.textContent = pendingTb.tb_min_hit_chance + "%";
    dom.rngTbMaxHit.value = pendingTb.tb_max_hit_chance; dom.lblTbMaxHit.textContent = pendingTb.tb_max_hit_chance + "%";
    loadTurnWeaponEditor(pendingTbWeaponIdx);
  }

  function drawPreviewBase(pctx, pw, ph) {
    const ap = SP.activeParams;
    pctx.fillStyle = ap.arena_bg_color;
    pctx.fillRect(0, 0, pw, ph);

    const aRgb = SP.hexToRgbStr(ap.ai_color);
    const pRgb = SP.hexToRgbStr(ap.player_color);
    pctx.fillStyle = `rgba(${aRgb}, 0.22)`;
    pctx.fillRect(0, 0, pw, ph * 0.13);
    pctx.fillStyle = `rgba(${pRgb}, 0.22)`;
    pctx.fillRect(0, ph * 0.87, pw, ph * 0.13);

    pctx.strokeStyle = "rgba(255,255,255,0.12)";
    pctx.lineWidth = 1;
    pctx.beginPath(); pctx.moveTo(0, ph * 0.5); pctx.lineTo(pw, ph * 0.5); pctx.stroke();

    pctx.strokeStyle = "rgba(255, 214, 56, 0.55)";
    pctx.lineWidth = 1.4;
    if (pendingObj === "koth") {
      pctx.beginPath(); pctx.arc(pw * 0.5, ph * 0.5, Math.min(pw, ph) * 0.16, 0, Math.PI * 2); pctx.stroke();
    } else if (pendingObj === "domination") {
      for (const [zx, zy] of [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]]) {
        pctx.beginPath(); pctx.arc(pw * zx, ph * zy, Math.min(pw, ph) * 0.10, 0, Math.PI * 2); pctx.stroke();
      }
    } else if (pendingObj === "escort") {
      pctx.beginPath(); pctx.moveTo(pw * 0.5, ph * 0.15); pctx.lineTo(pw * 0.5, ph * 0.85); pctx.stroke();
    }
  }

  function drawWallPreview() {
    const dom = SP.dom;
    const ap = SP.activeParams;
    const st = SP.state;
    const pw = dom.wallPreviewCanvas.width;
    const ph = dom.wallPreviewCanvas.height;
    const pctx = dom.wallPreviewCtx;
    drawPreviewBase(pctx, pw, ph);

    if (pendingWallsEnabled) {
      const seedToUse = pendingWallSeed > 0 ? pendingWallSeed : st.currentMapSeed;
      const norms = SP.walls.buildWallNorms(pendingWallPattern, pendingWallDensity, pendingObj, seedToUse);
      pctx.fillStyle = SP.lightenHex(ap.wall_color, 0.15);
      pctx.strokeStyle = SP.lightenHex(ap.wall_color, 0.45);
      pctx.lineWidth = 1;
      for (const nr of norms) {
        const rx = nr.nx * pw;
        const ry = nr.ny * ph;
        const rw = Math.max(4, nr.nw * pw);
        const rh = Math.max(4, nr.nh * ph);
        pctx.fillRect(rx, ry, rw, rh);
        pctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
      }
    }
  }

  function drawRockPreview() {
    const dom = SP.dom;
    const pfMod = SP.modes.pathfind;
    if (!pendingPf || !pfMod || !dom.pfRockPreviewCanvas) return;
    const pw = dom.pfRockPreviewCanvas.width;
    const ph = dom.pfRockPreviewCanvas.height;
    const pctx = dom.pfRockPreviewCtx;
    drawPreviewBase(pctx, pw, ph);

    const seedToUse = pendingPf.pf_rock_seed > 0 ? pendingPf.pf_rock_seed : pfMod.state.currentRockSeed;
    const rocks = pfMod.buildRockNorms(pendingPf.pf_rock_style, pendingPf.pf_rock_density, pendingObj, seedToUse);
    pfMod.rebuildRockPolygons(rocks, { x: 0, y: 0, w: pw, h: ph });
    pfMod.renderRocks(pctx, rocks, 2);
  }

  function refreshPfMenuUI() {
    const dom = SP.dom;
    const pfMod = SP.modes.pathfind;
    if (!pendingPf) return;
    dom.rngPfPUnits.value = pendingPf.pf_player_units;
    dom.lblPfPUnits.textContent = pendingPf.pf_player_units + " u";
    dom.rngPfAUnits.value = pendingPf.pf_ai_units;
    dom.lblPfAUnits.textContent = pendingPf.pf_ai_units + " u";
    dom.selPfRockStyle.value = pendingPf.pf_rock_style;
    dom.rngPfRockDens.value = pendingPf.pf_rock_density;
    dom.lblPfRockDens.textContent = pendingPf.pf_rock_density + "%";
    dom.rngPfHp.value = pendingPf.pf_unit_hp;
    dom.lblPfHp.textContent = pendingPf.pf_unit_hp + " PV";
    dom.rngPfSpeed.value = pendingPf.pf_unit_speed;
    dom.lblPfSpeed.textContent = pendingPf.pf_unit_speed + " px/s";
    dom.rngPfRange.value = pendingPf.pf_shoot_range;
    dom.lblPfRange.textContent = pendingPf.pf_shoot_range + " px";
    dom.chkPfRockBlocks.checked = pendingPf.pf_rocks_block_bullets;
    dom.chkPfRespawn.checked = pendingPf.pf_respawn_enabled;
    const seedShown = pendingPf.pf_rock_seed > 0 ? pendingPf.pf_rock_seed : (pfMod ? pfMod.state.currentRockSeed : 2026);
    dom.lblPfRockSeed.textContent = "Graine #" + seedShown;
    drawRockPreview();
  }

  function refreshGameMenuUI() {
    const dom = SP.dom;
    const st = SP.state;
    const isPick = pendingMode === "pick";
    const isGlide = pendingMode === "glide";
    const isTurn = pendingMode === "turn";
    const isPf = pendingMode === "pathfind";
    dom.btnMenuPick.classList.toggle("active", isPick);
    dom.btnMenuGlide.classList.toggle("active", isGlide);
    dom.btnMenuTurn.classList.toggle("active", isTurn);
    dom.btnMenuPathfind.classList.toggle("active", isPf);
    dom.menuObjSection.classList.toggle("hidden", isTurn);
    dom.menuTurnSummaryBox.classList.toggle("hidden", !isTurn);
    dom.menuPfSummaryBox.classList.toggle("hidden", !isPf);

    for (const btn of dom.menuObjButtons) {
      btn.classList.toggle("active", btn.dataset.obj === pendingObj);
    }
    const info = SP.OBJECTIVES[pendingObj] || SP.OBJECTIVES.koth;
    dom.menuObjDesc.textContent = info.desc;

    dom.chkMenuWallsEnabled.checked = pendingWallsEnabled;
    dom.menuWallsBody.classList.toggle("disabled", !pendingWallsEnabled);
    for (const btn of dom.menuWallPatButtons) {
      btn.classList.toggle("active", btn.dataset.pat === pendingWallPattern);
    }
    const patInfo = SP.WALL_PATTERNS[pendingWallPattern] || SP.WALL_PATTERNS.symmetrical;
    dom.menuWallDesc.textContent = patInfo.desc;
    dom.rngMenuWallDensity.value = String(pendingWallDensity);
    dom.lblMenuWallDensity.textContent = `${pendingWallDensity}%`;
    dom.chkMenuWallBlocks.checked = pendingWallBlocks;
    dom.chkMenuWallDestruct.checked = pendingWallDestruct;
    dom.lblMenuWallSeed.textContent = `Graine #${pendingWallSeed > 0 ? pendingWallSeed : st.currentMapSeed}`;
    drawWallPreview();
    drawRockPreview();
  }

  function openGameMenu(initialTab) {
    const st = SP.state;
    const ap = SP.activeParams;
    const dom = SP.dom;
    const pfMod = SP.modes.pathfind;
    if (st.externalPaused || st.destroyed || !ap.allow_mode_switch) return;
    st.menuOpen = true;
    st.isTouching = false;
    st.activePointerId = null;
    if (SP.modes.pick && SP.modes.pick.resetInput) SP.modes.pick.resetInput();
    if (SP.modes.glide && SP.modes.glide.resetInput) SP.modes.glide.resetInput();
    if (pfMod && pfMod.resetInput) pfMod.resetInput();

    pendingMode = st.gameMode;
    pendingObj = st.objId;
    pendingWallsEnabled = ap.walls_enabled;
    pendingWallPattern = ap.wall_pattern;
    pendingWallDensity = ap.wall_density;
    pendingWallBlocks = ap.wall_blocks_bullets;
    pendingWallDestruct = ap.wall_destructible;
    pendingWallSeed = ap.wall_seed > 0 ? ap.wall_seed : st.currentMapSeed;

    pendingTb = {
      tb_unit_hp: ap.tb_unit_hp,
      tb_map_layout: ap.tb_map_layout,
      tb_ai_speed: ap.tb_ai_speed,
      tb_ap_mode: ap.tb_ap_mode,
      tb_ap_pool: ap.tb_ap_pool,
      tb_ap_per_unit: ap.tb_ap_per_unit,
      tb_ap_carryover: ap.tb_ap_carryover,
      tb_move_cost: ap.tb_move_cost,
      tb_shoot_cost: ap.tb_shoot_cost,
      tb_weapon_custom_cost: ap.tb_weapon_custom_cost,
      tb_auto_end_turn: ap.tb_auto_end_turn,
      tb_diag_limit_one: ap.tb_diag_limit_one,
      tb_accuracy_curve: ap.tb_accuracy_curve,
      tb_dist_falloff_mult: ap.tb_dist_falloff_mult,
      tb_min_hit_chance: ap.tb_min_hit_chance,
      tb_max_hit_chance: ap.tb_max_hit_chance,
      weapons: ap.tb_weapons.map((w) => Object.assign({}, w))
    };

    pendingPf = {
      pf_player_units: ap.pf_player_units,
      pf_ai_units: ap.pf_ai_units,
      pf_rock_style: ap.pf_rock_style,
      pf_rock_density: ap.pf_rock_density,
      pf_rock_seed: ap.pf_rock_seed > 0 ? ap.pf_rock_seed : (pfMod ? pfMod.state.currentRockSeed : 2026),
      pf_rocks_block_bullets: ap.pf_rocks_block_bullets,
      pf_unit_hp: ap.pf_unit_hp,
      pf_unit_speed: ap.pf_unit_speed,
      pf_shoot_range: ap.pf_shoot_range,
      pf_respawn_enabled: ap.pf_respawn_enabled
    };

    dom.selTbWeapon.innerHTML = "";
    pendingTb.weapons.forEach((w, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `Unité #${i + 1} — ${w.name}`;
      dom.selTbWeapon.appendChild(opt);
    });

    const autoTab = st.gameMode === "turn" ? "turn" : (st.gameMode === "pathfind" ? "pathfind" : (menuTab || "game"));
    setMenuTab(initialTab || autoTab);
    refreshGameMenuUI();
    refreshTurnMenuUI();
    refreshPfMenuUI();
    dom.menuOverlay.classList.remove("hidden");
  }

  function closeGameMenu() {
    const st = SP.state;
    if (!st.menuOpen) return;
    st.menuOpen = false;
    SP.dom.menuOverlay.classList.add("hidden");
    st.lastTs = 0;
  }

  function applyGameMenu() {
    const st = SP.state;
    const ap = SP.activeParams;
    const pfMod = SP.modes.pathfind;
    const prevRockSeed = pfMod ? pfMod.state.currentRockSeed : 0;

    const objChanged = pendingObj !== st.objId;
    const modeChanged = pendingMode !== st.gameMode;
    const mapStructChanged = (
      pendingWallsEnabled !== ap.walls_enabled ||
      pendingWallPattern !== ap.wall_pattern ||
      pendingWallDensity !== ap.wall_density ||
      pendingWallSeed !== st.currentMapSeed
    );
    const tbChanged = pendingTb && (
      pendingTb.tb_unit_hp !== ap.tb_unit_hp ||
      pendingTb.tb_map_layout !== ap.tb_map_layout ||
      pendingTb.tb_ai_speed !== ap.tb_ai_speed ||
      pendingTb.tb_ap_mode !== ap.tb_ap_mode ||
      pendingTb.tb_ap_pool !== ap.tb_ap_pool ||
      pendingTb.tb_ap_per_unit !== ap.tb_ap_per_unit ||
      pendingTb.tb_ap_carryover !== ap.tb_ap_carryover ||
      pendingTb.tb_move_cost !== ap.tb_move_cost ||
      pendingTb.tb_shoot_cost !== ap.tb_shoot_cost ||
      pendingTb.tb_weapon_custom_cost !== ap.tb_weapon_custom_cost ||
      pendingTb.tb_auto_end_turn !== ap.tb_auto_end_turn ||
      pendingTb.tb_diag_limit_one !== ap.tb_diag_limit_one ||
      pendingTb.tb_accuracy_curve !== ap.tb_accuracy_curve ||
      pendingTb.tb_dist_falloff_mult !== ap.tb_dist_falloff_mult ||
      pendingTb.tb_min_hit_chance !== ap.tb_min_hit_chance ||
      pendingTb.tb_max_hit_chance !== ap.tb_max_hit_chance ||
      JSON.stringify(pendingTb.weapons) !== JSON.stringify(ap.tb_weapons)
    );
    const pfChanged = pendingPf && (
      pendingPf.pf_player_units !== ap.pf_player_units ||
      pendingPf.pf_ai_units !== ap.pf_ai_units ||
      pendingPf.pf_rock_style !== ap.pf_rock_style ||
      pendingPf.pf_rock_density !== ap.pf_rock_density ||
      pendingPf.pf_rock_seed !== prevRockSeed ||
      pendingPf.pf_unit_hp !== ap.pf_unit_hp
    );

    ap.game_mode = pendingMode;
    ap.objective = pendingObj;
    ap.walls_enabled = pendingWallsEnabled;
    ap.wall_pattern = pendingWallPattern;
    ap.wall_density = pendingWallDensity;
    ap.wall_blocks_bullets = pendingWallBlocks;
    ap.wall_destructible = pendingWallDestruct;

    if (pendingTb) {
      ap.tb_unit_hp = pendingTb.tb_unit_hp;
      ap.tb_map_layout = pendingTb.tb_map_layout;
      ap.tb_ai_speed = pendingTb.tb_ai_speed;
      ap.tb_ap_mode = pendingTb.tb_ap_mode;
      ap.tb_ap_pool = pendingTb.tb_ap_pool;
      ap.tb_ap_per_unit = pendingTb.tb_ap_per_unit;
      ap.tb_ap_carryover = pendingTb.tb_ap_carryover;
      ap.tb_move_cost = pendingTb.tb_move_cost;
      ap.tb_shoot_cost = pendingTb.tb_shoot_cost;
      ap.tb_weapon_custom_cost = pendingTb.tb_weapon_custom_cost;
      ap.tb_auto_end_turn = pendingTb.tb_auto_end_turn;
      ap.tb_diag_limit_one = pendingTb.tb_diag_limit_one;
      ap.tb_accuracy_curve = pendingTb.tb_accuracy_curve;
      ap.tb_dist_falloff_mult = pendingTb.tb_dist_falloff_mult;
      ap.tb_min_hit_chance = pendingTb.tb_min_hit_chance;
      ap.tb_max_hit_chance = pendingTb.tb_max_hit_chance;
      ap.tb_weapons = pendingTb.weapons.map((w) => Object.assign({}, w));
    }

    if (pendingPf) {
      ap.pf_player_units = pendingPf.pf_player_units;
      ap.pf_ai_units = pendingPf.pf_ai_units;
      ap.pf_rock_style = pendingPf.pf_rock_style;
      ap.pf_rock_density = pendingPf.pf_rock_density;
      ap.pf_rocks_block_bullets = pendingPf.pf_rocks_block_bullets;
      ap.pf_unit_hp = pendingPf.pf_unit_hp;
      ap.pf_unit_speed = pendingPf.pf_unit_speed;
      ap.pf_shoot_range = pendingPf.pf_shoot_range;
      ap.pf_respawn_enabled = pendingPf.pf_respawn_enabled;
      if (pendingPf.pf_rock_seed > 0 && pendingPf.pf_rock_seed !== prevRockSeed) {
        ap.pf_rock_seed = pendingPf.pf_rock_seed;
      } else if (!pfChanged && ap.pf_rock_seed <= 0) {
        ap.pf_rock_seed = 0;
      } else if (pfChanged && pendingPf.pf_rock_seed > 0) {
        ap.pf_rock_seed = pendingPf.pf_rock_seed;
      }
    }

    if (pendingWallSeed > 0 && pendingWallSeed !== st.currentMapSeed) {
      ap.wall_seed = pendingWallSeed;
    } else if (!mapStructChanged && ap.wall_seed <= 0) {
      ap.wall_seed = 0;
    } else if (mapStructChanged && pendingWallSeed > 0) {
      ap.wall_seed = pendingWallSeed;
    }

    st.lastAppliedSig = JSON.stringify(ap);
    closeGameMenu();
    if (pendingMode === "turn" && (modeChanged || tbChanged)) {
      SP.startMatch();
    } else if (pendingMode === "pathfind" && (modeChanged || pfChanged || objChanged)) {
      SP.startMatch();
    } else if (objChanged || mapStructChanged || (modeChanged && (st.gameMode === "turn" || st.gameMode === "pathfind"))) {
      SP.startMatch();
    } else if (modeChanged) {
      SP.setGameMode(pendingMode);
      SP.render();
    } else {
      SP.render();
    }
  }

  function wireMenuEvents() {
    const dom = SP.dom;
    dom.btnGameMenu.addEventListener("click", () => openGameMenu("game"));
    dom.btnTbMenu.addEventListener("click", () => openGameMenu("turn"));
    dom.btnPfMenu.addEventListener("click", () => openGameMenu("pathfind"));
    dom.tabMenuGame.addEventListener("click", () => setMenuTab("game"));
    dom.tabMenuWalls.addEventListener("click", () => setMenuTab("walls"));
    dom.tabMenuTurn.addEventListener("click", () => setMenuTab("turn"));
    dom.tabMenuPathfind.addEventListener("click", () => setMenuTab("pathfind"));
    dom.btnJumpTurnTab.addEventListener("click", () => setMenuTab("turn"));
    dom.btnJumpPfTab.addEventListener("click", () => setMenuTab("pathfind"));
    dom.btnMenuClose.addEventListener("click", closeGameMenu);
    dom.btnMenuApply.addEventListener("click", applyGameMenu);
    dom.menuOverlay.addEventListener("click", (e) => {
      if (e.target === dom.menuOverlay) closeGameMenu();
    });

    dom.btnMenuPick.addEventListener("click", () => { pendingMode = "pick"; refreshGameMenuUI(); });
    dom.btnMenuGlide.addEventListener("click", () => { pendingMode = "glide"; refreshGameMenuUI(); });
    dom.btnMenuTurn.addEventListener("click", () => { pendingMode = "turn"; refreshGameMenuUI(); });
    dom.btnMenuPathfind.addEventListener("click", () => { pendingMode = "pathfind"; refreshGameMenuUI(); });

    for (const btn of dom.menuObjButtons) {
      btn.addEventListener("click", () => {
        const id = btn.dataset.obj;
        if (SP.OBJECTIVES[id]) { pendingObj = id; refreshGameMenuUI(); }
      });
    }

    dom.chkMenuWallsEnabled.addEventListener("change", () => { pendingWallsEnabled = dom.chkMenuWallsEnabled.checked; refreshGameMenuUI(); });
    for (const btn of dom.menuWallPatButtons) {
      btn.addEventListener("click", () => {
        const pat = btn.dataset.pat;
        if (SP.WALL_PATTERNS[pat]) {
          pendingWallPattern = pat;
          pendingWallSeed = SP.resolveSeedInt(0);
          refreshGameMenuUI();
        }
      });
    }
    dom.rngMenuWallDensity.addEventListener("input", () => { pendingWallDensity = Number(dom.rngMenuWallDensity.value) || 50; refreshGameMenuUI(); });
    dom.chkMenuWallBlocks.addEventListener("change", () => { pendingWallBlocks = dom.chkMenuWallBlocks.checked; });
    dom.chkMenuWallDestruct.addEventListener("change", () => { pendingWallDestruct = dom.chkMenuWallDestruct.checked; });
    dom.btnMenuRollMap.addEventListener("click", () => { pendingWallSeed = SP.resolveSeedInt(0); refreshGameMenuUI(); });

    // Turn-based controls
    dom.rngTbHp.addEventListener("input", () => { if (pendingTb) { pendingTb.tb_unit_hp = Number(dom.rngTbHp.value); dom.lblTbHp.textContent = pendingTb.tb_unit_hp + " PV"; } });
    dom.selTbMap.addEventListener("change", () => { if (pendingTb) pendingTb.tb_map_layout = dom.selTbMap.value; });
    dom.rngTbAiSpd.addEventListener("input", () => { if (pendingTb) { pendingTb.tb_ai_speed = Number(dom.rngTbAiSpd.value); dom.lblTbAiSpd.textContent = pendingTb.tb_ai_speed.toFixed(2) + "x"; } });
    dom.selTbApMode.addEventListener("change", () => { if (pendingTb) { pendingTb.tb_ap_mode = dom.selTbApMode.value; refreshTurnMenuUI(); } });
    dom.rngTbApPool.addEventListener("input", () => { if (pendingTb) { pendingTb.tb_ap_pool = Number(dom.rngTbApPool.value); dom.lblTbApPool.textContent = pendingTb.tb_ap_pool + " PA"; } });
    dom.rngTbApUnit.addEventListener("input", () => { if (pendingTb) { pendingTb.tb_ap_per_unit = Number(dom.rngTbApUnit.value); dom.lblTbApUnit.textContent = pendingTb.tb_ap_per_unit + " PA"; } });
    dom.rngTbCarry.addEventListener("input", () => { if (pendingTb) { pendingTb.tb_ap_carryover = Number(dom.rngTbCarry.value); dom.lblTbCarry.textContent = pendingTb.tb_ap_carryover + " PA"; } });
    dom.rngTbMoveCost.addEventListener("input", () => { if (pendingTb) { pendingTb.tb_move_cost = Number(dom.rngTbMoveCost.value); dom.lblTbMoveCost.textContent = pendingTb.tb_move_cost + " PA"; } });
    dom.rngTbShootCost.addEventListener("input", () => { if (pendingTb) { pendingTb.tb_shoot_cost = Number(dom.rngTbShootCost.value); dom.lblTbShootCost.textContent = pendingTb.tb_shoot_cost + " PA"; } });
    dom.chkTbCustomCost.addEventListener("change", () => { if (pendingTb) { pendingTb.tb_weapon_custom_cost = dom.chkTbCustomCost.checked; refreshTurnMenuUI(); } });
    dom.chkTbAutoEnd.addEventListener("change", () => { if (pendingTb) pendingTb.tb_auto_end_turn = dom.chkTbAutoEnd.checked; });
    dom.chkTbDiagLimit.addEventListener("change", () => { if (pendingTb) pendingTb.tb_diag_limit_one = dom.chkTbDiagLimit.checked; });
    dom.selTbCurve.addEventListener("change", () => { if (pendingTb) { pendingTb.tb_accuracy_curve = dom.selTbCurve.value; refreshTurnWeaponPreview(); } });
    dom.rngTbFallMult.addEventListener("input", () => { if (pendingTb) { pendingTb.tb_dist_falloff_mult = Number(dom.rngTbFallMult.value); dom.lblTbFallMult.textContent = pendingTb.tb_dist_falloff_mult.toFixed(1) + "x"; refreshTurnWeaponPreview(); } });
    dom.rngTbMinHit.addEventListener("input", () => { if (pendingTb) { pendingTb.tb_min_hit_chance = Number(dom.rngTbMinHit.value); dom.lblTbMinHit.textContent = pendingTb.tb_min_hit_chance + "%"; refreshTurnWeaponPreview(); } });
    dom.rngTbMaxHit.addEventListener("input", () => { if (pendingTb) { pendingTb.tb_max_hit_chance = Number(dom.rngTbMaxHit.value); dom.lblTbMaxHit.textContent = pendingTb.tb_max_hit_chance + "%"; refreshTurnWeaponPreview(); } });
    dom.selTbWeapon.addEventListener("change", () => loadTurnWeaponEditor(Number(dom.selTbWeapon.value) || 0));
    dom.rngTbWDmg.addEventListener("input", () => { if (pendingTb) { pendingTb.weapons[pendingTbWeaponIdx].damage = Number(dom.rngTbWDmg.value); dom.lblTbWDmg.textContent = dom.rngTbWDmg.value + " PV"; } });
    dom.rngTbWRng.addEventListener("input", () => { if (pendingTb) { pendingTb.weapons[pendingTbWeaponIdx].range = Number(dom.rngTbWRng.value); dom.lblTbWRng.textContent = dom.rngTbWRng.value + " c"; refreshTurnWeaponPreview(); } });
    dom.rngTbWOpt.addEventListener("input", () => { if (pendingTb) { pendingTb.weapons[pendingTbWeaponIdx].optimal_range = Number(dom.rngTbWOpt.value); dom.lblTbWOpt.textContent = dom.rngTbWOpt.value + " c"; refreshTurnWeaponPreview(); } });
    dom.rngTbWAcc.addEventListener("input", () => { if (pendingTb) { pendingTb.weapons[pendingTbWeaponIdx].base_acc = Number(dom.rngTbWAcc.value); dom.lblTbWAcc.textContent = dom.rngTbWAcc.value + "%"; refreshTurnWeaponPreview(); } });
    dom.rngTbWFall.addEventListener("input", () => { if (pendingTb) { pendingTb.weapons[pendingTbWeaponIdx].falloff = Number(dom.rngTbWFall.value); dom.lblTbWFall.textContent = dom.rngTbWFall.value + "%"; refreshTurnWeaponPreview(); } });
    dom.rngTbWClose.addEventListener("input", () => { if (pendingTb) { pendingTb.weapons[pendingTbWeaponIdx].close_penalty = Number(dom.rngTbWClose.value); dom.lblTbWClose.textContent = dom.rngTbWClose.value + "%"; refreshTurnWeaponPreview(); } });
    dom.rngTbWCost.addEventListener("input", () => { if (pendingTb) { pendingTb.weapons[pendingTbWeaponIdx].shoot_cost = Number(dom.rngTbWCost.value); dom.lblTbWCost.textContent = dom.rngTbWCost.value + " PA"; } });

    // Pathfind controls
    dom.rngPfPUnits.addEventListener("input", () => { if (pendingPf) { pendingPf.pf_player_units = Number(dom.rngPfPUnits.value); dom.lblPfPUnits.textContent = pendingPf.pf_player_units + " u"; } });
    dom.rngPfAUnits.addEventListener("input", () => { if (pendingPf) { pendingPf.pf_ai_units = Number(dom.rngPfAUnits.value); dom.lblPfAUnits.textContent = pendingPf.pf_ai_units + " u"; } });
    dom.selPfRockStyle.addEventListener("change", () => { if (pendingPf) { pendingPf.pf_rock_style = dom.selPfRockStyle.value; refreshPfMenuUI(); } });
    dom.rngPfRockDens.addEventListener("input", () => { if (pendingPf) { pendingPf.pf_rock_density = Number(dom.rngPfRockDens.value); refreshPfMenuUI(); } });
    dom.btnPfRollRocks.addEventListener("click", () => { if (pendingPf) { pendingPf.pf_rock_seed = SP.resolveSeedInt(0); refreshPfMenuUI(); } });
    dom.rngPfHp.addEventListener("input", () => { if (pendingPf) { pendingPf.pf_unit_hp = Number(dom.rngPfHp.value); dom.lblPfHp.textContent = pendingPf.pf_unit_hp + " PV"; } });
    dom.rngPfSpeed.addEventListener("input", () => { if (pendingPf) { pendingPf.pf_unit_speed = Number(dom.rngPfSpeed.value); dom.lblPfSpeed.textContent = pendingPf.pf_unit_speed + " px/s"; } });
    dom.rngPfRange.addEventListener("input", () => { if (pendingPf) { pendingPf.pf_shoot_range = Number(dom.rngPfRange.value); dom.lblPfRange.textContent = pendingPf.pf_shoot_range + " px"; } });
    dom.chkPfRockBlocks.addEventListener("change", () => { if (pendingPf) pendingPf.pf_rocks_block_bullets = dom.chkPfRockBlocks.checked; });
    dom.chkPfRespawn.addEventListener("change", () => { if (pendingPf) pendingPf.pf_respawn_enabled = dom.chkPfRespawn.checked; });
  }

  SP.menu = {
    openGameMenu,
    closeGameMenu,
    applyGameMenu,
    setMenuTab,
    wireMenuEvents
  };
})();
