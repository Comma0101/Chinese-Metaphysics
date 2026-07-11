# 髹夜世界 · The Lacquer World — Design Spec

**Date:** 2026-07-09 · **Owner:** head of product design · **Status:** approved by owner (chat)
**Scope:** UI/UX only. No backend, payments, marketing copy, or SEO changes.

## Decision record

- **Carrier decision:** 材质世界 × 文书 — the site is carried by one continuous material world (Igloo Inc model, Awwwards SOTY 2024) plus letterpress-grade document artifacts (Chartogne-Taillet model). Chosen over image-carried (观夏 model) because it requires zero photography assets and builds on what exists (three.js luopan, rice-paper artifacts).
- **World depth decision:** persistent world + free scroll. A fixed full-viewport WebGL canvas behind the content; scroll position drives the world. **Never scroll-jacked** — buyers must skim, compare tiers, and reach checkout unimpeded.
- **Anti-scam mandate (standing):** material over glow. No emissive, no floating glyphs, no mystic ornament. Craft = trust.
- Reference evidence: see gap-review board (claude.ai/code/artifact/af45137a-2852-40e5-b65f-203aa4abb87b) and `.agents/design-language-lacquer-nocturne.json` for tokens.

## Architecture — two layers

### Layer 0 · 世界 (`components/LacquerWorld.tsx`)

Fixed, full-viewport, pointer-events-none WebGL canvas at z-index 0 (below `main` z-1, alongside the grain). Homepage only (mounted in `app/page.tsx`; unmounts on navigation). Replaces the hero-scoped `Armillary`.

- **Scene:** the existing matte-bronze luopan (rings, 24 ticks, eight trigram yao bars, celadon heart ring, matte cinnabar node), procedural warm env, one key light. Geometry/material code carried over from `Armillary.tsx`.
- **Scroll driver:** sections carry `data-act="0..6"`. Anchor = section vertical center (document coords). World state = piecewise-smoothstep interpolation between per-act keyframes, then exponentially lerped per frame (weighted, frame-rate independent). Window scroll only — Lenis animates native scroll, so `window.scrollY` is the single source of truth.
- **Keyframe channels:** camera position, look target, plate position, plate tilt (x/z), ring alignment (0–1), key-light intensity + position (azimuth sweep), tone-mapping exposure, heart-ring env intensity.
- **Acts:**
  | act | section | world state |
  |---|---|---|
  | 0 | 卷首 hero | luopan half-framed right, slow turn (current composition) |
  | 1 | 是/不是 | camera pulls back, luopan centers faint; celadon heart-ring glint |
  | 2 | 判读 sample | light falls to near-black; paper plates carry |
  | 3 | 三步 | ring groups rotate into register (align→1); key light sweeps across ticks = one material glint |
  | 4 | 关于/落款 | camera low and close; cinnabar node near |
  | 5 | 价位 | plate face-on, compass looks at the buyer |
  | 6 | 边界→卷终 | world recedes to a hairline arc |
- **Alignment mechanic:** disc split into 3 subgroups (rim+ticks / trigram band / heart+node) sharing one spin angle plus per-group scatter offsets scaled by `(1 − align)`; spin damps as align→1 (the instrument "locks").
- **Perf budget:** one WebGL context; DPR ≤ 1.5 (≤ 1.25 under 768px); three.js stays dynamically imported; canvas CSS opacity ≈ 0.55; pause on `document.hidden`; full dispose on unmount; WebGL failure = silent fallback to body gradient.
- **Reduced motion:** no RAF loop — snap to act state on (throttled) scroll and render single frames.

### Layer 1 · 文书 (document craft system)

- **卷 index rail:** fixed left-edge hairline spine (desktop ≥1200px), mono 10px, 卷首…卷终 with active state — the Chartogne parcel-index grammar.
- **Type-as-material:** ink-wear on display headings only (SVG feTurbulence + displacement filter, CJK-safe, perf-tested with plain fallback).
- **Paper plates:** shared `.plate` treatment — layered grain, deckle edge, letterpress-pressed headings — used by chart, sample reading, guarantees, and all funnel documents.
- **Kintsugi moment:** the sample plate's falsify note becomes a crack mended in gold (SVG path, stroke drawn on scroll) — "if the reading is wrong, the repair is visible."
- **Pricing = 剔红 plaques:** three carved-lacquer tablets replace SaaS cards; featured tier takes a one-time seal-press stamp on entering viewport.
- **落款 colophon:** named-human seal in 关于 (accountability a scam hides).
- **Copy discipline (观夏 rule):** section headlines ≤ 12 chars zh; long reassurance copy folds into styled expandable 附注 — conversion content survives without walling.

### Funnel (`/ask` `/free` `/success` `/cancel`)

World does not follow. Each page = one centered ceremonial document on lacquer: 委托书 (commission form) → 回执 (receipt) → 受理凭证 (acceptance certificate, sealed) → quiet cancel note.

## Build slices (each verified on :3111 before the next)

- **A. World engine** — LacquerWorld + acts 0–6 wired to homepage anchors; Armillary retired. ← current
- **B. Document craft system** — plates, ink-wear, 卷 rail, kintsugi sample.
- **C. Pricing plaques + seal press + 落款.**
- **D. Funnel ceremony.**
- **E. Gate** — mobile 390px, perf (CWV green, 60fps @ DPR 1.5), a11y AA, zh/en QA matrix, console clean.

## Acceptance

1. Igloo test: the homepage reads as one continuous material world, not decorated sections.
2. Chartogne squint test: documents feel printed/pressed, not CSS-styled.
3. No scroll-jack anywhere; `tsc` + `next build` clean; zero console errors; reduced-motion fully honored.
4. Zero scam grammar: no glow, no floating glyphs, nothing self-lit.

## Risks

- SVG displacement filters on large CJK headings may be slow → test first, plain fallback.
- Full-viewport render cost on weak GPUs → DPR clamp + static-frame mobile fallback.
- Noto Serif CJK SC is a system-font dependency → self-host subset via next/font/local before deploy (carried over).
