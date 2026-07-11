# Zhiji Paid-Pilot Foundation Design

**Date:** 2026-07-10  
**Status:** Approved  
**Deployment:** Vercel + Supabase Postgres (U.S. region) + Stripe + Resend

> **Superseded in part — 2026-07-10:** The named-practitioner assumption below is replaced by [`docs/plans/2026-07-10-brand-accountability-design.md`](../../plans/2026-07-10-brand-accountability-design.md). Zhiji publishes no real name or personal photograph; every final interpretation still requires auditable substantive human review.

## Goal

Build the smallest safe operating foundation for Zhiji's 90-day concierge validation:

`qualified application -> fixed US$49 calibration deposit -> verified payment -> founder/client notification -> auditable case record`

The commercial path remains disabled until location/licensing, processor, claims, privacy, terms/refunds, and safety gates are cleared.

## Research Decisions Applied

- The initial customer is a category-aware or culturally close Chinese professional in North America with one decision due within 90 days and the ability to pay the US$388 core price.
- The US$49 amount is a credited/refundable calibration deposit, never a standalone reading.
- The current US$49/99/249 packages, free birth-data blind test, customer dashboard, subscription, mobile app, automated chart engine, autonomous AI reader, marketplace, and mainland launch are outside this slice.
- Qualification precedes birth data and detailed life history. The application collects no chart inputs and no narrative.
- The Stripe webhook is the sole payment-state writer. Browser redirects only read status.
- Zhiji records substantive human review through the case ID, stable reviewer-role ID, method version, review date, and revision history. Software use is disclosed and no case data is used for model training by default.
- Durable records and client rights are required now; a client account/archive UI is gated until at least 20 clients independently request it.
- The visual 判读书 is retained as an illustrative delivery prototype. It must not be described as a real consented case unless that evidence exists.

## Scope

### Build now

1. A versioned qualification contract and server-side rules.
2. Supabase migrations for applications, consent versions, lifecycle events, Stripe event idempotency, notification attempts, and newsletter subscribers.
3. A fixed-price checkout route gated by `PAID_PILOT_ENABLED=false` by default.
4. Signed, idempotent Stripe webhook handling for payment, refund, and chargeback-relevant lifecycle state.
5. Read-only checkout status.
6. Minimal Resend notifications with no sensitive narrative.
7. Founder CLI operations for list, export, qualify/decline, and privacy-safe redaction.
8. Ninety-day retention support for unpaid/declined records.
9. Tests for qualification, pricing, state transitions, idempotency, gate behavior, notification retry, export, and redaction.

### Defer

- Custom founder console and Supabase Auth UI.
- Client archive/account, persistent magic links, and dashboards.
- Birth-data normalization and deterministic chart engine.
- Automated report authoring, scheduling, and 30/90-day orchestration.
- Native app, subscription, marketplace, and mainland distribution.

## Application Contract

The browser may submit only:

- `lang`: `zh | en`
- `email`
- `country`: `US | CA | OTHER`
- `region` and `city` for location gating
- `decisionType`: `career | relocation | founder | relationship | family | other`
- `decisionWindow`: `within_30_days | within_90_days | later | unsure`
- adult, core-price, framework, client-agency, professional-boundary, software-disclosure, privacy, terms, deposit-policy, and self-only-data acknowledgements
- optional marketing consent, kept separate from service consent
- bounded attribution fields: source, medium, campaign, referrer, and friend-graph classification

It never accepts a tier, amount, payment state, birth data, exact question, medical/legal/financial detail, or third-party history.

## Qualification

The server declines applications that are underage, outside the configured pilot geography, outside the 90-day decision window, unable to consider the US$388 core, missing any required acknowledgement, seeking restricted professional advice, in acute crisis, or containing third-party/minor data.

The commercial kill switch overrides qualification. When disabled, no Checkout session is created. Location allowlists remain configuration, so counsel can approve the actual operating and customer facts without a code change.

## Lifecycle

Internal states:

`submitted -> qualified | declined | safety_refused -> checkout_created -> deposit_paid -> deposit_refunded`

Any non-redacted state may transition to `withdrawn` or `redacted`. Every transition appends an event with timestamp, actor, reason code, and non-sensitive metadata. The current state is denormalized on the application for efficient reads.

## Payment

- Deposit amount is a server constant: 4,900 USD cents.
- Checkout URLs use only `NEXT_PUBLIC_SITE_URL`.
- Stripe metadata contains only the application ID and policy/cohort identifiers.
- The webhook verifies the raw body with `STRIPE_WEBHOOK_SECRET`.
- Stripe event IDs are unique in the database.
- Database changes occur in a transaction; webhook retries are safe.
- Refund handling records the event and updates the application without promising future-outcome accuracy.

## Notifications

Resend sends:

- founder application/deposit notifications containing case ID, state, timestamp, and non-sensitive cohort/location fields;
- client deposit confirmation containing case ID, amount, next step, and support address.

No birth data, question narrative, health/legal/financial information, or report attachment is emailed. Notification attempts and failures are recorded. Webhook retry can retry an unsent notification without reapplying payment state.

## Privacy and Rights

- Supabase stores durable records; there is no production JSON fallback.
- Consent policy versions and timestamps are immutable.
- Export returns the subject's application, consent, and lifecycle record.
- Redaction removes email and optional locality/attribution detail while retaining the minimum transaction and audit references required for accounting/dispute handling.
- Unpaid/declined applications receive a default 90-day deletion deadline.
- No IP/device fingerprint is stored.

## Operator Access

The first 30 cases use an audited server-side CLI and Supabase's authenticated project dashboard. There is no shared-token or token-in-URL console. A custom founder console requires proper MFA/RBAC and follows only when the operating workflow is stable.

## Frontend/Backend Ownership

### Codex owns

`app/api/**`, `lib/contracts/pilot.ts`, `lib/server/**`, `supabase/**`, `scripts/**`, tests, package/environment files, and backend documentation.

### Claude/Fable owns

`app/ask/page.tsx`, `app/success/page.tsx`, `app/cancel/page.tsx`, `app/free/page.tsx`, `app/page.tsx`, `app/reading/sample/page.tsx`, `lib/content.ts`, presentation-only `lib/tiers.ts`, client-side form/status components, and `app/globals.css`.

Claude consumes `lib/contracts/pilot.ts` read-only and does not add dependencies or edit backend files. Codex does not edit Claude-owned UI files while that mission is active.

## Verification

- Node test runner with TypeScript via `tsx`.
- TypeScript check with incremental output disabled.
- Next.js production build.
- Optional database integration tests run only with an isolated `TEST_DATABASE_URL`.
