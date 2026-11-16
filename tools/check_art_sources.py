#!/usr/bin/env python3
"""核对「表的每个美术素材都有一份矢量源文件」,并把对照清单写到 art/biao/SOURCES.md。

    python3 tools/check_art_sources.py            # 核对并重写清单
    python3 tools/check_art_sources.py --check    # 只核对(走查用这个)

assets/biao/ 里的每个文件必须是下面三种之一,否则以非零状态退出:
- .svg:图标,本身就是矢量源文件(tools/build_biao_icons.py 画的);
- 从某张母版裁出来的图(art/biao/cast.json 里登记着是哪张):母版要有高清版和分层的 SVG;
- story/none.jpg:没人说话时的纯色底,不算美术素材。
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "art", "biao")
OUT = os.path.join(ROOT, "assets", "biao")


def main():
    cast = json.load(open(os.path.join(ART, "cast.json"), encoding="utf-8"))
    layers = json.load(open(os.path.join(ART, "vector", "layers.json"), encoding="utf-8"))
    src = {}  # 运行时的图 -> 母版文件名
    for cid, c in cast.items():
        if cid.startswith("_"):
            continue
        for kind in ("art", "card", "face"):
            src["partner/%s_%s.webp" % (kind, cid)] = c["master"]
    src["battle/me.jpg"] = cast["hero"]["master"]
    src["battle/enemy.jpg"] = cast["rival"]["master"]
    for key in ("_backgrounds", "_story"):
        src.update(cast.get(key, {}))
    for dst, sc in cast.get("_scenes", {}).items():
        src[dst] = sc["master"]
    rows, icons, bad = [], 0, []
    for base, _, files in os.walk(OUT):
        for f in sorted(files):
            rel = os.path.relpath(os.path.join(base, f), OUT).replace(os.sep, "/")
            if rel.endswith(".svg"):
                icons += 1
                continue
            if rel == "story/none.jpg":
                continue
            master = src.get(rel)
            if not master:
                bad.append("%s:cast.json 里没登记它是从哪张母版来的" % rel)
                continue
            name = os.path.splitext(master)[0]
            need = [("masters", master), ("hires", name + ".webp"), ("vector", name + ".svg")]
            miss = [d + "/" + n for d, n in need if not os.path.exists(os.path.join(ART, d, n))]
            if miss:
                bad.append("%s:缺 %s" % (rel, "、".join(miss)))
                continue
            rows.append((rel, name, "、".join(layers.get(name, {}).keys())))
    rows.sort(key=lambda r: (r[1], r[0]))
    with open(os.devnull if "--check" in sys.argv else os.path.join(ART, "SOURCES.md"), "w", encoding="utf-8") as f:
        f.write("# 表的美术素材和它们的源文件\n\n> 由 `tools/check_art_sources.py` 生成,不要手改。说明见 `docs/ART_VECTOR.md`。\n\n")
        f.write("- 位图素材 %d 个,来自 %d 张母版;每张母版都有高清版(`hires/`)和分层的矢量源文件(`vector/`)。\n" % (len(rows), len(set(r[1] for r in rows))))
        f.write("- 图标 %d 个,是 `assets/biao/` 下的 `.svg`,本身就是矢量源文件(`tools/build_biao_icons.py` 画的),不在下表里。\n\n" % icons)
        f.write("| 运行时的图(assets/biao/) | 母版(masters/) | 高清版(hires/) | 矢量源文件(vector/) | 图层 |\n|---|---|---|---|---|\n")
        for rel, name, ls in rows:
            f.write("| `%s` | `%s.webp` | `%s.webp` | `%s.svg` | %s |\n" % (rel, name, name, name, ls))
    if bad:
        print("有 %d 个素材没有矢量源文件:" % len(bad))
        for b in bad:
            print("  " + b)
        sys.exit(1)
    print("每个素材都有矢量源文件:位图 %d 个(%d 张母版),图标 %d 个。清单在 art/biao/SOURCES.md" % (len(rows), len(set(r[1] for r in rows)), icons))


if __name__ == "__main__":
    main()
