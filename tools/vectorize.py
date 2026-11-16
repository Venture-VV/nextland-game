#!/usr/bin/env python3
"""给「表」的每张美术素材出一份分层的矢量源文件(SVG)。

    python3 tools/vectorize.py [名字 ...]      # 不给名字就处理 art/biao/masters/ 里的全部

做法(思路来自 GitHub 上的几个项目,见 docs/ART_VECTOR.md):
1. 用 anime-seg 抠出人物,先分成「背景」和「人物」两大块;
2. 人物再按元素拆层:头部一带用人脸解析模型认出皮肤、五官、头发(戴头盔的是头盔),
   其余按颜色分成霓虹光、暗部与线条、服装;
3. 每一层单独交给 vtracer 描成矢量路径;
4. 合成一个 SVG:每层是一个带名字的图层(Inkscape 里是图层,Illustrator、Figma 里是编组),
   可以单独选中、隐藏、改色。

输入优先用 art/biao/hires/ 里的高清版(先跑 tools/upscale.py),没有就用母版。
输出在 art/biao/vector/<名字>.svg,另有一份 layers.json 记着每层占多大面积、有多少条路径。

头部是模型认的(脸在哪取自 art/biao/cast.json),头部以外靠颜色和位置,
所以边界不会完全准:垂下来的头发和深色衣领挨着时可能分错。它是给美术一个能直接上手改的起点,
不是手绘矢量稿的替代品。
"""
import io
import json
import os
import re
import sys

import cv2
import numpy as np
import vtracer
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import art_models  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "art", "biao")
OUT = os.path.join(ART, "vector")
WORK_W = 1248  # 描矢量时用的宽度:比母版(832)大一半,曲线更顺,文件又不至于太大

LAYERS = [  # (id, 图层名),从下到上
    ("background", "背景"), ("clothes", "服装"), ("shade", "暗部与线条"), ("skin", "皮肤"), ("features", "五官"), ("hair", "头发"),
    ("helmet", "头盔与面罩"), ("neon", "霓虹光"),
]


def clean(mask, k=3, min_area=0.0004):
    """去掉零碎的小块,补上小洞。"""
    m = mask.astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    m = cv2.morphologyEx(cv2.morphologyEx(m, cv2.MORPH_OPEN, kernel), cv2.MORPH_CLOSE, kernel)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= min_area * m.size:
            keep[lab == i] = 1
    return keep.astype(bool)


def touching(cand, seed):
    """cand 里和 seed 连着的那些块。"""
    n, lab = cv2.connectedComponents((cand | seed).astype(np.uint8), connectivity=8)
    ids = np.unique(lab[seed])
    return np.isin(lab, ids[ids > 0]) & cand


def split_layers(im, rgb, matte, face):
    """返回 {层 id: 布尔蒙版}。face 是 (中心 x, 中心 y, 边长)。
    头部一带交给人脸解析模型去认(皮肤、五官、头发、头盔),它不看肤色,所以脸被霓虹光染成粉的、青的也认得出;
    头部以外(垂下来的长发、手)再按颜色和位置补。"""
    h, w, _ = rgb.shape
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(np.int32)
    H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    lab_img = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    fg = matte > 127
    out = {"background": ~fg}
    parse, (bx0, by0, bx1, by1) = art_models.face_parse(im, face)
    head = np.zeros((h, w), bool)
    head[by0:by1, bx0:bx1] = True
    skin = clean(fg & np.isin(parse, art_models.FACE_SKIN), 3, 0.0003)
    feat = fg & np.isin(parse, art_models.FACE_FEATURES)
    hair = clean(fg & (parse == art_models.FACE_HAIR), 3, 0.0003)
    hat = fg & (parse == art_models.FACE_HAT)
    helmet = np.zeros((h, w), bool)
    if hat.sum() > 3 * max(1, skin.sum()):  # 几乎看不到脸:戴着头盔。头盔单独一层,不再分皮肤和头发
        helmet = clean(hat | skin | feat | hair, 5, 0.001)
        skin[:] = False
        feat[:] = False
        hair[:] = False
    else:
        feat = touching(feat, cv2.dilate(skin.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool)) if skin.any() else feat & False  # 五官得长在脸上
        # 头发常常垂到头部范围以外:取认出来的头发的主色,把范围外颜色相近、又和头发连着的人物像素接上
        px = lab_img[hair]
        if len(px) > 500:
            _, labels, centers = cv2.kmeans(px, 3, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0), 3, cv2.KMEANS_PP_CENTERS)
            counts = np.bincount(labels.ravel(), minlength=3)
            near = np.zeros((h, w), bool)
            for c in np.argsort(-counts)[:2]:
                if counts[c] > 0.2 * len(px):
                    near |= np.linalg.norm(lab_img - centers[c], axis=2) < 22
            more = clean(fg & ~head & near & ~skin, 5, 0.0006)
            hair |= touching(more, cv2.dilate(hair.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool))
        # 头部范围以外露出来的皮肤(手、锁骨):颜色和脸上的皮肤相近、面积够大的块
        px = lab_img[skin]
        if len(px) > 500:
            center = np.median(px, axis=0)
            cand = clean(fg & ~head & ~hair & (np.linalg.norm(lab_img - center, axis=2) < 16) & (V > 120), 5, 0.004)
            skin |= cand
    # 霓虹光:很亮、很艳的品红或冰青(脸、头发、头盔上的不算,它们留在各自的层里)
    neon = clean(fg & ~skin & ~feat & ~hair & ~helmet & (S > 135) & (V > 150) & (((H >= 138) & (H <= 176)) | ((H >= 80) & (H <= 104))), 3, 0.0002)
    rest = fg & ~skin & ~feat & ~hair & ~helmet & ~neon
    shade = clean(rest & (V < 46), 3, 0.0003)
    out.update(skin=skin, features=feat, hair=hair, helmet=helmet, neon=neon, shade=shade, clothes=rest & ~shade)
    return out


