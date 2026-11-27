(function () {
  "use strict";
  const SP = window.StratPick = window.StratPick || {};

  const $ = (id) => document.getElementById(id);
  const canvas = $("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  SP.ctx = ctx;

  const menuObjGrid = $("menuObjGrid");
  const menuWallPatGrid = $("menuWallPatGrid");
  const wallPreviewCanvas = $("wallPreviewCanvas");
  const pfRockPreviewCanvas = $("pfRockPreviewCanvas");

  SP.dom = {
    canvas,
    botBarEl: $("botBar"),
    turnBarEl: $("turnBar"),
    pfBarEl: $("pfBar"),
    twBarEl: $("twBar"),
    btnTbPrevUnit: $("btnTbPrevUnit"),
    tbUnitLbl: $("tbUnitLbl"),
    btnTbNextUnit: $("btnTbNextUnit"),
    btnTbPrevTgt: $("btnTbPrevTgt"),
    btnTbNextTgt: $("btnTbNextTgt"),
    btnTbUpLeft: $("btnTbUpLeft"),
    btnTbUp: $("btnTbUp"),
    btnTbUpRight: $("btnTbUpRight"),
    btnTbDownLeft: $("btnTbDownLeft"),
    btnTbDown: $("btnTbDown"),
    btnTbDownRight: $("btnTbDownRight"),
    btnTbLeft: $("btnTbLeft"),
    btnTbRight: $("btnTbRight"),
    tbMoveCostLbl: $("tbMoveCostLbl"),
    btnTbFire: $("btnTbFire"),
    btnTbEndTurn: $("btnTbEndTurn"),
    btnTbMenu: $("btnTbMenu"),
    btnTbRestart: $("btnTbRestart"),
    pfSelLbl: $("pfSelLbl"),
    btnPfAll: $("btnPfAll"),
    btnPfG1: $("btnPfG1"),
    btnPfG2: $("btnPfG2"),
    btnPfG3: $("btnPfG3"),
    btnPfSaveGrp: $("btnPfSaveGrp"),
    pfHintLbl: $("pfHintLbl"),
    btnPfStop: $("btnPfStop"),
    btnPfClear: $("btnPfClear"),
    btnPfMenu: $("btnPfMenu"),
    btnPfRestart: $("btnPfRestart"),
    twCountLbl: $("twCountLbl"),
    btnTwMg: $("btnTwMg"),
    btnTwSniper: $("btnTwSniper"),
    btnTwCannon: $("btnTwCannon"),
    twHintLbl: $("twHintLbl"),
    btnTwRecall: $("btnTwRecall"),
    btnTwMenu: $("btnTwMenu"),
    btnTwRestart: $("btnTwRestart"),
    btnGameMenu: $("btnGameMenu"),
    menuOverlay: $("menuOverlay"),
    tabMenuGame: $("tabMenuGame"),
    tabMenuWalls: $("tabMenuWalls"),
    tabMenuTurn: $("tabMenuTurn"),
    tabMenuPathfind: $("tabMenuPathfind"),
    tabMenuTower: $("tabMenuTower"),
    paneMenuGame: $("paneMenuGame"),
    paneMenuWalls: $("paneMenuWalls"),
    paneMenuTurn: $("paneMenuTurn"),
    paneMenuPathfind: $("paneMenuPathfind"),
    paneMenuTower: $("paneMenuTower"),
    btnMenuPick: $("btnMenuPick"),
    btnMenuGlide: $("btnMenuGlide"),
    btnMenuTurn: $("btnMenuTurn"),
    btnMenuPathfind: $("btnMenuPathfind"),
    btnMenuTower: $("btnMenuTower"),
    menuObjSection: $("menuObjSection"),
    menuTurnSummaryBox: $("menuTurnSummaryBox"),
    menuPfSummaryBox: $("menuPfSummaryBox"),
    menuTwSummaryBox: $("menuTwSummaryBox"),
    btnJumpTurnTab: $("btnJumpTurnTab"),
    btnJumpPfTab: $("btnJumpPfTab"),
    btnJumpTwTab: $("btnJumpTwTab"),
    rowMenuAimTurn: $("rowMenuAimTurn"),
    rngMenuAimTurn: $("rngMenuAimTurn"),
    lblMenuAimTurn: $("lblMenuAimTurn"),
    rngTbHp: $("rngTbHp"), lblTbHp: $("lblTbHp"),
    selTbMap: $("selTbMap"),
    rngTbAiSpd: $("rngTbAiSpd"), lblTbAiSpd: $("lblTbAiSpd"),
    selTbApMode: $("selTbApMode"),
    rowTbApPool: $("rowTbApPool"), rngTbApPool: $("rngTbApPool"), lblTbApPool: $("lblTbApPool"),
    rowTbApUnit: $("rowTbApUnit"), rngTbApUnit: $("rngTbApUnit"), lblTbApUnit: $("lblTbApUnit"),
    rngTbCarry: $("rngTbCarry"), lblTbCarry: $("lblTbCarry"),
    rngTbMoveCost: $("rngTbMoveCost"), lblTbMoveCost: $("lblTbMoveCost"),
    rngTbShootCost: $("rngTbShootCost"), lblTbShootCost: $("lblTbShootCost"),
    chkTbCustomCost: $("chkTbCustomCost"),
    chkTbAutoEnd: $("chkTbAutoEnd"),
    chkTbDiagLimit: $("chkTbDiagLimit"),
    selTbCurve: $("selTbCurve"),
    rngTbFallMult: $("rngTbFallMult"), lblTbFallMult: $("lblTbFallMult"),
    rngTbMinHit: $("rngTbMinHit"), lblTbMinHit: $("lblTbMinHit"),
    rngTbMaxHit: $("rngTbMaxHit"), lblTbMaxHit: $("lblTbMaxHit"),
    selTbWeapon: $("selTbWeapon"), lblTbWeaponPreview: $("lblTbWeaponPreview"),
    rngTbWDmg: $("rngTbWDmg"), lblTbWDmg: $("lblTbWDmg"),
    rngTbWRng: $("rngTbWRng"), lblTbWRng: $("lblTbWRng"),
    rngTbWOpt: $("rngTbWOpt"), lblTbWOpt: $("lblTbWOpt"),
    rngTbWAcc: $("rngTbWAcc"), lblTbWAcc: $("lblTbWAcc"),
    rngTbWFall: $("rngTbWFall"), lblTbWFall: $("lblTbWFall"),
    rngTbWClose: $("rngTbWClose"), lblTbWClose: $("lblTbWClose"),
    rngTbWCost: $("rngTbWCost"), lblTbWCost: $("lblTbWCost"),
    rngPfPUnits: $("rngPfPUnits"), lblPfPUnits: $("lblPfPUnits"),
    rngPfAUnits: $("rngPfAUnits"), lblPfAUnits: $("lblPfAUnits"),
    selPfRockStyle: $("selPfRockStyle"),
    rngPfRockDens: $("rngPfRockDens"), lblPfRockDens: $("lblPfRockDens"),
    pfRockPreviewCanvas,
    pfRockPreviewCtx: pfRockPreviewCanvas.getContext("2d"),
    btnPfRollRocks: $("btnPfRollRocks"),
    lblPfRockSeed: $("lblPfRockSeed"),
    rngPfHp: $("rngPfHp"), lblPfHp: $("lblPfHp"),
    rngPfSpeed: $("rngPfSpeed"), lblPfSpeed: $("lblPfSpeed"),
    rngPfRange: $("rngPfRange"), lblPfRange: $("lblPfRange"),
    chkPfRockBlocks: $("chkPfRockBlocks"),
    chkPfRespawn: $("chkPfRespawn"),
    selTwVariant: $("selTwVariant"), lblTwVariantDesc: $("lblTwVariantDesc"),
    rngTwMax: $("rngTwMax"), lblTwMax: $("lblTwMax"),
    rngTwRedeploy: $("rngTwRedeploy"), lblTwRedeploy: $("lblTwRedeploy"),
    rngTwHp: $("rngTwHp"), lblTwHp: $("lblTwHp"),
    rngTwSpacing: $("rngTwSpacing"), lblTwSpacing: $("lblTwSpacing"),
    rngTwRespawn: $("rngTwRespawn"), lblTwRespawn: $("lblTwRespawn"),
    rngTwBaseHp: $("rngTwBaseHp"), lblTwBaseHp: $("lblTwBaseHp"),
    rngTwWaveInt: $("rngTwWaveInt"), lblTwWaveInt: $("lblTwWaveInt"),
    menuObjGrid,
    menuObjButtons: Array.from(menuObjGrid.querySelectorAll(".obj-choice-btn")),
    menuObjDesc: $("menuObjDesc"),
    chkMenuWallsEnabled: $("chkMenuWallsEnabled"),
    menuWallsBody: $("menuWallsBody"),
    menuWallPatGrid,
    menuWallPatButtons: Array.from(menuWallPatGrid.querySelectorAll(".wall-pat-btn")),
    menuWallDesc: $("menuWallDesc"),
    rngMenuWallDensity: $("rngMenuWallDensity"),
    lblMenuWallDensity: $("lblMenuWallDensity"),
    chkMenuWallBlocks: $("chkMenuWallBlocks"),
    chkMenuWallDestruct: $("chkMenuWallDestruct"),
    wallPreviewCanvas,
    wallPreviewCtx: wallPreviewCanvas.getContext("2d"),
    btnMenuRollMap: $("btnMenuRollMap"),
    lblMenuWallSeed: $("lblMenuWallSeed"),
    btnMenuApply: $("btnMenuApply"),
    btnMenuClose: $("btnMenuClose"),
    startModeRowEl: $("startModeRow"),
    btnStartPick: $("btnStartPick"),
    btnStartGlide: $("btnStartGlide"),
    btnStartTurn: $("btnStartTurn"),
    btnStartPathfind: $("btnStartPathfind"),
    btnStartTower: $("btnStartTower"),
    btnGlidePlay: $("btnGlidePlay"),
    btnPickPause: $("btnPickPause"),
    pScoreEl: $("pScore"),
    aScoreEl: $("aScore"),
    timerEl: $("timer"),
    objBadgeEl: $("objBadge"),
    handLblEl: $("handLbl"),
    handPipsEl: $("handPips"),
    hintLblEl: $("hintLbl"),
    btnSound: $("btnSound"),
    btnExitTop: $("btnExitTop"),
    btnRestart: $("btnRestart"),
    startOverlay: $("startOverlay"),
    startTitleEl: $("startTitle"),
    startObjEl: $("startObj"),
    startDescEl: $("startDesc"),
    startHowEl: $("startHow"),
    btnPlay: $("btnPlay"),
    endOverlay: $("endOverlay"),
    endTitleEl: $("endTitle"),
    endReasonEl: $("endReason"),
    endStatsEl: $("endStats"),
    btnReplay: $("btnReplay"),
    btnEndReturn: $("btnEndReturn"),
    endHintEl: $("endHint")
  };

  function getCanvasPos(e) {
    const r = canvas.getBoundingClientRect();
    const st = SP.state;
    const sx = r.width > 0 && st.viewW > 0 ? st.viewW / r.width : 1;
    const sy = r.height > 0 && st.viewH > 0 ? st.viewH / r.height : 1;
    return {
      x: (e.clientX - r.left) * sx,
      y: (e.clientY - r.top) * sy
    };
  }

  function syncCanvasMetrics(force) {
    const st = SP.state;
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextW = Math.max(240, rect.width || window.innerWidth || 400);
    const nextH = Math.max(200, rect.height || window.innerHeight || 500);
    const targetW = Math.round(nextW * dpr);
    const targetH = Math.round(nextH * dpr);
    const changed = (
      Math.abs(nextW - (st.viewW || 0)) >= 0.5 ||
      Math.abs(nextH - (st.viewH || 0)) >= 0.5 ||
      dpr !== st._lastDpr ||
      canvas.width !== targetW ||
      canvas.height !== targetH
    );
    if (!force && !changed) return false;
    st.viewW = nextW;
    st.viewH = nextH;
    st._lastDpr = dpr;
    canvas.width = targetW;
    canvas.height = targetH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = 12;
    st.arena = { x: pad, y: pad, w: Math.max(180, st.viewW - pad * 2), h: Math.max(160, st.viewH - pad * 2) };
    SP.modes.turn.updateGridRect();
    return true;
  }

  function resize(force) {
    const st = SP.state;
    if (!syncCanvasMetrics(force)) return;

    if (st.gameMode === "turn") {
      SP.modes.turn.render(ctx);
      return;
    }
    if (st.gameMode === "pathfind") {
      SP.modes.pathfind.onResize();
      return;
    }
    if (st.gameMode === "tower") {
      SP.modes.tower.onResize();
      return;
    }

    if (!st.running && !st.matchHasTicked) {
      SP.arena.setupObjectiveLayout();
      SP.walls.rebuildWallRects(st.walls, st.arena);
      if (st.units.length > 0) {
        const pUnits = st.units.filter((u) => u.team === SP.TEAM_PLAYER);
        const aUnits = st.units.filter((u) => u.team === SP.TEAM_AI);
        pUnits.forEach((u, idx) => {
          const pos = SP.arena.getBaseSpawn(SP.TEAM_PLAYER, idx, pUnits.length);
          u.x = pos.x; u.y = pos.y;
        });
        aUnits.forEach((u, idx) => {
          const pos = SP.arena.getBaseSpawn(SP.TEAM_AI, idx, aUnits.length);
          u.x = pos.x; u.y = pos.y;
        });
      }
    } else {
      SP.walls.rebuildWallRects(st.walls, st.arena);
      SP.arena.resizeObjectiveLayout(SP.walls.pushOutOfWalls);
      for (const u of st.units) {
        const cp = SP.walls.pushOutOfWalls(u.x, u.y, SP.UNIT_RADIUS + 2);
        u.x = cp.x; u.y = cp.y;
      }
    }
    render();
  }

  function setGameMode(newMode) {
    const st = SP.state;
    const dom = SP.dom;
    st.gameMode = SP.normalizeModeId(newMode);
    const isPick = st.gameMode === "pick";
    const isGlide = st.gameMode === "glide";
    const isTurn = st.gameMode === "turn";
    const isPf = st.gameMode === "pathfind";
    const isTw = st.gameMode === "tower";

    dom.btnMenuPick.classList.toggle("active", isPick);
    dom.btnMenuGlide.classList.toggle("active", isGlide);
    dom.btnMenuTurn.classList.toggle("active", isTurn);
    dom.btnMenuPathfind.classList.toggle("active", isPf);
    dom.btnMenuTower.classList.toggle("active", isTw);

    dom.btnStartPick.classList.toggle("active", isPick);
    dom.btnStartGlide.classList.toggle("active", isGlide);
    dom.btnStartTurn.classList.toggle("active", isTurn);
    dom.btnStartPathfind.classList.toggle("active", isPf);
    dom.btnStartTower.classList.toggle("active", isTw);

    dom.botBarEl.classList.toggle("hidden", isTurn || isPf || isTw);
    dom.turnBarEl.classList.toggle("hidden", !isTurn);
    dom.pfBarEl.classList.toggle("hidden", !isPf);
    dom.twBarEl.classList.toggle("hidden", !isTw);

    if (isTurn) {
      SP.modes.pick.pickPaused = false;
      SP.modes.glide.glidePaused = false;
      SP.modes.turn.onEnter();
      return;
    }

    SP.modes.turn.state.running = false;
    dom.objBadgeEl.style.color = "";
    dom.startObjEl.textContent = `Objectif : ${st.objInfo.name} (${SP.activeParams.match_duration}s)`;
    dom.startDescEl.textContent = st.objInfo.desc;

    if (isTw) {
      SP.modes.pick.pickPaused = false;
      SP.modes.glide.glidePaused = false;
      SP.modes.tower.onEnter();
      SP.modes.tower.syncHud(true);
      return;
    }

    if (isPf) {
      SP.modes.pick.pickPaused = false;
      SP.modes.glide.glidePaused = false;
      SP.modes.pathfind.onEnter();
      SP.modes.pathfind.syncHud(true);
      return;
    }

    if (isGlide) {
      SP.modes.pick.pickPaused = false;
      SP.modes.glide.onEnter();
      SP.modes.glide.syncHud(true);
    } else {
      SP.modes.glide.glidePaused = false;
      SP.modes.glide.resetInput();
      for (const u of st.units) u.glidePath = [];
      SP.modes.pick.onEnter();
      SP.modes.pick.syncHud(true);
    }
  }

  function syncHud(force) {
    const mod = SP.modes[SP.state.gameMode];
    if (mod && mod.syncHud) mod.syncHud(force);
  }

  function render() {
    const mod = SP.modes[SP.state.gameMode];
    if (mod && mod.render) mod.render(ctx);
  }

  function prepareMatch(shouldStartRunning) {
    const st = SP.state;
    const ap = SP.activeParams;
    const dom = SP.dom;
    dom.startOverlay.classList.toggle("hidden", st.isEmbedded || shouldStartRunning);
    dom.endOverlay.classList.add("hidden");
    st.matchEnded = false;
    st.matchHasTicked = false;

    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      st.viewW = Math.max(240, rect.width);
      st.viewH = Math.max(200, rect.height);
      canvas.width = Math.round(st.viewW * dpr);
      canvas.height = Math.round(st.viewH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pad = 12;
      st.arena = { x: pad, y: pad, w: Math.max(180, st.viewW - pad * 2), h: Math.max(160, st.viewH - pad * 2) };
      SP.modes.turn.updateGridRect();
    }

    st.objId = SP.OBJECTIVES[ap.objective] ? ap.objective : SP.DEFAULT_PARAMS.objective;
    st.objInfo = SP.OBJECTIVES[st.objId];
    st.timeLeft = ap.match_duration;
    st.playerScore = 0; st.aiScore = 0;
    st.playerKills = 0; st.aiKills = 0;
    st.units = []; st.bullets = []; st.particles = [];
    st.trails = []; st.floatTexts = []; st.respawnQueue = [];
    st.isTouching = false; st.activePointerId = null;
    st.aiActionTimer = SP.arena.getAiInterval() * 0.75;
    st.aiTelTimer = 0;

    SP.modes.pick.onPrepare();
    SP.modes.glide.onPrepare();
    setGameMode(ap.game_mode);
    syncCanvasMetrics();

    if (st.gameMode === "turn") {
      st.running = false;
      SP.modes.turn.startMatch(shouldStartRunning);
      return;
    }
    SP.modes.turn.state.running = false;

    if (st.gameMode === "pathfind") {
      st.walls = [];
      SP.modes.pathfind.onPrepare();
      st.running = Boolean(shouldStartRunning);
      SP.modes.pathfind.syncHud(true);
      render();
      return;
    }

    if (st.gameMode === "tower") {
      st.walls = [];
      SP.modes.tower.onPrepare();
      st.running = Boolean(shouldStartRunning);
      SP.modes.tower.syncHud(true);
      render();
      return;
    }

    SP.walls.generateWallMap(false);
    SP.arena.setupObjectiveLayout();
    const pCount = ap.player_units;
    const aCount = ap.ai_units;
    for (let i = 0; i < pCount; i++) st.units.push(SP.arena.createUnit(SP.TEAM_PLAYER, SP.arena.getBaseSpawn(SP.TEAM_PLAYER, i, pCount)));
    for (let i = 0; i < aCount; i++) st.units.push(SP.arena.createUnit(SP.TEAM_AI, SP.arena.getBaseSpawn(SP.TEAM_AI, i, aCount)));

    dom.startObjEl.textContent = `Objectif : ${st.objInfo.name} (${ap.match_duration}s)`;
    dom.startDescEl.textContent = st.objInfo.desc;
    st.running = Boolean(shouldStartRunning);
    syncHud(true);
    render();
  }

  function startMatch() {
    SP.ensureAudio();
    prepareMatch(true);
    startLoopIfActive();
  }

  function sendResultAndExit(didWin, finalScore) {
    const st = SP.state;
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: "spawn_minigame_result",
          id: SP.GAME_ID,
          won: !!didWin,
          score: Math.round(finalScore || 0),
          resource_deltas: {
            player_score: Math.round(st.playerScore),
            ai_score: Math.round(st.aiScore),
            player_kills: st.playerKills,
            ai_kills: st.aiKills
          }
        }, "*");
      } catch (_e) {}
    }
  }

  function cancelLoop() {
    const st = SP.state;
    if (st.rafId !== null) {
      cancelAnimationFrame(st.rafId);
      st.rafId = null;
    }
    st.lastTs = 0;
  }

  function startLoopIfActive() {
    const st = SP.state;
    if (st.externalPaused || st.destroyed) return;
    if (st.rafId === null) {
      st.lastTs = 0;
      st.rafId = requestAnimationFrame(loop);
    }
  }

  function loop(ts) {
    const st = SP.state;
    if (st.externalPaused || st.destroyed) {
      st.rafId = null;
      return;
    }
    if (!st.lastTs) st.lastTs = ts;
    const dt = Math.min((ts - st.lastTs) / 1000, 0.05);
    st.lastTs = ts;
    const mod = SP.modes[st.gameMode];
    if (mod && mod.update) mod.update(dt);
    if (mod && mod.render) mod.render(ctx);
    if (!st.externalPaused && !st.destroyed) {
      st.rafId = requestAnimationFrame(loop);
    } else {
      st.rafId = null;
    }
  }

  SP.resize = resize;
  SP.setGameMode = setGameMode;
  SP.syncHud = syncHud;
  SP.render = render;
  SP.prepareMatch = prepareMatch;
  SP.startMatch = startMatch;
  SP.sendResultAndExit = sendResultAndExit;

  // --- Pointer Events ---
  canvas.addEventListener("pointerdown", (e) => {
    const st = SP.state;
    if (st.gameMode === "turn") {
      if (!SP.modes.turn.state.running || st.externalPaused || st.destroyed || st.menuOpen) return;
      e.preventDefault();
      SP.ensureAudio();
      SP.modes.turn.onPointerDown(getCanvasPos(e), e);
      return;
    }
    if (!st.running || st.externalPaused || st.destroyed || st.menuOpen) return;
    e.preventDefault();
    SP.ensureAudio();
    st.activePointerId = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (_e) {}
    st.touchPos = getCanvasPos(e);
    st.isTouching = true;
    const mod = SP.modes[st.gameMode];
    if (mod && mod.onPointerDown) mod.onPointerDown(st.touchPos, e);
  });

  canvas.addEventListener("pointermove", (e) => {
    const st = SP.state;
    if (!st.isTouching || e.pointerId !== st.activePointerId || st.externalPaused || st.destroyed) return;
    e.preventDefault();
    st.touchPos = getCanvasPos(e);
    const mod = SP.modes[st.gameMode];
    if (mod && mod.onPointerMove) mod.onPointerMove(st.touchPos, e);
  });

  function endPointer(e) {
    const st = SP.state;
    if (e.pointerId !== st.activePointerId) return;
    const pt = getCanvasPos(e);
    const mod = SP.modes[st.gameMode];
    if (mod && mod.onPointerUp) mod.onPointerUp(pt, e);
    st.isTouching = false;
    st.activePointerId = null;
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("touchstart", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  canvas.addEventListener("touchmove", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("selectstart", (e) => {
    const tag = e.target && e.target.tagName;
    if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") e.preventDefault();
  });

  // --- Host Bridge ---
  window.addEventListener("message", (e) => {
    const st = SP.state;
    const d = e && e.data;
    if (!d || typeof d !== "object") return;

    if (d.type === "minigd_config" || d.type === "spawn_minigame_init" || d.type === "minigd_init") {
      const changed = SP.applyRuntimeConfig(d);
      if (changed || !st.matchHasTicked) {
        prepareMatch(!st.isEmbedded || !st.externalPaused);
      } else {
        syncHud(true);
        render();
      }
    } else if (d.type === "minigd_reset") {
      SP.applyRuntimeConfig(d);
      prepareMatch(!st.externalPaused);
      startLoopIfActive();
    } else if (d.type === "minigd_pause") {
      st.externalPaused = true;
      SP.menu.closeGameMenu();
      st.isTouching = false;
      st.activePointerId = null;
      SP.modes.pick.resetInput();
      SP.modes.glide.resetInput();
      SP.modes.pathfind.resetInput();
      if (SP.modes.tower && SP.modes.tower.resetInput) SP.modes.tower.resetInput();
      cancelLoop();
      render();
    } else if (d.type === "minigd_start" || d.type === "minigd_resume") {
      st.externalPaused = false;
      SP.dom.startOverlay.classList.add("hidden");
      if (!st.matchEnded) {
        if (st.gameMode === "turn") {
          if (!SP.modes.turn.state.running) SP.modes.turn.state.running = true;
        } else if (!st.running) {
          st.running = true;
        }
      }
      st.lastTs = 0;
      syncHud(true);
      render();
      startLoopIfActive();
    } else if (d.type === "minigd_toggle_audio") {
      st.soundEnabled = !st.soundEnabled;
      SP.emitAudioState();
      if (st.soundEnabled) SP.ensureAudio();
    } else if (d.type === "minigd_destroy") {
      st.destroyed = true;
      SP.menu.closeGameMenu();
      st.isTouching = false;
      st.activePointerId = null;
      cancelLoop();
      SP.audio.close();
    }
  });

  // --- Keyboard ---
  window.addEventListener("keydown", (e) => {
    const st = SP.state;
    if (e.key === "Escape") {
      if (st.menuOpen) {
        e.preventDefault();
        e.stopPropagation();
        SP.menu.closeGameMenu();
        return;
      }
      if (st.gameMode === "pathfind" && SP.modes.pathfind && SP.state.units.some((u) => u.selected)) {
        SP.modes.pathfind.clearSelection();
        return;
      }
      if (st.gameMode === "tower" && SP.modes.tower && SP.modes.tower.state.selectedTurretId !== -1) {
        SP.modes.tower.clearSelection();
        return;
      }
      if (st.isEmbedded && !st.externalPaused && window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({
            type: "minigd_exit",
            id: SP.GAME_ID,
            won: Math.round(st.playerScore) > Math.round(st.aiScore),
            score: Math.round(st.playerScore || 0)
          }, "*");
        } catch (_e) {}
      }
      return;
    }
    const mod = SP.modes[st.gameMode];
    if (mod && mod.onKeyDown) mod.onKeyDown(e);
  });

  // --- UI Wireup ---
  const dom = SP.dom;
  const tbMod = SP.modes.turn;
  const pfMod = SP.modes.pathfind;
  const twMod = SP.modes.tower;

  dom.btnSound.addEventListener("click", () => {
    SP.state.soundEnabled = !SP.state.soundEnabled;
    SP.emitAudioState();
    if (SP.state.soundEnabled) SP.ensureAudio();
  });
  SP.menu.wireMenuEvents();

  dom.btnStartPick.addEventListener("click", () => {
    SP.activeParams.game_mode = "pick";
    setGameMode("pick");
    render();
  });
  dom.btnStartGlide.addEventListener("click", () => {
    SP.activeParams.game_mode = "glide";
    setGameMode("glide");
    render();
  });
  dom.btnStartTurn.addEventListener("click", () => {
    SP.activeParams.game_mode = "turn";
    prepareMatch(false);
  });
  dom.btnStartPathfind.addEventListener("click", () => {
    SP.activeParams.game_mode = "pathfind";
    prepareMatch(false);
  });
  dom.btnStartTower.addEventListener("click", () => {
    SP.activeParams.game_mode = "tower";
    prepareMatch(false);
  });

  dom.btnGlidePlay.addEventListener("click", SP.modes.glide.resumeSimulation);
  dom.btnPickPause.addEventListener("click", SP.modes.pick.togglePause);
  dom.btnPlay.addEventListener("click", startMatch);
  dom.btnReplay.addEventListener("click", startMatch);
  dom.btnRestart.addEventListener("click", startMatch);
  dom.btnTbRestart.addEventListener("click", startMatch);
  dom.btnPfRestart.addEventListener("click", startMatch);
  dom.btnTwRestart.addEventListener("click", startMatch);

  // Turn-based buttons
  dom.btnTbPrevUnit.addEventListener("click", () => tbMod.selectUnitDelta(-1));
  dom.btnTbNextUnit.addEventListener("click", () => tbMod.selectUnitDelta(1));
  dom.btnTbPrevTgt.addEventListener("click", () => tbMod.cycleTargetDelta(-1));
  dom.btnTbNextTgt.addEventListener("click", () => tbMod.cycleTargetDelta(1));
  dom.btnTbUpLeft.addEventListener("click", () => tbMod.moveSelected(-1, -1));
  dom.btnTbUp.addEventListener("click", () => tbMod.moveSelected(0, -1));
  dom.btnTbUpRight.addEventListener("click", () => tbMod.moveSelected(1, -1));
  dom.btnTbDownLeft.addEventListener("click", () => tbMod.moveSelected(-1, 1));
  dom.btnTbDown.addEventListener("click", () => tbMod.moveSelected(0, 1));
  dom.btnTbDownRight.addEventListener("click", () => tbMod.moveSelected(1, 1));
  dom.btnTbLeft.addEventListener("click", () => tbMod.moveSelected(-1, 0));
  dom.btnTbRight.addEventListener("click", () => tbMod.moveSelected(1, 0));
  dom.btnTbFire.addEventListener("click", tbMod.fireSelected);
  dom.btnTbEndTurn.addEventListener("click", tbMod.endPlayerTurn);

  // Pathfind buttons
  dom.btnPfAll.addEventListener("click", pfMod.selectAllUnits);
  dom.btnPfG1.addEventListener("click", () => pfMod.handleGroupButton(1));
  dom.btnPfG2.addEventListener("click", () => pfMod.handleGroupButton(2));
  dom.btnPfG3.addEventListener("click", () => pfMod.handleGroupButton(3));
  dom.btnPfSaveGrp.addEventListener("click", pfMod.toggleSaveGroupArmed);
  dom.btnPfStop.addEventListener("click", pfMod.stopSelectedUnits);
  dom.btnPfClear.addEventListener("click", pfMod.clearSelection);

  // Tower buttons
  dom.btnTwMg.addEventListener("click", () => twMod.selectBuildType("mg"));
  dom.btnTwSniper.addEventListener("click", () => twMod.selectBuildType("sniper"));
  dom.btnTwCannon.addEventListener("click", () => twMod.selectBuildType("cannon"));
  dom.btnTwRecall.addEventListener("click", twMod.recallSelectedTurret);

  dom.btnExitTop.addEventListener("click", () => sendResultAndExit(Math.round(SP.state.playerScore) > Math.round(SP.state.aiScore), SP.state.playerScore));
  dom.btnEndReturn.addEventListener("click", () => sendResultAndExit(Math.round(SP.state.playerScore) > Math.round(SP.state.aiScore), SP.state.playerScore));
  window.addEventListener("resize", () => resize(false));
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => resize(false));
  }
  if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
    new ResizeObserver(() => resize(false)).observe(canvas.parentElement);
  }

  // --- Init ---
  SP.applyVisualTheme();
  SP.emitAudioState();
  SP.modes.pick.buildPips();
  prepareMatch(false);
  resize(true);

  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({
        type: "minigd_ready",
        id: SP.GAME_ID,
        meta: SP.readMeta(),
        capabilities: {
          layout: "fullframe",
          fullframe: true,
          ownExit: SP.state.activeOwnExit,
          audio: true
        }
      }, "*");
    } catch (_e) {}
  }

  if (!SP.state.isEmbedded && !SP.state.externalPaused) {
    startLoopIfActive();
  } else if (!SP.state.externalPaused) {
    if (SP.state.gameMode === "turn") SP.modes.turn.state.running = true;
    else SP.state.running = true;
    startLoopIfActive();
  }
})();
