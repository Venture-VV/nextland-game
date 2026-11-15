/* 战斗演出、冒险地图、关卡列表、玩法列表、探索列车 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;
  const two = (n) => String(n).padStart(2, '0');
  let timer = 0;

  NL.defaults.push(() => ({ train: { gorge: 1, mine: 0 }, trainDay: { date: '', left: 30 } }));
  const today = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  game.rateText = function (enemyPower) {
    const r = game.power() / enemyPower;
    return r >= 1.5 ? '碾压' : r >= 1 ? '轻松' : r >= 0.8 ? '势均力敌' : '危险';
  };

  /* ---------- 战斗 ---------- */
  // 自动战斗:战力不低于对手就赢。opts: {enemy:{name, lv, power}, rewards, onEnd(win)}
  ui.battle = function (opts) {
    const s = NL.state, e = opts.enemy;
    const win = game.power() >= e.power;
    const panel = (cls, name, lv, power) => h('div.bt-panel.' + cls, h('b', name), h('i', '等级:' + lv), h('span', '战力'), h('em', NL.fmt.power(power)));
    const foe = h('img.bt-foe', { src: NL.img('battle/enemy.jpg'), draggable: 'false' });
    const start = NL.sprite('battle/start.jpg', 0, 320, 360, 160, { cls: 'bt-start' });
    const el = h('div.battle', NL.sprite('battle/bg.jpg', 0, 0, 360, 781), foe,
      panel('foe', e.name, e.lv, e.power), panel('me', s.name, s.level, game.power()), start,
      NL.hit(262, 652, 86, 74, () => finish(), { 'data-act': 'skip' }));
    document.querySelector('#layers').appendChild(el);
    let done = false;
    const t1 = setTimeout(() => { start.remove(); foe.classList.add('go'); }, 1000);
    const t2 = setTimeout(() => finish(), 4200);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(t1); clearTimeout(t2);
      start.remove(); foe.classList.remove('go');
      el.classList.add('over');
      const rewards = win ? opts.rewards || [] : [];
      if (rewards.length) game.grant(rewards);
      el.appendChild(win ? NL.sprite('battle/win.jpg', 0, 235, 360, 95, { cls: 'bt-result' }) : h('div.bt-lose.bt-result', '挑战失败'));
      el.appendChild(h('div.bt-items', rewards.map((r) => ui.itemEl(r.id, r.n))));
      el.appendChild(h('div.bt-hint', '点击空白处关闭。'));
      setTimeout(() => el.addEventListener('click', () => { el.remove(); NL.refresh(); if (opts.onEnd) opts.onEnd(win); }), 300);
    }
  };

  /* ---------- 冒险地图 ---------- */
  let quickOpen = false, advMap = null;
  NL.screens.adventure = {
    title: '冒险',
    render(root) {
      advMap = ui.parkMap((id) => NL.go('stages', { zone: id }));
      root.appendChild(advMap.el);
      root.appendChild(ui.energyPill(253, 100));
      root.appendChild(h('button.adv-quick' + (quickOpen ? '.open' : ''), { 'data-act': 'quick', onclick: () => { quickOpen = !quickOpen; NL.refresh(); } }, '快速抵达', h('i')));
      if (quickOpen) root.appendChild(h('div.adv-list', Object.keys(D.zones).map((id) =>
        h('button', { 'data-zone': id, onclick: () => { quickOpen = false; NL.go('stages', { zone: id }); } }, h('b', String(D.zones[id].part)), D.zones[id].name, h('i')))));
      root.appendChild(NL.sprite('home/btn_explore.webp', 249, 635, 98, 52));
      root.appendChild(NL.hit(249, 635, 98, 52, () => (ui.interact ? ui.interact() : ui.toast('敬请期待。'))));
    },
    leave() { if (advMap) advMap.destroy(); advMap = null; },
  };

  /* ---------- 关卡列表 ---------- */
  function stageWin(zid, n) {
    const z = D.zones[zid], power = z.per * n;
    const m = ui.mask({});
    const box = h('div.abs.st-win', { style: { left: 15, top: 163, width: 330, height: 481 } },
      NL.sprite('stage/detail.jpg', 0, 0, 330, 481),
      h('div.st-w-title', z.name + two(n)), h('div.st-w-name', z.enemy), h('div.st-w-power', String(power)),
      h('div.st-w-rate', game.rateText(power)), h('div.st-w-desc', z.desc),
      NL.hit(128, 420, 190, 48, () => {
        if (!game.useEnergy(D.stageCost)) return;
        m.close();
        const drop = Math.random() < 0.5 ? D.stageDrop : [];
        ui.battle({ enemy: { name: z.enemy, lv: n, power }, rewards: D.stageRewards.concat(drop), onEnd(win) {
          if (win && NL.state.stages[zid] < n) { NL.state.stages[zid] = n; NL.save(); NL.refresh(); }
        } });
      }, { 'data-act': 'fight' }));
    m.el.appendChild(box);
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 686, textAlign: 'center', margin: 0 } }, '点击空白处关闭。'));
  }
  NL.screens.stages = {
    title: (p) => D.zones[p.zone].name, plate: 'cap',
    render(root, p) {
      const z = D.zones[p.zone], cleared = NL.state.stages[p.zone] || 0;
      root.classList.add('night');
      const list = h('div.st-list.scroll', { 'data-keep': 'st-' + p.zone });
      for (let n = D.stageCount; n >= 1; n--) {
        const open = n <= cleared + 1, cur = n === cleared + 1, boss = n === D.stageCount;
        const side = (D.stageCount - n) % 2 ? 'r' : 'l';
        list.appendChild(h('div.st-node.' + side,
          h('button.st-tile' + (boss ? '.boss' : '') + (cur ? '.cur' : open ? '' : '.lock'), { 'data-stage': n, onclick: () => (open ? stageWin(p.zone, n) : ui.toast('通关上一关后解锁。')) },
            boss ? null : h('b', String(n)), cur ? h('u', 'ONGOING') : null, h('span', z.name + two(n))),
          h('i')));
      }
      root.appendChild(list);
      root.appendChild(NL.sprite('stage/head_' + z.head + '.jpg', 0, 0, 360, 190));
      root.appendChild(h('div.st-prog', String(cleared)));
      root.appendChild(ui.energyPill(253, 69));
    },
  };

  /* ---------- 玩法 ---------- */
  NL.screens.modes = {
    title: '玩法',
    render(root) {
      root.classList.add('dusk');
      root.appendChild(ui.pill('home/ico_coin.webp', NL.state.credit, 253, 95, { w: 91 }));
      root.appendChild(h('div.md-list.scroll', { 'data-keep': 'modes' }, D.modes.map(([img, train]) =>
        h('img', { src: NL.img('modes/' + img + '.jpg'), 'data-mode': img, draggable: 'false', onclick: () => (train ? NL.go('train', { id: train }) : ui.toast('页面打开失败。')) }))));
    },
  };

  /* ---------- 探索列车 ---------- */
  NL.screens.train = {
    title: '玩法',
    render(root, p) {
      const t = D.trains[p.id], s = NL.state;
      if (s.trainDay.date !== today()) s.trainDay = { date: today(), left: 30 };
      const cleared = s.train[p.id] || 0;
      clearInterval(timer);
      root.classList.add('lilac');
      root.appendChild(h('div.tr-title', t.name));
      root.appendChild(h('div.tr-seg', '普通'));
      const clock = h('b', NL.fmt.untilReset() + '后刷新');
      root.appendChild(h('div.tr-info', '今日剩余挑战次数  ' + s.trainDay.left, clock));
      timer = setInterval(() => (clock.textContent = NL.fmt.untilReset() + '后刷新'), 1000);
      const list = h('div.tr-list.scroll', { 'data-keep': 'train-' + p.id });
      for (let n = t.powers.length; n >= 1; n--) {
        const power = t.powers[n - 1], open = n <= cleared + 1;
        list.appendChild(h('div.tr-row', h('div.tr-film'), h('div.tr-name', t.car + n + '节'),
          h('div.tr-rate', '通关率 ', h('em', game.rateText(power))), h('div.tr-power', '战力 ', h('em', NL.fmt.power(power))),
          h('div.tr-rewards', t.rewards[n - 1].map((r) => ui.itemEl(r.id, r.n, 'sm'))),
          open ? h('button.btn.purple.small.tr-go', { 'data-train': n, onclick: () => {
            if (s.trainDay.left <= 0) return ui.toast('今日挑战次数已用完。');
            s.trainDay.left--; NL.save();
            game.track(t.ev);
            ui.battle({ enemy: { name: t.enemy, lv: n * 5, power }, rewards: t.rewards[n - 1], onEnd(win) {
              if (win && cleared < n) { s.train[p.id] = n; NL.save(); NL.refresh(); }
            } });
          } }, '挑战') : h('div.tr-lock', '🔒 挑战前一层解锁')));
      }
      root.appendChild(list);
    },
    leave() { clearInterval(timer); },
  };
})();
