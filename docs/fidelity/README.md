# 里系统与录屏的逐页对照

由 `node tools/compare.cjs && python3 tools/compare.py` 生成,不要手改。

每张图从左到右:录屏、网页版、差异(越亮差得越多)。黄框是不参与比较的区域(倒计时、手机通知);灰块是涂掉的账号信息(互动码、玩家编号)。

- 一共 65 个画面。
- 平均相似度 97.0%,平均「明显不同的面积」3.7%。
- 明显不同的面积在 5% 以内的有 48 个,超过 15% 的有 3 个。

按差得多少排序,最上面的最该修。

| 画面 | 录屏时间 | 相似度 | 明显不同的面积 | 对照图 |
|---|---|---|---|---|
| 接口升级 | 3:33.0 | 86.7% | 31.4% | [34_iface](img/34_iface.jpg) |
| 伙伴等级权益 | 1:41.0 | 92.6% | 15.3% | [22_partner_lv](img/22_partner_lv.jpg) |
| 剧情:选项 | 0:36.0 | 90.5% | 15.0% | [08_story_choice](img/08_story_choice.jpg) |
| 任务:主线与支线 | 1:21.0 | 92.8% | 14.0% | [13_task_sections](img/13_task_sections.jpg) |
| 赠礼 | 2:10.0 | 94.2% | 12.6% | [25_partner_gift](img/25_partner_gift.jpg) |
| 补给:结果 | 5:19.5 | 93.5% | 11.5% | [67_supply_result](img/67_supply_result.jpg) |
| 玩法 | 5:47.0 | 94.3% | 10.4% | [70_modes](img/70_modes.jpg) |
| 每日委托 | 1:59.0 | 94.4% | 10.1% | [24_partner_daily](img/24_partner_daily.jpg) |
| 关卡列表 | 4:37.0 | 94.1% | 8.8% | [50_stages](img/50_stages.jpg) |
| 添加好友 | 6:36.0 | 96.4% | 8.3% | [86_friends_add](img/86_friends_add.jpg) |
| 探索列车 | 5:27.5 | 94.5% | 8.1% | [71_train](img/71_train.jpg) |
| 剧情:对白 | 0:40.5 | 96.0% | 7.5% | [09_story_line](img/09_story_line.jpg) |
| 任务:领取后 | 1:06.5 | 95.6% | 7.3% | [11_task_after](img/11_task_after.jpg) |
| 补给:确认 | 5:08.5 | 95.0% | 6.6% | [66_supply_confirm](img/66_supply_confirm.jpg) |
| 仓库:装备 | 3:59.0 | 96.2% | 6.1% | [41_bag_equip](img/41_bag_equip.jpg) |
| 邮件:已读 | 6:51.0 | 94.0% | 6.1% | [88_mail_read](img/88_mail_read.jpg) |
| 任务:日常 | 7:35.5 | 95.7% | 5.3% | [15_mission_daily](img/15_mission_daily.jpg) |
| 权益加成 | 3:16.0 | 97.4% | 4.9% | [31_role_perks](img/31_role_perks.jpg) |
| 好友:空 | 6:31.5 | 97.1% | 4.7% | [84_friends_empty](img/84_friends_empty.jpg) |
| 装备详情 | 4:03.0 | 96.8% | 4.6% | [42_gear_detail](img/42_gear_detail.jpg) |
| 好友列表 | 6:35.0 | 97.9% | 4.0% | [85_friends_list](img/85_friends_list.jpg) |
| 主页:线下引导询问 | 0:07.0 | 96.0% | 4.0% | [03_home_prompt](img/03_home_prompt.jpg) |
| 任务:任务页签(引导中) | 0:18.0 | 97.2% | 3.4% | [06_mission_task_guide](img/06_mission_task_guide.jpg) |
| 日历筛选 | 6:16.0 | 97.0% | 2.9% | [81_cal_filter](img/81_cal_filter.jpg) |
| 邮件 | 6:40.5 | 95.4% | 2.8% | [87_mail](img/87_mail.jpg) |
| 商城:购买窗 | 4:53.5 | 97.6% | 2.8% | [62_shop_buy](img/62_shop_buy.jpg) |
| 获得物品 | 1:02.0 | 96.4% | 2.4% | [10_reward](img/10_reward.jpg) |
| 任务:日常(引导中) | 0:13.5 | 94.2% | 2.0% | [05_mission_daily_guide](img/05_mission_daily_guide.jpg) |
| 选择芯片 | 3:50.5 | 98.6% | 1.9% | [36_chip_win](img/36_chip_win.jpg) |
| 主页:引导提示 | 0:12.0 | 95.0% | 1.7% | [04_home_guide](img/04_home_guide.jpg) |
| 出示互动码 | 1:23.0 | 97.0% | 1.7% | [14_qr](img/14_qr.jpg) |
| 设置 | 6:54.5 | 96.5% | 1.7% | [89_settings](img/89_settings.jpg) |
| 仓库:道具 | 3:56.0 | 99.0% | 1.0% | [40_bag_item](img/40_bag_item.jpg) |
| 绑定会员 | 7:18.5 | 98.6% | 1.0% | [94_bind_win](img/94_bind_win.jpg) |
| 活动日历 | 6:12.0 | 97.5% | 0.9% | [80_calendar](img/80_calendar.jpg) |
| 商城:材料 | 4:56.0 | 97.6% | 0.8% | [61_shop_mat](img/61_shop_mat.jpg) |
| 任务详情 | 0:19.0 | 98.0% | 0.7% | [07_task_detail](img/07_task_detail.jpg) |
| 物品说明 | 1:13.0 | 95.8% | 0.6% | [12_item_info](img/12_item_info.jpg) |
| 排名奖励 | 5:59.5 | 98.4% | 0.6% | [73_rank_rewards](img/73_rank_rewards.jpg) |
| 伙伴协议:凌 | 2:21.5 | 98.2% | 0.5% | [27_partner_ling](img/27_partner_ling.jpg) |
| 角色:装备(全部穿戴) | 3:30.5 | 98.7% | 0.5% | [32_role_equip](img/32_role_equip.jpg) |
| 关卡详情 | 4:26.5 | 98.2% | 0.5% | [51_stage_detail](img/51_stage_detail.jpg) |
| 商城:资源包 | 4:55.0 | 98.3% | 0.5% | [60_shop_pack](img/60_shop_pack.jpg) |
| 伙伴协议:冀光 | 1:39.0 | 99.2% | 0.4% | [21_partner_info](img/21_partner_info.jpg) |
| 伙伴协议:银砂 | 2:35.0 | 99.2% | 0.4% | [28_partner_yinsha](img/28_partner_yinsha.jpg) |
| 伙伴协议:林鸮 | 2:52.5 | 99.2% | 0.4% | [29_partner_linxiao](img/29_partner_linxiao.jpg) |
| 补给:高级 | 5:05.5 | 98.9% | 0.4% | [64_supply2](img/64_supply2.jpg) |
| 互动 | 4:47.0 | 97.3% | 0.4% | [52_interact](img/52_interact.jpg) |
| 补给:基础 | 5:01.0 | 99.1% | 0.4% | [63_supply1](img/63_supply1.jpg) |
| 补给:特级 | 5:07.0 | 98.8% | 0.4% | [65_supply3](img/65_supply3.jpg) |
| 排行榜 | 5:58.5 | 99.2% | 0.3% | [72_rank](img/72_rank.jpg) |
| 角色:芯片 | 3:54.5 | 99.0% | 0.3% | [35_role_chip](img/35_role_chip.jpg) |
| 角色:档案 | 3:09.0 | 99.0% | 0.3% | [30_role_profile](img/30_role_profile.jpg) |
| 角色:强化 | 3:32.0 | 99.0% | 0.3% | [33_role_enh](img/33_role_enh.jpg) |
| 个人 | 7:04.0 | 99.1% | 0.2% | [90_profile](img/90_profile.jpg) |
| 票券商店 | 7:10.5 | 99.4% | 0.2% | [92_ticket_shop](img/92_ticket_shop.jpg) |
| 视觉档案 | 1:53.5 | 99.4% | 0.2% | [23_partner_visual](img/23_partner_visual.jpg) |
| 绑定管理 | 7:19.5 | 99.4% | 0.2% | [93_bind](img/93_bind.jpg) |
| 我的票券 | 7:06.5 | 99.1% | 0.2% | [91_tickets](img/91_tickets.jpg) |
| 伙伴档案 | 2:16.0 | 98.9% | 0.2% | [26_partner_archive](img/26_partner_archive.jpg) |
| 种族与势力 | 6:07.5 | 99.3% | 0.1% | [82_faction](img/82_faction.jpg) |
| 园区平面图 | 6:25.5 | 99.4% | 0.1% | [83_parkmap](img/83_parkmap.jpg) |
| 防沉迷公告 | 0:01.0 | 98.3% | 0.1% | [01_notice](img/01_notice.jpg) |
| 伙伴列表 | 1:37.0 | 99.5% | 0.0% | [20_partner_list](img/20_partner_list.jpg) |
| 登录 | 0:03.0 | 99.6% | 0.0% | [02_login](img/02_login.jpg) |
