import { Lang, CHART } from "@/lib/content";

/**
 * 示例四柱 — 甲戌 / 戊辰 / 甲午 / 己巳
 * 日主 = 甲木，偏财格，财旺身弱。
 * 藏干、十神、纳音、大运均可被内行逐格验证。
 */

const SHISHEN: Record<string, string> = {
  甲: "比肩", 乙: "劫财",
  丙: "食神", 丁: "伤官",
  戊: "偏财", 己: "正财",
  庚: "七杀", 辛: "正官",
  壬: "偏印", 癸: "正印",
};

const PILLARS = [
  { stem: "甲", branch: "戌", hidden: ["戊", "辛", "丁"], nayin: "山头火" },
  { stem: "戊", branch: "辰", hidden: ["戊", "乙", "癸"], nayin: "大林木" },
  { stem: "甲", branch: "午", self: true, hidden: ["丁", "己"], nayin: "沙中金" },
  { stem: "己", branch: "巳", hidden: ["丙", "庚", "戊"], nayin: "大林木" },
];

const DAYUN = [
  { gz: "己巳", age: 3, year: 2027 },
  { gz: "庚午", age: 13, year: 2037 },
  { gz: "辛未", age: 23, year: 2047 },
  { gz: "壬申", age: 33, year: 2057 },
  { gz: "癸酉", age: 43, year: 2067 },
  { gz: "甲戌", age: 53, year: 2077 },
];

export function BaziChart({ lang }: { lang: Lang }) {
  const c = CHART[lang];
  const zh = lang === "zh";

  return (
    <div className="chart">
      <div className="chart-cap">
        <span className="dot" />
        {c.caption}
      </div>

      {/* 格局 · 旺衰 · 用神 · 忌神 */}
      <div className="chart-judgment">
        <span className="cj-item">
          <span className="cj-k">{zh ? "格局" : "Structure"}</span>
          <span className="cj-v">{zh ? "偏财格" : "Indirect Wealth"}</span>
        </span>
        <span className="cj-sep" />
        <span className="cj-item">
          <span className="cj-k">{zh ? "旺衰" : "Strength"}</span>
          <span className="cj-v">{zh ? "身弱" : "Weak DM"}</span>
        </span>
        <span className="cj-sep" />
        <span className="cj-item">
          <span className="cj-k">{zh ? "用神" : "Favorable"}</span>
          <span className="cj-v cj-use">{zh ? "水 · 木" : "Water · Wood"}</span>
        </span>
        <span className="cj-sep" />
        <span className="cj-item">
          <span className="cj-k">{zh ? "忌神" : "Unfavorable"}</span>
          <span className="cj-v cj-avoid">{zh ? "土 · 火" : "Earth · Fire"}</span>
        </span>
      </div>

      <div className="chart-body">
        {/* header */}
        <div className="cell head" />
        {PILLARS.map((p, i) => (
          <div key={`h${i}`} className={`cell head${p.self ? " self" : ""}`}>
            {c.pillars[i]}
          </div>
        ))}

        {/* 十神 */}
        <div className="cell rowlabel">{zh ? "十神" : "Gods"}</div>
        {PILLARS.map((p, i) => (
          <div key={`ss${i}`} className={`cell shishen${p.self ? " self" : ""}`}>
            {p.self ? (zh ? "日主" : "DM") : SHISHEN[p.stem]}
          </div>
        ))}

        {/* 天干 */}
        <div className="cell rowlabel">{c.stem}</div>
        {PILLARS.map((p, i) => (
          <div key={`s${i}`} className={`cell gz${p.self ? " self dm" : ""}`}>
            {p.stem}
          </div>
        ))}

        {/* 地支 */}
        <div className="cell rowlabel">{c.branch}</div>
        {PILLARS.map((p, i) => (
          <div key={`b${i}`} className={`cell gz${p.self ? " self" : ""}`}>
            {p.branch}
          </div>
        ))}

        {/* 藏干 */}
        <div className="cell rowlabel">{zh ? "藏干" : "Hidden"}</div>
        {PILLARS.map((p, i) => (
          <div key={`cg${i}`} className={`cell canggan${p.self ? " self" : ""}`}>
            {p.hidden.join(" ")}
          </div>
        ))}

        {/* 藏干十神 */}
        <div className="cell rowlabel">{zh ? "藏神" : "H.Gods"}</div>
        {PILLARS.map((p, i) => (
          <div key={`cgs${i}`} className={`cell canggan-ss${p.self ? " self" : ""}`}>
            {p.hidden.map((h) => SHISHEN[h]).join(" · ")}
          </div>
        ))}

        {/* 纳音 */}
        <div className="cell rowlabel">{zh ? "纳音" : "Nayin"}</div>
        {PILLARS.map((p, i) => (
          <div key={`ny${i}`} className={`cell nayin${p.self ? " self" : ""}`}>
            {p.nayin}
          </div>
        ))}
      </div>

      <div className="chart-self">↑ {c.self}</div>

      {/* 大运 */}
      <div className="chart-dayun">
        <div className="cd-label">{zh ? "大运" : "Major Luck"}</div>
        <div className="cd-row">
          {DAYUN.map((d, i) => (
            <div key={i} className="cd-cell">
              <span className="cd-gz">{d.gz}</span>
              <span className="cd-meta">{d.age}{zh ? "岁" : ""} · {d.year}</span>
            </div>
          ))}
        </div>
      </div>

      <span className="chart-stamp" aria-hidden="true">知</span>
    </div>
  );
}
