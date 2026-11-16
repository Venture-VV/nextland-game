/* 主页：可拖动的园区地图 + HUD */
(function () {
  'use strict';
  const h = NL.h;
  const D = NL.data;
  const VW = 360, VH = 781;
  let pos = null; // 地图偏移，切走再回来时保留
  let timer = 0;

  // 可拖动地图；返回 {el, setPos}。onBuilding(id) 在点到建筑牌子时触发
  NL.ui.parkMap = function (onBuilding) {
    const mw = D.map.w / 2, mh = D.map.h / 2;
    if (!pos) pos = D.map.start.slice();
    const map = h('div.park-map', { style: { width: mw, height: mh, backgroundImage: NL.bg('home/map.webp') } });
    const MIN = [VW - mw, VH - mh], MAX = [0, 0];
    const draw = () => { map.style.transform = 'translate3d(' + pos[0] + 'px,' + pos[1] + 'px,0)'; };
    const clamp = () => {
      pos[0] = Math.min(0, Math.max(VW - mw, pos[0]));
      pos[1] = Math.min(0, Math.max(VH - mh, pos[1]));
      draw();
    };
    let glide = null, vel = [0, 0], lastMove = 0;
    D.buildings.forEach((b) => {
      const [x0, y0, x1, y1] = b.box.map((v) => v / 2);
      map.appendChild(h('button.hit', { 'data-building': b.id, style: { left: x0, top: y0, width: x1 - x0, height: y1 - y0 }, onclick: () => { if (!moved) onBuilding(b.id); } }));
    });
    // 扩展玩法「园区巡游」:今天还没去过的光点钉在对应的建筑上(开关关着时没有)
    NL.ext.spots().forEach((sp, i) => {
      const b = D.buildings.find((x) => x.id === sp.zone);
      if (b && !sp.done) map.appendChild(NL.ext.spotEl(i, { left: (b.box[0] + b.box[2]) / 4 - 17, top: b.box[3] / 2 - 4 })); // 牌子的正下方,不会被上面的资源栏挡住
    });
    let drag = null, moved = false;
    map.addEventListener('pointerdown', (e) => { if (glide) glide.stop(); clamp(); drag = [e.clientX, e.clientY, pos[0], pos[1]]; moved = false; vel = [0, 0]; lastMove = performance.now(); });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    function onMove(e) {
      if (!drag) return;
      const dx = (e.clientX - drag[0]) / NL.scale, dy = (e.clientY - drag[1]) / NL.scale;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      if (!NL.motion.on()) { pos[0] = drag[2] + dx; pos[1] = drag[3] + dy; clamp(); return; } // 原版:松手就停,到边就卡住
      // 升级动效:拖过边界时越拖越费劲,松手后带惯性滑一段,出界的弹回来
      const now = performance.now(), dt = Math.max(1, now - lastMove) / 1000, old = pos.slice();
      [dx, dy].forEach((d, i) => {
        const raw = drag[2 + i] + d;
        pos[i] = raw > MAX[i] ? MAX[i] + NL.motion.rubber(raw - MAX[i], 120) : raw < MIN[i] ? MIN[i] + NL.motion.rubber(raw - MIN[i], 120) : raw;
        vel[i] = vel[i] * 0.4 + ((pos[i] - old[i]) / dt) * 0.6;
      });
      lastMove = now;
      draw();
    }
    function onUp() {
      if (drag && NL.motion.on()) {
        if (performance.now() - lastMove > 90) vel = [0, 0]; // 停了一会儿才松手,就不滑了
        glide = NL.motion.glide(pos, vel.map((v) => Math.max(-2600, Math.min(2600, v))), MIN, MAX, draw);
      }
      drag = null;
    }
    clamp();
    return {
      el: map,
      destroy() {
        if (glide) glide.stop();
        clamp();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      },
      // 把地图上的某个点移到屏幕指定位置
      focus(mx, my, sx, sy) { pos[0] = sx - mx / 2; pos[1] = sy - my / 2; clamp(); },
    };
  };

  // 顶部三枚资源胶囊（主页和若干子页面共用）
  NL.ui.energyPill = function (x, y) {
    const s = NL.state;
    return NL.ui.pill('home/ico_bolt.webp', s.energy + '/' + s.energyMax, x, y, { cls: 'energy', plus: true, w: 91, onclick: (e) => {
      if (e.target.classList.contains('plus')) return NL.game.buyEnergy();
      energyTip(x, y + 28);
    } });
  };
  function energyTip(x, y) {
    const t = NL.game.energyTimers();
    if (!t) return NL.ui.toast('体力已满。');
    const m = NL.ui.mask({ clear: true });
    const a = h('b'), b = h('b');
    const upd = () => { const tt = NL.game.energyTimers(); if (!tt) return m.close(); a.textContent = NL.fmt.clock(tt.next); b.textContent = NL.fmt.clock(tt.all); };
    upd();
    const iv = setInterval(() => (m.el.parentNode ? upd() : clearInterval(iv)), 1000);
    m.el.appendChild(h('div.energy-tip', { style: { left: x, top: y } }, h('i', '✦下次恢复'), a, h('i', '✦全部恢复'), b));
  }

  let mapApi = null;
  NL.screens.home = {
    title: '主页', nav: 'home',
    render(root) {
      const s = NL.state;
      mapApi = NL.ui.parkMap((id) => NL.go('stages', { zone: id }));
      root.appendChild(mapApi.el);

      const hud = h('div.hud');
      root.appendChild(hud);
      hud.appendChild(NL.ui.pill('home/ico_gem.webp', s.gem, 16, 99));
      hud.appendChild(NL.ui.pill('home/ico_coin.webp', s.credit, 115, 99));
      hud.appendChild(NL.ui.energyPill(215, 99));

      hud.appendChild(NL.sprite('home/card.webp', 14, 129, 230, 85));
      if (s.level !== 21) hud.appendChild(h('div.lv-tag', '等级:' + s.level)); // 底图里烙着「等级:21」，其他等级盖一个小牌
      hud.appendChild(NL.hit(22, 132, 190, 70, () => NL.go('profile'), { 'data-act': 'profile' }));
      hud.appendChild(NL.hit(100, 177, 120, 20, () => NL.go('parkmap')));

      const btn = (img, x, y, w, hh, fn, act) => {
        hud.appendChild(NL.sprite(img, x, y, w, hh));
        hud.appendChild(NL.hit(x, y, w, hh, fn, { 'data-act': act }));
      };
      btn('home/btn_friend.webp', 233, 132, 41, 46, () => NL.go('friends'), 'friends');
      btn('home/btn_mail.webp', 275, 140, 31, 38, () => NL.go('mail'), 'mail');
      btn('home/btn_setting.webp', 314, 140, 34, 38, () => (NL.ui.settings ? NL.ui.settings() : NL.ui.toast('敬请期待。')), 'settings');
      btn('home/btn_faction.webp', 9, 217, 44, 45, () => NL.go('faction'), 'faction');
      // 表 / 里一键翻面(原版没有):显示的是点了之后会去的那一面
      const other = NL.skin() === 'biao' ? 'li' : 'biao';
      root.appendChild(h('button.skin-flip', { 'data-act': 'skin', title: '表 / 里', onclick: () => NL.setSkin(other, 31, 300) }, h('b', other === 'biao' ? '表' : '里'), h('i', '翻面')));
      btn('home/btn_calendar.webp', 54, 217, 45, 45, () => (NL.ui.calendar ? NL.ui.calendar() : NL.ui.toast('敬请期待。')), 'calendar');
      const float = (img, x, y, w, hh, name, i) => {
        const el = NL.sprite(img, x, y, w, hh, { cls: 'float', style: 'animation-delay:' + -i * 0.5 + 's' });
        Object.assign(el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: hh + 'px' });
        hud.appendChild(el);
        hud.appendChild(NL.hit(x, y, w, hh, () => NL.go(name), { 'data-act': name }));
      };
      float('home/btn_shop.webp', 287, 204, 63, 62, 'shop', 0);
      float('home/btn_supply.webp', 287, 274, 63, 61, 'supply', 1);
      float('home/btn_tower.webp', 287, 342, 63, 62, 'rank', 2);
      float('home/btn_modes.webp', 287, 412, 63, 61, 'modes', 3);
      btn('home/btn_adventure.webp', 7, 570, 131, 64, () => NL.go('adventure'), 'adventure');
      btn('home/btn_explore.webp', 249, 635, 98, 52, () => (NL.ui.interact ? NL.ui.interact() : NL.ui.toast('敬请期待。')), 'explore');

      guideLayer(root);
      clearInterval(timer);
      timer = setInterval(() => {
        const el = hud.querySelector('.pill.energy span');
        if (el) el.textContent = NL.state.energy + '/' + NL.state.energyMax;
      }, 1000);
    },
    // 表的画法:夜景做底,一位伙伴当看板,原来点地图上建筑的入口排成一排地点按钮;其余按钮和里一一对应
    renderBiao(root) {
      const s = NL.state;
      root.classList.add('bp');
      root.classList.add('bh');
      if (NL.biaoAssets['home/bg.webp']) root.appendChild(h('div.bh-bg', { style: { backgroundImage: NL.bg('home/bg.webp') } }));
      if (NL.biaoAssets['partner/art_ling.webp']) root.appendChild(h('div.bh-art', { style: { backgroundImage: NL.bg('partner/art_ling.webp') } }));
      const hud = h('div.hud');
      root.appendChild(hud);
      hud.appendChild(NL.ui.pill('home/ico_gem.webp', s.gem, 16, 99));
      hud.appendChild(NL.ui.pill('home/ico_coin.webp', s.credit, 115, 99));
      hud.appendChild(NL.ui.energyPill(215, 99));
      hud.appendChild(h('button.bh-card', { 'data-act': 'profile', onclick: () => NL.go('profile') },
        h('div.bh-face', NL.biaoAssets['partner/face_hero.webp'] ? { style: { backgroundImage: NL.bg('partner/face_hero.webp') } } : null),
        h('b', s.name), h('span', '等级 ' + s.level)));
      hud.appendChild(h('button.bh-place', { onclick: () => NL.go('parkmap') }, '新生乐园世界 ›'));
      const dots = NL.dots();
      const chip = (x, y, text, act, fn) => hud.appendChild(h('button.bh-chip' + (dots[act] ? '.dot' : ''), { style: { left: x, top: y }, 'data-act': act, onclick: fn }, text));
      chip(232, 134, '好友', 'friends', () => NL.go('friends'));
      chip(274, 134, '邮件', 'mail', () => NL.go('mail'));
      chip(316, 134, '设置', 'settings', () => NL.ui.settings());
      chip(14, 222, '势力', 'faction', () => NL.go('faction'));
      chip(56, 222, '日历', 'calendar', () => NL.ui.calendar());
      root.appendChild(h('button.skin-flip', { 'data-act': 'skin', title: '表 / 里', onclick: () => NL.setSkin('li', 31, 300) }, h('b', '里'), h('i', '翻面')));
      [['shop', '商城'], ['supply', '补给'], ['rank', '无尽之塔'], ['modes', '玩法']].forEach(([name, text], i) =>
        hud.appendChild(h('button.bh-side', { style: { top: 212 + i * 52 }, 'data-act': name, onclick: () => NL.go(name) }, text)));
      const spots = NL.ext.spots(); // 扩展玩法「园区巡游」的光点,挂在地点按钮上
      hud.appendChild(h('div.bh-zones', h('span', '园区地点'), D.buildings.map((b) => {
        const i = spots.findIndex((sp) => sp.zone === b.id && !sp.done);
        return h('div.bh-zone', h('button', { 'data-building': b.id, onclick: () => NL.go('stages', { zone: b.id }) }, b.name), i >= 0 ? NL.ext.spotEl(i) : null);
      })));
      hud.appendChild(h('button.btn.purple.bh-adv', { 'data-act': 'adventure', onclick: () => NL.go('adventure') }, '冒险'));
      hud.appendChild(h('button.btn.dark.bh-exp', { 'data-act': 'explore', onclick: () => NL.ui.interact() }, '探索'));
      guideLayer(root);
      clearInterval(timer);
      timer = setInterval(() => {
        const el = hud.querySelector('.pill.energy span');
        if (el) el.textContent = NL.state.energy + '/' + NL.state.energyMax;
      }, 1000);
    },
    leave() { clearInterval(timer); if (mapApi) mapApi.destroy(); mapApi = null; },
  };
  // 线下引导:第一次进主页先问要不要开;开了之后提示去「任务」
  function guideLayer(root) {
    const s = NL.state;
    {
      if (s.guide == null) {
        NL.ui.dialog({
          html: '你现在在新生乐园园区里吗？<br>开启线下引导后，会一直提示你去「任务」里<br>看下一步做什么。',
          buttons: [
            { text: '不需要', cls: 'pink', onClick: () => { s.guide = 'off'; NL.save(); } },
            { text: '开启引导', cls: 'purple', onClick: () => { s.guide = 'on'; s.guideStep = 0; NL.save(); NL.refresh(); } },
          ],
        });
      } else if (s.guide === 'on' && s.guideStep === 0) {
        root.appendChild(h('div.guide-dim'));
        root.appendChild(h('div.guide-tip', { style: { left: 2, top: 626 } }, '线下引导的每一步都在「任务」里'));
        root.appendChild(h('div.guide-arrow', { style: { left: 226, top: 656 } }));
      }
    }
  }
})();
