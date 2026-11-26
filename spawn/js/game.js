(function (global) {
  'use strict';

  var SPAWN = (global.SPAWN = global.SPAWN || {});
  var Spiral = SPAWN.Spiral;
  var Lore = SPAWN.Lore;
  var World = SPAWN.World;
  var Audio = SPAWN.Audio;

  var CELL = 64;
  var VIEW_SIZE = 576;
  var SAVE_KEY = 'spawnref1_save_v1';

  function defaultUnlocks() {
    return {
      fuel: true,
      scrollHint: false,
      coque: false,
      scan: false,
      t2s: false,
      lum: false,
      journal: false,
      hyper: false,
      t2sConvert: false,
      locatStar: false,
      trade: false,
      lumShield: false,
      compass: false,
      goNodes: false,
      go500: false,
      go400: false,
      goRnd: false,
      refill16: false,
      pushStar: false,
      reseed: false,
      freeRefill: false
    };
  }

  function defaultCheckpoints() {
    return {
      intro: true,
      star1: false,
      star2: false,
      reachDream: false,
      reachCosm: false,
      reachOut: false,
      reachCenter: false,
      reach512: false,
      reach204: false,
      Tuch204: false,
      Tuch1: false,
      tuch512: false,
      reach256_WIN1: false,
      reach714_WIN2: false
    };
  }

  function createInitialState(seedValue) {
    var seed = seedValue || Math.floor(10000 + Math.random() * 899999);
    var world = World.createWorld(seed);
    var sx = world.spawn.x;
    var sy = world.spawn.y;

    return {
      world: world,
      res: {
        fuel: World.INITIAL_RESOURCES.fuel,
        coque: World.INITIAL_RESOURCES.coque,
        scan: World.INITIAL_RESOURCES.scan,
        hyper: World.INITIAL_RESOURCES.hyper,
        t2s: World.INITIAL_RESOURCES.t2s,
        lum: World.INITIAL_RESOURCES.lum
      },
      ship: {
        x: sx,
        y: sy,
        visualX: sx,
        visualY: sy,
        angle: -Math.PI / 2
      },
      cam: {
        x: sx * CELL + CELL * 0.5 - VIEW_SIZE * 0.5,
        y: sy * CELL + CELL * 0.5 - VIEW_SIZE * 0.5
      },
      visited: {},
      finished: {},
      discoveredStars: [],
      storyLog: ['intro'],
      checkpoints: defaultCheckpoints(),
      unlocks: defaultUnlocks(),
      compassMode: null,
      compassTarget: null,
      cargo: [],
      shieldActive: false,
      aimMode: false,
      aimAngle: null,
      selectedCell: { x: sx, y: sy },
      lastOutcomeText: '',
      whisper: Lore.STORY_CHAPTERS.intro.whisper,
      particles: [],
      floatingTexts: [],
      borderFlash: null,
      glitchTimer: 0,
      tweens: [],
      stats: {
        steps: 0,
        bounces: 0,
        jumps: 0,
        reseedCount: 0,
        startTime: Date.now()
      }
    };
  }

  function createGameEngine(callbacks) {
    var state = null;
    var dragging = false;
    var didDragMove = false;
    var dragLast = { x: 0, y: 0 };
    var dragVel = { x: 0, y: 0 };
    var inertiaActive = false;

    function notifyUI(opts) {
      if (callbacks && callbacks.onUpdate) callbacks.onUpdate(state, opts || {});
    }

    function save() {
      if (!state) return;
      try {
        var pushed = {};
        for (var i = 0; i < state.world.stars.length; i++) {
          var st = state.world.stars[i];
          if (st.pushed) pushed[st.num] = st.id;
        }
        var payload = {
          seed: state.world.seed,
          pushed: pushed,
          res: state.res,
          ship: { x: state.ship.x, y: state.ship.y, angle: state.ship.angle },
          visited: state.visited,
          finished: state.finished,
          discoveredStars: state.discoveredStars,
          storyLog: state.storyLog,
          checkpoints: state.checkpoints,
          unlocks: state.unlocks,
          compassMode: state.compassMode,
          cargo: state.cargo,
          shieldActive: state.shieldActive,
          whisper: state.whisper,
          stats: state.stats
        };
        global.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      } catch (e) {
        // ignore storage errors
      }
    }

    function hasSavedGame() {
      try {
        return !!global.localStorage.getItem(SAVE_KEY);
      } catch (e) {
        return false;
      }
    }

    function loadSavedGame() {
      try {
        var raw = global.localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        var data = JSON.parse(raw);
        var world = World.createWorld(data.seed, data.pushed);
        state = createInitialState(data.seed);
        state.world = world;
        state.res = data.res || state.res;
        state.ship.x = data.ship.x;
        state.ship.y = data.ship.y;
        state.ship.visualX = data.ship.x;
        state.ship.visualY = data.ship.y;
        state.ship.angle = data.ship.angle || -Math.PI / 2;
        state.cam.x = state.ship.x * CELL + CELL * 0.5 - VIEW_SIZE * 0.5;
        state.cam.y = state.ship.y * CELL + CELL * 0.5 - VIEW_SIZE * 0.5;
        state.visited = data.visited || {};
        state.finished = data.finished || {};
        state.discoveredStars = data.discoveredStars || [];
        state.storyLog = data.storyLog || ['intro'];
        state.checkpoints = Object.assign(defaultCheckpoints(), data.checkpoints || {});
        state.unlocks = Object.assign(defaultUnlocks(), data.unlocks || {});
        state.compassMode = data.compassMode || null;
        state.cargo = data.cargo || [];
        state.shieldActive = !!data.shieldActive;
        state.whisper = data.whisper || state.whisper;
        state.stats = data.stats || state.stats;
        state.selectedCell = { x: state.ship.x, y: state.ship.y };
        refreshCompassTarget();
        notifyUI({ full: true });
        return true;
      } catch (e) {
        return false;
      }
    }

    function startNewGame(keepMeta, seedOverride) {
      var prevReseedCount = keepMeta && state ? state.stats.reseedCount + 1 : 0;
      state = createInitialState(seedOverride);
      if (keepMeta) {
        state.stats.reseedCount = prevReseedCount;
        // En RESEED, on garde le Journal/outil débloqué ? Non, on redémarre une spirale propre avec un léger bonus d'éclaireur
        state.res.lum = 2;
        state.unlocks.lum = true;
        state.unlocks.journal = true;
        state.unlocks.reseed = true;
      }
      save();
      notifyUI({ full: true });
    }

    function isTweening() {
      return state && state.tweens.length > 0;
    }

    function addTween(durationSec, easingFn, onUpdate, onDone) {
      state.tweens.push({
        elapsed: 0,
        duration: durationSec,
        easing: easingFn,
        onUpdate: onUpdate,
        onDone: onDone
      });
    }

    function spawnFloating(gx, gy, text, color) {
      state.floatingTexts.push({
        wx: gx * CELL + CELL * 0.5,
        wy: gy * CELL + CELL * 0.25,
        text: text,
        color: color || '#e2e8f0',
        rise: 0,
        alpha: 1.25
      });
    }

    function spawnParticles(gx, gy, rgb, count, speed) {
      var wx = gx * CELL + CELL * 0.5;
      var wy = gy * CELL + CELL * 0.5;
      for (var i = 0; i < count; i++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = (0.3 + Math.random() * 0.7) * (speed || 50);
        state.particles.push({
          wx: wx,
          wy: wy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: 1.5 + Math.random() * 2.2,
          alpha: 0.9,
          rgb: rgb || '56, 189, 248'
        });
      }
    }

    function changeRes(key, delta, labelText) {
      if (!delta) return 0;
      var before = state.res[key];
      var next = Spiral.clamp(before + delta, 0, World.CAPS[key]);
      state.res[key] = next;
      var diff = next - before;
      if (diff !== 0 && labelText) {
        var colors = {
          fuel: '#f59e0b',
          coque: '#38bdf8',
          scan: '#34d399',
          hyper: '#c084fc',
          t2s: '#cbd5e1',
          lum: '#fde047'
        };
        spawnFloating(state.ship.x, state.ship.y, (diff > 0 ? '+' : '') + diff + ' ' + labelText, colors[key]);
      }
      return diff;
    }

    function msg(key, vars) {
      var M = (Lore.TEXTES && Lore.TEXTES.messages) || {};
      return Lore.format(M[key] || '', vars);
    }

    function refreshCompassTarget() {
      if (!state || !state.compassMode) {
        if (state) state.compassTarget = null;
        return;
      }
      if (state.compassMode === 'nearest') {
        var ns = World.findNearestStar(state.world, state.ship.x, state.ship.y);
        state.compassTarget = ns ? { x: ns.x, y: ns.y, label: msg('compassNearest', { num: ns.num }) } : null;
      } else if (state.compassMode === 0) {
        state.compassTarget = { x: 0, y: 0, label: msg('compassCenter') };
      } else if (state.compassMode === 3030) {
        state.compassTarget = { x: state.world.embassy.x, y: state.world.embassy.y, label: msg('compassEmbassy') };
      } else {
        var st = state.world.starsByNum[state.compassMode];
        state.compassTarget = st ? { x: st.x, y: st.y, label: msg('compassNearest', { num: st.num }) } : null;
      }
    }

    function triggerChapter(chapId, isModal) {
      if (state.checkpoints[chapId]) return false;
      state.checkpoints[chapId] = true;
      if (state.storyLog.indexOf(chapId) === -1) {
        state.storyLog.push(chapId);
      }
      var ch = Lore.STORY_CHAPTERS[chapId];
      if (!ch) return true;
      if (ch.whisper) state.whisper = ch.whisper;
      Audio.playChapter();

      if (callbacks && callbacks.onStoryEvent) {
        callbacks.onStoryEvent(ch, !!isModal);
      }
      return true;
    }

    function checkStoryProgression() {
      var sx = state.ship.x;
      var sy = state.ship.y;
      var ring = Spiral.ringOf(sx, sy);
      var cell = World.getCellContent(state.world, sx, sy);

      // Zones concentriques
      if (ring > 14 && ring <= 42 && !state.checkpoints.reachDream) {
        state.unlocks.locatStar = true;
        state.unlocks.trade = true;
        triggerChapter('reachDream', false);
      }
      if (ring <= 14 && !state.checkpoints.reachCosm) {
        state.unlocks.lumShield = true;
        triggerChapter('reachCosm', false);
      }
      if (ring > 72 && !state.checkpoints.reachOut) {
        triggerChapter('reachOut', false);
      }

      // Centre (0,0)
      if (sx === 0 && sy === 0) {
        if (!state.checkpoints.reachCenter) {
          state.res.fuel = World.CAPS.fuel;
          state.res.coque = World.CAPS.coque;
          state.res.scan = World.CAPS.scan;
          state.res.hyper = World.CAPS.hyper;
          state.unlocks.compass = true;
          state.unlocks.goNodes = true;
          state.compassMode = 500;
          refreshCompassTarget();
          triggerChapter('reachCenter', true);
        }
      }

      // Étoile #500
      if (cell.kind === 'star' && cell.star.num === 500 && !state.checkpoints.reach512) {
        state.unlocks.go500 = true;
        state.compassMode = 400;
        refreshCompassTarget();
        triggerChapter('reach512', false);
      }

      // Étoile #400 après le Centre
      if (cell.kind === 'star' && cell.star.num === 400 && state.checkpoints.reachCenter && !state.checkpoints.reach204) {
        state.unlocks.refill16 = true;
        state.unlocks.pushStar = true;
        triggerChapter('reach204', false);
      }

      // FIN 1 : Étoile #256 après avoir poussé #1
      if (cell.kind === 'star' && cell.star.num === 256 && state.checkpoints.Tuch1 && !state.checkpoints.reach256_WIN1) {
        state.unlocks.go400 = true;
        state.unlocks.reseed = true;
        triggerChapter('reach256_WIN1', true);
      }

      // FIN 2 : Ambassade #3030 après avoir poussé #500
      if (cell.kind === 'embassy' && state.checkpoints.tuch512 && !state.checkpoints.reach714_WIN2) {
        state.unlocks.freeRefill = true;
        triggerChapter('reach714_WIN2', true);
      }
    }

    function discoverStar(star) {
      var isNew = !state.visited[star.id];
      if (isNew) {
        state.visited[star.id] = true;
        state.discoveredStars.push({
          num: star.num,
          id: star.id,
          name: Lore.getStarName(star)
        });
        changeRes('lum', 1, 'Lum');
        Audio.playStar();
        spawnParticles(star.x, star.y, '253, 224, 71', 16, 65);

        if (!state.checkpoints.star1) {
          state.unlocks.scrollHint = true;
          state.unlocks.coque = true;
          state.unlocks.scan = true;
          state.unlocks.t2s = true;
          state.unlocks.lum = true;
          state.unlocks.journal = true;
          triggerChapter('star1', false);
        } else if (!state.checkpoints.star2) {
          state.unlocks.hyper = true;
          state.unlocks.t2sConvert = true;
          triggerChapter('star2', false);
        }
      }
      if (state.compassMode === 'nearest' || state.compassMode === star.num) {
        refreshCompassTarget();
      }
    }

    function visitCell(x, y, byShip) {
      var cell = World.getCellContent(state.world, x, y);
      state.selectedCell = { x: x, y: y };
      state.lastOutcomeText = '';

      var alreadyVisited = !!state.visited[cell.id];

      if (byShip) {
        if (cell.kind === 'star') {
          discoverStar(cell.star);
        } else if (cell.kind === 'center' || cell.kind === 'embassy') {
          if (!alreadyVisited) {
            state.visited[cell.id] = true;
            Audio.playStar();
          }
        } else if ((cell.kind === 'planet' || cell.kind === 'anomaly') && !alreadyVisited) {
          state.visited[cell.id] = true;
          changeRes('scan', 2, 'Scan');
          Audio.playScan();
          spawnParticles(x, y, '52, 211, 153', 10, 45);
        }
        checkStoryProgression();
      } else {
        // Inspection / scan à distance
        if (cell.kind === 'star') {
          if (!alreadyVisited) {
            if (state.res.scan > 0) {
              changeRes('scan', -1, 'Scan');
              discoverStar(cell.star);
            } else {
              state.lastOutcomeText = msg('noScanStar');
            }
          }
        } else if ((cell.kind === 'planet' || cell.kind === 'anomaly') && !alreadyVisited) {
          if (state.res.scan > 0) {
            changeRes('scan', -1, 'Scan');
            state.visited[cell.id] = true;
            Audio.playScan();
          } else {
            state.lastOutcomeText = msg('noScanNode');
          }
        } else if ((cell.kind === 'center' || cell.kind === 'embassy') && !alreadyVisited) {
          if (state.res.scan > 0) {
            changeRes('scan', -1, 'Scan');
            state.visited[cell.id] = true;
            Audio.playScan();
          }
        }
      }

      save();
      notifyUI({ pulse: true });
    }

    function softCenterCameraOnShip() {
      var targetCamX = state.ship.x * CELL + CELL * 0.5 - VIEW_SIZE * 0.5;
      var targetCamY = state.ship.y * CELL + CELL * 0.5 - VIEW_SIZE * 0.5;
      var startCamX = state.cam.x;
      var startCamY = state.cam.y;
      addTween(0.28, Spiral.easeOutCubic, function (t) {
        state.cam.x = Spiral.lerp(startCamX, targetCamX, t);
        state.cam.y = Spiral.lerp(startCamY, targetCamY, t);
      });
    }

    function moveShipByStep(dx, dy) {
      if (!state || isTweening()) return false;
      if (state.res.fuel <= 0) {
        state.lastOutcomeText = msg('noFuel');
        Audio.playBad();
        notifyUI();
        return false;
      }

      var fromX = state.ship.x;
      var fromY = state.ship.y;
      var toX = fromX + dx;
      var toY = fromY + dy;

      state.ship.x = toX;
      state.ship.y = toY;
      state.ship.angle = Math.atan2(dy, dx);
      state.stats.steps++;

      changeRes('fuel', -1, 'Fuel');
      changeRes('t2s', 1, null);
      Audio.playStep();
      spawnParticles(fromX, fromY, '245, 158, 11', 5, 28);

      addTween(0.16, Spiral.easeOutCubic, function (t) {
        state.ship.visualX = Spiral.lerp(fromX, toX, t);
        state.ship.visualY = Spiral.lerp(fromY, toY, t);
      }, function () {
        state.ship.visualX = toX;
        state.ship.visualY = toY;

        var screenX = toX * CELL + CELL * 0.5 - state.cam.x;
        var screenY = toY * CELL + CELL * 0.5 - state.cam.y;
        if (screenX < CELL * 1.2 || screenX > VIEW_SIZE - CELL * 1.2 ||
            screenY < CELL * 1.2 || screenY > VIEW_SIZE - CELL * 1.2) {
          softCenterCameraOnShip();
        }
        visitCell(toX, toY, true);
      });

      notifyUI({ pulse: true });
      return true;
    }

    function triggerBorderCollision(edgeDirX, edgeDirY) {
      if (!state || isTweening()) return;
      dragging = false;
      inertiaActive = false;
      dragVel.x = 0;
      dragVel.y = 0;

      if (state.res.coque > 0) {
        changeRes('coque', -1, 'Coque');
        state.stats.bounces++;
        state.unlocks.coque = true;
        Audio.playBoundBounce();
        state.borderFlash = { rgb: '56, 189, 248', alpha: 0.9 };

        // Calculer une case cible dans le viewport actuel (entre 3 et 6 cases dans la direction du scroll)
        var centerCellX = Math.round((state.cam.x + VIEW_SIZE * 0.5) / CELL - 0.5);
        var centerCellY = Math.round((state.cam.y + VIEW_SIZE * 0.5) / CELL - 0.5);
        var jitterX = Math.floor(Math.random() * 3) - 1;
        var jitterY = Math.floor(Math.random() * 3) - 1;
        var toX = centerCellX + (edgeDirX === 0 ? jitterX : 0);
        var toY = centerCellY + (edgeDirY === 0 ? jitterY : 0);

        // Garantir que la case cible reste bien dans le cadre visible
        var minVisibleX = Math.ceil(state.cam.x / CELL);
        var maxVisibleX = Math.floor((state.cam.x + VIEW_SIZE) / CELL) - 1;
        var minVisibleY = Math.ceil(state.cam.y / CELL);
        var maxVisibleY = Math.floor((state.cam.y + VIEW_SIZE) / CELL) - 1;
        toX = Spiral.clamp(toX, minVisibleX + 1, maxVisibleX - 1);
        toY = Spiral.clamp(toY, minVisibleY + 1, maxVisibleY - 1);

        var fromX = state.ship.visualX;
        var fromY = state.ship.visualY;
        state.ship.x = toX;
        state.ship.y = toY;
        state.ship.angle = Math.atan2(toY - fromY, toX - fromX);
        spawnParticles(fromX, fromY, '56, 189, 248', 14, 70);

        addTween(0.28, Spiral.easeOutQuart, function (t) {
          state.ship.visualX = Spiral.lerp(fromX, toX, t);
          state.ship.visualY = Spiral.lerp(fromY, toY, t);
        }, function () {
          state.ship.visualX = toX;
          state.ship.visualY = toY;
          spawnParticles(toX, toY, '56, 189, 248', 10, 40);
          visitCell(toX, toY, true);
        });
      } else {
        // Coque à 0 : glitch et retour caméra
        state.glitchTimer = 0.45;
        state.borderFlash = { rgb: '251, 113, 133', alpha: 0.95 };
        Audio.playGlitch();
        spawnFloating(state.ship.x, state.ship.y, msg('floatingGlitch'), '#fb7185');

        var startCamX = state.cam.x;
        var startCamY = state.cam.y;
        var targetCamX = state.ship.x * CELL + CELL * 0.5 - VIEW_SIZE * 0.5;
        var targetCamY = state.ship.y * CELL + CELL * 0.5 - VIEW_SIZE * 0.5;
        addTween(0.42, Spiral.easeOutBack, function (t) {
          state.cam.x = Spiral.lerp(startCamX, targetCamX, t);
          state.cam.y = Spiral.lerp(startCamY, targetCamY, t);
        }, function () {
          state.cam.x = targetCamX;
          state.cam.y = targetCamY;
        });
      }
      notifyUI({ pulse: true });
    }

    function checkBorderDuringScroll() {
      if (!state || isTweening()) return false;
      var sx = state.ship.visualX * CELL + CELL * 0.5 - state.cam.x;
      var sy = state.ship.visualY * CELL + CELL * 0.5 - state.cam.y;
      var pad = 16;
      var ex = sx < pad ? 1 : sx > VIEW_SIZE - pad ? -1 : 0;
      var ey = sy < pad ? 1 : sy > VIEW_SIZE - pad ? -1 : 0;
      if (ex !== 0 || ey !== 0) {
        triggerBorderCollision(ex, ey);
        return true;
      }
      return false;
    }

    function performHyperJump(angle) {
      if (!state || isTweening() || !state.unlocks.hyper) return false;
      if (state.res.hyper <= 0) {
        state.lastOutcomeText = msg('noHyper');
        Audio.playBad();
        notifyUI();
        return false;
      }

      state.aimMode = false;
      state.aimAngle = null;
      changeRes('hyper', -1, 'Hyper');
      state.stats.jumps++;
      Audio.playHyper();

      var distCells = 14 + Math.floor(Math.random() * 6); // 14..19 cases
      var fromX = state.ship.x;
      var fromY = state.ship.y;
      var toX = fromX + Math.round(Math.cos(angle) * distCells);
      var toY = fromY + Math.round(Math.sin(angle) * distCells);

      state.ship.x = toX;
      state.ship.y = toY;
      state.ship.angle = angle;

      var startCamX = state.cam.x;
      var startCamY = state.cam.y;
      var targetCamX = toX * CELL + CELL * 0.5 - VIEW_SIZE * 0.5;
      var targetCamY = toY * CELL + CELL * 0.5 - VIEW_SIZE * 0.5;

      addTween(0.62, Spiral.easeInOutQuart, function (t) {
        state.ship.visualX = Spiral.lerp(fromX, toX, t);
        state.ship.visualY = Spiral.lerp(fromY, toY, t);
        state.cam.x = Spiral.lerp(startCamX, targetCamX, t);
        state.cam.y = Spiral.lerp(startCamY, targetCamY, t);
        if (Math.random() < 0.7) {
          spawnParticles(state.ship.visualX, state.ship.visualY, '192, 132, 252', 2, 40);
        }
      }, function () {
        state.ship.visualX = toX;
        state.ship.visualY = toY;
        state.cam.x = targetCamX;
        state.cam.y = targetCamY;
        spawnParticles(toX, toY, '192, 132, 252', 18, 75);
        visitCell(toX, toY, true);
      });

      notifyUI({ pulse: true });
      return true;
    }

    function goToNode(targetType) {
      if (!state || isTweening()) return;
      if (state.res.hyper <= 0) {
        state.lastOutcomeText = msg('noHyperBeacon');
        Audio.playBad();
        notifyUI();
        return;
      }

      var tx = 0;
      var ty = 0;
      if (targetType === 500) {
        tx = state.world.starsByNum[500].x;
        ty = state.world.starsByNum[500].y;
      } else if (targetType === 400) {
        tx = state.world.starsByNum[400].x;
        ty = state.world.starsByNum[400].y;
      } else if (targetType === 'rnd') {
        var r = 10 + Math.floor(Math.random() * 58);
        var a = Math.random() * Math.PI * 2;
        tx = Math.round(Math.cos(a) * r);
        ty = Math.round(Math.sin(a) * r);
      }

      // Empêcher l'exploit commercial via téléportation
      for (var i = 0; i < state.cargo.length; i++) {
        state.cargo[i].teleported = true;
      }

      changeRes('hyper', -1, 'Hyper');
      state.stats.jumps++;
      Audio.playHyper();

      var fromX = state.ship.x;
      var fromY = state.ship.y;
      state.ship.x = tx;
      state.ship.y = ty;
      state.ship.angle = Math.atan2(ty - fromY, tx - fromX);

      var startCamX = state.cam.x;
      var startCamY = state.cam.y;
      var targetCamX = tx * CELL + CELL * 0.5 - VIEW_SIZE * 0.5;
      var targetCamY = ty * CELL + CELL * 0.5 - VIEW_SIZE * 0.5;

      addTween(0.7, Spiral.easeInOutQuart, function (t) {
        state.ship.visualX = Spiral.lerp(fromX, tx, t);
        state.ship.visualY = Spiral.lerp(fromY, ty, t);
        state.cam.x = Spiral.lerp(startCamX, targetCamX, t);
        state.cam.y = Spiral.lerp(startCamY, targetCamY, t);
      }, function () {
        state.ship.visualX = tx;
        state.ship.visualY = ty;
        state.cam.x = targetCamX;
        state.cam.y = targetCamY;
        spawnParticles(tx, ty, '56, 189, 248', 20, 80);
        visitCell(tx, ty, true);
      });

      notifyUI({ pulse: true });
    }

    function exploitSelectedPlanet() {
      var sel = state.selectedCell;
      if (!sel) return;
      var cell = World.getCellContent(state.world, sel.x, sel.y);
      if (cell.kind !== 'planet' || state.finished[cell.id]) return;

      var onTile = state.ship.x === sel.x && state.ship.y === sel.y;
      if (!onTile && state.res.scan <= 0) {
        state.lastOutcomeText = msg('noScanExploit');
        Audio.playBad();
        notifyUI();
        return;
      }

      if (!onTile) changeRes('scan', -1, 'Scan');
      else changeRes('scan', 1, 'Scan');

      state.visited[cell.id] = true;
      state.finished[cell.id] = true;

      var loot = cell.loot;
      if (loot.isBad && state.shieldActive) {
        state.shieldActive = false;
        state.lastOutcomeText = msg('shieldBlockedLoot', { label: loot.label });
        Audio.playGood();
      } else {
        if (loot.fuel) changeRes('fuel', loot.fuel, 'Fuel');
        if (loot.coque) changeRes('coque', loot.coque, 'Coque');
        if (loot.hyper) changeRes('hyper', loot.hyper, 'Hyper');
        var parts = [];
        if (loot.fuel) parts.push((loot.fuel > 0 ? '+' : '') + loot.fuel + ' Fuel');
        if (loot.coque) parts.push((loot.coque > 0 ? '+' : '') + loot.coque + ' Coque');
        if (loot.hyper) parts.push((loot.hyper > 0 ? '+' : '') + loot.hyper + ' Hyper');
        state.lastOutcomeText = msg('lootResult', { label: loot.label, parts: parts.join(' · ') });
        if (loot.isBad) Audio.playBad();
        else Audio.playGood();
      }

      save();
      notifyUI({ pulse: true });
    }

    function canAffordCost(cost) {
      var keys = Object.keys(cost);
      for (var i = 0; i < keys.length; i++) {
        if (state.res[keys[i]] < cost[keys[i]]) return false;
      }
      return true;
    }

    function attemptSelectedAnomaly() {
      var sel = state.selectedCell;
      if (!sel) return;
      var cell = World.getCellContent(state.world, sel.x, sel.y);
      if (cell.kind !== 'anomaly' || state.finished[cell.id]) return;

      var bet = cell.bet;
      if (!canAffordCost(bet.cost)) {
        state.lastOutcomeText = msg('noAffordBet');
        Audio.playBad();
        notifyUI();
        return;
      }

      var onTile = state.ship.x === sel.x && state.ship.y === sel.y;
      if (!onTile && state.res.scan <= 0) {
        state.lastOutcomeText = msg('noScanBet');
        Audio.playBad();
        notifyUI();
        return;
      }
      if (!onTile) changeRes('scan', -1, 'Scan');
      else changeRes('scan', 1, 'Scan');

      state.visited[cell.id] = true;
      state.finished[cell.id] = true;

      var roll = Math.random();
      var pct = Math.round(bet.prob * 100);
      if (roll < bet.prob) {
        // Succès : on paie le coût et on reçoit la récompense
        Object.keys(bet.cost).forEach(function (k) { changeRes(k, -bet.cost[k], k); });
        Object.keys(bet.reward).forEach(function (k) { changeRes(k, bet.reward[k], k); });
        state.lastOutcomeText = msg('betWin', { pct: pct });
        Audio.playGood();
      } else if (state.shieldActive) {
        state.shieldActive = false;
        state.lastOutcomeText = msg('betShielded');
        Audio.playGood();
      } else {
        Object.keys(bet.cost).forEach(function (k) { changeRes(k, -bet.cost[k], k); });
        state.lastOutcomeText = msg('betLose', { pct: pct });
        Audio.playBad();
      }

      save();
      notifyUI({ pulse: true });
    }

    function buyArtefactAtSelected() {
      var sel = state.selectedCell;
      if (!sel || !state.unlocks.trade) return;
      var id = Spiral.posToId(sel.x, sel.y);
      var art = Lore.getArtefactForId(id);

      for (var i = 0; i < state.cargo.length; i++) {
        if (state.cargo[i].key === art.key) {
          state.lastOutcomeText = msg('artAlreadyOwned', { name: art.name });
          notifyUI();
          return;
        }
      }
      if (state.cargo.length >= 4) {
        state.lastOutcomeText = msg('cargoFull');
        Audio.playBad();
        notifyUI();
        return;
      }
      if (state.res[art.costRes] < art.costAmt) {
        state.lastOutcomeText = msg('artCantAfford', { name: art.name });
        Audio.playBad();
        notifyUI();
        return;
      }

      changeRes(art.costRes, -art.costAmt, art.costRes);
      state.cargo.push({
        key: art.key,
        name: art.name,
        costRes: art.costRes,
        baseSell: art.baseSell,
        originX: sel.x,
        originY: sel.y,
        teleported: false
      });
      state.lastOutcomeText = msg('artBought', { name: art.name });
      Audio.playGood();
      save();
      notifyUI({ pulse: true });
    }

    function sellArtefact(index) {
      var art = state.cargo[index];
      if (!art) return;
      var d = Spiral.dist(art.originX, art.originY, state.ship.x, state.ship.y);
      var mult = art.teleported ? 1.2 : Math.min(3.5, 1 + d / 32);
      var payout = Math.max(1, Math.round(art.baseSell * mult));
      changeRes(art.costRes, payout, art.costRes);
      state.cargo.splice(index, 1);
      state.lastOutcomeText = msg('artSold', { name: art.name, payout: payout, res: art.costRes, mult: mult.toFixed(1) });
      Audio.playGood();
      save();
      notifyUI({ pulse: true });
    }

    function pushSelectedStar() {
      var sel = state.selectedCell;
      if (!sel || !state.unlocks.pushStar) return;
      var cell = World.getCellContent(state.world, sel.x, sel.y);
      if (cell.kind !== 'star') return;
      if (state.res.scan < 1) {
        state.lastOutcomeText = msg('noScanPush');
        Audio.playBad();
        notifyUI();
        return;
      }

      var star = cell.star;
      changeRes('scan', -1, 'Scan');
      var oldId = star.id;
      var pushed = World.pushStarInWorld(state.world, star.num);
      state.visited[pushed.id] = true;
      delete state.visited[oldId];

      // Si le vaisseau était dessus, il accompagne ou met à jour la sélection
      if (state.ship.x === sel.x && state.ship.y === sel.y) {
        state.ship.x = pushed.x;
        state.ship.y = pushed.y;
        state.ship.visualX = pushed.x;
        state.ship.visualY = pushed.y;
      }
      state.selectedCell = { x: pushed.x, y: pushed.y };
      spawnParticles(pushed.x, pushed.y, '253, 224, 71', 20, 70);
      Audio.playStar();

      if (pushed.num === 400 && !state.checkpoints.Tuch204) {
        state.unlocks.goRnd = true;
        triggerChapter('Tuch204', false);
      } else if (pushed.num === 1 && !state.checkpoints.Tuch1) {
        state.compassMode = 256;
        triggerChapter('Tuch1', false);
      } else if (pushed.num === 500 && !state.checkpoints.tuch512) {
        state.compassMode = 3030;
        triggerChapter('tuch512', false);
      }

      refreshCompassTarget();
      state.lastOutcomeText = msg('starPushed', { num: pushed.num, id: pushed.id });
      save();
      notifyUI({ pulse: true });
    }

    function activateShield() {
      if (!state || !state.unlocks.lumShield || state.shieldActive) return;
      if (state.res.lum < 2) {
        state.lastOutcomeText = msg('noLumShield');
        Audio.playBad();
        notifyUI();
        return;
      }
      changeRes('lum', -2, 'Lum');
      state.shieldActive = true;
      Audio.playStar();
      save();
      notifyUI({ pulse: true });
    }

    function convertT2s(convId) {
      var conv = null;
      for (var i = 0; i < World.T2S_CONVERSIONS.length; i++) {
        if (World.T2S_CONVERSIONS[i].id === convId) {
          conv = World.T2S_CONVERSIONS[i];
          break;
        }
      }
      if (!conv) return;
      if (state.res.t2s < conv.cost) {
        Audio.playBad();
        return;
      }
      changeRes('t2s', -conv.cost, 'T2s');
      Object.keys(conv.reward).forEach(function (k) {
        changeRes(k, conv.reward[k], k);
      });
      Audio.playGood();
      save();
      notifyUI({ pulse: true });
    }

    function emergencyRecharge() {
      // Filet de sécurité absolu anti-softlock si vraiment à sec
      if (!state) return;
      if (state.res.fuel === 0 && state.res.coque === 0 && state.res.hyper === 0 && state.res.t2s < 4) {
        changeRes('t2s', 6, 'T2s');
        changeRes('fuel', 6, 'Fuel');
        state.lastOutcomeText = msg('emergencyOk');
        Audio.playGood();
        save();
        notifyUI({ pulse: true });
      }
    }

    function performRefill16() {
      if (!state || !state.unlocks.refill16) return;
      var onStar = World.getCellContent(state.world, state.ship.x, state.ship.y).kind === 'star';
      if (!onStar && !state.unlocks.freeRefill) {
        state.lastOutcomeText = msg('refillNeedStar');
        Audio.playBad();
        notifyUI();
        return;
      }
      if (state.res.scan < 12) {
        state.lastOutcomeText = msg('refillNeedScan');
        Audio.playBad();
        notifyUI();
        return;
      }

      changeRes('scan', -12, 'Scan');
      var radius = 10;
      var count = 0;
      for (var dx = -radius; dx <= radius; dx++) {
        for (var dy = -radius; dy <= radius; dy++) {
          var cx = state.ship.x + dx;
          var cy = state.ship.y + dy;
          var c = World.getCellContent(state.world, cx, cy);
          if ((c.kind === 'planet' || c.kind === 'anomaly') && state.finished[c.id]) {
            delete state.finished[c.id];
            delete state.visited[c.id];
            count++;
          }
        }
      }
      spawnParticles(state.ship.x, state.ship.y, '52, 211, 153', 24, 85);
      Audio.playChapter();
      state.lastOutcomeText = msg('refillDone', { count: count });
      save();
      notifyUI({ pulse: true });
    }

    function setCompass(mode) {
      if (!state) return;
      if (mode === 'clear') {
        state.compassMode = null;
      } else {
        state.compassMode = mode;
      }
      refreshCompassTarget();
      Audio.playScan();
      save();
      notifyUI();
    }

    function toggleAimMode(force) {
      if (!state || !state.unlocks.hyper || state.res.hyper <= 0) {
        if (state) state.aimMode = false;
        notifyUI();
        return;
      }
      state.aimMode = force !== undefined ? !!force : !state.aimMode;
      state.aimAngle = null;
      notifyUI();
    }

    // Pointeur sur le canvas
    function onPointerDown(canvasX, canvasY) {
      if (!state || isTweening()) return;
      if (state.aimMode) {
        var shipSX = state.ship.visualX * CELL + CELL * 0.5 - state.cam.x;
        var shipSY = state.ship.visualY * CELL + CELL * 0.5 - state.cam.y;
        var ang = Math.atan2(canvasY - shipSY, canvasX - shipSX);
        performHyperJump(ang);
        return;
      }
      dragging = true;
      didDragMove = false;
      inertiaActive = false;
      dragLast.x = canvasX;
      dragLast.y = canvasY;
      dragVel.x = 0;
      dragVel.y = 0;
    }

    function onPointerMove(canvasX, canvasY) {
      if (!state) return;
      if (state.aimMode) {
        var shipSX = state.ship.visualX * CELL + CELL * 0.5 - state.cam.x;
        var shipSY = state.ship.visualY * CELL + CELL * 0.5 - state.cam.y;
        state.aimAngle = Math.atan2(canvasY - shipSY, canvasX - shipSX);
        return;
      }
      if (!dragging || isTweening()) return;
      var dx = dragLast.x - canvasX;
      var dy = dragLast.y - canvasY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        didDragMove = true;
      }
      state.cam.x += dx;
      state.cam.y += dy;
      dragVel.x = dx;
      dragVel.y = dy;
      dragLast.x = canvasX;
      dragLast.y = canvasY;
      checkBorderDuringScroll();
    }

    function onPointerUp(canvasX, canvasY) {
      if (!state) return;
      if (!dragging) return;
      dragging = false;

      if (!didDragMove && !isTweening()) {
        // Clic simple sur une case
        var gx = Math.floor((canvasX + state.cam.x) / CELL);
        var gy = Math.floor((canvasY + state.cam.y) / CELL);
        var mdx = gx - state.ship.x;
        var mdy = gy - state.ship.y;
        if (Math.abs(mdx) + Math.abs(mdy) === 1 && state.res.fuel > 0) {
          moveShipByStep(mdx, mdy);
        } else {
          visitCell(gx, gy, gx === state.ship.x && gy === state.ship.y);
        }
        return;
      }

      if (Math.hypot(dragVel.x, dragVel.y) > 1.5) {
        inertiaActive = true;
      }
    }

    function update(dt) {
      if (!state) return;

      // Tweens
      for (var i = state.tweens.length - 1; i >= 0; i--) {
        var tw = state.tweens[i];
        tw.elapsed += dt;
        var rawT = Spiral.clamp(tw.elapsed / tw.duration, 0, 1);
        var eased = tw.easing ? tw.easing(rawT) : rawT;
        tw.onUpdate(eased);
        if (rawT >= 1) {
          state.tweens.splice(i, 1);
          if (tw.onDone) tw.onDone();
        }
      }

      // Inertie du scroll
      if (inertiaActive && !dragging && !isTweening()) {
        state.cam.x += dragVel.x;
        state.cam.y += dragVel.y;
        dragVel.x *= 0.88;
        dragVel.y *= 0.88;
        if (checkBorderDuringScroll() || Math.hypot(dragVel.x, dragVel.y) < 0.6) {
          inertiaActive = false;
        }
      }

      // Particules
      for (var pi = state.particles.length - 1; pi >= 0; pi--) {
        var p = state.particles[pi];
        p.wx += p.vx * dt;
        p.wy += p.vy * dt;
        p.alpha -= dt * 1.6;
        if (p.alpha <= 0) state.particles.splice(pi, 1);
      }

      // Textes flottants
      for (var fi = state.floatingTexts.length - 1; fi >= 0; fi--) {
        var ft = state.floatingTexts[fi];
        ft.rise += dt * 34;
        ft.alpha -= dt * 0.95;
        if (ft.alpha <= 0) state.floatingTexts.splice(fi, 1);
      }

      if (state.borderFlash) {
        state.borderFlash.alpha -= dt * 2.2;
        if (state.borderFlash.alpha <= 0) state.borderFlash = null;
      }

      if (state.glitchTimer > 0) {
        state.glitchTimer = Math.max(0, state.glitchTimer - dt);
      }
    }

    return {
      getState: function () { return state; },
      hasSavedGame: hasSavedGame,
      loadSavedGame: loadSavedGame,
      startNewGame: startNewGame,
      moveShipByStep: moveShipByStep,
      visitCell: visitCell,
      exploitSelectedPlanet: exploitSelectedPlanet,
      attemptSelectedAnomaly: attemptSelectedAnomaly,
      buyArtefactAtSelected: buyArtefactAtSelected,
      sellArtefact: sellArtefact,
      pushSelectedStar: pushSelectedStar,
      activateShield: activateShield,
      convertT2s: convertT2s,
      emergencyRecharge: emergencyRecharge,
      performRefill16: performRefill16,
      setCompass: setCompass,
      goToNode: goToNode,
      toggleAimMode: toggleAimMode,
      onPointerDown: onPointerDown,
      onPointerMove: onPointerMove,
      onPointerUp: onPointerUp,
      update: update
    };
  }

  SPAWN.Game = {
    createGameEngine: createGameEngine,
    SAVE_KEY: SAVE_KEY
  };
})(window);
