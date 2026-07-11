"use client";

import { useEffect, useRef } from "react";

/**
 * 髹夜世界 — the persistent material world (Igloo model, spec 2026-07-09).
 *
 * One bronze luopan suspended in cured lacquer, rendered in a fixed
 * full-viewport canvas behind the page. Scroll is the world's only clock:
 * sections carry data-act="0..6" and the world interpolates camera, light,
 * plate attitude and ring alignment between per-act keyframes. The DOM
 * scrolls free — the world listens, it never jacks.
 *
 * Material over glow, always: nothing here is self-lit.
 */

type Vec3 = [number, number, number];
type Key = {
  cam: Vec3; // camera position
  look: Vec3; // camera target
  plate: Vec3; // luopan position
  tiltX: number; // plate lean (x)
  tiltZ: number; // plate lean (z)
  align: number; // 0 scattered → 1 rings in register
  key: number; // key light intensity
  keyPos: Vec3; // key light position (azimuth sweep = the glint)
  exp: number; // tone-mapping exposure
  heart: number; // celadon heart-ring env intensity
};

// 卷首 → 卷终 · one keyframe per act (anchored to [data-act] section centers)
const KEYS: Key[] = [
  // 0 · hero — half-framed right, the current composition
  { cam: [0, 0.3, 9.8], look: [0, 0, 0], plate: [3.55, 0.1, 0], tiltX: -1.02, tiltZ: 0.12, align: 0, key: 1.5, keyPos: [-4, 5, 6], exp: 1.0, heart: 0.8 },
  // 1 · 是/不是 — pull back, center faint, celadon heart glint
  { cam: [0, 0.55, 12.6], look: [0, 0, 0], plate: [0, 0.25, 0], tiltX: -1.12, tiltZ: 0.08, align: 0, key: 0.85, keyPos: [-3, 5, 6], exp: 0.85, heart: 2.1 },
  // 2 · 判读 — light falls away, paper plates carry
  { cam: [0, 0.9, 13.6], look: [0, 0, 0], plate: [0, -0.5, 0], tiltX: -1.38, tiltZ: 0.05, align: 0, key: 0.3, keyPos: [-2, 6, 5], exp: 0.58, heart: 0.7 },
  // 3 · 三步 — rings rotate into register; light sweeps the ticks once
  // (kept a step dimmer/farther than the pure beat wants: dense text reads over it)
  { cam: [0, 1.05, 11.6], look: [0, 0, 0], plate: [0, 0.1, 0], tiltX: -0.95, tiltZ: 0, align: 1, key: 1.12, keyPos: [4.5, 4, 6], exp: 0.9, heart: 1.0 },
  // 4 · 关于/落款 — low and close, the cinnabar node near
  { cam: [0, -0.55, 7.2], look: [0, 0.1, 0], plate: [0, 0.4, 0], tiltX: -1.14, tiltZ: 0.1, align: 0.7, key: 0.72, keyPos: [-4, 3, 6], exp: 0.82, heart: 1.2 },
  // 5 · 价位 — face-on: the compass looks at the buyer
  { cam: [0, 0, 9.2], look: [0, 0, 0], plate: [0, 0, 0], tiltX: 0, tiltZ: 0, align: 1, key: 1.2, keyPos: [-3, 4, 7], exp: 0.95, heart: 1.4 },
  // 6 · 边界 → 卷终 — recede to a hairline arc
  { cam: [0, 0.6, 16.5], look: [0, 0, 0], plate: [0, -0.7, 0], tiltX: -1.26, tiltZ: 0.15, align: 0, key: 0.32, keyPos: [-5, 5, 6], exp: 0.55, heart: 0.6 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

// Keep the right-weighted desktop composition, but pull it into the narrower
// horizontal field of view on phones instead of leaving only the outer rim.
const fitPlateXForViewport = (x: number, viewportWidth: number) =>
  viewportWidth < 700 ? x * 0.68 : x;

const lerpKey = (a: Key, b: Key, t: number): Key => ({
  cam: [lerp(a.cam[0], b.cam[0], t), lerp(a.cam[1], b.cam[1], t), lerp(a.cam[2], b.cam[2], t)],
  look: [lerp(a.look[0], b.look[0], t), lerp(a.look[1], b.look[1], t), lerp(a.look[2], b.look[2], t)],
  plate: [lerp(a.plate[0], b.plate[0], t), lerp(a.plate[1], b.plate[1], t), lerp(a.plate[2], b.plate[2], t)],
  tiltX: lerp(a.tiltX, b.tiltX, t),
  tiltZ: lerp(a.tiltZ, b.tiltZ, t),
  align: lerp(a.align, b.align, t),
  key: lerp(a.key, b.key, t),
  keyPos: [lerp(a.keyPos[0], b.keyPos[0], t), lerp(a.keyPos[1], b.keyPos[1], t), lerp(a.keyPos[2], b.keyPos[2], t)],
  exp: lerp(a.exp, b.exp, t),
  heart: lerp(a.heart, b.heart, t),
});

export function LacquerWorld() {
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

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      const dpr = Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.25 : 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      el.appendChild(renderer.domElement);

      const GOLD = 0x9c7a45; // matte antique gilt bronze
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

      const keyLight = new THREE.DirectionalLight(0xffe7c2, 1.5);
      keyLight.position.set(-4, 5, 6);
      const fill = new THREE.AmbientLight(0x3a3020, 0.4);
      scene.add(keyLight, fill);

      const gold = new THREE.MeshStandardMaterial({
        color: GOLD,
        metalness: 0.9,
        roughness: 0.45, // antique gilt, not chrome
        envMapIntensity: 1,
      });
      disposables.push(gold);

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

      // ---- the engraved compass face — real content, drawn once on canvas ----
      // 二十四山 on the rim, 十二地支 and 十天干 inside: the instrument speaks.
      function buildFaceTexture() {
        const S = 2048;
        const cv = document.createElement("canvas");
        cv.width = cv.height = S;
        const g2 = cv.getContext("2d")!;
        const cx = S / 2;
        const px = (r: number) => (r / 2.56) * (S / 2); // world radius → pixels
        // cured lacquer ground with a faint pooled sheen
        g2.fillStyle = "#191309";
        g2.fillRect(0, 0, S, S);
        const sheen = g2.createRadialGradient(cx * 0.82, cx * 0.72, 0, cx, cx, cx);
        sheen.addColorStop(0, "rgba(255,228,178,0.055)");
        sheen.addColorStop(1, "rgba(0,0,0,0)");
        g2.fillStyle = sheen;
        g2.fillRect(0, 0, S, S);
        // concentric engraving hairlines
        for (const [r, w, a] of [
          [0.42, 1.6, 0.5], [0.62, 2.2, 0.55], [0.95, 1.6, 0.45], [1.28, 1.6, 0.45],
          [1.5, 1.6, 0.5], [1.58, 3, 0.6], [1.86, 1.4, 0.35], [2.06, 1.4, 0.35],
          [2.26, 1.4, 0.4], [2.36, 3, 0.6], [2.5, 2.2, 0.55],
        ] as [number, number, number][]) {
          g2.strokeStyle = `rgba(150,116,62,${a})`;
          g2.lineWidth = w;
          g2.beginPath();
          g2.arc(cx, cx, px(r), 0, Math.PI * 2);
          g2.stroke();
        }
        // radial spokes through the inner registers
        g2.strokeStyle = "rgba(150,116,62,0.26)";
        g2.lineWidth = 1.4;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g2.beginPath();
          g2.moveTo(cx + Math.cos(a) * px(0.62), cx + Math.sin(a) * px(0.62));
          g2.lineTo(cx + Math.cos(a) * px(1.5), cx + Math.sin(a) * px(1.5));
          g2.stroke();
        }
        // character rings — engraved bronze inlay, top of glyph facing outward
        const ringChars = (chars: string[], r: number, size: number, color: string, halfStep = false) => {
          g2.fillStyle = color;
          g2.font = `500 ${size}px "Noto Serif CJK SC", "Songti SC", "SimSun", serif`;
          g2.textAlign = "center";
          g2.textBaseline = "middle";
          chars.forEach((ch, i) => {
            const a = ((i + (halfStep ? 0.5 : 0)) / chars.length) * Math.PI * 2;
            g2.save();
            g2.translate(cx, cx);
            g2.rotate(a);
            g2.translate(0, -px(r));
            g2.fillText(ch, 0, 0);
            g2.restore();
          });
        };
        ringChars("子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥壬".split(""), 2.43, 50, "rgba(178,142,82,0.92)", true);
        ringChars("子丑寅卯辰巳午未申酉戌亥".split(""), 1.14, 76, "rgba(178,142,82,0.8)");
        ringChars("甲乙丙丁戊己庚辛壬癸".split(""), 0.79, 54, "rgba(150,116,62,0.62)");
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        disposables.push(tex);
        return tex;
      }

      // ---- the plate, split into three registers so misalignment can read ----
      const gTicks = new THREE.Group(); // rim + 24 mountains
      const gTrigrams = new THREE.Group(); // 卦 band
      const gHeart = new THREE.Group(); // heart ring + node

      // the plate body — a solid lacquered disc; the inlay sits ON something now
      const plateGeo = new THREE.CylinderGeometry(2.56, 2.56, 0.1, 128);
      plateGeo.rotateX(Math.PI / 2); // face → +Z
      disposables.push(plateGeo);
      const faceMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: buildFaceTexture(),
        metalness: 0.22,
        roughness: 0.4, // semi-cured lacquer, catches the lamp softly
        envMapIntensity: 0.9,
      });
      const rimSideMat = new THREE.MeshStandardMaterial({
        color: 0x120d07,
        metalness: 0.2,
        roughness: 0.55,
      });
      disposables.push(faceMat, rimSideMat);
      const plate = new THREE.Mesh(plateGeo, [rimSideMat, faceMat, faceMat]);
      plate.position.z = -0.06; // inlay bars ride ~0.05 above the face — relief
      gTicks.add(plate);

      gTicks.add(ringMesh(2.5, 0.008));
      const tickGeo = new THREE.BoxGeometry(0.11, 0.02, 0.02);
      disposables.push(tickGeo);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const tick = new THREE.Mesh(tickGeo, gold);
        tick.position.set(Math.cos(a) * 2.43, Math.sin(a) * 2.43, 0);
        tick.rotation.z = a;
        gTicks.add(tick);
      }

      gTrigrams.add(ringMesh(2.36, 0.006));
      gTrigrams.add(ringMesh(1.58, 0.006));
      const solidGeo = new THREE.BoxGeometry(0.44, 0.032, 0.032);
      const halfGeo = new THREE.BoxGeometry(0.17, 0.032, 0.032);
      disposables.push(solidGeo, halfGeo);
      const radii = [1.74, 1.95, 2.16];
      function addYao(a: number, r: number, solid: boolean) {
        if (solid) {
          const m = new THREE.Mesh(solidGeo, gold);
          m.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
          m.rotation.z = a + Math.PI / 2;
          gTrigrams.add(m);
        } else {
          const tx = -Math.sin(a);
          const ty = Math.cos(a);
          const off = 0.135;
          [-1, 1].forEach((s) => {
            const m = new THREE.Mesh(halfGeo, gold);
            m.position.set(Math.cos(a) * r + tx * off * s, Math.sin(a) * r + ty * off * s, 0);
            m.rotation.z = a + Math.PI / 2;
            gTrigrams.add(m);
          });
        }
      }
      const trigrams = [
        [1, 1, 1], [1, 1, 0], [1, 0, 1], [1, 0, 0],
        [0, 1, 1], [0, 1, 0], [0, 0, 1], [0, 0, 0],
      ];
      trigrams.forEach((tg, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        tg.forEach((bit, j) => addYao(a, radii[j], bit === 1));
      });

      gHeart.add(ringMesh(0.62, 0.006, celadonMat));
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0xb4402e, // matte 朱砂 — never self-lit
        metalness: 0.2,
        roughness: 0.6,
      });
      disposables.push(nodeMat);

      // ---- 天池 · the heaven pool — recessed dish, needle, cinnabar pivot.
      // The dial turns; the needle holds. (Stationary: added to the disc root.)
      const pool = new THREE.Group();
      pool.add(ringMesh(0.34, 0.012));
      const dishGeo = new THREE.CircleGeometry(0.33, 48);
      disposables.push(dishGeo);
      const dishMat = new THREE.MeshStandardMaterial({
        color: 0x0e0a06, // deep-cured lacquer, glossier than the plate
        metalness: 0.45,
        roughness: 0.2,
        envMapIntensity: 1.25,
      });
      disposables.push(dishMat);
      const dish = new THREE.Mesh(dishGeo, dishMat);
      dish.position.z = -0.012;
      pool.add(dish);
      const needleGeo = new THREE.BoxGeometry(0.52, 0.016, 0.01);
      disposables.push(needleGeo);
      const needle = new THREE.Mesh(needleGeo, gold);
      needle.rotation.z = 0.42;
      needle.position.z = 0.018;
      pool.add(needle);
      const pivotGeo = new THREE.SphereGeometry(0.03, 14, 14);
      disposables.push(pivotGeo);
      const pivot = new THREE.Mesh(pivotGeo, nodeMat);
      pivot.position.z = 0.026;
      pool.add(pivot);
      pool.position.z = 0.015;

      const disc = new THREE.Group();
      disc.add(gTicks, gTrigrams, gHeart, pool);
      const tilt = new THREE.Group();
      tilt.add(disc);
      scene.add(tilt);

      // ---- scroll → world state ----
      let anchors: number[] = []; // document-space y of each act's section center
      function measure() {
        const els = Array.from(document.querySelectorAll<HTMLElement>("[data-act]"))
          .sort((a, b) => Number(a.dataset.act) - Number(b.dataset.act));
        anchors = els.map((s) => {
          const r = s.getBoundingClientRect();
          return r.top + window.scrollY + r.height / 2;
        });
      }
      measure();
      // layout settles late (fonts, chart) — re-measure quietly
      const t1 = window.setTimeout(measure, 800);
      const t2 = window.setTimeout(measure, 2500);
      cleanup.push(() => { window.clearTimeout(t1); window.clearTimeout(t2); });
      window.addEventListener("resize", measure);
      cleanup.push(() => window.removeEventListener("resize", measure));

      function targetKey(): Key {
        const n = Math.min(anchors.length, KEYS.length);
        if (n === 0) return KEYS[0];
        const sc = window.scrollY + window.innerHeight / 2;
        if (sc <= anchors[0]) return KEYS[0];
        if (sc >= anchors[n - 1]) return KEYS[n - 1];
        let i = 0;
        while (i < n - 2 && sc > anchors[i + 1]) i++;
        const u = smooth((sc - anchors[i]) / (anchors[i + 1] - anchors[i]));
        return lerpKey(KEYS[i], KEYS[i + 1], u);
      }

      // per-register scatter — the instrument is "not yet set" until 三步
      const scatter = [-0.42, 0.3, -0.18];
      let spin = 0;
      let state = targetKey();

      function apply(s: Key, t: number, dt: number) {
        spin += dt * 0.035 * (1 - 0.88 * s.align); // locks as it registers
        const breathe = Math.sin(t * 0.05) * 0.05 * (1 - s.align);
        gTicks.rotation.z = spin + scatter[0] * (1 - s.align) + breathe;
        gTrigrams.rotation.z = spin + scatter[1] * (1 - s.align);
        gHeart.rotation.z = spin + scatter[2] * (1 - s.align) - breathe;

        tilt.position.set(
          fitPlateXForViewport(s.plate[0], window.innerWidth),
          s.plate[1],
          s.plate[2],
        );
        tilt.rotation.x = s.tiltX + Math.sin(t * 0.18) * 0.03 * (1 - s.align * 0.7);
        tilt.rotation.z = s.tiltZ;

        camera.position.set(s.cam[0], s.cam[1], s.cam[2]);
        camera.lookAt(s.look[0], s.look[1], s.look[2]);
        keyLight.intensity = s.key;
        keyLight.position.set(s.keyPos[0], s.keyPos[1], s.keyPos[2]);
        renderer.toneMappingExposure = s.exp;
        celadonMat.envMapIntensity = s.heart;
        renderer.render(scene, camera);
      }

      function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (reduce) apply(state, 5.5, 0);
      }
      window.addEventListener("resize", onResize);
      cleanup.push(() => window.removeEventListener("resize", onResize));

      const clock = new THREE.Clock();

      if (reduce) {
        // no continuous motion: settle to the act under the reader on scroll
        state = targetKey();
        apply(state, 5.5, 0);
        let pend = 0;
        const onScroll = () => {
          if (pend) return;
          pend = window.setTimeout(() => {
            pend = 0;
            state = targetKey();
            apply(state, 5.5, 0);
          }, 120);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanup.push(() => { window.removeEventListener("scroll", onScroll); if (pend) window.clearTimeout(pend); });
      } else {
        let running = false;
        const frame = () => {
          if (disposed || document.hidden) {
            running = false;
            return;
          }
          raf = requestAnimationFrame(frame);
          const dt = Math.min(clock.getDelta(), 0.05);
          const k = 1 - Math.exp(-dt * 3.4); // weighted, frame-rate independent
          state = lerpKey(state, targetKey(), k);
          apply(state, clock.getElapsedTime(), dt);
        };
        const start = () => {
          if (running || disposed) return;
          running = true;
          clock.getDelta();
          raf = requestAnimationFrame(frame);
        };
        const onVis = () => {
          if (!document.hidden) start();
        };
        document.addEventListener("visibilitychange", onVis);
        cleanup.push(() => document.removeEventListener("visibilitychange", onVis));
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
      /* decorative layer — if WebGL is unavailable, the lacquer gradient carries */
    });

    return () => {
      disposed = true;
      cleanup.forEach((fn) => fn());
    };
  }, []);

  return <div ref={mountRef} className="world-canvas" aria-hidden="true" />;
}
