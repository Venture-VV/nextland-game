# 给接手的 AI

动手前先读 [`docs/PLAN.md`](docs/PLAN.md):目标、已经定下的事、六个 PR 的范围和验收、进度板都在里面。

硬规矩(详见计划文档第 10 节):

1. 不引入构建步骤和框架,必须能双击 `index.html` 直接跑。
2. 改了脚本、样式、音乐,提交前跑 `python3 tools/stamp.py`。
3. 提交前跑 `node tools/walkthrough.cjs`,全过才提交;新功能要加进走查。
4. 不改 `js/data.js` 里已有的名字、ID、数值。
5. 不合并 `feat/deepspace-wonderland-theme` 分支。
6. 表和里两套皮肤共用一份逻辑,皮肤只决定画成什么样。
7. 做完一项,在 `docs/PLAN.md` 的进度板打勾并写上是谁做的。

项目怎么跑、目录结构、素材怎么来的,见 [`README.md`](README.md)。
