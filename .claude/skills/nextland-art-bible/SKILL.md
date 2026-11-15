---
name: nextland-art-bible
description: Official female-oriented visual art bible, character DNA specs, color tokens, prompt formulas, and ComfyUI lock-face workflow conventions for Nextland World (新生乐园世界). Use whenever generating, editing, or reviewing character portraits, UI icons, park maps, or styling for Nextland.
---
# Nextland Female-Oriented Art Bible (新生乐园世界 · 女性向视觉圣经)

## 1. Core Aesthetic Positioning
- **Style Fusion**: **Love and Deepspace (恋与深空) Subsurface-Scattering 3D-Feel Semi-Realism** × **Dreamy Twilight Wonderland (暮光星芒乐园)**.
- **Emotional Keywords**: Airy breathability (清透呼吸感), pearlescent luxury (珠光轻奢), gentle gaze & eye catchlights (水光眼神拉丝), romantic twilight glow (暮光浪漫星芒).
- **Strictly Forbidden (Negative Spec)**:
  - NO high-saturation arcade neon (`#c8f52e` acid green, `#f414dc` magenta, `#6c16ff` electric violet).
  - NO pitch-black cyberpunk backgrounds (`#0d0a14`), industrial 45-degree mech chamfers, or black-orange construction hazard stripes.
  - NO gritty American-comic muscular soldiers, camouflage tactical vests, or black-and-green silhouette NPC placeholders.

## 2. Global Color & Typography Tokens
- **Canvas & Environment**:
  - Sub-screen Dawn Canvas: `linear-gradient(165deg, #EEF3FA 0%, #F7EFF6 52%, #EAE6F5 100%)`
  - Park Twilight Sky: `linear-gradient(180deg, #6E7EB5 0%, #B89CC8 48%, #F3C6CF 100%)`
- **Frosted Pearl Glass**:
  - Surface: `rgba(255, 255, 255, 0.76)` with `backdrop-filter: blur(18px) saturate(140%)`
  - Hairline Border: `1px solid rgba(224, 196, 152, 0.62)` (Champagne Gold)
  - Soft Shadow: `0 10px 30px rgba(92, 108, 156, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)`
- **Semantic Accents**:
  - Primary Action (Champagne Gold): `linear-gradient(135deg, #F6E4C6 0%, #D8B278 100%)` with `#3B2E1E` ink
  - Bond / Romance Action (Nebula Rose): `linear-gradient(135deg, #EDAABF 0%, #CA82A3 100%)` with `#FFFFFF` text
  - Mist Blue Tag: `#6F89B8` / `rgba(111, 137, 184, 0.14)`
- **Typography**:
  - Display / Character Names: Refined editorial serif (`"Noto Serif SC", "Songti SC", serif`), `letter-spacing: 0.06em`.
  - UI Body & Numerals: Clean modern sans-serif (`"PingFang SC", "Noto Sans SC", sans-serif`), `#2A2E42` primary ink, `#727994` muted ink.

## 3. Prompt Formula for Character Portraits
- **Positive Prefix**:
  `Masterpiece 3D-rendered semi-realistic otome game character portrait in the aesthetic of Love and Deepspace, 8-head tall graceful proportions, delicate subsurface scattering luminous skin, expressive eyes with soft catchlights, gentle warm rim light, haute-couture futuristic tailoring with fine fabric weave and champagne-silver metallic accents, waist-up to knees vertical portrait, no UI text, no frame.`
- **Character DNA Anchors**:
  - **Heroine (猎人女主)**: Wavy dark-tea high ponytail, amber eyes, tailored pearl-white & mist-blue futuristic hunter trench coat, silver waist corset belt.
  - **Hero Male Alt (清隽男主)**: Soft silver-black hair, clear slate-blue eyes, ivory & mist-blue academy hunter jacket.
  - **Jiguang (冀光 · L2-01)**: Radiant tousled blonde short hair, grey-blue aristocratic eyes with subtle enigmatic smile, ivory-white & champagne-gold embroidered high-collar sanctum robe.
  - **Ling (凌 · L2-02)**: Matte obsidian hooded trench cloak **with hood half-pushed back** revealing sharp brows, tousled dark hair with crimson-shadowed piercing eyes, roguish protective smirk, silver zipper & leather half-gloves.
  - **Ma Guangyao (麻光耀 · L2-03)**: Cool ink-black hair, rimless gold-wire glasses with delicate gold chain, crisp futuristic white lab coat worn open over mist-slate dress shirt & tie, holding a glowing holographic crystal prism.
  - **Lin Xiao (林鸮 · L2-04)**: Silky waist-length jet-black straight hair with silver bionic hairpin, fine gold-rimmed glasses, dove-grey turtleneck under pearl-white tailored coat, calm visionary big-sister aura.
  - **Gu Xuan (顾轩 · L2-05)**: Fluffy dark-chestnut hair, affectionate bright puppy-eyes, silver-ivory & mist-blue academy researcher long coat, gentle inviting hand gesture.
  - **Yinsha (银砂 · L2-06)**: Starlight crystal headband over soft black waves, shimmering liquid-silver mermaid gown, vintage starlight stand microphone, subtle holographic porcelain sheen.
  - **Story NPCs**: **Wu Man (吴谩)** earnest young academy cadet in silver-blue uniform; **Xiong Jie (熊杰)** haughty aristocratic officer captain in dark-navy & gold ceremonial uniform.

## 4. ComfyUI Scale-Out Workflow Convention (Phase 2+ Expansion)
- **Identity Lock**: `PuLID-Flux` / `InstantID` (weight `0.82`) anchored on each character's approved Phase 1 portrait in `assets/masters/otome/`.
- **Expression & Pose Sheet**: `ComfyUI_VNCCS` (`neutral`, `gentle_smile`, `blush`, `surprised`, `serious`).
- **Alpha Channel**: `LayerDiffuse` or `BiRefNet` high-res matting -> export `WebP` (`quality=88`).
- **Breathing Video**: `LivePortrait` 3.0s seamless loop (`512x896`, WebM VP9 alpha or MP4 lazy-loaded into `.char-stage`).
