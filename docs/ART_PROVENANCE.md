# 「表(Biao)」皮肤美术资产来源与合规台账 (Art Provenance)

> 用途：记录 `art/masters/` 母版与 `assets/biao/` 运行时派生资产的生成方式、提示词结构、后处理脚本与合规审查结论，供项目上线前法务与平台审核核对。

---

## 1. 合规与版权声明

1. **零第三方作品/画师引用**：全部 19 张母版提示词均由纯美术技法标签（2D 有色线稿、赛璐璐半厚涂、午夜霓虹轮廓光、服装材质剪裁）编写，**未引用任何商业游戏名称、动画名称、角色名或画师姓名**。
2. **零真实用户信息残留**：所有「表」皮肤资产均由母版与 `tools/build_biao_assets.py` 矢量化绘制生成，不包含任何手机录屏帧、真实玩家 UID 或线下互动二维码。
3. **16+ 适龄合规核验**：
   - 全部 10 名角色均为 21–30 岁成年人形象；
   - 女性角色（主角猎手、林鸮、银砂、吴谩）上身躯干均为不透光缎面/制服材质，仅在锁骨上领口处采用黑色蕾丝拼接；
   - 22 岁青年研究员 `顾轩` 采用整洁学院风研究长外套，无任何擦边化表现。
4. **AI 生成内容披露说明**：母版原画由内置文生图模型生成，经 `tools/build_biao_assets.py` 执行连通域抠图、去溢色、卡片构图、品质底板合成与程序化 UI 绘制。若目标分发渠道要求标注「含 AI 生成辅助美术资产」，可按本台账直接披露。

---

## 2. 母版资产清单 (`art/masters/*.webp`, 共 19 张 / 2.69 MB)

