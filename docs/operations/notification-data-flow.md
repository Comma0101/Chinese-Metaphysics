# Transactional notification data flow

**Status:** operational design for the paid-pilot backend. Provider terms,
retention, transfers, and the final privacy notice still require legal review
before accepting real customer data.

## Processor and purpose

Zhiji sends transactional payment and intake notices through Resend using
`POST https://api.resend.com/emails`. Resend is a service provider/processor for
these messages. It is not used for marketing, interpretation, case analysis, or
model training in this workflow.

The recipient email address is necessarily transmitted to Resend. The sender,
subject, plain-text body, and a non-PII idempotency key are also transmitted.
The Resend API key remains server-only and must never use a `NEXT_PUBLIC_*`
environment variable.

## Message fields

Founder notices may contain only immutable source-event facts captured when the
outbox row is created:

- Zhiji and the internal case/application ID;
- coarse event-time lifecycle state;
- the event amount and currency;
- founding cohort identifier;
- bounded payment event fact and timestamp;
- for intake notices only, coarse country and region (never city);
- a fixed next-step instruction to inspect the secure Supabase/CLI record.

Client deposit confirmation may contain only:

- Zhiji and the internal case/application ID;
- event-time `deposit_paid` state, amount, and currency;
- fixed next-step language and the support email address.

Messages contain no birth data, no client narrative or decision question, no
report or chart content, no city, and no Stripe checkout, payment-intent, or
dispute references. Provider response bodies and error messages are never
stored or logged.

## Delivery and idempotency

The database outbox is the long-term source of delivery state. Checkout commits
the application event and outbox row atomically; it does not wait for Resend.
Each source, notification kind, and recipient role is unique. Workers claim due
rows with `FOR UPDATE SKIP LOCKED` and a fresh lease token, so duplicate scheduler
invocations are safe. Stale leases are reclaimable, including a fifth attempt,
without incrementing the attempt count. Completion is fenced by row, attempt,
and lease token.

Before the first provider request, the worker freezes the exact sender,
recipient, subject, and plain-text body with a SHA-256 integrity hash. Later
retries use those stored bytes even if configuration or the application lifecycle
changes. Resend also receives a bounded hashed `Idempotency-Key` for its shorter
provider-side deduplication window. Retryable failures store only a bounded error
code. A successful response stores only Resend's bounded message ID.

`NOTIFICATION_MODE=disabled` is an explicit no-send mode for local or test use.
It does not claim jobs, so pending work remains durable, and neither the webhook
nor cron endpoint reports actionable notification work as complete. A live paid
pilot requires `NOTIFICATION_MODE=send`, complete validated Resend configuration,
and a `CRON_SECRET` of at least 16 characters.

## Reconciliation scheduler

`GET /api/cron/notifications` requires the exact
`Authorization: Bearer <CRON_SECRET>` header and returns only safe delivery
counts. Configure an external or Vercel Cron schedule before launch. Vercel Cron
delivery is best effort and does not retry failed invocations; an invocation can
also be delayed, missed, or duplicated. The database outbox, row locks, lease
fencing, and provider idempotency make duplicates safe, while later runs reclaim
missed or stale work. Scheduling is therefore a launch gate, but no schedule is
committed in `vercel.json` yet.

Each reconciliation run claims at most 10 jobs. Delivery is sequential and each
provider request has a 10-second timeout, keeping the nominal batch well within
the five-minute lease. Configuration, database, and provider-worker exceptions
return a PII-free `503` with an `x-request-id`; logs contain only that correlation
ID and a bounded error code, never the underlying exception.

## Retention and review

Zhiji's application retention/redaction workflow controls the local outbox and
client address. Resend's own message content, recipient, log, backup, and
subprocessor retention policies must be confirmed and reflected in the privacy
notice and processor agreement. Cross-border transfer and deletion behavior
also need legal review before launch.
