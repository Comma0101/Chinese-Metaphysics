# Zhiji Tracking Plan

*Created: 2026-07-24*

## Overview

- **Tools:** Lightweight client-side tracker (`lib/track.ts`), ready for GA4 or PostHog
- **Privacy:** No PII in events. Email addresses never sent to analytics. Consent-aware by design (no cookies set by tracker).
- **Status:** Development logging active. Production provider not yet connected.

## Activation

Set one of these in `.env.local` to activate a provider:

```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_POSTHOG_KEY=phc_XXXXXXXXXX
```

Without these, events log to console in development and are silently dropped in production.

## Funnel Events

| Event | Trigger | Properties | Decision Informed |
|-------|---------|------------|-------------------|
| `page_view` | Page load | `lang`, `page_path` | Traffic volume, language split |
| `cta_clicked` | Any CTA link click | `cta_label`, `cta_location`, `page_path` | Which CTAs convert, which locations work |
| `waitlist_submitted` | Waitlist form submit | `page_path` | Waitlist capture rate |
| `scroll_depth` | Scroll milestones (25/50/75/100%) | `depth_percent` | Content engagement, drop-off points |

## CTA Locations Tracked

| Location | CTA | Element |
|----------|-----|---------|
| `hero` | Primary: "申请首批名额" | `.btn-gilt-large` |
| `hero` | Secondary: "先看演示判读 →" | `.cta-secondary` |
| `pricing` | Deposit tier button | `.tier .btn` |
| `closing` | Final CTA | `.btn-gilt` |

## Custom Dimensions (when GA4 connected)

| Name | Scope | Source |
|------|-------|--------|
| `lang` | User | URL param `?lang=` |
| `cta_location` | Event | TrackedLink `location` prop |
| `cta_label` | Event | TrackedLink `label` prop |

## Conversions to Mark (GA4 Admin)

| Conversion | Event | Counting |
|------------|-------|----------|
| Waitlist signup | `waitlist_submitted` | Once per session |
| CTA click (any) | `cta_clicked` | Once per event |
| Application start | `cta_clicked` where `cta_location` = any | Once per session |

## UTM Convention

| Parameter | Values | Example |
|-----------|--------|---------|
| `utm_source` | `wechat`, `xiaohongshu`, `linkedin`, `referral`, `direct` | `utm_source=xiaohongshu` |
| `utm_medium` | `social`, `email`, `cpc`, `referral` | `utm_medium=social` |
| `utm_campaign` | `founding_cohort`, `waitlist`, `sample_reading` | `utm_campaign=founding_cohort` |
| `utm_content` | `hero_cta`, `waitlist_band`, `pricing_card` | `utm_content=hero_cta` |

## What Is NOT Tracked (Privacy)

- Email addresses (waitlist form stores locally only)
- Birth data or personal narrative
- IP addresses (GA4 anonymizes by default)
- Form field contents
- Scroll position beyond milestone percentages

## Implementation Files

| File | Purpose |
|------|---------|
| `lib/track.ts` | Core tracker — `track()`, `trackCTA()`, `trackWaitlistSubmit()` |
| `components/TrackedLink.tsx` | Client component wrapping `<Link>` with click tracking |
| `components/WaitlistBand.tsx` | Waitlist form with submit tracking |
| `app/page.tsx` | Hero, pricing, and closing CTAs use `TrackedLink` |
