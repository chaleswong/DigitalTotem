/* ============================================================
   Digital Totem v2.0 — 灵宠系统核心引擎 (Spirit Pet Engine)
   ============================================================
   职责：
   - 灵宠状态向量 S = [f_stress, f_humidity, f_rosary] 维护
   - 基于五行体质的灵宠形态渲染（Lottie + CSS 降级方案）
   - 触摸交互：涟漪画布特效 + 弹性缩放
   - 上下文感知独白循环（时辰 / 压力 / 念珠计数）
   - 负反馈衰减机制（连续高压 + 低互动 → 灵宠枯萎）
   ============================================================ */
window.DT = window.DT || {};

window.DT.pet = (() => {
  'use strict';

  /* ============================================================
     灵宠基础数据 — 五行 × 体质映射
     ============================================================ */
  const PET_DATA = {
    '气郁质': { name: '疏影墨灵', element: '木', beast: '青龙', color: '#5A8F6E', img: 'img/pet_wood.png', desc: '温柔治愈小龙宝，以木之生发疏通你的肝气郁结' },
    '阴虚质': { name: '炽焰玉灵', element: '火', beast: '朱雀', color: '#C25B56', img: 'img/pet_fire.png', desc: '元气暖心小凤凰，以火之温暖滋养你的虚损阴液' },
    '气虚质': { name: '厚德坤灵', element: '土', beast: '麒麟', color: '#B38B6D', img: 'img/pet_earth.png', desc: '憨厚呆萌小麒麟，以土之厚重承载你的气力不足' },
    '平和质': { name: '清啸霜灵', element: '金', beast: '白虎', color: '#A8A8A8', img: 'img/pet_metal.png', desc: '傲娇优雅小白虎，以金之清明守护你的阴阳调和' },
    '湿热质': { name: '沉渊玄灵', element: '水', beast: '玄武', color: '#5B7B8A', img: 'img/pet_water.png', desc: '佛系慵懒小玄武，以水之润下化解你的体内湿热' }
  };

  /* ============================================================
     Lottie 动画 URL — 三态形态
     normal : 常态呼吸光环
     zen    : 禅定金光涟漪
     chaos  : 紊乱红色脉动
     ============================================================ */
  const LOTTIE_URLS = {
    normal: 'https://assets2.lottiefiles.com/packages/lf20_w51p7g0f.json',
    zen:    'https://assets5.lottiefiles.com/packages/lf20_gbfwt9pd.json',
    chaos:  'https://assets7.lottiefiles.com/packages/lf20_0y9v8scv.json'
  };

  /* ============================================================
     状态向量 S = [f_stress, f_humidity, f_rosary]
     ============================================================ */
  let stateVector = {
    f_stress:   0,   // 压力指数 0-100（来自 DT.state.stressScore、深夜使用、负面聊天）
    f_humidity:  0,   // 湿度指数 0-100（来自 DT.state.weatherHumid）
    f_rosary:    0    // 念珠指数 0-100（来自功德计数 + 呼吸练习，随时间衰减）
  };

  /* 当前灵宠形态 */
  let currentMode  = 'normal';  // 'normal' | 'zen' | 'chaos'
  let currentPet   = null;      // 当前灵宠数据引用
  let lottieAnim   = null;      // Lottie 动画实例
  let monologueTimer  = null;   // 独白循环定时器
  let stateInterval   = null;   // 状态刷新定时器
  let monologueClearTimer = null; // 独白自动清除定时器

  /* ============================================================
     独白文案库 — 按上下文分类
     ============================================================ */
  const MONOLOGUES = {
    morning_low:  [
      '晨光初照，气机清朗，今日宜舒展。',
      '清晨的露珠最养人，主子也该好好伸个懒腰。',
      '朝阳东升，木气生发。今天会是好日子。'
    ],
    morning_high: [
      '又是崭新的一天…主子，先深呼吸三次再说。',
      '晨起气机尚未舒展，别急，先喝杯温水。'
    ],
    night_low: [
      '夜色真美，适合静静待着。',
      '月上柳梢，此刻最宜养心。'
    ],
    night_high: [
      '夜深了，主子还不歇息么…',
      '子时已过，肝胆当令。主子该放下手机了。',
      '夜半气机收敛，硬撑着对身体不好…'
    ],
    rosary_high: [
      '嗯…被抚摸的感觉真好，通体舒畅。',
      '念珠温润，气机流转。继续，继续。',
      '主子的手好暖，我感受到了安宁。'
    ],
    stress_high: [
      '主子，你的气机有些紊乱，来盘珠静心吧。',
      '感觉到一股浊气…主子，要不要做个深呼吸？',
      '气机不畅，肝木郁结。摸摸我，我帮你疏通。'
    ],
    zen_state: [
      '此刻真好，就这样静静待着。',
      '禅定之中，万物皆宁。',
      '通体金光微漾…这是主子的安宁在反哺于我。'
    ],
    idle: [
      '主子在做什么呢？我有点无聊…',
      '轻轻摸我一下嘛…',
      '风轻云淡，时光正好。',
      '打个哈欠~'
    ]
  };

  /* ============================================================
     1. init() — 初始化灵宠系统
     ============================================================
     流程：
     ① 从 DT.state.constitution 加载体质对应灵宠
     ② 设置灵宠图片、名称、元素显示
     ③ 设置 CSS 自定义属性 --pet-color
     ④ 初始化 Lottie 动画
     ⑤ 启动独白循环 & 状态刷新定时器
     ============================================================ */
  function init() {
    const constitution = (DT.state && DT.state.constitution) || '平和质';
    currentPet = PET_DATA[constitution] || PET_DATA['平和质'];

    // — 设置灵宠静态图片 —
    const petImg = document.getElementById('pet-static-img');
    if (petImg) {
      petImg.src = currentPet.img;
      petImg.alt = currentPet.name;
    }

    // — 设置灵宠名称 & 元素显示 —
    const nameEl = document.getElementById('pet-name-display');
    if (nameEl) nameEl.textContent = currentPet.name;

    const elemEl = document.getElementById('pet-element-display');
    if (elemEl) elemEl.textContent = `${currentPet.element}行 · ${currentPet.beast}`;

    // — 设置 CSS 自定义属性 --pet-color —
    const stage = document.getElementById('pet-stage');
    if (stage) {
      stage.style.setProperty('--pet-color', currentPet.color);
    }

    // — 初始化状态向量（从全局状态同步） —
    syncStateVector();

    // — 初始化 Lottie 动画 —
    initLottie('normal');

    // — 启动独白循环 —
    startMonologueCycle();

    // — 每 30 秒刷新一次状态向量 & 形态 —
    stateInterval = setInterval(() => {
      syncStateVector();
      updateMorph();
    }, 30000);

    // — 初始化触摸交互 —
    initTouchInteraction();

    console.log(`[灵宠系统] 初始化完成：${currentPet.name}（${currentPet.element}行）`);
  }

  /* ============================================================
     Lottie 初始化 / 切换
     ============================================================
     LottieFiles CDN 已不可用(403)，直接使用增强 CSS 动画方案
     支持三态：normal / zen / chaos
     ============================================================ */
  function initLottie(mode) {
    const container = document.getElementById('lottie-container');
    if (!container) return;

    // — 销毁旧动画 —
    if (lottieAnim) {
      try { lottieAnim.destroy(); } catch (e) { /* 忽略 */ }
      lottieAnim = null;
    }

    // — 直接使用 CSS 动画（不依赖外部 Lottie CDN）—
    createCSSAnimation(container, mode);
  }

  /* ============================================================
     CSS 动画系统 — 三态灵宠气场
     ============================================================
     normal : 舒缓呼吸光晕 + 缓慢色相旋转
     zen    : 金色涟漪扩散 + 柔和脉动
     chaos  : 快速闪烁 + 不规则颤动
     ============================================================ */
  function createCSSAnimation(container, mode = 'normal') {
    container.innerHTML = '';
    const petColor = currentPet ? currentPet.color : '#A8A8A8';

    // 核心光晕层
    const core = document.createElement('div');
    core.className = `pet-aura pet-aura-${mode}`;

    // 粒子轨道层
    const orbit = document.createElement('div');
    orbit.className = 'pet-orbit';

    // 根据模式设置 5 个光点粒子
    for (let i = 0; i < 5; i++) {
      const dot = document.createElement('span');
      dot.className = 'pet-particle';
      dot.style.animationDelay = `${i * 1.2}s`;
      dot.style.opacity = String(0.3 + Math.random() * 0.5);
      orbit.appendChild(dot);
    }

    container.appendChild(core);
    container.appendChild(orbit);

    // — 注入样式（仅首次） —
    if (!document.getElementById('pet-css-aura-styles')) {
      const style = document.createElement('style');
      style.id = 'pet-css-aura-styles';
      style.textContent = `
        .pet-aura {
          position: absolute;
          inset: 5%;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 40%,
            ${petColor}66 0%, ${petColor}33 35%, ${petColor}11 65%, transparent 100%);
          transition: all 0.8s ease;
        }
        .pet-aura-normal {
          animation: aura-breathe 5s ease-in-out infinite, aura-hue 25s linear infinite;
        }
        .pet-aura-zen {
          animation: aura-zen 3s ease-in-out infinite, aura-hue 15s linear infinite;
          box-shadow: 0 0 60px ${petColor}44, inset 0 0 40px ${petColor}22;
        }
        .pet-aura-chaos {
          animation: aura-chaos 1.5s ease-in-out infinite;
          filter: saturate(1.5);
        }
        @keyframes aura-breathe {
          0%, 100% { transform: scale(0.88); opacity: 0.6; }
          50%      { transform: scale(1.06); opacity: 0.95; }
        }
        @keyframes aura-zen {
          0%, 100% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 40px ${petColor}33; }
          50%      { transform: scale(1.1); opacity: 1; box-shadow: 0 0 80px ${petColor}55; }
        }
        @keyframes aura-chaos {
          0%, 100% { transform: scale(0.9) rotate(0deg); opacity: 0.5; }
          25%      { transform: scale(1.08) rotate(2deg); opacity: 0.9; }
          50%      { transform: scale(0.85) rotate(-1deg); opacity: 0.4; }
          75%      { transform: scale(1.12) rotate(3deg); opacity: 1; }
        }
        @keyframes aura-hue {
          from { filter: hue-rotate(0deg); }
          to   { filter: hue-rotate(360deg); }
        }
        .pet-orbit {
          position: absolute;
          inset: 0;
          animation: orbit-spin 20s linear infinite;
        }
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .pet-particle {
          position: absolute;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: ${petColor};
          box-shadow: 0 0 8px ${petColor}88;
          animation: particle-float 4s ease-in-out infinite alternate;
        }
        .pet-particle:nth-child(1) { top: 8%; left: 50%; }
        .pet-particle:nth-child(2) { top: 30%; right: 8%; }
        .pet-particle:nth-child(3) { bottom: 10%; right: 25%; }
        .pet-particle:nth-child(4) { bottom: 20%; left: 8%; }
        .pet-particle:nth-child(5) { top: 50%; left: 5%; }
        @keyframes particle-float {
          0%   { transform: translateY(0) scale(1); opacity: 0.3; }
          100% { transform: translateY(-12px) scale(1.5); opacity: 0.8; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /* ============================================================
     状态向量同步 — 从全局 DT.state 拉取数据
     ============================================================ */
  function syncStateVector() {
    if (!DT.state) return;

    // — f_stress: 压力分 + 深夜加成 —
    let stress = DT.state.stressScore || 0;

    // 深夜使用加成（23:00-05:00 +15）
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) {
      stress = Math.min(100, stress + 15);
    }

    stateVector.f_stress = Math.max(0, Math.min(100, stress));

    // — f_humidity: 天气湿度 —
    stateVector.f_humidity = Math.max(0, Math.min(100, DT.state.weatherHumid || 60));

    // — f_rosary: 功德计数 + 呼吸练习，自然衰减 —
    const meritContrib = Math.min(50, (DT.state.meritCount || 0) * 0.5);
    const breathContrib = Math.min(50, (DT.state.breathSessions || 0) * 10);
    let rosary = meritContrib + breathContrib;

    // 随时间衰减：每小时 -2（基于上次访问时间差）
    if (DT.state.lastVisit) {
      const lastDate = new Date(DT.state.lastVisit);
      const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
      rosary = Math.max(0, rosary - hoursSince * 2);
    }

    stateVector.f_rosary = Math.max(0, Math.min(100, rosary));
  }

  /* ============================================================
     2. updateMorph() — 基于状态向量更新灵宠形态
     ============================================================
     PRD 算法：
       if (f_stress > 80)    → chaos 模式（紊乱）
       else if (f_rosary > 49) → zen 模式（禅定）
       else                   → normal 模式（常态）

     每次切换形态时：
     ① 切换 Lottie 动画
     ② 更新 CSS 呼吸速度
     ③ 更新 --pet-color 色调
     ④ 更新情绪文本 & 状态指示灯
     ⑤ 更新能量显示
     ============================================================ */
  function updateMorph() {
    // — 形态判定 —
    let newMode = 'normal';
    if (stateVector.f_stress > 80) {
      newMode = 'chaos';
    } else if (stateVector.f_rosary > 49) {
      newMode = 'zen';
    }

    // — 检查是否需要形态切换 —
    if (newMode !== currentMode) {
      currentMode = newMode;
      // 重新加载 Lottie
      initLottie(currentMode);
    }

    // — 更新 CSS 呼吸动画速度 —
    const stage = document.getElementById('pet-stage');
    if (stage) {
      let breathSpeed, colorTint;
      switch (currentMode) {
        case 'chaos':
          breathSpeed = '0.8s';
          // 红色调叠加
          colorTint = 'rgba(220, 60, 60, 0.3)';
          stage.style.setProperty('--pet-breath-speed', breathSpeed);
          stage.style.setProperty('--pet-glow-color', colorTint);
          break;
        case 'zen':
          breathSpeed = '5s';
          // 金色调叠加
          colorTint = 'rgba(255, 215, 0, 0.25)';
          stage.style.setProperty('--pet-breath-speed', breathSpeed);
          stage.style.setProperty('--pet-glow-color', colorTint);
          break;
        default: // normal
          breathSpeed = '4s';
          colorTint = currentPet ? `${currentPet.color}33` : 'rgba(168,168,168,0.2)';
          stage.style.setProperty('--pet-breath-speed', breathSpeed);
          stage.style.setProperty('--pet-glow-color', colorTint);
      }
    }

    // — 更新 CSS 降级方案的呼吸速度 —
    const fallback = document.querySelector('.lottie-css-fallback');
    if (fallback) {
      const speeds = { chaos: '0.8s', zen: '5s', normal: '4s' };
      fallback.style.animationDuration = `${speeds[currentMode]}, 20s`;
    }

    // — 更新情绪文本 & 状态指示灯 —
    const moodEl = document.getElementById('pet-mood');
    if (moodEl) {
      const moodMap = {
        chaos:  { text: '气机紊乱', dotColor: '#DC3C3C', emoji: '😰' },
        zen:    { text: '禅定安宁', dotColor: '#FFD700', emoji: '😌' },
        normal: { text: '气息平稳', dotColor: '#5A8F6E', emoji: '😊' }
      };
      const mood = moodMap[currentMode];
      moodEl.innerHTML = `<span class="status-dot" style="background:${mood.dotColor}"></span> ${mood.emoji} ${mood.text}`;
    }

    // — 更新能量显示 —
    const energyEl = document.getElementById('pet-energy');
    if (energyEl) {
      const energyPercent = Math.round(
        100 - stateVector.f_stress * 0.5 + stateVector.f_rosary * 0.3
      );
      const clampedEnergy = Math.max(0, Math.min(100, energyPercent));
      energyEl.textContent = `灵力：${clampedEnergy}%`;

      // 能量条颜色
      const energyBar = document.getElementById('pet-energy-bar');
      if (energyBar) {
        energyBar.style.width = `${clampedEnergy}%`;
        energyBar.style.backgroundColor =
          clampedEnergy < 30 ? '#DC3C3C' :
          clampedEnergy < 60 ? '#D4A843' : '#5A8F6E';
      }
    }

    // — 检查负反馈状态 —
    checkNegativeFeedback();
  }

  /* ============================================================
     3. onTouch() — 用户触摸 / 滑动灵宠时调用
     ============================================================
     ① 增加 f_rosary 1-3 点
     ② 在 #ripple-canvas 上创建涟漪特效
     ③ 灵宠图片弹性放大（scale(1.1)，300ms）
     ④ 播放触感音效
     ⑤ 更新独白为开心回应
     ============================================================ */
  function onTouch(event) {
    // — 增加念珠能量 —
    const increment = 1 + Math.floor(Math.random() * 3); // 1-3
    stateVector.f_rosary = Math.min(100, stateVector.f_rosary + increment);

    // — 获取触摸坐标（相对于画布） —
    const canvas = document.getElementById('ripple-canvas');
    if (canvas && event) {
      const rect = canvas.getBoundingClientRect();
      let x, y;
      if (event.touches && event.touches.length > 0) {
        x = event.touches[0].clientX - rect.left;
        y = event.touches[0].clientY - rect.top;
      } else {
        x = (event.clientX || rect.width / 2) - rect.left;
        y = (event.clientY || rect.height / 2) - rect.top;
      }
      triggerRipple(x, y);
    }

    // — 灵宠弹性缩放 —
    const petImg = document.getElementById('pet-static-img');
    if (petImg) {
      petImg.classList.add('touched');
      setTimeout(() => petImg.classList.remove('touched'), 300);
    }

    // — 播放触感音效 —
    if (DT.audio && DT.audio.playTick) {
      DT.audio.playTick();
    }

    // — 更新独白为开心回应 —
    const happyResponses = [
      '嗯…好舒服，继续摸~',
      '通体酥麻，气机流转顺畅了！',
      '主子的手好暖，真想一直被抚摸。',
      '咕噜噜…好幸福的感觉。',
      '谢谢主子~我感到浑身充满了灵力！'
    ];
    const msg = happyResponses[Math.floor(Math.random() * happyResponses.length)];
    setMonologue(msg);

    // — 局部状态更新（不等 30s 间隔） —
    updateMorph();
  }

  /* ============================================================
     4. triggerRipple(x, y) — 画布涟漪特效
     ============================================================
     在 #ripple-canvas 上绘制同心圆向外扩散
     颜色取自 --pet-color，透明度逐渐衰减
     使用 requestAnimationFrame 实现平滑动画
     1 秒后自动清除
     ============================================================ */
  function triggerRipple(x, y) {
    const canvas = document.getElementById('ripple-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // — 确保画布尺寸与 CSS 尺寸同步 —
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    // — 解析灵宠颜色 —
    const petColor = currentPet ? currentPet.color : '#A8A8A8';
    const r = parseInt(petColor.slice(1, 3), 16);
    const g = parseInt(petColor.slice(3, 5), 16);
    const b = parseInt(petColor.slice(5, 7), 16);

    // — 涟漪参数 —
    const maxRadius  = Math.max(rect.width, rect.height) * 0.6;
    const ringCount  = 3;     // 3 层同心圆
    const duration   = 1000;  // 持续 1 秒
    const startTime  = performance.now();

    function drawFrame(timestamp) {
      const elapsed  = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);

      // — 清除画布 —
      ctx.clearRect(0, 0, rect.width, rect.height);

      // — 绘制每层涟漪 —
      for (let i = 0; i < ringCount; i++) {
        const ringDelay  = i * 0.15;  // 每层延迟 15%
        const ringProgress = Math.max(0, Math.min(1, (progress - ringDelay) / (1 - ringDelay)));

        if (ringProgress <= 0) continue;

        const radius  = ringProgress * maxRadius;
        const alpha   = (1 - ringProgress) * 0.6;  // 透明度衰减
        const lineW   = Math.max(1, (1 - ringProgress) * 3);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth   = lineW;
        ctx.stroke();
        ctx.closePath();
      }

      // — 继续动画或清除 —
      if (progress < 1) {
        requestAnimationFrame(drawFrame);
      } else {
        ctx.clearRect(0, 0, rect.width, rect.height);
      }
    }

    requestAnimationFrame(drawFrame);
  }

  /* ============================================================
     5. setMonologue(text) — 更新灵宠浮动文字
     ============================================================
     ① 淡出当前文字
     ② 更换文本内容
     ③ 淡入新文字
     ④ 5 秒后自动清除
     ============================================================ */
  function setMonologue(text) {
    const el = document.getElementById('pet-monologue');
    if (!el) return;

    // — 清除上一个自动清除定时器 —
    if (monologueClearTimer) {
      clearTimeout(monologueClearTimer);
      monologueClearTimer = null;
    }

    // — 淡出 → 更换 → 淡入 —
    el.classList.add('fade-out');

    setTimeout(() => {
      el.textContent = `"${text}"`;
      el.classList.remove('fade-out');
      el.classList.add('fade-in');

      // 移除淡入 class（避免干扰下次动画）
      setTimeout(() => el.classList.remove('fade-in'), 400);
    }, 300);

    // — 5 秒后自动清除 —
    monologueClearTimer = setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => {
        el.textContent = '';
        el.classList.remove('fade-out');
      }, 300);
    }, 5000);
  }

  /* ============================================================
     6. monologueCycle() — 定期灵宠发言
     ============================================================
     每 15-30 秒（随机间隔）播放一句上下文独白
     基于：时辰、压力等级、念珠计数、当前形态
     ============================================================ */
  function startMonologueCycle() {
    // — 清除已有循环 —
    if (monologueTimer) clearTimeout(monologueTimer);

    function cycle() {
      const msg = getContextualMonologue();
      setMonologue(msg);

      // — 下次独白：15-30 秒随机间隔 —
      const nextDelay = 15000 + Math.random() * 15000;
      monologueTimer = setTimeout(cycle, nextDelay);
    }

    // — 首次延迟 5 秒启动 —
    monologueTimer = setTimeout(cycle, 5000);
  }

  /**
   * 根据当前上下文选择独白
   * 优先级：禅定 > 高压 > 念珠 > 时辰 > 闲聊
   */
  function getContextualMonologue() {
    const hour = new Date().getHours();
    const isMorning = hour >= 5 && hour < 12;
    const isNight   = hour >= 22 || hour < 5;

    // — 禅定状态优先 —
    if (currentMode === 'zen') {
      return pickRandom(MONOLOGUES.zen_state);
    }

    // — 高压状态 —
    if (currentMode === 'chaos' || stateVector.f_stress > 70) {
      if (isNight) return pickRandom(MONOLOGUES.night_high);
      return pickRandom(MONOLOGUES.stress_high);
    }

    // — 念珠活跃 —
    if (stateVector.f_rosary > 40) {
      return pickRandom(MONOLOGUES.rosary_high);
    }

    // — 时辰感知 —
    if (isMorning) {
      return pickRandom(
        stateVector.f_stress > 40
          ? MONOLOGUES.morning_high
          : MONOLOGUES.morning_low
      );
    }

    if (isNight) {
      return pickRandom(
        stateVector.f_stress > 40
          ? MONOLOGUES.night_high
          : MONOLOGUES.night_low
      );
    }

    // — 默认闲聊 —
    return pickRandom(MONOLOGUES.idle);
  }

  /* ============================================================
     7. getPetData(constitution) — 获取指定体质的灵宠数据
     ============================================================ */
  function getPetData(constitution) {
    return PET_DATA[constitution] || PET_DATA['平和质'];
  }

  /* ============================================================
     8. setNegativeFeedback() — 负反馈检测与表现
     ============================================================
     触发条件：连续高压天数 ≥ 3 且 f_rosary < 20
     表现：
     ① 灵宠图片添加 'wilted' class（亮度降低、饱和度降低）
     ② 独白变为哀伤文案
     ③ 呼吸动画减速至 8 秒
     ============================================================ */
  function checkNegativeFeedback() {
    const highStressDays = (DT.state && DT.state.consecutiveHighStressDays) || 0;
    const petImg = document.getElementById('pet-static-img');

    if (highStressDays >= 3 && stateVector.f_rosary < 20) {
      // — 进入枯萎状态 —
      if (petImg) petImg.classList.add('wilted');

      setMonologue('主子…好久没有抚摸我了…我的光芒快要散去了…');

      // — 呼吸动画减速至 8 秒 —
      const stage = document.getElementById('pet-stage');
      if (stage) {
        stage.style.setProperty('--pet-breath-speed', '8s');
      }
      const fallback = document.querySelector('.lottie-css-fallback');
      if (fallback) {
        fallback.style.animationDuration = '8s, 30s';
      }
    } else {
      // — 恢复正常 —
      if (petImg) petImg.classList.remove('wilted');
    }
  }

  /* 公开方法，供外部主动调用 */
  function setNegativeFeedback() {
    checkNegativeFeedback();
  }

  /* ============================================================
     触摸交互初始化
     ============================================================
     绑定 #pet-stage 区域的 click / touchstart 事件
     ============================================================ */
  function initTouchInteraction() {
    const stage = document.getElementById('pet-stage');
    if (!stage) return;

    // — 点击事件 —
    stage.addEventListener('click', onTouch);

    // — 触摸事件（移动端） —
    stage.addEventListener('touchstart', (e) => {
      // 阻止重复触发 click
      e.preventDefault();
      onTouch(e);
    }, { passive: false });

    // — 注入触摸弹性动画样式 —
    if (!document.getElementById('pet-touch-styles')) {
      const style = document.createElement('style');
      style.id = 'pet-touch-styles';
      style.textContent = `
        #pet-static-img.touched {
          transform: scale(1.1);
          transition: transform 0.15s ease-out;
        }
        #pet-static-img {
          transition: transform 0.3s ease;
        }
        #pet-static-img.wilted {
          filter: brightness(0.5) saturate(0.3);
          transition: filter 1s ease;
        }
        #pet-monologue {
          transition: opacity 0.3s ease;
        }
        #pet-monologue.fade-out {
          opacity: 0;
        }
        #pet-monologue.fade-in {
          opacity: 1;
        }
        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 4px;
          vertical-align: middle;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /* ============================================================
     工具函数
     ============================================================ */

  /** 从数组中随机选一项 */
  function pickRandom(arr) {
    if (!arr || arr.length === 0) return '…';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* ============================================================
     暴露公共 API → DT.pet
     ============================================================ */
  return {
    init,
    updateMorph,
    onTouch,
    triggerRipple,
    setMonologue,
    getPetData,
    setNegativeFeedback,

    /** 获取当前状态向量（只读副本） */
    getStateVector() {
      return { ...stateVector };
    },

    /** 获取当前形态 */
    getCurrentMode() {
      return currentMode;
    },

    /** 获取当前灵宠数据 */
    getCurrentPet() {
      return currentPet ? { ...currentPet } : null;
    },

    /** 外部注入压力值（如聊天负面情绪） */
    addStress(amount) {
      stateVector.f_stress = Math.min(100, stateVector.f_stress + amount);
      updateMorph();
    },

    /** 外部注入念珠值（如呼吸练习完成） */
    addRosary(amount) {
      stateVector.f_rosary = Math.min(100, stateVector.f_rosary + amount);
      updateMorph();
    },

    /** 销毁灵宠系统（页面卸载时调用） */
    destroy() {
      if (monologueTimer) clearTimeout(monologueTimer);
      if (monologueClearTimer) clearTimeout(monologueClearTimer);
      if (stateInterval) clearInterval(stateInterval);
      if (lottieAnim) {
        try { lottieAnim.destroy(); } catch (e) { /* 忽略 */ }
      }
    }
  };
})();
