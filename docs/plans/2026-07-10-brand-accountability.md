# Zhiji Brand Accountability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Zhiji's public named-practitioner promise with an honest brand-accountability model across canonical context, customer-facing copy, report provenance, and launch gates.

**Architecture:** Keep human review but move public accountability from a personal identity to the Zhiji service system. Public artifacts identify a stable reviewer role, case ID, method version, review date, and revision history; legal merchant identity remains a private compliance requirement. Preserve historical competitor evidence about named practitioners while clearly marking the old Zhiji recommendation as superseded.

**Tech Stack:** Next.js 14, React, TypeScript, Node test runner, Markdown product/operations documentation, JSON design-language context.

---

## Execution constraints

- Work in `/home/comma/Documents/zhiji`.
- The Git root is `/home/comma/Documents`, while most of Zhiji is currently untracked. Do not create a worktree that would omit the untracked application. Stage only the exact `zhiji/...` paths named in each task.
- Do not modify competitor CSV observations that correctly describe named competitors.
- Do not enable `PAID_PILOT_ENABLED` or change payment behavior.
- Do not claim that a company, DBA, processor approval, legal clearance, method specification, or privacy policy exists until it actually does.

### Task 1: Lock the public accountability contract with failing tests

**Files:**

- Modify: `tests/copy-integrity.test.ts`
- Read: `lib/content.ts`
- Read: `lib/tiers.ts`

**Step 1: Extend the imports**

Import the public trust surfaces and tier copy:

```ts
import {
  CLOSING,
  FOOTER,
  GUARANTEES,
  HEADER,
  PILOT_FORM,
  SAMPLE,
  T,
  TRUST,
} from "../lib/content";
import { PILOT_PATH } from "../lib/tiers";
```

**Step 2: Replace the old biography expectation with the new contract**

```ts
test("public accountability belongs to Zhiji, not a public practitioner persona", () => {
  const publicCopy = JSON.stringify({
    home: T,
    form: PILOT_FORM,
    header: HEADER,
    footer: FOOTER,
    trust: TRUST,
    guarantees: GUARANTEES,
    tiers: PILOT_PATH,
  });

  assert.doesNotMatch(
    publicCopy,
    /主理人|具名咨询师|practitioner profile|practitioner's name|named practitioner|personally delivered/i,
  );
  assert.match(TRUST.zh.eyebrow, /方法与责任/);
  assert.match(TRUST.en.eyebrow, /method.*accountability/i);
  assert.match(TRUST.zh.body, /人工审核/);
  assert.match(TRUST.en.body, /human review/i);
  assert.match(TRUST.zh.body, /案例编号|方法版本/);
  assert.match(TRUST.en.body, /case number|method version/i);
});
```

Keep the existing assertions that prohibit fake authority and fabricated proof.

**Step 3: Add a hard-coded page-source regression assertion**

Extend the existing page-source test to read `app/reading/sample/page.tsx` and assert that it does not contain `practitioner profile`, `practitioner's name`, or a personal portrait field.

**Step 4: Run the focused test and confirm RED**

Run:

```bash
node --import tsx --test tests/copy-integrity.test.ts
```

Expected: FAIL because current copy still promises a public practitioner profile and personal delivery.

**Step 5: Commit the failing contract**

```bash
git add zhiji/tests/copy-integrity.test.ts
git commit -m "test(zhiji): define brand accountability copy contract"
```

### Task 2: Replace public personal-authority copy with brand accountability

**Files:**

- Modify: `lib/content.ts`
- Modify: `lib/tiers.ts`
- Modify: `components/VolumeRail.tsx`
- Modify: `app/reading/sample/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Test: `tests/copy-integrity.test.ts`

**Step 1: Update the service journey and application acknowledgements**

Use precise service actions instead of a personal title:

```ts
// Representative Chinese replacements
"知几会逐条解释书面判读，也听你补充事实。"
"知几核对方法与相关历史事实，再完成书面判读。"
"我知悉最终判读会经过知几的实质性人工审核；软件用途会披露，我的资料默认不用于训练模型。"
"知几案例团队会联系你，说明资料用途、服务范围与受理规则。"

