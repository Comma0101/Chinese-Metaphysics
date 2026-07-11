# Zhiji Bilingual Trust Copy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace scam-like, defensive, translation-heavy customer copy with a research-led bilingual private-practice narrative.

**Architecture:** Keep all bilingual source strings in `lib/content.ts` and offer labels in `lib/tiers.ts`; let pages render those facts without inventing new claims. Reorder the homepage around decision trigger, deliverable, practitioner accountability, method, sample, and price. Preserve the frozen backend contract and all safety/payment behavior.

**Tech Stack:** Next.js 14, React 18, TypeScript, Node test runner, existing CSS/component system.

---

### Task 1: Add Copy Integrity Tests

**Files:**
- Create: `tests/copy-integrity.test.ts`
- Read: `lib/content.ts`
- Read: `app/page.tsx`
- Read: `app/reading/sample/page.tsx`

**Steps:**

1. Write failing static tests that reject the current hero slogans as primary
   headlines, precise fictional timing claims, `real client` language, repeated
   `named person` placeholders, and old `founding pilot` hero CTA.
2. Assert both languages name the category, a concrete written brief, a private
   consultation, a real-decision window, and the illustrative nature of the
   sample.
3. Run `node --conditions=react-server --import tsx --test tests/copy-integrity.test.ts`.
4. Confirm RED against the current copy.

### Task 2: Rewrite the Bilingual Content System

**Files:**
- Modify: `lib/content.ts`
- Modify: `lib/tiers.ts`
- Test: `tests/copy-integrity.test.ts`

**Steps:**

1. Rewrite Chinese and English independently using the approved design.
2. Replace abstract and defensive phrases with customer situations, observable
   deliverables, method limits, and plain price/process language.
3. Rename the public deposit step to `受理与校准定金 / case assessment deposit`.
4. Rewrite the fictional sample around observations, assumptions, options,
   low-regret actions, and invalidation conditions; remove unsupported future
   timing.
5. Keep public practitioner claims conservative because name/biography are not
   yet supplied.
6. Run the focused copy test until GREEN.

### Task 3: Recompose the Homepage Argument

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css` only for required hierarchy/layout support
- Test: `tests/copy-integrity.test.ts`

**Steps:**

1. Replace the hard-coded Chinese slogan hero with localized content.
2. Make service explanation the primary CTA and invited application secondary.
3. Replace the large `what it is/isn't` defense with concrete decision
   situations and service outputs.
4. Put deliverables before method and price.
5. Keep the practitioner section honest and avoid anonymous authority language.
6. Keep one boundary section and remove redundant disclaimers from sales copy.
7. Run focused tests and typecheck.

### Task 4: Rewrite the Sample and Application Journey

**Files:**
- Modify: `app/reading/sample/page.tsx`
- Modify: `app/ask/page.tsx`
- Modify: `components/PilotApplication.tsx`
- Modify: `app/free/page.tsx`
- Modify: `app/success/page.tsx`
- Modify: `app/cancel/page.tsx`
- Modify: `lib/content.ts`

**Steps:**

1. Present the sample as a fictional decision-brief walkthrough, not proof.
2. Make the application feel like an invited fit check, not a secret high-
   pressure funnel; keep every backend-required field and consent version.
3. Shorten field labels and explanations without weakening safety or consent.
4. Rewrite status/cancel/process pages in native Chinese and English.
5. Do not change checkout payloads, API contracts, payment state, or safety
   qualification.
6. Run copy tests, existing tests, and typecheck.

### Task 5: Metadata, Visual Review, and Final Verification

**Files:**
- Modify: `app/layout.tsx`
- Modify: `README.md` only if the public category description changes
- Review: all customer-facing routes in Chinese and English

**Steps:**

1. Rewrite page title and description around the recognizable category and
   concrete audience.
2. Run `npm test`; require zero failures and report skipped live-database tests.
3. Run `npm run typecheck`.
4. Run `npm run build`.
5. Start the production build locally and inspect `/`, `/free`, `/ask`,
   `/reading/sample`, `/success`, and `/cancel` in both languages at desktop and
   mobile widths.
6. Confirm no console errors, overflow, stale claims, or English translationese.
7. Record the unresolved practitioner public-name/biography gate in the final
   handoff; do not invent it.

