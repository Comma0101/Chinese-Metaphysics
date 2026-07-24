"use client";

import { Fragment } from "react";
import type { CSSProperties } from "react";

/**
 * 落墨 — the hero monument, rendered so each glyph brush-writes itself.
 *
 * The text stays fully in the DOM (selectable, crawlable, painted for LCP);
 * only a per-glyph @property mask animates it in bottom-up (see [data-ink-reveal]
 * in globals.css). The reveal is pure CSS with a per-cell delay set here, so it
 * is flash-free, still reveals with JS disabled, and shows instantly under
 * prefers-reduced-motion.
 *
 * CJK: closing punctuation (，。 …) is merged into the preceding glyph's cell so
 * it can never orphan at the start of a wrapped line (kinsoku), and the verse
 * stack breaks after each "，" — matching the original composition. Latin groups
 * into words so a word never breaks mid-glyph while wrapping.
 */
const STEP = 0.055; // seconds between successive cells
const CJK = /[　-〿㐀-鿿＀-￯]/;
const CLOSER = /[，。！？、；：）」』】》〉]/;

export function InkReveal({ text, className }: { text: string; className?: string }) {
  let n = 0; // running cell index across the whole monument → staggered delay

  const cell = (s: string, key: string | number) => {
    const delay = (n++ * STEP).toFixed(3);
    return (
      <span className="ink-char" key={key} style={{ "--ink-delay": `${delay}s` } as CSSProperties}>
        {s}
      </span>
    );
  };

  if (CJK.test(text)) {
    const cells: string[] = [];
    for (const ch of Array.from(text)) {
      if (CLOSER.test(ch) && cells.length) cells[cells.length - 1] += ch;
      else cells.push(ch);
    }
    return (
      <span className={className} data-ink-reveal>
        {cells.map((c, i) => (
          <Fragment key={i}>
            {cell(c, i)}
            {c.endsWith("，") && <br />}
          </Fragment>
        ))}
      </span>
    );
  }

  return (
    <span className={className} data-ink-reveal>
      {text.split(/(\s+)/).map((tok, i) =>
        /\s+/.test(tok) ? (
          <span key={i}> </span>
        ) : (
          <span className="ink-word" key={i}>
            {Array.from(tok).map((ch, j) => cell(ch, `${i}-${j}`))}
          </span>
        ),
      )}
    </span>
  );
}
