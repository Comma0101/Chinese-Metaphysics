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
  assert.match(T.zh.home.lead, /八字/);
  assert.match(T.en.home.lead, /BaZi/);
  assert.doesNotMatch(T.zh.home.h1, /命是结构|结局/);
  assert.doesNotMatch(T.en.home.h1, /\bfate\b|verdict/i);
  assert.match(T.zh.home.lead, /书面判读/);
  assert.match(T.zh.home.lead, /书面澄清/);
  assert.match(T.en.home.lead, /written decision brief/i);
  assert.match(T.en.home.lead, /written clarification/i);
  assert.doesNotMatch(T.zh.home.cta, /申请|试点/);
  assert.doesNotMatch(T.en.home.cta, /apply|pilot/i);
});

test("copy names customer situations and observable deliverables", () => {
  const zh = JSON.stringify(T.zh.home);
  const en = JSON.stringify(T.en.home);

  for (const phrase of ["offer", "去留", "迁移", "书面判读", "书面澄清"]) {
    assert.equal(zh.includes(phrase), true, `missing Chinese service language: ${phrase}`);
  }
  for (const phrase of [
    "offer",
    "relocation",
    "written decision brief",
    "written clarification",
  ]) {
    assert.equal(en.toLowerCase().includes(phrase.toLowerCase()), true, `missing English service language: ${phrase}`);
  }
});

test("public delivery is fully asynchronous and written", () => {
  const delivery = JSON.stringify({
    home: T,
    explainer: PILOT_EXPLAINER,
    guarantees: GUARANTEES,
    tiers: PILOT_PATH,
  });

  assert.match(delivery, /书面澄清/);
  assert.match(delivery, /written clarification/i);
  assert.match(delivery, /asynchronous|异步/i);
  assert.doesNotMatch(
    delivery,
    /面谈|通话|语音解读|视频咨询|60\s*分钟|60-minute|live session|private session|video consultation/i,
  );
});

test("illustrative sample avoids fabricated proof and precise future timing", () => {
  const sample = JSON.stringify(SAMPLE);

  assert.match(SAMPLE.zh.tag, /演示|虚构/);
  assert.match(SAMPLE.en.tag, /illustrative|fictional/i);
  assert.doesNotMatch(
    sample,
    /18 个月|18 months|2\.5 years|两年半|真实客户案例|real client (?:case|result|proof)/i,
  );
  assert.doesNotMatch(sample, /一定|必然|will succeed|best time/i);
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
  assert.doesNotMatch(sample, /Method v1\.0|not client proof/i);
  assert.match(sample, /method specification pending/i);
  assert.match(layout, /Private Chinese Metaphysics Consultation/);
});
