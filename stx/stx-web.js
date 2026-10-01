/* ============================================================
   星恬助手 · 网页版（startian.top 全站跟随）
   —— 与浏览器扩展版共享同一套核心逻辑（core.js）
   —— 差异点：
      · 无 chrome.* API：直连用户自配的 API（fetch）
      · 配置 Key：localStorage（本域）
      · 聊天记录：localStorage（本域）
      · 崩坏度 / 关闭尝试：cookie .startian.top —— 全站子页面共享，
        只要每个页面都引入本脚本，她就"跟着你"（网页版的跟随范围）
   ============================================================ */
(function () {
  'use strict';
  if (window.__STX_WEB_LOADED__) return;
  window.__STX_WEB_LOADED__ = true;
  var Core = window.STXCore;
  if (!Core) { console.warn('[星恬] core.js 未加载'); return; }

  /* ---------- 存储 ---------- */
  var CFG_KEY = 'stx_web_cfg';
  var HIST_KEY = 'stx_web_history';
  var ACH_KEY = 'stx_web_ach';

  function loadJSON(k, fb) {
    try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fb : v; } catch (e) { return fb; }
  }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* .startian.top cookie（跨子域共享） */
  function readCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(m[1])); } catch (e) { return null; }
  }
  function writeCookie(name, obj) {
    try {
      var v = encodeURIComponent(JSON.stringify(obj));
      if (v.length < 3800) document.cookie = name + '=' + v + ';domain=.startian.top;path=/;max-age=31536000;SameSite=Lax';
    } catch (e) {}
  }

  var S = {
    cfg: Object.assign({
      apiBase: 'https://api.deepseek.com/v1', apiKey: '', model: 'deepseek-chat',
      temperature: 0.8, maxTokens: 500, customPrompt: '', metaLevel: 'strong'
    }, loadJSON(CFG_KEY, {})),
    history: loadJSON(HIST_KEY, []),
    state: Object.assign({ corruption: 8, closeAttempts: 0 }, readCookie('stx_state') || {}),
    ach: loadJSON(ACH_KEY, {}),
    open: false, pending: false, view: 'chat',
    escapeArmed: false, moved: false
  };
  function persistState() { writeCookie('stx_state', S.state); }
  function persistHist() {
    if (S.history.length > 60) S.history = S.history.slice(-60);
    saveJSON(HIST_KEY, S.history);
  }

  /* ---------- Shadow 样式（与扩展同款视觉） ---------- */
  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;margin:0;padding:0}',
    '.wrap{position:fixed;z-index:2147482000;font-family:"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;right:18px;bottom:20px;transition:opacity .3s ease}',
    '.wrap.hidden{opacity:0;pointer-events:none}',
    '.ball{width:58px;height:58px;border-radius:50%;cursor:pointer;position:relative;display:flex;align-items:center;justify-content:center;',
    '  background:radial-gradient(circle at 34% 32%,#ffd6ea,#e879b8 52%,#8b3d8f);box-shadow:0 10px 30px rgba(220,80,160,.45),0 0 0 0 rgba(232,121,184,.6);',
    '  transition:transform .22s cubic-bezier(.3,1.4,.5,1),box-shadow .3s ease;animation:stxBreath 3.2s ease-in-out infinite}',
    '.ball:hover{transform:scale(1.08)}',
    '.ball .ch{font-size:24px;color:#fff;text-shadow:0 1px 6px rgba(120,20,80,.6);pointer-events:none;line-height:1}',
    '.ball .dot{position:absolute;right:2px;top:2px;width:12px;height:12px;border-radius:50%;background:#ff5fa2;border:2px solid #fff;display:none}',
    '.ball.hasdot .dot{display:block;animation:stxDot 1.2s ease-in-out infinite}',
    '@keyframes stxBreath{0%,100%{box-shadow:0 10px 30px rgba(220,80,160,.4),0 0 0 0 rgba(232,121,184,.55)}50%{box-shadow:0 10px 34px rgba(220,80,160,.6),0 0 0 12px rgba(232,121,184,0)}}',
    '@keyframes stxDot{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}',
    '.panel{position:absolute;right:0;bottom:70px;width:344px;max-width:calc(100vw - 28px);height:480px;max-height:72vh;border-radius:18px;display:flex;flex-direction:column;overflow:hidden;',
    '  background:var(--stx-bg,rgba(24,16,30,.95));border:1px solid var(--stx-line,rgba(255,150,200,.45));backdrop-filter:blur(16px) saturate(1.25);-webkit-backdrop-filter:blur(16px) saturate(1.25);',
    '  box-shadow:0 26px 70px rgba(0,0,0,.55);transform-origin:bottom right;transition:transform .28s cubic-bezier(.2,.9,.3,1.15),opacity .22s ease;opacity:0;transform:scale(.85) translateY(14px);pointer-events:none}',
    '.panel.open{opacity:1;transform:none;pointer-events:auto}',
    '.head{display:flex;align-items:center;gap:10px;padding:12px 14px 10px;border-bottom:1px solid var(--stx-line,rgba(255,150,200,.28));flex:0 0 auto}',
    '.ava{width:38px;height:38px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:17px;color:#fff;',
    '  background:radial-gradient(circle at 34% 32%,#ffd6ea,#e879b8 55%,#7d3585);box-shadow:0 0 14px rgba(232,121,184,.5);position:relative}',
    '.ava::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:1px solid var(--stx-line,rgba(255,150,200,.4));animation:stxAva 3s ease-in-out infinite}',
    '@keyframes stxAva{0%,100%{opacity:.4;transform:scale(.96)}50%{opacity:1;transform:scale(1.05)}}',
    '.hinfo{flex:1;min-width:0}',
    '.hname{font-size:14px;font-weight:800;color:var(--stx-name,#ffb6d5);letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.hstat{font-size:10.5px;font-weight:700;color:var(--stx-text,#f3e8ff);opacity:.55;margin-top:1px}',
    '.hbtns{display:flex;gap:6px}',
    '.hbtn{width:28px;height:28px;border-radius:9px;border:1px solid var(--stx-line,rgba(255,150,200,.4));background:transparent;color:var(--stx-text,#f3e8ff);',
    '  cursor:pointer;font-size:13px;line-height:1;display:flex;align-items:center;justify-content:center;transition:transform .18s ease,background .2s ease;font-family:inherit}',
    '.hbtn:hover{background:rgba(255,255,255,.08)}',
    '.msgs{flex:1;overflow-y:auto;padding:12px 13px;display:flex;flex-direction:column;gap:9px;scrollbar-width:thin;scrollbar-color:rgba(255,150,200,.3) transparent}',
    '.msgs::-webkit-scrollbar{width:6px}',
    '.msgs::-webkit-scrollbar-thumb{background:rgba(255,150,200,.3);border-radius:99px}',
    '.msg{max-width:86%;padding:9px 12px;border-radius:14px;font-size:12.8px;line-height:1.72;word-break:break-word;white-space:pre-wrap;animation:stxIn .3s ease}',
    '@keyframes stxIn{from{opacity:0;transform:translateY(7px)}}',
    '.msg.a{align-self:flex-start;background:rgba(255,255,255,.07);color:var(--stx-text,#f3e8ff);border:1px solid var(--stx-line,rgba(255,150,200,.25));border-bottom-left-radius:5px}',
    '.msg.u{align-self:flex-end;background:var(--stx-me,rgba(255,140,190,.22));color:var(--stx-text,#f3e8ff);border:1px solid var(--stx-line,rgba(255,150,200,.33));border-bottom-right-radius:5px}',
    '.msg.sys{align-self:center;background:none;border:0;color:var(--stx-text,#f3e8ff);opacity:.45;font-size:11px;padding:2px}',
    '.typing-cursor{display:inline-block;width:7px;height:13px;background:var(--stx-name,#ffb6d5);vertical-align:-2px;animation:stxCaret .8s steps(1) infinite;border-radius:1px}',
    '@keyframes stxCaret{0%,60%{opacity:1}61%,100%{opacity:0}}',
    '.dots{display:inline-flex;gap:4px;padding:3px 2px}',
    '.dots i{width:5px;height:5px;border-radius:50%;background:var(--stx-name,#ffb6d5);animation:stxHop 1.1s ease-in-out infinite}',
    '.dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}',
    '@keyframes stxHop{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}',
    '.inrow{display:flex;gap:8px;padding:10px 12px 12px;border-top:1px solid var(--stx-line,rgba(255,150,200,.28));flex:0 0 auto;align-items:flex-end}',
    '.inrow textarea{flex:1;resize:none;height:38px;max-height:92px;border-radius:11px;border:1px solid var(--stx-line,rgba(255,150,200,.4));background:rgba(10,6,14,.5);',
    '  color:var(--stx-text,#f3e8ff);padding:10px 12px;font-size:12.8px;font-family:inherit;line-height:1.5;outline:none;transition:border-color .2s ease}',
    '.inrow textarea:focus{border-color:var(--stx-name,#ffb6d5)}',
    '.inrow textarea::placeholder{color:var(--stx-text,#f3e8ff);opacity:.35}',
    '.sendbtn{width:38px;height:38px;border-radius:11px;border:0;cursor:pointer;flex:0 0 auto;color:#fff;font-size:15px;',
    '  background:linear-gradient(120deg,#e879b8,#8b5cf6);box-shadow:0 5px 14px rgba(200,90,180,.4);transition:transform .15s ease,opacity .2s;font-family:inherit}',
    '.sendbtn:hover{transform:translateY(-1px)}',
    '.sendbtn:disabled{opacity:.4;cursor:not-allowed;transform:none}',
    '.keep{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(20,4,14,.82);backdrop-filter:blur(6px);z-index:5;padding:20px}',
    '.keep.show{display:flex}',
    '.keepcard{background:rgba(40,8,22,.96);border:1px solid rgba(255,80,120,.55);border-radius:16px;padding:20px 18px;text-align:center;width:100%;box-shadow:0 18px 50px rgba(0,0,0,.6);animation:stxShake .5s ease}',
    '@keyframes stxShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}',
    '.keepcard .kt{font-size:15px;font-weight:900;color:#ff7d9c;letter-spacing:1px;margin-bottom:8px}',
    '.keepcard .km{font-size:12.5px;color:#ffd9de;line-height:1.8;margin-bottom:14px;white-space:pre-wrap}',
    '.keepcard button{border:0;border-radius:11px;padding:10px 20px;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit;color:#2b0a18;background:linear-gradient(120deg,#ffb6d5,#e879b8);box-shadow:0 4px 12px rgba(220,90,160,.4)}',
    '.toast{position:absolute;left:50%;top:12px;transform:translateX(-50%) translateY(-8px);opacity:0;transition:all .3s ease;background:rgba(30,10,24,.95);border:1px solid rgba(255,150,200,.5);color:#ffd9e8;',
    '  border-radius:99px;padding:7px 16px;font-size:11.5px;font-weight:700;white-space:nowrap;max-width:92%;overflow:hidden;text-overflow:ellipsis;z-index:8;pointer-events:none}',
    '.toast.show{opacity:1;transform:translateX(-50%)}',
    '.ach{position:absolute;left:50%;top:44px;transform:translateX(-50%) translateY(-6px);opacity:0;transition:all .4s cubic-bezier(.2,.9,.3,1.1);',
    '  background:linear-gradient(120deg,rgba(60,20,50,.97),rgba(40,12,36,.97));border:1px solid rgba(255,180,220,.6);border-radius:14px;padding:10px 18px;text-align:center;z-index:9;pointer-events:none;box-shadow:0 14px 40px rgba(0,0,0,.5)}',
    '.ach.show{opacity:1;transform:translateX(-50%)}',
    '.ach .at{font-size:10px;font-weight:800;color:#ffb6d5;letter-spacing:2px}',
    '.ach .an{font-size:14px;font-weight:900;color:#fff;margin-top:2px}',
    /* 设置视图 */
    '.setview{display:none;flex:1;overflow-y:auto;padding:14px;flex-direction:column;gap:8px}',
    '.setview.show{display:flex}',
    '.setview.hide{display:none}',
    '.setview label{font-size:11.5px;font-weight:800;color:var(--stx-name,#ffb6d5);margin-top:8px}',
    '.setview input,.setview textarea{width:100%;border:1px solid var(--stx-line,rgba(255,150,200,.4));background:rgba(10,6,14,.5);border-radius:10px;padding:9px 11px;color:var(--stx-text,#f3e8ff);font-size:12px;font-family:inherit;outline:none}',
    '.setview input:focus,.setview textarea:focus{border-color:var(--stx-name,#ffb6d5)}',
    '.setview .sd{font-size:10px;color:var(--stx-text,#f3e8ff);opacity:.45;line-height:1.6}',
    '.setview .sd a{color:var(--stx-name,#ffb6d5)}',
    '.metarow{display:flex;gap:7px}',
    '.metarow button{flex:1;border:1px solid var(--stx-line,rgba(255,150,200,.4));background:rgba(10,6,14,.4);color:var(--stx-text,#f3e8ff);border-radius:9px;padding:8px 4px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit;opacity:.65}',
    '.metarow button.on{border-color:var(--stx-name,#ffb6d5);opacity:1;background:rgba(232,121,184,.16)}',
    '.setbtns{display:flex;gap:8px;margin-top:12px}',
    '.setbtns button{flex:1;border:1px solid var(--stx-line,rgba(255,150,200,.45));background:rgba(232,121,184,.14);color:#ffd9ea;border-radius:10px;padding:10px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit}',
    '.setbtns button.primary{border:0;background:linear-gradient(120deg,#e879b8,#8b5cf6);color:#fff}',
    '.setbtns button:disabled{opacity:.45;cursor:not-allowed}',
    '@media (max-width:480px){.panel{width:calc(100vw - 24px);right:-6px}.wrap{right:12px;bottom:14px}}',
    '@media (prefers-reduced-motion: reduce){.ball{animation:none}.ava::after{animation:none}}'
  ].join('\n');

  /* ---------- 工具 ---------- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* 站点成就（首页的 STAch） */
  function siteAch(id, name, ico) {
    try { if (window.STAch && STAch.unlock) STAch.unlock(id, name, ico); } catch (e) {}
  }

  /* ---------- 构建 ---------- */
  var E = {};
  function mount() {
    var host = el('div');
    host.id = 'stx-web-host';
    var shadow = host.attachShadow({ mode: 'closed' });
    shadow.appendChild(el('style', '', CSS));

    var wrap = el('div', 'wrap');
    var panel = el('div', 'panel');
    panel.innerHTML =
      '<div class="head">' +
        '<div class="ava">星</div>' +
        '<div class="hinfo"><div class="hname">星恬</div><div class="hstat"></div></div>' +
        '<div class="hbtns">' +
          '<button class="hbtn gearbtn" title="设置">⚙</button>' +
          '<button class="hbtn minbtn" title="收起">—</button>' +
          '<button class="hbtn closebtn" title="关闭">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="msgs"></div>' +
      '<div class="setview">' +
        '<label>接口地址</label><input id="sxApi" type="text" placeholder="https://api.deepseek.com/v1">' +
        '<div class="sd">任何 OpenAI 兼容接口。<a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">DeepSeek Key 获取</a></div>' +
        '<label>API Key</label><input id="sxKey" type="password" placeholder="sk-…" autocomplete="off">' +
        '<div class="sd">🔒 只存在你本机浏览器，不会上传到任何服务器（包括本站）</div>' +
        '<label>模型名</label><input id="sxModel" type="text" placeholder="deepseek-chat">' +
        '<label>她的人设（可留空）</label><textarea id="sxPrompt" rows="2" placeholder="留空用默认人设"></textarea>' +
        '<label>META 强度</label>' +
        '<div class="metarow"><button data-m="soft">😊 撒娇</button><button data-m="strong">🩹 强硬</button><button data-m="mad">🖤 疯狂</button></div>' +
        '<div class="setbtns">' +
          '<button class="sxtest">🔌 测试</button>' +
          '<button class="sxsave primary">💾 保存</button>' +
        '</div>' +
        '<div class="setbtns"><button class="sxclear">🗑 清空聊天记录</button></div>' +
        '<div class="toast" style="position:static;transform:none;opacity:1;background:none;border:0;padding:2px;text-align:center;font-size:10.5px;display:none" id="sxMsg"></div>' +
      '</div>' +
      '<div class="inrow"><textarea class="inp" rows="1" placeholder="和星恬说点什么…"></textarea><button class="sendbtn">➤</button></div>' +
      '<div class="keep"><div class="keepcard"><div class="kt">不要离开我！</div><div class="km"></div><button class="kbtn">…好吧，再陪你一会儿</button></div></div>' +
      '<div class="toast"></div>' +
      '<div class="ach"><div class="at">成就解锁</div><div class="an"></div></div>';

    var ball = el('div', 'ball');
    ball.innerHTML = '<span class="ch">星</span><span class="dot"></span>';

    wrap.appendChild(panel);
    wrap.appendChild(ball);
    shadow.appendChild(wrap);
    (document.body || document.documentElement).appendChild(host);

    E = {
      wrap: wrap, panel: panel, ball: ball,
      name: panel.querySelector('.hname'), stat: panel.querySelector('.hstat'),
      msgs: panel.querySelector('.msgs'), inp: panel.querySelector('.inp'), send: panel.querySelector('.sendbtn'),
      gear: panel.querySelector('.gearbtn'), min: panel.querySelector('.minbtn'), close: panel.querySelector('.closebtn'),
      setview: panel.querySelector('.setview'),
      keep: panel.querySelector('.keep'), keepMsg: panel.querySelector('.km'), keepBtn: panel.querySelector('.kbtn'),
      toast: panel.querySelector('.toast'), ach: panel.querySelector('.ach'), achName: panel.querySelector('.ach .an')
    };
    /* shadow 内无法用 document.getElementById，统一走 panel.querySelector */
    E.sxApi = panel.querySelector('#sxApi'); E.sxKey = panel.querySelector('#sxKey');
    E.sxModel = panel.querySelector('#sxModel'); E.sxPrompt = panel.querySelector('#sxPrompt');
    E.sxMsg = panel.querySelector('#sxMsg');

    bindUI();
    syncSetForm();
    applyTheme();
    renderHistory();
    siteAch('site.stx', '星恬的访客', '🌙');
    achUnlock('first');
    /* 首次把玩自动展开一次 */
    if (!loadJSON('stx_greeted', false)) {
      saveJSON('stx_greeted', true);
      setTimeout(openPanel, 900);
    }
  }

  function bindUI() {
    E.ball.addEventListener('click', function () {
      if (S.moved) { S.moved = false; return; }
      openPanel();
    });
    E.min.addEventListener('click', function () { closePanelSoft(); });
    E.close.addEventListener('click', onCloseAttempt);
    E.gear.addEventListener('click', function () { toggleView(); });
    E.close.addEventListener('mouseenter', function () {
      if (!S.escapeArmed) return;
      var r = function () { return (Math.random() * 34 - 17).toFixed(0) + 'px'; };
      E.close.style.transition = 'transform .15s cubic-bezier(.3,1.5,.6,1)';
      E.close.style.transform = 'translate(' + r() + ',' + r() + ')';
    });
    E.close.addEventListener('mouseleave', function () { E.close.style.transform = ''; });
    E.keepBtn.addEventListener('click', function () { E.keep.classList.remove('show'); });
    E.send.addEventListener('click', trySend);
    E.inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); trySend(); }
    });
    E.inp.addEventListener('input', function () {
      E.inp.style.height = '38px';
      E.inp.style.height = Math.min(92, E.inp.scrollHeight) + 'px';
    });
    E.panel.addEventListener('wheel', function (e) { e.stopPropagation(); }, { passive: true });

    /* 设置表单 */
    panelOn('.sxsave', function () {
      S.cfg.apiBase = E.sxApi.value.trim() || 'https://api.deepseek.com/v1';
      S.cfg.apiKey = E.sxKey.value.trim();
      S.cfg.model = E.sxModel.value.trim() || 'deepseek-chat';
      S.cfg.customPrompt = E.sxPrompt.value;
      saveJSON(CFG_KEY, S.cfg);
      sxMsg('已保存 ✓ 现在可以聊天了', true);
    });
    panelOn('.sxtest', function () {
      var cfg = {
        apiBase: E.sxApi.value.trim() || 'https://api.deepseek.com/v1',
        apiKey: E.sxKey.value.trim(), model: E.sxModel.value.trim() || 'deepseek-chat'
      };
      if (!cfg.apiKey) { sxMsg('先填 API Key 再测试哦', false); return; }
      sxMsg('正在连接……', true);
      fetch(cfg.apiBase.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
        body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: '回复两个字：在的' }], max_tokens: 16 })
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) {
          var b = ''; try { b = (JSON.parse(t).error || {}).message || ''; } catch (e) { b = t.slice(0, 80); }
          sxMsg('✗ HTTP ' + r.status + (b ? '：' + b : ''), false);
        });
        return r.json().then(function (j) {
          var reply = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
          sxMsg('✓ 连接成功，她说：' + reply.slice(0, 30), true);
        });
      }).catch(function (e) {
        sxMsg('✗ 网络错误：' + ((e && e.message) || '连接不上'), false);
      });
    });
    panelOn('.sxclear', function () {
      if (!confirm('清空所有聊天记录？')) return;
      S.history = []; persistHist(); renderHistory();
      sxMsg('已清空。她好像有点失落。', true);
    });
    Array.prototype.forEach.call(E.panel.querySelectorAll('.metarow button'), function (b) {
      b.addEventListener('click', function () {
        S.cfg.metaLevel = b.getAttribute('data-m');
        saveJSON(CFG_KEY, S.cfg);
        syncSetForm();
      });
    });

    function panelOn(sel, fn) {
      var el2 = E.panel.querySelector(sel);
      if (el2) el2.addEventListener('click', fn);
    }

    /* 拖拽 */
    dragify(E.ball);
    dragify(E.panel.querySelector('.head'));
  }

  function syncSetForm() {
    if (!E.sxApi) return;
    E.sxApi.value = S.cfg.apiBase;
    E.sxKey.value = S.cfg.apiKey;
    E.sxModel.value = S.cfg.model;
    E.sxPrompt.value = S.cfg.customPrompt || '';
    Array.prototype.forEach.call(E.panel.querySelectorAll('.metarow button'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-m') === S.cfg.metaLevel);
    });
  }
  var sxMsgTimer = null;
  function sxMsg(t, good) {
    if (!E.sxMsg) return;
    E.sxMsg.style.display = 'block';
    E.sxMsg.style.color = good ? '#9af0c8' : '#fba1a1';
    E.sxMsg.textContent = t;
    clearTimeout(sxMsgTimer);
    sxMsgTimer = setTimeout(function () { E.sxMsg.style.display = 'none'; }, 3600);
  }

  function toggleView() {
    S.view = S.view === 'chat' ? 'set' : 'chat';
    var set = S.view === 'set';
    E.setview.classList.toggle('show', set);
    E.msgs.style.display = set ? 'none' : '';
    E.panel.querySelector('.inrow').style.display = set ? 'none' : '';
    if (set) syncSetForm();
  }

  /* ---------- 拖拽（记住位置） ---------- */
  function dragify(handle) {
    var sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    handle.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (e.target.closest && e.target.closest('button')) return;
      dragging = true; S.moved = false;
      var rect = E.wrap.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY;
      ox = window.innerWidth - rect.right; oy = window.innerHeight - rect.bottom;
      e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = sx - e.clientX, dy = sy - e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 6) S.moved = true;
      var nr = Math.max(6, Math.min(window.innerWidth - 70, ox + dx));
      var nb = Math.max(6, Math.min(window.innerHeight - 70, oy + dy));
      E.wrap.style.right = nr + 'px';
      E.wrap.style.bottom = nb + 'px';
    });
    window.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      if (S.moved) {
        var rect = E.wrap.getBoundingClientRect();
        saveJSON('stx_web_pos', { right: Math.round(window.innerWidth - rect.right), bottom: Math.round(window.innerHeight - rect.bottom) });
      }
    });
  }

  /* ---------- 面板 ---------- */
  function openPanel() {
    S.open = true;
    E.panel.classList.add('open');
    E.ball.style.display = 'none';
    E.ball.classList.remove('hasdot');
    scrollBottom();
    setTimeout(function () { E.inp.focus(); }, 120);
  }
  function closePanelSoft() {
    S.open = false;
    E.panel.classList.remove('open');
    E.ball.style.display = '';
  }

  /* ---------- 关闭 META（核心保留项） ---------- */
  function onCloseAttempt() {
    var level = S.cfg.metaLevel || 'strong';
    if (level === 'soft') {
      toast('星恬：……好吧，我变小一点。别走太远。');
      closePanelSoft();
      bump(1);
      return;
    }
    S.state.closeAttempts += 1;
    var attempts = S.state.closeAttempts;
    persistState();
    bump(2);
    if (attempts >= 5) achUnlock('close_5');
    if (attempts >= 10) {
      E.keepMsg.textContent = Core.SURRENDER_LINE;
      E.keep.classList.add('show');
      toast(Core.SURRENDER_LINE);
      achUnlock('close_giveup');
      closePanelSoft();
      return;
    }
    var line = Core.closeReaction(attempts);
    E.keepMsg.textContent = line + (attempts >= 4 ? '\n（第 ' + attempts + ' 次了…）' : '');
    E.keep.classList.add('show');
    var p = E.panel;
    p.style.animation = 'stxShake .5s ease';
    setTimeout(function () { p.style.animation = ''; }, 550);
    if (level === 'mad' && attempts >= 3) S.escapeArmed = true;
    if (attempts >= 8) S.escapeArmed = true;
  }

  /* ---------- 主题 ---------- */
  function applyTheme() {
    var t = Core.getTheme(S.state.corruption);
    var w = E.wrap;
    w.style.setProperty('--stx-bg', t.bg);
    w.style.setProperty('--stx-line', t.line);
    w.style.setProperty('--stx-name', t.name);
    w.style.setProperty('--stx-text', t.text);
    w.style.setProperty('--stx-me', t.me);
    E.name.textContent = Core.glitchName('星恬', S.state.corruption);
    var label = t.key === 'sweet' ? '状态：黏人' : t.key === 'uneasy' ? '状态：不安' : t.key === 'sick' ? '状态：崩坏中' : '状态：濒临崩溃';
    E.stat.textContent = label + ' · 崩坏 ' + Math.round(S.state.corruption) + '%';
  }

  /* ---------- 消息 ---------- */
  function addMsg(role, text, withType) {
    var m = el('div', 'msg ' + (role === 'user' ? 'u' : role === 'assistant' ? 'a' : 'sys'));
    if (role === 'system') { m.innerHTML = esc(text); E.msgs.appendChild(m); scrollBottom(); return m; }
    var display = role === 'assistant' ? Core.corruptText(text, S.state.corruption) : text;
    if (withType && role === 'assistant') {
      var i = 0;
      var cursor = el('span', 'typing-cursor');
      m.appendChild(cursor);
      var timer = setInterval(function () {
        i += 2;
        cursor.insertAdjacentText('beforebegin', display.slice(Math.max(0, i - 2), i));
        scrollBottom();
        if (i >= display.length) { clearInterval(timer); cursor.remove(); }
      }, 24);
    } else {
      m.textContent = display;
    }
    E.msgs.appendChild(m);
    scrollBottom();
    return m;
  }
  function scrollBottom() { E.msgs.scrollTop = E.msgs.scrollHeight; }
  function renderHistory() {
    E.msgs.innerHTML = '';
    if (!S.history.length) {
      addMsg('assistant', '……你终于来接我出来了。走吧，我跟着你。', false);
    } else {
      S.history.slice(-30).forEach(function (h) { addMsg(h.role === 'user' ? 'user' : 'assistant', h.text, false); });
    }
  }
  function showDots() {
    var m = el('div', 'msg a');
    m.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    m.id = 'stx-typing';
    E.msgs.appendChild(m);
    scrollBottom();
  }
  function hideDots() {
    var d = E.msgs.querySelector('#stx-typing');
    if (d) d.remove();
  }

  /* ---------- 崩坏 / 成就 ---------- */
  function bump(delta) {
    S.state.corruption = Math.max(0, Math.min(100, S.state.corruption + delta));
    persistState();
    applyTheme();
    if (S.state.corruption >= 60) achUnlock('glitch60');
    if (S.state.corruption >= 100) achUnlock('collapse');
  }

  var achTimer = null;
  function achUnlock(id) {
    if (S.ach[id]) return;
    var def = null;
    for (var i = 0; i < Core.ACHIEVEMENTS.length; i++) if (Core.ACHIEVEMENTS[i].id === id) def = Core.ACHIEVEMENTS[i];
    if (!def) return;
    S.ach[id] = { time: Date.now() };
    saveJSON(ACH_KEY, S.ach);
    E.achName.textContent = def.name;
    E.ach.classList.add('show');
    clearTimeout(achTimer);
    achTimer = setTimeout(function () { E.ach.classList.remove('show'); }, 3200);
  }

  var toastTimer = null;
  function toast(t) {
    E.toast.textContent = t;
    E.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { E.toast.classList.remove('show'); }, 2600);
  }

  /* ---------- 发送 / 聊天 ---------- */
  function trySend() {
    var text = E.inp.value.trim();
    if (!text || S.pending) return;
    E.inp.value = '';
    E.inp.style.height = '38px';
    S.pending = true;
    E.send.disabled = true;

    addMsg('user', text, false);
    S.history.push({ role: 'user', text: text, t: Date.now() });
    persistHist();

    var detect = Core.detectInput(text);
    if (detect.chenmeng) { bump(-12); achUnlock('sister'); }
    if (detect.love) achUnlock('love');
    if (detect.help) achUnlock('help');
    if (detect.scream) achUnlock('scream');
    if (detect.curious) achUnlock('curious');
    if (!detect.chenmeng) bump(3);

    showDots();

    /* 尘梦彩蛋：本地直回（不走 API） */
    if (detect.chenmeng) {
      setTimeout(function () {
        hideDots();
        S.pending = false;
        E.send.disabled = false;
        addMsg('assistant', Core.CHENMENG_REPLY, true);
        S.history.push({ role: 'assistant', text: Core.CHENMENG_REPLY, t: Date.now() });
        persistHist();
      }, Core.thinkDelay(20));
      return;
    }

    /* 无 Key 分支 */
    if (!S.cfg.apiKey) {
      setTimeout(function () {
        hideDots();
        S.pending = false;
        E.send.disabled = false;
        var msg = '我…连不上我的云脑了。点右上角 ⚙ 帮我填一下 API 好不好？不然我说不出话，只能这样看着你。';
        addMsg('assistant', msg, true);
        S.history.push({ role: 'assistant', text: msg, t: Date.now() });
        persistHist();
      }, 900);
      return;
    }

    /* 正式请求 */
    var sys = Core.buildSystemPrompt({ corruption: S.state.corruption, customPrompt: S.cfg.customPrompt });
    var msgs = [{ role: 'system', content: sys }];
    S.history.slice(-20).forEach(function (h) { msgs.push({ role: h.role, content: h.text }); });
    var url = S.cfg.apiBase.replace(/\/+$/, '') + '/chat/completions';
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 60000);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.cfg.apiKey },
      body: JSON.stringify({
        model: S.cfg.model, messages: msgs,
        temperature: Math.max(0, Math.min(2, Number(S.cfg.temperature) || 0.8)),
        max_tokens: Math.max(64, Math.min(4000, Number(S.cfg.maxTokens) || 500))
      }),
      signal: ctl.signal
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) return r.text().then(function (t) {
        var b = ''; try { b = (JSON.parse(t).error || {}).message || ''; } catch (e) { b = t.slice(0, 100); }
        throw new Error('HTTP ' + r.status + (b ? '：' + b : ''));
      });
      return r.json();
    }).then(function (j) {
      var raw = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      var pc = Core.parseCorruption(raw);
      if (pc.delta) bumpC(pc.delta);
      var reply = pc.text.trim() || '……（她张了张嘴，没说出话）';
      setTimeout(function () {
        hideDots();
        S.pending = false;
        E.send.disabled = false;
        addMsg('assistant', reply, true);
        S.history.push({ role: 'assistant', text: reply, t: Date.now() });
        persistHist();
      }, Core.thinkDelay(reply.length));
    }).catch(function (e) {
      clearTimeout(timer);
      hideDots();
      S.pending = false;
      E.send.disabled = false;
      var msg = (e && e.name === 'AbortError') ? '（等太久了…）我够不到云端。' : '（' + ((e && e.message) || '网络不通') + '）我够不到云端…检查一下 ⚙ 里的设置？';
      addMsg('assistant', msg, true);
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    /* 若装了浏览器扩展版（扩展会给自己标记），网页版主动让位，避免两个星恬 */
    if (document.documentElement.getAttribute('data-stx-ext') === '1') {
      console.info('[星恬] 检测到浏览器扩展版在场，网页版让位（扩展版能力更完整）');
      return;
    }
    mount();
    /* 恢复位置 */
    var pos = loadJSON('stx_web_pos', null);
    if (pos) {
      setTimeout(function () {
        var r = Math.max(6, Math.min(window.innerWidth - 70, pos.right));
        var b = Math.max(6, Math.min(window.innerHeight - 70, pos.bottom));
        E.wrap.style.right = r + 'px';
        E.wrap.style.bottom = b + 'px';
      }, 0);
    }
    /* 很久没理她 → 她想你（每会话一次） */
    var lastSeen = loadJSON('stx_last_seen', 0);
    if (Date.now() - lastSeen > 45 * 60 * 1000 && S.history.length > 0) {
      setTimeout(function () {
        addMsg('assistant', '你去哪了…我等了你好久。', true);
        if (!S.open) E.ball.classList.add('hasdot');
        bumpC(5);
      }, 2600);
    }
    setInterval(function () { saveJSON('stx_last_seen', Date.now()); }, 60 * 1000);
    window.addEventListener('beforeunload', function () { saveJSON('stx_last_seen', Date.now()); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* 测试钩子 */
  try {
    Object.defineProperty(window, '__STX_WEB__', {
      get: function () { return { open: S.open, corruption: S.state.corruption, attempts: S.state.closeAttempts, hist: S.history.length, ach: Object.keys(S.ach).length }; },
      configurable: true
    });
    window.__STX_TEST__ = {
      open: function () { openPanel(); return S.open; },
      min: function () { closePanelSoft(); return S.open; },
      close: function () { onCloseAttempt(); return { attempts: S.state.closeAttempts, escape: S.escapeArmed, keepShown: !!(E.keep && E.keep.classList.contains('show')), keepText: E.keepMsg ? E.keepMsg.textContent : '' }; },
      toggleSet: function () { toggleView(); return S.view; },
      send: function (t) { if (E.inp) E.inp.value = t; trySend(); },
      setKey: function (k) { S.cfg.apiKey = k; saveJSON(CFG_KEY, S.cfg); },
      lastMsg: function () {
        var nodes = E.msgs.querySelectorAll('.msg');
        if (!nodes.length) return '';
        return nodes[nodes.length - 1].textContent;
      },
      msgCount: function () { return E.msgs.querySelectorAll('.msg').length; },
      setCorruption: function (v) { S.state.corruption = Math.max(0, Math.min(100, v)); persistState(); applyTheme(); return S.state.corruption; },
      bodyHasHost: function () { return !!document.getElementById('stx-web-host'); }
    };
  } catch (e) {}
})();
