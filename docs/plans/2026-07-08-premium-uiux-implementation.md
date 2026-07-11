# Premium UI/UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve Zhiji's premium buyer trust and conversion UX while keeping the MVP architecture unchanged.

**Architecture:** Reuse existing Next.js App Router pages, content maps, pricing data, and global CSS. Add no dependencies and keep all backend/payment behavior untouched.

**Tech Stack:** Next.js 14, React 18, TypeScript, plain CSS.

---

### Task 1: Add Trust And Pricing Copy

**Files:**
- Modify: `lib/content.ts`
- Modify: `lib/tiers.ts`

**Steps:**
1. Add homepage proof, confidence, and pricing reassurance strings to the bilingual content map.
2. Add a `bestFor` line to each tier.
3. Run `npm run build`.

### Task 2: Improve Homepage Conversion Flow

**Files:**
- Modify: `app/page.tsx`

**Steps:**
1. Add proof pills to the hero.
2. Add a confidence section before pricing.
3. Move trust/about before pricing.
4. Display tier `bestFor` lines.
5. Run `npm run build`.

### Task 3: Improve Intake UX

**Files:**
- Modify: `app/ask/page.tsx`
- Modify: `app/free/page.tsx`

**Steps:**
1. Add required markers and autocomplete hints.
2. Add paid-form reassurance copy.
3. Mark inline error text with `role="alert"`.
4. Run `npm run build`.

### Task 4: Apply Visual Polish

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `app/icon.svg`

**Steps:**
1. Add premium CSS overrides for typography, contrast, pricing, focus states, and mobile layout.
2. Add metadata icon and SVG icon to remove favicon 404.
3. Verify with desktop/mobile screenshots.
