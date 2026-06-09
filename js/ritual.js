/* ============================================================
   Digital Totem — Ritual Layer (认主仪式 / 微仪式 / SOS)
   ============================================================ */
window.DT = window.DT || {};

window.DT.ritual = (() => {
  /* --- Onboarding Questions --- */
  const QUESTIONS = [
    {
      text: '此时此刻，你的气结在哪里？',
      options: [
        { label: '胸口发闷', value: 'chest' },
        { label: '沉在小腹', value: 'belly' },
        { label: '太阳穴胀痛', value: 'temple' },
        { label: '说不清，整个人都紧', value: 'all' }
      ]
    },
    {
      text: '最近一周，你的睡眠质量如何？',
      options: [
        { label: '入睡困难，辗转反侧', value: 'hard_sleep' },
        { label: '多梦易醒', value: 'light_sleep' },
        { label: '还行，偶尔失眠', value: 'ok_sleep' },
        { label: '一沾枕头就着', value: 'good_sleep' }
      ]
    },
    {
      text: '当下你最想要什么？',
      options: [
        { label: '安静地独处片刻', value: 'alone' },
        { label: '有人告诉我"没关系"', value: 'comfort' },
        { label: '痛快地发泄一场', value: 'release' },
        { label: '什么都不想要，就想歇会儿', value: 'rest' }
      ]
    }
  ];

  const CONSTITUTIONS = {
    'chest_hard_sleep': { type: '气郁质', desc: '肝气郁结，情志不舒', color: '#4A5D4E' },
    'belly_light_sleep': { type: '湿热质', desc: '脾湿内蕴，热气缠身', color: '#B38B6D' },
    'temple_hard_sleep': { type: '阴虚质', desc: '阴液亏虚，虚火上炎', color: '#C25B56' },
    'all_ok_sleep': { type: '气虚质', desc: '元气不足，倦怠乏力', color: '#8B9EA8' },
    'default': { type: '平和质', desc: '阴阳调和，气血充盈', color: '#D4C3A3' }
  };

  let currentQuestion = 0;
  let answers = [];

  /* --- Determine constitution from answers --- */
  function getConstitution(ans) {
    const key = (ans[0] || '') + '_' + (ans[1] || '');
    return CONSTITUTIONS[key] || CONSTITUTIONS['default'];
  }

  /* --- Show Onboarding --- */
  function showOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    overlay.classList.remove('hidden');
    currentQuestion = 0;
    answers = [];

    // Step 1: Touch the bead
    document.getElementById('onboard-touch-btn').addEventListener('click', () => {
      DT.audio.vibrate(100);
      DT.audio.playTick();
      goToStep(2);
    }, { once: true });

    // Step 3: Enter
    document.getElementById('onboard-enter-btn').addEventListener('click', () => {
      const constitution = getConstitution(answers);
      DT.state.initialized = true;
      DT.state.constitution = constitution.type;
      DT.state.lastVisit = new Date().toDateString();
      DT.save();

      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('fade-out');
        DT.showMain();
      }, 600);
    }, { once: true });
  }

  function goToStep(step) {
    document.querySelectorAll('.onboard-step').forEach(s => s.classList.remove('active'));
    document.getElementById('onboard-step-' + step).classList.add('active');

    if (step === 2) {
      renderQuestion();
    }
    if (step === 3) {
      const constitution = getConstitution(answers);
      document.getElementById('onboard-result').textContent =
        `你的初始体质: ${constitution.type} — ${constitution.desc}`;
      // AI voice greeting
      setTimeout(() => {
        DT.audio.speak('结界已开，顺时调神，欢喜自来');
      }, 500);
    }
  }

  function renderQuestion() {
    const container = document.getElementById('onboard-questions');
    const q = QUESTIONS[currentQuestion];
    if (!q) { goToStep(3); return; }

    container.innerHTML = `
      <div class="question-card">
        <p>${currentQuestion + 1}/3 · ${q.text}</p>
        <div class="question-options">
          ${q.options.map((o, i) => `
            <label>
              <input type="radio" name="q${currentQuestion}" value="${o.value}">
              ${o.label}
            </label>
          `).join('')}
        </div>
        <button class="btn btn-primary question-next" id="q-next" ${currentQuestion >= QUESTIONS.length ? '' : ''}>
          ${currentQuestion < QUESTIONS.length - 1 ? '下一题' : '完成评估'}
        </button>
      </div>
    `;

    document.getElementById('q-next').addEventListener('click', () => {
      const selected = container.querySelector(`input[name="q${currentQuestion}"]:checked`);
      answers.push(selected ? selected.value : 'default');
      currentQuestion++;
      renderQuestion();
    }, { once: true });
  }

  /* ============================================================
     MICRO-RITUAL SYSTEM
     ============================================================ */
  let ritualTimer = null;
  let breatheInterval = null;

  function initRituals() {
    // Ritual option cards
    document.querySelectorAll('.ritual-card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.ritual;
        startRitual(type);
      });
    });

    // Stop button
    document.getElementById('ritual-stop').addEventListener('click', stopRitual);

    // Mindful tap
    document.getElementById('mindful-tap').addEventListener('click', () => {
      const countEl = document.getElementById('mindful-count');
      let c = parseInt(countEl.textContent) + 1;
      countEl.textContent = c;
      DT.audio.playTick();
      DT.audio.vibrate(30);
    });

    // Diary save
    document.getElementById('diary-save').addEventListener('click', () => {
      const text = document.getElementById('diary-input').value.trim();
      if (text) {
        DT.state.weeklyEmotions = DT.state.weeklyEmotions || [];
        DT.state.weeklyEmotions.push({ text, time: Date.now() });
        DT.save();
        document.getElementById('diary-input').value = '';
        alert('心情已记录 🍃');
      }
    });
  }

  function startRitual(type) {
    document.getElementById('ritual-options').classList.add('hidden');
    document.getElementById('ritual-active').classList.remove('hidden');

    // Hide all views first
    document.querySelectorAll('.ritual-view').forEach(v => v.classList.add('hidden'));

    if (type === 'breathe') {
      document.getElementById('ritual-breathe-view').classList.remove('hidden');
      startBreathing(3 * 60);
      DT.audio.playGuqin(180);
    } else if (type === 'mindful') {
      document.getElementById('ritual-mindful-view').classList.remove('hidden');
      document.getElementById('mindful-count').textContent = '0';
      startTimer('mindful-timer', 5 * 60);
    } else if (type === 'diary') {
      document.getElementById('ritual-diary-view').classList.remove('hidden');
    }
  }

  function stopRitual() {
    if (ritualTimer) { clearInterval(ritualTimer); ritualTimer = null; }
    if (breatheInterval) { clearInterval(breatheInterval); breatheInterval = null; }
    DT.audio.stopAll();

    document.getElementById('ritual-options').classList.remove('hidden');
    document.getElementById('ritual-active').classList.add('hidden');

    const circle = document.getElementById('breathe-circle');
    circle.classList.remove('inhale', 'exhale');

    DT.state.breathSessions = (DT.state.breathSessions || 0) + 1;
    DT.save();
  }

  function startBreathing(totalSeconds) {
    const timerEl = document.getElementById('breathe-timer');
    const circle = document.getElementById('breathe-circle');
    const label = document.getElementById('breathe-label');
    let remaining = totalSeconds;
    let isInhale = true;

    function toggleBreath() {
      isInhale = !isInhale;
      if (isInhale) {
        circle.classList.remove('exhale');
        circle.classList.add('inhale');
        label.textContent = '吸气';
      } else {
        circle.classList.remove('inhale');
        circle.classList.add('exhale');
        label.textContent = '呼气';
      }
      DT.audio.vibrate(30);
    }

    circle.classList.add('inhale');
    label.textContent = '吸气';
    breatheInterval = setInterval(toggleBreath, 4000);

    ritualTimer = setInterval(() => {
      remaining--;
      timerEl.textContent = formatTime(remaining);
      if (remaining <= 0) {
        stopRitual();
      }
    }, 1000);
  }

  function startTimer(elId, totalSeconds) {
    const timerEl = document.getElementById(elId);
    let remaining = totalSeconds;

    ritualTimer = setInterval(() => {
      remaining--;
      timerEl.textContent = formatTime(remaining);
      if (remaining <= 0) {
        stopRitual();
      }
    }, 1000);
  }

  /* ============================================================
     SOS EMERGENCY
     ============================================================ */
  function triggerSOS() {
    const overlay = document.getElementById('sos-overlay');
    overlay.classList.remove('hidden');

    // Ink canvas animation
    const canvas = document.getElementById('sos-ink-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const c = canvas.getContext('2d');
    animateInk(c, canvas.width, canvas.height);

    // Play singing bowl
    DT.audio.playSingingBowl(60);
    DT.audio.vibrate([100, 50, 100]);

    // Breathing circle in SOS
    const circle = document.getElementById('sos-breathe');
    let isInhale = true;
    const sosBreath = setInterval(() => {
      isInhale = !isInhale;
      circle.classList.toggle('inhale', isInhale);
      circle.classList.toggle('exhale', !isInhale);
      circle.querySelector('span').textContent = isInhale ? '吸气' : '呼气';
    }, 4000);
    circle.classList.add('inhale');
    circle.querySelector('span').textContent = '吸气';

    // Exit button
    document.getElementById('sos-exit-btn').addEventListener('click', () => {
      clearInterval(sosBreath);
      DT.audio.stopAll();
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('fade-out');
        circle.classList.remove('inhale', 'exhale');
      }, 600);
    }, { once: true });
  }

  /* --- Ink spread animation on canvas --- */
  function animateInk(ctx, w, h) {
    const drops = [];
    for (let i = 0; i < 8; i++) {
      drops.push({
        x: w * (0.2 + Math.random() * 0.6),
        y: h * (0.2 + Math.random() * 0.6),
        r: 0,
        maxR: Math.max(w, h) * 0.5,
        speed: 1 + Math.random() * 2,
        alpha: 0.6 + Math.random() * 0.3
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(20, 20, 20, 0.3)';
      ctx.fillRect(0, 0, w, h);

      let allDone = true;
      drops.forEach(d => {
        if (d.r < d.maxR) {
          d.r += d.speed;
          allDone = false;
        }
        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        grad.addColorStop(0, `rgba(30, 30, 30, ${d.alpha})`);
        grad.addColorStop(0.5, `rgba(40, 40, 40, ${d.alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(50, 50, 50, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!allDone) requestAnimationFrame(draw);
    }
    draw();
  }

  /* --- Utility --- */
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  return {
    showOnboarding,
    initRituals,
    triggerSOS
  };
})();
