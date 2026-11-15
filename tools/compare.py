#!/usr/bin/env python3
"""把 compare.cjs 截的图和录屏对应的帧并排比,算分数,生成 docs/fidelity/。

用法:
    node tools/compare.cjs && python3 tools/compare.py

每个页面出一张三联图:录屏 | 网页版 | 差异(越亮差得越多)。
分数有两个:
- 相似度:两张图逐像素的平均差,换算成百分比。先略微模糊再比,免得字体渲染的细微差别被放大。
- 明显不同的面积:差得比较多的像素占整张图的比例。这个数更直观:它大致就是「看得出不一样的地方有多大」。
"""
import argparse
import glob
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_assets import ensure_frames  # noqa: E402

W, H = 360, 781
# 录屏里这些位置是账号的真实互动码和玩家编号。对照图会进公开仓库,所以先涂掉,也不参与比较。
REDACT = {
    "14_qr": [[92, 296, 180, 178]],
    "89_settings": [[86, 474, 190, 28]],
    "90_profile": [[236, 260, 124, 28]],
    "93_bind": [[26, 124, 112, 28]],
    "94_bind_win": [[26, 124, 112, 28]],
}
PW, PH = 240, 521  # 三联图里每一联的大小


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default=os.path.join(ROOT, ".work"))
    a = ap.parse_args()
    video = sorted(glob.glob(os.path.join(ROOT, "videos", "*.mov")))[0]
    fdir = ensure_frames(video, a.work)
    cases = json.load(open(os.path.join(a.work, "compare", "cases.json"), encoding="utf-8"))
    out = os.path.join(ROOT, "docs", "fidelity")
    os.makedirs(os.path.join(out, "img"), exist_ok=True)
    rows = []
    for c in cases:
        ref = Image.open(os.path.join(fdir, "%04d.jpg" % c["frame"])).convert("RGB").resize((W, H), Image.LANCZOS)
        got = Image.open(os.path.join(a.work, "compare", c["id"] + ".png")).convert("RGB").resize((W, H), Image.LANCZOS)
        ra = np.asarray(ref.filter(ImageFilter.GaussianBlur(1.6)), dtype=np.float32)
        ga = np.asarray(got.filter(ImageFilter.GaussianBlur(1.6)), dtype=np.float32)
        red = REDACT.get(c["id"], [])
        for x, y, w, h in red:
            ImageDraw.Draw(ref).rectangle([x, y, x + w, y + h], fill=(90, 90, 96))
        c["mask"] = list(c["mask"]) + red
        keep = np.ones((H, W), bool)
        for x, y, w, h in c["mask"]:
            keep[y:y + h, x:x + w] = False
        d = np.abs(ra - ga).max(axis=2)
        d[~keep] = 0
        sim = 100 * (1 - float(np.abs(ra - ga).mean(axis=2)[keep].mean()) / 255)
        area = 100 * float((d[keep] > 48).mean())
        heat = Image.fromarray(np.clip(d * 2.2, 0, 255).astype(np.uint8)).convert("RGB")
        sheet = Image.new("RGB", (PW * 3 + 8, PH), (24, 24, 28))
        for i, im in enumerate((ref, got, heat)):
            sheet.paste(im.resize((PW, PH), Image.LANCZOS), (i * (PW + 4), 0))
        dr = ImageDraw.Draw(sheet)
        for x, y, w, h in c["mask"]:  # 不参与比较的区域画个框
            for i in range(2):
                ox = i * (PW + 4)
                dr.rectangle([ox + x * PW // W, y * PH // H, ox + (x + w) * PW // W, (y + h) * PH // H], outline=(255, 210, 0))
        sheet.save(os.path.join(out, "img", c["id"] + ".jpg"), quality=78, optimize=True)
        rows.append((area, sim, c))
    rows.sort(key=lambda r: -r[0])
    n = len(rows)
    avg_sim = sum(r[1] for r in rows) / n
    avg_area = sum(r[0] for r in rows) / n
    md = ["# 里系统与录屏的逐页对照", "",
          "由 `node tools/compare.cjs && python3 tools/compare.py` 生成,不要手改。", "",
          "每张图从左到右:录屏、网页版、差异(越亮差得越多)。黄框是不参与比较的区域(倒计时、手机通知);灰块是涂掉的账号信息(互动码、玩家编号)。", "",
          "- 一共 %d 个画面。" % n,
          "- 平均相似度 %.1f%%,平均「明显不同的面积」%.1f%%。" % (avg_sim, avg_area),
          "- 明显不同的面积在 5%% 以内的有 %d 个,超过 15%% 的有 %d 个。" % (sum(1 for r in rows if r[0] <= 5), sum(1 for r in rows if r[0] > 15)), "",
          "按差得多少排序,最上面的最该修。", "",
          "| 画面 | 录屏时间 | 相似度 | 明显不同的面积 | 对照图 |", "|---|---|---|---|---|"]
    for area, sim, c in rows:
        t = (c["frame"] - 1) / 2
        md.append("| %s | %d:%04.1f | %.1f%% | %.1f%% | [%s](img/%s.jpg) |" % (c["title"], t // 60, t % 60, sim, area, c["id"], c["id"]))
    with open(os.path.join(out, "README.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print("共 %d 个画面,平均相似度 %.1f%%,平均明显不同的面积 %.1f%%" % (n, avg_sim, avg_area))
    for area, sim, c in rows[:14]:
        print("  %5.1f%%  %5.1f%%  %s  %s" % (area, sim, c["id"], c["title"]))


if __name__ == "__main__":
    main()
