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
  game.gearPower = (id, slot) => Math.round(D.equips[id].power * 1.1 * (1 + (NL.state.iface[slot] || 0) * 0.01));
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
    function draw(cur) {
      if (m) m.close();
      const g = game.gear(cur), e = g && D.equips[g.id];
      m = ui.win({ title: '装备', top: opts.slot ? 62 : 108, hintTop: 628 });
      const b = m.body;
      b.classList.add('gw');
      if (!e) { b.appendChild(h('div.gw-none', '这个格子还没有可穿戴的装备')); return; }
      const worn = game.slotOf(cur);
      b.appendChild(h('div.gw-name', { style: { borderColor: D.rarity[e.rare][1] } }, e.name));
      b.appendChild(h('div.gw-type', D.slotTypes[e.type]));
      b.appendChild(h('div.gw-power', h('i', '💥'), h('span', '战力'), h('b', String(e.power)), h('u', '▲')));
      b.appendChild(h('div.gw-ico', { style: { backgroundImage: NL.bg(e.icon) } }));
      b.appendChild(h('div.gw-set', '⊘ 无套装效果'));
      b.appendChild(h('div.gw-attrs',
        e.attr ? h('div', h('i.blue', '属性'), h('span', { html: e.attr.replace(/(\+.+)$/, '<em>$1</em>') })) : null,
        e.perk ? h('div', h('i', '权益'), h('span', { html: mark(e.perk) })) : null));
      if (opts.slot) {
        const type = D.slots.find((s) => s.id === opts.slot).type;
        const list = game.sortedGear().filter((x) => D.equips[x.id].type === type && (!game.slotOf(x.uid) || game.slotOf(x.uid) === opts.slot));
        b.appendChild(ui.sec('可选装备'));
        b.appendChild(h('div.gw-grid.scroll', list.map((x) => gearCell(x, { sel: x.uid === cur, onclick: () => draw(x.uid) }))));
        b.appendChild(h('button.btn.gw-ok.' + (worn ? 'dark' : 'purple'), { 'data-act': 'wear', onclick: () => { m.close(); if (!worn) game.equip(opts.slot, cur); } }, '穿戴'));
      } else {
        b.appendChild(ui.sec('描述'));
        b.appendChild(h('div.gw-desc', e.desc));
        b.appendChild(ui.sec('获取来源'));
        e.src.forEach((t) => b.appendChild(h('div.gw-src', t, h('i'))));
        b.appendChild(h('div.gw-btns',
          h('button.btn.pink', { disabled: worn ? '' : null, onclick: () => { m.close(); game.dismantle([cur]); } }, h('small', '可获 晶片 ' + crystalOf(g.id)), '分解'),
          h('button.btn.purple', { 'data-act': 'wear', disabled: worn ? '' : null, onclick: () => { m.close(); game.equip(slotFor(g.id), cur); } }, worn ? '已穿戴' : '穿戴')));
      }
    }
    draw(uid);
  };
  function gearCell(g, o) {
    const e = D.equips[g.id];
    return h('div.item.gear' + (o.sel ? '.sel' : ''), { 'data-gear': g.id, style: { backgroundImage: NL.bg(e.icon) }, onclick: o.onclick },
      o.worn ? h('span.worn', '已装备') : null, g.isNew ? h('span.new', 'NEW') : null);
  }
  ui.gearCell = gearCell;

  // 权益加成
  function perkWin() {
    let seg = 'perk';
    const m = ui.win({ title: '权益加成', top: 136, hintTop: 690 });
    m.body.classList.add('pk');
    function draw() {
      m.body.textContent = '';
      m.body.appendChild(h('div.seg', ['add', 'perk'].map((k) => h('button' + (seg === k ? '.on' : ''), { onclick: () => { seg = k; draw(); } }, k === 'add' ? '加成信息' : '权益信息'))));
      if (seg === 'perk') {
        m.body.appendChild(h('div.pk-top', ui.sec('线上权益'), h('span', '剩余有效时间')));
        D.perks.forEach((p) => m.body.appendChild(h('div.pk-row', h('i', p[0]), h('span', p[1] + ' ', h('em', p[2])), h('b', p[3]))));
        m.body.appendChild(h('button.btn.pink.small.pk-src', { onclick: () => ui.toast('权益来自已穿戴的装备。') }, '详细来源'));
      } else {
        m.body.appendChild(h('div.pk-top', ui.sec('战力构成')));
        [['等级', game.levelPower(NL.state.level)], ['装备', game.powerParts[1]()], ['基础', 12335]].forEach((p) =>
          m.body.appendChild(h('div.pk-row', h('i', p[0]), h('span', '战力 ', h('em', '+' + p[1])), h('b', ''))));
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
          const first = g ? g.uid : (game.sortedGear().find((x) => D.equips[x.id].type === sl.type && !game.slotOf(x.uid)) || {}).uid;
          root.appendChild(NL.hit((ix - 30) / 2, (iy - 20) / 2, 68, 70, () => ui.gearWin(first, { slot: sl.id }), { 'data-slot': sl.id }));
        });
        root.appendChild(NL.hit(285, 584, 60, 16, () => ui.toast('暂无可激活的套装。')));
      } else if (tab === 'enh') {
        root.appendChild(NL.hit(20, 328, 200, 54, () => NL.go('iface'), { 'data-act': 'iface' }));
        root.appendChild(NL.hit(20, 397, 200, 54, () => ui.toast('种族天赋暂未开放。')));
        root.appendChild(NL.hit(20, 466, 200, 54, () => ui.toast('势力天赋暂未开放。')));
      } else {
        CHIPS.forEach(([x, y, kind], i) => root.appendChild(NL.hit(x, y, 58, 58, () => ui.win({
          title: '选择芯片', top: 112, hintTop: 628,
          body: h('div.chip-win', h('b', (i + 1) + ' 号槽 · ' + kind), h('span', '没有能放进这个槽的芯片')),
        }), { 'data-chip': i + 1 })));
        root.appendChild(NL.hit(122, 584, 120, 30, () => ui.toast('芯片背包是空的。')));
      }
    },
  };

  /* ---------- 接口升级 ---------- */
  const IF_ICON = { head: 'head', neck: 'neck', weapon: 'weapon', hand: 'hand', armor: 'armor', pants: 'pants', shoes: 'shoes' };
  const ifCost = (lv) => 60 * Math.pow(2, lv); // 录屏:651 → 升 3 级后 231,即 60、120、240
  NL.screens.iface = {
    title: '接口升级',
    render(root) {
      const s = NL.state;
      root.classList.add('wall');
      root.appendChild(NL.sprite('role/iface_bg.jpg', 0, 0, 360, 120));
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
