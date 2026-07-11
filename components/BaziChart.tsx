import { Lang, CHART } from "@/lib/content";

// 示例干支(招牌展示件)。日主 = 日柱天干「甲」,与样例「财旺身弱」判读一致。
// 甲戌 / 戊辰 / 甲午 / 己巳:甲木生辰月、财透无印根 —— 可被内行验证为财旺身弱。
const PILLARS = [
  { stem: "甲", branch: "戌" },
  { stem: "戊", branch: "辰" },
  { stem: "甲", branch: "午", self: true },
  { stem: "己", branch: "巳" },
];

export function BaziChart({ lang }: { lang: Lang }) {
  const c = CHART[lang];

  return (
    <div className="chart">
      <div className="chart-cap">
        <span className="dot" />
        {c.caption}
      </div>
      <div className="chart-body">
        {/* 表头:四柱 */}
        <div className="cell head" />
        {PILLARS.map((p, i) => (
          <div key={`h${i}`} className={`cell head${p.self ? " self" : ""}`}>
            {c.pillars[i]}
          </div>
        ))}

        {/* 天干 —— 日主 = 日柱天干,单独强调 */}
        <div className="cell rowlabel">{c.stem}</div>
        {PILLARS.map((p, i) => (
          <div key={`s${i}`} className={`cell gz${p.self ? " self dm" : ""}`}>
            {p.stem}
          </div>
        ))}

        {/* 地支 —— 日支属日柱,同列淡高亮但非日主 */}
        <div className="cell rowlabel">{c.branch}</div>
        {PILLARS.map((p, i) => (
          <div key={`b${i}`} className={`cell gz${p.self ? " self" : ""}`}>
            {p.branch}
          </div>
        ))}
      </div>
      <div className="chart-self">↑ {c.self}</div>
      <span className="chart-stamp" aria-hidden="true">
        知
      </span>
    </div>
  );
}
