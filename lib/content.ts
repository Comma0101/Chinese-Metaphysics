export type Lang = "zh" | "en";

export function pickLang(v?: string): Lang {
  return v === "en" ? "en" : "zh";
}

type Step = { num: string; h: string; p: string };

type Chrome = {
  toggleZh: string;
  toggleEn: string;
  home: {
    eyebrow: string;
    h1: string;
    lead: string;
    accent: string;
    cta: string;
    applyCta: string;
    ctaNote: string;
    proof: string[];
    s2h: string;
    s2lead: string;
    isnotLabel: string;
    isnot: string[];
    isLabel: string;
    is: string[];
    confidenceH: string;
    confidenceLead: string;
    confidence: { h: string; p: string }[];
    s3h: string;
    steps: Step[];
    priceH: string;
    priceLead: string;
    priceTrust: string;
    boundary: string;
    footer: string;
  };
  cancel: {
    h1: string;
    lead: string;
    finish: string;
    home: string;
    keptLabel: string;
    reassure: string;
  };
};

export const T: Record<Lang, Chrome> = {
  zh: {
    toggleZh: "中文",
    toggleEn: "EN",
    home: {
      eyebrow: "私人中国命理咨询 · 以八字为主",
      h1: "一件难下的决定，先看清它的结构。",
      lead: "你正站在一个 90 天内要定下来的选择前——两份 offer、去还是留、进还是退。知几以八字为主、适合时结合紫微斗数，把时机、反复出现的模式与关键取舍，写成一份书面决策判读；交付后 14 天内，可集中提交一轮关于原判读依据、假设或表述的书面问题。不催你，不吓你，决定始终是你的。",
      accent: "Private Chinese metaphysics consultation, led by BaZi.",
      cta: "查看服务内容",
      applyCta: "已有邀请，开始申请",
      ctaNote: "适合职业、offer、去留、迁移、创业、关系与家庭节点",
      proof: ["一项重大决定", "书面决策判读", "一轮书面澄清 + 30/90 天书面复盘"],
      s2h: "你正在决定什么？",
      s2lead: "知几适合这样的时刻：选项已经摆在你面前，越想却越难定——而它不能一直拖，要在 90 天内定下来。",
      isnotLabel: "常见的人生节点",
      isnot: [
        "该接哪份工作，还是趁现在换一条路",
        "留下、回去，还是去另一座城市重新开始",
        "这段关系往前走，还是这一步太早、太晚",
        "家人的期待，和你想走的路，怎么摆到一起",
        "辞掉稳定的工作去搏一件事，是现在，还是再等等",
      ],
      isLabel: "这次咨询会做什么",
      is: [
        "以八字为主、适合时结合紫微斗数，看这件事的时机窗口、你反复走进的模式，和此刻没权衡到的取舍",
        "把盘面解释和现实条件分开写清楚，哪句是观察、哪句是事实，一眼能分",
        "比较选项，而不是替你下命令",
        "留下一份可回看、可质疑、可复盘的记录",
      ],
      confidenceH: "一次完整咨询，你会收到什么",
      confidenceLead:
        "这不是一份自动生成的性格报告，而是围绕一件具体决定、经过实质性人工审核的书面分析。交付、澄清与复盘，全程以书面进行。",
      confidence: [
        {
          h: "书面决策判读",
          p: "把盘面观察、现实约束、关键假设、选项差异与不确定之处放在同一份文件里。",
        },
        {
          h: "一轮书面澄清",
          p: "交付后 14 天内，可集中提交一轮关于原判读依据、假设或表述的书面问题。实质性修正会进入版本记录；新的决定不在本案范围内。",
        },
        {
          h: "30/90 天书面复盘",
          p: "以结构化书面记录回看决定、新事实与原判读，包括有用之处、偏差与需要修订的内容。",
        },
      ],
      s3h: "从申请到复盘",
      steps: [
        {
          num: "01 · 受邀申请",
          h: "先确认范围与基本条件",
          p: "只确认地区、决定类型、时间与服务边界；这一步不收出生信息，也不要求你讲具体困局。",
        },
        {
          num: "02 · 资料确认与判读",
          h: "核对排盘方法，围绕一件事写作",
          p: "受理后才收出生时间、地点与具体问题。知几核对方法与相关历史事实，再完成书面决策判读。",
        },
        {
          num: "03 · 交付与复盘",
          h: "交付、澄清与复盘，全程以书面进行",
          p: "交付后 14 天内，可集中提交一轮关于原判读依据、假设或表述的书面问题；30/90 天以书面记录哪些判断有用、哪些需要修正。",
        },
      ],
      priceH: "费用与受理方式",
      priceLead: "受邀个案先支付 US$49 受理与校准定金；正式受理后，全额计入首批服务费 US$388。",
      priceTrust:
        "付款目前保持关闭。开放前，方法说明、受理与退款规则、隐私条款和运营门槛会完整公布。",
      boundary:
        "知几把八字作为一种传统解释框架，用来梳理时间、重复模式与选择边界。它不保证结果，也不代替医疗、心理健康、法律、移民、投资或生育方面的专业意见。决定权始终在你。",
      footer: "知几 · Zhiji　—　围绕一项重大决定的私人中国命理咨询。",
    },
    cancel: {
      h1: "还没付定金",
      lead: "没有付款发生。想清楚再回来也不迟——这本来就不是一个该被催促的决定。",
      finish: "回到申请",
      home: "返回首页",
      keptLabel: "未付款",
      reassure:
        "US$49 为受理与校准定金。正式受理后全额计入 US$388 服务费；若按公布规则无法继续，原路退还。",
    },
  },
  en: {
    toggleZh: "中文",
    toggleEn: "EN",
    home: {
      eyebrow: "Private Chinese metaphysics consultation · BaZi-led",
      h1: "A hard decision, seen in its structure.",
      lead: "You're standing in front of one choice due within 90 days — two offers, stay or go, in or out. Led by BaZi (with Zi Wei Dou Shu when the case supports it), Zhiji writes the timing, the patterns that keep repeating, and the trade-off you can't yet see into one written decision brief. Within 14 days of delivery, you may submit one consolidated written follow-up about its reasoning, assumptions, or wording. No pressure, no fear — the decision stays yours.",
      accent: "私人中国命理咨询，以八字为主，按案结合紫微斗数。",
      cta: "See what is included",
      applyCta: "View application requirements",
      ctaNote: "For career choices, job offers, relocation, founder decisions, relationships, and family transitions",
      proof: ["One consequential decision", "A written decision brief", "One written follow-up + written 30/90-day reviews"],
      s2h: "What are you deciding?",
      s2lead:
        "Zhiji is for the moment when the options are already in front of you — the more you turn them over, the less certain you feel — and the choice can't keep waiting past 90 days.",
      isnotLabel: "Common decision points",
      isnot: [
        "Which job to take — or whether to change direction entirely, now",
        "Stay, go back, or start over in another city",
        "Whether this relationship moves forward, or the timing is too early or too late",
        "Your family's expectations and the path you actually want — how they fit together",
        "Leaving a stable job to bet on something of your own — now, or wait",
      ],
      isLabel: "What the consultation does",
      is: [
        "Uses BaZi—and Zi Wei Dou Shu when it fits—to read the timing window, the patterns you keep walking back into, and the trade-off you haven't weighed yet",
        "Separates chart interpretation from real-world facts, so you can see which line is an observation and which is a constraint",
        "Compares options without making the decision for you",
        "Leaves you with a record you can revisit, challenge, and review later",
      ],
      confidenceH: "What you receive",
      confidenceLead:
        "This is not an automated personality report. It is a substantive, human-reviewed service built around one specific decision and delivered asynchronously in writing.",
      confidence: [
        {
          h: "A written decision brief",
          p: "Chart observations, real-world constraints, key assumptions, option trade-offs, and uncertainty in one document.",
        },
        {
          h: "One written follow-up",
          p: "Within 14 days after delivery, you may submit one consolidated written follow-up about the original brief’s reasoning, assumptions, or wording. Material corrections enter the revision history; new decisions are outside the case scope.",
        },
        {
          h: "Written reviews at 30 and 90 days",
          p: "Structured written reviews compare the original brief with new facts and the decision made, recording what proved useful, what did not hold, and what requires revision.",
        },
      ],
      s3h: "From application to review",
      steps: [
        {
          num: "01 · Invited application",
          h: "Confirm scope and basic eligibility",
          p: "Only location, decision type, timing, and service boundaries are checked. No birth data or personal narrative is collected here.",
        },
        {
          num: "02 · Intake and written analysis",
          h: "Validate the inputs and focus the analysis on one question",
          p: "Birth details and your question are collected only after acceptance. Zhiji checks the method and relevant history, then prepares the brief.",
        },
        {
          num: "03 · Delivery and review",
          h: "Complete the case in writing",
          p: "Within 14 days after delivery, you may submit one consolidated written follow-up about the original brief’s reasoning, assumptions, or wording. Written reviews at 30 and 90 days record what helped and what needs revision.",
        },
      ],
      priceH: "Fees and case acceptance",
      priceLead: "Invited cases begin with a US$49 case assessment deposit. Once accepted, it is credited in full toward the US$388 initial-cohort fee.",
      priceTrust:
        "Payments are not yet open. Before they open, we will publish the method disclosure, privacy notice, service terms, and acceptance and refund policy, and complete our operational readiness checks.",
      boundary:
        "Zhiji uses BaZi—and, where appropriate, Zi Wei Dou Shu—as traditional interpretive frameworks for examining timing, recurring patterns, and decision boundaries. The service does not guarantee outcomes or replace medical, mental-health, legal, immigration, investment, or fertility advice. The decision remains yours.",
      footer: "Zhiji — Private Chinese metaphysics consultation for one consequential decision.",
    },
    cancel: {
      h1: "No deposit was paid",
      lead: "No payment was processed. Return when you have had time to consider the decision—there is no reason to rush.",
      finish: "Back to the application",
      home: "Return to the homepage",
      keptLabel: "Not paid",
      reassure:
        "The US$49 is a case assessment deposit. Once accepted, it is credited in full toward the US$388 fee. If the case cannot proceed under the published acceptance criteria, it is returned to the original payment method.",
    },
  },
};

