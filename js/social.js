/* ============================================================
   Digital Totem v2.0 — Social Layer (功德榜 / 包浆成长)
   ============================================================
   职责：
   - 盘珠功德计数 + 放松指数
   - 功德池（社区汇流）
   - 包浆成长三阶段
   - 灵宠念珠联动
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
    const tapBtn = document.getElementById('merit-tap');
    if (tapBtn) {
      tapBtn.addEventListener('click', () => {
        DT.state.meritCount = (DT.state.meritCount || 0) + 1;
        DT.state.relaxScore = (DT.state.relaxScore || 0) + Math.ceil(Math.random() * 3);
        DT.state.dailyTaps = (DT.state.dailyTaps || 0) + 1;

        // 灵宠念珠联动
        DT.state.rosaryScore = Math.min(100, (DT.state.rosaryScore || 0) + 1);
        if (DT.pet && DT.pet.addRosary) DT.pet.addRosary(1);

        DT.save();
        updateMeritDisplay();

        if (DT.audio && DT.audio.playTick) DT.audio.playTick();
        if (DT.audio && DT.audio.vibrate) DT.audio.vibrate(25);

        // Bump animation
        const el = document.getElementById('merit-personal');
        if (el) {
          el.classList.remove('bump');
          void el.offsetWidth; // reflow
          el.classList.add('bump');
        }
      });
    }

    // Inject to pool
    const injectBtn = document.getElementById('pool-inject');
    if (injectBtn) {
      injectBtn.addEventListener('click', () => {
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
          const achieveEl = document.getElementById('pool-achievement');
          if (achieveEl) {
            achieveEl.classList.remove('hidden');
            achieveEl.innerHTML = '🎉 功德圆满！社区目标已达成';
          }
        }

        if (DT.audio && DT.audio.playTick) DT.audio.playTick();
      });
    }
  }

  function updateMeritDisplay() {
    const personal = document.getElementById('merit-personal');
    const relax = document.getElementById('merit-relax');
    if (personal) personal.textContent = DT.state.meritCount || 0;
    if (relax) relax.textContent = DT.state.relaxScore || 0;
  }

  function updatePoolDisplay() {
    const pct = Math.min((poolTotal / POOL_GOAL) * 100, 100);
    const water = document.getElementById('pool-water');
    const level = document.getElementById('pool-level');
    if (water) water.style.height = pct + '%';
    if (level) level.textContent = `${poolTotal.toLocaleString()} / ${POOL_GOAL.toLocaleString()}`;
  }

  /* ============================================================
     GROWTH / PATINA (成长包浆)
     ============================================================ */
  function initGrowth() {
    updatePatinaLevel();
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

    // Update NFC panel patina display
    const patinaEl = document.getElementById('nfc-patina');
    if (patinaEl) {
      const patinaInfo = PATINA_LEVELS.find(p => p.level === newLevel);
      patinaEl.textContent = `Lv.${newLevel} ${patinaInfo.name}`;
    }

    DT.save();
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

    const fill = document.getElementById('growth-fill');
    const label = document.getElementById('growth-label');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = `${current.name}阶段 · ${Math.round(pct)}%`;

    // Stage highlights
    document.querySelectorAll('.stage').forEach((el, i) => {
      el.style.opacity = (i + 1) <= level ? '1' : '0.4';
    });

    // Coupon for level 3
    if (level >= 3) {
      const reward = document.getElementById('growth-reward');
      if (reward) reward.classList.remove('hidden');
    }
  }

  /* --- Refresh all social UI --- */
  function refresh() {
    updatePatinaLevel();
    updateMeritDisplay();
    updatePoolDisplay();
    updateGrowthBar();
  }

  return { init, refresh };
})();
