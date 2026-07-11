import Link from "next/link";
import { T, pickLang, withLang } from "@/lib/content";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LangSync } from "@/components/LangSync";

export const dynamic = "force-dynamic";

export default function Cancel({
  searchParams,
}: {
  searchParams: { lang?: string };
}) {
  const lang = pickLang(searchParams.lang);
  const c = T[lang].cancel;

  return (
    <>
      <LangSync lang={lang} />
      <SiteHeader lang={lang} />
      <main className="act-paper seam-b">
        <div className="center">
          <div className="wrap">
            <div className="receipt">
              <div className="receipt-seal" aria-hidden="true">
                留
              </div>
              <div className="receipt-inner">
                <p className="receipt-label">{c.keptLabel}</p>
                <h1>{c.h1}</h1>
                <p className="lead">{c.lead}</p>
                <p className="receipt-reassure">{c.reassure}</p>

                <div className="cta-row">
                  <Link className="btn" href={withLang("/ask", lang)}>
                    {c.finish}
                  </Link>
                  <Link className="btn btn-ghost" href={`/?lang=${lang}`}>
                    {c.home}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