// 生成带 lang 的链接
export function withLang(path: string, lang: Lang, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ lang, ...(extra || {}) });
  return `${path}?${params.toString()}`;
}

// 试点申请（资格确认表）—— 只收集 lib/contracts/pilot.ts 允许的字段
export const PILOT_FORM: Record<
  Lang,
  {
    back: string;
    eyebrow: string;
    h1: string;
    lead: string;
    noSensitive: string;
    sectionBasics: string;
    sectionDecision: string;
    sectionScreen: string;
    sectionConsent: string;
    email: string;
    emailHint: string;
    country: string;
    countries: { v: "US" | "CA" | "OTHER"; label: string }[];
    region: string;
    regionPlaceholder: string;
    city: string;
    cityPlaceholder: string;
    decisionType: string;
    decisionTypes: { v: string; label: string }[];
    decisionWindow: string;
    decisionWindows: { v: string; label: string }[];
    friendGraph: string;
    friendGraphs: { v: string; label: string }[];
    accessCode: string;
    accessCodeHint: string;
    screenCrisis: string;
    screenRestricted: string;
    yes: string;
    no: string;
    acks: { key: string; label: string; href?: DocSlug; linkLabel?: string }[];
    marketing: string;
    required: string;
    submit: string;
    submitting: string;
    priceLine: string;
    gateNote: string;
    errors: {
      missing: string;
      validation: string;
      declined: string;
      declinedReasons: Record<string, string>;
      accessDenied: string;
      pilotClosed: string;
      checkoutExpired: string;
      checkoutUnavailable: string;
      conflict: string;
      tooLarge: string;
      badContentType: string;
      network: string;
    };
  }
