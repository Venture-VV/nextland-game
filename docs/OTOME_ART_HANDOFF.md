# 《新生乐园世界 · 暮光幻境》女性向美术重塑研发交接手册（Developer Handoff）

> **交接定位**：本文档面向当前负责《新生乐园世界（Nextland World）》网页复刻与后续小程序工程化的开发工程师 / 开发 AI（Claude Code 等），完整记录 **女性向美术体系重塑（Step 1 已完成交付 + Step 2 待续清单 + 与最新 `main` 无损合并指南）** 的全部设计决策、文件改动、资产管线与自动化回归约束。

---

## 一、分支与仓库状态速览

| 项目 | 当前状态与说明 |
| :--- | :--- |
| **GitHub 仓库** | `Venture-VV/nextland-game` |
| **本项工作所在分支** | `origin/feat/deepspace-wonderland-theme`（基于复刻 5/5 合并点 `929f41a` 切出） |
| **主分支隔离情况** | `main` 分支 **100% 未被触碰**（当前 `origin/main` 已演进至 `71597ee`，即合入了 PR #2「背景音乐与声音开关；战斗重做成 3D 节拍对决」） |
| **自动化走查状态** | `node tools/walkthrough.cjs` 五大端到端流程 **5/5 全绿通过（Exit Code `0`，0 脚本报错，0 控制台报错）** |
| **运行时新增包体** | `assets/img/otome/` 共 **31 张 Retina `.webp`**，总体积仅 **`1.64 MB`**（远低于微信小程序 `4 MB` 主包红线） |
| **公网免服直连预览** | `https://raw.githack.com/Venture-VV/nextland-game/feat/deepspace-wonderland-theme/index.html` |

---

## 二、业务方已拍板锁定的 9 项核心设计决策（不可违背红线）

在前期调研与 `/grill-me` 逐项对齐后，业务方已正式锁定以下 9 条产品与美术准则，后续开发与扩量请严格遵循：

1. **核心视觉锚点**：对标 **《恋与深空》次世代 3D 半写实次表面散射（SSS）柔光立绘质感** × **《暮光幻境（Twilight Wonderland）》粉紫云海星芒游乐园氛围**。全面淘汰原版黑底硬核赛博军工风、45° 机甲斜切角、酸绿（`#c8f52e`）/ 刺眼品红（`#f414dc`）/ 电光紫（`#6c16ff`）及黑橙施工警戒条。
2. **双主角自由切换**：默认采用高颜值 **飒爽特遣猎人女主（`heroine`）**，并在园区主页左上角玩家名片内置 **`♀ 女主 ⇄` / `♂ 男主 ⇄`** 一键实时切换至 **清隽少年男主（`hero_male`）**（存档字段 `NL.state.heroGender`：`'f' | 'm'`）。
3. **驻园伙伴阵容 100% 兼容线下点位**：保留 **4 男（`冀光`、`凌`、`麻光耀`、`顾轩`）+ 2 女（`林鸮`、`银砂`）** 共 6 位伙伴编制及 `新生乐园L2-01` ~ `L2-06` 实体园区驻点映射，确保线上线下双栖引导零冲突。
4. **道具/装备命名与数值 100% 锁死**：**严禁修改 `js/data.js` 中任何原有装备名、道具名、槽位 ID、掉落及数值公式**（如「便携式盖革计数器」「阪神信用点」等必须原名保留，只升级图标与界面视觉）。
5. **角色历史遗留缺陷修复**：
   - **顾轩（`guxuan`，`L2-05`）**：移除原版 `blank: true` 导致的 `000000` 深蓝缺图报错，实装温室暖金阳光下的银蓝羊绒大衣天才少年立绘，恢复设定文案 `“萌点：天才少年，奶狗恋爱”`；
   - **麻光耀（`maguangyao`，`L2-03`）**：补齐缺失立绘，定妆为金丝半框眼镜 + 全息星轨棱镜的斯文智性恋学者；
   - **凌（`ling`，`L2-02`）**：将原本遮死五官的全黑连帽改为**连帽半退**，露出锋利眉眼、琥珀绯红瞳色与浅笑；
   - **伙伴列表画廊**：补齐全部 6 张 `276×426` 高定竖版半身卡面（修复原版空框）。
