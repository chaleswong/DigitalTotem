/* ============================================================
   Digital Totem — Daily Touchpoints (气机运势 / 祝由舱 / 情志方)
   ============================================================ */
window.DT = window.DT || {};

window.DT.daily = (() => {

  /* ============================================================
     CHINESE CALENDAR (干支 / 节气)
     ============================================================ */
  const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const EARTHLY_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const FIVE_ELEMENTS_MAP = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火',
    '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'
  };
  const LUNAR_MONTHS = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
  const LUNAR_DAYS = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];

  /* Simple Gan-Zhi day calculation */
  function getGanZhiDay(date) {
    const base = new Date(2000, 0, 7); // Known 庚午日
    const diff = Math.floor((date - base) / 86400000);
    const ganIdx = ((diff % 10) + 6) % 10;
    const zhiIdx = ((diff % 12) + 6) % 12;
    return {
      stem: HEAVENLY_STEMS[ganIdx],
      branch: EARTHLY_BRANCHES[zhiIdx],
      element: FIVE_ELEMENTS_MAP[HEAVENLY_STEMS[ganIdx]],
      text: HEAVENLY_STEMS[ganIdx] + EARTHLY_BRANCHES[zhiIdx] + '日'
    };
  }

  function getApproxLunarDate(date) {
    // Approximate lunar date (simplified)
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
    const lunarMonth = Math.floor((dayOfYear + 10) / 30) % 12;
    const lunarDay = (dayOfYear + 10) % 30;
    return LUNAR_MONTHS[lunarMonth] + ' ' + LUNAR_DAYS[Math.min(lunarDay, 29)];
  }

  /* ============================================================
     QI-FLUX (气机运势)
     ============================================================ */
  const ELEMENT_COLORS = {
    '木': '#4A5D4E', '火': '#C25B56', '土': '#B38B6D', '金': '#A8A8A8', '水': '#5B7B8A'
  };

  const QI_TEMPLATES = [
    {
      condition: (el, temp, humid) => el === '木' && humid > 70,
      text: '今日{ganzhi}，风木旺盛，加之外部湿度{humid}%，你体内脾土受克，易感困重、情绪虚浮。',
      clothing: '宜棉麻宽衣，避免束缚肝气，色选淡绿或米白。',
      food: '少酸加甘，宜茯苓煮水、山药粥，忌辛辣刺激。',
      emotion: '今日宜糊涂，不宜复盘KPI，允许自己慢一拍。'
    },
    {
      condition: (el, temp, humid) => el === '火' && temp > 30,
      text: '今日{ganzhi}，火气炎上，外部温度{temp}°C，心火易亢。',
      clothing: '选择透气真丝或冰丝面料，色选月白或浅蓝。',
      food: '宜莲子心茶、绿豆汤，少食煎炸与咖啡。',
      emotion: '心静自然凉，找一个安静的角落，闭目养神五分钟。'
    },
    {
      condition: (el, temp, humid) => el === '水' && temp < 10,
      text: '今日{ganzhi}，水寒凝滞，外部温度仅{temp}°C，肾气需固。',
      clothing: '注意腰腹保暖，厚袜护踝，艾绒暖贴贴于涌泉穴。',
      food: '宜姜枣茶、桂圆红枣粥，温补脾肾。',
      emotion: '天寒人自暖，给自己一个拥抱，不必逞强。'
    },
    {
      condition: (el, temp, humid) => el === '金',
      text: '今日{ganzhi}，金气肃降，秋燥之意渐浓，肺气宜润。',
      clothing: '丝巾护颈，避风寒入肺，色选暖杏或藕荷。',
      food: '宜梨汤润肺、蜂蜜水养阴，忌寒凉生冷。',
      emotion: '今日宜收敛锋芒，少说多听，以柔克刚。'
    },
    {
      condition: () => true, // default
      text: '今日{ganzhi}，气机平和，阴阳调顺。外部温度{temp}°C，湿度{humid}%。',
      clothing: '顺应天时，穿着舒适自然即可。',
      food: '饮食清淡，荤素搭配，忌暴饮暴食。',
      emotion: '保持松弛，顺其自然，做令自己舒心之事。'
    }
  ];

  let radarChart = null;

  function initQiFlux() {
    const now = new Date();
    const ganzhi = getGanZhiDay(now);
    const temp = DT.state.weatherTemp || 25;
    const humid = DT.state.weatherHumid || 60;

    // Set dates
    const solarEl = document.getElementById('solar-date');
    if (solarEl) solarEl.textContent = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;
    const lunarEl = document.getElementById('lunar-date');
    if (lunarEl) lunarEl.textContent = getApproxLunarDate(now);

    // Find matching template
    const tpl = QI_TEMPLATES.find(t => t.condition(ganzhi.element, temp, humid));
    const fillText = (s) => s.replace('{ganzhi}', ganzhi.text)
                              .replace('{temp}', temp)
                              .replace('{humid}', humid);

    const qiText = document.getElementById('qi-text');
    if (qiText) qiText.textContent = fillText(tpl.text);

    // Advice cards — query child .advice-text
    const clothingEl = document.getElementById('advice-clothing');
    if (clothingEl) {
      const textEl = clothingEl.querySelector('.advice-text');
      if (textEl) textEl.textContent = tpl.clothing;
    }
    const foodEl = document.getElementById('advice-food');
    if (foodEl) {
      const textEl = foodEl.querySelector('.advice-text');
      if (textEl) textEl.textContent = tpl.food;
    }
    const emotionEl = document.getElementById('advice-emotion');
    if (emotionEl) {
      const textEl = emotionEl.querySelector('.advice-text');
      if (textEl) textEl.textContent = tpl.emotion;
    }

    // Greeting
    const hour = now.getHours();
    let greetTime = hour < 6 ? '夜深了' : hour < 12 ? '晨安' : hour < 18 ? '午安' : '晚安';
    const greetEl = document.getElementById('greeting-text');
    if (greetEl) greetEl.textContent = `${greetTime}，顺时调神，欢喜自来`;

    // Update stress for pet
    if (DT.state && DT.pet && DT.pet.updateMorph) {
      // Element-weather interaction affects stress
      let stressAdj = 0;
      if (ganzhi.element === '木' && humid > 70) stressAdj = 10;
      if (ganzhi.element === '火' && temp > 30) stressAdj = 8;
      if (ganzhi.element === '水' && temp < 10) stressAdj = 5;
      DT.state.stressScore = Math.min(100, (DT.state.stressScore || 50) + stressAdj);
    }

    // Radar chart
    renderRadarChart(ganzhi.element, temp, humid);
  }

  function renderRadarChart(element, temp, humid) {
    const container = document.getElementById('radar-chart');
    if (!container || typeof echarts === 'undefined') return;

    if (radarChart) radarChart.dispose();
    radarChart = echarts.init(container);

    // Generate five-element values based on day element and weather
    const base = { '木': 0, '火': 1, '土': 2, '金': 3, '水': 4 };
    const values = [60, 60, 60, 60, 60]; // wood fire earth metal water
    const elIdx = base[element] ?? 0;
    values[elIdx] = 85 + Math.floor(Math.random() * 15);
    values[(elIdx + 2) % 5] = 30 + Math.floor(Math.random() * 20); // 被克
    values[(elIdx + 1) % 5] = 50 + Math.floor(Math.random() * 20);
    values[(elIdx + 3) % 5] = 40 + Math.floor(Math.random() * 20);
    values[(elIdx + 4) % 5] = 55 + Math.floor(Math.random() * 15);

    // Adjust by weather
    if (humid > 70) values[2] = Math.max(20, values[2] - 15);
    if (temp > 30) values[1] = Math.min(100, values[1] + 10);
    if (temp < 10) values[4] = Math.min(100, values[4] + 10);

    // v2.0: Always dark theme
    const option = {
      radar: {
        indicator: [
          { name: '木', max: 100 },
          { name: '火', max: 100 },
          { name: '土', max: 100 },
          { name: '金', max: 100 },
          { name: '水', max: 100 }
        ],
        shape: 'circle',
        splitNumber: 4,
        axisName: {
          color: '#D4C3A3',
          fontSize: 14,
          fontFamily: 'Noto Serif SC, serif'
        },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      series: [{
        type: 'radar',
        data: [{
          value: values,
          name: '五行能量',
          areaStyle: {
            color: {
              type: 'radial', x: 0.5, y: 0.5, r: 0.5,
              colorStops: [
                { offset: 0, color: 'rgba(74,93,78,0.3)' },
                { offset: 1, color: 'rgba(74,93,78,0.05)' }
              ]
            }
          },
          lineStyle: { color: '#4A5D4E', width: 2 },
          itemStyle: { color: '#4A5D4E' },
          symbol: 'circle',
          symbolSize: 6
        }]
      }]
    };
    radarChart.setOption(option);

    window.addEventListener('resize', () => radarChart && radarChart.resize());
  }

  /* ============================================================
     HEALING POD (祝由急救舱)
     ============================================================ */
  let healingTimer = null;
  let healingTotal = 180;
  let healingRemaining = 180;
  let currentTab = 'anxiety';

  function initHealingPod() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        updateHealingLabel();
        resetHealingUI();
      });
    });

    const playBtn = document.getElementById('healing-play');
    const stopBtn = document.getElementById('healing-stop');
    if (playBtn) playBtn.addEventListener('click', startHealing);
    if (stopBtn) stopBtn.addEventListener('click', stopHealing);
  }

  function updateHealingLabel() {
    const label = document.getElementById('healing-label');
    label.textContent = currentTab === 'anxiety'
      ? '角音 · 疏肝古琴 · 432Hz'
      : '羽音 · 安神颂钵 · 432Hz';
  }

  function startHealing() {
    healingRemaining = healingTotal;
    const playBtn = document.getElementById('healing-play');
    const stopBtn = document.getElementById('healing-stop');
    if (playBtn) playBtn.classList.add('hidden');
    if (stopBtn) stopBtn.classList.remove('hidden');

    if (DT.audio) {
      if (currentTab === 'anxiety' && DT.audio.playGuqin) {
        DT.audio.playGuqin(healingTotal);
      } else if (DT.audio.playSingingBowl) {
        DT.audio.playSingingBowl(healingTotal);
      }
    }

    const circumference = 2 * Math.PI * 54;
    const ring = document.querySelector('.ring-progress');
    if (ring) ring.style.strokeDashoffset = '0';

    healingTimer = setInterval(() => {
      healingRemaining--;
      const timeEl = document.getElementById('healing-time');
      if (timeEl) timeEl.textContent = formatTime(healingRemaining);

      const pct = 1 - (healingRemaining / healingTotal);
      if (ring) ring.style.strokeDashoffset = (circumference * pct).toString();

      if (healingRemaining <= 0) stopHealing();
    }, 1000);
  }

  function stopHealing() {
    if (healingTimer) { clearInterval(healingTimer); healingTimer = null; }
    if (DT.audio && DT.audio.stopAll) DT.audio.stopAll();
    resetHealingUI();
  }

  function resetHealingUI() {
    const playBtn = document.getElementById('healing-play');
    const stopBtn = document.getElementById('healing-stop');
    const timeEl = document.getElementById('healing-time');
    const ring = document.querySelector('.ring-progress');
    if (playBtn) playBtn.classList.remove('hidden');
    if (stopBtn) stopBtn.classList.add('hidden');
    if (timeEl) timeEl.textContent = '3:00';
    if (ring) ring.style.strokeDashoffset = '0';
    healingRemaining = healingTotal;
  }

  /* ============================================================
     EMOTIONAL PRESCRIPTION (顺时情志方)
     ============================================================ */
  const PRESCRIPTIONS = [
    {
      title: '《冬至·消寒化结小方》',
      content: '主治：周一无名心火。\n配方：装糊涂三钱、随它去五钱、随身手串盘玩片刻。\n功效：退除内耗，得大自在。'
    },
    {
      title: '《春分·平衡阴阳方》',
      content: '主治：工作日焦虑虚火。\n配方：深呼吸一两、散步半时辰、窗前发呆十分钟。\n功效：阴阳各半，寒暑自平。'
    },
    {
      title: '《惊蛰·舒肝明目饮》',
      content: '主治：久坐肝气郁结。\n配方：起身伸展三次、远眺青山一刻、绿茶一盏。\n功效：疏肝理气，明目清心。'
    },
    {
      title: '《大暑·清心降燥丸》',
      content: '主治：夏日烦躁不安。\n配方：关闭手机半时辰、凉白开一杯、听雨声十分钟。\n功效：心静自然凉，清心除烦。'
    },
    {
      title: '《白露·润肺安神散》',
      content: '主治：秋燥伤肺、情绪低落。\n配方：梨汤一碗、慢跑二十分钟、早睡一时辰。\n功效：润肺生津，安神定志。'
    },
    {
      title: '《小雪·温阳暖心膏》',
      content: '主治：冬日倦怠、能量不足。\n配方：热牛奶一杯、拥抱自己三分钟、写下三件感恩小事。\n功效：温阳散寒，暖心怡情。'
    },
    {
      title: '《谷雨·化湿通络汤》',
      content: '主治：雨季身体困重、思维迟钝。\n配方：赤脚踩地五分钟、拉伸筋骨十分钟、薏米水一碗。\n功效：化湿通络，神清气爽。'
    }
  ];

  function initPrescription() {
    const unlockBtn = document.getElementById('rx-unlock');
    const saveBtn = document.getElementById('rx-save');
    if (unlockBtn) unlockBtn.addEventListener('click', unlockPrescription);
    if (saveBtn) saveBtn.addEventListener('click', savePrescriptionCard);
  }

  function unlockPrescription() {
    const today = new Date().toDateString();
    let rx = DT.state.prescriptionToday;

    if (!rx || DT.state.lastPrescriptionDate !== today) {
      const idx = Math.floor(Math.random() * PRESCRIPTIONS.length);
      rx = PRESCRIPTIONS[idx];
      DT.state.prescriptionToday = rx;
      DT.state.lastPrescriptionDate = today;
      DT.save();
    }

    document.getElementById('rx-title').textContent = rx.title;
    document.getElementById('rx-content').textContent = rx.content;
    const unlockBtn = document.getElementById('rx-unlock');
    const saveBtn = document.getElementById('rx-save');
    if (unlockBtn) unlockBtn.classList.add('hidden');
    if (saveBtn) saveBtn.classList.remove('hidden');

    if (DT.audio && DT.audio.playTick) DT.audio.playTick();
  }

  function savePrescriptionCard() {
    const rx = DT.state.prescriptionToday;
    if (!rx) return;

    const canvas = document.getElementById('prescription-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    // Draw paper background
    ctx.fillStyle = '#FAF5ED';
    ctx.fillRect(0, 0, w, h);

    // Top accent line
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#B38B6D');
    grad.addColorStop(0.5, '#D4C3A3');
    grad.addColorStop(1, '#B38B6D');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 6);

    // Title
    ctx.fillStyle = '#B38B6D';
    ctx.font = '600 28px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('顺时情志方', w / 2, 80);

    // Prescription title
    ctx.fillStyle = '#4A5D4E';
    ctx.font = '700 24px "Noto Serif SC", serif';
    ctx.fillText(rx.title, w / 2, 140);

    // Divider
    ctx.strokeStyle = '#D4C3A3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, 170);
    ctx.lineTo(w * 0.8, 170);
    ctx.stroke();

    // Content
    ctx.fillStyle = '#2C2C2C';
    ctx.font = '400 20px "Noto Serif SC", serif';
    ctx.textAlign = 'left';
    const lines = rx.content.split('\n');
    let y = 220;
    lines.forEach(line => {
      // Word wrap
      const maxW = w - 120;
      let words = line;
      while (words.length > 0) {
        let fit = words;
        while (ctx.measureText(fit).width > maxW && fit.length > 1) {
          fit = fit.substring(0, fit.length - 1);
        }
        ctx.fillText(fit, 60, y);
        words = words.substring(fit.length);
        y += 36;
      }
      y += 10;
    });

    // QR code placeholder (simple pattern)
    const qrX = w / 2 - 50, qrY = h - 200;
    ctx.fillStyle = '#2C2C2C';
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (Math.random() > 0.4 || (i < 2 && j < 2) || (i >= 8 && j < 2) || (i < 2 && j >= 8)) {
          ctx.fillRect(qrX + i * 10, qrY + j * 10, 9, 9);
        }
      }
    }

    // Footer
    ctx.fillStyle = '#999';
    ctx.font = '400 14px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Digital Totem · 新中式心身疗愈智能手串', w / 2, h - 40);

    // Show card overlay
    document.getElementById('card-overlay').classList.remove('hidden');

    // Download
    document.getElementById('card-download-btn').onclick = () => {
      const link = document.createElement('a');
      link.download = '顺时情志方.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    // Close
    document.getElementById('card-close-btn').onclick = () => {
      document.getElementById('card-overlay').classList.add('hidden');
    };
  }

  /* --- Update Qi on weather change --- */
  function onWeatherChange() {
    DT.save();
    initQiFlux();
  }

  /* --- Utility --- */
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  return {
    initQiFlux,
    initHealingPod,
    initPrescription,
    onWeatherChange
  };
})();
