/* 商城与补给 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;
  let cat = 'pack', page = 0;
  NL.defaults.push(() => ({ shopLog: { day: '', dc: {}, week: '', wc: {} } }));
  const dayKey = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const weekKey = () => { const d = new Date(Date.now() - 8 * 3600e3); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return mon.getFullYear() + '-' + (mon.getMonth() + 1) + '-' + mon.getDate(); };
  function log() {
    const l = NL.state.shopLog;
    if (l.day !== dayKey()) { l.day = dayKey(); l.dc = {}; }
    if (l.week !== weekKey()) { l.week = weekKey(); l.wc = {}; }
    return l;
  }

  /* ---------- 商城 ---------- */
  NL.screens.shop = {
    title: '商城', plate: 'cap',
    render(root) {
      const l = log();
      root.classList.add('dots');
      root.appendChild(NL.sprite('shop/head.jpg', 0, 0, 360, 195));
      root.appendChild(ui.pill('home/ico_coin.webp', NL.state.credit, 253, 69, { w: 91 }));
      root.appendChild(NL.hit(180, 152, 180, 36, () => ui.toast('敬请期待。')));
      [['pack', '资源包'], ['mat', '材料']].forEach(([k, name], i) => root.appendChild(h('button.sh-cat' + (cat === k ? '.on' : ''), { style: { top: 228 + i * 61 }, 'data-cat': k, onclick: () => { cat = k; NL.refresh(); } }, name)));
      root.appendChild(h('div.sh-grid.scroll', { 'data-keep': 'shop-' + cat }, D.shop[cat].map((g) => {
        const book = g.per === '每周' ? l.wc : l.dc, left = g.limit ? g.limit - (book[g.id] || 0) : 0;
        return h('button.sh-card', { 'data-buy': g.id, onclick: () => {
          if (g.limit && left <= 0) return ui.toast('已达到限购次数。');
          ui.confirm('是否消耗<em>' + g.price + '阪神信用点</em>购买<em>' + g.name + '</em>？', () => {
            if (!game.spend('credit', g.price)) return ui.toast('阪神信用点不足。');
            if (g.limit) book[g.id] = (book[g.id] || 0) + 1;
            game.award([{ id: g.id, n: g.n }]);
          });
        } }, h('span', g.name), ui.itemEl(g.id, '×' + g.n), h('i', g.limit ? g.per + '限购:' + left + '/' + g.limit : ''),
          h('b', h('img', { src: NL.img('home/ico_coin.webp') }), String(g.price)));
      })));
    },
  };

  /* ---------- 补给 ---------- */
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  function pull(n) {
    const sp = D.supply[page], cost = sp.cost * n;
    const run = () => {
      if (!game.spend(sp.card, cost)) return ui.toast(D.items[sp.card].name + '不足。');
      const uids = [];
      for (let i = 0; i < n; i++) uids.push(game.addGear(pick(sp.pool))[0]);
      game.grant([{ id: 'crystal', n: sp.crystal * n }]);
      game.track('supply', n);
      game.track(sp.ev, n);
      NL.go('supplyResult', { uids, crystal: sp.crystal * n });
    };
    if (n > 1) ui.confirm('是否确认消耗' + cost + '个<em>' + D.items[sp.card].name + '</em>进行抽卡？', run); else run();
  }
  NL.screens.supply = {
    title: '', plate: true,
    render(root) {
      const sp = D.supply[page];
      root.appendChild(NL.sprite('supply/p' + (page + 1) + '.jpg', 0, 0, 360, 781));
      root.appendChild(ui.pill('item/supply_card.webp', game.count('supply_card'), 52, 69, { w: 91 }));
      root.appendChild(ui.pill('item/special_card.webp', game.count('special_card'), 150, 69, { w: 91 }));
      root.appendChild(ui.pill('home/ico_coin.webp', NL.state.credit, 248, 69, { w: 91 }));
      if (page > 0) root.appendChild(NL.hit(4, 460, 40, 54, () => { page--; NL.refresh(); }, { 'data-act': 'sp-prev' }));
      if (page < 2) root.appendChild(NL.hit(316, 460, 40, 54, () => { page++; NL.refresh(); }, { 'data-act': 'sp-next' }));
      root.appendChild(NL.hit(266, 102, 84, 26, () => ui.dialog({ html: sp.name + '<br>每次补给获得<em>' + sp.crystal + '装备晶片</em>，赠送1个装备。<br>消耗：' + D.items[sp.card].name + ' ×' + sp.cost + '／次' })));
      root.appendChild(NL.hit(12, 644, 168, 50, () => pull(1), { 'data-act': 'pull1' }));
      root.appendChild(NL.hit(182, 644, 166, 50, () => pull(10), { 'data-act': 'pull10' }));
    },
  };
  NL.screens.supplyResult = {
    title: '', plate: true,
    render(root, p) {
      root.classList.add('paper');
      root.appendChild(NL.sprite('supply/result_head.jpg', 0, 0, 360, 210));
      const one = p.uids.length === 1;
      root.appendChild(h('div.sr-grid' + (one ? '.one' : ''), p.uids.map((uid, i) => {
        const g = game.gear(uid), e = g ? D.equips[g.id] : null;
        return h('button.sr-card', { 'data-res': i, style: 'animation-delay:' + i * 0.05 + 's', onclick: () => g && ui.gearWin(uid) },
          h('u', String(i + 1).padStart(2, '0')), e ? h('img', { src: NL.img(e.icon), draggable: 'false' }) : null, h('span', e ? e.name : '已分解'));
      })));
      root.appendChild(h('div.sr-got', '获得', h('img', { src: NL.img('item/crystal.webp') }), '装备晶片×' + p.crystal));
      root.appendChild(h('button.sr-btn', { style: { left: 15 }, onclick: () => { NL.back(); pull(1); } }, '补给1次'));
      root.appendChild(h('button.sr-btn.y', { style: { left: 183 }, onclick: () => { NL.back(); pull(10); } }, '补给10次'));
    },
  };
})();
