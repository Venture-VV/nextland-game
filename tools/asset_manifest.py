"""素材清单:每一项说明从录屏第几帧(每秒 2 帧编号)的哪个矩形裁出哪张图。

frame: 帧号,对应 (frame-1)/2 秒;box: [x0, y0, x1, y1],录屏原始像素。
src:   不取录屏帧,而是取 tools/build_map.py 生成的中间产物(.work/ 下)。
"""

HUD = "hud_home.png"  # 主页 HUD 图层(带透明度),由 build_map.py 生成
ICONS = "hud_icons.png"  # 会上下浮动的图标,取单帧抠图,避免平均后发虚


def hud(out, box, floor=40, src=HUD):
    return {"out": out, "src": src, "box": box, "alpha_floor": floor, "q": 92}


MANIFEST = [
    # ---------- 通用 ----------
    {"out": "nav/role.jpg", "frame": 458, "box": [0, 1400, 720, 1562], "q": 90},
    {"out": "nav/bag.jpg", "frame": 473, "box": [0, 1400, 720, 1562], "q": 90},
    {"out": "nav/home.jpg", "frame": 645, "box": [0, 1400, 720, 1562], "q": 90},
    {"out": "nav/mission.jpg", "frame": 118, "box": [0, 1400, 720, 1562], "q": 90},
    {"out": "nav/partner.jpg", "frame": 356, "box": [0, 1400, 720, 1562], "q": 90},
    # ---------- 登录与公告 ----------
    {"out": "login/bg.jpg", "frame": 7, "q": 86},
    {"out": "login/loading.jpg", "frame": 13, "q": 84},
    {"out": "login/notice.jpg", "frame": 3, "box": [22, 246, 698, 1326], "q": 90},
    {"out": "ui/dlg_head.jpg", "frame": 15, "box": [0, 640, 720, 680], "q": 90},
    # 这一帧标题还在淡入,页面上再叠一层字
    {"out": "ui/reward_head.jpg", "frame": 125, "box": [0, 614, 720, 672], "q": 90},
    # ---------- 主页 ----------
    {"out": "home/map.webp", "src": "map_final.png", "q": 82},
    {**hud("home/card.webp", [28, 258, 488, 428]), "erase": [[438, 0, 460, 98]]},  # 抹掉右端和「好友」重叠的一小块
    hud("home/ico_gem.webp", [34, 198, 78, 248]),
    hud("home/ico_coin.webp", [234, 198, 278, 248]),
    hud("home/ico_bolt.webp", [436, 198, 474, 248]),
    hud("home/ico_plus.webp", [562, 200, 608, 246]),
    hud("home/btn_friend.webp", [466, 264, 548, 356]),
    hud("home/btn_mail.webp", [550, 280, 612, 356]),
    hud("home/btn_setting.webp", [628, 280, 696, 356]),
    hud("home/btn_faction.webp", [18, 434, 106, 524]),
    hud("home/btn_calendar.webp", [108, 434, 198, 524]),
    hud("home/btn_shop.webp", [574, 408, 700, 532], src=ICONS),
    hud("home/btn_supply.webp", [574, 548, 700, 670], src=ICONS),
    hud("home/btn_tower.webp", [574, 684, 700, 808], src=ICONS),
    hud("home/btn_modes.webp", [574, 824, 700, 946], src=ICONS),
    hud("home/btn_adventure.webp", [14, 1140, 276, 1268]),
    {**hud("home/btn_explore.webp", [498, 1270, 694, 1374], floor=90), "erase": [[0, 66, 22, 104]]},

    # ---------- 物品图标 ----------
    {"out": "item/exp.webp", "frame": 125, "box": [252, 792, 352, 892], "mirror_br": [0.45, 0.2], "q": 90},
    {"out": "item/credit.webp", "frame": 147, "box": [492, 702, 632, 840], "q": 90},
    {"out": "item/special_card.webp", "frame": 593, "box": [165, 477, 265, 577], "fill": [[68, 72, 100, 93, [22, 21, 26]]], "q": 90},
    {"out": "item/supply_card.webp", "frame": 593, "box": [365, 477, 465, 577], "fill": [[68, 72, 100, 93, [22, 21, 26]]], "q": 90},
    {"out": "item/crystal.webp", "frame": 593, "box": [565, 477, 665, 577], "mirror_br": [0.45, 0.17], "mirror_up": 0.06, "q": 90},
    {"out": "item/gift_green.webp", "frame": 593, "box": [165, 780, 265, 880], "mirror_br": [0.4, 0.17], "mirror_up": 0.06, "q": 90},
    {"out": "item/gift_blue.webp", "frame": 593, "box": [365, 780, 465, 880], "mirror_br": [0.4, 0.17], "mirror_up": 0.06, "q": 90},
    {"out": "item/gift_purple.webp", "frame": 593, "box": [565, 780, 665, 880], "mirror_br": [0.4, 0.17], "mirror_up": 0.06, "q": 90},
    {"out": "item/gift_orange.webp", "frame": 593, "box": [165, 1083, 265, 1183], "mirror_br": [0.4, 0.17], "mirror_up": 0.06, "q": 90},
    {"out": "item/box_white.webp", "frame": 586, "box": [165, 477, 265, 577], "mirror_br": [0.4, 0.17], "mirror_up": 0.06, "q": 90},
    {"out": "item/box_green.webp", "frame": 586, "box": [365, 477, 465, 577], "mirror_br": [0.4, 0.17], "mirror_up": 0.06, "q": 90},
    {"out": "item/box_blue.webp", "frame": 586, "box": [565, 477, 665, 577], "mirror_br": [0.4, 0.17], "mirror_up": 0.06, "q": 90},
    {"out": "item/daily_point.webp", "frame": 912, "box": [184, 632, 232, 680], "q": 90},
    # ---------- 任务 ----------
    {"out": "mission/banner.jpg", "frame": 163, "box": [0, 0, 720, 208], "q": 88},
    {"out": "mission/ico_main.jpg", "frame": 163, "box": [24, 536, 136, 664], "q": 90},
    {"out": "mission/ico_red.jpg", "frame": 163, "box": [24, 984, 136, 1112], "q": 90},
    {"out": "mission/ico_white.jpg", "frame": 163, "box": [24, 1174, 136, 1302], "q": 90},
    {"out": "mission/ico_explore.jpg", "frame": 191, "box": [24, 300, 136, 428], "q": 90},
    {"out": "mission/ico_daily.jpg", "frame": 912, "box": [20, 540, 132, 672], "q": 90},
    # 互动码卡片:原图里的二维码是账号的真实互动码,这里涂白,页面上画一张假的
    {"out": "mission/qr_card.jpg", "frame": 167, "box": [70, 330, 650, 1320], "fill": [[122, 272, 468, 608, [255, 255, 255]]], "q": 86},
    # ---------- 剧情 ----------
    {"out": "story/xiong.jpg", "frame": 82, "box": [0, 204, 720, 1240], "q": 84},
    {"out": "story/wu.jpg", "frame": 106, "box": [0, 204, 720, 1240], "q": 84},
    {"out": "story/yin.jpg", "frame": 114, "box": [0, 204, 720, 1240], "q": 84},
    {"out": "story/none.jpg", "frame": 155, "box": [0, 204, 720, 1240], "q": 84},

    # ---------- 角色 ----------
    # 每个页签一张整幅底图,会变的数字由页面盖在上面
    {"out": "role/profile.jpg", "frame": 379, "box": [0, 0, 720, 1400], "role_arrow": True, "q": 84},
    {"out": "role/equip.jpg", "frame": 401, "box": [0, 0, 720, 1400], "role_arrow": True, "q": 84},
    {"out": "role/enh.jpg", "frame": 425, "box": [0, 0, 720, 1400], "role_arrow": True, "q": 84},
    {"out": "role/chip.jpg", "frame": 470, "box": [0, 0, 720, 1400], "role_arrow": True, "q": 84},
    {"out": "role/iface_bg.jpg", "frame": 427, "box": [0, 0, 720, 240], "q": 84},
    {"out": "role/slot_head.jpg", "frame": 422, "box": [126, 672, 272, 822], "q": 88},
    {"out": "role/slot_neck.jpg", "frame": 422, "box": [296, 672, 442, 822], "q": 88},
    {"out": "role/slot_weapon.jpg", "frame": 422, "box": [464, 672, 610, 822], "q": 88},
    {"out": "role/slot_hand1.jpg", "frame": 422, "box": [42, 808, 188, 958], "q": 88},
    {"out": "role/slot_hand2.jpg", "frame": 422, "box": [210, 808, 356, 958], "q": 88},
    {"out": "role/slot_hand3.jpg", "frame": 422, "box": [380, 808, 526, 958], "q": 88},
    {"out": "role/slot_hand4.jpg", "frame": 422, "box": [548, 808, 694, 958], "q": 88},
    {"out": "role/slot_armor.jpg", "frame": 422, "box": [126, 944, 272, 1094], "q": 88},
    {"out": "role/slot_pants.jpg", "frame": 422, "box": [296, 944, 442, 1094], "q": 88},
    {"out": "role/slot_shoes.jpg", "frame": 422, "box": [464, 944, 610, 1094], "q": 88},
    # 接口升级每行左边的部位图标
    {"out": "role/if_head.jpg", "frame": 427, "box": [76, 266, 156, 350], "q": 88},
    {"out": "role/if_neck.jpg", "frame": 427, "box": [76, 414, 156, 498], "q": 88},
    {"out": "role/if_weapon.jpg", "frame": 427, "box": [76, 562, 156, 646], "q": 88},
    {"out": "role/if_hand.jpg", "frame": 427, "box": [76, 710, 156, 794], "q": 88},
    {"out": "role/if_armor.jpg", "frame": 427, "box": [76, 1300, 156, 1384], "q": 88},
    {"out": "role/if_pants.jpg", "frame": 401, "box": [340, 986, 418, 1064], "q": 88},
    {"out": "role/if_shoes.jpg", "frame": 401, "box": [508, 986, 586, 1064], "q": 88},
    # ---------- 装备图标 ----------
    {"out": "equip/neck_gold.webp", "frame": 422, "box": [328, 702, 428, 802], "q": 88},
    {"out": "equip/pistol.webp", "frame": 422, "box": [496, 702, 596, 802], "fill": [[82, 0, 100, 16, [27, 26, 32]]], "q": 88},
    {"out": "equip/prism.webp", "frame": 422, "box": [74, 838, 174, 938], "q": 88},
    {"out": "equip/ring.webp", "frame": 422, "box": [412, 838, 512, 938], "q": 88},
    {"out": "equip/glove_white.webp", "frame": 422, "box": [580, 838, 680, 938], "q": 88},
    {"out": "equip/vest.webp", "frame": 422, "box": [158, 974, 258, 1074], "fill": [[82, 0, 100, 16, [27, 26, 32]]], "q": 88},
    {"out": "equip/pants.webp", "frame": 422, "box": [328, 974, 428, 1074], "q": 88},
    {"out": "equip/hat.webp", "frame": 479, "box": [113, 890, 213, 990], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/tuxedo.webp", "frame": 479, "box": [232, 890, 332, 990], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/choker.webp", "frame": 479, "box": [352, 890, 452, 990], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/armor_pink.webp", "frame": 479, "box": [471, 890, 571, 990], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/boots.webp", "frame": 479, "box": [590, 890, 690, 990], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/bracelet.webp", "frame": 479, "box": [113, 1009, 213, 1109], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/gauntlet.webp", "frame": 479, "box": [352, 1009, 452, 1109], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/helmet_brown.webp", "frame": 479, "box": [113, 1128, 213, 1228], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/helmet_grey.webp", "frame": 479, "box": [232, 1128, 332, 1228], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/chain.webp", "frame": 479, "box": [471, 1128, 571, 1228], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/rifle.webp", "frame": 479, "box": [352, 1247, 452, 1347], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/pistol_color.webp", "frame": 479, "box": [590, 1247, 690, 1347], "fill": [[56, 0, 100, 9, [21, 20, 25]]], "q": 88},
    {"out": "equip/vest_green.webp", "frame": 487, "box": [446, 406, 652, 610], "scale": 0.5, "q": 88},
    # ---------- 仓库 ----------
    {"out": "bag/head_equip.jpg", "frame": 479, "box": [0, 0, 720, 410], "q": 85},
    {"out": "bag/head_item.jpg", "frame": 473, "box": [0, 0, 720, 410], "q": 85},
    # ---------- 伙伴 ----------
    {"out": "partner/list.jpg", "frame": 195, "box": [0, 0, 720, 1400], "q": 84},
    # 这一帧左上角的页面名正在转场,从 203 帧取清晰的页面名和胶囊盖上
    {"out": "partner/band.jpg", "frame": 325, "box": [0, 0, 720, 262], "patch": [[203, [0, 0, 720, 176], [0, 0]]], "q": 84},
    {"out": "partner/jiguang.jpg", "frame": 199, "q": 84},
    {"out": "partner/ling.jpg", "frame": 290, "q": 84},
    {"out": "partner/maguangyao.jpg", "frame": 318, "q": 84},
    {"out": "partner/linxiao.jpg", "frame": 346, "q": 84},
    {"out": "partner/yinsha.jpg", "frame": 311, "q": 84},
    {"out": "partner/archive.jpg", "frame": 273, "box": [0, 380, 720, 1290], "q": 85},
    {"out": "partner/visual.jpg", "frame": 228, "q": 82},
    {"out": "gift/geiger.webp", "frame": 261, "box": [72, 1297, 164, 1396], "fill": [[58, 0, 92, 20, [70, 70, 76]]], "mirror_br": [0.3, 0.24], "q": 88},
    {"out": "gift/rouge.webp", "frame": 261, "box": [194, 1298, 293, 1396], "fill": [[65, 0, 99, 20, [70, 70, 76]]], "mirror_br": [0.3, 0.24], "q": 88},
    {"out": "gift/papers.webp", "frame": 261, "box": [314, 1298, 413, 1396], "fill": [[65, 0, 99, 20, [70, 70, 76]]], "mirror_br": [0.3, 0.24], "q": 88},
    {"out": "gift/holo.webp", "frame": 261, "box": [433, 1298, 532, 1396], "fill": [[65, 0, 99, 20, [70, 70, 76]]], "mirror_br": [0.3, 0.24], "q": 88},
    {"out": "gift/perfume.webp", "frame": 261, "box": [552, 1298, 651, 1396], "fill": [[65, 0, 99, 20, [70, 70, 76]]], "mirror_br": [0.3, 0.24], "q": 88},
    {"out": "gift/can.webp", "frame": 334, "box": [72, 1297, 164, 1396], "fill": [[58, 0, 92, 20, [70, 70, 76]]], "mirror_br": [0.3, 0.24], "q": 88},

    # ---------- 战斗 ----------
    # 两个头像(带原版的外圈):3D 战斗的贴图由 build_embeds.py 从这两张图生成
    {"out": "battle/enemy.jpg", "frame": 545, "box": [441, 443, 668, 670], "q": 88},
    {"out": "battle/me.jpg", "frame": 549, "box": [48, 938, 276, 1166], "q": 88},
    {"out": "battle/start.jpg", "frame": 541, "box": [0, 640, 720, 960], "q": 85},
    {"out": "battle/win.jpg", "frame": 676, "box": [0, 470, 720, 660], "q": 85},
    # ---------- 关卡 ----------
    {"out": "stage/head_core.jpg", "frame": 557, "box": [0, 0, 720, 380], "q": 84},
    {"out": "stage/head_museum.jpg", "frame": 570, "box": [0, 0, 720, 380], "q": 84},
    {"out": "stage/boss.jpg", "frame": 555, "box": [96, 419, 218, 545], "q": 88},
    {"out": "stage/detail.jpg", "frame": 534, "box": [30, 327, 690, 1288], "q": 86},
    # ---------- 玩法 ----------
    {"out": "modes/string.jpg", "frame": 695, "box": [26, 277, 694, 600], "q": 84},
    {"out": "modes/ring.jpg", "frame": 695, "box": [26, 633, 694, 960], "q": 84},
    {"out": "modes/catch.jpg", "frame": 695, "box": [26, 993, 694, 1316], "q": 84},
    {"out": "modes/mine.jpg", "frame": 651, "box": [26, 703, 694, 1026], "q": 84},
    {"out": "modes/gorge.jpg", "frame": 651, "box": [26, 1058, 694, 1380], "q": 84},
    # ---------- 排行榜 ----------
    {"out": "rank/bg.jpg", "frame": 718, "q": 82},
    {"out": "rank/rewards.jpg", "frame": 720, "box": [30, 277, 690, 1332], "q": 85},
    # ---------- 商城与补给 ----------
    {"out": "shop/head.jpg", "frame": 593, "box": [0, 0, 720, 390], "q": 84},
    {"out": "supply/p1.jpg", "frame": 603, "q": 82},
    {"out": "supply/p2.jpg", "frame": 612, "q": 82},
    {"out": "supply/p3.jpg", "frame": 615, "q": 82},
    {"out": "supply/result_head.jpg", "frame": 640, "box": [0, 0, 720, 420], "q": 84},

    # ---------- 外围界面 ----------
    {"out": "mail/head.jpg", "frame": 802, "box": [0, 0, 720, 290], "q": 84},
    {"out": "mail/ico.jpg", "frame": 802, "box": [34, 331, 132, 427], "q": 88},
    {"out": "mail/ico_read.jpg", "frame": 823, "box": [34, 331, 132, 427], "q": 88},
    {"out": "item/box_race.webp", "frame": 815, "box": [310, 790, 410, 890], "mirror_br": [0.3, 0.2], "q": 90},
    {"out": "friend/head.jpg", "frame": 791, "box": [0, 0, 720, 300], "q": 84},
    {"out": "friend/avatar.jpg", "frame": 791, "box": [70, 482, 148, 562], "q": 88},
    {"out": "extra/profile.jpg", "frame": 849, "q": 84},
    {"out": "extra/tickets.jpg", "frame": 854, "q": 84},
    {"out": "extra/ticket_shop.jpg", "frame": 862, "q": 84},
    {"out": "extra/bind.jpg", "frame": 880, "q": 84},
    {"out": "extra/parkmap.jpg", "frame": 772, "q": 84},
    {"out": "extra/faction.jpg", "frame": 736, "q": 84},
    # ---------- 弹窗外框与整窗底图(逐页对照后补的) ----------
    {"out": "ui/wd_head.jpg", "frame": 878, "box": [28, 440, 694, 500], "q": 92},  # 深色弹窗的标题条
    {"out": "ui/wd_foot.jpg", "frame": 878, "box": [28, 1128, 694, 1176], "q": 92},
    {"out": "ui/buy_head.jpg", "frame": 588, "box": [30, 280, 690, 448], "q": 90},  # 商城购买窗
    {"out": "ui/buy_foot.jpg", "frame": 588, "box": [30, 1296, 690, 1336], "q": 90},
    {"out": "ui/cal_head.jpg", "frame": 745, "box": [30, 281, 690, 370], "q": 90},  # 活动日历
    {"out": "ui/cal_foot.jpg", "frame": 745, "box": [30, 1232, 690, 1336], "q": 90},
    {"out": "ui/interact.jpg", "frame": 575, "box": [30, 360, 690, 1256], "q": 88},  # 互动窗整窗
    # 设置窗整窗;玩家编号是真实账号的,涂掉后由页面写占位值
    {"out": "ui/settings.jpg", "frame": 830, "box": [30, 568, 690, 1044], "fill": [[150, 384, 520, 432, [24, 22, 25]]], "q": 90},
    {"out": "mail/btn_del.jpg", "frame": 802, "box": [12, 1350, 212, 1418], "q": 90},
    {"out": "mail/btn_all.jpg", "frame": 802, "box": [432, 1350, 712, 1418], "q": 90},
    {"out": "modes/train_car.jpg", "frame": 656, "box": [30, 546, 190, 772], "q": 88},
    {"out": "modes/train_head.jpg", "frame": 656, "box": [30, 1224, 190, 1450], "q": 88},
    {"out": "supply/result_foot.jpg", "frame": 640, "box": [0, 1280, 720, 1450], "q": 88},
    {"out": "ui/ico_power.jpg", "frame": 487, "box": [64, 510, 114, 560], "q": 92},  # 装备窗里的「战力」图标
    {"out": "ui/ico_power_dark.jpg", "frame": 656, "box": [516, 622, 558, 664], "q": 92},
    {"out": "mail/diamonds.jpg", "frame": 802, "box": [580, 336, 672, 376], "q": 92},
    # 原版战斗上下两条警戒带(字是静止的)
    {"out": "battle/band_top.jpg", "frame": 543, "box": [0, 200, 720, 372], "q": 88},
    {"out": "battle/band_bot.jpg", "frame": 543, "box": [0, 1286, 720, 1448], "q": 88},
]
