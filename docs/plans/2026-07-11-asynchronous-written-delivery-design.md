# Zhiji Asynchronous Written Delivery Design

**Decision date:** 2026-07-11  
**Status:** Approved by the founder

## Decision

Zhiji will not include a live meeting, call, video session, audio session, or other synchronous consultation in the initial product.

The complete service is asynchronous:

1. one structured decision intake;
2. one human-reviewed written decision brief;
3. one consolidated written follow-up submitted within 14 days and limited to the original brief;
4. structured written review at 30 and 90 days.

This supersedes every earlier reference to a 60-minute meeting, private session, `面谈`, `通话`, or synchronous consultation.

## Why

- A live meeting conflicts with Zhiji's brand-accountability model by creating unnecessary expectations around a public personal identity.
- The primary paid artifact is the reasoning record, not access to a personality.
- Asynchronous delivery gives both sides time to distinguish facts, chart observations, interpretation, and action implications precisely.
- It produces a versioned record that can be corrected and reviewed later.
- It avoids scheduling overhead and reduces pressure toward open-ended emotional support or repeated reassurance.

## Customer Promise

### Chinese

The primary deliverable is `书面决策判读`. Within 14 days of delivery, the client may submit `一轮集中书面问题`; Zhiji responds once in writing and only about the original brief. This is followed by `30/90 天书面复盘`.

Do not use:

- 面谈
- 通话
- 语音解读
- 视频咨询
- 60 分钟咨询
- 一对一会面

### English

The primary deliverable is a `written decision brief`. Within 14 days of delivery, the client may submit `one consolidated written follow-up`; Zhiji responds once in writing and only about the original brief. This is followed by `written 30/90-day reviews`.

Do not promise a:

- live session;
- call;
- meeting;
- video consultation;
- 60-minute consultation;
- synchronous review.

`Private consultation` may continue to describe the broad category only where it cannot be mistaken for a scheduled live interaction. Deliverable descriptions must say explicitly that the service is written and asynchronous.

## Service Sequence

1. **Scope check:** confirm eligibility without collecting sensitive case details.
2. **Case assessment:** review the decision scope and whether the source data can support the case.
3. **Structured intake:** collect the accepted case's decision facts and required birth data under the published privacy terms.
4. **Written delivery:** provide a versioned, human-reviewed decision brief.
5. **Written follow-up:** the client may submit one consolidated set of questions within 14 days of delivery. Zhiji responds once in writing about the original brief. New decisions, additional readings, and open-ended conversation remain out of scope.
6. **Written review:** record what changed at 30 and 90 days, including useful observations, misses, and revisions.

Material factual or interpretive corrections are issued as a new version of the decision brief with the correction reason and date recorded. Corrections are part of report integrity; they do not create a new consultation or expand the one-follow-up boundary.

## Pricing Implication

The US$388 founding-cohort and US$488 target prices remain research hypotheses. Removing the live session changes delivery time and value composition, so neither price is treated as validated. Customer-facing price explanations must justify the written analysis, substantive human review, provenance, one consolidated written follow-up, and delayed written review—not meeting or access time.

## Product and Safety Boundaries

- Do not add calendar booking, calling, video, voice, or meeting functionality.
- Do not replace the removed session with unlimited chat.
- Follow-up is asynchronous and written: one consolidated submission within 14 days, followed by one written response limited to the delivered brief.
- Material corrections are versioned with the correction reason and date.
- A new decision requires a separately scoped case.
- The final decision remains the client's.
- Restricted medical, mental-health, legal, immigration, investment, fertility, crisis, and third-party topics remain outside scope.

## Required Alignment

Update the following as one coherent change:

- homepage Chinese and English copy;
- service tiers and fee inclusions;
- process and scope descriptions;
- copy-integrity tests;
- canonical product-marketing context;
- research-library stable decisions;
- current operational documents that describe the initial service.

Dated research reports may preserve the earlier 60-minute recommendation as historical research, but must receive a visible superseding note if they are used as current operating guidance.

## Acceptance Criteria

- Public copy contains no promise of a meeting, call, live session, or 60-minute interaction.
- Chinese and English describe the same asynchronous written service.
- The written decision brief remains the primary paid artifact.
- The client receives one consolidated written follow-up within 14 days about the original brief; new decisions remain out of scope.
- Material corrections are versioned, and 30/90-day reviews remain written.
- Tests, typecheck, and production build pass.
