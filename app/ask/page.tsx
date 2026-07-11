import Link from "next/link";
import { PILOT_FORM, pickLang, withLang, RISK } from "@/lib/content";
import { PILOT_PATH } from "@/lib/tiers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LangSync } from "@/components/LangSync";
import { PilotApplication } from "@/components/PilotApplication";

export const dynamic = "force-dynamic";

// 试点资格申请 —— 不收生辰、不收具体问题；一条路径:定金 → 正式服务。
export default function AskPage({
  searchParams,
}: {
  searchParams: { lang?: string };
}) {
  const lang = pickLang(searchParams.lang);
  const c = PILOT_FORM[lang];

  return (
    <>
      <LangSync lang={lang} />
      <SiteHeader lang={lang} />
      <main className="form-page act-paper seam-b">
        <div className="wrap">
          <Link className="back" href={withLang("/", lang)}>
            {c.back}
          </Link>

          <div className="ask-head">
            <p className="eyebrow">{c.eyebrow}</p>
            <h1>{c.h1}</h1>
            <p className="lead">{c.lead}</p>
          </div>

          <div className="ask-layout">
            <div className="ask-form-col">
              <PilotApplication lang={lang} />
            </div>

            {/* 右:一条路径 —— 定金与正式服务,规则写在付款按钮旁边 */}
            <aside className="ask-aside">
              <div className="commission-summary">
                <div className="cs-body">
                  {PILOT_PATH.map((s) => (
                    <div className="cs-stage" key={s.id}>
                      <div className="cs-row">
                        <span className="k">{s.name[lang]}</span>
                        <span className="v">{s.price}</span>
                      </div>
                      <p className="cs-stage-note">{s.footnote[lang]}</p>
                    </div>
                  ))}
                </div>
                <div className="cs-refund">{RISK[lang]}</div>
                <div className="cs-secure">{c.gateNote}</div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
