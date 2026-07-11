import { pathToFileURL } from "node:url";

import type { ApplicationState, PersistedTransitionInput } from "../lib/server/applications";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export const FOUNDER_CLI_REASON_CODES = {
  qualify: ["manual_review_passed"],
  decline: ["eligibility_not_met", "scope_not_supported"],
  withdraw: ["client_requested", "operator_cancelled"],
  redact: ["client_requested", "privacy_request"],
  retention: ["retention_expired"],
} as const;

type ReasonCommand = keyof typeof FOUNDER_CLI_REASON_CODES;

export interface SafeApplicationSummary {
  id: string;
  status: ApplicationState;
  createdAt: Date;
  retentionDeleteAfter: Date | null;
  notifications: { pending: number; failed: number; sent: number };
}

export interface SafeRetentionCandidate {
  id: string;
  status: ApplicationState;
  retentionDeleteAfter: Date;
}

interface SafeOperationResult {
  id: string;
  status: ApplicationState;
}

export interface PilotApplicationsCliDependencies {
  listApplicationSummaries(limit: number): Promise<SafeApplicationSummary[]>;
  exportApplicationAggregate(id: string): Promise<Record<string, unknown> | null>;
  redactApplication(
    id: string,
    actor: string,
    reason: string,
  ): Promise<SafeOperationResult>;
  listSafeRetentionCandidates(
    before: Date,
    limit: number,
  ): Promise<SafeRetentionCandidate[]>;
  redactEligibleRetentionCandidate(
    id: string,
    before: Date,
    actor: string,
    reason: string,
  ): Promise<SafeOperationResult | null>;
  transitionApplication(
    id: string,
    transition: PersistedTransitionInput,
  ): Promise<SafeOperationResult>;
  now?: () => Date;
}

export interface PilotApplicationsCliIo {
  stdout(value: string): void;
  stderr(value: string): void;
}

class InvalidArgumentsError extends Error {}

const writeJson = (
  write: (value: string) => void,
  value: unknown,
): void => write(`${JSON.stringify(value)}\n`);

const requireUuid = (value: string | undefined): string => {
  if (!value || !UUID.test(value)) throw new InvalidArgumentsError();
  return value;
};

const requireReason = (
  command: ReasonCommand,
  value: string | undefined,
): string => {
  if (
    !value ||
    !(FOUNDER_CLI_REASON_CODES[command] as readonly string[]).includes(value)
  ) {
    throw new InvalidArgumentsError();
  }
  return value;
};

const parseLimit = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new InvalidArgumentsError();
  const limit = Number(value);
  if (limit < 1 || limit > 100) throw new InvalidArgumentsError();
  return limit;
};

const parseDate = (value: string | undefined, fallback: Date): Date => {
  if (value === undefined) return fallback;
  if (!ISO_DATE.test(value)) throw new InvalidArgumentsError();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new InvalidArgumentsError();
  return date;
};

const parseOptions = (
  args: readonly string[],
  valueOptions: ReadonlySet<string>,
  flagOptions: ReadonlySet<string>,
): { values: Map<string, string>; flags: Set<string> } => {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index]!;
    if (flagOptions.has(option)) {
      if (flags.has(option)) throw new InvalidArgumentsError();
      flags.add(option);
      continue;
    }
    if (!valueOptions.has(option) || values.has(option)) {
      throw new InvalidArgumentsError();
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new InvalidArgumentsError();
    values.set(option, value);
    index += 1;
  }
  return { values, flags };
};

const serializeSummary = (summary: SafeApplicationSummary) => ({
  id: summary.id,
  status: summary.status,
  createdAt: summary.createdAt.toISOString(),
  retentionDeleteAfter: summary.retentionDeleteAfter?.toISOString() ?? null,
  notifications: summary.notifications,
});

const serializeCandidate = (candidate: SafeRetentionCandidate) => ({
  id: candidate.id,
  status: candidate.status,
  retentionDeleteAfter: candidate.retentionDeleteAfter.toISOString(),
});

const handleList = async (
  args: readonly string[],
  deps: PilotApplicationsCliDependencies,
  io: PilotApplicationsCliIo,
): Promise<number> => {
  const options = parseOptions(args, new Set(["--limit"]), new Set());
  const limit = parseLimit(options.values.get("--limit"), 50);
  const summaries = await deps.listApplicationSummaries(limit);
  writeJson(io.stdout, summaries.map(serializeSummary));
  return 0;
};

