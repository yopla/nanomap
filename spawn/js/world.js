(function (global) {
  'use strict';

  var SPAWN = (global.SPAWN = global.SPAWN || {});
  var Spiral = SPAWN.Spiral;
  var Lore = SPAWN.Lore;

  var CAPS = {
    fuel: 96,
    coque: 48,
    scan: 48,
    hyper: 12,
    t2s: 96,
    lum: 128
  };

  var INITIAL_RESOURCES = {
    fuel: 40,
    coque: 24,
    scan: 16,
    hyper: 3,
    t2s: 6,
    lum: 0
  };

  var LOOT_DECK_BASE = [
    { idx: 0, fuel: 8, coque: 0, hyper: 1 },
    { idx: 1, fuel: 8, coque: 0, hyper: 1 },
    { idx: 2, fuel: 2, coque: 3, hyper: 1 },
    { idx: 3, fuel: 2, coque: 3, hyper: 1 },
    { idx: 4, fuel: 12, coque: 2, hyper: 0 },
    { idx: 5, fuel: 12, coque: 2, hyper: 0 },
    { idx: 6, fuel: 0, coque: -2, hyper: -1, isBad: true },
    { idx: 7, fuel: -6, coque: -2, hyper: 0, isBad: true },
    { idx: 8, fuel: -10, coque: 0, hyper: -1, isBad: true }
  ];

  var BET_TABLES = {
    blocage: [
      { cost: { fuel: 4 }, reward: { coque: 1 }, prob: 0.95 },
      { cost: { coque: 1 }, reward: { fuel: 4 }, prob: 0.95 },
      { cost: { fuel: 14 }, reward: { hyper: 1 }, prob: 0.95 },
      { cost: { hyper: 1 }, reward: { fuel: 14 }, prob: 0.95 },
      { cost: { coque: 4 }, reward: { hyper: 1 }, prob: 0.95 },
      { cost: { hyper: 1 }, reward: { coque: 4 }, prob: 0.95 }
    ],
    surnature: [
      { cost: { fuel: 4 }, reward: { coque: 2 }, prob: 0.70 },
      { cost: { fuel: 8 }, reward: { coque: 2, hyper: 1 }, prob: 0.65 },
      { cost: { coque: 2 }, reward: { hyper: 1 }, prob: 0.68 },
      { cost: { hyper: 1 }, reward: { fuel: 24 }, prob: 0.66 },
      { cost: { coque: 2 }, reward: { fuel: 12 }, prob: 0.70 },
      { cost: { hyper: 1 }, reward: { coque: 6 }, prob: 0.65 }
    ],
    dramaboss: [
      { cost: { coque: 4 }, reward: { hyper: 6 }, prob: 0.38 },
      { cost: { fuel: 12 }, reward: { hyper: 5 }, prob: 0.38 },
      { cost: { fuel: 12 }, reward: { coque: 16 }, prob: 0.38 },
      { cost: { hyper: 2 }, reward: { coque: 20 }, prob: 0.38 },
      { cost: { coque: 4 }, reward: { fuel: 36 }, prob: 0.38 },
      { cost: { hyper: 2 }, reward: { fuel: 48 }, prob: 0.38 }
    ]
  };

  function getConversions() {
    var ct = (Lore.TEXTES && Lore.TEXTES.conversions) || {};
    return [
      { id: 't2s_fuel', cost: 4, reward: { fuel: 4 }, label: ct.t2s_fuel.label, tag: ct.t2s_fuel.tag },
      { id: 't2s_coque', cost: 10, reward: { coque: 3 }, label: ct.t2s_coque.label, tag: ct.t2s_coque.tag },
      { id: 't2s_scan', cost: 12, reward: { scan: 6 }, label: ct.t2s_scan.label, tag: ct.t2s_scan.tag },
      { id: 't2s_hyper', cost: 18, reward: { hyper: 1 }, label: ct.t2s_hyper.label, tag: ct.t2s_hyper.tag }
    ];
  }
  var T2S_CONVERSIONS = getConversions();

  function pickFreePosInRingRange(minRing, maxRing, angleRange, rng, occupiedIds) {
    var attempts = 0;
    while (attempts < 4000) {
      attempts++;
      var r = minRing + Math.floor(rng() * (maxRing - minRing + 1));
      var ang = angleRange
        ? angleRange[0] + rng() * (angleRange[1] - angleRange[0])
        : rng() * Math.PI * 2;
      var x = Math.round(Math.cos(ang) * r);
      var y = Math.round(Math.sin(ang) * r);
      var ring = Spiral.ringOf(x, y);
      if (ring < minRing || ring > maxRing) continue;
      var id = Spiral.posToId(x, y);
      if (id === 1 || id === 3030 || occupiedIds[id]) continue;
      return { x: x, y: y, id: id, ring: ring, angle: Math.atan2(y, x) };
    }
    // Fallback déterministe sur l'anneau
    for (var rr = minRing; rr <= maxRing; rr++) {
      for (var k = -rr; k <= rr; k++) {
        var cid = Spiral.posToId(k, rr);
        if (cid !== 1 && cid !== 3030 && !occupiedIds[cid]) {
          return { x: k, y: rr, id: cid, ring: rr, angle: Math.atan2(rr, k) };
        }
      }
    }
    return { x: minRing, y: 0, id: Spiral.posToId(minRing, 0), ring: minRing, angle: 0 };
  }

  function createWorld(seedValue, pushedOverrides) {
    var rng = Spiral.createRng(seedValue);
    var occupied = { 1: true, 3030: true };

    // 1. Placer les 4 étoiles scénaristiques dans leurs zones et quadrants distincts
    var p400 = pickFreePosInRingRange(52, 58, null, rng, occupied);
    occupied[p400.id] = true;

    var oppositeMin = p400.angle + Math.PI - 0.65;
    var oppositeMax = p400.angle + Math.PI + 0.65;
    var p500 = pickFreePosInRingRange(64, 70, [oppositeMin, oppositeMax], rng, occupied);
    occupied[p500.id] = true;

    var p1 = pickFreePosInRingRange(8, 11, null, rng, occupied);
    occupied[p1.id] = true;

    var p256 = pickFreePosInRingRange(32, 38, [p400.angle - 1.1, p400.angle + 1.1], rng, occupied);
    occupied[p256.id] = true;

    // 2. Choisir le spawn du joueur à 4–6 cases de #400
    var spawnAngle = p400.angle + (rng() > 0.5 ? 0.55 : -0.55) + (rng() - 0.5) * 0.6;
    var spawnDist = 4 + Math.floor(rng() * 3); // 4..6 cases
    var spawnX = p400.x + Math.round(Math.cos(spawnAngle) * spawnDist);
    var spawnY = p400.y + Math.round(Math.sin(spawnAngle) * spawnDist);
    var spawnId = Spiral.posToId(spawnX, spawnY);
    if (occupied[spawnId]) {
      spawnX = p400.x + 4;
      spawnY = p400.y + 2;
      spawnId = Spiral.posToId(spawnX, spawnY);
    }
    occupied[spawnId] = true;

    // 3. Garantir une 2ème étoile à 10–15 cases du spawn pour guider le joueur dès les premières minutes
    var nearStarPos = null;
    for (var t = 0; t < 200; t++) {
      var a2 = spawnAngle + Math.PI * (0.45 + rng() * 0.9);
      var d2 = 10 + Math.floor(rng() * 5);
      var nx = spawnX + Math.round(Math.cos(a2) * d2);
      var ny = spawnY + Math.round(Math.sin(a2) * d2);
      var nring = Spiral.ringOf(nx, ny);
      if (nring < 43 || nring > 70) continue;
      var nid = Spiral.posToId(nx, ny);
      if (!occupied[nid] && Spiral.dist(nx, ny, p400.x, p400.y) >= 8) {
        nearStarPos = { x: nx, y: ny, id: nid, ring: nring };
        occupied[nid] = true;
        break;
      }
    }

    // 4. Compléter jusqu'à 64 étoiles au total réparties dans les 3 zones intérieures + bordure
    var extraStars = [];
    var totalTarget = 64;
    var needed = totalTarget - 4 - (nearStarPos ? 1 : 0);
    var zoneQuotas = [
      { min: 4, max: 14, count: 6 },
      { min: 15, max: 42, count: 24 },
      { min: 43, max: 72, count: needed - 30 }
    ];

    for (var zq = 0; zq < zoneQuotas.length; zq++) {
      var q = zoneQuotas[zq];
      for (var c = 0; c < q.count; c++) {
        var sp = pickFreePosInRingRange(q.min, q.max, null, rng, occupied);
        // Éviter d'entasser deux étoiles à moins de 4 cases l'une de l'autre
        var tooClose = false;
        if (Spiral.dist(sp.x, sp.y, p400.x, p400.y) < 4 ||
            Spiral.dist(sp.x, sp.y, p500.x, p500.y) < 4 ||
            Spiral.dist(sp.x, sp.y, p1.x, p1.y) < 4 ||
            Spiral.dist(sp.x, sp.y, p256.x, p256.y) < 4) {
          tooClose = true;
        }
        if (tooClose) {
          c--;
          continue;
        }
        occupied[sp.id] = true;
        extraStars.push(sp);
      }
    }

    // Attribuer des numéros cohérents avec la distance spirale (plus petit = plus proche du centre)
    var poolStars = (nearStarPos ? [nearStarPos] : []).concat(extraStars);
    poolStars.sort(function (a, b) {
      return a.id - b.id;
    });

    var reservedNums = { 1: true, 256: true, 400: true, 500: true };
    var stars = [
      { num: 1, id: p1.id, x: p1.x, y: p1.y, special: 'onu1', pushed: false },
      { num: 256, id: p256.id, x: p256.x, y: p256.y, special: 'onubis256', pushed: false },
      { num: 400, id: p400.id, x: p400.x, y: p400.y, special: 'home400', pushed: false },
      { num: 500, id: p500.id, x: p500.x, y: p500.y, special: 'disparu500', pushed: false }
    ];

    var maxPossibleId = Spiral.posToId(72, 72);
    for (var sIdx = 0; sIdx < poolStars.length; sIdx++) {
      var st = poolStars[sIdx];
      var approxNum = Math.max(2, Math.min(511, Math.round((st.id / maxPossibleId) * 510)));
      while (reservedNums[approxNum]) {
        approxNum = approxNum < 511 ? approxNum + 1 : 2;
      }
      reservedNums[approxNum] = true;
      stars.push({
        num: approxNum,
        id: st.id,
        x: st.x,
        y: st.y,
        special: null,
        pushed: false
      });
    }

    // Appliquer les étoiles déjà poussées si chargement de sauvegarde
    if (pushedOverrides) {
      for (var k = 0; k < stars.length; k++) {
        if (pushedOverrides[stars[k].num]) {
          stars[k].id = pushedOverrides[stars[k].num];
          var np = Spiral.idToPos(stars[k].id);
          stars[k].x = np[0];
          stars[k].y = np[1];
          stars[k].pushed = true;
        }
      }
    }

    // 5. Distributions RVB (cycle 72) et CMJ (cycle 108)
    var planetCycle = 72;
    var pTier = 24;
    var distriPlanets = [
      2 + Math.floor(rng() * (pTier - 3)),
      pTier + 2 + Math.floor(rng() * (pTier - 3)),
      2 * pTier + 2 + Math.floor(rng() * (pTier - 3))
    ];

    var anomCycle = 108;
    var aTier = 36;
    var distriAnomalies = [
      3 + Math.floor(rng() * (aTier - 5)),
      aTier + 3 + Math.floor(rng() * (aTier - 5)),
      2 * aTier + 3 + Math.floor(rng() * (aTier - 5))
    ];

    var lootDeck = Spiral.shuffleWithRng(LOOT_DECK_BASE, rng);
    var betTablesShuffled = {
      blocage: Spiral.shuffleWithRng(BET_TABLES.blocage, rng),
      surnature: Spiral.shuffleWithRng(BET_TABLES.surnature, rng),
      dramaboss: Spiral.shuffleWithRng(BET_TABLES.dramaboss, rng)
    };

    var embassyPos = Spiral.idToPos(3030);

    var world = {
      seed: seedValue,
      stars: stars,
      starsById: {},
      starsByNum: {},
      spawn: { x: spawnX, y: spawnY, id: spawnId },
      embassy: { id: 3030, x: embassyPos[0], y: embassyPos[1] },
      planetCycle: planetCycle,
      distriPlanets: distriPlanets,
      anomCycle: anomCycle,
      distriAnomalies: distriAnomalies,
      lootDeck: lootDeck,
      betTables: betTablesShuffled
    };

    rebuildStarIndex(world);
    return world;
  }

  function rebuildStarIndex(world) {
    world.starsById = {};
    world.starsByNum = {};
    for (var i = 0; i < world.stars.length; i++) {
      var st = world.stars[i];
      world.starsById[st.id] = st;
      world.starsByNum[st.num] = st;
    }
  }

  function pushStarInWorld(world, starNum) {
    var st = world.starsByNum[starNum];
    if (!st) return null;
    var nextId = st.id + 1;
    while (nextId === 1 || nextId === 3030 || world.starsById[nextId]) {
      nextId++;
    }
    var pos = Spiral.idToPos(nextId);
    st.id = nextId;
    st.x = pos[0];
    st.y = pos[1];
    st.pushed = true;
    rebuildStarIndex(world);
    return st;
  }

  function getCellContent(world, x, y) {
    var id = Spiral.posToId(x, y);
    var ring = Spiral.ringOf(x, y);

    if (x === 0 && y === 0) {
      return { kind: 'center', id: 1, x: 0, y: 0, ring: 0 };
    }
    if (id === 3030) {
      return { kind: 'embassy', id: 3030, x: x, y: y, ring: ring };
    }
    var star = world.starsById[id];
    if (star) {
      return { kind: 'star', id: id, x: x, y: y, ring: ring, star: star };
    }

    // Planètes RVB (cycle 72)
    var pMod = id % world.planetCycle;
    for (var pi = 0; pi < 3; pi++) {
      if (pMod === world.distriPlanets[pi]) {
        var arch = Lore.PLANET_ARCHETYPES[pi];
        var cycleIdx = Math.floor(id / world.planetCycle);
        var textIdx = (cycleIdx + pi * 2 + world.seed) % arch.texts.length;
        var rawLoot = world.lootDeck[(cycleIdx * 3 + pi) % world.lootDeck.length];
        var lootLabels = (Lore.TEXTES && Lore.TEXTES.planets && Lore.TEXTES.planets.lootLabels) || [];
        var loot = Object.assign({ label: lootLabels[rawLoot.idx] || '' }, rawLoot);
        return {
          kind: 'planet',
          subtype: arch.key,
          archetypeIndex: pi,
          label: arch.label,
          text: arch.texts[textIdx],
          loot: loot,
          id: id,
          x: x,
          y: y,
          ring: ring
        };
      }
    }

    // Anomalies CMJ (cycle 108)
    var aMod = id % world.anomCycle;
    var aKeys = ['blocage', 'surnature', 'dramaboss'];
    for (var ai = 0; ai < 3; ai++) {
      if (aMod === world.distriAnomalies[ai]) {
        var key = aKeys[ai];
        var info = Lore.ANOMALY_TYPES[key];
        var aCycle = Math.floor(id / world.anomCycle);
        var tIdx = (aCycle + ai + world.seed) % info.titles.length;
        var table = world.betTables[key];
        var bet = table[(aCycle + ai) % table.length];
        return {
          kind: 'anomaly',
          subtype: key,
          anomalyIndex: ai,
          label: info.label,
          title: info.titles[tIdx],
          text: info.texts[tIdx],
          bet: bet,
          id: id,
          x: x,
          y: y,
          ring: ring
        };
      }
    }

    return { kind: 'empty', id: id, x: x, y: y, ring: ring };
  }

  function findNearestStar(world, fromX, fromY) {
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < world.stars.length; i++) {
      var st = world.stars[i];
      var d = Spiral.dist(fromX, fromY, st.x, st.y);
      if (d > 0.1 && d < bestDist) {
        bestDist = d;
        best = st;
      }
    }
    return best;
  }

  SPAWN.World = {
    CAPS: CAPS,
    INITIAL_RESOURCES: INITIAL_RESOURCES,
    T2S_CONVERSIONS: T2S_CONVERSIONS,
    getConversions: getConversions,
    createWorld: createWorld,
    pushStarInWorld: pushStarInWorld,
    getCellContent: getCellContent,
    findNearestStar: findNearestStar
  };
})(window);
