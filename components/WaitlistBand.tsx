"use client";

import { useState, type FormEvent } from "react";
import { type Lang } from "@/lib/content";
import { trackWaitlistSubmit } from "@/lib/track";

export function WaitlistBand({
  lang,
  h,
  lead,
  placeholder,
  btn,
  note,
  done,
}: {
  lang: Lang;
  h: string;
  lead: string;
  placeholder: string;
  btn: string;
  note: string;
  done: string;
}) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    trackWaitlistSubmit();
    setSubmitted(true);
  }

  return (
    <section className="waitlist-band" data-act="waitlist">
      <div className="wrap">
        <div className="wl-inner">
          <div className="wl-text">
            <h2 className="wl-h">{h}</h2>
            <p className="wl-lead">{lead}</p>
          </div>
          {submitted ? (
            <div className="wl-done">
              <span className="wl-done-mark">✓</span>
              {done}
            </div>
          ) : (
            <form className="wl-form" onSubmit={handleSubmit}>
              <input
                type="email"
                className="wl-input"
                placeholder={placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label={lang === "zh" ? "邮箱地址" : "Email address"}
              />
              <button type="submit" className="wl-btn">
                {btn}
              </button>
            </form>
          )}
          <p className="wl-note">{note}</p>
        </div>
      </div>
    </section>
  );
}
