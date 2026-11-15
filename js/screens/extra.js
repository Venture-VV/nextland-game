/* 外围界面:邮件、好友、个人、票券、绑定、设置、活动日历、互动、园区地图、种族与势力 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;
  const today = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  D.items.box_race = { name: '改造人装备宝箱', kind: '资源包', icon: 'item/box_race.webp', desc: '注册成为新生市改造人的种族福利，打开可获得一件装备。' };
  D.boxPools.box_race = ['choker', 'armor_pink', 'gauntlet', 'boots', 'bracelet'];
  const TALENT = { title: '天赋奖励', body: '您已注册成为新生市改造人，这是您的种族福利，请及时领取。', items: [{ id: 'box_race', n: 1 }] };
  const WEEKLY = { title: '排行榜周结算奖励', body: '上周排行榜已结算，这是您的结算奖励。', items: [{ id: 'crystal', n: 50 }, { id: 'credit', n: 100 }] };
  // 录屏里的 9 封邮件
  const MAILS = [[TALENT, '2026-11-14', '6天'], [TALENT, '2026-11-13', '5天'], [TALENT, '2026-11-12', '4天'], [TALENT, '2026-11-11', '3天'], [TALENT, '2026-11-10', '2天'],
    [TALENT, '2026-11-09', '1天'], [WEEKLY, '2026-11-08', '1天'], [TALENT, '2026-11-08', '9时'], [WEEKLY, '2026-11-01', '9时']];
  NL.defaults.push(() => ({
    mails: MAILS.map((m, i) => ({ k: i, got: false })), bound: false,
    friends: [], friendReq: ['书笙', 'Yi'], friendDay: { date: '', left: 5 }, calFilter: { act: '全部活动', zone: '全部区域' },
  }));
  D.people = { 书笙: [12, 33000], Yi: [10, 11000], 'q.': [11, 34000], nono: [10, 38000], 展鹏: [14, 29000], '野.': [6, 5484], 吉祥物: [4, 5062], 阿澈: [9, 9800], Mika: [13, 27000], 老周: [8, 7600] };

  /* ---------- 邮件 ---------- */
  function mailWin(m) {
    const [def, date] = MAILS[m.k];
    ui.win({ title: def.title, dark: true, top: 190, hintTop: 628, body(b, w) {
      b.classList.add('ml-win');
      b.appendChild(h('div.ml-from', '发件人：系统', h('span', date + ' 08:00:00')));
      b.appendChild(h('div.ml-body', def.body));
      b.appendChild(h('div.ml-items', def.items.map((it) => ui.itemEl(it.id, it.n))));
      b.appendChild(m.got
        ? h('button.btn.purple', { onclick: () => { w.close(); NL.state.mails.splice(NL.state.mails.indexOf(m), 1); NL.save(); NL.refresh(); ui.toast('删除成功。'); } }, '删除')
        : h('button.btn.pink', { 'data-act': 'mail-get', onclick: () => { w.close(); m.got = true; game.award(def.items); } }, '领取'));
    } });
  }
  NL.screens.mail = {
    title: '', plate: true,
    render(root) {
      const s = NL.state;
      root.classList.add('mailbg');
      root.appendChild(NL.sprite('mail/head.jpg', 0, 0, 360, 145));
      root.appendChild(h('div.ml-list.scroll', { 'data-keep': 'mail' }, s.mails.length ? s.mails.map((m) => {
        const [def, date, left] = MAILS[m.k];
        return h('button.ml-row' + (m.got ? '.read' : ''), { 'data-mail': m.k, onclick: () => mailWin(m) },
          h('img', { src: NL.img(m.got ? 'mail/ico_read.jpg' : 'mail/ico.jpg'), draggable: 'false' }), h('b', def.title), h('span', date), h('em', '有效期: ' + left), m.got ? null : h('i', '!'));
      }) : h('div.ml-empty', '暂无邮件')));
      root.appendChild(h('button.btn.pink.ml-del', { onclick: () => {
        const n = s.mails.filter((m) => m.got).length;
        if (!n) return ui.toast('没有已读邮件。');
        s.mails = s.mails.filter((m) => !m.got); NL.save(); NL.refresh(); ui.toast('删除成功。');
      } }, '删除已读'));
      root.appendChild(h('button.btn.ml-all', { 'data-act': 'mail-all', onclick: () => {
        const todo = s.mails.filter((m) => !m.got);
        if (!todo.length) return ui.toast('没有可领取的邮件。');
        const sum = {};
        todo.forEach((m) => { m.got = true; MAILS[m.k][0].items.forEach((it) => (sum[it.id] = (sum[it.id] || 0) + it.n)); });
        game.award(Object.keys(sum).map((id) => ({ id, n: sum[id] })));
      } }, '全部领取'));
    },
  };

  /* ---------- 好友 ---------- */
  let ftab = 'list', batch = 0;
  function person(name, right, sub) {
    const [lv, power] = D.people[name];
    return h('div.fr-row', h('img', { src: NL.img('friend/avatar.jpg'), draggable: 'false' }), h('u', String(lv)), h('b', name), h('i', '初心者称号'),
      h('span', '💥 战力  ' + NL.fmt.power(power)), right, sub ? h('small', sub) : null);
  }
  NL.screens.friends = {
    title: '好友', plate: 'cap',
    render(root) {
      const s = NL.state;
      if (s.friendDay.date !== today()) s.friendDay = { date: today(), left: 5 };
      root.classList.add('dots');
      root.appendChild(NL.sprite('friend/head.jpg', 0, 0, 360, 150));
      root.appendChild(ui.pill('home/ico_gem.webp', s.gem, 253, 69, { w: 91 }));
      root.appendChild(h('div.tabs2.three', [['list', '好友列表'], ['add', '添加好友'], ['apply', '好友申请']].map(([k, name]) =>
        h('button' + (ftab === k ? '.on' : ''), { 'data-tab': k, onclick: () => { ftab = k; NL.refresh(); } }, name, k === 'apply' && s.friendReq.length ? h('i', '!') : null))));
      const body = h('div.fr-body.scroll', { 'data-keep': 'fr-' + ftab });
      root.appendChild(body);
      if (ftab === 'list') {
        if (!s.friends.length) {
          body.appendChild(h('div.fr-empty', '暂无好友'));
          root.appendChild(h('button.btn.fr-cta', { onclick: () => { ftab = 'add'; NL.refresh(); } }, '去添加'));
        } else {
          body.appendChild(h('div.fr-bar', '⚔ 挑战次数  ' + s.friendDay.left, h('b', NL.fmt.untilReset() + ' 后刷新')));
          s.friends.forEach((name) => body.appendChild(person(name, h('button.fr-btn', { 'data-fight': name, onclick: () => {
            if (s.friendDay.left <= 0) return ui.toast('今日挑战次数已用完。');
            s.friendDay.left--; NL.save();
            ui.battle({ enemy: { name, lv: D.people[name][0], power: D.people[name][1] }, rewards: [{ id: 'credit', n: 10 }] });
          } }, '✕ 挑战'), '成为好友 0天')));
          root.appendChild(h('div.fr-count', '好友数  ' + s.friends.length + '/100'));
        }
      } else if (ftab === 'add') {
        body.appendChild(h('div.fr-search', '搜索好友'));
        body.appendChild(h('div.fr-rec', '推荐好友'));
        const pool = Object.keys(D.people).filter((n) => !s.friends.includes(n) && !s.friendReq.includes(n));
        for (let i = 0; i < Math.min(5, pool.length); i++) {
          const name = pool[(batch * 5 + i) % pool.length];
          body.appendChild(person(name, h('button.fr-add', { 'data-add': name, onclick: () => { s.friends.push(name); NL.save(); NL.refresh(); ui.toast('已添加好友。'); } }, '添加')));
        }
        root.appendChild(h('button.btn.purple.fr-cta', { onclick: () => { batch++; NL.refresh(); } }, '换一批'));
      } else {
        if (!s.friendReq.length) body.appendChild(h('div.fr-empty', '暂无好友申请'));
        s.friendReq.slice().forEach((name) => body.appendChild(person(name, h('button.fr-add', { 'data-accept': name, onclick: () => {
          s.friendReq.splice(s.friendReq.indexOf(name), 1); s.friends.push(name); NL.save(); NL.refresh(); ui.toast('已同意好友申请。');
        } }, '同意'))));
        root.appendChild(h('div.fr-count', '申请列表  ' + s.friendReq.length + '/10'));
      }
    },
  };

  /* ---------- 个人 ---------- */
  NL.screens.profile = {
    title: '', plate: true,
    render(root) {
      const s = NL.state;
      root.appendChild(NL.sprite('extra/profile.jpg', 0, 0, 360, 781));
      root.appendChild(h('div.pf-uid', 'UID ' + s.uid));
      if (s.name !== '热心市民VV') root.appendChild(h('div.pf-name', s.name));
      [[57, s.energy], [134, s.gem], [226, s.credit], [302, 0]].forEach(([x, v]) => root.appendChild(h('div.pf-num', { style: { left: x - 34 } }, String(v))));
      root.appendChild(NL.hit(262, 84, 76, 22, () => {
        const input = h('input.nl-input', { value: s.name, maxlength: '8' });
        ui.dialog({ text: '修改昵称', extra: input, buttons: [{ text: '取消', cls: 'pink' }, { text: '确认', cls: 'purple', onClick: () => { const v = input.value.trim(); if (v) { s.name = v; NL.save(); NL.refresh(); } } }] });
      }, { 'data-act': 'rename' }));
      root.appendChild(NL.hit(262, 304, 76, 22, () => ui.toast('阪神金库暂未开放。')));
      const icon = (x, y, fn, act) => root.appendChild(NL.hit(x - 8, y - 4, 64, 66, fn, { 'data-act': act }));
      icon(38, 465, () => NL.go('tickets'), 'tickets');
      icon(115, 465, () => NL.go('ticketShop'), 'ticketShop');
      icon(190, 465, () => NL.go('shop'), 'pf-shop');
      icon(38, 570, () => NL.go('bind'), 'bind');
      icon(115, 570, () => ui.toast('暂无预约。'));
      icon(38, 675, () => ui.notice && ui.notice());
      icon(115, 675, () => ui.settings(), 'pf-settings');
      icon(190, 675, () => ui.confirm('要重新开启线下引导吗？', () => { s.guide = 'on'; s.guideStep = 0; NL.save(); NL.go('home'); }));
      icon(268, 675, () => ui.dialog({ html: '《新生乐园世界》网页复刻演示<br>画面与数值取自一段手机录屏。' }));
    },
  };
  const plain = (name, img, hits) => (NL.screens[name] = { title: '', plate: true, render(root) {
    root.appendChild(NL.sprite('extra/' + img + '.jpg', 0, 0, 360, 781));
    (hits || []).forEach(([x, y, w, hh, msg]) => root.appendChild(NL.hit(x, y, w, hh, () => ui.toast(msg))));
  } });
  plain('tickets', 'tickets', [[277, 230, 62, 30, '请到线下门店核销。'], [277, 317, 62, 30, '请到线下门店核销。'], [180, 152, 180, 36, '暂无实体券。']]);
  plain('ticketShop', 'ticket_shop', [[180, 140, 180, 34, '暂无市场券商品。'], [290, 730, 60, 30, '暂无可筛选的类别。']]);
  plain('parkmap', 'parkmap');
  plain('faction', 'faction');

  /* ---------- 绑定管理 ---------- */
  NL.screens.bind = {
    title: '', plate: true,
    render(root) {
      const s = NL.state;
      root.appendChild(NL.sprite('extra/bind.jpg', 0, 0, 360, 781));
      root.appendChild(h('div.bd-id', 'ID:' + s.uid));
      root.appendChild(NL.hit(112, 128, 26, 22, () => ui.toast('已复制。')));
      if (s.bound) root.appendChild(h('div.bd-done', '已绑定'));
      root.appendChild(NL.hit(105, 330, 150, 30, () => {
        if (s.bound) return ui.toast('已绑定新生乐园会员。');
        ui.win({ title: '', dark: true, top: 200, hintTop: 634, body(b, w) {
          b.classList.add('bd-win');
          const phone = h('input.nl-input', { placeholder: '请输入手机号', inputmode: 'numeric', maxlength: '11' });
          const code = h('input.nl-input', { placeholder: '请输入验证码', inputmode: 'numeric', maxlength: '6' });
          const agree = h('input', { type: 'checkbox' });
          b.appendChild(h('div.bd-t', '绑定新生乐园会员：'));
          b.appendChild(phone);
          b.appendChild(h('div.bd-code', code, h('button', { onclick: () => { code.value = '123456'; ui.toast('演示环境不会真的发短信，已自动填入。'); } }, '获取验证码')));
          b.appendChild(h('label.bd-agree', agree, '我已经详细阅读并同意', h('em', '用户协议'), '和', h('em', '隐私政策'), '。'));
          b.appendChild(h('button.btn.purple', { 'data-act': 'bind-ok', onclick: () => {
            if (!/^\d{11}$/.test(phone.value)) return ui.toast('请输入 11 位手机号。');
            if (!code.value) return ui.toast('请输入验证码。');
            if (!agree.checked) return ui.toast('请先阅读并同意协议。');
            w.close(); s.bound = true; game.track('bind');
            game.award([{ id: 'credit', n: 500 }, { id: 'special_card', n: 1 }]); // 手机号只在本页校验格式,不保存也不上传
          } }, '绑定'));
        } });
      }, { 'data-act': 'bind-open' }));
      root.appendChild(NL.hit(15, 408, 330, 72, () => ui.toast('请靠近园区内的装备终端后再试。')));
    },
  };

  /* ---------- 设置、兑换码 ---------- */
  ui.settings = function () {
    ui.win({ title: '设置', dark: true, top: 284, hintTop: 690, body(b, w) {
      b.classList.add('set-win');
      const btn = (t, fn) => b.appendChild(h('button.btn.purple', { onclick: fn }, t));
      btn('扫码', () => { w.close(); const input = h('input.nl-input', { placeholder: '点击输入兑换码' });
        ui.dialog({ extra: input, buttons: [{ text: '取消', cls: 'pink' }, { text: '确认', cls: 'purple', onClick: () => ui.toast(input.value ? '兑换码无效。' : '请输入兑换码。') }] }); });
      btn('切换账号', () => ui.toast('演示版只有一个本机存档。'));
      btn('退出登录', () => { w.close(); NL.go('login'); });
      b.appendChild(h('div.set-id', '玩家编号:' + NL.state.uid));
    } });
  };

  /* ---------- 活动日历 ---------- */
  const ACTS = ['全部活动', '定点活动', '小型活动', '中型活动', '大型活动', '特殊活动'];
  const ZONES = ['全部区域', '圣物核心', '阪神公司', '量子海洋', '运动博物馆', '弹道训练营', '增益市场', '双生嘉年华', '零号基地'];
  ui.calendar = function () {
    let seg = 0;
    const now = new Date(), dow = (now.getDay() + 6) % 7;
    let pick = dow;
    const w = ui.win({ title: '', top: 138, hintTop: 690, cls: 'cal' });
    function draw() {
      const b = w.body;
      b.textContent = '';
      b.appendChild(h('div.cal-head', '活动日历', h('button.win-close', { onclick: () => w.close() })));
      b.appendChild(h('div.seg.light', ['活动日历', 'NPC驻场日历'].map((t, i) => h('button' + (seg === i ? '.on' : ''), { onclick: () => { seg = i; draw(); } }, t))));
      b.appendChild(h('div.cal-week', '一二三四五六日'.split('').map((c, i) => {
        const d = new Date(now); d.setDate(now.getDate() - dow + i);
        return h('button' + (i === pick ? '.on' : ''), { onclick: () => { pick = i; draw(); } }, h('b', c), (d.getMonth() + 1) + '.' + d.getDate());
      })));
      b.appendChild(h('div.cal-empty', seg ? '当日暂无 NPC 驻场' : '当日暂无符合条件的活动'));
      b.appendChild(h('button.btn.dark.small.cal-filter', { 'data-act': 'cal-filter', onclick: filter }, '筛选'));
      b.appendChild(h('button.btn.purple.cal-mine', { onclick: () => ui.toast('暂无预约。') }, '我的预约'));
    }
    function filter() {
      const f = Object.assign({}, NL.state.calFilter);
      const fw = ui.win({ title: '筛选', top: 150, hintTop: 690, body(b) {
        b.classList.add('flt');
        const group = (name, key, list) => {
          b.appendChild(ui.sec(name));
          const box = h('div.flt-grid');
          const paint = () => { box.textContent = ''; list.forEach((t) => box.appendChild(h('button' + (f[key] === t ? '.on' : ''), { onclick: () => { f[key] = t; paint(); } }, t))); };
          paint(); b.appendChild(box);
        };
        group('票券', 'act', ACTS); group('商户', 'zone', ZONES);
        b.appendChild(h('div.flt-btns', h('button.btn.dark', { onclick: () => { fw.close(); NL.state.calFilter = { act: ACTS[0], zone: ZONES[0] }; NL.save(); } }, '重置'),
          h('button.btn.purple', { onclick: () => { fw.close(); NL.state.calFilter = f; NL.save(); } }, '确认')));
      } });
    }
    draw();
  };

  /* ---------- 互动(探索) ---------- */
  ui.interact = function () {
    ui.win({ title: '互动', top: 178, hintTop: 690, body(b, w) {
      b.classList.add('itx');
      const input = h('input.nl-input', { placeholder: '请输入编码' });
      b.appendChild(h('div.itx-card', h('span', '请输入正确编码'), input, h('button.btn.purple.small', { onclick: () => ui.toast(input.value ? '编码不正确。' : '请输入编码。') }, '确认')));
      const go = (t, fn) => h('button', { onclick: () => { w.close(); fn(); } }, t);
      b.appendChild(h('div.itx-grid',
        go('我的ID', () => ui.dialog({ html: '我的ID：<em>' + NL.state.uid + '</em>' })), go('前往绑定', () => NL.go('bind')),
        go('前往任务', () => NL.go('mission')), go('前往票券', () => NL.go('tickets')),
        go('涂鸦暗号', () => ui.toast('附近没有可识别的涂鸦。')), go('调频密码', () => ui.toast('附近没有可调频的终端。'))));
    } });
  };
})();
