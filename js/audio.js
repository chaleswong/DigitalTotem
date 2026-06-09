/* ============================================================
   Digital Totem — Audio Engine (432Hz Synthesis)
   ============================================================ */
window.DT = window.DT || {};

window.DT.audio = (() => {
  let ctx = null;
  let activeNodes = [];

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function stopAll() {
    activeNodes.forEach(n => { try { n.stop(); } catch(e) {} });
    activeNodes = [];
  }

  /* --- Singing Bowl (颂钵) — 432Hz with harmonics, long decay --- */
  function playSingingBowl(durationSec = 30) {
    const ac = getCtx();
    const now = ac.currentTime;
    const masterGain = ac.createGain();
    masterGain.gain.setValueAtTime(0.25, now);
    masterGain.connect(ac.destination);

    const harmonics = [
      { freq: 432, gain: 0.5 },
      { freq: 864, gain: 0.2 },
      { freq: 1296, gain: 0.08 },
      { freq: 1728, gain: 0.03 }
    ];

    harmonics.forEach(h => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(h.freq, now);
      // Slow vibrato
      const lfo = ac.createOscillator();
      const lfoGain = ac.createGain();
      lfo.frequency.setValueAtTime(0.3, now);
      lfoGain.gain.setValueAtTime(h.freq * 0.003, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);

      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(h.gain, now + 0.8);
      g.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + durationSec);
      activeNodes.push(osc, lfo);
    });

    // Repeat every cycle
    const loopInterval = setInterval(() => {
      if (!activeNodes.length) { clearInterval(loopInterval); return; }
      const t = ac.currentTime;
      harmonics.forEach(h => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(h.freq, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(h.gain * 0.6, t + 1);
        g.gain.exponentialRampToValueAtTime(0.001, t + durationSec * 0.8);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(t);
        osc.stop(t + durationSec * 0.8);
        activeNodes.push(osc);
      });
    }, (durationSec - 2) * 1000);

    activeNodes._loopInterval = loopInterval;
  }

  /* --- Guqin Pluck (古琴) — 432Hz with quick attack, warm decay --- */
  function playGuqin(durationSec = 30) {
    const ac = getCtx();
    const now = ac.currentTime;
    const masterGain = ac.createGain();
    masterGain.gain.setValueAtTime(0.3, now);
    masterGain.connect(ac.destination);

    function pluck(time) {
      const fundamental = 432;
      const partials = [
        { freq: fundamental, gain: 0.5 },
        { freq: fundamental * 2, gain: 0.25 },
        { freq: fundamental * 3, gain: 0.12 },
        { freq: fundamental * 4, gain: 0.06 },
        { freq: fundamental * 5, gain: 0.03 }
      ];

      partials.forEach(p => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = p === partials[0] ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(p.freq, time);
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(p.gain, time + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, time + 3);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(time);
        osc.stop(time + 3.5);
        activeNodes.push(osc);
      });
    }

    // Pluck at intervals
    const interval = 4; // seconds between plucks
    const count = Math.ceil(durationSec / interval);
    for (let i = 0; i < count; i++) {
      pluck(now + i * interval);
    }
  }

  /* --- Simple tick for merit tap --- */
  function playTick() {
    const ac = getCtx();
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /* --- Vibration feedback (if supported) --- */
  function vibrate(pattern) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern || 50);
    }
  }

  /* --- Speak text with Speech Synthesis API --- */
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.85;
    u.pitch = 0.9;
    window.speechSynthesis.speak(u);
  }

  return {
    playSingingBowl,
    playGuqin,
    playTick,
    stopAll() {
      if (activeNodes._loopInterval) clearInterval(activeNodes._loopInterval);
      stopAll();
    },
    vibrate,
    speak,
    getCtx
  };
})();
