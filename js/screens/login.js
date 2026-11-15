/* 登录页：防沉迷公告 → 进入游戏 → 加载条 → 主页 */
(function () {
  'use strict';
  const h = NL.h;
  let noticeShown = false;

  NL.screens.login = {
    title: '', back: false, root: true,
    render(root) {
      root.appendChild(NL.sprite('login/bg.jpg', 0, 0, 360, 781));
      root.appendChild(NL.hit(82, 610, 196, 54, enter, { 'data-act': 'enter' }));
      root.appendChild(NL.hit(300, 126, 48, 44, () => NL.ui.confirm('确定要退出登录并清空本机存档吗？', () => { NL.reset(); NL.ui.toast('存档已清空。'); })));
      if (!noticeShown) { noticeShown = true; notice(); }
    },
  };

  function notice() {
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
    root.textContent = '';
    root.appendChild(NL.sprite('login/loading.jpg', 0, 0, 360, 781));
    const fill = h('i');
    const num = h('b', '0%');
    root.appendChild(h('div.load-bar', fill, num));
    let p = 0;
    const t = setInterval(() => {
      p = Math.min(100, p + 4 + Math.random() * 9);
      fill.style.width = p + '%';
      num.textContent = Math.floor(p) + '%';
      if (p >= 100) { clearInterval(t); setTimeout(() => NL.go('home'), 120); }
    }, 60);
  }
})();