6. **立绘舞台微交互层（`NL.ui.charStage`）**：全屏立绘支持 CSS 柔和呼吸律动（`otomeBreathe`）、漂浮星芒光斑（`.starlight-mote`）、**轻触立绘弹出爱心涟漪（`.heart-ripple`）与专属心动台词气泡（`.char-quote-bubble`，固定在胸口下方 `top: 420px`，严禁遮挡角色眼睛与面部）**，并已预留 `<video class="char-live">` 插槽供后续平滑接入 `LivePortrait` 微表情循环视频。
7. **三大情绪体验升级**：
   - **剧情对话（已完成）**：彻底淘汰纯黑/酸绿剪影（`story/wu.jpg`、`story/xiong.jpg`、`story/yin.jpg`），改为暮光水晶穹顶微景深虚化背景 + 拱形羽化高清立绘 + 香槟金姓名铭牌 + 珠光磨砂字幕框；
   - **线下 NPC 扫码卡（已完成）**：将生硬白框二维码重塑为双侧半圆打孔缺口 + 撕票虚线 + 香槟金定位框的 **《鎏金星光乐园通行证》**（保留 `[data-act=fake-scan]` 模拟扫码能力）；
   - **战斗情绪化改版（待在 Step 2 与最新 3D 节拍战斗融合）**：去除红黑危险警报条，将战斗舞台调色与反馈统一为女主携陪伴伙伴的「星芒共鸣试炼」。
8. **UI 材质体系（Frosted Pearl Glassmorphism）**：子页面采用晨雾粉蓝浅色画布（`--bg-dawn-gradient`），浮层采用高透珠光磨砂毛玻璃（`rgba(255,255,255,0.82)` + `backdrop-filter: blur(18px)`）配 `1px` 香槟金细描边（`rgba(216,178,120,0.62)`）；主操作按钮采用香槟金渐变（`.btn.purple`），情感/赠礼按钮采用星云玫瑰粉渐变（`.btn.pink`）。
9. **分阶段交付策略**：Step 1（核心规范 + 全角色定妆 + 登录/主页/伙伴全套/剧情/委托通行证）已交付验收；Step 2（角色装备页、行囊、20 件高定装备图标、补给抽卡、商城、排行、外围页与战斗星芒化）由接手开发继续推进。

---

## 三、已沉淀在仓库内的规范 Skills 与美术资产管线

为了让 Claude Code 或其他 AI 助手接手时自动加载设计规范，已将 3 套专属 Skill 直接写入仓库 `.claude/skills/` 目录：

1. **[`.claude/skills/nextland-art-bible/SKILL.md`](../.claude/skills/nextland-art-bible/SKILL.md)**
   - 包含完整全局色彩与字体 Token、禁用色负面清单、10 位角色锁脸 Prompt DNA 锚点，以及后续使用 `PuLID-Flux` / `InstantID` + `ComfyUI_VNCCS` + `LivePortrait` 扩充表情差分与呼吸视频的工业化参数规范。
2. **[`.claude/skills/otome-ui-motion/SKILL.md`](../.claude/skills/otome-ui-motion/SKILL.md)**
   - 定义图文分离 DOM 原则（严禁把按钮和文字烤死进底图）、三级珠光毛玻璃层级、鎏金门票缺口样式及 `.char-stage` 动效曲线（`cubic-bezier(0.22, 1, 0.36, 1)`）。
3. **[`.claude/skills/miniapp-asset-pipeline/SKILL.md`](../.claude/skills/miniapp-asset-pipeline/SKILL.md)**
   - 定义微信小程序 `4 MB` 包体预算控制、连通域去底防误伤白衣准则及立绘/竖卡/方形头像尺寸标准。

### 美术源图与自动化构建脚本
- **无损高清母版源图（13 张）**：已存入 `assets/masters/otome/*.jpg`（约 `9.0 MB`，**注意：仅作研发源图留档，打包小程序时请勿打入发布包**）。
- **一键重生成运行时 WebP 脚本**：
  ```bash
  python3 tools/build_otome_assets.py
  ```
  运行后自动从 `assets/masters/otome/` 读取母版，按精确视觉锚点裁切并输出 **31 张 `.webp`** 至 `assets/img/otome/`（总计 `1.64 MB`）：
  - `assets/img/otome/bg/`：`map_twilight.webp`（`1887×1305`，与 `D.map` `3773×2609` 严格 `1:2` 对齐，无缝延展顶部暮光天空）、`kv_login.webp`（`720×1290`）、`story_atrium.webp`（`720×1290`）
  - `assets/img/otome/chars/`：`heroine`、`hero_male`、`jiguang`、`ling`、`maguangyao`、`linxiao`、`guxuan`、`yinsha`、`wuman`、`xiongjie`（10 张 `720×1290` 全身/七分立绘）
  - `assets/img/otome/cards/`：6 位伙伴 + 双主角共 8 张 `276×426`（`3x`）伙伴画廊竖卡
  - `assets/img/otome/avatars/`：10 张 `192×192`（`3x`）眼部对齐方形头像