const handleExport = async (
  args: readonly string[],
  deps: PilotApplicationsCliDependencies,
  io: PilotApplicationsCliIo,
): Promise<number> => {
  const id = requireUuid(args[0]);
  const options = parseOptions(
    args.slice(1),
    new Set(),
    new Set(["--confirm-sensitive-export"]),
  );
  if (!options.flags.has("--confirm-sensitive-export")) {
    writeJson(io.stderr, { ok: false, code: "sensitive_export_confirmation_required" });
    return 2;
  }
  const data = await deps.exportApplicationAggregate(id);
  if (!data) {
    writeJson(io.stderr, { ok: false, code: "not_found" });
    return 1;
  }
  writeJson(io.stdout, { sensitive: true, applicationId: id, data });
  return 0;
};

const parseMutation = (
  command: Exclude<ReasonCommand, "retention">,
  args: readonly string[],
) => {
  const id = requireUuid(args[0]);
  const options = parseOptions(
    args.slice(1),
    new Set(["--reason"]),
    new Set(["--apply"]),
  );
  return {
    id,
    reason: requireReason(command, options.values.get("--reason")),
    apply: options.flags.has("--apply"),
  };
};

const handleRedact = async (
  args: readonly string[],
  deps: PilotApplicationsCliDependencies,
  io: PilotApplicationsCliIo,
): Promise<number> => {
  const mutation = parseMutation("redact", args);
  if (!mutation.apply) {
    writeJson(io.stdout, {
      dryRun: true,
      action: "redact",
      id: mutation.id,
      reason: mutation.reason,
    });
    return 0;
  }
  const result = await deps.redactApplication(
    mutation.id,
    "founder_cli",
    mutation.reason,
  );
  writeJson(io.stdout, {
    applied: true,
    action: "redact",
    id: result.id,
    status: result.status,
  });
  return 0;
};

const handleWithdraw = async (
  args: readonly string[],
  deps: PilotApplicationsCliDependencies,
  io: PilotApplicationsCliIo,
): Promise<number> => {
  const mutation = parseMutation("withdraw", args);
  if (!mutation.apply) {
    writeJson(io.stdout, {
      dryRun: true,
      action: "withdraw",
      id: mutation.id,
      reason: mutation.reason,
    });
    return 0;
  }
  const result = await deps.transitionApplication(mutation.id, {
    to: "withdrawn",
    actor: "founder_cli",
    reason: mutation.reason,
  });
  writeJson(io.stdout, {
    applied: true,
    action: "withdraw",
    id: result.id,
    status: result.status,
  });
  return 0;
};

const handleDecision = async (
  action: "qualify" | "decline",
  to: "qualified" | "declined",
  args: readonly string[],
  deps: PilotApplicationsCliDependencies,
  io: PilotApplicationsCliIo,
): Promise<number> => {
  const mutation = parseMutation(action, args);
  if (!mutation.apply) {
    writeJson(io.stdout, {
      dryRun: true,
      action,
      id: mutation.id,
      reason: mutation.reason,
    });
    return 0;
  }
  const result = await deps.transitionApplication(mutation.id, {
    to,
    actor: "founder_cli",
    reason: mutation.reason,
  });
  writeJson(io.stdout, {
    applied: true,
    action,
    id: result.id,
    status: result.status,
  });
  return 0;
};

const handleRetention = async (
  args: readonly string[],
  deps: PilotApplicationsCliDependencies,
  io: PilotApplicationsCliIo,
): Promise<number> => {
  const options = parseOptions(
    args,
    new Set(["--before", "--limit"]),
    new Set(["--apply"]),
  );
  const before = parseDate(options.values.get("--before"), (deps.now ?? (() => new Date()))());
  const limit = parseLimit(options.values.get("--limit"), 100);
  const candidates = await deps.listSafeRetentionCandidates(before, limit);
  if (!options.flags.has("--apply")) {
    writeJson(io.stdout, {
      dryRun: true,
      before: before.toISOString(),
      candidates: candidates.map(serializeCandidate),
    });
    return 0;
  }

  let failed = false;
  const results: Array<
    | { id: string; status: "redacted" }
    | { id: string; status: "skipped"; code: "retention_ineligible" }
    | { id: string; status: "failed"; code: "operation_failed" }
  > = [];
  for (const candidate of candidates) {
    try {
      const result = await deps.redactEligibleRetentionCandidate(
        candidate.id,
        before,
        "founder_cli",
        "retention_expired",
      );
      results.push(
        result
          ? { id: candidate.id, status: "redacted" }
          : {
              id: candidate.id,
              status: "skipped",
              code: "retention_ineligible",
            },
      );
    } catch {
      failed = true;
      results.push({ id: candidate.id, status: "failed", code: "operation_failed" });
    }
  }
  writeJson(io.stdout, { applied: true, before: before.toISOString(), results });
  return failed ? 1 : 0;
};

