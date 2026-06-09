/* ============================================================
   Digital Totem — Social Layer (功德榜 / 包浆成长)
   ============================================================ */
window.DT = window.DT || {};

window.DT.social = (() => {
  const PATINA_LEVELS = [
    { level: 1, name: '素珠', minMerit: 0, desc: '干燥木质，尚未开光' },
    { level: 2, name: '温润', minMerit: 100, desc: '初现温润高光' },
    { level: 3, name: '包浆', minMerit: 500, desc: '琥珀金五行气场环绕' }
  ];

  const POOL_GOAL = 1000000;
  let poolTotal = 388652; // Simulated community pool base

  function init() {
    initMeritBoard();
    initGrowth();
  }

  /* ============================================================
     MERIT BOARD (盘珠功德榜)
     ============================================================ */
  function initMeritBoard() {
    updateMeritDisplay();
    updatePoolDisplay();

    // Tap button
    document.getElementById('merit-tap').addEventListener('click', () => {
      DT.state.meritCount = (DT.state.meritCount || 0) + 1;
      DT.state.relaxScore = (DT.state.relaxScore || 0) + Math.ceil(Math.random() * 3);
      DT.state.dailyTaps = (DT.state.dailyTaps || 0) + 1;
      DT.save();
      updateMeritDisplay();
      DT.audio.playTick();
      DT.audio.vibrate(25);

      // Bump animation
      const el = document.getElementById('merit-personal');
      el.classList.remove('bump');
      void el.offsetWidth; // reflow
      el.classList.add('bump');
    });

    // Inject to pool
    document.getElementById('pool-inject').addEventListener('click', () => {
      const personal = DT.state.meritCount || 0;
      if (personal <= 0) return;

      const contribute = Math.min(personal, 100);
      DT.state.meritCount -= contribute;
      DT.state.poolContributed = (DT.state.poolContributed || 0) + contribute;
      poolTotal += contribute;
      DT.save();

      updateMeritDisplay();
      updatePoolDisplay();

      // Check achievement
      if (poolTotal >= POOL_GOAL) {
        document.getElementById('pool-achievement').classList.remove('hidden');
      }

      DT.audio.playTick();
    });
  }

  function updateMeritDisplay() {
    document.getElementById('merit-personal').textContent = DT.state.meritCount || 0;
    document.getElementById('merit-relax').textContent = DT.state.relaxScore || 0;
  }

  function updatePoolDisplay() {
    const pct = Math.min((poolTotal / POOL_GOAL) * 100, 100);
    document.getElementById('pool-water').style.height = pct + '%';
    document.getElementById('pool-level').textContent =
      `${poolTotal.toLocaleString()} / ${POOL_GOAL.toLocaleString()}`;
  }

  /* ============================================================
     GROWTH / PATINA (成长包浆)
     ============================================================ */
  function initGrowth() {
    updatePatinaLevel();
    updateBeadVisual();
    updateGrowthBar();
  }

  function updatePatinaLevel() {
    const merit = DT.state.meritCount || 0;
    const totalMerit = merit + (DT.state.poolContributed || 0);
    let newLevel = 1;
    for (const p of PATINA_LEVELS) {
      if (totalMerit >= p.minMerit) newLevel = p.level;
    }
    DT.state.patinaLevel = newLevel;
    DT.save();
  }

  function updateBeadVisual() {
    const level = DT.state.patinaLevel || 1;
    const sphere = document.getElementById('bead-sphere');
    const glow = document.getElementById('bead-glow');
    const aura = document.getElementById('bead-aura');

    sphere.className = 'bead-sphere';
    glow.className = 'bead-glow-ring';
    aura.className = 'bead-aura';

    if (level >= 2) {
      sphere.classList.add('level-2');
    }
    if (level >= 3) {
      sphere.classList.add('level-3');
      glow.classList.add('visible');
      aura.classList.add('visible');
    }

    // Labels
    const patinaInfo = PATINA_LEVELS.find(p => p.level === level);
    document.getElementById('patina-label').textContent = `包浆等级：${patinaInfo.name}`;
    document.getElementById('days-label').textContent = `累计 ${DT.state.totalDays || 1} 天`;

    // NFC panel
    document.getElementById('nfc-patina').textContent = `Lv.${level} ${patinaInfo.name}`;
  }

  function updateGrowthBar() {
    const level = DT.state.patinaLevel || 1;
    const totalMerit = (DT.state.meritCount || 0) + (DT.state.poolContributed || 0);
    const current = PATINA_LEVELS.find(p => p.level === level);
    const next = PATINA_LEVELS.find(p => p.level === level + 1);

    let pct = 100;
    if (next) {
      pct = Math.min(((totalMerit - current.minMerit) / (next.minMerit - current.minMerit)) * 100, 100);
    }

    document.getElementById('growth-fill').style.width = pct + '%';
    document.getElementById('growth-label').textContent = `Lv.${level} ${current.name}`;

    // Stage highlights
    document.querySelectorAll('.stage').forEach((el, i) => {
      el.style.opacity = (i + 1) <= level ? '1' : '0.4';
    });

    // Coupon for level 3
    if (level >= 3) {
      document.getElementById('growth-reward').classList.remove('hidden');
      document.getElementById('coupon-code').textContent =
        'TOTEM-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    }
  }

  /* --- Refresh all social UI --- */
  function refresh() {
    updatePatinaLevel();
    updateMeritDisplay();
    updatePoolDisplay();
    updateBeadVisual();
    updateGrowthBar();
  }

  return { init, refresh };
})();
