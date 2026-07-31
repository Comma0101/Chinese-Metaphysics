"use client";

import { useState, type FormEvent } from "react";
import { type Lang } from "@/lib/content";
import { track } from "@/lib/track";

interface Props {
  lang: Lang;
  h: string;
  lead: string;
  emailPlaceholder: string;
  countryLabel: string;
  cityLabel: string;
  cityPlaceholder: string;
  decisionLabel: string;
  decisionOptions: string[];
  windowLabel: string;
  windowOptions: string[];
  priceAck: string;
  btn: string;
  note: string;
  done: string;
  error: string;
}

type Status = "idle" | "submitting" | "done" | "error";

export function InvitationRequest({
  lang,
  h,
  lead,
  emailPlaceholder,
  countryLabel,
  cityLabel,
  cityPlaceholder,
  decisionLabel,
  decisionOptions,
  windowLabel,
  windowOptions,
  priceAck,
  btn,
  note,
  done,
  error,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("US");
  const [city, setCity] = useState("");
  const [decision, setDecision] = useState("");
  const [window, setWindow] = useState("");
  const [ack, setAck] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !decision || !window || !ack) return;

    setStatus("submitting");
    track("invitation_request_started", { location: "homepage" });

    try {
      const res = await fetch("/api/invitation-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          lang,
          country,
          city: city.trim() || undefined,
          decisionType: decision,
          decisionWindow: window,
          priceAcknowledged: ack,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      track("invitation_request_completed", { location: "homepage" });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="waitlist-band" id="request" data-act="invitation">
      <div className="wrap">
        <div className="wl-inner">
          <div className="wl-text">
            <h2 className="wl-h">{h}</h2>
            <p className="wl-lead">{lead}</p>
          </div>

          {status === "done" ? (
            <div className="wl-done">
              <span className="wl-done-mark">✓</span>
              {done}
            </div>
          ) : (
            <form className="ir-form" onSubmit={handleSubmit}>
              <div className="ir-grid">
                <input
                  type="email"
                  className="wl-input ir-email"
                  placeholder={emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="Email"
                />

                <select
                  className="ir-select"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  aria-label={countryLabel}
                >
                  <option value="US">🇺🇸 US</option>
                  <option value="CA">🇨🇦 CA</option>
                  <option value="GB">🇬🇧 UK</option>
                  <option value="AU">🇦🇺 AU</option>
                  <option value="SG">🇸🇬 SG</option>
                  <option value="NZ">🇳🇿 NZ</option>
                  <option value="JP">🇯🇵 JP</option>
                  <option value="DE">🇩🇪 DE</option>
                  <option value="NL">🇳🇱 NL</option>
                  <option value="OTHER">{lang === "zh" ? "其他" : "Other"}</option>
                </select>

                <input
                  type="text"
                  className="wl-input ir-city"
                  placeholder={cityPlaceholder}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={80}
                  aria-label={cityLabel}
                />

                <select
                  className="ir-select"
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  required
                  aria-label={decisionLabel}
                >
                  <option value="" disabled>
                    {decisionLabel}
                  </option>
                  {decisionOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                <select
                  className="ir-select"
                  value={window}
                  onChange={(e) => setWindow(e.target.value)}
                  required
                  aria-label={windowLabel}
                >
                  <option value="" disabled>
                    {windowLabel}
                  </option>
                  {windowOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <label className="ir-ack">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                  required
                />
                <span>{priceAck}</span>
              </label>

              {status === "error" && <p className="ir-error">{error}</p>}

              <button
                type="submit"
                className="wl-btn ir-btn"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "…" : btn}
              </button>
            </form>
          )}
          <p className="wl-note">{note}</p>
        </div>
      </div>
    </section>
  );
}
