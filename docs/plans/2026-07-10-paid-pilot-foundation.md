# Zhiji Paid-Pilot Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the unsafe JSON/redirect payment flow with a research-aligned, commercially gated Supabase application and Stripe deposit lifecycle.

**Architecture:** Next.js route handlers call small pure domain functions and a server-only Postgres repository. Stripe is fixed-price and webhook-authoritative; Resend notifications are retryable and contain no sensitive narrative. Claude owns the frontend adaptation against a frozen shared TypeScript contract.

**Tech Stack:** Next.js 14, TypeScript, Node `node:test`, `tsx`, `postgres`, Supabase Postgres, Stripe, Resend HTTP API.

---

### Task 1: Test Harness and Frozen Pilot Contract

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/contracts/pilot.ts`
- Create: `tests/qualification.test.ts`
- Create: `lib/server/qualification.ts`

**Steps:**

1. Add `tsx` as the only test dependency and add `test` and `typecheck` scripts.
2. Write failing tests for valid US/Canada applicants and for minors, outside geography, later/unsure decisions, inability to consider US$388, missing acknowledgements, crisis/restricted topics, and third-party data.
3. Run the focused test and confirm failure because `qualifyApplication` does not exist.
4. Define the exact request/response types and version constants in `lib/contracts/pilot.ts`.
5. Implement the smallest pure parser/qualification function. It must reject unknown keys that attempt to send `amount`, `tierId`, `birthDate`, `birthTime`, `birthCity`, `question`, or payment state.
6. Run the focused test, full test suite, and typecheck.

### Task 2: Supabase Schema and Repository

**Files:**
- Create: `supabase/migrations/202607100001_paid_pilot.sql`
- Create: `lib/server/db.ts`
- Create: `lib/server/applications.ts`
- Create: `tests/application-state.test.ts`
- Create: `tests/database.integration.test.ts`

**Steps:**

1. Write failing state-machine tests for allowed transitions, forbidden transitions, duplicate Stripe events, and redaction.
2. Run them and confirm the domain/repository functions are missing.
3. Add SQL tables for `pilot_applications`, `application_consents`, `application_events`, `stripe_events`, `notification_attempts`, and `subscribers`, with constraints and indexes.
4. Add the 90-day retention deadline for unpaid/declined records and a transactional database function for webhook event application if needed.
5. Implement one lazy server-only Postgres client and repository functions; never connect during module import.
6. Keep database integration tests opt-in through `TEST_DATABASE_URL` and isolate/clean their records.
7. Run state tests, optional database tests when configured, and typecheck.

### Task 3: Gated Application and Fixed Checkout API

**Files:**
- Modify: `app/api/checkout/route.ts`
- Create: `app/api/checkout/status/route.ts`
- Create: `lib/server/config.ts`
- Create: `lib/server/payments.ts`
- Create: `tests/checkout.test.ts`
- Modify: `app/api/free/route.ts`

**Steps:**

1. Write failing tests proving the pilot is closed by default, client price/tier input is rejected, the amount is always 4,900 USD cents, only configured site URLs are used, and status reads never mutate state.
2. Run the focused test and verify the expected failures.
3. Implement typed environment parsing with `PAID_PILOT_ENABLED=false` as the default and configured geography allowlists.
4. Replace the checkout route so it validates/qualifies, persists consent versions, and creates Stripe Checkout only when the commercial gate is enabled.
5. Include only application/cohort identifiers in Stripe metadata.
6. Add the read-only status route.
7. Change the old free birth-data endpoint to return a clear retired/disabled response and never persist submitted data.
8. Run checkout tests, full tests, and typecheck.

### Task 4: Webhook-Authoritative Payments

**Files:**
- Create: `app/api/stripe/webhook/route.ts`
- Modify: `lib/server/payments.ts`
- Create: `tests/webhook.test.ts`

**Steps:**

1. Write failing tests for invalid signatures, valid `checkout.session.completed`, duplicate event delivery, refund transition, missing/unknown application metadata, and notification retry eligibility.
2. Run the focused test and confirm failure for missing handlers.
3. Implement raw-body signature verification and normalize only the supported Stripe events.
4. Apply the event and application transition atomically; duplicates return success without a second transition.
5. Ensure no redirect or status route can mark an application paid.
6. Run webhook tests, full tests, and typecheck.

### Task 5: Minimal Resend Notifications

**Files:**
- Create: `lib/server/notifications.ts`
- Create: `tests/notifications.test.ts`
- Modify: `app/api/stripe/webhook/route.ts`
- Modify: `.env.local.example`

**Steps:**

1. Write failing tests proving founder/client messages contain case ID, state, amount, and next step but never birth/question/narrative fields.
2. Write a failing retry test: payment persists even if email fails, the webhook returns retryable failure, and the same event can attempt unsent notification again without a second payment transition.
3. Implement Resend through server-side `fetch`; record each attempt and an idempotency key based on event ID and recipient role.
4. Require notification configuration when `PAID_PILOT_ENABLED=true`; allow explicit local/test no-send mode.
5. Document Resend as a processor in the environment/data-flow notes.
6. Run notification tests, full tests, and typecheck.

### Task 6: Founder Operations and Retention

**Files:**
- Create: `scripts/pilot-applications.ts`
- Create: `tests/founder-operations.test.ts`
- Modify: `package.json`

**Steps:**

1. Write failing tests for list summaries, subject export, qualification/decline reason logging, redaction, and retention candidate selection.
2. Run the focused test and confirm missing operations.
3. Implement CLI commands that require direct server credentials and print no sensitive fields for list output.
4. Export one subject's complete application/consent/lifecycle data to stdout only on explicit ID.
5. Redact personal fields while retaining minimum payment/audit references and append a redaction event.
6. Add a retention command that selects or redacts expired unpaid/declined applications; default to dry-run and require `--apply` for mutation.
7. Run operation tests, full tests, and typecheck.

### Task 7: Newsletter Persistence and Remove JSON Production Store

**Files:**
- Modify: `app/api/subscribe/route.ts`
- Modify: `lib/store.ts`
- Create: `tests/subscribe.test.ts`
- Modify: `README.md`

**Steps:**

1. Write failing tests for valid subscription, invalid email, duplicate idempotency, and separate optional marketing consent.
2. Run the focused test and confirm failure against the old JSON store.
3. Persist subscribers in Postgres with normalized email and conflict-safe insertion.
4. Remove all paid/free/subscriber filesystem persistence. Delete `lib/store.ts` if no imports remain.
5. Update the README to describe the research-aligned pilot, Supabase migration, commercial kill switch, Stripe webhook, Resend, and local verification.
6. Run full tests, `npm run typecheck`, and `npm run build`.

### Task 8: Claude/Fable Frontend Integration

**Files:**
- Follow: `docs/plans/2026-07-10-paid-pilot-foundation-claude-mission.md`
- Read-only contract: `lib/contracts/pilot.ts`

**Steps:**

1. Give Claude/Fable the mission file only after Task 1 freezes the contract.
2. Claude modifies only the listed UI/content files and runs typecheck/build.
3. Codex reviews the diff for contract compliance, truthful sample labeling, accessible states, and removal of birth/question/tier submission.
4. Resolve any contract mismatch in the frontend; do not weaken backend validation to fit stale UI.

### Task 9: Final Verification and Launch-Gate Documentation

**Files:**
- Create: `docs/operations/paid-pilot-launch-gates.md`
- Modify: `.env.local.example`
- Modify: `README.md`

**Steps:**

1. Run `npm test` and record the complete passing output.
2. Run `npm run typecheck` and confirm zero errors.
3. Run `npm run build` and confirm production compilation.
4. Inspect all API routes for JSON persistence, client-controlled price/status/origin, sensitive logs, and redirect-based payment mutation.
5. Document all still-blocking human gates: counsel/location, processor approval, exact calibration-refund policy, privacy/terms, crisis script, practitioner biography, Supabase/Resend configuration, and Stripe webhook registration.
6. Keep `PAID_PILOT_ENABLED=false`; code completion is not commercial clearance.

