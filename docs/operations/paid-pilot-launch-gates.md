# Paid-pilot launch gates

**Status:** closed. `PAID_PILOT_ENABLED` must remain `false` until every
required gate below has a named owner, dated evidence, and an explicit pass.
Passing the automated test suite is necessary but is not commercial clearance.

## Blocking human decisions

| Gate | Evidence required before enabling payment | Owner | Current state |
|---|---|---|---|
| Operating location and licensing | Written counsel conclusion covering the actual entity, practitioner location, remote customer locations, marketing copy, and local fortune-telling/licensing rules. Los Angeles requires specific review. | Founder + counsel | **Blocked** |
| Payment processor | Written approval from Stripe for the accurate BaZi consultation business description, live account, payout country, refund model, and dispute handling. | Founder + finance | **Blocked** |
| Claims and scope | Approved Chinese and English pages, intake acknowledgements, practitioner script, refusal language, and sample labeling. No accuracy/science/guaranteed-outcome, fear, remedy, medical, legal/immigration, financial/investment, fertility, or deterministic relationship claims. | Founder + counsel | **Blocked** |
| Deposit and refund policy | Exact, observable calibration-fit rule defined before intake; US$49 is credited to the US$388 core or refunded under that rule. Terms must explain timing, cancellation, non-fit, delivery, complaints, and chargebacks. | Founder + counsel | **Blocked** |
| Privacy and data rights | Final data map, privacy notice, processor list and contracts, cross-border analysis, retention basis, access/correction/export/redaction procedure, backup policy, incident plan, and no-model-training default. | Privacy owner + counsel | **Blocked** |
| Safety and crisis handling | Adults-only screen, restricted-topic taxonomy, localized crisis/referral resources, same-crisis cooling-off rule, refusal scripts, incident log, and passed practitioner role-play. | Practitioner + trust/safety owner | **Blocked** |
| Brand accountability and review governance | Public method/accountability disclosure; stable reviewer-role IDs; a private internal record of who reviewed each case; documented competency and method approval; human-review and correction audit trail; no fabricated public persona, credential, lineage, testimonial, or affiliation. | Founder + operations | **Blocked** |
| Production infrastructure | U.S.-region Supabase project, transaction-pooler URL, migrations applied, least-privilege access, MFA, backup/restore settings, and a successful isolated database integration run. | Engineering | **Blocked** |
| Stripe lifecycle | Live webhook registered for the supported events, signing secret installed, fixed US$49 Checkout confirmed, refund/dispute test evidence retained, and no browser route able to mark payment. | Engineering + finance | **Blocked** |
| Transactional email | Resend domain and sender verified, processor terms reviewed, founder/support recipients configured, cron reconciliation scheduled and authenticated, delivery/retry tested, and retention reflected in the privacy notice. | Engineering + privacy owner | **Blocked** |
| Marketing email | Keep `NEWSLETTER_ENABLED=false` and send no marketing email until explicit consent history, one-click unsubscribe, re-consent semantics, suppression enforcement, and a reviewed mailing runbook are implemented. This does not block transactional case email or the core pilot. | Growth + privacy owner | **Deferred / closed** |
| Edge abuse controls | Vercel WAF/rate limits for `/api/checkout`, `/api/checkout/status`, `/api/stripe/webhook`, and `/api/cron/notifications`; alerting and safe request correlation verified. Do not add IP/device storage to the application database. | Engineering | **Blocked** |
| Operational rehearsal | Founder can list, qualify/decline, inspect one sensitive case, withdraw, redact, run retention, reconcile notification failures, and follow the payment/refund incident path from the documented CLI/runbooks. | Founder + engineering | **Blocked** |

## Required production configuration

The application must fail closed when any required value is absent or invalid.
Secrets remain server-only.

- `PAID_PILOT_ENABLED=false` until the final approval step.
- `SUPABASE_DATABASE_URL` uses the production transaction pooler.
- `PILOT_ALLOWED_LOCATIONS` contains only counsel-approved city/region pairs.
- `PILOT_ACCESS_CODE_HASH` is the SHA-256 digest of a private invite code.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` belong to the approved live
  account and webhook endpoint.
- `NEXT_PUBLIC_SITE_URL` is the canonical HTTPS origin. Checkout does not trust
  the request `Origin` header.
- `NOTIFICATION_MODE=send`, with valid `RESEND_API_KEY`, verified
  `RESEND_FROM_EMAIL`, `FOUNDER_NOTIFICATION_EMAIL`, and `SUPPORT_EMAIL`.
- `CRON_SECRET` is a high-entropy scheduler secret of at least 16 characters.

## Engineering verification

Run these against the exact release candidate:

```sh
npm test
npm run typecheck
npm run build
```

Run the opt-in database tests against an isolated, migrated Postgres database:

```sh
TEST_DATABASE_URL='postgres://...' npm test
```

Then manually verify:

1. the browser application payload matches `PilotApplicationRequest` exactly;
2. no birth data, exact decision narrative, third-party history, tier, price, or
   payment state is accepted before qualification;
3. the commercial gate returns before reading the body when disabled;
4. Stripe webhook signature verification is exact-byte and webhook-only payment
   mutation remains true;
5. notification failures never roll back payment and retries send the frozen
   minimal payload only;
6. all API routes are free of filesystem/JSON persistence and sensitive logs;
7. the success page is read-only and treats `paid`, `pending`, `refunded`,
   `not_found`, and `status_unavailable` honestly;
8. the 判读书 is labeled `演示样例 / Illustrative sample` unless a real case and
   recorded publication consent exist;
9. Chinese and English desktop/mobile flows pass keyboard, focus, error, and
   reduced-motion checks.

## Final enablement

After every row above is marked passed, record the decision date, approvers,
release commit, approved location list, processor confirmation, policy versions,
and rollback owner. Enable `PAID_PILOT_ENABLED=true` in one controlled production
deployment, complete one invited low-risk live transaction, verify the webhook,
outbox, founder CLI, client notice, refund path, and redaction path, then decide
whether to admit the next applicant.

If any gate regresses, set `PAID_PILOT_ENABLED=false` first. Do not attempt to
repair a legal, safety, processor, or privacy failure through copy changes alone.