def trace(rgb, mask, scene=False):
    """把蒙版里的那部分画面描成一串 <path>。scene 给场景图用:没有人物可拆,细节全靠颜色分得够细;坐标取整省一点体积。"""
    rgba = np.dstack([rgb, (mask * 255).astype(np.uint8)])
    buf = io.BytesIO()
    Image.fromarray(rgba, "RGBA").save(buf, format="PNG")
    svg = vtracer.convert_raw_image_to_svg(buf.getvalue(), img_format="png", colormode="color", hierarchical="stacked", mode="spline",
                                           filter_speckle=8 if scene else 10, color_precision=7 if scene else 6, layer_difference=14 if scene else 22, corner_threshold=60,
                                           length_threshold=4.0, max_iterations=10, splice_threshold=45, path_precision=0 if scene else 1)
    return re.findall(r"<path[^>]*/>", svg)


def run(name, cast):
    src = os.path.join(ART, "hires", name + ".webp")
    master = os.path.join(ART, "masters", name + ".webp")
    im = Image.open(src if os.path.exists(src) else master).convert("RGB")
    mw, mh = Image.open(master).size
    im = im.resize((WORK_W, round(WORK_W * mh / mw)), Image.LANCZOS)
    rgb = np.asarray(im)
    k = WORK_W / mw
    entry = next((c for cid, c in cast.items() if not cid.startswith("_") and isinstance(c, dict) and c.get("master") == name + ".webp"), None)
    entry = entry or cast.get("_portraits", {}).get(name + ".webp")  # 只在剧情里出场的角色:没有卡面和头像,但也是人物,照样拆层
    is_bg = entry is None  # 不在角色表里的是页面背景:不抠人物,整张当背景,按明暗分两层
    if is_bg:
        v = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[..., 2]
        s = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)[..., 1]
        lights = clean((v > 150) & (s > 110), 3, 0.0002)
        masks, names = {"background": ~lights, "neon": lights}, [("background", "远景与建筑"), ("neon", "灯光")]
    else:
        matte = np.asarray(art_models.character_matte(im))
        face = tuple(round(x * k) for x in entry["face"])
        masks, names = split_layers(im, rgb, matte, face), LAYERS
    w, h = im.size
    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="%d" height="%d" viewBox="0 0 %d %d">' % (w, h, w, h),
             "<title>%s</title>" % name,
             "<desc>由 tools/vectorize.py 从 art/biao/masters/%s.webp 自动拆层、描线得到。每个 g 是一个图层。</desc>" % name]
    report = {}
    for lid, label in names:
        m = masks.get(lid)
        if m is None or m.sum() < 0.0005 * m.size:
            continue
        paths = trace(rgb, m, scene=is_bg)
        parts.append('<g id="layer-%s" inkscape:groupmode="layer" inkscape:label="%s">' % (lid, label))
        parts.extend(paths)
        parts.append("</g>")
        report[label] = {"面积占比": round(float(m.mean()), 4), "路径数": len(paths)}
    parts.append("</svg>")
    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, name + ".svg")
    with open(dst, "w", encoding="utf-8") as f:
        f.write("\n".join(parts) + "\n")
    print("%s: %d 层, %d 条路径, %.0f KB" % (name, len(report), sum(v["路径数"] for v in report.values()), os.path.getsize(dst) / 1024), flush=True)
    return report


def main():
    cast = json.load(open(os.path.join(ART, "cast.json"), encoding="utf-8"))
    names = sys.argv[1:] or sorted(os.path.splitext(f)[0] for f in os.listdir(os.path.join(ART, "masters")))
    path = os.path.join(OUT, "layers.json")
    report = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    for n in names:
        report[n] = run(n, cast)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(report.items())), f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
