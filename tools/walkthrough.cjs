#!/usr/bin/env node
/* 自动走查:在无头浏览器里把主要流程点一遍,有脚本报错或点不到的按钮就以非零状态退出。
 *
 * 用法:node tools/walkthrough.cjs [截图目录]
 * 需要 playwright(npm i playwright,或设置 NODE_PATH 指向已有的安装)。
 * 截图默认存到 .work/shots/,视口 360x781、2 倍像素,可以直接和录屏同一画面并排比。
 *
 * 每一步可以有:goto(打开 index.html 并附加这段地址)、click(选择器)、clickXY、drag、
 * eval(在页面里执行,抛错即算失败)、clock(把战斗时钟拨到第几秒)、wait(毫秒)、shot(截图名)。
 */
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.resolve(process.argv[2] || path.join(ROOT, '.work', 'shots'));
const FLOWS = [
  ["登录与主页", [
    {"goto": "?reset", "shot": "c1_notice"},
    {"click": "[data-act=notice-ok]", "wait": 200, "shot": "c1_login"},
    {"eval": "if(!NL.audio.playing())throw new Error('第一次点击后背景音乐没有开始播放')"},
    {"click": "[data-act=sound]", "wait": 150},
    {"eval": "if(NL.audio.on()||NL.audio.playing())throw new Error('点了开关,背景音乐没有停')"},
    {"click": "[data-act=sound]", "wait": 300},
    {"eval": "if(!NL.audio.playing())throw new Error('再点开关,背景音乐没有恢复')"},
    {"click": "[data-act=enter]", "wait": 300, "shot": "c1_loading"},
    {"wait": 2200, "shot": "c1_home_prompt"},
    {"click": ".dlg-btns .btn.purple", "wait": 300, "shot": "c1_home_guide"},
    {"drag": [200, 500, 60, 380], "wait": 200, "shot": "c1_home_drag"},
    {"click": ".pill.energy", "wait": 200, "shot": "c1_energy"},
  ]],
  ["任务与剧情", [
    {"goto": "?reset#home", "wait": 300},
    {"click": ".dlg-btns .btn.purple", "wait": 200},
    {"click": "[data-nav=mission]", "wait": 300, "shot": "c2_daily"},
    {"click": "[data-tab=task]", "wait": 300, "shot": "c2_task"},
    {"click": "[data-task=g1] .tk-title", "wait": 300, "shot": "c2_detail"},
    {"click": ".tk-reward-box .item:nth-child(2)", "wait": 300, "shot": "c2_info"},
    {"clickXY": [20, 760], "wait": 100},
    {"clickXY": [20, 760], "wait": 200},
    {"click": "[data-act-task=m1]", "wait": 1600, "shot": "c2_story_title"},
    {"clickXY": [180, 250], "wait": 500, "shot": "c2_story1"},
    {"clickXY": [180, 250], "wait": 100},
    {"clickXY": [180, 250], "wait": 600, "shot": "c2_story2"},
    {"clickXY": [180, 250], "wait": 300, "shot": "c2_choice"},
    {"click": ".story-choice button:nth-child(2)", "wait": 600, "shot": "c2_story3"},
    {"click": ".story-skip", "wait": 300, "shot": "c2_after_story"},
    {"click": "[data-claim=g1]", "wait": 500, "shot": "c2_reward"},
    {"click": ".reward-ok", "wait": 600, "shot": "c2_powerup"},
    {"click": "[data-sec=side]", "wait": 200},
    {"click": "[data-sec=explore]", "wait": 200, "shot": "c2_all"},
    {"click": "[data-act-task=s2]", "wait": 300},
    {"click": ".story-skip", "wait": 300},
    {"click": "[data-act-task=s2]", "wait": 400, "shot": "c2_qr"},
    {"click": "[data-act=fake-scan]", "wait": 400, "shot": "c2_scanned"},
    {"eval": "NL.game.track('rank_idle');NL.game.track('gorge');NL.go('mission')", "wait": 200},
    {"click": "[data-tab=daily]", "wait": 200},
    {"click": "[data-claim=d1]", "wait": 200, "shot": "c2_daily2"},
    {"click": "[data-nav=home]", "wait": 300, "shot": "c2_home_lv21"},
  ]],
  ["角色、仓库、伙伴", [
    {"goto": "?reset#home", "wait": 300},
    {"click": ".dlg-btns .btn.pink", "wait": 200},
    {"eval": "NL.game.grant([{id:'exp',n:100}]);NL.go('role')", "wait": 300, "shot": "c3_profile"},
    {"click": "[data-tab=equip]", "wait": 300, "shot": "c3_equip0"},
    {"click": "[data-slot=neck]", "wait": 300, "shot": "c3_gearwin"},
    {"click": "[data-act=wear]", "wait": 500, "shot": "c3_worn"},
    {"eval": "['head','hand2','hand3','hand4','pants','shoes'].forEach(function(s){var t=NL.data.slots.find(function(x){return x.id===s}).type;var g=NL.game.sortedGear().find(function(x){return NL.data.equips[x.id].type===t&&!NL.game.slotOf(x.uid)});NL.state.equipped[s]=g.uid;});NL.refresh();NL.game.power()", "log": "power", "wait": 2500, "shot": "c3_equip_full"},
    {"click": "[data-act=perks]", "wait": 300, "shot": "c3_perks"},
    {"clickXY": [20, 770], "wait": 200},
    {"click": "[data-tab=enh]", "wait": 200, "shot": "c3_enh"},
    {"click": "[data-act=iface]", "wait": 300, "shot": "c3_iface"},
    {"click": "[data-up=head]", "wait": 100},
    {"click": "[data-up=head]", "wait": 100},
    {"click": "[data-up=head]", "wait": 400, "shot": "c3_iface2"},
    {"click": ".back-btn", "wait": 200},
    {"click": "[data-tab=chip]", "wait": 200},
    {"click": "[data-chip='4']", "wait": 300, "shot": "c3_chip"},
    {"clickXY": [20, 770], "wait": 200},
    {"click": "[data-nav=bag]", "wait": 300, "shot": "c3_bag_item"},
    {"click": "[data-item=box_white]", "wait": 300, "shot": "c3_itemwin"},
    {"click": "[data-act=use]", "wait": 400, "shot": "c3_box_reward"},
    {"click": ".reward-ok", "wait": 300},
    {"click": "[data-tab=equip]", "wait": 300, "shot": "c3_bag_equip"},
    {"click": "[data-gear=vest_green]", "wait": 300, "shot": "c3_gear_detail"},
    {"clickXY": [20, 770], "wait": 200},
    {"click": "[data-nav=partner]", "wait": 300, "shot": "c3_plist"},
    {"click": "[data-partner=jiguang]", "wait": 300, "shot": "c3_pinfo"},
    {"click": "[data-act=parchive]", "wait": 300, "shot": "c3_archive"},
    {"clickXY": [20, 770], "wait": 200},
    {"click": "[data-act=pgift]", "wait": 300, "shot": "c3_gift"},
    {"click": "[data-act=send]", "wait": 300, "shot": "c3_gift_none"},
    {"click": ".back-btn", "wait": 200},
    {"click": "[data-act=plv]", "wait": 300, "shot": "c3_plv"},
    {"click": ".back-btn", "wait": 200},
    {"click": "[data-act=pdaily]", "wait": 300, "shot": "c3_pdaily"},
    {"click": "[data-act=pd-refresh]", "wait": 400, "shot": "c3_pdaily2"},
    {"click": ".back-btn", "wait": 200},
    {"click": ".back-btn", "wait": 200},
    {"click": "[data-partner=guxuan]", "wait": 300, "shot": "c3_guxuan"},
    {"click": "[data-act=parchive]", "wait": 300, "shot": "c3_archive2"},
  ]],
  ["冒险、战斗、玩法、排行榜、商城、补给", [
    {"goto": "?reset#home", "wait": 300},
    {"click": ".dlg-btns .btn.pink", "wait": 200},
    {"click": "[data-act=adventure]", "wait": 300},
    {"click": "[data-act=quick]", "wait": 200, "shot": "c4_adv"},
    {"click": "[data-zone=core]", "wait": 300, "shot": "c4_stages"},
    {"eval": "document.querySelector('.st-list').scrollTop=560", "wait": 200},
    {"click": "[data-stage='5']", "wait": 300, "shot": "c4_stagewin"},
    {"click": "[data-act=fight]", "wait": 500, "shot": "c4_bt_start"},
    {"wait": 1300, "shot": "c4_bt_mid"},
    {"eval": "document.querySelector('[data-act=skip]').click()", "wait": 700, "shot": "c4_bt_win"},
    {"clickXY": [180, 500], "wait": 300, "shot": "c4_after"},
    {"click": ".back-btn", "wait": 200},
    {"click": "[data-act=quick]", "wait": 100},
    {"click": "[data-zone=museum]", "wait": 300},
    {"eval": "document.querySelector('.st-list').scrollTop=900", "wait": 200, "shot": "c4_museum"},
    {"eval": "NL.go('modes')", "wait": 300, "shot": "c4_modes"},
    {"click": "[data-mode=string]", "wait": 300},
    {"eval": "document.querySelector('.md-list').scrollTop=500", "wait": 200},
    {"click": "[data-mode=gorge]", "wait": 300, "shot": "c4_train"},
    {"click": "[data-train='2']", "wait": 1400},
    {"eval": "document.querySelector('[data-act=skip]').click()", "wait": 700, "shot": "c4_train_win"},
    {"clickXY": [180, 500], "wait": 300},
    {"eval": "NL.go('rank')", "wait": 300, "shot": "c4_rank"},
    {"click": "[data-act=rk-info]", "wait": 300, "shot": "c4_rank_info"},
    {"clickXY": [20, 770], "wait": 200},
    {"click": "[data-act=rk-idle]", "wait": 400, "shot": "c4_rank_idle"},
    {"click": ".reward-ok", "wait": 300},
    {"click": "[data-act=rk-fight]", "wait": 1300},
    {"eval": "document.querySelector('[data-act=skip]').click()", "wait": 700},
    {"clickXY": [180, 500], "wait": 400, "shot": "c4_rank_after"},
    {"eval": "NL.go('shop')", "wait": 300, "shot": "c4_shop"},
    {"click": "[data-cat=mat]", "wait": 300, "shot": "c4_shop_mat"},
    {"click": "[data-buy=supply_card]", "wait": 300, "shot": "c4_shop_confirm"},
    {"click": ".dlg-btns .btn.purple", "wait": 400},
    {"click": ".reward-ok", "wait": 300},
    {"eval": "NL.go('supply')", "wait": 300, "shot": "c4_supply1"},
    {"click": "[data-act=sp-next]", "wait": 200},
    {"click": "[data-act=sp-next]", "wait": 300, "shot": "c4_supply3"},
    {"click": "[data-act=pull10]", "wait": 300, "shot": "c4_supply_confirm"},
    {"click": ".dlg-btns .btn.purple", "wait": 900, "shot": "c4_supply_result"},
    {"click": "[data-res='3']", "wait": 300, "shot": "c4_supply_gear"},
    {"clickXY": [20, 770], "wait": 200},
    {"click": ".back-btn", "wait": 300, "shot": "c4_supply_back"},
    {"eval": "JSON.stringify([NL.state.energy,NL.state.credit,NL.game.count('crystal'),NL.state.gear.length,NL.state.daily.c])", "log": "state"},
  ]],
  ["邮件、好友、个人等外围界面", [
    {"goto": "?reset#home", "wait": 300},
    {"click": ".dlg-btns .btn.pink", "wait": 200},
    {"click": "[data-act=mail]", "wait": 300, "shot": "c5_mail"},
    {"click": "[data-mail='0']", "wait": 300, "shot": "c5_mailwin"},
    {"click": "[data-act=mail-get]", "wait": 400},
    {"click": ".reward-ok", "wait": 300},
    {"click": "[data-act=mail-all]", "wait": 400},
    {"click": ".reward-ok", "wait": 300, "shot": "c5_mail_read"},
    {"click": ".back-btn", "wait": 200},
    {"click": "[data-act=friends]", "wait": 300, "shot": "c5_fr_empty"},
    {"click": "[data-tab=apply]", "wait": 200, "shot": "c5_fr_apply"},
    {"click": "[data-accept='书笙']", "wait": 200},
    {"click": "[data-accept='Yi']", "wait": 200},
    {"click": "[data-tab=add]", "wait": 200, "shot": "c5_fr_add"},
    {"click": "[data-tab=list]", "wait": 200, "shot": "c5_fr_list"},
    {"click": "[data-fight='Yi']", "wait": 1300},
    {"eval": "document.querySelector('[data-act=skip]').click()", "wait": 700},
    {"clickXY": [180, 500], "wait": 300},
    {"click": ".back-btn", "wait": 200},
    {"click": "[data-act=profile]", "wait": 300, "shot": "c5_profile"},
    {"click": "[data-act=bind]", "wait": 300},
    {"click": "[data-act=bind-open]", "wait": 300, "shot": "c5_bindwin"},
    {"eval": "var i=document.querySelectorAll('.bd-win .nl-input');i[0].value='13800000000';i[1].value='123456';document.querySelector('.bd-agree input').checked=true;1", "wait": 100},
    {"click": "[data-act=bind-ok]", "wait": 400, "shot": "c5_bind_reward"},
    {"click": ".reward-ok", "wait": 300, "shot": "c5_bound"},
    {"click": ".back-btn", "wait": 200},
    {"click": "[data-act=tickets]", "wait": 300, "shot": "c5_tickets"},
    {"click": ".back-btn", "wait": 200},
    {"click": "[data-act=ticketShop]", "wait": 300},
    {"click": ".back-btn", "wait": 200},
    {"click": "[data-act=pf-settings]", "wait": 300, "shot": "c5_settings"},
    {"clickXY": [20, 770], "wait": 200},
    {"click": ".back-btn", "wait": 300},
    {"click": "[data-act=calendar]", "wait": 300, "shot": "c5_calendar"},
    {"click": "[data-act=cal-filter]", "wait": 300, "shot": "c5_filter"},
    {"clickXY": [20, 770], "wait": 200},
    {"clickXY": [20, 770], "wait": 200},
    {"click": "[data-act=explore]", "wait": 300, "shot": "c5_interact"},
    {"clickXY": [20, 770], "wait": 200},
    {"click": "[data-act=faction]", "wait": 300, "shot": "c5_faction"},
    {"click": ".back-btn", "wait": 200},
    {"eval": "NL.go('parkmap')", "wait": 300, "shot": "c5_parkmap"},
    {"click": ".back-btn", "wait": 200},
    {"click": "[data-nav=mission]", "wait": 200},
    {"click": "[data-tab=task]", "wait": 300, "shot": "c5_mission_after_bind"},
    {"eval": "JSON.stringify([NL.state.bound,NL.state.friends,NL.state.mails.length,NL.state.tasks])", "log": "state"},
  ]],
  ["3D 战斗:格挡、爆发、击破、结算", [
    {"goto": "?reset#home", "wait": 300},
    {"click": ".dlg-btns .btn.pink", "wait": 200},
    {"click": "[data-act=mail]", "wait": 200},
    {"eval": "NL.loadThree().then(function(){NL.testClock=0;window.__bt=null;NL.ui.battle({enemy:{name:'林然',lv:5,power:9000},rewards:[{id:'exp',n:100},{id:'crystal',n:10}],onEnd:function(w){window.__bt=w;}});})", "wait": 1500},
    {"eval": "if(document.querySelector('.battle').dataset.renderer!=='3d')throw new Error('没有用上 3D 画面')"},
    {"eval": "if(NL.audio.playing())throw new Error('战斗中背景音乐应该暂停')"},
    {"clock": 1.0, "shot": "bt_intro"},
    {"clock": 2.6, "shot": "bt_windup"},
    {"clock": 2.87, "shot": "bt_hit"},
    {"clock": 3.55, "shot": "bt_cue"},
    {"clock": 3.7},
    {"click": "[data-act=block]"},
    {"clock": 3.8, "shot": "bt_block"},
    {"eval": "var hp=document.querySelector('.bt-card.me u').textContent;if(hp!=='94%')throw new Error('格挡后我方血量应为 94%(不格挡是 92%),实际 '+hp)"},
    {"clock": 5.8},
    {"eval": "var b=document.querySelector('[data-act=burst]');if(!b.classList.contains('ready'))throw new Error('能量应该已经攒满');b.click();if(!b.classList.contains('armed'))throw new Error('点了爆发没有生效')"},
    {"clock": 6.35, "shot": "bt_charge"},
    {"clock": 6.58, "shot": "bt_burst"},
    {"eval": "var hp=document.querySelector('.bt-card.foe u').textContent;if(hp!=='0%')throw new Error('爆发后对手应被击破,实际血量 '+hp)"},
    {"clock": 7.3, "shot": "bt_ko"},
    {"clock": 7.78, "shot": "bt_shatter"},
    {"clock": 8.6, "wait": 400, "shot": "bt_result"},
    {"clickXY": [180, 500], "wait": 400},
    {"eval": "NL.testClock=null;if(window.__bt!==true)throw new Error('战斗应该获胜');if(!NL.audio.playing())throw new Error('战斗结束后背景音乐没有接着放')"},
  ]],
  ["没有 WebGL 时退回 2D 战斗", [
    {"goto": "?reset#home", "wait": 300},
    {"click": ".dlg-btns .btn.pink", "wait": 200},
    {"eval": "NL.loadThree=function(){return Promise.resolve(false)};NL.testClock=0;window.__bt=null;NL.ui.battle({enemy:{name:'林然',lv:5,power:60000},onEnd:function(w){window.__bt=w;}})", "wait": 800},
    {"eval": "if(document.querySelector('.battle').dataset.renderer!=='2d')throw new Error('应该退回 2D 画面')"},
    {"clock": 2.8, "shot": "bt2d_dash"},
    {"clock": 3.2, "shot": "bt2d_after"},
    {"eval": "document.querySelector('[data-act=skip]').click()", "wait": 700, "shot": "bt2d_lose"},
    {"clickXY": [180, 500], "wait": 400},
    {"eval": "NL.testClock=null;if(window.__bt!==false)throw new Error('战力远低于对手,应该失败')"},
  ]],
];

