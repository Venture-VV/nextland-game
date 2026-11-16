/* 战斗(规则与时间轴;3D 画面在 ../battle3d.js)、冒险地图、关卡列表、玩法列表、探索列车 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;
  const two = (n) => String(n).padStart(2, '0');
  let timer = 0;

  NL.defaults.push(() => ({ train: { gorge: 1, mine: 0 }, trainDay: { date: '', left: 30 } }));
  const today = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  game.rateText = function (enemyPower) {
    const r = game.power() / enemyPower;
    // 四档的叫法和分界取自策划文档:高出 10% 以上是碾压,往下依次是高、中(低 20% 以上)、低(低 30% 以上)
    return r >= 1.1 ? '碾压' : r > 0.8 ? '高' : r > 0.7 ? '中' : '低';
  };

  /* ---------- 战斗(扩展玩法:节拍对决) ----------
   * 默认的战斗是 js/battle_classic.js 里照原版复刻的自动对撞;在设置里打开「扩展玩法」才走这里。
   * 这一套是重新设计的 3D 节拍对决:
   * - 战斗音乐每拍 0.923 秒,双方轮流出手,每一击都落在重拍上;
   * - 对手出手时,光环合拢的瞬间点「格挡」,这一击只吃 80% 伤害;
   * - 出手和挨打都会攒能量,攒满后点「爆发」,下一击变成光束,伤害 140%;
   * - 什么都不点时,结果和以前一样:战力不低于对手就赢。
   *   只用爆发,战力达到对手的 86% 就能赢;爆发加每次都格挡,76% 就能赢(tools 里没有这段模拟,数字来自按本文件规则逐击推演)。
   */
  const A = NL.audio, BEAT = A.BEAT, KICK = A.KICK;
  const HP = 1000, FIRST = 3;                 // 第 3 拍打出第一击,之前是进场
  const BLOCK_WIN = 0.17, BLOCK_LATE = 0.12;  // 格挡判定:击中前 0.17 秒到击中后 0.12 秒
  const BURST_MUL = 1.4, BLOCK_MUL = 0.8;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (u) => 1 - Math.pow(1 - u, 3), easeIn = (u) => u * u * u, easeIO = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const hitAt = (n) => (FIRST + n) * BEAT + KICK;

  // 每一击打掉多少血(双方都是 1000 血)。战力相等时各需 6 击,我方先手,所以相等时我方赢。
  game.fightPlan = function (myPower, foePower) {
    const k = Math.pow(myPower / foePower, 0.8);
    return { me: clamp((HP / 6) * k, HP / 12, HP / 2), foe: clamp(HP / 6 / k, HP / 12, HP / 2) };
  };
  // 不操作时的结果(「跳过战斗」和 2D 兜底都用它)
  game.fightAuto = function (plan, hp, n) {
    hp = hp.slice();
    for (; hp[0] > 0.5 && hp[1] > 0.5; n++) { const a = n % 2; hp[1 - a] -= a ? plan.foe : plan.me; }
    return { hp, win: hp[1] <= 0.5 };
  };

  // 2D 画法:没有 WebGL 时的兜底,两个头像沿对角线对冲
  function battle2d(mount) {
    const av = ['me', 'enemy'].map((n) => h('div.bt2-av', { style: { backgroundImage: NL.bg('battle/' + n + '.jpg') } }));
    const flash = h('div.bt2-flash');
    av.forEach((a) => mount.appendChild(a)); mount.appendChild(flash);
    const HOME = [[82, 492], [276, 278]], pos = [[0, 0], [0, 0]];
    return {
      kind: '2d',
      render(S) {
        av.forEach((el, i) => {
          const P = S.P[i], o = HOME[1 - i], hm = HOME[i], en = 1 - S.enter[i];
          let x = hm[0] + (o[0] - hm[0]) * P.adv * 0.78 + (i ? 260 : -260) * en * en, y = hm[1] + (o[1] - hm[1]) * P.adv * 0.78;
          let sc = 1 + P.charge * 0.1, vis = true;
          if (S.ko && S.ko.who === i) { const u = S.ko.u; x += (180 - x) * u; y += (385 - y) * u; sc *= 1 - 0.5 * u; vis = u < 1; }
          pos[i] = [x, y];
          el.style.display = vis ? '' : 'none';
          el.style.transform = 'translate(' + (x - 57) + 'px,' + (y - 57) + 'px) scale(' + sc + ') rotate(' + en * en * 540 + 'deg)';
          el.style.filter = 'brightness(' + (1 + P.hurt * 1.5 + P.charge * 0.4) + ')';
        });
      },
      impact(ev) {
        const p = pos[1 - ev.a];
        flash.style.left = p[0] - 90 + 'px'; flash.style.top = p[1] - 90 + 'px';
        flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
      },
      shatter() {},
      project(who, dy) { return [pos[who][0], pos[who][1] - (dy || 0) * 70]; },
      destroy() {},
    };
  }

  let threeAsked = false;
  NL.afterRender = function (name) { // 进主页后在后台把 three.js 加载好
    if (name === 'home' && !threeAsked) { threeAsked = true; setTimeout(() => NL.loadThree(), 1200); }
  };

  // opts: {enemy:{name, lv, power}, rewards, onEnd(win)}
  ui.battleBeat = function (opts) {
    const s = NL.state, e = opts.enemy, myPower = game.power();
    const plan = game.fightPlan(myPower, e.power);
    const ally = NL.ext.ally(); // 扩展玩法「伙伴援护」:开着时,爆发由信任等级最高的伙伴来放,伤害随等级加成
    const F = { hp: [HP, HP], gauge: 0, armed: false, c: 0, n: 0, over: false, win: false, koAt: 0, loser: 1, tries: {} };
    const atk = {};
    let R = null, t0 = null, raf = 0, closed = false, resultShown = false, shattered = false, hiddenAt = 0;

    /* ----- 界面 ----- */
    const view = h('div.bt-view');
    const floats = h('div.bt-floats');
    const hpBar = [h('i'), h('i')], hpTxt = [h('u', '100%'), h('u', '100%')];
    const card = (i, name, lv, power) => h('div.bt-card.' + (i ? 'foe' : 'me'), h('b', name), h('i', '等级:' + lv), h('span', '战力'), h('em', NL.fmt.power(power)),
      h('div.bt-hp', hpBar[i]), hpTxt[i]);
    const banner = ui.battleBanner('start', 300);
    const gaugeRing = h('i.ring');
    const btnBurst = h('button.bt-btn.burst', { 'data-act': 'burst', onclick: (ev) => { ev.stopPropagation(); tryBurst(); } }, gaugeRing, h('b', ally ? '援护' : '爆发'), h('small', '0%'));
    const btnBlock = h('button.bt-btn.block', { 'data-act': 'block', onpointerdown: (ev) => { ev.stopPropagation(); tryBlock(); } }, h('b', '格挡'), h('small', '看准光环'));
    const tip = h('div.bt-tip', '对手出手时，光环合拢的瞬间点「格挡」；能量满了点「爆发」');
    const el = h('div.battle', view,
      h('div.bt-band', h('div.stripes'), h('div.marquee', h('span', '战斗 ⚔ 战斗 ⚔ 战斗 ⚔ 战斗 ⚔ 战斗 ⚔ 战斗 ⚔ 战斗 ⚔ 战斗 ⚔ ')), h('div.stripes')),
      card(1, e.name, e.lv, e.power), card(0, s.name, s.level, myPower),
      floats, banner, tip, btnBlock, btnBurst,
      h('button.bt-skip', { 'data-act': 'skip', onclick: (ev) => { ev.stopPropagation(); skip(); } }, h('i'), '跳过战斗'));
    view.addEventListener('pointerdown', () => tryBlock()); // 点场地任意位置也算格挡
    document.querySelector('#layers').appendChild(el);

    // NL.testClock:走查脚本用它把战斗时间定在某一刻,好截到确定的画面
    const now = () => (NL.testClock != null ? NL.testClock : (performance.now() - t0) / 1000);
    // dy 省略时是伤害数字:贴着头像外侧冒出来;给了 dy 就飘在头顶
    function float(who, text, cls, dy) {
      if (!R) return;
      const p = R.project(who, dy == null ? 0 : dy);
      if (dy == null) { p[0] += who ? 38 : 44; p[1] += who ? 22 : -34; }
      const f = h('div.bt-float' + (cls ? '.' + cls : ''), { style: { left: p[0], top: p[1] } }, text);
      floats.appendChild(f);
      setTimeout(() => f.remove(), 900);
    }
    function hud() {
      [0, 1].forEach((i) => { const p = clamp(F.hp[i] / HP, 0, 1); hpBar[i].style.width = p * 100 + '%'; hpTxt[i].textContent = Math.ceil(p * 100) + '%'; });
      const g = Math.min(100, Math.round(F.gauge));
      gaugeRing.style.background = 'conic-gradient(#ff3ee0 ' + g * 3.6 + 'deg, rgba(255,255,255,.14) 0)';
      btnBurst.classList.toggle('ready', g >= 100 && !F.armed);
      btnBurst.classList.toggle('armed', F.armed);
      btnBurst.lastChild.textContent = F.armed ? '已就绪' : g + '%';
    }
    const shownDmg = (who, dmg) => Math.max(1, Math.round((dmg / HP) * (who ? e.power : myPower) * 0.5));

    /* ----- 操作 ----- */
    function tryBurst() {
      if (F.over || t0 == null || F.gauge < 100 || F.armed) return;
      F.armed = true;
      hud();
    }
    function tryBlock() {
      if (F.over || t0 == null) return;
      const t = now(), last = F.n - 1;
      // 稍微慢了一点:对手这一击刚打中,补判为格挡,把多扣的血还回来
      if (last >= 0 && last % 2 === 1 && F.tries[last] == null && t - hitAt(last) <= BLOCK_LATE && !atk[last].blocked) {
        F.tries[last] = t; atk[last].blocked = true;
        F.hp[0] = Math.min(HP, F.hp[0] + plan.foe * (1 - BLOCK_MUL)); F.gauge = Math.min(100, F.gauge + 8);
        atk[last].guardAt = t; float(0, '格挡!', 'block', 1.25); A.sfx('block'); hud();
        return;
      }
      const n = F.n % 2 === 1 ? F.n : F.n + 1, tn = hitAt(n);
      if (F.tries[n] != null || t < tn - 0.62) return; // 每一击只能试一次;对手还没动就不算
      F.tries[n] = t;
      if (t < tn - BLOCK_WIN) float(0, '太早', 'miss', 1.25);
    }

    /* ----- 规则 ----- */
    function resolve(n) {
      const k = atk[n], a = k.a, d = 1 - a;
      let dmg = a === 0 ? plan.me * (k.burst ? BURST_MUL * (ally ? ally.mul : 1) : 1) : plan.foe;
      if (a === 1 && F.tries[n] != null && hitAt(n) - F.tries[n] <= BLOCK_WIN) { k.blocked = true; dmg *= BLOCK_MUL; k.guardAt = hitAt(n); }
      F.hp[d] = Math.max(0, F.hp[d] - dmg);
      k.dmg = dmg;
      if (a === 0) { if (!k.burst) F.gauge = Math.min(100, F.gauge + 34); } else F.gauge = Math.min(100, F.gauge + (k.blocked ? 24 : 16));
      const dead = F.hp[d] <= 0.5;
      R.impact({ a, burst: k.burst, blocked: k.blocked, dead });
      float(d, '-' + shownDmg(d, dmg), k.burst ? 'crit' : a ? 'foe' : 'me');
      if (k.burst) { float(0, ally ? '援护!' : '爆发!', 'burst', 1.25); if (ally) NL.ext.cutIn(el, ally); }
      if (k.blocked) float(0, '格挡!', 'block', 1.25);
      A.sfx(k.blocked ? 'block' : k.burst ? 'burst' : 'hit');
      if (dead) { F.over = true; F.win = d === 1; F.loser = d; F.koAt = hitAt(n); A.sfx('ko'); el.classList.add('ko'); }
      hud();
    }
    function step(t) {
      // 出手前 0.5 秒定下这一击是不是爆发
      while (!F.over && t >= hitAt(F.c) - 0.5) {
        const n = F.c++;
        atk[n] = { a: n % 2, burst: n % 2 === 0 && F.armed };
        if (atk[n].burst) { F.armed = false; F.gauge = 0; A.sfx('charge'); hud(); }
      }
      while (!F.over && t >= hitAt(F.n)) resolve(F.n++);
      if (F.over && !shattered && t >= F.koAt + 1.15) { shattered = true; R.shatter(F.loser); }
      if (F.over && t >= F.koAt + 1.9) showResult();
    }
    // 把时间轴换算成两边的姿态,交给画面去画
    function pose(t) {
      const P = [0, 1].map(() => ({ adv: 0, charge: 0, hurt: 0, guard: 0, cue: -1, beam: 0, rise: 0 }));
      let focus = null, punch = 0; // punch:爆发时镜头略微推近
      [F.n - 1, F.n].forEach((m) => {
        const k = atk[m];
        if (!k) return;
        const x = t - hitAt(m), a = P[k.a], d = P[1 - k.a];
        if (k.burst) {
          if (x < 0) { const u = easeOut(clamp((x + 0.5) / 0.5, 0, 1)); a.charge = u; a.adv -= 0.04 * u; a.rise = u; punch = u; }
          else if (x < 0.42) { a.beam = 1 - x / 0.42; a.charge = a.beam; a.adv -= 0.1 * Math.exp(-x / 0.1) + 0.04 * a.beam; a.rise = a.beam; punch = a.beam; }
        } else if (x < -0.2) { const u = clamp((x + 0.5) / 0.3, 0, 1); a.adv -= 0.14 * easeOut(u); a.charge = Math.max(a.charge, u); }
        else if (x < 0) { a.adv += -0.14 + 1.14 * easeIn((x + 0.2) / 0.2); a.charge = 1; }
        else if (x < 0.06) { a.adv += 1; a.charge = 1; }
        else if (x < 0.46) { const u = (x - 0.06) / 0.4; a.adv += 1 - easeIO(u); a.charge = Math.max(a.charge, 1 - u); }
        // 挨打的一方:先迎上去,被击中后弹回去
        if (x >= -0.22 && x < 0 && !k.burst) d.adv += 0.15 * easeOut((x + 0.22) / 0.22);
        if (x >= 0 && x < 0.6) { const hurt = Math.exp(-x / 0.11) * (k.blocked ? 0.4 : 1); d.hurt = Math.max(d.hurt, hurt); d.adv -= 0.4 * hurt; }
        if (k.blocked && k.guardAt != null) d.guard = Math.max(d.guard, clamp(1 - (t - k.guardAt) / 0.45, 0, 1));
        if (k.a === 1 && x < 0 && x >= -0.62 && !F.over) P[0].cue = (x + 0.62) / 0.62;
      });
      const S = { t, P, focus, punch, pulse: Math.exp(-((((t - KICK) % BEAT) + BEAT) % BEAT) / 0.13), enter: [easeOut(clamp((t - 0.45) / 1.25, 0, 1)), easeOut(clamp((t - 0.8) / 1.25, 0, 1))], ko: null, victory: null };
      if (F.over) {
        const u = clamp((t - F.koAt - 0.12) / 1.03, 0, 1);
        S.ko = { who: F.loser, u };
        S.victory = { who: 1 - F.loser, u: clamp((t - F.koAt - 0.3) / 0.9, 0, 1) };
        S.focus = { who: F.loser, k: Math.min(1, u * 1.6) * 0.8 };
      }
      return S;
    }
    function frame() {
      if (closed) return;
      raf = requestAnimationFrame(frame);
      const t = now();
      if (t > 1.15) banner.classList.add('out');
      if (t > hitAt(1)) tip.classList.add('out');
      step(t);
      R.render(pose(t));
    }

    /* ----- 结束 ----- */
    function showResult() {
      if (resultShown) return;
      resultShown = true;
      const rewards = F.win ? opts.rewards || [] : [];
      const delta = rewards.length ? game.grant(rewards) : 0;
      el.classList.add('over');
      el.appendChild(F.win ? ui.battleBanner('win', 235) : h('div.bt-lose.bt-result', '挑战失败'));
      el.appendChild(h('div.bt-items', rewards.map((r) => ui.itemEl(r.id, r.n))));
      el.appendChild(h('div.bt-hint', '点击空白处关闭。'));
      A.sfx(F.win ? 'win' : 'lose'); A.battleDuck(0.45);
      const shownAt = performance.now(); // 结算刚弹出的 0.3 秒内不响应,免得连点时误关
      el.addEventListener('click', () => { if (performance.now() - shownAt > 300) close(delta); });
    }
    function skip() {
      if (resultShown) return;
      if (!F.over) {
        const r = game.fightAuto(plan, F.hp, F.n);
        F.hp = r.hp.map((v) => Math.max(0, v)); F.over = true; F.win = r.win; F.loser = r.win ? 1 : 0;
        F.koAt = t0 == null ? -9 : now() - 9; // 直接跳到击破动画之后
        hud();
      }
      shattered = true;
      el.classList.add('ko');
      showResult();
    }
    function close(delta) {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      offChange();
      if (R) R.destroy();
      A.battleEnd();
      el.remove();
      NL.refresh();
      if (delta) ui.powerUp(delta);
      if (opts.onEnd) opts.onEnd(F.win);
    }
    // 切到后台时把战斗时钟停住,回来接着打
    function onVis() {
      if (t0 == null) return;
      if (document.hidden) hiddenAt = performance.now();
      else if (hiddenAt) { t0 += performance.now() - hiddenAt; hiddenAt = 0; }
    }
    document.addEventListener('visibilitychange', onVis);
    const offChange = A.onChange((on) => { if (on && t0 != null && !resultShown) A.battleStart(now()); }); // 战斗中途打开声音:从当前拍子接上

    /* ----- 开打:先等画面就绪,再让音乐和时钟一起开始 ----- */
    hud();
    const wait = Promise.race([NL.loadThree(), new Promise((ok) => setTimeout(() => ok(false), 2500))]);
    wait.then((ok) => {
      if (closed) return;
      R = (ok && NL.battle3d(view)) || battle2d(view);
      el.dataset.renderer = R.kind;
      return A.battleStart().then((m) => {
        if (closed) return;
        t0 = m != null ? m : performance.now() + 50;
        frame();
      });
    });
  };

  /* ---------- 冒险地图 ---------- */
  let quickOpen = false, advMap = null;
  NL.screens.adventure = {
    title: '冒险',
    // 表:和里一样是那张可以拖的地图(表的配色);「快速抵达」展开的是三张场景卡
    renderBiao(root) {
      root.classList.add('ba');
      advMap = ui.parkMap((id) => NL.go('stages', { zone: id }));
      root.appendChild(advMap.el);
      root.appendChild(h('div.bh-shade'));
      ui.head(root, null, 0, 0, 360, 132, 'ADVENTURE', '冒险');
      root.appendChild(ui.energyPill(253, 100));
      root.appendChild(h('button.ba-quick' + (quickOpen ? '.open' : ''), { 'data-act': 'quick', onclick: () => { quickOpen = !quickOpen; NL.refresh(); } }, '快速抵达', h('i')));
      if (quickOpen) root.appendChild(h('div.ba-zones.scroll', { 'data-keep': 'adv' }, Object.keys(D.zones).map((id) => {
        const z = D.zones[id], cleared = NL.state.stages[id] || 0;
        return h('button.ba-zone', { 'data-zone': id, style: { backgroundImage: NL.bg('stage/zone_' + id + '.webp') }, onclick: () => { quickOpen = false; NL.go('stages', { zone: id }); } },
          h('i', 'PART ' + z.part), h('b', z.name), h('span', z.desc), h('em', cleared + ' / ' + D.stageCount), h('u', h('s', { style: { width: (cleared / D.stageCount) * 100 + '%' } })));
      })));
      root.appendChild(h('button.btn.dark.bh-exp', { onclick: () => (ui.interact ? ui.interact() : ui.toast('敬请期待。')) }, '探索'));
    },
    render(root) {
      advMap = ui.parkMap((id) => NL.go('stages', { zone: id }));
      root.appendChild(advMap.el);
      root.appendChild(ui.energyPill(253, 100));
      root.appendChild(h('button.adv-quick' + (quickOpen ? '.open' : ''), { 'data-act': 'quick', onclick: () => { quickOpen = !quickOpen; NL.refresh(); } }, '快速抵达', h('i')));
      if (quickOpen) root.appendChild(h('div.adv-list', Object.keys(D.zones).map((id) =>
        h('button', { 'data-zone': id, onclick: () => { quickOpen = false; NL.go('stages', { zone: id }); } }, h('b', String(D.zones[id].part)), D.zones[id].name, h('i')))));
      root.appendChild(NL.sprite('home/btn_explore.webp', 249, 635, 98, 52));
      root.appendChild(NL.hit(249, 635, 98, 52, () => (ui.interact ? ui.interact() : ui.toast('敬请期待。'))));
    },
    leave() { if (advMap) advMap.destroy(); advMap = null; },
  };

  /* ---------- 关卡列表 ---------- */
  const FAIL_REFUND = 5; // 挑战失败返还的精力(每关消耗 6)
  function stageWin(zid, n) {
    const z = D.zones[zid], power = z.per * n;
    const fight = (m) => {
      if (!game.useEnergy(D.stageCost)) return;
      m.close();
      const drop = NL.rand() < 0.5 ? D.stageDrop : [];
      ui.battle({ enemy: { name: z.enemy, lv: n, power }, rewards: D.stageRewards.concat(drop), onEnd(win) {
        if (win && NL.state.stages[zid] < n) { NL.state.stages[zid] = n; NL.save(); NL.refresh(); }
        if (!win) { game.refundEnergy(FAIL_REFUND); ui.toast('挑战失败，返还 ' + FAIL_REFUND + ' 点精力。'); } // 策划文档:输了只扣 1 点
      } });
    };
    if (NL.skin() === 'biao') { // 表:里那张整块的底图上烙着的字,这里都是真的部件
      ui.win({ title: z.name + ' ' + two(n), h: 404, body(b, m) {
        b.classList.add('bst-win');
        b.appendChild(h('div.bst-foe', h('i', { style: { backgroundImage: NL.bg('battle/enemy.jpg') } }), h('b', z.enemy), h('span', 'Lv.' + n)));
        b.appendChild(h('div.bst-stats', h('div', '战力', h('b', String(power))), h('div', '通关率', h('b', game.rateText(power)))));
        b.appendChild(ui.sec('关卡说明', 132));
        b.appendChild(h('div.bst-desc', z.desc));
        b.appendChild(ui.sec('通关奖励', 208));
        b.appendChild(h('div.bst-rewards', D.stageRewards.map((r) => ui.itemEl(r.id, r.n)), h('span', '有几率额外掉落')));
        b.appendChild(h('button.btn.purple.bst-go', { 'data-act': 'fight', onclick: () => fight(m) }, '挑战', h('em', '体力 ' + D.stageCost)));
      } });
      return;
    }
    const m = ui.mask({});
    const box = h('div.abs.st-win', { style: { left: 15, top: 163, width: 330, height: 481 } },
      NL.sprite('stage/detail.jpg', 0, 0, 330, 481),
      h('div.st-w-title', z.name + two(n)), h('div.st-w-name', z.enemy), h('div.st-w-power', String(power)),
      h('div.st-w-rate', game.rateText(power)), h('div.st-w-desc', z.desc),
      NL.hit(128, 420, 190, 48, () => fight(m), { 'data-act': 'fight' }));
    m.el.appendChild(box);
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 686, textAlign: 'center', margin: 0 } }, '点击空白处关闭。'));
  }
  NL.screens.stages = {
    title: (p) => D.zones[p.zone].name, plate: 'cap',
    render(root, p) {
      const z = D.zones[p.zone], cleared = NL.state.stages[p.zone] || 0;
      root.classList.add('night');
      const list = h('div.st-list.scroll', { 'data-keep': 'st-' + p.zone });
      for (let n = D.stageCount; n >= 1; n--) {
        const open = n <= cleared + 1, cur = n === cleared + 1, boss = n === D.stageCount;
        const side = (D.stageCount - n) % 2 ? 'r' : 'l';
        list.appendChild(h('div.st-node.' + side,
          h('button.st-tile' + (boss ? '.boss' : '') + (cur ? '.cur' : open ? '' : '.lock'), { 'data-stage': n, onclick: () => (open ? stageWin(p.zone, n) : ui.toast('通关上一关后解锁。')) },
            boss ? null : h('b', String(n)), cur ? h('u', 'ONGOING') : null, h('span', z.name + two(n))),
          h('i')));
      }
      root.appendChild(list);
      if (NL.skin() === 'biao') { // 里的进度条烙在横幅图上;表的是真的部件
        ui.head(root, 'stage/zone_' + p.zone + '.webp', 0, 0, 360, 190, 'PART ' + z.part, z.name);
        root.appendChild(h('div.bst-prog', '关卡进度', h('b', cleared + ' / ' + D.stageCount), h('u', h('s', { style: { width: (cleared / D.stageCount) * 100 + '%' } }))));
      } else {
        root.appendChild(NL.sprite('stage/head_' + z.head + '.jpg', 0, 0, 360, 190));
        root.appendChild(h('div.st-prog', String(cleared)));
      }
      root.appendChild(ui.energyPill(253, 69));
    },
  };

  /* ---------- 玩法 ---------- */
  // 这几行字在里是烙在卡片图上的(抄自录屏),表用字写出来
  const MODE_TEXT = { string: ['超弦武装', '50层试炼 · 能量三选一'], ring: ['灰环行动', '横屏搜打撤 · 搜索物资 · 成功撤离'], catch: ['捕捉奇迹', '抓取奖励 · 合成升级'],
    mine: ['地核矿山探索列车', '挑战该列车可获得大量阪神信用点。'], gorge: ['追光峡谷探索列车', '挑战该列车可获得各类装备。'] };
  NL.screens.modes = {
    title: '玩法',
    render(root) {
      root.classList.add('dusk');
      root.appendChild(ui.pill('home/ico_coin.webp', NL.state.credit, 253, 95, { w: 91 }));
      const open = (train) => (train ? NL.go('train', { id: train }) : ui.toast('页面打开失败。'));
      if (NL.skin() === 'biao') { // 里的名字烙在图上;表的图是干净的场景,名字和说明用字写
        ui.head(root, null, 0, 0, 360, 126, 'MODES', '玩法');
        const left = NL.state.trainDay && NL.state.trainDay.date === today() ? NL.state.trainDay.left : 30;
        root.appendChild(h('div.md-list.scroll', { 'data-keep': 'modes' }, D.modes.map(([img, train]) =>
          h('button.bm-card', { 'data-mode': img, style: { backgroundImage: NL.bg('modes/' + img + '.webp') }, onclick: () => open(train) },
            h('b', MODE_TEXT[img][0]), h('span', MODE_TEXT[img][1]), train ? h('em', '今日剩余 ' + left + '/30') : h('em.off', '敬请期待')))));
      } else root.appendChild(h('div.md-list.scroll', { 'data-keep': 'modes' }, D.modes.map(([img, train]) =>
        h('img', { src: NL.img('modes/' + img + '.jpg'), 'data-mode': img, draggable: 'false', onclick: () => open(train) }))));
    },
  };

  /* ---------- 探索列车 ---------- */
  let trainSeen = false;
  NL.screens.train = {
    title: '', plate: 'cap',
    render(root, p) {
      const t = D.trains[p.id], s = NL.state;
      if (s.trainDay.date !== today()) s.trainDay = { date: today(), left: 30 };
      const cleared = s.train[p.id] || 0;
      clearInterval(timer);
      root.classList.add('lilac');
      if (NL.skin() === 'biao') ui.head(root, 'modes/' + p.id + '.webp', 0, 0, 360, 132, 'EXPRESS', t.name);
      else root.appendChild(h('div.tr-title', t.name));
      root.appendChild(h('div.tr-seg', '普通'));
      const clock = h('b', NL.fmt.untilReset() + '后刷新');
      root.appendChild(h('div.tr-info', '今日剩余挑战次数  ' + s.trainDay.left, clock));
      timer = setInterval(() => (clock.textContent = NL.fmt.untilReset() + '后刷新'), 1000);
      const list = h('div.tr-list.scroll', { 'data-keep': 'train-' + p.id });
      for (let n = t.powers.length; n >= 1; n--) {
        const power = t.powers[n - 1], open = n <= cleared + 1;
        list.appendChild(h('div.tr-row', h('div.tr-film' + (n === 1 ? '.head' : '')), h('div.tr-name', t.car + n + '节'),
          h('div.tr-rate', '通关率', h('em', game.rateText(power))), h('div.tr-power', '战力', h('i'), h('em', NL.fmt.power(power))),
          h('div.tr-rewards', t.rewards[n - 1].map((r) => ui.itemEl(r.id, r.n, 'sm'))),
          open ? h('button.btn.purple.small.tr-go', { 'data-train': n, onclick: () => {
            if (s.trainDay.left <= 0) return ui.toast('今日挑战次数已用完。');
            s.trainDay.left--; NL.save();
            game.track(t.ev);
            ui.battle({ enemy: { name: t.enemy, lv: n * 5, power }, rewards: t.rewards[n - 1], onEnd(win) {
              if (win && cleared < n) { s.train[p.id] = n; NL.save(); NL.refresh(); }
            } });
          } }, '挑战') : h('div.tr-lock', h('i'), '挑战前一层解锁')));
      }
      root.appendChild(list);
      // 原版一进来停在列表最下面(第 1 节车厢在底部)
      if (!trainSeen) { trainSeen = true; requestAnimationFrame(() => (list.scrollTop = list.scrollHeight)); }
    },
    leave() { clearInterval(timer); trainSeen = false; },
  };
})();
