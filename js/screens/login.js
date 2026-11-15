/* 登录页：暮光幻境主视觉 + 珠光入园公告 + 星轨加载条 → 乐园主页 */
(function () {
  'use strict';
  const h = NL.h;
  let noticeShown = false;

  const LOGIN_MOTES = [
    [16, 24, 4.5, 0], [82, 20, 4, 1.4], [24, 58, 5, 0.8],
    [76, 52, 3.5, 2.2], [50, 36, 4, 1.9], [68, 72, 4.5, 0.5],
  ];

  NL.screens.login = {
    title: '', back: false, root: true, plate: 'cap',
    render(root) {
      const wrap = h('div.otome-login');
      wrap.appendChild(h('img.login-kv', { src: NL.img('otome/bg/kv_login.webp'), draggable: 'false', alt: 'Nextland Twilight Wonderland' }));
      wrap.appendChild(h('div.login-veil'));
      wrap.appendChild(h('div.starlight-layer', LOGIN_MOTES.map(([lx, ty, sz, dl]) =>
        h('i.starlight-mote', { style: `left:${lx}%;top:${ty}%;width:${sz}px;height:${sz}px;animation-delay:-${dl}s` }))));

      wrap.appendChild(h('div.login-brand',
        h('div.lb-en', 'N E X T L A N D   W O R L D'),
        h('div.lb-cn', '新生乐园世界'),
        h('div.lb-sub', '✦ 暮光幻境 · 心动共鸣企划 ✦')));

      wrap.appendChild(h('button.login-reset', {
        onclick: () => NL.ui.confirm('确定要退出登录并清空本机存档吗？', () => { NL.reset(); NL.ui.toast('本机存档已重置'); }),
      }, '重置存档'));

      wrap.appendChild(h('button.login-enter', { 'data-act': 'enter', onclick: enter },
        h('span.le-star', '✦'), h('span.le-txt', '步入新生乐园'), h('span.le-star', '✦')));

      wrap.appendChild(h('div.login-legal',
        '抵制不良游戏 · 拒绝盗版游戏 · 注意自我保护 · 谨防受骗上当',
        h('br'), '适度游戏益脑 · 沉迷游戏伤身 · 合理安排时间 · 享受健康生活'));

      root.appendChild(wrap);
      if (!noticeShown) { noticeShown = true; notice(); }
    },
  };

  NL.ui.notice = notice; // 个人页的「公告」也复用此弹窗
  function notice() {
    const m = NL.ui.mask({ dismiss: false });
    const card = h('div.otome-notice',
      h('button.win-close', { onclick: () => m.close() }),
      h('div.on-eyebrow', 'NEXTLAND WONDERLAND'),
      h('div.on-title', '入园须知与健康游戏公告'),
      h('div.on-divider', h('span', '✦')),
      h('div.on-body.scroll',
        h('p', '亲爱的特遣猎人，欢迎步入《新生乐园世界 · 暮光幻境》。'),
        h('p', '在这里，白昼与黄昏交汇于玫瑰云海之上。您将以新生市猎人的身份，自由探索「圣物核心」「阪神公司」与「运动博物馆」，并与驻守在园区 L2-01 至 L2-06 的六位命定伙伴缔结专属信任协议。'),
        h('div.on-highlight',
          h('b', '✦ 线上线下双栖体验提示'),
          h('span', '当您身处线下实体乐园时，可随时通过「委托 · 星光通行证」与驻场伙伴互动；网页预览版已为您贴心内置「模拟扫码」通道。')),
        h('p.muted', '健康游戏忠告：本体验严格遵循未成年人防沉迷与实名保护规范，请合理安排游园时间，愿暮光与星芒常伴左右。')),
      h('button.btn.purple.on-ok', { 'data-act': 'notice-ok', onclick: () => m.close() }, '知悉并收下入园邀请'));
    m.el.appendChild(card);
  }

  function enter() {
    const root = document.querySelector('#screen');
    root.textContent = '';
    const wrap = h('div.otome-login.loading');
    wrap.appendChild(h('img.login-kv', { src: NL.img('otome/bg/kv_login.webp'), draggable: 'false' }));
    wrap.appendChild(h('div.login-veil.strong'));
    wrap.appendChild(h('div.login-brand.compact',
      h('div.lb-en', 'S Y N C H R O N I Z I N G'),
      h('div.lb-cn', '正在开启暮光星轨'),
      h('div.lb-sub', '星芒巡礼列车即将抵达新生乐园站台…')));
    const fill = h('i');
    const num = h('b', '0%');
    wrap.appendChild(h('div.load-bar', fill, num));
    root.appendChild(wrap);
    let p = 0;
    const t = setInterval(() => {
      p = Math.min(100, p + 4 + Math.random() * 9);
      fill.style.width = p + '%';
      num.textContent = Math.floor(p) + '%';
      if (p >= 100) { clearInterval(t); setTimeout(() => NL.go('home'), 120); }
    }, 60);
  }
})();
