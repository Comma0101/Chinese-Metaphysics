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

export const metadata: Metadata = {
  title: "Meridian 观复 | Private Chinese Metaphysics Consultation",
  description:
    "A private, human-reviewed, BaZi-led Chinese metaphysics consultation for one consequential decision. Invitation-only; applications and payments are currently closed.",
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
