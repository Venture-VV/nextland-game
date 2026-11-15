/* 动效套件。每种做法的来由和参数见 docs/MOTION.md。
 *
 * 两档(存档里的 motion):
 *   plus  升级动效(默认):弹窗弹入和退场影子、奖励依次弹出并飞向资源栏、数字滚动、
 *         地图惯性与回弹、像素块转场、抽卡编排、按下反馈、流光描边……
 *   orig  原版动效:照录屏。量过每秒 15 帧的录屏,原版的弹窗和页面都是直接出现的,
 *         只有浮动提示从左滑入、奖励图标淡入、「战力提升」的数字滚动。
 * 系统开了「减少动态效果」时,两档都只留透明度变化,没有位移、缩放、回弹、循环和震屏。
 *
 * 只动 transform / opacity / filter;不依赖动画库。
 */
(function () {
  'use strict';
  const M = (NL.motion = {});
  const h = NL.h;
  NL.defaults.push(() => ({ motion: 'plus' }));

  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  // NL.testReduced:走查脚本用它模拟「减少动态效果」
  M.reduced = () => !!(NL.testReduced != null ? NL.testReduced : mq.matches);
  M.plus = () => !NL.state || NL.state.motion !== 'orig';
  M.on = () => M.plus() && !M.reduced(); // 可以放开做位移和缩放
  M.apply = function () {
    const r = document.documentElement;
    r.dataset.motion = M.plus() ? 'plus' : 'orig';
    r.classList.toggle('reduced', M.reduced());
  };
  NL.bootHooks.push(M.apply);
  if (mq.addEventListener) mq.addEventListener('change', M.apply);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const layers = () => document.querySelector('#layers');
  const stageRect = () => document.querySelector('#stage').getBoundingClientRect();
  // 屏幕坐标 → 舞台坐标(舞台是整体缩放过的)
  const local = (r) => { const s = stageRect(), k = NL.scale || 1; return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k }; };

  /* ---------- 弹簧 ---------- */
  // 用「周期」和「回弹」两个量调:ω = 2π/周期,ζ = 1 - 回弹
  M.PRESET = { snap: [0.35, 0.1], smooth: [0.5, 0], bouncy: [0.55, 0.35], heavy: [0.8, 0.1] };
  function springStep(st, to, k, c, dt) { // 按约 240Hz 分小步积分,帧率掉了也稳
    for (let t = 0; t < dt; t += 1 / 240) { const hh = Math.min(1 / 240, dt - t); st.v += (-k * (st.x - to) - c * st.v) * hh; st.x += st.v * hh; }
  }
  // opts: {from, to, preset | period+bounce, velocity, onUpdate(x), onDone}。动到一半可以 set(新目标),带着当前速度拐过去
  M.spring = function (opts) {
    const [T, B] = opts.preset ? M.PRESET[opts.preset] : [opts.period || 0.5, opts.bounce || 0];
    const w = (2 * Math.PI) / T, k = w * w, c = 2 * (1 - B) * w;
    const st = { x: opts.from, v: opts.velocity || 0 };
    let to = opts.to, last = performance.now(), raf = 0, done = false;
    const span = Math.max(1e-6, Math.abs(opts.to - opts.from));
    function tick(now) {
      const dt = clamp((now - last) / 1000, 0, 0.064);
      last = now;
      springStep(st, to, k, c, dt);
      if (Math.abs(st.x - to) < 0.001 * span && Math.abs(st.v) < 0.01 * span) { st.x = to; done = true; }
      opts.onUpdate(st.x);
      if (done) { if (opts.onDone) opts.onDone(); } else raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return {
      set(t) { to = t; if (done) { done = false; last = performance.now(); raf = requestAnimationFrame(tick); } },
      stop() { cancelAnimationFrame(raf); done = true; },
      get value() { return st.x; },
    };
  };
  // 把弹簧按 20ms 采样成 CSS 的 linear() 曲线,给 Web Animations 用;浏览器不认 linear() 时退回贝塞尔
  const easeCache = {};
  const hasLinear = !!(window.CSS && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)'));
  const FALLBACK = { snap: 'cubic-bezier(0.2, 0, 0, 1)', smooth: 'cubic-bezier(0.4, 0, 0.2, 1)', bouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1)', heavy: 'cubic-bezier(0.2, 0, 0, 1)' };
  M.ease = function (name) {
    if (!hasLinear) return { easing: FALLBACK[name], ms: Math.round(M.PRESET[name][0] * 1000) };
    if (easeCache[name]) return easeCache[name];
    const [T, B] = M.PRESET[name], w = (2 * Math.PI) / T, k = w * w, c = 2 * (1 - B) * w;
    const st = { x: 0, v: 0 }, pts = [0];
    let t = 0;
    while (t < 1.2) { springStep(st, 1, k, c, 0.02); t += 0.02; pts.push(st.x); if (Math.abs(st.x - 1) < 0.002 && Math.abs(st.v) < 0.02) break; }
    pts[pts.length - 1] = 1;
    return (easeCache[name] = { easing: 'linear(' + pts.map((p) => p.toFixed(3)).join(',') + ')', ms: Math.round(t * 1000) });
  };
  const anim = (el, frames, o) => { try { return el.animate(frames, o); } catch (e) { return null; } };

  /* ---------- 进场、退场、依次出现 ---------- */
  const ENTER = {
    pop: [{ transform: 'scale(.9) translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    rise: [{ transform: 'translateY(18px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    drop: [{ transform: 'translateY(-14px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    left: [{ transform: 'translateX(-22px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    right: [{ transform: 'translateX(22px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    fade: [{ opacity: 0 }, { opacity: 1 }],
  };
  // 返回实际用了哪一种(走查用):none / fade / kind
  M.enter = function (el, kind, delay) {
    if (!el) return 'none';
    if (!M.plus()) return 'none';
    if (M.reduced()) { anim(el, ENTER.fade, { duration: 150, delay: delay || 0, fill: 'backwards' }); return 'fade'; }
    const e = M.ease(kind === 'pop' ? 'bouncy' : 'snap');
    anim(el, ENTER[kind] || ENTER.fade, { duration: e.ms, easing: e.easing, delay: delay || 0, fill: 'backwards' });
    return kind;
  };
  // 每项延迟 = clamp(0.6/项数, 0.015, 0.08) 秒,只带前 12 项
  M.stagger = function (nodes, kind, base) {
    const list = Array.prototype.slice.call(nodes);
    const step = clamp(0.6 / Math.max(1, list.length), 0.015, 0.08) * 1000;
    list.forEach((el, i) => M.enter(el, kind || 'rise', (base || 0) + Math.min(i, 12) * step));
  };
  // 退场影子:真的元素马上移除(后面立刻能点),留一份不能点的副本播完退场
  M.ghost = function (el) {
    if (!M.plus() || !el || !el.parentNode) return null;
    const g = el.cloneNode(true);
    g.classList.add('m-ghost');
    g.removeAttribute('id');
    g.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    el.parentNode.appendChild(g);
    const inner = g.firstElementChild;
    if (inner && !M.reduced()) anim(inner, [{ transform: 'none' }, { transform: 'scale(.95) translateY(6px)' }], { duration: 180, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });
    anim(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'linear', fill: 'forwards' });
    setTimeout(() => g.remove(), 200);
    return g;
  };
  // 页面切换:dir 是 -1 / 0 / 1(底部页签往左、普通进入、往右)
  M.page = function (root, dir) {
    if (!M.plus()) return;
    if (M.reduced()) { anim(root, ENTER.fade, { duration: 140 }); return; }
    const e = M.ease('snap');
    anim(root, [{ transform: dir ? 'translateX(' + dir * 16 + 'px)' : 'translateY(10px)', opacity: 0.25 }, { transform: 'none', opacity: 1 }], { duration: Math.min(e.ms, 320), easing: e.easing });
  };

  /* ---------- 数字 ---------- */
  const shown = {};
  // 记住每个资源栏上次显示的数,变了就从旧值滚到新值
  M.number = function (el, key, value, fmt) {
    fmt = fmt || String;
    const prev = shown[key];
    shown[key] = value;
    if (!M.plus() || prev == null || prev === value || typeof value !== 'number') { el.textContent = fmt(value); return; }
    M.count(el, prev, value, 650, fmt, 220);
  };
  M.forget = () => Object.keys(shown).forEach((k) => delete shown[k]);
  // 数值从 a 滚到 b
  M.count = function (el, a, b, ms, fmt, delay) {
    fmt = fmt || String;
    if (M.reduced()) { el.textContent = fmt(b); return; }
    el.textContent = fmt(a);
    const t0 = performance.now() + (delay || 0);
    let seen = false; // 调用时元素多半还没挂到页面上,所以等它挂上过一次之后再判断「页面已经换掉了」
    requestAnimationFrame(function tick(now) {
      if (el.isConnected) seen = true; else if (seen || now - t0 > 3000) return;
      const u = clamp((now - t0) / ms, 0, 1), e = 1 - Math.pow(1 - u, 3);
      el.textContent = fmt(Math.round(a + (b - a) * e));
      if (u < 1) requestAnimationFrame(tick);
    });
  };
  // 滚动数字:每一位是一条 0~9 的竖带,各位之间错开 0.04 秒
  M.odometer = function (el, text) {
    el.textContent = '';
    el.classList.add('m-odo');
    const e = M.ease('bouncy');
    let k = 0;
    String(text).split('').reverse().forEach((ch) => {
      if (!/\d/.test(ch)) { el.insertBefore(h('span', ch), el.firstChild); return; }
      const col = h('i', '0123456789'.split('').map((d) => h('b', d)));
      const cell = h('span.d', col);
      el.insertBefore(cell, el.firstChild);
      const to = 'translateY(' + -ch * 10 + '%)';
      if (M.reduced()) col.style.transform = to;
      else anim(col, [{ transform: 'translateY(' + -((+ch + 7) % 10) * 10 + '%)', filter: 'blur(1.5px)' }, { transform: to, filter: 'none' }], { duration: Math.max(700, e.ms), easing: e.easing, delay: 120 + k * 40, fill: 'both' });
      k++;
    });
  };

  /* ---------- 飞行(共享元素的简化版):一个图标从 A 飞到 B ---------- */
  // from / to:元素或 {x,y,w,h}(舞台坐标)。o: {image, delay, onArrive}
  M.fly = function (from, to, o) {
    o = o || {};
    if (!M.on()) { if (o.onArrive) setTimeout(o.onArrive, 0); return; }
    const a = from.getBoundingClientRect ? local(from.getBoundingClientRect()) : from;
    const b = to.getBoundingClientRect ? local(to.getBoundingClientRect()) : to;
    if (!a.w || !b.w) { if (o.onArrive) o.onArrive(); return; }
    const img = o.image || (from.style && from.style.backgroundImage) || '';
    const node = h('div.m-fly', { style: { left: a.x, top: a.y, width: a.w, height: a.h, backgroundImage: img } });
    layers().appendChild(node);
    const dx = b.x + b.w / 2 - (a.x + a.w / 2), dy = b.y + b.h / 2 - (a.y + a.h / 2), sc = clamp(b.w / a.w, 0.25, 1.2);
    const lift = -Math.min(60, 20 + Math.hypot(dx, dy) * 0.18); // 中途抬高一点,走弧线
    const an = anim(node, [
      { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0 },
      { transform: 'translate(' + dx * 0.45 + 'px,' + (dy * 0.45 + lift) + 'px) scale(' + (1 + (sc - 1) * 0.3) * 1.12 + ')', opacity: 1, offset: 0.45 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')', opacity: 0.85, offset: 1 },
    ], { duration: 520, delay: o.delay || 0, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both' });
    const end = () => { node.remove(); if (to.animate && M.on()) anim(to, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' }); if (o.onArrive) o.onArrive(); };
    if (an) an.onfinish = end; else end();
  };

  /* ---------- 像素块转场:先用色块盖住旧画面,盖满时换内容,再让色块消失 ---------- */
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  // o: {mode: 'random' | 'dither' | 'radial' | 'wipe', x, y, colors, ms, onMid}
  M.pixels = function (o) {
    o = o || {};
    if (!M.on()) { // 减少动态效果或原版档:直接换,最多淡一下
      if (o.onMid) o.onMid();
      return;
    }
    const COLS = 12, cell = 360 / COLS, ROWS = Math.ceil(781 / cell);
    const cv = h('canvas.m-pixels', { width: 360, height: 781 });
    const g = cv.getContext('2d');
    layers().appendChild(cv);
    const colors = o.colors || ['#0d0a14', '#0d0a14', '#0d0a14', '#17102a', '#6c16ff', '#f414dc', '#3ff0f0'];
    const ox = o.x == null ? 180 : o.x, oy = o.y == null ? 390 : o.y, far = Math.hypot(Math.max(ox, 360 - ox), Math.max(oy, 781 - oy));
    const cells = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const rnd = Math.abs(Math.sin(c * 127.1 + r * 311.7) * 43758.5453) % 1;
      let d = rnd;
      if (o.mode === 'dither') d = BAYER[(r % 4) * 4 + (c % 4)] / 16 + rnd / 16;
      else if (o.mode === 'radial') d = (Math.hypot((c + 0.5) * cell - ox, (r + 0.5) * cell - oy) / far) * 0.7 + rnd * 0.3;
      else if (o.mode === 'wipe') d = (r / ROWS) * 0.7 + rnd * 0.3;
      cells.push({ c, r, d: d * 0.8, col: colors[Math.floor(rnd * 997) % colors.length] });
    }
    const half = (o.ms || 800) / 2;
    const t0 = performance.now();
    let mid = false;
    (function tick(now) {
      const t = now - t0, phase = t < half ? 0 : 1, p = phase ? (t - half) / half : t / half;
      if (phase && !mid) { mid = true; if (o.onMid) o.onMid(); }
      g.clearRect(0, 0, 360, 781);
      cells.forEach((q) => {
        const u = clamp((p - q.d) / 0.2, 0, 1), a = phase ? 1 - u : u; // 每格用 0.2 的时间长出来或缩回去
        if (a <= 0) return;
        const s = cell * a + 0.6;
        g.fillStyle = a < 1 ? q.col : '#0d0a14';
        g.fillRect((q.c + 0.5) * cell - s / 2, (q.r + 0.5) * cell - s / 2, s, s);
      });
      if (t < half * 2) requestAnimationFrame(tick); else cv.remove();
    })(t0);
  };

  /* ---------- 震屏(创伤值的平方决定幅度)、顿帧 ---------- */
  let trauma = 0, shaking = false;
  M.shake = function (amount) {
    if (!M.on()) return;
    trauma = Math.min(1, trauma + amount);
    if (shaking) return;
    shaking = true;
    const el = document.querySelector('#screen');
    let last = performance.now();
    (function tick(now) {
      trauma = Math.max(0, trauma - ((now - last) / 1000) * 1.2);
      last = now;
      const a = trauma * trauma * 7;
      el.style.translate = a ? Math.sin(now * 0.071) * a + 'px ' + Math.cos(now * 0.083) * a + 'px' : '';
      if (trauma > 0) requestAnimationFrame(tick); else shaking = false;
    })(last);
  };

  /* ---------- 倾斜与高光(立绘卡、装备图用;手指或鼠标在卡片上移动时跟着转) ---------- */
  M.tilt = function (el, max) {
    max = max || 12;
    let sx = null, sy = null;
    const set = () => { el.style.transform = 'perspective(600px) rotateX(' + sx.value + 'deg) rotateY(' + sy.value + 'deg)'; };
    const to = (rx, ry) => {
      if (!M.on()) return;
      if (!sx) { sx = M.spring({ from: 0, to: rx, preset: 'snap', onUpdate: set }); sy = M.spring({ from: 0, to: ry, preset: 'snap', onUpdate: set }); } else { sx.set(rx); sy.set(ry); }
    };
    el.classList.add('m-tilt');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      to(-(py - 0.5) * max, (px - 0.5) * max);
      el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
    });
    ['pointerleave', 'pointerup', 'pointercancel'].forEach((n) => el.addEventListener(n, () => to(0, 0)));
  };

  /* ---------- 拖动:橡皮筋和惯性 ---------- */
  // 拖过边界时越拖越费劲
  M.rubber = (over, limit) => limit * (1 - 1 / ((Math.abs(over) * 0.55) / limit + 1)) * Math.sign(over);
  // 松手后速度按 e^(-t/τ) 衰减,τ = 0.325 秒;到边用弹簧拉回。pos 是 [x, y],min/max 是边界,apply() 把 pos 画出来
  M.glide = function (pos, vel, min, max, apply) {
    const TAU = 0.325;
    let last = performance.now(), raf = 0, stopped = false;
    const st = [{ x: pos[0], v: vel[0] }, { x: pos[1], v: vel[1] }];
    const w = (2 * Math.PI) / 0.5, k = w * w, c = 2 * w; // 「平顺」弹簧
    (function tick(now) {
      if (stopped) return;
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      let moving = false;
      st.forEach((a, i) => {
        const lim = a.x < min[i] ? min[i] : a.x > max[i] ? max[i] : null;
        if (lim != null) springStep(a, lim, k, c, dt); else { a.v *= Math.exp(-dt / TAU); a.x += a.v * dt; }
        pos[i] = a.x;
        if (Math.abs(a.v) > 4 || (lim != null && Math.abs(a.x - lim) > 0.3)) moving = true;
        else if (lim != null) pos[i] = a.x = lim;
      });
      apply();
      if (moving) raf = requestAnimationFrame(tick);
    })(last);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  };

  /* ---------- 点触反馈:点到的地方冒一个小光圈 ---------- */
  document.addEventListener('pointerdown', (e) => {
    if (!M.on() || !NL.scale) return;
    const s = stageRect(), x = (e.clientX - s.left) / NL.scale, y = (e.clientY - s.top) / NL.scale;
    if (x < 0 || y < 0 || x > 360 || y > 781) return;
    const dot = h('i.m-tap', { style: { left: x, top: y } });
    layers().appendChild(dot);
    setTimeout(() => dot.remove(), 420);
  }, true);
})();
