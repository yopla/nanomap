(function (global) {
  'use strict';

  var SPAWN = (global.SPAWN = global.SPAWN || {});
  var TEXTES = global.SPAWN_TEXTES || {};

  var ZONES = TEXTES.zones;
  var STORY_CHAPTERS = TEXTES.chapters;
  var SPECIAL_TEXTS = TEXTES.specials;

  var PLANET_ARCHETYPES = [
    Object.assign({ key: 'boltz' }, TEXTES.planets.archetypes.boltz),
    Object.assign({ key: 'crewz' }, TEXTES.planets.archetypes.crewz),
    Object.assign({ key: 'golem' }, TEXTES.planets.archetypes.golem)
  ];

  var ANOMALY_TYPES = {
    blocage: Object.assign({ key: 'blocage' }, TEXTES.anomalies.types.blocage),
    surnature: Object.assign({ key: 'surnature' }, TEXTES.anomalies.types.surnature),
    dramaboss: Object.assign({ key: 'dramaboss' }, TEXTES.anomalies.types.dramaboss)
  };

  var ARTEFACT_FAMILIES = TEXTES.artefacts;

  /**
   * Remplace les jetons {cle} dans un modèle de texte.
   */
  function format(template, vars) {
    if (!template) return '';
    if (!vars) return template;
    return String(template).replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match;
    });
  }

  function getZoneKey(ring) {
    if (ring <= 14) return 'cosm';
    if (ring <= 42) return 'dream';
    if (ring <= 72) return 'forgot';
    return 'out';
  }

  function getZoneInfo(ring) {
    return ZONES[getZoneKey(ring)];
  }

  function getAmbientLine(ring, id) {
    var z = getZoneInfo(ring);
    return z.ambient[Math.abs(id) % z.ambient.length];
  }

  function getStarName(star) {
    if (star.num === 400) return 'Étoile #400 · Le Foyer';
    if (star.num === 500) return 'Étoile #500 · Le Disparu';
    if (star.num === 1) return 'Étoile #1 · La Sentinelle';
    if (star.num === 256) return 'Étoile #256 · L’Onubis';
    var p = TEXTES.stars.prefixes[(star.num * 7 + star.id) % TEXTES.stars.prefixes.length];
    var s = TEXTES.stars.suffixes[(star.num * 11 + star.id) % TEXTES.stars.suffixes.length];
    return 'Étoile #' + star.num + ' · ' + p + ' ' + s;
  }

  function getStarDescription(star, state) {
    if (star.num === 400) {
      if (star.pushed) return SPECIAL_TEXTS.star400.pushed;
      if (state.checkpoints.reachCenter) return SPECIAL_TEXTS.star400.afterCenter;
      return SPECIAL_TEXTS.star400.first;
    }
    if (star.num === 500) {
      return star.pushed ? SPECIAL_TEXTS.star500.pushed : SPECIAL_TEXTS.star500.first;
    }
    if (star.num === 1) {
      return star.pushed ? SPECIAL_TEXTS.star1.pushed : SPECIAL_TEXTS.star1.first;
    }
    if (star.num === 256) {
      return state.checkpoints.reach256_WIN1 ? SPECIAL_TEXTS.star256.afterWin : SPECIAL_TEXTS.star256.first;
    }
    var base = TEXTES.stars.flavors[(star.num + star.id) % TEXTES.stars.flavors.length];
    if (star.pushed) {
      return base + TEXTES.stars.pushedSuffix;
    }
    return base;
  }

  function getArtefactForId(id) {
    var fam = ARTEFACT_FAMILIES[Math.abs(id) % ARTEFACT_FAMILIES.length];
    var name = fam.names[Math.abs(id) % fam.names.length];
    return {
      key: fam.mod + ':' + name,
      name: name,
      costRes: fam.costRes,
      costAmt: fam.costAmt,
      baseSell: fam.baseSell
    };
  }

  SPAWN.Lore = {
    TEXTES: TEXTES,
    ZONES: ZONES,
    STORY_CHAPTERS: STORY_CHAPTERS,
    SPECIAL_TEXTS: SPECIAL_TEXTS,
    PLANET_ARCHETYPES: PLANET_ARCHETYPES,
    ANOMALY_TYPES: ANOMALY_TYPES,
    ARTEFACT_FAMILIES: ARTEFACT_FAMILIES,
    format: format,
    getZoneKey: getZoneKey,
    getZoneInfo: getZoneInfo,
    getAmbientLine: getAmbientLine,
    getStarName: getStarName,
    getStarDescription: getStarDescription,
    getArtefactForId: getArtefactForId
  };
})(window);
