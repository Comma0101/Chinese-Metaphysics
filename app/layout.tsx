import type { Metadata } from "next";
import Script from "next/script";
import { Newsreader, IBM_Plex_Mono, Fraunces, Noto_Serif_SC } from "next/font/google";
import { InkWear } from "@/components/InkWear";
// 楷体 — the annotation voice (self-hosted, unicode-range sliced woff2)
import "lxgw-wenkai-lite-webfont/style.css";
import "./globals.css";

// 雕宋 — the engraved display cut for monuments (next/font slices CJK automatically)
const carve = Noto_Serif_SC({
  weight: ["900"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-carve",
});

// Latin display — warm editorial serif (髹夜 · Lacquer Nocturne)
const display = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

// Canonical deployed origin (e.g. https://meridian.kummalabs.com). Drives
// metadataBase / Open Graph / canonical so share previews and SEO resolve to
// the real host. Env-gated: when unset (local dev, or a build without it) we
// emit no absolute URLs rather than baking a wrong host. The checkout already
// reads this same var as the only trusted origin.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const metadataBase = siteUrl ? new URL(siteUrl) : undefined;

const ogTitle = "Meridian 观复 | Private Chinese Metaphysics Consultation";
const ogDescription =
  "A private, human-reviewed Chinese metaphysics consultation for one consequential decision, reading through Zi Wei Dou Shu, Qi Zheng Si Yu, and Qi Men Dun Jia. Invitation-only.";

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: "Meridian 观复 | Private Chinese Metaphysics Consultation",
  description:
    "A private, human-reviewed Chinese metaphysics consultation for one consequential decision, reading through Zi Wei Dou Shu, Qi Zheng Si Yu, and Qi Men Dun Jia. Invitation-only; applications and payments are currently closed.",
  openGraph: {
    title: ogTitle,
    description: ogDescription,
    siteName: "Meridian 观复",
    type: "website",
    locale: "zh_CN",
    ...(metadataBase ? { url: "/" } : {}),
  },
  ...(metadataBase ? { alternates: { canonical: "/" } } : {}),
  twitter: {
    card: "summary_large_image",
    title: ogTitle,
    description: ogDescription,
  },
  icons: {
    icon: "/icon.svg",
  },
};

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" className={`${display.variable} ${serif.variable} ${mono.variable} ${carve.variable}`}>
      <body>
        <InkWear />
        {children}
        {POSTHOG_KEY && (
          <Script id="posthog" strategy="afterInteractive">
            {`
              !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture identify".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
              posthog.init('${POSTHOG_KEY}', {
                api_host: '${POSTHOG_HOST}',
                person_profiles: 'identified_only',
                capture_pageview: true,
                capture_pageleave: true
              });
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