| 母版文件 | 分辨率 | 类别 | 核心标签摘要（不含任何第三方作品/人名） | 派生运行时资产 (`assets/biao/`) |
|---|---|---|---|---|
| `char_heroine.webp` | 768×1376 | 角色立绘 | `1girl, mature adult 23yo cyber hunter, black hair with crimson streaks, high ponytail, cropped black-red leather jacket, opaque black satin corset top with sheer black floral lace high neck yoke, asymmetric high-slit skirt with metal chain and thigh garter, sleek cybernetic left forearm, flat #565070 studio background` | `chars/heroine.webp`, `avatars/heroine.webp`, `battle/me.jpg`, `home/card.webp`, `role/*.jpg`, `js/embed.js (avatarMeBiao)` |
| `char_jiguang.webp` | 768×1376 | 角色立绘 | `1boy, mature adult 30yo sovereign, platinum blonde short hair, golden laurel crown, ivory ceremonial long coat with gold embroidery, crimson velvet cape lining, black silk shirt slightly unbuttoned at collar with gold cross pendant, black leather gloves, flat #565070 studio background` | `chars/jiguang.webp`, `cards/jiguang.webp`, `avatars/jiguang.webp`, `partner/jiguang.jpg`, `partner/archive.jpg` |
| `char_ling.webp` | 768×1376 | 角色立绘 | `1boy, mature adult 24yo street broker, messy jet-black hair, amber eyes, collarbone bandages, open matte-black techwear hooded trench coat, dark fitted tank top, chest strap, fingerless black leather gloves, flat #565070 studio background` | `chars/ling.webp`, `cards/ling.webp`, `avatars/ling.webp`, `partner/ling.jpg`, `partner/visual.jpg` |
| `char_maguangyao.webp` | 768×1376 | 角色立绘 | `1boy, mature adult 28yo scientist, dark navy-black parted hair, violet eyes, rimless glasses with gold chain, tailored white lab coat with black trim, slate shirt with loosened burgundy tie, biting black leather glove tip on right hand, glowing cyan-pink prism crystal in left hand, flat #565070 studio background` | `chars/maguangyao.webp`, `cards/maguangyao.webp`, `avatars/maguangyao.webp`, `partner/maguangyao.jpg` |
| `char_linxiao.webp` | 768×1376 | 角色立绘 | `1girl, mature adult 27yo tactical commander, long straight black hair, silver-grey eyes, gold rimless glasses, white-grey techwear long coat, opaque black satin corset bodice with sheer black lace high collar yoke, high-slit charcoal pencil skirt, silver cybernetic thigh band, flat #565070 studio background` | `chars/linxiao.webp`, `cards/linxiao.webp`, `avatars/linxiao.webp`, `partner/linxiao.jpg` |
| `char_guxuan.webp` | 768×1376 | 角色立绘 | `1boy, adult 22yo clean researcher, fluffy warm brown short hair, bright emerald-amber eyes, neat navy-blue tailored long research coat with silver piping, slate button-up shirt with silver bolo tie, holding glowing cyan holographic data tablet, flat #565070 studio background` | `chars/guxuan.webp`, `cards/guxuan.webp`, `avatars/guxuan.webp` |
| `char_yinsha.webp` | 768×1376 | 角色立绘 | `1girl, mature adult 25yo cyber songstress, wavy dark violet-black hair, crystal star headband, violet eyes, metallic silver satin mermaid evening gown with opaque structured bodice and sheer black lace halter neck, high leg slit, vintage chrome standing microphone, flat #565070 studio background` | `chars/yinsha.webp`, `cards/yinsha.webp`, `avatars/yinsha.webp`, `partner/yinsha.jpg`, `story/yin.jpg` |
| `char_wuman.webp` | 768×1376 | 角色立绘 | `1girl, adult 22yo tactical cadet, flowing dark violet-black long hair, determined grey-violet eyes, dark navy tactical coat with cyan trim, armored shoulder pads, utility belt, combat boots, flat #565070 studio background` | `chars/wuman.webp`, `avatars/wuman.webp`, `story/wu.jpg` |
| `char_xiongjie.webp` | 768×1376 | 角色立绘 | `1boy, mature adult 29yo elite officer, slicked-back black hair, tinted aviator sunglasses, confident smirk, black double-breasted military coat with gold piping and epaulettes, fingerless tactical gloves, flat #565070 studio background` | `chars/xiongjie.webp`, `avatars/xiongjie.webp`, `story/xiong.jpg` |
| `char_linran.webp` | 768×1376 | 角色立绘 | `1boy, adult 25yo cybernetic rival duelist, silver-white tousled hair, glowing crimson visor, black and crimson high-collar combat suit, flat #565070 studio background` | `chars/linran.webp`, `avatars/linran.webp`, `battle/enemy.jpg`, `friend/avatar.jpg`, `js/embed.js (avatarFoeBiao)` |
| `map_neon_park.webp` | 1264×848 | 等距园区场景 | `2d isometric cyberpunk amusement park at midnight, neon bowling & billiards hall top-left, glowing violet four-pointed crystal star plaza bottom-left, transparent glass cyber racing tube center, velvet lounge & golden carousel right, clean anime architectural lineart` | `home/map.webp`, `extra/parkmap.jpg`, `partner/list.jpg` |
| `login_kv.webp` | 768×1376 | 主视觉场景 | `2d anime vertical key visual, midnight cyberpunk amusement park skyline, giant glowing magenta-cyan ferris wheel and crystal spire, rose petals and neon bokeh, no characters, no text` | `bg/login_kv.webp`, `login/bg.jpg`, `login/loading.jpg`, `mission/banner.jpg` |
| `partner_stage_bg.webp` | 768×1376 | 交互舞台背景 | `2d anime luxury penthouse lounge interior at night, floor-to-ceiling curved glass window overlooking magenta-cyan cyberpunk skyline, dark obsidian marble floor, warm champagne-gold sconces, empty center stage` | `bg/partner_stage.webp`, `cards/*.webp`, `partner/*.jpg`, `role/*.jpg`, `extra/profile.jpg` |
| `story_bg.webp` | 768×1376 | 剧情场景 | `2d anime cyberpunk atrium corridor at rainy midnight, wet reflective dark stone floor, neon cyan and crimson holographic pillars, atmospheric depth, no characters, no text` | `bg/story_bg.webp`, `story/*.jpg`, `stage/head_*.jpg` |
| `supply_stage_bg.webp` | 768×1376 | 抽卡圣殿背景 | `2d anime futuristic astral gacha vault, glowing champagne-gold and cyan holographic astrolabe rings floating above dark obsidian pedestal, magenta starlight particles, no text` | `bg/supply_stage.webp`, `supply/*.jpg`, `shop/head.jpg` |
| `tower_arena_bg.webp` | 768×1376 | 竞技塔背景 | `2d anime cyberpunk endless spire arena looking upward into starry neon night, dark obsidian monoliths with crimson and cyan light beams, champagne-gold energy ring, no text` | `bg/tower_arena.webp`, `rank/bg.jpg`, `modes/*.jpg` |
| `icons_equip_a.webp` | 1024×1024 | 4×3 装备精灵表 | `2d anime game icon sprite sheet, 4x3 grid on flat #565070 background: iridescent prism crystal, white cyber pistol, black tactical vest, purple top hat, gold chain pendant, signet ring, white formal glove, blue crystal gauntlet, dark trousers, neon combat boots, midnight tuxedo, cyan crystal choker` | `equip/{prism,pistol,vest,hat,neck_gold,ring,glove_white,gauntlet,pants,boots,tuxedo,choker}.webp` |
| `icons_equip_b.webp` | 1024×1024 | 4×4 装备与道具表 | `2d anime game icon sprite sheet, 4x4 grid on flat #565070 background: pink-cyan chestplate, crystal bracelet, aviator helmet, patrol helmet, silver chain, assault rifle, painted pistol, green vest, exp chip, credit coin, supply card, special card, crystal shard, white/green/blue supply crates` | `equip/{armor_pink..vest_green}.webp`, `item/{exp,credit,supply_card,special_card,crystal,box_*}.webp`, `home/ico_*.webp` |
| `icons_gifts_cards.webp` | 1024×1024 | 4×4 礼物与礼盒表 | `2d anime game icon sprite sheet, 4x4 grid on flat #565070 background: vintage geiger counter, nostalgic aroma tin can, ornate rouge compact, folded vintage newspapers, glowing holo memory cube, ribboned crystal perfume bottle, green/blue/purple/orange gift boxes, cyber crate, rose-gold star badge` | `gift/{geiger,can,rouge,papers,holo,perfume}.webp`, `item/{gift_*,box_race,daily_point}.webp` |

---

## 3. 可复现构建指令

在仓库根目录执行以下命令即可从 `art/masters/` 重新构建全部 191 张 `assets/biao/` 资产、刷新 `js/skin_assets.js` 与 `js/embed.js` 并校验资源哈希：

```bash
python3 tools/build_biao_assets.py
python3 tools/stamp.py
```
