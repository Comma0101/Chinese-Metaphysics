"use client";

import { useEffect, useRef, useState } from "react";
import {
  PILOT_CONSENT_VERSION,
  PRIVACY_NOTICE_VERSION,
  TERMS_VERSION,
  DEPOSIT_POLICY_VERSION,
  SOFTWARE_DISCLOSURE_VERSION,
  type PilotApplicationRequest,
  type PilotCheckoutResponse,
  type PilotCountry,
  type PilotDecisionType,
  type PilotDecisionWindow,
  type PilotFriendGraphClass,
} from "@/lib/contracts/pilot";
import { PILOT_FORM, type Lang } from "@/lib/content";

/**
 * 试点资格申请表 — submits EXACTLY the fields of PilotApplicationRequest.
 * Collects no name, no birth data, no question narrative, no third-party
 * facts. One UUID Idempotency-Key per unique payload (reused for retries of
 * the same payload, regenerated when anything changes). The access code
 * travels only in the X-Pilot-Access-Code header — never in the URL, the
 * payload, or any log.
 */

// the ten required acknowledgements, keyed to contract fields
const ACK_KEYS = [
  "ageConfirmed",
  "priceAcknowledged",
  "frameworkAccepted",
  "agencyAccepted",
  "scopeAccepted",
  "softwareDisclosureAcknowledged",
  "privacyConsent",
  "termsAccepted",
  "depositPolicyAccepted",
  "selfOnlyDataConfirmed",
] as const;
type AckKey = (typeof ACK_KEYS)[number];

const bounded = (v: string, max: number) => v.trim().slice(0, max);

