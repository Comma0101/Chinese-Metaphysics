# Claude/Fable Mission — Paid-Pilot Frontend Integration

## Objective

Adapt the existing premium UI and new 判读书 sample to the frozen research-aligned pilot contract. Preserve the visual system; remove unsafe data collection and unimplemented promises.

## Required Workflow

Use `superpowers:executing-plans`. Read:

- `docs/superpowers/specs/2026-07-10-paid-pilot-foundation-design.md`
- `lib/contracts/pilot.ts`
- `docs/research/2026-07-10-executive-decision-memo.md`
- `docs/research/2026-07-10-risk-register.md`
- `docs/research/2026-07-10-validation-plan.md`

## Exclusive File Ownership

You may edit only:

- `app/ask/page.tsx`
- `app/success/page.tsx`
- `app/cancel/page.tsx`
- `app/free/page.tsx`
- `app/page.tsx`
- `app/reading/sample/page.tsx`
- `lib/content.ts`
- `lib/tiers.ts` as presentation-only
- `components/Newsletter.tsx`
- new client-side form/status components under `components/`
- `app/globals.css`

Do not edit API routes, server modules, migrations, scripts, tests, package files, environment files, or `lib/contracts/pilot.ts`. Do not add dependencies.

## Required Changes

1. Replace the birth/question/tier purchase form with the exact qualification fields exported by `lib/contracts/pilot.ts`.
2. Do not collect name, birth data, exact question, medical/legal/financial facts, or third-party history.
3. Present one path: US$49 credited/refundable calibration deposit, followed by a disclosed US$388 founding core if the case is a fit.
4. Explain that the deposit is not a standalone reading and that payment remains unavailable while the pilot gate is closed.
5. Handle typed API states for validation failure, declined/not-current-fit, pilot closed, checkout unavailable, checkout created, payment pending, paid, and refunded.
6. Make the success page read-only. It may poll the status endpoint; it must never import Stripe or mutate payment state.
7. Retire or convert the free blind-test page so it collects no birth or life-history data.
8. Preserve the 判读书 visual design and printable layout.
9. Unless the founder supplies a real case and recorded consent, label it `演示样例 / Illustrative sample`, not a real, anonymized, or consented client case.
10. Do not imply that a canonical chart method is already production-tested.
11. Remove or qualify claims that are not operational yet: live archive updates, guaranteed email delivery, absolute confidentiality, scientific validation, accuracy guarantees, and subjective future-outcome refunds.
12. Preserve the research-backed promises that are operational commitments: named human review, assumptions/uncertainty, no-remedy stance, client agency, bounded clarification, and planned 30/90-day review.
13. Remove the active newsletter signup form and any “subscribed” success promise from the launch UI. Newsletter collection remains fail-closed until an immutable consent/unsubscribe/re-consent workflow and actual mailing operations exist. Do not replace it with a bundled service-consent checkbox or another email-capture shortcut.

## Required Request Headers

- Checkout requests must send `Content-Type: application/json`.
- Each new submission generates one UUID `Idempotency-Key`; retain and reuse that exact key for network retries of the same payload. Never reuse it after the applicant changes any field.
- Invited applicants supply the pilot access code, sent as `X-Pilot-Access-Code`. Do not hardcode the code, its hash, or a public environment variable into the client bundle, URL, analytics, or logs.
- Treat `access_denied`, `checkout_expired`, `status_unavailable`, HTTP 409 idempotency conflicts, HTTP 413 body limits, and HTTP 415 content-type failures as explicit safe states. An expired or completed Checkout session is never returned as a usable payment URL. The status endpoint no longer returns an application UUID.

Vercel WAF/rate limiting for both `/api/checkout` and `/api/checkout/status` remains a human launch gate. The application does not collect or store IP addresses as a substitute.

## Verification

- Run `npm run typecheck`.
- Run `npm run build`.
- Check Chinese and English flows at mobile and desktop widths.
- Confirm the browser payload matches `PilotApplicationRequest` exactly and contains no forbidden fields.
- Report every edited file and any contract ambiguity; do not resolve ambiguity by editing backend code.
