/* 扩展玩法:网页版新加的,原版(录屏)里没有。
 *
 *   调频密码  互动窗口里的按钮。三个旋钮调频率、振幅、相位,30 秒内把自己的波形调到和目标重合
 *   涂鸦暗号  互动窗口里的按钮。九宫格亮起一串涂鸦,照顺序点回去,每过一轮多一格
 *   园区巡游  主页上每天 3 个光点,点到会遇见一位伙伴,二选一,加信任值
 *   伙伴援护  3D 节拍对决里,能量满时放的不是「爆发」而是信任等级最高的伙伴的援护,等级越高越疼
 *
 * 全都在「设置 → 扩展玩法」开关后面(地址后加 ?ext=1 也行),默认关。关着的时候,这个文件什么都不做,
 * 游戏和原版一样。两种皮肤共用这一份规则;产出有每日上限,不超过原有玩法一天的产出。 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;
  const TUNE_MAX = 3, TAG_MAX = 1;                          // 每天能领奖的次数
  const TUNE_REWARD = [{ id: 'credit', n: 30 }, { id: 'crystal', n: 5 }];
  const TAG_REWARD = [{ id: 'gift_green', n: 1 }];
  const TUNE_SEC = 30, TUNE_OK = 93, TAG_ROUNDS = 4;       // 调频:限时、判定重合的百分比;涂鸦:过几轮算赢

  NL.defaults.push(() => ({ ext: false, extDay: { date: '', tune: 0, tag: 0, patrol: null } }));
  const today = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function day() {
    const s = NL.state;
    if (!s.extDay || s.extDay.date !== today()) s.extDay = { date: today(), tune: 0, tag: 0, patrol: null };
    return s.extDay;
  }
  const X = (NL.ext = { on: () => !!NL.state.ext, debug: {} });

  /* ---------- 调频密码 ---------- */
  const wave = (p, x) => p.a * Math.sin(2 * Math.PI * p.f * x + p.p);
  function match(a, b) { // 两条波形有多像,0~100
    let e = 0;
    for (let i = 0; i < 64; i++) { const d = wave(a, i / 63) - wave(b, i / 63); e += d * d; }
    return Math.max(0, Math.round((1 - Math.sqrt(e / 64) / 0.8) * 100));
  }
  X.tune = function () {
    const d = day();
    const snap = (v, step) => Math.round(v / step) * step;
    let target, mine, left, timer = 0, done = false;
    const cv = h('canvas.xt-wave', { width: 596, height: 300 });
    const pct = h('b', '0%'), bar = h('i'), clock = h('em', TUNE_SEC + ' 秒');
    const KNOBS = [['f', '频率', 1, 6, 0.05], ['a', '振幅', 0.2, 1, 0.01], ['p', '相位', 0, 6.28, 0.02]];
    const inputs = KNOBS.map(([k, , min, max, step]) => h('input', { type: 'range', min: String(min), max: String(max), step: String(step), 'data-knob': k, oninput: (e) => { mine[k] = +e.target.value; paint(); } }));
    const m = ui.win({ title: '调频密码', h: 448, onClose() { clearInterval(timer); }, body(b) {
      b.classList.add('xt');
      b.appendChild(h('div.xt-tip', '把你的波形(实线)调到和目标(虚线)重合。今日奖励 ', h('b', d.tune + '/' + TUNE_MAX)));
      b.appendChild(cv);
      b.appendChild(h('div.xt-meter', h('span', '重合度'), h('u', bar), pct, clock));
      KNOBS.forEach(([, name], i) => b.appendChild(h('label.xt-knob', h('span', name), inputs[i])));
    } });
    function paint() {
      const g = cv.getContext('2d'), w = cv.width, hh = cv.height;
      g.clearRect(0, 0, w, hh);
      g.strokeStyle = 'rgba(128,128,160,.25)'; g.lineWidth = 1;
      for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo((w / 8) * i, 0); g.lineTo((w / 8) * i, hh); g.stroke(); }
      g.beginPath(); g.moveTo(0, hh / 2); g.lineTo(w, hh / 2); g.stroke();
      const line = (p, color, dash, lw) => {
        g.beginPath(); g.setLineDash(dash); g.strokeStyle = color; g.lineWidth = lw;
        for (let i = 0; i <= 200; i++) { const x = i / 200, y = hh / 2 - wave(p, x) * hh * 0.42; if (i) g.lineTo(x * w, y); else g.moveTo(x * w, y); }
        g.stroke(); g.setLineDash([]);
      };
      line(target, '#e8b84a', [10, 8], 4);
      line(mine, done ? '#3fd8a0' : NL.skin() === 'biao' ? '#ff3d7f' : '#f414dc', [], 5);
      const v = match(mine, target);
      pct.textContent = v + '%'; bar.style.width = v + '%';
      if (!done && v >= TUNE_OK) win();
    }
    function start() {
      target = { f: snap(1.5 + NL.rand() * 4, 0.25), a: snap(0.45 + NL.rand() * 0.5, 0.05), p: snap(NL.rand() * 6, 0.25) };
      mine = { f: target.f > 3.5 ? 2 : 5, a: 0.3, p: 0 };
      X.debug.tune = target;
      inputs.forEach((el, i) => (el.value = mine[KNOBS[i][0]]));
      left = TUNE_SEC; done = false;
      clearInterval(timer);
      timer = setInterval(() => {
        left--; clock.textContent = left + ' 秒';
        if (left <= 0) { ui.toast('信号丢失，换了一组新的频率。'); start(); }
      }, 1000);
      clock.textContent = left + ' 秒';
      paint();
    }
    function win() {
      done = true; clearInterval(timer); paint();
      setTimeout(() => {
        m.close();
        if (d.tune >= TUNE_MAX) return ui.toast('调频成功。今日奖励已领完。');
        d.tune++; game.award(TUNE_REWARD);
      }, 500);
    }
    start();
  };

  /* ---------- 涂鸦暗号 ---------- */
  // 九个涂鸦是九条路径,画在 24×24 的格子里
  const TAGS = ['M4 20L12 4l8 16z', 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z', 'M4 4h16v16H4z', 'M12 2l10 10-10 10L2 12z', 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
    'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z', 'M16 3a9 9 0 1 0 5 13A7 7 0 0 1 16 3z', 'M3 8c3-5 6 5 9 0s6 5 9 0M3 16c3-5 6 5 9 0s6 5 9 0', 'M4 4l16 16M20 4L4 20'];
  X.tag = function () {
    const d = day();
    let seq = [], at = 0, round = 0, busy = true, timers = [];
    const say = h('div.xg-say');
    const cells = TAGS.map((path, i) => h('button.xg-cell', { 'data-tag': i, onclick: () => tap(i) },
      h('span', { html: '<svg viewBox="0 0 24 24"><path d="' + path + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' })));
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const m = ui.win({ title: '涂鸦暗号', h: 448, onClose() { timers.forEach(clearTimeout); }, body(b) {
      b.classList.add('xg');
      b.appendChild(h('div.xt-tip', '记住涂鸦亮起的顺序，照着点回去。过 ' + TAG_ROUNDS + ' 轮过关。今日奖励 ', h('b', d.tag + '/' + TAG_MAX)));
      b.appendChild(say);
      b.appendChild(h('div.xg-grid', cells));
    } });
    const flash = (i, cls, ms) => { cells[i].classList.add(cls); later(ms, () => cells[i].classList.remove(cls)); };
    function next() {
      round++; at = 0; busy = true;
      seq.push(Math.floor(NL.rand() * 9));
      X.debug.tag = seq.slice();
      say.textContent = '第 ' + round + ' 轮 · 记住顺序';
      seq.forEach((i, k) => later(500 + k * 560, () => flash(i, 'on', 380)));
      later(500 + seq.length * 560, () => { busy = false; say.textContent = '轮到你了　0/' + seq.length; });
    }
    function tap(i) {
      if (busy) return;
      if (i !== seq[at]) { // 点错:这一局结束
        busy = true; flash(i, 'bad', 500); say.textContent = '顺序错了';
        later(700, () => { m.close(); ui.toast('暗号对不上，过了 ' + (round - 1) + ' 轮。'); });
        return;
      }
      flash(i, 'on', 200); at++;
      say.textContent = '轮到你了　' + at + '/' + seq.length;
      if (at < seq.length) return;
      busy = true;
      if (round < TAG_ROUNDS) return later(600, next);
      later(500, () => {
        m.close();
        if (d.tag >= TAG_MAX) return ui.toast('暗号全对。今日奖励已领完。');
        d.tag++; game.award(TAG_REWARD);
      });
    }
    seq = [Math.floor(NL.rand() * 9), Math.floor(NL.rand() * 9)]; // 第一轮 3 格
    next();
  };

  /* ---------- 园区巡游 ---------- */
  // 三种小场面,换着用;{n} 是伙伴的名字,{z} 是地点。选第一个 +2 信任,第二个 +1
  const SCENES = [['在{z}的拐角遇见了{n}。对方朝你看了一眼。', '上前聊几句', '点头致意'], ['{n}正靠在{z}外的栏杆上看夜景。', '一起看一会儿', '不打扰，悄悄离开'],
    ['{n}在{z}门口像是在等人，手里的终端亮了又灭。', '问问要不要帮忙', '路过时打个招呼']];
  X.spots = function () { // 今天的三个光点:[{pid, zone, scene, done}],每天第一次用到时排好
    if (!X.on()) return [];
    const d = day();
    if (!d.patrol) {
      const ids = D.partners.map((p) => p.id), zones = D.buildings.map((b) => b.id);
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(NL.rand() * (i + 1)); const t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
      d.patrol = zones.slice(0, 3).map((zone, i) => ({ pid: ids[i], zone, scene: Math.floor(NL.rand() * SCENES.length), done: false }));
      NL.save();
    }
    return d.patrol;
  };
  X.patrol = function (i) {
    const sp = X.spots()[i];
    if (!sp || sp.done) return;
    const p = D.partners.find((x) => x.id === sp.pid), z = D.zones[sp.zone] || D.buildings.find((b) => b.id === sp.zone);
    const [line, a, b] = SCENES[sp.scene];
    const pick = (n) => () => { sp.done = true; NL.partnerApi.addTrust(p, n); NL.refresh(); ui.toast(p.name + ' 的信任值 +' + n + '。'); };
    ui.dialog({ html: line.replace('{n}', '<em>' + p.name + '</em>').replace('{z}', z.name), buttons: [{ text: b, cls: 'pink', onClick: pick(1) }, { text: a, cls: 'purple', onClick: pick(2) }] });
  };
  // 光点本身。里:钉在地图的建筑上;表:挂在地点按钮上。两面点了都是 X.patrol(i)
  X.spotEl = (i, style) => h('button.ext-spot', { 'data-spot': i, style, onclick: (e) => { e.stopPropagation(); X.patrol(i); } }, h('i'));

  /* ---------- 伙伴援护 ---------- */
  X.ally = function () { // 信任等级最高的伙伴;开关关着或者没有伙伴存档时没有援护
    if (!X.on()) return null;
    let best = null;
    D.partners.forEach((p) => { const st = NL.partnerApi.ps(p); if (!best || st.lv > best.lv) best = { p, lv: st.lv }; });
    return best && { id: best.p.id, name: best.p.name, lv: best.lv, mul: 1 + 0.04 * best.lv };
  };
  X.cutIn = function (host, ally) { // 援护出手时横切进来的一条:名字,表还带头像
    const face = 'partner/face_' + ally.id + '.webp';
    const el = h('div.ext-cut', NL.skin() === 'biao' && NL.biaoAssets[face] ? h('i', { style: { backgroundImage: NL.bg(face) } }) : null, h('b', ally.name), h('span', '援护 · 信任 Lv.' + ally.lv));
    host.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  };
})();
