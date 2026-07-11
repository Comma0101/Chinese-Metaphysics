# Zhiji — What's Next Roadmap

**Date:** 2026-07-11 · **Author:** Claude/Fable (UI owner) · **Status:** approved (founder, chat)
**Grounded in:** the research corpus (executive memo, market synthesis, customer-language bank, validation plan, risk register, competitor matrix) and the frozen pilot contract `lib/contracts/pilot.ts`.

## 1 · Strategic frame (non-negotiable)

Validation is **behavior-gated**, and **payment is correctly closed**. Nothing here re-opens it. The research requires 30 completed full-price cases through hard thresholds before platform engineering:

- visitor→lead ≥8%, qualified-lead→deposit ≥20%, deposit→core ≥45%
- US$388 acceptance ≥50%, refund+chargeback ≤5%, delivery labor ≤3.5h
- qualified referral ≥20%, 30-day participation ≥70%, **zero uncontained safety failures**

None of it can start until the **hard gates** clear: operating-location/licensing (the LA issue flagged in the risk register), processor underwriting, approved claims, privacy/terms/refunds, and safety/crisis handling. "What's next" is therefore the work that advances validation *without* needing payment.

## 2 · Method & positioning (confirmed aligned)

- Category: **私人中国命理咨询 · 以八字为主** / Private Chinese metaphysics consultation, BaZi-led.
- **BaZi is primary; 紫微斗数 (Zi Wei Dou Shu) is included only when birth-time confidence and the question make it useful.** The applicant never selects a method — chosen post-acceptance. Live copy already reflects this.
- Fully **asynchronous written** delivery: written decision brief → one consolidated written follow-up ≤14 days → written 30/90-day reviews. No live sessions ever.
- **Brand accountability, not a named master:** no real name/photo/persona; every case carries `知几案例审核 · ZJ-R01 · Method v1.0 · review date · revision history`.

## 3 · The competitive wedge (from the 47-competitor matrix)

Premium human readers charge US$298–1,200+; AI products US$10–100/yr; marketplaces US$5–80. **No sampled competitor combines** documented calibration + bounded *included* follow-up + case provenance + delayed written review + no-remedy firewall + bilingual delivery. Each competitor gives one rule, already absorbed:

| Competitor | Lesson encoded |
|---|---|
| Master Sean Chan ($588) | Compete on documented calibration + included follow-up + outcome review, not design/AI prose |
| Joey Yap (principal/associate ambiguity) | Always identify the responsible reviewer (→ ZJ-R01, not a name) |
| Imperial Harvest (product-sale conflict) | Explicit no-object / no-affiliate pledge |
| Keen (minute-burn) | Fixed scope + price; never monetize anxiety |
| Fiverr (templated output) | Don't compete on page count or turnaround |
| FateTell (commodity AI) | Human accountability + outcome memory must be *real* |
| 测测 (companion drift) | Stay private, episodic, non-companion |

Price $388–488 is mid-ladder but **unvalidated** — a test cell, not a fact.

## 4 · Where we are

- **Frontend:** premium visual system (world, paper↔lacquer, monuments, tablets, 判读书), the pilot qualification funnel wired to the frozen contract (no birth data at intake, UUID idempotency, access-code header, read-only status page), blind test retired, newsletter fail-closed, sample labeled illustrative. typecheck 0 · build 0 · tests 179/0-fail.
- **Backend (Codex):** Supabase repo, webhook-authoritative payment state, notification outbox, founder CLI for qualify/withdraw/redact/retain. Payment gate `PAID_PILOT_ENABLED=false`.

## 5 · Verified gap map

| # | Gap | Blocks | Owner |
|---|---|---|---|
| 1 | No `/privacy` `/terms` `/deposit-policy` pages — acknowledgements cite versioned docs that 404 | Launch gate + Phase-2 | Claude (draft) + counsel (legal text) |
| 2 | No method/calibration + software-disclosure page | "ChatGPT does this" objection; compliance | Claude (structure) + founder (method facts) |
| 3 | No no-remedy / no-affiliate pledge page | Category trust scar; differentiation | Claude |
| 4 | Sample lacks full ZJ-R01 provenance block | Brand-accountability spec | Claude |
| 5 | No analytics → Phase-2's core metric unmeasurable; must be privacy-safe (no IP/fingerprint) | Phase 2 | Claude |
| 6 | No category-label A/B mechanism (3 label variants) | Phase 2 message test | Claude |
| 7 | 3D is pure luopan; 紫微 visually invisible under new brand | minor polish | Claude |
| — | Operating-location legal review, processor underwriting, 40 interviews, method spec | Everything | Founder + counsel + Codex |

## 6 · Sequenced tracks (mapped to research phases)

### Track A — Trust & compliance content layer  ← **approved, building now**
Maps to Phase-0 (safety gate) prerequisites + Phase-2 trust modules. All in UI ownership; touches no payment.
1. `/method` — calibration explained, deterministic-calculation + software-disclosure honest statement, BaZi-primary/Zi-Wei-when-useful, versioned `Method v1.0`.
2. `/promise` — no-remedy, no-object, no-affiliate, no-fear, client-agency pledge.
3. `/privacy`, `/terms`, `/deposit-policy` — page shells with product-true plain-language sections; legally-operative clauses marked **`DRAFT — pending counsel`**; wire the application acknowledgements to link them.
4. Sample provenance block: `知几案例审核 · ZJ-R01 · Method v1.0 · 审核日期 · 版本 v1 · 更正记录`.
5. Footer/nav links to the new pages.

### Track B — Measurement
Privacy-safe, cookieless, no-IP analytics (event: relevant-visit → qualified-intake-complete → deposit-start) + the 3 category-label variants behind a query flag. Enables Phase-2 endpoints.

### Track C — Founder/counsel artifacts (non-code)
40-question interview guide (per Phase-1 segments), a claims→evidence file (every public claim mapped to its basis) for legal review, and a method-spec skeleton for founder/Codex.

### Track D — Post-gate conversion & hand-feel
Only after gates clear and cases run: form ritual-fill, commitment slip, folded 问答 FAQ, luopan pointer response, hover craft, motion variety. **Held** — do not build against an unproven offer.

### Track E — Platform (explicitly deferred by the engineering gates)
Client dashboard (≥20 clients request it), automated charting (after 30 cases stabilize method), subscription (100 cases + healthy repeat), native app, marketplace. **Do not build.**

## 7 · What NOT to build (research-mandated)
Subscription, daily oracle, AI-master persona, public feed/streak/luck-score/countdown, native app, marketplace, mainland launch, health/legal/immigration/investment/fertility advice, any live/call/chat feature, email capture without the consent workflow.

## 8 · Definition of done for Track A
All five pages render zh+en, mobile 390 clean, in the Paper & Lacquer system; acknowledgements link to real pages; legal text visibly marked draft; provenance block on the sample; typecheck 0, build 0, tests pass; nothing implies payment is open or a claim is validated.
