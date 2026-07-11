import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configUrl = new URL("../next.config.mjs", import.meta.url);

test("development and production builds use separate output directories", async () => {
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    Reflect.set(process.env, "NODE_ENV", "development");
    const development = (
      await import(`${configUrl.href}?environment=development`)
    ).default;

    Reflect.set(process.env, "NODE_ENV", "production");
    const production = (
      await import(`${configUrl.href}?environment=production`)
    ).default;

    assert.equal(development.distDir, ".next-dev");
    assert.equal(production.distDir, ".next");
  } finally {
    if (originalNodeEnv === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV");
    } else {
      Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
    }
  }
});

test("the development output directory is excluded from version control", async () => {
  const gitignore = await readFile(
    new URL("../.gitignore", import.meta.url),
    "utf8",
  );

  assert.match(gitignore, /^\.next-dev\/?$/m);
});
