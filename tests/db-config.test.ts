import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dbUrl = new URL("../lib/server/db.ts", import.meta.url);

test("database module is server-only and uses one pooled connection", async () => {
  const source = await readFile(dbUrl, "utf8");

  assert.match(source, /^import "server-only";/);
  assert.match(source, /max:\s*1[,\n]/);
  assert.match(source, /transaction pooler/i);
  assert.match(source, /SUPABASE_DATABASE_URL/);
});
