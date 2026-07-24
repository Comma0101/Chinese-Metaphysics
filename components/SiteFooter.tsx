import Link from "next/link";
import { Lang, FOOTER, DOC_NAV } from "@/lib/content";

export function SiteFooter({ lang }: { lang: Lang }) {
  const f = FOOTER[lang];
  const docs = DOC_NAV[lang];

  function href(h: string) {
    return h.startsWith("/#") ? `/?lang=${lang}${h.slice(1)}` : `${h}?lang=${lang}`;
  }

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="cols3">
          <div>
            <div className="fbrand">
              <span className="seal">观</span>
              <span className="word">观复 Meridian</span>
            </div>
            <p className="ftag">{f.tagline}</p>
          </div>
          <div>
            <div className="fhead">{lang === "zh" ? "导航" : "Explore"}</div>
            <div className="fnav">
              {f.nav.map((n) => (
                <Link key={n.href} href={href(n.href)}>
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="fhead">{lang === "zh" ? "边界" : "Scope & limits"}</div>
            <p className="flegal">{f.legal}</p>
          </div>
        </div>
        <div className="fpolicy">
          {docs.map((d) => (
            <Link key={d.slug} href={`/${d.slug === "deposit" ? "deposit-policy" : d.slug}?lang=${lang}`}>
              {d.label}
            </Link>
          ))}
        </div>
        <div className="frights">{f.rights}</div>
      </div>
    </footer>
  );
}
