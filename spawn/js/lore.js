(function (global) {
  'use strict';

  var SPAWN = (global.SPAWN = global.SPAWN || {});
  var BASE_TEXTES = global.SPAWN_TEXTES || {};
  var SCENARIOS = global.SPAWN_SCENARIOS || [];

  function isPlainObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v);
  }

  function deepMerge(base, override) {
    if (!isPlainObject(base)) return override !== undefined ? override : base;
    var out = {};
    var keys = Object.keys(base);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      out[k] = base[k];
    }
    if (!isPlainObject(override)) return out;
    var oKeys = Object.keys(override);
    for (var j = 0; j < oKeys.length; j++) {
      var ok = oKeys[j];
      var ov = override[ok];
      if (isPlainObject(ov) && isPlainObject(out[ok])) {
        out[ok] = deepMerge(out[ok], ov);
      } else if (Array.isArray(ov)) {
        out[ok] = ov.slice();
      } else if (ov !== undefined) {
        out[ok] = ov;
      }
    }
    return out;
  }

  var Lore = {
    TEXTES: {},
    ZONES: {},
    STORY_CHAPTERS: {},
    SPECIAL_TEXTS: {},
    PLANET_ARCHETYPES: [],
    ANOMALY_TYPES: {},
    ARTEFACT_FAMILIES: [],
    EVENTS: [],
    ACTIVE_MOOD: null,

    getAllMoods: function () {
      return SCENARIOS;
    },

    getMoodById: function (id) {
      for (var i = 0; i < SCENARIOS.length; i++) {
        if (SCENARIOS[i].id === id) return SCENARIOS[i];
      }
      return SCENARIOS[0] || null;
    },

    pickRandomMood: function (excludeId) {
      if (SCENARIOS.length === 0) return null;
      var pool = SCENARIOS;
      if (excludeId && SCENARIOS.length > 1) {
        pool = SCENARIOS.filter(function (m) { return m.id !== excludeId; });
      }
      return pool[Math.floor(Math.random() * pool.length)];
    },

    getActiveMood: function () {
      return Lore.ACTIVE_MOOD;
    },

    setActiveMood: function (moodId) {
      var mood = Lore.getMoodById(moodId);
      var merged = deepMerge(BASE_TEXTES, mood || {});

      Lore.ACTIVE_MOOD = mood;
      Lore.TEXTES = merged;
      Lore.ZONES = merged.zones;
      Lore.STORY_CHAPTERS = merged.chapters;
      Lore.SPECIAL_TEXTS = merged.specials;

      Lore.PLANET_ARCHETYPES = [
        Object.assign({ key: 'boltz' }, merged.planets.archetypes.boltz),
        Object.assign({ key: 'crewz' }, merged.planets.archetypes.crewz),
        Object.assign({ key: 'golem' }, merged.planets.archetypes.golem)
      ];

      Lore.ANOMALY_TYPES = {
        blocage: Object.assign({ key: 'blocage' }, merged.anomalies.types.blocage),
        surnature: Object.assign({ key: 'surnature' }, merged.anomalies.types.surnature),
        dramaboss: Object.assign({ key: 'dramaboss' }, merged.anomalies.types.dramaboss)
      };

      Lore.ARTEFACT_FAMILIES = merged.artefacts;
      Lore.EVENTS = (mood && Array.isArray(mood.events)) ? mood.events.slice() : [];

      if (typeof global.document !== 'undefined' && global.document.documentElement && mood && mood.accent) {
        global.document.documentElement.style.setProperty('--mood-accent', mood.accent);
      }

      return mood;
    },

    format: function (template, vars) {
      if (!template) return '';
      if (!vars) return template;
      return String(template).replace(/\{(\w+)\}/g, function (match, key) {
        return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match;
      });
    },

    getZoneKey: function (ring) {
      if (ring <= 14) return 'cosm';
      if (ring <= 42) return 'dream';
      if (ring <= 72) return 'forgot';
      return 'out';
    },

    getZoneInfo: function (ring) {
      return Lore.ZONES[Lore.getZoneKey(ring)];
    },

    getAmbientLine: function (ring, id) {
      var z = Lore.getZoneInfo(ring);
      return z.ambient[Math.abs(id) % z.ambient.length];
    },

    getStarName: function (star) {
      var custom = Lore.ACTIVE_MOOD && Lore.ACTIVE_MOOD.starNames;
      if (custom && custom[star.num]) return custom[star.num];
      if (star.num === 400) return 'Étoile #400 · Le Foyer';
      if (star.num === 500) return 'Étoile #500 · Le Disparu';
      if (star.num === 1) return 'Étoile #1 · La Sentinelle';
      if (star.num === 256) return 'Étoile #256 · L’Onubis';
      var p = Lore.TEXTES.stars.prefixes[(star.num * 7 + star.id) % Lore.TEXTES.stars.prefixes.length];
      var s = Lore.TEXTES.stars.suffixes[(star.num * 11 + star.id) % Lore.TEXTES.stars.suffixes.length];
      return 'Étoile #' + star.num + ' · ' + p + ' ' + s;
    },

    getStarDescription: function (star, state) {
      if (star.num === 400) {
        if (star.pushed) return Lore.SPECIAL_TEXTS.star400.pushed;
        if (state.checkpoints.reachCenter) return Lore.SPECIAL_TEXTS.star400.afterCenter;
        return Lore.SPECIAL_TEXTS.star400.first;
      }
      if (star.num === 500) {
        return star.pushed ? Lore.SPECIAL_TEXTS.star500.pushed : Lore.SPECIAL_TEXTS.star500.first;
      }
      if (star.num === 1) {
        return star.pushed ? Lore.SPECIAL_TEXTS.star1.pushed : Lore.SPECIAL_TEXTS.star1.first;
      }
      if (star.num === 256) {
        return state.checkpoints.reach256_WIN1 ? Lore.SPECIAL_TEXTS.star256.afterWin : Lore.SPECIAL_TEXTS.star256.first;
      }
      var base = Lore.TEXTES.stars.flavors[(star.num + star.id) % Lore.TEXTES.stars.flavors.length];
      if (star.pushed) {
        return base + Lore.TEXTES.stars.pushedSuffix;
      }
      return base;
    },

    getArtefactForId: function (id) {
      var fam = Lore.ARTEFACT_FAMILIES[Math.abs(id) % Lore.ARTEFACT_FAMILIES.length];
      var name = fam.names[Math.abs(id) % fam.names.length];
      return {
        key: fam.mod + ':' + name,
        name: name,
        costRes: fam.costRes,
        costAmt: fam.costAmt,
        baseSell: fam.baseSell
      };
    }
  };

  // Initialise un mood par défaut pour le boot
  Lore.setActiveMood(SCENARIOS[0] ? SCENARIOS[0].id : 'loufoque');

  SPAWN.Lore = Lore;
})(window);
