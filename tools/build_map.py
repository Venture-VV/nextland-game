#!/usr/bin/env python3
"""从录屏里拼出主页的园区大地图,并把主页 HUD 从地图上分离出来。

用法:
    python3 tools/build_map.py [录屏路径] [--work 临时目录]

产物(都在临时目录里,再由 extract_assets.py 裁成素材):
    map_final.png   拼好的整张地图
    hud_home.png    主页 HUD 图层,带透明度
    hud_icons.png   会上下浮动的图标,取单帧抠图

做法:
1. 录屏 4:07 起有一段在主页连续拖动地图。按每秒 30 帧抽出来,只留主页画面。
2. 相邻两帧用相位相关算出地图位移,串成每帧在大图上的位置。
3. 每帧把没被 HUD 挡住的部分贴到大图上,同一像素取多帧中位数。
4. 始终被挡住、没拍到的地方,按地砖纹理的周期往外延伸补上。
5. HUD 固定在屏幕上、地图在动:对每个屏幕像素做「画面 = a*地图 + c」的回归,
   a 就是透过率,由此得到 HUD 的颜色和透明度。
"""
import argparse
import glob
import os
import subprocess

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEG_START, SEG_LEN = 247, 44          # 秒
HOME_REF = 200                        # 这一帧确定是主页,用来认出其他主页帧
WIN = (540, 1130, 0, 560)             # 用来对齐的窗口(y0, y1, x0, x1),避开 HUD
H, W = WIN[1] - WIN[0], WIN[3] - WIN[2]
FH, FW = 1562, 720
PX, PY = 31, 15                       # 地砖纹理的周期


def load(p):
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.float32)


def patch_diff(a, r, p):
    y0, y1, x0, x1 = p
    return np.abs(a[y0:y1, x0:x1] - r[y0:y1, x0:x1]).mean()


def chain_positions(frames):
    """认出主页帧,并算出每帧相对第一帧的地图位移。"""
    ref = load(frames[HOME_REF])
    p_title, p_cur = (78, 118, 40, 200), (200, 245, 40, 210)
    hann = np.outer(np.hanning(H), np.hanning(W))
    G, F, valid = {}, {}, []
    for i, f in enumerate(frames):
        a = load(f)
        if patch_diff(a, ref, p_title) < 6 and patch_diff(a, ref, p_cur) < 6:
            g = a.mean(axis=2)[WIN[0]:WIN[1], WIN[2]:WIN[3]]
            G[i], F[i] = g, np.fft.rfft2((g - g.mean()) * hann)
            valid.append(i)

    def mad(a, b, dy, dx):
        y0, y1, x0, x1 = max(0, -dy), min(H, H - dy), max(0, -dx), min(W, W - dx)
        if y1 - y0 < 80 or x1 - x0 < 80:
            return 999.0
        return float(np.abs(a[y0:y1, x0:x1] - b[y0 + dy:y1 + dy, x0 + dx:x1 + dx]).mean())

    def link(i, j):
        r = F[i] * np.conj(F[j])
        r = np.fft.irfft2(r / (np.abs(r) + 1e-6), s=(H, W))
        best = None
        for idx in np.argpartition(r.ravel(), -6)[-6:]:
            dy, dx = divmod(int(idx), W)
            dy = dy - H if dy > H // 2 else dy
            dx = dx - W if dx > W // 2 else dx
            for sy, sx in ((dy, dx), (-dy, -dx)):
                m = mad(G[i], G[j], sy, sx)
                if best is None or m < best[0]:
                    best = (m, sy, sx)
        return best

    comps, cur = [], [valid[0]]
    off, motion = {valid[0]: (0, 0)}, {valid[0]: 0}
    for a, b in zip(valid[:-1], valid[1:]):
        m, dy, dx = link(a, b)
        if m > 16:  # 对不上(转场等),另起一段
            comps.append(cur)
            cur, off[b], motion[b] = [b], (0, 0), 99
        else:
            off[b] = (off[a][0] - dy, off[a][1] - dx)
            motion[b] = abs(dy) + abs(dx)
            cur.append(b)
    comps.append(cur)
    c = [i for i in max(comps, key=len) if i >= 50]  # 开头几帧是转场
    return c, off, motion