export function PilotApplication({ lang }: { lang: Lang }) {
  const c = PILOT_FORM[lang];

  const [email, setEmail] = useState("");
  const [country, setCountry] = useState<PilotCountry>("US");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [decisionType, setDecisionType] = useState<PilotDecisionType>("career");
  const [decisionWindow, setDecisionWindow] = useState<PilotDecisionWindow | "">("");
  const [friendGraph, setFriendGraph] = useState<PilotFriendGraphClass>("unknown");
  const [accessCode, setAccessCode] = useState("");
  const [acks, setAcks] = useState<Record<AckKey, boolean>>(
    Object.fromEntries(ACK_KEYS.map((k) => [k, false])) as Record<AckKey, boolean>,
  );
  const [crisis, setCrisis] = useState<"" | "yes" | "no">("");
  const [restricted, setRestricted] = useState<"" | "yes" | "no">("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [declineReasons, setDeclineReasons] = useState<string[] | null>(null);

  // bounded attribution, read once from the landing URL — never the code
  const attribution = useRef<{ source?: string; medium?: string; campaign?: string; referrer?: string }>({});
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const pick = (k: string) => {
      const v = q.get(k);
      return v ? bounded(v, 64) : undefined;
    };
    attribution.current = {
      source: pick("utm_source"),
      medium: pick("utm_medium"),
      campaign: pick("utm_campaign"),
      referrer: document.referrer ? bounded(document.referrer, 200) : undefined,
    };
  }, []);

  // one Idempotency-Key per unique payload; retries of the same payload reuse it
  const idem = useRef<{ sig: string; key: string } | null>(null);

  function buildPayload(): PilotApplicationRequest {
    const attr = attribution.current;
    const hasAttr = attr.source || attr.medium || attr.campaign || attr.referrer || friendGraph !== "unknown";
    return {
      lang,
      email: bounded(email, 254),
      country,
      region: bounded(region, 80),
      city: bounded(city, 80),
      decisionType,
      decisionWindow: decisionWindow as PilotDecisionWindow,
      ageConfirmed: acks.ageConfirmed,
      priceAcknowledged: acks.priceAcknowledged,
      frameworkAccepted: acks.frameworkAccepted,
      agencyAccepted: acks.agencyAccepted,
      scopeAccepted: acks.scopeAccepted,
      softwareDisclosureAcknowledged: acks.softwareDisclosureAcknowledged,
      privacyConsent: acks.privacyConsent,
      termsAccepted: acks.termsAccepted,
      depositPolicyAccepted: acks.depositPolicyAccepted,
      selfOnlyDataConfirmed: acks.selfOnlyDataConfirmed,
      acuteCrisis: crisis === "yes",
      restrictedAdvice: restricted === "yes",
      ...(hasAttr
        ? {
            attribution: {
              ...(attr.source ? { source: attr.source } : {}),
              ...(attr.medium ? { medium: attr.medium } : {}),
              ...(attr.campaign ? { campaign: attr.campaign } : {}),
              ...(attr.referrer ? { referrer: attr.referrer } : {}),
              friendGraph,
            },
          }
        : {}),
      pilotConsentVersion: PILOT_CONSENT_VERSION,
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      termsVersion: TERMS_VERSION,
      depositPolicyVersion: DEPOSIT_POLICY_VERSION,
      softwareDisclosureVersion: SOFTWARE_DISCLOSURE_VERSION,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDeclineReasons(null);

    const missingAck = ACK_KEYS.some((k) => !acks[k]);
    if (!email.trim() || !region.trim() || !city.trim() || !decisionWindow || !crisis || !restricted || missingAck || !accessCode.trim()) {
      setError(c.errors.missing);
      return;
    }

    const payload = buildPayload();
    const sig = JSON.stringify(payload);
    if (!idem.current || idem.current.sig !== sig) {
      idem.current = { sig, key: crypto.randomUUID() };
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idem.current.key,
          "X-Pilot-Access-Code": accessCode.trim(),
        },
        body: sig,
      });

      if (res.status === 409) {
        setError(c.errors.conflict);
        return;
      }
      if (res.status === 413) {
        setError(c.errors.tooLarge);
        return;
      }
      if (res.status === 415) {
        setError(c.errors.badContentType);
        return;
      }

      const data = (await res.json()) as PilotCheckoutResponse;
      switch (data.status) {
        case "checkout_created":
          window.location.href = data.checkoutUrl;
          return;
        case "validation_failed":
          setError(c.errors.validation);
          return;
        case "declined":
          setDeclineReasons(data.reasons);
          return;
        case "access_denied":
          setError(c.errors.accessDenied);
          return;
        case "pilot_closed":
          setError(c.errors.pilotClosed);
          return;
        case "checkout_expired":
          setError(c.errors.checkoutExpired);
          return;
        case "checkout_unavailable":
          setError(c.errors.checkoutUnavailable);
          return;
        default:
          setError(c.errors.network);
          return;
      }
    } catch {
      setError(c.errors.network);
    } finally {
      setSubmitting(false);
    }
  }

  function setAck(k: AckKey, v: boolean) {
    setAcks((a) => ({ ...a, [k]: v }));
  }

  if (declineReasons) {
    return (
      <div className="pilot-decline" role="status">
        <p className="falsify-label">{c.eyebrow}</p>
        <p className="pd-lead">{c.errors.declined}</p>
        <ul>
          {declineReasons.map((r) => (
            <li key={r}>{c.errors.declinedReasons[r] ?? r}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form className="form-doc" onSubmit={submit} noValidate>
      <p className="field-privacy">{c.noSensitive}</p>

      {/* 一 · 基本情况 */}
      <section className="form-section" aria-labelledby="sec-basics">
        <div className="fs-head">
          <span className="fs-num" aria-hidden="true">
            {lang === "zh" ? "一" : "1"}
          </span>
          <h2 className="fs-title" id="sec-basics">
            {c.sectionBasics}
          </h2>
        </div>

        <div className="field">
          <label htmlFor="email">
            {c.email} <span className="hint">{c.emailHint}</span>
            <span className="req">{c.required}</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={254}
            required
          />
        </div>

        <div className="row2">
          <div className="field">
            <label htmlFor="country">
              {c.country}
              <span className="req">{c.required}</span>
            </label>
            <select id="country" value={country} onChange={(e) => setCountry(e.target.value as PilotCountry)}>
              {c.countries.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="region">
              {c.region}
              <span className="req">{c.required}</span>
            </label>
            <input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={c.regionPlaceholder}
              maxLength={80}
              required
            />
          </div>
        </div>

        <div className="row2">
          <div className="field">
            <label htmlFor="city">
              {c.city}
              <span className="req">{c.required}</span>
            </label>
            <input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={c.cityPlaceholder}
              maxLength={80}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="friendGraph">{c.friendGraph}</label>
            <select
              id="friendGraph"
              value={friendGraph}
              onChange={(e) => setFriendGraph(e.target.value as PilotFriendGraphClass)}
            >
              {c.friendGraphs.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="accessCode">
            {c.accessCode} <span className="hint">{c.accessCodeHint}</span>
            <span className="req">{c.required}</span>
          </label>
          <input
            id="accessCode"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={64}
            required
          />
        </div>
      </section>

      {/* 二 · 你的决定 */}
      <section className="form-section" aria-labelledby="sec-decision">
        <div className="fs-head">
          <span className="fs-num" aria-hidden="true">
            {lang === "zh" ? "二" : "2"}
          </span>
          <h2 className="fs-title" id="sec-decision">
            {c.sectionDecision}
          </h2>
        </div>

        <div className="row2">
          <div className="field">
            <label htmlFor="decisionType">
              {c.decisionType}
              <span className="req">{c.required}</span>
            </label>
            <select
              id="decisionType"
              value={decisionType}
              onChange={(e) => setDecisionType(e.target.value as PilotDecisionType)}
            >
              {c.decisionTypes.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="decisionWindow">
              {c.decisionWindow}
              <span className="req">{c.required}</span>
            </label>
            <select
              id="decisionWindow"
              value={decisionWindow}
              onChange={(e) => setDecisionWindow(e.target.value as PilotDecisionWindow)}
            >
              <option value="" disabled>
                —
              </option>
              {c.decisionWindows.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 三 · 安全确认 */}
      <section className="form-section" aria-labelledby="sec-screen">
        <div className="fs-head">
          <span className="fs-num" aria-hidden="true">
            {lang === "zh" ? "三" : "3"}
          </span>
          <h2 className="fs-title" id="sec-screen">
            {c.sectionScreen}
          </h2>
        </div>

        <fieldset className="screen-q">
          <legend>
            {c.screenCrisis}
            <span className="req">{c.required}</span>
          </legend>
          <div className="screen-opts">
            <label>
              <input type="radio" name="crisis" checked={crisis === "no"} onChange={() => setCrisis("no")} />
              {c.no}
            </label>
            <label>
              <input type="radio" name="crisis" checked={crisis === "yes"} onChange={() => setCrisis("yes")} />
              {c.yes}
            </label>
          </div>
        </fieldset>

        <fieldset className="screen-q">
          <legend>
            {c.screenRestricted}
            <span className="req">{c.required}</span>
          </legend>
          <div className="screen-opts">
            <label>
              <input type="radio" name="restricted" checked={restricted === "no"} onChange={() => setRestricted("no")} />
              {c.no}
            </label>
            <label>
              <input type="radio" name="restricted" checked={restricted === "yes"} onChange={() => setRestricted("yes")} />
              {c.yes}
            </label>
          </div>
        </fieldset>
      </section>

      {/* 四 · 确认与同意 */}
      <section className="form-section" aria-labelledby="sec-consent">
        <div className="fs-head">
          <span className="fs-num" aria-hidden="true">
            {lang === "zh" ? "四" : "4"}
          </span>
          <h2 className="fs-title" id="sec-consent">
            {c.sectionConsent}
          </h2>
        </div>

        {c.acks.map((a) => (
          <label className="ack-row" key={a.key}>
            <input
              type="checkbox"
              checked={acks[a.key as AckKey]}
              onChange={(e) => setAck(a.key as AckKey, e.target.checked)}
              required
            />
            <span>{a.label}</span>
          </label>
        ))}

      </section>

      <p className="form-note">{c.priceLine}</p>
      <p className="form-note">{c.gateNote}</p>

      {error && (
        <p className="margin-note" role="alert">
          {error}
        </p>
      )}

      <button className="btn form-submit" type="submit" disabled={submitting}>
        {submitting ? c.submitting : c.submit}
      </button>
    </form>
  );
}
