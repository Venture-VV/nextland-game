#!/usr/bin/env python3
"""画「表」的整套图标:物品、装备、礼物、货币、接口、任务标记、底部导航。

    python3 tools/build_biao_icons.py && python3 tools/skin_assets.py

图标是直接用矢量画的(霓虹线稿 + 夜色玻璃底板),这份脚本就是它们的源头:
每个图标是一小串路径,底板的颜色跟着品质走。输出的 SVG 放在 assets/biao/ 下,
页面直接用,放多大都清楚;美术要改,用 Inkscape、Illustrator、Figma 打开 SVG 就行
(「底板」和「图形」是两个图层)。

图形写在 96x96 的格子里。每一笔前面的字母是画法:
  f 半透明填色加描边   s 只描边   t 细描边   a 实心的品质色   w 实心的白
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "biao")

C = {"white": "#cfd3e6", "green": "#5fe8a0", "blue": "#4ac6ff", "purple": "#b06bff", "orange": "#ffb14a",
     "rose": "#ff3d7f", "ice": "#7de8ff", "gold": "#e8cf9a", "violet": "#b06bff", "dim": "#7c80a6"}

STAR = "M48 20l8 17 18.5 2.5-13.5 13 3.4 18.5L48 62l-16.4 9 3.4-18.5-13.5-13L40 37z"
CRATE = [("f", "M48 20l28 13-28 13-28-13z"), ("f", "M20 33v30l28 14V46z"), ("f", "M76 33v30L48 77V46z"), ("t", "M34 26.5l28 13v12"), ("a", "M30 52l8 4v8l-8-4z")]
GIFT = [("f", "M24 46h48v28a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3z"), ("f", "M20 34h56v12H20z"), ("s", "M48 34v43"),
        ("f", "M48 34c-5-14-20-12-16-3 2 4 10 3 16 3z"), ("f", "M48 34c5-14 20-12 16-3-2 4-10 3-16 3z")]
TORSO = "M34 20L20 31v17l8 2v27h40V50l8-2V31L62 20c-2 8-8 12-14 12s-12-4-14-12z"
HELMET = [("f", "M22 58c0-22 11-36 26-36s26 14 26 36v6H22z"), ("a", "M36 46h28a4 4 0 0 1 4 4v8H46c-6 0-10-5-10-12z"), ("t", "M22 64v8h18")]
PISTOL = [("f", "M16 30h60v13H16z"), ("f", "M28 43h20l-5 33H24z"), ("s", "M50 43c0 10-5 13-10 13"), ("t", "M66 30v13M22 36h34")]
RIFLE = [("f", "M8 46l14-8h12v13H20l-12 8z"), ("f", "M34 36h30v11H34z"), ("s", "M64 40h24"), ("f", "M44 47l-4 19h11l4-19z"),
         ("t", "M40 29h20M45 29v7M55 29v7"), ("s", "M60 47l4 14")]
GLOVE = "M30 78V52l-9-11c-3-5 3-9 7-5l6 7V26a4 4 0 0 1 8 0v14-20a4 4 0 0 1 8 0v20-17a4 4 0 0 1 8 0v20-11a4 4 0 0 1 8 0v30c0 10-6 17-14 17z"
NECK = "M24 20c0 30 11 44 24 44s24-14 24-44"

G = {
    # 物品
    "chip": [("f", "M32 28h32a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4V32a4 4 0 0 1 4-4z"),
             ("t", "M38 28v-9M48 28v-9M58 28v-9M38 77v-9M48 77v-9M58 77v-9M28 38h-9M28 48h-9M28 58h-9M77 38h-9M77 48h-9M77 58h-9"), ("s", "M48 59V39M40 47l8-8 8 8")],
    "coin": [("f", "M48 22a26 26 0 1 0 0 52 26 26 0 1 0 0-52z"), ("t", "M48 30a18 18 0 1 0 0 36 18 18 0 1 0 0-36z"), ("a", "M48 37l8 11-8 11-8-11z")],
    "card": [("f", "M22 34l46-10a4 4 0 0 1 5 3l6 28a4 4 0 0 1-3 5l-46 10a4 4 0 0 1-5-3l-6-28a4 4 0 0 1 3-5z"), ("s", "M20 46l54-11.5"), ("a", "M30 56l10-2 1.6 8-10 2z")],
    "card_star": [("f", "M22 34l46-10a4 4 0 0 1 5 3l6 28a4 4 0 0 1-3 5l-46 10a4 4 0 0 1-5-3l-6-28a4 4 0 0 1 3-5z"), ("s", "M20 46l54-11.5"),
                  ("w", "M56 44l3 6 6.5 1-4.7 4.6 1.1 6.5-5.9-3.1-5.9 3.1 1.1-6.5-4.7-4.6 6.5-1z")],
    "crystal": [("f", "M48 14l14 26-14 42-14-42z"), ("t", "M34 40h28M48 14v68"), ("f", "M28 48l-9 14 9 16 8-18z"), ("f", "M68 48l9 14-9 16-8-18z")],
    "crate": CRATE,
    "crate_race": CRATE + [("w", "M62 54l8-4v8l-8 4z")],
    "gift": GIFT,
    "star": [("f", STAR), ("t", "M48 14a34 34 0 1 0 0 68 34 34 0 1 0 0-68z")],
    # 货币(不带底板)
    "gem": [("f", "M48 16l24 24-24 42-24-42z"), ("t", "M24 40h48M38 40l10-24 10 24M38 40l10 42 10-42")],
    "bolt": [("a", "M56 12L26 52h18l-8 32 34-44H50z")],
    "plus": [("s", "M48 28v40M28 48h40")],
    "power": [("a", "M48 12c4 14 20 22 20 40a20 20 0 0 1-40 0c0-8 4-12 8-18 2 6 4 8 8 8-2-10 0-20 4-30z"), ("w", "M48 50c4 5 8 8 8 14a8 8 0 0 1-16 0c0-6 4-9 8-14z")],
    # 装备
    "prism": [("f", "M48 16l32 58H16z"), ("t", "M48 16v58M48 46l32 28M48 46L16 74"), ("w", "M48 40l5 8-5 8-5-8z")],
    "pistol": PISTOL,
    "pistol_color": PISTOL + [("a", "M30 46h16l-2 12H28z")],
    "rifle": RIFLE,
    "vest": [("f", TORSO), ("s", "M48 32v45"), ("t", "M34 56h8M54 56h8")],
    "vest_green": [("f", TORSO), ("s", "M48 32v45"), ("a", "M32 54h10v8H32zM54 54h10v8H54z")],
    "tuxedo": [("f", TORSO), ("s", "M36 24l12 28 12-28"), ("w", "M42 31l6 4 6-4v8l-6-4-6 4z"), ("t", "M48 56v0M48 64v0M48 72v0")],
    "armor": [("f", TORSO), ("s", "M30 40c6 6 30 6 36 0"), ("w", "M48 44l7 9-7 9-7-9z"), ("t", "M20 31l-8 9 8 6M76 31l8 9-8 6")],
    "hat": [("f", "M28 56c0-22 8-34 20-34s20 12 20 34z"), ("f", "M10 56h76c0 7-17 13-38 13S10 63 10 56z"), ("a", "M28 48h40v6H28z")],
    "helmet": HELMET,
    "helmet_old": [("f", "M22 58c0-22 11-36 26-36s26 14 26 36v6H22z"), ("f", "M36 40a9 9 0 1 0 0 18 9 9 0 1 0 0-18z"), ("f", "M60 40a9 9 0 1 0 0 18 9 9 0 1 0 0-18z"), ("s", "M45 49h6"), ("t", "M22 64v8h18")],
    "necklace": [("s", NECK), ("f", "M48 58l9 11-9 13-9-13z")],
    "choker": [("s", "M20 36c9 13 47 13 56 0"), ("t", "M20 30c9 10 47 10 56 0"), ("f", "M48 48l8 10-8 12-8-12z")],
    "chain": [("d", NECK), ("a", "M48 60a6 6 0 1 0 0 12 6 6 0 1 0 0-12z")],
    "ring": [("s", "M48 40a19 19 0 1 0 0 38 19 19 0 1 0 0-38z"), ("f", "M48 14l11 11-11 15-11-15z")],
    "glove": [("f", GLOVE), ("t", "M30 62h28")],
    "gauntlet": [("f", GLOVE), ("a", "M30 64h28v14a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4z"), ("w", "M44 50l5 6-5 7-5-7z")],
    "bracelet": [("s", "M18 48a30 15 0 1 0 60 0 30 15 0 1 0-60 0z"), ("t", "M26 50a22 9 0 0 0 44 0"), ("f", "M48 54l8 9-8 10-8-10z")],
    "pants": [("f", "M30 16h36l5 62H54l-6-38-6 38H25z"), ("s", "M30 26h36"), ("t", "M48 26v12")],
    "boots": [("f", "M34 16h20v34l22 10c5 2 5 16 0 16H34z"), ("s", "M32 78h48"), ("t", "M34 38h20M34 28h20")],
    # 礼物
    "postcards": [("f", "M30 22l44 8-6 40-44-8z"), ("f", "M18 34h48v36H18z"), ("a", "M50 40h10v12H50z"), ("t", "M24 48h18M24 56h18M24 64h30")],
    "musicbox": [("f", "M20 56h56v20H20z"), ("f", "M20 56l8-12h40l8 12z"), ("t", "M36 44L26 14M60 44l10-30"), ("s", "M44 34V18l12-3v15"), ("a", "M40 30a4 4 0 1 0 0 8 4 4 0 1 0 0-8zM52 27a4 4 0 1 0 0 8 4 4 0 1 0 0-8z")],
    "geiger": [("f", "M26 26h44a4 4 0 0 1 4 4v46a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V30a4 4 0 0 1 4-4z"), ("s", "M32 54a16 16 0 0 1 32 0"), ("s", "M48 54l9-11"), ("t", "M60 26V12M32 66h32M32 72h20"), ("a", "M60 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8z")],
    "can": [("f", "M26 28c0-8 44-8 44 0v44c0 8-44 8-44 0z"), ("s", "M26 28c0 8 44 8 44 0"), ("a", "M26 42c0 8 44 8 44 0v16c0 8-44 8-44 0z"), ("t", "M44 22v-8h8v8M52 16h10")],
    "stamp": [("f", "M22 58h52v18H22z"), ("f", "M40 58V44c-8-6-8-26 8-26s16 20 8 26v14z"), ("t", "M30 67c4-4 8 4 12 0s8 4 12 0 8 4 12 0"), ("a", "M22 80h52v4H22z")],
    "perfume": [("f", "M30 40h36a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6V46a6 6 0 0 1 6-6z"), ("s", "M40 40V30h16v10"), ("a", "M36 16h24v14H36z"), ("w", "M48 50l7 10-7 10-7-10z"), ("t", "M68 20h8M72 14l6-4M72 26l6 4")],
    # 任务标记
    "m_daily": [("s", "M48 20a28 28 0 1 0 0 56 28 28 0 1 0 0-56z"), ("s", "M48 32v17l11 8")],
    "m_main": [("f", STAR)],
    "m_explore": [("s", "M48 18a30 30 0 1 0 0 60 30 30 0 1 0 0-60z"), ("a", "M60 36L52 52 36 60l8-16z"), ("w", "M48 45a3 3 0 1 0 0 6 3 3 0 1 0 0-6z")],
    "m_flag": [("s", "M30 14v70"), ("f", "M30 18h38l-10 14 10 14H30z")],
    "m_mask": [("f", "M18 34c14-8 46-8 60 0 2 18-10 30-18 30-6 0-8-6-12-6s-6 6-12 6c-8 0-20-12-18-30z"), ("a", "M28 40c6-2 12 0 14 6-6 3-12 2-14-6zM68 40c-6-2-12 0-14 6 6 3 12 2 14-6z")],
    # 邮件、头像、个人页的入口
    "mail": [("f", "M14 28h68v44H14z"), ("s", "M14 30l34 25 34-25"), ("a", "M70 16a10 10 0 1 0 0 20 10 10 0 1 0 0-20z")],
    "mail_read": [("f", "M14 44l34-24 34 24v32H14z"), ("s", "M14 44l34 22 34-22")],
    "person": [("f", "M48 22a14 14 0 1 0 0 28 14 14 0 1 0 0-28z"), ("f", "M20 84c0-16 12-26 28-26s28 10 28 26z")],
    "p_crown": [("f", "M22 64l-7-32 19 14 14-24 14 24 19-14-7 32z"), ("s", "M22 74h52")],
    "p_ticket": [("f", "M14 32h68v11a7 7 0 0 0 0 14v11H14V57a7 7 0 0 0 0-14z"), ("t", "M38 34v32"), ("a", "M54 44l4 6 7 1-5 5 1 7-7-3-6 3 1-7-5-5 7-1z")],
    "p_cart": [("s", "M12 22h12l8 36h38l8-26H30"), ("a", "M40 64a6 6 0 1 0 0 12 6 6 0 1 0 0-12zM64 64a6 6 0 1 0 0 12 6 6 0 1 0 0-12z")],
    "p_link": [("s", "M40 36H26a12 12 0 0 0 0 24h14M56 36h14a12 12 0 0 1 0 24H56M36 48h24")],
    "p_cal": [("f", "M18 26h60v52H18z"), ("s", "M18 40h60M32 18v14M64 18v14"), ("t", "M30 54h8M44 54h8M58 54h8M30 66h8M44 66h8")],
    "p_horn": [("f", "M16 40v16h12l24 18V22L28 40z"), ("s", "M62 38c6 5 6 15 0 20"), ("t", "M70 28c13 10 13 30 0 40")],
    "p_gear": [("f", "M48 30a18 18 0 1 0 0 36 18 18 0 1 0 0-36z"), ("s", "M48 14v10M48 72v10M14 48h10M72 48h10M24 24l7 7M65 65l7 7M72 24l-7 7M31 65l-7 7"), ("w", "M48 42a6 6 0 1 0 0 12 6 6 0 1 0 0-12z")],
    "p_info": [("s", "M48 18a30 30 0 1 0 0 60 30 30 0 1 0 0-60z"), ("s", "M48 44v22M48 31v1")],
    "p_spark": [("f", "M48 14c3 19 15 31 34 34-19 3-31 15-34 34-3-19-15-31-34-34 19-3 31-15 34-34z")],
    "p_scan": [("s", "M18 34V18h16M62 18h16v16M78 62v16H62M34 78H18V62M30 48h36")],
    "p_pen": [("f", "M22 74l4-16 34-34 12 12-34 34z"), ("s", "M52 32l12 12"), ("t", "M16 82h40")],
    "p_key": [("s", "M30 34a14 14 0 1 0 0 28 14 14 0 1 0 0-28z"), ("s", "M44 48h38M68 48v12M78 48v9")],
    # 底部导航
    "n_role": [("s", "M48 14a15 15 0 1 0 0 30 15 15 0 1 0 0-30z"), ("s", "M18 82c0-18 13-28 30-28s30 10 30 28")],
    "n_bag": [("s", "M48 12l32 16v40L48 84 16 68V28z"), ("s", "M16 28l32 16 32-16M48 44v40")],
    "n_home": [("s", "M48 8c4 22 18 36 40 40-22 4-36 18-40 40-4-22-18-36-40-40 22-4 36-18 40-40z")],
    "n_mission": [("s", "M24 18h48v64H24z"), ("s", "M36 12h24v12H36z"), ("s", "M34 40h28M34 54h28M34 68h16")],
    "n_partner": [("s", "M48 80C24 62 12 48 12 34a18 18 0 0 1 36-4 18 18 0 0 1 36 4c0 14-12 28-36 46z")],
}

# 输出路径(去掉扩展名) -> (图形, 颜色, 有没有底板)
ICONS = {
    "item/exp": ("chip", "ice", 1), "item/credit": ("coin", "gold", 1), "item/supply_card": ("card", "ice", 1), "item/special_card": ("card_star", "gold", 1),
    "item/crystal": ("crystal", "violet", 1), "item/box_white": ("crate", "white", 1), "item/box_green": ("crate", "green", 1), "item/box_blue": ("crate", "blue", 1),
    "item/box_race": ("crate_race", "orange", 1), "item/box_purple": ("crate", "purple", 1), "item/box_orange": ("crate", "orange", 1), "item/gift_green": ("gift", "green", 1), "item/gift_blue": ("gift", "blue", 1), "item/gift_purple": ("gift", "purple", 1),
    "item/gift_orange": ("gift", "orange", 1), "item/daily_point": ("star", "gold", 1),
    "home/ico_gem": ("gem", "violet", 0), "home/ico_coin": ("coin", "gold", 0), "home/ico_bolt": ("bolt", "ice", 0), "home/ico_plus": ("plus", "ice", 0),
    "ui/ico_power": ("power", "rose", 0), "ui/ico_power_dark": ("power", "rose", 0),
    "equip/prism": ("prism", "orange", 1), "equip/pistol": ("pistol", "white", 1), "equip/pistol_color": ("pistol_color", "green", 1), "equip/rifle": ("rifle", "green", 1),
    "equip/vest": ("vest", "white", 1), "equip/vest_green": ("vest_green", "green", 1), "equip/tuxedo": ("tuxedo", "purple", 1), "equip/armor_pink": ("armor", "blue", 1),
    "equip/hat": ("hat", "purple", 1), "equip/helmet_grey": ("helmet", "green", 1), "equip/helmet_brown": ("helmet_old", "green", 1),
    "equip/neck_gold": ("necklace", "purple", 1), "equip/choker": ("choker", "blue", 1), "equip/chain": ("chain", "green", 1), "equip/ring": ("ring", "purple", 1),
    "equip/glove_white": ("glove", "purple", 1), "equip/gauntlet": ("gauntlet", "blue", 1), "equip/bracelet": ("bracelet", "blue", 1),
    "equip/pants": ("pants", "purple", 1), "equip/boots": ("boots", "blue", 1),
    "gift/papers": ("postcards", "orange", 1), "gift/holo": ("musicbox", "orange", 1), "gift/perfume": ("perfume", "orange", 1),
    "gift/can": ("can", "purple", 1), "gift/geiger": ("geiger", "blue", 1), "gift/rouge": ("stamp", "blue", 1),
    "role/if_head": ("helmet", "ice", 0), "role/if_neck": ("necklace", "ice", 0), "role/if_weapon": ("pistol", "ice", 0), "role/if_hand": ("glove", "ice", 0),
    "role/if_armor": ("vest", "ice", 0), "role/if_pants": ("pants", "ice", 0), "role/if_shoes": ("boots", "ice", 0),
    "mission/ico_daily": ("m_daily", "gold", 2), "mission/ico_main": ("m_main", "rose", 2), "mission/ico_explore": ("m_explore", "violet", 2),
    "mission/ico_red": ("m_flag", "rose", 2), "mission/ico_white": ("m_mask", "white", 2),
    "mail/ico": ("mail", "rose", 2), "mail/ico_read": ("mail_read", "dim", 2), "friend/avatar": ("person", "ice", 4),
    "ui/p_crown": ("p_crown", "gold", 4), "ui/p_ticket": ("p_ticket", "gold", 4), "ui/p_cart": ("p_cart", "gold", 4), "ui/p_link": ("p_link", "ice", 4),
    "ui/p_cal": ("p_cal", "ice", 4), "ui/p_horn": ("p_horn", "rose", 4), "ui/p_gear": ("p_gear", "rose", 4), "ui/p_info": ("p_info", "rose", 4),
    "ui/p_spark": ("p_spark", "rose", 4), "ui/p_scan": ("p_scan", "ice", 4), "ui/p_pen": ("p_pen", "rose", 4), "ui/p_key": ("p_key", "rose", 4),
    "ui/p_person": ("person", "rose", 4), "ui/p_mission": ("n_mission", "rose", 4),
    "nav/ico_role": ("n_role", "dim", 3), "nav/ico_bag": ("n_bag", "dim", 3), "nav/ico_home": ("n_home", "dim", 3),
    "nav/ico_mission": ("n_mission", "dim", 3), "nav/ico_partner": ("n_partner", "dim", 3),
    "nav/ico_role_on": ("n_role", "rose", 3), "nav/ico_bag_on": ("n_bag", "rose", 3), "nav/ico_home_on": ("n_home", "rose", 3),
    "nav/ico_mission_on": ("n_mission", "rose", 3), "nav/ico_partner_on": ("n_partner", "rose", 3),
}


def draw(glyph, color, plate):
    c = C[color]
    glow, body = [], []
    for kind, d in G[glyph]:
        if kind == "f":
            glow.append('<path d="%s"/>' % d)
            body.append('<path d="%s" fill="%s" fill-opacity=".3" stroke="url(#ln)" stroke-width="3.4"/>' % (d, c))
        elif kind == "s":
            glow.append('<path d="%s"/>' % d)
            body.append('<path d="%s" fill="none" stroke="url(#ln)" stroke-width="%s"/>' % (d, "7" if plate == 3 else "3.8"))
        elif kind == "d":  # 一串小珠子
            body.append('<path d="%s" fill="none" stroke="url(#ln)" stroke-width="5" stroke-dasharray=".1 8.4"/>' % d)
        elif kind == "t":
            body.append('<path d="%s" fill="none" stroke="%s" stroke-width="2.2" opacity=".9"/>' % (d, c))
        elif kind == "a":
            body.append('<path d="%s" fill="%s"/>' % (d, c))
        elif kind == "w":
            body.append('<path d="%s" fill="#fff"/>' % d)
    out = ['<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 96 96">', "<defs>",
           '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232849"/><stop offset="1" stop-color="#0b0d1a"/></linearGradient>',
           '<radialGradient id="gl" cx=".5" cy="1" r=".85"><stop offset="0" stop-color="%s" stop-opacity=".6"/><stop offset="1" stop-color="%s" stop-opacity="0"/></radialGradient>' % (c, c),
           '<linearGradient id="ln" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>' % ("#9a9ec2" if color == "dim" else "#fff", c),
           "</defs>"]
    if plate == 1:  # 物品格:夜色玻璃,下沿透出品质色,左上角一个小切角
        out += ['<g id="layer-plate" inkscape:groupmode="layer" inkscape:label="底板">',
                '<rect width="96" height="96" rx="11" fill="url(#bg)"/>', '<rect width="96" height="96" rx="11" fill="url(#gl)"/>',
                '<rect x="1.5" y="1.5" width="93" height="93" rx="9.5" fill="none" stroke="%s" stroke-width="2.2"/>' % c,
                '<path d="M0 24V11A11 11 0 0 1 11 0h13z" fill="%s"/>' % c, "</g>"]
    elif plate == 2:  # 任务标记:六边形牌子
        out += ['<g id="layer-plate" inkscape:groupmode="layer" inkscape:label="底板">',
                '<path d="M48 3l39 22.5v45L48 93 9 70.5v-45z" fill="url(#bg)" stroke="%s" stroke-width="2.5"/>' % c,
                '<path d="M48 3l39 22.5v45L48 93 9 70.5v-45z" fill="url(#gl)"/>', "</g>"]
    elif plate == 4:  # 圆牌:头像、入口按钮
        out += ['<g id="layer-plate" inkscape:groupmode="layer" inkscape:label="底板">',
                '<circle cx="48" cy="48" r="45" fill="url(#bg)" stroke="%s" stroke-width="2.5"/>' % c, '<circle cx="48" cy="48" r="45" fill="url(#gl)"/>', "</g>"]
    scale = {1: "translate(48 50) scale(.78) translate(-48 -48)", 2: "translate(48 48) scale(.62) translate(-48 -48)", 4: "translate(48 48) scale(.6) translate(-48 -48)"}.get(plate)
    out.append('<g id="layer-glyph" inkscape:groupmode="layer" inkscape:label="图形" stroke-linecap="round" stroke-linejoin="round"%s>' % (' transform="%s"' % scale if scale else ""))
    if glow and plate != 3:
        out.append('<g fill="none" stroke="%s" stroke-width="10" opacity=".22">%s</g>' % (c, "".join(glow)))
    out += body
    out += ["</g>", "</svg>"]
    return "\n".join(out) + "\n"


def main():
    for path, (glyph, color, plate) in sorted(ICONS.items()):
        dst = os.path.join(OUT, path + ".svg")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "w", encoding="utf-8") as f:
            f.write(draw(glyph, color, plate))
    print("画好了 %d 个图标" % len(ICONS))


if __name__ == "__main__":
    main()
