import Link from "next/link";
import { PILOT_EXPLAINER, pickLang, withLang } from "@/lib/content";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LangSync } from "@/components/LangSync";

export const dynamic = "force-dynamic";

// 「免费盲测」已停用 —— 本页不收集任何信息,只说明试点流程。
// 在资格确认与知情同意之前,不收集任何出生信息或个人叙述。
export default function HowItWorks({
  searchParams,
}: {
  searchParams: { lang?: string };
}) {
  const lang = pickLang(searchParams.lang);
  const c = PILOT_EXPLAINER[lang];

  return (
    <>
      <LangSync lang={lang} />
      <SiteHeader lang={lang} />
      <main className="form-page act-paper seam-b">
        <div className="wrap slim">
          <Link className="back" href={withLang("/", lang)}>
            {c.back}
          </Link>

          <div className="ask-head">
            <p className="eyebrow">{c.eyebrow}</p>
            <h1>{c.h1}</h1>
            <p className="lead">{c.lead}</p>
          </div>

          <ol className="timeline path-steps">
            {c.steps.map((s, i) => (
              <li key={i}>
                <span className="t-k">{s.k}</span>
                <span className="t-v">{s.v}</span>
              </li>
            ))}
          </ol>

          <p className="field-privacy">{c.note}</p>

          <div className="cta-row" style={{ marginTop: 26 }}>
            <Link className="btn-gilt" href={withLang("/ask", lang)}>
              {c.cta}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
