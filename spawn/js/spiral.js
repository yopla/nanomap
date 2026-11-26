(function (global) {
  'use strict';

  var SPAWN = (global.SPAWN = global.SPAWN || {});

  /**
   * Spirale carrée identique à Util.getIdxByPos de _spawnLocal/truc/Scroller.as.
   * (0, 0) -> 1, puis anneaux concentriques dans l'ordre exact d'origine.
   */
  function posToId(x, y) {
    var ax = x < 0 ? -x : x;
    var ay = y < 0 ? -y : y;
    var n = ax > ay ? ax : ay;
    if (n === 0) return 1;
    var base = 4 * n * (n + 1) + 1;
    if (y === n) return base - n + x;
    if (x === -n) return base - 3 * n + y;
    if (y === -n) return base - 5 * n - x;
    return base - 7 * n - y;
  }

  /**
   * Inverse analytique O(1) de posToId(x, y).
   */
  function idToPos(id) {
    if (id <= 1) return [0, 0];
    var n = Math.ceil((Math.sqrt(id) - 1) / 2);
    while ((2 * n - 1) * (2 * n - 1) >= id) n--;
    while ((2 * n + 1) * (2 * n + 1) < id) n++;

    var base = 4 * n * (n + 1) + 1;
    var diff = base - id;
    if (diff <= 2 * n) return [n - diff, n];
    if (diff <= 4 * n) return [-n, 3 * n - diff];
    if (diff <= 6 * n) return [diff - 5 * n, -n];
    return [n, diff - 7 * n];
  }

  function ringOf(x, y) {
    var ax = x < 0 ? -x : x;
    var ay = y < 0 ? -y : y;
    return ax > ay ? ax : ay;
  }

  /**
   * PRNG déterministe Mulberry32.
   */
  function createRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleWithRng(arr, rng) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function hash2d(x, y, seed) {
    var h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function dist(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  SPAWN.Spiral = {
    posToId: posToId,
    idToPos: idToPos,
    ringOf: ringOf,
    createRng: createRng,
    shuffleWithRng: shuffleWithRng,
    hash2d: hash2d,
    dist: dist,
    lerp: lerp,
    clamp: clamp,
    easeOutCubic: easeOutCubic,
    easeOutQuart: easeOutQuart,
    easeInOutQuart: easeInOutQuart,
    easeOutBack: easeOutBack
  };
})(window);
