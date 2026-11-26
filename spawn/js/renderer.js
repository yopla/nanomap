(function (global) {
  'use strict';

  var SPAWN = (global.SPAWN = global.SPAWN || {});
  var Spiral = SPAWN.Spiral;
  var World = SPAWN.World;
  var Lore = SPAWN.Lore;

  var CELL = 64;
  var VIEW_SIZE = 576; // 9x9 cases

  var ZONE_THEMES = {
    cosm: { bg1: '#071422', bg2: '#050b16', grid: 'rgba(56, 189, 248, 0.12)', glow: 'rgba(56, 189, 248, 0.16)' },
    dream: { bg1: '#120d26', bg2: '#080716', grid: 'rgba(167, 139, 250, 0.12)', glow: 'rgba(52, 211, 153, 0.12)' },
    forgot: { bg1: '#16100a', bg2: '#080911', grid: 'rgba(251, 191, 36, 0.11)', glow: 'rgba(245, 158, 11, 0.12)' },
    out: { bg1: '#1a091b', bg2: '#06060d', grid: 'rgba(244, 114, 182, 0.11)', glow: 'rgba(244, 114, 182, 0.13)' }
  };

  function createRenderer(canvas) {
    var ctx = canvas.getContext('2d');
    var dpr = 1;

    function resize() {
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.width = VIEW_SIZE * dpr;
      canvas.height = VIEW_SIZE * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    function drawBackground(state, timeSec) {
      var ring = Spiral.ringOf(state.ship.x, state.ship.y);
      var zKey = Lore.getZoneKey(ring);
      var theme = ZONE_THEMES[zKey];

      var grad = ctx.createRadialGradient(
        VIEW_SIZE * 0.5, VIEW_SIZE * 0.45, 30,
        VIEW_SIZE * 0.5, VIEW_SIZE * 0.5, VIEW_SIZE * 0.78
      );
      grad.addColorStop(0, theme.bg1);
      grad.addColorStop(1, theme.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_SIZE, VIEW_SIZE);

      // Parallaxe d'étoiles d'arrière-plan
      var camX = state.cam.x;
      var camY = state.cam.y;
      var layers = [
        { factor: 0.14, step: 140, size: 1.1, alpha: 0.35 },
        { factor: 0.28, step: 180, size: 1.6, alpha: 0.55 }
      ];

      for (var li = 0; li < layers.length; li++) {
        var L = layers[li];
        var ox = camX * L.factor;
        var oy = camY * L.factor;
        var minGX = Math.floor(ox / L.step) - 1;
        var maxGX = Math.ceil((ox + VIEW_SIZE) / L.step) + 1;
        var minGY = Math.floor(oy / L.step) - 1;
        var maxGY = Math.ceil((oy + VIEW_SIZE) / L.step) + 1;

        for (var gx = minGX; gx <= maxGX; gx++) {
          for (var gy = minGY; gy <= maxGY; gy++) {
            var h1 = Spiral.hash2d(gx, gy, state.world.seed + li * 97);
            var h2 = Spiral.hash2d(gx + 19, gy - 31, state.world.seed + li * 43);
            var sx = (gx + h1) * L.step - ox;
            var sy = (gy + h2) * L.step - oy;
            var twinkle = 0.65 + 0.35 * Math.sin(timeSec * 1.8 + h1 * 12);
            ctx.fillStyle = 'rgba(226, 232, 240, ' + (L.alpha * twinkle).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(sx, sy, L.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    function drawGridAndNodes(state, timeSec) {
      var camX = state.cam.x;
      var camY = state.cam.y;
      var startX = Math.floor(camX / CELL) - 1;
      var endX = Math.ceil((camX + VIEW_SIZE) / CELL) + 1;
      var startY = Math.floor(camY / CELL) - 1;
      var endY = Math.ceil((camY + VIEW_SIZE) / CELL) + 1;

      var ringShip = Spiral.ringOf(state.ship.x, state.ship.y);
      var theme = ZONE_THEMES[Lore.getZoneKey(ringShip)];

      for (var gx = startX; gx <= endX; gx++) {
        for (var gy = startY; gy <= endY; gy++) {
          var sx = gx * CELL - camX;
          var sy = gy * CELL - camY;
          var cx = sx + CELL * 0.5;
          var cy = sy + CELL * 0.5;
          var cell = World.getCellContent(state.world, gx, gy);

          // Case subtile
          var isSelected = state.selectedCell && state.selectedCell.x === gx && state.selectedCell.y === gy;
          var isShipTile = state.ship.x === gx && state.ship.y === gy;

          ctx.strokeStyle = isSelected ? 'rgba(125, 211, 252, 0.72)' : theme.grid;
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.strokeRect(sx + 4, sy + 4, CELL - 8, CELL - 8);

          if (isShipTile) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
            ctx.fillRect(sx + 5, sy + 5, CELL - 10, CELL - 10);
          }

          // Rendu selon contenu
          if (cell.kind === 'center') {
            drawCenterNode(cx, cy, timeSec);
          } else if (cell.kind === 'embassy') {
            drawEmbassyNode(cx, cy, timeSec, !!state.visited[cell.id]);
          } else if (cell.kind === 'star') {
            drawStarNode(cx, cy, cell.star, timeSec, !!state.visited[cell.id]);
          } else if (cell.kind === 'planet') {
            drawPlanetNode(cx, cy, cell, timeSec, !!state.visited[cell.id], !!state.finished[cell.id]);
          } else if (cell.kind === 'anomaly') {
            drawAnomalyNode(cx, cy, cell, timeSec, !!state.visited[cell.id], !!state.finished[cell.id]);
          }
        }
      }
    }

    function drawCenterNode(cx, cy, t) {
      var pulse = 1 + Math.sin(t * 2.5) * 0.08;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(253, 224, 71, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 10, t * 0.8, t * 0.8 + Math.PI * 1.35);
      ctx.stroke();

      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawEmbassyNode(cx, cy, t, visited) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.45);
      ctx.strokeStyle = visited ? '#f472b6' : '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -12, 24, 24);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
      ctx.strokeRect(-9, -9, 18, 18);
      ctx.restore();
    }

    function drawStarNode(cx, cy, star, t, visited) {
      var isKey = star.special !== null;
      var glowR = isKey ? 24 : 18;
      var pulse = 0.88 + 0.12 * Math.sin(t * 2.2 + star.num);
      var color = star.num === 400 ? '#fbbf24'
        : star.num === 500 ? '#f472b6'
        : star.num === 1 ? '#38bdf8'
        : star.num === 256 ? '#a78bfa'
        : '#fde68a';

      var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, glowR * pulse);
      g.addColorStop(0, color);
      g.addColorStop(0.45, 'rgba(253, 230, 138, 0.3)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Branches étoile à 4 pointes
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      var R = isKey ? 10 : 8;
      var r = 3;
      for (var i = 0; i < 8; i++) {
        var ang = (i * Math.PI) / 4;
        var rad = i % 2 === 0 ? R : r;
        var px = Math.cos(ang) * rad;
        var py = Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      if (visited) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.font = '600 10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('#' + star.num, 0, 21);
      }
      ctx.restore();
    }

    function drawPlanetNode(cx, cy, cell, t, visited, finished) {
      var colors = {
        boltz: '#fb7185',
        crewz: '#34d399',
        golem: '#60a5fa'
      };
      ctx.save();
      ctx.translate(cx, cy);
      if (finished) ctx.globalAlpha = 0.35;

      if (!visited) {
        // Losange inconnu mystérieux (comme pouletteA avant scan)
        var s = 7.5 + Math.sin(t * 2 + cell.id) * 0.9;
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.72)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s, 0);
        ctx.closePath();
        ctx.stroke();
      } else {
        var col = colors[cell.subtype] || '#93c5fd';
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 5, -0.35, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawAnomalyNode(cx, cy, cell, t, visited, finished) {
      var colors = {
        blocage: '#22d3ee',
        surnature: '#e879f9',
        dramaboss: '#facc15'
      };
      ctx.save();
      ctx.translate(cx, cy);
      if (finished) ctx.globalAlpha = 0.32;

      if (!visited) {
        var s = 7 + Math.cos(t * 2.2 + cell.id) * 0.8;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(226, 232, 240, 0.6)';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        var col = colors[cell.subtype] || '#e879f9';
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(10, 8);
        ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawShipAndCompass(state, timeSec) {
      var shipScreenX = state.ship.visualX * CELL + CELL * 0.5 - state.cam.x;
      var shipScreenY = state.ship.visualY * CELL + CELL * 0.5 - state.cam.y;

      // Traînée de propulseurs / particules
      for (var i = 0; i < state.particles.length; i++) {
        var p = state.particles[i];
        var px = p.wx - state.cam.x;
        var py = p.wy - state.cam.y;
        ctx.fillStyle = 'rgba(' + p.rgb + ',' + p.alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Zone de visée HyperJump
      if (state.aimMode) {
        ctx.save();
        ctx.translate(shipScreenX, shipScreenY);
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.38)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 120, 0, Math.PI * 2);
        ctx.stroke();

        if (state.aimAngle !== null) {
          ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(216, 180, 254, 0.9)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(state.aimAngle) * 145, Math.sin(state.aimAngle) * 145);
          ctx.stroke();

          ctx.fillStyle = 'rgba(192, 132, 252, 0.16)';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 145, state.aimAngle - 0.24, state.aimAngle + 0.24);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Vaisseau
      ctx.save();
      ctx.translate(shipScreenX, shipScreenY);

      if (state.shieldActive) {
        ctx.strokeStyle = 'rgba(253, 224, 71, ' + (0.55 + 0.25 * Math.sin(timeSec * 4)).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Boussole orbitale (visible uniquement si active)
      if (state.compassTarget) {
        var tx = state.compassTarget.x - state.ship.visualX;
        var ty = state.compassTarget.y - state.ship.visualY;
        var distCells = Math.sqrt(tx * tx + ty * ty);
        if (distCells > 0.4) {
          var cAng = Math.atan2(ty, tx);
          ctx.save();
          ctx.rotate(cAng);
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.moveTo(29, 0);
          ctx.lineTo(21, -4.5);
          ctx.lineTo(23, 0);
          ctx.lineTo(21, 4.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.rotate(state.ship.angle);

      // Halo moteur
      var engineGlow = ctx.createRadialGradient(-8, 0, 1, -8, 0, 16);
      engineGlow.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
      engineGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = engineGlow;
      ctx.beginPath();
      ctx.arc(-8, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Corps du vaisseau
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -9);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.arc(2, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawBorderFeedback(state, timeSec) {
      var shipScreenX = state.ship.visualX * CELL + CELL * 0.5 - state.cam.x;
      var shipScreenY = state.ship.visualY * CELL + CELL * 0.5 - state.cam.y;
      var margin = 44;
      var hasCoque = state.res.coque > 0;
      var baseRgb = hasCoque ? '56, 189, 248' : '251, 113, 133';

      // Proximité aux 4 bords pendant le scroll
      var edges = [
        { side: 'left', prox: Spiral.clamp((margin - shipScreenX) / margin, 0, 1) },
        { side: 'right', prox: Spiral.clamp((shipScreenX - (VIEW_SIZE - margin)) / margin, 0, 1) },
        { side: 'top', prox: Spiral.clamp((margin - shipScreenY) / margin, 0, 1) },
        { side: 'bottom', prox: Spiral.clamp((shipScreenY - (VIEW_SIZE - margin)) / margin, 0, 1) }
      ];

      for (var i = 0; i < edges.length; i++) {
        var e = edges[i];
        if (e.prox <= 0.02) continue;
        var a = e.prox * (hasCoque ? 0.55 : 0.75 * (0.65 + 0.35 * Math.sin(timeSec * 12)));
        var g;
        if (e.side === 'left') {
          g = ctx.createLinearGradient(0, 0, 26, 0);
          g.addColorStop(0, 'rgba(' + baseRgb + ',' + a.toFixed(3) + ')');
          g.addColorStop(1, 'rgba(' + baseRgb + ',0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 26, VIEW_SIZE);
        } else if (e.side === 'right') {
          g = ctx.createLinearGradient(VIEW_SIZE, 0, VIEW_SIZE - 26, 0);
          g.addColorStop(0, 'rgba(' + baseRgb + ',' + a.toFixed(3) + ')');
          g.addColorStop(1, 'rgba(' + baseRgb + ',0)');
          ctx.fillStyle = g;
          ctx.fillRect(VIEW_SIZE - 26, 0, 26, VIEW_SIZE);
        } else if (e.side === 'top') {
          g = ctx.createLinearGradient(0, 0, 0, 26);
          g.addColorStop(0, 'rgba(' + baseRgb + ',' + a.toFixed(3) + ')');
          g.addColorStop(1, 'rgba(' + baseRgb + ',0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, VIEW_SIZE, 26);
        } else {
          g = ctx.createLinearGradient(0, VIEW_SIZE, 0, VIEW_SIZE - 26);
          g.addColorStop(0, 'rgba(' + baseRgb + ',' + a.toFixed(3) + ')');
          g.addColorStop(1, 'rgba(' + baseRgb + ',0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, VIEW_SIZE - 26, VIEW_SIZE, 26);
        }
      }

      // Flash d'impact / rebond bord-de-cadre
      if (state.borderFlash && state.borderFlash.alpha > 0.01) {
        var bf = state.borderFlash;
        ctx.save();
        ctx.strokeStyle = 'rgba(' + bf.rgb + ',' + bf.alpha.toFixed(3) + ')';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, VIEW_SIZE - 4, VIEW_SIZE - 4);
        ctx.restore();
      }

      // Effet glitch chromatique si coque 0
      if (state.glitchTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(251, 113, 133, 0.14)';
        for (var r = 0; r < 5; r++) {
          var ry = ((timeSec * 700 + r * 97) % VIEW_SIZE);
          ctx.fillRect(0, ry, VIEW_SIZE, 4 + (r % 3) * 3);
        }
        ctx.restore();
      }
    }

    function drawFloatingTexts(state) {
      for (var i = 0; i < state.floatingTexts.length; i++) {
        var ft = state.floatingTexts[i];
        var sx = ft.wx - state.cam.x;
        var sy = ft.wy - state.cam.y - ft.rise;
        ctx.save();
        ctx.globalAlpha = Spiral.clamp(ft.alpha, 0, 1);
        ctx.font = '700 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(5, 8, 17, 0.85)';
        ctx.fillText(ft.text, sx + 1, sy + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, sx, sy);
        ctx.restore();
      }
    }

    function render(state, timeSec) {
      drawBackground(state, timeSec);
      drawGridAndNodes(state, timeSec);
      drawShipAndCompass(state, timeSec);
      drawBorderFeedback(state, timeSec);
      drawFloatingTexts(state);
    }

    return {
      CELL: CELL,
      VIEW_SIZE: VIEW_SIZE,
      resize: resize,
      render: render
    };
  }

  SPAWN.Renderer = {
    CELL: CELL,
    VIEW_SIZE: VIEW_SIZE,
    createRenderer: createRenderer
  };
})(window);
