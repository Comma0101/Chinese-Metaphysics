import Link from "next/link";
import { PILOT_PATH } from "@/lib/tiers";
import {
  T,
  pickLang,
  withLang,
  HOME_PILOT_BAND,
  CLOSING,
  TRUST,
  SAMPLE,
  GUARANTEES,
  RISK,
} from "@/lib/content";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LangSync } from "@/components/LangSync";
import { BaziChart } from "@/components/BaziChart";
import { LacquerWorld } from "@/components/LacquerWorld";
import { VolumeRail } from "@/components/VolumeRail";
import { MotionProvider } from "@/components/MotionProvider";

// long zh monuments break at their commas — a verse stack, never an orphan char
function clauseBreak(s: string) {
  const parts = s.split("，");
  return parts.map((p, i) => (
    <span key={i}>
      {p}
      {i < parts.length - 1 && "，"}
      {i < parts.length - 1 && <br />}
    </span>
  ));
}

export default function Home({
  searchParams,
}: {
  searchParams: { lang?: string };
}) {
  const lang = pickLang(searchParams.lang);
  const c = T[lang].home;
  const band = HOME_PILOT_BAND[lang];
  const closing = CLOSING[lang];
  const tr = TRUST[lang];
  const sm = SAMPLE[lang];
  const g = GUARANTEES[lang];
  const risk = RISK[lang];

  return (
    <>
      <LangSync lang={lang} />
      <MotionProvider />
      {/* 髹夜世界 — the persistent material world behind everything */}
      <LacquerWorld />
      {/* 卷目 — the volume index rail */}
      <VolumeRail lang={lang} />
      <SiteHeader lang={lang} />
      <main>
        {/* 卷首 · Hero — the craft-monograph cover */}
        <section className="hero" data-act="0">
          <div className="wrap">
            <div className="hero-grid">
              <div className="hero-inner">
                <p className="eyebrow">{c.eyebrow}</p>

                <h1 className={`hero-title${lang === "zh" ? " hero-title-zh" : ""}`} data-hero-title>
                  {lang === "zh" ? clauseBreak(c.h1) : c.h1}
                </h1>

                <div className="hero-aside">
                  <p className="en">{c.accent}</p>
                  <p className="lead" style={{ marginTop: 14 }}>
                    {c.lead}
                  </p>
                  <div className="cta-row">
                    <Link className="btn-gilt" href="#service">
                      {c.cta}
                    </Link>
                    <Link className="btn btn-ghost" href={withLang("/ask", lang)}>
                      {c.applyCta}
                    </Link>
                  </div>
                  <p className="cta-note">{c.ctaNote}</p>
                </div>

                <div className="gilt-rule" style={{ marginTop: 30 }} aria-hidden="true" />
                <div
                  className="hero-ledger"
                  aria-label={lang === "zh" ? "信任要点" : "Trust points"}
                >
                  {c.proof.map((p, i) => (
                    <span key={p} style={{ display: "contents" }}>
                      {i > 0 && <span className="dot" aria-hidden="true" />}
                      <span>{p}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 具体问题与服务内容 */}
        <section className="section" data-act="1" id="service">
          <div className="wrap">
            <h2>{c.s2h}</h2>
            <p className="lead" style={{ marginBottom: 44 }}>
              {c.s2lead}
            </p>
            <div className="cols">
              <div className="col">
                <h3>{c.isnotLabel}</h3>
                <ul>
                  {c.isnot.map((li, i) => (
                    <li key={i}>{li}</li>
                  ))}
                </ul>
              </div>
              <div className="col is">
                <h3>{c.isLabel}</h3>
                <ul>
                  {c.is.map((li, i) => (
                    <li key={i}>{li}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 虚构交付示例 —— 展示格式，不冒充客户证明 */}
        <section className="section act-paper seam-t" data-act="2">
          <span className="act-num" aria-hidden="true">
            卷二
          </span>
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">{sm.eyebrow}</p>
              <h2>{sm.h}</h2>
              <p className="lead">{sm.lead}</p>
            </div>
            <div className="sample-chart">
              <BaziChart lang={lang} />
            </div>
            <div className="sample">
              <div className="sample-side">
                <div className="sample-tag">{sm.tag}</div>
                <h3>{sm.caseH}</h3>
                <p className="q">{sm.q}</p>
                <div className="sample-meta">{sm.meta}</div>
              </div>
              <div className="sample-main">
                <ul className="reading">
                  {sm.reading.map((r, i) => (
                    <li key={i}>
                      <span className="k">{r.k}</span>
                      <span className="v">{r.v}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* 金缮 — the plate carries its own repair line: a crack, mended in gold */}
              <div className="sample-falsify">
                <svg className="kintsugi" viewBox="0 0 1000 30" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="kint" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#9c7a45" />
                      <stop offset="0.5" stopColor="#c7a265" />
                      <stop offset="1" stopColor="#9c7a45" />
                    </linearGradient>
                  </defs>
                  {/* the crack itself — always there, ink-dark */}
                  <path
                    className="crack-shadow"
                    vectorEffect="non-scaling-stroke"
                    d="M0 17 L38 15 L52 19 L146 12 L173 16 L258 10 L299 18 L344 14 L452 16 L497 9 L541 15 L602 12 L633 18 L716 10 L742 15 L829 13 L868 17 L917 11 L1000 15"
                  />
                  {/* the gold seam draws along it on arrival */}
                  <path
                    className="kintsugi-path"
                    pathLength={1}
                    vectorEffect="non-scaling-stroke"
                    d="M0 17 L38 15 L52 19 L146 12 L173 16 L258 10 L299 18 L344 14 L452 16 L497 9 L541 15 L602 12 L633 18 L716 10 L742 15 L829 13 L868 17 L917 11 L1000 15"
                  />
                  <path
                    className="kintsugi-path branch"
                    pathLength={1}
                    vectorEffect="non-scaling-stroke"
                    d="M344 14 L367 22 L392 26"
                  />
                  <path
                    className="kintsugi-path branch"
                    pathLength={1}
                    vectorEffect="non-scaling-stroke"
                    d="M633 18 L618 8 L601 4"
                  />
                </svg>
                <span className="falsify-label">{sm.falsifyLabel}</span>
                <p>{sm.falsify}</p>
              </div>
            </div>
            {/* 查看完整的虚构交付示例 */}
            <p className="sample-more">
              <Link href={withLang("/reading/sample", lang)}>
                {lang === "zh" ? "查看完整演示判读 →" : "View the full illustrative brief →"}
              </Link>
            </p>
          </div>
        </section>

        {/* 为什么值得付费 · 纸幕 continues */}
        <section className="section confidence act-paper seam-b">
          <div className="wrap">
            <div className="section-head">
              <h2>{c.confidenceH}</h2>
              <p className="lead">{c.confidenceLead}</p>
            </div>
            <div className="ledger">
              {c.confidence.map((item) => (
                <div className="ledger-row" key={item.h}>
                  <h3>{item.h}</h3>
                  <p>{item.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 三步 */}
        <section className="section" data-act="3">
          <span className="act-num" aria-hidden="true">
            卷三
          </span>
          <div className="wrap">
            <h2>{lang === "zh" ? clauseBreak(c.s3h) : c.s3h}</h2>
            <div className="steps">
              {c.steps.map((s, i) => (
                <div className="step" key={i}>
                  <div className="num">{s.num}</div>
                  <h3>{s.h}</h3>
                  <p>{s.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 关于 / 谁在看你的盘 */}
        <section className="section act-paper seam-t seam-b" id="about" data-act="4">
          <span className="act-num" aria-hidden="true">
            卷四
          </span>
          <div className="wrap">
            <div className="trust-grid">
              <div>
                <p className="eyebrow">{tr.eyebrow}</p>
                <h2>{tr.h}</h2>
                <p className="lead" style={{ marginTop: 20 }}>
                  {tr.body}
                </p>
                <p className="sign">{tr.sign}</p>
              </div>
              <div className="trust-points">
                {tr.points.map((pt, i) => (
                  <div className="tp" key={i}>
                    <h3>{pt.h}</h3>
                    <p>{pt.p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 免费盲测 band */}
        <section className="section band">
          <div className="wrap">
            <p className="lead">{band.band}</p>
            <Link className="btn" href={withLang("/free", lang)}>
              {band.cta}
            </Link>
          </div>
        </section>

        {/* 交付保证 · 纸幕 */}
        <section className="section act-paper seam-t seam-b">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">{g.eyebrow}</p>
              <h2>{lang === "zh" ? clauseBreak(g.h) : g.h}</h2>
            </div>
            {/* 保证书 — one sealed certificate, not a feature grid */}
            <div className="certificate">
              {g.items.map((it, i) => (
                <div className="clause" key={i}>
                  <span className="clause-num" aria-hidden="true">
                    {["一", "二", "三", "四"][i] ?? "·"}
                  </span>
                  <div>
                    <div className="g-k">{it.k}</div>
                    <p className="g-v">{it.v}</p>
                  </div>
                </div>
              ))}
              <span className="cert-seal" aria-hidden="true">
                知
              </span>
            </div>
          </div>
        </section>

        {/* 价位 */}
        <section className="section pricing-section" data-act="5">
          <span className="act-num" aria-hidden="true">
            卷五
          </span>
          <div className="wrap">
            <div className="section-head">
              <h2>{c.priceH}</h2>
              <p className="lead">{c.priceLead}</p>
              <p className="price-trust">{c.priceTrust}</p>
            </div>
            {/* 一条路径:可抵扣定金 → 正式服务(创始价)。金额展示与冻结合同一致 */}
            <div className="tiers path-tiers">
              {PILOT_PATH.map((s) => (
                <div key={s.id} className={s.featured ? "tier featured" : "tier"}>
                  {s.featured && (
                    <span className="tier-seal" aria-hidden="true">
                      始
                    </span>
                  )}
                  <div className="flag">
                    {s.id === "deposit"
                      ? lang === "zh"
                        ? "第一步"
                        : "Step one"
                      : lang === "zh"
                        ? "第二步 · 正式受理后"
                        : "Step two · once accepted"}
                  </div>
                  <div className="price">{s.price}</div>
                  <div className="refund">{s.footnote[lang]}</div>
                  <div className="tname">{s.name[lang]}</div>
                  <div className="blurb">{s.blurb[lang]}</div>
                  <ul>
                    {s.includes[lang].map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                  {s.id === "deposit" ? (
                    <Link className="btn" href={withLang("/ask", lang)}>
                      {c.applyCta}
                    </Link>
                  ) : (
                    <div className="turnaround">{risk}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 边界声明 */}
        <section className="section boundary" data-act="6">
          {/* 冰裂纹 — the glaze crackles where the promise ends */}
          <svg
            className="crackle"
            viewBox="0 0 1200 56"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <g>
              <path d="M0 30 L74 27 L131 33 L216 24 L288 31" />
              <path d="M131 33 L118 50 L96 56" />
              <path d="M216 24 L232 8 L226 0" />
              <path d="M288 31 L367 26 L438 34 L512 25 L580 30" />
              <path d="M438 34 L459 48 L488 56" />
              <path d="M512 25 L502 10 L510 0" />
              <path d="M580 30 L654 24 L731 32 L809 26" />
              <path d="M654 24 L640 9 L644 0" />
              <path d="M731 32 L748 46 L744 56" />
              <path d="M809 26 L884 33 L957 25 L1035 31 L1108 27 L1200 32" />
              <path d="M957 25 L972 11 L966 0" />
              <path d="M1035 31 L1022 45 L1030 56" />
              <path d="M1108 27 L1124 40 L1152 47" />
            </g>
          </svg>
          <div className="wrap">
            <div className="b-inner">
              <p className="b-label">{lang === "zh" ? "边界" : "Scope & limits"}</p>
              <p>{c.boundary}</p>
            </div>
          </div>
        </section>

        {/* 卷终 —— 安静收尾。订阅表单已按试点合规要求移除(fail-closed) */}
        <section className="section">
          <div className="wrap">
            <div className="closing">
              <h2>{closing.h}</h2>
              <p className="lead">{closing.body}</p>
              <div className="cta-row" style={{ marginTop: 22 }}>
                <Link className="btn-gilt" href={withLang("/ask", lang)}>
                  {closing.cta}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
