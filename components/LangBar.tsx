import Link from "next/link";
import { Lang, T } from "@/lib/content";

// 服务端页面用的语言切换:两个链接切 ?lang=
export function LangBar({ lang, base }: { lang: Lang; base: string }) {
  return (
    <div className="langbar wrap">
      <Link className={lang === "zh" ? "on" : ""} href={`${base}?lang=zh`}>
        {T.zh.toggleZh}
      </Link>
      <span>/</span>
      <Link className={lang === "en" ? "on" : ""} href={`${base}?lang=en`}>
        {T.zh.toggleEn}
      </Link>
    </div>
  );
}
