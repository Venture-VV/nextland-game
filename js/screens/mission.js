/* 委托页：日常 / 任务双页签 + 珠光委托卡片 + 鎏金星光乐园通行证（线下 NPC 互动码票根） */
(function () {
  'use strict';
  const h = NL.h;
  const D = NL.data;
  const game = NL.game;
  const GIFT = '<svg viewBox="0 0 20 20"><path fill="currentColor" d="M2 6h16v3.5H2zM3.5 10.5h5.5V18H3.5zM11 10.5h5.5V18H11zM9.2 6h1.6v12H9.2zM6.5 2C4.2 2 4.2 5.4 6.2 5.4h3.3C9 3.4 8 2 6.5 2zM13.5 2C15.8 2 15.8 5.4 13.8 5.4h-3.3C11 3.4 12 2 13.5 2z"/></svg>';
  let tab = 'daily';
  const open = { main: true, side: false, explore: false };
  let timer = 0;

  NL.defaults.push(() => ({ tasks: {}, daily: { date: '', c: {}, claimed: {}, points: 0, gifts: {} }, stages: { core: 10, hanshin: 10, museum: 1 } }));

  const today = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function daily() {
    const s = NL.state;
    if (s.daily.date !== today()) s.daily = { date: today(), c: {}, claimed: {}, points: 0, gifts: {} };
    return s.daily;
  }
  game.daily = daily;
  const trackers = [];
  game.onTrack = (fn) => trackers.push(fn);
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

  NL.ui.sec = (t) => h('div.sec-label', h('span', '✦ ' + t));

  /* ---------- 任务状态 ---------- */
  function st(t) { return NL.state.tasks[t.id] || {}; }
  function setSt(t, o) { NL.state.tasks[t.id] = Object.assign(st(t), o); NL.save(); }
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
  const LABEL = { story: '翻阅剧情', qr: '出示票根', stage: '前往试炼', go: '前往完成' };
  const BADGE_ICON = { main: '✦', red: '❖', white: '✧', explore: '🧭', daily: '☼' };

  /* ---------- 界面 ---------- */
  function goalHtml(g) { return g.replace(/\{(.+?)\}/g, '<em>$1</em>'); }
  function titleEl(t, big) {
    return h('div.' + (big ? 'tk-big' : 'tk-title'),
      big ? null : h('i', '✦'),
      t.tag ? h('span.tag-' + (t.tag === '引导' ? 'blue' : 'red'), '【' + t.tag + '】') : null,
      t.title);
  }
  function badgeEl(kind) {
    const k = kind || 'main';
    return h('div.tk-badge.b-' + k, h('i', BADGE_ICON[k] || '✦'), h('span', k === 'daily' ? '日常' : k === 'explore' ? '奇遇' : k === 'red' || k === 'white' ? '支线' : '纪事'));
  }
  function card(t) {
    const pr = progress(t);
    const right = pr.p ? h('button.tk-btn.pink', { 'data-claim': t.id, onclick: (e) => { e.stopPropagation(); act(t); } }, '领取')
      : pr.action === 'none' ? h('div.tk-status', '进行中')
        : h('button.tk-btn', { 'data-act-task': t.id, onclick: (e) => { e.stopPropagation(); act(t); } }, LABEL[pr.action]);
    return h('div.tk-card' + (t.tag === '引导' ? '.glow' : ''), { 'data-task': t.id, onclick: () => detail(t) },
      badgeEl(t.icon || 'main'),
      titleEl(t),
      h('div.tk-goal', h('span', { html: goalHtml(t.goal) }), h('b', pr.p + '/1')),
      h('div.tk-rewards', t.rewards.map((r) => NL.ui.itemEl(r.id, r.n, 'sm31'))),
      right);
  }
  function section(key, name, list) {
    const out = [h('button.tk-sec' + (open[key] ? '.open' : ''), { 'data-sec': key, onclick: () => { open[key] = !open[key]; NL.refresh(); } }, '✦  ' + name + ' (' + list.length + ')', h('i'))];
    if (open[key]) list.forEach((t) => out.push(card(t)));
    return out;
  }

  function detail(t) {
    const pr = progress(t);
    NL.ui.win({
      title: '委托详情', top: 96,
      body(b) {
        b.classList.add('tk-detail');
        b.appendChild(titleEl(t, true));
        b.appendChild(h('div.tk-pill', h('i.star'), h('span', { html: goalHtml(t.goal) }), h('b', pr.p + '/1')));
        b.appendChild(NL.ui.sec('背景纪要'));
        b.appendChild(h('div.tk-desc', t.desc || ''));
        b.appendChild(NL.ui.sec('达成礼遇'));
        b.appendChild(h('div.tk-reward-box', t.rewards.map((r) => { const el = NL.ui.itemEl(r.id, r.n); el.onclick = () => NL.ui.itemInfo(r.id); return el; })));
      },
    });
  }

  // 珠光物品详情浮窗
  NL.ui.itemInfo = function (id) {
    const d = D.items[id];
    if (!d) return;
    const m = NL.ui.mask({ clear: true });
    m.el.appendChild(h('div.info-pop',
      h('div.info-head', '✦ ITEM ARCHIVE'),
      h('div.info-body',
        h('div.info-name', d.name), h('div.info-kind', d.kind || ''),
        h('div.info-ico', { style: { backgroundImage: NL.bg(d.icon) } }),
        NL.ui.sec('物品说明'), h('div.info-desc', d.desc || ''))));
  };

  // 鎏金星光乐园通行证（替代原版生硬二维码截图，保留网页端「模拟 NPC 扫码」）
  function qrCard(t) {
    const m = NL.ui.mask({});
    const cv = h('canvas', { width: 164, height: 164 });
    const cx = cv.getContext('2d');
    let seed = 19;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const n = 25, c = 164 / n;
    cx.fillStyle = '#FFFDF8'; cx.fillRect(0, 0, 164, 164);
    cx.fillStyle = '#2F3654';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (rnd() > 0.53) cx.fillRect(x * c, y * c, c + 0.25, c + 0.25);
      }
    }
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([x, y]) => {
      cx.fillStyle = '#FFFDF8'; cx.fillRect(x * c - 1, y * c - 1, 7 * c + 2, 7 * c + 2);
      cx.fillStyle = '#B88A4B'; cx.fillRect(x * c, y * c, 7 * c, 7 * c);
      cx.fillStyle = '#FFFDF8'; cx.fillRect((x + 1) * c, (y + 1) * c, 5 * c, 5 * c);
      cx.fillStyle = '#2F3654'; cx.fillRect((x + 2) * c, (y + 2) * c, 3 * c, 3 * c);
    });

    const ticket = h('div.golden-ticket',
      h('button.win-close', { onclick: () => m.close() }),
      h('div.gt-head',
        h('span.gt-en', '✦ NEXTLAND STARLIGHT PASS ✦'),
        h('b.gt-title', '鎏金星光乐园通行证'),
        h('span.gt-task', '奇遇信物 · ' + t.title)),
      h('div.gt-qr-frame', cv),
      h('div.gt-tear', h('i.notch.l'), h('u.dash'), h('i.notch.r')),
      h('div.gt-stub',
        h('div.gt-meta',
          h('span', '持票猎人：' + NL.state.name),
          h('b', 'NO.' + NL.state.uid)),
        h('div.gt-tip', '请向园区驻场伙伴 / NPC 出示此星芒票根完成共鸣核验')));
    m.el.appendChild(ticket);
    m.el.appendChild(h('button.btn.purple.abs', {
      'data-act': 'fake-scan',
      style: { left: 104, top: 656, width: 152 },
      onclick: () => { m.close(); setSt(t, { p: 1 }); NL.ui.toast('星芒票根核验成功'); NL.refresh(); },
    }, '✦ 模拟 NPC 扫码'));
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 706, textAlign: 'center', margin: 0 } }, '点击空白处关闭'));
  }

  function renderDaily(list) {
    const d = daily();
    const track = h('div.dp-track', h('img', { src: NL.img('item/daily_point.webp') }), h('b', String(d.points)));
    [10, 20, 30].forEach((m, i) => {
      const got = d.gifts[m], can = d.points >= m && !got;
      track.appendChild(h('button.dp-gift' + (got ? '.got' : can ? '.can' : ''), {
        style: { left: 152 + i * 64 }, html: got ? '✓' : GIFT, 'data-gift': m,
        onclick: () => { if (!can) return NL.ui.toast(got ? '礼盒已开启' : '活跃星芒不足'); d.gifts[m] = true; game.award(D.dailyGifts[m]); },
      }));
    });
    list.appendChild(h('div.dp-bar', track, h('div.dp-labels', h('span', '活跃星芒'), h('span', '10'), h('span', '20'), h('span', '30'))));
    const clock = h('b', NL.fmt.untilReset() + ' 后刷新');
    list.appendChild(h('div.dp-clock', h('i'), clock));
    timer = setInterval(() => (clock.textContent = NL.fmt.untilReset() + ' 后刷新'), 1000);
    const rank = (t) => (d.claimed[t.id] ? 2 : (d.c[t.ev] || 0) >= 1 ? 0 : 1);
    D.dailyTasks.slice().sort((a, b) => rank(a) - rank(b)).forEach((t) => {
      const r = rank(t), p = Math.min(1, d.c[t.ev] || 0);
      list.appendChild(h('div.tk-card.daily', { 'data-task': t.id },
        badgeEl('daily'),
        h('div.tk-title', h('i', '✦'), t.title),
        h('div.tk-goal', h('span', t.goal), h('b', p + '/1')),
        h('div.tk-rewards', h('img.dp-ico', { src: NL.img('item/daily_point.webp') }), h('b.dp-n', '+10')),
        r === 0 ? h('button.tk-btn.pink', { 'data-claim': t.id, onclick: () => { d.claimed[t.id] = true; d.points += 10; NL.save(); NL.refresh(); } }, '领取')
          : h('div.tk-status', r === 2 ? '已完成' : '进行中')));
    });
  }

  NL.screens.mission = {
    title: '乐园委托', nav: 'mission',
    render(root) {
      const s = NL.state;
      clearInterval(timer);
      if (s.guide === 'on' && s.guideStep === 0) { s.guideStep = 1; NL.save(); }
      root.appendChild(h('div.ms-banner',
        h('span.msb-en', 'TWILIGHT CHRONICLES & COMMISSIONS'),
        h('b.msb-cn', '新生乐园 · 星芒手账')));
      root.appendChild(h('div.tabs2', ['daily', 'task'].map((k) =>
        h('button' + (tab === k ? '.on' : ''), { 'data-tab': k, onclick: () => { tab = k; NL.refresh(); } }, k === 'daily' ? '✦ 日常巡礼' : '✦ 剧情与奇遇'))));
      const list = h('div.tk-list.scroll', { 'data-keep': 'mission-' + tab });
      root.appendChild(list);
      if (tab === 'daily') renderDaily(list);
      else {
        const v = visible();
        list.appendChild(h('div', section('main', '主线纪事', v.main), section('side', '势力支线', v.side), section('explore', '园区奇遇', v.explore)));
      }
      if (s.guide === 'on' && s.guideStep === 1) {
        if (tab === 'daily') {
          root.appendChild(h('div.guide-tip', { style: { left: 16, top: 150, width: 236 } }, '✦ 【引导】委托位于「剧情与奇遇」页签顶部'));
          root.appendChild(h('div.guide-arrow', { style: { left: 262, top: 82 } }));
        } else if (open.main) {
          root.appendChild(h('div.guide-tip', { style: { left: 16, top: 266 } }, '✦ 领取入园礼遇，解锁下一段奇遇'));
          root.appendChild(h('div.guide-arrow', { style: { left: 282, top: 194 } }));
        }
      }
    },
    leave() { clearInterval(timer); },
  };
})();
