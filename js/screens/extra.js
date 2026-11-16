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

  // 红点:哪些入口现在有事可做。里的红点是烙在截图上的,不会变;表的导航栏和主页按钮是画的,跟着这里走
  NL.dots = function () {
    const s = NL.state;
    const free = D.slots.some((sl) => !s.equipped[sl.id] && s.gear.some((g) => D.equips[g.id].type === sl.type && !game.slotOf(g.uid))); // 有空着的装备格,而且有能穿的
    return { role: free, bag: s.gear.some((g) => g.isNew), mission: game.missionDot(), mail: s.mails.some((m) => !m.got), friends: s.friendReq.length > 0 };
  };

  /* ---------- 邮件 ---------- */
  function mailWin(m) {
    const [def, date] = MAILS[m.k];
    ui.win({ title: '', dark: true, h: 417, body(b, w) {
      b.classList.add('ml-win');
      b.appendChild(h('div.ml-title', def.title));
      b.appendChild(h('div.ml-from', '发件人：  系统', h('span', date + ' 08:00:00')));
      b.appendChild(h('div.ml-body', def.body));
      b.appendChild(h('div.ml-items', def.items.map((it) => { const d = D.items[it.id] || {}; const el = ui.itemEl(it.id, it.n); if (m.got) el.classList.add('got'); return h('div', el, h('span', d.name || '')); })));
      b.appendChild(m.got
        ? h('button.btn.pink', { 'data-act': 'mail-del', onclick: () => { w.close(); NL.state.mails.splice(NL.state.mails.indexOf(m), 1); NL.save(); NL.refresh(); ui.toast('删除成功。'); } }, '删除')
        : h('button.btn.purple', { 'data-act': 'mail-get', onclick: () => { w.close(); m.got = true; game.award(def.items); } }, '领取'));
    } });
  }
  NL.screens.mail = {
    title: '', plate: true,
    render(root) {
      const s = NL.state;
      root.classList.add('mailbg');
      ui.head(root, 'mail/head.jpg', 0, 0, 360, 145, 'MAIL', '邮件');
      root.appendChild(h('div.ml-list.scroll', { 'data-keep': 'mail' }, s.mails.length ? s.mails.map((m) => {
        const [def, date, left] = MAILS[m.k];
        return h('button.ml-row' + (m.got ? '.read' : ''), { 'data-mail': m.k, onclick: () => mailWin(m) },
          h('img', { src: NL.img(m.got ? 'mail/ico_read.jpg' : 'mail/ico.jpg'), draggable: 'false' }), h('b', def.title), h('u'), h('span', date), h('em', '有效期: ' + left), m.got ? null : h('i', '!'));
      }) : h('div.ml-empty', '暂无邮件')));
      root.appendChild(h('button.ml-del', { 'data-act': 'mail-clear', onclick: () => {
        const n = s.mails.filter((m) => m.got).length;
        if (!n) return ui.toast('没有已读邮件。');
        s.mails = s.mails.filter((m) => !m.got); NL.save(); NL.refresh(); ui.toast('删除成功。');
      } }));
      root.appendChild(h('button.ml-all', { 'data-act': 'mail-all', onclick: () => {
        const todo = s.mails.filter((m) => !m.got);
        if (!todo.length) return ui.toast('没有可领取的邮件。');
        const sum = {};
        todo.forEach((m) => { m.got = true; MAILS[m.k][0].items.forEach((it) => (sum[it.id] = (sum[it.id] || 0) + it.n)); });
        game.award(Object.keys(sum).map((id) => ({ id, n: sum[id] })));
      } }));
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
      ui.head(root, 'friend/head.jpg', 0, 0, 360, 150, 'FRIENDS', '好友');
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
  const OFFLINE_STAMINA = 0; // 个人页的「体力」是线下体力(在园区里用的),和关卡消耗的精力不是一回事;录屏里这一格是 0,网页版没有线下部分,所以固定是 0
  // 这一页上能点的东西。里是在整张底图上放透明热区,表是真的按钮,两面调的是同一组
  const PF = {
    rename() {
      const s = NL.state, input = h('input.nl-input', { value: s.name, maxlength: '8' });
      ui.dialog({ text: '修改昵称', extra: input, buttons: [{ text: '取消', cls: 'pink' }, { text: '确认', cls: 'purple', onClick: () => { const v = input.value.trim(); if (v) { s.name = v; NL.save(); NL.refresh(); } } }] });
    },
    vault: () => ui.toast('阪神金库暂未开放。'),
    tickets: () => NL.go('tickets'), ticketShop: () => NL.go('ticketShop'), shop: () => NL.go('shop'), bind: () => NL.go('bind'),
    reserve: () => ui.toast('暂无预约。'), notice: () => ui.notice && ui.notice(), settings: () => ui.settings(),
    guide: () => ui.confirm('要重新开启线下引导吗？', () => { const s = NL.state; s.guide = 'on'; s.guideStep = 0; NL.save(); NL.go('home'); }),
    about: () => ui.dialog({ html: '《新生乐园世界》网页复刻演示<br>画面与数值取自一段手机录屏。' }),
  };
  NL.screens.profile = {
    title: '', plate: true,
    renderBiao(root) {
      const s = NL.state;
      root.classList.add('bpf', 'dots');
      ui.head(root, null, 0, 0, 360, 96, 'PROFILE', '个人');
      root.appendChild(h('div.bpf-card', h('i', { style: { backgroundImage: NL.bg('battle/me.jpg') } }), h('b', s.name), h('span', '活跃度 10　·　势力 ', h('em', '反抗军')), h('u', 'UID ' + s.uid),
        h('button', { 'data-act': 'rename', onclick: PF.rename }, '编辑名片')));
      root.appendChild(h('div.bpf-sec', '我的资产', h('button', { onclick: PF.vault }, '阪神金库 ›')));
      root.appendChild(h('div.bpf-assets', [['home/ico_bolt.webp', '体力', OFFLINE_STAMINA], ['home/ico_gem.webp', '储值', s.gem], ['home/ico_coin.webp', '阪神信用点', s.credit], ['ui/p_ticket.svg', '市场券', 0]].map(([ico, name, v]) =>
        h('div', h('img', { src: NL.img(ico), draggable: 'false' }), h('span', name), h('b', String(v))))));
      const group = (top, title, list) => {
        root.appendChild(h('div.bpf-sec', { style: { top } }, title));
        root.appendChild(h('div.bpf-grid', { style: { top: top + 28 } }, list.map(([ico, name, fn, act]) =>
          h('button', act ? { 'data-act': act, onclick: fn } : { onclick: fn }, h('img', { src: NL.img('ui/p_' + ico + '.svg'), draggable: 'false' }), name))));
      };
      group(392, '权益与商城', [['crown', '权益列表', PF.tickets, 'tickets'], ['ticket', '票券商店', PF.ticketShop, 'ticketShop'], ['cart', '信用点商店', PF.shop, 'pf-shop']]);
      group(496, '设备管理', [['link', '绑定管理', PF.bind, 'bind'], ['cal', '预约管理', PF.reserve]]);
      group(600, '帮助中心', [['horn', '公告', PF.notice], ['gear', '设置', PF.settings, 'pf-settings'], ['spark', '重开引导', PF.guide], ['info', '关于', PF.about]]);
    },
    render(root) {
      const s = NL.state;
      root.appendChild(NL.sprite('extra/profile.jpg', 0, 0, 360, 781));
      root.appendChild(h('div.pf-uid', 'UID ' + s.uid));
      if (s.name !== '热心市民VV') root.appendChild(h('div.pf-name', s.name));
      [[57, OFFLINE_STAMINA], [134, s.gem], [226, s.credit], [302, 0]].forEach(([x, v]) => root.appendChild(h('div.pf-num', { style: { left: x - 34 } }, String(v))));
      root.appendChild(NL.hit(262, 84, 76, 22, PF.rename, { 'data-act': 'rename' }));
      root.appendChild(NL.hit(262, 304, 76, 22, PF.vault));
      const icon = (x, y, fn, act) => root.appendChild(NL.hit(x - 8, y - 4, 64, 66, fn, { 'data-act': act }));
      icon(38, 465, PF.tickets, 'tickets');
      icon(115, 465, PF.ticketShop, 'ticketShop');
      icon(190, 465, PF.shop, 'pf-shop');
      icon(38, 570, PF.bind, 'bind');
      icon(115, 570, PF.reserve);
      icon(38, 675, PF.notice);
      icon(115, 675, PF.settings, 'pf-settings');
      icon(190, 675, PF.guide);
      icon(268, 675, PF.about);
    },
  };
  // 下面四页在里是整张截图加几个透明热区。表按截图上的内容重排成真的部件(文字抄自截图)
  const plain = (name, img, hits, biao) => (NL.screens[name] = { title: '', plate: true, renderBiao: biao, render(root) {
    root.appendChild(NL.sprite('extra/' + img + '.jpg', 0, 0, 360, 781));
    (hits || []).forEach(([x, y, w, hh, msg]) => root.appendChild(NL.hit(x, y, w, hh, () => ui.toast(msg))));
  } });
  const cats = (root, list, top) => list.forEach((name, i) => root.appendChild(h('button.sh-cat' + (i ? '' : '.on'), { style: { top: top + i * 52 } }, name)));
  plain('tickets', 'tickets', [[277, 230, 62, 30, '请到线下门店核销。'], [277, 317, 62, 30, '请到线下门店核销。'], [180, 152, 180, 36, '暂无实体券。']], (root) => {
    root.classList.add('dots');
    ui.head(root, 'shop/head.jpg', 0, 0, 360, 150, 'TICKET', '我的票券');
    root.appendChild(h('div.tabs2.sh-tabs', h('button.on', '权益列表(2)'), h('button', { onclick: () => ui.toast('暂无实体券。') }, '实体券(0)')));
    cats(root, ['全部', '普通(0)', '高级(2)', '珍稀(0)'], 208);
    root.appendChild(h('div.btk-list', [0, 1].map(() => h('div.btk-card', h('b', '汤崎舒压90分钟-芳香精油-专业'), h('span', '汤崎舒压90分钟-芳香精油-专业'), h('em', '1/1'),
      h('button', { onclick: () => ui.toast('请到线下门店核销。') }, '兑换'), h('u', '权益有效期　2027-05-14')))));
  });
  plain('ticketShop', 'ticket_shop', [[180, 140, 180, 34, '暂无市场券商品。'], [290, 730, 60, 30, '暂无可筛选的类别。']], (root) => {
    root.classList.add('dots');
    ui.head(root, 'shop/head.jpg', 0, 0, 360, 150, 'STORE', '票券商店');
    root.appendChild(ui.pill('home/ico_coin.webp', NL.state.credit, 253, 69, { w: 91 }));
    root.appendChild(h('div.tabs2.sh-tabs', h('button.on', '信用点'), h('button', { onclick: () => ui.toast('暂无市场券商品。') }, '市场券')));
    cats(root, ['普通', '高级', '珍稀'], 208);
    root.appendChild(h('div.btk-empty', '暂无符合条件的票券'));
    root.appendChild(h('button.bag-btn', { style: { left: 280, top: 730 }, onclick: () => ui.toast('暂无可筛选的类别。') }, h('i.funnel'), '筛选'));
  });
  plain('parkmap', 'parkmap', null, (root) => {
    // 表:就是里那张园区平面图(原版「地图」页,录屏里只拍到这一屏),调成了表的配色,放在自己的版面里
    root.classList.add('bmap', 'dots');
    ui.head(root, null, 0, 0, 360, 110, 'PARK MAP', '园区地图');
    root.appendChild(h('div.bmap-box', h('img', { src: NL.img('extra/parkplan.webp'), draggable: 'false' })));
    root.appendChild(h('button.btn.dark.bmap-go', { onclick: () => NL.go('home') }, '回主页看实景'));
  });
  plain('faction', 'faction', null, (root) => {
    root.classList.add('bp', 'bfa');
    ui.biaoStage(root, 'hero');
    root.appendChild(h('div.bp-name', h('b', '改造者'), h('i', '种族与势力'), h('span', 'OCCUPATION')));
    root.appendChild(h('div.bfa-panel', h('h4', '势力介绍'), h('p', '反抗军是Ui直接领导的团体，最有理想和纲领，从外圈开始渗透，近期开始在中圈进行破坏与地下行动。在近期的混乱中，阪神加剧了高压统治，也促使更多的中间派或直接或间接地加入反抗军。'),
      h('h4', '势力特性'), h('p', '反抗军说明内容')));
    root.appendChild(h('div.bfa-now', '当前势力', h('b', '反抗军')));
  });

  /* ---------- 绑定管理 ---------- */
  function bindOpen() {
    const s = NL.state;
    if (s.bound) return ui.toast('已绑定新生乐园会员。');
    ui.win({ title: '', dark: true, h: 367, body(b, w) {
      b.classList.add('bd-win');
      const phone = h('input.nl-input', { placeholder: '请输入手机号', inputmode: 'numeric', maxlength: '11' });
      const code = h('input.nl-input', { placeholder: '请输入验证码', inputmode: 'numeric', maxlength: '6' });
      const agree = h('input', { type: 'checkbox' });
      b.appendChild(h('div.bd-t', '绑定新生乐园会员：'));
      b.appendChild(phone);
      b.appendChild(h('div.bd-code', code, h('button', { onclick: () => { code.value = '123456'; ui.toast('演示环境不会真的发短信，已自动填入。'); } }, '获取验证码')));
      b.appendChild(h('label.bd-agree', agree, h('i'), '我已经详细阅读并同意', h('em', '用户协议'), '和', h('em', '隐私政策'), '。'));
      b.appendChild(h('button.btn.purple', { 'data-act': 'bind-ok', onclick: () => {
        if (!/^\d{11}$/.test(phone.value)) return ui.toast('请输入 11 位手机号。');
        if (!code.value) return ui.toast('请输入验证码。');
        if (!agree.checked) return ui.toast('请先阅读并同意协议。');
        w.close(); s.bound = true; game.track('bind');
        game.award([{ id: 'credit', n: 500 }, { id: 'special_card', n: 1 }]); // 手机号只在本页校验格式,不保存也不上传
      } }, '绑定'));
    } });
  }
  const BIND_GEAR = () => ui.toast('请靠近园区内的装备终端后再试。');
  NL.screens.bind = {
    title: '', plate: true,
    renderBiao(root) {
      const s = NL.state;
      root.classList.add('bbd', 'dots');
      ui.head(root, null, 0, 0, 360, 96, 'BINDING', '绑定管理');
      root.appendChild(h('div.bbd-card', { style: { top: 110 } }, h('h4', '账号信息'), h('span', 'ID:' + s.uid), h('button.bbd-copy', { onclick: () => ui.toast('已复制。') }, '复制')));
      root.appendChild(h('div.bpf-sec', { style: { top: 196 } }, '其他账号绑定管理'));
      root.appendChild(h('div.bbd-card.big', { style: { top: 224 } }, h('h4', '绑定新生乐园会员'), h('span', '完成新生乐园会员绑定即可获得'),
        h('div.bbd-items', ui.itemEl('credit', 500), ui.itemEl('special_card', 1)),
        h('button.btn.' + (s.bound ? 'dark' : 'purple'), { 'data-act': 'bind-open', onclick: bindOpen }, s.bound ? '已绑定' : '立即绑定')));
      root.appendChild(h('div.bpf-sec', { style: { top: 430 } }, '装备绑定管理'));
      root.appendChild(h('button.bbd-gear', { onclick: BIND_GEAR }, '绑定新装备　＋'));
    },
    render(root) {
      const s = NL.state;
      root.appendChild(NL.sprite('extra/bind.jpg', 0, 0, 360, 781));
      root.appendChild(h('div.bd-id', 'ID:' + s.uid));
      root.appendChild(NL.hit(112, 128, 26, 22, () => ui.toast('已复制。')));
      if (s.bound) root.appendChild(h('div.bd-done', '已绑定'));
      root.appendChild(NL.hit(105, 330, 150, 30, bindOpen, { 'data-act': 'bind-open' }));
      root.appendChild(NL.hit(15, 408, 330, 72, BIND_GEAR));
    },
  };

  /* ---------- 设置、兑换码 ---------- */
  ui.settings = function () {
    let m;
    const redeem = () => { m.close(); const input = h('input.nl-input', { placeholder: '点击输入兑换码' });
      ui.dialog({ extra: input, buttons: [{ text: '取消', cls: 'pink' }, { text: '确认', cls: 'purple', onClick: () => ui.toast(input.value ? '兑换码无效。' : '请输入兑换码。') }] }); };
    const account = () => ui.toast('演示版只有一个本机存档。');
    const logout = () => { m.close(); NL.go('login'); };
    const sw = h('button.set-switch', { 'data-act': 'set-sound', onclick: () => { NL.audio.toggle(); paint(); } });
    const paint = () => { sw.classList.toggle('on', NL.audio.on()); sw.textContent = NL.audio.on() ? '开' : '关'; };
    // 下面几个开关是网页版加的,原版没有。「3D 节拍对决」「升级动效」「扩展玩法」都关掉、停在里,就是原版的样子
    const sw2 = h('button.set-switch', { 'data-act': 'set-beat', onclick: () => { NL.state.beat = !NL.state.beat; NL.save(); paint2(); } });
    const paint2 = () => { sw2.classList.toggle('on', !!NL.state.beat); sw2.textContent = NL.state.beat ? '开' : '关'; };
    const sw3 = h('button.set-switch', { 'data-act': 'set-motion', onclick: () => { NL.state.motion = NL.motion.plus() ? 'orig' : 'plus'; NL.save(); NL.motion.apply(); paint3(); } });
    const paint3 = () => { sw3.classList.toggle('on', NL.motion.plus()); sw3.textContent = NL.motion.plus() ? '开' : '关'; };
    const sw4 = h('button.set-switch' + (NL.skin() === 'biao' ? '.on' : ''), { 'data-act': 'set-skin', onclick: () => { m.close(); NL.setSkin(NL.skin() === 'biao' ? 'li' : 'biao'); } }, NL.skin() === 'biao' ? '表' : '里');
    const sw5 = h('button.set-switch', { 'data-act': 'set-ext', onclick: () => { NL.ext.set(!NL.ext.on()); paint5(); NL.refresh(); } });
    const paint5 = () => { sw5.classList.toggle('on', NL.ext.on()); sw5.textContent = NL.ext.on() ? '开' : '关'; };
    paint(); paint2(); paint3(); paint5();
    const ROWS = [['背景音乐', '', sw], ['3D 节拍对决', '关掉就是原版战斗:自动对撞,只能看', sw2], ['升级动效', '关掉就照原版:弹窗和页面直接出现', sw3], ['表 / 里', '表是重画的美术,里是原版;规则和存档是同一份', sw4],
      ['扩展玩法', '调频、涂鸦、巡游、援护;关掉就和原版一样', sw5]];
    if (NL.skin() === 'biao') { // 表:里那张带着三个按钮的底图换成真的按钮,开关排在同一个窗里
      m = ui.win({ title: '设置', h: 516, body(b) {
        b.classList.add('bset');
        b.appendChild(h('div.bset-acts', h('button', { onclick: redeem }, '兑换码'), h('button', { onclick: account }, '切换账号'), h('button', { onclick: logout }, '退出登录')));
        ROWS.forEach(([t, sub, el]) => b.appendChild(h('div.bset-row', h('span', t, sub ? h('small', sub) : null), el)));
        b.appendChild(h('div.bset-id', '玩家编号:' + NL.state.uid));
      } });
      return;
    }
    m = ui.mask({});
    const hit = (y, fn) => NL.hit(54, y, 180, 30, fn);
    m.el.appendChild(h('div.set-win', NL.sprite('ui/settings.jpg', 0, 0, 330, 238),
      hit(67, redeem), hit(110, account), hit(152, logout),
      NL.hit(286, 0, 44, 30, () => m.close()),
      h('div.set-id', '玩家编号:' + NL.state.uid)));
    ROWS.forEach(([t, sub, el], i) => m.el.appendChild(h('div.set-row' + ['', '.two', '.three', '.four', '.five'][i], sub ? h('span', t, h('small', sub)) : t, el)));
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 724, textAlign: 'center', margin: 0 } }, '点击空白处关闭。'));
  };

  /* ---------- 活动日历 ---------- */
  const ACTS = ['全部活动', '定点活动', '小型活动', '中型活动', '大型活动', '特殊活动'];
  const ZONES = ['全部区域', '圣物核心', '阪神公司', '量子海洋', '运动博物馆', '弹道训练营', '增益市场', '双生嘉年华', '零号基地'];
  ui.calendar = function () {
    let seg = 0;
    const now = new Date(), dow = (now.getDay() + 6) % 7;
    let pick = dow;
    const w = ui.mask({});
    const box = h('div.cal');
    w.el.appendChild(box);
    w.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 686, textAlign: 'center', margin: 0 } }, '点击空白处关闭。'));
    function draw() {
      box.textContent = '';
      const biao = NL.skin() === 'biao'; // 里的标题和两个按钮烙在窗框的图上;表的是真的部件
      if (biao) box.appendChild(h('div.cal-head', '活动日历'));
      else { box.appendChild(NL.sprite('ui/cal_head.jpg', 0, 0, 330, 44.5)); box.appendChild(NL.sprite('ui/cal_foot.jpg', 0, 475, 330, 52)); }
      box.appendChild(NL.hit(286, 0, 44, 30, () => w.close()));
      box.appendChild(h('div.seg.light', ['活动日历', 'NPC驻场日历'].map((t, i) => h('button' + (seg === i ? '.on' : ''), { onclick: () => { seg = i; draw(); } }, t))));
      box.appendChild(h('div.cal-week', h('i'), '一二三四五六日'.split('').map((c, i) => {
        const d = new Date(now); d.setDate(now.getDate() - dow + i);
        return h('button' + (i === pick ? '.on' : ''), { onclick: () => { pick = i; draw(); } }, h('b', c), (d.getMonth() + 1) + '.' + d.getDate());
      }), h('u')));
      box.appendChild(h('div.cal-empty', seg ? '当日暂无 NPC 驻场' : '当日暂无符合条件的活动'));
      if (biao) {
        box.appendChild(h('button.btn.dark.cal-b1', { 'data-act': 'cal-filter', onclick: filter }, '筛选'));
        box.appendChild(h('button.btn.purple.cal-b2', { onclick: () => ui.toast('暂无预约。') }, '我的预约'));
      } else {
        box.appendChild(NL.hit(12, 482, 72, 34, filter, { 'data-act': 'cal-filter' }));
        box.appendChild(NL.hit(196, 478, 124, 40, () => ui.toast('暂无预约。')));
      }
    }
    function filter() {
      const f = Object.assign({}, NL.state.calFilter);
      const fw = ui.win({ title: '筛选', h: 476, body(b) {
        b.classList.add('flt');
        const group = (name, key, list, top) => {
          b.appendChild(ui.sec(name, top));
          const grid = h('div.flt-grid', { style: { top: top + 23 } });
          const paint = () => { grid.textContent = ''; list.forEach((t) => grid.appendChild(h('button' + (f[key] === t ? '.on' : ''), { onclick: () => { f[key] = t; paint(); } }, t))); };
          paint(); b.appendChild(grid);
        };
        group('票券', 'act', ACTS, 14); group('商户', 'zone', ZONES, 132);
        b.appendChild(h('div.flt-btns', h('button.btn.dark', { onclick: () => { fw.close(); NL.state.calFilter = { act: ACTS[0], zone: ZONES[0] }; NL.save(); } }, '重置'),
          h('button.btn.purple', { onclick: () => { fw.close(); NL.state.calFilter = f; NL.save(); } }, '确认')));
      } });
    }
    draw();
  };

  /* ---------- 互动(探索) ---------- */
  ui.interact = function () {
    let m;
    const input = h('input.itx-input', { placeholder: '请输入编码' });
    const submit = () => ui.toast(input.value ? '编码不正确。' : '请输入编码。');
    const scan = () => ui.toast('请靠近园区内的互动点后再扫码。');
    const GO = [['我的ID', 'person', () => ui.dialog({ html: '我的ID：<em>' + NL.state.uid + '</em>' })], ['前往绑定', 'link', () => NL.go('bind')],
      ['前往任务', 'mission', () => NL.go('mission')], ['前往票券', 'ticket', () => NL.go('tickets')],
      // 这两个按钮在原版里点了没反应(录屏里是提示语);打开「扩展玩法」后是两个小游戏
      ['涂鸦暗号', 'pen', () => (NL.ext.on() ? NL.ext.tag() : ui.toast('附近没有可识别的涂鸦。'))], ['调频密码', 'key', () => (NL.ext.on() ? NL.ext.tune() : ui.toast('附近没有可调频的终端。'))]];
    if (NL.skin() === 'biao') { // 表:里那张带字的底图换成真的部件
      m = ui.win({ title: '互动', h: 448, body(b) {
        b.classList.add('bitx');
        b.appendChild(h('div.bitx-box', h('span', '请输入正确编码'), input, h('button.btn.purple', { onclick: submit }, '确认'),
          h('button.bitx-scan', { onclick: scan }, h('img', { src: NL.img('ui/p_scan.svg'), draggable: 'false' }))));
        b.appendChild(h('div.bitx-grid', GO.map(([name, ico, fn], i) => h('button', { 'data-act': 'itx-' + i, onclick: () => { m.close(); fn(); } }, h('img', { src: NL.img('ui/p_' + ico + '.svg'), draggable: 'false' }), name))));
      } });
      return;
    }
    m = ui.mask({});
    const go = (i) => NL.hit(22 + (i % 2) * 146, 290 + Math.floor(i / 2) * 46, 140, 34, () => { m.close(); GO[i][2](); }, { 'data-act': 'itx-' + i });
    m.el.appendChild(h('div.itx', NL.sprite('ui/interact.jpg', 0, 0, 330, 448), input,
      NL.hit(118, 185, 94, 26, submit), NL.hit(254, 42, 62, 62, scan), NL.hit(286, 0, 44, 28, () => m.close()),
      GO.map((_, i) => go(i))));
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 686, textAlign: 'center', margin: 0 } }, '点击空白处关闭。'));
  };
})();
