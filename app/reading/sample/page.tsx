import Link from "next/link";
import { pickLang, withLang, SAMPLE, RISK } from "@/lib/content";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LangSync } from "@/components/LangSync";
import { BaziChart } from "@/components/BaziChart";

// 判读书 — fictional sample of the delivery structure; no real client data.

const DOC = {
  zh: {
    kind: "知几 · 决定判读",
    no: "编号 ZJ—DEMO · 虚构演示",
    delivered: "不代表客户结果",
    reviewH: "复盘",
    review30: "三十日复盘",
    review90: "九十日复盘",
    reviewNote: "正式服务会在这里记录：哪些建议有帮助，哪些假设需要修正，以及决定后来如何展开。",
    pending: "待复盘",
    reviewer: "知几案例审核 · 审核角色 ZJ-R01",
    method: "演示格式 · 方法规范待冻结",
    note: "这是虚构演示，不对应任何客户，也不证明准确率。它只展示正式文件如何区分观察、事实、假设、行动与反例。",
    cta: "已有邀请，开始申请",
    back: "← 返回",
  },
  en: {
    kind: "ZHIJI · Decision Brief",
    no: "No. ZJ—DEMO · fictional sample",
    delivered: "illustrative only",
    reviewH: "Review",
    review30: "30-day review",
    review90: "90-day review",
    reviewNote: "A real engagement records what helped, which assumptions needed revision, and how the decision unfolded.",
    pending: "pending",
    reviewer: "Zhiji Case Review · Reviewer role: ZJ-R01",
    method: "Illustrative format · method specification pending",
    note: "This fictional sample uses no real client data and makes no claim about accuracy. It shows how the brief separates observations, facts, assumptions, actions, and counterexamples.",
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
                知
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
              <BaziChart lang={lang} />
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