def home_mask():
    m = np.zeros((FH, FW), bool)
    m[520:1396, :] = True
    m[430:520, 215:570] = True
    m[390:965, 570:] = False        # 右侧一列按钮
    m[1135:1270, 10:280] = False    # 冒险
    m[1265:1380, 490:700] = False   # 探索
    m[1300:1400, 420:550] = False   # 引导箭头
    return m


def composite(frames, c, off, motion):
    ys, xs = [off[i][0] for i in c], [off[i][1] for i in c]
    oy, ox = -min(ys), -min(xs)
    hc, wc = max(ys) - min(ys) + FH, max(xs) - min(xs) + FW
    k = 7
    stack = np.zeros((k, hc, wc, 3), np.uint8)
    cnt = np.zeros((hc, wc), np.uint8)
    mask = home_mask()
    for i in sorted(c, key=lambda i: motion[i] + motion.get(i + 1, 0)):  # 先贴静止的帧,更清晰
        a = np.asarray(Image.open(frames[i]).convert("RGB"))
        y, x = off[i][0] + oy, off[i][1] + ox
        sub = cnt[y:y + FH, x:x + FW]
        w = mask & (sub < k)
        yy, xx = np.nonzero(w)
        stack[sub[w], yy + y, xx + x] = a[w]
        sub[w] += 1
    out = np.zeros((hc, wc, 3), np.uint8)
    for n in range(1, k + 1):
        m = cnt == n
        if m.any():
            out[m] = np.median(stack[:n][:, m], axis=0).astype(np.uint8) if n > 2 else stack[0][m]
    return out, cnt > 0, (oy, ox)


def fill_holes(rgb, ok):
    """没拍到的地方按地砖周期往外延伸。"""
    pt, pb, pl, pr = 420, 330, 60, 60
    rgb = np.pad(rgb, ((pt, pb), (pl, pr), (0, 0))).astype(np.float32)
    ok = np.pad(ok, ((pt, pb), (pl, pr)))
    floor = rgb[1530 + pt:1700 + pt, 20 + pl:300 + pl].reshape(-1, 3).mean(0)
    like = ok & (np.abs(rgb - floor).max(axis=2) < 9)
    src = like.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2)):
        src &= np.roll(np.roll(like, dy, 0), dx, 1)
    out, filled = rgb.copy(), ok.copy()
    for _ in range(200):
        changed = 0
        for dy, dx in ((0, 2 * PX), (0, -2 * PX), (2 * PY, 0), (-2 * PY, 0)):
            sy = np.roll(np.roll(src, dy, 0), dx, 1)
            sv = np.roll(np.roll(out, dy, 0), dx, 1)
            if dx > 0: sy[:, :dx] = False
            if dx < 0: sy[:, dx:] = False
            if dy > 0: sy[:dy, :] = False
            if dy < 0: sy[dy:, :] = False
            m = (~filled) & sy
            if m.any():
                out[m] = sv[m]
                filled |= m
                src |= m
                changed += int(m.sum())
        if not changed:
            break
    out[~filled] = floor
    hh, ww = out.shape[:2]
    return out[300:hh - 40, 140:ww - 120].astype(np.uint8)