// Representative English replacements
"Zhiji walks through the brief and hears what the document may have missed."
"Zhiji checks the method and relevant history, then prepares the brief."
"I understand that Zhiji completes a substantive human review of the final interpretation, software use is disclosed, and my data is not used for model training by default."
"Zhiji will explain data use, service scope, and the acceptance rule."
```

Change the acquisition-source option from `主理人的朋友 / Friend of the practitioner` to `知几团队直接认识的人 / Someone the Zhiji team knows directly`. Keep the stored value `direct_friend` unchanged.

**Step 2: Replace profile-dependent payment-gate copy**

Use this gate consistently:

```ts
zh: "付款目前保持关闭。开放前，方法说明、受理与退款规则、隐私条款和运营门槛会完整公布。"
en: "Payment is currently closed. The method disclosure, acceptance and refund rules, privacy terms, and operating gates will be published before it opens."
```

Update both `lib/content.ts` and `lib/tiers.ts`. Do not imply those documents already exist.

**Step 3: Replace the About/Practitioner surface**

Keep the existing `TRUST` shape to avoid unnecessary component work, but replace its content:

```ts
zh: {
  eyebrow: "方法与责任",
  h: "每一份判断，都留下可追溯的责任记录",
  body: "知几不公开个人姓名或照片，也不虚构“大师”人设。每份交付都经过实质性人工审核，并记录案例编号、方法版本、审核日期与修订历史。软件参与哪些环节，也会如实说明。",
  points: [
    { h: "人工审核", p: "盘面输入、解释、书面简报与关键修改都必须经过人工复核，不能把自动生成结果直接交付给客户。" },
    { h: "方法可追溯", p: "排盘选择、关键假设、软件用途、不确定之处与报告版本会保留在案例记录中。" },
    { h: "允许质疑与修正", p: "客户可以要求解释依据；30/90 天复盘会记录需要修正的地方，而不只记录符合之处。" },
  ],
  sign: "— 知几案例审核",
},
en: {
  eyebrow: "Method & accountability",
  h: "Every interpretation leaves an accountable record",
  body: "Zhiji does not publish a personal name or photograph, and it does not invent a master persona. Every delivery receives substantive human review and records a case number, method version, review date, and revision history. Software involvement is disclosed by task.",
  points: [
    { h: "Human review", p: "Chart inputs, interpretation, the written brief, and substantive revisions must be reviewed by a person. Automated output is never delivered as final judgment." },
    { h: "Traceable method", p: "Calculation choices, key assumptions, software use, uncertainty, and report versions remain in the case record." },
    { h: "Open to correction", p: "Clients can ask for the reasoning. The 30/90-day review records what needs revision as well as what helped." },
  ],
  sign: "— Zhiji case review",
},
```

Update `HEADER`, `FOOTER`, and `VolumeRail` labels to `方法与责任 / Method & accountability`. Keep the `#about` anchor for link compatibility.

**Step 4: Update service guarantees**

Replace `谁来完成 / Who delivers the work` with:

```ts
{
  k: "责任如何记录",
  v: "每份交付记录案例编号、方法版本、审核日期与修订历史；软件用途写明，最终内容经过实质性人工审核。",
}
{
  k: "How accountability is recorded",
  v: "Every delivery records a case number, method version, review date, and revision history. Software use is stated, and the final content receives substantive human review.",
}
```

**Step 5: Give the sample document institutional provenance**

Add localized `reviewer` and `method` fields to `DOC`:

```ts
reviewer: "知几案例审核 · ZJ-R01",
method: "Method v1.0 · 虚构演示",
```

```ts
reviewer: "Human-reviewed by Zhiji · ZJ-R01",
method: "Method v1.0 · fictional walkthrough",
```

Render both values in `.rdoc-sign`. `ZJ-R01` is a role identifier, not a person or credential. Keep the fictional-demo labeling visually adjacent.

**Step 6: Update implementation comments**

