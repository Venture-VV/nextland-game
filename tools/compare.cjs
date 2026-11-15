#!/usr/bin/env node
/* 逐页对照:把网页版摆到和录屏某一帧相同的状态,截图,交给 compare.py 和那一帧并排比。
 *
 * 用法:node tools/compare.cjs [只跑名字里含这段字的用例]   然后   python3 tools/compare.py
 * 截图存到 .work/compare/,用例清单存到 .work/compare/cases.json。
 *
 * 每个用例:[名字, 录屏帧号(每秒 2 帧,第 n 帧是 (n-1)/2 秒), 说明, 步骤, 不参与比较的区域]
 * 步骤和 walkthrough.cjs 一样(goto / click / clickXY / eval / wait)。区域是 [x, y, 宽, 高],按 360×781 算。
 */
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '.work', 'compare');

// 页面里用的小工具:把存档摆成录屏当时的样子
const HELP = `window.T = {
  base: function (o) { var s = NL.state; s.guide = 'off'; Object.assign(s, o || {}); NL.save(); },
  after: function (o) { T.base(Object.assign({ level: 21, exp: 50, credit: 99702, tasks: { g1: { done: true } } }, o || {})); },
  wear: function () { var m = { head: 'hat', neck: 'neck_gold', hand2: 'gauntlet', hand3: 'ring', hand4: 'glove_white', pants: 'pants', shoes: 'boots' };
    Object.keys(m).forEach(function (sl) { var g = NL.state.gear.find(function (x) { return x.id === m[sl] && !NL.game.slotOf(x.uid); }); if (g) NL.state.equipped[sl] = g.uid; }); NL.save(); },
  story: async function (untilSel) { for (var i = 0; i < 30 && !document.querySelector(untilSel); i++) { document.querySelector('.story').click(); await new Promise(function (r) { setTimeout(r, 130); }); } },
};`;
const go = (hash, js, extra) => [{ goto: '?reset#' + hash }, { eval: js, wait: 350 }].concat(extra || []);
const CLOCK = [15, 225, 330, 30];
const NOTIFY = [0, 0, 360, 34]; // 录屏顶部偶尔有手机的通知横幅
const CASES = [
  ['01_notice', 3, '防沉迷公告', [{ goto: '?reset', wait: 300 }]],
  ['02_login', 7, '登录', [{ goto: '?reset' }, { click: '[data-act=notice-ok]' }]],
  ['03_home_prompt', 15, '主页:线下引导询问', [{ goto: '?reset#home', wait: 300 }]],
  ['04_home_guide', 25, '主页:引导提示', [{ goto: '?reset#home' }, { click: '.dlg-btns .btn.purple' }]],
  ['05_mission_daily_guide', 28, '任务:日常(引导中)', go('parkmap', "T.base({guide:'on',guideStep:0});NL.go('mission')"), [CLOCK]],
  ['06_mission_task_guide', 37, '任务:任务页签(引导中)', go('parkmap', "T.base({guide:'on',guideStep:0});NL.go('mission')", [{ click: '[data-tab=task]' }]), [[95, 122, 170, 30]]],
  ['07_task_detail', 39, '任务详情', go('parkmap', "T.base({guide:'on',guideStep:0});NL.go('mission')", [{ click: '[data-tab=task]' }, { click: '[data-task=g1] .tk-title' }])],
  ['08_story_choice', 73, '剧情:选项', go('mission', 'T.base()', [{ click: '[data-tab=task]' }, { click: '[data-act-task=m1]', wait: 1500 }, { eval: "T.story('.story-choice')", wait: 200 }])],
  ['09_story_line', 82, '剧情:对白', go('mission', 'T.base()', [{ click: '[data-tab=task]' }, { click: '[data-act-task=m1]', wait: 1500 }, { eval: "T.story('.story-choice')" }, { click: '.story-choice button:nth-child(2)', wait: 900 }, { clickXY: [180, 250], wait: 1800 }])],
  ['10_reward', 125, '获得物品', go('mission', 'T.base()', [{ click: '[data-tab=task]' }, { click: '[data-claim=g1]', wait: 500 }])],
  ['11_task_after', 134, '任务:领取后', go('mission', "T.base({guide:'on',guideStep:1,tasks:{m1:{done:true,story:true}}})", [{ click: '[data-tab=task]' }, { click: '[data-claim=g1]' }, { click: '.reward-ok', wait: 2800 }]), [NOTIFY]],
  ['12_item_info', 147, '物品说明', go('mission', 'T.after()', [{ click: '[data-tab=task]' }, { click: '[data-task=g2] .tk-title' }, { click: '.tk-reward-box .item:nth-child(2)' }])],
  ['13_task_sections', 163, '任务:主线与支线', go('parkmap', "T.after({tasks:{g1:{done:true},m1:{done:true,story:true},s2:{story:true},s3:{story:true}}});NL.go('mission')", [{ click: '[data-tab=task]' }, { click: '[data-sec=side]' }, { eval: "document.querySelector('.tk-list').scrollTop=37" }])],
  ['14_qr', 167, '出示互动码', go('parkmap', "T.after({tasks:{g1:{done:true},m1:{done:true,story:true},s2:{story:true},s3:{story:true}}});NL.go('mission')", [{ click: '[data-tab=task]' }, { click: '[data-sec=side]' }, { click: '[data-act-task=s2]' }])],
  ['15_mission_daily', 912, '任务:日常', go('parkmap', "T.after();NL.game.track('rank_idle');NL.game.track('gorge');NL.go('mission')"), [CLOCK]],
  ['20_partner_list', 195, '伙伴列表', go('partner', 'T.base()')],
  ['21_partner_info', 199, '伙伴协议:冀光', go('parkmap', "T.base();NL.go('partnerInfo',{id:'jiguang'})")],
  ['22_partner_lv', 203, '伙伴等级权益', go('parkmap', "T.after();NL.go('partnerLv',{id:'jiguang'})")],
  ['23_partner_visual', 228, '视觉档案', go('parkmap', "T.base();NL.go('partnerVisual',{id:'jiguang'})")],
  ['24_partner_daily', 239, '每日委托', go('parkmap', "T.after();NL.go('partnerDaily',{id:'jiguang'})"), [[14, 86, 206, 26]]],
  ['25_partner_gift', 261, '赠礼', go('parkmap', "T.after();NL.state.partners={jiguang:{lv:1,trust:8,likes:5,claimed:{}}};NL.go('partnerGift',{id:'jiguang'})")],
  ['26_partner_archive', 273, '伙伴档案', go('parkmap', "T.base();NL.go('partnerInfo',{id:'jiguang'})", [{ click: '[data-act=parchive]' }])],
  ['27_partner_ling', 284, '伙伴协议:凌', go('parkmap', "T.base();NL.go('partnerInfo',{id:'ling'})")],
  ['28_partner_yinsha', 311, '伙伴协议:银砂', go('parkmap', "T.base();NL.go('partnerInfo',{id:'yinsha'})")],
  ['29_partner_linxiao', 346, '伙伴协议:林鸮', go('parkmap', "T.base();NL.go('partnerInfo',{id:'linxiao'})")],
  ['30_role_profile', 379, '角色:档案', go('parkmap', "T.after();NL.state.guide='on';NL.state.guideStep=2;NL.go('role')")],
  ['31_role_perks', 393, '权益加成', go('parkmap', "T.after();NL.state.guide='on';NL.state.guideStep=2;NL.go('role')", [{ click: '[data-act=perks]' }])],
  ['32_role_equip', 422, '角色:装备(全部穿戴)', go('parkmap', "T.after();T.wear();NL.state.guide='on';NL.state.guideStep=2;NL.go('role')", [{ click: '[data-tab=equip]' }])],
  ['33_role_enh', 425, '角色:强化', go('parkmap', "T.after();T.wear();NL.state.guide='on';NL.state.guideStep=2;NL.go('role')", [{ click: '[data-tab=enh]' }])],
  ['34_iface', 427, '接口升级', go('parkmap', "T.after();T.wear();NL.go('iface')")],
  ['35_role_chip', 470, '角色:芯片', go('parkmap', "T.after();T.wear();NL.state.guide='on';NL.state.guideStep=2;NL.go('role')", [{ click: '[data-tab=chip]' }])],
  ['36_chip_win', 462, '选择芯片', go('parkmap', "T.after();T.wear();NL.state.guide='on';NL.state.guideStep=2;NL.go('role')", [{ click: '[data-tab=chip]' }, { click: "[data-chip='4']" }])],
  ['40_bag_item', 473, '仓库:道具', go('parkmap', "T.after();NL.go('bag')")],
  ['41_bag_equip', 479, '仓库:装备', go('parkmap', "T.after();T.wear();NL.go('bag')", [{ click: '[data-tab=equip]' }])],
  ['42_gear_detail', 487, '装备详情', go('parkmap', "T.after();T.wear();NL.go('bag')", [{ click: '[data-tab=equip]' }, { click: '[data-gear=vest_green]' }])],
  ['50_stages', 555, '关卡列表', go('parkmap', "T.after({energy:54});NL.go('stages',{zone:'core'})")],
  ['51_stage_detail', 534, '关卡详情', go('parkmap', "T.after();NL.go('stages',{zone:'core'})", [{ eval: "document.querySelector('.st-list').scrollTop=560" }, { click: "[data-stage='5']" }])],
  ['52_interact', 575, '互动', go('parkmap', "T.after({credit:99692,energy:54});NL.go('adventure')", [{ clickXY: [298, 661] }])],
  ['60_shop_pack', 591, '商城:资源包', go('parkmap', "T.after({credit:99692});NL.go('shop')")],
  ['61_shop_mat', 593, '商城:材料', go('parkmap', "T.after({credit:99692});NL.go('shop')", [{ click: '[data-cat=mat]' }])],
  ['62_shop_buy', 588, '商城:购买窗', go('parkmap', "T.after({credit:99692});NL.go('shop')", [{ click: '[data-buy=box_blue]' }])],
  ['63_supply1', 603, '补给:基础', go('parkmap', "T.after({credit:99692});NL.state.bag.supply_card=1;NL.go('supply')")],
  ['64_supply2', 612, '补给:高级', go('parkmap', "T.after({credit:99692});NL.state.bag.supply_card=1;NL.go('supply')", [{ click: '[data-act=sp-next]' }])],
  ['65_supply3', 615, '补给:特级', go('parkmap', "T.after({credit:99692});NL.state.bag.supply_card=1;NL.go('supply')", [{ click: '[data-act=sp-next]' }, { click: '[data-act=sp-next]' }])],
  ['66_supply_confirm', 618, '补给:确认', go('parkmap', "T.after({credit:99692});NL.state.bag.supply_card=1;NL.go('supply')", [{ click: '[data-act=sp-next]' }, { click: '[data-act=sp-next]' }, { click: '[data-act=pull10]' }])],
  ['67_supply_result', 640, '补给:结果', go('parkmap', "T.after({credit:99692});NL.state.bag.supply_card=1;NL.go('supply')", [{ click: '[data-act=sp-next]' }, { click: '[data-act=sp-next]' }, { click: '[data-act=pull10]' }, { click: '.dlg-btns .btn.purple', wait: 1200 }])],
  ['70_modes', 695, '玩法', go('parkmap', "T.after({credit:99692});NL.go('modes')")],
  ['71_train', 656, '探索列车', go('parkmap', "T.after({credit:99692});T.wear();NL.go('train',{id:'gorge'})"), [[15, 178, 330, 28]]],
  ['72_rank', 718, '排行榜', go('parkmap', "T.after();NL.go('rank')"), [[296, 166, 60, 20]]],
  ['73_rank_rewards', 720, '排名奖励', go('parkmap', "T.after();NL.go('rank')", [{ click: '[data-act=rk-info]' }])],
  ['80_calendar', 745, '活动日历', go('parkmap', "T.after({credit:99692,energy:54});NL.go('home')", [{ click: '[data-act=calendar]' }])],
  ['81_cal_filter', 753, '日历筛选', go('parkmap', "T.after({credit:99692,energy:54});NL.go('home')", [{ click: '[data-act=calendar]' }, { click: '[data-act=cal-filter]' }])],
  ['82_faction', 736, '种族与势力', go('faction', 'T.base()')],
  ['83_parkmap', 772, '园区平面图', go('parkmap', 'T.base()')],
  ['84_friends_empty', 784, '好友:空', go('friends', 'T.base()')],
  ['85_friends_list', 791, '好友列表', go('friends', 'T.base()', [{ click: '[data-tab=apply]' }, { click: "[data-accept='书笙']" }, { click: "[data-accept='Yi']" }, { click: '[data-tab=list]', wait: 2300 }]), [[15, 198, 330, 28]]],
  ['86_friends_add', 793, '添加好友', go('friends', 'T.base()', [{ click: '[data-tab=add]' }])],
  ['87_mail', 802, '邮件', go('mail', 'T.base()')],
  ['88_mail_read', 823, '邮件:已读', go('mail', 'T.base();NL.state.mails=NL.state.mails.filter(function(m){return m.k!==0&&m.k!==2});NL.refresh()', [{ click: '[data-act=mail-all]' }, { click: '.reward-ok', wait: 2600 }])],
  ['89_settings', 830, '设置', go('parkmap', "T.after({credit:99692,energy:54});NL.go('home')", [{ click: '[data-act=settings]' }])],
  ['90_profile', 849, '个人', go('parkmap', "T.after({credit:99692});NL.go('profile')")],
  ['91_tickets', 854, '我的票券', go('tickets', 'T.base()')],
  ['92_ticket_shop', 862, '票券商店', go('ticketShop', 'T.base()')],
  ['93_bind', 880, '绑定管理', go('bind', 'T.base()')],
  ['94_bind_win', 878, '绑定会员', go('bind', 'T.base()', [{ click: '[data-act=bind-open]' }])],
];

