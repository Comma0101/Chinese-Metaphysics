# 髹夜 · Cinematic Cut — Homepage Showcase Design

**Date:** 2026-07-22 · **Owner:** Claude/Fable (UI lane) · **Status:** proposed — awaiting founder review
**Builds on:** [`2026-07-09-lacquer-world-design.md`](2026-07-09-lacquer-world-design.md) and [`2026-07-09-paper-lacquer-design.md`](2026-07-09-paper-lacquer-design.md). The world, tablets, kintsugi, certificate, and rail all stay. This is the next chapter: turning the *restrained* cut of the Lacquer World into a *cinematic* one.
**Scope:** UI/UX only. No backend, payments, marketing copy, contracts, or SEO-content changes. Copy strings in `lib/content.ts` are untouched, so `tests/copy-integrity.test.ts` stays green.

---

## Decision record

- **Founder direction (2026-07-22):** pursue the "showcase" aesthetic (spectacle, cinematic motion), chosen with the trust trade-off explicitly on the record.
- **Guardrail (non-negotiable, carried from the 2026-07-09 anti-scam mandate):** every bit of spectacle must be *material* — metal catching a moving light, ink bleeding, paper tearing, gold pouring. **No emissive, no neon, no floating glyphs, no mystic ornament.** This is the one lane where "showcase wow" and "US$388 trust" do not fight: the wow comes from craft, which is also what trust requires here.
- **Approach:** amplify the existing camera rig; do **not** rebuild. `LacquerWorld.tsx` already carries a real `THREE.PerspectiveCamera`, a real luopan mesh, a 7-waypoint scroll-keyed journey (`KEYS[0..6]`), an ignition mechanic (`align: 0→1`), damped follow, and reduced-motion + no-WebGL fallbacks. `MotionProvider.tsx` already has Lenis heavy scroll, the kintsugi seam draw-in, the seal press, and staggered reveals.
- **Reference bar:** the "scroll sequences a pinned 3D scene" class (Sébastien Lempens, Cartier) — one continuous instrument the scroll travels through, cross-dissolves via ScrollTrigger. Architecturally this is what the site already is.
- **Build sequencing (founder, 2026-07-22):** **vertical slice first.** Bring one contiguous stretch to full cinematic fidelity, review live, lock the bar, then propagate. This spec covers the slice only.

## What exists today (grounding)

- `components/LacquerWorld.tsx`: fixed full-viewport WebGL canvas behind the page. `KEYS` = one keyframe per `[data-act]` section (cam position, look target, plate position, tilt, ring `align`, key-light intensity/position, exposure, celadon-heart intensity). `targetKey()` interpolates between the two keys bracketing the scroll position with a `smooth()` ease; a frame-rate-independent damped follow (`k = 1 - Math.exp(-dt*3.4)`) chases it. Per-register `scatter` + `spin` that locks as `align→1`; idle `breathe`. Reduced-motion settles to the act under the reader; WebGL failure falls back to the CSS lacquer gradient.
- `components/MotionProvider.tsx`: Lenis (`lerp: 0.085`), GSAP/ScrollTrigger. Hero unroll stagger, kintsugi `.kintsugi-path` stroke draw, `.tier-seal` press, section fade-ups. Fully gated on reduced-motion.
- `app/globals.css`: 469 custom properties; `.act-paper` token remap + `.seam-t`/`.seam-b` deckle edges (currently static).

## The vertical slice (this build)

The opening screenful and the first ground change — the tightest stretch that exercises **all** the new techniques at once:

**Beat 0 — Hero (act 0), on load.**
1. **Brush-write monument.** The headline (`一件难下的决定，先看清它的结构。` / `A hard decision, seen in its structure.`) reveals as brush ink laying down, not a fade.
2. **Cinematic entrance.** The luopan resolves with a slow camera push-and-settle, and a **mini-ignition**: a gentle version of the `align 0→1` "set" with a single raking light-glint sweeping the 24 ticks as the hero lands. (The full ignition set-piece stays at 三步, in propagation.)

**Beat 1 — Hero → 是/不是 (act 0 → act 1) travel.** Amplify the existing pull-back-to-center move with a scroll-scrubbed dip so the instrument is always in motion, never a straight lerp.

**Beat 2 — First lacquer → paper tear (act 1 → act 2, the sample section).** The static deckle seam becomes an actual **paper tear/unfurl**: as the rice-paper section scrolls up over the fixed world, its torn top edge tears across (animated clip-path/mask) and the sheet settles with a fiber shadow.

### Technique detail

