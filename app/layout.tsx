import type { Metadata } from "next";
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
      </body>
    </html>
  );
}
