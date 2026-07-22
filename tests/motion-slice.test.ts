import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (p: string) => readFile(new URL(`../${p}`, import.meta.url), "utf8");

test("the hero monument brush-writes via InkReveal", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /import \{ InkReveal \} from "@\/components\/InkReveal";/);
  assert.match(page, /<InkReveal text=\{c\.h1\} \/>/);
});

test("the ink reveal is a paint-only @property mask, reduced-motion safe", async () => {
  const [css, ink] = await Promise.all([read("app/globals.css"), read("components/InkReveal.tsx")]);
  assert.match(css, /@property --ink/);
  assert.match(css, /\[data-ink-reveal\] \.ink-char[\s\S]*mask-image/);
  assert.match(css, /@keyframes ink-in/);
  // the animation is gated behind no-preference, so reduce shows it instantly
  assert.match(css, /prefers-reduced-motion: no-preference[\s\S]*ink-in/);
  // no opacity-based hiding of the headline → LCP element stays painted
  assert.doesNotMatch(ink, /opacity/);
});

test("MotionProvider no longer blanket-fades the monument", async () => {
  const mp = await read("components/MotionProvider.tsx");
  assert.match(mp, /:not\(\[data-hero-title\]\)/);
  assert.doesNotMatch(mp, /"\.hero-inner > \*"/);
});

test("the world has a one-shot cinematic intro in the animated branch only", async () => {
  const lw = await read("components/LacquerWorld.tsx");
  assert.match(lw, /INTRO/);
  assert.match(lw, /el < INTRO/);
  // the intro lives only in the animated path — reduced-motion still settles plainly
  assert.match(lw, /if \(reduce\)/);
});
