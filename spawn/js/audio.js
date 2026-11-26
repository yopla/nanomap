(function (global) {
  'use strict';

  var SPAWN = (global.SPAWN = global.SPAWN || {});

  var ctx = null;
  var muted = false;

  function ensureContext() {
    if (muted) return null;
    if (!ctx) {
      var AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  function tone(freq, duration, type, gainVal, delay, endFreq) {
    var c = ensureContext();
    if (!c) return;
    var now = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal || 0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playStep() {
    tone(280, 0.07, 'triangle', 0.045, 0, 190);
  }

  function playBoundBounce() {
    tone(160, 0.22, 'sine', 0.09, 0, 420);
    tone(320, 0.16, 'triangle', 0.04, 0.05, 520);
  }

  function playGlitch() {
    tone(110, 0.14, 'sawtooth', 0.06, 0, 65);
    tone(92, 0.16, 'square', 0.04, 0.06, 55);
  }

  function playScan() {
    tone(520, 0.12, 'sine', 0.06, 0, 780);
  }

  function playStar() {
    tone(440, 0.28, 'sine', 0.07, 0);
    tone(659.25, 0.32, 'sine', 0.06, 0.07);
    tone(880, 0.45, 'triangle', 0.05, 0.14);
  }

  function playHyper() {
    tone(180, 0.42, 'sine', 0.08, 0, 960);
    tone(270, 0.38, 'triangle', 0.04, 0.06, 1280);
  }

  function playGood() {
    tone(523.25, 0.16, 'sine', 0.06, 0);
    tone(659.25, 0.22, 'sine', 0.06, 0.08);
  }

  function playBad() {
    tone(240, 0.2, 'sawtooth', 0.05, 0, 130);
  }

  function playChapter() {
    tone(392, 0.25, 'sine', 0.07, 0);
    tone(493.88, 0.25, 'sine', 0.06, 0.1);
    tone(587.33, 0.35, 'sine', 0.07, 0.2);
    tone(783.99, 0.5, 'triangle', 0.06, 0.3);
  }

  function setMuted(val) {
    muted = !!val;
  }

  function isMuted() {
    return muted;
  }

  SPAWN.Audio = {
    playStep: playStep,
    playBoundBounce: playBoundBounce,
    playGlitch: playGlitch,
    playScan: playScan,
    playStar: playStar,
    playHyper: playHyper,
    playGood: playGood,
    playBad: playBad,
    playChapter: playChapter,
    setMuted: setMuted,
    isMuted: isMuted
  };
})(window);
