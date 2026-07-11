"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 卷目 — the volume index rail (Chartogne’s parcel-index grammar).
 * A fixed hairline spine on the left edge (desktop only) listing the
 * homepage’s acts 卷首…卷终. Tracks the reader’s position against the same
 * [data-act] anchors that drive the world; click travels there.
 */

const VOLUMES: { act: number; num: { zh: string; en: string }; label: { zh: string; en: string } }[] = [
  { act: 0, num: { zh: "首", en: "0" }, label: { zh: "服务", en: "Service" } },
  { act: 1, num: { zh: "一", en: "I" }, label: { zh: "问题", en: "Decisions" } },
  { act: 2, num: { zh: "二", en: "II" }, label: { zh: "样例", en: "Sample" } },
  { act: 3, num: { zh: "三", en: "III" }, label: { zh: "流程", en: "Process" } },
  { act: 4, num: { zh: "四", en: "IV" }, label: { zh: "方法与责任", en: "Accountability" } },
  { act: 5, num: { zh: "五", en: "V" }, label: { zh: "费用", en: "Fees" } },
  { act: 6, num: { zh: "终", en: "∙" }, label: { zh: "边界", en: "Scope" } },
];

export function VolumeRail({ lang }: { lang: "zh" | "en" }) {
  const [active, setActive] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const track = () => {
      raf.current = 0;
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-act]"));
      if (!els.length) return;
      const sc = window.scrollY + window.innerHeight / 2;
      let best = 0;
      let bestD = Infinity;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const center = r.top + window.scrollY + r.height / 2;
        const d = Math.abs(center - sc);
        if (d < bestD) {
          bestD = d;
          best = Number(el.dataset.act);
        }
      }
      setActive(best);
    };
    const onScroll = () => {
      if (!raf.current) raf.current = requestAnimationFrame(track);
    };
    track();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  function go(act: number) {
    const el = document.querySelector<HTMLElement>(`[data-act="${act}"]`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 54;
    const lenis = (window as unknown as { __zhijiLenis?: { scrollTo: (t: number, o?: object) => void } }).__zhijiLenis;
    if (lenis) lenis.scrollTo(top, { duration: 1.4 });
    else window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  return (
    <nav className="vol-rail" aria-label={lang === "zh" ? "卷目" : "Contents"}>
      {VOLUMES.map((v) => (
        <button
          key={v.act}
          type="button"
          className={active === v.act ? "vol-item on" : "vol-item"}
          onClick={() => go(v.act)}
          aria-label={`${lang === "zh" ? "卷" : "Vol."} ${v.num[lang]} · ${v.label[lang]}`}
          aria-current={active === v.act ? "true" : undefined}
        >
          <span className="vol-tick" aria-hidden="true" />
          <span className="vol-num">{v.num[lang]}</span>
          <span className="vol-label">{v.label[lang]}</span>
        </button>
      ))}
    </nav>
  );
}