Change comments in `app/layout.tsx` and `app/globals.css` that describe the font or seal as a practitioner's hand/signature. Describe them as annotation voice and a Zhiji case-review colophon. Do not change visual styling.

**Step 7: Run the focused test and confirm GREEN**

Run:

```bash
node --import tsx --test tests/copy-integrity.test.ts
```

Expected: all copy-integrity tests pass.

**Step 8: Commit the public copy and artifact changes**

```bash
git add zhiji/lib/content.ts zhiji/lib/tiers.ts zhiji/components/VolumeRail.tsx zhiji/app/reading/sample/page.tsx zhiji/app/layout.tsx zhiji/app/globals.css
git commit -m "feat(zhiji): make public accountability brand-led"
```

### Task 3: Update canonical strategy and launch gates

**Files:**

- Modify: `AGENTS.md`
- Modify: `.agents/product-marketing.md`
- Modify: `docs/research/README.md`
- Modify: `docs/operations/paid-pilot-launch-gates.md`
- Modify: `docs/research/2026-07-10-executive-decision-memo.md`
- Modify: `docs/research/2026-07-10-market-product-synthesis.md`
- Modify: `docs/research/2026-07-10-validation-plan.md`
- Modify: `docs/research/2026-07-10-risk-register.md`

**Step 1: Correct the durable agent decision**

In `AGENTS.md`, replace the durable named-practitioner assumption with:

```md
- Zhiji uses brand accountability: no public real name, personal photograph, or invented practitioner persona. Every interpretation must receive substantive human review and carry a case ID, stable reviewer-role ID, method version, review date, and revision history.
```

Add a concise note that the older memory observation describing public founder identity as non-negotiable is superseded by the approved 2026-07-10 brand-accountability design.

**Step 2: Update canonical product marketing context**

In `.agents/product-marketing.md`:

- change the category to private, human-reviewed Chinese metaphysics consultation;
- replace `Named practitioner` with `Public accountability model`;
- replace `named founder sign-off` with brand case-review provenance;
- replace `Named human` in the pull forces with substantive human review plus traceable process;
- state that the absence of a public practitioner identity is an unvalidated trust disadvantage;
- preserve the no-fear, no-remedy, no-deterministic-prediction boundaries.

**Step 3: Update the research entry point**

In `docs/research/README.md`, replace the stable named-practitioner decision and link to `../plans/2026-07-10-brand-accountability-design.md`.

**Step 4: Replace the launch identity gate**

In `docs/operations/paid-pilot-launch-gates.md`, replace `Practitioner identity` with `Brand accountability and review governance`. Evidence must include:

- public method/accountability disclosure;
- stable internal reviewer-role IDs;
- internal record of who actually reviewed each case;
- competency and method-approval records kept privately;
- human-review and correction audit trail;
- no fabricated public credentials or persona.

The lawful merchant/entity identity remains part of the operating-location, processor, terms, and privacy gates.

**Step 5: Mark prior recommendations as superseded without corrupting evidence**

Add a prominent note near the top of the executive memo and market synthesis:

```md
> **Superseding decision — 2026-07-10:** Zhiji will not publish a practitioner's real name or photograph. References below to named-practitioner accountability describe the earlier recommendation or competitor evidence. Current Zhiji accountability follows the approved [brand-accountability design](../plans/2026-07-10-brand-accountability-design.md).
```

Update current-tense Zhiji operating recommendations, but preserve competitor observations and source evidence about named practitioners.

**Step 6: Update active validation and risk controls**

- In the validation plan, test brand accountability, method traceability, and human-review disclosure instead of a public practitioner profile.
- In the risk register, require a stable reviewer-role ID and logged substantive human review instead of a public personal signature.
- Keep internal access accountability: anonymous to the public must never mean anonymous inside operations.

**Step 7: Search for canonical contradictions**

Run:

```bash
rg -n -i "founder will be the named|named practitioner remains|public biography|practitioner profile|主理人资料|公开.*姓名|real photograph" AGENTS.md .agents docs/operations docs/research
```

