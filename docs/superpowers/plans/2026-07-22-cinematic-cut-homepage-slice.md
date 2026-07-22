# Cinematic Cut — Homepage Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the opening screenful + first ground change of the Zhiji homepage to full "cinematic showcase" fidelity — a brush-writing hero monument, a cinematic luopan entrance with a mini-ignition, an amplified scrubbed camera travel, and a real lacquer→paper tear — as the vertical slice that locks the fidelity bar before propagation.

**Architecture:** Amplify, don't rebuild. `components/LacquerWorld.tsx` already owns a real `THREE.PerspectiveCamera` + 7-waypoint scroll journey + `align 0→1` ignition + damped follow; `components/MotionProvider.tsx` already owns Lenis + GSAP reveals. This slice extends both, adds one small `components/InkReveal.tsx`, and adds masks/keyframes to `app/globals.css`. Spectacle stays in the material vocabulary (metal/ink/paper/gold; no emissive/glow).

**Tech Stack:** Next 14.2 (App Router), React 18.3, three 0.160, gsap 3.15 + ScrollTrigger, lenis 1.3, TypeScript. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-22-cinematic-showcase-homepage-design.md`

## Global Constraints

- **No new dependencies.** Brush-write, tear, vignette = CSS/SVG/GSAP/three only (all already installed).
- **UI lane only.** Touch only: `app/page.tsx`, `app/globals.css`, `components/*.tsx`, `tests/*.test.ts`. Never touch `app/api/**`, `lib/server/**`, `lib/contracts/**`, `lib/content.ts` (copy strings unchanged → `tests/copy-integrity.test.ts` stays green).
- **Reduced-motion is mandatory:** `prefers-reduced-motion: reduce` → no camera intro, no brush animation, no tear; instant/settled states. Both `LacquerWorld` and `MotionProvider` already branch on this — preserve it.
- **No-WebGL fallback intact:** the CSS lacquer gradient carries; DOM craft-motion degrades to instant.
- **LCP not regressed:** the hero headline text stays in the DOM and is painted; only its *mask* animates (never `opacity:0`→1 on the headline). Reveal completes < ~1.2 s.
- **Keep the perf guards:** DPR caps (1.25 mobile / 1.5 desktop), pause-on-`document.hidden`.
- **Green gates every task:** `npm run typecheck` = 0, `npm run build` = 0, `npm test` = 179 total / 165 pass / 14 skipped, copy-integrity 8/8.

## Testing approach (read before Task 1)

This is visual-motion work; the project has no React-render tests. Per task:
- **Structural assertions** (project idiom: `node --test` over source text, like `tests/lacquer-world.test.ts`) only where they catch a real regression — e.g. "reduced-motion guard still present", "no new import added", "the reveal hook exists". These go in a new `tests/motion-slice.test.ts`.
- **Visual verification** via the headless screenshot rig (below) — capture and *actually inspect* the PNGs each task. This is the real gate for "does it look right."
- **Regression net:** the full existing suite + typecheck + build stay green.
- Do **not** invent unit tests asserting subjective visual outcomes.

**Screenshot rig** (dev server on `localhost:3111` must be running: `npx next dev -p 3111`). Reuse `scratchpad/shoot.mjs` pattern:
```
node <<'EOF'
import pkg from "/usr/lib/code/node_modules/playwright-core/index.js";
const { chromium } = pkg;
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome-stable", headless: true,
  args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto("http://localhost:3111/?lang=zh", { waitUntil: "networkidle" });
await new Promise(r=>setTimeout(r,3500));   // world + GSAP settle
await p.screenshot({ path: "/tmp/shot.png" });
await b.close();
EOF
```
For reduced-motion shots add `{ reducedMotion: "reduce" }` to `newPage`. For no-WebGL, launch with `--disable-gpu --disable-webgl`.

## File structure

- `components/InkReveal.tsx` *(new)* — splits headline text into per-character `.ink-char` spans (preserving zh clause `<br/>`s), each carrying the ink mask. Text stays in DOM, selectable, painted. One responsibility: markup for the brush reveal.
- `components/LacquerWorld.tsx` *(modify)* — add: on-load intro tween + mini-ignition light-sweep (Task 2); sub-beat keyframe support (Task 3).
- `components/MotionProvider.tsx` *(modify)* — add: brush-write stagger driver (Task 1); paper-tear scrubbed trigger (Task 4); exclude the headline from the existing `.hero-inner > *` fade so it doesn't double-animate (Task 1).
- `app/page.tsx` *(modify)* — wrap the hero `<h1>` content in `<InkReveal>` (Task 1).
- `app/globals.css` *(modify)* — ink mask + `--ink` var (Task 1); sub-beat has no CSS; tear clip-path + fiber shadow (Task 4); canvas vignette (Task 5).
- `tests/motion-slice.test.ts` *(new)* — structural assertions across tasks.

---

### Task 1: Brush-write hero monument (InkReveal)

**Files:**
- Create: `components/InkReveal.tsx`
- Modify: `app/page.tsx` (hero `<h1>`, ~lines 65-67)
- Modify: `app/globals.css` (add `.ink-char` mask + `--ink`)
- Modify: `components/MotionProvider.tsx` (stagger driver; exclude headline from `.hero-inner > *`)
- Test: `tests/motion-slice.test.ts` (new)

**Interfaces:**
- Produces: `<InkReveal text={string} className={string} />` rendering the text as `.ink-char` spans (zh clause breaks preserved via `，`+`<br/>`). Each char span uses CSS var `--ink` (0 = un-inked, 1 = fully inked) read by the mask. MotionProvider animates `.hero-title .ink-char` `--ink` 0→1 staggered.
- Consumes: nothing.

- [ ] **Step 1: Branch.**
```bash
git checkout -b feat/cinematic-cut-slice
```

- [ ] **Step 2: Write `components/InkReveal.tsx`.**
```tsx
"use client";
// Splits a headline into per-character spans for the brush-ink reveal.
// Text stays in the DOM (selectable, painted for LCP); only the mask animates.
// zh long lines break at "，" into a verse stack, matching the existing hero.
export function InkReveal({ text, className }: { text: string; className?: string }) {
  const clauses = text.split("，");
  return (
    <span className={className} data-ink-reveal>
      {clauses.map((clause, ci) => (
        <span className="ink-clause" key={ci}>
          {Array.from(clause).map((ch, i) => (
            <span className="ink-char" key={i} style={{ ["--ink" as string]: 0 }}>
              {ch}
            </span>
          ))}
          {ci < clauses.length - 1 && (
            <>
              <span className="ink-char" style={{ ["--ink" as string]: 0 }}>，</span>
              <br />
            </>
          )}
        </span>
      ))}
    </span>
  );
}
```

- [ ] **Step 3: Wire it into the hero in `app/page.tsx`.** Replace the h1 body (currently `{lang === "zh" ? clauseBreak(c.h1) : c.h1}`) so the monument uses InkReveal. Keep `clauseBreak` import if still used elsewhere (it is — s3h). New h1:
```tsx
<h1 className={`hero-title${lang === "zh" ? " hero-title-zh" : ""}`} data-hero-title>
  <InkReveal text={c.h1} />
</h1>
```
Add `import { InkReveal } from "@/components/InkReveal";` at the top. (InkReveal's `split("，")` handles both langs — en has no `，`, so it renders one clause of char spans.)

- [ ] **Step 4: Add the mask in `app/globals.css`.** The mask inks each glyph from bottom-up with an irregular edge; `--ink` drives it. Paint-only (no opacity), so LCP still counts the text.
```css
.ink-char {
  display: inline-block;
  /* soft irregular ink edge sweeping upward as --ink goes 0→1 */
  -webkit-mask-image: linear-gradient(to top, #000 0%, #000 calc(var(--ink, 1) * 100%), transparent calc(var(--ink, 1) * 100% + 8%));
          mask-image: linear-gradient(to top, #000 0%, #000 calc(var(--ink, 1) * 100%), transparent calc(var(--ink, 1) * 100% + 8%));
  will-change: mask-image;
}
@media (prefers-reduced-motion: reduce) {
  .ink-char { -webkit-mask-image: none; mask-image: none; }
}
```
(Default `--ink:1` means: with JS off / SSR / reduced-motion, the text is fully visible. The `style={{--ink:0}}` inline sets the pre-animation state only when the client renders it; MotionProvider drives it to 1. If JS never runs, the inline 0 would hide it — so set the inline default to leave it visible pre-animation and let MotionProvider set 0 then animate. **Correction:** in Step 2 use no inline `--ink` (inherit CSS default 1); MotionProvider sets `--ink:0` at t0 then animates to 1, so no-JS keeps text visible. Update Step 2 spans to omit the `style` prop.)

- [ ] **Step 5: Drive the stagger in `components/MotionProvider.tsx`.** Inside the `gsap.context(() => { ... })`, (a) change the existing hero fade selector from `.hero-inner > *` to exclude the title, e.g. animate `.hero-inner .eyebrow, .hero-inner .hero-aside` instead of `.hero-inner > *`; (b) add the ink driver:
```ts
// brush-write the monument: ink each glyph bottom-up, left to right
const inkChars = gsap.utils.toArray<HTMLElement>(".hero-title .ink-char");
if (inkChars.length) {
  gsap.set(inkChars, { "--ink": 0 });
  gsap.to(inkChars, {
    "--ink": 1,
    duration: 0.5,
    ease: "power2.out",
    stagger: 0.055,   // ~1.1s total for the zh monument; tune live
    delay: 0.15,
  });
}
```
(Reduced-motion path already `return`s before this block runs — chars stay at CSS default `--ink:1`, fully visible.)

- [ ] **Step 6: Structural test — `tests/motion-slice.test.ts`.**
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("hero monument uses InkReveal", () => {
  const page = read("app/page.tsx");
  assert.match(page, /<InkReveal text=\{c\.h1\}/);
  assert.match(page, /import \{ InkReveal \}/);
});
test("ink reveal is paint-only and reduced-motion safe", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.ink-char\s*\{[^}]*mask-image/s);
  assert.match(css, /prefers-reduced-motion: reduce[^}]*\{[^}]*\.ink-char/s);
  assert.doesNotMatch(read("components/InkReveal.tsx"), /opacity/);
});
test("MotionProvider drives --ink and no longer blanket-fades the title", () => {
  const mp = read("components/MotionProvider.tsx");
  assert.match(mp, /--ink/);
  assert.doesNotMatch(mp, /\.hero-inner > \*/);
});
```

- [ ] **Step 7: Run tests + typecheck + build.**
Run: `npm test 2>&1 | tail -6` → 182 total (179 + 3 new) / 168 pass / 14 skipped, 0 fail.
Run: `npm run typecheck` → exit 0.
Run: `npm run build` → exit 0; note `/` route JS size (baseline ~5.45 kB) hasn't ballooned.

- [ ] **Step 8: Screenshot verify.** With dev server up, capture zh hero at ~400ms (mid-ink) and ~2s (settled), en hero, and a `reducedMotion:"reduce"` zh hero (must be fully legible, no animation). Inspect: glyphs ink bottom-up left-to-right; reduced-motion is instantly full; no clipping/CLS.

- [ ] **Step 9: Commit.**
```bash
git add components/InkReveal.tsx app/page.tsx app/globals.css components/MotionProvider.tsx tests/motion-slice.test.ts
git commit -m "feat(ui): brush-write the hero monument (ink-bleed reveal)"
```

---

### Task 2: Cinematic entrance + mini-ignition

**Files:**
- Modify: `components/LacquerWorld.tsx` (intro tween inside the non-reduced-motion branch, ~lines 428-453)
- Modify: `tests/motion-slice.test.ts`

**Interfaces:**
- Consumes: existing `state`, `targetKey()`, `apply()`, `KEYS[0]`, `keyLight`, `disc`/`gTicks` groups.
- Produces: a one-shot intro that runs before the scroll-damped follow takes over. No new exports.

- [ ] **Step 1: Add an intro tween in the animated (non-reduce) branch of `LacquerWorld.tsx`.** Before `start()`, seed the state wider/softer than `KEYS[0]` and ease in over ~1.6 s while sweeping the key light once and settling `align` from 0.15 to `KEYS[0]`'s look. Implement as a normalized `introT` 0→1 blended into `apply` for the first ~1.6 s, then hand fully to the damped follow:
```ts
let introStart = clock.getElapsedTime();
const INTRO = 1.6; // seconds; tune live
const introFrom = { camZ: KEYS[0].cam[2] + 2.4, exp: KEYS[0].exp * 0.7, align: 0.15, keyAz: 7 };
```
In `frame()`, after computing `state = lerpKey(state, targetKey(), k)`, if `clock.getElapsedTime() - introStart < INTRO`, compute `p = smooth((clock.getElapsedTime()-introStart)/INTRO)` and override for the intro: pull camera z from `introFrom.camZ`→`state.cam[2]`, exposure from `introFrom.exp`→`state.exp`, and drive a one-shot light azimuth sweep `keyLight.position.x` from `+introFrom.keyAz`→`state.keyPos[0]` (the glint crossing the ticks). Keep everything else as `state`. This runs once on load and never again.

- [ ] **Step 2: Confirm reduced-motion is untouched.** The intro lives only in the animated branch; the `if (reduce)` branch still calls `apply(state, 5.5, 0)` with no intro. No change there.

- [ ] **Step 3: Structural test.**
```ts
test("LacquerWorld has a one-shot intro only in the animated branch", () => {
  const lw = read("components/LacquerWorld.tsx");
  assert.match(lw, /INTRO/);
  // reduced-motion branch still settles without an intro
  assert.match(lw, /if \(reduce\)/);
});
```

- [ ] **Step 4: typecheck + build + suite green** (as Task 1 Step 7; test count now 183/169/14... adjust to actual).

- [ ] **Step 5: Screenshot verify.** Capture the zh hero at ~150 ms, ~800 ms, ~2.5 s (three frames of the entrance): the compass should ease in from a softer/wider frame with a single light-glint crossing the ticks, then rest exactly at the current KEYS[0] composition. Reduced-motion: lands settled, no intro. no-WebGL: gradient only. Inspect for jank.

- [ ] **Step 6: Commit.**
```bash
git add components/LacquerWorld.tsx tests/motion-slice.test.ts
git commit -m "feat(ui): cinematic luopan entrance + mini-ignition light sweep"
```

---

### Task 3: Scrubbed sub-beat travel (hero → 是/不是)

**Files:**
- Modify: `components/LacquerWorld.tsx` (`KEYS`, `measure()`, `targetKey()` ~lines 32-48, 344-371)
- Modify: `tests/motion-slice.test.ts`

**Interfaces:**
- Consumes: the `[data-act]` anchors, `lerpKey`, `smooth`.
- Produces: support for an optional mid-beat between act 0 and act 1 so the travel dips-and-rises instead of straight-lerping. No new exports; `KEYS` gains one entry addressed by a fractional anchor.

- [ ] **Step 1: Generalize anchors to allow a sub-beat.** Add a parallel `SUBKEYS` mechanism: between act 0 and act 1, insert one keyframe positioned at fraction `f=0.5` of the act0→act1 scroll span, framing a slightly lower/closer "dip" (e.g. `cam:[0,0.15,10.8], look:[0,0,0], plate` interpolated, `align:0`). In `targetKey()`, when the scroll sits in the `[anchor0, anchor1]` span, interpolate `KEYS[0]→SUBKEY→KEYS[1]` (two-segment) with `smooth` on each half, instead of a single lerp. Keep all other spans single-segment.
```ts
// mid-beat for the opening travel — a cinematic dip before the pull-back
const SUB01 = { ...lerpKey(KEYS[0], KEYS[1], 0.5), cam: [0, 0.15, 10.8] as Vec3 };
```

- [ ] **Step 2:** Keep the damped follow (`k = 1 - Math.exp(-dt*3.4)`) and reduced-motion settle untouched (they consume `targetKey()`'s output regardless of segmentation).

- [ ] **Step 3: Structural test.**
```ts
test("opening travel has a sub-beat between act 0 and act 1", () => {
  const lw = read("components/LacquerWorld.tsx");
  assert.match(lw, /SUB01/);
});
```

- [ ] **Step 4: typecheck + build + suite green.**

- [ ] **Step 5: Screenshot verify.** Script a scroll to 8%, 12%, 16% of page height (between hero and act 1) and shoot each: the camera should dip-and-rise, never a flat glide. Reduced-motion: still settles per act. Inspect.

- [ ] **Step 6: Commit.**
```bash
git add components/LacquerWorld.tsx tests/motion-slice.test.ts
git commit -m "feat(ui): scrubbed sub-beat for the opening camera travel"
```

---

### Task 4: Lacquer → paper tear (act 1 → sample)

**Files:**
- Modify: `components/MotionProvider.tsx` (scrubbed trigger on the first `.act-paper.seam-t`)
- Modify: `app/globals.css` (tear clip-path + fiber shadow)
- Test: `tests/motion-slice.test.ts`

**Interfaces:**
- Consumes: existing `.act-paper.seam-t` section (the sample act, `data-act="2"`), Lenis+ScrollTrigger already wired.
- Produces: a scrubbed reveal of the paper's torn top edge as it enters. Reduced-motion → present (no scrub).

- [ ] **Step 1: Add tear state in `app/globals.css`.** Drive the deckle edge with a `--tear` var (0 = not yet torn, 1 = fully unfurled) via `clip-path` on the paper section's top mask + a settling fiber shadow. Give the first paper act a class hook (add `.act-tear` to the sample section in `app/page.tsx` if a scoped hook is cleaner than `:first-of-type`).
```css
.act-tear { --tear: 1; }               /* default fully present (no-JS / reduced-motion) */
.act-tear .wrap { will-change: clip-path; }
@media (prefers-reduced-motion: no-preference) {
  .act-tear { clip-path: inset(calc((1 - var(--tear)) * 22%) 0 0 0); }
}
```

- [ ] **Step 2: Scrub it in `components/MotionProvider.tsx`.** Inside the context:
```ts
const tear = document.querySelector<HTMLElement>(".act-tear");
if (tear) {
  gsap.set(tear, { "--tear": 0 });
  gsap.to(tear, {
    "--tear": 1, ease: "none",
    scrollTrigger: { trigger: tear, start: "top 92%", end: "top 55%", scrub: 0.6 },
  });
}
```

- [ ] **Step 3:** Add the `act-tear` class to the sample section wrapper in `app/page.tsx` (the `<section className="section act-paper seam-t" data-act="2">` → add `act-tear`).

- [ ] **Step 4: Structural test.**
```ts
test("first paper section tears in and is reduced-motion safe", () => {
  assert.match(read("app/page.tsx"), /act-paper seam-t act-tear|act-tear/);
  const css = read("app/globals.css");
  assert.match(css, /--tear/);
  assert.match(css, /prefers-reduced-motion: no-preference[^}]*--tear/s);
  assert.match(read("components/MotionProvider.tsx"), /--tear/);
});
```

- [ ] **Step 5: typecheck + build + suite green.**

- [ ] **Step 6: Screenshot verify.** Scroll across the act1→act2 boundary (e.g. 28%, 32%, 36%) and shoot: the rice-paper should tear/unfurl into place rather than hard-cut. Reduced-motion: paper simply present, fully readable. Inspect no content clipping at rest (`--tear:1` must equal today's layout).

- [ ] **Step 7: Commit.**
```bash
git add components/MotionProvider.tsx app/globals.css app/page.tsx tests/motion-slice.test.ts
git commit -m "feat(ui): lacquer-to-paper tear on the first ground change"
```

---

### Task 5: Vignette depth cue

**Files:**
- Modify: `app/globals.css` (vignette over `.world-canvas`)

**Interfaces:** none — pure CSS overlay on the existing fixed canvas.

- [ ] **Step 1: Add a radial vignette** so the cinematic framing reads with depth (cheap; no post-processing). Apply to a `::after` on the canvas wrapper or a sibling, non-interactive, behind content:
```css
.world-canvas::after {
  content: ""; position: fixed; inset: 0; pointer-events: none;
  background: radial-gradient(120% 90% at 62% 42%, transparent 46%, rgba(0,0,0,0.34) 100%);
  z-index: 0;
}
```
(Confirm `.world-canvas` stacking: it must stay behind `main`. If `::after` on a `position:fixed` element doesn't compose as needed, add the gradient to the existing canvas container instead. Verify content remains above it.)

- [ ] **Step 2: typecheck + build + suite green.**

- [ ] **Step 3: Screenshot verify.** zh hero + a paper section: edges should fall off softly toward black on the dark acts without muddying the paper acts or reducing text contrast (WCAG). If it dims paper text, scope the vignette to non-`.act-paper` viewport regions or reduce alpha. Inspect.

- [ ] **Step 4: Commit.**
```bash
git add app/globals.css
git commit -m "feat(ui): cinematic vignette depth cue on the world canvas"
```

---

### Task 6: Full-matrix hardening + definition-of-done gate

**Files:** touch-ups only across the above as issues surface.

- [ ] **Step 1: Full render matrix.** Screenshot and inspect: zh + en; desktop 1440 + mobile 390; `reducedMotion:"reduce"`; no-WebGL launch. All must render, be legible, and keep fallbacks. Capture the final slice set into `scratchpad/slice-*.png` for founder review.

- [ ] **Step 2: LCP / CLS check.** In headless Chrome, measure LCP for `/` before (main) vs after (branch) — the hero headline must remain the LCP element and not regress (the mask is paint-only). Confirm no layout shift from InkReveal (the spans occupy the same box as the text). If LCP regresses, reduce the ink stagger/delay or start the reveal post-LCP.
```
# quick LCP probe
node <<'EOF'
import pkg from "/usr/lib/code/node_modules/playwright-core/index.js"; const {chromium}=pkg;
const b=await chromium.launch({executablePath:"/usr/bin/google-chrome-stable",headless:true,args:["--no-sandbox"]});
const p=await b.newPage(); await p.goto("http://localhost:3111/?lang=zh",{waitUntil:"load"});
const lcp=await p.evaluate(()=>new Promise(r=>{new PerformanceObserver(l=>{const e=l.getEntries().at(-1);r(e&&e.startTime);}).observe({type:"largest-contentful-paint",buffered:true});setTimeout(()=>r(-1),4000);}));
console.log("LCP(ms)=",lcp); await b.close();
EOF
```

- [ ] **Step 2b: Perf sanity.** Confirm the frame loop holds ~60fps on desktop (no long-task pileup); DPR caps + pause-on-hidden still in place. Note `/` route JS size from `npm run build` — must not balloon vs. the ~5.45 kB baseline.

- [ ] **Step 3: Green gate.** `npm run typecheck` = 0; `npm run build` = 0; `npm test` = 179 originals + new structural tests, 0 fail, 14 skipped; copy-integrity 8/8 (unchanged copy).

- [ ] **Step 4: Commit any touch-ups.**
```bash
git add -A && git commit -m "chore(ui): harden cinematic slice across the render matrix"
```

- [ ] **Step 5: Founder live-review handoff.** Present the slice for the bar sign-off (localhost:3111 and/or a Vercel branch preview + the `scratchpad/slice-*.png` set). **Do not propagate to acts 2→6 / other pages until the founder signs off on the fidelity bar** (per spec "Definition of done").

---

## Self-Review

**Spec coverage:** Beat 0 brush-write → Task 1 ✓. Beat 0 entrance + mini-ignition → Task 2 ✓. Beat 1 scrubbed travel → Task 3 ✓. Beat 2 paper tear → Task 4 ✓. Vignette depth cue → Task 5 ✓. LCP guard, reduced-motion, no-WebGL, mobile, perf budget, green gates, founder sign-off → Task 6 ✓. Out-of-scope items (acts 2-6 camera, full ignition, 天池 descent, face-on lock, other pages, real DoF) are explicitly deferred and not in any task ✓.

**Placeholder scan:** Numeric camera/timing values are given as concrete runnable defaults derived from the existing `KEYS`, marked "tune live" where aesthetic — the *mechanism* is fully specified in every step (not hand-waving). No "TBD/add-error-handling" placeholders.

**Type consistency:** `--ink` (Task 1) and `--tear` (Task 4) CSS vars are set in MotionProvider and read in globals.css consistently. `InkReveal` prop shape (`text`, `className`) matches its call site. `SUB01`/`INTRO` are local to LacquerWorld. `.ink-char`, `.act-tear`, `.world-canvas` selectors match between CSS, components, and tests.

**Note on Task 1 Step 4 correction:** the inline `--ink:0` in the Step 2 draft is removed (see Step 4 correction) so no-JS keeps the headline visible; MotionProvider sets 0→1. Applied when implementing.
