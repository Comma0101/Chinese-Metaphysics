# 知几 / Zhiji — Agent Handoff (start here)

**Last updated:** 2026-07-11 · **Repo:** https://github.com/Comma0101/Chinese-Metaphysics (branch `main`)
**Live preview:** connected to Vercel (the founder's account) — every push to `main` auto-deploys; review there, not on localhost.

This file is the single "start here" for any agent picking up Zhiji. Read this, then the two canonical docs it points to. Do **not** re-derive strategy — it is decided and recorded.

---

## 1. What Zhiji is (one paragraph)

A private, **asynchronous, written** Chinese-metaphysics decision consultation for diaspora Chinese professionals (~28–45, North America) facing **one consequential decision within 90 days**. **BaZi-led**, drawing on 紫微斗数 and the wider Chinese-metaphysics toolkit as each case calls for it. The essence: help people **see the structure of their life** — timing, recurring patterns, risk windows, choice boundaries — 命是结构，不是结局. It is **not** fortune-telling: no fear, no remedies, no promised outcomes, no live sessions. A named-*role* (not a named person) is accountable per case.

## 2. Canonical docs — read in this order

1. `.agents/product-marketing.md` — the concise product/positioning/ICP/voice context (the source of truth for copy).
2. `docs/research/README.md` → the linked memos (executive-decision-memo, market-product-synthesis, customer-language, validation-plan, risk-register). Research is behavior-gated; treat market-size/thresholds as hypotheses, not facts.
3. `docs/plans/2026-07-11-whats-next-roadmap.md` — the tracks (A–E) mapped to the validation phases.
4. `AGENTS.md` — durable agent-handoff log + repo/ownership rules (also loaded automatically).

## 3. Non-negotiable decisions (do not overturn without founder + coordination)

- **Payment stays CLOSED** (`PAID_PILOT_ENABLED=false`) until legal (LA operating-location) + processor + privacy/claims/safety gates clear.
- **Fully asynchronous written delivery** — never promise 面谈/通话/live session/call/60-minute/meeting/chat.
- **Brand accountability, not a persona** — no public real name/photo/master persona; sign-off = `知几案例审核 · ZJ-R01 · Method vX`.
- **No fear / no remedies / no deterministic prediction / client agency / privacy.**
- **No birth data as a public lead magnet** — the old 免费盲测 is retired; `/free` is now a process explainer. Birth data is collected only post-acceptance, under separate consent.
- **Ads are last, narrow, and gated** — divination is a restricted ad category; never the go-live move.
- These are **enforced by `tests/copy-integrity.test.ts`.** Run it before/after any copy change:
  `node --conditions=react-server --import tsx --test tests/copy-integrity.test.ts`

## 4. Ownership split

- **Claude/Fable (UI):** `app/*/page.tsx`, `lib/content.ts`, presentation-only `lib/tiers.ts`, client components, `app/globals.css`, `content/**` (marketing), design/plan docs. Consumes `lib/contracts/pilot.ts` read-only.
- **Codex (backend):** `app/api/**`, `lib/contracts/pilot.ts`, `lib/server/**`, `supabase/**`, `scripts/**`, `tests/**`, package/env files. Do not edit the other side's files while a mission is active.

## 5. Current state (what's built & working)

- **Design:** "纸与漆 Paper & Lacquer" — scroll-driven WebGL luopan world (`components/LacquerWorld.tsx`, engraved compass face), lacquer↔rice-paper ground alternation with deckle seams, Noto Serif SC 900 monuments + LXGW WenKai annotations (all fonts self-hosted), 卷目 rail, kintsugi sample plate, carved 剔红 pricing tablets.
- **Funnel (pilot contract):** `/ask` = qualification form (`components/PilotApplication.tsx`, submits exactly `PilotApplicationRequest`, UUID `Idempotency-Key`, `X-Pilot-Access-Code` header, all typed states + 409/413/415). `/success` = read-only status poller (`components/CheckoutStatus.tsx`, never imports Stripe). `/cancel`, `/free` (process explainer). Newsletter = fail-closed null stub.
- **Trust/compliance pages:** `/method` `/promise` `/privacy` `/terms` `/deposit-policy` (`components/DocPage.tsx` + `DOCS` in content.ts). Privacy/terms/deposit carry a **DRAFT** banner — their binding legal text still needs counsel.
- **Sample:** `/reading/sample` — a fictional/illustrative decision brief (braids career+family+relationship), full ZJ-R01 provenance block; doubles as the delivery template. Labeled illustrative everywhere.
- **Copy:** hero + sections elevated (concrete, felt, no hype, no fate-slogan per the tests); bilingual parity + currency/term/quote/apostrophe consistency swept clean.
- **Verified green:** `npm run typecheck` (0), `npm run build` (0), `npm test` (179, 0 fail), copy-integrity (8/8).

## 6. Go-to-market / cold-start (decided)

**Market broad, sell narrow:** build a content audience around "understand your life's structure," convert the decision-moment subset to the US$388 consultation. Sequence: **first case (founder/friend) → clear legal+processor gate → 小红书 content + warm intros + community → referrals compound → narrow exact-intent search ads (last).**
- 小红书 = restricted discovery layer → drive to **private WeChat domain**, delete all 玄学 words, lead with decision-narrative + anti-charlatan framing.
- Assets: `content/xiaohongshu-batch-1.md` (playbook, funnel now fixed to private-domain), `content/xiaohongshu-landscape.md` (ecosystem/compliance), `content/xiaohongshu-ready-posts.md` (finished post 2A + 违禁词 checklist), `content/social-posting-playbook.md`.
- The free "chart structure" tool is the right direction but **gated** on a deterministic BaZi calc engine (deferred; backend; wrong charts = #1 trust-killer) — not the next build.

## 7. What's next (backlog, no work-in-progress mid-flight)

Nothing is half-done; the tree is clean. Pick up any of:
- **Marketing content:** write posts 2C (DeepSeek angle), 1B (two offers), 1D (代际压力) to the finished bar in `content/xiaohongshu-ready-posts.md`.
- **First case:** the founder runs it using `docs/ops/2026-07-11-first-case-delivery-kit.md` (delivery template + debrief questions).
- **Track B (my lane):** privacy-safe analytics (no IP/fingerprint) + the 3 category-label test pages, so promotion becomes measurable.
- **Deeper systematic polish:** layout/spacing micro-pass (needs eyes on the Vercel preview).
- **Founder/counsel (not code):** LA operating-location legal review, processor underwriting, the 40 validation interviews, the method spec, and turning the 3 DRAFT policy pages into binding text.

## 8. Operating notes (important)

- Dev: `npx next dev -p 3111`. **NEVER run `npm run build` while dev is up** — it clobbers `.next` and 404s chunks. Stop dev, build, restart. (A `pkill -f "next dev"` may exit 144 — cosmetic; the build still runs if you re-invoke it alone.)
- Headless UI check (WebGL works): playwright-core at `/usr/lib/code/node_modules/playwright-core` + google-chrome-stable, args `--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. Wait ~3s after load, ~2.5s after scrolls.
- Content markdown in `content/**` and `docs/**` is not imported by the app — safe to commit without a build.
- Gitignored: `data/*.json` (intakes), `.env*.local`, `.omc/`, `.playwright-cli/`, `output/`, `*.tsbuildinfo`. Never commit intake data, keys, or the pilot access code/hash.
- Commit zhiji work **only in this repo** — never into the parent `~/Documents` mega-repo.
