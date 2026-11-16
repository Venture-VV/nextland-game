#!/usr/bin/env python3
"""把 art/biao/masters/ 里的母版放大成高清版。

    python3 tools/upscale.py [角色名 ...]      # 不给名字就处理全部

用的是 CDC 的二次元 4 倍放大模型(见 tools/art_models.py),在 CPU 上跑,每张两三分钟。
- 4 倍的原始结果(3328×4864)存到 .work/art/up4x/,不进仓库(每张十来兆);
- 缩到 2 倍(1664×2432)的高清版存到 art/biao/hires/,进仓库。裁运行时的图、描矢量都从它出。
已经有高清版而且比母版新的会跳过。
"""
import os
import sys
import time

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import art_models  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "art", "biao", "masters")
DST = os.path.join(ROOT, "art", "biao", "hires")
RAW = os.path.join(ROOT, ".work", "art", "up4x")


def main():
    os.makedirs(DST, exist_ok=True)
    os.makedirs(RAW, exist_ok=True)
    only = sys.argv[1:]
    for f in sorted(os.listdir(SRC)):
        name = os.path.splitext(f)[0]
        if only and name not in only:
            continue
        src, dst = os.path.join(SRC, f), os.path.join(DST, name + ".webp")
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            print("跳过(已是最新):", name, flush=True)
            continue
        t = time.time()
        big = art_models.upscale4x(Image.open(src).convert("RGB"))
        if big.width <= 8000:  # 地图那样的大图,4 倍的原始结果有上亿像素,就不另存了
            big.save(os.path.join(RAW, name + ".png"))
        big.resize((big.width // 2, big.height // 2), Image.LANCZOS).save(dst, quality=92, method=6)
        print("放大好了: %s %dx%d,用时 %.0f 秒" % (name, big.width // 2, big.height // 2, time.time() - t), flush=True)


if __name__ == "__main__":
    main()
