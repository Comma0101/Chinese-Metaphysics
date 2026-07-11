# Asynchronous Written Delivery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove every live-meeting promise and make Zhiji's initial service consistently asynchronous in Chinese, English, pricing, process copy, and canonical product documentation.

**Architecture:** Keep the existing content-driven Next.js structure. Enforce the delivery model through a copy-integrity contract, then update `lib/content.ts` and `lib/tiers.ts` as the public source of truth. Update canonical strategy documents and add superseding notes to dated research rather than rewriting the historical research conclusion.

**Tech Stack:** Next.js 14, TypeScript, Node test runner, bilingual content constants, Markdown product documentation.

---

### Task 1: Define the asynchronous-delivery copy contract

**Files:**
- Modify: `tests/copy-integrity.test.ts`

**Step 1: Write the failing test**

Import `PILOT_EXPLAINER` and assert that the complete public delivery copy:

```ts
const delivery = JSON.stringify({
  home: T,
  explainer: PILOT_EXPLAINER,
  guarantees: GUARANTEES,
  tiers: PILOT_PATH,
});

assert.match(delivery, /书面澄清/);
assert.match(delivery, /written clarification/i);
assert.match(delivery, /asynchronous|异步/);
assert.doesNotMatch(
  delivery,
  /面谈|通话|语音解读|视频咨询|60\s*分钟|60-minute|live session|private session|video consultation/i,
);
```

Update the existing homepage-deliverable assertions so they require `书面判读`, `书面澄清`, `written decision brief`, and `written clarification`, with no 60-minute requirement.

**Step 2: Run the test to verify it fails**

Run:

```bash
node --conditions=react-server --import tsx tests/copy-integrity.test.ts
```

Expected: FAIL because the current public copy still contains `面谈`, `60 分钟`, and `60-minute private consultation`.

**Step 3: Commit the failing contract**

```bash
git add zhiji/tests/copy-integrity.test.ts
git commit -m "test(zhiji): require asynchronous written delivery"
```

### Task 2: Replace synchronous public delivery copy

**Files:**
- Modify: `lib/content.ts`
- Modify: `lib/tiers.ts`
- Test: `tests/copy-integrity.test.ts`

**Step 1: Update the homepage deliverable**

Use these concepts consistently:

```ts
// Chinese
lead: "带来一件 90 天内要决定的事。你会收到一份经过人工审核的书面决策判读，并可在交付后就原文件提出限定范围的书面澄清。知几以八字为主；出生资料与问题适合时，按案结合紫微斗数。依据、假设与不确定性都会写清楚。"
proof: ["一项重大决定", "书面决策判读", "书面澄清 + 30/90 天复盘"]

// English
lead: "Bring one consequential decision you expect to make within 90 days. You receive a human-reviewed written decision brief, followed by defined written clarification on the delivered analysis. BaZi is the primary framework; Zi Wei Dou Shu may be included when the birth data and case support it. The reasoning, assumptions, and uncertainty are stated plainly."
proof: ["One consequential decision", "A written decision brief", "Written clarification + 30/90-day review"]
```

Replace the former meeting card with:

```ts
// Chinese
{
  h: "限定范围的书面澄清",
  p: "交付后 14 天内，你可以就原判读中的依据、假设或表述提出书面问题。需要修正的内容会进入版本记录；新的决定不属于本次范围。",
}

// English
{
  h: "Defined written clarification",
  p: "For 14 days after delivery, you may submit written questions about the reasoning, assumptions, or wording in the original brief. Material corrections are recorded in the revision history; new decisions are outside the case scope.",
}
```

Replace the final process step with `交付与复盘 / Delivery and review`, explicitly describing written clarification and written 30/90-day review.

**Step 2: Update the service explainer and guarantees**

Replace `判读与面谈 / Brief and consultation` with `书面交付 / Written delivery`. State that delivery, clarification, and review are written and asynchronous. Keep the prohibition on unlimited chat.

**Step 3: Update the tier inclusions**