> = {
  zh: {
    back: "← 返回",
    eyebrow: "受邀咨询申请",
    h1: "先确认这件事是否在服务范围内",
    lead: "如果你已经收到邀请，请先完成这份基本确认。这里不收出生信息，也不要求你写下具体困局。通过后，才会进入定金与正式资料环节。",
    noSensitive:
      "请不要在这里填写出生日期、具体经历、健康状况、财务信息或他人的资料。正式受理后，需要的资料会在单独说明用途与保存方式后收集。",
    sectionBasics: "联系与地区",
    sectionDecision: "决定的范围",
    sectionScreen: "服务边界",
    sectionConsent: "提交前确认",
    email: "Email",
    emailHint: "— 仅用于本次申请的沟通",
    country: "所在国家",
    countries: [
      { v: "US", label: "美国" },
      { v: "CA", label: "加拿大" },
      { v: "OTHER", label: "其他" },
    ],
    region: "州 / 省",
    regionPlaceholder: "如：California / Ontario",
    city: "城市",
    cityPlaceholder: "如：Los Angeles / Toronto",
    decisionType: "决定的类型",
    decisionTypes: [
      { v: "career", label: "职业 / offer" },
      { v: "relocation", label: "去留 / 迁移" },
      { v: "founder", label: "创业 / 关键业务" },
      { v: "relationship", label: "关系" },
      { v: "family", label: "家庭" },
      { v: "other", label: "其他" },
    ],
    decisionWindow: "大约什么时候要定",
    decisionWindows: [
      { v: "within_30_days", label: "30 天内" },
      { v: "within_90_days", label: "90 天内" },
      { v: "later", label: "更晚" },
      { v: "unsure", label: "不确定" },
    ],
    friendGraph: "你如何得知知几（可选）",
    friendGraphs: [
      { v: "unknown", label: "不方便说 / 其他" },
      { v: "direct_friend", label: "知几团队直接认识的人" },
      { v: "client_referral", label: "客户介绍" },
      { v: "community", label: "社群" },
      { v: "organic", label: "自己搜到 / 看到内容" },
      { v: "paid", label: "广告" },
    ],
    accessCode: "邀请码",
    accessCodeHint: "— 仅受邀申请需要",
    screenCrisis: "你目前是否处于急性心理危机（如自伤念头、剧烈恐慌）中？",
    screenRestricted:
      "你要问的，是否属于医疗、心理治疗、法律、移民、投资或生育方面的专业建议？",
    yes: "是",
    no: "否",
    acks: [
      { key: "ageConfirmed", label: "我已年满 18 岁。" },
      {
        key: "priceAcknowledged",
        label: "我了解首批完整咨询费用为 US$388，US$49 定金会全额计入服务费。",
      },
      {
        key: "frameworkAccepted",
        label: "我理解八字，以及适用时采用的紫微斗数，在这里都是传统解释框架，不保证结果。",
      },
      {
        key: "agencyAccepted",
        label: "我会自行作出决定；判读是一个参考角度，不是指令。",
      },
      {
        key: "scopeAccepted",
        label: "我了解本服务不提供医疗、心理健康、法律、移民、投资或生育专业意见。",
      },
      {
        key: "softwareDisclosureAcknowledged",
        label: "我知悉最终判读会经过知几的实质性人工审核；软件用途会披露，我的资料默认不用于训练模型。",
      },
      {
        key: "privacyConsent",
        label: "我已阅读隐私说明草案，并了解具约束力的正式版本会在付款开放前发布。",
        href: "privacy",
        linkLabel: "阅读草案",
      },
      {
        key: "termsAccepted",
        label: "我已阅读服务条款草案，并了解正式版本会在付款开放前发布；当前不能提交付款。",
        href: "terms",
        linkLabel: "阅读草案",
      },
      {
        key: "depositPolicyAccepted",
        label: "我已阅读定金规则草案：定金计入正式服务，无法按公布规则受理则原路退还。",
        href: "deposit",
        linkLabel: "阅读草案",
      },
      {
        key: "selfOnlyDataConfirmed",
        label: "我提交的信息只关于我本人，不含未成年人或第三方的资料。",
      },
    ],
    marketing: "邮件更新目前未开放。",
    required: "必填",
    submit: "确认资格并继续",
    submitting: "正在提交…",
    priceLine: "下一步费用：US$49 受理与校准定金；正式受理后全额计入首批咨询费用 US$388。",
    gateNote: "付款目前保持关闭。开放前，方法说明、受理与退款规则、隐私条款和运营门槛会完整公布。",
    errors: {
      missing: "请完成所有必填项与必要的确认。",
      validation: "有一项信息未通过校验，请检查后重试。",
      declined: "根据这些基本信息，这件事目前不在知几的受理范围内。没有扣款，也不需要补充个人经历。",
      declinedReasons: {
        minor_or_age_unconfirmed: "试点仅面向已确认年满 18 岁的申请人。",
        unsupported_country: "试点目前仅在美国与加拿大受理。",
        location_not_enabled: "你所在的地区尚未开放受理。",
        decision_not_within_90_days: "试点优先受理 90 天内要定的事——时机到了欢迎再来。",
        price_not_acknowledged: "进入试点需要确认了解 US$388 的创始价。",
        required_acknowledgement_missing: "尚有必要的确认未勾选。",
        acute_crisis:
          "你现在更需要的是即时的专业支持，而不是一次命理咨询。若在美国或加拿大，可拨打或发送短信 988（Suicide & Crisis Lifeline）。",
        restricted_advice:
          "这类问题请咨询相应领域的执业专业人士——医疗、法律、移民、投资等不在本服务范围内。",
        third_party_or_minor_data: "试点只受理关于你本人的申请。",
      },
      accessDenied: "邀请码无效。请核对你收到的邀请信息。",
      pilotClosed: "本批试点已满或暂未开放。你的申请未被提交，也没有任何扣款。",
      checkoutExpired: "这次支付会话已过期。请重新提交申请。",
      checkoutUnavailable: "支付暂不可用，没有产生扣款。请稍后再试；若问题持续，请通过邀请邮件联系我们。",
      conflict: "这份申请似乎已提交过。若你修改了内容，请刷新页面后重新填写。",
      tooLarge: "提交内容过长，请缩短后重试。",
      badContentType: "提交格式异常，请刷新页面后重试。",
      network: "网络异常，请稍后重试。你的定金不会被重复扣取。",
    },
  },
  en: {
    back: "← Back",
    eyebrow: "Invitation-only consultation application",
    h1: "First, confirm that the decision is within scope",
    lead: "This page shows the eligibility requirements for an invitation-only consultation. It does not ask for birth data or your personal story. Applications and payments are not yet open.",
    noSensitive:
      "Do not enter birth dates, personal history, health or financial details, or information about anyone else. If applications open and a case is accepted, detailed intake will follow separately after we explain why each item is needed and how long it will be retained.",
    sectionBasics: "Contact and location",
    sectionDecision: "Decision scope",
    sectionScreen: "Service boundaries",
    sectionConsent: "Before you submit",
    email: "Email",
    emailHint: "— used only to contact you about this application",
    country: "Country",
    countries: [
      { v: "US", label: "United States" },
      { v: "CA", label: "Canada" },
      { v: "OTHER", label: "Other" },
    ],
    region: "State / Province",
    regionPlaceholder: "e.g. California / Ontario",
    city: "City",
    cityPlaceholder: "e.g. Los Angeles / Toronto",
    decisionType: "Type of decision",
    decisionTypes: [
      { v: "career", label: "Career or job offer" },
      { v: "relocation", label: "Relocation or return" },
      { v: "founder", label: "Founder or business decision" },
      { v: "relationship", label: "Relationship" },
      { v: "family", label: "Family" },
      { v: "other", label: "Other" },
    ],
    decisionWindow: "When do you expect to decide?",
    decisionWindows: [
      { v: "within_30_days", label: "Within 30 days" },
      { v: "within_90_days", label: "Within 90 days" },
      { v: "later", label: "Later" },
      { v: "unsure", label: "Unsure" },
    ],
    friendGraph: "How did you find Zhiji? (optional)",
    friendGraphs: [
      { v: "unknown", label: "Prefer not to say / other" },
      { v: "direct_friend", label: "Direct invitation from Zhiji" },
      { v: "client_referral", label: "Client referral" },
      { v: "community", label: "Community" },
      { v: "organic", label: "Search or Zhiji content" },
      { v: "paid", label: "An ad" },
    ],
    accessCode: "Invitation code",
    accessCodeHint: "— required for invited applications",
    screenCrisis:
      "Are you currently in acute crisis (e.g. thoughts of self-harm, severe panic)?",
    screenRestricted:
      "Is your question a request for medical, mental-health, legal, immigration, investment, or fertility advice?",
    yes: "Yes",
    no: "No",
    acks: [
      { key: "ageConfirmed", label: "I am 18 or older." },
      {
        key: "priceAcknowledged",
        label: "I understand the complete consultation costs US$388 for the initial cohort, with the US$49 deposit credited in full.",
      },
      {
        key: "frameworkAccepted",
        label: "I understand that BaZi—and Zi Wei Dou Shu when used—are traditional interpretive frameworks and do not guarantee an outcome.",
      },
      {
        key: "agencyAccepted",
        label: "I understand that the final decision remains mine. The brief offers another perspective, not an instruction.",
      },
      {
        key: "scopeAccepted",
        label: "I understand the boundaries: no medical, mental-health, legal, immigration, investment, or fertility advice.",
      },
      {
        key: "softwareDisclosureAcknowledged",
        label: "I understand that Zhiji completes a substantive human review of the final interpretation, software use is disclosed, and my data is not used for model training by default.",
      },
      {
        key: "privacyConsent",
        label: "I have read the privacy draft and understand the binding version will be published before payment opens.",
        href: "privacy",
        linkLabel: "Read draft",
      },
      {
        key: "termsAccepted",
        label: "I have read the terms draft and understand the binding version will be published before payment opens; payment cannot currently be submitted.",
        href: "terms",
        linkLabel: "Read draft",
      },
      {
        key: "depositPolicyAccepted",
        label: "I have read the deposit-policy draft: the deposit is credited to the engagement, or returned if the case cannot proceed under the published rule.",
        href: "deposit",
        linkLabel: "Read draft",
      },
      {
        key: "selfOnlyDataConfirmed",
        label: "I will submit information about myself only, not about minors or other people.",
      },
    ],
    marketing: "Email updates are not currently offered.",
    required: "required",
    submit: "Check eligibility",
    submitting: "Submitting…",
    priceLine: "Next-step fee: a US$49 case assessment deposit, credited in full toward the US$388 initial-cohort consultation.",
    gateNote: "Applications and payments are not yet open. Before they open, we will publish the method disclosure, privacy notice, service terms, and acceptance and refund policy, and complete our operational readiness checks.",
    errors: {
      missing: "Please complete all required fields and confirmations.",
      validation: "One of the fields didn't pass validation — please check and retry.",
      declined: "Based on these basic details, the decision is not currently within Zhiji's scope. Nothing was charged, and no personal history is needed.",
      declinedReasons: {
        minor_or_age_unconfirmed: "The pilot is only open to confirmed adults (18+).",
        unsupported_country: "The pilot currently accepts cases in the US and Canada only.",
        location_not_enabled: "Your area isn't enabled for the pilot yet.",
        decision_not_within_90_days: "This initial cohort is limited to decisions expected within 90 days. You are welcome to return when that applies.",
        price_not_acknowledged: "The pilot requires acknowledging the US$388 founding price.",
        required_acknowledgement_missing: "A required acknowledgement is missing.",
        acute_crisis:
          "Zhiji is not appropriate for an immediate mental-health crisis. In the U.S. or Canada, contact 988 by phone or text for immediate support.",
        restricted_advice:
          "Questions like this belong with a licensed professional — medical, legal, immigration, and investment advice are outside this service.",
        third_party_or_minor_data: "The pilot accepts applications about yourself only.",
      },
      accessDenied: "That access code isn't valid. Please check your invitation.",
      pilotClosed: "This pilot batch is full or not yet open. Your application was not submitted and nothing was charged.",
      checkoutExpired: "That payment session expired. Please submit the application again.",
      checkoutUnavailable: "Payment is temporarily unavailable and nothing was charged. Try again later; if the problem continues, contact us through your invitation email.",
      conflict: "This application looks like it was already submitted. If you changed something, refresh the page and fill it in again.",
      tooLarge: "The submission is too large — please shorten it and retry.",
      badContentType: "The submission format was rejected — refresh the page and retry.",
      network: "Network error — please try again shortly. Your deposit will not be charged twice.",
    },
  },
};

