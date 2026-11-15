# 表系统（绯夜霓虹 · 2D 赛博特触立绘）开发交接手册

> 分支：`feat/biao-2d-cyber-neon`（基于 `main` 的表里双系统架构构建，**零改动 `js/data.js` 与 `assets/img/`**）

---

## 1. 交付范围概览

本分支一次性完成 `docs/PLAN.md` 中 **PR4（表的画风与角色）** 与 **PR5（表的全界面美术与交互舞台）** 的全部目标：

1. **原创 2D 视觉体系（《绯夜霓虹 · Crimson Neon Nocturne》）**
   - 彻底摒弃早期的圆润 3D 甜美风，采用 **2D 彩线半厚涂立绘 + 暗夜黑曜石毛玻璃（`#0b0d1a`）+ 玫红霓虹（`#ff3d7f`）+ 冰青光效（`#7de8ff`）+ 香槟金细线（`#e8cf9a`）**。
   - **16+ 合规与人设边界**：全员明确成年人比例（21–30 岁），张力来自高定剪裁（不透明黑缎束腰、锁骨蕾丝拼接、腿环、黑皮手套、微松领带）与眼神光影，零裸露与违规动作；**顾轩（`guxuan`）严格保持 22 岁清爽青年研究员形象，不做任何性感化处理**。
   - **零外部版权污染**：提示词、代码、文档均不引用任何现成游戏、动画或画师名称。
2. **零借用独立资产包（`assets/biao/`）**
   - `art/masters/` 保存 19 张高分辨率 2D 母版（`2.69 MB`，发布小程序或精简包时可排除 `art/` 目录）。
   - `tools/build_biao_assets.py` 一键生成 `assets/biao/` 下全部 **191 个运行时文件（总计 `7.44 MB` < `8 MB` 预算）**，100% 覆盖 `assets/img/` 的 160 个同名路径并新增立绘（`chars/`）、卡面（`cards/`）、头像（`avatars/`）与场景底图（`bg/`）。
   - 表皮肤下 `Object.keys(NL.skinMiss).length === 0`，不向 `里（li）` 借用任何一张图片。
3. **2D 立绘特触互动舞台与全界面 `renderBiao`**
   - 伙伴详情页（`partnerInfo.renderBiao`）：全身透明底呼吸立绘 + **头顶 / 领口 / 腰际三区点触 `HitAreas`** + 弹簧回弹、指尖波纹、脸红光晕、实时心率 BPM 跳动 + **下置台词气泡（`top: 438px`，绝不遮挡面部）** + 底部伙伴快速切换条 + 暗金档案弹窗。
   - 立绘近景鉴赏页（`partnerVisual.renderBiao`）：支持 `1.0x / 1.32x` 近景缩放、三档霓虹轮廓光氛围切换（`绯夜霓虹 / 冰青月影 / 香槟暖金`）及纯净隐藏 HUD。
   - 女主赛博猎人角色页（`role.renderBiao`）：实时战力与 10 个 `[data-slot]` 装备槽分栏展示，完整复用原装备详情/穿脱/强化/芯片弹窗逻辑。
   - 视觉小说剧情舞台（`NL.ui.story` 表分支）：全屏暗夜庭院底图 + 当前说话人透明立绘（`吴谩`、`熊杰`、`银砂`）+ 底部黑曜石姓名牌对话框。
   - 乐园地图、登录页、伙伴 SSR 全息倾斜图鉴、赠礼页、补给抽卡、排行榜、个人主页及 2D/3D 双战斗界面全部完成表皮肤适配。
4. **表里存档 100% 等价**
   - 表专属视觉偏好（如鉴赏页灯光模式）独立存储在 `localStorage['nextland-biao-pref-v1']`，绝不写入 `NL.state`，也不调用 `NL.rand()`，确保同一套操作在 `li` 与 `biao` 下产出的存档逐项完全一致。

---

## 2. 核心文件清单与职责

