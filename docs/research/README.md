# Zhiji Research Library

**Research cut-off:** 2026-07-10  
**Product decision:** Conditional go for a premium, human-accountable productized practice. Do not treat the current MVP as the finished product.

## Provenance

The CSV files under `data/` are verbatim exports supplied by the research agent. Their copied checksums are verified against the originals in `/home/comma/Downloads`.

The long-form Markdown exports were not available as local files. The dated Markdown documents in this directory are structured reconstructions of the research response supplied in conversation. They preserve the decisions, evidence boundaries, metrics, and important customer language, but they are not claimed to reproduce every sentence verbatim.

Files named `evidence_packet.*` in Downloads are unrelated Bimoism asylum documents and are intentionally excluded.

## Required Reading Order

1. [Executive decision memo](2026-07-10-executive-decision-memo.md)
2. [Canonical product-marketing context](../../.agents/product-marketing.md)
3. [Market and product synthesis](2026-07-10-market-product-synthesis.md)
4. [Customer-language bank](2026-07-10-customer-language.md)
5. [90-day validation plan](2026-07-10-validation-plan.md)
6. [Critical risk register](2026-07-10-risk-register.md)

## Original Data Exports

| Artifact | Purpose | Rows |
|---|---|---:|
| [Competitor matrix](data/competitor-matrix.csv) | 47 direct, adjacent, marketplace, app, and substitute competitors; 17 detailed teardowns | 47 |
| [Source evidence ledger](data/source-evidence-ledger.csv) | Claims, source URLs, evidence types, limitations, confidence, and product implications | 73 |
| [Market-sizing model](data/market-sizing-model.csv) | Reproducible top-down scenarios, sensitivities, and capacity-constrained SOM | 53 |

## Stable Product Decisions

- Zhiji uses brand accountability: no public real name, personal photograph, or invented practitioner persona. Every interpretation must receive substantive human review and carry a case ID, stable reviewer-role ID, method version, review date, and revision history. See the approved [brand-accountability design](../plans/2026-07-10-brand-accountability-design.md).
- The long-term goal is a full product: a premium client experience and secure practitioner operating system, not a generic consumer astrology application.
- Initial wedge: category-aware or culturally close Chinese professionals, approximately 28–45, in North America, facing one consequential decision within 90 days.
- Working category: **Private BaZi consultation for major life transitions / 私人八字咨询（重大人生节点）**.
- Approved method architecture: customers buy one decision case; BaZi is the default structural framework and Zi Wei Dou Shu may be included when birth-time confidence and the question make it useful. Exact schools and calculation rules still require a method specification.
- “Decision support” describes the benefit; it must not hide the BaZi mechanism or imply regulated professional advice.
- The initial service is fully asynchronous and written. It includes a human-reviewed written decision brief, one consolidated written follow-up submitted within 14 days about the original brief, versioned material corrections, and written 30/90-day reviews. It includes no meeting, call, live session, voice/video delivery, or other synchronous component. New decisions are outside the follow-up scope.
- Learn through a human-reviewed asynchronous written service, then productize deterministic calculation, secure case operations, provenance-bearing reports, bounded written follow-up, and written outcome review.
- Working price hypotheses are a US$49 credited/refundable calibration deposit, US$388 founding core, and US$488 target core. These are test cells, not validated prices.
- Price explanations must be based on written analysis, substantive human review, case provenance, bounded written follow-up, and delayed written review—not access time.
- No subscription, daily oracle, generic AI master, public feed, marketplace, native app, or mainland launch before explicit evidence gates.

## Evidence Discipline

- Population size is not product demand.
- Competitor list prices prove transactions and price ceilings, not Zhiji conversion or volume.
- Market-size outputs are low-confidence scenarios driven by behavioral assumptions.
- Public customer quotes show language and failure modes, not prevalence.
- Proposed validation thresholds are founder decision rules, not industry benchmarks.
- Legal, processor, privacy, tax, and platform conclusions must be rechecked against live primary sources and qualified specialists before action.
- Record facts, inferences, hypotheses, contradictions, dates, geographies, and denominators separately.

## Current Product Gap

The codebase now contains the Supabase/Postgres repository, webhook-authoritative payment state, durable notification outbox, and founder operations for qualification, withdrawal, redaction, and retention. Payment remains correctly closed. Before accepting real sensitive cases, the release environment still needs migrations and RLS verified against an isolated database, backup/restore and access controls, secure client delivery, the complete one-round written follow-up and written 30/90-day operating workflow, privacy/service terms, current legal and processor clearance, and an end-to-end rehearsal.

## Updating This Library

When research changes a strategic decision:

1. Add or update evidence in the source ledger.
2. Update the relevant dated synthesis or add a new dated memo.
3. Update `.agents/product-marketing.md` if ICP, positioning, pricing, proof, or goals changed.
4. Keep `AGENTS.md` pointers concise; do not paste the research corpus into agent instructions.
