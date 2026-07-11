import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  runPilotApplicationsCli,
  runPilotApplicationsExecutable,
  type PilotApplicationsCliDependencies,
} from "../scripts/pilot-applications";
import {
  listApplicationSummaries,
  listSafeRetentionCandidates,
  redactEligibleRetentionCandidate,
} from "../lib/server/applications";
import type { DatabaseClient } from "../lib/server/db";

const applicationId = "11111111-1111-4111-8111-111111111111";

const createIo = () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      stdout: (value: string) => stdout.push(value),
      stderr: (value: string) => stderr.push(value),
    },
    stdout,
    stderr,
  };
};

const createDependencies = (
  overrides: Partial<PilotApplicationsCliDependencies> = {},
): PilotApplicationsCliDependencies => ({
  listApplicationSummaries: async () => [],
  exportApplicationAggregate: async () => null,
  redactApplication: async () => ({
    id: applicationId,
    status: "redacted",
  }),
  listSafeRetentionCandidates: async () => [],
  redactEligibleRetentionCandidate: async () => ({
    id: applicationId,
    status: "redacted",
  }),
  transitionApplication: async () => ({
    id: applicationId,
    status: "withdrawn",
  }),
  ...overrides,
});

test("refuses a sensitive export before querying without the exact confirmation flag", async () => {
  let queried = false;
  const { io, stdout, stderr } = createIo();
  const exitCode = await runPilotApplicationsCli(
    ["export", applicationId],
    createDependencies({
      exportApplicationAggregate: async () => {
        queried = true;
        return {};
      },
    }),
    io,
  );

  assert.equal(exitCode, 2);
  assert.equal(queried, false);
  assert.equal(stdout.length, 0);
  assert.match(stderr.join(""), /sensitive_export_confirmation_required/);
});

test("exports a marked sensitive aggregate only after explicit confirmation", async () => {
  const aggregate = { application: { id: applicationId, email: "private@example.com" } };
  const { io, stdout, stderr } = createIo();
  const exitCode = await runPilotApplicationsCli(
    ["export", applicationId, "--confirm-sensitive-export"],
    createDependencies({ exportApplicationAggregate: async () => aggregate }),
    io,
  );

  assert.equal(exitCode, 0);
  assert.equal(stderr.length, 0);
  assert.deepEqual(JSON.parse(stdout.join("")), {
    sensitive: true,
    applicationId,
    data: aggregate,
  });
});

test("list emits only the safe summary projection", async () => {
  const { io, stdout, stderr } = createIo();
  let requestedLimit = 0;
  const exitCode = await runPilotApplicationsCli(
    ["list", "--limit", "7"],
    createDependencies({
      listApplicationSummaries: async (limit) => {
        requestedLimit = limit;
        return [
          {
            id: applicationId,
            status: "deposit_paid",
            createdAt: new Date("2026-07-10T20:00:00.000Z"),
            retentionDeleteAfter: null,
            notifications: { pending: 1, failed: 2, sent: 3 },
          },
        ];
      },
    }),
    io,
  );

  const serialized = stdout.join("");
  assert.equal(exitCode, 0);
  assert.equal(requestedLimit, 7);
  assert.equal(stderr.length, 0);
  assert.deepEqual(Object.keys(JSON.parse(serialized)[0]).sort(), [
    "createdAt",
    "id",
    "notifications",
    "retentionDeleteAfter",
    "status",
  ]);
  for (const forbidden of [
    "private@example.com",
    "city",
    "region",
    "decision",
    "stripe",
    "fingerprint",
    "payload",
  ]) {
    assert.doesNotMatch(serialized.toLowerCase(), new RegExp(forbidden));
  }
});