| 路径 | 作用说明 | 对 `里 (li)` 的影响 |
|---|---|---|
| `art/masters/*.webp` | 19 张 2D 原始母版（角色立绘、场景、装备与礼物图标集） | 无（不参与 `li` 加载） |
| `tools/build_biao_assets.py` | 母版三遍 `#565070` 抠图、立绘锚点对齐、暗夜霓虹底板合成、更新 `js/skin_assets.js` 与 `js/embed.js` | 不触碰 `assets/img/` 及原版头像/音乐 |
| `assets/biao/**` | 191 个运行时表皮肤资产（`7.44 MB`） | 仅 `NL.skin() === 'biao'` 时由 `NL.img()` 读取 |
| `js/skin_assets.js` | 自动生成的表皮肤可用路径白名单 | 原架构文件，按规重新生成 |
| `js/biao_ui.js` | 所有 `renderBiao` 页面实现、三区点触舞台、表版 `story` 与 `notice` 包装 | `NL.skin() !== 'biao'` 时立即原样返回 |
| `css/skin-biao.css` | 全部作用域限定在 `html[data-skin=biao]` 下的暗夜玻璃、霓虹动效与硬编码背景图覆盖 | 零全局泄漏，不影响 `li` 像素保真度 |
| `js/battle3d.js` / `js/battle_classic.js` | 按 `NL.skin() === 'biao'` 切换冰青/玫红/香槟金配色与 `avatarMeBiao` / `avatarFoeBiao` | `li` 分支保持原样 |
| `tools/walkthrough.cjs` | 第 8 组断言表皮肤 `skinMiss === 0` + 表里存档逐项相等；新增第 9 组表皮肤全流程走查 | 保留原有全部 8 组走查 |
| `docs/ART_BIBLE_BIAO.md` | 表皮肤美术圣经（色板、字体、角色 DNA、标签规范、16+ 边界） | 文档 |
| `docs/ART_PROVENANCE.md` | 19 张母版与派生资产的来源、参数与合规台账 | 文档 |

---

## 3. 常用命令（零构建依赖）

### 3.1 预览与切换皮肤
无需打包工具，任意静态服务器（如 `python3 -m http.server 8765`）或 GitHub Pages 即可运行：
- 默认（里皮肤）：`index.html`
- 直达表皮肤：`index.html?skin=biao`
- 游戏内随时切换：点击主页左侧 **「表 / 里」** 按钮，或在主页右上角 **「设置」** 中切换，进度与数值实时保留。

### 3.2 重新生成表皮肤资产与缓存版本号
当替换或微调 `art/masters/` 下的母版，或修改 `js/`、`css/` 后，依次执行：

```bash
# 1. 从 art/masters/ 重新裁切并构建 assets/biao/、js/skin_assets.js 与 js/embed.js
python3 tools/build_biao_assets.py

# 2. 更新 index.html 与 version.txt 中的静态资源哈希版本号
python3 tools/stamp.py

# 3. 校验版本号是否最新
python3 tools/stamp.py --check
```

### 3.3 运行全量无头浏览器验收走查
```bash
# 运行全部 9 组走查（含里保真度流程、动效检查、表里翻面零借用断言、表里存档一致性对比、表皮肤三区特触全流程）
node tools/walkthrough.cjs /tmp/shots
```

---

## 4. 合并进 `main` 的检查清单

在将 `feat/biao-2d-cyber-neon` 合并至 `main` 前，可执行以下 3 条命令做最终确认：

```bash
# 1. 确认 js/data.js 与 assets/img/ 零改动（输出必须为空）
git diff main -- js/data.js assets/img/

# 2. 确认版本号最新
python3 tools/stamp.py --check

# 3. 跑通全部自动化走查
node tools/walkthrough.cjs
```

如需进一步缩减微信小程序主包体积，可在小程序打包配置中忽略 `art/`、`docs/`、`tools/`、`videos/` 目录，并将 `assets/biao/chars/` 与 `assets/biao/bg/` 挂载至小程序分包或 CDN（仅需调整 `js/skin.js` 中 `NL.img` 的表资源前缀）。
