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
  D.storyPlates = { 熊杰: ['story/xiong.jpg', 'l'], 吴谩: ['story/wu.jpg', 'r'], 银砂: ['story/yin.jpg', 'r'] };
})();
