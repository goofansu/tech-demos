import { DEFAULT_CONFIDENCE_FLOOR } from "./floor";
import type { ChoiceJudgment, Judgment, NoulJudgment, ScoreJudgment } from "./types";

const PRIOR_SCHOOL: NoulJudgment = {
  id: "prior_school",
  label: "原就读学校的可辨识度",
  primitive: "noul",
  role: "field",
  reads: ["prior_school"],
  question:
    "这是否是一所知名国际学校、有历史的独立学校，或其他有明确办学声誉的学校？",
  criteria: {
    true: "有具体校名且声誉可查——国际学校、独立学校，或在当地办学多年、广为人知的学校",
    false: "无法辨识、名称笼统，或模糊到无法指向某一所具体学校",
  },
  never_not_met: false,
  thresholds: { met: 0.75, not_met: 0.25 },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const EXTRACURRICULAR: ScoreJudgment = {
  id: "extracurricular",
  label: "课外活动的投入深度",
  primitive: "score",
  role: "field",
  reads: ["extracurricular"],
  question:
    "这段课外活动描述体现了多少深度？要把「只罗列了几项活动」和「长期投入或担任负责人」区分开。篇幅相近不等于深度相近——「钢琴、游泳、象棋」和「某件具体乐器、练了多少年、进过乐团、考过级」不是一回事。",
  levels: [
    "没有任何描述",
    "只罗列活动，没有细节",
    "有长期投入",
    "担任负责人，或有持续取得的成绩",
  ],
  never_not_met: true,
  verdict_map: { "0": "needs_review", "1": "needs_review", "2": "met", "3": "met", default: "needs_review" },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const REASON_FOR_APPLYING: ScoreJudgment = {
  id: "reason_for_applying",
  label: "申请理由与本校的契合度",
  primitive: "score",
  role: "field",
  reads: ["reason_for_applying"],
  question:
    "这份申请理由与本校的契合有多具体？篇幅长但内容空、换成任何一所学校都成立的，就是套话。提到具体课程项目、IB 一贯制、某个具体校区，或搬迁安排与本校的供给直接相关的，才算具体。",
  levels: [
    "泛泛而谈，换任何学校都成立",
    "有一些具体的兴趣点",
    "明显研究过本校",
    "契合度高，理由具体扎实",
  ],
  never_not_met: true,
  verdict_map: { "0": "needs_review", "1": "needs_review", "2": "met", "3": "met", default: "needs_review" },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const SIBLING_CONNECTION: NoulJudgment = {
  id: "sibling_connection",
  label: "兄弟姐妹在校关系",
  primitive: "noul",
  role: "field",
  reads: ["siblings_information"],
  question: "这里描述的兄弟姐妹，是否正在本校就读或曾经在本校就读？",
  criteria: {
    true: "明确写出或描述了某位兄弟姐妹正在本校就读、或曾在本校就读，关系足以按家庭关联对待",
    false: "没有描述与本校的兄弟姐妹关系——只提到其他亲戚、朋友，或是一段与此无关的说明",
  },
  never_not_met: true,
  thresholds: { met: 0.7 },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const EAL_SUPPORT: ScoreJudgment = {
  id: "eal_support",
  label: "英语语言支持需求",
  primitive: "score",
  role: "field",
  reads: ["language", "second_language", "prior_school", "prior_school_country"],
  question:
    "这名申请人可能需要多少英语语言支持？要同时权衡第一语言、第二语言，以及原就读学校是否为英文授课——只看国家码决定不了这件事。一个来自北京英文授课国际学校的中文母语学生，和一个来自本地语言学校的中文母语学生，不是同一种情况。第一语言不是英语，只是资源配置上的信号，绝不构成拒绝理由。",
  levels: [
    "不需要支持",
    "轻度关注即可",
    "建议做语言测评",
    "很可能需要大量支持",
  ],
  never_not_met: true,
  verdict_map: { "0": "met", default: "needs_review" },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const ACADEMIC_FIT: ScoreJudgment = {
  id: "academic_fit",
  label: "学业匹配度",
  primitive: "score",
  role: "field",
  reads: ["grade", "age", "prior_school", "prior_school_country"],
  question:
    "这名申请人的年龄与原学制，和所申请的年级匹配得如何？请使用 state 中本校公布的年级年龄段。13 岁申请九年级很常见；同样 13 岁申请十一年级则不然，除非原学校的学制能解释这个安排。当原学制能解释时，不要把不寻常的年龄当作不匹配。",
  levels: ["与所申年级明显不匹配", "存在一些疑虑", "合适", "高度匹配"],
  never_not_met: false,
  verdict_map: { "0": "not_met", "1": "needs_review", "2": "met", "3": "met", default: "needs_review" },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const ATTENTION: ScoreJudgment = {
  id: "attention",
  label: "关注度",
  primitive: "score",
  role: "queue",
  reads: ["*"],
  question:
    "一位有经验的招生官，如果今天没有打开这份档案，会后悔吗？请在一条把紧迫性与价值合在一起的「时间压力」轴上作答。要整体权衡这份原始申请。不要去数缺失了几个字段、有几项空着，也不要数其他检查里有几项看起来偏弱——三个琐碎的空缺不会自动比一个严重的学业问题更糟，一份内容单薄但完整的档案，也可能比一处硬伤更值得先看。缺失项的数量已经单独展示了，在这里重新推导一遍不是你的工作。等级 0 是完整、平常、可以按队列顺序排队的档案。等级 1 是有些值得注意或略有不妥，但没有时间压力。等级 2 是不经人工判断就无法推进。等级 3 是拖延可能导致失去这名申请人，或做出错误判断。",
  levels: [
    "常规，按顺序处理即可",
    "值得看一眼",
    "需要人工做决定",
    "紧急，应优先处理",
  ],
  never_not_met: true,
  verdict_map: { default: "needs_review" },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

const ATTENTION_REASON: ChoiceJudgment = {
  id: "attention_reason",
  label: "关注原因",
  primitive: "choice",
  role: "queue",
  reads: ["*"],
  question:
    "招生官应该提前打开这份档案的主要原因是什么？只选一个最贴切的。如果列出的原因都不贴切，就选 other——不要硬套。如果这份档案只是完整、没有问题，那答案不是 exceptional。",
  options: {
    incomplete: {
      what: "必需信息缺失或无法使用",
      not_for: "档案完整但难以判断的情况——那是 ambiguous",
      examples: ["没有填写原就读学校", "申请理由留空"],
    },
    ambiguous: {
      what: "同一份档案，按不同的权衡方式会读出不同结论",
      not_for: "明显不利于录取的档案——那是 concerning",
      examples: ["申请人本身很强，但材料写得很弱", "兄弟姐妹关系说不清"],
    },
    time_critical: {
      what: "存在截止日期、竞争性 offer 或候补名单变动，拖延代价很大",
      not_for: "只是条件优秀的档案——那是 exceptional",
      examples: ["一周内需要给出答复", "已知手上另有一个 offer"],
    },
    exceptional: {
      what: "值得主动争取",
      not_for: "只是完整、没有问题的档案——那是常规档案",
      examples: ["现有在校家庭的兄弟姐妹", "特别突出的申请人", "奖学金个案"],
    },
    concerning: {
      what: "有信息不利于录取，需要认真看一看",
      not_for: "只是情况不清楚的档案——那是 ambiguous",
      examples: ["与所申年级明显不匹配"],
    },
    other: {
      what: "以上都不符合",
      examples: [],
    },
  },
  never_not_met: true,
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};

export const ADMISSIONS_PRESET_ZH: Judgment[] = [
  PRIOR_SCHOOL,
  EXTRACURRICULAR,
  REASON_FOR_APPLYING,
  SIBLING_CONNECTION,
  EAL_SUPPORT,
  ACADEMIC_FIT,
  ATTENTION,
  ATTENTION_REASON,
];
