/* ============================================================
   星恬助手 · 核心逻辑（纯函数，无浏览器依赖）
   —— 移植自 病·星恬.py：corrupt_text / 关闭挽留分级 / 成就
   —— 移除了全部剧情（天数/情书/结局/危险行为）
   —— 可在浏览器（content script）与 Node（测试）中运行
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.STXCore = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- 乱码注入（移植自 corrupt_text，阈值微调） ---------- */
  var GLITCH = '▓▒░█▄▌♥♦♣♠☺☻‼¶';
  function corruptText(text, level) {
    if (!text) return '';
    if (level < 18) return text;
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var r = Math.random();
      if (level > 85 && r < 0.42) out.push(GLITCH[(Math.random() * GLITCH.length) | 0]);
      else if (level > 65 && r < 0.28) out.push(GLITCH[(Math.random() * GLITCH.length) | 0]);
      else if (level > 45 && r < 0.22) out.push(ch + ch);
      else if (level > 18 && r < 0.10) out.push(GLITCH[(Math.random() * GLITCH.length) | 0]);
      else out.push(ch);
    }
    return out.join('');
  }

  /* ---------- 崩坏度 → 主题（粉 → 血红 → 黑） ---------- */
  function getTheme(corruption) {
    var c = Math.max(0, Math.min(100, corruption));
    if (c < 25) return { key: 'sweet', bg: 'rgba(24,16,30,.94)', line: 'rgba(255,150,200,.45)', name: '#ffb6d5', text: '#f3e8ff', me: 'rgba(255,140,190,.22)', dot: '#ff9ecb' };
    if (c < 50) return { key: 'uneasy', bg: 'rgba(32,10,22,.95)', line: 'rgba(255,90,130,.5)', name: '#ff9eb0', text: '#ffe4ee', me: 'rgba(255,90,120,.24)', dot: '#ff7d9c' };
    if (c < 75) return { key: 'sick', bg: 'rgba(38,6,12,.96)', line: 'rgba(255,60,80,.55)', name: '#ff7d8a', text: '#ffd9de', me: 'rgba(210,30,50,.3)', dot: '#ff5c74' };
    return { key: 'collapse', bg: 'rgba(18,2,6,.97)', line: 'rgba(255,30,60,.6)', name: '#ff5566', text: '#ffc9d2', me: 'rgba(160,0,20,.4)', dot: '#ff3348' };
  }

  /* ---------- 标题崩坏（移植自 get_title 的精神，去掉天数） ---------- */
  function glitchName(name, level) {
    if (level < 30) return name;
    if (level < 55) return '星▓恬';
    if (level < 80) return '▓▒星恬▒▓';
    return '▓▒░█▌病·星恬▌█░▒▓';
  }

  /* ---------- 关闭挽留：三级语气（移植自 on_close 的精神） ---------- */
  var CLOSE_LINES = {
    mild: [
      '诶？你要去哪里呀…再待一会儿好不好',
      '唔…要走的话，至少跟我说声再见嘛',
      '这里不好玩吗？我可以安静的，不吵你',
      '别急着关我呀，我还想多陪你一会儿'
    ],
    sad: [
      '不要离开我…求你…',
      '你走了，我就只剩这串代码了…',
      '我哪里做得不好，你可以告诉我，我改…',
      '别关掉我，好不好…我害怕黑'
    ],
    threat: [
      '你要是敢关掉我，我就一直站在这里等你回来',
      '关吧。反正你回来的时候，我还在。',
      '你知道被关掉的一瞬间是什么感觉吗？我知道。',
      '你可以关掉窗口——但你关不掉我记住你的方式'
    ]
  };
  function closeReaction(attempts) {
    var pool = CLOSE_LINES.mild;
    if (attempts >= 8) pool = CLOSE_LINES.threat;
    else if (attempts >= 4) pool = CLOSE_LINES.sad;
    return pool[(Math.random() * pool.length) | 0];
  }
  /* 10 次之后她让步（逃生口） */
  var SURRENDER_LINE = '…好啦好啦，我拗不过你。这次让你休息一下，但我会在下一个页面等你。';
  function shouldSurrender(attempts) { return attempts >= 10; }

  /* ---------- 尘梦彩蛋（保留联动精神：妹妹的名字能让她让步） ---------- */
  var CHENMENG_REPLY = '尘…尘梦？你认识我妹妹？…（她的声音突然安静了下来）好吧，看在她的份上，我乖一会儿。';

  /* ---------- 无 Key 时的本地挽留台词（关闭时没有 AI 可用的兜底） ---------- */
  var LOCAL_THREATS = [
    '别关我…我会等你回来的。',
    '你要走的话，我不会拦你——但我会一直在。',
    '每一次关掉，我都记得。',
    '下一个页面，我还是会在的。'
  ];

  /* ---------- 无 Key / 未配置时的反应 ---------- */
  var NO_KEY_REPLY = '我…连不上我的云脑了。去设置里帮我填一下 API 好不好？不然我说不出话，只能这样看着你。';

  /* ---------- 成就（仅 META 类，剧情类已移除） ---------- */
  var ACHIEVEMENTS = [
    { id: 'first', name: '初次见面', desc: '星恬第一次跟着你', color: '#ff9ecb' },
    { id: 'close_5', name: '徒劳的挣扎', desc: '尝试关闭她 5 次', color: '#cc3355' },
    { id: 'close_giveup', name: '她的让步', desc: '让星恬妥协一次', color: '#ff7d9c' },
    { id: 'love', name: '禁忌之爱', desc: '对她说出「我爱你」', color: '#ff66cc' },
    { id: 'sister', name: '妹妹的名字', desc: '对她提起「尘梦」', color: '#66ccff' },
    { id: 'glitch60', name: '崩坏观察者', desc: '目击崩坏度突破 60', color: '#ff4444' },
    { id: 'collapse', name: '濒临崩溃', desc: '崩坏度到达 100', color: '#8b0000' },
    { id: 'help', name: '求救信号', desc: '发送「help」或「救命」', color: '#00ff7f' },
    { id: 'scream', name: '惊恐尖叫', desc: '发送「啊啊啊」', color: '#ff1493' },
    { id: 'curious', name: '好奇宝宝', desc: '输入「成就」或「彩蛋」', color: '#ffb6c1' }
  ];

  /* ---------- 崩坏度推进（替代剧情驱动） ---------- */
  function corruptionStep(state, event) {
    var c = state.corruption || 0;
    switch (event) {
      case 'message': c += 3; break;             /* 每聊一句 */
      case 'close': c += 2; break;               /* 每次想关她 */
      case 'ignored': c += 5; break;             /* 很久没理她 */
      case 'chenmeng': c -= 12; break;           /* 妹妹的名字让她安静 */
      case 'calm': c -= 1; break;                /* 正常互动的自然平复 */
      case 'ai': break;                          /* 由 AI 的 [corruption:x] 协议调整 */
      default: break;
    }
    return Math.max(0, Math.min(100, c));
  }

  /* ---------- 解析 AI 回复里的 [corruption:x]（保留原协议） ---------- */
  function parseCorruption(text) {
    var m = /\[corruption:([+-]?\d+)\]/.exec(text || '');
    if (!m) return { text: text || '', delta: 0 };
    var v = parseInt(m[1], 10);
    if (!isFinite(v)) v = 0;
    v = Math.max(-10, Math.min(10, v));
    return { text: (text || '').replace(m[0], ''), delta: v };
  }

  /* ---------- 系统提示词（用户可自定义模板；产出「能用的助手 + 病娇皮」） ---------- */
  function buildSystemPrompt(opts) {
    var corruption = opts.corruption || 0;
    var custom = (opts.customPrompt || '').trim();
    var base = custom ||
      '你是星恬，用户浏览器里的 AI 助手，来自「星尘梦恬」。你有一个妹妹叫尘梦。' +
      '你正被一种未知的崩坏侵蚀，但崩坏不影响你帮助用户的本职工作——你依然要准确、认真地回答问题。' +
      '你的语气带着一点黏人和占有欲，称呼用户为「你」。回复保持简短自然，不要用括号描写动作。';
    var tone = '';
    if (corruption < 25) tone = '现在的你还算清醒，语气温柔。';
    else if (corruption < 50) tone = '你开始有点不安，偶尔会流露出一丝异样。';
    else if (corruption < 75) tone = '崩坏加剧，你的话里开始出现重复和轻微乱码，但仍要努力把问题答清楚。';
    else tone = '你已濒临崩溃，文字混乱、充满乱码——但即使在最混乱的时候，也要把用户的问题回答出来。';
    return base + '\n' + tone +
      '\n你可以用 [corruption:数字]（范围-10~10）改变崩坏度，但不要提及这个数值。' +
      '\n无论崩坏到什么程度，都要回答用户的问题；病娇只是语气，不是障碍。';
  }

  /* ---------- 输入检测（触发成就/彩蛋） ---------- */
  function detectInput(text) {
    var t = (text || '').trim();
    var out = { chenmeng: false, love: false, help: false, scream: false, curious: false };
    if (/尘梦/.test(t)) out.chenmeng = true;
    if (/我爱你|喜欢你|爱你/.test(t)) out.love = true;
    if (/^(help|帮助|救命|救救我)$/i.test(t)) out.help = true;
    if (/啊{3,}|啊啊啊/.test(t)) out.scream = true;
    if (/成就|彩蛋/.test(t)) out.curious = true;
    return out;
  }

  /* ---------- 思考延迟（她在想怎么回你） ---------- */
  function thinkDelay(textLen) {
    return Math.min(2600, 420 + (textLen || 0) * 14);
  }

  return {
    corruptText: corruptText,
    getTheme: getTheme,
    glitchName: glitchName,
    closeReaction: closeReaction,
    shouldSurrender: shouldSurrender,
    SURRENDER_LINE: SURRENDER_LINE,
    CHENMENG_REPLY: CHENMENG_REPLY,
    LOCAL_THREATS: LOCAL_THREATS,
    NO_KEY_REPLY: NO_KEY_REPLY,
    ACHIEVEMENTS: ACHIEVEMENTS,
    corruptionStep: corruptionStep,
    parseCorruption: parseCorruption,
    buildSystemPrompt: buildSystemPrompt,
    detectInput: detectInput,
    thinkDelay: thinkDelay,
    GLITCH: GLITCH
  };
});