(async () => {
  // 版本号过期会让线上的老访客看到新旧混杂的页面,所以先查这个
  let bad = 0;
  try { require('child_process').execFileSync('python3', [path.join(__dirname, 'stamp.py'), '--check'], { stdio: 'pipe' }); console.log('✓ 版本号是最新的'); }
  catch (e) { if (e.status === 1) { bad++; console.log('✗ ' + String(e.stdout).trim()); } else console.log('- 跳过版本号检查(没有 python3)'); }
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const base = 'file://' + path.join(ROOT, 'index.html');
  for (const [title, steps] of FLOWS) {
    const page = await browser.newPage({ viewport: { width: 360, height: 781 }, deviceScaleFactor: 2 });
    const errs = [];
    page.on('pageerror', (e) => errs.push('脚本报错: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('控制台报错: ' + m.text()); });
    for (const s of steps) {
      if (s.goto !== undefined) { await page.goto(base + s.goto); await page.waitForTimeout(350); }
      if (s.click) await page.click(s.click, { timeout: 3000 }).catch(() => errs.push('点不到: ' + s.click));
      if (s.clickXY) await page.mouse.click(s.clickXY[0], s.clickXY[1]);
      if (s.drag) { await page.mouse.move(s.drag[0], s.drag[1]); await page.mouse.down(); await page.mouse.move(s.drag[2], s.drag[3], { steps: 6 }); await page.mouse.up(); }
      if (s.eval) await page.evaluate(s.eval).catch((e) => errs.push('执行失败: ' + e.message));
      if (s.clock != null) { // 每次拨 1/30 秒并等一帧,特效才会跟着走
        let cur = await page.evaluate(() => NL.testClock || 0);
        while (cur < s.clock - 1e-6) { cur = Math.min(s.clock, cur + 1 / 30); await page.evaluate((t) => new Promise((r) => { NL.testClock = t; requestAnimationFrame(() => requestAnimationFrame(r)); }), cur); }
      }
      if (s.wait) await page.waitForTimeout(s.wait);
      if (s.shot) await page.screenshot({ path: path.join(SHOTS, s.shot + '.png') });
    }
    console.log((errs.length ? '✗ ' : '✓ ') + title + (errs.length ? '\n  ' + errs.join('\n  ') : ''));
    bad += errs.length;
    await page.close();
  }
  await browser.close();
  console.log(bad ? '共 ' + bad + ' 个问题' : '全部通过,截图在 ' + SHOTS);
  process.exit(bad ? 1 : 0);
})();
