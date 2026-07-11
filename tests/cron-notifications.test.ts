import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createNotificationCronHandler } from "../lib/server/notifications";

const secret = "cron-secret-at-least-16";
const request = (authorization?: string) =>
  new Request("https://zhiji.example/api/cron/notifications", {
    headers: authorization ? { authorization } : {},
  });

const sendConfig = {
  mode: "send" as const,
  apiKey: "re_test_secret",
  fromEmail: "notifications@zhiji.example",
  founderEmail: "founder@zhiji.example",
  supportEmail: "support@zhiji.example",
};

test("cron requires the exact bearer secret before running the worker", async () => {
  let deliveries = 0;
  const handler = createNotificationCronHandler({
    loadConfig: () => ({ cronSecret: secret, notifications: sendConfig }),
    deliverDue: async () => {
      deliveries += 1;
      return {
        status: "processed",
        claimed: 0,
        sent: 0,
        failed: 0,
        retryNeeded: false,
      };
    },
  });

  for (const authorization of [undefined, "Bearer wrong-secret-value", secret]) {
    const response = await handler(request(authorization));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { status: "unauthorized" });
  }
  assert.equal(deliveries, 0);
});

test("cron safely reports no work, duplicates, and retryable worker outcomes", async () => {
  const outcomes = [
    {
      status: "processed" as const,
      claimed: 0,
      sent: 0,
      failed: 0,
      retryNeeded: false,
    },
    {
      status: "processed" as const,
      claimed: 2,
      sent: 0,
      failed: 0,
      retryNeeded: true,
    },
  ];
  const handler = createNotificationCronHandler({
    loadConfig: () => ({ cronSecret: secret, notifications: sendConfig }),
    deliverDue: async () => outcomes.shift()!,
  });

  const empty = await handler(request(`Bearer ${secret}`));
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), {
    status: "processed",
    claimed: 0,
    sent: 0,
    failed: 0,
  });

  const retry = await handler(request(`Bearer ${secret}`));
  assert.equal(retry.status, 503);
  assert.deepEqual(await retry.json(), {
    status: "retry",
    claimed: 2,
    sent: 0,
    failed: 0,
  });
});

test("cron returns an explicit disabled response without claiming jobs", async () => {
  let deliveries = 0;
  const handler = createNotificationCronHandler({
    loadConfig: () => ({
      cronSecret: secret,
      notifications: { mode: "disabled" },
    }),
    deliverDue: async () => {
      deliveries += 1;
      throw new Error("must not run");
    },
  });

  const response = await handler(request(`Bearer ${secret}`));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "disabled" });
  assert.equal(deliveries, 0);
});

test("cron converts configuration failures into a correlated PII-free response", async () => {
  const logs: unknown[] = [];
  const handler = createNotificationCronHandler({
    loadConfig: () => {
      throw new Error(
        "private-client@example.com private payload PG DETAIL: secret row",
      );
    },
    deliverDue: async () => assert.fail("must not deliver"),
    logger: (entry) => logs.push(entry),
    createCorrelationId: () => "corr-cron-config",
  });

  const response = await handler(request(`Bearer ${secret}`));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-request-id"), "corr-cron-config");
  assert.deepEqual(body, { status: "unavailable" });
  assert.deepEqual(logs, [{
    correlationId: "corr-cron-config",
    code: "notification_cron_config_invalid",
  }]);
  const rendered = JSON.stringify([body, logs]);
  assert.doesNotMatch(rendered, /private-client|private payload|PG DETAIL|secret row/i);
});

test("cron converts worker failures into a correlated PII-free response", async () => {
  const logs: unknown[] = [];
  const handler = createNotificationCronHandler({
    loadConfig: () => ({ cronSecret: secret, notifications: sendConfig }),
    deliverDue: async () => {
      throw new Error(
        "private-client@example.com private payload PG DETAIL: secret row",
      );
    },
    logger: (entry) => logs.push(entry),
    createCorrelationId: () => "corr-cron-worker",
  });

  const response = await handler(request(`Bearer ${secret}`));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-request-id"), "corr-cron-worker");
  assert.deepEqual(body, { status: "unavailable" });
  assert.deepEqual(logs, [{
    correlationId: "corr-cron-worker",
    code: "notification_cron_delivery_failed",
  }]);
  const rendered = JSON.stringify([body, logs]);
  assert.doesNotMatch(rendered, /private-client|private payload|PG DETAIL|secret row/i);
});

test("production cron route uses constant-time auth and the due-job worker", async () => {
  const [route, notifications] = await Promise.all([
    readFile(
      new URL("../app/api/cron/notifications/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/server/notifications.ts", import.meta.url), "utf8"),
  ]);

  assert.match(route, /createNotificationCronHandler/);
  assert.match(route, /deliverDueNotificationJobs/);
  assert.match(route, /loadNotificationCronConfig/);
  assert.match(notifications, /timingSafeEqual/);
});
