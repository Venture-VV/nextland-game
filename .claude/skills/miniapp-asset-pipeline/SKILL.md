---
name: miniapp-asset-pipeline
description: Python asset processing pipeline for Web and WeChat Mini-Program games — handles studio-backdrop removal to clean alpha PNG/WebP, character portrait anchor alignment, card thumbnail cropping, and package size optimization.
---
# Mini-Program & Web Game Asset Pipeline (小程序美术资产自动化管线)

## 1. Package & Format Budgets
- **Format**: Always output runtime assets as `.webp` (`quality=84–88`, `method=6`).
- **WeChat Mini-Program Readiness**:
  - Keep core UI icons + CSS + Step 1 runtime assets well under the `4 MB` WeChat Mini-Program main-package limit (`assets/img/otome/` is currently `1.64 MB` across 31 Retina `.webp` files).
  - Store uncompressed high-res source masters separately in `assets/masters/otome/` (exclude `assets/masters/` and `preview_step1_offline.html` when packaging Mini-Program release builds).

## 2. Portrait Framing & Build Script (`tools/build_otome_assets.py`)
- Run `python3 tools/build_otome_assets.py` to regenerate all 31 runtime `.webp` assets from `assets/masters/otome/`:
  - **Park Map (`bg/map_twilight.webp`)**: `1887×1305` (exact `1/2` scale of `D.map` `3773×2609` coordinate space, seamlessly extending top twilight sky so `D.buildings` hitboxes align 1:1).
  - **Full-Bleed KV & Story BG (`bg/kv_login.webp`, `bg/story_atrium.webp`)**: `720×1290` (`2x` Retina of `360×645`–`781` stage).
  - **Stage Portraits (`chars/<id>.webp`)**: `720×1290` (`2x` Retina).
  - **Partner Gallery Cards (`cards/<id>.webp`)**: `276×426` (`3x` Retina of `92×142` card), custom-cropped per character via `CARD_CROPS`.
  - **Square Face Avatars (`avatars/<id>.webp`)**: `192×192` (`3x` Retina), custom eye-level centered via `AVATAR_CROPS`.