The core tier becomes:

```ts
// Chinese
blurb: "围绕一件具体决定，交付书面决策判读、限定范围的书面澄清与后续复盘。"
includes: [
  "书面决策判读：盘面观察、现实条件、假设与选项比较",
  "交付后 14 天内，就原判读提供限定范围的书面澄清",
  "30/90 天书面复盘",
]

// English
blurb: "A written decision brief, defined written clarification, and follow-up reviews focused on one consequential decision."
includes: [
  "Written decision brief: chart observations, real-world facts, assumptions, and option trade-offs",
  "Defined written clarification on the original brief for 14 days after delivery",
  "Written reviews at 30 and 90 days",
]
```

**Step 4: Run the focused test**

Run:

```bash
node --conditions=react-server --import tsx tests/copy-integrity.test.ts
```

Expected: PASS.

**Step 5: Search for stale public promises**

Run:

```bash
rg -n -i "60[- ]minute|60 分钟|面谈|live session|private session|video consultation|consultation call" lib app components tests
```

Expected: no matches.

**Step 6: Commit the public change**

```bash
git add zhiji/lib/content.ts zhiji/lib/tiers.ts zhiji/tests/copy-integrity.test.ts
git commit -m "copy(zhiji): make delivery fully asynchronous"
```

### Task 3: Align canonical product strategy

**Files:**
- Modify: `AGENTS.md`
- Modify: `.agents/product-marketing.md`
- Modify: `docs/research/README.md`

**Step 1: Add the durable product rule**

State that the initial product has no live meeting, call, or synchronous session. The complete delivery is a human-reviewed written decision brief, defined written clarification, and written 30/90-day review.

**Step 2: Correct value and pricing explanations**

In `.agents/product-marketing.md`, remove `private consultation` as a deliverable and replace it with written clarification. Explain US$388–488 through written analysis, human review, case provenance, revision history, and delayed review—not access time.

**Step 3: Preserve the umbrella category carefully**

The category may remain `Private Chinese metaphysics consultation`, but every deliverable description must identify the service as asynchronous and written so that `consultation` cannot imply a scheduled call.

**Step 4: Commit canonical documentation**

```bash
git add zhiji/AGENTS.md zhiji/.agents/product-marketing.md zhiji/docs/research/README.md
git commit -m "docs(zhiji): align strategy with written delivery"
```

### Task 4: Supersede dated live-session recommendations

**Files:**
- Modify: `docs/research/2026-07-10-executive-decision-memo.md`
- Modify: `docs/research/2026-07-10-validation-plan.md`

**Step 1: Add a visible superseding note**

At the top of each dated report, add:

```md
> **Superseded delivery decision — 2026-07-11:** Zhiji's initial product no longer includes a live or 60-minute consultation. Delivery is asynchronous: a human-reviewed written decision brief, defined written clarification, and written 30/90-day review. References below to a 60-minute session are preserved as historical research recommendations and are not current product requirements.
```

**Step 2: Commit the research clarification**

```bash
git add zhiji/docs/research/2026-07-10-executive-decision-memo.md zhiji/docs/research/2026-07-10-validation-plan.md
git commit -m "docs(zhiji): supersede live-session research guidance"
```

### Task 5: Verify the complete change

**Files:**
- Verify only

**Step 1: Run the full test suite**

```bash
npm test
```

Expected: zero failures; database integration tests may remain skipped when `TEST_DATABASE_URL` is not configured.

**Step 2: Run type checking**

```bash
npm run typecheck
```

Expected: exit code 0.

**Step 3: Run the production build**

```bash
npm run build
```

Expected: all routes compile successfully.

**Step 4: Verify both rendered languages**

Request `/?lang=zh`, `/?lang=en`, `/free?lang=zh`, and `/free?lang=en`. Confirm HTTP 200 and confirm the rendered HTML contains no synchronous-delivery language.

**Step 5: Verify scoped Git state**

Confirm only the intended Zhiji files were changed and that no unrelated user work was staged.
