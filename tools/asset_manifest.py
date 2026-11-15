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
    {"out": "ui/reward_head.jpg", "frame": 121, "box": [0, 614, 720, 672], "q": 90},
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
]
