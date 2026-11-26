(function (global) {
  'use strict';

  var SPAWN = (global.SPAWN = global.SPAWN || {});

  function boot() {
    var canvas = document.getElementById('game-canvas');
    var renderer = SPAWN.Renderer.createRenderer(canvas);
    var ui = null;

    var engine = SPAWN.Game.createGameEngine({
      onUpdate: function (state, opts) {
        if (ui) ui.update(state, opts);
      },
      onStoryEvent: function (chap, isModal) {
        if (ui) ui.onStoryEvent(chap, isModal);
      }
    });

    ui = SPAWN.UI.createUI(engine);
    ui.initIntro();

    // Pointer events unifiés (souris + tactile)
    function toCanvasCoords(evt) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = SPAWN.Renderer.VIEW_SIZE / rect.width;
      var scaleY = SPAWN.Renderer.VIEW_SIZE / rect.height;
      return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
      };
    }

    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture(e.pointerId);
      var p = toCanvasCoords(e);
      engine.onPointerDown(p.x, p.y);
    });

    canvas.addEventListener('pointermove', function (e) {
      var p = toCanvasCoords(e);
      engine.onPointerMove(p.x, p.y);
    });

    canvas.addEventListener('pointerup', function (e) {
      var p = toCanvasCoords(e);
      engine.onPointerUp(p.x, p.y);
    });

    canvas.addEventListener('pointercancel', function (e) {
      var p = toCanvasCoords(e);
      engine.onPointerUp(p.x, p.y);
    });

    // Raccourcis clavier
    global.addEventListener('keydown', function (e) {
      if (!engine.getState()) return;
      var k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w' || k === 'z') {
        e.preventDefault();
        engine.moveShipByStep(0, -1);
      } else if (k === 'arrowdown' || k === 's') {
        e.preventDefault();
        engine.moveShipByStep(0, 1);
      } else if (k === 'arrowleft' || k === 'a' || k === 'q') {
        e.preventDefault();
        engine.moveShipByStep(-1, 0);
      } else if (k === 'arrowright' || k === 'd') {
        e.preventDefault();
        engine.moveShipByStep(1, 0);
      } else if (k === 'h') {
        engine.toggleAimMode();
      } else if (k === 'j') {
        ui.openJournal();
      } else if (k === 'escape') {
        ui.closeModals();
      } else if (k === ' ' || k === 'enter') {
        var st = engine.getState();
        if (st && document.activeElement === document.body) {
          e.preventDefault();
          engine.visitCell(st.ship.x, st.ship.y, true);
        }
      }
    });

    global.addEventListener('resize', function () {
      renderer.resize();
    });

    var lastTime = performance.now();
    function loop(now) {
      var dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      engine.update(dt);
      var st = engine.getState();
      if (st) {
        renderer.render(st, now / 1000);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  document.addEventListener('DOMContentLoaded', boot);
})(window);
