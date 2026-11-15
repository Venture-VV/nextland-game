#!/usr/bin/env python3
"""从母版裁出「表」在运行时用的图。

母版(出图工具给的原图)放在 art/biao/masters/,不进 assets/,页面不会直接加载它。
art/biao/cast.json 记着每个角色用哪张母版、脸在哪、卡面裁哪一块。跑一次:

    python3 tools/build_biao_assets.py

会生成(都在 assets/biao/ 下):
    partner/art_<id>.webp   立绘,720×1052。下沿和四周融进夜色底,所以不用抠图
    partner/card_<id>.webp  列表里的卡面,276×368
    partner/face_<id>.webp  头像,160×160
然后自动更新 js/skin_assets.js。改完记得再跑 tools/stamp.py。
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "art", "biao")
OUT = os.path.join(ROOT, "assets", "biao")
NIGHT = (11, 13, 26)  # 表的夜色底,和 css/skin-biao.css 里的 --b-night 一致


def fade_into_night(im):
    """母版是深色纯底。把四周和下沿渐渐压成夜色,立绘就能直接叠在页面上,看不出方框。"""
    w, h = im.size
    mask = Image.new("L", (w, h), 255)
    d = ImageDraw.Draw(mask)
    for i in range(int(h * 0.26)):  # 下沿 26% 渐隐
        d.line([(0, h - 1 - i), (w, h - 1 - i)], fill=int(255 * (i / (h * 0.26)) ** 1.4))
    edge = Image.new("L", (w, h), 0)
    ImageDraw.Draw(edge).rectangle([int(w * 0.07), int(h * 0.05), int(w * 0.93), h], fill=255)
    edge = edge.filter(ImageFilter.GaussianBlur(w * 0.06))
    mask = Image.composite(mask, Image.new("L", (w, h), 0), edge)
    return Image.composite(im, Image.new("RGB", (w, h), NIGHT), mask)


def main():
    cast = json.load(open(os.path.join(SRC, "cast.json"), encoding="utf-8"))
    os.makedirs(os.path.join(OUT, "partner"), exist_ok=True)
    n = 0
    for cid, c in cast.items():
        path = os.path.join(SRC, "masters", c["master"])
        if not os.path.exists(path):
            print("缺母版,跳过:", cid, c["master"])
            continue
        im = Image.open(path).convert("RGB")
        fade_into_night(im).resize((720, 1052), Image.LANCZOS).save(os.path.join(OUT, "partner", "art_%s.webp" % cid), quality=84, method=6)
        x0, y0, x1, y1 = c["card"]
        im.crop((x0, y0, x1, y1)).resize((276, 368), Image.LANCZOS).save(os.path.join(OUT, "partner", "card_%s.webp" % cid), quality=84, method=6)
        cx, cy, s = c["face"]
        im.crop((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2)).resize((160, 160), Image.LANCZOS).save(os.path.join(OUT, "partner", "face_%s.webp" % cid), quality=86, method=6)
        n += 1
    print("裁好了 %d 个角色" % n)
    subprocess.check_call([sys.executable, os.path.join(ROOT, "tools", "skin_assets.py")])


if __name__ == "__main__":
    main()
