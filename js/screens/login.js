/* 登录页：防沉迷公告 → 进入游戏 → 加载条 → 主页 */
(function () {
  'use strict';
  const h = NL.h;
  let noticeShown = false;

  NL.screens.login = {
    title: '', back: false, root: true, plate: true,
    render(root) {
      root.appendChild(NL.sprite('login/bg.jpg', 0, 0, 360, 781));
      root.appendChild(NL.hit(82, 610, 196, 54, enter, { 'data-act': 'enter' }));
      root.appendChild(NL.hit(300, 126, 48, 44, () => NL.ui.confirm('确定要退出登录并清空本机存档吗？', () => { NL.reset(); NL.ui.toast('存档已清空。'); })));
      if (!noticeShown) { noticeShown = true; notice(); }
    },
    // 表的画法:三位伙伴的立绘叠成主视觉,标题和按钮自己排。能点的地方和里一样
    renderBiao(root) {
      root.classList.add('bp');
      root.classList.add('bl');
      [['ling', -96, 150, 0.82], ['guxuan', 104, 150, 0.82], ['jiguang', 0, 96, 1]].forEach(([id, x, y, k]) => {
        const path = 'partner/cut_' + id + '.webp';
        if (NL.biaoAssets[path]) root.appendChild(h('div.bl-art' + (k === 1 ? '.main' : ''), { style: { left: x, top: y, width: 360 * k, height: 526 * k, backgroundImage: NL.bg(path) } }));
      });
      root.appendChild(h('div.bl-title', h('i', 'NEXTLAND'), h('b', '新生乐园世界'), h('span', '表 · 契约之夜')));
      root.appendChild(h('button.btn.purple.bl-enter', { 'data-act': 'enter', onclick: enter }, '进入游戏'));
      root.appendChild(h('button.bl-out', { onclick: () => NL.ui.confirm('确定要退出登录并清空本机存档吗？', () => { NL.reset(); NL.ui.toast('存档已清空。'); }) }, '退出登录'));
      root.appendChild(h('div.bl-age', '16+'));
      if (!noticeShown) { noticeShown = true; notice(); }
    },
  };

  NL.ui.notice = notice; // 个人页的「公告」也用它
  // 公告的文字抄自录屏里那张「系统通知」(里直接贴那张图,表用真的窗和字)
  const NOTICE = ['为引导未成年人享受健康游戏生活，《新生乐园世界》积极响应国家相关要求，根据国家新闻出版署《关于防止未成年人沉迷网络游戏的通知》《关于进一步严格管理切实防止未成年人沉迷网络游戏的通知》的要求和游戏运营规划安排，实名信息年龄未满18周岁的用户将被纳入未成年人防沉迷系统。',
    ['具体规则如下：'], ['1.未成年人在线时长限制：', 1], '1）未满16周岁的用户无法登录。',
    '2）16周岁以上未满18周岁的未成年用户仅可在周五、周六、周日和法定节假日每日20时至21时体验游戏，到达规定时间后，将被强制下线，当日不能再登录游戏。其他时间无法登录游戏。',
    ['2.未成年人游戏消费限制：', 1], '1）未满16周岁的用户无法进行充值。', '2）16周岁至18周岁（含16周岁，不含18周岁）的用户单次充值不超过100元人民币，每月累计不超过400元人民币。'];
  function notice() {
    if (NL.skin() === 'biao') {
      NL.ui.win({ title: '系统通知', dark: true, h: 540, top: 123, dismiss: false, hint: false, body(b, m) {
        b.classList.add('bnt');
        b.appendChild(h('h3', '防沉迷系统公告'));
        b.appendChild(h('div.bnt-text.scroll', NOTICE.map((t) => (Array.isArray(t) ? h('h4' + (t[1] ? '.k' : ''), t[0]) : h('p', t)))));
        b.appendChild(h('button.btn.purple', { 'data-act': 'notice-ok', onclick: () => m.close() }, '确认'));
      } });
      return;
    }
    const m = NL.ui.mask({ dismiss: false });
    m.el.style.background = 'rgba(20,8,44,.72)';
    const box = h('div.abs', { style: { left: 11, top: 123, width: 338, height: 540 } },
      NL.sprite('login/notice.jpg', 0, 0, 338, 540),
      NL.hit(96, 486, 148, 36, () => m.close(), { 'data-act': 'notice-ok' }),
      NL.hit(292, 2, 40, 34, () => m.close()));
    m.el.appendChild(box);
  }

  function enter() {
    const root = document.querySelector('#screen');
    if (NL.skin() === 'biao') root.querySelectorAll('.bl-enter, .bl-out').forEach((e) => e.remove()); // 表:主视觉留着,只把按钮换成进度条
    else { root.textContent = ''; root.appendChild(NL.sprite('login/loading.jpg', 0, 0, 360, 781)); }
    const fill = h('i');
    const num = h('b', '0%');
    root.appendChild(h('div.load-bar', fill, num));
    let p = 0;
    const t = setInterval(() => {
      p = Math.min(100, p + 4 + Math.random() * 9);
      fill.style.width = p + '%';
      num.textContent = Math.floor(p) + '%';
      if (p >= 100) { clearInterval(t); setTimeout(() => NL.motion.pixels({ mode: 'dither', onMid: () => NL.go('home') }), 120); }
    }, 60);
  }
})();
