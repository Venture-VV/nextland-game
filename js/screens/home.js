/* 主页：暮光幻境可拖动园区大地图 + 珠光地标铭牌 + 猎人名片（支持女主/男主一键切换与陪伴伙伴徽章） */
(function () {
  'use strict';
  const h = NL.h;
  const D = NL.data;
  const VW = 360, VH = 781;
  let pos = null;
  let timer = 0;

  const ZONE_BADGE = { core: 'ZONE 01', hanshin: 'ZONE 02', museum: 'ZONE 03' };

  const ICONS = {
    friends: '<svg viewBox="0 0 24 24"><circle cx="9.2" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="15.8" cy="10" r="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.2 18.5c1-2.6 2.8-3.9 5-3.9s4 1.3 5 3.9M14.2 18.5c.7-1.9 2-2.9 3.8-2.9 1.3 0 2.4.6 3.1 1.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3.5" y="6" width="17" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m4.5 7.5 7.5 5.3 7.5-5.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 4.2v2.1M12 17.7v2.1M4.2 12h2.1M17.7 12h2.1M6.5 6.5l1.5 1.5M16 16l1.5 1.5M17.5 6.5 16 8M8 16l-1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    faction: '<svg viewBox="0 0 24 24"><path d="M12 3.5 19 7v5.4c0 4.2-2.9 7.2-7 8.6-4.1-1.4-7-4.4-7-8.6V7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m12 8.2 1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 3.8v3.2M16 3.8v3.2M4 10h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="14.8" r="1.5" fill="currentColor"/></svg>',
    shop: '<svg viewBox="0 0 24 24"><path d="M5 9.5h14l-1.2 9.5a2 2 0 0 1-2 1.7H8.2a2 2 0 0 1-2-1.7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.8 9.5V7.2a3.2 3.2 0 0 1 6.4 0v2.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    supply: '<svg viewBox="0 0 24 24"><path d="M12 3.2 14.4 9l5.8.6-4.4 3.9 1.3 5.7-5.1-3-5.1 3 1.3-5.7-4.4-3.9 5.8-.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    rank: '<svg viewBox="0 0 24 24"><path d="M7 19.5h10M9 19.5v-3.2m6 3.2v-3.2M6.5 5.5h11v4.8a5.5 5.5 0 0 1-11 0z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 7H4.2a2 2 0 0 0 2.3 3.2M17.5 7h2.3a2 2 0 0 1-2.3 3.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    modes: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 4.5v5.3M12 14.2v5.3M4.5 12h5.3M14.2 12h5.3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  };

  // 可拖动暮光幻境园区大地图；点击三座核心场馆铭牌触发关卡
  NL.ui.parkMap = function (onBuilding) {
    const mw = D.map.w / 2, mh = D.map.h / 2;
    if (!pos) pos = D.map.start.slice();
    const map = h('div.park-map', { style: { width: mw, height: mh, backgroundImage: NL.bg('otome/bg/map_twilight.webp') } });
    const clamp = () => {
      pos[0] = Math.min(0, Math.max(VW - mw, pos[0]));
      pos[1] = Math.min(0, Math.max(VH - mh, pos[1]));
      map.style.transform = 'translate3d(' + pos[0] + 'px,' + pos[1] + 'px,0)';
    };
    D.buildings.forEach((b) => {
      const [x0, y0, x1, y1] = b.box.map((v) => v / 2);
      map.appendChild(h('button.hit.landmark-pin', {
        'data-building': b.id,
        style: { left: x0, top: y0, width: x1 - x0, height: y1 - y0 },
        onclick: () => { if (!moved) onBuilding(b.id); },
      },
      h('span.lp-card',
        h('i.lp-zone', ZONE_BADGE[b.id] || 'PARK'),
        h('b.lp-name', '✦ ' + b.name),
        h('u.lp-dot'))));
    });
    let drag = null, moved = false;
    map.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY, pos[0], pos[1]]; moved = false; });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    function onMove(e) {
      if (!drag) return;
      const dx = (e.clientX - drag[0]) / NL.scale, dy = (e.clientY - drag[1]) / NL.scale;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      pos[0] = drag[2] + dx; pos[1] = drag[3] + dy;
      clamp();
    }
    function onUp() { drag = null; }
    clamp();
    return {
      el: map,
      destroy() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      },
      focus(mx, my, sx, sy) { pos[0] = sx - mx / 2; pos[1] = sy - my / 2; clamp(); },
    };
  };

  // 顶部体力珠光胶囊（主页和若干子页面共用）
  NL.ui.energyPill = function (x, y) {
    const s = NL.state;
    return NL.ui.pill('home/ico_bolt.webp', s.energy + '/' + s.energyMax, x, y, {
      cls: 'energy', plus: true, w: 94,
      onclick: (e) => {
        if (e.target.classList.contains('plus')) return NL.game.buyEnergy();
        energyTip(x, y + 30);
      },
    });
  };
  function energyTip(x, y) {
    const t = NL.game.energyTimers();
    if (!t) return NL.ui.toast('当前星芒体力充沛');
    const m = NL.ui.mask({ clear: true });
    const a = h('b'), b = h('b');
    const upd = () => { const tt = NL.game.energyTimers(); if (!tt) return m.close(); a.textContent = NL.fmt.clock(tt.next); b.textContent = NL.fmt.clock(tt.all); };
    upd();
    const iv = setInterval(() => (m.el.parentNode ? upd() : clearInterval(iv)), 1000);
    m.el.appendChild(h('div.energy-tip', { style: { left: x - 12, top: y } }, h('i', '✦ 下点恢复'), a, h('i', '✦ 全部恢复'), b));
  }

  let mapApi = null;
  NL.screens.home = {
    title: '暮光乐园', nav: 'home',
    render(root) {
      const s = NL.state;
      mapApi = NL.ui.parkMap((id) => NL.go('stages', { zone: id }));
      root.appendChild(mapApi.el);

      const hud = h('div.hud');
      root.appendChild(hud);

      // 顶部三枚珠光资源胶囊
      hud.appendChild(NL.ui.pill('home/ico_gem.webp', s.gem, 14, 88));
      hud.appendChild(NL.ui.pill('home/ico_coin.webp', s.credit, 114, 88));
      hud.appendChild(NL.ui.energyPill(214, 88));

      // 珠光猎人主名片（默认高颜值猎人女主，支持一键切换清隽男主 + 陪伴伙伴快捷共鸣）
      const heroKey = NL.heroKey();
      const comp = D.partners.find((p) => p.id === (s.homePartner || 'jiguang')) || D.partners[0];
      const unreadMail = (s.mails || []).some((m) => !m.got);

      const card = h('div.otome-hunter-card',
        h('div.ohc-ava-wrap',
          h('img.ohc-ava', { src: NL.img('otome/avatars/' + heroKey + '.webp'), draggable: 'false', alt: '主角头像' }),
          h('span.ohc-lv', 'Lv.' + s.level)),
        h('div.ohc-info',
          h('div.ohc-name-row', h('b.ohc-name', s.name)),
          h('div.ohc-power', '✦ 星芒战力 ' + NL.fmt.power(NL.game.power())),
          h('button.ohc-loc', { onclick: (e) => { e.stopPropagation(); NL.go('parkmap'); } }, '📍 新生乐园 · 全景导览 ▸')),
        h('button.ohc-hit', { 'data-act': 'profile', onclick: () => NL.go('profile'), title: '个人档案' }),
        h('button.ohc-gender', {
          'data-act': 'toggle-hero',
          title: '切换女主/男主形象',
          onclick: (e) => {
            e.stopPropagation();
            s.heroGender = s.heroGender === 'm' ? 'f' : 'm';
            NL.save();
            NL.refresh();
            NL.ui.toast(s.heroGender === 'm' ? '已切换为「清隽少年男主」形象' : '已切换为「飒爽猎人女主」形象');
          },
        }, s.heroGender === 'm' ? '♂ 男主 ⇄' : '♀ 女主 ⇄'));
      hud.appendChild(card);

      // 左侧二级功能胶囊（势力 + 日历 + 当前陪伴伙伴入口）
      const subBtn = (act, label, svg, x, y, fn) => {
        hud.appendChild(h('button.hud-glass-mini', {
          'data-act': act, style: { left: x, top: y }, onclick: fn,
          html: `<i>${svg}</i><span>${label}</span>`,
        }));
      };
      subBtn('faction', '势力', ICONS.faction, 14, 218, () => NL.go('faction'));
      subBtn('calendar', '日历', ICONS.calendar, 64, 218, () => (NL.ui.calendar ? NL.ui.calendar() : NL.ui.toast('敬请期待')));

      hud.appendChild(h('button.hud-companion-pill', {
        style: { left: 116, top: 218 },
        onclick: () => NL.go('partnerInfo', { id: comp.id }),
      },
      h('img', { src: NL.img('otome/avatars/' + comp.art + '.webp'), draggable: 'false' }),
      h('span', '陪伴 · ' + comp.name)));

      // 右上角轻奢工具组（好友 / 邮箱 / 设置）
      const topIcon = (act, label, svg, x, y, fn, dot) => {
        hud.appendChild(h('button.hud-top-ico', {
          'data-act': act, style: { left: x, top: y }, onclick: fn,
          html: `<i>${svg}</i><span>${label}</span>${dot ? '<u class="hud-dot"></u>' : ''}`,
        }));
      };
      topIcon('friends', '好友', ICONS.friends, 244, 128, () => NL.go('friends'), (s.friendReq || []).length > 0);
      topIcon('mail', '信箱', ICONS.mail, 280, 128, () => NL.go('mail'), unreadMail);
      topIcon('settings', '设置', ICONS.settings, 316, 128, () => (NL.ui.settings ? NL.ui.settings() : NL.ui.toast('敬请期待')), false);

      // 右侧悬浮乐园入口（商城 / 补给 / 排行 / 玩法）
      const FLOATS = [
        ['shop', '商城', ICONS.shop, 198, 0],
        ['supply', '补给', ICONS.supply, 260, 1],
        ['rank', '排行', ICONS.rank, 322, 2],
        ['modes', '巡游', ICONS.modes, 384, 3],
      ];
      FLOATS.forEach(([name, label, svg, y, idx]) => {
        hud.appendChild(h('button.hud-float-pill.float', {
          'data-act': name,
          style: `left:294px;top:${y}px;animation-delay:${-idx * 0.45}s`,
          onclick: () => NL.go(name),
          html: `<i>${svg}</i><span>${label}</span>`,
        }));
      });

      // 底部双主行动卡（暮光冒险 + 园区互动）
      hud.appendChild(h('button.hud-adv-cta', { 'data-act': 'adventure', onclick: () => NL.go('adventure') },
        h('span.hac-en', 'TWILIGHT TRIAL'),
        h('b.hac-cn', '✦ 暮光冒险')));

      hud.appendChild(h('button.hud-explore-cta', {
        'data-act': 'explore',
        onclick: () => (NL.ui.interact ? NL.ui.interact() : NL.ui.toast('敬请期待')),
      }, h('span', '✦ 园区互动')));

      // 线下游园引导
      if (s.guide == null) {
        NL.ui.dialog({
          html: '您此刻正身处<b>新生乐园</b>园区现场吗？<br>开启游园向导后，星芒指引将陪伴您前往<br><em>「委托」</em>页面逐步解锁奇遇。',
          buttons: [
            { text: '暂不开启', cls: 'pink', onClick: () => { s.guide = 'off'; NL.save(); } },
            { text: '开启指引', cls: 'purple', onClick: () => { s.guide = 'on'; s.guideStep = 0; NL.save(); NL.refresh(); } },
          ],
        });
      } else if (s.guide === 'on' && s.guideStep === 0) {
        root.appendChild(h('div.guide-dim'));
        root.appendChild(h('div.guide-tip', { style: { left: 16, top: 636 } }, '✦ 游园向导的每一步奇遇都在「委托」里'));
        root.appendChild(h('div.guide-arrow', { style: { left: 238, top: 684 } }));
      }
      clearInterval(timer);
      timer = setInterval(() => {
        const el = hud.querySelector('.pill.energy span');
        if (el) el.textContent = NL.state.energy + '/' + NL.state.energyMax;
      }, 1000);
    },
    leave() { clearInterval(timer); if (mapApi) mapApi.destroy(); mapApi = null; },
  };
})();