Expected: no current normative statement requires public personal identity. Remaining matches must be clearly historical, competitor-specific, or inside the superseding note.

**Step 8: Commit the canonical decision updates**

```bash
git add zhiji/AGENTS.md zhiji/.agents/product-marketing.md zhiji/docs/research/README.md zhiji/docs/operations/paid-pilot-launch-gates.md zhiji/docs/research/2026-07-10-executive-decision-memo.md zhiji/docs/research/2026-07-10-market-product-synthesis.md zhiji/docs/research/2026-07-10-validation-plan.md zhiji/docs/research/2026-07-10-risk-register.md
git commit -m "docs(zhiji): align strategy with brand accountability"
```

### Task 4: Remove active design-system dependence on a personal founder persona

**Files:**

- Modify: `.agents/design-language-lacquer-nocturne.json`
- Modify: `docs/plans/2026-07-10-bilingual-trust-copy-design.md`
- Modify: `docs/superpowers/specs/2026-07-10-paid-pilot-foundation-design.md`

**Step 1: Update active design-language instructions**

In `.agents/design-language-lacquer-nocturne.json`:

- keep cinnabar as an institutional Zhiji seal;
- replace the named-person colophon with a case-review colophon;
- replace the portrait/bio layout with method, provenance, review ID, and correction controls;
- remove motion instructions that dramatize a personal signature;
- preserve the visual system, materials, scroll behavior, and reduced-motion path.

Validate the JSON after editing:

```bash
jq empty .agents/design-language-lacquer-nocturne.json
```

Expected: exit 0.

**Step 2: Add superseding notes to active historical designs**

Add a short top note to each listed design document saying the public named-practitioner assumption is superseded by `2026-07-10-brand-accountability-design.md`. Do not rewrite the historical design body.

**Step 3: Commit the design-system updates**

```bash
git add zhiji/.agents/design-language-lacquer-nocturne.json zhiji/docs/plans/2026-07-10-bilingual-trust-copy-design.md zhiji/docs/superpowers/specs/2026-07-10-paid-pilot-foundation-design.md
git commit -m "docs(zhiji): remove personal-authority design assumptions"
```

### Task 5: Full verification and visual inspection

**Files:**

- Verify only; modify files only if a failing check reveals an in-scope defect.

**Step 1: Run all automated checks**

```bash
npm test
npm run typecheck
npm run build
```

Expected:

- unit suite passes;
- database-dependent tests may remain explicitly skipped without `TEST_DATABASE_URL`, and the count must be reported;
- TypeScript exits 0;
- production build exits 0.

**Step 2: Run contradiction searches**

```bash
rg -n -i "practitioner profile|practitioner's name|personally delivered|主理人资料|公开.*姓名|real photograph" lib app components tests .agents/product-marketing.md AGENTS.md docs/operations docs/research/README.md
```

Expected: no customer-facing or canonical normative contradiction.

**Step 3: Inspect in a production browser**

Start the production server on an available loopback port and inspect:

- Chinese homepage desktop and mobile;
- English homepage desktop and mobile;
- Chinese and English sample brief;
- invited application acknowledgement and closed-payment gate.

Check that:

- `方法与责任 / Method & accountability` replaces the practitioner surface;
- no real-name, photograph, biography, or master-persona promise appears;
- institutional report provenance is legible;
- fictional sample labeling remains prominent;
- mobile navigation and section rail remain usable;
- there are no console errors. WebGL performance warnings should be reported separately from application errors.

Stop the server and browser session after inspection.

**Step 4: Commit any verification-only corrections**

If no corrections were needed, do not create an empty commit. If corrections were needed, stage only their exact Zhiji paths and use:

```bash
git commit -m "fix(zhiji): finish brand accountability migration"
```

**Step 5: Report residual blockers honestly**

The handoff must still list:

- lawful merchant/entity setup;
- operating-jurisdiction counsel;
- processor approval;
- final method specification;
- privacy and service terms;
- database integration tests;
- end-to-end operational rehearsal;
- market validation of an anonymous premium service.
