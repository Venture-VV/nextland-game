#!/usr/bin/env python3
"""从母版裁出「表」在运行时用的图。

母版(出图工具给的原图)放在 art/biao/masters/,不进 assets/,页面不会直接加载它。
art/biao/cast.json 记着每个角色用哪张母版、脸在哪、卡面裁哪一块。跑一次:

    python3 tools/build_biao_assets.py

会生成(都在 assets/biao/ 下):
    partner/art_<id>.webp   立绘,1080×1578。下沿和四周融进夜色底,所以不用抠图
    partner/card_<id>.webp  列表里的卡面,414×552
    partner/face_<id>.webp  头像,240×240
有 art/biao/hires/ 里的高清版(tools/upscale.py 出的)就从高清版裁,没有就从母版裁。
    battle/me.jpg、battle/enemy.jpg  战斗里的头像(和里的同名),另有 js/embed_biao.js 给 3D 战斗用
    cast.json 里 _backgrounds 列的页面背景(例如 home/bg.webp)
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


def load(master):
    """优先用 art/biao/hires/ 里的高清版(tools/upscale.py 出的);返回 (图, 相对母版放大了几倍)。
    cast.json 里的坐标是按母版写的,用高清版时要乘上这个倍数。"""
    hi = os.path.join(SRC, "hires", os.path.splitext(master)[0] + ".webp")
    base = Image.open(os.path.join(SRC, "masters", master))
    if os.path.exists(hi):
        im = Image.open(hi).convert("RGB")
        return im, im.width / base.width
    return base.convert("RGB"), 1.0


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
    for dst, master in cast.get("_backgrounds", {}).items():  # 页面背景:只缩放,不裁脸
        os.makedirs(os.path.dirname(os.path.join(OUT, dst)), exist_ok=True)
        load(master)[0].resize((1080, 1578), Image.LANCZOS).save(os.path.join(OUT, dst), quality=82, method=6)
    for cid, c in cast.items():
        if cid.startswith("_"):
            continue
        path = os.path.join(SRC, "masters", c["master"])
        if not os.path.exists(path):
            print("缺母版,跳过:", cid, c["master"])
            continue
        im, k = load(c["master"])
        # 立绘出到 1080 宽(页面上占 360 宽,三倍屏也不糊)
        fade_into_night(im).resize((1080, 1578), Image.LANCZOS).save(os.path.join(OUT, "partner", "art_%s.webp" % cid), quality=86, method=6)
        x0, y0, x1, y1 = [round(v * k) for v in c["card"]]
        im.crop((x0, y0, x1, y1)).resize((414, 552), Image.LANCZOS).save(os.path.join(OUT, "partner", "card_%s.webp" % cid), quality=86, method=6)
        cx, cy, s = [round(v * k) for v in c["face"]]
        im.crop((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2)).resize((240, 240), Image.LANCZOS).save(os.path.join(OUT, "partner", "face_%s.webp" % cid), quality=88, method=6)
        n += 1
    print("裁好了 %d 个角色" % n)
    # 战斗里的头像:我方用主角的脸,对手用 rival。原版战斗直接读图片;3D 战斗要把图内嵌成 data: 地址
    # (双击打开时浏览器不让本地图片当贴图),所以另写一份 js/embed_biao.js
    import base64
    os.makedirs(os.path.join(OUT, "battle"), exist_ok=True)
    emb = {}
    for key, cid, name in (("avatarMe", "hero", "me.jpg"), ("avatarFoe", "rival", "enemy.jpg")):
        c = cast.get(cid)
        path = c and os.path.join(SRC, "masters", c["master"])
        if not path or not os.path.exists(path):
            print("缺母版,战斗头像跳过:", cid)
            continue
        im, k = load(c["master"])
        cx, cy, s = [round(v * k) for v in c["face"]]
        dst = os.path.join(OUT, "battle", name)
        im.crop((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2)).resize((320, 320), Image.LANCZOS).save(dst, quality=90)
        emb[key] = "data:image/jpeg;base64," + base64.b64encode(open(dst, "rb").read()).decode("ascii")
    with open(os.path.join(ROOT, "js", "embed_biao.js"), "w", encoding="utf-8") as f:
        f.write("/* 由 tools/build_biao_assets.py 生成,不要手改:表的 3D 战斗头像贴图 */\n")
        f.write("NL.embedBiao = %s;\n" % (json.dumps(emb) if len(emb) == 2 else "null"))
    subprocess.check_call([sys.executable, os.path.join(ROOT, "tools", "skin_assets.py")])


if __name__ == "__main__":
    main()
