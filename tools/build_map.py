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
3. 每帧把屏幕中间那一块(肯定没有 HUD)贴到大图上,同一像素取多帧中位数。
4. HUD 固定在屏幕上、地图在动:对每个屏幕像素做「画面 = a*地图 + c」的回归,
   a 就是透过率,由此得到 HUD 的颜色和透明度。
5. 有了 HUD 的透明度,再拼一遍:屏幕上凡是 HUD 完全透明的地方都是地图(主要是屏幕上半部分
   几个按钮之间的空当)。这一步把园区上沿的围墙补全了,补的都是录屏里的真实画面。
6. 还剩两处录屏里始终看不到:最下面被底部导航栏挡住的一条,和左下角一小块。那里的围墙、
   蓝色边框、轨道都是沿 2:1 的斜线走的,就顺着斜线把已有的画面往下延,各自延到拐角。
   **这一部分是补画的,不是录屏里的画面**(成品地图 y≥2153 的园区部分)。
7. 园区外面没拍到的地方都是一色的地砖,按地砖纹理的周期铺满。
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


def composite(frames, c, off, motion, mask=None):
    ys, xs = [off[i][0] for i in c], [off[i][1] for i in c]
    oy, ox = -min(ys), -min(xs)
    hc, wc = max(ys) - min(ys) + FH, max(xs) - min(xs) + FW
    k = 7
    stack = np.zeros((k, hc, wc, 3), np.uint8)
    cnt = np.zeros((hc, wc), np.uint8)
    mask = home_mask() if mask is None else mask
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


def hud_free_mask(hud):
    """屏幕上哪些像素肯定是地图:HUD 完全透明、又不在几个会动或半透明的部件附近。"""
    import cv2
    m = (hud[..., 3] > 70).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))   # 透明度图里零星的噪点
    mask = ~cv2.dilate(m, np.ones((17, 17), np.uint8)).astype(bool)      # HUD 往外留一圈
    mask[1396:, :] = False            # 底部导航
    mask[:56, :] = False              # 状态栏
    mask[80:170, 500:] = False        # 微信胶囊(半透明,透明度图里认不全)
    mask[56:130, :240] = False        # 页面名牌子
    mask[170:260, :] = False          # 资源栏一整行
    mask[250:430, :500] = False       # 名片
    mask[250:360, 440:] = False       # 好友、邮箱、设置
    mask[400:540, :210] = False       # 势力选择、活动日历
    mask[380:980, 560:] = False       # 右侧一列会上下浮动的按钮
    mask[1290:1400, 400:560] = False  # 引导箭头
    return mask


def to_final(rgb, ok):
    """把拼图放进成品地图的画幅(3773×2609):上下左右各留出一圈,给拖动留余量。成品 = 拼图 + (120, -80)。"""
    pt, pb, pl, pr = 420, 330, 60, 60
    rgb = np.pad(rgb, ((pt, pb), (pl, pr), (0, 0)))
    ok = np.pad(ok, ((pt, pb), (pl, pr)))
    hh, ww = ok.shape
    return rgb[300:hh - 40, 140:ww - 120].copy(), ok[300:hh - 40, 140:ww - 120].copy()


# 补画底部时的分界线(成品地图坐标,每个点是 (x, y)):线左边的围墙往右下延(\),右边的围墙和轨道往左下延(/)。
# 三个转折分别是蓝色边框、紫墙、灰墙的拐角——它们的位置是两段已知的墙各自延长后的交点。
CORNERS = [(1715, 1850), (1715, 2227), (1687, 2242), (1687, 2336), (1738, 2363), (1738, 99999)]
STEP = (62, 31)  # 沿斜线走一格:右 62、下 31(2:1 的等距网格)