// 定金支付状态页（只读；由 /api/checkout/status 轮询而来）
export const PILOT_STATUS: Record<
  Lang,
  {
    checking: string;
    pendingH: string;
    pendingLead: string;
    paidH: string;
    paidLead: string;
    paidNext: { k: string; v: string }[];
    refundedH: string;
    refundedLead: string;
    notFoundH: string;
    notFoundLead: string;
    unavailableH: string;
    unavailableLead: string;
    contact: string;
    home: string;
  }
> = {
  zh: {
    checking: "正在核对支付状态…",
    pendingH: "支付仍在处理中",
    pendingLead:
      "这个页面会自动更新。你也可以稍后回来查看，不需要重新支付。",
    paidH: "定金已收到。",
    paidLead:
      "US$49 受理与校准定金已确认。正式受理后会全额计入 US$388 服务费；若按公布规则无法继续，将原路退还。",
    paidNext: [
      { k: "确认邮件", v: "系统会发送案件编号与当前状态。" },
      { k: "下一步说明", v: "知几案例团队会联系你，说明资料用途、服务范围与受理规则。" },
      { k: "资料收集", v: "出生信息与具体问题到那时才会单独收集。" },
    ],
    refundedH: "定金已退还",
    refundedLead: "这笔定金已按预定流程退还。若有疑问，回复你收到的邮件即可。",
    notFoundH: "没有找到这笔支付",
    notFoundLead: "这个链接没有对应的支付记录。若你刚完成付款，请稍候刷新，或通过确认邮件联系我们。",
    unavailableH: "状态暂时无法核对",
    unavailableLead: "支付状态服务暂时不可用。请稍后刷新——你不会被重复扣款。",
    contact: "如有疑问，请回复确认邮件并保留案件编号。",
    home: "返回首页",
  },
  en: {
    checking: "Checking payment status…",
    pendingH: "Payment is still processing",
    pendingLead:
      "This page updates automatically. You can also return later; there is no need to pay again.",
    paidH: "Deposit received.",
    paidLead:
      "Your US$49 case assessment deposit is confirmed. Once accepted, it is credited in full toward the US$388 fee. If the case cannot proceed under the published acceptance criteria, it is returned to the original payment method.",
    paidNext: [
      { k: "Confirmation email", v: "The system sends your case number and current status." },
      { k: "Next-step explanation", v: "Zhiji will explain data use, service scope, and the acceptance rule." },
      { k: "Detailed intake", v: "Birth information and your question are collected separately at that point." },
    ],
    refundedH: "Deposit refunded",
    refundedLead: "This deposit has been returned under the stated process. Questions? Just reply to the email you received.",
    notFoundH: "Payment not found",
    notFoundLead: "No payment record matches this link. If you just paid, wait a moment and refresh — or reply to your confirmation email.",
    unavailableH: "Status temporarily unavailable",
    unavailableLead: "The status service is temporarily unavailable. Refresh in a moment — you will not be charged twice.",
    contact: "If you have a question, reply to the confirmation email and keep your case number in the thread.",
    home: "Return to the homepage",
  },
};

// /free —— 已改为「试点说明」页：不收集任何信息
export const PILOT_EXPLAINER: Record<
  Lang,
  {
    back: string;
    eyebrow: string;
    h1: string;
    lead: string;
    steps: { k: string; v: string }[];
    note: string;
    cta: string;
  }
> = {
  zh: {
    back: "← 返回",
    eyebrow: "服务流程",
    h1: "从受邀申请到 90 天复盘",
    lead: "目前只接受受邀申请。每一步都说明要收什么资料、由谁完成，以及什么时候可以停止。",
    steps: [
      { k: "一 · 范围确认", v: "只确认地区、决定类型与时间；不收出生信息或具体经历。" },
      { k: "二 · 受理定金", v: "US$49。正式受理后计入 US$388 服务费；无法按公布规则继续则原路退还。" },
      { k: "三 · 资料与方法", v: "说明用途和保存方式后，才收出生时间、地点与一个具体问题。" },
      { k: "四 · 历史核对", v: "用已发生的事实检查排盘资料与解释是否适用；这不是准确率证明。" },
      { k: "五 · 书面交付", v: "交付一份经过人工审核、带版本记录的书面决策判读；整个服务以书面异步方式完成。" },
      { k: "六 · 书面澄清与复盘", v: "交付后 14 天内，可集中提交一轮关于原判读依据、假设或表述的书面问题；30/90 天后完成书面复盘。" },
    ],
    note: "知几不提供免费盲测，也不会为了获客先收出生信息。没有邀请码，可以先查看演示判读与完整费用说明。",
    cta: "已有邀请，开始申请",
  },
  en: {
    back: "← Back",
    eyebrow: "Service process",
    h1: "From invited application to the 90-day review",
    lead: "Applications and payments are not yet open. The steps below show the intended service process, including what information is collected and when a client may stop.",
    steps: [
      { k: "1 · Scope check", v: "Location, decision type, and timing only. No birth data or personal history." },
      { k: "2 · Case assessment deposit", v: "US$49. Credited toward the US$388 fee; returned if the case cannot proceed under the published acceptance criteria." },
      { k: "3 · Data and method", v: "Birth time, location, and one question are collected only after purpose and retention are explained." },
      { k: "4 · Historical check", v: "Past facts are used to check the source data and whether the interpretation is useful—not to claim an accuracy rate." },
      { k: "5 · Written delivery", v: "A human-reviewed, versioned written decision brief. The entire service is delivered asynchronously in writing." },
      { k: "6 · Written follow-up and review", v: "Within 14 days after delivery, you may submit one consolidated written follow-up about the original brief’s reasoning, assumptions, or wording. Written reviews follow at 30 and 90 days." },
    ],
    note: "Zhiji does not offer a free blind reading or collect birth data as a lead magnet. You can review the illustrative brief and current fee structure before applications open.",
    cta: "View application requirements",
  },
};

