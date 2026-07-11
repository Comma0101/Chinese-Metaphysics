import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the luopan has an explicit narrow-viewport composition", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../components/LacquerWorld.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(source, /fitPlateXForViewport/);
  assert.match(source, /fitPlateXForViewport\(s\.plate\[0\], window\.innerWidth\)/);

  const mobileRules = css.slice(css.lastIndexOf("@media (max-width"));
  assert.doesNotMatch(mobileRules, /\.world-canvas\s*\{\s*opacity:\s*0\.42/);
});