def extract_hud(frames, c, off, origin, rgb, ok):
    oy, ox = origin
    b_all = rgb.astype(np.float32)
    n = np.zeros((FH, FW))
    s_b, s_p = np.zeros((FH, FW, 3)), np.zeros((FH, FW, 3))
    s_bb, s_bp = np.zeros((FH, FW)), np.zeros((FH, FW))
    for i in c[::2]:
        p = load(frames[i])
        y, x = off[i][0] + oy, off[i][1] + ox
        b, v = b_all[y:y + FH, x:x + FW], ok[y:y + FH, x:x + FW]
        n += v
        s_b += b * v[..., None]
        s_p += p * v[..., None]
        s_bb += (b * b).sum(2) * v
        s_bp += (b * p).sum(2) * v
    n = np.maximum(n, 1)
    m_b, m_p = s_b / n[..., None], s_p / n[..., None]
    var_b = s_bb / n - (m_b * m_b).sum(2)
    cov = s_bp / n - (m_b * m_p).sum(2)
    a = np.where(var_b > 30, cov / np.maximum(var_b, 1e-3), np.nan)
    diff = np.abs(m_p - m_b).max(2)
    a = np.where(np.isnan(a), np.where(diff < 10, 1.0, 0.0), a)
    alpha = np.clip(1 - a, 0, 1)
    fg = np.clip((m_p - a[..., None] * m_b) / np.maximum(alpha[..., None], 0.05), 0, 255)
    alpha[alpha < 0.06] = 0
    return np.dstack([fg, alpha * 255]).astype(np.uint8)


def extract_icons(frames, c, off, motion, origin, rgb, ok, hud):
    """右侧四个图标会上下浮动,多帧平均会糊;挑一帧背景平坦的,和地图做差得到轮廓。"""
    oy, ox = origin
    b_all = rgb.astype(np.float32)
    r = (400, 960, 570, 704)
    best = None
    for i in c:
        if motion[i] + motion.get(i + 1, 0) > 0:
            continue
        y, x = off[i][0] + oy, off[i][1] + ox
        b = b_all[y + r[0]:y + r[1], x + r[2]:x + r[3]]
        if ok[y + r[0]:y + r[1], x + r[2]:x + r[3]].mean() < 0.999:
            continue
        s = b.std(axis=(0, 1)).mean() + b.mean() * 0.3
        if best is None or s < best[0]:
            best = (s, i)
    i = best[1]
    p = load(frames[i])
    y, x = off[i][0] + oy, off[i][1] + ox
    diff = np.abs(p - b_all[y:y + FH, x:x + FW]).max(2)
    al = Image.fromarray((np.clip((diff - 10) / 26, 0, 1) * 255).astype(np.uint8))
    al = al.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    near = Image.fromarray(hud[..., 3]).point(lambda v: 255 if v > 110 else 0)
    near = near.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(1.5))
    alpha = np.asarray(al, dtype=np.float32) * np.asarray(near, dtype=np.float32) / 255
    return np.dstack([p, alpha]).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video", nargs="?", default=None)
    ap.add_argument("--work", default=os.path.join(ROOT, ".work"))
    a = ap.parse_args()
    video = a.video or sorted(glob.glob(os.path.join(ROOT, "videos", "*.mov")))[0]
    seg = os.path.join(a.work, "seg")
    if len(glob.glob(os.path.join(seg, "*.jpg"))) < 1300:
        os.makedirs(seg, exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(SEG_START), "-t", str(SEG_LEN), "-i", video,
                        "-vf", "fps=30", "-q:v", "2", os.path.join(seg, "%04d.jpg")], check=True)
    frames = sorted(glob.glob(os.path.join(seg, "*.jpg")))
    c, off, motion = chain_positions(frames)
    print("主页帧", len(c))
    rgb, ok, origin = composite(frames, c, off, motion)
    print("拼图", rgb.shape[1], "x", rgb.shape[0], "覆盖率 %.2f" % ok.mean())
    Image.fromarray(fill_holes(rgb, ok)).save(os.path.join(a.work, "map_final.png"))
    hud = extract_hud(frames, c, off, origin, rgb, ok)
    Image.fromarray(hud).save(os.path.join(a.work, "hud_home.png"))
    Image.fromarray(extract_icons(frames, c, off, motion, origin, rgb, ok, hud)).save(os.path.join(a.work, "hud_icons.png"))
    print("完成")


if __name__ == "__main__":
    main()
