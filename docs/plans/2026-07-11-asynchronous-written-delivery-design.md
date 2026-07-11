# Zhiji Asynchronous Written Delivery Design

**Decision date:** 2026-07-11  
**Status:** Approved by the founder

## Decision

Zhiji will not include a live meeting, call, video session, audio session, or other synchronous consultation in the initial product.

The complete service is asynchronous:

1. one structured decision intake;
2. one human-reviewed written decision brief;
3. defined written clarification limited to the original brief;
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

The primary deliverable is `书面决策判读`. The supporting service is `限定范围的书面澄清` followed by `30/90 天书面复盘`.

Do not use:

- 面谈
- 通话
- 语音解读
- 视频咨询
- 60 分钟咨询
- 一对一会面

### English

The primary deliverable is a `written decision brief`. The supporting service is `defined written clarification` followed by `written 30/90-day reviews`.

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
5. **Written clarification:** answer questions that clarify the original brief; new decisions and open-ended conversation remain out of scope.
6. **Written review:** record what changed at 30 and 90 days, including useful observations, misses, and revisions.

## Pricing Implication

The US$388 founding-cohort and US$488 target prices remain research hypotheses. Removing the live session changes delivery time and value composition, so neither price is treated as validated. Customer-facing price explanations must justify the written analysis, human review, provenance, clarification, and delayed review—not meeting time.

## Product and Safety Boundaries

- Do not add calendar booking, calling, video, voice, or meeting functionality.
- Do not replace the removed session with unlimited chat.
- Clarification is asynchronous, written, and limited to the delivered brief.
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
- Clarification and 30/90-day review remain bounded and written.
- Tests, typecheck, and production build pass.
