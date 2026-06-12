/* ============================================================
   Digital Totem v2.0 — 认主仪式 & 微仪式模块 (Ritual Module)
   ============================================================
   职责：
   - 新手引导流程（碰一碰 → 情志问卷 → 灵宠觉醒）
   - 三大微仪式（呼吸 / 正念盘珠 / 心语日记）
   - SOS 紧急安抚舱
   ============================================================ */
window.DT = window.DT || {};

window.DT.ritual = (() => {
  'use strict';

  /* ============================================================
     情志问卷题库 — 3 题快速体质评估
     ============================================================ */
  const QUESTIONS = [
    {
      q: '最近一周，你最常感受到的身体不适是？',
      options: [
        { text: '胸口发闷，总想叹气', score: { '气郁质': 3 } },
        { text: '太阳穴胀痛，口干', score: { '阴虚质': 3 } },
        { text: '全身紧绷，肩颈酸痛', score: { '气虚质': 2, '气郁质': 1 } },
        { text: '小腹沉重，四肢困倦', score: { '湿热质': 3 } },
        { text: '没有明显不适', score: { '平和质': 3 } }
      ]
    },
    {
      q: '你的睡眠质量如何？',
      options: [
        { text: '入睡困难，脑子停不下来', score: { '气郁质': 2, '阴虚质': 1 } },
        { text: '多梦易醒，醒后疲惫', score: { '湿热质': 2, '阴虚质': 1 } },
        { text: '偶尔失眠，总体还行', score: { '气虚质': 2 } },
        { text: '睡眠质量不错', score: { '平和质': 3 } }
      ]
    },
    {
      q: '面对职场压力时，你的典型反应是？',
      options: [
        { text: '内心翻涌，但表面镇定', score: { '气郁质': 3 } },
        { text: '容易急躁上火', score: { '阴虚质': 2, '湿热质': 1 } },
        { text: '感到虚脱无力', score: { '气虚质': 3 } },
        { text: '基本能从容应对', score: { '平和质': 3 } }
      ]
    }
  ];

  let answers = {};

  /* ============================================================
     1. showOnboarding() — 展示新手引导
     ============================================================ */
  function showOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');
    showStep(1);

    // 步骤一：唤醒灵宠按钮
    const touchBtn = document.getElementById('onboard-touch-btn');
    if (touchBtn) {
      touchBtn.addEventListener('click', () => {
        if (DT.audio && DT.audio.playSingingBowl) DT.audio.playSingingBowl();
        if (DT.audio && DT.audio.vibrate) DT.audio.vibrate();
        showStep(2);
        renderQuestions();
      }, { once: true });
    }

    // 步骤三：进入结界按钮
    const enterBtn = document.getElementById('onboard-enter-btn');
    if (enterBtn) {
      enterBtn.addEventListener('click', () => {
        DT.state.initialized = true;
        DT.save();
        overlay.classList.add('hidden');
        DT.showMain();
      }, { once: true });
    }
  }

  /* ============================================================
     步骤切换
     ============================================================ */
  function showStep(num) {
    document.querySelectorAll('.onboard-step').forEach(s => {
      s.classList.remove('active');
    });
    const step = document.getElementById(`onboard-step-${num}`);
    if (step) step.classList.add('active');
  }

  /* ============================================================
     渲染问卷
     ============================================================ */
  function renderQuestions() {
    const container = document.getElementById('onboard-questions');
    if (!container) return;

    container.innerHTML = '';
    answers = {};

    QUESTIONS.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'question-card';
      card.innerHTML = `
        <p class="question-title">${idx + 1}. ${q.q}</p>
        <div class="question-options" data-q="${idx}"></div>
      `;

      const optContainer = card.querySelector('.question-options');
      q.options.forEach((opt, optIdx) => {
        const btn = document.createElement('button');
        btn.className = 'question-opt';
        btn.textContent = opt.text;
        btn.addEventListener('click', () => {
          // 选中效果
          optContainer.querySelectorAll('.question-opt').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          answers[idx] = opt.score;

          // 音效
          if (DT.audio && DT.audio.playTick) DT.audio.playTick();

          // 检查是否全部回答完毕
          if (Object.keys(answers).length === QUESTIONS.length) {
            setTimeout(() => {
              const constitution = calculateConstitution();
              revealPet(constitution);
            }, 500);
          }
        });
        optContainer.appendChild(btn);
      });

      container.appendChild(card);
    });
  }

  /* ============================================================
     计算体质
     ============================================================ */
  function calculateConstitution() {
    const scores = {};
    Object.values(answers).forEach(scoreMap => {
      Object.entries(scoreMap).forEach(([type, val]) => {
        scores[type] = (scores[type] || 0) + val;
      });
    });

    let maxType = '平和质';
    let maxScore = 0;
    Object.entries(scores).forEach(([type, score]) => {
      if (score > maxScore) {
        maxScore = score;
        maxType = type;
      }
    });

    return maxType;
  }

  /* ============================================================
     灵宠揭示（步骤三）
     ============================================================ */
  function revealPet(constitution) {
    const pet = DT.pet ? DT.pet.getPetData(constitution) : null;
    if (!pet) {
      showStep(3);
      return;
    }

    // 保存到状态
    DT.state.constitution = constitution;
    DT.state.petName = pet.name;
    DT.state.petElement = pet.element;
    DT.state.petColor = pet.color;
    DT.save();

    // 填充 UI
    const img = document.getElementById('pet-reveal-img');
    if (img) img.src = pet.img;

    const name = document.getElementById('pet-reveal-name');
    if (name) name.textContent = pet.name;

    const elem = document.getElementById('pet-reveal-element');
    if (elem) elem.textContent = `${pet.element}属性 · ${pet.beast}`;

    const desc = document.getElementById('pet-reveal-desc');
    if (desc) desc.textContent = pet.desc;

    // 切换到步骤三
    showStep(3);

    // 播放颂钵
    if (DT.audio && DT.audio.playSingingBowl) DT.audio.playSingingBowl();
  }

  /* ============================================================
     2. initRituals() — 初始化微仪式
     ============================================================ */
  let breatheTimer = null;
  let breatheSeconds = 0;
  let mindfulCount = 0;
  let activeRitual = null;

  function initRituals() {
    const options = document.getElementById('ritual-options');
    const active = document.getElementById('ritual-active');
    const stopBtn = document.getElementById('ritual-stop');

    if (!options) return;

    // 仪式选择按钮
    options.querySelectorAll('.ritual-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.ritual;
        startRitual(type);
      });
    });

    // 停止按钮
    if (stopBtn) {
      stopBtn.addEventListener('click', stopRitual);
    }
  }

  function startRitual(type) {
    activeRitual = type;
    const options = document.getElementById('ritual-options');
    const active = document.getElementById('ritual-active');
    if (options) options.style.display = 'none';
    if (active) active.classList.remove('hidden');

    // 隐藏所有视图
    document.querySelectorAll('.ritual-view').forEach(v => v.style.display = 'none');

    switch (type) {
      case 'breathe':
        startBreathe();
        break;
      case 'mindful':
        startMindful();
        break;
      case 'diary':
        startDiary();
        break;
    }
  }

  function stopRitual() {
    if (breatheTimer) { clearInterval(breatheTimer); breatheTimer = null; }
    activeRitual = null;

    const options = document.getElementById('ritual-options');
    const active = document.getElementById('ritual-active');
    if (options) options.style.display = '';
    if (active) active.classList.add('hidden');

    // 呼吸练习完成奖励
    if (breatheSeconds > 30) {
      DT.state.breathSessions = (DT.state.breathSessions || 0) + 1;
      DT.state.rosaryScore = Math.min(100, (DT.state.rosaryScore || 0) + 15);
      if (DT.pet && DT.pet.addRosary) DT.pet.addRosary(15);
      DT.save();
    }

    breatheSeconds = 0;
  }

  /* ── 呼吸练习 ── */
  function startBreathe() {
    const view = document.getElementById('ritual-breathe-view');
    if (view) view.style.display = 'block';

    breatheSeconds = 0;
    const timerEl = view ? view.querySelector('.timer-text') : null;
    const circleText = view ? view.querySelector('.breathe-circle span') : null;

    // 4-7-8 呼吸法
    let phase = 0; // 0=吸 1=屏 2=呼
    const phases = ['吸', '屏', '呼'];
    const durations = [4, 7, 8];
    let phaseCount = 0;

    breatheTimer = setInterval(() => {
      breatheSeconds++;
      if (timerEl) {
        const m = Math.floor(breatheSeconds / 60);
        const s = breatheSeconds % 60;
        timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }

      phaseCount++;
      if (phaseCount >= durations[phase]) {
        phase = (phase + 1) % 3;
        phaseCount = 0;
        if (circleText) circleText.textContent = phases[phase];
      }
    }, 1000);

    // 播放颂钵音效
    if (DT.audio && DT.audio.playSingingBowl) DT.audio.playSingingBowl();
  }

  /* ── 正念盘珠 ── */
  function startMindful() {
    const view = document.getElementById('ritual-mindful-view');
    if (view) view.style.display = 'block';

    mindfulCount = 0;
    const counter = view ? view.querySelector('.mindful-counter') : null;
    const btn = view ? view.querySelector('.mindful-bead-btn') : null;

    if (btn) {
      btn.onclick = () => {
        mindfulCount++;
        if (counter) counter.textContent = mindfulCount;

        // 音效 + 震动
        if (DT.audio && DT.audio.playTick) DT.audio.playTick();
        if (DT.audio && DT.audio.vibrate) DT.audio.vibrate();

        // 更新功德 + 灵宠念珠
        DT.state.meritCount = (DT.state.meritCount || 0) + 1;
        DT.state.rosaryScore = Math.min(100, (DT.state.rosaryScore || 0) + 1);
        if (DT.pet && DT.pet.addRosary) DT.pet.addRosary(1);
        if (DT.social && DT.social.refresh) DT.social.refresh();

        // 弹跳动画
        btn.classList.add('bump');
        setTimeout(() => btn.classList.remove('bump'), 300);

        DT.save();
      };
    }
  }

  /* ── 心语日记 ── */
  function startDiary() {
    const view = document.getElementById('ritual-diary-view');
    if (view) view.style.display = 'block';
  }

  /* ============================================================
     3. triggerSOS() — SOS 紧急安抚
     ============================================================ */
  function triggerSOS() {
    const overlay = document.getElementById('sos-overlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');

    // 播放颂钵
    if (DT.audio && DT.audio.playSingingBowl) DT.audio.playSingingBowl();

    // 灵宠进入紊乱状态
    if (DT.pet && DT.pet.addStress) DT.pet.addStress(20);

    // SOS 文案
    const textEl = document.getElementById('sos-text');
    if (textEl) {
      const texts = [
        '你已安全着陆。深呼吸，感受脚下的大地。\n此刻，没有什么比你的安全更重要。',
        '闭上眼睛，感受空气从鼻尖缓缓流入…\n你是安全的，你是被爱的。',
        '万物皆有裂缝，那是光照进来的地方。\n现在，让光照进你的心里。'
      ];
      textEl.textContent = texts[Math.floor(Math.random() * texts.length)];
    }

    // 水墨画布
    initSosInk();

    // 退出按钮
    const exitBtn = document.getElementById('sos-exit-btn');
    if (exitBtn) {
      exitBtn.onclick = () => {
        overlay.classList.add('hidden');
        // 逐步恢复灵宠
        if (DT.pet && DT.pet.addRosary) DT.pet.addRosary(10);
        if (DT.audio && DT.audio.stopAll) DT.audio.stopAll();
      };
    }
  }

  /* ============================================================
     SOS 水墨动画
     ============================================================ */
  function initSosInk() {
    const canvas = document.getElementById('sos-ink-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2 + (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        r: 2 + Math.random() * 6,
        alpha: 0.1 + Math.random() * 0.3
      });
    }

    let animId = null;
    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= 0.998;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 195, 163, ${p.alpha})`;
        ctx.fill();
      });

      const overlay = document.getElementById('sos-overlay');
      if (overlay && !overlay.classList.contains('hidden')) {
        animId = requestAnimationFrame(draw);
      }
    }

    if (animId) cancelAnimationFrame(animId);
    draw();
  }

  /* ============================================================
     暴露公共 API → DT.ritual
     ============================================================ */
  return {
    showOnboarding,
    initRituals,
    triggerSOS
  };
})();
