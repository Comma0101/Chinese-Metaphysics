import Link from "next/link";
import { pickLang, PILOT_STATUS } from "@/lib/content";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LangSync } from "@/components/LangSync";
import { CheckoutStatus } from "@/components/CheckoutStatus";

export const dynamic = "force-dynamic";

// 只读状态页:支付状态由 webhook 写入,这里只轮询展示。
// 本页不 import Stripe,不改任何支付状态。
export default function Success({
  searchParams,
}: {
  searchParams: { lang?: string };
}) {
  const lang = pickLang(searchParams.lang);
  const c = PILOT_STATUS[lang];

  return (
    <>
      <LangSync lang={lang} />
      <SiteHeader lang={lang} />
      <main className="act-paper seam-b">
        <div className="center">
          <div className="wrap">
            <div className="receipt">
              <div className="receipt-seal" aria-hidden="true">
                知
              </div>
              <div className="receipt-inner">
                <CheckoutStatus lang={lang} />
                <div className="cta-row">
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
