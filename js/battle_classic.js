/* 原版战斗:两个头像自动对撞,玩家只能看。照录屏 4:29–4:37 那一场复刻:
 *   0.0  「战斗开始」横幅,场景压暗
 *   2.0  横幅收起,露出霓虹网格隧道
 *   3.0  双方头像带着青色像素块翻进来
 *   3.7 / 4.17 / 4.64  对撞三次,每次有白黄色闪光和火花
 *   5.0  输的一方飘到正中
 *   5.5  发光、缩小、翻面
 *   6.3  碎成绿色像素块
 *   8.0  「挑战成功 / 挑战失败」和奖励
 * 胜负规则和节拍对决里「什么都不点」时一样:战力不低于对手就赢。
 * 原版战斗只有音乐没有音效,这里也不加。
 */
(function () {
  'use strict';
  const h = NL.h, ui = NL.ui, game = NL.game, A = NL.audio;
  const HOME = [[114, 497], [247, 307]]; // 我方、对手的头像中心
  const MID = [180, 402];
  const T = { banner: 2.0, appear: 3.0, hits: [3.7, 4.17, 4.64], drift: 5.0, glow: 5.5, burst: 6.3, result: 8.0 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (u) => 1 - Math.pow(1 - u, 3), easeIn = (u) => u * u, easeIO = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

  // 霓虹网格隧道:一圈圈旋转着向外放大的方框,加上连接相邻两圈的纵线
  function tunnel(cv) {
    const g = cv.getContext('2d');
    const RINGS = 17, SEG = 8, GROW = 1.21, BASE = 76;
    return function draw(t, sx, sy) {
      g.setTransform(2, 0, 0, 2, 0, 0);
      g.fillStyle = '#0b0911';
      g.fillRect(0, 0, 360, 781);
      const grad = g.createLinearGradient(0, 0, 0, 781);
      [[0, '#ff3a1a'], [0.1, '#ff3a1a'], [0.17, '#b01ae8'], [0.5, '#7d3df2'], [0.83, '#b01ae8'], [0.9, '#ff3a1a'], [1, '#ff3a1a']].forEach(([p, c]) => grad.addColorStop(p, c));
      g.translate(MID[0] + sx, MID[1] + sy);
      const flow = (t * 0.3) % 1, rot = 0.13 + Math.sin(t * 0.45) * 0.09;
      const ring = (k) => { const kk = k + flow; return [BASE * Math.pow(GROW, kk), rot + kk * 0.026]; };
      const pt = (s, a, e, u) => { // 方框第 e 条边上 u 处的点
        const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]], p = c[e], q = c[(e + 1) % 4];
        const x = (p[0] + (q[0] - p[0]) * u) * s, y = (p[1] + (q[1] - p[1]) * u) * s, co = Math.cos(a), si = Math.sin(a);
        return [x * co - y * si, x * si + y * co];
      };
      g.beginPath();
      for (let k = 0; k < RINGS; k++) {
        const [s, a] = ring(k), [s2, a2] = ring(k + 1);
        for (let e = 0; e < 4; e++) {
          const p0 = pt(s, a, e, 0), p1 = pt(s, a, e, 1);
          g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
          for (let j = 0; j < SEG; j++) { const u = j / SEG, m = pt(s, a, e, u), n = pt(s2, a2, e, u); g.moveTo(m[0], m[1]); g.lineTo(n[0], n[1]); }
        }
      }
      g.setTransform(2, 0, 0, 2, 0, 0); // 颜色按屏幕上下位置变:中间紫,上下两端红
      g.strokeStyle = grad; g.lineWidth = 1.1; g.shadowColor = '#a020f0'; g.shadowBlur = 5;
      g.stroke();
      g.shadowBlur = 0;
      g.translate(MID[0] + sx, MID[1] + sy);
      g.rotate(rot);
      g.fillStyle = '#0d0b12';
      g.fillRect(-BASE, -BASE, BASE * 2, BASE * 2);
      g.strokeStyle = '#8f86ee'; g.lineWidth = 1.2;
      g.strokeRect(-BASE, -BASE, BASE * 2, BASE * 2);
    };
  }

  // opts: {enemy:{name, lv, power}, rewards, onEnd(win)}
  ui.battleClassic = function (opts) {
    const s = NL.state, e = opts.enemy, myPower = game.power();
    const win = game.fightAuto(game.fightPlan(myPower, e.power), [1000, 1000], 0).win;
    const loser = win ? 1 : 0;
    let t0 = null, raf = 0, closed = false, resultShown = false, hiddenAt = 0, last = 0, trauma = 0;
    const fired = {};

    const cv = h('canvas.btc-grid', { width: 720, height: 1562 });
    const draw = tunnel(cv);
    const av = ['me', 'enemy'].map((n) => h('div.btc-av', { style: { backgroundImage: NL.bg('battle/' + n + '.jpg') } }));
    const fx = h('div.btc-fx');
    const dim = h('div.btc-dim');
    const banner = ui.battleBanner('start', 320);
    const biao = NL.skin() === 'biao'; // 上下两条警示带:里是截图,表用样式画
    const card = (i, name, lv, power) => h('div.bt-card.' + (i ? 'foe' : 'me'), h('b', name), h('i', '等级:' + lv), h('span', '战力'), h('em', NL.fmt.power(power)));
    const el = h('div.battle.classic', cv,
      biao ? h('div.bbt-band', { style: { top: 100, height: 86 } }) : NL.sprite('battle/band_top.jpg', 0, 100, 360, 86), biao ? h('div.bbt-band', { style: { top: 643, height: 81 } }) : NL.sprite('battle/band_bot.jpg', 0, 643, 360, 81),
      card(1, e.name, e.lv, e.power), card(0, s.name, s.level, myPower),
      av[0], av[1], fx, dim, banner,
      h('button.bt-skip', { 'data-act': 'skip', onclick: (ev) => { ev.stopPropagation(); skip(); } }, '跳过战斗'));
    el.dataset.renderer = 'classic';
    document.querySelector('#layers').appendChild(el);

    const now = () => (NL.testClock != null ? NL.testClock : (performance.now() - t0) / 1000);

    /* ----- 粒子:像素块和火花,都是小 div ----- */
    const parts = [];
    function spawn(kind, x, y, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = kind === 'spark' ? 30 + Math.random() * 150 : 60 + Math.random() * 190;
        const size = kind === 'spark' ? 12 + Math.random() * 26 : kind === 'green' ? 9 + Math.random() * 30 : 6 + Math.random() * 18;
        const spread = kind === 'spark' ? 120 : 50;
        const node = h('i.' + kind, { style: { width: size, height: size } });
        fx.appendChild(node);
        parts.push({ node, x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'green' ? 40 : 0),
          g: kind === 'green' ? 260 : 0, age: 0, life: kind === 'spark' ? 0.45 + Math.random() * 0.4 : kind === 'green' ? 0.6 + Math.random() * 0.6 : 0.3 + Math.random() * 0.25, size });
      }
    }
    function flash(x, y) {
      const node = h('i.flash', { style: { left: x - 90, top: y - 90 } });
      fx.appendChild(node);
      setTimeout(() => node.remove(), 320);
    }
    function stepParts(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) { p.node.remove(); parts.splice(i, 1); continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const k = Math.pow(0.12, dt); p.vx *= k; if (!p.g) p.vy *= k;
        p.node.style.transform = 'translate(' + (p.x - p.size / 2) + 'px,' + (p.y - p.size / 2) + 'px)';
        p.node.style.opacity = String(clamp((p.life - p.age) / 0.25, 0, 1));
      }
    }
    const once = (key, fn) => { if (!fired[key]) { fired[key] = true; fn(); } };

    /* ----- 每一帧:位置只由时间决定 ----- */
    function pose(i, t) {
      const hm = HOME[i];
      const dx = MID[0] - hm[0], dy = MID[1] - hm[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const reach = len - 50; // 对撞时离正中 50,两个头像刚好贴上
      let adv = 0, sc = 1, flip = 1, glow = 0, vis = t >= T.appear;
      const a = clamp((t - T.appear) / 0.45, 0, 1);
      sc *= 0.3 + 0.7 * easeOut(a); flip = Math.cos((1 - easeOut(a)) * Math.PI * 1.5); // 翻着进来
      T.hits.forEach((th) => {
        if (t >= th - 0.16 && t < th) adv = Math.max(adv, reach * easeIn((t - (th - 0.16)) / 0.16));
        else if (t >= th && t < th + 0.3) adv = Math.max(adv, reach * (1 - easeOut((t - th) / 0.3)) - 9 * Math.sin(Math.PI * (t - th) / 0.3));
      });
      let x = hm[0] + ux * adv, y = hm[1] + uy * adv;
      if (i === loser && t >= T.drift) {
        const d = easeIO(clamp((t - T.drift) / (T.glow - T.drift), 0, 1));
        x = hm[0] + dx * d; y = hm[1] + dy * d;
        const gl = clamp((t - T.glow) / (T.burst - T.glow), 0, 1);
        glow = gl; sc *= 1 - 0.22 * gl;
        if (gl > 0.78) flip *= Math.cos(((gl - 0.78) / 0.22) * Math.PI * 0.5);
        if (t >= T.burst) vis = false;
      }
      return { x, y, sc, flip, glow, vis };
    }
    function frame() {
      if (closed) return;
      const t = now(), dt = clamp(t - last, 0, 0.05);
      last = t;
      if (t >= T.banner) { banner.classList.add('out'); dim.classList.add('out'); }
      if (t >= T.appear) once('appear', () => HOME.forEach((p) => spawn('cyan', p[0], p[1], 9)));
      T.hits.forEach((th, k) => { if (t >= th) once('hit' + k, () => { trauma = Math.min(1, trauma + 0.6); flash(MID[0], MID[1]); spawn('spark', MID[0], MID[1], 16); }); });
      if (t >= T.burst) once('burst', () => { trauma = Math.min(1, trauma + 0.4); spawn('green', MID[0], MID[1], 16); });
      trauma = Math.max(0, trauma - dt * 1.6);
      const amp = NL.motion.reduced() ? 0 : trauma * trauma * 7;
      draw(t, Math.sin(t * 71) * amp, Math.cos(t * 83) * amp);
      av.forEach((node, i) => {
        const p = pose(i, t);
        node.style.display = p.vis ? '' : 'none';
        node.style.transform = 'translate(' + (p.x - 56) + 'px,' + (p.y - 56) + 'px) scale(' + p.sc * p.flip + ',' + p.sc + ')';
        node.style.filter = p.glow ? 'brightness(' + (1 + p.glow * 1.6) + ') saturate(' + (1 - p.glow * 0.5) + ')' : '';
        node.style.boxShadow = p.glow ? '0 0 ' + (10 + p.glow * 26) + 'px ' + (2 + p.glow * 8) + 'px rgba(255,190,200,' + (0.4 + p.glow * 0.5) + ')' : '';
      });
      stepParts(dt);
      if (t >= T.result) showResult();
      raf = requestAnimationFrame(frame);
    }

    /* ----- 结束 ----- */
    function showResult() {
      if (resultShown) return;
      resultShown = true;
      const rewards = win ? opts.rewards || [] : [];
      const delta = rewards.length ? game.grant(rewards) : 0;
      av[loser].style.display = 'none';
      el.classList.add('over');
      el.appendChild(win ? ui.battleBanner('win', 235) : h('div.bt-lose.bt-result', '挑战失败'));
      el.appendChild(h('div.bt-items', rewards.map((r) => ui.itemEl(r.id, r.n))));
      el.appendChild(h('div.bt-hint', '点击空白处关闭。'));
      A.battleDuck(0.45);
      const shownAt = performance.now(); // 结算刚弹出的 0.3 秒内不响应,免得连点时误关
      el.addEventListener('click', () => { if (performance.now() - shownAt > 300) close(delta); });
    }
    function skip() {
      banner.classList.add('out'); dim.classList.add('out');
      showResult();
    }
    function close(delta) {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      A.battleEnd();
      el.remove();
      NL.refresh();
      if (delta) ui.powerUp(delta);
      if (opts.onEnd) opts.onEnd(win);
    }
    function onVis() { // 切到后台时把时钟停住
      if (t0 == null) return;
      if (document.hidden) hiddenAt = performance.now();
      else if (hiddenAt) { t0 += performance.now() - hiddenAt; hiddenAt = 0; }
    }
    document.addEventListener('visibilitychange', onVis);

    draw(0, 0, 0);
    A.battleStart().then((m) => {
      if (closed) return;
      t0 = m != null ? m : performance.now();
      frame();
    });
  };

  // 默认是 3D 节拍对决(业主定的);设置里关掉「3D 节拍对决」就换回原版的自动对撞
  NL.defaults.push(() => ({ beat: true }));
  ui.battle = function (opts) {
    const run = () => (NL.state.beat ? ui.battleBeat(opts) : ui.battleClassic(opts));
    NL.motion.pixels({ mode: 'radial', ms: 640, onMid: run }); // 原版档或减少动态效果时会直接进
  };
})();