def complete(rgb, ok):
    """把没拍到的地方补上:底部顺着斜线延伸(补画),其余铺地砖。"""
    out, known = rgb.copy(), ok.copy()
    h, w = known.shape
    yy, xx = np.mgrid[0:h, 0:w]
    bx = np.interp(np.arange(h), [p[1] for p in CORNERS], [p[0] for p in CORNERS])
    left, bottom = xx < bx[:, None], yy > CORNERS[0][1]
    dx, dy = STEP

    def directional(region, from_left):
        n = 0
        for _ in range(80):
            sk, sv = np.zeros_like(known), np.zeros_like(out)
            if from_left:   # 这个像素的画面取自左上方一格
                sk[dy:, dx:], sv[dy:, dx:] = known[:-dy, :-dx], out[:-dy, :-dx]
            else:           # 取自右上方一格
                sk[dy:, :-dx], sv[dy:, :-dx] = known[:-dy, dx:], out[:-dy, dx:]
            m = region & ~known & sk
            if not m.any():
                break
            out[m] = sv[m]
            known[m] = True
            n += int(m.sum())
        return n

    drawn = directional(bottom & left, True) + directional(bottom & ~left, False)
    # 其余的都在园区外面:从已有的地砖按周期往外铺
    floor = rgb[1650:1820, 60:340].reshape(-1, 3).astype(np.float32).mean(0)
    like = known & (np.abs(out.astype(np.float32) - floor).max(axis=2) < 9)
    src = like.copy()
    for sy, sx in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2)):
        src &= np.roll(np.roll(like, sy, 0), sx, 1)
    for _ in range(300):
        changed = 0
        for sy, sx in ((0, 2 * PX), (0, -2 * PX), (2 * PY, 0), (-2 * PY, 0)):
            k2, v2 = np.roll(np.roll(src, sy, 0), sx, 1), np.roll(np.roll(out, sy, 0), sx, 1)
            if sx > 0: k2[:, :sx] = False
            if sx < 0: k2[:, sx:] = False
            if sy > 0: k2[:sy, :] = False
            if sy < 0: k2[sy:, :] = False
            m = (~known) & k2
            if m.any():
                out[m] = v2[m]
                known |= m
                src |= m
                changed += int(m.sum())
        if not changed:
            break
    out[~known] = floor.astype(np.uint8)
    return out, drawn


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
    seg = os.path.join(a.work, "seg")
    if len(glob.glob(os.path.join(seg, "*.jpg"))) < 1300:  # 帧已经抽好的话就不需要录屏了
        video = a.video or sorted(glob.glob(os.path.join(ROOT, "videos", "*.mov")))[0]
        os.makedirs(seg, exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(SEG_START), "-t", str(SEG_LEN), "-i", video,
                        "-vf", "fps=30", "-q:v", "2", os.path.join(seg, "%04d.jpg")], check=True)
    frames = sorted(glob.glob(os.path.join(seg, "*.jpg")))
    c, off, motion = chain_positions(frames)
    print("主页帧", len(c))
    rgb, ok, origin = composite(frames, c, off, motion)
    print("拼图", rgb.shape[1], "x", rgb.shape[0], "覆盖率 %.2f" % ok.mean())
    hud = extract_hud(frames, c, off, origin, rgb, ok)
    Image.fromarray(hud).save(os.path.join(a.work, "hud_home.png"))
    # 第二遍:HUD 透明的地方也贴上。第一遍已经有的像素不动,只补新增的
    rgb2, ok2, _ = composite(frames, c, off, motion, hud_free_mask(hud))
    full, okf = np.where(ok[..., None], rgb, rgb2), ok | ok2
    print("加上 HUD 之间的空当后,覆盖率 %.2f" % okf.mean())
    final, final_ok = to_final(full, okf)
    final, drawn = complete(final, final_ok)
    print("补画(顺着斜线延伸)的像素占成品的 %.1f%%" % (100.0 * drawn / final_ok.size))
    Image.fromarray(final).save(os.path.join(a.work, "map_final.png"))
    Image.fromarray(extract_icons(frames, c, off, motion, origin, rgb, ok, hud)).save(os.path.join(a.work, "hud_icons.png"))
    print("完成")


if __name__ == "__main__":
    main()
