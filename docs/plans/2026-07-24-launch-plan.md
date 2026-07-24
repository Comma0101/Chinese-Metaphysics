# Founding Cohort Launch Plan

*Created: 2026-07-24*
*12 seats · US$49 deposit → US$388 full price · asynchronous written delivery*

---

## Pre-Launch Checklist (must complete before opening)

### Technical
- [ ] Supabase/Postgres deployment verified
- [ ] Webhook lifecycle tested (Stripe → outbox → confirmation)
- [ ] Deletion/redaction/retention operations tested
- [ ] Database integration tests passing with `TEST_DATABASE_URL`
- [ ] Waitlist form connected to backend (email storage)
- [ ] Analytics provider connected (GA4 or PostHog)
- [ ] `/ask` application form fully functional
- [ ] `/success` page polling working
- [ ] Mobile responsive verified on iOS Safari + Android Chrome

### Legal / Compliance
- [ ] Privacy notice published (not DRAFT)
- [ ] Terms of service published (not DRAFT)
- [ ] Deposit/refund policy published (not DRAFT)
- [ ] Method disclosure published
- [ ] Qualified legal review completed
- [ ] Payment processor (Stripe) account verified for this use case

### Content
- [ ] Sample reading reviewed and approved
- [ ] All homepage copy finalized (post-CRO rewrites)
- [ ] Email sequences written (4-email pre-launch + launch day)
- [ ] Xiaohongshu launch post drafted
- [ ] LinkedIn launch post drafted

---

## Launch Sequence

### T-7 Days: Anticipation Email

**Subject (zh):** 知几首批名额 — 开放前最后一封信
**Subject (en):** Zhiji founding seats — one last message before we open

**Content:**
- What we learned from discovery calls (3 specific insights)
- What the service includes (written brief + follow-up + 30/90 review)
- What it does NOT include (no calls, no remedies, no predictions)
- "In 7 days, we open 12 seats. This email is the only notice you'll get."
- CTA: "Read the sample brief →" (link to /reading/sample)

### T-3 Days: Process Transparency Email

**Subject (zh):** 一份判读从申请到交付，中间发生了什么
**Subject (en):** What happens between your application and your brief

**Content:**
- Step-by-step process with timelines
- Who reviews your case (reviewer-role ID, not a name)
- How corrections work (version history, not silent edits)
- What happens to your data (minimization, retention, deletion)
- CTA: "See the full method →" (link to /method)

### T-1 Day: Final Notice

**Subject (zh):** 明天开放 12 席
**Subject (en):** 12 seats open tomorrow

**Content:**
- 3 sentences only: what, when, how
- "Tomorrow at 10:00 AM PT, the application opens for 12 founding seats."
- "US$49 deposit, credited in full toward US$388 if accepted."
- CTA: "Set a reminder →" (no link to apply yet — builds anticipation)

### T-0: Launch Day

**10:00 AM PT — Open applications**
- Enable payment processing
- Send launch email to waitlist

**Launch Email:**

**Subject (zh):** 知几首批 12 席，现在开放
**Subject (en):** Zhiji founding cohort — 12 seats, now open

**Content:**
- "The application is open. 12 seats. First come, first reviewed."
- What you need: your birth date, time, location, and one decision you're facing
- What you don't need: a long story, a specific question format, or certainty about what you want
- The deposit: US$49, credited in full if accepted, refunded if not
- CTA: "Apply now →" (link to /ask)
- Secondary: "Not ready? Read the sample first →" (link to /reading/sample)

**Simultaneous social posts:**
- Xiaohongshu: "首批 12 席，今天开放。不催你，不吓你。" + link
- LinkedIn: "We're opening 12 founding seats for Zhiji. Here's why the number is small." + link
- WeChat Moments: Short post with QR code to homepage

### T+1 Day: Social Proof

- If 3+ applications received: post anonymized milestone
  - "首批申请已收到 X 份。每一份都会逐一审核。"
- If 0 applications: do NOT post. Wait. Do not manufacture urgency.

### T+3 Days: Mid-Launch Check

- Review application quality (are they ICP-fit?)
- If seats remain: send one follow-up email to waitlist non-openers
  - Subject: "还有 X 席" / "X seats remaining"
  - Content: 2 sentences + CTA
- If sold out: send waitlist email — "首批已满，下一批预计 X 周后"

### T+7 Days: Close or Extend

- If sold out: close applications, send confirmation to accepted cases
- If 8+ sold: close remaining seats, send "next wave" notice to waitlist
- If <8 sold: extend by 72 hours, send one more email, then close regardless

---

## Post-Launch: Delivery Cycle

### Week 1–2 after close
- Review all applications against acceptance criteria
- Accept or decline each case within 3 business days
- Send acceptance email with next steps (birth data collection)
- Send decline email with refund confirmation + reason (scope mismatch, not quality judgment)

### Week 2–4
- Deliver first 5 cases (written briefs)
- Each brief includes: case ID, reviewer-role ID, method version, review date
- Send delivery email with brief link + follow-up instructions

### Week 4–6
- Collect 14-day written follow-ups from delivered cases
- Issue material corrections as new versions with revision history
- Begin 30-day written review cycle

### Week 8–12
- Complete 30-day reviews
- Request anonymized feedback (with consent)
- Write case studies from delivered cases
- Plan second cohort (12 seats) based on learnings

---

## Scarcity Mechanics

| Rule | Rationale |
|------|-----------|
| 12 seats per wave | Delivery capacity: ~3.5 hours per case × 12 = 42 hours |
| No waitlist priority | First-come-first-reviewed prevents gaming |
| No early-bird discount | Price is a hypothesis, not a promotion |
| No countdown timer on site | Fear-based urgency violates brand voice |
| Email-only notice | Scarcity communicated through owned channel, not manufactured UI pressure |

---

## Referral Strategy (Post-Delivery Only)

- After 30-day review, ask satisfied clients: "Do you know one person facing a hard decision who might benefit from this?"
- Provide a personal referral link (not a discount — a priority seat in the next wave)
- Never ask for public testimonials. Anonymized case studies only, with written consent.
- Never incentivize referrals with money or discounts. The service quality is the incentive.

---

## Metrics to Watch Daily During Launch

| Metric | Target | Alert if |
|--------|--------|----------|
| Application starts | 3+/day | <1/day for 2 consecutive days |
| Application completions | 60%+ of starts | <40% completion rate |
| Deposit payments | 80%+ of completions | <60% payment rate |
| Email open rate | 40%+ | <25% |
| Email click rate | 8%+ | <3% |
| Site bounce rate | <60% | >75% |
| Waitlist signups (during launch) | 10+/day | <3/day |
