/* ============================================================
   Digital Totem — Report & Operations Layer (周报 / 节气营销)
   ============================================================ */
window.DT = window.DT || {};

window.DT.report = (() => {
  /* ============================================================
     24 SOLAR TERMS (二十四节气)
     ============================================================ */
  const SOLAR_TERMS_2026 = [
    { name: '小寒', date: '01-05', desc: '天寒地冻，阳气初萌。你的体内阳气正在蓄势，宜早卧晚起，固护元阳。' },
    { name: '大寒', date: '01-20', desc: '寒至极处，阴阳转换。静待春来，今日宜温补脾肾。' },
    { name: '立春', date: '02-04', desc: '春气始至，万物以荣。肝气开始舒发，宜疏解郁结。' },
    { name: '雨水', date: '02-19', desc: '东风解冻，化而为雨。脾土当令，宜健脾祛湿。' },
    { name: '惊蛰', date: '03-06', desc: '春雷始鸣，蛰虫皆动。体内阳气上升，宜舒肝养血。' },
    { name: '春分', date: '03-21', desc: '阴阳各半，昼夜均而寒暑平。你的体内气机正在剧烈交替，宜静养。' },
    { name: '清明', date: '04-05', desc: '天清地明，万物皆显。肝气旺盛之时，宜踏青疏肝。' },
    { name: '谷雨', date: '04-20', desc: '雨生百谷，湿气渐重。脾胃易困，宜祛湿健脾。' },
    { name: '立夏', date: '05-06', desc: '夏气将至，心火始旺。宜养心安神，清淡饮食。' },
    { name: '小满', date: '05-21', desc: '物致于此，小得盈满。湿热渐盛，宜清热利湿。' },
    { name: '芒种', date: '06-06', desc: '有芒之种谷可稼种。暑气渐浓，宜补气养阴。' },
    { name: '夏至', date: '06-21', desc: '日长之至，阳极阴生。心火最旺，宜午休静心。' },
    { name: '小暑', date: '07-07', desc: '暑气初起，温热渐盛。宜清暑益气，不宜过劳。' },
    { name: '大暑', date: '07-23', desc: '热之极也，万物蒸煮。宜避暑养心，饮食以清为主。' },
    { name: '立秋', date: '08-07', desc: '秋气将至，暑去凉来。宜滋阴润肺，收敛阳气。' },
    { name: '处暑', date: '08-23', desc: '暑气终止，秋意渐浓。宜早睡早起，调养肺气。' },
    { name: '白露', date: '09-08', desc: '秋深露白，阴气始重。宜温润养肺，防秋燥。' },
    { name: '秋分', date: '09-23', desc: '阴阳相半，昼夜均等。宜平补气血，保持平和。' },
    { name: '寒露', date: '10-08', desc: '寒气凝露，深秋将至。宜温阳散寒，保暖防凉。' },
    { name: '霜降', date: '10-23', desc: '霜降百草，秋之终章。宜补益肝肾，防寒保暖。' },
    { name: '立冬', date: '11-07', desc: '冬气始至，万物收藏。宜进补收藏，早睡养阳。' },
    { name: '小雪', date: '11-22', desc: '天降小雪，地气上腾。宜温补肾阳，避寒就温。' },
    { name: '大雪', date: '12-07', desc: '大雪纷飞，天地闭藏。宜藏精固本，静养身心。' },
    { name: '冬至', date: '12-22', desc: '阴极之至，阳气始生。最宜进补，一阳来复。' }
  ];

  /* --- Check if today is a solar term --- */
  function checkSolarTerm() {
    const now = new Date();
    const mmdd = `${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;

    const term = SOLAR_TERMS_2026.find(t => t.date === mmdd);
    if (!term) return;

    // Don't show again if already dismissed today
    const dismissed = localStorage.getItem('dt_solar_dismissed');
    if (dismissed === mmdd) return;

    showSolarTermPopup(term);
  }

  function showSolarTermPopup(term) {
    document.getElementById('solar-title').textContent = `今日${term.name}`;
    document.getElementById('solar-desc').textContent = term.desc;

    // Product card
    const products = [
      { name: `${term.name}限定·疗愈香囊`, price: '¥ 68', emoji: '🌿' },
      { name: `${term.name}限定·养生花茶`, price: '¥ 42', emoji: '🍵' }
    ];
    const product = products[Math.floor(Math.random() * products.length)];

    let countdown = 3600; // 1 hour countdown
    document.getElementById('solar-product').innerHTML = `
      <div class="solar-product-name">${product.emoji} ${product.name}</div>
      <div class="solar-product-price">${product.price}</div>
      <div class="solar-countdown" id="solar-cd">限时抢购 · 倒计时 1:00:00</div>
    `;

    const cdInterval = setInterval(() => {
      countdown--;
      if (countdown <= 0) { clearInterval(cdInterval); return; }
      const h = Math.floor(countdown / 3600);
      const m = Math.floor((countdown % 3600) / 60);
      const s = countdown % 60;
      const cdEl = document.getElementById('solar-cd');
      if (cdEl) cdEl.textContent = `限时抢购 · 倒计时 ${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }, 1000);

    document.getElementById('solar-overlay').classList.remove('hidden');

    document.getElementById('solar-close-btn').addEventListener('click', () => {
      document.getElementById('solar-overlay').classList.add('hidden');
      clearInterval(cdInterval);
      const now = new Date();
      localStorage.setItem('dt_solar_dismissed',
        `${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`);
    }, { once: true });
  }

  /* ============================================================
     WEEKLY REPORT (心身体度周报)
     ============================================================ */
  let reportChart = null;

  function initWeeklyReport() {
    renderReportChart();
    renderAISummary();
    renderProductRecommendations();
  }

  function renderReportChart() {
    const container = document.getElementById('report-chart');
    if (!container || typeof echarts === 'undefined') return;

    if (reportChart) reportChart.dispose();
    reportChart = echarts.init(container);

    const weeklyTaps = DT.state.weeklyTaps || [3, 5, 2, 8, 4, 6, 1];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(`${d.getMonth()+1}/${d.getDate()}`);
    }

    // v2.0: Always dark theme
    const option = {
      grid: { top: 30, right: 20, bottom: 30, left: 40 },
      xAxis: {
        type: 'category',
        data: days,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: 'rgba(232,224,212,0.5)', fontSize: 11, fontFamily: 'Noto Serif SC, serif' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: 'rgba(232,224,212,0.5)', fontSize: 11 }
      },
      series: [{
        data: weeklyTaps,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#D4C3A3', width: 3 },
        itemStyle: { color: '#D4C3A3' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(212,195,163,0.25)' },
              { offset: 1, color: 'rgba(212,195,163,0)' }
            ]
          }
        }
      }]
    };
    reportChart.setOption(option);
    window.addEventListener('resize', () => reportChart && reportChart.resize());
  }

  function renderAISummary() {
    const taps = DT.state.weeklyTaps || [3, 5, 2, 8, 4, 6, 1];
    const totalTaps = taps.reduce((a, b) => a + b, 0);
    const maxDay = taps.indexOf(Math.max(...taps));
    const dayNames = ['周日','周一','周二','周三','周四','周五','周六'];
    const today = new Date().getDay();
    const maxDayName = dayNames[(today - 6 + maxDay + 7) % 7];

    const constitution = DT.state.constitution || '平和质';
    let summary = '';

    if (totalTaps > 30) {
      summary = `本周你共触碰手串${totalTaps}次，频率较高，${maxDayName}是你最焦虑的一天。`;
    } else if (totalTaps > 15) {
      summary = `本周你共触碰手串${totalTaps}次，节奏尚可，${maxDayName}触碰最多。`;
    } else {
      summary = `本周你共触碰手串${totalTaps}次，整体较为平和。`;
    }

    if (constitution === '气郁质') {
      summary += '结合你气郁质的体质特点，建议本周重点关注肝气疏泄，多做舒展运动，睡前避免高强度思考。';
    } else if (constitution === '湿热质') {
      summary += '你的湿热质需注意饮食清淡，避免辛辣油腻。建议每日饮用薏米红豆水，助力排湿清热。';
    } else if (constitution === '阴虚质') {
      summary += '阴虚体质者易生虚火，建议充足睡眠，减少熬夜，适当食用银耳百合汤滋阴。';
    } else {
      summary += '继续保持当前的调理节奏，坚持每日微仪式，让松弛感成为生活常态。';
    }

    const el = document.getElementById('report-ai-text');
    if (el) el.textContent = summary;
  }

  function renderProductRecommendations() {
    const constitution = DT.state.constitution || '平和质';
    let products = [];

    if (constitution === '气郁质') {
      products = [
        { emoji: '🌹', name: '玫瑰舒缓精油', desc: '疏肝理气，芳香解郁', price: '¥89' },
        { emoji: '🍃', name: '佛手陈皮茶', desc: '理气和中，舒缓压力', price: '¥45' }
      ];
    } else if (constitution === '湿热质') {
      products = [
        { emoji: '🫘', name: '薏仁红豆粉', desc: '健脾祛湿，清热利水', price: '¥52' },
        { emoji: '🧴', name: '茶树净化喷雾', desc: '清爽控油，平衡湿热', price: '¥68' }
      ];
    } else if (constitution === '阴虚质') {
      products = [
        { emoji: '🍯', name: '酸枣仁百合膏', desc: '滋阴安神，改善睡眠', price: '¥128' },
        { emoji: '🌸', name: '玫瑰舒缓精油', desc: '芳香宁神，缓解焦虑', price: '¥89' }
      ];
    } else {
      products = [
        { emoji: '🍵', name: '四季养生茶礼盒', desc: '顺应时令，全年调养', price: '¥168' },
        { emoji: '📿', name: '限定版檀香手串', desc: '沉香木质，静心安神', price: '¥299' }
      ];
    }

    const container = document.getElementById('report-products');
    if (!container) return;
    container.innerHTML = `
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;">AI 精准推荐 · 两件打包立减20元</p>
      ${products.map(p => `
        <div class="product-card">
          <div class="product-img">${p.emoji}</div>
          <div class="product-info">
            <div class="product-name">${p.name}</div>
            <div class="product-desc">${p.desc}</div>
          </div>
          <div class="product-price">${p.price}</div>
        </div>
      `).join('')}
      <button class="btn-primary" style="width:100%;margin-top:10px;">一键混合下单</button>
    `;
  }

  return {
    checkSolarTerm,
    initWeeklyReport
  };
})();
