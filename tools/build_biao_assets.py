#!/usr/bin/env python3
"""从 art/masters/ 母版构建「表(biao)」皮肤的全部运行时美术资产到 assets/biao/。

用法:
    python3 tools/build_biao_assets.py

流程:
1. 2D 角色立绘抠图(双阶段连通域抠除 #565070 影棚纯色底 + 边缘去紫边 + 柔化羽化) ->
   assets/biao/chars/*.webp、cards/*.webp、avatars/*.webp、battle/{me,enemy}.jpg、friend/avatar.jpg
2. 等距霓虹乐园大地图坐标对齐(运动博物馆 / 圣物核心 / 阪神公司 对应 D.buildings) ->
   assets/biao/home/map.webp 及 bg/*.webp
3. 装备(20)、道具(14)、情感礼物(6) 精灵表精准切片与品质微光底板合成 ->
   assets/biao/{equip,item,gift}/*.webp
4. 全站通用导航、HUD 胶囊与功能按钮、横幅、弹窗底板及兜底页面底图合成 ->
   保证 NL.img() 与 CSS 在表皮肤下 100% 命中 assets/biao/(零借用里的图)
5. 自动更新 js/skin_assets.js 与 js/embed.js(注入 avatarMeBiao / avatarFoeBiao)
"""
import base64
from collections import deque
import io
import math
import os
from pathlib import Path
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
MASTERS = ROOT / "art" / "masters"
OUT = ROOT / "assets" / "biao"

# 绯夜霓虹 (Crimson Neon Nocturne) 核心色板
C_NIGHT = (11, 13, 26)
C_DEEP = (18, 16, 34)
C_GLASS = (22, 24, 46)
C_ROSE = (255, 61, 127)
C_ROSE_DEEP = (194, 24, 91)
C_VIOLET = (162, 60, 255)
C_ICE = (125, 232, 255)
C_GOLD = (232, 207, 154)
C_PAPER = (244, 241, 248)
C_MUTED = (158, 162, 190)

RARE_COL = {
    "white": (185, 188, 208),
    "green": (90, 232, 148),
    "blue": (78, 202, 255),
    "purple": (182, 92, 255),
    "orange": (255, 158, 68),
}

EQUIP_RARE = {
    "prism": "orange", "pistol": "white", "vest": "white", "hat": "purple",
    "neck_gold": "purple", "ring": "purple", "glove_white": "purple", "gauntlet": "blue",
    "pants": "purple", "boots": "blue", "tuxedo": "purple", "choker": "blue",
    "armor_pink": "blue", "bracelet": "blue", "helmet_brown": "green", "helmet_grey": "green",
    "chain": "green", "rifle": "green", "pistol_color": "green", "vest_green": "green",
}


def font(size, bold=True, serif=False):
    candidates = (
        [
            "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc",
            "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
        ]
        if serif
        else [
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        ]
    )
    if not bold:
        candidates = list(reversed(candidates))
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def load_master(name):
    for ext in (".webp", ".jpg", ".png"):
        p = MASTERS / (name + ext)
        if p.exists():
            return Image.open(p).convert("RGB")
    raise FileNotFoundError(f"Missing master art: {name}")


def save_img(im, rel_path, quality=82):
    dst = OUT / rel_path
    dst.parent.mkdir(parents=True, exist_ok=True)
    ext = dst.suffix.lower()
    if ext in (".jpg", ".jpeg"):
        if im.mode != "RGB":
            bg = Image.new("RGB", im.size, C_NIGHT)
            bg.paste(im, mask=im.split()[-1] if im.mode == "RGBA" else None)
            im = bg
        im.save(dst, "JPEG", quality=min(quality, 80), optimize=True)
    elif ext == ".webp":
        im.save(dst, "WEBP", quality=quality, method=6)
    else:
        im.save(dst)


def crop_fill(im, w, h, align_y=0.5):
    sw, sh = im.size
    scale = max(w / sw, h / sh)
    nw, nh = max(w, int(round(sw * scale))), max(h, int(round(sh * scale)))
    resized = im.resize((nw, nh), Image.LANCZOS)
    x0 = (nw - w) // 2
    y0 = int(round((nh - h) * align_y))
    return resized.crop((x0, y0, x0 + w, y0 + h))


def vgrad(w, h, top_rgb, bot_rgb):
    t = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None, None]
    a = np.array(top_rgb, dtype=np.float32)[None, None, :]
    b = np.array(bot_rgb, dtype=np.float32)[None, None, :]
    arr = np.clip(a * (1.0 - t) + b * t, 0, 255).astype(np.uint8)
    return Image.fromarray(np.repeat(arr, w, axis=1), "RGB")


# ---------- 1. 2D 立绘精准连通抠图 ----------

