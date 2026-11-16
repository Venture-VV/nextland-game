/* 排行榜(无尽之塔):排位战、挂机奖励、排名奖励说明 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;
  const PER_HOUR = 56.967; // 录屏:挂机 1319 小时领到 75140 晶片
  let timer = 0;
  NL.defaults.push(() => ({ rank: { place: 0, left: 5, date: '', idleAt: Date.now() - 1319 * 3600e3 - 55e3 } }));
  const today = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const idleText = (ms) => { const sec = Math.floor(ms / 1000), p = (n) => String(n).padStart(2, '0'); return (sec >= 3600 ? Math.floor(sec / 3600) + ':' : '') + p(Math.floor((sec % 3600) / 60)) + ':' + p(sec % 60); };

  // 排名奖励表:抄自录屏里那张「排名奖励展示」(里直接贴那张图,表用真的表格)。[名次, 装备箱品质, 补给卡, 张数, 装备晶片, 每小时收益]
  const REWARDS = [['第1名', 'orange', 'special_card', 2, 60, 15], ['第2名', 'purple', 'special_card', 1, 50, 12], ['第3名', 'purple', 'special_card', 1, 45, 10],
    ['第4-10名', 'purple', 'supply_card', 8, 40, 8], ['第11-20名', 'purple', 'supply_card', 6, 35, 6], ['第21-50名', 'purple', 'supply_card', 5, 30, 5],
    ['第51-100名', 'blue', 'supply_card', 3, 25, 4], ['第101-200名', 'blue', 'supply_card', 3, 20, 3], ['第201-500名', 'blue', 'supply_card', 2, 15, 2],
    ['第501-1000名', 'blue', 'supply_card', 2, 12, 1], ['第1001名之后', 'blue', 'supply_card', 1, 10, 1]];
  function info() {
    if (NL.skin() !== 'biao') return ui.win({ title: '', top: 138, h: 527, cls: 'bare', body: (b, m) => { b.appendChild(h('img', { src: NL.img('rank/rewards.jpg'), style: 'display:block;width:330px;height:527px' })); b.appendChild(NL.hit(286, 0, 44, 30, () => m.close())); } });
    ui.win({ title: '排名奖励展示', h: 527, body(b) {
      b.classList.add('brk-info');
      b.appendChild(h('p', '根据当前组别个人榜排名每周结算奖励，计算挂机每小时收益'));
      b.appendChild(h('div.brk-th', h('span', '排名'), h('span', '排名奖励（周结算）'), h('span', '每小时收益')));
      b.appendChild(h('div.brk-tb.scroll', REWARDS.map(([name, box, card, n, cry, hour]) => h('div.brk-tr', h('b', name),
        h('div.item.sm', { style: { backgroundImage: 'url(assets/biao/item/box_' + box + '.svg)' } }, h('b', '1')), ui.itemEl(card, n, 'sm'), ui.itemEl('crystal', cry, 'sm'),
        h('i'), ui.itemEl('crystal', hour, 'sm')))));
    } });
  }
  function idle() {
    const r = NL.state.rank;
    const n = Math.floor(((Date.now() - r.idleAt) / 3600e3) * PER_HOUR);
    if (n < 1) return ui.toast('挂机奖励还在累积中。');
    r.idleAt = Date.now();
    game.track('rank_idle');
    game.award([{ id: 'crystal', n }]);
  }
  function fight() {
    const r = NL.state.rank;
    if (r.left <= 0) return ui.toast('今日排位战次数已用完。');
    const target = r.place ? r.place - 1 : D.rankers.length;
    if (target < 1) return ui.toast('你已经是第一名了。');
    const [name, power] = D.rankers[target - 1];
    r.left--; NL.save();
    game.track('rank');
    ui.battle({ enemy: { name, lv: 20 + (D.rankers.length - target), power }, rewards: [{ id: 'credit', n: 20 }], onEnd(win) {
      if (win) { r.place = target; NL.save(); NL.refresh(); ui.toast('排名提升至第' + target + '名。'); }
    } });
  }
  function enter() { // 两面进页面时做的事一样:过了一天就把次数补满,挂机计时每秒走
    const r = NL.state.rank;
    if (r.date !== today()) { r.date = today(); r.left = 5; }
    clearInterval(timer);
    return r;
  }

  NL.screens.rank = {
    title: '', plate: true,
    // 表:里那张整页的图上烙着的塔和名单,这里是真的名单
    renderBiao(root) {
      const r = enter();
      root.classList.add('brk');
      root.appendChild(h('div.bs-bg', { style: { backgroundImage: NL.bg('rank/bg.jpg') } }));
      ui.head(root, null, 0, 0, 360, 132, 'ENDLESS TOWER', '无尽之塔');
      root.appendChild(h('button.brk-tool', { 'data-act': 'rk-info', style: { top: 150 }, onclick: info }, h('b', 'ⓘ'), h('span', '奖励说明')));
      const clock = h('span', idleText(Date.now() - r.idleAt));
      root.appendChild(h('button.brk-tool', { 'data-act': 'rk-idle', style: { top: 204 }, onclick: idle }, h('img', { src: NL.img('item/crystal.webp'), draggable: 'false' }), clock));
      timer = setInterval(() => (clock.textContent = idleText(Date.now() - r.idleAt)), 1000);
      root.appendChild(h('div.brk-list.scroll', { 'data-keep': 'rank' }, D.rankers.map(([name, power], i) =>
        h('div.brk-row' + (i < 3 ? '.top' : '') + (r.place === i + 1 ? '.me' : ''), h('b', String(i + 1)), h('span', r.place === i + 1 ? NL.state.name : name),
          h('em', r.place === i + 1 ? '我' : NL.fmt.power(power))))));
      root.appendChild(h('div.brk-me', h('i', { style: { backgroundImage: NL.bg('battle/me.jpg') } }), h('b', NL.state.name), h('span', r.place ? '第' + r.place + '名' : '未上榜')));
      root.appendChild(h('button.btn.purple.brk-fight', { 'data-act': 'rk-fight', onclick: fight }, '排位战', h('em', '次数 ' + r.left + '/5')));
    },
    render(root) {
      const r = enter();
      root.appendChild(NL.sprite('rank/bg.jpg', 0, 0, 360, 781));
      const clock = h('div.rk-clock', idleText(Date.now() - r.idleAt));
      root.appendChild(clock);
      timer = setInterval(() => (clock.textContent = idleText(Date.now() - r.idleAt)), 1000);
      root.appendChild(h('div.rk-left', '次数 ' + r.left + '/5'));
      if (r.place) root.appendChild(h('div.rk-place', '第' + r.place + '名'));
      root.appendChild(NL.hit(34, 30, 60, 30, () => ui.toast('每周结算一次排名奖励。')));
      root.appendChild(NL.hit(296, 76, 58, 50, info, { 'data-act': 'rk-info' }));
      root.appendChild(NL.hit(296, 138, 58, 52, idle, { 'data-act': 'rk-idle' }));
      root.appendChild(NL.hit(190, 576, 150, 38, fight, { 'data-act': 'rk-fight' }));
    },
    leave() { clearInterval(timer); },
  };
})();
