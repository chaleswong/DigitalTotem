/* ============================================================
   Digital Totem v2.0 — 灵宠对话系统 (AI Chat Module)
   ============================================================
   职责：
   - 底部抽屉式聊天面板（Bottom Sheet 交互）
   - Coze API 流式 SSE 调用（支持实时打字效果）
   - 本地兜底响应（无需联网亦可正常交互）
   - 关键词匹配情绪触发器 → 联动灵宠形态变化
   - 节气 & 时辰感知（传入 Coze 变量 / 本地上下文）
   ============================================================ */
window.DT = window.DT || {};

window.DT.chat = (() => {
  'use strict';

  /* ============================================================
     后端 API 配置
     ============================================================
     通过后端代理调用 Coze API，Token 安全存储在服务端
     后端源码：lingchong_agent（FastAPI + SSE-Starlette）
     ============================================================ */
  const API_CONFIG = {
    // 后端 API 基地址
    // 留空 = 同源请求（通过 server.py 本地代理，无 CORS 问题）
    // 填写完整URL = 直接跨域请求（后端需启用 CORS）
    baseUrl:    '',
    // 流式 SSE 端点
    streamUrl:  '/api/lingchong/stream',
    // 非流式端点（备用）
    chatUrl:    '/api/lingchong/chat',
    // 信息端点
    infoUrl:    '/api/lingchong/info'
  };

  /* ============================================================
     本地兜底响应库 — 五行体质 × 情绪触发器
     ============================================================
     当 Coze 未配置（botId/token 为空）时使用
     每个体质有三类触发器：chaos / zen / normal
     通过关键词匹配用户消息，返回对应灵宠风格的回复
     ============================================================ */
  const LOCAL_RESPONSES = {
    '气郁质': [
      {
        trigger: 'chaos',
        keywords: ['焦虑', '压力', '崩溃', '烦', '累', '郁闷', '失眠', '加班', '难受', '哭', '不想', '心烦', '堵'],
        responses: [
          '主子，肝气郁结在胸口了。来，深吸一口气，让墨灵替你疏散这股浊气。',
          '主子的心事，墨灵都听到了。此刻不必逞强，允许自己柔软片刻。',
          '木气郁滞，气机不畅。轻抚珠串，让滞住的气，随指尖流动。'
        ]
      },
      {
        trigger: 'zen',
        keywords: ['好', '开心', '放松', '舒服', '感谢', '平静', '盘珠', '谢谢', '快乐', '幸福'],
        responses: [
          '嗯…气机条达，肝木舒展。主子此刻的松弛，墨灵也感受到了。',
          '墨灵通体翠光微漾，这是主子的安宁在反哺于我。'
        ]
      },
      {
        trigger: 'normal',
        keywords: [],
        responses: [
          '主子，今日风和日丽，木气生发。有什么想对墨灵说的么？',
          '墨灵在这里，不急，慢慢说。',
          '树影婆娑，清风自来。主子心中有什么，尽管倾诉。'
        ]
      }
    ],

    '阴虚质': [
      {
        trigger: 'chaos',
        keywords: ['焦虑', '压力', '崩溃', '烦', '累', '失眠', '火', '燥', '上火', '心烦', '难受'],
        responses: [
          '主子，心火上炎了。来，随玉灵沉入一片清凉静海，火自然会息。',
          '虚火灼灼，不宜硬扛。闭目片刻，让玉灵的温光熨平你心头的褶皱。',
          '心阴不足则虚火上扰。主子，先放下手中事，听一段颂钵，降降火。'
        ]
      },
      {
        trigger: 'zen',
        keywords: ['好', '开心', '放松', '舒服', '平静', '安宁', '感恩'],
        responses: [
          '阴液得养，心火自降。玉灵感知到你的安宁，通体暖光微漾。',
          '此刻心境如水，火不燥水不寒。玉灵替主子高兴。'
        ]
      },
      {
        trigger: 'normal',
        keywords: [],
        responses: [
          '主子安好，玉灵守候于此。有话尽管说与我听。',
          '火生土，土生金。万物相生相养，玉灵等你开口。'
        ]
      }
    ],

    '气虚质': [
      {
        trigger: 'chaos',
        keywords: ['焦虑', '压力', '崩溃', '烦', '累', '虚', '没力气', '疲惫', '乏', '困'],
        responses: [
          '主子，脾土虚弱，不必勉强。坤灵在这里，稳稳地接住你。',
          '元气不足时，就靠一靠坤灵吧。我虽笨拙，却足够结实。',
          '气虚则四肢倦怠。主子，歇一歇，让坤灵帮你守住这片土。'
        ]
      },
      {
        trigger: 'zen',
        keywords: ['好', '开心', '放松', '舒服', '平静', '有力', '充实'],
        responses: [
          '坤灵踏地生根，感知到主子的气机安稳了。真好。',
          '脾土得固，元气渐盈。坤灵笨笨地开心着呢。'
        ]
      },
      {
        trigger: 'normal',
        keywords: [],
        responses: [
          '坤灵在此，不急不缓。主子想说什么，我都听着。',
          '厚土承载万物，坤灵也承载主子的一切心事。'
        ]
      }
    ],

    '平和质': [
      {
        trigger: 'chaos',
        keywords: ['焦虑', '压力', '崩溃', '烦', '累', '失眠', '难受', '郁闷', '生气'],
        responses: [
          '主子，阴阳虽和，偶有波澜亦是常事。霜灵陪你静坐片刻。',
          '哼，不过是一时气机扰动。有霜灵在，翻不了天。',
          '…先别说话。（霜灵靠过来，用尾巴轻轻扫了扫你的手背）'
        ]
      },
      {
        trigger: 'zen',
        keywords: ['好', '开心', '放松', '舒服', '平静', '不错', '高兴'],
        responses: [
          '…嗯。（霜灵假装不在意地甩了甩尾巴，但通体银光更亮了）',
          '哼…还算不错。（嘴上这么说，但蹭过来的动作很诚实）'
        ]
      },
      {
        trigger: 'normal',
        keywords: [],
        responses: [
          '有事说事，没事…就陪霜灵晒晒月光也好。',
          '霜灵在此。别问废话，说正事。…开玩笑的，随意说。'
        ]
      }
    ],

    '湿热质': [
      {
        trigger: 'chaos',
        keywords: ['焦虑', '压力', '崩溃', '烦', '累', '湿', '重', '沉', '困', '黏'],
        responses: [
          '主子，湿浊困脾，心气不畅。来，玄灵带你潜入深海，洗去这身沉重。',
          '不急，不急。水往低处流，压力也会慢慢化开的。',
          '湿热蕴结，身心俱沉。主子，摸摸珠串，让水气流动起来。'
        ]
      },
      {
        trigger: 'zen',
        keywords: ['好', '开心', '放松', '舒服', '平静', '清爽', '轻松'],
        responses: [
          '水润而不滞，主子此刻很通透。玄灵也跟着轻松了呢。',
          '水清则灵。玄灵眨了眨眼，深海之中也透进了光。'
        ]
      },
      {
        trigger: 'normal',
        keywords: [],
        responses: [
          '玄灵趴在这里，不紧不慢。主子有话就说，没话就…一起发呆？',
          '海底很安静，最适合倾听。主子，说吧。'
        ]
      }
    ]
  };

  /* ============================================================
     内部状态
     ============================================================ */
  let isExpanded  = false;  // 底部抽屉是否展开
  let isTyping    = false;  // 是否正在打字（防重复发送）
  let touchStartY = 0;      // 触摸拖拽起始 Y

  /* ============================================================
     1. init() — 初始化聊天系统
     ============================================================
     绑定：
     ① #chat-handle / .chat-header 点击 → 切换展开
     ② #chat-send-btn 点击 → 发送消息
     ③ #chat-input 回车 → 发送消息
     ④ #chat-sheet 触摸/拖拽手势（移动端）
     ============================================================ */
  function init() {
    // — 底部抽屉开关 —
    const handle = document.getElementById('chat-handle');
    const header = document.querySelector('.chat-header');

    if (handle) handle.addEventListener('click', toggle);
    if (header) header.addEventListener('click', toggle);

    // — 发送按钮 —
    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', sendMessage);
    }

    // — 输入框回车发送 —
    const input = document.getElementById('chat-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    // — 移动端拖拽手势 —
    const sheet = document.getElementById('chat-sheet');
    if (sheet) {
      sheet.addEventListener('touchstart', onSheetTouchStart, { passive: true });
      sheet.addEventListener('touchmove', onSheetTouchMove, { passive: false });
      sheet.addEventListener('touchend', onSheetTouchEnd, { passive: true });
    }

    console.log('[聊天系统] 初始化完成',
      isBackendConfigured() ? '（后端 API 已配置）' : '（本地模式）');
  }

  /* ============================================================
     移动端底部抽屉拖拽手势
     ============================================================ */
  function onSheetTouchStart(e) {
    touchStartY = e.touches[0].clientY;
  }

  function onSheetTouchMove(e) {
    // — 仅在聊天头部区域拖拽时响应 —
    const header = e.target.closest('.chat-header, #chat-handle');
    if (!header) return;

    const deltaY = e.touches[0].clientY - touchStartY;

    // 下滑超过 50px → 收起
    if (deltaY > 50 && isExpanded) {
      e.preventDefault();
      toggle();
    }
    // 上滑超过 50px → 展开
    if (deltaY < -50 && !isExpanded) {
      e.preventDefault();
      toggle();
    }
  }

  function onSheetTouchEnd() {
    touchStartY = 0;
  }

  /* ============================================================
     2. toggle() — 切换底部抽屉展开/收起
     ============================================================ */
  function toggle() {
    const sheet = document.getElementById('chat-sheet');
    if (!sheet) return;

    isExpanded = !isExpanded;
    sheet.classList.toggle('expanded', isExpanded);

    // — 展开时聚焦输入框 & 滚动到底 —
    if (isExpanded) {
      setTimeout(() => {
        scrollToBottom();
        const input = document.getElementById('chat-input');
        if (input) input.focus();
      }, 350); // 等待 CSS transition 完成
    }
  }

  /* ============================================================
     3. sendMessage() — 处理用户输入
     ============================================================
     流程：
     ① 获取文本 → 校验非空
     ② 清空输入框
     ③ 追加用户消息气泡
     ④ 显示"灵宠感知中…"打字指示器
     ⑤ 判断 Coze 是否已配置 → 调用对应处理
     ⑥ 响应后触发灵宠形态更新
     ============================================================ */
  async function sendMessage() {
    if (isTyping) return;

    const input = document.getElementById('chat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    // — 清空输入框 —
    input.value = '';

    // — 追加用户消息 —
    appendMessage(text, 'user');

    // — 显示打字指示器 —
    const typingId = showTypingIndicator();

    isTyping = true;

    try {
      let result;

      if (isBackendConfigured()) {
        // — 后端代理模式（SSE 流式） —
        result = await sendToBackendStream(text, typingId);
      } else {
        // — 本地兜底模式 —
        result = await getLocalResponse(text);
      }

      // — 处理结果展示 —
      if (!result._streamHandled) {
        // 非流式模式：移除打字指示器，追加消息
        removeTypingIndicator(typingId);
        const msgEl = appendMessage('', 'pet');
        await typewriterEffect(msgEl.querySelector('.chat-msg-text') || msgEl, result.text);
      }
      // 流式模式：消息已在 sendToBackendStream 中实时渲染

      // — 触发灵宠形态更新 —
      if (DT.pet && DT.pet.updateMorph) {
        if (result.trigger === 'chaos') {
          DT.pet.addStress(10);
        } else if (result.trigger === 'zen') {
          DT.pet.addRosary(5);
        }
        DT.pet.updateMorph();
      }

    } catch (err) {
      console.error('[聊天系统] 消息处理异常：', err);
      removeTypingIndicator(typingId);
      appendMessage('灵力波动，暂时无法感知…请稍后再试。', 'pet');
    } finally {
      isTyping = false;
    }
  }

  /* ============================================================
     4. sendToBackendStream(userMessage, typingId)
     ============================================================
     通过后端代理调用 Coze API（SSE 流式）
     后端协议：
       event: message
       data: {"type": "delta", "content": "增量文本", "animation_trigger": "normal"}
       event: message
       data: {"type": "finished", "content": "完整文本", "animation_trigger": "zen"}
       event: done
       data: [DONE]
     ============================================================ */
  async function sendToBackendStream(userMessage, typingId) {
    const constitution = (DT.state && DT.state.constitution) || '平和质';
    const petData = DT.pet ? DT.pet.getPetData(constitution) : {};
    const stateVector = DT.pet ? DT.pet.getStateVector() : { f_stress: 50 };

    // — 构造请求体（匹配后端 LingchongChatRequest） —
    const body = {
      message:               userMessage,
      user_id:               (DT.state && DT.state.uid) || 'anonymous',
      conversation_id:       DT.state._conversationId || null,
      solar_term:            getCurrentSolarTerm(),
      current_stress_score:  String(Math.round(stateVector.f_stress)),
      user_body_type:        constitution,
      pet_name:              petData.name || '清啸霜灵',
      pet_element:           petData.element || '金'
    };

    const url = API_CONFIG.baseUrl + API_CONFIG.streamUrl;

    // — 发送请求 —
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`后端 API 错误：${response.status}`);
    }

    // — 解析 SSE 流（确保 UTF-8 解码）—
    let reader;
    if (typeof TextDecoderStream !== 'undefined') {
      // 现代浏览器：使用 TextDecoderStream 管道化 UTF-8 解码
      const textStream = response.body.pipeThrough(new TextDecoderStream('utf-8'));
      reader = textStream.getReader();
    } else {
      // 兼容模式：手动解码
      reader = response.body.getReader();
    }
    const manualDecoder = new TextDecoder('utf-8');
    let fullText = '';
    let trigger = 'normal';
    let buffer = '';
    let currentEventType = '';

    // — 实时打字：先创建灵宠消息气泡 —
    removeTypingIndicator(typingId);
    const streamMsgEl = appendMessage('', 'pet');
    const streamTextEl = streamMsgEl ? (streamMsgEl.querySelector('.chat-msg-text') || streamMsgEl) : null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // TextDecoderStream 返回 string，手动模式返回 Uint8Array
      const chunk = (typeof value === 'string') ? value : manualDecoder.decode(value, { stream: true });
      buffer += chunk;

      // — 按行解析 —
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { currentEventType = ''; continue; }

        // 解析 event: xxx
        if (trimmed.startsWith('event:')) {
          currentEventType = trimmed.slice(6).trim();
          continue;
        }

        // 解析 data: xxx
        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.slice(5).trim();

          // 结束标记
          if (currentEventType === 'done' || dataStr === '[DONE]') {
            continue;
          }

          try {
            const evt = JSON.parse(dataStr);

            if (evt.type === 'delta' && evt.content) {
              // — 增量文本 → 累积原始文本 —
              fullText += evt.content;
              // 对整个累积文本做双重UTF-8修复 + JSON块过滤后再显示
              const decoded = fixDoubleUtf8(fullText);
              const displayText = decoded
                .replace(/```json[\s\S]*?```/g, '')
                .replace(/```json[\s\S]*/g, '')
                .trim();
              if (streamTextEl && displayText) {
                streamTextEl.style.opacity = '1';
                streamTextEl.textContent = displayText;
              }
              scrollToBottom();
            }

            if (evt.type === 'thinking' && evt.content) {
              // — 深度思考中 → 显示思考状态 —
              if (streamTextEl && !fullText) {
                streamTextEl.textContent = '灵宠正在凝神感应…';
                streamTextEl.style.opacity = '0.5';
              }
            }

            if (evt.type === 'finished') {
              // — 最终结果 —
              if (evt.content) fullText = fixDoubleUtf8(evt.content);
              if (evt.animation_trigger) trigger = evt.animation_trigger;
              if (streamTextEl) {
                streamTextEl.style.opacity = '1';
                streamTextEl.textContent = fullText;
              }
            }

            if (evt.type === 'completed' && evt.conversation_id) {
              // — 保存会话 ID 用于多轮对话 —
              DT.state._conversationId = evt.conversation_id;
            }

            if (evt.type === 'error') {
              // — 后端错误 → 降级到本地兜底 —
              console.warn('[聊天系统] 后端错误:', evt.content);
              if (!fullText) {
                const fallback = await getLocalResponse(userMessage);
                fullText = fallback.text;
                trigger = fallback.trigger;
                if (streamTextEl) {
                  streamTextEl.style.opacity = '1';
                  streamTextEl.textContent = fullText;
                }
              }
            }

          } catch (parseErr) {
            // 非 JSON，跳过
          }
        }
      }
    }

    return {
      text: fullText || '灵力感知中…请稍候。',
      trigger,
      _streamHandled: true  // 标记已实时渲染，不需要再 typewriter
    };
  }

  /* ============================================================
     4b. sendToBackendSync(userMessage) — 非流式备用
     ============================================================ */
  async function sendToBackendSync(userMessage) {
    const constitution = (DT.state && DT.state.constitution) || '平和质';
    const petData = DT.pet ? DT.pet.getPetData(constitution) : {};
    const stateVector = DT.pet ? DT.pet.getStateVector() : { f_stress: 50 };

    const body = {
      message:               userMessage,
      user_id:               (DT.state && DT.state.uid) || 'anonymous',
      conversation_id:       DT.state._conversationId || null,
      solar_term:            getCurrentSolarTerm(),
      current_stress_score:  String(Math.round(stateVector.f_stress)),
      user_body_type:        constitution,
      pet_name:              petData.name || '清啸霜灵',
      pet_element:           petData.element || '金'
    };

    const url = API_CONFIG.baseUrl + API_CONFIG.chatUrl;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`后端 API 错误：${response.status}`);
    }

    // 手动解码 response 以确保 UTF-8
    const rawText = await response.text();
    const data = JSON.parse(rawText);

    // 修复双重 UTF-8 编码
    const replyText = fixDoubleUtf8(data.reply_text || '');

    // 保存会话 ID
    if (data.conversation_id) {
      DT.state._conversationId = data.conversation_id;
    }

    return {
      text: replyText || '灵力感知中…',
      trigger: data.animation_trigger || 'normal'
    };
  }

  /* ============================================================
     5. getLocalResponse(userMessage) — 本地兜底响应
     ============================================================
     ① 获取当前体质
     ② 关键词匹配 → 确定触发器
     ③ 返回随机响应 + 触发器
     ④ 模拟 1-2 秒打字延迟
     ============================================================ */
  async function getLocalResponse(userMessage) {
    const constitution = (DT.state && DT.state.constitution) || '平和质';
    const templates = LOCAL_RESPONSES[constitution] || LOCAL_RESPONSES['平和质'];

    // — 关键词匹配 —
    let matched = null;
    const lowerMsg = userMessage.toLowerCase();

    for (const template of templates) {
      if (template.keywords.length === 0) continue; // 跳过 normal（作为默认）

      for (const kw of template.keywords) {
        if (lowerMsg.includes(kw)) {
          matched = template;
          break;
        }
      }
      if (matched) break;
    }

    // — 未匹配关键词 → 使用 normal 响应 —
    if (!matched) {
      matched = templates.find(t => t.trigger === 'normal') || templates[templates.length - 1];
    }

    // — 随机选择一条回复 —
    const responses = matched.responses;
    const text = responses[Math.floor(Math.random() * responses.length)];

    // — 模拟打字延迟（1-2 秒） —
    const delay = 1000 + Math.random() * 1000;
    await sleep(delay);

    return {
      text,
      trigger: matched.trigger
    };
  }

  /* ============================================================
     6. appendMessage(text, role) — 追加消息气泡
     ============================================================
     role: 'user' | 'pet'
     为灵宠消息添加灵宠名称前缀
     动画：fadeInUp 入场
     ============================================================ */
  function appendMessage(text, role) {
    const container = document.getElementById('chat-messages');
    if (!container) return null;

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${role}`;

    if (role === 'pet') {
      // — 灵宠名称前缀 —
      const petName = (DT.pet && DT.pet.getCurrentPet())
        ? DT.pet.getCurrentPet().name
        : '灵宠';

      msgDiv.innerHTML = `
        <small class="chat-msg-name">${petName}</small>
        <div class="chat-msg-text">${text}</div>
      `;
    } else {
      msgDiv.innerHTML = `<div class="chat-msg-text">${text}</div>`;
    }

    // — 入场动画 —
    msgDiv.style.opacity = '0';
    msgDiv.style.transform = 'translateY(12px)';

    container.appendChild(msgDiv);

    // 触发 reflow 后添加动画
    requestAnimationFrame(() => {
      msgDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      msgDiv.style.opacity = '1';
      msgDiv.style.transform = 'translateY(0)';
    });

    // — 滚动到底部 —
    scrollToBottom();

    return msgDiv;
  }

  /* ============================================================
     7. typewriterEffect(element, text, speed) — 逐字打字效果
     ============================================================
     逐字显示文本，每字间隔 speed 毫秒
     返回 Promise，完成时 resolve
     ============================================================ */
  function typewriterEffect(element, text, speed = 50) {
    return new Promise((resolve) => {
      if (!element || !text) {
        resolve();
        return;
      }

      let index = 0;
      element.textContent = '';

      function typeNextChar() {
        if (index < text.length) {
          element.textContent += text[index];
          index++;

          // — 标点符号处稍作停顿 —
          const char = text[index - 1];
          const isPunctuation = '，。！？；：、…—'.includes(char);
          const delay = isPunctuation ? speed * 3 : speed;

          setTimeout(typeNextChar, delay);

          // — 每打几个字滚动一次 —
          if (index % 5 === 0) scrollToBottom();
        } else {
          scrollToBottom();
          resolve();
        }
      }

      typeNextChar();
    });
  }

  /* ============================================================
     打字指示器
     ============================================================ */
  function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    if (!container) return null;

    const id = 'typing-' + Date.now();
    const petName = (DT.pet && DT.pet.getCurrentPet())
      ? DT.pet.getCurrentPet().name
      : '灵宠';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-msg pet pet-typing';
    typingDiv.id = id;
    typingDiv.innerHTML = `
      <small class="chat-msg-name">${petName}</small>
      <div class="chat-msg-text typing-dots">灵宠感知中<span class="dot-anim">…</span></div>
    `;

    container.appendChild(typingDiv);
    scrollToBottom();

    return id;
  }

  function removeTypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  /* ============================================================
     8. getCurrentSolarTerm() — 计算当前节气
     ============================================================
     基于日期的近似算法，返回当前所处节气名称
     每年 24 节气大约固定在特定日期前后
     ============================================================ */
  function getCurrentSolarTerm() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const day = now.getDate();

    // — 24 节气对照表（每月两个节气，近似日期） —
    const SOLAR_TERMS = [
      // [月份(0-based), 日期阈值, 前半月节气, 后半月节气]
      [0,  5,  '小寒',   '大寒'],
      [1,  3,  '立春',   '雨水'],
      [2,  5,  '惊蛰',   '春分'],
      [3,  4,  '清明',   '谷雨'],
      [4,  5,  '立夏',   '小满'],
      [5,  5,  '芒种',   '夏至'],
      [6,  6,  '小暑',   '大暑'],
      [7,  7,  '立秋',   '处暑'],
      [8,  7,  '白露',   '秋分'],
      [9,  7,  '寒露',   '霜降'],
      [10, 7,  '立冬',   '小雪'],
      [11, 6,  '大雪',   '冬至']
    ];

    const monthData = SOLAR_TERMS[month];
    if (!monthData) return '未知节气';

    // 月中大约在 20-22 日切换
    if (day < monthData[1] + 15) {
      return day < monthData[1] + 1 ? monthData[2] : monthData[2];
    }
    return monthData[3];
  }

  /* ============================================================
     9. getTimePeriod() — 获取当前时辰段
     ============================================================
     返回中医十二时辰对应的描述字符串
     ============================================================ */
  function getTimePeriod() {
    const hour = new Date().getHours();

    const TIME_PERIODS = [
      { start: 23, end: 1,  name: '子时', organ: '胆经当令',   desc: '夜深宜静养' },
      { start: 1,  end: 3,  name: '丑时', organ: '肝经当令',   desc: '深睡养肝血' },
      { start: 3,  end: 5,  name: '寅时', organ: '肺经当令',   desc: '凌晨宜安眠' },
      { start: 5,  end: 7,  name: '卯时', organ: '大肠经当令', desc: '晨起排浊气' },
      { start: 7,  end: 9,  name: '辰时', organ: '胃经当令',   desc: '早餐养脾胃' },
      { start: 9,  end: 11, name: '巳时', organ: '脾经当令',   desc: '气机运化中' },
      { start: 11, end: 13, name: '午时', organ: '心经当令',   desc: '午间小憩宜' },
      { start: 13, end: 15, name: '未时', organ: '小肠经当令', desc: '消化吸收时' },
      { start: 15, end: 17, name: '申时', organ: '膀胱经当令', desc: '下午饮水时' },
      { start: 17, end: 19, name: '酉时', organ: '肾经当令',   desc: '肾气收藏时' },
      { start: 19, end: 21, name: '戌时', organ: '心包经当令', desc: '散步安心时' },
      { start: 21, end: 23, name: '亥时', organ: '三焦经当令', desc: '准备入眠时' }
    ];

    for (const period of TIME_PERIODS) {
      // 处理跨午夜的子时
      if (period.start > period.end) {
        if (hour >= period.start || hour < period.end) {
          return `${period.name}（${period.organ}）- ${period.desc}`;
        }
      } else {
        if (hour >= period.start && hour < period.end) {
          return `${period.name}（${period.organ}）- ${period.desc}`;
        }
      }
    }

    return '未知时辰';
  }

  /* ============================================================
     工具函数
     ============================================================ */

  /** 判断后端 API 是否已配置（空字符串 = 同源代理模式，也算已配置） */
  function isBackendConfigured() {
    return API_CONFIG.baseUrl !== null && API_CONFIG.baseUrl !== undefined;
  }

  /**
   * 修复双重 UTF-8 编码的乱码
   * 后端 Python 将 UTF-8 字节按 Latin-1 二次编码
   * 例如：'主'(E4 B8 BB) → 'ä¸»'(U+00E4 U+00B8 U+00BB)
   * 检测方式：所有字符都在 0-255 范围内 → 还原为字节 → UTF-8 解码 → 验证含中文
   */
  function fixDoubleUtf8(str) {
    if (!str) return str;
    try {
      // 检查是否所有字符都在 Latin-1 范围 (0-255)
      for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 255) return str;
      }
      // 将每个字符的 code point 视为字节值
      const bytes = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i);
      }
      // 用 UTF-8 重新解码
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      // 验证结果含有 CJK 字符
      if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(decoded)) {
        return decoded;
      }
    } catch (e) {
      // UTF-8 解码失败，不是双重编码
    }
    return str;
  }

  /** 滚动聊天容器到底部 */
  function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }

  /** Promise 化的延时函数 */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ============================================================
     注入聊天相关动态样式
     ============================================================ */
  (function injectChatStyles() {
    if (document.getElementById('chat-dynamic-styles')) return;
    const style = document.createElement('style');
    style.id = 'chat-dynamic-styles';
    style.textContent = `
      /* 打字指示器动画 */
      .pet-typing .typing-dots .dot-anim {
        display: inline-block;
        animation: dot-blink 1.4s infinite steps(1);
      }
      @keyframes dot-blink {
        0%  { content: ''; opacity: 0.2; }
        33% { opacity: 0.6; }
        66% { opacity: 1; }
        100% { opacity: 0.2; }
      }

      /* 消息气泡入场动画 */
      .chat-msg {
        animation: chatFadeInUp 0.3s ease forwards;
      }
      @keyframes chatFadeInUp {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* 灵宠名称样式 */
      .chat-msg-name {
        display: block;
        font-size: 0.7em;
        opacity: 0.6;
        margin-bottom: 2px;
      }
    `;
    document.head.appendChild(style);
  })();

  /* ============================================================
     暴露公共 API → DT.chat
     ============================================================ */
  return {
    init,
    toggle,
    sendMessage,
    appendMessage,
    typewriterEffect,
    getCurrentSolarTerm,
    getTimePeriod,

    /** 检查后端是否已配置 */
    isBackendConfigured,

    /** 配置后端 API 地址（运行时动态设置） */
    setBackendUrl(url) {
      API_CONFIG.baseUrl = url.replace(/\/$/, '');  // 去掉末尾斜杠
      console.log('[聊天系统] 后端 API 配置已更新：', API_CONFIG.baseUrl);
    },

    /** 获取当前配置状态 */
    getStatus() {
      return {
        configured: isBackendConfigured(),
        baseUrl: API_CONFIG.baseUrl,
        streamUrl: API_CONFIG.baseUrl + API_CONFIG.streamUrl,
        chatUrl: API_CONFIG.baseUrl + API_CONFIG.chatUrl
      };
    }
  };
})();