(async () => {
  const only = process.argv[2];
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const base = 'file://' + path.join(ROOT, 'index.html');
  const done = [];
  for (const [id, frame, title, steps, mask] of CASES) {
    if (only && !id.includes(only)) continue;
    const page = await browser.newPage({ viewport: { width: 360, height: 781 }, deviceScaleFactor: 2 });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    for (const s of steps) {
      if (s.goto !== undefined) { await page.goto(base + s.goto.replace(/^(\?[^#]*)?/, (q) => (q ? q + '&' : '?') + 'motion=orig')); await page.waitForTimeout(300); await page.evaluate(HELP); }
      if (s.click) await page.click(s.click, { timeout: 3000 }).catch(() => errs.push('点不到 ' + s.click));
      if (s.clickXY) await page.mouse.click(s.clickXY[0], s.clickXY[1]);
      if (s.eval) await page.evaluate(s.eval).catch((e) => errs.push(e.message.split('\n')[0]));
      await page.waitForTimeout(s.wait || 250);
    }
    await page.evaluate(() => { const b = document.querySelector('#sound-btn'); if (b) b.style.visibility = 'hidden'; }); // 声音开关是网页版加的,不参与比较
    await page.screenshot({ path: path.join(OUT, id + '.png') });
    await page.close();
    done.push({ id, frame, title, mask: mask || [] });
    console.log((errs.length ? '✗ ' : '✓ ') + id + (errs.length ? '  ' + errs.join(' | ') : ''));
  }
  await browser.close();
  if (!only) fs.writeFileSync(path.join(OUT, 'cases.json'), JSON.stringify(done, null, 1));
})();
