/* 数据表。数值尽量照录屏里能看到的填，看不到的按同样风格补（见 README 的差异清单）。 */
(function () {
  'use strict';
  const D = NL.data;

  // 主页地图上的三块建筑牌子（地图原图像素坐标）
  D.buildings = [
    { id: 'museum', name: '运动博物馆', box: [1090, 930, 1390, 1175] },
    { id: 'core', name: '圣物核心', box: [1225, 1270, 1480, 1510] },
    { id: 'hanshin', name: '阪神公司', box: [1870, 1205, 2120, 1450] },
  ];
  D.map = { w: 3773, h: 2609, start: [-475, -253] };

  /* ---------- 物品 ---------- */
  D.items = {
    exp: { name: '经验芯片', kind: '经验', icon: 'item/exp.webp', desc: '记录着训练数据的芯片，使用后直接转化为角色经验。' },
    credit: { name: '阪神信用点', kind: '阪神信用点', icon: 'item/credit.webp', desc: '新生市最大的阪神集团统一发行的货币，可在游戏内进行物资购买。' },
    supply_card: { name: '补给卡', kind: '补给道具', icon: 'item/supply_card.webp', desc: '在补给处兑换一次基础或高级物资补给的凭证。' },
    special_card: { name: '特需补给卡', kind: '补给道具', icon: 'item/special_card.webp', desc: '在补给处兑换一次特级物资补给的凭证。' },
    crystal: { name: '装备晶片', kind: '强化材料', icon: 'item/crystal.webp', desc: '分解装备得到的晶片，用于升级装备接口。' },
    box_white: { name: '白品装备补给箱', kind: '资源包', icon: 'item/box_white.webp', desc: '白品装备补给箱' },
    box_green: { name: '绿品装备补给箱', kind: '资源包', icon: 'item/box_green.webp', desc: '绿品装备补给箱' },
    box_blue: { name: '蓝品装备补给箱', kind: '资源包', icon: 'item/box_blue.webp', desc: '蓝品装备补给箱' },
    gift_green: { name: '绿品好感道具箱', kind: '资源包', icon: 'item/gift_green.webp', desc: '绿品好感道具箱' },
    gift_blue: { name: '蓝品好感道具箱', kind: '资源包', icon: 'item/gift_blue.webp', desc: '蓝品好感道具箱' },
    gift_purple: { name: '紫品好感道具箱', kind: '资源包', icon: 'item/gift_purple.webp', desc: '紫品好感道具箱' },
    gift_orange: { name: '橙品好感道具箱', kind: '资源包', icon: 'item/gift_orange.webp', desc: '橙品好感道具箱' },
    daily_point: { name: '日常积分', kind: '积分', icon: 'item/daily_point.webp', desc: '完成日常任务获得，累计后可领取积分奖励。' },
  };

  /* ---------- 任务 ---------- */
  // goal 里用 {} 包住的字会标成橙色
  const R = (...a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push({ id: a[i], n: a[i + 1] }); return o; };
  D.taskChains = {
    guide: [
      { id: 'g1', tag: '引导', title: '进入《新生乐园世界》', goal: '{登录《新生乐园世界》}', auto: true, rewards: R('exp', 100, 'credit', 20), desc: '欢迎来到新生乐园世界，开始您的奇幻旅程吧！' },
      { id: 'g2', tag: '引导', title: '绑定新生乐园会员', goal: '绑定{新生乐园会员}', ev: 'bind', go: 'bind', rewards: R('exp', 200, 'credit', 20), desc: '在主页内点击个人头像进入个人界面，点击“绑定管理”进行新生乐园会员绑定管理。' },
    ],
    main: [
      { id: 'm1', tag: '主线', title: '当年悬案', goal: '查看剧情并通关{圣物核心01}', story: 'case1', stage: ['core', 1], rewards: R('credit', 20, 'supply_card', 1), desc: '了解当年悬案的来龙去脉，并通过圣物核心第一关的试炼。' },
      { id: 'm2', tag: '主线', title: '悬案再起', goal: '查看剧情并通关{圣物核心02}', story: 'case2', stage: ['core', 2], rewards: R('credit', 10, 'crystal', 20), desc: '悬案出现了新的线索，继续通过圣物核心第二关的试炼。' },
    ],
  };
  D.sideTasks = [
    { id: 's1', tag: '势力', title: '落脚点', goal: '完成剧情', story: 'foothold', icon: 'main', rewards: R('credit', 10, 'box_green', 2), desc: '找到所属势力在园区内的落脚点。' },
    { id: 's2', title: '“莺”的试炼', goal: '找{反抗军}表明来意', story: 'ying', qr: true, icon: 'red', rewards: R('credit', 10, 'box_green', 1), desc: '向园区里的反抗军成员出示互动码。' },
    { id: 's3', title: '不问姓名', goal: '找到{旧时代自由人}', story: 'noname', qr: true, icon: 'white', rewards: R('credit', 10, 'box_green', 1), desc: '向园区里的旧时代自由人出示互动码。' },
  ];
  const npc = (id, title) => ({ id, title, goal: '与{对应NPC}进行互动', qr: true, icon: 'explore', rewards: R('credit', 10, 'box_green', 1), desc: '找到园区里对应的 NPC,出示互动码。' });
  const test = (id, title) => ({ id, title: '【测】' + title, goal: '【测】' + title, icon: 'explore', rewards: R('credit', 10, 'box_green', 2), desc: '测试用任务。' });
  D.exploreTasks = [
    npc('e1', '自由人（女）支线1'), npc('e2', '反抗军（男）支线1'), npc('e3', '反抗军（女）支线1'),
    test('e4', '绑定装备（改造人）'), test('e5', '提交物品（仿生人）'), test('e6', '提交物品（人类）'),
    npc('e7', '机械师支线1'), npc('e8', '交易员支线1'), npc('e9', '交易员支线1'),
    npc('e10', '教练（男）支线1'), npc('e11', '教练（女）支线1'), npc('e12', '阪神防卫军支线1'),
    npc('e13', '阪神先锋学院支线1'), npc('e14', '银伶巡唱团支线1'), npc('e15', '仿生人支线1'),
    npc('e16', '仿生人支线1'), npc('e17', '防卫军支线1'), npc('e18', '防卫军支线1'),
    npc('e19', '旅鼠商会支线1'), npc('e20', '阪神防卫军支线2'), npc('e21', '赛博自由人支线1'),
    npc('e22', '自由人（男）支线1'), npc('e23', '改造者支线1'), npc('e24', '机械师支线2'),
    npc('e25', '银伶巡唱团支线2'), npc('e26', '旅鼠商会支线2'), npc('e27', '阪神先锋学院支线2'),
    npc('e28', '赛博自由人支线2'), npc('e29', '教练（男）支线2'),
  ];
  D.dailyTasks = [
    { id: 'd1', title: '领取排行榜挂机奖励', goal: '领取1次排行榜挂机奖励', ev: 'rank_idle' },
    { id: 'd2', title: '挑战追光峡谷', goal: '挑战1次追光峡谷', ev: 'gorge' },
    { id: 'd3', title: '排行榜挑战', goal: '挑战排行榜1次', ev: 'rank' },
    { id: 'd4', title: '高级补给', goal: '高级补给1次', ev: 'supply_premium' },
    { id: 'd5', title: '挑战地核矿山', goal: '挑战1次地核矿山', ev: 'mine' },
  ];
  D.dailyGifts = { 10: R('credit', 50), 20: R('supply_card', 1), 30: R('crystal', 20) };

  /* ---------- 剧情 ---------- */
  // 录屏里玩家点得很快，对白只拍到片段；没拍全的句子保留拍到的部分，不另外编内容
  D.stories = {
    case1: [
      { title: '当年悬案' },
      { who: '吴谩', as: '【训练兵】吴谩', text: '是……' },
      { who: '熊杰', text: '我们这边都是军官训练团出来的好兵。带上你，只会拖累我们队的分数。' },
      { choice: ['沉默不语', '质疑雄杰'] },
      { who: '吴谩', text: '你枪打得就真的那么好？能当军官三队的队长？' },
      { who: '熊杰', text: '听好了！现在！赶紧！离开这！你还想和我比试？你是哪冒出来的，质疑我的能力？' },
      { who: '熊杰', text: '我说了，我单独教训这个人，你们不要进来！' },
      { who: '熊杰', text: '你……你是谁？' },
      { who: '银砂', text: '嗯哼。' },
      { who: '熊杰', text: '对，我不收外圈人，而且你们这些训练兵什么也不懂。' },
      { who: '熊杰', text: '什么教官？宪兵队的爪牙！只知道缩在中央区，什么也不干！' },
      { who: '吴谩', side: 'l', text: '我……这不合规吧。' },
      { who: '熊杰', text: '今天非要把你们打服！' },
      { who: '银砂', text: '你刚尝过我鞋底的味道。' },
      { who: '熊杰', text: '咳……这说明不了什么，军官就是要指挥你们这些的外圈货。' },
      { who: '银砂', text: '你能直接当上军官训练生不过是因为你在中圈出生罢了。' },
    ],
    case2: [{ title: '悬案再起' }, { text: '【这段剧情没有出现在录屏里，网页版暂以此句代替。】' }],
    foothold: [{ text: '【这段剧情没有出现在录屏里，网页版暂以此句代替。】' }],
    ying: [{ text: '【加入反抗军势力后，你收到了“莺”的加密通讯，她建议你来找反抗军，认为以你的才能，可以在反抗军中大展拳脚。】' }],
    noname: [{ text: '【增益市场的义体贩子收了你的好处，但却没有按照约定将你带到旧时代自由人身前，正在你觉得被骗之时，你收到一条来自陌生终端的定位信息，附言只有四个字：“不问姓名”。】' }],
  };
  D.storyPlates = {
    熊杰: ['otome/chars/xiongjie.webp', 'l'],
    吴谩: ['otome/chars/wuman.webp', 'r'],
    银砂: ['otome/chars/yinsha.webp', 'r'],
  };

  /* ---------- 装备 ---------- */
  // 录屏里看得到名字和数值的只有 4 件(金链、白手套、粉色护手、高地守卫上衣),其余按同样风格补
  D.slots = [
    { id: 'head', name: '头盔', type: 'head', at: [160, 696] }, { id: 'neck', name: '项链', type: 'neck', at: [330, 696] },
    { id: 'weapon', name: '武器', type: 'weapon', at: [498, 696] },
    { id: 'hand1', name: '手饰1', type: 'hand', at: [76, 832] }, { id: 'hand2', name: '手饰2', type: 'hand', at: [244, 832] },
    { id: 'hand3', name: '手饰3', type: 'hand', at: [414, 832] }, { id: 'hand4', name: '手饰4', type: 'hand', at: [582, 832] },
    { id: 'armor', name: '护甲', type: 'armor', at: [160, 968] }, { id: 'pants', name: '裤子', type: 'pants', at: [330, 968] },
    { id: 'shoes', name: '鞋子', type: 'shoes', at: [498, 968] },
  ];
  D.slotTypes = { head: '头盔', neck: '项链', weapon: '武器', hand: '手饰', armor: '护甲', pants: '裤子', shoes: '鞋子' };
  D.rarity = { white: ['白', '#b9b8c2', 3], green: ['绿', '#8ad628', 3], blue: ['蓝', '#1fb4e8', 6], purple: ['紫', '#7c3bf0', 12], orange: ['橙', '#f07a18', 24] };
  const E = (name, type, rare, power, icon, o) => Object.assign({ name, type, rare, power, icon: 'equip/' + icon + '.webp', desc: '新生乐园世界里流通的制式装备。', src: ['补给'] }, o || {});
  D.equips = {
    prism: E('棱镜核心', 'hand', 'orange', 5200, 'prism', { attr: '暴击+5%' }),
    pistol: E('制式手枪', 'weapon', 'white', 1200, 'pistol'),
    vest: E('战术背心', 'armor', 'white', 800, 'vest'),
    hat: E('圆顶礼帽', 'head', 'purple', 6700, 'hat', { attr: '魅力+6%' }),
    neck_gold: E('金链吊坠', 'neck', 'purple', 485, 'neck_gold', { attr: '轻盈+7%', perk: '获得装备晶片增加{10%}' }),
    ring: E('纹章戒指', 'hand', 'purple', 3476, 'ring', { attr: '活力+4%' }),
    glove_white: E('白手套', 'hand', 'purple', 461, 'glove_white', { perk: '获得阪神信用点增加{10}' }),
    gauntlet: E('粉晶护手', 'hand', 'blue', 55, 'gauntlet', { attr: '击晕抗性+3%', perk: '消耗阪神信用点减少{5}' }),
    pants: E('黑色长裤', 'pants', 'purple', 3118, 'pants', { attr: '结实+4%' }),
    boots: E('粉晶战靴', 'shoes', 'blue', 2250, 'boots', { attr: '轻盈+3%' }),
    tuxedo: E('晚宴礼服', 'armor', 'purple', 2900, 'tuxedo', { attr: '魅力+5%' }),
    choker: E('粉晶项圈', 'neck', 'blue', 320, 'choker'),
    armor_pink: E('粉晶胸甲', 'armor', 'blue', 1500, 'armor_pink', { attr: '结实+3%' }),
    bracelet: E('粉晶手环', 'hand', 'blue', 48, 'bracelet'),
    helmet_brown: E('旧式飞行盔', 'head', 'green', 310, 'helmet_brown'),
    helmet_grey: E('巡逻头盔', 'head', 'green', 280, 'helmet_grey'),
    chain: E('银色链圈', 'neck', 'green', 60, 'chain'),
    rifle: E('训练步枪', 'weapon', 'green', 640, 'rifle', { src: ['补给', '【玩法】追光峡谷探索列车'] }),
    pistol_color: E('涂装手枪', 'weapon', 'green', 520, 'pistol_color'),
    vest_green: E('高地守卫上衣', 'armor', 'green', 25, 'vest_green', { perk: '消耗阪神信用点减少{5}', desc: '弹道训练营老兵守卫的制式装备。', src: ['补给', '【玩法】追光峡谷探索列车'] }),
  };
  // 开局:3 件穿在身上,其余在仓库(录屏开始时也是这样;仓库里原有 69 件,这里只放录屏里看得清的)
  D.startEquipped = { hand1: 'prism', weapon: 'pistol', armor: 'vest' };
  D.startGear = ['hat', 'neck_gold', 'pants', 'ring', 'glove_white', 'boots', 'gauntlet', 'hat', 'tuxedo', 'choker', 'armor_pink', 'boots',
    'bracelet', 'bracelet', 'gauntlet', 'gauntlet', 'gauntlet', 'helmet_brown', 'helmet_grey', 'helmet_grey', 'chain', 'chain',
    'chain', 'chain', 'rifle', 'rifle', 'pistol_color', 'vest_green'];
  D.perks = [['装备', '获得阪神信用点增加', '10%', '永久'], ['装备', '获得装备晶片增加', '10%', '永久']];

  /* ---------- 伙伴 ---------- */
  D.partners = [
    {
      id: 'jiguang', name: '冀光', race: '人类', art: 'jiguang', title: '圣礼司铎 · 晨曦审视者',
      likes: 5, trust: 6, place: '新生乐园L2-01', trait: '威严的外表与阴鸷的内心', love: ['geiger', 'rouge'],
      file: { years: '30', birth: '新纪元 1月1日', star: '摩羯座', like: '教义、晨祷圣咏', hate: '无信仰者、失序喧嚣' },
      quotes: [
        '“晨曦会照亮每一寸迷途……包括你望向我的眼神。”',
        '“不必拘谨，在我面前，你可以卸下猎人的防备。”',
        '“信仰偶尔也会偏心，比如此刻，它替我留住了你。”',
      ],
    },
    {
      id: 'ling', name: '凌', race: '人类', art: 'ling', title: '暗夜行者 · 雾街潜影',
      likes: 0, trust: 0, place: '新生乐园L2-02', trait: '既有市侩、奸诈的一面，也有热心的一面。', love: ['papers', 'holo'],
      file: { years: '24', birth: '新纪元 11月7日', star: '天蝎座', like: '旧时代情报、夜风天台', hate: '虚伪契约、无聊说教' },
      quotes: [
        '“离我这么近？行啊，这趟夜路我免费替你护航。”',
        '“别听外头怎么传我，至少对你……我从不漫天要价。”',
        '“兜帽摘一半够不够？想看清我，得拿你的真心来换。”',
      ],
    },
    {
      id: 'maguangyao', name: '麻光耀', race: '人类', art: 'maguangyao', title: '首席学者 · 逆光棱镜',
      likes: 0, trust: 0, place: '新生乐园L2-03', trait: '热心但暗中抵抗阪神的科学家', love: ['holo', 'geiger'],
      file: { years: '27', birth: '新纪元 9月15日', star: '处女座', like: '全息棱镜推演、手冲黑咖', hate: '数据篡改、阪神监控令' },
      quotes: [
        '“心跳频率比平时快了 12%……是你靠近引起的观测误差吗？”',
        '“这枚棱镜里封存着旧时代真正的星空，只展示给你看。”',
        '“实验室夜里风凉，把我的外袍披上吧。”',
      ],
    },
    {
      id: 'linxiao', name: '林鸮', race: '改造者', art: 'linxiao', title: '智库顾问 · 温柔野心家',
      likes: 1, trust: 0, place: '新生乐园L2-04', trait: '希望建立自己势力，但又温和', love: ['can', 'perfume'],
      file: { years: '26', birth: '新纪元 10月19日', star: '天秤座', like: '白茶香氛、高空落地窗', hate: '盲目服从、粗劣改装' },
      quotes: [
        '“想要在这座乐园立足，温柔和锋芒缺一不可——就像你一样。”',
        '“我的蓝图里一直留着最核心的席位，在等你点头。”',
        '“累了就靠一会儿吧，接下来的棋局交给我。”',
      ],
    },
    {
      id: 'guxuan', name: '顾轩', race: '人类', art: 'guxuan', title: '天才少年 · 温室守望',
      likes: 1, trust: 0, place: '新生乐园L2-05', trait: '萌点：天才少年，奶狗恋爱', love: ['papers', 'can'],
      file: { years: '20', birth: '新纪元 5月21日', star: '双子座', like: '阳光花房、和你并肩散步', hate: '独自留守、苦味药剂' },
      quotes: [
        '“我算准了你今天会路过花房！手给我，带你去看新开的星芒花。”',
        '“别人叫我天才研究员，可我只想做你一个人的专属搭档。”',
        '“再多待五分钟好不好？就五分钟……”',
      ],
    },
    {
      id: 'yinsha', name: '银砂', race: '仿生人', art: 'yinsha', title: '银伶歌姬 · 星海缪斯',
      likes: 0, trust: 0, place: '新生乐园L2-06', trait: '职业化的状态与觉醒后自身思维的冲突', love: ['rouge', 'perfume'],
      file: { years: '???', birth: '出厂日 2月19日', star: '双鱼座', like: '星芒舞台、旧时代黑胶咏叹', hate: '格式化指令、冰冷橱窗' },
      quotes: [
        '“程序教我完美微笑，可只有看见你时，胸口才会泛起陌生的温度。”',
        '“今夜的安可曲没有写进剧本，是我私心唱给你一个人的。”',
        '“如果仿生人也会做梦，那一定长着暮光和你的模样。”',
      ],
    },
  ];
  // 礼物:只有「便携式盖革计数器」「旧时代气味罐头」的名字和说明出现在录屏里,其余是补的
  const G = (name, rare, base, icon, desc) => ({ name, kind: '情感礼物', rare, base, gift: true, icon: 'gift/' + icon + '.webp', desc });
  Object.assign(D.items, {
    geiger: G('便携式盖革计数器', 'blue', 10, 'geiger', '战前的古董。巴掌大小，能实时显示当前辐射值。地下城有些区域辐射忽高忽低，带一个能保命。'),
    can: G('旧时代气味罐头', 'purple', 20, 'can', '战前一家公司生产的气味保留装置。是一罐可以喷出“雨后柏油路”“地铁站烤红薯”等旧时代气味的喷雾。'),
    rouge: G('复古胭脂盒', 'blue', 10, 'rouge', '旧时代的手工胭脂，颜色依然鲜亮。'),
    papers: G('旧时代报纸', 'orange', 30, 'papers', '一叠泛黄的战前报纸，记录着已经消失的日常。'),
    holo: G('全息留影匣', 'orange', 30, 'holo', '能循环播放一段全息影像的小匣子。'),
    perfume: G('手工香水', 'orange', 30, 'perfume', '玻璃瓶装的手工香水，在地下城是稀罕物。'),
  });
  D.giftPools = { gift_green: ['geiger', 'rouge'], gift_blue: ['geiger', 'rouge'], gift_purple: ['can'], gift_orange: ['papers', 'holo', 'perfume'] };
  D.boxPools = { box_white: ['pistol', 'vest', 'chain'], box_green: ['helmet_brown', 'helmet_grey', 'chain', 'rifle', 'pistol_color', 'vest_green'], box_blue: ['choker', 'armor_pink', 'bracelet', 'gauntlet', 'boots'] };
  // 伙伴等级权益(录屏里拍到 1~10 级)
  D.partnerLv = [
    { reward: R('box_white', 1) }, { reward: R('special_card', 1) }, { perk: '可兑换权益', cost: 333 }, { word: '生命吸取+1%' }, { perk: '可兑换权益', cost: 498 },
    { reward: R('special_card', 1) }, { perk: '可兑换权益', cost: 998 }, { unlock: '每日赠礼次数+1' }, { reward: R('special_card', 2) }, { perk: '可兑换权益', cost: 1333 },
  ];
  // 每日委托:从这里面抽 3 条
  D.commissions = [
    { id: 'credit', title: '获得100阪神信用点。', ev: 'credit_gain', need: 100, heart: 2 },
    { id: 'supply1', title: '补给1次。', ev: 'supply', need: 1, heart: 1 },
    { id: 'supply2', title: '补给2次。', ev: 'supply', need: 2, heart: 2 },
    { id: 'box', title: '提交物品', submit: ['box_white', 10], heart: 2 },
    { id: 'white', title: '提交白色品质物品', submitRare: ['white', 3], heart: 3 },
  ];

  /* ---------- 冒险与玩法 ---------- */
  // 录屏里只打了圣物核心 05(对手林然,5 级,战力 1900)和峡谷探索号 2 节(裂壁灵,10 级,1.2 万);其余按这两个点外推
  D.zones = {
    core: { name: '圣物核心', part: 1, head: 'core', enemy: '林然', per: 380, desc: '霓虹雨夜，你需要接受圣物核心的试炼。' },
    hanshin: { name: '阪神公司', part: 2, head: 'core', enemy: '阪神安保', per: 2400, desc: '阪神公司的大楼戒备森严，想进去得先过安保这一关。' },
    museum: { name: '运动博物馆', part: 3, head: 'museum', enemy: '馆内守卫', per: 5200, desc: '运动博物馆的展厅里，有人不欢迎访客。' },
  };
  D.stageCount = 10;
  D.stageCost = 6;
  D.stageRewards = R('exp', 100, 'crystal', 10);
  D.stageDrop = R('credit', 10);
  D.modes = [['string', null], ['ring', null], ['catch', null], ['mine', 'mine'], ['gorge', 'gorge']];
  D.trains = {
    gorge: { name: '追光峡谷探索列车', car: '峡谷探索号', ev: 'gorge', enemy: '裂壁灵', powers: [4500, 12000, 19000, 26000, 33000],
      rewards: [R('box_white', 1), R('box_white', 2), R('box_white', 3), R('box_green', 1, 'box_white', 1), R('box_green', 2, 'box_white', 1)] },
    mine: { name: '地核矿山探索列车', car: '地核探索号', ev: 'mine', enemy: '掘地机', powers: [4500, 12000, 19000, 26000, 33000],
      rewards: [R('credit', 100), R('credit', 200), R('credit', 300), R('credit', 400), R('credit', 500)] },
  };
  // 排行榜:前三名的战力出现在录屏里,其余是补的
  D.rankers = [["Je t'aime", 84000], ['岩峰工程型', 41000], ['飞轮回声', 43000], ['Wraith', 39000], ['格里芬极光', 37000], ['离子哨兵', 35000],
    ['Watcher', 33000], ['飞轮工匠', 31000], ['光谱观测者', 29000], ['瓦尔基里心', 27000], ['流沙驱动器', 25500], ['熔岩裂谷', 24000]];

  /* ---------- 商城与补给 ---------- */
  const S = (id, n, name, price, limit, per) => ({ id, n, name, price, limit, per });
  D.shop = {
    pack: [S('box_white', 1, '白品装备补给箱', 10, 5, '每日'), S('box_green', 1, '绿品装备补给箱', 35, 5, '每日'), S('box_blue', 1, '蓝品装备补给箱', 110, 5, '每日')],
    mat: [S('special_card', 1, '特需补给卡*1', 400, 3, '每周'), S('supply_card', 10, '补给卡*10', 400, 99, '每日'), S('crystal', 100, '装备晶片*100', 50, 0, ''),
      S('gift_green', 1, '绿品好感道具箱', 10, 3, '每日'), S('gift_blue', 1, '蓝品好感道具箱', 20, 3, '每日'), S('gift_purple', 1, '紫品好感道具箱', 40, 3, '每日'), S('gift_orange', 1, '橙品好感道具箱', 100, 3, '每日')],
  };
  D.supply = [
    { name: '基础物资补给', card: 'supply_card', cost: 1, crystal: 1, ev: 'supply_basic', pool: ['pistol', 'vest', 'chain', 'helmet_grey', 'helmet_brown'] },
    { name: '高级物资补给', card: 'supply_card', cost: 1, crystal: 5, ev: 'supply_premium', pool: ['chain', 'rifle', 'pistol_color', 'vest_green', 'choker', 'bracelet', 'gauntlet', 'armor_pink', 'tuxedo'] },
    { name: '特级物资补给', card: 'special_card', cost: 4, crystal: 20, ev: 'supply_special', pool: ['choker', 'gauntlet', 'boots', 'armor_pink', 'tuxedo', 'hat', 'ring', 'pants'] },
  ];
})();
