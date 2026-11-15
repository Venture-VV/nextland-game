/* 仓库:道具 / 装备 两个页签 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;
  const HIDDEN = ['crystal', 'supply_card', 'special_card', 'daily_point']; // 这些在各自的页面里显示,不占仓库格子
  const CATS = [['all', '全部'], ['head', '头盔'], ['neck', '项链'], ['weapon', '武器'], ['hand', '手饰'], ['armor', '护甲'], ['pants', '裤子'], ['shoes', '鞋子']];
  let tab = 'item', cat = 'all';

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  function useBox(id) {
    if (!game.spend(id, 1)) return;
    const got = D.boxPools[id] ? pick(D.boxPools[id]) : pick(D.giftPools[id]);
    game.award([{ id: got, n: 1 }]);
  }
  function itemWin(id) {
    const d = D.items[id];
    const usable = D.boxPools[id] || D.giftPools[id];
    ui.win({
      title: '道具', h: 300,
      body(b, m) {
        b.classList.add('gw');
        b.appendChild(h('i.gw-bar', { style: { background: '#b9b8c2' } }));
        b.appendChild(h('div.gw-name', d.name));
        b.appendChild(h('div.gw-type', h('i'), d.kind || '道具'));
        b.appendChild(h('div.gw-ico', { style: { backgroundImage: NL.bg(d.icon) } }));
        b.appendChild(h('div.gw-power.plain', h('span', '持有'), h('b', String(game.count(id)))));
        b.appendChild(ui.sec('描述', 129));
        b.appendChild(h('div.gw-desc', { style: { top: 152 } }, d.desc || ''));
        b.appendChild(usable
          ? h('button.btn.purple.gw-ok', { style: { top: 224 }, 'data-act': 'use', onclick: () => { m.close(); useBox(id); } }, '使用')
          : h('button.btn.dark.gw-ok', { style: { top: 224 }, onclick: () => m.close() }, '确认'));
      },
    });
  }

  NL.screens.bag = {
    title: '', nav: 'bag', plate: true,
    render(root) {
      const s = NL.state;
      const items = Object.keys(s.bag).filter((id) => s.bag[id] > 0 && !HIDDEN.includes(id) && D.items[id]);
      root.classList.add('dots');
      root.appendChild(NL.sprite('bag/head_' + tab + '.jpg', 0, 0, 360, 205));
      root.appendChild(NL.hit(24, 158, 94, 30, () => { tab = 'item'; NL.refresh(); }, { 'data-tab': 'item' }));
      root.appendChild(NL.hit(122, 158, 96, 30, () => { tab = 'equip'; NL.refresh(); }, { 'data-tab': 'equip' }));
      const used = tab === 'item' ? items.length : s.gear.length, cap = tab === 'item' ? 99 : 200;
      root.appendChild(h('div.bag-cap', used + '/' + cap));
      root.appendChild(h('div.bag-capbar', h('i', { style: { width: (used / cap) * 100 + '%' } })));
      if (tab === 'item') {
        root.appendChild(h('button.bag-btn', { style: { left: 15, top: 213 }, onclick: () => ui.toast('暂无可筛选的类别。') }, h('i.funnel'), '筛选'));
        root.appendChild(h('button.bag-btn', { style: { left: 265, top: 213 }, onclick: () => ui.toast('没有可出售的道具。') }, '批量出售'));
        root.appendChild(h('button.bag-cat.on', { style: { top: 262 } }, '全部'));
        root.appendChild(h('div.bag-grid.scroll', { style: { top: 250 }, 'data-keep': 'bag-item' },
          items.map((id) => { const el = ui.itemEl(id, s.bag[id]); el.dataset.item = id; el.onclick = () => itemWin(id); return el; })));
      } else {
        root.appendChild(h('div.bag-set', h('div', '已穿戴套装', h('b', { onclick: () => ui.toast('暂无可激活的套装。') }, '全部套装')), h('span', '⊘ 暂无激活套装效果')));
        root.appendChild(h('button.bag-btn', { style: { left: 15, top: 294 }, onclick: () => ui.toast('请用左侧的部位分类筛选。') }, h('i.funnel'), '筛选'));
        root.appendChild(h('button.bag-btn', { style: { left: 265, top: 294 }, 'data-act': 'bulk', onclick: bulk }, '批量分解'));
        CATS.forEach(([k, name], i) => root.appendChild(h('button.bag-cat' + (cat === k ? '.on' : ''), { style: { top: 337 + i * 38.5 }, 'data-cat': k, onclick: () => { cat = k; NL.refresh(); } }, name)));
        const list = game.sortedGear().filter((g) => cat === 'all' || D.equips[g.id].type === cat);
        root.appendChild(h('div.bag-grid.scroll', { style: { top: 320 }, 'data-keep': 'bag-equip' },
          list.map((g) => ui.gearCell(g, { worn: !!game.slotOf(g.uid), onclick: () => { g.isNew = false; NL.save(); ui.gearWin(g.uid); } }))));
      }
    },
  };
  function bulk() {
    const low = NL.state.gear.filter((g) => !game.slotOf(g.uid) && ['white', 'green'].includes(D.equips[g.id].rare));
    if (!low.length) return ui.toast('没有可分解的装备。');
    ui.confirm('是否分解全部未穿戴的<em>白品、绿品</em>装备（共 ' + low.length + ' 件）？', () => game.dismantle(low.map((g) => g.uid)));
  }
})();
