import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("keeps Stripe runtime creation behind a server-only adapter", async () => {
  const [payments, stripe] = await Promise.all([
    source("lib/server/payments.ts"),
    source("lib/server/stripe.ts"),
  ]);

  assert.match(payments, /import type Stripe from "stripe"/);
  assert.doesNotMatch(payments, /new Stripe\(/);
  assert.match(stripe, /^import "server-only";/);
  assert.match(stripe, /import Stripe from "stripe"/);
  assert.match(stripe, /timeout: 10_000/);
  assert.match(stripe, /maxNetworkRetries: 2/);
  assert.match(stripe, /\{ idempotencyKey \}/);
  assert.doesNotMatch(payments, /expireCheckoutSession/);
  assert.doesNotMatch(stripe, /sessions\.expire/);
});

test("keeps environment access behind a server-only runtime loader", async () => {
  const [config, runtime] = await Promise.all([
    source("lib/server/config.ts"),
    source("lib/server/runtime-config.ts"),
  ]);

  assert.doesNotMatch(config, /process\.env|server-only/);
  assert.match(runtime, /^import "server-only";/);
  assert.match(runtime, /parsePilotConfig\(process\.env\)/);
  assert.match(runtime, /parseNotificationConfig\(process\.env\)/);
  assert.match(runtime, /loadNotificationConfig/);
});

test("keeps Resend transport server-only and dependency-free", async () => {
  const resend = await source("lib/server/resend.ts");

  assert.match(resend, /^import "server-only";/);
  assert.match(resend, /https:\/\/api\.resend\.com\/emails/);
  assert.match(resend, /AbortSignal\.timeout\(10_000\)/);
  assert.doesNotMatch(resend, /from ["']resend["']/);
});

test("documents Resend data flow and explicit notification operation mode", async () => {
  const [dataFlow, env] = await Promise.all([
    source("docs/operations/notification-data-flow.md"),
    source(".env.local.example"),
  ]);

  assert.match(dataFlow, /api\.resend\.com/);
  assert.match(dataFlow, /recipient email address/i);
  assert.match(dataFlow, /no birth data/i);
  assert.match(dataFlow, /no client narrative/i);
  assert.match(dataFlow, /legal review/i);
  assert.match(env, /NOTIFICATION_MODE=disabled/);
});
