# Zhiji Research Knowledge Base Design

**Date:** 2026-07-10  
**Status:** Approved in conversation

## Goal

Preserve the Zhiji market research inside the project and make its product decisions discoverable to future agents without requiring them to reread a very large raw report.

## Structure

- `docs/research/data/` stores the three original CSV exports verbatim.
- `docs/research/README.md` is the reading-order and provenance index.
- Dated Markdown files preserve the executive decision, market/product synthesis, customer language, validation plan, and critical risk register reconstructed from the supplied research response.
- `.agents/product-marketing.md` is the canonical concise product/ICP/positioning context used by marketing workflows.
- `AGENTS.md` points every agent to the canonical context and research index before product, positioning, pricing, funnel, data, or growth changes.

## Provenance Rules

The CSVs are original exported artifacts and must retain their checksums. The long-form Markdown exports were not present locally, so the Markdown archive is a structured reconstruction from the supplied response, not a verbatim source export. Unrelated `evidence_packet.*` asylum documents in Downloads are explicitly excluded.

## Product Doctrine Captured

- Founder is the named accountable practitioner; public name, biography, and credentials remain to be supplied.
- Long-term goal is a full productized premium practice, not a generic astrology app.
- Initial wedge is a category-aware Chinese professional in North America with one consequential decision due within 90 days.
- Working category is “Private BaZi consultation for major life transitions / 私人八字咨询（重大人生节点）”.
- Validate concierge delivery first, then build a secure human-plus-software operating system.
- Market sizing is scenario planning, not proof. Legal, processor, and privacy conclusions require current specialist verification.

## Verification

Verify copied CSV checksums, Markdown links, required-reading pointers in `AGENTS.md`, and presence of every canonical context section.