// 首页 band —— 试点入口（替代旧免费盲测转化带）
export const HOME_PILOT_BAND: Record<Lang, { band: string; cta: string }> = {
  zh: {
    band: "目前仅接受受邀申请。提交前，可以先看完整流程、费用与资料边界。",
    cta: "了解流程",
  },
  en: {
    band: "Applications and payments are not yet open. Review the process, current fees, and data boundaries in advance.",
    cta: "Review the process",
  },
};

// 卷终 —— 安静收尾（订阅表单已按试点合规要求移除）
export const CLOSING: Record<Lang, { h: string; body: string; cta: string }> = {
  zh: {
    h: "等问题具体了，再来。",
    body: "如果你还没有明确选项，或决定并不在未来 90 天内，现在不需要申请。知几适合一件已经摆在面前、值得认真梳理的事。",
    cta: "已有邀请，开始申请",
  },
  en: {
    h: "Apply when you have a concrete decision.",
    body: "If you do not yet have clear options—or the decision is not due within 90 days—there is no reason to apply now. Zhiji is for a decision already in front of you.",
    cta: "View application requirements",
  },
};

// 页眉导航
export const HEADER: Record<Lang, { free: string; ask: string; about: string }> = {
  zh: { free: "服务流程", ask: "申请条件", about: "方法与责任" },
  en: { free: "Process", ask: "Application requirements", about: "Method & accountability" },
};

// 页脚
export const FOOTER: Record<
  Lang,
  { tagline: string; legal: string; rights: string; nav: { label: string; href: string }[] }
> = {
  zh: {
    tagline: "围绕一件重大决定的私人中国命理咨询。",
    legal:
      "八字，以及适用时采用的紫微斗数，在这里都是传统解释框架，不保证结果，也不代替专业意见。决定权在你。",
    rights: "© 2026 知几 Zhiji",
    nav: [
      { label: "服务流程", href: "/free" },
      { label: "申请条件", href: "/ask" },
      { label: "方法与责任", href: "/#about" },
    ],
  },
  en: {
    tagline: "Private Chinese metaphysics consultation for one consequential decision.",
    legal:
      "BaZi—and Zi Wei Dou Shu when used—are traditional interpretive frameworks. They do not guarantee an outcome or replace professional advice. The decision remains yours.",
    rights: "© 2026 Zhiji",
    nav: [
      { label: "Process", href: "/free" },
      { label: "Application requirements", href: "/ask" },
      { label: "Method & accountability", href: "/#about" },
    ],
  },
};

// 方法与责任（公开责任归于知几的流程与记录，不塑造个人大师人设）
export const TRUST: Record<
  Lang,
  {
    eyebrow: string;
    h: string;
    body: string;
    points: { h: string; p: string }[];
    sign: string;
  }
> = {
  zh: {
    eyebrow: "方法与责任",
    h: "每一份判断，都留下可追溯的责任记录",
    body: "知几不公开个人姓名或照片，也不虚构“大师”人设。每份交付都经过实质性人工审核，并记录案例编号、方法版本、审核日期与修订历史。软件参与哪些环节，也会如实说明。",
    points: [
      { h: "人工审核", p: "盘面输入、解释、书面简报与关键修改都必须经过人工复核，不能把自动生成结果直接交付给客户。" },
      { h: "方法可追溯", p: "排盘选择、关键假设、软件用途、不确定之处与报告版本会保留在案例记录中。" },
      { h: "允许质疑与修正", p: "客户可以要求解释依据；30/90 天复盘会记录需要修正的地方，而不只记录符合之处。" },
    ],
    sign: "— 知几案例审核",
  },
  en: {
    eyebrow: "Method & accountability",
    h: "Every case includes a traceable review record",
    body: "Zhiji uses brand accountability rather than a public practitioner persona. Every delivered interpretation undergoes substantive human review and carries a case number, reviewer-role ID, method version, review date, and revision history. The report also states which tasks were software-assisted. We do not publish a practitioner's name or photograph, and we do not invent a ‘master’ persona.",
    points: [
      { h: "Human review", p: "Chart inputs, interpretation, the written brief, and substantive revisions must be reviewed by a person. Automated output is never delivered as final judgment." },
      { h: "Traceable method", p: "Calculation choices, key assumptions, software use, uncertainty, and report versions remain in the case record." },
      { h: "Open to correction", p: "Clients can ask for the reasoning. The 30/90-day review records what needs revision as well as what helped." },
    ],
    sign: "— Zhiji case review",
  },
};

// 演示样例（装裱的判读）—— 明确标注为演示，不声称真实客户案例
export const SAMPLE: Record<
  Lang,
  {
    eyebrow: string;
    h: string;
    lead: string;
    tag: string;
    caseH: string;
    q: string;
    meta: string;
    reading: { k: string; v: string }[];
    falsifyLabel: string;
    falsify: string;
  }
> = {
  zh: {
    eyebrow: "交付示例",
    h: "先看文件怎么写，再决定值不值得谈。",
    lead: "下面是一份虚构演示，用来展示判读如何区分盘面观察、现实条件、关键假设与行动边界。它不是客户证明，也不代表准确率。",
    tag: "虚构演示 · 不对应任何真实个案",
    caseH: "演示：机会在别处，家在这里",
    q: "「一个很好的机会在另一座城市，可我对象的生活在这边，爸妈也一年比一年需要人。我到底该抓住这次，还是留下来？」",
    meta: "虚构情境 · 仅展示交付结构",
    reading: [
      {
        k: "现实条件",
        v: "这不只是一个工作选择。对象能不能一起走、父母真实的健康与身边有没有人照应、这一步可不可逆、以及推掉这次机会的实际代价——这些事实比盘更能改变结论。判读会把它们和盘面分开写。",
      },
      {
        k: "盘面观察",
        v: "这份示意盘把注意力放在「先扛起别人的需要」与「顺着自己的时机走」之间的张力。它解释的是这件事为什么这么难，而不是叫你走还是留。",
      },
      {
        k: "关键假设",
        v: "只有当过去几年确实反复出现「为了让别人安心，一再推迟自己的选择」时，这个观察才值得进入比较；否则需要重看。",
      },
      {
        k: "低后悔行动",
        v: "先向三边要同一组事实：这个机会能不能等、能不能远程、真实的截止在哪；和对象认真谈一次「真要走需要什么」；弄清父母除了你之外还有哪些支持。信息补齐后，再比较哪条路更符合当下的承受力。",
      },
    ],
    falsifyLabel: "哪些事实会改变或推翻这版判断",
    falsify:
      "如果对象其实愿意一起搬、父母身边已有稳妥的照应，或你过去每一次大胆独立的决定反而走得更好，那么整个风险判断都会改变。正式判读必须把这些反例写在前面，而不是等结果出来再补解释。",
  },
  en: {
    eyebrow: "Delivery example",
    h: "See the deliverable before deciding whether to apply.",
    lead: "This fictional sample shows how a brief separates chart observations, real-world constraints, key assumptions, and action boundaries. It uses no real client data and makes no claim about accuracy.",
    tag: "Fictional sample · no real client data",
    caseH: "Fictional case: a chance elsewhere, home is here",
    q: "“There's a real opportunity in another city, but my partner's life is here and my parents need me more every year. Do I take this, or stay?”",
    meta: "Fictional scenario · delivery structure only",
    reading: [
      {
        k: "Real-world constraints",
        v: "This is not only a career choice. Whether your partner could move too, your parents' actual health and whether anyone else is nearby to help, how reversible the move is, and the real cost of turning this down — these facts change the answer more than the chart does. The brief keeps them separate from the chart.",
      },
      {
        k: "Chart observation",
        v: "In this illustrative chart, the useful tension is between carrying other people's needs first and acting on your own window. It explains why this feels so hard—it does not tell you to go or to stay.",
      },
      {
        k: "Key assumption",
        v: "This matters only if recent years also show a pattern of putting off your own moves to keep others comfortable. If that pattern is absent, the reading needs revision.",
      },
      {
        k: "Low-regret next step",
        v: "Before deciding, get the same set of facts from all three sides: whether the opportunity can wait or be remote and its real deadline; one honest conversation with your partner about what a move would actually take; and what support your parents have beyond you. Compare again once those unknowns shrink.",
      },
    ],
    falsifyLabel: "What would change this assessment",
    falsify:
      "If your partner is in fact open to moving, your parents already have dependable support, or you have historically done better by making bold independent moves, the whole risk picture changes. A real brief names those counterexamples up front, not after the outcome.",
  },
};

