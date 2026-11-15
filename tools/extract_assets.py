#!/usr/bin/env python3
"""从录屏里截取界面素材。

用法:
    python3 tools/extract_assets.py [录屏路径] [--work 临时目录] [--only 前缀]

做法:先用 ffmpeg 按每秒 2 帧把录屏抽成整帧(第 n 帧对应 (n-1)/2 秒),
再按 tools/asset_manifest.py 里的清单裁剪。坐标都是录屏原始像素(720x1562)。
"""
import argparse
import glob
import os
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asset_manifest import MANIFEST  # noqa: E402


def ensure_frames(video, work):
    fdir = os.path.join(work, "f")
    if len(glob.glob(os.path.join(fdir, "*.jpg"))) > 900:
        return fdir
    os.makedirs(fdir, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", video, "-vf", "fps=2", "-q:v", "2",
         os.path.join(fdir, "%04d.jpg")],
        check=True,
    )
    return fdir


def save(im, out, quality):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    ext = os.path.splitext(out)[1].lower()
    if ext == ".jpg":
        im.convert("RGB").save(out, quality=quality, optimize=True)
    elif ext == ".webp":
        im.save(out, quality=quality, method=6)
    else:
        im.save(out, optimize=True)


def remove_role_arrow(im):
    """角色页底图上烙着一个粉色引导箭头(指向底部导航的「任务」)。
    录屏里每一帧都有它,没有干净的帧可以借,所以把它盖住的三样东西重画出来:
    深色战力条的斜边、黄色「权益加成」按钮的左端、两者之间的浅色背景。
    只改偏粉的像素,别的地方不动。箭头改由页面在引导开着时画。坐标是录屏像素。
    """
    import numpy as np
    from PIL import ImageDraw, ImageFilter
    im = im.convert("RGB")
    x0, y0, x1, y1 = 452, 1318, 524, 1400
    a = np.asarray(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    pink = (r - g > 45) & (b - g > 30)  # 品红和它半透明压在别的颜色上的样子;黄、灰、黑都不满足
    m = np.zeros(pink.shape, bool)
    m[y0:y1, x0:x1] = pink[y0:y1, x0:x1]
    mask = Image.fromarray((m * 255).astype("uint8")).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(0.8))
    light_top, light_bot = im.getpixel((500, 1316)), im.getpixel((440, 1394))
    bar, yellow = im.getpixel((430, 1350)), im.getpixel((566, 1350))
    fix = im.copy()
    d = ImageDraw.Draw(fix)
    d.rectangle([x0, y0, x1, 1378], fill=light_top)
    d.rectangle([x0, 1378, x1, y1], fill=light_bot)
    d.polygon([(x0, 1326), (482, 1326), (455, 1378), (x0, 1378)], fill=bar)      # 战力条右端的斜边
    d.ellipse([507, 1342, 553, 1388], fill=yellow)                               # 按钮的左端
    d.ellipse([511, 1348, 546, 1384], fill=bar)                                  # 皇冠图标的圆底(和战力条同色)
    d.rectangle([x0, 1326, x1, 1330], fill=bar)                                  # 战力条顶边向右延伸的细线
    return Image.composite(fix, im, mask)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video", nargs="?", default=None)
    ap.add_argument("--work", default=os.path.join(ROOT, ".work"))
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    video = a.video or sorted(glob.glob(os.path.join(ROOT, "videos", "*.mov")))[0]
    fdir = ensure_frames(video, a.work)
    cache = {}
    n = 0
    for e in MANIFEST:
        out = e["out"]
        if a.only and not out.startswith(a.only):
            continue
        src = e.get("src")  # 可选:从中间产物(如 HUD 图层)裁剪
        key = src or e["frame"]
        if key not in cache:
            path = os.path.join(a.work, src) if src else os.path.join(fdir, "%04d.jpg" % e["frame"])
            cache[key] = Image.open(path)
            cache[key].load()
        im = cache[key]
        if "box" in e:
            im = im.crop(tuple(e["box"]))
        if e.get("alpha_floor") and im.mode == "RGBA":
            # 把很淡的残留透明度清零
            r, g, b, al = im.split()
            al = al.point(lambda v, t=e["alpha_floor"]: 0 if v < t else v)
            im = Image.merge("RGBA", (r, g, b, al))
        for x0, y0, x1, y1 in e.get("erase", []):
            # 抹掉混进来的其他元素(坐标是裁剪后的)
            im = im.copy()
            im.paste((0, 0, 0, 0), (x0, y0, x1, y1))
        for frame, (sx0, sy0, sx1, sy1), (dx, dy) in e.get("patch", []):
            # 从另一帧取一块贴上来(坐标是裁剪后的)
            other = Image.open(os.path.join(fdir, "%04d.jpg" % frame))
            im = im.copy()
            im.paste(other.crop((sx0, sy0, sx1, sy1)), (dx, dy))
        for x0, y0, x1, y1, color in e.get("fill", []):
            # 用纯色盖掉一块(坐标是裁剪后的)
            im = im.copy()
            im.paste(tuple(color), (x0, y0, x1, y1))
        if e.get("role_arrow"):
            im = remove_role_arrow(im)
        if e.get("mirror_br"):
            # 图标右下角烙着数量(x1、100 等):用左下角镜像盖掉,数量改由页面来画
            fw, fh = e["mirror_br"]
            im = im.copy()
            w, h = im.size
            pw, ph = round(w * fw), round(h * fh)
            y0 = h - ph - round(h * e.get("mirror_up", 0.0))
            patch = im.crop((0, y0, pw, y0 + ph)).transpose(Image.FLIP_LEFT_RIGHT)
            im.paste(patch, (w - pw, y0))
        if e.get("mirror_bl"):
            # 左下角压着等级徽章:用右下角镜像盖掉
            fw, fh = e["mirror_bl"]
            im = im.copy()
            w, h = im.size
            pw, ph = round(w * fw), round(h * fh)
            patch = im.crop((w - pw, h - ph, w, h)).transpose(Image.FLIP_LEFT_RIGHT)
            im.paste(patch, (0, h - ph))
        if e.get("scale"):
            im = im.resize((round(im.width * e["scale"]), round(im.height * e["scale"])), Image.LANCZOS)
        save(im, os.path.join(ROOT, "assets", "img", out), e.get("q", 86))
        n += 1
    print("written", n, "assets")


if __name__ == "__main__":
    main()
