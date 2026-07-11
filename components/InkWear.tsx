/**
 * 飞白 — ink-wear for display type (Chartogne model: type as material).
 * A document-level SVG filter that gives the big serif glyphs the slight
 * roughness of letterpress ink on paper. Referenced from CSS as
 * `filter: url(#inkwear)`. Zero-size, aria-hidden, renders nothing visible.
 */
export function InkWear() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }} focusable="false">
      <filter id="inkwear" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