test("redact is a non-mutating dry run unless --apply is present", async () => {
  let mutations = 0;
  const dependencies = createDependencies({
    redactApplication: async () => {
      mutations += 1;
      return { id: applicationId, status: "redacted" };
    },
  });
  const dry = createIo();
  const dryExit = await runPilotApplicationsCli(
    ["redact", applicationId, "--reason", "client_requested"],
    dependencies,
    dry.io,
  );

  assert.equal(dryExit, 0);
  assert.equal(mutations, 0);
  assert.deepEqual(JSON.parse(dry.stdout.join("")), {
    dryRun: true,
    action: "redact",
    id: applicationId,
    reason: "client_requested",
  });

  const applied = createIo();
  const applyExit = await runPilotApplicationsCli(
    ["redact", applicationId, "--reason", "client_requested", "--apply"],
    dependencies,
    applied.io,
  );
  assert.equal(applyExit, 0);
  assert.equal(mutations, 1);
  assert.deepEqual(JSON.parse(applied.stdout.join("")), {
    applied: true,
    action: "redact",
    id: applicationId,
    status: "redacted",
  });
});

test("redact apply records the bounded reason and founder_cli actor", async () => {
  let received: unknown;
  const { io } = createIo();
  const exitCode = await runPilotApplicationsCli(
    ["redact", applicationId, "--reason", "privacy_request", "--apply"],
    createDependencies({
      redactApplication: async (id, actor, reason) => {
        received = { id, actor, reason };
        return { id, status: "redacted" };
      },
    }),
    io,
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(received, {
    id: applicationId,
    actor: "founder_cli",
    reason: "privacy_request",
  });
});

test("retention defaults to a safe dry run and caps the limit at 100", async () => {
  let received: unknown;
  let redactions = 0;
  const now = new Date("2026-07-10T21:00:00.000Z");
  const { io, stdout } = createIo();
  const exitCode = await runPilotApplicationsCli(
    ["retention", "--limit", "100"],
    createDependencies({
      now: () => now,
      listSafeRetentionCandidates: async (before, limit) => {
        received = { before, limit };
        return [
          {
            id: applicationId,
            status: "declined",
            retentionDeleteAfter: new Date("2026-07-01T00:00:00.000Z"),
          },
        ];
      },
      redactApplication: async () => {
        redactions += 1;
        return { id: applicationId, status: "redacted" };
      },
    }),
    io,
  );

  assert.equal(exitCode, 0);
  assert.equal(redactions, 0);
  assert.deepEqual(received, { before: now, limit: 100 });
  assert.deepEqual(JSON.parse(stdout.join("")), {
    dryRun: true,
    before: now.toISOString(),
    candidates: [
      {
        id: applicationId,
        status: "declined",
        retentionDeleteAfter: "2026-07-01T00:00:00.000Z",
      },
    ],
  });
});

test("retention apply continues safely after one item fails", async () => {
  const secondId = "22222222-2222-4222-8222-222222222222";
  const calls: unknown[] = [];
  const { io, stdout, stderr } = createIo();
  const exitCode = await runPilotApplicationsCli(
    ["retention", "--before", "2026-07-10T00:00:00.000Z", "--apply"],
    createDependencies({
      listSafeRetentionCandidates: async () => [
        {
          id: applicationId,
          status: "declined",
          retentionDeleteAfter: new Date("2026-07-01T00:00:00.000Z"),
        },
        {
          id: secondId,
          status: "withdrawn",
          retentionDeleteAfter: new Date("2026-07-02T00:00:00.000Z"),
        },
      ],
      redactEligibleRetentionCandidate: async (id, _before, actor, reason) => {
        calls.push({ id, actor, reason });
        if (id === applicationId) throw new Error("private@example.com postgres detail");
        return { id, status: "redacted" };
      },
    }),
    io,
  );

  const output = stdout.join("") + stderr.join("");
  assert.equal(exitCode, 1);
  assert.deepEqual(calls, [
    { id: applicationId, actor: "founder_cli", reason: "retention_expired" },
    { id: secondId, actor: "founder_cli", reason: "retention_expired" },
  ]);
  assert.deepEqual(JSON.parse(stdout.join("")), {
    applied: true,
    before: "2026-07-10T00:00:00.000Z",
    results: [
      { id: applicationId, status: "failed", code: "operation_failed" },
      { id: secondId, status: "redacted" },
    ],
  });
  assert.doesNotMatch(output, /private@example\.com|postgres detail/);
});

test("withdraw is dry-run by default and audits an applied transition", async () => {
  let received: unknown;
  const dependencies = createDependencies({
    transitionApplication: async (id, transition) => {
      received = { id, transition };
      return { id, status: "withdrawn" };
    },
  });
  const dry = createIo();
  assert.equal(
    await runPilotApplicationsCli(
      ["withdraw", applicationId, "--reason", "client_requested"],
      dependencies,
      dry.io,
    ),
    0,
  );
  assert.equal(received, undefined);

  const applied = createIo();
  assert.equal(
    await runPilotApplicationsCli(
      ["withdraw", applicationId, "--reason", "client_requested", "--apply"],
      dependencies,
      applied.io,
    ),
    0,
  );
  assert.deepEqual(received, {
    id: applicationId,
    transition: {
      to: "withdrawn",
      actor: "founder_cli",
      reason: "client_requested",
    },
  });
});

test("qualify and decline are dry-run first and use audited lifecycle transitions", async () => {
  const received: unknown[] = [];
  const dependencies = createDependencies({
    transitionApplication: async (id, transition) => {
      received.push({ id, transition });
      return { id, status: transition.to };
    },
  });

  for (const [command, expectedState] of [
    ["qualify", "qualified"],
    ["decline", "declined"],
  ] as const) {
    const reason =
      command === "qualify" ? "manual_review_passed" : "scope_not_supported";
    const dry = createIo();
    assert.equal(
      await runPilotApplicationsCli(
        [command, applicationId, "--reason", reason],
        dependencies,
        dry.io,
      ),
      0,
    );
    assert.deepEqual(JSON.parse(dry.stdout.join("")), {
      dryRun: true,
      action: command,
      id: applicationId,
      reason,
    });

    const applied = createIo();
    assert.equal(
      await runPilotApplicationsCli(
        [command, applicationId, "--reason", reason, "--apply"],
        dependencies,
        applied.io,
      ),
      0,
    );
    assert.deepEqual(JSON.parse(applied.stdout.join("")), {
      applied: true,
      action: command,
      id: applicationId,
      status: expectedState,
    });
  }

  assert.deepEqual(received, [
    {
      id: applicationId,
      transition: {
        to: "qualified",
        actor: "founder_cli",
        reason: "manual_review_passed",
      },
    },
    {
      id: applicationId,
      transition: {
        to: "declined",
        actor: "founder_cli",
        reason: "scope_not_supported",
      },
    },
  ]);
});

test("mutation commands reject regex-valid names, phone-like identifiers, and cross-command reasons", async () => {
  let mutations = 0;
  const dependencies = createDependencies({
    redactApplication: async () => {
      mutations += 1;
      return { id: applicationId, status: "redacted" };
    },
    transitionApplication: async () => {
      mutations += 1;
      return { id: applicationId, status: "qualified" };
    },
  });
  const cases = [
    ["qualify", applicationId, "--reason", "john_smith", "--apply"],
    ["qualify", applicationId, "--reason", "privacy_request", "--apply"],
    ["decline", applicationId, "--reason", "client_14155550123", "--apply"],
    ["withdraw", applicationId, "--reason", "case_9876543210", "--apply"],
    ["redact", applicationId, "--reason", "private_user_01", "--apply"],
  ];

  for (const args of cases) {
    const { io, stdout, stderr } = createIo();
    assert.equal(await runPilotApplicationsCli(args, dependencies, io), 2);
    assert.equal(stdout.length, 0);
    assert.deepEqual(JSON.parse(stderr.join("")), {
      ok: false,
      code: "invalid_arguments",
    });
  }
  assert.equal(mutations, 0);
});

test("help exposes the complete command-specific reason vocabulary without database access", async () => {
  let calls = 0;
  const dependencies = createDependencies({
    listApplicationSummaries: async () => {
      calls += 1;
      return [];
    },
    transitionApplication: async () => {
      calls += 1;
      return { id: applicationId, status: "qualified" };
    },
    redactApplication: async () => {
      calls += 1;
      return { id: applicationId, status: "redacted" };
    },
  });
  const { io, stdout, stderr } = createIo();

  assert.equal(await runPilotApplicationsCli(["help"], dependencies, io), 0);
  assert.equal(calls, 0);
  assert.equal(stderr.length, 0);
  assert.deepEqual(JSON.parse(stdout.join("")), {
    commands: {
      qualify: { reasons: ["manual_review_passed"] },
      decline: { reasons: ["eligibility_not_met", "scope_not_supported"] },
      withdraw: { reasons: ["client_requested", "operator_cancelled"] },
      redact: { reasons: ["client_requested", "privacy_request"] },
      retention: { reason: "retention_expired" },
    },
    mutationsRequireApply: true,
  });
});

test("qualify and decline reject invalid identifiers and sensitive reason text before mutation", async () => {
  let mutations = 0;
  const dependencies = createDependencies({
    transitionApplication: async () => {
      mutations += 1;
      return { id: applicationId, status: "qualified" };
    },
  });

  for (const args of [
    ["qualify", "not-a-uuid", "--reason", "manual_review"],
    ["decline", applicationId, "--reason", "email private@example.com"],
  ]) {
    const { io, stdout, stderr } = createIo();
    assert.equal(await runPilotApplicationsCli(args, dependencies, io), 2);
    assert.equal(stdout.length, 0);
    assert.match(stderr.join(""), /invalid_arguments/);
    assert.doesNotMatch(stderr.join(""), /private@example\.com/);
  }
  assert.equal(mutations, 0);
});

test("rejects invalid UUIDs, reasons, dates, limits, and unknown options before DB access", async () => {
  let calls = 0;
  const dependencies = createDependencies({
    listApplicationSummaries: async () => {
      calls += 1;
      return [];
    },
    exportApplicationAggregate: async () => {
      calls += 1;
      return null;
    },
    listSafeRetentionCandidates: async () => {
      calls += 1;
      return [];
    },
    redactApplication: async () => {
      calls += 1;
      return { id: applicationId, status: "redacted" };
    },
  });
  const cases = [
    ["export", "not-a-uuid", "--confirm-sensitive-export"],
    ["redact", applicationId, "--reason", "contains private words"],
    ["retention", "--before", "yesterday"],
    ["retention", "--limit", "101"],
    ["list", "--limit", "0"],
    ["list", "--unknown"],
  ];

  for (const args of cases) {
    const { io, stderr } = createIo();
    assert.equal(await runPilotApplicationsCli(args, dependencies, io), 2);
    assert.match(stderr.join(""), /invalid_arguments/);
  }
  assert.equal(calls, 0);
});

test("unexpected errors are reduced to a stable code without serializing Error details", async () => {
  const { io, stdout, stderr } = createIo();
  const exitCode = await runPilotApplicationsCli(
    ["list"],
    createDependencies({
      listApplicationSummaries: async () => {
        throw new Error("private@example.com connection secret");
      },
    }),
    io,
  );

  const output = stdout.join("") + stderr.join("");
  assert.equal(exitCode, 1);
  assert.match(stderr.join(""), /operation_failed/);
  assert.doesNotMatch(output, /private@example\.com|connection secret/);
});

test("executable helper always closes an opened database", async () => {
  let closed = 0;
  const { io } = createIo();
  const exitCode = await runPilotApplicationsExecutable(
    ["list"],
    async () => ({
      dependencies: createDependencies({
        listApplicationSummaries: async () => {
          throw new Error("database failure");
        },
      }),
      close: async () => {
        closed += 1;
      },
    }),
    io,
  );

  assert.equal(exitCode, 1);
  assert.equal(closed, 1);
});

test("summary repository selects and maps only operator-safe columns", async () => {
  let query = "";
  let values: readonly unknown[] = [];
  const sql = (async (
    strings: TemplateStringsArray,
    ...parameters: unknown[]
  ) => {
    query = strings.join("?");
    values = parameters;
    return [
      {
        id: applicationId,
        status: "deposit_paid",
        created_at: new Date("2026-07-10T20:00:00.000Z"),
        retention_delete_after: null,
        notifications_pending: 1,
        notifications_failed: 2,
        notifications_sent: 3,
      },
    ];
  }) as unknown as DatabaseClient;

  const result = await listApplicationSummaries(25, sql);

  assert.deepEqual(values, [25]);
  assert.deepEqual(result, [
    {
      id: applicationId,
      status: "deposit_paid",
      createdAt: new Date("2026-07-10T20:00:00.000Z"),
      retentionDeleteAfter: null,
      notifications: { pending: 1, failed: 2, sent: 3 },
    },
  ]);
  for (const forbiddenColumn of [
    "email",
    "city",
    "region",
    "decision_type",
    "stripe_checkout_session_id",
    "submission_fingerprint",
    "payload_text",
  ]) {
    assert.doesNotMatch(query.toLowerCase(), new RegExp(`\\b${forbiddenColumn}\\b`));
  }
  assert.doesNotMatch(query, /select\s+\*/i);
});

test("retention repository returns a safe projection and caps its query limit", async () => {
  let query = "";
  let values: readonly unknown[] = [];
  const deadline = new Date("2026-07-01T00:00:00.000Z");
  const before = new Date("2026-07-10T00:00:00.000Z");
  const sql = (async (
    strings: TemplateStringsArray,
    ...parameters: unknown[]
  ) => {
    query = strings.join("?");
    values = parameters;
    return [
      {
        id: applicationId,
        status: "declined",
        retention_delete_after: deadline,
      },
    ];
  }) as unknown as DatabaseClient;

  const result = await listSafeRetentionCandidates(before, 500, sql);

  assert.deepEqual(values, [before, 100]);
  assert.deepEqual(result, [
    { id: applicationId, status: "declined", retentionDeleteAfter: deadline },
  ]);
  assert.match(query, /select\s+id,\s*status,\s*retention_delete_after/i);
  assert.doesNotMatch(query, /select\s+\*/i);
});

test("retention apply uses an atomic repository recheck and safely skips stale candidates", async () => {
  let legacyRedactions = 0;
  const calls: unknown[] = [];
  const before = new Date("2026-07-10T00:00:00.000Z");
  const { io, stdout } = createIo();
  const exitCode = await runPilotApplicationsCli(
    ["retention", "--before", before.toISOString(), "--apply"],
    createDependencies({
      listSafeRetentionCandidates: async () => [
        {
          id: applicationId,
          status: "checkout_created",
          retentionDeleteAfter: new Date("2026-07-01T00:00:00.000Z"),
        },
      ],
      redactApplication: async () => {
        legacyRedactions += 1;
        return { id: applicationId, status: "redacted" };
      },
      redactEligibleRetentionCandidate: async (id, cutoff, actor, reason) => {
        calls.push({ id, cutoff, actor, reason });
        return null;
      },
    }),
    io,
  );

  assert.equal(exitCode, 0);
  assert.equal(legacyRedactions, 0);
  assert.deepEqual(calls, [
    {
      id: applicationId,
      cutoff: before,
      actor: "founder_cli",
      reason: "retention_expired",
    },
  ]);
  assert.deepEqual(JSON.parse(stdout.join("")), {
    applied: true,
    before: before.toISOString(),
    results: [
      { id: applicationId, status: "skipped", code: "retention_ineligible" },
    ],
  });
});

test("retention mutation locks and revalidates eligibility in its transaction", async () => {
  let query = "";
  let values: readonly unknown[] = [];
  let began = 0;
  const before = new Date("2026-07-10T00:00:00.000Z");
  const transaction = (async (
    strings: TemplateStringsArray,
    ...parameters: unknown[]
  ) => {
    query = strings.join("?");
    values = parameters;
    return [];
  }) as unknown as DatabaseClient;
  const sql = Object.assign(
    (() => Promise.resolve([])) as unknown as DatabaseClient,
    {
      begin: async (work: (tx: DatabaseClient) => Promise<unknown>) => {
        began += 1;
        return work(transaction);
      },
    },
  );

  const result = await redactEligibleRetentionCandidate(
    applicationId,
    before,
    "founder_cli",
    "retention_expired",
    sql,
  );

  assert.equal(result, null);
  assert.equal(began, 1);
  assert.deepEqual(values, [applicationId, before]);
  assert.match(query, /where\s+id\s*=\s*\?/i);
  assert.match(query, /retention_delete_after\s*<=\s*\?/i);
  assert.match(query, /status\s+in\s*\([\s\S]*checkout_created[\s\S]*\)/i);
  assert.match(query, /for\s+update/i);
});

test("package exposes the server-only founder operations command", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["pilot:applications"],
    "node --conditions=react-server --import tsx scripts/pilot-applications.ts",
  );
});
