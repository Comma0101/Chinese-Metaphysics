import { PILOT_CORE_PRICE_USD } from "@/lib/contracts/pilot";

export type Localized = { zh: string; en: string };
export type LocalizedList = { zh: string[]; en: string[] };

// 展示层 only —— 金额一律来自冻结的试点合同（lib/contracts/pilot.ts）。
// 浏览器绝不提交 tier / 金额 / 支付状态；服务端常量才是定价事实。
// The deposit amount is a server-side constant (4,900 cents); the string
// below is presentation only and must match the server.
export const PILOT_DEPOSIT_PRICE_LABEL = "US$49";
export const PILOT_CORE_PRICE_LABEL = `US$${PILOT_CORE_PRICE_USD}`;

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
        "观复联系你，说明资料用途与服务范围",
        "此时才收集出生信息与你的问题",
        "核对排盘方法与相关历史事实",
      ],
      en: [
        "Meridian contacts you to explain what data is needed, how it will be used, and the service scope",
        "Birth details and your question are collected only then",
        "Birth data, calculation settings, and relevant past events are reviewed",
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
    name: { zh: "完整咨询 · 首批服务费", en: "Full decision consultation · initial-cohort fee" },
    blurb: {
      zh: "围绕一件具体决定，交付书面决策判读、一轮书面澄清与后续书面复盘。",
      en: "A written decision brief, one written follow-up, and written reviews focused on one consequential decision.",
    },
    includes: {
      zh: [
        "书面决策判读：盘面观察、现实条件、假设与选项比较",
        "交付后 14 天内，可集中提交一轮关于原判读依据、假设或表述的书面问题",
        "30/90 天书面复盘",
      ],
      en: [
        "Written decision brief: chart observations, real-world facts, assumptions, and option trade-offs",
        "One consolidated written follow-up about the original brief’s reasoning, assumptions, or wording within 14 days after delivery",
        "Written reviews at 30 and 90 days",
      ],
    },
    footnote: {
      zh: "定金全额计入服务费。申请书与付款通道将在发布前政策（隐私、条款、定金规则）与运营准备就绪后开放。",
      en: "The deposit is credited in full. The application and payment channel will open once the pre-launch policies (privacy, terms, deposit) and operational readiness checks are complete.",
    },
  },
];