// 运营承诺 —— 只写现在就能兑现的事（研究认可的操作性承诺）
export const GUARANTEES: Record<
  Lang,
  { eyebrow: string; h: string; items: { k: string; v: string }[] }
> = {
  zh: {
    eyebrow: "服务约定",
    h: "付款前，你应该能确认这些事",
    items: [
      {
        k: "责任如何记录",
        v: "每份交付记录案例编号、方法版本、审核日期与修订历史；软件用途写明，最终内容经过实质性人工审核。",
      },
      {
        k: "交付写什么",
        v: "判读区分盘面观察、现实条件、关键假设与不确定之处；决定权始终在你。",
      },
      {
        k: "定金怎么处理",
        v: "US$49 受理与校准定金全额计入正式服务；若按公布的受理规则无法继续，原路退还。",
      },
      {
        k: "服务何时结束",
        v: "服务范围包括书面决策判读；交付后 14 天内，可集中提交一轮关于原判读依据、假设或表述的书面问题；并在 30/90 天完成书面复盘。不提供无限聊天。",
      },
    ],
  },
  en: {
    eyebrow: "Before payments open",
    h: "What will be published and operational before payments open",
    items: [
      {
        k: "How accountability is recorded",
        v: "Every delivery records a case number, method version, review date, and revision history. Software use is stated, and the final content receives substantive human review.",
      },
      {
        k: "What the brief contains",
        v: "The brief separates chart observations, real-world facts, key assumptions, and uncertainty. The decision remains yours.",
      },
      {
        k: "How the deposit works",
        v: "The US$49 case assessment deposit is credited in full. If we cannot proceed under the published acceptance rule, it is returned to the original payment method.",
      },
      {
        k: "What the fee includes",
        v: "The scope includes a written decision brief; one consolidated written follow-up about the original brief’s reasoning, assumptions, or wording within 14 days after delivery; and written reviews at 30 and 90 days—not unlimited chat.",
      },
    ],
  },
};

// 定金规则一句话 —— 出现在价格与取消页
export const RISK: Record<Lang, string> = {
  zh: "US$49 受理与校准定金：正式受理后全额计入 US$388 服务费；若按公布的受理规则无法继续，原路退还。",
  en: "US$49 case assessment deposit: credited in full toward the US$388 consultation; returned to the original payment method if we cannot proceed under the published acceptance criteria.",
};

// 八字命盘（hero 招牌结构件）—— 示意干支，日柱高亮为「日主 = 你」
export const CHART: Record<
  Lang,
  { caption: string; stem: string; branch: string; self: string; pillars: string[] }
> = {
  zh: {
    caption: "示意排盘 · 仅用于展示判读结构",
    stem: "天干",
    branch: "地支",
    self: "日主 = 日干「甲」 · 你",
    pillars: ["年", "月", "日", "时"],
  },
  en: {
    caption: "Illustrative chart · delivery structure only",
    stem: "HEAVENLY STEM",
    branch: "EARTHLY BRANCH",
    self: "Day Master · 甲 (day stem)",
    pillars: ["YEAR", "MONTH", "DAY", "HOUR"],
  },
};

// 说明页(方法/承诺/隐私/条款/定金)—— 集中管理,受 copy-integrity 测试覆盖。
// 隐私/条款/定金为「公布前草案」:法律条文需律师复核,页面明确标注草案状态。
export type DocSlug = "method" | "promise" | "privacy" | "terms" | "deposit";
export type DocSection = { h: string; body: string[] };
export type DocPage = {
  eyebrow: string;
  h1: string;
  lead: string;
  version: string;
  draft?: string; // 若为草案,横幅文案
  sections: DocSection[];
  footnote?: string;
};

export const DOC_NAV: Record<Lang, { slug: DocSlug; label: string }[]> = {
  zh: [
    { slug: "method", label: "方法与责任" },
    { slug: "promise", label: "承诺与边界" },
    { slug: "privacy", label: "隐私说明" },
    { slug: "terms", label: "服务条款" },
    { slug: "deposit", label: "定金规则" },
  ],
  en: [
    { slug: "method", label: "Method & accountability" },
    { slug: "promise", label: "Our promise" },
    { slug: "privacy", label: "Privacy" },
    { slug: "terms", label: "Terms" },
    { slug: "deposit", label: "Deposit policy" },
  ],
};

const DRAFT_ZH =
  "这是公布前的白话草案。具有约束力的正式版本会在付款开放前，经合格法律意见复核后发布。当前付款关闭，本页仅供说明。";
const DRAFT_EN =
  "This is a plain-language draft published before launch. The binding version will be released, reviewed by qualified counsel, before payments open. Payment is currently closed; this page is for explanation only.";

