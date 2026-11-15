---
name: otome-ui-motion
description: Design and engineering conventions for luxury female-oriented (otome/joseimuke) game UI components, frosted pearl glassmorphism, golden amusement-park ticket cards, layered portrait breathing animations, and starlight micro-interactions.
---
# Otome Luxury UI & Motion System (女性向轻奢 UI 与心动微交互规范)

## 1. Architectural Rules
1. **Text-Asset Decoupling**: Never bake UI buttons, stats, or Chinese labels into flat full-screen `.jpg` screenshots. Render backgrounds, character portraits (`.char-stage`), and frosted-glass UI cards as separate DOM layers while preserving `data-*` attributes for automated walkthrough tests.
2. **Frosted Pearl Glass Hierarchy**:
   - **Level 1 (Floating HUD Pills & Nav)**: `rgba(255, 255, 255, 0.82)`, `backdrop-filter: blur(16px)`, `1px solid rgba(226, 198, 156, 0.55)`, soft drop shadow `0 6px 20px rgba(88, 102, 148, 0.12)`.
   - **Level 2 (Info Cards & Modals)**: `rgba(255, 255, 255, 0.88)`, double hairline inset highlight `inset 0 1px 0 rgba(255,255,255,0.95)`, rounded `18px–22px` corners.
   - **Level 3 (Golden Park Ticket / Pass)**: Scalloped ticket-notch corners (`radial-gradient` mask or pseudo-elements), champagne-gold foil border (`#D8B278`), subtle dashed tear-line divider.

## 2. Portrait Stage & Micro-Motion (`.char-stage`)
- Wrap full-body character portraits in `NL.ui.charStage()` (`.char-stage`):
  - **Breathing Motion**: `animation: otomeBreathe 5.2s ease-in-out infinite` (`translateY(0) scale(1)` -> `translateY(-4.5px) scale(1.013)` with `transform-origin: 50% 90%`).
  - **Ambient Starlight Bokeh**: Overlay 6–10 lightweight CSS floating light motes (`.starlight-mote`) with staggered opacity & upward drift (`pointer-events: none`).
  - **Touch Heart / Voice Bubble Feedback**: Clicking `.char-stage` triggers an expanding heart ripple (`.heart-ripple`) and a transient character voice quote bubble (`.char-quote-bubble` positioned below shoulder level at `top: 420px` so it never covers the character's face/eyes).
  - **LivePortrait Video Slot**: Support optional `<video autoplay loop muted playsinline class="char-live">` inside `.char-stage` with seamless fallback to `<img class="char-art">`.

## 3. Motion Curves & Transitions
- Use gentle, poised easing: `cubic-bezier(0.22, 1, 0.36, 1)` (`260ms–380ms`) for panel entrances and dialogue portrait crossfades.
- Avoid harsh linear flashes, aggressive shakes, or neon outer glows.
