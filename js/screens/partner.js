/* 伙伴协议全链路：名册画廊、呼吸微动态立绘舞台、机密档案弹窗、情感赠礼、视觉鉴赏、等级权益、每日委托 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;
  const GIFT_MAX = 5;
  let timer = 0;

  NL.defaults.push(() => ({ partners: {}, pday: { date: '', gifts: 0, liked: {}, refresh: 0, tasks: null, base: {}, done: {} } }));
  const today = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function ps(p) {
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
    while (st.trust >= need(st.lv) && st.lv < D.partnerLv.length) {
      st.trust -= need(st.lv); st.lv++;
      ui.toast(p.name + ' 的信任等级提升至 Lv.' + st.lv);
    }
    NL.save();
  }
  NL.onGrant = (items) => items.forEach((it) => { if (it.id === 'credit' && it.n > 0) game.track('credit_gain', it.n); });
  const byId = (id) => D.partners.find((p) => p.id === id) || D.partners[0];
  const hex = (n) => h('div.hex', h('b', String(n)), h('i', 'Lv.'));
  function trustCard(p) {
    const st = ps(p);
    return h('div.trust',
      hex(st.lv),
      h('span', '信任共鸣'),
      h('em', st.trust + '/' + need(st.lv)),
      h('div.bar', h('i', { style: { width: Math.min(100, (st.trust / need(st.lv)) * 100) + '%' } })));
  }

  function subHeader(p, subtitle) {
    const st = ps(p);
    return h('div.pt-subhead',
      h('img.pts-ava', { src: NL.img('otome/avatars/' + p.art + '.webp'), draggable: 'false' }),
      h('div.pts-meta',
        h('div.pts-name', p.name, h('span', subtitle)),
        h('div.pts-sub', p.place + ' · 信任 Lv.' + st.lv)));
  }

  /* ---------- 1. 伙伴名册（6 宫格高定半身卡面画廊） ---------- */
  NL.screens.partner = {
    title: '伙伴协议', nav: 'partner',
    render(root) {
      const wrap = h('div.pt-gallery');
      wrap.appendChild(h('div.ptg-head',
        h('div.ptg-sub', '✦ RESONANCE PARTNERS · 已缔结 6/6'),
        h('button.ptg-sort', { onclick: () => ui.toast('当前按驻场点位顺序排列') }, '点位排序 ▾')));

      const grid = h('div.ptg-grid');
      D.partners.forEach((p) => {
        const st = ps(p);
        const isComp = (NL.state.homePartner || 'jiguang') === p.id;
        grid.appendChild(h('button.pt-card', {
          'data-partner': p.id,
          onclick: () => NL.go('partnerInfo', { id: p.id }),
        },
        h('img.ptc-img', { src: NL.img('otome/cards/' + p.art + '.webp'), draggable: 'false', alt: p.name }),
        h('span.ptc-race', p.race),
        h('span.ptc-lv', 'Lv.' + st.lv),
        isComp ? h('span.ptc-pin', '陪伴中') : null,
        h('div.ptc-foot',
          h('div.ptc-row', h('b.ptc-name', p.name), h('span.ptc-like', '♥ ' + st.likes)),
          h('div.ptc-place', p.place.replace('新生乐园', '园区 · ')))));
      });
      wrap.appendChild(grid);
      root.appendChild(wrap);
    },
  };

  /* ---------- 2. 伙伴协议详情（呼吸立绘舞台 + 星芒散景 + 点击台词互动） ---------- */
  NL.screens.partnerInfo = {
    title: '', plate: 'cap',
    render(root, pr) {
      const p = byId(pr.id), st = ps(p), d = day();
      const stage = ui.charStage(p.art, { quotes: p.quotes, name: p.name });
      root.appendChild(stage);

      // 左上角轻奢角色铭牌
      root.appendChild(h('div.pi-header',
        h('div.pih-tags', h('span.pih-race', p.race), h('span.pih-place', p.place)),
        h('div.pih-name', p.name),
        h('div.pih-title', '✦ ' + (p.title || '新生乐园驻场伙伴')),
        h('div.pih-hint', '轻触立绘倾听心声')));

      // 左侧心动点赞胶囊
      const liked = !!d.liked[p.id];
      root.appendChild(h('button.pi-like-btn' + (liked ? '.on' : ''), {
        'data-act': 'like',
        onclick: () => {
          if (d.liked[p.id]) return ui.toast('今日已向 ' + p.name + ' 传达过心意');
          d.liked[p.id] = true; st.likes++; NL.save(); NL.refresh();
        },
      }, h('i', '♥'), h('span', String(st.likes))));

      // 右侧三枚珠光功能圆章
      const sideBtn = (act, label, ico, top, fn) => {
        root.appendChild(h('button.pi-side-btn', { 'data-act': act, style: { top }, onclick: fn },
          h('i', ico), h('span', label)));
      };
      sideBtn('plv', '等级权益', '♛', 228, () => NL.go('partnerLv', { id: p.id }));
      sideBtn('pvisual', '视觉鉴赏', '❖', 294, () => NL.go('partnerVisual', { id: p.id }));
      sideBtn('pdaily', '每日委托', '✉', 360, () => NL.go('partnerDaily', { id: p.id }));

      // 底部珠光毛玻璃羁绊面板
      root.appendChild(h('div.pi-bond-panel',
        h('div.pib-top',
          trustCard(p),
          h('button.btn.pink.pib-gift', { 'data-act': 'pgift', onclick: () => NL.go('partnerGift', { id: p.id }) }, '♥ 情感赠礼')),
        h('div.pib-trait', '“' + p.trait + '”'),
        h('div.pib-links',
          h('button.pib-link', { onclick: () => NL.go('parkmap') }, '📍 园区驻点导览'),
          h('button.pib-link.gold', { 'data-act': 'parchive', onclick: () => archive(p) }, '✦ 查阅机密档案'))));
    },
  };

  /* ---------- 3. 伙伴机密档案弹窗（彻底重构，告别原版白块补丁） ---------- */
  function archive(p) {
    const m = ui.mask({});
    const f = p.file || {};
    const card = h('div.otome-archive',
      h('button.win-close', { onclick: () => m.close() }),
      h('div.oa-head',
        h('img.oa-ava', { src: NL.img('otome/avatars/' + p.art + '.webp'), draggable: 'false' }),
        h('div.oa-title',
          h('span.oa-code', 'PARTNER DOSSIER · ' + p.place.replace('新生乐园', '')),
          h('b.oa-name', p.name),
          h('i.oa-role', p.title || p.race))),
      h('div.oa-grid',
        h('div.oa-cell', h('span', '年岁记录'), h('b', f.years || '???')),
        h('div.oa-cell', h('span', '诞辰纪日'), h('b', f.birth || '???')),
        h('div.oa-cell', h('span', '所属种族'), h('b', p.race)),
        h('div.oa-cell', h('span', '命轨星宫'), h('b', f.star || '???'))),
      h('div.oa-rows',
        h('div.oa-row', h('span', '✦ 偏爱之物'), h('b', f.like || '???')),
        h('div.oa-row', h('span', '✧ 排斥之事'), h('b', f.hate || '???')),
        h('div.oa-row.trait', h('span', '❖ 侧写评述'), h('b', p.trait))),
      h('div.oa-quote', (p.quotes && p.quotes[0]) || ''));
    m.el.appendChild(card);
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 646, textAlign: 'center', margin: 0 } }, '点击空白处关闭'));
  }

  /* ---------- 4. 情感赠礼 ---------- */
  let giftSel = null;
  NL.screens.partnerGift = {
    title: '', plate: 'cap',
    render(root, pr) {
      const p = byId(pr.id), d = day();
      const gifts = Object.keys(D.items).filter((id) => D.items[id].gift).sort((a, b) => (p.love.includes(b) ? 1 : 0) - (p.love.includes(a) ? 1 : 0));
      if (!gifts.includes(giftSel)) giftSel = gifts[0];
      const g = D.items[giftSel], loved = p.love.includes(giftSel), bonus = loved ? Math.round(g.base * 0.6) : 0;

      const stage = ui.charStage(p.art, { quotes: p.quotes, name: p.name });
      root.appendChild(stage);
      root.appendChild(h('div.pi-header.compact',
        h('div.pih-tags', h('span.pih-race', '情感赠礼'), h('span.pih-place', p.name)),
        h('div.pih-name', p.name)));

      root.appendChild(h('div.gift-panel',
        h('div.gp-card.trust-wrap', trustCard(p)),
        h('div.gp-card.info',
          h('div.gp-name', { style: { borderColor: D.rarity[g.rare][1] } }, g.name),
          h('div.gp-tags', h('i', '情感礼物'), loved ? h('i.love', '♥ 偏爱之物') : null),
          h('div.gp-fav', h('span', '共鸣好感'), loved ? h('em', '+' + bonus) : null, h('b', '+' + g.base)),
          h('div.gp-desc', g.desc),
          h('div.gp-list.scroll-x', gifts.map((id) => {
            const el = ui.itemEl(id, game.count(id));
            el.classList.add('gift'); if (id === giftSel) el.classList.add('sel');
            if (p.love.includes(id)) el.appendChild(h('u', '♥'));
            el.dataset.gift = id;
            el.onclick = () => { giftSel = id; NL.refresh(); };
            return el;
          })))));
      root.appendChild(h('div.gp-count', '今日心意  ' + d.gifts + '/' + GIFT_MAX));
      root.appendChild(h('button.btn.pink.gp-send', {
        'data-act': 'send',
        onclick: () => {
          if (d.gifts >= GIFT_MAX) return ui.toast('今日赠礼次数已达上限');
          if (!game.spend(giftSel, 1)) return ui.toast('您尚未持有该礼物');
          d.gifts++; addTrust(p, g.base + bonus); NL.refresh();
          ui.toast('已向 ' + p.name + ' 献上心意');
        },
      }, '♥ 赠送心意'));
    },
  };

  /* ---------- 5. 视觉鉴赏与主页陪伴设定 ---------- */
  let pureView = false;
  NL.screens.partnerVisual = {
    title: '', plate: 'cap',
    render(root, pr) {
      const p = byId(pr && pr.id);
      const isComp = (NL.state.homePartner || 'jiguang') === p.id;
      const stage = ui.charStage(p.art, { quotes: p.quotes, name: p.name, vignette: !pureView });
      root.appendChild(stage);

      root.appendChild(h('button.pv-pure-btn', {
        onclick: () => { pureView = !pureView; NL.refresh(); },
      }, pureView ? '✦ 恢复界面' : '✦ 纯净鉴赏'));

      if (!pureView) {
        root.appendChild(h('div.pi-header.compact',
          h('div.pih-tags', h('span.pih-race', '视觉档案'), h('span.pih-place', p.place)),
          h('div.pih-name', p.name),
          h('div.pih-title', '✦ ' + (p.title || ''))));

        root.appendChild(h('div.pv-dock',
          h('div.pvd-outfits',
            h('button.pvd-chip.on', '❖ 暮光初遇 · 默认衣装'),
            h('button.pvd-chip.lock', { onclick: () => ui.toast('星海高定礼装将在后续主题季开放') }, '🔒 星海高定 · 待解锁')),
          h('button.btn.' + (isComp ? 'purple' : 'pink') + '.pvd-pin', {
            onclick: () => {
              NL.state.homePartner = p.id;
              NL.save();
              NL.refresh();
              ui.toast('已邀约「' + p.name + '」担任乐园主页陪伴伙伴');
            },
          }, isComp ? '✦ 当前正在主页陪伴' : '♥ 设为主页陪伴伙伴')));
      }
    },
    leave() { pureView = false; },
  };

  /* ---------- 6. 等级权益 ---------- */
  NL.screens.partnerLv = {
    title: '等级权益',
    render(root, pr) {
      const p = byId(pr.id), st = ps(p);
      root.classList.add('pink');
      root.appendChild(subHeader(p, '共鸣礼遇'));
      root.appendChild(ui.pill('home/ico_coin.webp', NL.state.credit, 250, 88, { w: 96 }));
      root.appendChild(h('div.plv-list.scroll', { 'data-keep': 'plv' }, D.partnerLv.map((r, i) => {
        const lv = i + 1, ok = st.lv >= lv, got = st.claimed[lv];
        const kind = r.reward ? '共鸣赠礼' : r.perk ? '专属特权' : r.word ? '共鸣增益' : '羁绊解锁';
        const mid = r.reward ? h('div.plv-items', r.reward.map((x) => ui.itemEl(x.id, x.n, 'sm')))
          : h('div.plv-bar' + (r.word ? '.blue' : r.unlock ? '.cyan' : ''), r.perk || r.word || r.unlock);
        let right;
        if (got) right = h('div.plv-done', '✦ 已领取');
        else if (!ok) right = h('div.plv-no', '未达成');
        else right = h('button.tk-btn.pink.plv-get', {
          'data-plv': lv,
          onclick: () => {
            if (r.cost && !game.spend('gem', r.cost)) return ui.toast('储值不足');
            st.claimed[lv] = true; NL.save();
            if (r.reward) game.award(r.reward); else { ui.toast('已生效：' + (r.perk || r.word || r.unlock)); NL.refresh(); }
          },
        }, r.cost ? '兑换' : '领取');
        return h('div.plv-row' + (ok ? '.ok' : ''), hex(lv),
          h('div.plv-card',
            h('div.plv-kind', kind), mid,
            r.cost ? h('div.plv-cost', '消耗 ', h('img', { src: NL.img('home/ico_gem.webp') }), ' ' + r.cost) : null,
            right));
      })));
    },
  };

  /* ---------- 7. 每日委托 ---------- */
  NL.screens.partnerDaily = {
    title: '伙伴委托',
    render(root, pr) {
      const p = byId(pr.id), d = day(), s = NL.state;
      clearInterval(timer);
      root.classList.add('pink');
      root.appendChild(subHeader(p, '每日邀约'));
      const clock = h('b', NL.fmt.untilReset() + ' 后刷新');
      root.appendChild(h('div.dp-clock.pd-clock', h('i'), clock));
      timer = setInterval(() => (clock.textContent = NL.fmt.untilReset() + ' 后刷新'), 1000);
      root.appendChild(ui.pill('home/ico_coin.webp', s.credit, 250, 92, { w: 96 }));
      root.appendChild(h('div.pd-trust', trustCard(p)));
      const list = h('div.pd-list');
      root.appendChild(list);
      d.tasks.forEach((id, i) => {
        const t = D.commissions.find((c) => c.id === id), done = d.done[i];
        let mid, right;
        if (t.ev) {
          const cur = Math.min(t.need, (game.daily().c[t.ev] || 0) - (d.base[i] || 0));
          mid = h('div.pd-prog', h('span', '委托进度'), h('em', Math.max(0, cur) + '/' + t.need), h('div.bar', h('i', { style: { width: Math.max(0, cur / t.need) * 100 + '%' } })));
          right = done ? null : cur >= t.need ? h('button.tk-btn.pink', { 'data-pd': i, onclick: () => finish(i, t) }, '领取') : h('div.tk-status', '进行中');
        } else if (t.submit) {
          const have = game.count(t.submit[0]);
          mid = h('div.pd-sub', ui.itemEl(t.submit[0], 1, 'sm'), h('span' + (have < t.submit[1] ? '.no' : ''), h('em', String(have)), '/' + t.submit[1]));
          right = done ? null : h('button.pd-btn', {
            'data-pd': i,
            onclick: () => {
              if (!game.spend(t.submit[0], t.submit[1])) return ui.toast('提交资源不足');
              finish(i, t);
            },
          }, '提交');
        } else {
          const pool = s.gear.filter((g) => !game.slotOf(g.uid) && D.equips[g.id].rare === t.submitRare[0]).slice(0, t.submitRare[1]);
          mid = h('div.pd-sub', [0, 1, 2].map((k) => (pool[k] ? ui.itemEl(pool[k].id, '', 'sm') : h('div.pd-plus', '+'))));
          right = done ? null : h('button.pd-btn', {
            'data-pd': i,
            onclick: () => {
              if (pool.length < t.submitRare[1]) return ui.toast('提交资源不足');
              pool.forEach((g) => s.gear.splice(s.gear.indexOf(g), 1));
              finish(i, t);
            },
          }, '提交');
        }
        list.appendChild(h('div.pd-card' + (done ? '.done' : ''),
          h('div.pd-heart', '+' + t.heart),
          h('div.tk-title', h('i', '✦'), t.title),
          mid,
          done ? h('div.pd-ok', '✦ 已完成') : right));
      });
      const cost = 10 + d.refresh * 5;
      root.appendChild(h('div.pd-cost', '消耗 ', h('img', { src: NL.img('home/ico_coin.webp') }), ' ' + cost));
      root.appendChild(h('button.btn.purple.pd-refresh', {
        'data-act': 'pd-refresh',
        onclick: () => {
          if (!game.spend('credit', cost)) return ui.toast('阪神信用点不足');
          d.refresh++;
          const pool = D.commissions.map((c) => c.id).sort(() => Math.random() - 0.5);
          d.tasks = d.refresh === 1 ? ['credit', 'supply2', 'white'] : pool.slice(0, 3);
          d.done = {}; d.base = {};
          d.tasks.forEach((id, i) => { const t = D.commissions.find((c) => c.id === id); if (t.ev && t.ev !== 'credit_gain') d.base[i] = game.daily().c[t.ev] || 0; });
          NL.save(); NL.refresh(); ui.toast('委托清单已刷新');
        },
      }, h('i.spin', '↻'), '刷新委托'));
      function finish(i, t) { d.done[i] = true; addTrust(p, t.heart); NL.save(); NL.refresh(); }
    },
    leave() { clearInterval(timer); },
  };
})();