export const DOCS: Record<Lang, Record<DocSlug, DocPage>> = {
  zh: {
    method: {
      eyebrow: "方法与责任",
      h1: "怎么排盘，谁来负责",
      lead: "知几以八字为主，出生资料与问题适合时结合紫微斗数。排盘计算是确定、可复现的；解释由人负责。依据、假设与不确定之处都会写清楚。",
      version: "方法版本 · Method v1.0 · 2026-07-10",
      sections: [
        {
          h: "以八字为主，兼采中国命理的其他方法",
          body: [
            "知几做的是中国命理，不只是八字。八字是默认的结构框架，用来观察时间、重复模式与选择边界；当出生时间足够可靠、问题也适合时，会结合紫微斗数等其他中国命理方法作为补充视角。每份判读只会用到真正用上的方法，并写清楚用了哪些。",
            "这些都是传统解释框架，不是预测科学。它们帮助你多一个可参照的结构，而不是给出一个确定的未来。",
          ],
        },
        {
          h: "排盘计算是确定、可复现的",
          body: [
            "排盘本身（干支、大运、宫位）由确定的规则计算，不是由语言模型「猜」出来的。计算方法、时区与真太阳时处理、出生时间不确定时的处理方式，以及版本号，都会记录在案，可以复核。",
            "出生资料更正会作废依赖它的输出，并生成带日期与原因的新版本。",
          ],
        },
        {
          h: "历史校准是「合不合适」的门槛",
          body: [
            "正式判读之前，先用你过去真实发生的事校准这张盘。这是判断资料质量与是否适合受理的门槛，不是科学验证，也不是「算得准」的证明。",
            "校准会记录符合之处、偏差与模糊之处；对不上，就按公布的受理规则不继续，并退还定金。",
          ],
        },
        {
          h: "软件辅助，如实披露",
          body: [
            "软件可以协助确定性计算、整理、翻译、排版、一致性检查与流程安排。软件不会被描述成自主的「大师」，其草稿也不会不经人工审核直接交付。",
            "每份交付都会说明哪些环节由软件辅助。默认不用你的资料训练任何模型。",
          ],
        },
        {
          h: "人工审核与案例记录",
          body: [
            "盘面输入、解释、书面简报与关键修改都必须经过人工复核。每个案例带有案例编号、审核角色标识（如 ZJ-R01）、方法版本、审核日期与修订历史。",
            "知几不公开个人姓名或照片，也不虚构大师人设。公开责任归于知几这套可追溯的流程与记录。",
          ],
        },
      ],
      footnote: "方法的确切学派与计算细则仍在整理中，会随版本更新在此公布。",
    },
    promise: {
      eyebrow: "承诺与边界",
      h1: "我们不做什么",
      lead: "很多人对这个行业的不信任，来自被推销、被吓唬、被留住。知几把边界写在最前面。",
      version: "版本 · 2026-07-10",
      sections: [
        {
          h: "不卖任何东西来「改运」",
          body: [
            "不卖法器、饰品、摆件，不做任何「化解」「转运」类的产品或仪式，也没有任何联盟返佣。判读不会指向任何需要你再花钱购买的东西。",
            "收入只来自这一件事：围绕一个具体决定的书面判读与复盘。",
          ],
        },
        {
          h: "不制造恐惧，不承诺结果",
          body: [
            "不预测确定的未来，不承诺任何结果，也不用「命中注定」「必有大灾」之类的话推动你下单。",
            "如果一份判读换个人也照样成立，那就是失败的判读——我们会说错并重排。",
          ],
        },
        {
          h: "决定权始终在你",
          body: [
            "判读是一个可参照的视角，不是指令。它比较选项、指出取舍与风险窗口，但不替你做决定。",
          ],
        },
        {
          h: "有些问题不属于这里",
          body: [
            "医疗、心理治疗、法律、移民、投资、生育等专业问题不在服务范围内，请咨询相应的执业专业人士。",
            "如果你正处于急性危机中（如自伤念头、剧烈恐慌），需要的是即时的专业支持，而不是一次命理咨询。在美国或加拿大，可拨打或发送短信 988（Suicide & Crisis Lifeline）。",
          ],
        },
        {
          h: "私密、一次性、不做陪伴",
          body: [
            "这是一次围绕单个决定的私密服务，不是每日运势，不是情绪陪伴，也不是可以无限追问的聊天。它有明确的开始与结束。",
          ],
        },
      ],
    },
    privacy: {
      eyebrow: "隐私说明",
      h1: "你的信息，怎么被处理",
      lead: "这是白话说明。核心原则：只在需要时收集必要信息，用途分开，默认不用于训练模型。",
      version: "草案 · 2026-07-10",
      draft: DRAFT_ZH,
      sections: [
        {
          h: "分阶段收集，最小必要",
          body: [
            "申请阶段只收集：邮箱、所在地区、决定类型与时间、必要的确认项。此阶段不收集姓名、出生信息或具体困局。",
            "出生时间、地点与具体问题，只有在受理之后、在单独说明用途的前提下才收集。",
          ],
        },
        {
          h: "不收集的东西",
          body: [
            "不收集也不存储 IP 地址或设备指纹作为身份识别。不收集与本案无关的第三方或未成年人信息。",
          ],
        },
        {
          h: "用途分开",
          body: [
            "服务处理、软件处理、营销、以及（如有）研究，是分开的选择项。营销邮件需单独同意，且随时可退订。默认不用你的资料训练任何模型。",
          ],
        },
        {
          h: "你的权利",
          body: [
            "你可以要求查看、更正、导出与删除你的信息。未受理或被婉拒的申请默认在 90 天后删除。",
            "具体的申请与响应方式，会随正式版本一并公布。",
          ],
        },
      ],
      footnote: "供应商清单、保留期限与跨境处理的正式条款，需经法律复核后公布。",
    },
    terms: {
      eyebrow: "服务条款",
      h1: "这项服务是什么，不是什么",
      lead: "这是白话说明，帮助你在付款开放前了解服务的形态与边界。",
      version: "草案 · 2026-07-10",
      draft: DRAFT_ZH,
      sections: [
        {
          h: "全程书面、异步",
          body: [
            "服务不含面谈、通话或任何实时环节。你会收到一份经人工审核的书面决策判读；交付后 14 天内，可集中提交一轮关于原判读依据、假设或表述的书面问题；之后是 30/90 天的书面复盘。",
            "一个新的决定属于一个单独受理的案子，不在本次追问范围内。",
          ],
        },
        {
          h: "更正即版本",
          body: [
            "实质性的事实或解释更正，会作为判读的新版本发布，记录更正原因与日期。更正属于报告完整性的一部分，不构成一次新的咨询。",
          ],
        },
        {
          h: "不构成专业意见",
          body: [
            "八字与紫微斗数在这里是传统解释框架，不保证结果，也不代替医疗、心理健康、法律、移民、投资或生育方面的专业意见。决定权始终在你。",
          ],
        },
        {
          h: "费用与受理",
          body: [
            "受邀个案先支付 US$49 受理与校准定金；正式受理后全额计入 US$388 服务费。定金规则见「定金规则」页。",
            "付款目前保持关闭，直到方法说明、隐私条款、服务条款、受理与退款规则、以及运营与合规门槛完成。",
          ],
        },
      ],
      footnote: "经营主体、管辖与具有约束力的条款，需经法律复核后公布。",
    },
    deposit: {
      eyebrow: "定金规则",
      h1: "US$49 定金是怎么算的",
      lead: "定金是受理与校准的门槛，不是一份单独出售的解读。",
      version: "草案 · 2026-07-10",
      draft: DRAFT_ZH,
      sections: [
        {
          h: "它用来做什么",
          body: [
            "US$49 用于受理判断与历史校准：核对出生资料与排盘方法，并用你过去真实发生的事检验这张盘是否适合受理。",
          ],
        },
        {
          h: "受理后：全额计入",
          body: [
            "如果案子受理并进入正式服务，US$49 全额计入 US$388 服务费——你不会为定金额外付费。",
          ],
        },
        {
          h: "不受理：原路退还",
          body: [
            "如果按公布的受理规则无法继续（例如校准不匹配、超出服务范围、地区未开放），定金原路退还。",
            "退款按预定流程处理，不以「算得准不准」这种主观结果为条件。",
          ],
        },
      ],
      footnote: "退款时限与争议处理的正式条款，需经法律与支付方复核后公布。",
    },
  },
  en: {
    method: {
      eyebrow: "Method & accountability",
      h1: "How the chart is cast, and who is accountable",
      lead: "Zhiji is BaZi-led, with Zi Wei Dou Shu included when the birth data and question support it. The chart calculation is deterministic and reproducible; interpretation is done by a person. Reasoning, assumptions, and uncertainty are stated plainly.",
      version: "Method v1.0 · 2026-07-10",
      sections: [
        {
          h: "BaZi-led, drawing on the wider Chinese metaphysics tradition",
          body: [
            "Zhiji practices Chinese metaphysics, not BaZi alone. BaZi is the default structural framework for examining timing, recurring patterns, and decision boundaries. When the birth time is reliable enough and the question fits, Zi Wei Dou Shu and other Chinese methods are drawn in as complementary lenses. Each brief uses only the methods it actually applied, and names which ones.",
            "Both are traditional interpretive frameworks, not predictive science. They give you one more structure to reason with — not a fixed future.",
          ],
        },
        {
          h: "The chart calculation is deterministic",
          body: [
            "The chart itself (stems, branches, luck cycles, palaces) is computed by fixed rules — it is not guessed by a language model. The calculation method, time-zone and true-solar-time handling, treatment of an uncertain birth time, and the version are recorded and can be checked.",
            "Corrected birth data invalidates the outputs that depend on it and produces a new version with the date and reason.",
          ],
        },
        {
          h: "Historical calibration is a fit gate",
          body: [
            "Before a full reading, the chart is calibrated against things that actually happened to you. This is a test of data quality and case fit — not scientific validation, and not proof of accuracy.",
            "Calibration records matches, misses, and ambiguity. If it doesn't hold, the case does not proceed under the published acceptance rule, and the deposit is returned.",
          ],
        },
        {
          h: "Software assists, and it is disclosed",
          body: [
            "Software may assist with deterministic calculation, organization, translation, formatting, consistency checks, and scheduling. It is never described as an autonomous master, and its drafts are never delivered without human review.",
            "Every delivery states which tasks were software-assisted. Your data is not used to train any model by default.",
          ],
        },
        {
          h: "Human review and the case record",
          body: [
            "Chart inputs, interpretation, the written brief, and substantive revisions must be reviewed by a person. Each case carries a case number, reviewer-role ID (e.g. ZJ-R01), method version, review date, and revision history.",
            "Zhiji does not publish a personal name or photograph, and does not invent a master persona. Accountability belongs to this traceable process and record.",
          ],
        },
      ],
      footnote: "The exact schools and calculation rules are still being finalized and will be published here as the version updates.",
    },
    promise: {
      eyebrow: "Our promise",
      h1: "What we don't do",
      lead: "Much of the distrust in this category comes from being sold to, frightened, or kept hooked. Zhiji states the boundaries first.",
      version: "Version 2026-07-10",
      sections: [
        {
          h: "We sell nothing to “improve luck”",
          body: [
            "No objects, charms, or ornaments; no warding or luck-changing products or rituals; no affiliate commissions. A reading never points you toward something else you have to buy.",
            "Revenue comes from one thing only: a written analysis and review built around one concrete decision.",
          ],
        },
        {
          h: "No fear, no promised outcome",
          body: [
            "We do not predict a fixed future, promise any outcome, or use “it's destined” or “disaster is coming” language to push you to buy.",
            "A reading that would fit anyone else just as well is a failed reading — we say so and re-cast it.",
          ],
        },
        {
          h: "The decision stays yours",
          body: [
            "A reading is a reference perspective, not an instruction. It compares options and names trade-offs and risk windows, but it does not decide for you.",
          ],
        },
        {
          h: "Some questions don't belong here",
          body: [
            "Medical, mental-health, legal, immigration, investment, and fertility questions are outside the service — please consult the appropriate licensed professional.",
            "If you are in acute crisis (e.g. thoughts of self-harm, severe panic), what you need is immediate professional support, not a consultation. In the US or Canada, call or text 988 (Suicide & Crisis Lifeline).",
          ],
        },
        {
          h: "Private, one-off, not a companion",
          body: [
            "This is a private service around a single decision — not a daily horoscope, not emotional companionship, and not open-ended chat. It has a clear beginning and end.",
          ],
        },
      ],
    },
    privacy: {
      eyebrow: "Privacy",
      h1: "How your information is handled",
      lead: "A plain-language summary. The core principle: collect only what's needed, keep purposes separate, and don't train models on your data by default.",
      version: "Draft · 2026-07-10",
      draft: DRAFT_EN,
      sections: [
        {
          h: "Collected in stages, minimized",
          body: [
            "At application, only your email, region, decision type and timing, and the required acknowledgements are collected. No name, birth data, or personal narrative at this stage.",
            "Birth time, place, and your specific question are collected only after acceptance, under a separate statement of purpose.",
          ],
        },
        {
          h: "What we don't collect",
          body: [
            "We do not collect or store IP addresses or device fingerprints as identifiers. We do not collect third-party or minor data unrelated to your own case.",
          ],
        },
        {
          h: "Purposes kept separate",
          body: [
            "Service processing, software processing, marketing, and (if any) research are separate choices. Marketing email requires separate consent and is unsubscribable anytime. Your data is not used to train any model by default.",
          ],
        },
        {
          h: "Your rights",
          body: [
            "You can ask to access, correct, export, and delete your information. Unaccepted or declined applications are deleted after 90 days by default.",
            "The exact request and response process will be published with the binding version.",
          ],
        },
      ],
      footnote: "The vendor list, retention periods, and cross-border processing terms require legal review before publication.",
    },
    terms: {
      eyebrow: "Terms",
      h1: "What this service is, and isn't",
      lead: "A plain-language summary so you understand the shape and boundaries of the service before payments open.",
      version: "Draft · 2026-07-10",
      draft: DRAFT_EN,
      sections: [
        {
          h: "Written and asynchronous throughout",
          body: [
            "The service includes no meeting, call, or live component. You receive a human-reviewed written decision brief; within 14 days of delivery you may submit one consolidated written follow-up about the original brief's reasoning, assumptions, or wording; written 30/90-day reviews follow.",
            "A new decision is a separately scoped case, outside the follow-up.",
          ],
        },
        {
          h: "Corrections are versioned",
          body: [
            "Material factual or interpretive corrections are issued as a new version of the brief, recording the reason and date. Corrections are part of report integrity, not a new consultation.",
          ],
        },
        {
          h: "Not professional advice",
          body: [
            "BaZi and Zi Wei Dou Shu are traditional interpretive frameworks here. They guarantee no outcome and do not replace medical, mental-health, legal, immigration, investment, or fertility advice. The decision remains yours.",
          ],
        },
        {
          h: "Fees and acceptance",
          body: [
            "Invited cases begin with a US$49 case-assessment deposit, credited in full toward the US$388 consultation once accepted. See the deposit policy for details.",
            "Payment stays closed until the method disclosure, privacy notice, service terms, acceptance and refund policy, and operational and compliance checks are complete.",
          ],
        },
      ],
      footnote: "The operating entity, jurisdiction, and binding terms require legal review before publication.",
    },
    deposit: {
      eyebrow: "Deposit policy",
      h1: "How the US$49 deposit works",
      lead: "The deposit is a gate for acceptance and calibration — not a reading sold on its own.",
      version: "Draft · 2026-07-10",
      draft: DRAFT_EN,
      sections: [
        {
          h: "What it covers",
          body: [
            "The US$49 covers the acceptance assessment and historical calibration: verifying birth data and calculation method, and testing whether the chart fits the case against things that actually happened to you.",
          ],
        },
        {
          h: "If accepted: credited in full",
          body: [
            "If the case is accepted and proceeds, the US$49 is credited in full toward the US$388 consultation — you do not pay extra for the deposit.",
          ],
        },
        {
          h: "If not accepted: returned",
          body: [
            "If the case cannot proceed under the published acceptance rule (for example, calibration doesn't fit, the question is out of scope, or your area isn't enabled), the deposit is returned to the original payment method.",
            "Refunds follow a predefined process and are not conditioned on a subjective sense of “accuracy.”",
          ],
        },
      ],
      footnote: "Refund timing and dispute-handling terms require legal and payment-processor review before publication.",
    },
  },
};
