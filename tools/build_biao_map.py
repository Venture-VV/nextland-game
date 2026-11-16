#!/usr/bin/env python3
"""做「表」的地图:拿「里」的地图做底,只改颜色和光,不动布局。

    python3 tools/build_biao_map.py

里的地图是照真实园区画的(业主的话),所以表的地图不重画,只是把同一张图调成表的夜色霓虹:
地面压成夜蓝,各种彩色归到玫红、冰青、香槟金、紫这几个色上,亮的霓虹加一圈光晕。
建筑的位置一个像素都不动,js/data.js 里的建筑坐标两面通用。

输入(都在仓库里):
    assets/img/home/map.webp       里的主页地图(tools/build_map.py 拼出来的)
    assets/img/extra/parkmap.jpg   里的「园区地图」那一屏(录屏里只拍到这一屏)
输出:
    art/biao/masters/map.webp、parkplan.webp        表的母版(页面不加载)
    assets/biao/home/map.webp、extra/parkplan.webp  运行时用的图
之后照常跑 tools/upscale.py、tools/vectorize.py 给它们配高清版和矢量源文件。
"""
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "assets", "img")
OUT = os.path.join(ROOT, "assets", "biao")
MASTERS = os.path.join(ROOT, "art", "biao", "masters")
PLAN_BOX = (0, 330, 720, 1250)  # 「园区地图」那一屏里,平面图所在的范围(上面是标题和图例,下面是返回按钮)


def grade(rgb, glow=1.0):
    """把里的画面调成表的配色。色相用 OpenCV 的 0~180。"""
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    H, S, V = hsv[..., 0], hsv[..., 1] / 255, hsv[..., 2] / 255
    # 色相归并:红橙→玫红,黄→金,绿→冰青,青蓝不动,紫→紫,品红→玫红。红和玫红隔着 0 度,先展开到连续的数轴上再插值
    src = np.array([0, 10, 22, 32, 45, 70, 88, 100, 118, 132, 150, 165, 180], np.float32)
    dst = np.array([-8, -6, 20, 22, 92, 94, 95, 100, 116, 134, 160, 168, 172], np.float32)
    Hn = np.mod(np.interp(H, src, dst), 180)
    dirty = np.clip(1 - np.abs(H - 38) / 10, 0, 1)      # 黄绿之间从金跳到青会有一段脏色,压低饱和度
    neon = np.clip((S - 0.45) / 0.3, 0, 1) * np.clip((V - 0.45) / 0.3, 0, 1)  # 又亮又艳的才算霓虹
    Sn = S * (0.78 + 0.35 * neon) * (1 - 0.5 * dirty)
    Vn = V ** 1.18 * (0.82 + 0.3 * neon)                # 整体压暗,霓虹提亮
    grey = np.clip(1 - S / 0.22, 0, 1)                  # 灰白的石头、墙面带一点冷色
    Hn = Hn * (1 - grey) + 112 * grey
    Sn = Sn * (1 - grey) + (0.16 + 0.1 * (1 - V)) * grey
    floor = np.clip(1 - V / 0.34, 0, 1) * np.clip((S - 0.2) / 0.2, 0, 1)      # 深紫的地面 → 夜蓝
    Hn = Hn * (1 - floor) + 117 * floor
    Sn = Sn * (1 - floor) + 0.5 * floor
    Vn = Vn * (1 - 0.12 * floor)
    out = cv2.cvtColor(np.dstack([Hn, np.clip(Sn, 0, 1) * 255, np.clip(Vn, 0, 1) * 255]).astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32)
    g = out * neon[..., None]                           # 光晕:霓虹部分模糊后用「滤色」叠回去
    g = (cv2.GaussianBlur(g, (0, 0), 9) * 0.6 + cv2.GaussianBlur(g, (0, 0), 3) * 0.4) * glow
    out = 255 - (255 - out) * (255 - np.clip(g, 0, 255)) / 255
    return np.clip(out, 0, 255).astype(np.uint8)


def main():
    os.makedirs(MASTERS, exist_ok=True)
    work = os.path.join(ROOT, ".work", "map_final.png")   # 有没压缩过的原图就用它,没有就用仓库里的
    src = work if os.path.exists(work) else os.path.join(IMG, "home", "map.webp")
    m = Image.fromarray(grade(np.asarray(Image.open(src).convert("RGB"))))
    m.save(os.path.join(MASTERS, "map.webp"), quality=92, method=6)
    os.makedirs(os.path.join(OUT, "home"), exist_ok=True)
    m.save(os.path.join(OUT, "home", "map.webp"), quality=82, method=6)
    plan = Image.open(os.path.join(IMG, "extra", "parkmap.jpg")).convert("RGB").crop(PLAN_BOX)
    p = Image.fromarray(grade(np.asarray(plan), glow=0.5))
    p.save(os.path.join(MASTERS, "parkplan.webp"), quality=94, method=6)
    os.makedirs(os.path.join(OUT, "extra"), exist_ok=True)
    p.save(os.path.join(OUT, "extra", "parkplan.webp"), quality=90, method=6)
    print("表的地图 %d×%d,平面图 %d×%d(取自 %s)" % (m.width, m.height, p.width, p.height, os.path.relpath(src, ROOT)))
    subprocess.check_call([sys.executable, os.path.join(ROOT, "tools", "skin_assets.py")])


if __name__ == "__main__":
    main()
