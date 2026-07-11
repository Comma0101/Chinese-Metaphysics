# Zhiji Research Knowledge Base Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve Zhiji research artifacts and create a durable, agent-readable product strategy context.

**Architecture:** Store original evidence exports under `docs/research/data`, add a dated Markdown synthesis layer with explicit provenance, and surface the smallest canonical context through `.agents/product-marketing.md` and `AGENTS.md`. No application or UI source is changed.

**Tech Stack:** Markdown, CSV, repository-level `AGENTS.md` guidance.

---

### Task 1: Preserve raw research data

**Files:**
- Create: `docs/research/data/competitor-matrix.csv`
- Create: `docs/research/data/source-evidence-ledger.csv`
- Create: `docs/research/data/market-sizing-model.csv`

1. Create `docs/research/data/`.
2. Copy only the three matching CSVs from `/home/comma/Downloads/`.
3. Compare SHA-256 checksums with the source files.
4. Do not copy the unrelated `evidence_packet.*` files.

### Task 2: Create the research reading layer

**Files:**
- Create: `docs/research/README.md`
- Create: `docs/research/2026-07-10-executive-decision-memo.md`
- Create: `docs/research/2026-07-10-market-product-synthesis.md`
- Create: `docs/research/2026-07-10-customer-language.md`
- Create: `docs/research/2026-07-10-validation-plan.md`
- Create: `docs/research/2026-07-10-risk-register.md`

1. State source provenance and the distinction between verbatim CSVs and reconstructed Markdown.
2. Record the product decision, ICP, category, operating model, pricing hypotheses, full-product sequence, and evidence limits.
3. Preserve decision thresholds and critical safety/legal gates.
4. Link all raw datasets from the index.

### Task 3: Create canonical product context

**Files:**
- Create: `.agents/product-marketing.md`

1. Capture the product, audience, JTBD, competition, differentiation, objections, customer language, brand voice, proof status, and goals.
2. Record the founder as named practitioner and mark public biography/credentials as unresolved.
3. Separate validated facts from hypotheses and proposed validation thresholds.

### Task 4: Make context discoverable to all agents

**Files:**
- Modify: `AGENTS.md`

1. Preserve the existing memory block.
2. Append a short required-reading section linking `.agents/product-marketing.md` and `docs/research/README.md`.
3. State that current MVP prices and funnel are hypotheses, not final product doctrine.
4. State that market estimates and legal conclusions must not be repeated as verified facts without revalidation.

### Task 5: Verify integrity and discoverability

1. Run SHA-256 checks against source and copied CSVs; expect exact matches.
2. Check all expected files exist and are non-empty.
3. Search `AGENTS.md` for both required-reading paths.
4. Search the canonical context for the named practitioner, initial ICP, category, price hypothesis, and 90-day validation goal.
5. Review `git status --short` without staging or committing because `zhiji` is an untracked subtree of a larger shared worktree.