def cutout_tachie(im):
    """移除均匀 #565070 影棚纯色底(含手臂腰侧闭合空洞),保护白色实验服/浅色礼服/半透明全息板。"""
    arr = np.asarray(im, dtype=np.float32)
    h, w, _ = arr.shape
    top_strip = np.concatenate([
        arr[:24, :, :].reshape(-1, 3),
        arr[: int(h * 0.65), :16, :].reshape(-1, 3),
        arr[: int(h * 0.65), -16:, :].reshape(-1, 3),
    ], axis=0)
    bg_med = np.median(top_strip, axis=0)
    de = np.linalg.norm(arr - bg_med[None, None, :], axis=2)

    # Pass 1: 外边界连通泛洪 (兼顾金属道具外侧轻微紫灰环境光晕)
    bg_mask = np.zeros((h, w), dtype=bool)
    chroma = np.max(arr, axis=2) - np.min(arr, axis=2)
    muted_purple_halo = (de <= 35.0) & (arr[:, :, 2] - arr[:, :, 1] > 13.0) & (chroma < 42.0) & (arr[:, :, 2] > 78.0) & (arr[:, :, 2] < 155.0)
    passable = (de <= 22.5) | muted_purple_halo
    q = deque()
    for x in range(w):
        if passable[0, x]:
            bg_mask[0, x] = True
            q.append((0, x))
        if de[h - 1, x] <= 16.0:
            bg_mask[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if passable[y, 0] and not bg_mask[y, 0]:
            bg_mask[y, 0] = True
            q.append((y, 0))
        if passable[y, w - 1] and not bg_mask[y, w - 1]:
            bg_mask[y, w - 1] = True
            q.append((y, w - 1))

    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not bg_mask[ny, nx] and passable[ny, nx]:
                bg_mask[ny, nx] = True
                q.append((ny, nx))

    # Pass 2: 手臂与腰侧/发丝之间的闭合影棚纯色空洞检测
    cand = (~bg_mask) & (de <= 12.0)
    visited = np.zeros((h, w), dtype=bool)
    luma = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    ys, xs = np.where(cand)
    for sy, sx in zip(ys, xs):
        if visited[sy, sx]:
            continue
        comp = []
        border_luma = []
        dq = deque([(sy, sx)])
        visited[sy, sx] = True
        while dq:
            cy, cx = dq.popleft()
            comp.append((cy, cx))
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w:
                    if cand[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        dq.append((ny, nx))
                    elif not cand[ny, nx] and not bg_mask[ny, nx]:
                        border_luma.append(luma[ny, nx])
        if len(comp) >= 40 and border_luma:
            c_idx = tuple(np.array(comp).T)
            c_rgb = arr[c_idx]
            c_de = de[c_idx]
            std_max = float(np.max(np.std(c_rgb, axis=0)))
            p90 = float(np.percentile(c_de, 90))
            dark_ratio = float(np.mean(np.array(border_luma) < 95.0))
            if std_max < 4.2 and p90 < 9.5 and dark_ratio >= 0.30:
                bg_mask[c_idx] = True

    # Pass 3: 边缘抗锯齿柔化与去紫灰溢色
    fg = (~bg_mask).astype(np.float32)
    alpha_im = Image.fromarray((fg * 255).astype(np.uint8), "L")
    eroded = alpha_im.filter(ImageFilter.MinFilter(3))
    dilated = alpha_im.filter(ImageFilter.MaxFilter(3))
    soft = alpha_im.filter(ImageFilter.GaussianBlur(0.85))

    fg_arr = np.asarray(alpha_im, dtype=np.float32) / 255.0
    er_arr = np.asarray(eroded, dtype=np.float32) / 255.0
    di_arr = np.asarray(dilated, dtype=np.float32) / 255.0
    sf_arr = np.asarray(soft, dtype=np.float32) / 255.0

    edge_band = (di_arr > 0) & (er_arr < 1.0)
    ramp = np.clip((de - 13.0) / 16.0, 0.0, 1.0)
    final_a = np.where(edge_band, np.minimum(sf_arr, np.maximum(er_arr, ramp)), fg_arr)
    final_a = np.where(final_a < 0.03, 0.0, final_a)

    # 去紫灰边缘溢色:将半透明边缘中的 bg_med 成分剥离并向深色描线收敛
    clean_rgb = arr.copy()
    semi = (final_a > 0.0) & (final_a < 0.96)
    a_exp = np.maximum(final_a[:, :, None], 0.28)
    decontam = (arr - (1.0 - final_a[:, :, None]) * bg_med[None, None, :]) / a_exp
    ink = np.array([18.0, 16.0, 30.0], dtype=np.float32)
    clean_rgb = np.where(
        semi[:, :, None],
        np.clip(decontam * 0.82 + ink[None, None, :] * 0.18, 0, 255),
        clean_rgb,
    )

    rgba = np.dstack([clean_rgb.astype(np.uint8), (final_a * 255).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def head_anchor(rgba):
    """定位立绘头顶与面部水平中心,用于自动裁切头像与半身卡面。"""
    a = np.asarray(rgba)[:, :, 3] > 80
    h, w = a.shape
    row_counts = a.sum(axis=1)
    valid = np.where(row_counts > max(14, int(w * 0.04)))[0]
    crown_y = int(valid[0]) if len(valid) else int(h * 0.06)
    head_band = a[crown_y : min(h, crown_y + int(h * 0.17)), :]
    xs = np.where(head_band)[1]
    cx = int(np.median(xs)) if len(xs) else w // 2
    return crown_y, cx


def make_avatar(rgba, accent_rgb, size=192):
    w, h = rgba.size
    crown_y, cx = head_anchor(rgba)
    cy = crown_y + int(h * 0.105)
    box = int(h * 0.235)
    x0 = max(0, min(w - box, cx - box // 2))
    y0 = max(0, min(h - box, cy - int(box * 0.46)))
    crop = rgba.crop((x0, y0, x0 + box, y0 + box)).resize((size, size), Image.LANCZOS)

    bg = vgrad(size, size, (28, 20, 52), C_NIGHT).convert("RGBA")
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([size * 0.1, size * 0.08, size * 0.9, size * 0.92], fill=(*accent_rgb, 88))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.12))
    bg = Image.alpha_composite(bg, glow)
    bg = Image.alpha_composite(bg, crop)

    rim = ImageDraw.Draw(bg)
    rim.rectangle([1, 1, size - 2, size - 2], outline=(*accent_rgb, 140), width=2)
    return bg


def make_partner_card(rgba, stage_bg, accent_rgb, w=276, h=426):
    sw, sh = rgba.size
    crown_y, cx = head_anchor(rgba)
    ch = int(sh * 0.52)
    cw = int(round(ch * (w / h)))
    x0 = max(0, min(sw - cw, cx - cw // 2))
    y0 = max(0, min(sh - ch, crown_y - int(sh * 0.035)))
    portrait = rgba.crop((x0, y0, x0 + cw, y0 + ch)).resize((w, h), Image.LANCZOS)

    bg = crop_fill(stage_bg, w, h, 0.36).filter(ImageFilter.GaussianBlur(1.4))
    bg = ImageEnhance.Brightness(bg).enhance(0.68).convert("RGBA")
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-30, 40, w + 30, h - 20], fill=(*accent_rgb, 72))
    glow = glow.filter(ImageFilter.GaussianBlur(28))
    bg = Image.alpha_composite(bg, glow)
    bg = Image.alpha_composite(bg, portrait)

    # 底部暗角过渡,让姓名与信任徽章清晰可读
    grad = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g_arr = np.zeros((h, w, 4), dtype=np.uint8)
    for y in range(int(h * 0.62), h):
        u = max(0.0, min(1.0, (y - h * 0.62) / (h * 0.38)))
        g_arr[y, :, :] = [9, 10, 22, int(215 * (u ** 1.35))]
    bg = Image.alpha_composite(bg, Image.fromarray(g_arr, "RGBA"))
    d = ImageDraw.Draw(bg)
    d.rounded_rectangle([1, 1, w - 2, h - 2], radius=12, outline=(*C_GOLD, 145), width=2)
    return bg


# ---------- 2. 精灵表切片与品质图标底板 ----------

def slice_icon(sheet, col, row, cols, rows, rare="blue", size=112, hue_shift=0.0, pad_ratio=0.11):
    sw, sh = sheet.size
    cw, ch = sw / cols, sh / rows
    x0 = int(round(col * cw)) + 6
    y0 = int(round(row * ch)) + 6
    x1 = int(round((col + 1) * cw)) - 6
    y1 = int(round((row + 1) * ch)) - 6
    cell = sheet.crop((x0, y0, x1, y1))
    arr = np.asarray(cell, dtype=np.float32)

    border = np.concatenate([
        arr[:6, :, :].reshape(-1, 3),
        arr[-6:, :, :].reshape(-1, 3),
        arr[:, :6, :].reshape(-1, 3),
        arr[:, -6:, :].reshape(-1, 3),
    ], axis=0)
    bg_med = np.median(border, axis=0)
    de = np.linalg.norm(arr - bg_med[None, None, :], axis=2)

    # 外圈背景抠除
    hh, ww = de.shape
    bg_m = np.zeros((hh, ww), dtype=bool)
    q = deque()
    for x in range(ww):
        if de[0, x] <= 24:
            bg_m[0, x] = True
            q.append((0, x))
        if de[hh - 1, x] <= 24:
            bg_m[hh - 1, x] = True
            q.append((hh - 1, x))
    for y in range(hh):
        if de[y, 0] <= 24 and not bg_m[y, 0]:
            bg_m[y, 0] = True
            q.append((y, 0))
        if de[y, ww - 1] <= 24 and not bg_m[y, ww - 1]:
            bg_m[y, ww - 1] = True
            q.append((y, ww - 1))
    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < hh and 0 <= nx < ww and not bg_m[ny, nx] and de[ny, nx] <= 24:
                bg_m[ny, nx] = True
                q.append((ny, nx))

    alpha = (~bg_m).astype(np.float32)
    alpha_im = Image.fromarray((alpha * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(0.6))
    rgb_im = Image.fromarray(arr.astype(np.uint8), "RGB")

    if abs(hue_shift) > 1e-3:
        hsv = np.asarray(rgb_im.convert("HSV"), dtype=np.float32)
        hsv[:, :, 0] = (hsv[:, :, 0] + hue_shift * 255.0 / 360.0) % 255.0
        rgb_im = Image.fromarray(hsv.astype(np.uint8), "HSV").convert("RGB")

    rgba = rgb_im.copy().convert("RGBA")
    rgba.putalpha(alpha_im)

    # 紧致包围盒居中缩放
    nz = np.where(np.asarray(alpha_im) > 25)
    if len(nz[0]) > 10:
        by0, by1 = max(0, int(nz[0].min()) - 4), min(hh, int(nz[0].max()) + 5)
        bx0, bx1 = max(0, int(nz[1].min()) - 4), min(ww, int(nz[1].max()) + 5)
        rgba = rgba.crop((bx0, by0, bx1, by1))

    plate = vgrad(size, size, (24, 24, 46), (12, 13, 26)).convert("RGBA")
    rc = RARE_COL.get(rare, C_ICE)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([size * 0.14, size * 0.14, size * 0.86, size * 0.86], fill=(*rc, 62))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.13))
    plate = Image.alpha_composite(plate, glow)

    avail = int(round(size * (1.0 - 2 * pad_ratio)))
    iw, ih = rgba.size
    sc = min(avail / max(1, iw), avail / max(1, ih))
    nw, nh = max(1, int(round(iw * sc))), max(1, int(round(ih * sc)))
    icon_rs = rgba.resize((nw, nh), Image.LANCZOS)
    plate.alpha_composite(icon_rs, ((size - nw) // 2, (size - nh) // 2))

    d = ImageDraw.Draw(plate)
    d.rounded_rectangle([1, 1, size - 2, size - 2], radius=max(4, size // 12), outline=(*rc, 135), width=2)
    d.line([(4, size - 3), (size - 5, size - 3)], fill=(*rc, 215), width=2)
    return plate.convert("RGB")


# ---------- 3. 通用绘制组件(横幅、HUD 按钮、导航栏、兜底板) ----------

def draw_hud_icon(d, kind, cx, cy, r, col, sub_col=C_GOLD):
    if kind == "gem":
        pts = [(cx, cy - r), (cx + r * 0.78, cy), (cx, cy + r), (cx - r * 0.78, cy)]
        d.polygon(pts, fill=col, outline=(255, 235, 245))
        d.polygon([(cx, cy - r * 0.55), (cx + r * 0.4, cy), (cx, cy + r * 0.55), (cx - r * 0.4, cy)], fill=(255, 195, 225))
    elif kind == "coin":
        pts = [(cx + r * math.cos(math.pi / 6 + k * math.pi / 3), cy + r * math.sin(math.pi / 6 + k * math.pi / 3)) for k in range(6)]
        d.polygon(pts, fill=C_GOLD, outline=(255, 246, 214))
        d.ellipse([cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45], outline=(110, 78, 28), width=2)
    elif kind == "bolt":
        pts = [(cx + r * 0.15, cy - r), (cx - r * 0.55, cy + r * 0.08), (cx - r * 0.02, cy + r * 0.08),
               (cx - r * 0.22, cy + r), (cx + r * 0.58, cy - r * 0.1), (cx + r * 0.05, cy - r * 0.1)]
        d.polygon(pts, fill=C_ICE, outline=(230, 252, 255))
    elif kind == "friend":
        d.ellipse([cx - r * 0.42, cy - r * 0.75, cx + r * 0.42, cy + r * 0.08], outline=col, width=3)
        d.arc([cx - r * 0.78, cy + r * 0.05, cx + r * 0.78, cy + r * 1.05], 195, 345, fill=col, width=3)
    elif kind == "mail":
        d.rounded_rectangle([cx - r * 0.85, cy - r * 0.58, cx + r * 0.85, cy + r * 0.58], radius=3, outline=col, width=3)
        d.line([(cx - r * 0.78, cy - r * 0.5), (cx, cy + r * 0.12), (cx + r * 0.78, cy - r * 0.5)], fill=sub_col, width=2)
    elif kind == "setting":
        d.ellipse([cx - r * 0.62, cy - r * 0.62, cx + r * 0.62, cy + r * 0.62], outline=col, width=3)
        d.ellipse([cx - r * 0.24, cy - r * 0.24, cx + r * 0.24, cy + r * 0.24], fill=sub_col)
        for k in range(6):
            a = k * math.pi / 3
            d.line([(cx + math.cos(a) * r * 0.62, cy + math.sin(a) * r * 0.62),
                    (cx + math.cos(a) * r * 0.88, cy + math.sin(a) * r * 0.88)], fill=col, width=3)
    elif kind == "faction":
        pts = [(cx, cy - r * 0.88), (cx + r * 0.75, cy - r * 0.35), (cx + r * 0.55, cy + r * 0.78),
               (cx, cy + r * 0.98), (cx - r * 0.55, cy + r * 0.78), (cx - r * 0.75, cy - r * 0.35)]
        d.polygon(pts, outline=col, fill=(32, 22, 54))
        d.polygon([(cx, cy - r * 0.45), (cx + r * 0.32, cy), (cx, cy + r * 0.45), (cx - r * 0.32, cy)], fill=sub_col)
    elif kind == "calendar":
        d.rounded_rectangle([cx - r * 0.78, cy - r * 0.65, cx + r * 0.78, cy + r * 0.75], radius=4, outline=col, width=3)
        d.line([(cx - r * 0.75, cy - r * 0.2), (cx + r * 0.75, cy - r * 0.2)], fill=sub_col, width=2)
        d.ellipse([cx - r * 0.2, cy + r * 0.1, cx + r * 0.2, cy + r * 0.5], fill=C_ROSE)
    elif kind == "shop":
        d.rounded_rectangle([cx - r * 0.72, cy - r * 0.38, cx + r * 0.72, cy + r * 0.78], radius=5, outline=col, width=3)
        d.arc([cx - r * 0.42, cy - r * 0.82, cx + r * 0.42, cy - r * 0.02], 180, 360, fill=sub_col, width=3)
    elif kind == "supply":
        pts = [(cx, cy - r * 0.92), (cx + r * 0.26, cy - r * 0.26), (cx + r * 0.92, cy),
               (cx + r * 0.26, cy + r * 0.26), (cx, cy + r * 0.92), (cx - r * 0.26, cy + r * 0.26),
               (cx - r * 0.92, cy), (cx - r * 0.26, cy - r * 0.26)]
        d.polygon(pts, fill=col, outline=sub_col)
    elif kind == "tower":
        d.polygon([(cx, cy - r * 0.92), (cx + r * 0.55, cy + r * 0.82), (cx - r * 0.55, cy + r * 0.82)], outline=col, fill=(28, 22, 52))
        d.line([(cx, cy - r * 0.92), (cx, cy + r * 0.82)], fill=C_ROSE, width=3)
        d.arc([cx - r * 0.85, cy - r * 0.25, cx + r * 0.85, cy + r * 0.35], 0, 360, fill=C_ICE, width=2)
    elif kind == "modes":
        d.polygon([(cx - r * 0.45, cy - r * 0.7), (cx + r * 0.75, cy), (cx - r * 0.45, cy + r * 0.7)], fill=col, outline=sub_col)
    elif kind == "partner":
        d.polygon([(cx, cy + r * 0.78), (cx - r * 0.82, cy - r * 0.12), (cx - r * 0.45, cy - r * 0.68),
                   (cx, cy - r * 0.28), (cx + r * 0.45, cy - r * 0.68), (cx + r * 0.82, cy - r * 0.12)], fill=col, outline=sub_col)
    elif kind == "role":
        d.ellipse([cx - r * 0.38, cy - r * 0.78, cx + r * 0.38, cy - r * 0.02], fill=col)
        d.polygon([(cx - r * 0.75, cy + r * 0.82), (cx - r * 0.42, cy + r * 0.12), (cx + r * 0.42, cy + r * 0.12), (cx + r * 0.75, cy + r * 0.82)], fill=col)


def make_hud_btn(w, h, kind, label, accent=C_ROSE):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if w > h * 1.45:
        # 宽胶囊按钮(冒险 / 探索):按可用宽度自适应字号,绝不裁字
        d.rounded_rectangle([3, 4, w - 4, h - 4], radius=h // 2 - 4, fill=(14, 16, 34, 232), outline=(*accent, 230), width=3)
        d.rounded_rectangle([8, 9, w - 9, h - 9], radius=max(6, h // 2 - 9), outline=(*C_GOLD, 120), width=1)
        ico_cx = int(h * 0.42)
        draw_hud_icon(d, kind, ico_cx, h // 2, int(h * 0.21), accent, C_GOLD)
        tx0 = int(h * 0.70)
        avail_w = max(24, w - tx0 - 16)
        fs = min(int(h * 0.28), max(12, int(avail_w / max(1, len(label)) * 0.95)))
        f = font(fs, bold=True)
        d.text((tx0 + avail_w // 2, h // 2), label, font=f, fill=(255, 246, 250), anchor="mm")
    else:
        r = min(w, h) * 0.42
        cx, cy = w // 2, int(h * 0.42)
        d.rounded_rectangle([4, 4, w - 5, h - 5], radius=int(min(w, h) * 0.28), fill=(14, 16, 34, 226), outline=(*accent, 205), width=2)
        draw_hud_icon(d, kind, cx, cy - 3, r * 0.55, accent, C_GOLD)
        f = font(max(13, int(h * 0.19)), bold=True)
        d.text((cx, h - int(h * 0.18)), label, font=f, fill=C_GOLD, anchor="mm")
    return im


def make_header_banner(bg_im, w, h, title_zh, sub_en, accent=C_ROSE):
    im = crop_fill(bg_im, w, h, 0.35).convert("RGBA")
    ov = Image.new("RGBA", (w, h), (9, 10, 22, 165))
    im = Image.alpha_composite(im, ov)
    d = ImageDraw.Draw(im)
    d.line([(0, h - 3), (w, h - 3)], fill=(*accent, 235), width=4)
    d.line([(0, h - 7), (int(w * 0.42), h - 7)], fill=(*C_GOLD, 180), width=2)
    if title_zh:
        d.text((34, int(h * 0.44)), title_zh, font=font(int(min(44, h * 0.22)), bold=True, serif=True), fill=(255, 245, 250), anchor="lm")
    if sub_en:
        d.text((36, int(h * 0.72)), sub_en, font=font(int(min(20, h * 0.11)), bold=False), fill=C_GOLD, anchor="lm")
    return im.convert("RGB")


def update_embed_js():
    embed_p = ROOT / "js" / "embed.js"
    txt = embed_p.read_text(encoding="utf-8")
    me_b64 = "data:image/jpeg;base64," + base64.b64encode((OUT / "battle" / "me.jpg").read_bytes()).decode("ascii")
    foe_b64 = "data:image/jpeg;base64," + base64.b64encode((OUT / "battle" / "enemy.jpg").read_bytes()).decode("ascii")

    txt = re.sub(r"\n\s*avatarMeBiao:\s*'[^']*',?", "", txt)
    txt = re.sub(r"\n\s*avatarFoeBiao:\s*'[^']*',?", "", txt)
    inject = f"  avatarMeBiao: '{me_b64}',\n  avatarFoeBiao: '{foe_b64}',\n}};"
    txt = re.sub(r"\};\s*$", inject + "\n", txt)
    embed_p.write_text(txt, encoding="utf-8")


def main():
    print("==> 1/5 加载母版并执行 2D 角色精准抠图...")
    bg_login = load_master("login_kv")
    bg_partner = load_master("partner_stage_bg")
    bg_story = load_master("story_bg")
    bg_supply = load_master("supply_stage_bg")
    bg_tower = load_master("tower_arena_bg")
    map_master = load_master("map_neon_park")
    sh_eq_a = load_master("icons_equip_a")
    sh_eq_b = load_master("icons_equip_b")
    sh_gift = load_master("icons_gifts_cards")

    # 保存高刷场景底图(供 renderBiao 分层舞台直接调用)
    save_img(crop_fill(bg_login, 720, 1562, 0.5), "bg/login_kv.webp", quality=85)
    save_img(crop_fill(bg_partner, 720, 1562, 0.5), "bg/partner_stage.webp", quality=85)
    save_img(crop_fill(bg_story, 720, 1562, 0.5), "bg/story_bg.webp", quality=85)
    save_img(crop_fill(bg_supply, 720, 1562, 0.5), "bg/supply_stage.webp", quality=85)
    save_img(crop_fill(bg_tower, 720, 1562, 0.5), "bg/tower_arena.webp", quality=85)

    char_specs = {
        "heroine": (C_ROSE, False),
        "jiguang": (C_GOLD, True),
        "ling": (C_ICE, True),
        "maguangyao": (C_VIOLET, True),
        "linxiao": (C_ICE, True),
        "guxuan": ((96, 214, 200), True),
        "yinsha": (C_ROSE, True),
        "wuman": (C_ICE, False),
        "xiongjie": (C_GOLD, False),
        "linran": (C_ROSE, False),
    }
    tachies = {}
    avatars = {}
    for cid, (acc, is_partner) in char_specs.items():
        raw = load_master(f"char_{cid}")
        rgba = cutout_tachie(raw)
        tachies[cid] = rgba
        tachie_640 = rgba.resize((640, 1138), Image.LANCZOS)
        save_img(tachie_640, f"chars/{cid}.webp", quality=86)
        av = make_avatar(rgba, acc, 192)
        avatars[cid] = av
        save_img(av, f"avatars/{cid}.webp", quality=86)
        if is_partner:
            card = make_partner_card(rgba, bg_partner, acc, 276, 426)
            save_img(card, f"cards/{cid}.webp", quality=86)

    # 战斗与好友头像
    save_img(avatars["heroine"].resize((228, 228), Image.LANCZOS), "battle/me.jpg", quality=90)
    save_img(avatars["linran"].resize((227, 227), Image.LANCZOS), "battle/enemy.jpg", quality=90)
    save_img(avatars["linran"].resize((78, 80), Image.LANCZOS), "friend/avatar.jpg", quality=90)

    print("==> 2/5 合成等距赛博霓虹乐园地图 (对齐 D.buildings 热区)...")
    mw, mh = 1887, 1305
    park_canvas = Image.new("RGB", (mw, mh), (18, 15, 31))
    pd = ImageDraw.Draw(park_canvas)
    for gx in range(-mh, mw + mh, 96):
        pd.line([(gx, 0), (gx + mh, mh)], fill=(28, 24, 48), width=1)
        pd.line([(gx, mh), (gx + mh, 0)], fill=(25, 22, 44), width=1)

    pm_w, pm_h = 1310, 879
    pm_rs = map_master.resize((pm_w, pm_h), Image.LANCZOS)
    # 四周羽化融入夜色网格底图
    mask_x = np.minimum(np.linspace(0, 1, pm_w) * 14, np.linspace(1, 0, pm_w) * 14)
    mask_y = np.minimum(np.linspace(0, 1, pm_h) * 14, np.linspace(1, 0, pm_h) * 14)
    feather = (np.clip(np.minimum(mask_y[:, None], mask_x[None, :]), 0, 1) * 255).astype(np.uint8)
    park_canvas.paste(pm_rs, (295, 205), Image.fromarray(feather, "L"))
    save_img(park_canvas, "home/map.webp", quality=84)

    print("==> 3/5 切片 20 件装备 + 14 种道具 + 6 种情感礼物图标...")
    eq_a_cells = [
        ("prism", 0, 0), ("pistol", 1, 0), ("vest", 2, 0), ("hat", 3, 0),
        ("neck_gold", 0, 1), ("ring", 1, 1), ("glove_white", 2, 1), ("gauntlet", 3, 1),
        ("pants", 0, 2), ("boots", 1, 2), ("tuxedo", 2, 2), ("choker", 3, 2),
    ]
    for eid, c, r in eq_a_cells:
        save_img(slice_icon(sh_eq_a, c, r, 4, 3, EQUIP_RARE[eid], 104), f"equip/{eid}.webp", quality=88)

    eq_b_cells = [
        ("armor_pink", 0, 0), ("bracelet", 1, 0), ("helmet_brown", 2, 0), ("helmet_grey", 3, 0),
        ("chain", 0, 1), ("rifle", 1, 1), ("pistol_color", 2, 1), ("vest_green", 3, 1),
    ]
    for eid, c, r in eq_b_cells:
        save_img(slice_icon(sh_eq_b, c, r, 4, 4, EQUIP_RARE[eid], 104), f"equip/{eid}.webp", quality=88)

    # 基础资源道具
    save_img(slice_icon(sh_eq_b, 0, 2, 4, 4, "blue", 104), "item/exp.webp", quality=88)
    save_img(slice_icon(sh_eq_b, 1, 2, 4, 4, "orange", 140), "item/credit.webp", quality=88)
    save_img(slice_icon(sh_eq_b, 2, 2, 4, 4, "purple", 104), "item/crystal.webp", quality=88)
    save_img(slice_icon(sh_eq_b, 3, 2, 4, 4, "orange", 64, pad_ratio=0.08), "item/daily_point.webp", quality=90)

    # 补给券、补给箱与好感礼盒
    save_img(slice_icon(sh_gift, 2, 1, 4, 4, "blue", 104), "item/supply_card.webp", quality=88)
    save_img(slice_icon(sh_gift, 3, 2, 4, 4, "orange", 104), "item/special_card.webp", quality=88)
    save_img(slice_icon(sh_gift, 0, 3, 4, 4, "white", 104), "item/box_white.webp", quality=88)
    save_img(slice_icon(sh_gift, 1, 3, 4, 4, "green", 104), "item/box_green.webp", quality=88)
    save_img(slice_icon(sh_gift, 2, 3, 4, 4, "blue", 104), "item/box_blue.webp", quality=88)
    save_img(slice_icon(sh_gift, 0, 2, 4, 4, "purple", 104), "item/box_race.webp", quality=88)

    save_img(slice_icon(sh_gift, 3, 3, 4, 4, "orange", 104, hue_shift=8.0), "item/gift_orange.webp", quality=88)
    save_img(slice_icon(sh_gift, 3, 3, 4, 4, "purple", 104, hue_shift=-48.0), "item/gift_purple.webp", quality=88)
    save_img(slice_icon(sh_gift, 3, 3, 4, 4, "blue", 104, hue_shift=-135.0), "item/gift_blue.webp", quality=88)
    save_img(slice_icon(sh_gift, 3, 3, 4, 4, "green", 104, hue_shift=132.0), "item/gift_green.webp", quality=88)

    gift_cells = [
        ("geiger", 0, 0, "blue"), ("can", 1, 0, "purple"), ("rouge", 2, 0, "blue"), ("papers", 3, 0, "orange"),
        ("holo", 0, 1, "orange"), ("perfume", 1, 1, "orange"),
    ]
    for gid, c, r, rare in gift_cells:
        save_img(slice_icon(sh_gift, c, r, 4, 4, rare, 100), f"gift/{gid}.webp", quality=88)

    print("==> 4/5 生成底部导航、主页 HUD、横幅与全界面组件...")
    # 底部导航 5 态 (720x162, 对应 360x81, flex 比例 1.32 : 1 : 1 : 1 : 1.35)
    nav_tabs = [
        ("role", "角色", "role", 1.32),
        ("bag", "仓库", "shop", 1.0),
        ("home", "主页", "supply", 1.0),
        ("mission", "任务", "calendar", 1.0),
        ("partner", "伙伴", "partner", 1.35),
    ]
    tot_flex = sum(t[3] for t in nav_tabs)
    for active_key, _, _, _ in nav_tabs:
        nav_im = vgrad(720, 162, (16, 18, 36), (8, 9, 18)).convert("RGBA")
        nd = ImageDraw.Draw(nav_im)
        nd.line([(0, 2), (720, 2)], fill=(*C_ROSE, 190), width=3)
        x_cur = 0.0
        for key, label, ikind, fl in nav_tabs:
            seg_w = 720.0 * fl / tot_flex
            cx = int(round(x_cur + seg_w / 2))
            on = key == active_key
            if on:
                nd.rounded_rectangle([int(x_cur + 10), 12, int(x_cur + seg_w - 10), 150], radius=18,
                                     fill=(42, 20, 58, 220), outline=(*C_ROSE, 235), width=3)
                nd.line([(cx - 28, 12), (cx + 28, 12)], fill=C_GOLD, width=4)
            col = C_ROSE if on else (130, 136, 168)
            sub = C_GOLD if on else (96, 102, 132)
            draw_hud_icon(nd, ikind, cx, 60, 24, col, sub)
            nd.text((cx, 122), label, font=font(24 if on else 22, bold=on), fill=(255, 242, 248) if on else C_MUTED, anchor="mm")
            x_cur += seg_w
        save_img(nav_im.convert("RGB"), f"nav/{active_key}.jpg", quality=90)

    # 主页小图标与按钮
    for ik, fn_name in [("gem", "ico_gem.webp"), ("coin", "ico_coin.webp"), ("bolt", "ico_bolt.webp")]:
        w, h = (38, 50) if ik == "bolt" else (44, 50)
        ico = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw_hud_icon(ImageDraw.Draw(ico), ik, w // 2, h // 2, min(w, h) * 0.4, C_ROSE if ik == "gem" else C_GOLD)
        save_img(ico, f"home/{fn_name}", quality=90)

    plus_im = Image.new("RGBA", (46, 46), (0, 0, 0, 0))
    pd = ImageDraw.Draw(plus_im)
    pd.ellipse([4, 4, 42, 42], fill=(*C_ROSE, 235), outline=C_GOLD, width=2)
    pd.line([(23, 13), (23, 33)], fill=(255, 255, 255), width=4)
    pd.line([(13, 23), (33, 23)], fill=(255, 255, 255), width=4)
    save_img(plus_im, "home/ico_plus.webp", quality=90)

    # 主页左上角玩家名片 (460x170)
    pcard = Image.new("RGBA", (460, 170), (0, 0, 0, 0))
    pcd = ImageDraw.Draw(pcard)
    pcd.rounded_rectangle([6, 8, 452, 160], radius=24, fill=(14, 16, 34, 232), outline=(*C_GOLD, 185), width=2)
    pcd.rounded_rectangle([10, 12, 448, 156], radius=21, outline=(*C_ROSE, 95), width=1)
    av_hero = avatars["heroine"].resize((116, 116), Image.LANCZOS)
    av_mask = Image.new("L", (116, 116), 0)
    ImageDraw.Draw(av_mask).ellipse([0, 0, 115, 115], fill=255)
    pcard.paste(av_hero, (22, 26), av_mask)
    pcd.ellipse([21, 25, 139, 143], outline=C_ROSE, width=3)
    pcd.text((158, 52), "热心市民VV", font=font(26, bold=True), fill=(255, 245, 250), anchor="lm")
    pcd.rounded_rectangle([32, 102, 128, 132], radius=14, fill=(22, 20, 42, 240), outline=C_ICE, width=1)
    pcd.text((80, 117), "等级:21", font=font(18, bold=True), fill=C_GOLD, anchor="mm")
    pcd.rounded_rectangle([196, 98, 424, 138], radius=16, fill=(38, 18, 54, 220), outline=(*C_ROSE, 165), width=1)
    pcd.text((310, 118), "✦ 绯夜园区导览 ▸", font=font(19, bold=True), fill=C_ICE, anchor="mm")
    save_img(pcard, "home/card.webp", quality=88)

    hud_btns = [
        ("btn_friend.webp", 82, 92, "friend", "好友", C_ICE),
        ("btn_mail.webp", 62, 76, "mail", "邮件", C_GOLD),
        ("btn_setting.webp", 68, 76, "setting", "设置", C_MUTED),
        ("btn_faction.webp", 88, 90, "faction", "势力", C_VIOLET),
        ("btn_calendar.webp", 90, 90, "calendar", "日历", C_ROSE),
        ("btn_shop.webp", 126, 124, "shop", "商城", C_GOLD),
        ("btn_supply.webp", 126, 122, "supply", "补给", C_ROSE),
        ("btn_tower.webp", 126, 124, "tower", "无尽塔", C_ICE),
        ("btn_modes.webp", 126, 122, "modes", "玩法", C_VIOLET),
        ("btn_adventure.webp", 262, 128, "modes", "霓虹冒险", C_ROSE),
        ("btn_explore.webp", 196, 104, "supply", "终端互动", C_ICE),
    ]
    for fn, bw, bh, ik, lbl, acc in hud_btns:
        save_img(make_hud_btn(bw, bh, ik, lbl, acc), f"home/{fn}", quality=88)

    # 仓库、任务、商城、伙伴、角色接口、邮件、好友、关卡横幅与图标
    for t_key, zh, idx_on in [("item", "道具收纳", 0), ("equip", "武装衣橱", 1)]:
        bh_im = make_header_banner(bg_supply, 720, 410, "绯夜私藏仓库", "VELVET VAULT · INVENTORY", C_ROSE)
        bd = ImageDraw.Draw(bh_im)
        for k, t_lbl in enumerate(["道具", "装备"]):
            tx = 48 + k * 196
            on = k == idx_on
            bd.rounded_rectangle([tx, 316, tx + 188, 376], radius=14,
                                 fill=C_ROSE if on else (24, 24, 48), outline=C_GOLD if on else (80, 84, 120), width=2)
            bd.text((tx + 94, 346), t_lbl, font=font(24, bold=True), fill=(255, 255, 255) if on else C_MUTED, anchor="mm")
        bd.text((512, 334), "容量", font=font(18, bold=False), fill=C_GOLD, anchor="lm")
        save_img(bh_im, f"bag/head_{t_key}.jpg", quality=88)

    save_img(make_header_banner(bg_story, 720, 208, "夜巡委托档案", "MIDNIGHT COMMISSIONS", C_ROSE), "mission/banner.jpg", quality=88)
    for m_ico, lbl, acc in [
        ("ico_daily.jpg", "日常", C_ICE),
        ("ico_main.jpg", "主线", C_ROSE),
        ("ico_red.jpg", "密令", C_ROSE_DEEP),
        ("ico_white.jpg", "旧闻", C_GOLD),
        ("ico_explore.jpg", "探索", C_VIOLET),
    ]:
        mh = 132 if "daily" in m_ico else 128
        mi = vgrad(112, mh, (26, 22, 48), (12, 13, 26))
        md = ImageDraw.Draw(mi)
        md.rounded_rectangle([6, 6, 105, mh - 7], radius=16, outline=acc, width=3)
        draw_hud_icon(md, "supply", 56, int(mh * 0.38), 22, acc, C_GOLD)
        md.text((56, int(mh * 0.76)), lbl, font=font(22, bold=True), fill=C_GOLD, anchor="mm")
        save_img(mi, f"mission/{m_ico}", quality=90)

    # VIP 霓虹黑金入园票券 (580x990, 二维码槽位对应 DOM 63*2, 139*2 -> [126..462, 278..602])
    qr = vgrad(580, 990, (22, 16, 42), (10, 11, 22))
    qd = ImageDraw.Draw(qr)
    qd.rounded_rectangle([14, 14, 565, 975], radius=32, outline=C_GOLD, width=4)
    qd.rounded_rectangle([26, 26, 553, 963], radius=26, outline=C_ROSE, width=2)
    qd.text((290, 96), "绯夜霓虹 · 特许互动通行证", font=font(32, bold=True, serif=True), fill=C_GOLD, anchor="mm")
    qd.text((290, 148), "CRIMSON NEON VIP ACCESS PASS", font=font(18, bold=False), fill=C_ICE, anchor="mm")
    qd.rounded_rectangle([108, 258, 472, 622], radius=20, fill=(248, 246, 252), outline=C_GOLD, width=4)
    for x in range(44, 536, 22):
        qd.line([(x, 690), (x + 12, 690)], fill=C_GOLD, width=2)
    qd.text((290, 768), "向园区驻场角色出示此通行证", font=font(24, bold=True), fill=(245, 240, 250), anchor="mm")
    qd.text((290, 822), "即可完成线下暗号核验与羁绊同步", font=font(20, bold=False), fill=C_MUTED, anchor="mm")
    save_img(qr, "mission/qr_card.jpg", quality=88)

    save_img(make_header_banner(bg_supply, 720, 390, "绯夜黑市甄选", "VIP BOUTIQUE & EXCHANGE", C_GOLD), "shop/head.jpg", quality=88)
    save_img(make_header_banner(bg_partner, 720, 262, "契约权益与委托", "PARTNER COVENANT", C_ROSE), "partner/band.jpg", quality=88)
    save_img(make_header_banner(bg_tower, 720, 240, "义体神经接口", "CYBERNETIC INTERFACE", C_ICE), "role/iface_bg.jpg", quality=88)

    if_map = [
        ("head", "hat"), ("neck", "choker"), ("weapon", "pistol_color"),
        ("hand", "gauntlet"), ("armor", "armor_pink"), ("pants", "pants"), ("shoes", "boots"),
    ]
    for if_k, eq_k in if_map:
        w, h = (78, 78) if if_k in ("pants", "shoes") else (80, 84)
        src_ico = Image.open(OUT / f"equip/{eq_k}.webp").resize((w, h), Image.LANCZOS)
        save_img(src_ico, f"role/if_{if_k}.jpg", quality=90)

    for sl in ["head", "neck", "weapon", "hand1", "hand2", "hand3", "hand4", "armor", "pants", "shoes"]:
        sl_im = vgrad(146, 150, (28, 24, 52), (14, 15, 30))
        sd = ImageDraw.Draw(sl_im)
        sd.rounded_rectangle([4, 4, 141, 145], radius=16, outline=C_GOLD, width=3)
        sd.rounded_rectangle([10, 10, 135, 139], radius=12, outline=C_ROSE, width=1)
        save_img(sl_im, f"role/slot_{sl}.jpg", quality=90)

    # 邮件与好友
    save_img(make_header_banner(bg_story, 720, 290, "加密终端信箱", "ENCRYPTED TERMINAL MAIL", C_ICE), "mail/head.jpg", quality=88)
    for read, fn in [(False, "ico.jpg"), (True, "ico_read.jpg")]:
        mi = vgrad(98, 96, (30, 24, 54) if not read else (20, 20, 34), C_NIGHT)
        md = ImageDraw.Draw(mi)
        col = C_ROSE if not read else (95, 98, 124)
        md.rounded_rectangle([6, 6, 91, 89], radius=14, outline=col, width=2)
        draw_hud_icon(md, "mail", 49, 48, 28, col, C_GOLD if not read else (95, 98, 124))
        save_img(mi, f"mail/{fn}", quality=90)

    for fn, lbl, w, col in [("btn_del.jpg", "删除已读", 200, (54, 42, 76)), ("btn_all.jpg", "一键领取", 280, C_ROSE)]:
        bi = vgrad(w, 68, col, C_NIGHT if fn == "btn_del.jpg" else C_ROSE_DEEP)
        bd = ImageDraw.Draw(bi)
        bd.rounded_rectangle([2, 2, w - 3, 65], radius=32, outline=C_GOLD, width=2)
        bd.text((w // 2, 34), lbl, font=font(24, bold=True), fill=(255, 248, 252), anchor="mm")
        save_img(bi, f"mail/{fn}", quality=90)

    dm = Image.new("RGB", (92, 40), (0, 0, 0))
    dd = ImageDraw.Draw(dm)
    for k in range(3):
        cx = 20 + k * 26
        dd.polygon([(cx, 10), (cx + 8, 20), (cx, 30), (cx - 8, 20)], fill=C_GOLD if k == 1 else C_ROSE)
    save_img(dm, "mail/diamonds.jpg", quality=90)

    save_img(make_header_banner(bg_partner, 720, 300, "绯夜盟友名录", "COMPANION NETWORK", C_ICE), "friend/head.jpg", quality=88)

    # 关卡、玩法与列车
    save_img(make_header_banner(bg_story, 720, 380, "圣物核心试炼", "RELIC CORE · STAGE PROGRESS", C_ROSE), "stage/head_core.jpg", quality=88)
    save_img(make_header_banner(bg_tower, 720, 380, "运动博物馆试炼", "NEON MUSEUM · STAGE PROGRESS", C_ICE), "stage/head_museum.jpg", quality=88)

    boss_im = avatars["xiongjie"].resize((122, 126), Image.LANCZOS).convert("RGB")
    bd = ImageDraw.Draw(boss_im)
    bd.rectangle([1, 1, 120, 124], outline=C_ROSE, width=4)
    bd.rectangle([0, 96, 122, 126], fill=(18, 12, 30))
    bd.text((61, 111), "BOSS", font=font(20, bold=True), fill=C_GOLD, anchor="mm")
    save_img(boss_im, "stage/boss.jpg", quality=90)

    # 关卡详情底板 (660x961, 对应 330x481: 标题、首领、战力、通关率、描述、挑战按钮 128,420 190x48)
    st_det = vgrad(660, 961, (24, 20, 46), (12, 13, 28))
    sdd = ImageDraw.Draw(st_det)
    sdd.rounded_rectangle([6, 6, 653, 954], radius=24, outline=C_ROSE, width=4)
    sdd.rounded_rectangle([16, 16, 643, 944], radius=18, outline=C_GOLD, width=2)
    av_foe = avatars["linran"].resize((112, 112), Image.LANCZOS).convert("RGB")
    st_det.paste(av_foe, (42, 214))
    sdd.rectangle([40, 212, 156, 330], outline=C_ICE, width=3)
    sdd.text((174, 232), "守关对手", font=font(20, bold=False), fill=C_MUTED, anchor="lm")
    sdd.text((430, 280), "推荐战力", font=font(20, bold=False), fill=C_MUTED, anchor="lm")
    sdd.text((430, 326), "通关评估", font=font(20, bold=False), fill=C_MUTED, anchor="lm")
    sdd.line([(44, 366), (616, 366)], fill=(60, 56, 92), width=2)
    sdd.text((48, 468), "首通与扫荡掉落预览", font=font(22, bold=True), fill=C_GOLD, anchor="lm")
    for k, ico_p in enumerate(["item/exp.webp", "item/crystal.webp", "item/credit.webp"]):
        ic = Image.open(OUT / ico_p).resize((96, 96), Image.LANCZOS)
        st_det.paste(ic, (54 + k * 116, 504))
    sdd.rounded_rectangle([44, 846, 236, 932], radius=24, fill=(28, 28, 52), outline=C_ICE, width=2)
    sdd.text((140, 889), "消耗体力 ×6", font=font(22, bold=True), fill=C_ICE, anchor="mm")
    sdd.rounded_rectangle([256, 840, 636, 936], radius=44, fill=C_ROSE, outline=C_GOLD, width=3)
    sdd.text((446, 888), "⚔ 开始挑战", font=font(30, bold=True), fill=(255, 255, 255), anchor="mm")
    save_img(st_det, "stage/detail.jpg", quality=88)

    mode_defs = [
        ("string", "霓虹弦音回廊", "NEON CHORD GALLERY · 敬请期待", bg_partner, C_ROSE),
        ("ring", "星环引力擂台", "STARLIGHT RING ARENA · 敬请期待", bg_login, C_GOLD),
        ("catch", "全息幻影缉捕", "HOLOGRAM PURSUIT · 敬请期待", bg_supply, C_VIOLET),
        ("mine", "地核矿山探索列车", "CORE MINE EXPRESS · 点击进入挑战", bg_tower, C_ICE),
        ("gorge", "追光峡谷探索列车", "LIGHTCHASER GORGE EXPRESS · 点击进入挑战", bg_story, C_ROSE),
    ]
    for m_id, zh, en, m_bg, acc in mode_defs:
        mh = 327 if m_id == "ring" else (322 if m_id == "gorge" else 323)
        mc = crop_fill(m_bg, 668, mh, 0.45).convert("RGBA")
        ov = Image.new("RGBA", (668, mh), (10, 12, 26, 150))
        mc = Image.alpha_composite(mc, ov)
        md = ImageDraw.Draw(mc)
        md.rounded_rectangle([4, 4, 663, mh - 5], radius=22, outline=acc, width=4)
        md.text((42, int(mh * 0.42)), zh, font=font(36, bold=True, serif=True), fill=(255, 246, 250), anchor="lm")
        md.text((44, int(mh * 0.68)), en, font=font(20, bold=False), fill=C_GOLD, anchor="lm")
        save_img(mc.convert("RGB"), f"modes/{m_id}.jpg", quality=88)

    for is_head, fn in [(True, "train_head.jpg"), (False, "train_car.jpg")]:
        tc = crop_fill(bg_tower if is_head else bg_story, 160, 226, 0.5).convert("RGBA")
        tc = Image.alpha_composite(tc, Image.new("RGBA", (160, 226), (12, 14, 30, 130)))
        td = ImageDraw.Draw(tc)
        acc = C_GOLD if is_head else C_ICE
        td.rounded_rectangle([4, 4, 155, 221], radius=14, outline=acc, width=3)
        td.text((80, 113), "先驱车头" if is_head else "装甲车厢", font=font(22, bold=True), fill=acc, anchor="mm")
        save_img(tc.convert("RGB"), f"modes/{fn}", quality=88)

    # 战斗横幅与条带
    bt_st = vgrad(720, 320, (34, 12, 48), (14, 10, 28))
    bsd = ImageDraw.Draw(bt_st)
    bsd.line([(0, 18), (720, 18)], fill=C_ROSE, width=6)
    bsd.line([(0, 302), (720, 302)], fill=C_ICE, width=6)
    bsd.text((360, 138), "绯夜对决 · START", font=font(56, bold=True, serif=True), fill=(255, 245, 250), anchor="mm")
    bsd.text((360, 214), "CRIMSON NEON SHOWDOWN", font=font(24, bold=True), fill=C_GOLD, anchor="mm")
    save_img(bt_st, "battle/start.jpg", quality=90)

    bt_win = vgrad(720, 190, (46, 16, 62), (18, 12, 34))
    bwd = ImageDraw.Draw(bt_win)
    bwd.line([(0, 8), (720, 8)], fill=C_GOLD, width=5)
    bwd.line([(0, 182), (720, 182)], fill=C_ROSE, width=5)
    bwd.text((360, 95), "✦ 挑战成功 · VICTORY ✦", font=font(44, bold=True, serif=True), fill=C_GOLD, anchor="mm")
    save_img(bt_win, "battle/win.jpg", quality=90)

    for fn, bh in [("band_top.jpg", 172), ("band_bot.jpg", 162)]:
        bb = vgrad(720, bh, (22, 12, 38), (10, 11, 22))
        bbd = ImageDraw.Draw(bb)
        for x in range(-bh, 720 + bh, 48):
            bbd.line([(x, 0), (x + 36, bh)], fill=(*C_ROSE, 90), width=6)
        bbd.line([(0, bh - 4), (720, bh - 4)], fill=C_GOLD, width=3)
        bbd.text((360, bh // 2), "CRIMSON NEON ARENA", font=font(24, bold=True), fill=C_ICE, anchor="mm")
        save_img(bb, f"battle/{fn}", quality=88)

    # 通用 UI 头部与底边、设置、日历、互动底板
    for fn, w, h, lbl in [
        ("buy_head.jpg", 660, 168, "物资兑换确认"),
        ("buy_foot.jpg", 660, 40, ""),
        ("cal_head.jpg", 660, 89, "绯夜园区日历"),
        ("cal_foot.jpg", 660, 104, ""),
        ("dlg_head.jpg", 720, 40, ""),
        ("reward_head.jpg", 720, 58, ""),
        ("wd_head.jpg", 666, 60, ""),
        ("wd_foot.jpg", 666, 48, ""),
    ]:
        ui_im = vgrad(w, h, (30, 18, 52), (12, 14, 28))
        ud = ImageDraw.Draw(ui_im)
        ud.rectangle([2, 2, w - 3, h - 3], outline=C_ROSE, width=2)
        if lbl:
            ud.text((w // 2, int(h * 0.42)), lbl, font=font(28, bold=True, serif=True), fill=C_GOLD, anchor="mm")
            ud.text((w - 44, 30), "✕", font=font(26, bold=True), fill=C_GOLD, anchor="mm")
        if fn == "cal_foot.jpg":
            ud.rounded_rectangle([24, 14, 168, 82], radius=18, fill=(28, 26, 52), outline=C_ICE, width=2)
            ud.text((96, 48), "筛选", font=font(22, bold=True), fill=C_ICE, anchor="mm")
            ud.rounded_rectangle([392, 12, 640, 88], radius=22, fill=C_ROSE, outline=C_GOLD, width=2)
            ud.text((516, 50), "我的预约", font=font(24, bold=True), fill=(255, 255, 255), anchor="mm")
        save_img(ui_im, f"ui/{fn}", quality=90)

    for fn, sz, bgc in [("ico_power.jpg", 50, (244, 241, 248)), ("ico_power_dark.jpg", 42, (20, 18, 34))]:
        pi = Image.new("RGB", (sz, sz), bgc)
        draw_hud_icon(ImageDraw.Draw(pi), "bolt", sz // 2, sz // 2, sz * 0.38, C_ROSE)
        save_img(pi, f"ui/{fn}", quality=90)

    # 设置弹窗底板 (660x476 -> 330x238: 3 个按钮 y=67,110,152 -> 134,220,304)
    set_im = vgrad(660, 476, (26, 20, 48), (12, 13, 26))
    std = ImageDraw.Draw(set_im)
    std.rounded_rectangle([4, 4, 655, 471], radius=24, outline=C_ROSE, width=4)
    std.text((330, 42), "系统设置", font=font(28, bold=True, serif=True), fill=C_GOLD, anchor="mm")
    std.text((612, 32), "✕", font=font(26, bold=True), fill=C_GOLD, anchor="mm")
    for by, btxt in [(134, "兑换礼包码"), (220, "切换账号"), (304, "返回登录页")]:
        std.rounded_rectangle([108, by, 552, by + 60], radius=30, fill=(32, 26, 58), outline=C_GOLD, width=2)
        std.text((330, by + 30), btxt, font=font(24, bold=True), fill=(255, 245, 250), anchor="mm")
    save_img(set_im, "ui/settings.jpg", quality=90)

    # 互动弹窗底板 (660x896 -> 330x448)
    itx = vgrad(660, 896, (26, 20, 48), (12, 13, 26))
    itd = ImageDraw.Draw(itx)
    itd.rounded_rectangle([4, 4, 655, 891], radius=24, outline=C_ICE, width=4)
    itd.text((330, 42), "终端暗号与园区交互", font=font(28, bold=True, serif=True), fill=C_GOLD, anchor="mm")
    itd.text((612, 30), "✕", font=font(26, bold=True), fill=C_GOLD, anchor="mm")
    itd.rounded_rectangle([508, 84, 632, 208], radius=18, fill=(32, 28, 60), outline=C_ICE, width=2)
    itd.text((570, 146), "扫码", font=font(24, bold=True), fill=C_ICE, anchor="mm")
    itd.rounded_rectangle([236, 370, 424, 422], radius=26, fill=C_ROSE, outline=C_GOLD, width=2)
    itd.text((330, 396), "核验编码", font=font(22, bold=True), fill=(255, 255, 255), anchor="mm")
    itx_btns = [
        (0, 0, "我的编号"), (1, 0, "会员绑定"),
        (0, 1, "夜巡委托"), (1, 1, "我的票券"),
        (0, 2, "涂鸦暗号"), (1, 2, "调频终端"),
    ]
    for col, row, lbl in itx_btns:
        bx, by = 44 + col * 292, 580 + row * 92
        itd.rounded_rectangle([bx, by, bx + 280, by + 68], radius=16, fill=(28, 24, 52), outline=C_GOLD, width=2)
        itd.text((bx + 140, by + 34), lbl, font=font(22, bold=True), fill=(245, 242, 252), anchor="mm")
    save_img(itx, "ui/interact.jpg", quality=88)

    # 剧情兜底图 (story/{none,wu,xiong,yin}.jpg 720x1036)
    st_base = crop_fill(bg_story, 720, 1036, 0.5)
    save_img(st_base, "story/none.jpg", quality=86)
    for fn, cid, side_x in [("wu.jpg", "wuman", 150), ("xiong.jpg", "xiongjie", 20), ("yin.jpg", "yinsha", 140)]:
        sp = st_base.copy().convert("RGBA")
        ch_im = tachies[cid].resize((540, 960), Image.LANCZOS)
        sp.alpha_composite(ch_im, (side_x, 76))
        save_img(sp.convert("RGB"), f"story/{fn}", quality=86)

    # 登录、伙伴、角色、补给、排行、外围页面的同名高保真立绘合成图(同时供 render 与 renderBiao 零误差兜底)
    lg_im = crop_fill(bg_login, 720, 1562, 0.5)
    lgd = ImageDraw.Draw(lg_im)
    lgd.text((360, 290), "新生乐园世界", font=font(64, bold=True, serif=True), fill=(255, 245, 250), anchor="mm")
    lgd.text((360, 356), "CRIMSON NEON NOCTURNE", font=font(22, bold=True), fill=C_GOLD, anchor="mm")
    lgd.rounded_rectangle([164, 1220, 556, 1328], radius=54, fill=C_ROSE, outline=C_GOLD, width=4)
    lgd.text((360, 1274), "进入绯夜乐园", font=font(34, bold=True), fill=(255, 255, 255), anchor="mm")
    save_img(lg_im, "login/bg.jpg", quality=86)
    save_img(crop_fill(bg_login, 720, 1562, 0.5), "login/loading.jpg", quality=84)

    nt_im = vgrad(676, 1080, (24, 18, 46), (11, 13, 26))
    ntd = ImageDraw.Draw(nt_im)
    ntd.rounded_rectangle([6, 6, 669, 1073], radius=28, outline=C_ROSE, width=4)
    ntd.text((338, 72), "入园须知与适龄提示 (16+)", font=font(32, bold=True, serif=True), fill=C_GOLD, anchor="mm")
    ntd.rounded_rectangle([192, 972, 488, 1044], radius=36, fill=C_ROSE, outline=C_GOLD, width=3)
    ntd.text((340, 1008), "我已知晓", font=font(26, bold=True), fill=(255, 255, 255), anchor="mm")
    save_img(nt_im, "login/notice.jpg", quality=88)

    # 伙伴图鉴与详情兜底
    plist = make_header_banner(bg_partner, 720, 1400, "", "", C_ROSE)
    save_img(plist, "partner/list.jpg", quality=84)
    for pid in ["jiguang", "ling", "maguangyao", "linxiao", "yinsha"]:
        pi_bg = crop_fill(bg_partner, 720, 1562, 0.5).convert("RGBA")
        pi_bg.alpha_composite(tachies[pid].resize((680, 1208), Image.LANCZOS), (20, 180))
        save_img(pi_bg.convert("RGB"), f"partner/{pid}.jpg", quality=84)
    vis_bg = crop_fill(bg_partner, 720, 1562, 0.5).convert("RGBA")
    vis_bg.alpha_composite(tachies["jiguang"].resize((720, 1280), Image.LANCZOS), (0, 140))
    save_img(vis_bg.convert("RGB"), "partner/visual.jpg", quality=84)

    arch_im = vgrad(720, 910, (24, 18, 46), (12, 13, 28))
    ad = ImageDraw.Draw(arch_im)
    ad.rounded_rectangle([8, 8, 711, 901], radius=28, outline=C_GOLD, width=4)
    ad.text((360, 62), "伙伴机密档案 · DOSSIER", font=font(30, bold=True, serif=True), fill=C_GOLD, anchor="mm")
    save_img(arch_im, "partner/archive.jpg", quality=86)

    # 角色四页签兜底
    for rtab in ["profile", "equip", "enh", "chip"]:
        rb = crop_fill(bg_partner, 720, 1400, 0.5).convert("RGBA")
        rb.alpha_composite(tachies["heroine"].resize((620, 1102), Image.LANCZOS), (70, 150))
        save_img(rb.convert("RGB"), f"role/{rtab}.jpg", quality=84)

    # 补给三池与结算头尾
    for idx, (stitle, acc) in enumerate([("基础物资补给", C_ICE), ("高级物资补给", C_VIOLET), ("特级绯夜补给", C_ROSE)], 1):
        sp_im = crop_fill(bg_supply, 720, 1562, 0.5)
        spd = ImageDraw.Draw(sp_im)
        spd.text((360, 270), stitle, font=font(48, bold=True, serif=True), fill=C_GOLD, anchor="mm")
        spd.rounded_rectangle([24, 1288, 360, 1388], radius=48, fill=(24, 24, 48), outline=acc, width=3)
        spd.text((192, 1338), "补给 1 次", font=font(28, bold=True), fill=(255, 255, 255), anchor="mm")
        spd.rounded_rectangle([364, 1288, 696, 1388], radius=48, fill=C_ROSE, outline=C_GOLD, width=3)
        spd.text((530, 1338), "补给 10 次", font=font(28, bold=True), fill=(255, 255, 255), anchor="mm")
        save_img(sp_im, f"supply/p{idx}.jpg", quality=84)

    save_img(make_header_banner(bg_supply, 720, 420, "补给解析完成", "SUPPLY EXTRACTION RESULT", C_GOLD), "supply/result_head.jpg", quality=88)
    srf = vgrad(720, 170, (18, 16, 36), (10, 11, 22))
    srfd = ImageDraw.Draw(srf)
    srfd.text((360, 28), "额外获赠 装备晶片X50", font=font(22, bold=True), fill=C_GOLD, anchor="mm")
    srfd.rounded_rectangle([30, 66, 354, 158], radius=44, fill=(28, 26, 54), outline=C_ICE, width=3)
    srfd.text((192, 112), "再抽 1 次", font=font(26, bold=True), fill=C_ICE, anchor="mm")
    srfd.rounded_rectangle([368, 66, 692, 158], radius=44, fill=C_ROSE, outline=C_GOLD, width=3)
    srfd.text((530, 112), "再抽 10 次", font=font(26, bold=True), fill=(255, 255, 255), anchor="mm")
    save_img(srf, "supply/result_foot.jpg", quality=88)

    # 排行榜与排名奖励说明
    rk_im = crop_fill(bg_tower, 720, 1562, 0.5)
    save_img(rk_im, "rank/bg.jpg", quality=84)
    rkr = vgrad(660, 1055, (24, 18, 46), (11, 13, 26))
    rkrd = ImageDraw.Draw(rkr)
    rkrd.rounded_rectangle([6, 6, 653, 1048], radius=24, outline=C_GOLD, width=4)
    rkrd.text((330, 56), "无尽霓虹塔 · 排名奖励说明", font=font(30, bold=True, serif=True), fill=C_GOLD, anchor="mm")
    rkrd.text((612, 36), "✕", font=font(28, bold=True), fill=C_GOLD, anchor="mm")
    tiers = [
        ("第 1 名", "装备晶片 ×500  |  特需补给卡 ×5"),
        ("第 2–3 名", "装备晶片 ×350  |  特需补给卡 ×3"),
        ("第 4–10 名", "装备晶片 ×200  |  特需补给卡 ×2"),
        ("第 11–50 名", "装备晶片 ×100  |  阪神信用点 ×500"),
        ("参与保底", "装备晶片 ×50   |  阪神信用点 ×100"),
    ]
    for idx, (rk_t, rk_rw) in enumerate(tiers):
        ry = 140 + idx * 150
        rkrd.rounded_rectangle([36, ry, 624, ry + 122], radius=18, fill=(28, 24, 52), outline=C_ROSE if idx == 0 else (72, 68, 110), width=2)
        rkrd.text((68, ry + 42), rk_t, font=font(26, bold=True), fill=C_GOLD if idx < 2 else C_ICE, anchor="lm")
        rkrd.text((68, ry + 86), rk_rw, font=font(21, bold=False), fill=(240, 238, 248), anchor="lm")
    save_img(rkr, "rank/rewards.jpg", quality=88)

    # 外围页面兜底 (extra/{profile,bind,tickets,ticket_shop,parkmap,faction}.jpg)
    for ex_name, ex_bg in [
        ("profile", bg_partner), ("bind", bg_story), ("tickets", bg_login),
        ("ticket_shop", bg_supply), ("parkmap", map_master), ("faction", bg_tower),
    ]:
        save_img(crop_fill(ex_bg, 720, 1562, 0.5), f"extra/{ex_name}.jpg", quality=82)

    print("==> 5/5 更新 js/skin_assets.js 与 js/embed.js...")
    subprocess.run([sys.executable, str(ROOT / "tools" / "skin_assets.py")], check=True)
    update_embed_js()

    tot_bytes = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
    print(f"完成! assets/biao/ 共生成文件 {sum(1 for p in OUT.rglob('*') if p.is_file())} 个, 总大小 {tot_bytes / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
