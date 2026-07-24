"use client";

import { useEffect } from "react";

/**
 * 髹夜 motion spine — Lenis heavy smooth-scroll ("unrolls like a weighted
 * scroll") + GSAP/ScrollTrigger reveals on one shared material ease. Renders
 * nothing. Fully gated on prefers-reduced-motion (Lenis off, reveals instant).
 * Everything is loaded dynamically so no browser API runs during SSR.
 */
export function MotionProvider() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // native scroll, nothing hidden, no motion

    let lenis: { raf: (t: number) => void; on: (e: string, cb: () => void) => void; destroy: () => void } | null =
      null;
    let ctx: { revert: () => void } | null = null;
    let killed = false;
    let rafId = 0;

    (async () => {
      const [{ gsap }, stMod, lenisMod] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (killed) return;
      const ScrollTrigger = stMod.ScrollTrigger;
      const Lenis = lenisMod.default;
      gsap.registerPlugin(ScrollTrigger);

      const ease = "power3.out";

      // heavy, weighted scroll
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 }) as unknown as typeof lenis;
      lenis!.on("scroll", ScrollTrigger.update);
      // let the 卷目 rail travel with the same weight
      (window as unknown as { __zhijiLenis?: unknown }).__zhijiLenis = lenis;
      const raf = (time: number) => {
        if (killed) return;
        lenis!.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);

      ctx = gsap.context(() => {
        // hero enters like a scroll being unrolled
        gsap.from(".hero-inner > *:not([data-hero-title])", {
          opacity: 0,
          y: 20,
          duration: 1.15,
          ease,
          stagger: 0.1,
          delay: 0.12,
        });
        gsap.from(".hero-inner .gilt-rule", {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 1.25,
          ease,
          delay: 0.55,
        });

        // 撕纸 — the first sheet tears down into place over the world on entry
        const tear = document.querySelector<HTMLElement>(".act-tear");
        if (tear) {
          gsap.set(tear, { "--tear": 0 });
          gsap.to(tear, {
            "--tear": 1,
            ease: "none",
            scrollTrigger: { trigger: tear, start: "top 92%", end: "top 52%", scrub: 0.6 },
          });
        }

        // 金缮 — the gold seam draws along the crack when the reader reaches it
        const seam = gsap.utils.toArray<SVGPathElement>(".kintsugi .kintsugi-path");
        if (seam.length) {
          gsap.fromTo(
            seam,
            { strokeDashoffset: 1 },
            {
              strokeDashoffset: 0,
              duration: 2.4,
              ease: "power2.inOut",
              stagger: 0.35,
              scrollTrigger: { trigger: ".sample-falsify", start: "top 82%" },
            },
          );
        }

        // 荐印 — the seal presses onto the featured tablet, once
        if (document.querySelector(".tier-seal")) {
          gsap.fromTo(
            ".tier-seal",
            { scale: 1.55, opacity: 0, rotation: -10 },
            {
              scale: 1,
              opacity: 1,
              rotation: -3,
              duration: 0.5,
              ease: "power3.in",
              scrollTrigger: { trigger: ".tier.featured", start: "top 72%" },
            },
          );
        }

        // section reveals — quiet fade-ups as each artifact enters
        const targets = gsap.utils.toArray<HTMLElement>(
          ".section-head, .sample-chart, .sample, .ledger-row, .step, .trust-points .tp, .certificate, .tier, .price-escape, .boundary .b-inner, .newsletter-head, .newsletter",
        );
        targets.forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 24,
            duration: 1.0,
            ease,
            scrollTrigger: { trigger: el, start: "top 86%" },
          });
        });
      });

      // settle positions once fonts/layout are final
      requestAnimationFrame(() => ScrollTrigger.refresh());
    })();

    return () => {
      killed = true;
      cancelAnimationFrame(rafId);
      if (ctx) ctx.revert();
      if (lenis) lenis.destroy();
      delete (window as unknown as { __zhijiLenis?: unknown }).__zhijiLenis;
    };
  }, []);

  return null;
}
