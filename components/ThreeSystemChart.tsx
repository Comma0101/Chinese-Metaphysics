import { Lang } from "@/lib/content";

/**
 * 三系统分工图 — the sample's structural artifact.
 * The current method works with Zi Wei Dou Shu, Qi Zheng Si Yu and
 * Qi Men Dun Jia (no BaZi), so this replaces the old four-pillar chart:
 * two structured tables — the division of labor between the three
 * systems, and the anonymized Qi Men action-direction summary
 * (configuration time and birth data omitted).
 */

const SYSTEMS: Record<Lang, { tool: string; target: string; output: string }[]> = {
  zh: [
    {
      tool: "紫微斗数",
      target: "十二宫 · 命身 · 四化 · 大限",
      output: "人生领域如何互相牵动；当前十年的组织中心发生什么变化",
    },
    {
      tool: "七政四余",
      target: "出生时刻的日月五星与宫位",
      output: "长期运行机制如何从信息、价值、资源与契约形成现实位置",
    },
    {
      tool: "奇门遁甲",
      target: "提问当下的时空局势",
      output: "当前入口在哪里、为什么尚未落实、应按什么顺序行动",
    },
  ],
  en: [
    {
      tool: "Zi Wei Dou Shu",
      target: "Twelve palaces · self & body · four transformations · decade",
      output: "How life domains pull on one another; what changes at the organizing center of the current decade",
    },
    {
      tool: "Qi Zheng Si Yu",
      target: "Luminaries and planets at the birth moment",
      output: "How long-term position forms through information, value, resource, and contract",
    },
    {
      tool: "Qi Men Dun Jia",
      target: "The situation at the moment of the question",
      output: "Where the entry point is, why it has not materialized, and the order of action",
    },
  ],
};

const DIRECTIONS: Record<
  Lang,
  { dir: string; combo: string; task: string; tone?: "key" | "avoid" }[]
> = {
  zh: [
    {
      dir: "北 · 坎",
      combo: "值符 · 天心 · 开门",
      task: "定义标准、正式入口、合同与决策框架——但必须用现实事实填空",
      tone: "key",
    },
    {
      dir: "东 · 震",
      combo: "生门 · 天任 · 九地",
      task: "基础建设、稳定交付、现金流、训练、重复与长期资产",
    },
    {
      dir: "西南 · 坤",
      combo: "天英 · 景门 · 六合",
      task: "展示、表达、品牌与合作；应放在定义和基础之后",
    },
    {
      dir: "西 · 兑",
      combo: "死门 · 太阴",
      task: "本人正在结束、压缩与归档旧循环",
    },
    {
      dir: "东南 · 巽",
      combo: "天冲 · 伤门 · 玄武",
      task: "谨慎方向：高速运动、过量信息、传播失真与多线行动",
      tone: "avoid",
    },
  ],
  en: [
    {
      dir: "North · Kan",
      combo: "Chief Symbol · Heart Star · Open Door",
      task: "Define standards, the formal entry, contracts, and decision frames — but fill them with real-world facts",
      tone: "key",
    },
    {
      dir: "East · Zhen",
      combo: "Life Door · Tian Ren · Nine Earth",
      task: "Foundation, stable delivery, cash flow, training, repetition, and long-term assets",
    },
    {
      dir: "Southwest · Kun",
      combo: "Tian Ying · Scene Door · Six Harmony",
      task: "Presentation, expression, brand, and partnership — after definition and foundation",
    },
    {
      dir: "West · Dui",
      combo: "Death Door · Great Moon",
      task: "The client is ending, compressing, and archiving old cycles",
    },
    {
      dir: "Southeast · Xun",
      combo: "Tian Chong · Harm Door · Black Tortoise",
      task: "Caution: high speed, excess information, distorted messaging, and too many lines at once",
      tone: "avoid",
    },
  ],
};

export function ThreeSystemChart({ lang }: { lang: Lang }) {
  const zh = lang === "zh";

  return (
    <div className="chart sys-chart">
      <div className="chart-cap">
        <span className="dot" />
        {zh ? "三系统分工 · 交付节选示意" : "Three-system division · from the delivery excerpts"}
      </div>

      <table className="sys-table">
        <thead>
          <tr>
            <th>{zh ? "工具" : "System"}</th>
            <th>{zh ? "主要对象" : "Reads"}</th>
            <th>{zh ? "本次核心输出" : "Core output"}</th>
          </tr>
        </thead>
        <tbody>
          {SYSTEMS[lang].map((s) => (
            <tr key={s.tool}>
              <td className="sys-tool">{s.tool}</td>
              <td>{s.target}</td>
              <td>{s.output}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="sys-sub">
        {zh ? "奇门行动方向 · 已脱敏" : "Qi Men action directions · anonymized"}
      </div>
      <table className="sys-table">
        <thead>
          <tr>
            <th>{zh ? "方向" : "Direction"}</th>
            <th>{zh ? "组合" : "Combination"}</th>
            <th>{zh ? "适合承担的任务" : "Fit to carry"}</th>
          </tr>
        </thead>
        <tbody>
          {DIRECTIONS[lang].map((d) => (
            <tr key={d.dir} className={d.tone ? `sys-${d.tone}` : undefined}>
              <td className="sys-tool">{d.dir}</td>
              <td>{d.combo}</td>
              <td>{d.task}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <span className="chart-stamp" aria-hidden="true">观</span>
    </div>
  );
}
