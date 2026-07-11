import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import postgres from "postgres";

import {
  NEWSLETTER_MARKETING_CONSENT_VERSION,
  createSubscribeHandler,
  parseNewsletterConfig,
  upsertSubscriber,
  type SubscriberInput,
} from "../lib/server/subscribers";
import type { DatabaseClient } from "../lib/server/db";

const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://zhiji.example/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const rawRequest = (body: string, contentType = "application/json") =>
  new Request("https://zhiji.example/api/subscribe", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });

const streamingRequest = (
  chunks: Uint8Array[],
  contentLength?: string,
): { request: Request; wasCanceled: () => boolean } => {
  let index = 0;
  let canceled = false;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[index++];
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel() {
        canceled = true;
      },
    },
    { highWaterMark: 0 },
  );
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (contentLength !== undefined) headers["content-length"] = contentLength;
  return {
    request: new Request("https://zhiji.example/api/subscribe", {
      method: "POST",
      headers,
      body: stream,
      duplex: "half",
    } as RequestInit),
    wasCanceled: () => canceled,
  };
};

const recordingHandler = () => {
  const saved: SubscriberInput[] = [];
  return {
    saved,
    handler: createSubscribeHandler({
      loadConfig: () => ({ enabled: true }),
      upsertSubscriber: async (input) => {
        saved.push(input);
      },
    }),
  };
};

