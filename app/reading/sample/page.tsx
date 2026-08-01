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
    observedH: "受观察的结构",
    observedLead: "下面解剖的结论，来自以下盘面结构。具体宫位与度数已脱敏，但保留的结构关系足以被复核。",
    observed: [
      { system: "紫微斗数", factor: "命宫天相；迁移宫紫微、七杀同宫", role: "秩序与破局的命迁轴张力" },
      { system: "七政四余", factor: "木星与命主星的具体宫位与相位已脱敏；土星与相关主星的关系已脱敏", role: "扩张倾向与层级稳定结构的缺口" },
      { system: "奇门遁甲", factor: "值符、天心、开门落坎宫；坎宫空亡", role: "方向已现，但门所在宫位无实质内容" },
    ],
    cta: "申请创始批次邀请",
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
    observedH: "Observed factors",
    observedLead: "The conclusion dissected below is based on the following chart structures. Specific houses and degrees are anonymized, but the structural relationships retained are sufficient for verification.",
    observed: [
      { system: "Zi Wei Dou Shu", factor: "Tian Xiang in Self Palace; Zi Wei + Qi Sha co-located in Travel Palace", role: "Self–Travel axis tension: order vs. breakthrough" },
      { system: "Qi Zheng Si Yu", factor: "Specific house and aspect of Jupiter relative to the Life Lord anonymized; Saturn's relationship with relevant lords anonymized", role: "Gap between expansion tendency and stabilizing structure" },
      { system: "Qi Men Dun Jia", factor: "Chief Symbol, Heart Star, Open Door in Kan palace; Kan palace void", role: "Direction present, material support absent" },
    ],
    cta: "Request a founding invitation",
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

            {/* 受观察的结构 — compact table mapping chart factors to the dissected conclusion */}
            <section className="rdoc-observed">
              <h2 className="rdoc-k">{d.observedH}</h2>
              <p className="rdoc-observed-lead">{d.observedLead}</p>
              <div className="rdoc-observed-table">
                {d.observed.map((o, i) => (
                  <div className="rdo-row" key={i}>
                    <span className="rdo-sys">{o.system}</span>
                    <span className="rdo-factor">{o.factor}</span>
                    <span className="rdo-role">{o.role}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 解剖一条结论 — annotated reasoning chain from chart to conclusion */}
            <section className="rdoc-dissection">
              <h2 className="rdoc-k">{sm.dissection.h}</h2>
              <p className="rdoc-dissection-lead">{sm.dissection.lead}</p>
              <div className="rdoc-dissection-steps">
                {sm.dissection.steps.map((s, i) => (
                  <div className="rds-step" key={i}>
                    <span className="rds-num">{s.k}</span>
                    <p>{s.v}</p>
                  </div>
                ))}
              </div>
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
            <Link className="btn-gilt" href={withLang("/#request", lang)}>
              {d.cta}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
