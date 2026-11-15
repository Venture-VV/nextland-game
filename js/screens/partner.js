/* 伙伴:列表、伙伴协议(详情)、赠礼、档案、视觉档案、等级权益、每日委托 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;
  const CARDS = [[30, 130], [137, 130], [245, 130], [30, 287], [137, 287], [245, 287]];
  const GIFT_MAX = 5;
  let timer = 0;

  NL.defaults.push(() => ({ partners: {}, pday: { date: '', gifts: 0, liked: {}, refresh: 0, tasks: null, base: {}, done: {} } }));
  const today = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function ps(p) { // 伙伴的存档
    const all = NL.state.partners;
    return all[p.id] || (all[p.id] = { lv: 1, trust: p.trust, likes: p.likes, claimed: {} });
  }
  function day() {
    const s = NL.state;
    if (s.pday.date !== today()) s.pday = { date: today(), gifts: 0, liked: {}, refresh: 0, tasks: ['credit', 'supply1', 'box'], base: {}, done: {} };
    return s.pday;
  }
  const need = (lv) => 30 * lv;
  function addTrust(p, n) {
    const st = ps(p);
    st.trust += n;
    while (st.trust >= need(st.lv) && st.lv < D.partnerLv.length) { st.trust -= need(st.lv); st.lv++; ui.toast(p.name + ' 的信任等级提升到 ' + st.lv + '。'); }
    NL.save();
  }
  // 「获得阪神信用点」类委托靠这个计数
  NL.onGrant = (items) => items.forEach((it) => { if (it.id === 'credit' && it.n > 0) game.track('credit_gain', it.n); });
  const byId = (id) => D.partners.find((p) => p.id === id);
  const hex = (n) => h('div.hex', h('b', String(n)), h('i', 'Lv.'));
  function trustCard(p) {
    const st = ps(p);
    return h('div.trust', hex(st.lv), h('span', '信任等级'), h('em', st.trust + '/' + need(st.lv)), h('div.bar', h('i', { style: { width: Math.min(100, (st.trust / need(st.lv)) * 100) + '%' } })));
  }

  /* ---------- 列表 ---------- */
  NL.screens.partner = {
    title: '', nav: 'partner', plate: true,
    render(root) {
      root.appendChild(NL.sprite('partner/list.jpg', 0, 0, 360, 700));
      D.partners.forEach((p, i) => {
        const [x, y] = CARDS[i], st = ps(p);
        if (st.likes !== p.likes) root.appendChild(h('div.pl-like', { style: { left: x + 26, top: y + 114 } }, String(st.likes)));
        if (st.lv !== 1) root.appendChild(h('div.pl-lv', { style: { left: x + 67, top: y + 96 } }, String(st.lv)));
        root.appendChild(NL.hit(x, y, 92, 142, () => NL.go('partnerInfo', { id: p.id }), { 'data-partner': p.id }));
      });
      root.appendChild(NL.hit(266, 94, 80, 24, () => ui.toast('当前按默认顺序排列。')));
    },
  };

  /* ---------- 伙伴协议 ---------- */
  NL.screens.partnerInfo = {
    title: '', plate: true,
    render(root, pr) {
      const p = byId(pr.id), st = ps(p), d = day();
      root.appendChild(NL.sprite('partner/' + p.art + '.jpg', 0, 0, 360, 781));
      if (p.blank) { // 录屏里没点开过这位伙伴,借用没加载出立绘的那张底图,盖上名字
        root.appendChild(h('div.pi-name', p.name));
        root.appendChild(h('div.pi-fix', { style: { top: 668 } }, p.place));
        root.appendChild(h('div.pi-fix', { style: { top: 692 } }, p.trait));
      }
      root.appendChild(h('div.pi-likes', String(st.likes)));
      root.appendChild(h('div.pi-trust', trustCard(p)));
      root.appendChild(NL.hit(14, 480, 48, 50, () => {
        if (d.liked[p.id]) return ui.toast('今天已经点过赞了。');
        d.liked[p.id] = true; st.likes++; NL.save(); NL.refresh();
      }, { 'data-act': 'like' }));
      root.appendChild(NL.hit(298, 238, 56, 58, () => NL.go('partnerLv', { id: p.id }), { 'data-act': 'plv' }));
      root.appendChild(NL.hit(298, 302, 56, 58, () => NL.go('partnerVisual', { id: p.id }), { 'data-act': 'pvisual' }));
      root.appendChild(NL.hit(298, 364, 56, 58, () => NL.go('partnerDaily', { id: p.id }), { 'data-act': 'pdaily' }));
      root.appendChild(NL.hit(238, 624, 94, 28, () => NL.go('partnerGift', { id: p.id }), { 'data-act': 'pgift' }));
      root.appendChild(NL.hit(264, 664, 70, 20, () => NL.go('parkmap')));
      root.appendChild(NL.hit(264, 687, 70, 20, () => archive(p), { 'data-act': 'parchive' }));
    },
  };
  function archive(p) {
    const m = ui.mask({});
    const f = p.file || {};
    const box = h('div.abs.arch', { style: { left: 0, top: 190, width: 360, height: 455 } }, NL.sprite('partner/archive.jpg', 0, 0, 360, 455));
    if (p.id !== 'jiguang') { // 底图上是冀光的档案,其他伙伴盖上各自的字;录屏里没出现的写 ???
      const fix = (x, y, w, t, big) => box.appendChild(h('div.arch-fix' + (big ? '.big' : ''), { style: { left: x, top: y, width: w } }, t));
      fix(163, 41, 70, p.name, true);
      fix(196, 86, 90, f.years || '???'); fix(196, 122, 110, f.birth || '???'); fix(196, 158, 90, p.race); fix(196, 194, 90, f.star || '???');
      fix(74, 244, 150, f.like || '???'); fix(74, 281, 150, f.hate || '???'); fix(74, 317, 240, p.trait);
    }
    box.appendChild(NL.hit(296, 44, 40, 40, () => m.close()));
    m.el.appendChild(box);
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 668, textAlign: 'center', margin: 0 } }, '点击空白处关闭。'));
  }

  /* ---------- 赠礼 ---------- */
  let giftSel = null;
  NL.screens.partnerGift = {
    title: '', plate: true,
    render(root, pr) {
      const p = byId(pr.id), d = day();
      const gifts = Object.keys(D.items).filter((id) => D.items[id].gift).sort((a, b) => (p.love.includes(b) ? 1 : 0) - (p.love.includes(a) ? 1 : 0));
      if (!gifts.includes(giftSel)) giftSel = gifts[0];
      const g = D.items[giftSel], loved = p.love.includes(giftSel), bonus = loved ? Math.round(g.base * 0.6) : 0; // 录屏:+6 +10、+12 +20
      root.appendChild(NL.sprite('partner/' + p.art + '.jpg', 0, 0, 360, 781));
      if (p.blank) root.appendChild(h('div.pi-name', p.name));
      root.appendChild(h('div.gift-panel',
        h('div.gp-tab', '赠礼'),
        h('div.gp-card', trustCard(p)),
        h('div.gp-card.info',
          h('div.gp-name', { style: { borderColor: D.rarity[g.rare][1] } }, g.name),
          h('div.gp-tags', h('i', '情感礼物'), loved ? h('i.love', '喜好物品') : null),
          h('div.gp-fav', h('span', '好感度'), loved ? h('em', '+' + bonus) : null, h('b', '+' + g.base)),
          h('div.gp-desc', g.desc),
          h('div.gp-list.scroll-x', gifts.map((id) => {
            const el = ui.itemEl(id, game.count(id));
            el.classList.add('gift'); if (id === giftSel) el.classList.add('sel');
            if (p.love.includes(id)) el.appendChild(h('u', '♥'));
            el.dataset.gift = id;
            el.onclick = () => { giftSel = id; NL.refresh(); };
            return el;
          })))));
      root.appendChild(h('div.gp-count', '今日次数  ' + d.gifts + '/' + GIFT_MAX));
      root.appendChild(h('button.btn.pink.gp-send', { 'data-act': 'send', onclick: () => {
        if (d.gifts >= GIFT_MAX) return ui.toast('今日赠礼次数已用完。');
        if (!game.spend(giftSel, 1)) return ui.toast('您没有该礼物');
        d.gifts++; addTrust(p, g.base + bonus); NL.refresh();
      } }, '赠送'));
    },
  };

  /* ---------- 视觉档案 ---------- */
  NL.screens.partnerVisual = {
    title: '', plate: true,
    render(root) {
      root.appendChild(NL.sprite('partner/visual.jpg', 0, 0, 360, 781));
      root.appendChild(NL.hit(300, 60, 54, 46, () => NL.back()));
      root.appendChild(NL.hit(213, 672, 136, 34, () => ui.toast('该形象尚未解锁。')));
    },
  };

  /* ---------- 等级权益 ---------- */
  NL.screens.partnerLv = {
    title: '', plate: true,
    render(root, pr) {
      const p = byId(pr.id), st = ps(p);
      root.classList.add('pink');
      root.appendChild(NL.sprite('partner/band.jpg', 0, 0, 360, 131));
      root.appendChild(ui.pill('home/ico_coin.webp', NL.state.credit, 253, 90, { w: 91 }));
      root.appendChild(h('div.plv-list.scroll', { 'data-keep': 'plv' }, D.partnerLv.map((r, i) => {
        const lv = i + 1, ok = st.lv >= lv, got = st.claimed[lv];
        const kind = r.reward ? '获得奖励' : r.perk ? '获得权益' : r.word ? '获得词条' : '解锁功能';
        const mid = r.reward ? h('div.plv-items', r.reward.map((x) => ui.itemEl(x.id, x.n, 'sm')))
          : h('div.plv-bar' + (r.word ? '.blue' : r.unlock ? '.cyan' : ''), r.perk || r.word || r.unlock);
        let right;
        if (got) right = h('div.plv-done', '已领取');
        else if (!ok) right = h('div.plv-no', '等级未达到');
        else right = h('button.tk-btn.pink.plv-get', { 'data-plv': lv, onclick: () => {
          if (r.cost && !game.spend('gem', r.cost)) return ui.toast('储值不足。');
          st.claimed[lv] = true; NL.save();
          if (r.reward) game.award(r.reward); else { ui.toast('已生效：' + (r.perk || r.word || r.unlock)); NL.refresh(); }
        } }, r.cost ? '兑换' : '领取');
        return h('div.plv-row' + (ok ? '.ok' : ''), hex(lv),
          h('div.plv-card', h('div.plv-kind', kind), mid, r.cost ? h('div.plv-cost', '使用 ', h('img', { src: NL.img('home/ico_gem.webp') }), ' ' + r.cost) : null, right));
      })));
    },
  };

  /* ---------- 每日委托 ---------- */
  NL.screens.partnerDaily = {
    title: '', plate: true,
    render(root, pr) {
      const p = byId(pr.id), d = day(), s = NL.state;
      clearInterval(timer);
      root.classList.add('pink');
      root.appendChild(NL.sprite('partner/band.jpg', 0, 0, 360, 131));
      const clock = h('b', NL.fmt.untilReset() + '后刷新');
      root.appendChild(h('div.dp-clock.pd-clock', h('i'), clock));
      timer = setInterval(() => (clock.textContent = NL.fmt.untilReset() + '后刷新'), 1000);
      root.appendChild(ui.pill('home/ico_coin.webp', s.credit, 253, 90, { w: 91 }));
      root.appendChild(h('div.pd-trust', trustCard(p)));
      const list = h('div.pd-list');
      root.appendChild(list);
      d.tasks.forEach((id, i) => {
        const t = D.commissions.find((c) => c.id === id), done = d.done[i];
        let mid, right;
        if (t.ev) {
          const cur = Math.min(t.need, (game.daily().c[t.ev] || 0) - (d.base[i] || 0));
          mid = h('div.pd-prog', h('span', '任务进度'), h('em', Math.max(0, cur) + '/' + t.need), h('div.bar', h('i', { style: { width: Math.max(0, cur / t.need) * 100 + '%' } })));
          right = done ? null : cur >= t.need ? h('button.tk-btn.pink', { 'data-pd': i, onclick: () => finish(i, t) }, '领取') : h('div.tk-status', '未完成');
        } else if (t.submit) {
          const have = game.count(t.submit[0]);
          mid = h('div.pd-sub', ui.itemEl(t.submit[0], 1, 'sm'), h('span' + (have < t.submit[1] ? '.no' : ''), h('em', String(have)), '/' + t.submit[1]));
          right = done ? null : h('button.pd-btn', { 'data-pd': i, onclick: () => {
            if (!game.spend(t.submit[0], t.submit[1])) return ui.toast('提交资源不足');
            finish(i, t);
          } }, '提交');
        } else {
          const pool = s.gear.filter((g) => !game.slotOf(g.uid) && D.equips[g.id].rare === t.submitRare[0]).slice(0, t.submitRare[1]);
          mid = h('div.pd-sub', [0, 1, 2].map((k) => (pool[k] ? ui.itemEl(pool[k].id, '', 'sm') : h('div.pd-plus', '+'))));
          right = done ? null : h('button.pd-btn', { 'data-pd': i, onclick: () => {
            if (pool.length < t.submitRare[1]) return ui.toast('提交资源不足');
            pool.forEach((g) => s.gear.splice(s.gear.indexOf(g), 1));
            finish(i, t);
          } }, '提交');
        }
        list.appendChild(h('div.pd-card' + (done ? '.done' : ''), h('div.pd-heart', String(t.heart)), h('div.tk-title', h('i', '▶'), t.title), mid, done ? h('div.pd-ok', '已完成') : right));
      });
      const cost = 10 + d.refresh * 5; // 录屏:第一次 10,第二次 15
      root.appendChild(h('div.pd-cost', '使用 ', h('img', { src: NL.img('home/ico_coin.webp') }), ' ' + cost));
      root.appendChild(h('button.btn.purple.pd-refresh', { 'data-act': 'pd-refresh', onclick: () => {
        if (!game.spend('credit', cost)) return ui.toast('阪神信用点不足。');
        d.refresh++;
        const pool = D.commissions.map((c) => c.id).sort(() => Math.random() - 0.5);
        d.tasks = d.refresh === 1 ? ['credit', 'supply2', 'white'] : pool.slice(0, 3); // 第一次刷新照录屏里的结果
        d.done = {}; d.base = {};
        d.tasks.forEach((id, i) => { const t = D.commissions.find((c) => c.id === id); if (t.ev && t.ev !== 'credit_gain') d.base[i] = game.daily().c[t.ev] || 0; });
        NL.save(); NL.refresh(); ui.toast('刷新成功');
      } }, h('i.spin', '↻'), '立即刷新'));
      function finish(i, t) { d.done[i] = true; addTrust(p, t.heart); NL.save(); NL.refresh(); }
    },
    leave() { clearInterval(timer); },
  };
})();
