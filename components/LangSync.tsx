"use client";

import { useEffect } from "react";
import { Lang } from "@/lib/content";

/**
 * Reflects the resolved page language on <html lang> so assistive tech
 * pronounces English pages in English (the static shell is lang="zh").
 * Renders nothing.
 */
export function LangSync({ lang }: { lang: Lang }) {
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "zh";
  }, [lang]);
  return null;
}
