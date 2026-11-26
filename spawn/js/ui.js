(function (global) {
  'use strict';

  var SPAWN = (global.SPAWN = global.SPAWN || {});
  var Spiral = SPAWN.Spiral;
  var Lore = SPAWN.Lore;
  var World = SPAWN.World;
  var Audio = SPAWN.Audio;

  function formatCostReward(obj, prefix) {
    var resTexts = (Lore.TEXTES && Lore.TEXTES.ui && Lore.TEXTES.ui.resources) || {};
    return Object.keys(obj).map(function (k) {
      var lbl = resTexts[k] ? resTexts[k].label : k;
      return (prefix || '') + obj[k] + ' ' + lbl;
    }).join(' · ');
  }

  function createUI(engine) {
    function getT() { return Lore.TEXTES || {}; }
    function getM() { return getT().messages || {}; }

    var els = {
      brandTitle: document.getElementById('brand-title'),
      zoneBadge: document.getElementById('zone-badge'),
      resFuel: document.getElementById('res-fuel'),
      resCoque: document.getElementById('res-coque'),
      resScan: document.getElementById('res-scan'),
      resHyper: document.getElementById('res-hyper'),
      resT2s: document.getElementById('res-t2s'),
      resLum: document.getElementById('res-lum'),
      lblFuel: document.getElementById('lbl-fuel'),
      lblCoque: document.getElementById('lbl-coque'),
      lblScan: document.getElementById('lbl-scan'),
      lblHyper: document.getElementById('lbl-hyper'),
      lblT2s: document.getElementById('lbl-t2s'),
      lblLum: document.getElementById('lbl-lum'),
      valFuel: document.getElementById('val-fuel'),
      valCoque: document.getElementById('val-coque'),
      valScan: document.getElementById('val-scan'),
      valHyper: document.getElementById('val-hyper'),
      valT2s: document.getElementById('val-t2s'),
      valLum: document.getElementById('val-lum'),
      shieldBadge: document.getElementById('shield-badge'),
      btnAudio: document.getElementById('btn-audio'),
      btnJournal: document.getElementById('btn-journal'),
      whisperText: document.getElementById('whisper-text'),
      coordsReadout: document.getElementById('coords-readout'),
      storyToast: document.getElementById('story-toast'),
      toastKicker: document.getElementById('toast-kicker'),
      toastTitle: document.getElementById('toast-title'),
      toastBody: document.getElementById('toast-body'),
      toastUnlock: document.getElementById('toast-unlock'),
      canvas: document.getElementById('game-canvas'),
      dpad: document.getElementById('dpad'),
      aimBanner: document.getElementById('aim-banner'),
      aimText: document.getElementById('aim-text'),
      btnCancelAim: document.getElementById('btn-cancel-aim'),
      ctxPanel: document.getElementById('context-panel'),
      ctxKicker: document.getElementById('ctx-kicker'),
      ctxTitle: document.getElementById('ctx-title'),
      ctxId: document.getElementById('ctx-id'),
      ctxText: document.getElementById('ctx-text'),
      ctxMeta: document.getElementById('ctx-meta'),
      ctxActions: document.getElementById('ctx-actions'),
      toolbar: document.getElementById('toolbar'),
      toolHyper: document.getElementById('tool-hyper'),
      toolRadar: document.getElementById('tool-radar'),
      toolCompassGroup: document.getElementById('tool-compass-group'),
      toolGoGroup: document.getElementById('tool-go-group'),
      toolShield: document.getElementById('tool-shield'),
      toolConvert: document.getElementById('tool-convert'),
      toolRefill: document.getElementById('tool-refill'),
      toolReseed: document.getElementById('tool-reseed'),
      lblToolHyper: document.getElementById('lbl-tool-hyper'),
      costToolHyper: document.getElementById('cost-tool-hyper'),
      lblToolRadar: document.getElementById('lbl-tool-radar'),
      costToolRadar: document.getElementById('cost-tool-radar'),
      lblCompassGroup: document.getElementById('lbl-compass-group'),
      lblGoGroup: document.getElementById('lbl-go-group'),
      lblToolShield: document.getElementById('lbl-tool-shield'),
      costToolShield: document.getElementById('cost-tool-shield'),
      lblToolConvert: document.getElementById('lbl-tool-convert'),
      costToolConvert: document.getElementById('cost-tool-convert'),
      lblToolRefill: document.getElementById('lbl-tool-refill'),
      costToolRefill: document.getElementById('cost-tool-refill'),
      lblToolReseed: document.getElementById('lbl-tool-reseed'),
      costToolReseed: document.getElementById('cost-tool-reseed'),
      cmp0: document.getElementById('cmp-0'),
      cmp500: document.getElementById('cmp-500'),
      cmp400: document.getElementById('cmp-400'),
      cmp256: document.getElementById('cmp-256'),
      cmp3030: document.getElementById('cmp-3030'),
      cmpClear: document.getElementById('cmp-clear'),
      go0: document.getElementById('go-0'),
      go500: document.getElementById('go-500'),
      go400: document.getElementById('go-400'),
      goRnd: document.getElementById('go-rnd'),
      modalJournal: document.getElementById('modal-journal'),
      journalTitle: document.getElementById('journal-title'),
      btnCloseJournal: document.getElementById('btn-close-journal'),
      journalBody: document.getElementById('journal-body'),
      lblTabStory: document.getElementById('lbl-tab-story'),
      lblTabStars: document.getElementById('lbl-tab-stars'),
      lblTabCargo: document.getElementById('lbl-tab-cargo'),
      lblTabConvert: document.getElementById('lbl-tab-convert'),
      lblTabSystem: document.getElementById('lbl-tab-system'),
      tabStarsCount: document.getElementById('tab-stars-count'),
      tabCargoCount: document.getElementById('tab-cargo-count'),
      tabBtnCargo: document.getElementById('tab-btn-cargo'),
      tabBtnConvert: document.getElementById('tab-btn-convert'),
      overlayIntro: document.getElementById('overlay-intro'),
      introMoodBadge: document.getElementById('intro-mood-badge'),
      btnRerollMood: document.getElementById('btn-reroll-mood'),
      introKicker: document.getElementById('intro-kicker'),
      introTitle: document.getElementById('intro-title'),
      introLead: document.getElementById('intro-lead'),
      introSub: document.getElementById('intro-sub'),
      btnStartNew: document.getElementById('btn-start-new'),
      btnResumeSave: document.getElementById('btn-resume-save'),
      overlayChapter: document.getElementById('overlay-chapter'),
      chapKicker: document.getElementById('chap-kicker'),
      chapTitle: document.getElementById('chap-title'),
      chapText: document.getElementById('chap-text'),
      chapUnlock: document.getElementById('chap-unlock'),
      btnChapContinue: document.getElementById('btn-chap-continue'),
      btnChapReseed: document.getElementById('btn-chap-reseed'),
      infoPopover: document.getElementById('info-popover'),
      infoKicker: document.getElementById('info-kicker'),
      infoTitle: document.getElementById('info-title'),
      infoBody: document.getElementById('info-body'),
      infoTip: document.getElementById('info-tip'),
      infoActions: document.getElementById('info-actions'),
      btnCloseInfo: document.getElementById('btn-close-info')
    };

    var activeTab = 'story';
    var toastTimer = null;
    var openInfoKey = null;

    function hydrateStaticTexts() {
      var T = getT();
      var uiT = T.ui || {};
      var resT = uiT.resources || {};
      var tbT = uiT.toolbar || {};
      var introT = T.intro || {};
      var mood = Lore.getActiveMood();

      els.brandTitle.textContent = uiT.brandTitle || 'SPAWN';
      els.shieldBadge.textContent = uiT.shieldBadge || '';
      els.btnJournal.textContent = uiT.btnJournal || 'Journal';
      els.btnCloseJournal.textContent = uiT.btnCloseJournal || 'Fermer';
      els.journalTitle.textContent = uiT.journalTitle || 'Journal';
      els.aimText.textContent = uiT.aimBannerText || '';
      els.btnCancelAim.textContent = uiT.aimCancelBtn || 'Annuler';

      els.lblTabStory.textContent = uiT.tabStory || 'Récit';
      els.lblTabStars.textContent = uiT.tabStars || 'Étoiles';
      els.lblTabCargo.textContent = uiT.tabCargo || 'Soute';
      els.lblTabConvert.textContent = uiT.tabConvert || 'Recycleur T2s';
      els.lblTabSystem.textContent = uiT.tabSystem || 'Système';

      els.btnChapContinue.textContent = uiT.btnChapContinue || 'Continuer';
      els.btnChapReseed.textContent = uiT.btnChapReseed || 'RESEED';
      els.btnCloseInfo.textContent = (T.infos && T.infos.closeLabel) || 'Fermer';

      if (els.introMoodBadge && mood) {
        els.introMoodBadge.textContent = (uiT.moodBadgePrefix || 'Ambiance :') + ' ' + mood.name + ' · ' + mood.genre;
      }
      if (els.btnRerollMood) {
        els.btnRerollMood.textContent = uiT.btnRerollMood || '🎲 Autre ambiance';
      }
      els.introKicker.textContent = introT.kicker || '';
      els.introTitle.textContent = introT.title || 'SPAWN';
      els.introLead.textContent = introT.lead || '';
      els.introSub.textContent = introT.sub || '';
      els.btnStartNew.textContent = introT.btnStartNew || 'Commencer';
      els.btnResumeSave.textContent = introT.btnResumeSave || 'Reprendre';

      var mapRes = [
        ['fuel', els.resFuel, els.lblFuel],
        ['coque', els.resCoque, els.lblCoque],
        ['scan', els.resScan, els.lblScan],
        ['hyper', els.resHyper, els.lblHyper],
        ['t2s', els.resT2s, els.lblT2s],
        ['lum', els.resLum, els.lblLum]
      ];
      mapRes.forEach(function (row) {
        var r = resT[row[0]];
        if (!r) return;
        row[1].title = r.title;
        row[2].textContent = r.label;
      });

      els.lblToolHyper.textContent = tbT.hyperName;
      els.costToolHyper.textContent = tbT.hyperCost;
      els.lblToolRadar.textContent = tbT.radarName;
      els.costToolRadar.textContent = tbT.radarCost;
      els.lblCompassGroup.textContent = tbT.compassGroup;
      els.lblGoGroup.textContent = tbT.goGroup;
      els.lblToolShield.textContent = tbT.shieldName;
      els.costToolShield.textContent = tbT.shieldCost;
      els.lblToolConvert.textContent = tbT.convertName;
      els.costToolConvert.textContent = tbT.convertCost;
      els.lblToolRefill.textContent = tbT.refillName;
      els.costToolRefill.textContent = tbT.refillCost;
      els.lblToolReseed.textContent = tbT.reseedName;
      els.costToolReseed.textContent = tbT.reseedCost;
    }

    function toggle(el, visible, displayMode) {
      if (!el) return;
      el.style.display = visible ? (displayMode || '') : 'none';
    }

    function showToast(chap) {
      els.toastKicker.textContent = chap.kicker;
      els.toastTitle.textContent = chap.title;
      els.toastBody.textContent = chap.text;
      els.toastUnlock.textContent = chap.unlockText || '';
      toggle(els.storyToast, true, 'block');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toggle(els.storyToast, false);
      }, 9500);
    }

    function showChapterOverlay(chap) {
      els.chapKicker.textContent = chap.kicker;
      els.chapTitle.textContent = chap.title;
      els.chapText.textContent = chap.text;
      if (chap.unlockText) {
        els.chapUnlock.textContent = chap.unlockText;
        toggle(els.chapUnlock, true, 'block');
      } else {
        toggle(els.chapUnlock, false);
      }
      toggle(els.btnChapReseed, chap.id === 'reach256_WIN1' || chap.id === 'reach714_WIN2', 'inline-block');
      toggle(els.overlayChapter, true, 'flex');
    }

    function renderHUD(state) {
      var u = state.unlocks;
      var ring = Spiral.ringOf(state.ship.x, state.ship.y);
      var z = Lore.getZoneInfo(ring);

      els.zoneBadge.textContent = z.shortName;
      els.zoneBadge.className = 'zone-badge ' + z.cssClass;

      toggle(els.resFuel, u.fuel, 'inline-flex');
      toggle(els.resCoque, u.coque, 'inline-flex');
      toggle(els.resScan, u.scan, 'inline-flex');
      toggle(els.resHyper, u.hyper, 'inline-flex');
      toggle(els.resT2s, u.t2s, 'inline-flex');
      toggle(els.resLum, u.lum, 'inline-flex');

      els.valFuel.textContent = state.res.fuel + '/' + World.CAPS.fuel;
      els.valCoque.textContent = state.res.coque + '/' + World.CAPS.coque;
      els.valScan.textContent = state.res.scan + '/' + World.CAPS.scan;
      els.valHyper.textContent = state.res.hyper + '/' + World.CAPS.hyper;
      els.valT2s.textContent = state.res.t2s + '/' + World.CAPS.t2s;
      els.valLum.textContent = String(state.res.lum);

      els.resFuel.classList.toggle('low', state.res.fuel <= 5);
      els.resCoque.classList.toggle('low', state.res.coque <= 3);
      els.resScan.classList.toggle('low', state.res.scan <= 2);

      toggle(els.shieldBadge, state.shieldActive, 'inline-block');
      toggle(els.btnJournal, u.journal, 'inline-block');

      els.whisperText.textContent = state.whisper || '';
      if (u.scan) {
        toggle(els.coordsReadout, true, 'inline');
        els.coordsReadout.textContent = Lore.format(getM().coordsReadout, { x: state.ship.x, y: state.ship.y, ring: ring });
      } else {
        toggle(els.coordsReadout, false);
      }

      toggle(els.dpad, true, 'grid');
      toggle(els.aimBanner, state.aimMode, 'block');
      els.canvas.classList.toggle('aiming', state.aimMode);
    }

    function renderToolbar(state) {
      var u = state.unlocks;
      var anyTool = u.hyper || u.locatStar || u.compass || u.goNodes || u.lumShield || u.t2sConvert || u.refill16 || u.reseed;
      toggle(els.toolbar, anyTool, 'flex');
      if (!anyTool) return;

      toggle(els.toolHyper, u.hyper, 'inline-flex');
      els.toolHyper.disabled = state.res.hyper <= 0;
      els.toolHyper.classList.toggle('active', state.aimMode);

      toggle(els.toolRadar, u.locatStar, 'inline-flex');
      els.toolRadar.classList.toggle('active', state.compassMode === 'nearest');

      toggle(els.toolCompassGroup, u.compass, 'inline-flex');
      if (u.compass) {
        toggle(els.cmp0, true, 'inline-block');
        toggle(els.cmp500, true, 'inline-block');
        toggle(els.cmp400, true, 'inline-block');
        toggle(els.cmp256, state.checkpoints.Tuch1, 'inline-block');
        toggle(els.cmp3030, state.checkpoints.tuch512, 'inline-block');
        toggle(els.cmpClear, !!state.compassMode, 'inline-block');

        els.cmp0.classList.toggle('active', state.compassMode === 0);
        els.cmp500.classList.toggle('active', state.compassMode === 500);
        els.cmp400.classList.toggle('active', state.compassMode === 400);
        els.cmp256.classList.toggle('active', state.compassMode === 256);
        els.cmp3030.classList.toggle('active', state.compassMode === 3030);
      }

      toggle(els.toolGoGroup, u.goNodes, 'inline-flex');
      if (u.goNodes) {
        toggle(els.go0, true, 'inline-block');
        toggle(els.go500, u.go500, 'inline-block');
        toggle(els.go400, u.go400, 'inline-block');
        toggle(els.goRnd, u.goRnd, 'inline-block');
        var noHyper = state.res.hyper <= 0;
        els.go0.disabled = noHyper;
        els.go500.disabled = noHyper;
        els.go400.disabled = noHyper;
        els.goRnd.disabled = noHyper;
      }

      toggle(els.toolShield, u.lumShield, 'inline-flex');
      els.toolShield.disabled = state.shieldActive || state.res.lum < 2;

      toggle(els.toolConvert, u.t2sConvert, 'inline-flex');
      toggle(els.toolRefill, u.refill16, 'inline-flex');
      if (u.refill16) {
        var onStar = World.getCellContent(state.world, state.ship.x, state.ship.y).kind === 'star';
        els.toolRefill.disabled = state.res.scan < 12 || (!onStar && !u.freeRefill);
      }
      toggle(els.toolReseed, u.reseed, 'inline-flex');
    }

    function addActionButton(label, tag, cls, disabled, onClick) {
      var btn = document.createElement('button');
      btn.className = 'action-btn ' + (cls || '');
      btn.disabled = !!disabled;
      var s1 = document.createElement('span');
      s1.textContent = label;
      var s2 = document.createElement('span');
      s2.className = 'action-tag';
      s2.textContent = tag || '';
      btn.appendChild(s1);
      btn.appendChild(s2);
      btn.addEventListener('click', onClick);
      els.ctxActions.appendChild(btn);
    }

    function renderContextPanel(state) {
      var T = getT();
      var M = getM();
      var act = (T.ui && T.ui.actions) || {};
      var sel = state.selectedCell;

      if (state.activeEvent) {
        var ev = state.activeEvent;
        toggle(els.ctxPanel, true, 'flex');
        els.ctxActions.innerHTML = '';
        toggle(els.ctxMeta, false);
        els.ctxKicker.className = 'panel-kicker event-kicker';
        els.ctxKicker.textContent = (T.ui && T.ui.eventKicker) || 'Événement';
        els.ctxTitle.textContent = ev.title;
        els.ctxText.textContent = ev.text;
        toggle(els.ctxId, false);
        ev.choices.forEach(function (ch, idx) {
          var afford = !ch.cost || Object.keys(ch.cost).every(function (k) { return state.res[k] >= ch.cost[k]; });
          var tagParts = [];
          if (ch.cost) tagParts.push(formatCostReward(ch.cost, '-'));
          if (ch.effect) {
            var effCopy = Object.assign({}, ch.effect);
            var hasShield = !!effCopy.shield;
            delete effCopy.shield;
            var effTxt = Object.keys(effCopy).length ? formatCostReward(effCopy, '+') : '';
            if (hasShield) effTxt = (effTxt ? effTxt + ' · ' : '') + 'Bouclier';
            if (effTxt) tagParts.push(effTxt);
          }
          addActionButton(ch.label, tagParts.join(' → '), idx === 0 ? 'primary' : 'emerald', !afford, function () {
            engine.resolveEventChoice(idx);
          });
        });
        return;
      }

      els.ctxKicker.className = 'panel-kicker';
      if (!sel) {
        toggle(els.ctxPanel, false);
        return;
      }

      var cell = World.getCellContent(state.world, sel.x, sel.y);
      var isVisited = !!state.visited[cell.id];
      var isFinished = !!state.finished[cell.id];
      var onTile = state.ship.x === sel.x && state.ship.y === sel.y;

      var stranded = state.res.fuel === 0 && state.res.coque === 0 && state.res.hyper === 0 && state.res.t2s < 4;

      if (cell.kind === 'empty' && !state.lastOutcomeText && !stranded && !state.unlocks.freeRefill) {
        if (!state.checkpoints.star1) {
          toggle(els.ctxPanel, false);
          return;
        }
      }

      toggle(els.ctxPanel, true, 'flex');
      els.ctxActions.innerHTML = '';
      toggle(els.ctxMeta, false);

      var z = Lore.getZoneInfo(cell.ring);
      els.ctxId.textContent = state.unlocks.scan ? ('#' + cell.id) : '';
      toggle(els.ctxId, state.unlocks.scan, 'inline-block');

      if (cell.kind === 'center') {
        els.ctxKicker.textContent = T.specials.center.kicker;
        els.ctxTitle.textContent = T.specials.center.title;
        els.ctxText.textContent = state.checkpoints.reachCenter ? T.specials.center.revisit : T.specials.center.first;
      } else if (cell.kind === 'embassy') {
        els.ctxKicker.textContent = T.specials.embassy3030.kicker;
        els.ctxTitle.textContent = T.specials.embassy3030.title;
        els.ctxText.textContent = state.checkpoints.reach714_WIN2 ? T.specials.embassy3030.afterWin : T.specials.embassy3030.first;
      } else if (cell.kind === 'star') {
        els.ctxKicker.textContent = Lore.format(T.stars.kickerPrefix, { zone: z.shortName });
        if (!isVisited) {
          els.ctxTitle.textContent = T.stars.unvisitedTitle;
          els.ctxText.textContent = T.stars.unvisitedText;
        } else {
          els.ctxTitle.textContent = Lore.getStarName(cell.star);
          els.ctxText.textContent = Lore.getStarDescription(cell.star, state);
          if (state.unlocks.pushStar) {
            addActionButton(act.pushStar, act.pushStarCost, 'gold', state.res.scan < 1, function () {
              engine.pushSelectedStar();
            });
          }
        }
      } else if (cell.kind === 'planet') {
        if (!isVisited) {
          els.ctxKicker.textContent = Lore.format(T.planets.unvisitedKickerPrefix, { zone: z.shortName });
          els.ctxTitle.textContent = T.planets.unvisitedTitle;
          els.ctxText.textContent = T.planets.unvisitedText;
          if (!onTile && state.unlocks.scan) {
            addActionButton(act.scanRemote, act.scanRemoteCost, 'primary', state.res.scan < 1, function () {
              engine.visitCell(sel.x, sel.y, false);
            });
          }
        } else {
          els.ctxKicker.textContent = cell.label;
          els.ctxTitle.textContent = isFinished ? T.planets.depletedTitle : T.planets.exploitableTitle;
          els.ctxText.textContent = cell.text;
          if (!isFinished) {
            var costLabel = onTile ? '+1 Scan' : '-1 Scan';
            addActionButton(act.exploitPlanet, costLabel, 'emerald', !onTile && state.res.scan < 1, function () {
              engine.exploitSelectedPlanet();
            });
          }
        }
      } else if (cell.kind === 'anomaly') {
        if (!isVisited) {
          els.ctxKicker.textContent = Lore.format(T.anomalies.unvisitedKickerPrefix, { zone: z.shortName });
          els.ctxTitle.textContent = T.anomalies.unvisitedTitle;
          els.ctxText.textContent = T.anomalies.unvisitedText;
          if (!onTile && state.unlocks.scan) {
            addActionButton(act.scanRemote, act.scanRemoteCost, 'primary', state.res.scan < 1, function () {
              engine.visitCell(sel.x, sel.y, false);
            });
          }
        } else {
          els.ctxKicker.textContent = cell.label;
          els.ctxTitle.textContent = cell.title + (isFinished ? T.anomalies.resolvedSuffix : '');
          els.ctxText.textContent = cell.text;
          if (!isFinished) {
            var b = cell.bet;
            var pct = Math.round(b.prob * 100);
            els.ctxMeta.textContent = Lore.format(M.betSummary, {
              cost: formatCostReward(b.cost),
              reward: formatCostReward(b.reward),
              pct: pct
            });
            toggle(els.ctxMeta, true, 'block');
            var afford = Object.keys(b.cost).every(function (k) { return state.res[k] >= b.cost[k]; });
            addActionButton(
              Lore.format(act.attemptAnomaly, { pct: pct + ' %' }),
              onTile ? '+1 Scan' : '-1 Scan',
              'primary',
              !afford || (!onTile && state.res.scan < 1),
              function () { engine.attemptSelectedAnomaly(); }
            );
          }
        }
      } else {
        els.ctxKicker.textContent = z.name;
        els.ctxTitle.textContent = onTile ? M.emptyDriftTitle : M.emptySectorTitle;
        els.ctxText.textContent = Lore.getAmbientLine(cell.ring, cell.id);
      }

      if (state.unlocks.trade && isVisited && (cell.kind === 'planet' || cell.kind === 'star')) {
        var art = Lore.getArtefactForId(cell.id);
        var inCargo = state.cargo.some(function (c) { return c.key === art.key; });
        if (!inCargo) {
          addActionButton(
            Lore.format(act.buyArtefact, { name: art.name }),
            '-' + art.costAmt + ' ' + art.costRes,
            '',
            state.res[art.costRes] < art.costAmt || state.cargo.length >= 4,
            function () { engine.buyArtefactAtSelected(); }
          );
        }
        if (onTile && state.cargo.length > 0) {
          state.cargo.forEach(function (c, idx) {
            var d = Spiral.dist(c.originX, c.originY, state.ship.x, state.ship.y);
            var mult = c.teleported ? 1.2 : Math.min(3.5, 1 + d / 32);
            var pay = Math.max(1, Math.round(c.baseSell * mult));
            if (d >= 12 || c.teleported) {
              addActionButton(
                Lore.format(act.sellArtefact, { name: c.name }),
                '+' + pay + ' ' + c.costRes + ' (×' + mult.toFixed(1) + ')',
                'gold',
                false,
                function () { engine.sellArtefact(idx); }
              );
            }
          });
        }
      }

      if (state.lastOutcomeText) {
        els.ctxMeta.textContent = state.lastOutcomeText;
        toggle(els.ctxMeta, true, 'block');
      }

      if (stranded) {
        addActionButton(act.emergencyBtn, act.emergencyTag, 'emerald', false, function () {
          engine.emergencyRecharge();
        });
      }
    }

    function renderJournal(state) {
      var T = getT();
      var M = getM();
      var act = (T.ui && T.ui.actions) || {};
      var mood = Lore.getActiveMood();
      els.tabStarsCount.textContent = String(state.discoveredStars.length);
      els.tabCargoCount.textContent = String(state.cargo.length);
      toggle(els.tabBtnCargo, state.unlocks.trade, 'inline-block');
      toggle(els.tabBtnConvert, state.unlocks.t2sConvert, 'inline-block');

      els.journalBody.innerHTML = '';

      if (activeTab === 'story') {
        for (var i = state.storyLog.length - 1; i >= 0; i--) {
          var ch = Lore.STORY_CHAPTERS[state.storyLog[i]];
          if (!ch) continue;
          var div = document.createElement('div');
          div.className = 'journal-entry';
          div.innerHTML = '<h4>' + ch.kicker + ' — ' + ch.title + '</h4><p>' + ch.text + '</p>' +
            (ch.unlockText ? '<div class="journal-tag">' + ch.unlockText + '</div>' : '');
          els.journalBody.appendChild(div);
        }
      } else if (activeTab === 'stars') {
        var list = state.discoveredStars.slice().sort(function (a, b) { return a.num - b.num; });
        if (list.length === 0) {
          els.journalBody.innerHTML = '<div class="journal-entry"><p>' + M.journalEmptyStars + '</p></div>';
        }
        list.forEach(function (st) {
          var el = document.createElement('div');
          el.className = 'journal-entry';
          el.innerHTML = '<h4>' + st.name + '</h4><p>' + Lore.format(M.journalStarId, { id: st.id }) + '</p>';
          els.journalBody.appendChild(el);
        });
      } else if (activeTab === 'cargo') {
        if (state.cargo.length === 0) {
          els.journalBody.innerHTML = '<div class="journal-entry"><p>' + M.journalEmptyCargo + '</p></div>';
        }
        state.cargo.forEach(function (c, idx) {
          var d = Math.round(Spiral.dist(c.originX, c.originY, state.ship.x, state.ship.y));
          var mult = c.teleported ? 1.2 : Math.min(3.5, 1 + d / 32);
          var pay = Math.max(1, Math.round(c.baseSell * mult));
          var el = document.createElement('div');
          el.className = 'journal-entry';
          el.innerHTML = '<h4>' + c.name + '</h4><p>' + Lore.format(M.journalCargoRow, {
            dist: d,
            pay: pay,
            res: c.costRes,
            mult: mult.toFixed(1)
          }) + '</p>';
          var btn = document.createElement('button');
          btn.className = 'secondary-btn';
          btn.style.marginTop = '8px';
          btn.textContent = Lore.format(act.sellJournalBtn, { pay: pay, res: c.costRes });
          btn.addEventListener('click', function () {
            engine.sellArtefact(idx);
            renderJournal(engine.getState());
          });
          el.appendChild(btn);
          els.journalBody.appendChild(el);
        });
      } else if (activeTab === 'convert') {
        var info = document.createElement('div');
        info.className = 'journal-entry';
        info.innerHTML = '<h4>' + Lore.format(M.journalConvertTitle, { t2s: state.res.t2s }) + '</h4>' +
          '<p>' + M.journalConvertDesc + '</p>';
        els.journalBody.appendChild(info);

        World.getConversions().forEach(function (conv) {
          var btn = document.createElement('button');
          btn.className = 'action-btn';
          btn.disabled = state.res.t2s < conv.cost;
          btn.innerHTML = '<span>' + conv.label + '</span><span class="action-tag">' + conv.tag + '</span>';
          btn.addEventListener('click', function () {
            engine.convertT2s(conv.id);
            renderJournal(engine.getState());
          });
          els.journalBody.appendChild(btn);
        });
      } else if (activeTab === 'system') {
        var sys = document.createElement('div');
        sys.className = 'journal-entry';
        var moodLine = mood ? ('<p style="margin-bottom:6px;color:var(--mood-accent,#38bdf8);font-weight:600;">' +
          Lore.format((T.ui && T.ui.moodInfoLabel) || '', { name: mood.name, genre: mood.genre }) + '</p>') : '';
        sys.innerHTML = '<h4>' + Lore.format(M.journalSystemTitle, { seed: state.world.seed }) + '</h4>' +
          moodLine +
          '<p>' + Lore.format(M.journalSystemStats, {
            steps: state.stats.steps,
            bounces: state.stats.bounces,
            jumps: state.stats.jumps,
            reseeds: state.stats.reseedCount
          }) + '</p>';
        var resetBtn = document.createElement('button');
        resetBtn.className = 'secondary-btn';
        resetBtn.style.marginTop = '10px';
        resetBtn.textContent = act.resetBtn;
        resetBtn.addEventListener('click', function () {
          toggle(els.modalJournal, false);
          engine.startNewGame(false);
        });
        sys.appendChild(resetBtn);
        els.journalBody.appendChild(sys);
      }
    }

    hydrateStaticTexts();

    function closeInfoPopover() {
      openInfoKey = null;
      toggle(els.infoPopover, false);
      var triggers = document.querySelectorAll('.info-trigger');
      for (var i = 0; i < triggers.length; i++) {
        triggers[i].classList.remove('info-open');
      }
    }

    function addInfoAction(label, onClick) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'secondary-btn';
      btn.style.padding = '7px 12px';
      btn.style.fontSize = '0.8rem';
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      els.infoActions.appendChild(btn);
    }

    function renderInfoPopover(key, state) {
      var T = getT();
      var INF = T.infos || {};
      var QA = INF.quickActions || {};
      var ring = Spiral.ringOf(state.ship.x, state.ship.y);
      var data = null;

      els.infoActions.innerHTML = '';

      if (key.indexOf('res:') === 0) {
        var rKey = key.split(':')[1];
        var rInfo = INF.resources && INF.resources[rKey];
        if (rInfo) {
          var vars = { val: state.res[rKey], cap: World.CAPS[rKey] };
          data = {
            kicker: rInfo.kicker,
            title: Lore.format(rInfo.title, vars),
            body: Lore.format(rInfo.body, vars),
            tip: Lore.format(rInfo.tip, vars)
          };
          if (rKey === 't2s' && state.unlocks.t2sConvert) {
            addInfoAction(QA.openConvert, function () {
              closeInfoPopover();
              activeTab = 'convert';
              for (var j = 0; j < tabBtns.length; j++) {
                tabBtns[j].classList.toggle('active', tabBtns[j].getAttribute('data-tab') === 'convert');
              }
              renderJournal(engine.getState());
              toggle(els.modalJournal, true, 'flex');
            });
          } else if (rKey === 'hyper' && state.unlocks.hyper && state.res.hyper > 0) {
            addInfoAction(QA.activateHyper, function () {
              closeInfoPopover();
              engine.toggleAimMode(true);
            });
          }
        }
      } else if (key === 'zone') {
        var zKey = Lore.getZoneKey(ring);
        data = INF.zones && INF.zones[zKey];
      } else if (key === 'shield') {
        data = INF.shield;
      } else if (key === 'coords') {
        if (INF.coords) {
          var cVars = { x: state.ship.x, y: state.ship.y, ring: ring };
          data = {
            kicker: INF.coords.kicker,
            title: Lore.format(INF.coords.title, cVars),
            body: Lore.format(INF.coords.body, cVars),
            tip: Lore.format(INF.coords.tip, cVars)
          };
        }
      } else if (key === 'cellId') {
        var sel = state.selectedCell || { x: state.ship.x, y: state.ship.y };
        var id = Spiral.posToId(sel.x, sel.y);
        if (INF.cellId) {
          data = {
            kicker: INF.cellId.kicker,
            title: Lore.format(INF.cellId.title, { id: id }),
            body: Lore.format(INF.cellId.body, { id: id }),
            tip: Lore.format(INF.cellId.tip, { id: id })
          };
        }
      } else if (key === 'compassGroup') {
        data = INF.compassGroup;
      } else if (key === 'goGroup') {
        data = INF.goGroup;
      } else if (key === 'whisper') {
        if (INF.whisper) {
          data = {
            kicker: INF.whisper.kicker,
            title: INF.whisper.title,
            body: Lore.format(INF.whisper.body, { whisper: state.whisper || '' }),
            tip: INF.whisper.tip
          };
          if (state.unlocks.journal) {
            addInfoAction(QA.openJournal, function () {
              closeInfoPopover();
              activeTab = 'story';
              for (var j = 0; j < tabBtns.length; j++) {
                tabBtns[j].classList.toggle('active', tabBtns[j].getAttribute('data-tab') === 'story');
              }
              renderJournal(engine.getState());
              toggle(els.modalJournal, true, 'flex');
            });
          }
        }
      } else if (key === 'brand') {
        var br = INF.brand;
        var activeMood = Lore.getActiveMood();
        if (br && br.tips) {
          var lines = [];
          if (activeMood) {
            lines.push(Lore.format((T.ui && T.ui.moodInfoLabel) || '', { name: activeMood.name, genre: activeMood.genre }) + ' — ' + activeMood.shipName);
          }
          lines.push(br.intro);
          if (state.unlocks.fuel) lines.push(br.tips.fuel);
          if (state.unlocks.scrollHint) lines.push(br.tips.scroll);
          if (state.unlocks.scan) lines.push(br.tips.scan);
          if (state.unlocks.hyper) lines.push(br.tips.hyper);
          if (state.unlocks.t2sConvert) lines.push(br.tips.t2s);
          if (state.unlocks.trade) lines.push(br.tips.trade);
          if (state.unlocks.pushStar) lines.push(br.tips.pushStar);
          data = {
            kicker: br.kicker,
            title: br.title,
            body: lines.join('\n'),
            tip: ''
          };
        }
      }

      if (!data) return;
      openInfoKey = key;
      els.infoKicker.textContent = data.kicker || '';
      els.infoTitle.textContent = data.title || '';
      els.infoBody.textContent = data.body || '';
      if (data.tip) {
        els.infoTip.textContent = data.tip;
        toggle(els.infoTip, true, 'block');
      } else {
        toggle(els.infoTip, false);
      }
      toggle(els.infoActions, els.infoActions.children.length > 0, 'flex');
      toggle(els.infoPopover, true, 'flex');

      var triggers = document.querySelectorAll('.info-trigger');
      for (var i = 0; i < triggers.length; i++) {
        triggers[i].classList.toggle('info-open', triggers[i].getAttribute('data-info') === key);
      }
    }

    var infoTriggers = document.querySelectorAll('.info-trigger');
    for (var ii = 0; ii < infoTriggers.length; ii++) {
      infoTriggers[ii].addEventListener('click', function (e) {
        e.stopPropagation();
        var key = this.getAttribute('data-info');
        var st = engine.getState();
        if (!st || !key) return;
        if (openInfoKey === key) {
          closeInfoPopover();
        } else {
          renderInfoPopover(key, st);
        }
      });
    }

    els.btnCloseInfo.addEventListener('click', function () {
      closeInfoPopover();
    });

    document.addEventListener('click', function (e) {
      if (!openInfoKey) return;
      if (els.infoPopover.contains(e.target)) return;
      closeInfoPopover();
    });

    els.btnAudio.addEventListener('click', function () {
      Audio.setMuted(!Audio.isMuted());
      els.btnAudio.textContent = Audio.isMuted() ? '🔇' : '🔊';
    });

    els.btnJournal.addEventListener('click', function () {
      var st = engine.getState();
      if (!st) return;
      renderJournal(st);
      toggle(els.modalJournal, true, 'flex');
    });

    els.btnCloseJournal.addEventListener('click', function () {
      toggle(els.modalJournal, false);
    });

    els.modalJournal.addEventListener('click', function (e) {
      if (e.target === els.modalJournal) toggle(els.modalJournal, false);
    });

    var tabBtns = document.querySelectorAll('.tab-btn');
    for (var ti = 0; ti < tabBtns.length; ti++) {
      tabBtns[ti].addEventListener('click', function () {
        for (var j = 0; j < tabBtns.length; j++) tabBtns[j].classList.remove('active');
        this.classList.add('active');
        activeTab = this.getAttribute('data-tab');
        renderJournal(engine.getState());
      });
    }

    els.toolHyper.addEventListener('click', function () { engine.toggleAimMode(); });
    els.btnCancelAim.addEventListener('click', function () { engine.toggleAimMode(false); });
    els.toolRadar.addEventListener('click', function () {
      var st = engine.getState();
      engine.setCompass(st.compassMode === 'nearest' ? 'clear' : 'nearest');
    });
    els.toolShield.addEventListener('click', function () { engine.activateShield(); });
    els.toolConvert.addEventListener('click', function () {
      activeTab = 'convert';
      for (var j = 0; j < tabBtns.length; j++) {
        tabBtns[j].classList.toggle('active', tabBtns[j].getAttribute('data-tab') === 'convert');
      }
      renderJournal(engine.getState());
      toggle(els.modalJournal, true, 'flex');
    });
    els.toolRefill.addEventListener('click', function () { engine.performRefill16(); });
    els.toolReseed.addEventListener('click', function () { engine.startNewGame(true); });

    var cmpBtns = document.querySelectorAll('[data-compass]');
    for (var ci = 0; ci < cmpBtns.length; ci++) {
      cmpBtns[ci].addEventListener('click', function () {
        var val = this.getAttribute('data-compass');
        engine.setCompass(val === 'clear' ? 'clear' : Number(val));
      });
    }

    var goBtns = document.querySelectorAll('[data-go]');
    for (var gi = 0; gi < goBtns.length; gi++) {
      goBtns[gi].addEventListener('click', function () {
        var val = this.getAttribute('data-go');
        engine.goToNode(val === 'rnd' ? 'rnd' : Number(val));
      });
    }

    var dpadBtns = document.querySelectorAll('.dpad-btn');
    for (var di = 0; di < dpadBtns.length; di++) {
      dpadBtns[di].addEventListener('click', function () {
        var dir = this.getAttribute('data-dir');
        if (dir === 'up') engine.moveShipByStep(0, -1);
        if (dir === 'down') engine.moveShipByStep(0, 1);
        if (dir === 'left') engine.moveShipByStep(-1, 0);
        if (dir === 'right') engine.moveShipByStep(1, 0);
        if (dir === 'interact') {
          var st = engine.getState();
          if (st) engine.visitCell(st.ship.x, st.ship.y, true);
        }
      });
    }

    if (els.btnRerollMood) {
      els.btnRerollMood.addEventListener('click', function () {
        engine.rerollIntroMood();
        hydrateStaticTexts();
      });
    }

    els.btnStartNew.addEventListener('click', function () {
      toggle(els.overlayIntro, false);
      engine.startNewGame(false);
    });

    els.btnResumeSave.addEventListener('click', function () {
      toggle(els.overlayIntro, false);
      engine.loadSavedGame();
    });

    els.btnChapContinue.addEventListener('click', function () {
      toggle(els.overlayChapter, false);
    });

    els.btnChapReseed.addEventListener('click', function () {
      toggle(els.overlayChapter, false);
      engine.startNewGame(true);
    });

    return {
      initIntro: function () {
        toggle(els.btnResumeSave, engine.hasSavedGame(), 'inline-block');
      },
      update: function (state, opts) {
        if (!state) return;
        if (opts && opts.moodChanged) hydrateStaticTexts();
        renderHUD(state);
        renderToolbar(state);
        renderContextPanel(state);
        if (openInfoKey) renderInfoPopover(openInfoKey, state);
      },
      onStoryEvent: function (chap, isModal) {
        if (isModal) showChapterOverlay(chap);
        else showToast(chap);
      },
      openJournal: function () {
        var st = engine.getState();
        if (!st || !st.unlocks.journal) return;
        closeInfoPopover();
        renderJournal(st);
        toggle(els.modalJournal, true, 'flex');
      },
      closeModals: function () {
        closeInfoPopover();
        toggle(els.modalJournal, false);
        toggle(els.overlayChapter, false);
        engine.toggleAimMode(false);
      }
    };
  }

  SPAWN.UI = {
    createUI: createUI
  };
})(window);