---

## 四、Step 1 已修改代码逐文件说明

| 文件路径 | 核心改造内容 |
| :--- | :--- |
| `index.html` | 更新 `<meta name="theme-color" content="#eef3fa">` 与标题 `《新生乐园世界 · 暮光幻境》`。 |
| `css/app.css` | 建立 `:root` 女性向珠光香槟金 Design Tokens；重构顶部 `#title-tag`、小程序右上角胶囊 `#capsule`、纤细左箭头 `.back-btn`、底部 5 枚矢量线性鎏金导航栏 `#nav`、顶部水平居中轻提示 `.toast`、珠光弹窗 `.dlg` / `.win`（保留 `.win.dark` 深色可读性供未改造子页兼容）、`.reward` 礼遇弹窗、星芒飘带 `.powerup`、柔光引导气泡 `.guide-*` 及 `.char-stage` 呼吸星芒舞台样式。 |
| `css/screens.css` | 重写 `lines 1–572`（登录公告、登录 KV、加载页、暮光园区地标铭牌与猎人名片 HUD、委托列表、鎏金星光乐园通行证、微景深穹顶剧情舞台）及 `lines 649–976`（6 卡伙伴画廊、伙伴呼吸舞台、机密档案弹窗、情感赠礼、视觉鉴赏、等级权益、伙伴每日委托）；**完整保留了角色、背包、战斗、冒险、排行、商城、补给、邮件、好友、个人中心等未改页面的原有 CSS 选择器，确保零破版**。 |
| `js/data.js` | ① `D.storyPlates` 将 `熊杰`、`吴谩`、`银砂` 指向 `otome/chars/*.webp`；② 为 `D.partners` 全部 6 位伙伴补全 `title`（专属称号）、`file`（年龄/生日/星座/喜好/厌恶档案）与 `quotes`（每人 3 句点触心动语音文案）；③ 修复 `guxuan`（`art: 'guxuan'`，移除 `blank: true`，恢复 `trait: '萌点：天才少年，奶狗恋爱'`）。**全部原有物品、装备、任务、卡池 ID 与中文名分字未动**。 |
| `js/core.js` | ① 默认存档新增 `heroGender: 'f'` 与 `homePartner: 'jiguang'`；② 新增 `NL.heroKey()` 返回 `'heroine' | 'hero_male'`；③ 新增 `NL.ui.charStage(artKey, opts)` 通用立绘舞台组件（含呼吸层、星芒粒子层、点触爱心涟漪、心声气泡及 `<video class="char-live">` 可选插槽）；④ 底部 `#nav` 注入 5 枚精细 SVG 线性图标与中文标签。 |
| `js/screens/login.js` | 重构轻奢防沉迷入园邀请函弹窗、`kv_login.webp` 暮光摩天轮主视觉、`✦ 步入新生乐园 ✦` 香槟金主按钮及柔光星芒加载进度页。 |
| `js/screens/home.js` | 园区底图切换至 `otome/bg/map_twilight.webp`；三大场馆升级为悬浮珠光地标铭牌（`.landmark-pin`）；左上角猎人名片支持头像动态跟随双主角、`♀ 女主 ⇄` / `♂ 男主 ⇄` 一键切换、陪伴伙伴快捷胶囊（`.hud-companion-pill`）、右侧悬浮毛玻璃入口列及底部「暮光冒险 / 园区互动」双主行动卡。 |
| `js/screens/partner.js` | 全面重构伙伴协议 7 大子视图/弹窗：① 6 卡竖版高定画廊 `partner`（带当前主页陪伴金标与排序切换）；② 全屏呼吸互动舞台 `partnerInfo`；③ 轻奢机密档案弹窗 `showArchive`；④ 情感赠礼舞台 `partnerGift`；⑤ 视觉鉴赏与主页陪伴设定页 `partnerVisual`（支持「纯净鉴赏」隐藏 UI 与一键设为主页陪伴伙伴）；⑥ 等级权益时间轴 `partnerLv`；⑦ 每日邀约委托页 `partnerDaily`。 |
| `js/screens/story.js` | 升级为 `story_atrium.webp` 微景深虚化穹顶舞台 + `.story-char-wrap` 拱形羽化立绘窗 + 香槟金姓名牌 + 打字机磨砂字幕框 + 珠光分支选项按钮。 |
| `js/screens/mission.js` | 升级星芒手账委托顶栏、珠光分段页签、柔光积分礼遇轨道，并将线下扫码弹窗 `showQr()` 重构为双侧打孔缺口的 **《鎏金星光乐园通行证》**（绘制香槟金三眼定位码与撕票虚线，保留 `[data-act=fake-scan]`）。 |

