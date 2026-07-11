# Paid-pilot application operations

This is the founder's temporary operator surface for the 30-case concierge
validation sprint. It intentionally avoids a browser console, shared admin
token, customer accounts, and dashboard scope before those products have been
validated.

The CLI connects directly to Supabase Postgres through
`SUPABASE_DATABASE_URL`. Run it only from a trusted, encrypted workstation with
an environment that is authorized for the production database.

## Security model

- `list`, retention previews, redaction results, and withdrawal results contain
  only application IDs, lifecycle states, timestamps, and aggregate notification
  health. They do not load or print email, location, decision, attribution,
  processor references, fingerprints, or notification payloads.
- Every mutation is a dry run unless `--apply` is present.
- Mutation reasons come from a small command-specific allowlist. A merely
  code-shaped value is rejected, preventing names, phone-like identifiers, case
  numbers, emails, and free-form notes from entering durable audit events.
- The CLI records mutations as actor `founder_cli` through the existing audited
  state-transition/redaction repositories.
- Errors are reduced to stable codes. Database messages and customer data are
  never copied into normal CLI output.
- No command sends email or makes a network call other than the database
  connection.

Do not run these commands in CI, a shared shell, a screen recording, or a
third-party terminal session. Shell command lines may be retained in history.

## Setup

Use the Supabase transaction-pooler connection string already required by the
application:

```sh
export SUPABASE_DATABASE_URL='postgres://...'
```

The process opens one connection and closes it after every invocation, including
failed operations.

## Help and approved audit reasons

Print the authoritative mutation vocabulary without querying the database:

```sh
npm run pilot:applications -- help
```

| Command | Accepted reason codes |
|---|---|
| `qualify` | `manual_review_passed` |
| `decline` | `eligibility_not_met`, `scope_not_supported` |
| `withdraw` | `client_requested`, `operator_cancelled` |
| `redact` | `client_requested`, `privacy_request` |
| `retention` | Internal fixed code `retention_expired`; no `--reason` argument |

Reason codes are not interchangeable across commands. If none describes the
operation, stop and update the reviewed vocabulary through code and tests; do
not encode personal data into a new ad hoc value.

## Safe application list

```sh
npm run pilot:applications -- list
npm run pilot:applications -- list --limit 25
```

The output is a JSON array. Notification health contains only `pending`,
`failed`, and `sent` counts. Use this to notice orders and delivery problems;
use the notification runbook to diagnose delivery.

## Sensitive customer export

Export is the sole intentionally PII-bearing command. It refuses before querying
the database unless the exact confirmation flag is present:

```sh
npm run pilot:applications -- export 11111111-1111-4111-8111-111111111111 \
  --confirm-sensitive-export
```

The output envelope includes `"sensitive": true`. It writes the aggregate only
to stdout and never creates a file. Treat stdout as sensitive: do not pipe it to
logs, paste it into chat, or redirect it to an unencrypted/shared filesystem.
If a client needs a data-access copy, establish the client's identity and an
approved secure delivery path before running the command.

## Privacy-safe redaction

Preview first:

```sh
npm run pilot:applications -- redact 11111111-1111-4111-8111-111111111111 \
  --reason privacy_request
```

Apply only after verifying the application ID and request:

```sh
npm run pilot:applications -- redact 11111111-1111-4111-8111-111111111111 \
  --reason privacy_request --apply
```

Redaction clears application identity/intake fields and frozen notification
payload/source snapshots, stops unsent notification work, rotates submission
identifiers, and records an audit event. It preserves the minimum transaction
and event references currently needed for payment reconciliation and audit.
Redaction is not physical erasure from existing database backups. Backup expiry,
restore controls, and any legal retention requirement need a separately approved
policy.

## Retention sweep

The research-derived operating assumption is to remove unpaid, declined,
refunded, withdrawn, or otherwise eligible application data after its recorded
retention deadline. This is a proposed policy pending legal/privacy review, not
a universal legal rule.

Preview all due candidates as of now:

```sh
npm run pilot:applications -- retention
```

Preview a reproducible cutoff and smaller batch:

```sh
npm run pilot:applications -- retention \
  --before 2026-10-10T00:00:00.000Z --limit 25
```

Apply the same reviewed batch:

```sh
npm run pilot:applications -- retention \
  --before 2026-10-10T00:00:00.000Z --limit 25 --apply
```

The maximum batch is 100. Each candidate is processed independently. A partial
failure returns a nonzero exit code and a safe per-ID result; rerun the dry run
to see what remains. Never treat a failed item as redacted. On apply, each row
is locked and its retention deadline and eligible non-paid state are rechecked
inside the redaction transaction. If a webhook/payment changed the case after
the preview, the item is returned as `retention_ineligible` and is not redacted.

## Client withdrawal

Withdrawal changes lifecycle state but does not redact the record. Preview and
apply it separately:

```sh
npm run pilot:applications -- withdraw 11111111-1111-4111-8111-111111111111 \
  --reason client_requested

npm run pilot:applications -- withdraw 11111111-1111-4111-8111-111111111111 \
  --reason client_requested --apply
```

Use redaction as a separate, explicit action when a verified deletion request or
approved retention policy requires it.

## Founder qualification decisions

Qualification decisions use the same dry-run/apply discipline and audited,
non-sensitive reason codes. `qualify` is valid only from `submitted`. `decline`
is valid from `submitted` or `qualified`. The database-backed lifecycle rejects
all other state changes; the CLI reports only `operation_failed`, never the row
contents or database error.

```sh
npm run pilot:applications -- qualify 11111111-1111-4111-8111-111111111111 \
  --reason manual_review_passed

npm run pilot:applications -- qualify 11111111-1111-4111-8111-111111111111 \
  --reason manual_review_passed --apply

npm run pilot:applications -- decline 11111111-1111-4111-8111-111111111111 \
  --reason scope_not_supported

npm run pilot:applications -- decline 11111111-1111-4111-8111-111111111111 \
  --reason scope_not_supported --apply
```

These commands require the exact application UUID and one reason shown by the
help command. The CLI rejects every other value.

## Supabase dashboard alternative

For exceptional investigation, an authorized operator may inspect a single row
in the Supabase dashboard. This is less safe than `list` because the dashboard
can expose customer data and broad tables. Use least-privilege access, avoid CSV
downloads, do not paste query results into tickets/chat, and document any manual
mutation. Normal state changes should go through this CLI so audit rules remain
consistent.

Do not deploy a token-in-URL or shared-token web console as a shortcut. A future
practitioner workspace needs proper identity, MFA, authorization, audit logs,
session expiry, and privacy review.

## Stable exit behavior

- Exit `0`: requested preview/read completed or every mutation succeeded.
- Exit `1`: safe operational failure, not found, partial retention failure, or
  database-close failure.
- Exit `2`: invalid arguments or missing sensitive-export confirmation.

Only stable codes such as `invalid_arguments`, `operation_failed`, `not_found`,
or `close_failed` appear on stderr. Investigate infrastructure using protected
database/provider telemetry, never by weakening CLI error redaction.
