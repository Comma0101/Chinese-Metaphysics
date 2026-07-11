import { PILOT_CORE_PRICE_USD } from "@/lib/contracts/pilot";

export type Localized = { zh: string; en: string };
export type LocalizedList = { zh: string[]; en: string[] };

// 展示层 only —— 金额一律来自冻结的试点合同（lib/contracts/pilot.ts）。
// 浏览器绝不提交 tier / 金额 / 支付状态；服务端常量才是定价事实。
// The deposit amount is a server-side constant (4,900 cents); the string
// below is presentation only and must match the server.
export const PILOT_DEPOSIT_PRICE_LABEL = "$49";
export const PILOT_CORE_PRICE_LABEL = `$${PILOT_CORE_PRICE_USD}`;

export type PilotStage = {
  id: "deposit" | "core";
  price: string;
  featured?: boolean;
  name: Localized;
  blurb: Localized;
  includes: LocalizedList;
  footnote: Localized;
};

export const PILOT_PATH: PilotStage[] = [
  {
    id: "deposit",
    price: PILOT_DEPOSIT_PRICE_LABEL,
    featured: true,
    name: { zh: "受理与校准定金", en: "Case assessment deposit" },
    blurb: {
      zh: "受邀申请通过后的第一步。用于资料核对与受理判断，不是一份单独出售的解读。",
      en: "The first step after an invited application is accepted. It covers intake verification and case assessment; it is not a reading sold on its own.",
    },
    includes: {
      zh: [
        "知几联系你，说明资料用途与服务范围",
        "此时才收集出生信息与你的问题",
        "核对排盘方法与相关历史事实",
      ],
      en: [
        "Zhiji contact and explanation of data use and scope",
        "Birth details and your question are collected only then",
        "Calculation method and relevant history are checked",
      ],
    },
    footnote: {
      zh: "正式受理后全额计入服务费；若按公布的受理规则无法继续，原路退还。",
      en: "Credited in full once accepted; returned to the original payment method if the case cannot proceed under the published acceptance rule.",
    },
  },
  {
    id: "core",
    price: PILOT_CORE_PRICE_LABEL,
    name: { zh: "完整咨询 · 首批服务价", en: "Complete consultation · initial cohort" },
    blurb: {
      zh: "围绕一件具体决定，交付书面判读、60 分钟私人面谈与后续复盘。",
      en: "A written decision brief, a 60-minute private consultation, and follow-up reviews focused on one concrete decision.",
    },
    includes: {
      zh: [
        "书面判读：盘面观察、现实条件、假设与选项比较",
        "一次 60 分钟私人面谈",
        "14 天有限澄清 + 30/90 天复盘",
      ],
      en: [
        "Written brief: chart observations, real-world facts, assumptions, and option trade-offs",
        "A 60-minute private consultation",
        "14 days of related clarification + 30/90-day reviews",
      ],
    },
    footnote: {
      zh: "定金全额计入服务费；方法说明、受理与退款规则、隐私条款和运营门槛公布前，付款保持关闭。",
      en: "The deposit is credited in full. Payment remains closed until the method disclosure, acceptance and refund rules, privacy terms, and operating gates are published.",
    },
  },
];
