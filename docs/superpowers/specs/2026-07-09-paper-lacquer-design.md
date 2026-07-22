# 第二回 · 纸与漆 Paper & Lacquer — Second Design Run

**Date:** 2026-07-09 · **Status:** approved by owner (chat) · Builds ON TOP of `2026-07-09-lacquer-world-design.md` (world, tablets, kintsugi, certificate, rail all stay).

> **Superseded in part — 2026-07-10:** References below to LXGW WenKai as "the 主理人's hand" (a named practitioner's personal handwriting voice) are replaced by the approved [brand-accountability design](../../plans/2026-07-10-brand-accountability-design.md). The typeface remains the annotation voice, but it represents institutional case-review commentary, not an individual's hand. Zhiji publishes no real name, personal photograph, or invented practitioner persona. The ground-rhythm and type-system decisions below remain current.

## Owner decisions
1. **Ground rhythm = lacquer ↔ paper alternation.** Dark where you feel (hero world, 是非, 三步, 价位, 边界/卷终), full-bleed rice-paper daylight where you read (判读+为什么, 关于, 保证书). Documents become the ground, not cards on dark.
2. **Type voice = 雕宋 + 手写注.** Headlines: Noto Serif SC Black (900) monuments. Annotations/human voice: LXGW WenKai 楷体 (the 主理人's hand). Fraunces Latin display, Newsreader body, Plex Mono data — unchanged.

## System
- **Paper acts** = `.act-paper` section scope that REMAPS the existing tokens (--ivory→ink #221c11, --ivory-soft→#4a4232, --gold→darker bronze #8a6a38 for AA, celadon→celadon-deep) over a full-bleed fiber-grained #f2ead8 ground — existing component CSS flips automatically. Cards inside paper acts lose their card chrome (`.act-paper .sample` → printed on the page; kintsugi crack runs on the page itself).
- **World behavior:** no code change — opaque paper grounds cover the fixed canvas; the world re-emerges at each dark act (contrast is the payoff).
- **Deckle seams:** irregular torn-paper edges (SVG mask, repeat-x) at paper-act boundaries + soft shadow — sheets laid on a lacquer table. The signature detail.
- **Monumental type:** section h2 → 雕宋 900 at clamp scale; ghost act numerals (卷二…) ~240px at ~6% ink behind paper-act content; one monument per act max. Hero 立轴 stays thin for now (explicit open question to owner: heavy cut instead?).
- **楷体 placements:** sample falsify note (主理人's hand on the page), 关于 sign line, later form helper text. Eyebrows stay mono (museum labels).
- **Layout:** paper-act heads sit off-center (asymmetric offsets); full 12-col recomposition reserved for F3.
- **Fonts delivery:** Noto Serif SC 900 via next/font/google (auto CJK slicing); LXGW WenKai via self-hosted webfont package (unicode-range sliced woff2). This also resolves the CJK self-hosting deploy blocker.

## Slices
F1 fonts+tokens → F2 paper acts (sample/confidence, about, guarantees) + seams + monuments → F3 dark-act type + 12-col recomposition + hero decision → F4 funnel full-paper → F5 gate (independent critic, matrix, build, CWV).

## Acceptance
Alternation reads as one crafted object (sheets on a lacquer table, not two websites); AA contrast both grounds; world moments hit harder by contrast; zero scam grammar; tsc/build/console clean; CWV green (font subsets must stay slim).
