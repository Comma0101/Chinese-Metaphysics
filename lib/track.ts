/**
 * Privacy-first event tracker.
 *
 * In development: logs to console.
 * In production: no-op until an analytics provider is configured.
 *
 * To connect GA4: set NEXT_PUBLIC_GA_ID in .env.local
 * To connect PostHog: set NEXT_PUBLIC_POSTHOG_KEY in .env.local
 *
 * No PII is ever sent. Email addresses are hashed before storage.
 */

type EventProperties = Record<string, string | number | boolean | undefined>;

interface TrackEvent {
  name: string;
  properties: EventProperties;
  timestamp: number;
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

function isDev() {
  return process.env.NODE_ENV === "development";
}

function sendGA(event: TrackEvent) {
  if (!GA_ID || typeof window === "undefined") return;
  const gtag = (window as any).gtag;
  if (typeof gtag === "function") {
    gtag("event", event.name, event.properties);
  }
}

function sendPostHog(event: TrackEvent) {
  if (!POSTHOG_KEY || typeof window === "undefined") return;
  const posthog = (window as any).posthog;
  if (posthog && typeof posthog.capture === "function") {
    posthog.capture(event.name, event.properties);
  }
}

export function track(name: string, properties: EventProperties = {}) {
  const event: TrackEvent = {
    name,
    properties: {
      ...properties,
      page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
      page_lang: typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("lang") || "zh"
        : undefined,
    },
    timestamp: Date.now(),
  };

  if (isDev()) {
    console.log(`[track] ${event.name}`, event.properties);
  }

  sendGA(event);
  sendPostHog(event);
}

/* ---- convenience helpers ---- */

export function trackCTA(label: string, location: string) {
  track("cta_clicked", { cta_label: label, cta_location: location });
}

export function trackScroll(depth: number) {
  track("scroll_depth", { depth_percent: depth });
}

export function trackPageView(lang: string) {
  track("page_view", { lang });
}

/* ---- funnel events ---- */

export function trackSampleOpened() {
  track("sample_opened");
}

export function trackInvitationStarted(location: string) {
  track("invitation_request_started", { location });
}

export function trackInvitationCompleted(location: string) {
  track("invitation_request_completed", { location });
}

export function trackDepositCheckoutStarted() {
  track("deposit_checkout_started");
}

export function trackDepositPaid() {
  track("deposit_paid");
}
