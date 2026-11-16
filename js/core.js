/* 核心:DOM 工具、存档、页面切换、通用弹窗。所有模块挂在全局 NL 上。 */
(function () {
  'use strict';
  const NL = (window.NL = { screens: {}, data: {}, ui: {}, game: {}, fmt: {}, defaults: [], bootHooks: [], scale: 1 });
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
  // 给由脚本按需加载的文件带上版本号(版本号由 tools/stamp.py 写进页面)
  NL.ver = (path) => { const v = window.NL_VER && window.NL_VER.files[path]; return v ? path + '?v=' + v : path; };
  /* 表 / 里:皮肤只决定「画成什么样」,规则和存档是同一份。
   * 里(li)是照录屏复刻的原样;表(biao)是重画的女性向美术。
   * 表的图放在 assets/biao/ 下,和里的图同名同路径;js/skin_assets.js 里记着已经画好了哪些。
   * 表还没画的图先借用里的,并记进 NL.skinMiss,走查会把这份欠账打印出来。 */
  NL.rand = () => Math.random(); // 规则用的随机数(掉落、抽卡、委托);特效的随机不走这里
  NL.skin = () => (NL.state && NL.state.skin === 'biao' ? 'biao' : 'li');
  NL.biaoAssets = NL.biaoAssets || {};
  NL.skinMiss = {};
  NL.img = function (p) {
    if (NL.skin() === 'biao') {
      const b = NL.biaoAssets[p]; // 1 = 同名同路径;字符串 = 表用的是另一个扩展名(矢量图标)
      if (b) return 'assets/biao/' + (b === 1 ? p : b);
      NL.skinMiss[p] = true;
    }
    return 'assets/img/' + p;
  };
  NL.applySkin = () => { document.documentElement.dataset.skin = NL.skin(); };
  // 一键翻面:像素块盖住画面,盖满时换皮肤,再揭开。x、y 是翻面从哪里扩散开(舞台坐标)
  NL.setSkin = function (name, x, y) {
    if (name !== 'biao' && name !== 'li') return;
    if (name === NL.skin()) return;
    NL.motion.pixels({ mode: x == null ? 'dither' : 'radial', x, y, ms: 900, colors: name === 'biao' ? ['#0b0d1a', '#0b0d1a', '#151a33', '#ff3d7f', '#7de8ff', '#e8cf9a'] : null,
      onMid() { NL.state.skin = name; NL.save(); NL.applySkin(); NL.refresh(); } });
  };
  NL.bg = (p) => 'url(' + NL.img(p) + ')';
  // 绝对定位的图片;x/y/w/h 用设计尺寸（录屏像素的一半）
  NL.sprite = function (p, x, y, w, h, attrs) {
    return NL.h('img.abs', Object.assign({ src: NL.img(p), draggable: 'false', style: { left: x, top: y, width: w, height: h } }, attrs || {}));
  };
  // 透明热区
  NL.hit = function (x, y, w, h, fn, attrs) {
    return NL.h('button.hit', Object.assign({ style: { left: x, top: y, width: w, height: h }, onclick: fn }, attrs || {}));
  };

  // 页面顶上的横幅。里是一张带着页面名的截图;表是一张场景图,页面名用字写在上面(en 是装饰用的英文,zh 是页面名)
  NL.ui.head = function (root, img, x, y, w, hh, en, zh) {
    if (NL.skin() !== 'biao') return root.appendChild(NL.sprite(img, x, y, w, hh));
    document.getElementById('title-tag').textContent = ''; // 页面名写在横幅上了,左上角那块小牌子就不要了
    return root.appendChild(NL.h('div.b-head', { style: { left: x, top: y, width: w, height: hh } },
      img ? NL.h('img', { src: NL.img(img), draggable: 'false' }) : null, NL.h('b', en), NL.h('span', zh)));
  };

  // 战斗的两条横幅(战斗开始、挑战成功)。里是带字的图;表是用字写的
  NL.ui.battleBanner = function (kind, y) {
    const start = kind === 'start';
    if (NL.skin() !== 'biao') return NL.sprite('battle/' + (start ? 'start' : 'win') + '.jpg', 0, y, 360, start ? 160 : 95, { cls: start ? 'bt-start' : 'bt-result' });
    return NL.h('div.bbt.' + (start ? 'bt-start' : 'bt-result'), { style: { top: y, height: start ? 160 : 95 } }, NL.h('i', start ? 'BATTLE START' : 'VICTORY'), NL.h('b', start ? '战斗开始' : '挑战成功'));
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
    bag: {}, guide: null, guideStep: 0, skin: 'li',
  }));
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
  const NAV_ORDER = ['role', 'bag', 'home', 'mission', 'partner'];
  const STAGGER = '.tk-card, .sh-card, .ml-row, .fr-row, .if-row, .tr-row, .plv-row, .pd-card, .ba-zone, .bm-card, .brk-row, .bp-card, .btk-card, .bpf-grid button, .bpf-assets div';
  let lastNav = null;
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
    nav.dataset.on = scr.nav || '';
    if (scr.nav) nav.style.backgroundImage = NL.skin() === 'biao' ? '' : NL.bg('nav/' + scr.nav + '.jpg'); // 表的导航栏是用样式画的
    // 页面可以给表单独写一种画法(renderBiao);没写的就共用同一种,只是素材和样式换了
    (NL.skin() === 'biao' && scr.renderBiao ? scr.renderBiao : scr.render).call(scr, root, top.params || {});
    if (scr.back !== false && !scr.nav) root.appendChild(NL.ui.backBtn());
    if (keepScroll) root.querySelectorAll('[data-keep]').forEach((e) => {
      const k = kept[e.dataset.keep];
      if (k) { e.scrollTop = k[0]; e.scrollLeft = k[1]; }
    });
    if (!keepScroll) { // 切换页面(不是原地刷新)时才播进场;底部页签之间按左右方向滑
      const a = NAV_ORDER.indexOf(lastNav), b = NAV_ORDER.indexOf(scr.nav);
      NL.motion.page(root, a >= 0 && b >= 0 ? Math.sign(b - a) : 0);
      // 表:列表里的卡片依次浮上来(只在进页面时播一次,原地刷新不播)
      if (NL.skin() === 'biao') NL.motion.stagger(root.querySelectorAll(STAGGER), 'rise', 90);
    }
    lastNav = scr.nav || null;
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
  const BACK_SVG = '<svg viewBox="0 0 38 34"><path d="M17 3 3 15l14 12v-7h10V4h8v24H17" fill="none" stroke="#111" stroke-width="6" stroke-linejoin="miter"/><path d="M17 3 3 15l14 12z" fill="#111"/></svg>';
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
        if (opts.beforeClose) opts.beforeClose();
        NL.motion.ghost(el); // 升级动效:留一份不能点的影子播完退场
        el.remove();
        if (opts.onClose) opts.onClose();
      },
    };
    el.addEventListener('click', (e) => { if (e.target === el && opts.dismiss !== false) api.close(); });
    $('#layers').appendChild(el);
    return api;
  };
  // 白底「提示」对话框
  ui.dialog = function (opts) {
    const m = ui.mask({ dismiss: !!opts.dismiss, onClose: opts.onClose });
    const body = h('div.dlg-body', h('div', opts.html ? { html: opts.html } : null, opts.text || null), opts.extra || null);
    const btns = h('div.dlg-btns', (opts.buttons || [{ text: '确认', cls: 'purple' }]).map((b) =>
      h('button.btn.' + (b.cls || 'purple'), { onclick: () => { m.close(); if (b.onClick) b.onClick(); } }, b.text)));
    m.el.appendChild(h('div.dlg', { style: { top: opts.top == null ? 320 : opts.top } }, h('div.dlg-head'), body, btns));
    return m;
  };
  ui.confirm = function (html, onOk, o) {
    o = o || {};
    return ui.dialog({ html, buttons: [{ text: o.cancelText || '取消', cls: 'pink', onClick: o.onCancel }, { text: o.okText || '确认', cls: 'purple', onClick: onOk }] });
  };
  // 紫色标题弹窗。录屏里所有弹窗都以 y=403 为中心上下居中,所以给总高度 h 就行;
  // dark 是深色那一套(邮件、设置、绑定),标题条和底边取自录屏
  ui.win = function (opts) {
    const m = ui.mask({ onClose: opts.onClose, dismiss: opts.dismiss });
    const body = h('div.win-body', opts.bodyAttrs || null);
    const hh = opts.h || 448;
    const win = h('div.win' + (opts.dark ? '.dark' : ''), { style: { top: opts.top == null ? Math.round(403 - hh / 2) : opts.top, height: hh } },
      h('div.win-head', opts.title || '', h('button.win-close', { onclick: () => m.close() })), body, opts.dark ? h('div.win-foot') : null);
    if (opts.cls) win.classList.add(opts.cls);
    m.el.appendChild(win);
    if (opts.hint !== false) m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: opts.hintTop || 686, textAlign: 'center', margin: 0 } }, '点击空白处关闭。'));
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
  // 奖励飞到哪:信用点、储值、体力飞向页面上对应的资源栏,其余飞向底部导航的「仓库」
  const FLY_TO = { credit: 'ico_coin', gem: 'ico_gem', energy: 'ico_bolt' };
  function flyTarget(id) {
    const img = FLY_TO[id] && $('#screen .pill img[src*="' + FLY_TO[id] + '"]');
    if (img) return img.parentNode;
    const nav = $('#nav');
    return nav.classList.contains('off') ? null : nav.querySelector('[data-nav=' + (id === 'exp' ? 'role' : 'bag') + ']');
  }
  ui.reward = function (items, onDone) {
    let from = [];
    const cells = items.map((it, i) => { const el = ui.itemEl(it.id, it.n); el.style.setProperty('--i', Math.min(i, 12)); return el; });
    const m = ui.mask({
      beforeClose() { from = cells.map((el) => ({ rect: el.getBoundingClientRect(), image: el.style.backgroundImage })); },
      onClose() {
        if (onDone) onDone(); // 这里页面已经刷新,资源栏是新的
        if (!NL.motion.on()) return;
        const s = $('#stage').getBoundingClientRect(), k = NL.scale || 1;
        items.slice(0, 8).forEach((it, i) => {
          const to = flyTarget(it.id), r = from[i].rect;
          if (to && r.width) NL.motion.fly({ x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k }, to, { image: from[i].image, delay: i * 45 });
        });
      },
    });
    const body = h('div.reward-body', cells);
    body.style.setProperty('--step', Math.max(15, Math.min(80, 600 / Math.max(1, items.length))) + 'ms');
    m.el.appendChild(h('div.reward',
      h('div.reward-head'),
      body,
      h('button.reward-ok', { onclick: () => m.close() }, '确认')));
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 628, textAlign: 'center', margin: 0 } }, '点击空白处关闭。'));
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
      h('div.p-box'), h('div.p-top', '战力'), h('div.p-flame', '💥'),
      h('div.p-num'), h('div.p-txt', delta > 0 ? '战力提升！' : '战力下降'));
    const num = el.querySelector('.p-num'), sign = delta > 0 ? '+' : '-', abs = Math.abs(Math.round(delta));
    // 原版这个数字是滚动着涨上去的;升级档换成每一位各自滚动的数字
    if (NL.motion.on()) NL.motion.odometer(num, sign + abs);
    else NL.motion.count(num, 0, abs, 900, (v) => sign + v);
    $('#layers').appendChild(el);
    setTimeout(() => el.remove(), 2300);
  };
  function numEl(key, value) { // 资源栏的数字:变了就从旧值滚到新值
    const el = h('span');
    NL.motion.number(el, key, value);
    return el;
  }
  ui.pill = function (icon, value, x, y, extra) {
    return h('div.pill' + (extra && extra.cls ? '.' + extra.cls : ''), { style: { left: x, top: y, minWidth: (extra && extra.w) || 92 }, onclick: extra && extra.onclick },
      h('img', { src: NL.img(icon), draggable: 'false' }), numEl(icon, value),
      extra && extra.plus ? h('img.plus', { src: NL.img('home/ico_plus.webp'), draggable: 'false' }) : null);
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
    const mo = /[?&]motion=(plus|orig)\b/.exec(location.search); // 地址里可以直接指定动效档
    if (mo) NL.state.motion = mo[1];
    const sk = /[?&]skin=(biao|li)\b/.exec(location.search); // 也可以直接指定皮肤
    const ex = /[?&]ext=([01])\b/.exec(location.search); // 扩展玩法的开关
    if (ex) { NL.state.ext = ex[1] === '1'; NL.save(); }
    if (sk) NL.state.skin = sk[1];
    NL.applySkin();
    NL.bootHooks.forEach((f) => f()); // 各模块在存档读好之后要做的初始化
    const nav = $('#nav');
    ['role', 'bag', 'home', 'mission', 'partner'].forEach((n) => nav.appendChild(h('button', { 'data-nav': n, onclick: () => NL.go(n) })));
    setInterval(game.tickEnergy, 1000);
    game.tickEnergy();
    const start = location.hash.slice(1);
    if (!(start && NL.screens[start] && NL.go(start))) NL.go('login');
  };
})();
