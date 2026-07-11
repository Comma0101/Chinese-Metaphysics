<claude-mem-context>
# Memory Context

# [zhiji] recent context, 2026-07-10 10:54pm PDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (25,201t read) | 422,644t work | 94% savings

### Jul 10, 2026
S30 Validate and correct Zhiji V1 product strategy; establish regulatory compliance framework and build order for astrology/divination consultation platform (Jul 10, 3:20 PM)
S27 Stripe webhook payment integration and failure-mode testing for zhiji payment system (Jul 10, 3:20 PM)
1289 4:46p 🔴 Fixed top-level await compatibility issue in founder-applications CLI
1290 " ✅ Added repository integration tests for safe column projection
1291 " 🔵 Repository functions not exported from lib/server/applications
1292 " 🟣 Implemented listApplicationSummaries repository function with safe column projection
1293 4:47p 🟣 Implemented listSafeRetentionCandidates repository function; all 13 tests passing
1296 " ✅ Added pilot-operations.md operator runbook for founder CLI
1297 4:48p 🟣 Full test suite passing: founder operations CLI complete and integrated
1298 " ✅ Production build succeeds with founder operations CLI fully integrated
1300 " 🔵 Next.js typecheck artifact reference fails in isolation; build and tests pass
1301 4:49p 🔵 Typecheck passes after build artifacts generated; parallel execution race condition
1317 9:21p ✅ Bilingual Trust Copy System Redesigned for Private Practice Positioning
1318 9:34p 🔵 Zhiji Bazi consultation application loads successfully on mobile viewport
1319 9:35p ✅ CSS layout reordering for mobile form components
1320 " ✅ Updated checkout unavailability error messages with better user guidance
1321 " ✅ Updated legal consent labels to reflect beta/pilot phase with deferred payment
1322 9:36p ✅ Historical: tier footnote once required a practitioner profile; superseded by the 2026-07-10 brand-accountability decision
1323 " ✅ Updated page metadata to prioritize English in title and description
1324 9:37p ✅ Enhanced copy-integrity test with application language assertion
1325 " 🔵 Zhiji BaZi consultation app running successfully on localhost:3000
1326 9:38p ✅ Refined BaZi service value proposition messaging
1327 9:39p 🔵 Full test suite passes with 160/174 tests (14 database-dependent tests skipped)
1328 9:40p 🔵 TypeScript type checking passes with zero errors
1329 " 🔵 Next.js 14.2.35 production build completes successfully with 15 pages
1330 " 🔵 Development server manifest loading error during /ask route compilation
1331 " 🔵 Production server startup fails with EPERM on port 3000
1332 " 🔵 Next.js server running on non-standard port 3111 instead of default 3000
1333 9:41p 🔵 Next.js server starts successfully on localhost 127.0.0.1:3000 with explicit binding
1334 " 🔵 Homepage renders successfully with bilingual title and English language parameter
1336 9:42p 🔵 WebGL Context Loss and GPU Stalls in THREE.js Rendering Pipeline
1337 " 🔵 Compliance Audit: No Problematic Fortune-Telling Claims Detected in Codebase
1338 9:43p 🔵 Zhiji Project Architecture: Bilingual Paid Pilot SaaS with Stripe Subscription
1339 10:21p 🔵 Zhiji Product Marketing Context and Strategic Documentation Already Established
1340 10:22p 🔵 Legal Research Revealed Critical Regulatory Barriers to US/Canada Launch of Zhiji
1341 10:33p 🔵 Identified runaway Chrome GPU and Node.js HUD processes causing CPU heat
1342 " 🔵 System temperature and load analysis confirms thermal stress from sustained CPU usage
1343 " 🔵 Identified root cause: 52-minute Playwright headless Chrome session with software WebGL GPU rendering
1344 " ✅ Terminated Playwright Chrome process tree; system load reduced by 0.71 on 1-minute average
S29 Diagnose and resolve CPU heating issue on Linux system (Jul 10, 10:34 PM)
S31 Validate Zhiji V1 product strategy and establish legal/compliance framework for astrology consultation platform; correct three critical product decisions (Jul 10, 10:34 PM)
1345 10:34p 🔵 Named practitioner accountability is deeply embedded throughout Zhiji product architecture
1346 10:36p ⚖️ Zhiji pivots from named-practitioner brand to process-control-based anonymous trust model
1347 " ✅ Brand accountability design decision committed to repository
1348 " 🔵 Codebase remains built around named-practitioner model; contradicts newly committed brand-accountability decision
1349 10:37p 🔵 Product documentation and operational gates contradict newly committed brand-accountability decision
1350 10:38p ✅ Brand-accountability implementation plan created and staged
1351 10:39p ✅ Implementation plan committed to repository
1355 10:52p ⚖️ Repositioned Zhiji from personality-led to process-accountable service model
1356 10:53p ✅ Updated operations and research documentation to reflect brand-accountability model
1357 " ✅ Updated research memos to document brand-accountability as superseding decision
1358 " ✅ Updated validation plan and risk register to operationalize brand-accountability model
1359 " 🔵 Identified outdated named-practitioner references after brand-accountability decision
1360 10:54p ✅ Updated Chinese-language customer copy to reflect brand-accountability model

Access 423k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>

<superseding-decision>
The S31 observation that public founder identity is non-negotiable is no longer
current. The approved source of truth is
`docs/plans/2026-07-10-brand-accountability-design.md`: no public real name,
personal photograph, or invented practitioner persona. Accountability is
recorded through substantive human review, case and reviewer-role IDs, method
versions, review dates, and correction history.
</superseding-decision>

<zhiji-product-context>
# Zhiji Product Context — Required Reading

Before changing product strategy, positioning, pricing, funnel behavior, customer data, payments, delivery operations, analytics, or growth:

1. Read `.agents/product-marketing.md` for the canonical concise context.
2. Read `docs/research/README.md` and the linked decision memo relevant to the task.

Durable decisions as of 2026-07-10:

- Zhiji uses brand accountability: no public real name, personal photograph, or invented practitioner persona. Every interpretation must receive substantive human review and carry a case ID, stable reviewer-role ID, method version, review date, and revision history.
- The end goal is a full premium productized practice and secure practitioner operating system, not a generic astrology app.
- Initial wedge: category-aware or culturally close Chinese professionals, approximately 28–45, in North America, facing one consequential decision within 90 days.
- Working category: “Private BaZi consultation for major life transitions / 私人八字咨询（重大人生节点）”.
- Current US$49/99/249 tiers, free blind-test funnel, market-size outputs, and validation thresholds are hypotheses—not validated facts.
- Legal, processor, privacy, tax, and platform conclusions require current primary-source and specialist verification before action.
- Do not enable real payments or accept sensitive cases until the Supabase/Postgres deployment, webhook lifecycle, outbox, deletion/redaction/retention operations, database integration tests, legal/processor gates, and end-to-end rehearsal are verified against the release environment.

Preserve the distinction between facts, inferences, hypotheses, and proposed decision rules. Do not dilute the no-fear, no-remedy, no-deterministic-prediction, client-agency, privacy, and human-accountability boundaries.
</zhiji-product-context>