test("normalizes and persists a valid bilingual subscription", async () => {
  const saved: SubscriberInput[] = [];
  const handler = createSubscribeHandler({
    loadConfig: () => ({ enabled: true }),
    upsertSubscriber: async (input) => {
      saved.push(input);
    },
  });

  const response = await handler(
    request({ email: "  Person@Example.COM ", lang: "en" }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(saved, [
    {
      email: "person@example.com",
      lang: "en",
      marketingConsent: false,
      consentVersion: null,
    },
  ]);
});

test("rejects invalid email and language without persisting", async () => {
  for (const [body, code] of [
    [{ email: "not-an-email", lang: "en" }, "invalid_email"],
    [{ email: "person@example.com", lang: "fr" }, "invalid_language"],
  ] as const) {
    const { handler, saved } = recordingHandler();
    const response = await handler(request(body));

    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, code);
    assert.deepEqual(saved, []);
  }
});

test("rejects unknown fields without reflecting their names or values", async () => {
  const { handler, saved } = recordingHandler();
  const secret = "do-not-reflect";
  const response = await handler(
    request({ email: "person@example.com", lang: "zh", name: secret }),
  );
  const payload = await response.json();

  assert.equal(response.status, 422);
  assert.equal(payload.code, "unknown_field");
  assert.equal(JSON.stringify(payload).includes("name"), false);
  assert.equal(JSON.stringify(payload).includes(secret), false);
  assert.deepEqual(saved, []);
});

test("requires bounded UTF-8 JSON with the correct content type", async () => {
  for (const [incoming, status, code] of [
    [rawRequest("{}", "text/plain"), 415, "unsupported_content_type"],
    [rawRequest("{"), 422, "invalid_body"],
    [rawRequest(JSON.stringify({ email: "a".repeat(4_100), lang: "en" })), 413, "payload_too_large"],
  ] as const) {
    const { handler, saved } = recordingHandler();
    const response = await handler(incoming);

    assert.equal(response.status, status);
    assert.equal((await response.json()).code, code);
    assert.deepEqual(saved, []);
  }
});

test("cancels a streamed body over 4 KiB when Content-Length is missing or false", async () => {
  for (const declaredLength of [undefined, "1"]) {
    const incoming = streamingRequest(
      [new Uint8Array(3_000), new Uint8Array(3_000)],
      declaredLength,
    );
    const { handler, saved } = recordingHandler();

    const response = await handler(incoming.request);

    assert.equal(response.status, 413);
    assert.equal((await response.json()).code, "payload_too_large");
    assert.equal(incoming.wasCanceled(), true);
    assert.deepEqual(saved, []);
  }
});

test("rejects malformed UTF-8 without persistence", async () => {
  const incoming = streamingRequest([new Uint8Array([0xc3, 0x28])]);
  const { handler, saved } = recordingHandler();

  const response = await handler(incoming.request);

  assert.equal(response.status, 422);
  assert.equal((await response.json()).code, "invalid_body");
  assert.deepEqual(saved, []);
});

test("records marketing consent only with the current explicit version", async () => {
  const { handler, saved } = recordingHandler();
  const response = await handler(
    request({
      email: "Person@Example.com",
      lang: "zh",
      marketingConsent: true,
      consentVersion: NEWSLETTER_MARKETING_CONSENT_VERSION,
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(saved, [
    {
      email: "person@example.com",
      lang: "zh",
      marketingConsent: true,
      consentVersion: NEWSLETTER_MARKETING_CONSENT_VERSION,
    },
  ]);
});

test("rejects missing, stale, or unsolicited consent versions", async () => {
  for (const body of [
    { email: "person@example.com", lang: "en", marketingConsent: true },
    {
      email: "person@example.com",
      lang: "en",
      marketingConsent: true,
      consentVersion: "stale",
    },
    {
      email: "person@example.com",
      lang: "en",
      marketingConsent: false,
      consentVersion: NEWSLETTER_MARKETING_CONSENT_VERSION,
    },
  ]) {
    const { handler, saved } = recordingHandler();
    const response = await handler(request(body));

    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, "invalid_consent");
    assert.deepEqual(saved, []);
  }
});

test("returns a generic unavailable response when persistence fails", async () => {
  const logs: unknown[] = [];
  const handler = createSubscribeHandler({
    loadConfig: () => ({ enabled: true }),
    createCorrelationId: () => "newsletter-correlation-1",
    logger: (entry) => logs.push(entry),
    upsertSubscriber: async () => {
      throw new Error("private@example.com database detail");
    },
  });

  const response = await handler(
    request({ email: "private@example.com", lang: "en" }),
  );
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.deepEqual(payload, {
    ok: false,
    code: "subscription_unavailable",
    error: "Subscription is temporarily unavailable.",
  });
  assert.equal(JSON.stringify(payload).includes("private@example.com"), false);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("x-request-id"),
    "newsletter-correlation-1",
  );
  assert.deepEqual(logs, [
    {
      correlationId: "newsletter-correlation-1",
      code: "newsletter_persist_failed",
    },
  ]);
  assert.equal(JSON.stringify(logs).includes("private@example.com"), false);
  assert.equal(JSON.stringify(logs).includes("database detail"), false);
});

test("stays closed before reading the request or touching the database", async () => {
  let bodyRead = false;
  let databaseCalled = false;
  const incoming = new Request("https://zhiji.example/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  Object.defineProperty(incoming, "body", {
    get() {
      bodyRead = true;
      throw new Error("body must not be read");
    },
  });
  const handler = createSubscribeHandler({
    loadConfig: () => ({ enabled: false }),
    upsertSubscriber: async () => {
      databaseCalled = true;
    },
  });

  const response = await handler(incoming);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    code: "newsletter_disabled",
    error: "Email collection is currently disabled.",
  });
  assert.equal(bodyRead, false);
  assert.equal(databaseCalled, false);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("parses only an explicit newsletter collection switch", () => {
  assert.deepEqual(parseNewsletterConfig({}), { enabled: false });
  assert.deepEqual(parseNewsletterConfig({ NEWSLETTER_ENABLED: "false" }), {
    enabled: false,
  });
  assert.deepEqual(parseNewsletterConfig({ NEWSLETTER_ENABLED: "true" }), {
    enabled: true,
  });

  for (const value of ["", "TRUE", "1", "yes", " true "]) {
    assert.throws(() => parseNewsletterConfig({ NEWSLETTER_ENABLED: value }));
  }
});

test("uses a conflict-safe subscriber upsert without a filesystem fallback", async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    queries.push({ text: strings.join("?"), values });
    return Promise.resolve([]);
  }) as unknown as DatabaseClient;

  await upsertSubscriber(
    {
      email: "person@example.com",
      lang: "en",
      marketingConsent: false,
      consentVersion: null,
    },
    sql,
  );

  assert.equal(queries.length, 1);
  assert.match(queries[0]!.text, /insert into subscribers/i);
  assert.match(queries[0]!.text, /on conflict \(email\) do update/i);
  assert.match(queries[0]!.text, /unsubscribed_at is null/i);
  assert.match(queries[0]!.text, /is distinct from excluded\.consent_version/i);
  assert.deepEqual(queries[0]!.values.slice(0, 4), [
    "person@example.com",
    "en",
    false,
    null,
  ]);

  const [routeSource, storeSource] = await Promise.all([
    readFile(new URL("../app/api/subscribe/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/store.ts", import.meta.url), "utf8").catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return "";
        throw error;
      },
    ),
  ]);
  assert.match(routeSource, /@\/lib\/server\/subscribers/);
  assert.match(routeSource, /loadNewsletterConfig/);
  assert.match(
    routeSource,
    /createSubscribeHandler\(\{[\s\S]*loadConfig:\s*loadNewsletterConfig/,
  );
  assert.doesNotMatch(routeSource, /@\/lib\/store|saveSubscriber/);
  assert.doesNotMatch(storeSource, /subscribers\.json|saveSubscriber|SUB_FILE/);
  assert.doesNotMatch(
    storeSource,
    /node:fs|from ["']fs["']|intakes\.json|readFileSync|writeFileSync/,
  );
});

const databaseUrl = process.env.TEST_DATABASE_URL;

test(
  "keeps duplicate subscriptions idempotent and preserves explicit consent",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL is not configured" },
  async () => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    const email = `subscriber-${crypto.randomUUID()}@example.com`;
    try {
      await upsertSubscriber(
        { email, lang: "zh", marketingConsent: false, consentVersion: null },
        sql,
      );
      await upsertSubscriber(
        {
          email,
          lang: "en",
          marketingConsent: true,
          consentVersion: NEWSLETTER_MARKETING_CONSENT_VERSION,
        },
        sql,
      );
      await upsertSubscriber(
        { email, lang: "zh", marketingConsent: false, consentVersion: null },
        sql,
      );

      const rows = await sql<{
        count: number;
        lang: string;
        marketing_consent: boolean;
        consent_version: string | null;
        consented_at: Date | null;
      }[]>`
        select count(*)::int as count, max(lang) as lang,
          bool_or(marketing_consent) as marketing_consent,
          max(consent_version) as consent_version,
          max(consented_at) as consented_at
        from subscribers where email = ${email}
      `;
      assert.equal(rows[0]?.count, 1);
      assert.equal(rows[0]?.lang, "zh");
      assert.equal(rows[0]?.marketing_consent, true);
      assert.equal(
        rows[0]?.consent_version,
        NEWSLETTER_MARKETING_CONSENT_VERSION,
      );
      assert.ok(rows[0]?.consented_at instanceof Date);
    } finally {
      await sql`delete from subscribers where email = ${email}`;
      await sql.end();
    }
  },
);

test("README documents the gated, durable pilot instead of JSON demo storage", async () => {
  const [readme, env] = await Promise.all([
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../.env.local.example", import.meta.url), "utf8"),
  ]);

  for (const required of [
    "PAID_PILOT_ENABLED=false",
    "Supabase",
    "Stripe webhook",
    "Resend",
    "npm test",
    "npm run typecheck",
    "npm run build",
    "NEWSLETTER_ENABLED=false",
  ]) {
    assert.equal(readme.includes(required), true, `missing ${required}`);
  }
  assert.doesNotMatch(readme, /data\/intakes\.json|演示模式/);
  assert.match(readme, /newsletter collection and sending remain disabled/i);
  assert.match(readme, /immutable consent/i);
  assert.match(readme, /unsubscribe/i);
  assert.match(readme, /re-consent/i);
  assert.match(readme, /no marketing email/i);
  assert.match(env, /NEWSLETTER_ENABLED=false/);
  assert.match(env, /no marketing/i);
});
