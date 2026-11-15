#!/usr/bin/env python3
"""Nextland Female-Oriented (Otome) Asset Pipeline.

Builds normalized Retina WebP runtime assets from high-res master renders:
- bg/map_twilight.webp (1887x1305, exact 1:1 coordinate match with 3773x2609 park map)
- bg/kv_login.webp & bg/story_atrium.webp (720x1290)
- chars/<id>.webp (720x1290 2x stage portraits)
- cards/<id>.webp (276x426 3x upper-body Partner List cards)
- avatars/<id>.webp (192x192 3x close-up face badges)
"""

import os
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ART_DIR = ROOT / "assets" / "masters" / "otome"
OUT_DIR = ROOT / "assets" / "img" / "otome"

MASTERS = {
    "map_twilight": "map_twilight_wonderland_1794758138220.jpg",
    "kv_login": "kv_login_wonderland_1794758240312.jpg",
    "story_atrium": "story_scene_atrium_1794758238236.jpg",
    "heroine": "char_heroine_1794758140710.jpg",
    "hero_male": "char_hero_male_1794758141651.jpg",
    "jiguang": "char_jiguang_1794758181377.jpg",
    "ling": "char_ling_1794758189552.jpg",
    "maguangyao": "char_maguangyao_1794758186096.jpg",
    "linxiao": "char_linxiao_1794758189047.jpg",
    "guxuan": "char_guxuan_1794758144461.jpg",
    "yinsha": "char_yinsha_1794758190552.jpg",
    "wuman": "story_wuman_1794758237728.jpg",
    "xiongjie": "story_xiongjie_1794758237936.jpg",
}

# (center_x, top_y, width) on 768x1376 master; height computed at exact 276:426 ratio
CARD_CROPS = {
    "jiguang": (384, 38, 548),
    "ling": (384, 38, 548),
    "maguangyao": (384, 68, 576),
    "linxiao": (390, 52, 560),
    "guxuan": (384, 50, 588),
    "yinsha": (404, 112, 460),
    "heroine": (378, 48, 560),
    "hero_male": (384, 48, 560),
}

# (center_x, center_y, square_size) on 768x1376 master
AVATAR_CROPS = {
    "heroine": (366, 315, 360),
    "hero_male": (384, 290, 350),
    "jiguang": (380, 285, 360),
    "ling": (376, 325, 370),
    "maguangyao": (388, 345, 370),
    "linxiao": (392, 285, 350),
    "guxuan": (388, 275, 350),
    "yinsha": (396, 250, 240),
    "wuman": (384, 465, 500),
    "xiongjie": (368, 355, 430),
}


def clamp_box(cx: int, cy: int, w: int, h: int, img_w: int, img_h: int):
    x0 = max(0, min(img_w - w, int(round(cx - w / 2))))
    y0 = max(0, min(img_h - h, int(round(cy - h / 2))))
    return (x0, y0, x0 + w, y0 + h)


def build_map(src_path: Path, dst_path: Path):
    """Align 1264x848 isometric wonderland map to exact 1887x1305 (3773/2 x 2609/2)."""
    im = Image.open(src_path).convert("RGB")
    target_w, target_h = 1887, 1305
    scaled_h = 1266  # 1887 * (848 / 1264) = 1265.97
    pad_top = target_h - scaled_h  # 39px sky extension so landmarks match 1:1
    scaled = im.resize((target_w, scaled_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (target_w, target_h))
    # Mirror-extend top sky strip and softly blur seam for seamless pastel sky
    top_strip = scaled.crop((0, 0, target_w, pad_top + 16)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    top_strip = top_strip.filter(ImageFilter.GaussianBlur(radius=6))
    canvas.paste(top_strip.crop((0, 16, target_w, 16 + pad_top)), (0, 0))
    canvas.paste(scaled, (0, pad_top))

    # Feather the 12px transition band around y = pad_top
    arr = np.array(canvas, dtype=np.float32)
    seam_blur = np.array(canvas.filter(ImageFilter.GaussianBlur(radius=4)), dtype=np.float32)
    for dy in range(-8, 9):
        y = pad_top + dy
        alpha = 1.0 - abs(dy) / 9.0
        arr[y] = arr[y] * (1.0 - alpha) + seam_blur[y] * alpha
    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst_path, "WEBP", quality=85, method=6)


def save_webp(im: Image.Image, dst_path: Path, quality: int = 86):
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst_path, "WEBP", quality=quality, method=6)


def main():
    art_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_ART_DIR
    for sub in ("bg", "chars", "cards", "avatars"):
        (OUT_DIR / sub).mkdir(parents=True, exist_ok=True)

    # 1. Park Map
    build_map(art_dir / MASTERS["map_twilight"], OUT_DIR / "bg" / "map_twilight.webp")

    # 2. Full-bleed stage scenes (Login KV & Story Atrium)
    for key in ("kv_login", "story_atrium"):
        im = Image.open(art_dir / MASTERS[key]).convert("RGB")
        resized = im.resize((720, 1290), Image.Resampling.LANCZOS)
        save_webp(resized, OUT_DIR / "bg" / f"{key}.webp", quality=86)

    # 3. Character 2x stage portraits, 3x partner cards, and 3x avatars
    char_keys = [
        "heroine", "hero_male",
        "jiguang", "ling", "maguangyao", "linxiao", "guxuan", "yinsha",
        "wuman", "xiongjie",
    ]
    for key in char_keys:
        im = Image.open(art_dir / MASTERS[key]).convert("RGB")
        w, h = im.size
        stage_im = im.resize((720, 1290), Image.Resampling.LANCZOS)
        save_webp(stage_im, OUT_DIR / "chars" / f"{key}.webp", quality=86)

        if key in CARD_CROPS:
            cx, top_y, cw = CARD_CROPS[key]
            ch = int(round(cw * 426 / 276))
            x0 = max(0, min(w - cw, int(round(cx - cw / 2))))
            y0 = max(0, min(h - ch, top_y))
            card_im = im.crop((x0, y0, x0 + cw, y0 + ch)).resize((276, 426), Image.Resampling.LANCZOS)
            save_webp(card_im, OUT_DIR / "cards" / f"{key}.webp", quality=87)

        if key in AVATAR_CROPS:
            ax, ay, asz = AVATAR_CROPS[key]
            box = clamp_box(ax, ay, asz, asz, w, h)
            ava_im = im.crop(box).resize((192, 192), Image.Resampling.LANCZOS)
            save_webp(ava_im, OUT_DIR / "avatars" / f"{key}.webp", quality=88)

    # Report bundle size
    total_bytes = 0
    count = 0
    for p in sorted(OUT_DIR.rglob("*.webp")):
        sz = p.stat().st_size
        total_bytes += sz
        count += 1
        print(f"  {p.relative_to(OUT_DIR)!s:28s} {sz / 1024:6.1f} KB")
    print(f"\nGenerated {count} WebP assets -> Total: {total_bytes / (1024 * 1024):.2f} MB")


if __name__ == "__main__":
    main()
