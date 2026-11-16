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
    {"click": "[data-buy=supply_card]", "wait": 300, "shot": "c4_shop_buy"},
    {"click": "[data-act=buy-plus]", "wait": 150},
    {"eval": "if(document.querySelector('.buy-bar b').textContent!=='800')throw new Error('买 2 份应该共花费 800')"},
    {"click": "[data-act=buy-ok]", "wait": 400},
    {"eval": "if(NL.game.count('supply_card')!==20)throw new Error('买 2 份补给卡*10 应该到手 20 张')"},
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
    {"click": "[data-act=set-beat]", "wait": 150},
    {"eval": "if(NL.state.beat!==false)throw new Error('「3D 节拍对决」开关没有关上')"},
    {"click": "[data-act=set-beat]", "wait": 150},
    {"eval": "if(NL.state.beat!==true)throw new Error('「3D 节拍对决」开关没有重新打开')"},
    {"click": "[data-act=set-motion]", "wait": 150},
    {"eval": "if(NL.state.motion!=='orig'||document.documentElement.dataset.motion!=='orig')throw new Error('「升级动效」开关没有关上')"},
    {"click": "[data-act=set-motion]", "wait": 150},
    {"eval": "if(NL.state.motion!=='plus'||document.documentElement.dataset.motion!=='plus')throw new Error('「升级动效」开关没有重新打开')"},
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
  ["原版战斗:自动对撞、击破、结算;卸下与替换装备", [
    {"goto": "?reset#home", "wait": 300},
    {"click": ".dlg-btns .btn.pink", "wait": 200},
    {"eval": "if(NL.state.beat!==true)throw new Error('默认应该是 3D 节拍对决')"},
    {"eval": "NL.state.beat=false;NL.testClock=0;window.__bt=null;NL.ui.battle({enemy:{name:'林然',lv:5,power:1900},rewards:[{id:'exp',n:100},{id:'crystal',n:10}],onEnd:function(w){window.__bt=w}});1", "wait": 800},
    {"eval": "if(document.querySelector('.battle').dataset.renderer!=='classic')throw new Error('关掉「3D 节拍对决」后应该是原版战斗')"},
    {"clock": 1.0, "wait": 100, "shot": "c8_classic_banner"},
    {"clock": 3.3, "wait": 100, "shot": "c8_classic_appear"},
    {"clock": 3.75, "wait": 100, "shot": "c8_classic_hit"},
    {"clock": 5.9, "wait": 100, "shot": "c8_classic_glow"},
    {"clock": 6.5, "wait": 100, "shot": "c8_classic_burst"},
    {"clock": 8.1, "wait": 500, "shot": "c8_classic_result"},
    {"eval": "if(!document.querySelector('.bt-result'))throw new Error('8 秒后应该出结算')"},
    {"clickXY": [180, 520], "wait": 400},
    {"eval": "NL.testClock=null;if(window.__bt!==true)throw new Error('战力高于对手,应该获胜');if(document.querySelector('.battle'))throw new Error('战斗画面没有关掉')"},
    {"eval": "window.__bt=null;NL.ui.battle({enemy:{name:'林然',lv:5,power:900000},onEnd:function(w){window.__bt=w}});1", "wait": 800},
    {"eval": "document.querySelector('[data-act=skip]').click()", "wait": 700, "shot": "c8_classic_lose"},
    {"clickXY": [180, 520], "wait": 400},
    {"eval": "if(window.__bt!==false)throw new Error('战力远低于对手,应该失败')"},
    {"eval": "NL.go('role')", "wait": 300},
    {"click": "[data-tab=equip]", "wait": 300},
    {"click": "[data-slot=armor]", "wait": 300, "shot": "c8_worn_detail"},
    {"click": "[data-act=unwear]", "wait": 400},
    {"eval": "if(NL.state.equipped.armor)throw new Error('卸下后护甲格应该是空的')"},
    {"click": "[data-slot=armor]", "wait": 300, "shot": "c8_pick"},
    {"click": "[data-act=wear]", "wait": 400},
    {"eval": "if(!NL.state.equipped.armor)throw new Error('重新穿戴后护甲格应该有装备')"},
    {"eval": "NL.state.stages.museum=7;NL.state.energy=60;NL.go('stages',{zone:'museum'});if(NL.game.power()>=NL.data.zones.museum.per*8)throw new Error('走查假设这时打不过运动博物馆第 8 关');1", "wait": 300},
    {"click": "[data-stage='8']", "wait": 300},
    {"click": "[data-act=fight]", "wait": 1500},
    {"eval": "document.querySelector('[data-act=skip]').click()", "wait": 800},
    {"clickXY": [180, 520], "wait": 500},
    {"eval": "if(NL.state.stages.museum!==7)throw new Error('战力不够,这一关不应该打得过');if(NL.state.energy!==59)throw new Error('挑战失败应该返还 5 点精力(只扣 1 点),现在是 '+NL.state.energy)"},
    {"eval": "NL.go('bag')", "wait": 300},
    {"click": "[data-tab=equip]", "wait": 300},
    {"eval": "window.__n=NL.state.gear.length;document.querySelector('.bag-grid [data-gear=chain]').click()", "wait": 300},
    {"click": "[data-act=dismantle]", "wait": 300, "shot": "c8_dismantle_ask"},
    {"eval": "if(NL.state.gear.length!==window.__n)throw new Error('分解应该先弹确认')"},
    {"click": ".dlg-btns .btn.purple", "wait": 400},
    {"eval": "if(NL.state.gear.length!==window.__n-1)throw new Error('确认后应该分解掉一件')"},
    {"click": ".reward-ok", "wait": 300},
    {"eval": "var g=NL.state.gear.find(function(x){return x.id==='neck_gold'&&!NL.game.slotOf(x.uid)});if(!g)throw new Error('走查假设仓库里有一条没穿的金链吊坠(紫品)');document.querySelector('.bag-grid [data-gear=neck_gold]').click()", "wait": 300},
    {"click": "[data-act=dismantle]", "wait": 300},
    {"click": ".dlg-btns .btn.purple", "wait": 300},
    {"eval": "if(NL.state.gear.length!==window.__n-1)throw new Error('紫品装备应该再确认一次才分解')"},
    {"click": ".dlg-btns .btn.purple", "wait": 400},
    {"eval": "if(NL.state.gear.length!==window.__n-2)throw new Error('第二次确认后才分解掉紫品装备')"},
    {"click": ".reward-ok", "wait": 300},
  ]],
  ["动效:退场影子、奖励飞入与数字滚动、两档切换、减少动态效果", [
    {"goto": "?reset#home", "wait": 500},
    {"click": ".dlg-btns .btn.pink", "wait": 60},
    {"eval": "if(document.querySelectorAll('.m-ghost').length!==1)throw new Error('关掉弹窗后应该留下一个退场影子')"},
    {"wait": 500},
    {"eval": "if(document.querySelector('.m-ghost'))throw new Error('退场影子应该在 0.5 秒内清掉')"},
    {"eval": "window.__c0=NL.state.credit;NL.game.award([{id:'credit',n:500},{id:'box_white',n:1}]);1", "wait": 700, "shot": "c9_reward"},
    {"click": ".reward-ok", "wait": 120, "shot": "c9_fly"},
    {"eval": "if(document.querySelectorAll('.m-fly').length!==2)throw new Error('关掉奖励后两个图标应该飞向资源栏和仓库')"},
    {"wait": 1500},
    {"eval": "var t=document.querySelector('#screen .pill img[src*=ico_coin]').parentNode.querySelector('span').textContent;if(t!==String(window.__c0+500))throw new Error('资源栏的数字应该滚到 '+(window.__c0+500)+',现在是 '+t);if(document.querySelector('.m-fly'))throw new Error('飞行的图标没有清掉')"},
    {"eval": "var d=document.createElement('div');document.querySelector('#layers').appendChild(d);NL.motion.odometer(d,'+889');var n=d.querySelectorAll('.d').length;d.remove();if(n!==3)throw new Error('滚动数字应该有 3 位')"},
    {"eval": "NL.motion.pixels({mode:'radial',ms:400,onMid:function(){window.__mid=true}});1", "wait": 120, "shot": "c9_pixels"},
    {"eval": "if(!document.querySelector('.m-pixels'))throw new Error('像素块转场没有出现')"},
    {"wait": 600},
    {"eval": "if(!window.__mid||document.querySelector('.m-pixels'))throw new Error('像素块转场应该在中途换内容,结束后清掉')"},
    {"eval": "NL.state.motion='orig';NL.motion.apply();NL.ui.settings();1", "wait": 80},
    {"eval": "if(getComputedStyle(document.querySelector('.set-win')).animationName!=='none')throw new Error('原版档的弹窗应该直接出现')"},
    {"clickXY": [20, 770], "wait": 40},
    {"eval": "if(document.querySelector('.m-ghost'))throw new Error('原版档不应该有退场影子')"},
    {"eval": "NL.state.motion='plus';NL.testReduced=true;NL.motion.apply();NL.ui.settings();1", "wait": 60},
    {"eval": "var w=document.querySelector('.set-win'),c=getComputedStyle(w);if(c.animationName!=='m-fade')throw new Error('减少动态效果时弹窗只应该淡入,现在是 '+c.animationName);if(c.transform!=='none')throw new Error('减少动态效果时不应该有位移或缩放')"},
    {"eval": "if(NL.motion.enter(document.createElement('div'),'pop')!=='fade')throw new Error('减少动态效果时进场应该只是淡入');if(NL.motion.on())throw new Error('减少动态效果时不应该放开位移')"},
    {"clickXY": [20, 770], "wait": 300},
    {"eval": "NL.testReduced=null;NL.motion.apply();1"},
  ]],
  ["表里切换:主页一键翻面、设置里翻回来", [
    {"goto": "?reset#home", "wait": 400},
    {"click": ".dlg-btns .btn.pink", "wait": 300},
    {"eval": "if(document.documentElement.dataset.skin!=='li')throw new Error('默认应该是里')"},
    {"eval": "window.__save0=JSON.stringify(Object.assign({},NL.state,{skin:0}))"},
    {"click": "[data-act=skin]", "wait": 400, "shot": "c10_flip"},
    {"eval": "if(!document.querySelector('.m-pixels'))throw new Error('翻面时应该有像素块转场')"},
    {"wait": 1100, "shot": "c10_biao_home"},
    {"eval": "if(NL.state.skin!=='biao'||document.documentElement.dataset.skin!=='biao')throw new Error('点翻面按钮后应该到表');if(document.querySelector('.m-pixels'))throw new Error('转场结束后像素块没有清掉')"},
    {"eval": "if(JSON.stringify(Object.assign({},NL.state,{skin:0}))!==window.__save0)throw new Error('翻面只应该改皮肤,存档里别的不能变')"},
    {"eval": "if(!document.querySelector('.bh-zones'))throw new Error('表的主页应该用自己的画法');if(document.querySelectorAll('.bh-zones [data-building]').length!==NL.data.buildings.length)throw new Error('表的主页应该给每栋建筑一个入口')"},
    {"click": "[data-building=core]", "wait": 500},
    {"eval": "if(NL.current().name!=='stages')throw new Error('表里点地点应该和里点建筑一样进关卡')"},
    {"click": ".back-btn", "wait": 400},
    {"click": "[data-act=shop]", "wait": 400},
    {"click": ".back-btn", "wait": 400},
    {"click": "[data-nav=mission]", "wait": 400},
    {"click": "[data-tab=task]", "wait": 300, "shot": "c10_biao_mission"},
    {"click": "[data-task=g1] .tk-title", "wait": 500, "shot": "c10_biao_win"},
    {"clickXY": [20, 770], "wait": 300},
    {"click": "[data-nav=role]", "wait": 400, "shot": "c10_biao_role"},
    {"eval": "if(!document.querySelector('.br-panel'))throw new Error('表的角色页应该用自己的画法')"},
    {"click": "[data-tab=equip]", "wait": 300, "shot": "c10_biao_role_equip"},
    {"eval": "if(document.querySelectorAll('.br-slots [data-slot]').length!==10)throw new Error('表的角色页应该有 10 个装备格')"},
    {"click": "[data-slot=armor]", "wait": 400},
    {"eval": "if(!document.querySelector('.win .gw-name'))throw new Error('表里点装备格应该和里一样打开装备窗')"},
    {"clickXY": [20, 770], "wait": 300},
    {"click": "[data-tab=chip]", "wait": 300},
    {"click": "[data-chip='4']", "wait": 400},
    {"clickXY": [20, 770], "wait": 300},
    {"click": "[data-act=perks]", "wait": 400},
    {"clickXY": [20, 770], "wait": 300},
    {"click": "[data-tab=profile]", "wait": 300},
    {"eval": "if(NL.img('item/exp.webp')!=='assets/biao/item/exp.svg')throw new Error('表的物品图标应该指到矢量版');var p=NL.img('no/such.png');if(p!=='assets/img/no/such.png'||!NL.skinMiss['no/such.png'])throw new Error('表没画的图应该借用里的,并记进欠账');delete NL.skinMiss['no/such.png'];'表借用里的图 '+Object.keys(NL.skinMiss).length+' 张'", "log": "skin"},
    {"eval": "var n=document.querySelector('#nav');if(n.dataset.on!=='role'||n.style.backgroundImage)throw new Error('表的底部导航应该是样式画的,并标出当前页');if(getComputedStyle(document.querySelector('#capsule')).display!=='none')throw new Error('表不画微信胶囊')"},
    {"click": "[data-nav=partner]", "wait": 500, "shot": "c10_biao_plist"},
    {"eval": "if(!document.querySelector('.bp-grid'))throw new Error('表的伙伴列表应该用自己的画法');if(document.querySelectorAll('.bp-card').length!==6)throw new Error('表的伙伴列表应该有 6 张卡')"},
    {"click": "[data-partner=jiguang]", "wait": 500, "shot": "c10_biao_pinfo"},
    {"eval": "var a=document.querySelector('.bp-art');if(!a||a.style.backgroundImage.indexOf('assets/biao/partner/art_jiguang')<0)throw new Error('表的伙伴页应该用表的立绘')"},
    {"click": "[data-act=like]", "wait": 300},
    {"eval": "if(NL.state.partners.jiguang.likes!==6)throw new Error('表里点赞应该和里一样加 1')"},
    {"click": "[data-act=like]", "wait": 300},
    {"eval": "if(NL.state.partners.jiguang.likes!==5)throw new Error('再点一次应该取消点赞(每位伙伴只能点一次)')"},
    {"click": "[data-act=like]", "wait": 300},
    {"click": "[data-act=parchive]", "wait": 400, "shot": "c10_biao_archive"},
    {"clickXY": [20, 770], "wait": 300},
    {"click": "[data-act=plv]", "wait": 400},
    {"click": ".back-btn", "wait": 300},
    {"click": "[data-act=pgift]", "wait": 400},
    {"click": ".back-btn", "wait": 300},
    {"click": ".back-btn", "wait": 300},
    {"click": "[data-nav=home]", "wait": 400},
    {"click": "[data-act=settings]", "wait": 400, "shot": "c10_biao_settings"},
    {"click": "[data-act=set-skin]", "wait": 1500},
    {"eval": "if(NL.state.skin!=='li'||document.documentElement.dataset.skin!=='li')throw new Error('设置里应该能翻回里')"},
  ]],
  ["表的登录页与战斗头像", [
    {"goto": "?reset&skin=biao", "wait": 400},
    {"click": "[data-act=notice-ok]", "wait": 400, "shot": "c11_biao_login"},
    {"eval": "if(!document.querySelector('.bl-title'))throw new Error('表的登录页应该用自己的画法');if(document.querySelectorAll('.bl-art').length!==3)throw new Error('表的登录页应该有三位伙伴的立绘')"},
    {"click": "[data-act=enter]", "wait": 3600},
    {"eval": "if(NL.current().name!=='home')throw new Error('表的登录页点「进入游戏」应该到主页')"},
    {"click": ".dlg-btns .btn.pink", "wait": 300},
    {"eval": "NL.state.beat=false;NL.testClock=0;NL.ui.battle({enemy:{name:'林然',lv:5,power:1900},onEnd:function(){}});1", "wait": 900},
    {"clock": 3.6, "wait": 100, "shot": "c11_biao_battle"},
    {"eval": "var a=document.querySelectorAll('.btc-av');if(a[0].style.backgroundImage.indexOf('assets/biao/battle/me')<0||a[1].style.backgroundImage.indexOf('assets/biao/battle/enemy')<0)throw new Error('表的战斗应该用表的头像')"},
    {"eval": "if(!NL.embedBiao||!NL.embedBiao.avatarMe||!NL.embedBiao.avatarFoe)throw new Error('表的 3D 战斗头像没有内嵌')"},
    {"eval": "document.querySelector('[data-act=skip]').click()", "wait": 700},
    {"clickXY": [180, 520], "wait": 400},
    {"eval": "NL.testClock=null;1"},
    {"eval": "var n=function(k){return document.querySelector('#nav [data-nav='+k+']').classList.contains('dot')};if(!n('mission'))throw new Error('有能领的任务时,表的导航栏「任务」应该亮红点');if(!document.querySelector('.bh-chip[data-act=mail].dot'))throw new Error('有没领的邮件时,表主页的「邮件」应该亮红点')"},
    {"eval": "NL.state.mails.forEach(function(m){m.got=true});NL.refresh();if(document.querySelector('.bh-chip[data-act=mail].dot'))throw new Error('邮件领完后红点应该消失')"},
    {"eval": "if(document.querySelector('.battle .bbt')===null&&document.querySelector('.bbt-band')===null){/* 战斗已收起 */};var b=NL.ui.battleBanner('start',300);if(b.tagName!=='DIV'||!b.classList.contains('bt-start'))throw new Error('表的战斗横幅应该是用字写的')"},
  ]],
  ["扩展玩法:开关、调频密码、涂鸦暗号、园区巡游、伙伴援护", [
    {"goto": "?reset#home", "wait": 300},
    {"click": ".dlg-btns .btn.pink", "wait": 200},
    {"eval": "if(!NL.ext.on()||document.querySelectorAll('.ext-spot').length!==3)throw new Error('扩展玩法默认是开的,主页应该有 3 个巡游光点')"},
    {"eval": "NL.ui.settings()", "wait": 300},
    {"click": "[data-act=set-ext]", "wait": 200},
    {"clickXY": [20, 770], "wait": 300},
    {"eval": "if(NL.ext.on())throw new Error('点一下开关应该关掉扩展玩法');if(document.querySelector('.ext-spot'))throw new Error('开关关着时不应该有巡游光点');if(NL.ext.ally())throw new Error('开关关着时不应该有援护')"},
    {"click": "[data-act=explore]", "wait": 300},
    {"click": "[data-act=itx-5]", "wait": 300},
    {"eval": "if(document.querySelector('.xt'))throw new Error('开关关着时,调频密码应该还是原版的提示语')"},
    {"eval": "NL.ui.settings()", "wait": 300},
    {"click": "[data-act=set-ext]", "wait": 200, "shot": "c12_ext_on"},
    {"clickXY": [20, 770], "wait": 300},
    {"eval": "if(!NL.ext.on()||document.querySelectorAll('.ext-spot').length!==3)throw new Error('重新打开开关后主页应该有 3 个巡游光点')"},
    {"eval": "var keep=JSON.parse(localStorage.getItem('nextland-web-save-v1'));if(keep.ext!==true||keep.extSet!==true)throw new Error('动过开关应该记进存档');keep.ext=false;keep.extSet=false;var st=NL.state;NL.state=keep;var on=NL.ext.on();NL.state=st;if(!on)throw new Error('没动过开关的老存档(哪怕存着关)也应该算开')"},
    {"click": "[data-spot='1']", "wait": 300, "shot": "c12_patrol"},
    {"click": ".dlg-btns .btn.purple", "wait": 300},
    {"eval": "var sp=NL.ext.spots()[1];if(!sp.done)throw new Error('巡游选完后这个光点应该记为去过');var st=NL.state.partners[sp.pid];if(!st||(st.trust<2&&st.lv<2))throw new Error('巡游选「多聊几句」应该加 2 点信任');if(document.querySelectorAll('.ext-spot').length!==2)throw new Error('去过的光点应该消失')"},
    {"click": "[data-act=explore]", "wait": 300},
    {"click": "[data-act=itx-5]", "wait": 400, "shot": "c12_tune"},
    {"eval": "window.__c=NL.state.credit;var t=NL.ext.debug.tune;['f','a','p'].forEach(function(k){var el=document.querySelector('[data-knob='+k+']');el.value=t[k];el.dispatchEvent(new Event('input'))});document.querySelector('.xt-meter b').textContent", "wait": 900, "shot": "c12_tune_ok"},
    {"eval": "if(NL.state.credit!==window.__c+30)throw new Error('调频成功应该得 30 信用点');if(NL.state.extDay.tune!==1)throw new Error('调频的今日次数应该是 1')"},
    {"click": ".reward-ok", "wait": 400},
    {"click": "[data-act=explore]", "wait": 300},
    {"click": "[data-act=itx-4]", "wait": 400},
    {"eval": "(async function(){var w=function(ms){return new Promise(function(r){setTimeout(r,ms)})};for(var r=0;r<4;r++){var seq=NL.ext.debug.tag;await w(700+seq.length*560);for(var i=0;i<seq.length;i++){document.querySelector('[data-tag=\"'+seq[i]+'\"]').click();await w(60)}await w(750)}return 'ok'})()", "wait": 300, "shot": "c12_tag_ok"},
    {"eval": "if(NL.game.count('gift_green')<1)throw new Error('涂鸦暗号过 4 轮应该得一个绿品好感道具箱');if(NL.state.extDay.tag!==1)throw new Error('涂鸦的今日次数应该是 1')"},
    {"click": ".reward-ok", "wait": 400},
    {"eval": "var a=NL.ext.ally();if(!a||a.mul<=1)throw new Error('打开开关后应该有援护的伙伴');NL.ui.battle({enemy:{name:'测试',lv:1,power:100},rewards:[]})", "wait": 1500},
    {"eval": "if(document.querySelector('[data-act=burst] b').textContent!=='援护')throw new Error('打开开关后爆发按钮应该写着援护');document.querySelector('[data-act=skip]').click()", "wait": 700},
    {"clickXY": [180, 500], "wait": 300},
    {"goto": "?skin=biao&ext=1#home", "wait": 500},
    {"eval": "if(document.querySelectorAll('.bh-zone .ext-spot').length!==2)throw new Error('表的主页上,没去过的两个光点应该挂在地点按钮上')", "shot": "c12_biao_spots"},
  ]],
  ["3D 战斗:格挡、爆发、击破、结算", [
    {"goto": "?reset#home", "wait": 300},
    {"click": ".dlg-btns .btn.pink", "wait": 200},
    {"click": "[data-act=mail]", "wait": 200},
    {"eval": "NL.loadThree().then(function(){NL.testClock=0;window.__bt=null;NL.ui.battleBeat({enemy:{name:'林然',lv:5,power:9000},rewards:[{id:'exp',n:100},{id:'crystal',n:10}],onEnd:function(w){window.__bt=w;}});})", "wait": 1500},
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
    {"eval": "NL.loadThree=function(){return Promise.resolve(false)};NL.testClock=0;window.__bt=null;NL.ui.battleBeat({enemy:{name:'林然',lv:5,power:60000},onEnd:function(w){window.__bt=w;}})", "wait": 800},
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
  // 表的每个美术素材都要有矢量源文件(业主的要求),这里顺手核对
  try { const out = require('child_process').execFileSync('python3', [path.join(__dirname, 'check_art_sources.py'), '--check'], { stdio: 'pipe' }); console.log('✓ ' + String(out).trim().split(':')[0]); }
  catch (e) { if (e.status === 1) { bad++; console.log('✗ ' + String(e.stdout).trim()); } else console.log('- 跳过矢量源文件的核对(没有 python3)'); }
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const base = 'file://' + path.join(ROOT, 'index.html');
  // 跑一组流程。skin 给 'biao' 时在地址里加上 skin=biao,不截图(截图只留里的,和录屏对照用)
  async function runFlow(title, steps, skin) {
    const page = await browser.newPage({ viewport: { width: 360, height: 781 }, deviceScaleFactor: skin ? 1 : 2 });
    const errs = [];
    let scrolled = false;
    page.on('pageerror', (e) => errs.push('脚本报错: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('控制台报错: ' + m.text()); });
    for (const s of steps) {
      if (s.goto !== undefined) { await page.goto(base + (skin ? s.goto.replace(/^(\?[^#]*)?/, (q) => (q ? q + '&' : '?') + 'skin=' + skin) : s.goto)); await page.waitForTimeout(350); }
      if (s.click) await page.click(s.click, { timeout: 3000 }).catch(() => errs.push('点不到: ' + s.click));
      if (s.clickXY) await page.mouse.click(s.clickXY[0], s.clickXY[1]);
      if (s.drag) { await page.mouse.move(s.drag[0], s.drag[1]); await page.mouse.down(); await page.mouse.move(s.drag[2], s.drag[3], { steps: 6 }); await page.mouse.up(); }
      if (s.eval) await page.evaluate(s.eval).catch((e) => errs.push('执行失败: ' + e.message));
      if (s.clock != null) { // 每次拨 1/30 秒并等一帧,特效才会跟着走
        let cur = await page.evaluate(() => NL.testClock || 0);
        while (cur < s.clock - 1e-6) { cur = Math.min(s.clock, cur + 1 / 30); await page.evaluate((t) => new Promise((r) => { NL.testClock = t; requestAnimationFrame(() => requestAnimationFrame(r)); }), cur); }
      }
      if (s.wait) await page.waitForTimeout(s.wait);
      // 舞台被滚动过就算失败(出过这种事:点一个半露在外面的按钮,浏览器把整个舞台挪了几十像素,之后的点击全偏)
      if (!scrolled && await page.evaluate(() => { const e = document.querySelector('#stage'); return !!e && (e.scrollLeft !== 0 || e.scrollTop !== 0 || window.scrollX !== 0 || window.scrollY !== 0); })) { scrolled = true; errs.push('舞台被滚动了,发生在这一步之后: ' + JSON.stringify(s).slice(0, 120)); }
      if (s.shot && !skin) await page.screenshot({ path: path.join(SHOTS, s.shot + '.png') });
    }
    console.log((errs.length ? '✗ ' : '✓ ') + (skin ? '表:' : '') + title + (errs.length ? '\n  ' + errs.join('\n  ') : ''));
    bad += errs.length;
    await page.close();
  }
  for (const [title, steps] of FLOWS) await runFlow(title, steps);
  // 同样的流程在表皮肤下再走一遍:按钮都得点得到,检查都得过。
  // 不重跑的:「冒险…」那组下面比存档时会在表里跑;「动效」「表里切换」「表的登录页」里有只对某一面成立的检查
  for (const [title, steps] of FLOWS) {
    if (/^(冒险|动效|表里切换|表的登录页)/.test(title)) continue;
    await runFlow(title, steps, 'biao');
  }
  // 表和里共用一份规则:把同一组步骤在两种皮肤下各跑一遍,规则用的随机数换成同一个固定序列,跑完的存档必须逐项相同
  {
    const steps = FLOWS.find((f) => f[0].startsWith('冒险'))[1];
    const saves = {};
    for (const skin of ['li', 'biao']) {
      const page = await browser.newPage({ viewport: { width: 360, height: 781 } });
      const errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      for (const s of steps) {
        if (s.goto !== undefined) {
          await page.goto(base + s.goto.replace(/^(\?[^#]*)?/, (q) => (q ? q + '&' : '?') + 'skin=' + skin));
          await page.waitForTimeout(350);
          await page.evaluate(() => { let a = 20261115; NL.rand = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
        }
        if (s.click) await page.click(s.click, { timeout: 3000 }).catch(() => errs.push('点不到: ' + s.click));
        if (s.clickXY) await page.mouse.click(s.clickXY[0], s.clickXY[1]);
        if (s.eval) await page.evaluate(s.eval).catch((e) => errs.push(e.message.split('\n')[0]));
        if (s.wait) await page.waitForTimeout(s.wait);
      }
      // 时间戳和皮肤本身不比
      saves[skin] = await page.evaluate(() => { const o = JSON.parse(JSON.stringify(NL.state)); delete o.skin; delete o.energyAt; if (o.rank) delete o.rank.idleAt; return o; });
      if (skin === 'biao') { // 表不能再借用里的图:借了就算失败
        const miss = await page.evaluate(() => Object.keys(NL.skinMiss).sort());
        if (miss.length) { bad++; console.log('✗ 表在这组流程里借用了里的图 ' + miss.length + ' 张: ' + miss.slice(0, 8).join('、')); }
        else console.log('✓ 表在这组流程里没有借用里的图');
      }
      if (errs.length) { bad += errs.length; console.log('✗ 两种皮肤对比(' + skin + ')\n  ' + errs.join('\n  ')); }
      await page.close();
    }
    const diff = Object.keys(saves.li).filter((k) => JSON.stringify(saves.li[k]) !== JSON.stringify(saves.biao[k]));
    if (diff.length) { bad++; console.log('✗ 两种皮肤跑完同样的步骤,存档不一样: ' + diff.map((k) => k + ' 里=' + JSON.stringify(saves.li[k]).slice(0, 80) + ' 表=' + JSON.stringify(saves.biao[k]).slice(0, 80)).join('; ')); }
    else console.log('✓ 两种皮肤跑完同样的步骤,存档逐项相同(' + Object.keys(saves.li).length + ' 项)');
  }
  await browser.close();
  console.log(bad ? '共 ' + bad + ' 个问题' : '全部通过,截图在 ' + SHOTS);
  process.exit(bad ? 1 : 0);
})();
