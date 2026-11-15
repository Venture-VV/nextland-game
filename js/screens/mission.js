/* 任务页：日常 / 任务 两个页签，任务详情，互动码，线下引导提示 */
(function () {
  'use strict';
  const h = NL.h;
  const D = NL.data;
  const game = NL.game;
  const GIFT = '<svg viewBox="0 0 20 20"><path fill="currentColor" d="M2 6h16v4H2zM3 11h6v7H3zM11 11h6v7h-6zM9 6h2v12H9zM6.5 2C4 2 4 5.500 6 5.500h3.500C9 3.500 8 2 6.500 2zM13.500 2C16 2 16 5.500 14 5.500h-3.500C11 3.500 12 2 13.500 2z"/></svg>';
  let tab = 'daily';
  const open = { main: true, side: false, explore: false };
  let timer = 0;

  NL.defaults.push(() => ({ tasks: {}, daily: { date: '', c: {}, claimed: {}, points: 0, gifts: {} }, stages: { core: 10, museum: 1, hanshin: 0 } }));

  const today = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function daily() {
    const s = NL.state;
    if (s.daily.date !== today()) s.daily = { date: today(), c: {}, claimed: {}, points: 0, gifts: {} };
    return s.daily;
  }
  const trackers = [];
  game.onTrack = (fn) => trackers.push(fn);
  // 各玩法做完一次就报一下，日常任务、引导任务和伙伴委托都靠它计数
  game.track = function (ev, n) {
    const s = NL.state;
    const d = daily();
    d.c[ev] = (d.c[ev] || 0) + (n || 1);
    Object.values(D.taskChains).forEach((chain) => chain.forEach((t) => {
      if (t.ev === ev) (s.tasks[t.id] = s.tasks[t.id] || {}).p = 1;
    }));
    trackers.forEach((f) => f(ev, n || 1));
    NL.save();
  };

  NL.ui.sec = (t) => h('div.sec-label', h('span', t)); // 小黑标签 + 横线的分节标题

  /* ---------- 任务状态 ---------- */
  function st(t) { return NL.state.tasks[t.id] || {}; }
  function setSt(t, o) { NL.state.tasks[t.id] = Object.assign(st(t), o); NL.save(); }
  // 返回 {p, action}:action 是还差哪一步(story / qr / stage / go / none)
  function progress(t) {
    const a = st(t);
    if (t.auto) return { p: 1 };
    if (t.ev) return a.p ? { p: 1 } : { p: 0, action: t.go ? 'go' : 'none' };
    if (t.story && !a.story) return { p: 0, action: 'story' };
    if (t.qr && !a.p) return { p: 0, action: 'qr' };
    if (t.stage && NL.state.stages[t.stage[0]] < t.stage[1]) return { p: 0, action: 'stage' };
    if (!t.story && !t.qr && !t.stage) return { p: 0, action: 'none' };
    return { p: 1 };
  }
  function visible() {
    const live = (list) => list.filter((t) => !st(t).done);
    const main = Object.values(D.taskChains).map((c) => live(c)[0]).filter(Boolean);
    return { main, side: live(D.sideTasks), explore: live(D.exploreTasks) };
  }
  // 有可领取的任务时，底部「任务」要不要亮红点（留给以后用）
  game.claimableTasks = () => { const v = visible(); return v.main.concat(v.side, v.explore).filter((t) => progress(t).p).length; };

  function act(t) {
    const pr = progress(t);
    if (pr.p) {
      setSt(t, { done: true });
      if (t.id === 'g1' && NL.state.guideStep < 2) NL.state.guideStep = 2;
      return game.award(t.rewards);
    }
    if (pr.action === 'story') return NL.ui.story(D.stories[t.story], () => { setSt(t, { story: true }); NL.refresh(); });
    if (pr.action === 'qr') return qrCard(t);
    if (pr.action === 'stage') return NL.go('stages', { zone: t.stage[0] });
    if (pr.action === 'go') return NL.go(t.go);
  }
  const LABEL = { story: '查看剧情', qr: '出示互动码', stage: '去挑战', go: '去完成' };

  /* ---------- 界面 ---------- */
  function goalHtml(g) { return g.replace(/\{(.+?)\}/g, '<em>$1</em>'); }
  function titleEl(t, big) {
    return h('div.' + (big ? 'tk-big' : 'tk-title'), big ? null : h('i', '▶'), t.tag ? h('span.tag-' + (t.tag === '引导' ? 'blue' : 'red'), '【' + t.tag + '】') : null, t.title);
  }
  function card(t) {
    const pr = progress(t);
    const right = pr.p ? h('button.tk-btn.pink', { 'data-claim': t.id, onclick: (e) => { e.stopPropagation(); act(t); } }, '领取')
      : pr.action === 'none' ? h('div.tk-status', '未完成')
        : h('button.tk-btn', { 'data-act-task': t.id, onclick: (e) => { e.stopPropagation(); act(t); } }, LABEL[pr.action]);
    return h('div.tk-card' + (t.tag === '引导' ? '.glow' : ''), { 'data-task': t.id, onclick: () => detail(t) },
      h('img.tk-ico', { src: NL.img('mission/ico_' + (t.icon || 'main') + '.jpg'), draggable: 'false' }),
      titleEl(t),
      h('div.tk-goal', h('span', { html: goalHtml(t.goal) }), h('b', pr.p + '/1')),
      h('div.tk-rewards', t.rewards.map((r) => NL.ui.itemEl(r.id, r.n, 'sm31'))),
      right);
  }
  function section(key, name, list) {
    const out = [h('button.tk-sec' + (open[key] ? '.open' : ''), { 'data-sec': key, onclick: () => { open[key] = !open[key]; NL.refresh(); } }, name + '(' + list.length + ')', h('i'))];
    if (open[key]) list.forEach((t) => out.push(card(t)));
    return out;
  }

  function detail(t) {
    const pr = progress(t);
    NL.ui.win({
      title: '任务', top: 82,
      body(b) {
        b.classList.add('tk-detail');
        b.appendChild(titleEl(t, true));
        b.appendChild(h('div.tk-pill', h('i.star'), h('span', { html: goalHtml(t.goal) }), h('b', pr.p + '/1')));
        b.appendChild(NL.ui.sec('详情'));
        b.appendChild(h('div.tk-desc', t.desc || ''));
        b.appendChild(NL.ui.sec('奖励'));
        b.appendChild(h('div.tk-reward-box', t.rewards.map((r) => { const el = NL.ui.itemEl(r.id, r.n); el.onclick = () => NL.ui.itemInfo(r.id); return el; })));
      },
    });
  }

  // 物品说明（红色 INFO 小窗）
  NL.ui.itemInfo = function (id) {
    const d = D.items[id];
    if (!d) return;
    const m = NL.ui.mask({ clear: true });
    m.el.appendChild(h('div.info-pop',
      h('div.info-head', 'ⓘ INFO'),
      h('div.info-body',
        h('div.info-name', d.name), h('div.info-kind', d.kind || ''),
        h('div.info-ico', { style: { backgroundImage: NL.bg(d.icon) } }),
        NL.ui.sec('描述'), h('div.info-desc', d.desc || ''))));
  };

  // 互动码卡片。原游戏要到园区找 NPC 扫码；网页版加一个「模拟扫码」按钮代替
  function qrCard(t) {
    const m = NL.ui.mask({});
    const cv = h('canvas', { width: 168, height: 162 });
    const cx = cv.getContext('2d');
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const n = 25, c = 168 / n;
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, 168, 162);
    cx.fillStyle = '#111';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (rnd() > 0.52) cx.fillRect(x * c, y * (162 / n), c + 0.3, 162 / n + 0.3);
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([x, y]) => { // 三个定位角，看着像码，但扫不出东西
      cx.fillStyle = '#fff'; cx.fillRect(x * c - 1, y * (162 / n) - 1, 7 * c + 2, 7 * (162 / n) + 2);
      cx.fillStyle = '#111'; cx.fillRect(x * c, y * (162 / n), 7 * c, 7 * (162 / n));
      cx.fillStyle = '#fff'; cx.fillRect((x + 1) * c, (y + 1) * (162 / n), 5 * c, 5 * (162 / n));
      cx.fillStyle = '#111'; cx.fillRect((x + 2) * c, (y + 2) * (162 / n), 3 * c, 3 * (162 / n));
    });
    const box = h('div.abs', { style: { left: 35, top: 165, width: 290, height: 495 } }, NL.sprite('mission/qr_card.jpg', 0, 0, 290, 495), cv);
    Object.assign(cv.style, { position: 'absolute', left: '63px', top: '139px', width: '168px', height: '162px' });
    m.el.appendChild(box);
    m.el.appendChild(h('button.btn.purple.abs', { 'data-act': 'fake-scan', style: { left: 118, top: 676 }, onclick: () => { m.close(); setSt(t, { p: 1 }); NL.ui.toast('互动成功。'); NL.refresh(); } }, '模拟NPC扫码'));
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 722, textAlign: 'center', margin: 0 } }, '点击空白处关闭。'));
  }

  function renderDaily(list) {
    const d = daily();
    const track = h('div.dp-track', h('img', { src: NL.img('item/daily_point.webp') }), h('b', String(d.points)));
    [10, 20, 30].forEach((m, i) => {
      const got = d.gifts[m], can = d.points >= m && !got;
      track.appendChild(h('button.dp-gift' + (got ? '.got' : can ? '.can' : ''), {
        style: { left: 152 + i * 64 }, html: got ? '✓' : GIFT, 'data-gift': m,
        onclick: () => { if (!can) return NL.ui.toast(got ? '已领取。' : '积分不足。'); d.gifts[m] = true; game.award(D.dailyGifts[m]); },
      }));
    });
    list.appendChild(h('div.dp-bar', track, h('div.dp-labels', h('span', '累计积分'), h('span', '10'), h('span', '20'), h('span', '30'))));
    const clock = h('b', NL.fmt.untilReset() + '后刷新');
    list.appendChild(h('div.dp-clock', h('i'), clock));
    timer = setInterval(() => (clock.textContent = NL.fmt.untilReset() + '后刷新'), 1000);
    const rank = (t) => (d.claimed[t.id] ? 2 : (d.c[t.ev] || 0) >= 1 ? 0 : 1);
    D.dailyTasks.slice().sort((a, b) => rank(a) - rank(b)).forEach((t) => {
      const r = rank(t), p = Math.min(1, d.c[t.ev] || 0);
      list.appendChild(h('div.tk-card.daily', { 'data-task': t.id },
        h('img.tk-ico', { src: NL.img('mission/ico_daily.jpg'), draggable: 'false' }),
        h('div.tk-title', h('i', '▶'), t.title),
        h('div.tk-goal', h('span', t.goal), h('b', p + '/1')),
        h('div.tk-rewards', h('img.dp-ico', { src: NL.img('item/daily_point.webp') }), h('b.dp-n', '10')),
        r === 0 ? h('button.tk-btn.pink', { 'data-claim': t.id, onclick: () => { d.claimed[t.id] = true; d.points += 10; NL.save(); NL.refresh(); } }, '领取')
          : h('div.tk-status', r === 2 ? '已完成' : '未完成')));
    });
  }

  NL.screens.mission = {
    title: '任务', nav: 'mission',
    render(root) {
      const s = NL.state;
      clearInterval(timer);
      if (s.guide === 'on' && s.guideStep === 0) { s.guideStep = 1; NL.save(); }
      root.appendChild(NL.sprite('mission/banner.jpg', 0, 0, 360, 104));
      root.appendChild(h('div.tabs2', ['daily', 'task'].map((k) =>
        h('button' + (tab === k ? '.on' : ''), { 'data-tab': k, onclick: () => { tab = k; NL.refresh(); } }, k === 'daily' ? '日常' : '任务'))));
      const list = h('div.tk-list.scroll', { 'data-keep': 'mission-' + tab });
      root.appendChild(list);
      if (tab === 'daily') renderDaily(list);
      else {
        const v = visible();
        list.appendChild(h('div', section('main', '主线', v.main), section('side', '支线', v.side), section('explore', '探索', v.explore)));
      }
      // 线下引导
      if (s.guide === 'on' && s.guideStep === 1) {
        if (tab === 'daily') {
          root.appendChild(h('div.guide-tip', { style: { left: 2, top: 146, width: 232 } }, '【引导】任务在「剧情」页签的最上面'));
          root.appendChild(h('div.guide-arrow', { style: { left: 254, top: 72 } }));
        } else if (open.main) {
          root.appendChild(h('div.guide-tip', { style: { left: 16, top: 262 } }, '领取奖励，下一步会接着出现在这里'));
          root.appendChild(h('div.guide-arrow', { style: { left: 279, top: 188 } }));
        }
      }
    },
    leave() { clearInterval(timer); },
  };
})();