---

## 五、与最新 `origin/main`（PR #2 `71597ee`）无损合并指南

在本分支开发期间，`origin/main` 合入了 PR #2（提交 `6ec515d` / Merge `71597ee`：**「加背景音乐和声音开关，战斗重做成 3D 节拍对决」**）。两套改动模块高度正交，仅在 **4 个基础文件** 有极小交集，按以下 4 步即可在 5 分钟内完成零冲突合并：

1. **`index.html`**：
   - 保留本分支的 `<meta name="theme-color" content="#eef3fa">` 与 `<title>新生乐园世界 · 暮光幻境</title>`；
   - 合入 `main` 新增的 3 个脚本引用（注意顺序保持在 `js/data.js` 之后、`js/screens/battle.js` 之前）：
     ```html
     <script src="js/embed.js"></script>
     <script src="js/audio.js"></script>
     ...
     <script src="js/battle3d.js"></script>
     ```
2. **`js/core.js`**：
   - 在顶层 `window.NL` 初始化对象中补上 `bootHooks: []`：
     ```js
     const NL = (window.NL = { screens: {}, data: {}, ui: {}, game: {}, fmt: {}, defaults: [], bootHooks: [], scale: 1 });
     ```
   - 在 `NL.boot` 中 `if (...) NL.reset(); else NL.load();` 下一行补上：
     ```js
     NL.bootHooks.forEach((f) => f());
     ```
3. **`css/app.css`**：
   - 合入 `main` 新增的右上角全局声音开关 `#sound-btn`，建议将其配色同步微调为珠光磨砂白底金边以融入新 UI：
     ```css
     #sound-btn {
       position: absolute; left: 326px; top: 18px; width: 26px; height: 26px; border-radius: 50%; z-index: 86;
       background: rgba(255, 255, 255, 0.82); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
       border: 1px solid rgba(216, 178, 120, 0.65); color: #7D5E38;
       display: flex; align-items: center; justify-content: center;
       box-shadow: 0 4px 12px rgba(72, 84, 128, 0.14);
     }
     #sound-btn svg { width: 14px; height: 14px; }
     #sound-btn.off { color: rgba(114, 121, 148, 0.55); }
     #sound-btn:active { transform: scale(0.92); }
     ```
4. **`js/screens/login.js` & `css/screens.css`**：
   - `js/screens/login.js`：`NL.screens.login` 对象包含 `plate: true`（与 `main` 一致）；
   - `css/screens.css`：`lines 1–572` 与 `lines 649–976` 采用本分支样式，`/* ---------- 战斗 ---------- */` 段落采用 `main` 的 3D 节拍对决样式。
5. **发布/合入清理提醒**：
   - 根目录下的 `preview_step1_offline.html`（`8.1 MB`）仅为方便业务方免服务器双击预览生成的单文件内嵌包，**合入 `main` 或打包微信小程序时请执行 `git rm preview_step1_offline.html`**；
   - `assets/masters/otome/`（`9.0 MB`）为高清设计母版源图，小程序构建脚本应只拷贝 `assets/img/` 而排除 `assets/masters/`。

---

## 六、自动化走查（`tools/walkthrough.cjs`）防回归契约

后续开发在推进 Step 2 时，请务必保护以下选择器与交互热区坐标（`360×781` 视口），每改完一组界面跑一次 `node tools/walkthrough.cjs`：

1. **主页地图中央拖拽区**：Flow 1 会执行 `drag: [200, 500, 60, 380]`，请确保主页 `(200, 500)` 附近不被全屏透明遮罩或大面板挡住指针事件（`.hud` 容器须保持 `pointer-events: none`，仅内部子按钮 `pointer-events: auto`）。
2. **底部边缘空白关闭弹窗坐标**：Flow 2/3/4/5 多次通过 `clickXY: [20, 760]` 与 `clickXY: [20, 770]` 点击 `.mask` 空白处关闭弹窗（如物品详情、任务详情、伙伴档案、商城确认窗等）。**所有弹窗内容卡片底部请务必留出 `bottom > 30px`（即 `y < 750`）的安全边距**，切勿盖住 `(20, 760)` 与 `(20, 770)`。
3. **剧情推进坐标与开场标题卡时序**：Flow 2 在点击 `[data-act-task=m1]` 后等待 `1600ms` 即通过 `clickXY: [180, 250]` 连续推进对白，并点击 `.story-choice button:nth-child(2)` 与 `.story-skip`。请保持 `story.js` 标题卡自动消散时间 `<= 1300ms`。
4. **核心 `data-*` 属性契约**：保留 `[data-act=notice-ok]`、`[data-act=enter]`、`[data-nav=*]`、`[data-tab=*]`、`[data-task=*]`、`[data-act-task=*]`、`[data-claim=*]`、`[data-act=fake-scan]`、`[data-partner=*]`、`[data-gift=*]`、`[data-act=send]`、`[data-plv=*]`、`[data-pd=*]`、`[data-act=pd-refresh]`。

