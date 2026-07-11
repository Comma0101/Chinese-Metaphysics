"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Lang, HEADER } from "@/lib/content";

function langHref(pathname: string, search: string, target: Lang) {
  const params = new URLSearchParams(search);
  params.set("lang", target);
  return `${pathname}?${params.toString()}`;
}

// The two language links. Kept param-preserving via `search`.
function LangPair({
  lang,
  pathname,
  search,
}: {
  lang: Lang;
  pathname: string;
  search: string;
}) {
  return (
    <>
      <Link className={lang === "zh" ? "on" : ""} href={langHref(pathname, search, "zh")}>
        中文
      </Link>
      <span>/</span>
      <Link className={lang === "en" ? "on" : ""} href={langHref(pathname, search, "en")}>
        EN
      </Link>
    </>
  );
}

// useSearchParams() forces a CSR bailout, so it lives behind a <Suspense>
// boundary (below) to keep /ask and /free statically prerenderable.
function LangDynamic({ lang, pathname }: { lang: Lang; pathname: string }) {
  const searchParams = useSearchParams();
  return <LangPair lang={lang} pathname={pathname} search={searchParams?.toString() ?? ""} />;
}

export function SiteHeader({ lang }: { lang: Lang }) {
  const pathname = usePathname() || "/";
  const h = HEADER[lang];
  const onFree = pathname.startsWith("/free");
  const onAsk = pathname.startsWith("/ask");

  return (
    <header className="site-header">
      <div className="inner">
        <Link className="brand" href={`/?lang=${lang}`}>
          <span className="seal">知</span>
          <span>
            <span className="word">知几</span>
            <span className="latin" style={{ display: "block" }}>
              ZHIJI
            </span>
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <nav className="nav">
            <Link
              className={onFree ? "on" : ""}
              aria-current={onFree ? "page" : undefined}
              href={`/free?lang=${lang}`}
            >
              {h.free}
            </Link>
            <Link
              className={onAsk ? "on" : ""}
              aria-current={onAsk ? "page" : undefined}
              href={`/ask?lang=${lang}`}
            >
              {h.ask}
            </Link>
            <Link href={`/?lang=${lang}#about`}>{h.about}</Link>
          </nav>
          <span className="lang">
            <Suspense fallback={<LangPair lang={lang} pathname={pathname} search="" />}>
              <LangDynamic lang={lang} pathname={pathname} />
            </Suspense>
          </span>
        </div>
      </div>
    </header>
  );
}
