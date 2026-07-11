import Link from "next/link";
import { pickLang, withLang, DOCS, DOC_NAV, type DocSlug, type Lang } from "@/lib/content";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LangSync } from "@/components/LangSync";

/**
 * 说明页 — shared layout for the trust & compliance documents (method,
 * promise, privacy, terms, deposit). Rendered on the rice-paper ground of the
 * Paper & Lacquer system. Legal drafts carry a visible draft banner; nothing
 * here implies payment is open or a claim is validated.
 */
const slugToPath = (s: DocSlug) => (s === "deposit" ? "/deposit-policy" : `/${s}`);

export function DocPage({ slug, langParam }: { slug: DocSlug; langParam?: string }) {
  const lang: Lang = pickLang(langParam);
  const d = DOCS[lang][slug];
  const nav = DOC_NAV[lang];
  const back = lang === "zh" ? "← 返回" : "← Back";

  return (
    <>
      <LangSync lang={lang} />
      <SiteHeader lang={lang} />
      <main className="form-page act-paper seam-b">
        <div className="wrap slim">
          <Link className="back" href={withLang("/", lang)}>
            {back}
          </Link>

          <div className="ask-head">
            <p className="eyebrow">{d.eyebrow}</p>
            <h1>{d.h1}</h1>
            <p className="lead">{d.lead}</p>
            <p className="doc-version">{d.version}</p>
          </div>

          {d.draft && (
            <div className="doc-draft" role="note">
              {d.draft}
            </div>
          )}

          <article className="doc-prose">
            {d.sections.map((s, i) => (
              <section key={i}>
                <h2>{s.h}</h2>
                {s.body.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </section>
            ))}
            {d.footnote && <p className="doc-footnote">{d.footnote}</p>}
          </article>

          <nav className="doc-more" aria-label={lang === "zh" ? "更多说明" : "More documents"}>
            {nav
              .filter((n) => n.slug !== slug)
              .map((n) => (
                <Link key={n.slug} href={`${slugToPath(n.slug)}?lang=${lang}`}>
                  {n.label}
                </Link>
              ))}
          </nav>
        </div>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