---

## 七、Step 2 待接手开发清单（Remaining Scope）

接手合并完 Step 1 后，请按照 `.claude/skills/nextland-art-bible/SKILL.md` 与 `.claude/skills/otome-ui-motion/SKILL.md` 完成剩余外围界面的统一女性向换装：

1. **角色与装备页（`js/screens/role.js` + `css/screens.css` 角色段）**
   - 撤换原版黑底持步枪重装雇佣兵（`assets/img/role/`），根据 `NL.heroKey()` 动态展示 `otome/chars/heroine.webp`（猎人女主）或 `otome/chars/hero_male.webp`（清隽男主）全身呼吸立绘；
   - 将左侧「档案 / 装备 / 强化 / 芯片」斜切黑底标签与 8 个装备槽、属性面板、芯片矩阵全面升级为珠光磨砂毛玻璃 + 香槟金边框，底部战力条去除橙红爆炸贴图。
2. **20 件高定猎人装备图标与行囊页（`js/screens/bag.js` + `assets/img/equip/`）**
   - **严禁改动 `D.equips` 中的中文名称与属性**；将 20 件军事迷彩装备图标重绘为清透银白/香槟金/星芒蓝高定猎人饰品与礼装风图标（`.webp`），并将背包网格页改造成珠光浅色陈列柜。
3. **星海回响补给抽卡（`supply`）、商城（`shop`）、排行榜（`rank`）**
   - 补给页替换原版霓虹工业盲盒图，设计柔和鎏金星海共鸣卡池横幅（`基础共鸣 / 高阶回响 / 星冕特需`），保留原有抽卡概率、消耗与确认弹窗选择器；
   - 商城与排行榜去除紫黑霓虹表头，换装晨雾浅色珠光卡片与香槟金前三名皇冠徽章。
4. **冒险选关（`adventure` / `stages` / `modes`）与 3D 节拍战斗（`battle3d.js` / `battle.js`）视觉融合**
   - 在保留 PR #2 新实现的 **Three.js 3D 节拍对决玩法与背景音乐机制** 基础上，将战斗场景的红黑工业暗色调、刺眼警报条与硬核受击字样，调色升级为 **暮光粉紫星芒结界 + 猎人女主与陪伴伙伴共鸣色调**，实现玩法硬核有趣、视觉唯美统一的最终形态。
5. **外围辅助页收尾（`js/screens/extra.js`：邮件、好友、个人中心、会员绑定、日历、园区导览图、园区互动）**
   - 将剩余 `.win.dark` 弹窗与深色底板统一迁移至浅色珠光毛玻璃卡片样式，并在个人中心同步显示当前选定的女主/男主头像。

---

## 八、可直接复制给接手开发 AI 的启动指令

如果您使用 Claude Code 或其他开发 AI 接手，可直接将下面这段话发给它：

```text
请先 git fetch origin feat/deepspace-wonderland-theme，完整阅读该分支上的：
1. docs/OTOME_ART_HANDOFF.md（女性向美术重塑交接手册与合并指南）
2. .claude/skills/ 下的 3 个设计规范与资产管线 Skill（nextland-art-bible、otome-ui-motion、miniapp-asset-pipeline）

先按交接手册第五节将 origin/feat/deepspace-wonderland-theme 无损合入当前工作分支（保留 PR #2 的背景音乐与 3D 节拍战斗，清理仅用于预览的 preview_step1_offline.html），跑通 node tools/walkthrough.cjs 确保 5/5 全绿；随后按交接手册第七节继续推进 Step 2（角色装备页换装双主角立绘、行囊与20件高定装备图标、补给商城排行浅色珠光化、以及3D节拍战斗的暮光星芒调色融合），全过程严禁修改 js/data.js 中任何原有装备/道具中文名称与数值逻辑。
```
