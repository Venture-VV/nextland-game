/* 「表(biao)」皮肤专属 2D 暗欲赛博霓虹交互舞台与高定界面层 (Crimson Neon Nocturne)
 *
 * 严格契约:
 * 1. 仅在 NL.skin() === 'biao' 时激活(通过 scr.renderBiao 与条件分支),「里(li)」零受影响。
 * 2. 绝不改动 NL.state 结构,绝不调用 NL.rand()(视觉粒子与台词轮换只用本地状态/Math.random),确保双皮肤存档 100% 逐项一致。
 * 3. 完整保留 tools/walkthrough.cjs 全部 data-act / data-partner / data-slot / data-tab / data-res 选择器与空白遮罩关闭区(y >= 745)。
 */
(function () {
  'use strict';
  const h = NL.h, D = NL.data, game = NL.game, ui = NL.ui;

  /* ---------- 表皮肤本地偏好(独立存储,不污染 NL.state) ---------- */
  const PREF_KEY = 'nextland-biao-pref-v1';
  let pref = { partner: 'maguangyao', zoom: false, pure: false, light: 0 };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { /* ignore */ }
  function savePref() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)); } catch (e) { /* ignore */ }
  }

  /* ---------- 角色视觉元数据与三区特触台词 ----------
   * 遵照合规边界:全员 21-30 岁成年角色;顾轩(22岁研究员)保持清爽克制的学术同伴互动,不做擦边化。
   */
  const PARTNER_META = {
    jiguang: {
      en: 'JIGUANG · SOVEREIGN', faction: '圣物会主教', age: '30', birth: '新纪元 1月1日', star: '摩羯座',
      like: '圣物教义、古典黑胶', hate: '失序与背叛', accent: '#e8cf9a', glow: 'rgba(232,207,154,.38)', bpm: 74,
      trait: '威严冷峻的圣物会掌权者，金丝礼装下藏着不容抗拒的掌控欲。',
      zones: {
        head: ['【轻触金冠】', [
          '“放肆……在圣物核心，还没有人敢碰我的冠冕。不过，若是你的话，我不追究。”',
          '“靠得太近了。你是想听我的祝祷，还是想试探我的底线？”',
        ]],
        collar: ['【轻抚领口】', [
          '“呼吸乱了？别紧张，这枚十字坠只有靠在我胸口时才会发烫。”',
          '“皮革手套有些凉……但你指尖的温度，倒是比预想中更灼人。”',
        ]],
        waist: ['【触碰披风腰侧】', [
          '“再往下半寸，今夜的宵禁令恐怕就要为你一个人改写了。”',
          '“想看清礼袍下的暗纹？等四下无人的时候，我会亲自教你。”',
        ]],
      },
      giftLine: '“这份心意我收下了。作为回礼……今夜的顶层观景台只属于你。”',
    },
    ling: {
      en: 'LING · NIGHT RUNNER', faction: '暗巷自由人', age: '24', birth: '新纪元 8月19日', star: '狮子座',
      like: '机车改装、午夜霓虹', hate: '虚伪的条文', accent: '#7de8ff', glow: 'rgba(125,232,255,.36)', bpm: 84,
      trait: '游走灰色地带的街头情报商，嘴上漫不经心，目光却始终锁在你身上。',
      zones: {
        head: ['【揉乱发梢】', [
          '“喂喂，刚抓好的发型——算了，看在你眼神这么犯规的份上，随你揉。”',
          '“怎么，把我当成你养的夜行猎犬了？行啊，那可得管饭。”',
        ]],
        collar: ['【轻碰锁骨创可贴】', [
          '“嘶……别按那儿，昨晚飙车擦破的。你再吹一口气，我心跳可就压不住了。”',
          '“拉链想拉高还是拉低？先说好，招惹我的代价可不便宜。”',
        ]],
        waist: ['【勾住战术腰带】', [
          '“抓这么紧，怕我跑了？放心，全乐园的暗巷我都熟，带你私奔绰绰有余。”',
          '“指尖别乱滑啊大小姐，我可不是什么坐怀不乱的圣人。”',
        ]],
      },
      giftLine: '“哟，刚好是我想要的尖货！走，带你去阪神塔顶吹夜风。”',
    },
    maguangyao: {
      en: 'MA GUANGYAO · CHIEF LAB', faction: '潜伏首席科学家', age: '28', birth: '新纪元 11月11日', star: '天蝎座',
      like: '棱镜实验、苦艾特调', hate: '无意义的盲从', accent: '#c06cff', glow: 'rgba(192,108,255,.40)', bpm: 78,
      trait: '金丝眼镜后藏着危险锋芒的科学家，咬开黑皮手套的瞬间最具侵略感。',
      zones: {
        head: ['【轻碰金丝镜链】', [
          '“镜链缠到你手指了？别动……让我凑近一点，慢慢帮你解开。”',
          '“用这种眼神盯着你的实验搭档，是很危险的诱导行为。”',
        ]],
        collar: ['【拽动微松领带】', [
          '“领带本来就被你扯松了……再往下拉的话，实验室的监控得先关掉。”',
          '“测出我的脉搏加快了？恭喜你，你就是唯一的实验变量。”',
        ]],
        waist: ['【轻触白大褂腰际】', [
          '“白大褂口袋里只有棱镜核心……还是说，你想搜身检查点别的？”',
          '“嘘，别退后。既然主动靠近了，就把这组亲密采样做完。”',
        ]],
      },
      giftLine: '“很精准的样本。今晚留下来，我为你单独演示棱镜共振。”',
    },
    linxiao: {
      en: 'LIN XIAO · TACTICAL', faction: '独立改造者同盟', age: '27', birth: '新纪元 10月4日', star: '天秤座',
      like: '手工香水、雨夜爵士', hate: '失控的义体', accent: '#ff3d7f', glow: 'rgba(255,61,127,.38)', bpm: 76,
      trait: '冷静克制的战术指挥官，理性防线一旦只对你松动便格外撩人。',
      zones: {
        head: ['【轻抚黑长直发丝】', [
          '“眼镜起雾了……离这么近说话，也是你战术计划的一部分吗？”',
          '“只有在你面前，我才会卸下防备。再多停留一会儿吧。”',
        ]],
        collar: ['【轻触蕾丝领缘】', [
          '“指尖有点凉……别担心，我的义体恒温模块刚好可以替你暖手。”',
          '“心跳读数超标了。看来面对你，再精密的冷静协议都会失效。”',
        ]],
        waist: ['【轻扶高开叉腰线】', [
          '“喂……那里是战术腿环的卡扣，乱碰的话会松开的。”',
          '“想邀请我跳一支舞？那就抓稳我的腰，别松手。”',
        ]],
      },
      giftLine: '“气味很温柔……谢谢你，今晚的梦境大概都会是这个味道。”',
    },
    guxuan: {
      en: 'GU XUAN · RESEARCHER', faction: '零号基地研究员', age: '22', birth: '新纪元 5月26日', star: '双子座',
      like: '旧时代报纸、热可可', hate: '数据丢失', accent: '#7de8ff', glow: 'rgba(125,232,255,.32)', bpm: 80,
      clean: true,
      trait: '热忱清澈的青年研究员，总是捧着全息终端为你整理第一手园区情报。',
      zones: {
        head: ['【整理翘起的发梢】', [
          '“啊，头发又睡翘了吗？通宵校对园区能量图谱，差点忘了时间，谢谢你！”',
          '“嘿嘿，被前辈鼓励了，今天的研究效率肯定能翻倍！”',
        ]],
        collar: ['【轻敲研究员领章】', [
          '“这枚波洛领结是入职纪念！只要有它在，再难的数据谜题都能解开。”',
          '“全息终端信号满格——我刚标出了几处隐藏补给点，快看看！”',
        ]],
        waist: ['【递接全息数据板】', [
          '“小心拿稳！里面存着圣物核心的周波记录，我们一起破译它吧。”',
          '“不管前路有多少未知区域，只要你需要后援，我随时在线！”',
        ]],
      },
      giftLine: '“太珍贵了！我会把这份旧时代资料好好归档保存的，谢谢你！”',
    },
    yinsha: {
      en: 'YINSHA · SIREN DIVA', faction: '银伶巡唱团歌姬', age: '25', birth: '新纪元 2月20日', star: '双鱼座',
      like: '绯夜舞台、丝绒唇釉', hate: '被编写的台本', accent: '#ff5ca8', glow: 'rgba(255,92,168,.42)', bpm: 82,
      trait: '在霓虹爵士舞台觉醒自我的仿生歌姬，眼波流转间尽是暗夜微醺。',
      zones: {
        head: ['【轻触星芒发箍】', [
          '“嘘……聚光灯还没熄灭呢，这么明目张胆地宠溺我，台下会嫉妒的。”',
          '“仿生人原本不会做梦，直到你的名字写进了我的核心音轨。”',
        ]],
        collar: ['【轻触丝绒颈饰】', [
          '“想听只唱给你一个人的副歌？把耳朵贴过来，我用气音唱给你听。”',
          '“仿真皮肤下的温度是 37.2℃……是你让它变得像真正的心跳一样滚烫。”',
        ]],
        waist: ['【轻揽鱼尾礼裙腰侧】', [
          '“麦克风架都快拿不稳了……你再这样扶着我的腰，今晚可就要安可到天亮了。”',
          '“别看别人，看着我。今夜这支绯色慢舞，我只允许你领舞。”',
        ]],
      },
      giftLine: '“真迷人……下次登台，我会把你送的香气藏在锁骨间。”',
    },
  };

  function makeBokeh(count) {
    const wrap = h('div.biao-bokeh');
    for (let i = 0; i < (count || 10); i++) {
      const sz = 4 + Math.round(Math.random() * 10);
      const left = Math.round(Math.random() * 340);
      const top = 60 + Math.round(Math.random() * 620);
      const dur = (4.2 + Math.random() * 4.5).toFixed(2) + 's';
      const del = (-Math.random() * 5).toFixed(2) + 's';
      const col = i % 3 === 0 ? '#ff3d7f' : i % 3 === 1 ? '#7de8ff' : '#e8cf9a';
      wrap.appendChild(h('i', { style: `left:${left}px;top:${top}px;width:${sz}px;height:${sz}px;--c:${col};animation-duration:${dur};animation-delay:${del}` }));
    }
    return wrap;
  }

  /* ---------- 1. 登录页与适龄公告 ---------- */
  const origNotice = ui.notice;
  let biaoNoticeShown = false;

  ui.notice = function () {
    if (NL.skin() !== 'biao') return origNotice();
    const m = ui.mask({ dismiss: false });
    m.el.style.background = 'rgba(7, 8, 18, .82)';
    const card = h('div.biao-notice',
      h('div.bn-head',
        h('span.bn-age', '16+ 适龄提示'),
        h('b', '绯夜入园协议 · 公告'),
        h('button.bn-x', { onclick: () => m.close() }, '×')),
      h('div.bn-body',
        h('p.bn-lead', '欢迎接入《新生乐园世界 · 绯夜霓虹》双生都市终端。'),
        h('div.bn-sec', '✦ 适龄与健康游戏提示'),
        h('p', '本体验面向 16 周岁及以上成年玩家设计。请合理安排游园时间，享受健康、优雅的都市幻想旅程。'),
        h('div.bn-sec', '✦ 表 / 里双生映像说明'),
        h('p', '当前处于「表(Biao)」2D 暗欲赛博霓虹立绘模式：支持全角色三区轻触交互、实时心率共振与高清界面；随时可在主页与设置中一键翻回「里」原版映像，存档完全互通。')),
      h('button.biao-cta', { 'data-act': 'notice-ok', onclick: () => m.close() }, '✦ 签署协议并继续'));
    m.el.appendChild(card);
    return m;
  };

  function biaoEnter() {
    const root = document.querySelector('#screen');
    root.textContent = '';
    const stage = h('div.biao-login.loading',
      NL.sprite('bg/login_kv.webp', 0, 0, 360, 781, { cls: 'biao-bg-img' }),
      h('div.biao-vignette'),
      makeBokeh(10),
      h('div.biao-load-center',
        h('span.bl-sub', 'SYNCHRONIZING NEURAL LINK'),
        h('b.bl-title', '正在接入绯夜乐园…')));
    const fill = h('i');
    const num = h('b', '0%');
    stage.appendChild(h('div.load-bar.biao-load-bar', fill, num));
    root.appendChild(stage);
    let p = 0;
    const t = setInterval(() => {
      p = Math.min(100, p + 4 + Math.random() * 9);
      fill.style.width = p + '%';
      num.textContent = Math.floor(p) + '%';
      if (p >= 100) { clearInterval(t); setTimeout(() => NL.motion.pixels({ mode: 'dither', onMid: () => NL.go('home') }), 120); }
    }, 60);
  }

  NL.screens.login.renderBiao = function (root) {
    const stage = h('div.biao-login',
      NL.sprite('bg/login_kv.webp', 0, 0, 360, 781, { cls: 'biao-bg-img' }),
      h('div.biao-vignette'),
      makeBokeh(14),
      h('div.biao-age-pill', h('b', '16+'), h('span', 'CADPA 适龄提示')),
      h('button.biao-reset-btn', { title: '清空存档', onclick: () => ui.confirm('确定要退出登录并清空本机存档吗？', () => { NL.reset(); ui.toast('存档已清空。'); }) }, '⟲ 存档'),
      h('div.biao-brand',
        h('span.bb-en', 'NEXTLAND · CRIMSON NOCTURNE'),
        h('h1.bb-cn', '新生乐园世界'),
        h('p.bb-tag', '绯夜霓虹 · 双生都市契约')),
      h('button.biao-enter-btn', { 'data-act': 'enter', onclick: biaoEnter },
        h('span.be-glow'),
        h('b', '✦ 进入绯夜乐园 ✦'),
        h('small', 'TAP TO INITIALIZE')));
    root.appendChild(stage);
    if (!biaoNoticeShown) { biaoNoticeShown = true; ui.notice(); }
  };

  /* ---------- 2. 主页:复用原版地图/HUD 逻辑并叠加赛博霓虹地标牌、黑金名片与心动速达 ---------- */
  const origHomeRender = NL.screens.home.render;
  const ZONE_SUB = { museum: 'NEON BOWL', core: 'ASTRAL CORE', hanshin: 'CYBER TRACK' };
  NL.screens.home.renderBiao = function (root) {
    origHomeRender.call(this, root);
    const s = NL.state;

    // 1) 在三座可点击园区建筑内注入赛博霓虹悬浮铭牌(不改按钮坐标与事件)
    const map = root.querySelector('.park-map');
    if (map) {
      D.buildings.forEach((b) => {
        const hit = map.querySelector(`[data-building="${b.id}"]`);
        if (hit) {
          hit.classList.add('biao-map-pin');
          hit.appendChild(h('span.bmp-ring'));
          hit.appendChild(h('span.bmp-tag', h('b', b.name), h('i', ZONE_SUB[b.id] || 'ZONE')));
        }
      });
    }

    // 2) 将左上角玩家信息升级为实时 DOM 黑金猎人名片(不阻挡底层 [data-act=profile] 与 parkmap 热区)
    const hud = root.querySelector('.hud');
    if (hud) {
      const oldCard = hud.querySelector('img[src*="home/card.webp"]');
      if (oldCard) oldCard.style.opacity = '0';
      const lvPatch = hud.querySelector('.lv-tag');
      if (lvPatch) lvPatch.style.display = 'none';
      hud.appendChild(h('div.biao-vip-card',
        h('div.bvc-av', h('img', { src: NL.img('avatars/heroine.webp'), draggable: 'false' })),
        h('div.bvc-main',
          h('div.bvc-row', h('b.bvc-name', s.name), h('span.bvc-lv', 'Lv.' + s.level)),
          h('div.bvc-pow', '✦ 战力 ', h('em', NL.fmt.power(game.power()))),
          h('div.bvc-map', '📍 绯夜园区总览 ▸'))));

      // 3) 左下角「心动特触」速达浮窗(位于 y=514,避开 y=570 冒险按钮与中央拖拽区)
      const cid = PARTNER_META[pref.partner] ? pref.partner : 'maguangyao';
      const cp = D.partners.find((x) => x.id === cid) || D.partners[2];
      hud.appendChild(h('button.biao-comp-chip', {
        'data-act': 'biao-companion',
        onclick: () => NL.go('partnerInfo', { id: cp.id }),
      },
      h('img', { src: NL.img('avatars/' + cp.id + '.webp'), draggable: 'false' }),
      h('div.bcc-txt', h('b', cp.name + ' · 在线'), h('span', '♥ 直达三区特触 ▸'))));
    }
  };

  /* ---------- 3. 伙伴系统:全 6 人 SSR 镭射画廊 + Live2D 式三区特触舞台 + 私密档案 ---------- */
  const pToday = () => { const d = new Date(Date.now() - 8 * 3600e3); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + (d.getDate()); };
  function pState(p) {
    const all = NL.state.partners;
    return all[p.id] || (all[p.id] = { lv: 1, trust: p.trust, likes: p.likes, claimed: {} });
  }
  function pDay() {
    const s = NL.state;
    if (s.pday.date !== pToday()) s.pday = { date: pToday(), gifts: 0, liked: {}, refresh: 0, tasks: ['credit', 'supply1', 'box'], base: {}, done: {} };
    return s.pday;
  }
  const pNeed = (lv) => 30 * lv;
  function pAddTrust(p, n) {
    const st = pState(p);
    st.trust += n;
    while (st.trust >= pNeed(st.lv) && st.lv < D.partnerLv.length) {
      st.trust -= pNeed(st.lv); st.lv++;
      ui.toast(p.name + ' 的信任等级提升到 ' + st.lv + '。');
    }
    NL.save();
  }
  function biaoTrustBar(p) {
    const st = pState(p), nd = pNeed(st.lv), pct = Math.min(100, (st.trust / nd) * 100);
    return h('div.biao-trust',
      h('div.bt-lv', h('i', 'TRUST'), h('b', 'Lv.' + st.lv)),
      h('div.bt-mid',
        h('div.bt-lbl', h('span', '契约信任度'), h('em', st.trust + ' / ' + nd)),
        h('div.bt-track', h('i', { style: { width: pct + '%' } }))));
  }

  // 3.1 伙伴 SSR 画廊列表
  NL.screens.partner.renderBiao = function (root) {
    root.appendChild(h('div.biao-partner-list',
      NL.sprite('bg/partner_stage.webp', 0, 0, 360, 781, { cls: 'biao-bg-img dim' }),
      h('div.biao-vignette'),
      makeBokeh(8),
      h('div.bpl-header',
        h('div', h('span.bpl-en', 'CRIMSON CONTRACT · SSR'), h('h2', '伙伴契约名录')),
        h('button.bpl-sort', { onclick: () => ui.toast('当前按默认契约顺序排列。') }, '默认排序 ▾')),
      h('div.bpl-grid', D.partners.map((p) => {
        const st = pState(p), meta = PARTNER_META[p.id] || {};
        const card = h('button.bpl-card', {
          'data-partner': p.id,
          style: `--acc:${meta.accent || '#ff3d7f'}`,
          onclick: () => NL.go('partnerInfo', { id: p.id }),
        },
        h('img.bpl-art', { src: NL.img('cards/' + p.id + '.webp'), draggable: 'false' }),
        h('i.bpl-holo'),
        h('span.bpl-ssr', meta.clean ? 'SR+' : 'SSR'),
        h('span.bpl-like', '♥ ' + st.likes),
        h('div.bpl-foot',
          h('div.bpl-row', h('b', p.name), h('em', 'Lv.' + st.lv)),
          h('small', meta.faction || p.race)));
        NL.motion.tilt(card, 9);
        return card;
      }))));
  };

  // 3.2 私密档案弹窗(高定黑金卷宗,高度 452px 居中,确保 y>=740 空白遮罩可点关闭)
  function openBiaoArchive(p) {
    const m = ui.mask({});
    const meta = PARTNER_META[p.id] || {}, f = p.file || {};
    const box = h('div.biao-arch-modal',
      h('div.bam-head',
        h('span', 'CONFIDENTIAL DOSSIER · 私密档案'),
        h('button.bam-close', { onclick: () => m.close() }, '×')),
      h('div.bam-hero',
        h('img.bam-av', { src: NL.img('avatars/' + p.id + '.webp'), draggable: 'false' }),
        h('div.bam-id',
          h('b', p.name),
          h('small', meta.en || p.id.toUpperCase()),
          h('span.bam-tag', (meta.faction || '核心伙伴') + ' · ' + p.race))),
      h('div.bam-grid',
        h('div', h('i', '年龄'), h('b', (f.years || meta.age || '25') + ' 岁')),
        h('div', h('i', '诞辰'), h('b', f.birth || meta.birth || '新纪元')),
        h('div', h('i', '星座'), h('b', f.star || meta.star || '天蝎座')),
        h('div', h('i', '驻留区'), h('b', p.place)),
        h('div.wide', h('i', '偏爱之物'), h('b', f.like || meta.like || '旧时代藏品')),
        h('div.wide', h('i', '排斥之物'), h('b', f.hate || meta.hate || '失控噪声'))),
      h('div.bam-trait', h('i', '✦ 侧写评语'), h('p', meta.trait || p.trait)));
    m.el.appendChild(box);
    m.el.appendChild(h('div.close-hint.abs', { style: { left: 0, width: 360, top: 682, textAlign: 'center', margin: 0 } }, '点击空白处关闭。'));
  }

  // 3.3 伙伴详情:Live2D 式呼吸立绘 + 头/颈/腰三区特触 + 实时心率 + 不挡脸台词气泡
  let touchTimer = 0;
  let lineCursor = 0;

  NL.screens.partnerInfo.renderBiao = function (root, pr) {
    const p = D.partners.find((x) => x.id === pr.id) || D.partners[0];
    const st = pState(p), d = pDay(), meta = PARTNER_META[p.id] || PARTNER_META.maguangyao;
    pref.partner = p.id; savePref();

    const idx = D.partners.indexOf(p);
    const prevP = D.partners[(idx + D.partners.length - 1) % D.partners.length];
    const nextP = D.partners[(idx + 1) % D.partners.length];

    const blush = h('div.biao-blush-aura' + (meta.clean ? '.clean' : ''));
    const tachieImg = h('img.biao-tachie', { src: NL.img('chars/' + p.id + '.webp'), draggable: 'false' });
    const tachieWrap = h('div.biao-tachie-wrap', tachieImg, blush);
    const bpmNum = h('b', (meta.bpm + st.lv * 2) + ' BPM');
    const bpmState = h('small', meta.clean ? '终端同步正常' : '静息心率');
    const bpmBadge = h('div.biao-bpm' + (meta.clean ? '.clean' : ''), { 'data-biao-bpm': p.id },
      h('i.bpm-heart', meta.clean ? '✦' : '♥'), bpmNum, bpmState);

    const voiceZone = h('span.bvb-zone');
    const voiceTxt = h('p.bvb-txt');
    const voiceBubble = h('div.biao-voice-bubble', { 'data-biao-voice': '1' }, voiceZone, voiceTxt);
    const fxLayer = h('div.biao-touch-fx');

    function triggerTouch(zone, ev) {
      const z = (meta.zones && meta.zones[zone]) || meta.zones.collar;
      const lines = z[1];
      const text = lines[lineCursor++ % lines.length];
      voiceZone.textContent = z[0];
      voiceTxt.textContent = text;
      voiceBubble.classList.remove('show');
      void voiceBubble.offsetWidth;
      voiceBubble.classList.add('show');

      blush.classList.add('on');
      bpmBadge.classList.add('hot');
      const boost = zone === 'waist' ? 34 : zone === 'collar' ? 26 : 18;
      bpmNum.textContent = (meta.bpm + st.lv * 2 + boost) + ' BPM';
      bpmState.textContent = meta.clean ? '灵感共鸣中' : (zone === 'waist' ? '心率飙升!' : '呼吸微乱');

      // 弹簧微震回弹
      tachieWrap.classList.remove('touched');
      void tachieWrap.offsetWidth;
      tachieWrap.classList.add('touched');

      // 点击涟漪与星芒爱心粒子
      let rx = 180, ry = zone === 'head' ? 145 : zone === 'collar' ? 245 : 355;
      if (ev && ev.clientX) {
        const sRect = document.querySelector('#stage').getBoundingClientRect(), k = NL.scale || 1;
        rx = (ev.clientX - sRect.left) / k;
        ry = (ev.clientY - sRect.top) / k;
      }
      const rip = h('i.btf-ripple', { style: { left: rx, top: ry } });
      fxLayer.appendChild(rip);
      for (let k = 0; k < 4; k++) {
        const dx = Math.round((Math.random() - 0.5) * 64);
        const dy = -28 - Math.round(Math.random() * 42);
        const sym = meta.clean ? '✦' : (k % 2 ? '♥' : '✦');
        const pt = h('em.btf-heart', { style: `left:${rx}px;top:${ry}px;--dx:${dx}px;--dy:${dy}px` }, sym);
        fxLayer.appendChild(pt);
        setTimeout(() => pt.remove(), 950);
      }
      setTimeout(() => rip.remove(), 700);

      clearTimeout(touchTimer);
      touchTimer = setTimeout(() => {
        blush.classList.remove('on');
        bpmBadge.classList.remove('hot');
        bpmNum.textContent = (meta.bpm + st.lv * 2) + ' BPM';
        bpmState.textContent = meta.clean ? '终端同步正常' : '静息心率';
      }, 2800);
    }

    const stage = h('div.biao-stage', { style: `--acc:${meta.accent};--glow:${meta.glow}` },
      NL.sprite('bg/partner_stage.webp', 0, 0, 360, 781, { cls: 'biao-bg-img' }),
      h('div.biao-spotlight'),
      makeBokeh(12),
      tachieWrap,
      // 三区特触透明热区:头部 / 锁骨领口 / 腰侧
      h('div.biao-hit-zones',
        h('button.bhz', { 'data-touch': 'head', title: '轻触头部', onclick: (e) => triggerTouch('head', e) }, h('span', '✦ 头部')),
        h('button.bhz', { 'data-touch': 'collar', title: '轻触领口', onclick: (e) => triggerTouch('collar', e) }, h('span', meta.clean ? '✦ 领章' : '♥ 领口')),
        h('button.bhz', { 'data-touch': 'waist', title: '轻触腰侧', onclick: (e) => triggerTouch('waist', e) }, h('span', meta.clean ? '✦ 终端' : '♥ 腰侧'))),
      fxLayer,
      voiceBubble,
      bpmBadge,
      // 左右快速切换伙伴
      h('button.biao-pnav.prev', { title: '上一位伙伴', onclick: () => NL.replace('partnerInfo', { id: prevP.id }) }, '‹'),
      h('button.biao-pnav.next', { title: '下一位伙伴', onclick: () => NL.replace('partnerInfo', { id: nextP.id }) }, '›'),
      // 左侧点赞按钮
      h('button.biao-like-btn' + (d.liked[p.id] ? '.on' : ''), {
        'data-act': 'like',
        onclick: () => {
          if (d.liked[p.id]) return ui.toast('今天已经点过赞了。');
          d.liked[p.id] = true; st.likes++; NL.save(); NL.refresh();
        },
      }, h('i', '♥'), h('b', String(st.likes)), h('small', d.liked[p.id] ? '已心动' : '点赞')),
      // 右侧功能浮岛:等级权益 / 特写鉴赏 / 每日委托
      h('div.biao-side-rail',
        h('button', { 'data-act': 'plv', onclick: () => NL.go('partnerLv', { id: p.id }) }, h('i', '♛'), h('span', '权益')),
        h('button', { 'data-act': 'pvisual', onclick: () => NL.go('partnerVisual', { id: p.id }) }, h('i', '❖'), h('span', '特写')),
        h('button', { 'data-act': 'pdaily', onclick: () => NL.go('partnerDaily', { id: p.id }) }, h('i', '✦'), h('span', '委托'))),
      // 底部黑金契约铭牌
      h('div.biao-partner-dock',
        h('div.bpd-top',
          h('div.bpd-title',
            h('div.bpd-name', h('b', p.name), h('span', meta.faction + ' · ' + p.race)),
            h('small.bpd-en', meta.en)),
          h('span.bpd-hint', '轻触立绘触发回应')),
        biaoTrustBar(p),
        h('div.bpd-meta',
          h('button.bpd-loc', { onclick: () => NL.go('parkmap') }, '📍 ' + p.place + ' ▸'),
          h('span.bpd-trait', meta.trait)),
        h('div.bpd-btns',
          h('button.btn.dark', { 'data-act': 'parchive', onclick: () => openBiaoArchive(p) }, '❖ 私密档案'),
          h('button.btn.purple', { 'data-act': 'pgift', onclick: () => NL.go('partnerGift', { id: p.id }) }, '♥ 心动赠礼'))));

    root.appendChild(stage);
  };

  // 3.4 赠礼页:上半屏保留呼吸立绘与赠礼语音反馈,下半屏黑金毛玻璃礼盒抽屉
  let biaoGiftSel = null;
  NL.screens.partnerGift.renderBiao = function (root, pr) {
    const p = D.partners.find((x) => x.id === pr.id) || D.partners[0];
    const d = pDay(), meta = PARTNER_META[p.id] || PARTNER_META.maguangyao;
    const gifts = Object.keys(D.items).filter((id) => D.items[id].gift).sort((a, b) => (p.love.includes(b) ? 1 : 0) - (p.love.includes(a) ? 1 : 0));
    if (!gifts.includes(biaoGiftSel)) biaoGiftSel = gifts[0];
    const g = D.items[biaoGiftSel], loved = p.love.includes(biaoGiftSel), bonus = loved ? Math.round(g.base * 0.6) : 0;

    const voice = h('div.biao-voice-bubble.gift-voice', h('span.bvb-zone', '【契约回礼】'), h('p.bvb-txt', meta.giftLine));

    root.appendChild(h('div.biao-stage.gift-mode', { style: `--acc:${meta.accent};--glow:${meta.glow}` },
      NL.sprite('bg/partner_stage.webp', 0, 0, 360, 781, { cls: 'biao-bg-img' }),
      h('div.biao-spotlight'),
      h('div.biao-tachie-wrap.gift-pos', h('img.biao-tachie', { src: NL.img('chars/' + p.id + '.webp'), draggable: 'false' })),
      voice,
      h('div.biao-gift-drawer',
        h('div.bgd-head',
          h('b', '♥ 赠礼 · ' + p.name),
          h('span.bgd-cnt', '今日次数 ' + d.gifts + '/' + 5)),
        biaoTrustBar(p),
        h('div.bgd-detail',
          h('div.bgd-row',
            h('b.bgd-name', { style: { borderLeftColor: D.rarity[g.rare][1] } }, g.name),
            h('div.bgd-tags', h('i', '情感礼物'), loved ? h('i.love', '♥ 偏爱加成') : null),
            h('div.bgd-fav', '好感 +', h('b', String(g.base)), loved ? h('em', ' +' + bonus) : null)),
          h('p.bgd-desc', g.desc)),
        h('div.gp-list.scroll-x.biao-gp-list', gifts.map((id) => {
          const el = ui.itemEl(id, game.count(id));
          el.classList.add('gift');
          if (id === biaoGiftSel) el.classList.add('sel');
          if (p.love.includes(id)) el.appendChild(h('u', '♥'));
          el.dataset.gift = id;
          el.onclick = () => { biaoGiftSel = id; NL.refresh(); };
          return el;
        })),
        h('button.btn.purple.biao-gift-send', {
          'data-act': 'send',
          onclick: () => {
            if (d.gifts >= 5) return ui.toast('今日赠礼次数已用完。');
            if (!game.spend(biaoGiftSel, 1)) return ui.toast('您没有该礼物');
            d.gifts++;
            pAddTrust(p, g.base + bonus);
            NL.refresh();
            setTimeout(() => {
              const vb = document.querySelector('.biao-voice-bubble.gift-voice');
              if (vb) vb.classList.add('show');
            }, 40);
          },
        }, '✦ 献上心意礼盒'))));
  };

  // 3.5 视觉档案(特写鉴赏台):支持 1.0x 全身 / 1.32x 锁骨近景缩放、纯享隐藏 HUD、背光氛围切换
  NL.screens.partnerVisual.renderBiao = function (root, pr) {
    const pid = (pr && pr.id) || pref.partner || 'ling';
    const p = D.partners.find((x) => x.id === pid) || D.partners[1];
    const meta = PARTNER_META[p.id] || PARTNER_META.ling;
    const LIGHTS = [
      ['绯夜霓虹', meta.glow],
      ['冰青月影', 'rgba(125,232,255,.42)'],
      ['香槟流金', 'rgba(232,207,154,.38)'],
    ];
    const [, curGlow] = LIGHTS[pref.light % LIGHTS.length];

    const stage = h('div.biao-stage.visual-mode' + (pref.zoom ? '.zoomed' : '') + (pref.pure ? '.pure' : ''), { style: `--acc:${meta.accent};--glow:${curGlow}` },
      NL.sprite('bg/partner_stage.webp', 0, 0, 360, 781, { cls: 'biao-bg-img' }),
      h('div.biao-spotlight'),
      makeBokeh(14),
      h('div.biao-tachie-wrap.vis-wrap', {
        onclick: () => { if (pref.pure) { pref.pure = false; savePref(); stage.classList.remove('pure'); } },
      }, h('img.biao-tachie', { src: NL.img('chars/' + p.id + '.webp'), draggable: 'false' })),
      h('div.biao-vis-hud',
        h('div.bvh-top',
          h('span', 'VISUAL ARCHIVE · 2D 立绘特写鉴赏'),
          h('b', p.name + ' · 原生礼装')),
        h('div.bvh-controls',
          h('button', { 'data-act': 'vis-zoom', onclick: (e) => { pref.zoom = !pref.zoom; savePref(); stage.classList.toggle('zoomed', pref.zoom); e.currentTarget.textContent = pref.zoom ? '🔍 1.32× 近景' : '🔍 1.0× 全身'; } }, pref.zoom ? '🔍 1.32× 近景' : '🔍 1.0× 全身'),
          h('button', { 'data-act': 'vis-light', onclick: () => { pref.light = (pref.light + 1) % LIGHTS.length; savePref(); NL.refresh(); } }, '✦ ' + LIGHTS[pref.light % LIGHTS.length][0]),
          h('button', { 'data-act': 'vis-pure', onclick: () => { pref.pure = true; savePref(); stage.classList.add('pure'); ui.toast('轻点立绘可恢复界面'); } }, '👁 纯享模式')),
        h('div.bvh-skins',
          h('button.on', '✦ 绯夜常服 · 已解锁'),
          h('button.locked', { onclick: () => ui.toast('该形象尚未解锁。') }, '🔒 暗夜盛装 · 待解锁'))));
    root.appendChild(stage);
  };

  /* ---------- 4. 角色页:赛博猎手女主(Heroine)舞台 + 档案/装备/强化/芯片四页签 ---------- */
  let biaoRoleTab = 'profile';
  const EQUIP_LAYOUT = [
    ['head', 56, 156], ['weapon', 56, 238], ['hand1', 56, 320], ['hand2', 56, 402], ['armor', 56, 484],
    ['neck', 292, 156], ['hand3', 292, 238], ['hand4', 292, 320], ['pants', 292, 402], ['shoes', 292, 484],
  ];
  const CHIP_LAYOUT = [
    [76, 316, 'A'], [154, 316, 'B'], [232, 316, 'C'],
    [38, 392, '万能'], [115, 392, 'A'], [193, 392, 'B'], [270, 392, 'C'],
    [76, 468, 'A'], [154, 468, 'B'], [232, 468, 'C'],
  ];

  function openBiaoPerks() {
    let seg = 'perk';
    const m = ui.win({ title: '权益加成', h: 533 });
    m.body.classList.add('pk');
    const row = (i, tag, text, val, right, off) => h('div.pk-row' + (off ? '.off' : ''), { style: { top: 98 + i * 30.5 } }, h('i', tag), h('span', text + ' ', h('em', val)), h('b', right));
    function draw() {
      m.body.textContent = '';
      m.body.appendChild(h('div.seg', ['add', 'perk'].map((k) => h('button' + (seg === k ? '.on' : ''), { onclick: () => { seg = k; draw(); } }, k === 'add' ? '加成信息' : '权益信息'))));
      if (seg === 'perk') {
        m.body.appendChild(h('div.pk-top', ui.sec('线上权益'), h('span', '剩余有效时间')));
        D.perks.forEach((p, i) => m.body.appendChild(row(i, p[0], p[1], p[2], p[3])));
        m.body.appendChild(row(D.perks.length, D.perks[0][0], D.perks[0][1], D.perks[0][2], D.perks[0][3], true));
        m.body.appendChild(h('div.pk-clash', { style: { top: 98 + D.perks.length * 30.5 - 10 } }, '同类型冲突'));
        m.body.appendChild(h('button.btn.pink.small.pk-src', { onclick: () => ui.toast('权益来自已穿戴的装备。') }, '详细来源'));
      } else {
        m.body.appendChild(h('div.pk-top', ui.sec('战力构成')));
        [['等级', game.levelPower(NL.state.level)], ['装备', game.powerParts[1]()], ['基础', 12335]].forEach((p, i) => m.body.appendChild(row(i, p[0], '战力', '+' + p[1], '')));
      }
    }
    draw();
  }

  NL.screens.role.renderBiao = function (root) {
    const s = NL.state;
    const stage = h('div.biao-role.tab-' + biaoRoleTab,
      NL.sprite('bg/partner_stage.webp', 0, 0, 360, 700, { cls: 'biao-bg-img role-bg' }),
      h('div.biao-vignette'),
      makeBokeh(8),
      h('div.biao-heroine-wrap', {
        onclick: () => ui.toast('义体同步率 99.4% · 今晚的乐园巡猎交给我吧。'),
      }, h('img.biao-heroine', { src: NL.img('chars/heroine.webp'), draggable: 'false' })),
      // 顶部标题与总战力铭牌
      h('div.br-top',
        h('div.br-title', h('span', 'HUNTER TERMINAL'), h('b', s.name)),
        h('div.br-power', h('i', '✦ 战力'), h('b', NL.fmt.power(game.power())))),
      // 左侧四枚切换页签
      h('div.br-tabs', [['profile', '档案'], ['equip', '装备'], ['enh', '强化'], ['chip', '芯片']].map(([k, lbl]) =>
        h('button' + (biaoRoleTab === k ? '.on' : ''), { 'data-tab': k, onclick: () => { biaoRoleTab = k; NL.refresh(); } }, lbl))),
      // 右下权益加成入口
      h('button.br-perks', { 'data-act': 'perks', onclick: openBiaoPerks }, '❖ 权益加成 ▸'));

    if (s.guide === 'on') stage.appendChild(h('div.guide-arrow', { style: { left: 229, top: 667 } }));

    if (biaoRoleTab === 'profile') {
      const need = game.expNeed(s.level), pct = Math.min(100, (s.exp / need) * 100);
      stage.appendChild(h('div.br-profile-card',
        h('div.brp-row',
          h('div.brp-lv', h('small', 'LEVEL'), h('b', String(s.level))),
          h('div.brp-exp',
            h('div.brp-lbl', h('span', '神经同步经验'), h('em', s.exp + ' / ' + need)),
            h('div.brp-bar', h('i', { style: { width: pct + '%' } })))),
        h('div.brp-tags',
          h('button', { onclick: () => NL.go('faction') }, h('i', '所属势力'), h('b', '探索阵营 ▸')),
          h('button', { onclick: () => ui.toast('种族：改造者') }, h('i', '义体种族'), h('b', '改造者 ✦')))));
    } else if (biaoRoleTab === 'equip') {
      const wrap = h('div.br-equip-layer');
      EQUIP_LAYOUT.forEach(([sid, x, y]) => {
        const sl = D.slots.find((item) => item.id === sid);
        const g = game.gear(s.equipped[sid]);
        const eq = g && D.equips[g.id];
        const first = g ? g.uid : (game.sortedGear().find((item) => D.equips[item.id].type === sl.type && !game.slotOf(item.uid)) || {}).uid;
        const rareCol = eq ? D.rarity[eq.rare][1] : 'rgba(232,207,154,.32)';
        const cell = h('button.br-slot' + (eq ? '.filled' : ''), {
          'data-slot': sid,
          style: `left:${x}px;top:${y}px;--rc:${rareCol}`,
          onclick: () => ui.gearWin(first, { slot: sid }),
        },
        eq ? h('img', { src: NL.img(eq.icon), draggable: 'false' }) : h('span.br-slot-empty', sl.name),
        s.iface[sid] ? h('em.br-slot-lv', '+' + s.iface[sid]) : null);
        wrap.appendChild(cell);
      });
      wrap.appendChild(h('button.br-set-tip', { onclick: () => ui.toast('暂无可激活的套装。') }, '⊘ 套装共鸣: 暂未激活'));
      stage.appendChild(wrap);
    } else if (biaoRoleTab === 'enh') {
      stage.appendChild(h('div.br-enh-list',
        h('button.br-enh-card.on', { 'data-act': 'iface', onclick: () => NL.go('iface') },
          h('span.bec-ico', '⚡'),
          h('div.bec-txt', h('b', '义体接口升级'), h('small', '消耗装备晶片提升 10 大部位同步倍率')),
          h('em', '进入 ▸')),
        h('button.br-enh-card', { onclick: () => ui.toast('种族天赋暂未开放。') },
          h('span.bec-ico', '❖'),
          h('div.bec-txt', h('b', '改造者种族天赋'), h('small', '深层神经回路觉醒 · 待开放')),
          h('em', '锁定')),
        h('button.br-enh-card', { onclick: () => ui.toast('势力天赋暂未开放。') },
          h('span.bec-ico', '♛'),
          h('div.bec-txt', h('b', '阵营战术协议'), h('small', '圣物会 / 阪神集团专属刻印 · 待开放')),
          h('em', '锁定'))));
    } else {
      const chipLayer = h('div.br-chip-layer');
      CHIP_LAYOUT.forEach(([x, y, kind], i) => {
        chipLayer.appendChild(h('button.br-chip' + (kind === '万能' ? '.core' : ''), {
          'data-chip': i + 1,
          style: { left: x, top: y },
          onclick: () => ui.win({
            title: '选择芯片', h: 476,
            body: h('div.chip-win', h('b', (i + 1) + ' 号槽 · ' + kind), h('span', '没有能放进这个槽的芯片')),
          }),
        }, h('b', kind), h('small', '#' + (i + 1))));
      });
      chipLayer.appendChild(h('button.br-chip-bag', { onclick: () => ui.toast('芯片背包是空的。') }, '❖ 查看芯片仓库'));
      stage.appendChild(chipLayer);
    }

    root.appendChild(stage);
  };

  /* ---------- 5. 剧情视觉小说舞台 (WebGAL 风格 2D 立绘对话层) ---------- */
  const origStory = ui.story;
  const STORY_CHAR = {
    吴谩: ['chars/wuman.webp', 'r'],
    熊杰: ['chars/xiongjie.webp', 'l'],
    银砂: ['chars/yinsha.webp', 'r'],
  };

  ui.story = function (script, onDone) {
    if (NL.skin() !== 'biao') return origStory(script, onDone);
    const layers = document.querySelector('#layers');
    const bg = NL.sprite('bg/story_bg.webp', 0, 0, 360, 781, { cls: 'biao-story-bg' });
    const charImg = h('img.biao-story-char.hidden', { draggable: 'false' });
    const tag = h('div.story-name.biao-st-name.hidden');
    const text = h('div.story-text.biao-st-text');
    const more = h('div.story-more.biao-st-more', '❖');
    const box = h('div.story-box.biao-st-box', text, more);
    const el = h('div.story.biao-story',
      bg,
      h('div.biao-story-vignette'),
      charImg,
      h('div.biao-st-topbar', h('span', 'CRIMSON CHRONICLE · 剧情回溯')),
      tag, box,
      h('button.story-skip.biao-st-skip', { onclick: (e) => { e.stopPropagation(); finish(); } }, h('i'), '跳过'));
    layers.appendChild(el);

    let i = -1, typing = 0, full = '', shown = 0, waiting = null;
    function finish() {
      clearInterval(typing);
      el.remove();
      if (onDone) onDone();
    }
    function next() {
      i++;
      if (i >= script.length) return finish();
      const line = script[i];
      if (line.title) return titleCard(line.title);
      if (line.choice) return choose(line.choice);
      const info = line.who ? STORY_CHAR[line.who] : null;
      if (info) {
        charImg.src = NL.img(info[0]);
        charImg.className = 'biao-story-char side-' + (line.side || info[1]);
      } else {
        charImg.className = 'biao-story-char hidden';
      }
      tag.textContent = line.as || line.who || '';
      tag.className = 'story-name biao-st-name ' + (line.who ? (line.side || (info && info[1]) || 'l') : 'hidden');
      full = line.text; shown = 0; text.textContent = '';
      clearInterval(typing);
      typing = setInterval(() => {
        shown += 2;
        text.textContent = full.slice(0, shown);
        if (shown >= full.length) clearInterval(typing);
      }, 28);
    }
    function titleCard(t) {
      charImg.className = 'biao-story-char hidden';
      tag.className = 'story-name biao-st-name hidden';
      text.textContent = '';
      const card = h('div.story-title.biao-st-title', h('span', 'CHAPTER RECORD'), h('b', t), h('i', 'NEXTLAND · NOCTURNE'));
      el.appendChild(card);
      waiting = () => { card.remove(); waiting = null; next(); };
      setTimeout(() => waiting && waiting(), 1300);
    }
    function choose(opts) {
      const dim = h('div.story-choice.biao-st-choice', opts.map((o) => h('button', { onclick: (e) => { e.stopPropagation(); dim.remove(); waiting = null; next(); } }, '✦ ' + o)));
      el.appendChild(dim);
      waiting = () => {};
    }
    el.addEventListener('click', () => {
      if (waiting) return waiting();
      if (shown < full.length) { clearInterval(typing); shown = full.length; text.textContent = full; return; }
      next();
    });
    next();
  };

  /* ---------- 6. 补给抽卡、无尽之塔与个人中心增强层 ----------
   * 先执行原 render 以共享 100% 相同的闭包变量与随机数调用序列,再将底图替换为表皮肤高清 WebP 舞台与黑金 DOM 面板。
   */
  const origSupply = NL.screens.supply.render;
  NL.screens.supply.renderBiao = function (root) {
    origSupply.call(this, root);
    const bgImg = root.querySelector('img.abs');
    let curPage = 0;
    if (bgImg) {
      const m = /p(\d)\.jpg/.exec(bgImg.src);
      if (m) curPage = Math.max(0, (+m[1]) - 1);
      bgImg.src = NL.img('bg/supply_stage.webp');
      bgImg.classList.add('biao-bg-img');
    }
    const sp = D.supply[curPage] || D.supply[0];
    const cardItem = D.items[sp.card] || {};
    root.insertBefore(h('div.biao-supply-overlay',
      h('div.bso-badge', 'ASTRAL SUPPLY · 0' + (curPage + 1) + ' / 03'),
      h('h2.bso-title', sp.name),
      h('p.bso-sub', '每次契约必得 装备晶片 ×' + sp.crystal + ' · 额外随机坠落制式武装'),
      h('div.bso-showcase', sp.pool.slice(0, 4).map((eid) => {
        const eq = D.equips[eid];
        return eq ? h('div.bso-eq', { style: `--rc:${D.rarity[eq.rare][1]}` }, h('img', { src: NL.img(eq.icon), draggable: 'false' }), h('span', eq.name)) : null;
      })),
      h('div.bso-dots', [0, 1, 2].map((idx) => h('i' + (idx === curPage ? '.on' : '')))),
      h('div.bso-btns-vis',
        h('div.bsb.one', h('b', '补给 1 次'), h('small', cardItem.name + ' ×' + sp.cost)),
        h('div.bsb.ten', h('b', '✦ 十连契约'), h('small', cardItem.name + ' ×' + (sp.cost * 10))))),
    bgImg ? bgImg.nextSibling : root.firstChild);

    const prev = root.querySelector('[data-act=sp-prev]');
    const next = root.querySelector('[data-act=sp-next]');
    if (prev) { prev.classList.add('biao-sp-arrow'); prev.textContent = '‹'; }
    if (next) { next.classList.add('biao-sp-arrow'); next.textContent = '›'; }
  };

  const origSupplyRes = NL.screens.supplyResult.render;
  NL.screens.supplyResult.renderBiao = function (root, p) {
    origSupplyRes.call(this, root, p);
    root.classList.add('biao-sr');
    const imgs = root.querySelectorAll(':scope > img.abs');
    if (imgs[0]) {
      imgs[0].src = NL.img('bg/supply_stage.webp');
      imgs[0].style.height = '781px';
      imgs[0].classList.add('biao-bg-img', 'dim');
    }
    if (imgs[1]) imgs[1].style.display = 'none';
    root.appendChild(h('div.biao-sr-head', h('span', 'CONTRACT RESOLVED'), h('b', '补给契约结算'), h('em', '获得装备晶片 ×' + p.crystal)));
    root.appendChild(h('div.biao-sr-foot-vis',
      h('span.bsrf.one', '再抽 1 次'),
      h('span.bsrf.ten', '✦ 再抽 10 次')));
  };

  const origRank = NL.screens.rank.render;
  NL.screens.rank.renderBiao = function (root) {
    origRank.call(this, root);
    const bgImg = root.querySelector(':scope > img.abs');
    if (bgImg) { bgImg.src = NL.img('bg/tower_arena.webp'); bgImg.classList.add('biao-bg-img'); }
    const r = NL.state.rank;
    root.insertBefore(h('div.biao-rank-overlay',
      h('div.bro-head', h('span', 'ENDLESS SPIRE · 无尽之塔'), h('b', r.place ? '当前位阶 · 第 ' + r.place + ' 名' : '当前位阶 · 未上榜')),
      h('div.bro-top3', D.rankers.slice(0, 4).map(([nm, pw], idx) =>
        h('div.bro-row', h('i', '0' + (idx + 1)), h('b', nm), h('em', '战力 ' + NL.fmt.power(pw)))))),
    bgImg ? bgImg.nextSibling : root.firstChild);

    const info = root.querySelector('[data-act=rk-info]');
    const idle = root.querySelector('[data-act=rk-idle]');
    const fight = root.querySelector('[data-act=rk-fight]');
    if (info) { info.classList.add('biao-rk-pill'); info.textContent = '♛ 奖励'; }
    if (idle) { idle.classList.add('biao-rk-pill', 'gold'); idle.textContent = '✦ 挂机领奖'; }
    if (fight) { fight.classList.add('biao-rk-fight'); fight.textContent = '⚔ 发起排位挑战'; }
  };

  const origProfile = NL.screens.profile.render;
  NL.screens.profile.renderBiao = function (root) {
    origProfile.call(this, root);
    const s = NL.state;
    const bgImg = root.querySelector(':scope > img.abs');
    if (bgImg) { bgImg.src = NL.img('bg/partner_stage.webp'); bgImg.classList.add('biao-bg-img', 'dim'); }
    root.insertBefore(h('div.biao-pf-overlay',
      h('div.bpo-card',
        h('img.bpo-av', { src: NL.img('avatars/heroine.webp'), draggable: 'false' }),
        h('div.bpo-info',
          h('b', s.name),
          h('span', 'UID · ' + s.uid + '  |  Lv.' + s.level),
          h('em', '✦ 总战力 ' + NL.fmt.power(game.power()))),
        h('span.bpo-edit', '✎ 改名')),
      h('div.bpo-stats',
        h('div', h('i', '体力'), h('b', String(s.energy))),
        h('div', h('i', '储值'), h('b', String(s.gem))),
        h('div', h('i', '信用点'), h('b', String(s.credit))),
        h('div', h('i', '金库'), h('b', '0'))),
      h('div.bpo-grid-vis', [
        ['🎟', '乐园票券'], ['🛍', '票券商城'], ['❖', '物资商城'], ['', ''],
        ['🔗', '会员绑定'], ['📅', '线下预约'], ['', ''], ['', ''],
        ['📜', '入园公告'], ['⚙', '系统设置'], ['🧭', '线下引导'], ['ⓘ', '关于版本'],
      ].map(([ic, tx]) => h('div.bpo-cell' + (tx ? '' : '.empty'), h('i', ic), h('span', tx))))),
    bgImg ? bgImg.nextSibling : root.firstChild);
  };
})();
