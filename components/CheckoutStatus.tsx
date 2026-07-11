"use client";

import { useEffect, useRef, useState } from "react";
import type { PilotCheckoutStatusResponse } from "@/lib/contracts/pilot";
import { PILOT_STATUS, type Lang } from "@/lib/content";

/**
 * 只读支付状态 — polls GET /api/checkout/status?session_id=… and renders the
 * typed result. This component NEVER imports Stripe and NEVER mutates payment
 * state; the webhook is the sole writer. Polling stops on a terminal state or
 * after a bounded number of attempts.
 */

type View = "checking" | "payment_pending" | "paid" | "refunded" | "not_found" | "status_unavailable";

const POLL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutes, then rest at the last known state

export function CheckoutStatus({ lang }: { lang: Lang }) {
  const c = PILOT_STATUS[lang];
  const [view, setView] = useState<View>("checking");
  const polls = useRef(0);
  const timer = useRef<number>(0);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      setView("not_found");
      return;
    }

    let stopped = false;

    async function poll() {
      if (stopped) return;
      polls.current += 1;
      try {
        const res = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId!)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data = (await res.json()) as PilotCheckoutStatusResponse;
        if (stopped) return;
        switch (data.status) {
          case "paid":
          case "refunded":
          case "not_found":
            setView(data.status);
            return; // terminal — stop polling
          case "payment_pending":
            setView("payment_pending");
            break;
          case "status_unavailable":
          default:
            setView("status_unavailable");
            break;
        }
      } catch {
        if (!stopped) setView("status_unavailable");
      }
      if (!stopped && polls.current < MAX_POLLS) {
        timer.current = window.setTimeout(poll, POLL_MS);
      }
    }

    poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer.current);
    };
  }, []);

  const heads: Record<View, { h: string; lead: string }> = {
    checking: { h: c.checking, lead: "" },
    payment_pending: { h: c.pendingH, lead: c.pendingLead },
    paid: { h: c.paidH, lead: c.paidLead },
    refunded: { h: c.refundedH, lead: c.refundedLead },
    not_found: { h: c.notFoundH, lead: c.notFoundLead },
    status_unavailable: { h: c.unavailableH, lead: c.unavailableLead },
  };

  const { h, lead } = heads[view];

  return (
    <div aria-live="polite">
      <h1>{h}</h1>
      {lead && <p className="lead">{lead}</p>}

      {view === "paid" && (
        <ol className="timeline">
          {c.paidNext.map((s, i) => (
            <li key={i}>
              <span className="t-k">{s.k}</span>
              <span className="t-v">{s.v}</span>
            </li>
          ))}
        </ol>
      )}

      {(view === "paid" || view === "refunded") && <p className="receipt-contact">{c.contact}</p>}
    </div>
  );
}
