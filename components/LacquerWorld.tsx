"use client";

import { useEffect, useRef } from "react";

/**
 * 髹夜世界 — the persistent material world.
 *
 * One bronze luopan suspended in cured lacquer. Three ring registers
 * (rim + 24 mountains, trigram band, heart ring) scatter in chaos and
 * align into register as the reader scrolls. The heaven pool needle
 * breathes. Dust motes drift. The camera follows the cursor.
 *
 * Material over glow, always: nothing here is self-lit.
 */

type Vec3 = [number, number, number];
type Key = {
  cam: Vec3;
  look: Vec3;
  plate: Vec3;
  tiltX: number;
  tiltZ: number;
  align: number;
  key: number;
  keyPos: Vec3;
  exp: number;
  heart: number;
};

const KEYS: Key[] = [
  // 0 · hero — luopan right, text left
  { cam: [0, 0.3, 9.8], look: [0, 0, 0], plate: [3.55, 0.1, 0], tiltX: -1.02, tiltZ: 0.12, align: 0, key: 1.5, keyPos: [-4, 5, 6], exp: 1.0, heart: 0.8 },
  // 1 · 是/不是 — luopan right, faint
  { cam: [0, 0.55, 12.6], look: [0, 0, 0], plate: [3.2, 0.25, 0], tiltX: -1.12, tiltZ: 0.08, align: 0, key: 0.85, keyPos: [-3, 5, 6], exp: 0.85, heart: 2.1 },
  // 2 · 判读 — luopan recedes right
  { cam: [0, 0.9, 13.6], look: [0, 0, 0], plate: [3.8, -0.5, 0], tiltX: -1.38, tiltZ: 0.05, align: 0, key: 0.3, keyPos: [-2, 6, 5], exp: 0.58, heart: 0.7 },
  // 3 · 三步 — luopan right, rings aligning, text left clear
  { cam: [0, 1.05, 11.6], look: [0, 0, 0], plate: [3.0, 0.1, 0], tiltX: -0.95, tiltZ: 0, align: 1, key: 1.12, keyPos: [4.5, 4, 6], exp: 0.9, heart: 1.0 },
  // 4 · 关于 — luopan right, low and close
  { cam: [0, -0.55, 7.2], look: [0, 0.1, 0], plate: [3.2, 0.4, 0], tiltX: -1.14, tiltZ: 0.1, align: 0.7, key: 0.72, keyPos: [-4, 3, 6], exp: 0.82, heart: 1.2 },
  // 5 · 价位 — luopan right, face-on, pricing left
  { cam: [0, 0, 9.2], look: [0, 0, 0], plate: [3.4, 0, 0], tiltX: 0, tiltZ: 0, align: 1, key: 1.2, keyPos: [-3, 4, 7], exp: 0.95, heart: 1.4 },
  // 6 · 边界 → 卷终 — luopan recedes right
  { cam: [0, 0.6, 16.5], look: [0, 0, 0], plate: [4.0, -0.7, 0], tiltX: -1.26, tiltZ: 0.15, align: 0, key: 0.32, keyPos: [-5, 5, 6], exp: 0.55, heart: 0.6 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

const fitPlateXForViewport = (x: number, w: number) => (w < 700 ? x * 0.68 : x);

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

const SUB01: Key = { ...lerpKey(KEYS[0], KEYS[1], 0.5), cam: [0, 0.1, 9.2] as Vec3 };

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

      const GOLD = 0x9c7a45;
      const CELADON = 0x7e9583;
      const disposables: { dispose: () => void }[] = [];

      // ---- environment map ----
      function buildEnv() {
        const wEq = 256, hEq = 128;
        const data = new Uint8Array(wEq * hEq * 4);
        const top = [0.5, 0.4, 0.24], bot = [0.04, 0.03, 0.02];
        for (let y = 0; y < hEq; y++) {
          const t = Math.pow(y / (hEq - 1), 0.9);
          for (let x = 0; x < wEq; x++) {
            const u = x / (wEq - 1);
            const dx = (u - 0.3) * 2.2, dy = (1 - y / (hEq - 1) - 0.25) * 2.6;
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
        eqTex.dispose(); pmrem.dispose();
        disposables.push(rt);
        return rt.texture;
      }
      scene.environment = buildEnv();

      // ---- lights ----
      const keyLight = new THREE.DirectionalLight(0xffe7c2, 1.5);
      keyLight.position.set(-4, 5, 6);
      const fill = new THREE.AmbientLight(0x3a3020, 0.4);
      const rimLight = new THREE.DirectionalLight(0x8eaab8, 0.6);
      rimLight.position.set(3, 2, -5);
      scene.add(keyLight, fill, rimLight);

      // ---- gold with patina ----
      const gold = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.9, roughness: 0.42, envMapIntensity: 1 });
      (() => {
        const S = 512, cv = document.createElement("canvas");
        cv.width = cv.height = S;
        const ctx = cv.getContext("2d")!;
        ctx.fillStyle = "#737373"; ctx.fillRect(0, 0, S, S);
        for (let i = 0; i < 60; i++) {
          const x = Math.random() * S, y = Math.random() * S, r = 8 + Math.random() * 30;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(40,40,40,${0.15 + Math.random() * 0.2})`);
          g.addColorStop(1, "rgba(40,40,40,0)");
          ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        ctx.strokeStyle = "rgba(180,180,180,0.08)"; ctx.lineWidth = 0.5;
        for (let i = 0; i < 40; i++) {
          ctx.beginPath();
          const x = Math.random() * S, y = Math.random() * S;
          ctx.moveTo(x, y);
          ctx.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60);
          ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(cv);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        disposables.push(tex);
        gold.roughnessMap = tex; gold.needsUpdate = true;
      })();
      disposables.push(gold);

      const celadonMat = new THREE.MeshStandardMaterial({ color: CELADON, metalness: 0.4, roughness: 0.6, envMapIntensity: 0.8 });
      disposables.push(celadonMat);

      function ringMesh(radius: number, tube = 0.007, mat: THREE.Material = gold) {
        const g = new THREE.TorusGeometry(radius, tube, 12, 260);
        disposables.push(g);
        return new THREE.Mesh(g, mat);
      }

      // ---- engraved face texture — rich with 易 tradition + bump depth ----
      function buildFaceTextures() {
        const S = 2048;
        const cv = document.createElement("canvas");
        cv.width = cv.height = S;
        const g2 = cv.getContext("2d")!;
        // bump canvas — white=raised, black=recessed, grey=flat
        const bv = document.createElement("canvas");
        bv.width = bv.height = S;
        const b = bv.getContext("2d")!;
        const cx = S / 2;
        const px = (r: number) => (r / 2.56) * (S / 2);

        // --- LACQUER GROUND with grain ---
        const ground = g2.createRadialGradient(cx * 0.7, cx * 0.65, 0, cx, cx, cx * 1.1);
        ground.addColorStop(0, "#221a0e"); ground.addColorStop(0.5, "#1a130a"); ground.addColorStop(1, "#110c06");
        g2.fillStyle = ground; g2.fillRect(0, 0, S, S);
        // grain noise — subtle lacquer texture
        const imgData = g2.getImageData(0, 0, S, S);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const n = (Math.random() - 0.5) * 8;
          d[i] = Math.max(0, Math.min(255, d[i] + n));
          d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
          d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
        }
        g2.putImageData(imgData, 0, 0);
        // pooled sheen
        const sheen = g2.createRadialGradient(cx * 0.78, cx * 0.68, 0, cx, cx, cx);
        sheen.addColorStop(0, "rgba(255,228,178,0.09)"); sheen.addColorStop(0.4, "rgba(255,228,178,0.03)"); sheen.addColorStop(1, "rgba(0,0,0,0)");
        g2.fillStyle = sheen; g2.fillRect(0, 0, S, S);
        // bump ground = mid grey
        b.fillStyle = "#808080"; b.fillRect(0, 0, S, S);

        // --- 回纹 meander border ---
        const drawHuiwen = (radius: number, count: number, size: number) => {
          g2.strokeStyle = "rgba(150,116,62,0.4)"; g2.lineWidth = 1.4;
          b.strokeStyle = "#999"; b.lineWidth = 1.4;
          for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            for (const ctx of [g2, b]) {
              ctx.save(); ctx.translate(cx, cx); ctx.rotate(a); ctx.translate(0, -px(radius));
              const s = size;
              ctx.beginPath();
              ctx.moveTo(-s, -s); ctx.lineTo(s, -s); ctx.lineTo(s, s); ctx.lineTo(-s * 0.4, s);
              ctx.lineTo(-s * 0.4, -s * 0.4); ctx.lineTo(s * 0.4, -s * 0.4); ctx.lineTo(s * 0.4, s * 0.4);
              ctx.stroke(); ctx.restore();
            }
          }
        };
        drawHuiwen(2.52, 48, 7);

        // --- concentric rings with bump grooves ---
        for (const [r, w, a] of [
          [0.38, 2, 0.55], [0.55, 2.5, 0.6], [0.72, 1.8, 0.5], [0.95, 1.8, 0.5],
          [1.2, 1.8, 0.5], [1.42, 3.5, 0.65], [1.68, 1.5, 0.4], [1.92, 1.5, 0.4],
          [2.12, 1.5, 0.45], [2.28, 3.5, 0.65], [2.48, 2.5, 0.6],
        ] as [number, number, number][]) {
          // color: shadow + gold + highlight
          g2.strokeStyle = `rgba(0,0,0,${a * 0.45})`; g2.lineWidth = w + 2;
          g2.beginPath(); g2.arc(cx, cx, px(r) + 1.5, 0, Math.PI * 2); g2.stroke();
          g2.strokeStyle = `rgba(150,116,62,${a})`; g2.lineWidth = w;
          g2.beginPath(); g2.arc(cx, cx, px(r), 0, Math.PI * 2); g2.stroke();
          g2.strokeStyle = `rgba(230,200,140,${a * 0.25})`; g2.lineWidth = 0.8;
          g2.beginPath(); g2.arc(cx, cx, px(r) - 1.5, 0, Math.PI * 2); g2.stroke();
          // bump: groove = dark
          b.strokeStyle = "#404040"; b.lineWidth = w + 3;
          b.beginPath(); b.arc(cx, cx, px(r), 0, Math.PI * 2); b.stroke();
          // bump: raised edges
          b.strokeStyle = "#b0b0b0"; b.lineWidth = 1;
          b.beginPath(); b.arc(cx, cx, px(r) - w * 0.5, 0, Math.PI * 2); b.stroke();
          b.beginPath(); b.arc(cx, cx, px(r) + w * 0.5, 0, Math.PI * 2); b.stroke();
        }

        // --- radial spokes (24) ---
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          const major = i % 2 === 0;
          g2.strokeStyle = major ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.08)";
          g2.lineWidth = major ? 2.5 : 1;
          g2.beginPath();
          g2.moveTo(cx + Math.cos(a) * px(0.95), cx + Math.sin(a) * px(0.95));
          g2.lineTo(cx + Math.cos(a) * px(2.28), cx + Math.sin(a) * px(2.28));
          g2.stroke();
          if (major) {
            g2.strokeStyle = "rgba(150,116,62,0.22)"; g2.lineWidth = 1.2;
            g2.beginPath();
            g2.moveTo(cx + Math.cos(a) * px(0.95), cx + Math.sin(a) * px(0.95));
            g2.lineTo(cx + Math.cos(a) * px(2.28), cx + Math.sin(a) * px(2.28));
            g2.stroke();
          }
        }

        // --- metallic gold gradient helper ---
        const goldGrad = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
          const gr = ctx.createLinearGradient(x, y - size * 0.5, x, y + size * 0.5);
          gr.addColorStop(0, "rgba(220,190,120,0.95)");
          gr.addColorStop(0.3, "rgba(178,142,82,0.92)");
          gr.addColorStop(0.5, "rgba(240,210,150,0.98)");
          gr.addColorStop(0.7, "rgba(160,125,70,0.88)");
          gr.addColorStop(1, "rgba(140,105,55,0.85)");
          return gr;
        };

        // --- character ring drawer with metallic fill + bump ---
        const ringChars = (chars: string[], r: number, size: number, halfStep: boolean, isRed?: boolean) => {
          const yangSet = new Set(["子", "午", "卯", "酉", "丙", "壬", "甲", "庚"]);
          g2.font = `600 ${size}px "Noto Serif CJK SC", "Songti SC", "SimSun", serif`;
          b.font = `600 ${size}px "Noto Serif CJK SC", "Songti SC", "SimSun", serif`;
          g2.textAlign = "center"; g2.textBaseline = "middle";
          b.textAlign = "center"; b.textBaseline = "middle";
          chars.forEach((ch, i) => {
            const a = ((i + (halfStep ? 0.5 : 0)) / chars.length) * Math.PI * 2;
            const useRed = isRed && yangSet.has(ch);
            for (const ctx of [g2, b]) {
              ctx.save(); ctx.translate(cx, cx); ctx.rotate(a); ctx.translate(0, -px(r));
              if (ctx === g2) {
                // emboss shadow
                ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillText(ch, 2, 2);
                // emboss highlight
                ctx.fillStyle = "rgba(240,210,150,0.18)"; ctx.fillText(ch, -1, -1);
                // main fill — metallic gold or vermillion
                ctx.fillStyle = useRed ? "rgba(190,55,35,0.95)" : goldGrad(ctx, 0, 0, size);
                ctx.fillText(ch, 0, 0);
              } else {
                // bump: characters are raised
                ctx.fillStyle = "#d0d0d0"; ctx.fillText(ch, 0, 0);
              }
              ctx.restore();
            }
          });
        };

        // 24 mountains — outer ring, color-coded
        ringChars("子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥壬".split(""), 2.4, 52, true, true);
        // 24 solar terms — season-colored
        const solarTerms = "小寒大寒立春雨水惊蛰春分清明谷雨立夏小满芒种夏至小暑大暑立秋处暑白露秋分寒露霜降立冬小雪大雪冬至".match(/.{2}/g)!;
        const seasonColors = ["rgba(110,155,90,0.75)", "rgba(185,70,50,0.75)", "rgba(178,142,82,0.75)", "rgba(90,125,145,0.75)"];
        g2.font = `400 26px "Noto Serif CJK SC", "Songti SC", "SimSun", serif`;
        b.font = `400 26px "Noto Serif CJK SC", "Songti SC", "SimSun", serif`;
        g2.textAlign = "center"; g2.textBaseline = "middle";
        b.textAlign = "center"; b.textBaseline = "middle";
        solarTerms.forEach((term, i) => {
          const a = ((i + 0.5) / 24) * Math.PI * 2 - Math.PI / 2;
          const sc = seasonColors[Math.floor(i / 6)];
          for (const ctx of [g2, b]) {
            ctx.save(); ctx.translate(cx, cx); ctx.rotate(a); ctx.translate(0, -px(2.08));
            if (ctx === g2) {
              ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillText(term, 1, 1);
              ctx.fillStyle = sc; ctx.fillText(term, 0, 0);
            } else {
              ctx.fillStyle = "#c0c0c0"; ctx.fillText(term, 0, 0);
            }
            ctx.restore();
          }
        });
        // 12 earthly branches — bold
        ringChars("子丑寅卯辰巳午未申酉戌亥".split(""), 1.1, 80, false);
        // 10 heavenly stems
        ringChars("甲乙丙丁戊己庚辛壬癸".split(""), 0.78, 56, false);

        // --- 八卦 symbols around the heaven pool ---
        const baguaSymbols = ["☰", "☱", "☲", "", "☴", "", "☶", ""];
        g2.font = `400 42px "Noto Serif CJK SC", serif`;
        b.font = `400 42px "Noto Serif CJK SC", serif`;
        g2.textAlign = "center"; g2.textBaseline = "middle";
        b.textAlign = "center"; b.textBaseline = "middle";
        baguaSymbols.forEach((sym, i) => {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          for (const ctx of [g2, b]) {
            ctx.save(); ctx.translate(cx, cx); ctx.rotate(a); ctx.translate(0, -px(0.52));
            if (ctx === g2) {
              ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillText(sym, 1, 1);
              ctx.fillStyle = "rgba(178,142,82,0.7)"; ctx.fillText(sym, 0, 0);
            } else {
              ctx.fillStyle = "#c8c8c8"; ctx.fillText(sym, 0, 0);
            }
            ctx.restore();
          }
        });

        // --- 太极 yin-yang at center ---
        const tyR = px(0.3);
        g2.strokeStyle = "rgba(150,116,62,0.55)"; g2.lineWidth = 2.5;
        g2.beginPath(); g2.arc(cx, cx, tyR, 0, Math.PI * 2); g2.stroke();
        b.strokeStyle = "#a0a0a0"; b.lineWidth = 2.5;
        b.beginPath(); b.arc(cx, cx, tyR, 0, Math.PI * 2); b.stroke();
        // yin half
        g2.fillStyle = "rgba(15,10,5,0.92)";
        g2.beginPath(); g2.arc(cx, cx, tyR, Math.PI * 0.5, Math.PI * 1.5); g2.fill();
        // yang half
        g2.fillStyle = "rgba(178,142,82,0.3)";
        g2.beginPath(); g2.arc(cx, cx, tyR, Math.PI * 1.5, Math.PI * 0.5); g2.fill();
        // S-curve
        g2.fillStyle = "rgba(15,10,5,0.92)";
        g2.beginPath(); g2.arc(cx, cx - tyR * 0.5, tyR * 0.5, Math.PI * 1.5, Math.PI * 0.5); g2.fill();
        g2.fillStyle = "rgba(178,142,82,0.3)";
        g2.beginPath(); g2.arc(cx, cx + tyR * 0.5, tyR * 0.5, Math.PI * 0.5, Math.PI * 1.5); g2.fill();
        // eyes
        g2.fillStyle = "rgba(178,142,82,0.4)";
        g2.beginPath(); g2.arc(cx, cx - tyR * 0.5, tyR * 0.13, 0, Math.PI * 2); g2.fill();
        g2.fillStyle = "rgba(15,10,5,0.85)";
        g2.beginPath(); g2.arc(cx, cx + tyR * 0.5, tyR * 0.13, 0, Math.PI * 2); g2.fill();

        // outer dotted ring
        g2.strokeStyle = "rgba(150,116,62,0.3)"; g2.lineWidth = 1; g2.setLineDash([3, 6]);
        g2.beginPath(); g2.arc(cx, cx, px(2.52), 0, Math.PI * 2); g2.stroke(); g2.setLineDash([]);

        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        disposables.push(tex);

        const bumpTex = new THREE.CanvasTexture(bv);
        bumpTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        disposables.push(bumpTex);

        return { colorMap: tex, bumpMap: bumpTex };
      }

      // ---- three ring registers ----
      const gTicks = new THREE.Group();
      const gTrigrams = new THREE.Group();
      const gHeart = new THREE.Group();

      // plate body — glossy cured lacquer with bump-mapped engravings
      const plateGeo = new THREE.CylinderGeometry(2.56, 2.56, 0.1, 128);
      plateGeo.rotateX(Math.PI / 2);
      disposables.push(plateGeo);
      const { colorMap, bumpMap } = buildFaceTextures();
      const faceMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: colorMap,
        bumpMap: bumpMap,
        bumpScale: 0.015,
        metalness: 0.18,
        roughness: 0.28, // glossier — cured lacquer catches light like glass
        envMapIntensity: 1.1,
      });
      const rimSideMat = new THREE.MeshStandardMaterial({
        color: 0x120d07,
        metalness: 0.25,
        roughness: 0.4,
        envMapIntensity: 0.8,
      });
      disposables.push(faceMat, rimSideMat);
      const plate = new THREE.Mesh(plateGeo, [rimSideMat, faceMat, faceMat]);
      plate.position.z = -0.06;
      gTicks.add(plate);

      // raised gold bezel
      const bezelGeo = new THREE.TorusGeometry(2.56, 0.04, 16, 128);
      disposables.push(bezelGeo);
      gTicks.add(new THREE.Mesh(bezelGeo, gold));

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

      // trigram band
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
          const tx = -Math.sin(a), ty = Math.cos(a), off = 0.135;
          [-1, 1].forEach((s) => {
            const m = new THREE.Mesh(halfGeo, gold);
            m.position.set(Math.cos(a) * r + tx * off * s, Math.sin(a) * r + ty * off * s, 0);
            m.rotation.z = a + Math.PI / 2;
            gTrigrams.add(m);
          });
        }
      }
      const trigrams = [[1,1,1],[1,1,0],[1,0,1],[1,0,0],[0,1,1],[0,1,0],[0,0,1],[0,0,0]];
      trigrams.forEach((tg, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        tg.forEach((bit, j) => addYao(a, radii[j], bit === 1));
      });

      // heart ring + heaven pool
      gHeart.add(ringMesh(0.62, 0.006, celadonMat));
      const nodeMat = new THREE.MeshStandardMaterial({ color: 0xb4402e, metalness: 0.2, roughness: 0.6 });
      disposables.push(nodeMat);

      const pool = new THREE.Group();
      pool.add(ringMesh(0.34, 0.012));
      const dishGeo = new THREE.CircleGeometry(0.33, 48);
      disposables.push(dishGeo);
      const dishMat = new THREE.MeshStandardMaterial({ color: 0x0e0a06, metalness: 0.45, roughness: 0.2, envMapIntensity: 1.25 });
      disposables.push(dishMat);
      const dish = new THREE.Mesh(dishGeo, dishMat);
      dish.position.z = -0.012;
      pool.add(dish);
      // diamond needle — red south, black north
      const needleShape = new THREE.Shape();
      needleShape.moveTo(0, 0.28);
      needleShape.lineTo(0.012, 0);
      needleShape.lineTo(0, -0.28);
      needleShape.lineTo(-0.012, 0);
      needleShape.closePath();
      const needleGeo = new THREE.ExtrudeGeometry(needleShape, { depth: 0.008, bevelEnabled: false });
      disposables.push(needleGeo);
      const needleRedMat = new THREE.MeshStandardMaterial({ color: 0xb4402e, metalness: 0.3, roughness: 0.5 });
      const needleBlkMat = new THREE.MeshStandardMaterial({ color: 0x1a130a, metalness: 0.3, roughness: 0.5 });
      disposables.push(needleRedMat, needleBlkMat);
      // two halves
      const needleRedShape = new THREE.Shape();
      needleRedShape.moveTo(0, 0.28); needleRedShape.lineTo(0.012, 0); needleRedShape.lineTo(-0.012, 0); needleRedShape.closePath();
      const needleBlkShape = new THREE.Shape();
      needleBlkShape.moveTo(0, -0.28); needleBlkShape.lineTo(0.012, 0); needleBlkShape.lineTo(-0.012, 0); needleBlkShape.closePath();
      const needleRedGeo = new THREE.ExtrudeGeometry(needleRedShape, { depth: 0.008, bevelEnabled: false });
      const needleBlkGeo = new THREE.ExtrudeGeometry(needleBlkShape, { depth: 0.008, bevelEnabled: false });
      disposables.push(needleRedGeo, needleBlkGeo);
      const needleRed = new THREE.Mesh(needleRedGeo, needleRedMat);
      const needleBlk = new THREE.Mesh(needleBlkGeo, needleBlkMat);
      needleRed.position.z = 0.018; needleBlk.position.z = 0.018;
      needleRed.rotation.z = 0.42; needleBlk.rotation.z = 0.42;
      pool.add(needleRed, needleBlk);
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

      // ---- dust motes ----
      const DUST = 80;
      const dustPos = new Float32Array(DUST * 3);
      const dustVel = new Float32Array(DUST * 3);
      for (let i = 0; i < DUST; i++) {
        dustPos[i * 3] = (Math.random() - 0.5) * 16;
        dustPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
        dustVel[i * 3] = (Math.random() - 0.5) * 0.003;
        dustVel[i * 3 + 1] = 0.001 + Math.random() * 0.004;
        dustVel[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
      }
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
      disposables.push(dustGeo);
      const dustMat = new THREE.PointsMaterial({ color: 0xffe7c2, size: 0.025, transparent: true, opacity: 0.35, sizeAttenuation: true, depthWrite: false });
      disposables.push(dustMat);
      scene.add(new THREE.Points(dustGeo, dustMat));

      // ---- scroll → world state ----
      let anchors: number[] = [];
      function measure() {
        const els = Array.from(document.querySelectorAll<HTMLElement>("[data-act]"))
          .sort((a, b) => Number(a.dataset.act) - Number(b.dataset.act));
        anchors = els.map((s) => { const r = s.getBoundingClientRect(); return r.top + window.scrollY + r.height / 2; });
      }
      measure();
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
        const f = (sc - anchors[i]) / (anchors[i + 1] - anchors[i]);
        if (i === 0) return f < 0.5 ? lerpKey(KEYS[0], SUB01, smooth(f / 0.5)) : lerpKey(SUB01, KEYS[1], smooth((f - 0.5) / 0.5));
        return lerpKey(KEYS[i], KEYS[i + 1], smooth(f));
      }

      const scatter = [-0.42, 0.3, -0.18];
      let spin = 0;
      let state = targetKey();

      // mouse parallax
      let mouseX = 0, mouseY = 0, smX = 0, smY = 0;
      if (!reduce) {
        const onMove = (e: MouseEvent) => { mouseX = (e.clientX / window.innerWidth - 0.5) * 2; mouseY = (e.clientY / window.innerHeight - 0.5) * 2; };
        window.addEventListener("mousemove", onMove, { passive: true });
        cleanup.push(() => window.removeEventListener("mousemove", onMove));
      }

      function apply(s: Key, t: number, dt: number) {
        spin += dt * 0.035 * (1 - 0.88 * s.align);
        const breathe = Math.sin(t * 0.05) * 0.05 * (1 - s.align);
        gTicks.rotation.z = spin + scatter[0] * (1 - s.align) + breathe;
        gTrigrams.rotation.z = spin + scatter[1] * (1 - s.align);
        gHeart.rotation.z = spin + scatter[2] * (1 - s.align) - breathe;

        tilt.position.set(fitPlateXForViewport(s.plate[0], window.innerWidth), s.plate[1], s.plate[2]);
        tilt.rotation.x = s.tiltX + Math.sin(t * 0.18) * 0.03 * (1 - s.align * 0.7);
        tilt.rotation.z = s.tiltZ;

        smX += (mouseX - smX) * 0.03;
        smY += (mouseY - smY) * 0.03;
        camera.position.set(s.cam[0] + smX * 0.35, s.cam[1] - smY * 0.2, s.cam[2]);
        camera.lookAt(s.look[0], s.look[1], s.look[2]);

        keyLight.intensity = s.key;
        keyLight.position.set(s.keyPos[0], s.keyPos[1], s.keyPos[2]);
        renderer.toneMappingExposure = s.exp;
        celadonMat.envMapIntensity = s.heart;

        // needle breathes — both halves oscillate together
        const needleAngle = 0.42 + Math.sin(t * 0.3) * 0.06 + Math.sin(t * 0.7) * 0.02;
        needleRed.rotation.z = needleAngle;
        needleBlk.rotation.z = needleAngle;

        // dust drift
        const pos = dustGeo.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < DUST; i++) {
          let x = pos.getX(i) + dustVel[i * 3];
          let y = pos.getY(i) + dustVel[i * 3 + 1];
          let z = pos.getZ(i) + dustVel[i * 3 + 2];
          if (y > 5) { y = -5; x = (Math.random() - 0.5) * 16; z = (Math.random() - 0.5) * 8; }
          if (x > 8) x = -8; if (x < -8) x = 8;
          pos.setXYZ(i, x, y, z);
        }
        pos.needsUpdate = true;

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
        state = targetKey(); apply(state, 5.5, 0);
        let pend = 0;
        const onScroll = () => { if (pend) return; pend = window.setTimeout(() => { pend = 0; state = targetKey(); apply(state, 5.5, 0); }, 120); };
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanup.push(() => { window.removeEventListener("scroll", onScroll); if (pend) window.clearTimeout(pend); });
      } else {
        let running = false;
        const INTRO = 1.7;
        const frame = () => {
          if (disposed || document.hidden) { running = false; return; }
          raf = requestAnimationFrame(frame);
          const dt = Math.min(clock.getDelta(), 0.05);
          const k = 1 - Math.exp(-dt * 3.4);
          state = lerpKey(state, targetKey(), k);
          const el = clock.getElapsedTime();
          let s = state;
          if (el < INTRO) {
            const p = smooth(el / INTRO);
            s = { ...state, cam: [state.cam[0], state.cam[1], state.cam[2] + (1 - p) * 2.8] as Vec3, exp: state.exp * (0.66 + 0.34 * p), keyPos: [state.keyPos[0] + (1 - p) * 10, state.keyPos[1], state.keyPos[2]] as Vec3 };
          }
          apply(s, el, dt);
        };
        const start = () => { if (running || disposed) return; running = true; clock.getDelta(); raf = requestAnimationFrame(frame); };
        const onVis = () => { if (!document.hidden) start(); };
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
    })().catch(() => {});

    return () => { disposed = true; cleanup.forEach((fn) => fn()); };
  }, []);

  return <div ref={mountRef} className="world-canvas" aria-hidden="true" />;
}
