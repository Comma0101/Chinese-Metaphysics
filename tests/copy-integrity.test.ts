import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CLOSING,
  FOOTER,
  GUARANTEES,
  HEADER,
  PILOT_FORM,
  PILOT_EXPLAINER,
  SAMPLE,
  T,
  TRUST,
} from "../lib/content";
import { PILOT_PATH } from "../lib/tiers";

test("homepage leads with a concrete Chinese metaphysics service, not a fate slogan", () => {
  assert.match(T.zh.home.eyebrow, /私人中国命理咨询/);
  assert.match(T.en.home.eyebrow, /Private Chinese metaphysics consultation/);
  // the hero lead names the three-system method (abbreviated for a cold reader) and never BaZi
  assert.match(T.zh.home.lead, /紫微/);
  assert.doesNotMatch(T.zh.home.lead, /八字|子平/);
  assert.match(T.en.home.lead, /Zi Wei/);
  assert.doesNotMatch(T.en.home.lead, /\bBaZi\b|Ziping/i);
  assert.doesNotMatch(T.zh.home.h1, /命是结构|结局/);
  assert.doesNotMatch(T.en.home.h1, /\bfate\b|verdict/i);
  // deliverable + written-follow-up promises live on the page (confidence / guarantees), not the hero lead
  assert.match(JSON.stringify(T.zh.home), /书面决策判读/);
  assert.match(
    JSON.stringify({ home: T.zh.home, guarantees: GUARANTEES.zh }),
    /集中提交一轮关于原判读依据、假设或表述的书面问题/,
  );
  assert.match(JSON.stringify(T.en.home), /written decision brief/i);
  assert.match(JSON.stringify(T.en.home), /one consolidated written follow-up/i);
  assert.doesNotMatch(T.zh.home.cta, /申请|试点/);
  assert.doesNotMatch(T.en.home.cta, /apply|pilot/i);
});

test("copy names customer situations and observable deliverables", () => {
  const zh = JSON.stringify(T.zh.home);
  const en = JSON.stringify(T.en.home);

  for (const phrase of ["offer", "去留", "迁移", "书面决策判读", "一轮书面澄清"]) {
    assert.equal(zh.includes(phrase), true, `missing Chinese service language: ${phrase}`);
  }
  for (const phrase of [
    "offer",
    "relocation",
    "written decision brief",
    "one consolidated written follow-up",
  ]) {
    assert.equal(en.toLowerCase().includes(phrase.toLowerCase()), true, `missing English service language: ${phrase}`);
  }
});

test("public delivery is fully asynchronous and written", () => {
  const delivery = JSON.stringify({
    home: T,
    form: PILOT_FORM,
    explainer: PILOT_EXPLAINER,
    closing: CLOSING,
    footer: FOOTER,
    guarantees: GUARANTEES,
    tiers: PILOT_PATH,
  });

  assert.match(delivery, /集中提交一轮关于原判读依据、假设或表述的书面问题/);
  assert.match(delivery, /one consolidated written follow-up/i);
  assert.match(delivery, /asynchronous|异步/i);
  assert.equal(T.zh.home.steps[2]?.h, "交付、澄清与复盘，全程以书面进行");
  assert.doesNotMatch(
    delivery,
    /defined written clarification|人工审核交付|集中提交一次书面澄清|以书面完成交付、澄清与复盘/i,
  );
  assert.doesNotMatch(
    delivery,
    /面谈|通话|语音解读|视频咨询|会面|一对一|60\s*分钟|60-minute|live session|private session|video consultation|\bmeeting\b|\bcall\b|audio session|synchronous consultation/i,
  );
});

test("sample delivery excerpts avoid fabricated proof, precise future timing, and identifying data", () => {
  const sample = JSON.stringify(SAMPLE);

  assert.match(SAMPLE.zh.tag, /真实交付|脱敏/);
  assert.match(SAMPLE.en.tag, /real delivery|anonymized/i);
  assert.doesNotMatch(
    sample,
    /18 个月|18 months|2\.5 years|两年半|真实客户案例|real client (?:case|result|proof)/i,
  );
  assert.doesNotMatch(sample, /一定|必然|will succeed|best time/i);
  // anonymization: no birth data, birth place, or frozen chart timing from the source case
  assert.doesNotMatch(sample, /1991|金阳|凌晨\s*3\s*点|13:57|丑时|阴遁/);
  assert.match(SAMPLE.zh.falsifyLabel, /改变|推翻|不成立/);
  assert.match(SAMPLE.en.falsifyLabel, /change|invalidate|wrong/i);
});

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
    /主理人|具名咨询师|practitioner profile|publish(?:es)? the practitioner's name|named practitioner|personally delivered/i,
  );
  assert.match(TRUST.zh.eyebrow, /方法与责任/);
  assert.match(TRUST.en.eyebrow, /method.*accountability/i);
  assert.match(TRUST.zh.body, /人工审核/);
  assert.match(TRUST.en.body, /human review/i);
  assert.match(TRUST.zh.body, /案例编号|方法版本/);
  assert.match(TRUST.en.body, /case number|method version/i);
});

test("application and closing use calm private-practice language", () => {
  const application = JSON.stringify(PILOT_FORM);
  assert.doesNotMatch(PILOT_FORM.zh.h1, /付费|校准|匹配/);
  assert.doesNotMatch(PILOT_FORM.en.h1, /payment|calibration|fit/i);
  assert.doesNotMatch(application, /我已阅读并同意|I have read and accept/i);
  assert.doesNotMatch(CLOSING.zh.cta, /创始试点/);
  assert.doesNotMatch(CLOSING.en.cta, /founding pilot/i);
});

test("English copy is professional, customer-facing, and aligned with the umbrella category", () => {
  const english = JSON.stringify({
    home: T.en.home,
    form: PILOT_FORM.en,
    trust: TRUST.en,
    guarantees: GUARANTEES.en,
    tiers: PILOT_PATH.map((stage) => ({
      name: stage.name.en,
      blurb: stage.blurb.en,
      includes: stage.includes.en,
      footnote: stage.footnote.en,
    })),
  });

  assert.match(T.en.home.eyebrow, /Private Chinese metaphysics consultation/i);
  assert.match(english, /Zi Wei Dou Shu/);
  assert.match(JSON.stringify(T.zh.home), /紫微斗数/);
  assert.equal(TRUST.en.h, "Every case includes a traceable review record");
  assert.equal(GUARANTEES.en.eyebrow, "Before payments open");
  assert.doesNotMatch(
    english,
    /operating gates|bounded follow-up|risk posture|No payment happened|Back to home|complete fee structure/i,
  );
});

test("pages contain no stale hard-coded hero, personal practitioner promise, or marketing-consent capture", async () => {
  const [home, application, layout, sample] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/PilotApplication.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/reading/sample/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(home, /命是<span|Fate is a structure/);
  assert.doesNotMatch(application, /setMarketing|marketingConsent/);
  assert.doesNotMatch(layout, /命是结构|先验盘/);
  assert.doesNotMatch(
    sample,
    /practitioner profile|practitioner's name|portrait(?:Url|Src)/i,
  );
  // the sample is an anonymized real delivery, not a fictional scenario
  assert.doesNotMatch(sample, /fictional|虚构演示/i);
  assert.match(sample, /anonymized|已脱敏/);
  assert.match(layout, /Private Chinese Metaphysics Consultation/);
});
