#!/usr/bin/env python3
"""扫一遍 assets/biao/,把「表已经画好了哪些图」写进 js/skin_assets.js。

表的图和里的图同名同路径(里在 assets/img/,表在 assets/biao/);表的矢量图标扩展名是 .svg,也算同名。页面取图时先查这张表:
有就用表的,没有就先借用里的,并记进欠账。往 assets/biao/ 里加了图之后跑一次:

    python3 tools/skin_assets.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIAO = os.path.join(ROOT, "assets", "biao")


def main():
    have = {}
    img = os.path.join(ROOT, "assets", "img")
    for base, _, files in os.walk(BIAO):
        for f in sorted(files):
            if not f.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".svg")):
                continue
            rel = os.path.relpath(os.path.join(base, f), BIAO).replace(os.sep, "/")
            have[rel] = 1
            if f.endswith(".svg"):  # 表的图标是矢量的:里那张同名的位图(扩展名不同)也指到它
                stem = os.path.splitext(rel)[0]
                for ext in (".webp", ".jpg", ".png"):
                    if os.path.exists(os.path.join(img, stem + ext)):
                        have[stem + ext] = rel
    out = os.path.join(ROOT, "js", "skin_assets.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("/* 由 tools/skin_assets.py 生成,不要手改:表(biao)已经画好的图 */\n")
        f.write("NL.biaoAssets = " + json.dumps(dict(sorted(have.items())), ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("表已有 %d 张图" % len(have))


if __name__ == "__main__":
    main()
