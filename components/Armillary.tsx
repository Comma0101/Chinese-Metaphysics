"use client";

import { useEffect, useRef } from "react";

/**
 * 罗盘 — a gilt luopan (the 命理 practitioner’s compass), drawn in hairlines.
 *
 * On-theme for 知几 / 八字: concentric fine brass rings carrying the eight 卦
 * (trigrams) as thin gold bars — pure line geometry, so it stays elegant, not
 * pictorial. A quiet cinnabar 太极 point at the pivot. Tilted and turning
 * slowly, composed mostly behind the chart so it reads as an instrument, not a
 * spinning wheel. Transparent over the lacquer; reduced-motion aware; pauses
 * off-screen / when hidden.
 */
export function Armillary({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let raf = 0;
    const cleanup: (() => void)[] = [];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      const THREE = await import("three");
      if (disposed || !mountRef.current) return;
      const el = mountRef.current;

      const w = () => el.clientWidth || 520;
      const h = () => el.clientHeight || 520;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, w() / h(), 0.1, 100);
      camera.position.set(0, 0.3, 9.8);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w(), h());
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      el.appendChild(renderer.domElement);

      const GOLD = 0x9c7a45; // matte antique gilt bronze (de-scammed)
      const CELADON = 0x7e9583;
      const disposables: { dispose: () => void }[] = [];

      // faint warm environment so the thin metal catches a little light
      function buildEnv() {
        const wEq = 256;
        const hEq = 128;
        const data = new Uint8Array(wEq * hEq * 4);
        const top = [0.5, 0.4, 0.24];
        const bot = [0.04, 0.03, 0.02];
        for (let y = 0; y < hEq; y++) {
          const t = Math.pow(y / (hEq - 1), 0.9);
          for (let x = 0; x < wEq; x++) {
            const u = x / (wEq - 1);
            const dx = (u - 0.3) * 2.2;
            const dy = (1 - y / (hEq - 1) - 0.25) * 2.6;
            const hot = Math.exp(-(dx * dx + dy * dy) * 3.0) * 0.7;
            const i = (y * wEq + x) * 4;
            data[i] = Math.min(255, (bot[0] + (top[0] - bot[0]) * t + hot) * 255);
            data[i + 1] = Math.min(255, (bot[1] + (top[1] - bot[1]) * t + hot * 0.85) * 255);
            data[i + 2] = Math.min(255, (bot[2] + (top[2] - bot[2]) * t + hot * 0.6) * 255);
            data[i + 3] = 255;
          }
        }
        const eqTex = new THREE.DataTexture(data, wEq, hEq, THREE.RGBAFormat);
        eqTex.mapping = THREE.EquirectangularReflectionMapping;
        eqTex.colorSpace = THREE.SRGBColorSpace;
        eqTex.needsUpdate = true;
        const pmrem = new THREE.PMREMGenerator(renderer);
        const rt = pmrem.fromEquirectangular(eqTex);
        eqTex.dispose();
        pmrem.dispose();
        disposables.push(rt);
        return rt.texture;
      }
      scene.environment = buildEnv();

      const key = new THREE.DirectionalLight(0xffe7c2, 1.5);
      key.position.set(-4, 5, 6);
      const fill = new THREE.AmbientLight(0x3a3020, 0.4);
      scene.add(key, fill);

      const gold = new THREE.MeshStandardMaterial({
        color: GOLD,
        metalness: 0.9,
        roughness: 0.45, // antique gilt, not chrome
        envMapIntensity: 1,
      });
      disposables.push(gold);

      // a faint 青瓷 celadon patina — the 3D nods to the promoted green
      const celadonMat = new THREE.MeshStandardMaterial({
        color: CELADON,
        metalness: 0.4,
        roughness: 0.6,
        envMapIntensity: 0.8,
      });
      disposables.push(celadonMat);

      function ringMesh(radius: number, tube = 0.007, mat: THREE.Material = gold) {
        const g = new THREE.TorusGeometry(radius, tube, 12, 260);
        disposables.push(g);
        return new THREE.Mesh(g, mat);
      }

      // ---- the compass plate (rings in XY plane, normal +Z) ----
      const disc = new THREE.Group();

      disc.add(ringMesh(2.5, 0.008)); // outer rim
      disc.add(ringMesh(2.36, 0.006)); // trigram band, outer edge
      disc.add(ringMesh(1.58, 0.006)); // trigram band, inner edge
      disc.add(ringMesh(0.62, 0.006, celadonMat)); // heart ring — celadon patina

      // 24 mountains — faint radial ticks around the rim
      const tickGeo = new THREE.BoxGeometry(0.11, 0.02, 0.02);
      disposables.push(tickGeo);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const tick = new THREE.Mesh(tickGeo, gold);
        tick.position.set(Math.cos(a) * 2.43, Math.sin(a) * 2.43, 0);
        tick.rotation.z = a; // radial
        disc.add(tick);
      }

      // ---- the eight 卦 as thin gold bars (three yao each) ----
      const solidGeo = new THREE.BoxGeometry(0.44, 0.032, 0.032);
      const halfGeo = new THREE.BoxGeometry(0.17, 0.032, 0.032);
      disposables.push(solidGeo, halfGeo);
      const radii = [1.74, 1.95, 2.16]; // inner → outer yao

      function addYao(a: number, r: number, solid: boolean) {
        if (solid) {
          const m = new THREE.Mesh(solidGeo, gold);
          m.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
          m.rotation.z = a + Math.PI / 2; // tangential
          disc.add(m);
        } else {
          const tx = -Math.sin(a);
          const ty = Math.cos(a);
          const off = 0.135;
          [-1, 1].forEach((s) => {
            const m = new THREE.Mesh(halfGeo, gold);
            m.position.set(
              Math.cos(a) * r + tx * off * s,
              Math.sin(a) * r + ty * off * s,
              0,
            );
            m.rotation.z = a + Math.PI / 2;
            disc.add(m);
          });
        }
      }

      // [inner, mid, outer] yao — 1 solid (阳), 0 broken (阴)
      const trigrams = [
        [1, 1, 1], // 乾 ☰
        [1, 1, 0], // 兑 ☱
        [1, 0, 1], // 离 ☲
        [1, 0, 0], // 震 ☳
        [0, 1, 1], // 巽 ☴
        [0, 1, 0], // 坎 ☵
        [0, 0, 1], // 艮 ☶
        [0, 0, 0], // 坤 ☷
      ];
      trigrams.forEach((tg, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        tg.forEach((bit, j) => addYao(a, radii[j], bit === 1));
      });

      // ---- cinnabar 太极 point at the pivot (a node, not a sun) ----
      const nodeGeo = new THREE.SphereGeometry(0.07, 20, 20);
      disposables.push(nodeGeo);
      // matte 朱砂 cinnabar inlay — NOT self-lit (material over glow)
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0xb4402e,
        emissive: 0x000000,
        emissiveIntensity: 0,
        metalness: 0.2,
        roughness: 0.6,
      });
      disposables.push(nodeMat);
      disc.add(new THREE.Mesh(nodeGeo, nodeMat));

      // tilt the plate so it reads as a compass in space, then let it turn
      const tilt = new THREE.Group();
      tilt.add(disc);
      tilt.rotation.x = -1.02; // lean back ~58°
      tilt.rotation.z = 0.12;
      tilt.position.set(1.15, 0.15, 0); // sit mostly behind / right of the card
      scene.add(tilt);

      function onResize() {
        camera.aspect = w() / h();
        camera.updateProjectionMatrix();
        renderer.setSize(w(), h());
      }
      const ro = new ResizeObserver(onResize);
      ro.observe(el);
      cleanup.push(() => ro.disconnect());

      let visible = true;
      let running = false;
      const clock = new THREE.Clock();

      const renderFrame = (t: number) => {
        disc.rotation.z = t * 0.035; // slow, like aligning the dial
        tilt.rotation.x = -1.02 + Math.sin(t * 0.18) * 0.03;
        renderer.render(scene, camera);
      };

      const frame = () => {
        if (disposed || !visible || document.hidden) {
          running = false;
          return;
        }
        raf = requestAnimationFrame(frame);
        renderFrame(clock.getElapsedTime());
      };
      const start = () => {
        if (running || disposed || reduce) return;
        running = true;
        raf = requestAnimationFrame(frame);
      };

      const io = new IntersectionObserver(
        (es) => {
          visible = es[0]?.isIntersecting ?? true;
          if (visible) start();
        },
        { threshold: 0 },
      );
      io.observe(el);
      cleanup.push(() => io.disconnect());

      const onVis = () => {
        if (!document.hidden) start();
      };
      document.addEventListener("visibilitychange", onVis);
      cleanup.push(() => document.removeEventListener("visibilitychange", onVis));

      if (reduce) {
        renderFrame(5.5);
      } else {
        start();
      }

      cleanup.push(() => {
        cancelAnimationFrame(raf);
        disposables.forEach((d) => d.dispose());
        renderer.forceContextLoss();
        renderer.dispose();
        renderer.domElement.remove();
      });
    })().catch(() => {
      /* decorative layer — if WebGL is unavailable, fail silently */
    });

    return () => {
      disposed = true;
      cleanup.forEach((fn) => fn());
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
