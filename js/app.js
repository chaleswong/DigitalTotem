/* ============================================================
   Digital Totem — Main App Logic & State Management
   ============================================================ */
window.DT = window.DT || {};

(() => {
  /* ============================================================
     STATE MANAGEMENT
     ============================================================ */
  const STORAGE_KEY = 'digital_totem_state';

  const DEFAULT_STATE = {
    uid: null,
    initialized: false,
    constitution: null,
    silentMode: false,
    meritCount: 0,
    relaxScore: 0,
    poolContributed: 0,
    patinaLevel: 1,
    totalDays: 1,
    dailyTaps: 0,
    breathSessions: 0,
    prescriptionToday: null,
    lastPrescriptionDate: null,
    weeklyTaps: [3, 5, 2, 8, 4, 6, 1],
    weeklyEmotions: [],
    lastVisit: null,
    weatherTemp: 25,
    weatherHumid: 60
  };

  DT.state = { ...DEFAULT_STATE };

  DT.save = function () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DT.state));
    } catch (e) { /* quota exceeded */ }
  };

  DT.load = function () {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        DT.state = { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) { /* parse error */ }
  };

  /* ============================================================
     URL PARAMETER PARSING
     ============================================================ */
  function parseURL() {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    const tapType = params.get('tap_type');
    const tapFreq = parseInt(params.get('tap_freq')) || 1;

    if (uid) {
      DT.state.uid = uid;
      DT.save();
    }

    return { uid, tapType, tapFreq };
  }

  /* ============================================================
     PAGE INITIALIZATION
     ============================================================ */
  DT.showMain = function () {
    const main = document.getElementById('main-content');
    main.classList.remove('hidden');
    requestAnimationFrame(() => {
      main.classList.add('visible');
    });

    // Initialize all modules
    DT.daily.initQiFlux();
    DT.daily.initHealingPod();
    DT.daily.initPrescription();
    DT.ritual.initRituals();
    DT.social.init();
    DT.report.initWeeklyReport();

    // Check solar term
    setTimeout(() => DT.report.checkSolarTerm(), 1500);

    // Scroll animation observer
    initScrollObserver();
  };

  /* ============================================================
     SCROLL ANIMATION
     ============================================================ */
  function initScrollObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-section').forEach(el => observer.observe(el));
  }

  /* ============================================================
     NFC SIMULATOR
     ============================================================ */
  let tapTimestamps = [];
  let nfcTapCount = 0;

  function initNFCSimulator() {
    const tapBtn = document.getElementById('nfc-tap-btn');
    const toggle = document.getElementById('nfc-toggle');
    const panel = document.getElementById('nfc-panel');

    // Toggle panel
    toggle.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
    });

    // Tap button
    tapBtn.addEventListener('click', handleTap);

    // Weather sliders
    document.getElementById('nfc-temp').addEventListener('input', (e) => {
      document.getElementById('nfc-temp-val').textContent = e.target.value;
      DT.daily.onWeatherChange(parseInt(e.target.value), DT.state.weatherHumid);
    });

    document.getElementById('nfc-humid').addEventListener('input', (e) => {
      document.getElementById('nfc-humid-val').textContent = e.target.value;
      DT.daily.onWeatherChange(DT.state.weatherTemp, parseInt(e.target.value));
    });

    // Display UID
    document.getElementById('nfc-uid').textContent = DT.state.uid || '—';

    // Sync slider values from state
    document.getElementById('nfc-temp').value = DT.state.weatherTemp;
    document.getElementById('nfc-temp-val').textContent = DT.state.weatherTemp;
    document.getElementById('nfc-humid').value = DT.state.weatherHumid;
    document.getElementById('nfc-humid-val').textContent = DT.state.weatherHumid;
  }

  function handleTap() {
    const now = Date.now();
    tapTimestamps.push(now);
    nfcTapCount++;

    // Update display
    document.getElementById('nfc-tap-count').textContent = nfcTapCount;

    // Update daily taps
    DT.state.dailyTaps = (DT.state.dailyTaps || 0) + 1;

    // Update weekly taps (today = last element)
    if (!DT.state.weeklyTaps) DT.state.weeklyTaps = [0,0,0,0,0,0,0];
    DT.state.weeklyTaps[6] = (DT.state.weeklyTaps[6] || 0) + 1;

    DT.save();

    // Refresh social counters
    if (DT.social && DT.social.refresh) DT.social.refresh();

    // SOS Detection: 4+ taps in 3 seconds
    const recentTaps = tapTimestamps.filter(t => now - t < 3000);
    tapTimestamps = recentTaps;
    if (recentTaps.length >= 4) {
      tapTimestamps = [];
      document.getElementById('nfc-status').textContent = '⚠️ SOS';
      DT.ritual.triggerSOS();
      setTimeout(() => {
        document.getElementById('nfc-status').textContent = '正常';
      }, 5000);
    }

    DT.audio.playTick();
    DT.audio.vibrate(40);
  }

  /* ============================================================
     SILENT MODE
     ============================================================ */
  function initSilentMode() {
    const btn = document.getElementById('silent-btn');
    const icon = document.getElementById('silent-icon');
    let pressTimer = null;
    let holdStart = 0;
    let holdInterval = null;

    function startHold() {
      holdStart = Date.now();
      // Update hold time display
      holdInterval = setInterval(() => {
        const elapsed = ((Date.now() - holdStart) / 1000).toFixed(1);
        document.getElementById('nfc-hold-time').textContent = elapsed;
      }, 100);

      pressTimer = setTimeout(() => {
        toggleSilentMode();
        DT.audio.vibrate(200);
      }, 3000);
    }

    function endHold() {
      if (pressTimer) clearTimeout(pressTimer);
      if (holdInterval) clearInterval(holdInterval);
      pressTimer = null;
      holdInterval = null;
    }

    btn.addEventListener('mousedown', startHold);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(); });
    btn.addEventListener('mouseup', endHold);
    btn.addEventListener('mouseleave', endHold);
    btn.addEventListener('touchend', endHold);
    btn.addEventListener('touchcancel', endHold);

    // Restore state
    if (DT.state.silentMode) {
      document.body.classList.add('silent-mode');
      icon.textContent = '😌';
    }
  }

  function toggleSilentMode() {
    DT.state.silentMode = !DT.state.silentMode;
    DT.save();

    const icon = document.getElementById('silent-icon');

    if (DT.state.silentMode) {
      document.body.classList.add('silent-mode');
      icon.textContent = '😌';
      document.getElementById('nfc-status').textContent = '静默';
      DT.audio.stopAll();
    } else {
      document.body.classList.remove('silent-mode');
      icon.textContent = '🧘‍♂️';
      document.getElementById('nfc-status').textContent = '正常';
    }

    // Refresh charts (they need color update)
    setTimeout(() => {
      DT.daily.initQiFlux();
      DT.report.initWeeklyReport();
    }, 300);
  }

  /* ============================================================
     DAY ROLLOVER
     ============================================================ */
  function checkDayRollover() {
    const today = new Date().toDateString();
    if (DT.state.lastVisit && DT.state.lastVisit !== today) {
      // New day
      DT.state.totalDays = (DT.state.totalDays || 0) + 1;
      DT.state.dailyTaps = 0;
      DT.state.prescriptionToday = null;
      DT.state.lastPrescriptionDate = null;

      // Shift weekly taps
      DT.state.weeklyTaps = DT.state.weeklyTaps || [0,0,0,0,0,0,0];
      DT.state.weeklyTaps.shift();
      DT.state.weeklyTaps.push(0);
    }
    DT.state.lastVisit = today;
    DT.save();
  }

  /* ============================================================
     BOOT SEQUENCE
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    // Parse URL & load state
    const urlParams = parseURL();
    DT.load();

    // If URL has uid, update state
    if (urlParams.uid) {
      DT.state.uid = urlParams.uid;
      DT.save();
    }

    // Day rollover check
    checkDayRollover();

    // Page transition: dark → light (within 0.5s)
    setTimeout(() => {
      document.body.classList.add('loaded');
    }, 50);

    // Init NFC simulator & silent mode
    initNFCSimulator();
    initSilentMode();

    // Check if first visit
    if (!DT.state.initialized) {
      // Show onboarding
      setTimeout(() => {
        DT.ritual.showOnboarding();
      }, 600);
    } else {
      // Show main content directly
      setTimeout(() => {
        DT.showMain();
      }, 400);
    }
  });
})();