**Brush-write headline — masked ink-bleed (chosen).**
- Reveal each character via an animated mask (SVG/CSS `mask-image`) with a rough ink edge, ~60–90 ms per-character stagger, slight blur-to-sharp settle, so it reads as a brush wetting the paper.
- **Rejected:** true per-stroke-order SVG stroke-dash animation — requires per-glyph stroke path data, fragile for arbitrary CJK. Not worth the robustness cost.
- **Fallback (reduced-motion / no mask support):** the existing instant/stagger-up reveal.
- **LCP guard (Core Web Vitals):** the headline text stays in the DOM for SEO/LCP; only its *paint* is masked. The reveal must be paint-only (no `opacity:0` start that defers LCP) and complete fast (< ~1.2 s). Verify LCP does not regress against the current build.

**Cinematic entrance + mini-ignition (in `LacquerWorld.tsx`).**
- Add an on-load intro tween (independent of scroll) that eases the camera from a slightly wider/softer framing into `KEYS[0]`, running the `align` from ~0.15 → the hero's resting value once, with a one-shot light-sweep (`keyLight` azimuth glide) across the ticks.
- Add support for **scrubbed sub-beats** between act keys (allow >1 keyframe between section centers) so Beat 1's travel articulates (dip-and-rise) instead of interpolating in a straight line. Keep the existing damped-follow architecture.

**Paper tear (in `MotionProvider.tsx` + `globals.css`).**
- ScrollTrigger scrubbed to act 2 entering: animate the `.seam-t` deckle edge's clip-path/mask across, plus a subtle paper-fiber drop shadow settling. Reduced-motion: paper simply present (current behavior).

**Depth cue (cheap, no post-processing in the slice).**
- A CSS radial vignette over the canvas + the camera's real perspective carry the "cinema" depth. **Real depth-of-field (EffectComposer/BokehPass) is explicitly out of scope for the slice** — it adds bundle + GPU cost; revisit only if the bar demands it, gated on the perf budget.

## Where the code goes (all UI lane — no ownership collision)

- `components/LacquerWorld.tsx` — intro tween, mini-ignition light-sweep, scrubbed sub-beat support.
- `components/MotionProvider.tsx` — brush-write reveal, paper-tear trigger.
- `app/globals.css` — ink mask, vignette, tear clip-path, new keyframes.
- `app/page.tsx` — only if the hero headline needs a wrapper/`data-` hook for the mask (minimal).
- Possibly one small `components/InkReveal.tsx` if it keeps the mask logic clean.
- **Untouched:** `app/api/**`, `lib/server/**`, `lib/contracts/**`, `lib/content.ts`.

## Performance budget

- 60 fps target on a mid-2020s laptop; no hero jank. Keep the existing DPR caps (1.25 mobile / 1.5 desktop) and pause-on-hidden.
- **No new heavy dependencies:** brush-write and tear are CSS/SVG/GSAP only. (DoF post-processing, if ever, is the only thing that would add `three` example modules — deferred.)
- `npm run build` bundle sizes must not balloon; check the route JS for `/` after the change.

## Accessibility & fallbacks (must all survive)

- `prefers-reduced-motion`: no camera motion, no brush animation, no tear — instant/settled states (current contract).
- No WebGL: CSS lacquer gradient carries; DOM craft-motion still degrades to instant.
- Mobile (390): brush-write and tear must hold; watch WebGL cost.

## Definition of done (slice)

- Renders zh + en, desktop + mobile 390, reduced-motion, and no-WebGL — all intact.
- Brush-write reads as ink, completes < ~1.2 s, **no CLS, LCP not regressed** vs. current build.
- Hero entrance + first paper-tear read as cinematic against the reference bar (founder live review + headless screenshots).
- `npm run typecheck` = 0, `npm run build` = 0, `npm test` unchanged (179 / 165 pass / 14 skipped), copy-integrity 8/8.
- **Founder sign-off on the bar before any propagation.**

## Out of scope (until the slice is approved)

- Acts 2→6 camera amplification; the full 三步 ignition set-piece; the 天池 descent; the face-on pricing lock.
- Every other page (they later inherit only the calm craft-motion — brush-write headings, better transitions — never the full camera rig).
- Real depth-of-field post-processing.

## Risks

| Risk | Mitigation |
|---|---|
| Headline reveal regresses LCP | Paint-only mask, fast completion, verify LCP against current build; fall back to instant if needed |
| Richer camera + vignette costs frames | Keep DPR caps + pause-on-hidden; measure fps; DoF stays deferred |
| Brush-write fidelity is subjective | It's the whole point of the slice — live founder review is the gate before propagation |
| Mobile WebGL cost | Test on 390 with throttling; brush-write/tear are cheap CSS/SVG |
| Spectacle drifts toward "scam" glow | Material-only guardrail enforced in review; no emissive/neon/floating glyphs |
