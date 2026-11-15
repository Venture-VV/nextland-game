/* 排行榜(无尽之塔):排位战、挂机奖励、排名奖励说明 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;
  const PER_HOUR = 56.967; // 录屏:挂机 1319 小时领到 75140 晶片
  let timer = 0;
  NL.defaults.push(() => ({ rank: { place: 0, left: 5, date: '', idleAt: Date.now() - 1319 * 3600e3 - 55e3 } }));
  const today = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const idleText = (ms) => { const sec = Math.floor(ms / 1000), p = (n) => String(n).padStart(2, '0'); return (sec >= 3600 ? Math.floor(sec / 3600) + ':' : '') + p(Math.floor((sec % 3600) / 60)) + ':' + p(sec % 60); };

  NL.screens.rank = {
    title: '', plate: true,
    render(root) {
      const r = NL.state.rank;
      if (r.date !== today()) { r.date = today(); r.left = 5; }
      clearInterval(timer);
      root.appendChild(NL.sprite('rank/bg.jpg', 0, 0, 360, 781));
      const clock = h('div.rk-clock', idleText(Date.now() - r.idleAt));
      root.appendChild(clock);
      timer = setInterval(() => (clock.textContent = idleText(Date.now() - r.idleAt)), 1000);
      root.appendChild(h('div.rk-left', '次数 ' + r.left + '/5'));
      if (r.place) root.appendChild(h('div.rk-place', '第' + r.place + '名'));
      root.appendChild(NL.hit(34, 30, 60, 30, () => ui.toast('每周结算一次排名奖励。')));
      root.appendChild(NL.hit(296, 76, 58, 50, () => ui.win({ title: '', top: 138, h: 527, cls: 'bare', body: (b, m) => { b.appendChild(h('img', { src: NL.img('rank/rewards.jpg'), style: 'display:block;width:330px;height:527px' })); b.appendChild(NL.hit(286, 0, 44, 30, () => m.close())); } }), { 'data-act': 'rk-info' }));
      root.appendChild(NL.hit(296, 138, 58, 52, () => {
        const n = Math.floor(((Date.now() - r.idleAt) / 3600e3) * PER_HOUR);
        if (n < 1) return ui.toast('挂机奖励还在累积中。');
        r.idleAt = Date.now();
        game.track('rank_idle');
        game.award([{ id: 'crystal', n }]);
      }, { 'data-act': 'rk-idle' }));
      root.appendChild(NL.hit(190, 576, 150, 38, () => {
        if (r.left <= 0) return ui.toast('今日排位战次数已用完。');
        const target = r.place ? r.place - 1 : D.rankers.length;
        if (target < 1) return ui.toast('你已经是第一名了。');
        const [name, power] = D.rankers[target - 1];
        r.left--; NL.save();
        game.track('rank');
        ui.battle({ enemy: { name, lv: 20 + (D.rankers.length - target), power }, rewards: [{ id: 'credit', n: 20 }], onEnd(win) {
          if (win) { r.place = target; NL.save(); NL.refresh(); ui.toast('排名提升至第' + target + '名。'); }
        } });
      }, { 'data-act': 'rk-fight' }));
    },
    leave() { clearInterval(timer); },
  };
})();
