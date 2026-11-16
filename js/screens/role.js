/* 角色:档案 / 装备 / 强化 / 芯片,接口升级,装备窗口,权益加成 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;
  const RANK = { orange: 5, purple: 4, blue: 3, green: 2, white: 1 };
  const KEEP_OLD = ['hat', 'choker', 'boots', 'bracelet']; // 录屏里这几件没有 NEW 角标
  let tab = 'profile';

  NL.defaults.push(() => {
    const gear = [], equipped = {};
    let uid = 1;
    Object.entries(D.startEquipped).forEach(([slot, id]) => { gear.push({ uid, id }); equipped[slot] = uid++; });
    D.startGear.forEach((id, i) => gear.push({ uid: uid++, id, isNew: i >= 7 && !KEEP_OLD.includes(id) }));
    return { gear, equipped, iface: {}, uidNext: uid, bag: { crystal: 651, box_white: 3, special_card: 961 } };
  });

  /* ---------- 数值 ---------- */
  game.gear = (uid) => NL.state.gear.find((g) => g.uid === uid);
  game.slotOf = (uid) => Object.keys(NL.state.equipped).find((k) => NL.state.equipped[k] === uid);
  // 录屏:面板战力 485 的项链穿上后战力 +535,约 1.1 倍;接口每级再加 1%
  game.gearPower = (id, slot) => Math.round((D.equips[id].eff || D.equips[id].power) * 1.1 * (1 + (NL.state.iface[slot] || 0) * 0.01));
  game.powerParts.push(() => Object.entries(NL.state.equipped).reduce((sum, [slot, uid]) => {
    const g = game.gear(uid);
    return g ? sum + game.gearPower(g.id, slot) : sum;
  }, 0));
  game.addGear = function (id, n) {
    const uids = [];
    for (let i = 0; i < (n || 1); i++) { uids.push(NL.state.uidNext); NL.state.gear.push({ uid: NL.state.uidNext++, id, isNew: true }); }
    return uids;
  };
  game.equip = function (slot, uid) {
    const before = game.power();
    NL.state.equipped[slot] = uid;
    game.gear(uid).isNew = false;
    NL.save(); NL.refresh();
    ui.toast('穿戴成功。', true);
    ui.powerUp(game.power() - before);
  };
  game.unequip = function (slot) {
    const before = game.power();
    delete NL.state.equipped[slot];
    NL.save(); NL.refresh();
    ui.toast('卸下成功。', true);
    ui.powerUp(game.power() - before);
  };
  game.sortedGear = function () {
    const key = (g) => (game.slotOf(g.uid) ? 100 : 0) + RANK[D.equips[g.id].rare] * 10;
    return NL.state.gear.slice().sort((a, b) => key(b) - key(a) || a.uid - b.uid);
  };
  const crystalOf = (id) => D.rarity[D.equips[id].rare][2];
  game.dismantle = function (uids) {
    let n = 0;
    uids.forEach((uid) => { const g = game.gear(uid); if (g && !game.slotOf(uid)) { n += crystalOf(g.id); NL.state.gear.splice(NL.state.gear.indexOf(g), 1); } });
    if (n) game.award([{ id: 'crystal', n }]);
  };
  // 单件分解:先确认;紫色及以上,或者带权益的,再确认一次(策划文档的规则)
  function askDismantle(uid, onDone) {
    const g = game.gear(uid), e = g && D.equips[g.id];
    if (!e) return;
    const go = () => { if (onDone) onDone(); game.dismantle([uid]); };
    const precious = RANK[e.rare] >= RANK.purple || !!e.perk;
    ui.confirm('是否分解<em>' + e.name + '</em>？可获得装备晶片 ' + crystalOf(g.id) + '。', () => (precious
      ? ui.confirm('<em>' + e.name + '</em>是' + D.rarity[e.rare][0] + '品' + (e.perk ? '、带权益的' : '') + '装备，分解后无法找回。确定分解吗？', go) : go()));
  }
  // 从仓库穿戴:放进同类型的第一个空格,没有空格就换掉第一个
  function slotFor(id) {
    const list = D.slots.filter((s) => s.type === D.equips[id].type);
    return (list.find((s) => !NL.state.equipped[s.id]) || list[0]).id;
  }

  /* ---------- 装备窗口 ---------- */
  const mark = (t) => t.replace(/\{(.+?)\}/g, '<em>$1</em>');
  // opts.slot: 从角色页点格子进来,列出可选装备;否则是仓库里的详情
  ui.gearWin = function (uid, opts) {
    opts = opts || {};
    let m = null;
    // 上半部分:名字、部位、图、战力、套装、属性(详情和选装备两种窗口共用,坐标量自录屏 4:03 和 3:21)
    function head(b, e, worn) {
      b.classList.add('gw');
      b.appendChild(h('i.gw-bar', { style: { background: D.rarity[e.rare][1] } }));
      b.appendChild(h('div.gw-name', e.name));
      b.appendChild(h('div.gw-type', h('i'), D.slotTypes[e.type]));
      b.appendChild(h('div.gw-ico', { style: { backgroundImage: NL.bg(e.icon) } }, worn ? h('span', '已装备') : null, h('u')));
      b.appendChild(h('div.gw-power', h('i'), h('span', '战力'), h('b', String(e.power), h('u', '▲'))));
      b.appendChild(h('div.gw-dots'));
      b.appendChild(h('div.gw-set', '⊘ 无套装效果'));
      b.appendChild(h('div.gw-attrs',
        e.attr ? h('div', h('i.blue', '属性'), h('span', { html: e.attr.replace(/(\+.+)$/, '<em>$1</em>') })) : null,
        e.perk ? h('div', h('i', '权益'), h('span', { html: mark(e.perk) })) : null));
    }
    // 选装备:列出这个格子能穿的
    function pick(cur) {
      if (m) m.close();
      const g = game.gear(cur), e = g && D.equips[g.id];
      m = ui.win({ title: '装备', h: 533 });
      const b = m.body;
      if (!e) { b.appendChild(h('div.gw-none', '这个格子还没有可穿戴的装备')); return; }
      const worn = game.slotOf(cur);
      head(b, e, false);
      const type = D.slots.find((s) => s.id === opts.slot).type;
      const list = game.sortedGear().filter((x) => D.equips[x.id].type === type && (!game.slotOf(x.uid) || game.slotOf(x.uid) === opts.slot));
      b.appendChild(ui.sec('可选装备', 252));
      b.appendChild(h('div.gw-grid.scroll', list.map((x) => gearCell(x, { sel: x.uid === cur, onclick: () => pick(x.uid) }))));
      b.appendChild(h('button.btn.gw-ok.' + (worn ? 'dark' : 'purple'), { 'data-act': 'wear', onclick: () => {
        const src = b.querySelector('.gw-ico'), rect = src.getBoundingClientRect(), image = src.style.backgroundImage;
        m.close();
        if (worn) return;
        game.equip(opts.slot, cur);
        flyGear(rect, image, document.querySelector("#screen [data-slot='" + opts.slot + "']"));
      } }, '穿戴'));
    }
    // 详情:没穿的是「分解 / 穿戴」,穿着的是「卸下 / 替换」
    function detail(cur) {
      if (m) m.close();
      const g = game.gear(cur), e = g && D.equips[g.id];
      if (!e) return;
      const worn = game.slotOf(cur);
      m = ui.win({ title: '装备', h: 476 });
      const b = m.body;
      head(b, e, !!worn);
      b.appendChild(ui.sec('描述', 256));
      b.appendChild(h('div.gw-desc', e.desc));
      b.appendChild(ui.sec('获取来源', 306));
      e.src.slice(0, 2).forEach((t, i) => b.appendChild(h('div.gw-src', { style: { top: 328 + i * 28 } }, t, h('i'))));
      b.appendChild(h('div.gw-btns', worn
        ? [h('button.btn.pink', { 'data-act': 'unwear', onclick: () => { m.close(); game.unequip(worn); } }, '卸下'),
          h('button.btn.dark', { 'data-act': 'swap', onclick: () => { opts.slot = worn; pick(cur); } }, '替换')]
        : [h('button.btn.pink', { 'data-act': 'dismantle', onclick: () => askDismantle(cur, () => m.close()) }, h('small', '可获 晶片 ' + crystalOf(g.id)), '分解'),
          h('button.btn.purple', { 'data-act': 'wear', onclick: () => {
            const src = b.querySelector('.gw-ico'), rect = src.getBoundingClientRect(), image = src.style.backgroundImage, slot = opts.slot || slotFor(g.id);
            m.close();
            game.equip(slot, cur);
            flyGear(rect, image, document.querySelector("#screen [data-slot='" + slot + "']") || document.querySelector('#nav [data-nav=role]'));
          } }, '穿戴')]));
    }
    if (opts.slot && !(game.gear(uid) && game.slotOf(uid))) pick(uid); else detail(uid);
  };
  // 升级动效:穿戴时,装备图从窗口飞到角色页的装备格;不在角色页就飞向底部导航的「角色」
  function flyGear(rect, image, to) {
    if (!to || !rect.width || !NL.motion.on()) return;
    const s = document.querySelector('#stage').getBoundingClientRect(), k = NL.scale || 1;
    NL.motion.fly({ x: (rect.left - s.left) / k, y: (rect.top - s.top) / k, w: rect.width / k, h: rect.height / k }, to, { image });
  }
  function gearCell(g, o) {
    const e = D.equips[g.id];
    return h('div.item.gear' + (o.sel ? '.sel' : ''), { 'data-gear': g.id, style: { backgroundImage: NL.bg(e.icon) }, onclick: o.onclick },
      o.worn ? h('span.worn', '已装备') : null, g.isNew ? h('span.new', 'NEW') : null);
  }
  ui.gearCell = gearCell;

  // 权益加成
  function perkWin() {
    let seg = 'perk';
    const m = ui.win({ title: '权益加成', h: 533 });
    m.body.classList.add('pk');
    const row = (i, tag, text, val, right, off) => h('div.pk-row' + (off ? '.off' : ''), { style: { top: 98 + i * 30.5 } }, h('i', tag), h('span', text + ' ', h('em', val)), h('b', right));
    function draw() {
      m.body.textContent = '';
      m.body.appendChild(h('div.seg', ['add', 'perk'].map((k) => h('button' + (seg === k ? '.on' : ''), { onclick: () => { seg = k; draw(); } }, k === 'add' ? '加成信息' : '权益信息'))));
      if (seg === 'perk') {
        m.body.appendChild(h('div.pk-top', ui.sec('线上权益'), h('span', '剩余有效时间')));
        D.perks.forEach((p, i) => m.body.appendChild(row(i, p[0], p[1], p[2], p[3])));
        // 录屏里还有第三条,和第一条同类型,被压成灰色并标了「同类型冲突」
        m.body.appendChild(row(D.perks.length, D.perks[0][0], D.perks[0][1], D.perks[0][2], D.perks[0][3], true));
        m.body.appendChild(h('div.pk-clash', { style: { top: 98 + D.perks.length * 30.5 - 10 } }, '同类型冲突'));
        m.body.appendChild(h('button.btn.pink.small.pk-src', { onclick: () => ui.toast('权益来自已穿戴的装备。') }, '详细来源'));
      } else {
        m.body.appendChild(h('div.pk-top', ui.sec('战力构成')));
        [['等级', game.levelPower(NL.state.level)], ['装备', game.powerParts[1]()], ['基础', 12335]].forEach((p, i) => m.body.appendChild(row(i, p[0], '战力', '+' + p[1], '')));
      }
    }
    draw();
  }

  /* ---------- 角色页 ---------- */
  const TABS = [['profile', 150], ['equip', 187], ['enh', 226], ['chip', 264]];
  const CHIPS = [[64, 341, 'A'], [148, 341, 'B'], [232, 341, 'C'], [22, 411, '万能'], [109, 411, 'A'], [193, 411, 'B'], [277, 411, 'C'], [64, 482, 'A'], [148, 482, 'B'], [232, 482, 'C']];
  NL.screens.role = {
    title: '', nav: 'role', plate: true,
    render(root) {
      const s = NL.state;
      root.appendChild(NL.sprite('role/' + tab + '.jpg', 0, 0, 360, 700));
      TABS.forEach(([k, y]) => root.appendChild(NL.hit(0, y - 2, 80, 32, () => { tab = k; NL.refresh(); }, { 'data-tab': k })));
      // 引导开着时,原版在底部导航的「任务」上方一直有个箭头(以前是烙在底图上的)
      if (s.guide === 'on') root.appendChild(h('div.guide-arrow', { style: { left: 229, top: 667 } }));
      if (tab !== 'enh' || true) {
        root.appendChild(h('div.role-power', NL.fmt.power(game.power())));
        root.appendChild(NL.hit(250, 666, 100, 30, perkWin, { 'data-act': 'perks' }));
      }
      if (tab === 'profile') {
        const need = game.expNeed(s.level);
        if (s.level !== 21) root.appendChild(h('div.role-lv', String(s.level)));
        root.appendChild(h('div.role-exp', s.exp + '/' + need));
        root.appendChild(h('div.role-expbar', h('i', { style: { width: Math.min(100, (s.exp / need) * 100) + '%' } })));
        root.appendChild(NL.hit(237, 555, 50, 58, () => NL.go('faction')));
        root.appendChild(NL.hit(292, 555, 54, 58, () => ui.toast('种族：改造者')));
      } else if (tab === 'equip') {
        D.slots.forEach((sl) => {
          const [ix, iy] = sl.at;
          const g = game.gear(s.equipped[sl.id]);
          if (g) {
            root.appendChild(NL.sprite('role/slot_' + sl.id + '.jpg', (ix - 34) / 2, (iy - 24) / 2, 73, 75));
            root.appendChild(NL.sprite(D.equips[g.id].icon, (ix - 2) / 2, (iy + 6) / 2, 50, 50));
            if (s.iface[sl.id]) root.appendChild(h('div.slot-lv', { style: { left: (ix - 34) / 2 + 2, top: (iy - 24) / 2 + 51 } }, String(s.iface[sl.id])));
          }
          root.appendChild(NL.hit((ix - 30) / 2, (iy - 20) / 2, 68, 70, () => openSlot(sl), { 'data-slot': sl.id }));
        });
        root.appendChild(NL.hit(285, 584, 60, 16, () => ui.toast('暂无可激活的套装。')));
      } else if (tab === 'enh') {
        root.appendChild(NL.hit(20, 328, 200, 54, () => NL.go('iface'), { 'data-act': 'iface' }));
        root.appendChild(NL.hit(20, 397, 200, 54, () => ui.toast('种族天赋暂未开放。')));
        root.appendChild(NL.hit(20, 466, 200, 54, () => ui.toast('势力天赋暂未开放。')));
      } else {
        CHIPS.forEach(([x, y, kind], i) => root.appendChild(NL.hit(x, y, 58, 58, () => chipWin(i, kind), { 'data-chip': i + 1 })));
        root.appendChild(NL.hit(122, 584, 120, 30, () => ui.toast('芯片背包是空的。')));
      }
    },
    // 表的画法:夜色底 + 主角立绘 + 自己排的面板。页签、装备格、芯片槽、权益加成和里一一对应
    // 表的画法:主角是抠出来的透明底全身像,站在页面自己画的舞台上(光柱、光环、远处的城市),不是贴一张方图。
    // 装备页把十个装备格分列在主角两侧;其余三页在下面的面板里。能点的东西和里一一对应
    renderBiao(root) {
      const s = NL.state;
      root.classList.add('bp');
      root.classList.add('br');
      root.appendChild(h('div.br-city', { style: { backgroundImage: NL.bg('home/bg.webp') } }));
      root.appendChild(h('div.br-mark', 'CYBORG'));
      root.appendChild(h('div.br-beam'));
      root.appendChild(h('div.br-stage'));
      root.appendChild(h('div.br-hero', { style: { backgroundImage: NL.bg('partner/cut_hero.webp') } }));
      root.appendChild(h('div.bp-name', h('b', s.name), h('i', '改造者'), h('span', 'Lv.' + s.level + '　角色档案')));
      if (tab === 'equip') {
        const SIDE = { l: ['head', 'neck', 'armor', 'pants', 'shoes'], r: ['weapon', 'hand1', 'hand2', 'hand3', 'hand4'] }; // 左边是穿在身上的,右边是拿在手上的
        root.appendChild(h('div.br-slots', Object.keys(SIDE).map((side) => h('div.' + side, SIDE[side].map((id) => {
          const sl = D.slots.find((x) => x.id === id), g = game.gear(s.equipped[id]);
          return h('button' + (g ? '.has' : ''), { 'data-slot': id, onclick: () => openSlot(sl) },
            g ? h('img', { src: NL.img(D.equips[g.id].icon), draggable: 'false' }) : h('em', '+'), h('span', sl.name), s.iface[id] ? h('u', '+' + s.iface[id]) : null);
        })))));
      }
      root.appendChild(h('div.br-tabs', [['profile', '档案'], ['equip', '装备'], ['enh', '强化'], ['chip', '芯片']].map(([k, name]) =>
        h('button' + (tab === k ? '.on' : ''), { 'data-tab': k, onclick: () => { tab = k; NL.refresh(); } }, name))));
      if (s.guide === 'on') root.appendChild(h('div.guide-arrow', { style: { left: 229, top: 667 } }));
      const panel = h('div.br-panel.' + tab);
      root.appendChild(panel);
      if (tab === 'profile') {
        const need = game.expNeed(s.level);
        panel.appendChild(h('div.br-lv', h('b', 'Lv.' + s.level), h('span', '经验 ' + s.exp + ' / ' + need), h('div.bar', h('i', { style: { width: Math.min(100, (s.exp / need) * 100) + '%' } }))));
        panel.appendChild(h('div.br-rows',
          h('button', { onclick: () => NL.go('faction') }, h('span', '势力'), '查看'),
          h('button', { onclick: () => ui.toast('种族：改造者') }, h('span', '种族'), '改造者')));
      } else if (tab === 'equip') {
        const worn = D.slots.filter((sl) => s.equipped[sl.id]).length;
        panel.appendChild(h('div.br-hint', h('b', '已穿戴 ' + worn + ' / ' + D.slots.length), h('span', '点主角两侧的格子更换装备')));
        panel.appendChild(h('button.br-link', { onclick: () => ui.toast('暂无可激活的套装。') }, '全部套装 ›'));
      } else if (tab === 'enh') {
        panel.appendChild(h('div.br-list',
          h('button', { 'data-act': 'iface', onclick: () => NL.go('iface') }, h('b', '接口升级'), h('span', '提高装备格的加成')),
          h('button', { onclick: () => ui.toast('种族天赋暂未开放。') }, h('b', '种族天赋'), h('span', '暂未开放')),
          h('button', { onclick: () => ui.toast('势力天赋暂未开放。') }, h('b', '势力天赋'), h('span', '暂未开放'))));
      } else {
        panel.appendChild(h('div.br-chips', CHIPS.map(([, , kind], i) => h('button', { 'data-chip': i + 1, onclick: () => chipWin(i, kind) }, h('b', kind), h('span', String(i + 1))))));
        panel.appendChild(h('button.br-link', { onclick: () => ui.toast('芯片背包是空的。') }, '芯片背包 ›'));
      }
      root.appendChild(h('div.br-power', h('span', '战力'), h('b', NL.fmt.power(game.power())),
        h('button', { 'data-act': 'perks', onclick: perkWin }, '权益加成')));
    },
  };
  // 点装备格:穿着的看详情,空的列出能穿的
  function openSlot(sl) {
    const g = game.gear(NL.state.equipped[sl.id]);
    const first = g ? g.uid : (game.sortedGear().find((x) => D.equips[x.id].type === sl.type && !game.slotOf(x.uid)) || {}).uid;
    ui.gearWin(first, { slot: sl.id });
  }
  function chipWin(i, kind) {
    ui.win({ title: '选择芯片', h: 476, body: h('div.chip-win', h('b', (i + 1) + ' 号槽 · ' + kind), h('span', '没有能放进这个槽的芯片')) });
  }

  /* ---------- 接口升级 ---------- */
  const IF_ICON = { head: 'head', neck: 'neck', weapon: 'weapon', hand: 'hand', armor: 'armor', pants: 'pants', shoes: 'shoes' };
  const ifCost = (lv) => 60 * Math.pow(2, lv); // 录屏:651 → 升 3 级后 231,即 60、120、240
  NL.screens.iface = {
    title: '接口升级',
    render(root) {
      const s = NL.state;
      root.classList.add('wall');
      ui.head(root, 'role/iface_bg.jpg', 0, 0, 360, 120, 'INTERFACE', '接口升级');
      root.appendChild(ui.pill('item/crystal.webp', game.count('crystal'), 254, 70, { w: 91 }));
      root.appendChild(h('div.if-list.scroll', { 'data-keep': 'iface' }, D.slots.map((sl) => {
        const lv = s.iface[sl.id] || 0, cost = ifCost(lv), ok = game.count('crystal') >= cost;
        return h('div.if-row',
          h('div.if-lv', '等级:' + lv),
          h('img.if-ico', { src: NL.img('role/if_' + IF_ICON[sl.type] + '.jpg'), draggable: 'false' }),
          h('div.if-name', sl.name), h('div.if-rate', '义体属性倍率', h('b', lv + '%')),
          h('div.if-cost', '使用', h('img', { src: NL.img('item/crystal.webp') }), h('b' + (ok ? '' : '.no'), String(cost))),
          h('button.if-btn' + (ok ? '' : '.off'), { 'data-up': sl.id, onclick: () => {
            if (!game.spend('crystal', cost)) return ui.toast('装备晶片不足。');
            const before = game.power();
            s.iface[sl.id] = lv + 1;
            NL.save(); NL.refresh();
            ui.toast('升级成功。', true);
            ui.powerUp(game.power() - before);
          } }, '升级'));
      })));
    },
  };
})();
