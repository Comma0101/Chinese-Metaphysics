import Link from "next/link";
import { pickLang, withLang, SAMPLE, RISK } from "@/lib/content";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LangSync } from "@/components/LangSync";
import { ThreeSystemChart } from "@/components/ThreeSystemChart";

// 判读书 — excerpts from a real delivery, anonymized; no birth data or specific dates.

const DOC = {
  zh: {
    kind: "观复 · 三系统综合判读",
    no: "编号 GF—001 · 真实交付节选",
    delivered: "已脱敏 · 不作客户证明",
    reviewH: "复盘",
    review30: "三十日复盘",
    review90: "九十日复盘",
    reviewNote: "正式服务会在这里记录：哪些建议有帮助，哪些假设需要修正，以及决定后来如何展开。",
    pending: "待复盘",
    reviewer: "观复案例审核 · 审核角色 GF-R01",
    method: "交付节选 · 方法版本 v1.0",
    provLabel: "案例记录（已脱敏）",
    prov: [
      { k: "案例编号", v: "GF—001" },
      { k: "审核角色", v: "GF-R01" },
      { k: "方法版本", v: "v1.0" },
      { k: "审核日期", v: "已脱敏" },
      { k: "报告版本", v: "v1" },
      { k: "更正记录", v: "无" },
    ],
    note: "这是一份真实交付的节选，已脱敏：出生资料与具体时间均已移除，不对应可识别的个人，也不证明准确率。它展示三套工具如何分工、结论如何收敛、置信度如何标注，以及可追溯的案例信息如何记录。",
    cta: "已有邀请，开始申请",
    back: "← 返回",
  },
  en: {
    kind: "Meridian · Three-System Analysis",
    no: "No. GF—001 · excerpts from a real delivery",
    delivered: "anonymized · not a testimonial",
    reviewH: "Review",
    review30: "30-day review",
    review90: "90-day review",
    reviewNote: "A real engagement records what helped, which assumptions needed revision, and how the decision unfolded.",
    pending: "pending",
    reviewer: "Meridian Case Review · Reviewer role: GF-R01",
    method: "Delivery excerpts · Method version v1.0",
    provLabel: "Case record (anonymized)",
    prov: [
      { k: "Case no.", v: "GF—001" },
      { k: "Reviewer role", v: "GF-R01" },
      { k: "Method version", v: "v1.0" },
      { k: "Review date", v: "anonymized" },
      { k: "Report version", v: "v1" },
      { k: "Revisions", v: "none" },
    ],
    note: "These are excerpts from a real delivery, anonymized: birth data and specific dates have been removed, they do not identify any person, and they make no claim about accuracy. They show how the three systems divide the work, where conclusions converge, how confidence is labeled, and how traceable case information is recorded.",
    cta: "View application requirements",
    back: "← Back",
  },
} as const;

export default function SampleReading({
  searchParams,
}: {
  searchParams: { lang?: string };
}) {
  const lang = pickLang(searchParams.lang);
  const sm = SAMPLE[lang];
  const d = DOC[lang];

  return (
    <>
      <LangSync lang={lang} />
      <SiteHeader lang={lang} />
      <main className="act-paper seam-b">
        <div className="wrap">
          <Link className="back" href={withLang("/", lang)}>
            {d.back}
          </Link>

          <article className="rdoc">
            <header className="rdoc-head">
              <span className="rdoc-seal" aria-hidden="true">
                观
              </span>
              <div>
                <p className="rdoc-kind">
                  {d.kind} <span className="rdoc-no">{d.no}</span>
                </p>
                <h1>{sm.caseH}</h1>
              </div>
            </header>

            <blockquote className="rdoc-q">{sm.q}</blockquote>
            <p className="rdoc-meta">
              {sm.meta} · {d.delivered}
            </p>

            <div className="rdoc-chart">
              <ThreeSystemChart lang={lang} />
            </div>

            <section className="rdoc-body">
              {sm.reading.map((r, i) => (
                <div className="rdoc-sec" key={i}>
                  <h2 className="rdoc-k">{r.k}</h2>
                  <p className="rdoc-v">{r.v}</p>
                </div>
              ))}
            </section>

            <div className="rdoc-falsify">
              <span className="falsify-label">{sm.falsifyLabel}</span>
              <p>{sm.falsify}</p>
            </div>

            <section className="rdoc-review">
              <h2 className="rdoc-k">{d.reviewH}</h2>
              <div className="rdoc-review-row">
                <div>
                  <span className="rr-k">{d.review30}</span>
                  <span className="rr-v">{d.pending}</span>
                </div>
                <div>
                  <span className="rr-k">{d.review90}</span>
                  <span className="rr-v">{d.pending}</span>
                </div>
              </div>
              <p className="rdoc-review-note">{d.reviewNote}</p>
            </section>

            {/* 案例记录 — traceable provenance (brand-accountability spec) */}
            <section className="rdoc-provenance" aria-label={d.provLabel}>
              <p className="falsify-label">{d.provLabel}</p>
              <div className="rdoc-prov">
                {d.prov.map((p) => (
                  <div className="pv" key={p.k}>
                    <span className="k">{p.k}</span>
                    <span className="v">{p.v}</span>
                  </div>
                ))}
              </div>
            </section>

            <footer className="rdoc-sign">
              <p className="sign">{d.reviewer}</p>
              <p className="rdoc-sign-meta">{d.method}</p>
            </footer>
          </article>

          <p className="rdoc-note">{d.note}</p>
          <p className="rdoc-risk">{RISK[lang]}</p>

          <div className="cta-row rdoc-cta">
            <Link className="btn-gilt" href={withLang("/ask", lang)}>
              {d.cta}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
