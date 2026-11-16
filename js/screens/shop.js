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
      const l = log(), biao = NL.skin() === 'biao';
      root.classList.add('dots');
      ui.head(root, 'shop/head.jpg', 0, 0, 360, biao ? 150 : 195, 'STORE', '商城');
      root.appendChild(ui.pill('home/ico_coin.webp', NL.state.credit, 253, 69, { w: 91 }));
      // 里的两个页签烙在横幅图上;表的是真的按钮
      if (biao) root.appendChild(h('div.tabs2.sh-tabs', h('button.on', '阪神信用点商店'), h('button', { onclick: () => ui.toast('敬请期待。') }, '敬请期待')));
      else root.appendChild(NL.hit(180, 152, 180, 36, () => ui.toast('敬请期待。')));
      [['pack', '资源包'], ['mat', '材料']].forEach(([k, name], i) => root.appendChild(h('button.sh-cat' + (cat === k ? '.on' : ''), { style: { top: 228 + i * 61 }, 'data-cat': k, onclick: () => { cat = k; NL.refresh(); } }, name)));
      root.appendChild(h('div.sh-grid.scroll', { 'data-keep': 'shop-' + cat }, D.shop[cat].map((g) => {
        const book = g.per === '每周' ? l.wc : l.dc, left = g.limit ? g.limit - (book[g.id] || 0) : 0;
        return h('button.sh-card', { 'data-buy': g.id, onclick: () => {
          if (g.limit && left <= 0) return ui.toast('已达到限购次数。');
          buyWin(g, book, left);
        } }, h('span', g.name), ui.itemEl(g.id, '×' + g.n), h('i', g.limit ? g.per + '限购:' + left + '/' + g.limit : ''),
          h('b', h('img', { src: NL.img('home/ico_coin.webp') }), String(g.price)));
      })));
    },
  };

  // 购买窗(录屏 4:53):标题和底边取自录屏,中间是商品、宝箱内容、数量滑条和「共花费」
  function buyWin(g, book, left) {
    const m = ui.mask({});
    const d = D.items[g.id] || {}, pool = D.boxPools[g.id] || D.giftPools[g.id];
    const max = g.limit ? left : 100;
    let n = 1;
    const qty = h('b'), cost = h('b', String(g.price));
    const range = h('input', { type: 'range', min: '1', max: String(max), value: '1', oninput: () => set(+range.value) });
    function set(v) { n = Math.max(1, Math.min(max, v)); range.value = n; qty.textContent = n + '/' + max; cost.textContent = String(g.price * n); }
    const win = h('div.buy',
      NL.sprite('ui/buy_head.jpg', 0, 0, 330, 84), NL.sprite('ui/buy_foot.jpg', 0, 508, 330, 20),
      NL.state.gem === 100000 ? null : h('div.buy-gem', String(NL.state.gem)),
      NL.hit(288, 4, 42, 32, () => m.close()),
      h('div.buy-body',
        g.limit ? h('div.buy-limit', g.per + '限购：' + left + '/' + g.limit) : null,
        h('div.buy-name', g.name.replace(/\*\d+$/, '')),
        ui.itemEl(g.id, '×' + g.n, 'buy-ico'),
        h('div.buy-price', '单价', h('img', { src: NL.img('home/ico_coin.webp') }), h('b', String(g.price))),
        pool ? ui.sec('宝箱内容', 173) : null,
        pool ? h('div.buy-pool.scroll-x', pool.map((id) => ui.itemEl(id))) : null,
        ui.sec('描述', pool ? 260 : 173),
        h('div.buy-desc', { style: { top: pool ? 288 : 201 } }, d.desc || g.name),
        h('div.buy-qty', h('span', '购买数量', qty), h('button.minus', { onclick: () => set(n - 1) }), range, h('button.plus', { 'data-act': 'buy-plus', onclick: () => set(n + 1) })),
        h('div.buy-bar', '共花费', h('img', { src: NL.img('home/ico_coin.webp') }), cost,
          h('button', { 'data-act': 'buy-ok', onclick: () => {
            if (!game.spend('credit', g.price * n)) return ui.toast('阪神信用点不足。');
            m.close();
            if (g.limit) book[g.id] = (book[g.id] || 0) + n;
            game.award([{ id: g.id, n: g.n * n }]);
          } }, '购买'))));
    set(1);
    m.el.appendChild(win);
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 686, textAlign: 'center', margin: 0 } }, '点击空白处关闭。'));
  }

  /* ---------- 补给 ---------- */
  const pick = (list) => list[Math.floor(NL.rand() * list.length)];
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
  const spInfo = (sp) => ui.dialog({ html: sp.name + '<br>每次补给获得<em>' + sp.crystal + '装备晶片</em>，赠送1个装备。<br>消耗：' + D.items[sp.card].name + ' ×' + sp.cost + '／次' });
  const spPills = (root) => {
    root.appendChild(ui.pill('item/supply_card.webp', game.count('supply_card'), 52, 69, { w: 91 }));
    root.appendChild(ui.pill('item/special_card.webp', game.count('special_card'), 150, 69, { w: 91 }));
    root.appendChild(ui.pill('home/ico_coin.webp', NL.state.credit, 248, 69, { w: 91 }));
  };
  NL.screens.supply = {
    title: '', plate: true,
    // 表:里那张整页的图上烙着的字和按钮,这里都是真的部件
    renderBiao(root) {
      const sp = D.supply[page];
      root.classList.add('bs');
      root.appendChild(h('div.bs-bg', { style: { backgroundImage: NL.bg('supply/p' + (page + 1) + '.jpg') } }));
      spPills(root);
      root.appendChild(h('button.bs-info', { onclick: () => spInfo(sp) }, 'ⓘ 补给详情'));
      root.appendChild(h('div.bs-title', h('i', 'SUPPLY · 0' + (page + 1)), h('b', sp.name), h('span', '每次补给获得 ' + sp.crystal + ' 装备晶片，赠送 1 个装备')));
      if (page > 0) root.appendChild(h('button.bs-arrow.prev', { 'data-act': 'sp-prev', onclick: () => { page--; NL.refresh(); } }));
      if (page < 2) root.appendChild(h('button.bs-arrow.next', { 'data-act': 'sp-next', onclick: () => { page++; NL.refresh(); } }));
      root.appendChild(h('div.bs-dots', D.supply.map((_, i) => h('i' + (i === page ? '.on' : '')))));
      [1, 10].forEach((n, i) => root.appendChild(h('button.btn.bs-pull.' + (i ? 'purple' : 'dark'), { 'data-act': 'pull' + n, style: { left: 14 + i * 170 }, onclick: () => pull(n) },
        h('img', { src: NL.img(D.items[sp.card].icon), draggable: 'false' }), h('b', '×' + sp.cost * n), '补给' + n + '次')));
    },
    render(root) {
      const sp = D.supply[page];
      root.appendChild(NL.sprite('supply/p' + (page + 1) + '.jpg', 0, 0, 360, 781));
      spPills(root);
      if (page > 0) root.appendChild(NL.hit(4, 460, 40, 54, () => { page--; NL.refresh(); }, { 'data-act': 'sp-prev' }));
      if (page < 2) root.appendChild(NL.hit(316, 460, 40, 54, () => { page++; NL.refresh(); }, { 'data-act': 'sp-next' }));
      root.appendChild(NL.hit(266, 102, 84, 26, () => spInfo(sp)));
      root.appendChild(NL.hit(12, 644, 168, 50, () => pull(1), { 'data-act': 'pull1' }));
      root.appendChild(NL.hit(182, 644, 166, 50, () => pull(10), { 'data-act': 'pull10' }));
    },
  };
  // 结果页:十张卡片分两排,每往右一张高出 9.5(量自录屏 5:19),名字下面的色条是品质
  function resultCards(root, p) {
    const one = p.uids.length === 1;
    const RARE_RANK = { white: 1, green: 2, blue: 3, purple: 4, orange: 5 };
    let best = 0;
    p.uids.forEach((uid, i) => {
      const g = game.gear(uid), e = g ? D.equips[g.id] : null, c = i % 5, r = Math.floor(i / 5);
      const color = e ? D.rarity[e.rare][1] : '#b9b8c2';
      root.appendChild(h('button.sr-card', { 'data-res': i, style: 'left:' + (one ? 151 : 16 + c * 65.5) + 'px;top:' + (one ? 300 : 256 - c * 9.5 + r * 173) + 'px;--i:' + i + ';--dx:' + (one ? 0 : (2 - c) * 60) + 'px;--q:' + color, onclick: () => g && ui.gearWin(uid) },
        h('u', String(i + 1).padStart(2, '0')), h('i'), e ? h('img', { src: NL.img(e.icon), draggable: 'false' }) : null, h('span', e ? e.name : '已分解'), h('em')));
      if (e && e.rare !== 'white' && e.rare !== 'green') root.lastChild.classList.add('r-' + e.rare);
      if (e && RARE_RANK[e.rare] > best) best = RARE_RANK[e.rare];
    });
    // 升级动效的抽卡编排:先闪一下白光(出了橙色就换成放射光),卡片一张张发下来翻开;点任意处直接看结果
    if (!p.seen) {
      p.seen = true;
      root.appendChild(h('div.sr-flash' + (best >= 5 ? '.orange' : '')));
      if (best >= 4) NL.motion.shake(best >= 5 ? 0.7 : 0.4);
      root.addEventListener('pointerdown', () => root.classList.add('skip'), { once: true });
    } else root.classList.add('skip');
  }
  NL.screens.supplyResult = {
    title: '', plate: true,
    renderBiao(root, p) {
      const sp = D.supply[page];
      root.classList.add('bs', 'bsr');
      root.appendChild(h('div.bs-bg', { style: { backgroundImage: NL.bg('supply/p' + (page + 1) + '.jpg') } }));
      root.appendChild(h('div.bs-title', h('i', 'SUPPLY RESULT'), h('b', '补给结果'), h('span', sp.name)));
      resultCards(root, p);
      root.appendChild(h('div.bsr-got', h('img', { src: NL.img('item/crystal.webp'), draggable: 'false' }), '装备晶片 ×' + p.crystal));
      [1, 10].forEach((n, i) => root.appendChild(h('button.btn.bs-pull.' + (i ? 'purple' : 'dark'), { 'data-act': 'again' + n, style: { left: 14 + i * 170 }, onclick: () => { NL.back(); pull(n); } },
        h('img', { src: NL.img(D.items[sp.card].icon), draggable: 'false' }), h('b', '×' + sp.cost * n), '再补给' + n + '次')));
    },
    render(root, p) {
      root.classList.add('paper');
      root.appendChild(NL.sprite('supply/result_head.jpg', 0, 0, 360, 210));
      root.appendChild(NL.sprite('supply/result_foot.jpg', 0, 640, 360, 85));
      resultCards(root, p);
      // 底图上烙着十连的「装备晶片X50」,数量不同时盖一层自己的字
      if (p.crystal !== 50) root.appendChild(h('div.sr-got', '装备晶片X' + p.crystal));
      [1, 10].forEach((n, i) => {
        root.appendChild(NL.hit(15 + i * 169, 673, 162, 46, () => { NL.back(); pull(n); }, { 'data-act': 'again' + n }));
      });
    },
  };
})();
