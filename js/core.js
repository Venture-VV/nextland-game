/* 核心:DOM 工具、存档、页面切换、通用弹窗。所有模块挂在全局 NL 上。 */
(function () {
  'use strict';
  const NL = (window.NL = { screens: {}, data: {}, ui: {}, game: {}, fmt: {}, defaults: [], scale: 1 });
  const $ = (s) => document.querySelector(s);

  /* ---------- DOM ---------- */
  // h('div.a.b#id', {style:{...}, onclick, html, text}, ...children)
  NL.h = function (spec, attrs, ...kids) {
    const m = spec.split(/(?=[.#])/);
    const el = document.createElement(m[0] || 'div');
    for (let i = 1; i < m.length; i++) {
      if (m[i][0] === '.') el.classList.add(m[i].slice(1));
      else el.id = m[i].slice(1);
    }
    if (attrs && (typeof attrs !== 'object' || attrs.nodeType || Array.isArray(attrs))) {
      kids.unshift(attrs);
      attrs = null;
    }
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'style') typeof v === 'string' ? (el.style.cssText = v) : Object.assign(el.style, px(v));
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (k === 'cls') String(v).split(' ').forEach((c) => c && el.classList.add(c));
        else el.setAttribute(k, v);
      }
    }
    add(el, kids);
    return el;
  };
  const NUM_PX = /^(left|top|right|bottom|width|height|fontSize|lineHeight|gap|margin\w*|padding\w*|borderRadius|min\w+|max\w+)$/;
  function px(st) {
    const o = {};
    for (const k in st) o[k] = typeof st[k] === 'number' && NUM_PX.test(k) ? st[k] + 'px' : st[k];
    return o;
  }
  function add(el, kids) {
    for (const k of kids) {
      if (k == null || k === false) continue;
      if (Array.isArray(k)) add(el, k);
      else el.appendChild(k.nodeType ? k : document.createTextNode(String(k)));
    }
  }
  NL.img = (p) => 'assets/img/' + p;
  NL.bg = (p) => 'url(' + NL.img(p) + ')';
  // 绝对定位的图片;x/y/w/h 用设计尺寸（录屏像素的一半）
  NL.sprite = function (p, x, y, w, h, attrs) {
    return NL.h('img.abs', Object.assign({ src: NL.img(p), draggable: 'false', style: { left: x, top: y, width: w, height: h } }, attrs || {}));
  };
  // 透明热区
  NL.hit = function (x, y, w, h, fn, attrs) {
    return NL.h('button.hit', Object.assign({ style: { left: x, top: y, width: w, height: h }, onclick: fn }, attrs || {}));
  };

  /* ---------- 格式 ---------- */
  NL.fmt.power = (n) => (n >= 10000 ? (Math.round(n / 1000) / 10).toFixed(1).replace(/\.0$/, '') + '万' : String(Math.round(n)));
  NL.fmt.clock = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    const p = (n) => String(n).padStart(2, '0');
    return p(Math.floor(sec / 3600)) + ':' + p(Math.floor((sec % 3600) / 60)) + ':' + p(sec % 60);
  };
  // 到次日 8 点的倒计时（录屏里各处「xx:xx:xx 后刷新」）
  NL.fmt.untilReset = function () {
    const now = new Date();
    const t = new Date(now);
    t.setHours(8, 0, 0, 0);
    if (t <= now) t.setDate(t.getDate() + 1);
    return NL.fmt.clock((t - now) / 1000);
  };

  /* ---------- 存档 ---------- */
  const SAVE_KEY = 'nextland-web-save-v1';
  NL.defaults.push(() => ({
    name: '热心市民VV', uid: 'NLWEB0001',
    level: 16, exp: 0, gem: 100000, credit: 99504,
    energy: 60, energyMax: 60, energyAt: 0,
    bag: {}, guide: null, guideStep: 0,
    heroGender: 'f', homePartner: 'jiguang',
  }));
  NL.heroKey = () => (NL.state && NL.state.heroGender === 'm' ? 'hero_male' : 'heroine');
  NL.load = function () {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch (e) { saved = {}; }
    const base = {};
    NL.defaults.forEach((f) => Object.assign(base, f()));
    NL.state = Object.assign(base, saved);
  };
  let saveTimer = 0;
  NL.save = function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(NL.state)); } catch (e) { /* 无痕模式下存不了就算了 */ }
    }, 50);
  };
  NL.reset = function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 同上 */ }
    NL.load();
  };

  /* ---------- 页面切换 ---------- */
  const stack = [];
  let current = null;
  NL.current = () => stack[stack.length - 1];
  function render(keepScroll) {
    const top = NL.current();
    const scr = NL.screens[top.name];
    const root = $('#screen');
    const kept = {};
    if (keepScroll) root.querySelectorAll('[data-keep]').forEach((e) => (kept[e.dataset.keep] = [e.scrollTop, e.scrollLeft]));
    if (current && current.leave) current.leave(); // 清理上一个页面的定时器等
    root.textContent = '';
    root.className = 'scr-' + top.name;
    current = scr;
    const title = typeof scr.title === 'function' ? scr.title(top.params) : scr.title;
    $('#title-tag').textContent = title || '';
    // plate: true 表示底图里已经带着页面名和胶囊;'cap' 表示只带着胶囊
    $('#chrome').classList.toggle('hidden', scr.plate === true);
    $('#capsule').classList.toggle('hidden', scr.plate === 'cap');
    const nav = $('#nav');
    nav.classList.toggle('off', !scr.nav);
    if (scr.nav) {
      nav.querySelectorAll('button[data-nav]').forEach((b) => b.classList.toggle('on', b.dataset.nav === scr.nav));
    }
    scr.render(root, top.params || {});
    if (scr.back !== false && !scr.nav) root.appendChild(NL.ui.backBtn());
    if (keepScroll) root.querySelectorAll('[data-keep]').forEach((e) => {
      const k = kept[e.dataset.keep];
      if (k) { e.scrollTop = k[0]; e.scrollLeft = k[1]; }
    });
    if (NL.afterRender) NL.afterRender(top.name, root);
  }
  NL.go = function (name, params) {
    const scr = NL.screens[name];
    if (!scr) { NL.ui.toast('敬请期待。'); return false; }
    if (scr.nav || scr.root) stack.length = 0; // 底部五个页签互相切换时不留历史
    stack.push({ name, params });
    render(false);
    return true;
  };
  NL.replace = function (name, params) { stack.pop(); return NL.go(name, params); };
  NL.back = function () {
    if (stack.length > 1) { stack.pop(); render(false); } else NL.go('home');
  };
  NL.refresh = function () { if (stack.length) render(true); };

  /* ---------- 通用界面 ---------- */
  const ui = NL.ui;
  const h = NL.h;
  const BACK_SVG = '<svg viewBox="0 0 20 20"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  ui.backBtn = function (fn) {
    return h('button.back-btn', { onclick: fn || (() => NL.back()), html: BACK_SVG + '<span>返回</span>' });
  };
  ui.mask = function (opts) {
    opts = opts || {};
    const el = h('div.mask' + (opts.clear ? '.clear' : ''));
    const api = {
      el,
      close() {
        if (!el.parentNode) return;
        el.remove();
        if (opts.onClose) opts.onClose();
      },
    };
    el.addEventListener('click', (e) => { if (e.target === el && opts.dismiss !== false) api.close(); });
    $('#layers').appendChild(el);
    return api;
  };
  // 珠光毛玻璃「提示」对话框
  ui.dialog = function (opts) {
    const m = ui.mask({ dismiss: !!opts.dismiss, onClose: opts.onClose });
    const body = h('div.dlg-body', h('div', opts.html ? { html: opts.html } : null, opts.text || null), opts.extra || null);
    const btns = h('div.dlg-btns', (opts.buttons || [{ text: '确认', cls: 'purple' }]).map((b) =>
      h('button.btn.' + (b.cls || 'purple'), { onclick: () => { m.close(); if (b.onClick) b.onClick(); } }, b.text)));
    m.el.appendChild(h('div.dlg', { style: { top: opts.top == null ? 296 : opts.top } }, h('div.dlg-head'), body, btns));
    return m;
  };
  ui.confirm = function (html, onOk, o) {
    o = o || {};
    return ui.dialog({ html, buttons: [{ text: o.cancelText || '取消', cls: 'pink', onClick: o.onCancel }, { text: o.okText || '确认', cls: 'purple', onClick: onOk }] });
  };
  // 珠光毛玻璃标题弹窗
  ui.win = function (opts) {
    const m = ui.mask({ onClose: opts.onClose, dismiss: opts.dismiss });
    const body = h('div.win-body', opts.bodyAttrs || null);
    const win = h('div.win' + (opts.dark ? '.dark' : ''), { style: { top: opts.top == null ? 155 : opts.top } },
      h('div.win-head', opts.title || '', h('button.win-close', { onclick: () => m.close() })), body);
    if (opts.cls) win.classList.add(opts.cls);
    m.el.appendChild(win);
    if (opts.hint !== false) m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: opts.hintTop || 624, textAlign: 'center', margin: 0 } }, '点击空白处关闭'));
    m.body = body;
    m.win = win;
    if (opts.body) typeof opts.body === 'function' ? opts.body(body, m) : body.appendChild(opts.body);
    return m;
  };
  ui.itemEl = function (id, n, cls) {
    const d = (NL.data.items && NL.data.items[id]) || (NL.data.equips && NL.data.equips[id]) || {};
    const el = h('div.item' + (cls ? '.' + cls : ''), { title: d.name || id });
    if (d.icon) el.style.backgroundImage = NL.bg(d.icon);
    else el.textContent = '';
    if (n != null && n !== '') el.appendChild(h('b', String(n)));
    return el;
  };
  // 获得物品:items = [{id, n}]
  ui.reward = function (items, onDone) {
    const m = ui.mask({ onClose: onDone });
    m.el.appendChild(h('div.reward',
      h('div.reward-head'),
      h('div.reward-body', items.map((it) => ui.itemEl(it.id, it.n))),
      h('button.reward-ok', { onclick: () => m.close() }, '确认')));
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 628, textAlign: 'center', margin: 0 } }, '点击空白处关闭'));
    return m;
  };
  // shift: 和「战力提升」同时出现时把字往右挪,免得被挡住
  ui.toast = function (text, shift) {
    const el = h('div.toast' + (shift ? '.shift' : ''), text);
    $('#layers').appendChild(el);
    setTimeout(() => el.remove(), 2100);
  };
  ui.powerUp = function (delta) {
    if (!delta) return;
    const el = h('div.powerup',
      h('div.p-box'), h('div.p-top', '星芒共鸣'), h('div.p-flame', '✦'),
      h('div.p-num', (delta > 0 ? '+' : '') + Math.round(delta)), h('div.p-txt', delta > 0 ? '共鸣提升' : '共鸣变动'));
    $('#layers').appendChild(el);
    setTimeout(() => el.remove(), 2300);
  };
  ui.pill = function (icon, value, x, y, extra) {
    return h('div.pill' + (extra && extra.cls ? '.' + extra.cls : ''), { style: { left: x, top: y, minWidth: (extra && extra.w) || 92 }, onclick: extra && extra.onclick },
      h('img', { src: NL.img(icon), draggable: 'false' }), h('span', String(value)),
      extra && extra.plus ? h('img.plus', { src: NL.img('home/ico_plus.webp'), draggable: 'false' }) : null);
  };
  // 女性向立绘呼吸舞台（otome-ui-motion 规范：分层呼吸微动效 + 星芒散景 + 点击心动气泡 + LivePortrait 视频扩展槽）
  const MOTES = [
    [14, 78, 5, 0], [32, 64, 3.5, 1.1], [78, 72, 4.5, 0.6], [88, 52, 3, 2.1],
    [22, 38, 4, 1.7], [68, 30, 5.5, 2.8], [48, 84, 3.5, 0.9], [84, 82, 4, 1.5],
  ];
  ui.charStage = function (charKey, opts) {
    opts = opts || {};
    const stage = h('div.char-stage' + (opts.cls ? '.' + opts.cls : ''));
    const breather = h('div.char-breathe');
    if (opts.liveSrc) {
      breather.appendChild(h('video.char-live', { src: opts.liveSrc, autoplay: 'autoplay', loop: 'loop', muted: 'muted', playsinline: 'playsinline' }));
    }
    breather.appendChild(h('img.char-art', { src: NL.img('otome/chars/' + charKey + '.webp'), draggable: 'false', alt: opts.name || charKey }));
    stage.appendChild(breather);
    stage.appendChild(h('div.starlight-layer', MOTES.map(([lx, ty, sz, dl]) =>
      h('i.starlight-mote', { style: `left:${lx}%;top:${ty}%;width:${sz}px;height:${sz}px;animation-delay:-${dl}s` }))));
    if (opts.vignette !== false) stage.appendChild(h('div.char-vignette'));

    let qIdx = 0, qTimer = 0, bubble = null;
    stage.say = function (txt) {
      if (!txt) return;
      if (bubble) bubble.remove();
      clearTimeout(qTimer);
      bubble = h('div.char-quote-bubble', txt);
      stage.appendChild(bubble);
      qTimer = setTimeout(() => { if (bubble) { bubble.remove(); bubble = null; } }, 2800);
    };
    if (opts.interactive !== false && opts.quotes && opts.quotes.length) {
      stage.addEventListener('click', (e) => {
        const rect = stage.getBoundingClientRect();
        const rx = (e.clientX - rect.left) / (NL.scale || 1);
        const ry = (e.clientY - rect.top) / (NL.scale || 1);
        const rip = h('span.heart-ripple', { style: { left: rx, top: ry } }, '♥');
        stage.appendChild(rip);
        setTimeout(() => rip.remove(), 900);
        stage.say(opts.quotes[qIdx % opts.quotes.length]);
        qIdx++;
      });
    }
    return stage;
  };

  /* ---------- 数值 ---------- */
  const game = NL.game;
  // 录屏:16 级领 100 经验后直接到 21 级，且 21 级显示 50/250;战力同时 +889
  game.expNeed = (lv) => (lv < 21 ? 10 : 250);
  game.levelPower = (lv) => Math.round(177.8 * lv);
  game.powerParts = [() => 12335 + game.levelPower(NL.state.level)]; // 装备等其他来源由各模块追加
  game.power = () => game.powerParts.reduce((s, f) => s + f(), 0);
  // 在改动数值前后对比战力，有变化就弹「战力提升」
  game.withPower = function (fn) {
    const before = game.power();
    const r = fn();
    const d = game.power() - before;
    if (d) setTimeout(() => ui.powerUp(d), 250);
    return r;
  };
  game.addExp = function (n) {
    const s = NL.state;
    s.exp += n;
    while (s.exp >= game.expNeed(s.level)) { s.exp -= game.expNeed(s.level); s.level++; }
  };
  const ENERGY_SEC = 20 * 60; // 录屏：差 6 点时「全部恢复 01:58:42」，即每 20 分钟 1 点
  game.tickEnergy = function () {
    const s = NL.state;
    const now = Date.now();
    if (s.energy >= s.energyMax) { s.energyAt = 0; return; }
    if (!s.energyAt) s.energyAt = now;
    const got = Math.floor((now - s.energyAt) / 1000 / ENERGY_SEC);
    if (got > 0) {
      s.energy = Math.min(s.energyMax, s.energy + got);
      s.energyAt = s.energy >= s.energyMax ? 0 : s.energyAt + got * ENERGY_SEC * 1000;
      NL.save();
    }
  };
  game.energyTimers = function () {
    const s = NL.state;
    if (s.energy >= s.energyMax) return null;
    const next = ENERGY_SEC - (Date.now() - s.energyAt) / 1000;
    return { next, all: next + (s.energyMax - s.energy - 1) * ENERGY_SEC };
  };
  game.useEnergy = function (n) {
    game.tickEnergy();
    const s = NL.state;
    if (s.energy < n) { ui.toast('体力不足。'); return false; }
    s.energy -= n;
    if (!s.energyAt) s.energyAt = Date.now();
    NL.save();
    return true;
  };
  game.buyEnergy = function () {
    const s = NL.state;
    if (s.energy >= s.energyMax) { ui.toast('体力已满。'); return; }
    ui.confirm('是否消耗<em>50储值</em>补满体力？', () => {
      if (s.gem < 50) { ui.toast('储值不足。'); return; }
      s.gem -= 50; s.energy = s.energyMax; s.energyAt = 0;
      NL.save(); NL.refresh();
    });
  };
  // 发放奖励:exp / credit / gem / energy 直接进数值，其他进仓库
  game.grantHooks = {};
  // 返回发放前后的战力差
  game.grant = function (items) {
    const s = NL.state;
    const before = game.power();
    items.forEach((it) => {
      const n = it.n == null ? 1 : it.n;
      if (it.id === 'exp') game.addExp(n);
      else if (it.id === 'credit') s.credit += n;
      else if (it.id === 'gem') s.gem += n;
      else if (it.id === 'energy') s.energy += n;
      else if (game.grantHooks[it.id]) game.grantHooks[it.id](n, it);
      else if (NL.data.equips && NL.data.equips[it.id]) game.addGear(it.id, n);
      else s.bag[it.id] = (s.bag[it.id] || 0) + n;
    });
    NL.save();
    if (NL.onGrant) NL.onGrant(items);
    return game.power() - before;
  };
  // 发奖并弹「获得物品」;关掉弹窗后如果战力变了再弹「战力提升」(录屏里也是这个顺序)
  game.award = function (items, onDone) {
    const delta = game.grant(items);
    ui.reward(items, () => { NL.refresh(); ui.powerUp(delta); if (onDone) onDone(); });
  };
  game.count = (id) => (id === 'credit' ? NL.state.credit : id === 'gem' ? NL.state.gem : NL.state.bag[id] || 0);
  game.spend = function (id, n) {
    const s = NL.state;
    if (game.count(id) < n) return false;
    if (id === 'credit') s.credit -= n; else if (id === 'gem') s.gem -= n; else s.bag[id] -= n;
    NL.save();
    return true;
  };

  /* ---------- 启动 ---------- */
  NL.boot = function () {
    const stage = $('#stage');
    const fit = () => {
      NL.scale = Math.min(window.innerWidth / 360, window.innerHeight / 781);
      stage.style.transform = 'translate(-50%,-50%) scale(' + NL.scale + ')';
    };
    window.addEventListener('resize', fit);
    fit();
    if (/[?&]reset\b/.test(location.search)) NL.reset(); else NL.load();
    const nav = $('#nav');
    const NAV_DEFS = [
      ['role', '角色', '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 19.5c1.4-3.2 3.8-4.8 6.5-4.8s5.1 1.6 6.5 4.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'],
      ['bag', '行囊', '<svg viewBox="0 0 24 24"><rect x="4.5" y="7.5" width="15" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 7.5V6a3 3 0 0 1 6 0v1.5M4.5 12h15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'],
      ['home', '乐园', '<svg viewBox="0 0 24 24"><path d="M12 3.2 14.3 9l5.8.5-4.4 3.8 1.3 5.7-5-3-5 3 1.3-5.7-4.4-3.8 5.8-.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'],
      ['mission', '委托', '<svg viewBox="0 0 24 24"><rect x="5.5" y="4.5" width="13" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 9.5h6M9 13h6M9 16.5h3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'],
      ['partner', '伙伴', '<svg viewBox="0 0 24 24"><path d="M12 19.6s-6.5-4.1-6.5-8.7A3.8 3.8 0 0 1 12 8.2a3.8 3.8 0 0 1 6.5 2.7c0 4.6-6.5 8.7-6.5 8.7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'],
    ];
    NAV_DEFS.forEach(([n, label, svg]) => {
      nav.appendChild(h('button', { 'data-nav': n, onclick: () => NL.go(n), html: `<i class="nav-ico">${svg}</i><span>${label}</span>` }));
    });
    setInterval(game.tickEnergy, 1000);
    game.tickEnergy();
    const start = location.hash.slice(1);
    if (!(start && NL.screens[start] && NL.go(start))) NL.go('login');
  };
})();