const handleHelp = (
  args: readonly string[],
  io: PilotApplicationsCliIo,
): number => {
  if (args.length !== 0) throw new InvalidArgumentsError();
  writeJson(io.stdout, {
    commands: {
      qualify: { reasons: FOUNDER_CLI_REASON_CODES.qualify },
      decline: { reasons: FOUNDER_CLI_REASON_CODES.decline },
      withdraw: { reasons: FOUNDER_CLI_REASON_CODES.withdraw },
      redact: { reasons: FOUNDER_CLI_REASON_CODES.redact },
      retention: { reason: FOUNDER_CLI_REASON_CODES.retention[0] },
    },
    mutationsRequireApply: true,
  });
  return 0;
};

export async function runPilotApplicationsCli(
  args: readonly string[],
  deps: PilotApplicationsCliDependencies,
  io: PilotApplicationsCliIo,
): Promise<number> {
  try {
    const [command, ...rest] = args;
    if (command === "help" || command === "--help") {
      return handleHelp(rest, io);
    }
    if (command === "list") return await handleList(rest, deps, io);
    if (command === "export") return await handleExport(rest, deps, io);
    if (command === "redact") return await handleRedact(rest, deps, io);
    if (command === "retention") return await handleRetention(rest, deps, io);
    if (command === "withdraw") return await handleWithdraw(rest, deps, io);
    if (command === "qualify") {
      return await handleDecision("qualify", "qualified", rest, deps, io);
    }
    if (command === "decline") {
      return await handleDecision("decline", "declined", rest, deps, io);
    }
    throw new InvalidArgumentsError();
  } catch (error) {
    writeJson(io.stderr, {
      ok: false,
      code: error instanceof InvalidArgumentsError ? "invalid_arguments" : "operation_failed",
    });
    return error instanceof InvalidArgumentsError ? 2 : 1;
  }
}

interface LoadedCliDependencies {
  dependencies: PilotApplicationsCliDependencies;
  close(): Promise<void>;
}

export async function runPilotApplicationsExecutable(
  args: readonly string[],
  load: () => Promise<LoadedCliDependencies>,
  io: PilotApplicationsCliIo,
): Promise<number> {
  let loaded: LoadedCliDependencies | undefined;
  let exitCode = 1;
  try {
    loaded = await load();
    exitCode = await runPilotApplicationsCli(args, loaded.dependencies, io);
  } catch {
    writeJson(io.stderr, { ok: false, code: "operation_failed" });
  } finally {
    if (loaded) {
      try {
        await loaded.close();
      } catch {
        writeJson(io.stderr, { ok: false, code: "close_failed" });
        exitCode = 1;
      }
    }
  }
  return exitCode;
}

const loadRuntimeDependencies = async (): Promise<LoadedCliDependencies> => {
  const applications = await import("../lib/server/applications");
  const database = await import("../lib/server/db");
  return {
    dependencies: {
      listApplicationSummaries: applications.listApplicationSummaries,
      exportApplicationAggregate: applications.exportApplicationAggregate,
      redactApplication: applications.redactApplication,
      listSafeRetentionCandidates: applications.listSafeRetentionCandidates,
      redactEligibleRetentionCandidate:
        applications.redactEligibleRetentionCandidate,
      transitionApplication: applications.transitionApplication,
    },
    close: database.closeDatabase,
  };
};

const defaultIo: PilotApplicationsCliIo = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value),
};

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  void runPilotApplicationsExecutable(
    process.argv.slice(2),
    loadRuntimeDependencies,
    defaultIo,
  ).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
