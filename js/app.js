/* ============================================================
   Digital Totem v2.0 — 主应用控制器 (App Controller)
   ============================================================
   职责：
   - 全局状态管理（localStorage 持久化）
   - NFC 模拟面板（碰一碰 + 压力滑块 + 温湿度）
   - 静默模式（长按3秒切换）
   - 启动引导序列（新手引导 / 灵宠初始化）
   - 滚动渐入观察器
   - 快捷操作绑定
   ============================================================ */
window.DT = window.DT || {};

(() => {
  'use strict';

  /* ============================================================
     默认状态结构
     ============================================================ */
  const DEFAULT_STATE = {
    uid: null,
    initialized: false,
    constitution: null,
    petName: null,
    petElement: null,
    petColor: null,
    silentMode: false,
    meritCount: 0,
    relaxScore: 0,
    poolContributed: 0,
    patinaLevel: 1,
    totalDays: 1,
    dailyTaps: 0,
    breathSessions: 0,
    stressScore: 50,
    rosaryScore: 0,
    consecutiveHighStressDays: 0,
    prescriptionToday: null,
    lastPrescriptionDate: null,
    weeklyTaps: [3, 5, 2, 8, 4, 6, 1],
    lastVisit: null,
    weatherTemp: 25,
    weatherHumid: 60
  };

  /* ============================================================
     状态管理
     ============================================================ */
  DT.state = { ...DEFAULT_STATE };

  DT.save = function () {
    try {
      DT.state.lastVisit = new Date().toISOString();
      localStorage.setItem('dt_state', JSON.stringify(DT.state));
    } catch (e) { console.warn('[状态] 保存失败', e); }
  };

  DT.load = function () {
    try {
      const raw = localStorage.getItem('dt_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        DT.state = { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) { console.warn('[状态] 加载失败', e); }
  };

  /* ============================================================
     URL 参数解析
     ============================================================ */
  function parseURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('uid')) DT.state.uid = params.get('uid');
  }

  /* ============================================================
     日期翻转检测
     ============================================================ */
  function checkDayRollover() {
    const today = new Date().toDateString();
    if (DT.state.lastVisit) {
      const lastDay = new Date(DT.state.lastVisit).toDateString();
      if (lastDay !== today) {
        DT.state.totalDays++;
        DT.state.dailyTaps = 0;
        DT.state.prescriptionToday = null;

        // 连续高压天数追踪
        if (DT.state.stressScore > 70) {
          DT.state.consecutiveHighStressDays++;
        } else {
          DT.state.consecutiveHighStressDays = 0;
        }
      }
    }
  }

  /* ============================================================
     显示主界面 — 初始化所有模块
     ============================================================ */
  DT.showMain = function () {
    const main = document.getElementById('main-content');
    if (main) {
      main.classList.remove('hidden');
    }

    // 初始化灵宠系统
    if (DT.pet && DT.pet.init) DT.pet.init();

    // 初始化聊天系统
    if (DT.chat && DT.chat.init) DT.chat.init();

    // 初始化气机运势
    if (DT.daily) {
      if (DT.daily.initQiFlux) DT.daily.initQiFlux();
      if (DT.daily.initHealingPod) DT.daily.initHealingPod();
      if (DT.daily.initPrescription) DT.daily.initPrescription();
    }

    // 初始化微仪式
    if (DT.ritual && DT.ritual.initRituals) DT.ritual.initRituals();

    // 初始化社交模块
    if (DT.social && DT.social.init) DT.social.init();

    // 初始化周报
    if (DT.report && DT.report.initWeeklyReport) DT.report.initWeeklyReport();

    // 延迟检查节气
    setTimeout(() => {
      if (DT.report && DT.report.checkSolarTerm) DT.report.checkSolarTerm();
    }, 1500);

    // 初始化滚动渐入
    initScrollObserver();

    // 绑定快捷操作按钮
    bindQuickActions();

    // 绑定灵宠舞台触摸
    bindPetStageTouch();
  };

  /* ============================================================
     快捷操作绑定
     ============================================================ */
  function bindQuickActions() {
    const actions = {
      'action-breathe': 'ritual-section',
      'action-rosary': 'merit-section',
      'action-healing': 'healing-section',
      'action-report': 'report-section'
    };

    Object.entries(actions).forEach(([btnId, targetId]) => {
      const btn = document.getElementById(btnId);
      const target = document.getElementById(targetId);
      if (btn && target) {
        btn.addEventListener('click', () => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });
  }

  /* ============================================================
     灵宠舞台触摸绑定
     ============================================================ */
  function bindPetStageTouch() {
    const stage = document.getElementById('pet-stage');
    if (!stage || !DT.pet) return;
    // 注意：pet.js 内部已经绑定了 initTouchInteraction
    // 这里不再重复绑定，避免双重触发
  }

  /* ============================================================
     滚动渐入观察器
     ============================================================ */
  function initScrollObserver() {
    const sections = document.querySelectorAll('.fade-section');
    if (!sections.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      sections.forEach(s => observer.observe(s));
    } else {
      // 降级方案：直接显示
      sections.forEach(s => s.classList.add('in-view'));
    }
  }

  /* ============================================================
     NFC 模拟面板
     ============================================================ */
  function initNFC() {
    const panel = document.getElementById('nfc-panel');
    if (!panel) return;

    // 折叠/展开
    const toggle = document.getElementById('nfc-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
      });
    }

    // 碰一碰按钮
    const tapBtn = document.getElementById('nfc-tap-btn');
    const tapCount = document.getElementById('nfc-tap-count');
    let tapTimes = [];

    if (tapBtn) {
      tapBtn.addEventListener('click', () => {
        DT.state.dailyTaps++;
        if (tapCount) tapCount.textContent = DT.state.dailyTaps;

        // 音效
        if (DT.audio && DT.audio.playTick) DT.audio.playTick();
        if (DT.audio && DT.audio.vibrate) DT.audio.vibrate();

        // SOS 检测：3秒内4次碰触
        const now = Date.now();
        tapTimes.push(now);
        tapTimes = tapTimes.filter(t => now - t < 3000);
        if (tapTimes.length >= 4) {
          tapTimes = [];
          if (DT.ritual && DT.ritual.triggerSOS) DT.ritual.triggerSOS();
        }

        // NFC 状态更新
        const status = document.getElementById('nfc-status');
        if (status) {
          status.textContent = '已连接';
          setTimeout(() => { status.textContent = '就绪'; }, 1000);
        }

        DT.save();
      });
    }

    // 压力滑块
    const stressSlider = document.getElementById('nfc-stress');
    const stressVal = document.getElementById('nfc-stress-val');
    if (stressSlider) {
      stressSlider.value = DT.state.stressScore;
      if (stressVal) stressVal.textContent = DT.state.stressScore;

      stressSlider.addEventListener('input', () => {
        DT.state.stressScore = parseInt(stressSlider.value);
        if (stressVal) stressVal.textContent = stressSlider.value;
        if (DT.pet && DT.pet.updateMorph) DT.pet.updateMorph();
        DT.save();
      });
    }

    // 温度滑块
    const tempSlider = document.getElementById('nfc-temp');
    const tempVal = document.getElementById('nfc-temp-val');
    if (tempSlider) {
      tempSlider.addEventListener('input', () => {
        DT.state.weatherTemp = parseInt(tempSlider.value);
        if (tempVal) tempVal.textContent = tempSlider.value + '°C';
        if (DT.daily && DT.daily.onWeatherChange) DT.daily.onWeatherChange();
        DT.save();
      });
    }

    // 湿度滑块
    const humidSlider = document.getElementById('nfc-humid');
    const humidVal = document.getElementById('nfc-humid-val');
    if (humidSlider) {
      humidSlider.addEventListener('input', () => {
        DT.state.weatherHumid = parseInt(humidSlider.value);
        if (humidVal) humidVal.textContent = humidSlider.value + '%';
        if (DT.daily && DT.daily.onWeatherChange) DT.daily.onWeatherChange();
        DT.save();
      });
    }

    // 包浆显示
    const patinaEl = document.getElementById('nfc-patina');
    if (patinaEl) {
      const patinaPercent = Math.min(100, Math.round((DT.state.patinaLevel / 3) * 100));
      patinaEl.textContent = patinaPercent + '%';
    }

    // UID 显示
    const uidEl = document.getElementById('nfc-uid');
    if (uidEl && DT.state.uid) {
      uidEl.textContent = DT.state.uid;
    }
  }

  /* ============================================================
     静默模式
     ============================================================ */
  function initSilentMode() {
    const btn = document.getElementById('silent-btn');
    const icon = document.getElementById('silent-icon');
    if (!btn) return;

    let holdTimer = null;
    let holdStart = 0;

    function applySilent(on) {
      DT.state.silentMode = on;
      document.body.classList.toggle('silent-mode', on);
      if (icon) icon.textContent = on ? '🔇' : '🧘‍♂️';

      if (on && DT.audio && DT.audio.stopAll) {
        DT.audio.stopAll();
      }

      DT.save();
    }

    // 长按3秒切换
    btn.addEventListener('mousedown', () => {
      holdStart = Date.now();
      holdTimer = setTimeout(() => {
        applySilent(!DT.state.silentMode);
      }, 3000);
    });

    btn.addEventListener('mouseup', () => { clearTimeout(holdTimer); });
    btn.addEventListener('mouseleave', () => { clearTimeout(holdTimer); });

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      holdStart = Date.now();
      holdTimer = setTimeout(() => {
        applySilent(!DT.state.silentMode);
      }, 3000);
    }, { passive: false });

    btn.addEventListener('touchend', () => { clearTimeout(holdTimer); });

    // 单击也切换（更方便演示）
    btn.addEventListener('click', () => {
      if (Date.now() - holdStart < 500) {
        applySilent(!DT.state.silentMode);
      }
    });

    // 初始状态恢复
    if (DT.state.silentMode) applySilent(true);
  }

  /* ============================================================
     启动序列
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    // 解析URL
    parseURL();

    // 加载状态
    DT.load();

    // 日期翻转检测
    checkDayRollover();

    // 加载动画
    setTimeout(() => document.body.classList.add('loaded'), 50);

    // 初始化NFC
    initNFC();

    // 初始化静默模式
    initSilentMode();

    // 启动判断
    if (!DT.state.initialized) {
      // 新用户 → 引导流程
      setTimeout(() => {
        if (DT.ritual && DT.ritual.showOnboarding) {
          DT.ritual.showOnboarding();
        }
      }, 600);
    } else {
      // 老用户 → 直接进入
      setTimeout(() => DT.showMain(), 400);
    }

    console.log('[Digital Totem v2.0] 启动完成 UID:', DT.state.uid);
  });

})();
