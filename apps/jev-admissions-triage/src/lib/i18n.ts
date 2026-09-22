export const LOCALES = ["en", "zh-CN"] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_KEY = "jev-admissions-triage.locale.v1";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

export const en = {
  meta: {
    title: "Admissions Triage · Jev",
    description:
      "Triage 100 fabricated admissions files with TypeSafe Jev — calibrated attention, verdicts, and confidence.",
  },
  app: {
    title: "Admissions Triage · Jev",
    mode: "Mode",
    queue: "Queue",
    applicant: "Applicant",
    preset: "Preset",
    language: "Language",
    footer:
      "Fabricated applicants only. Each evaluate is one {systemone} call ({evaluate}) with Jev as the only model. The API key stays on the server.",
  },
  status: {
    noKey: "No API key",
  },
  keyWarning: {
    title: "No API key",
    body: "Add a TypeSafe API key on the server and reload. Evaluation stays disabled until the key is present. The key never reaches the browser.",
  },
  floor: {
    label: "Confidence floor",
  },
  attentionReason: {
    incomplete: "incomplete",
    ambiguous: "ambiguous",
    time_critical: "time critical",
    exceptional: "exceptional",
    concerning: "concerning",
    other: "other",
  },
  queue: {
    title: "Queue",
    description:
      "100 fabricated applicants. One Jev call per file, all applicable questions in that call. Sorted by attention once a row finishes.",
    evaluateAll: "Evaluate all",
    evaluating: "Evaluating…",
    stop: "Stop",
    reset: "Reset",
    presetName: "Admissions preset",
    judgmentCount: "{count} judgments",
    concurrency: "concurrency {n}",
    floorHint:
      "Changing the floor re-derives Needs Review from stored answers — it does not call Jev again. Low confidence means the distribution is spread, not that the model is probably wrong.",
    costHint:
      "Input tokens are $0.042 / MTok; output is free. Results stay in memory for this session and survive switching to Applicant. We do not promise a finish time.",
    elapsed: "{seconds}s elapsed",
    avgMs: "avg {ms} ms",
    estCost: "{cost} est.",
    meterLabel: "{done} of {total}",
    tableCaption: "Admissions queue sorted by attention",
    colId: "ID",
    colApplicant: "Applicant",
    colGrade: "Grade",
    colMiss: "Miss",
    colAttention: "Attention",
    colWhy: "Why",
    colConf: "Conf",
    colStatus: "Status",
    colMs: "ms",
    statusIdle: "idle",
    statusQueued: "queued",
    statusRunning: "running",
    statusDone: "done",
    statusError: "error",
  },
  applicant: {
    title: "Applicant",
    selectLabel: "Fabricated applicant",
    fixtureHint: "Fabricated record. Empty fields become Missing in code and never reach Jev.",
    evaluate: "Evaluate applicant",
    evaluating: "Evaluating…",
    restore: "Restore fixture",
    readyTitle: "Ready to evaluate this file",
    readyBody:
      "{count} field judgments get a four-state verdict. Attention and attention reason stay queue metadata — they are not rejection scores.",
    asking: "Asking Jev…",
    failed: "Evaluation failed",
    tokens: "{in} in / {out} out",
    queueMetaTitle: "Queue metadata",
    queueMetaHint: "Attention orders the batch. The reason says why — other is kept, not remapped.",
    requestSent: "Request sent to Jev",
    requestWouldBe: "Request that would be sent ({asked} of {total} questions)",
    fields: {
      name: "Name",
      grade: "Applied grade",
      age: "Age",
      language: "First language",
      second_language: "Second language",
      prior_school: "Prior school",
      prior_school_country: "Prior school country",
      extracurricular: "Extracurricular",
      reason_for_applying: "Reason for applying",
      siblings: "Siblings",
      deadline: "Deadline",
      competing_offer: "Competing offer",
      scholarship: "Scholarship",
      officer_notes: "Officer notes",
    },
  },
  judgment: {
    confidence: "Confidence {value}",
    escalatedField: " — below floor, routed to Needs Review",
    escalatedQueue: " — below floor; the distribution is spread, not that the answer is probably wrong",
    neverNotMetReplaced: "never_not_met replaced Not Met with Needs Review.",
    protected: "Protected judgment — cannot be Not Met.",
    pYes: "P(yes)",
    probabilityYes: "Probability yes",
    choiceSummary: "{choice} · confidence {value} · show distribution",
    probability: "Probability {key}",
    weightedScore: "Weighted score (not rounded)",
    confidenceLabel: "Confidence",
    fractionalScore: "Fractional score",
    perLevel: "Per-level probabilities",
    levelProbability: "Level {n} probability",
  },
  preset: {
    title: "Admissions preset",
    description:
      "Fixed questions for {school}. This is not a rubric authoring product — wording lives in one source file. {reads} documents intent and generation; every question still sees the whole state.",
    schoolLine: "{name} · {country} · {year}",
    grades: "Configured grades: {list}. An applied grade outside this list becomes Needs Review, never Not Met.",
    gradeItem: "{name} (ages {min}–{max})",
    floorHint:
      "Floor {value} applies to every judgment. Compare 0.5 / 0.6 / 0.7 on the Queue after a batch — verdicts recompute from stored distributions.",
    roleQueue: "queue",
    roleField: "field",
    reads: "Intends to read {keys} — documentation only, not model-level scoping.",
    criteriaTrue: "true: {text}",
    criteriaFalse: "false: {text}",
    metAtLeast: "Met ≥ {value}",
    notMetAtMost: " · Not Met ≤ {value}",
    otherwiseReview: " · otherwise Needs Review",
  },
  verdict: {
    met: "Met",
    not_met: "Not Met",
    needs_review: "Needs Review",
    missing: "Missing",
  },
  outcome: {
    noAnswer: "No model answer",
    unexpected: "Unexpected answer type",
    missingSemantic: "Field empty — decided in code, not sent to Jev",
    missingDetail: "Missing prerequisite. This question was omitted from the request.",
    unconfiguredSemantic: "School prerequisite is not configured",
    unconfiguredDetail:
      "This applied grade is not in the school's configured bands, so the verdict is Needs Review rather than Not Met.",
    waitingSemantic: "Waiting for a Jev answer",
    waitingDetail: "No answer yet.",
    escalatedDetail:
      "Routed to Needs Review because confidence {confidence} is below the floor {floor}. Low confidence means the distribution is spread — not that the model is probably wrong.",
    neverNotMetDetail: "never_not_met blocked a Not Met verdict.",
    pYes: "P(yes) {pct}",
    scoreSemantic: "{score} · {level}",
    noGrade: "No grade",
    age: "age {age}",
  },
  state: {
    notProvided: "(not provided)",
    gradeBand: "{name}: typical ages {min}–{max}",
  },
  errors: {
    malformed: "Jev returned a response we couldn't read.",
    requestFailed: "Request failed ({status})",
  },
} as const;

type DeepString<T> = T extends string ? string : { [K in keyof T]: DeepString<T[K]> };

export const zhCN: DeepString<typeof en> = {
  meta: {
    title: "招生初筛 · Jev",
    description: "用 TypeSafe Jev 初筛 100 份虚构申请档案——校准过的关注度、判定与置信度。",
  },
  app: {
    title: "招生初筛 · Jev",
    mode: "模式",
    queue: "队列",
    applicant: "申请人",
    preset: "题组",
    language: "语言",
    footer:
      "全部为虚构申请人。每次评估是一次 {systemone} 调用（{evaluate}），只用 Jev 一个模型。API 密钥仅留在服务器。",
  },
  status: {
    noKey: "未配置 API 密钥",
  },
  keyWarning: {
    title: "未配置 API 密钥",
    body: "请在服务器上配置 TypeSafe API 密钥后刷新。密钥就绪之前，评估功能保持禁用。密钥不会到达浏览器。",
  },
  floor: {
    label: "置信度下限",
  },
  attentionReason: {
    incomplete: "资料不全",
    ambiguous: "需要权衡",
    time_critical: "时间紧迫",
    exceptional: "值得争取",
    concerning: "存在疑虑",
    other: "其他",
  },
  queue: {
    title: "队列",
    description:
      "100 位虚构申请人。每份档案一次 Jev 调用，该次调用包含所有适用的题目。每完成一行就按关注度重新排序。",
    evaluateAll: "全部评估",
    evaluating: "评估中…",
    stop: "停止",
    reset: "重置",
    presetName: "招生预设题组",
    judgmentCount: "{count} 个判定项",
    concurrency: "并发 {n}",
    floorHint:
      "调整下限只会用已存的答案重新推导「待人工复核」——不会再次调用 Jev。置信度低表示概率分布比较分散，并不表示模型多半答错了。",
    costHint:
      "输入 tokens 为 $0.042 / MTok，输出免费。结果保留在本次会话的内存中，切到「申请人」也不会丢。我们不承诺完成时间。",
    elapsed: "已用时 {seconds} 秒",
    avgMs: "平均 {ms} ms",
    estCost: "预计 {cost}",
    meterLabel: "{total} 份中已完成 {done} 份",
    tableCaption: "按关注度排序的招生队列",
    colId: "ID",
    colApplicant: "申请人",
    colGrade: "年级",
    colMiss: "缺失",
    colAttention: "关注度",
    colWhy: "原因",
    colConf: "置信度",
    colStatus: "状态",
    colMs: "ms",
    statusIdle: "未开始",
    statusQueued: "排队中",
    statusRunning: "进行中",
    statusDone: "完成",
    statusError: "失败",
  },
  applicant: {
    title: "申请人",
    selectLabel: "虚构申请人",
    fixtureHint: "虚构档案。留空的字段会在代码中判为「缺失」，不会发给 Jev。",
    evaluate: "评估该申请人",
    evaluating: "评估中…",
    restore: "恢复原始样本",
    readyTitle: "可以开始评估这份档案",
    readyBody:
      "{count} 个字段判定项会给出四态判定。关注度与关注原因只是队列元数据——它们不是拒录分数。",
    asking: "正在询问 Jev…",
    failed: "评估失败",
    tokens: "输入 {in} / 输出 {out}",
    queueMetaTitle: "队列元数据",
    queueMetaHint: "关注度决定批次顺序，原因说明为什么——other 会原样保留，不会被重新映射。",
    requestSent: "已发送给 Jev 的请求",
    requestWouldBe: "将要发送的请求（{total} 道题中的 {asked} 道）",
    fields: {
      name: "姓名",
      grade: "所申年级",
      age: "年龄",
      language: "第一语言",
      second_language: "第二语言",
      prior_school: "原就读学校",
      prior_school_country: "原学校所在国家",
      extracurricular: "课外活动",
      reason_for_applying: "申请理由",
      siblings: "兄弟姐妹",
      deadline: "截止时间",
      competing_offer: "竞争性 offer",
      scholarship: "奖学金",
      officer_notes: "招生官备注",
    },
  },
  judgment: {
    confidence: "置信度 {value}",
    escalatedField: " —— 低于下限，已转为待人工复核",
    escalatedQueue: " —— 低于下限；这表示概率分布分散，不表示这个答案多半是错的",
    neverNotMetReplaced: "never_not_met 把「不符合」替换成了「待人工复核」。",
    protected: "受保护的判定项——不可能判为「不符合」。",
    pYes: "P(是)",
    probabilityYes: "为「是」的概率",
    choiceSummary: "{choice} · 置信度 {value} · 展开分布",
    probability: "{key} 的概率",
    weightedScore: "加权分数（未取整）",
    confidenceLabel: "置信度",
    fractionalScore: "小数分数",
    perLevel: "各等级概率",
    levelProbability: "等级 {n} 的概率",
  },
  preset: {
    title: "招生预设题组",
    description:
      "{school}的固定题目。这不是一个量表编写产品——所有措辞都写在同一个源文件里。{reads} 用于记录设计意图与生成依据；每道题实际上仍然能看到完整的 state。",
    schoolLine: "{name} · {country} · {year}",
    grades: "已配置年级：{list}。不在此列表内的所申年级会判为「待人工复核」，绝不会判为「不符合」。",
    gradeItem: "{name}（{min}–{max} 岁）",
    floorHint:
      "下限 {value} 对所有判定项生效。跑完一批后，可以在「队列」里比较 0.5 / 0.6 / 0.7——判定会用已存的概率分布重新计算。",
    roleQueue: "队列",
    roleField: "字段",
    reads: "设计上读取 {keys}——这只是文档说明，不是模型层面的范围限制。",
    criteriaTrue: "真：{text}",
    criteriaFalse: "假：{text}",
    metAtLeast: "符合 ≥ {value}",
    notMetAtMost: " · 不符合 ≤ {value}",
    otherwiseReview: " · 其余为待人工复核",
  },
  verdict: {
    met: "符合",
    not_met: "不符合",
    needs_review: "待人工复核",
    missing: "缺失",
  },
  outcome: {
    noAnswer: "模型没有返回答案",
    unexpected: "答案类型不符合预期",
    missingSemantic: "字段为空——在代码中判定，没有发给 Jev",
    missingDetail: "缺少必需信息。这道题已从请求中省略。",
    unconfiguredSemantic: "学校侧的前置条件未配置",
    unconfiguredDetail: "所申年级不在本校已配置的年龄段内，因此判定为待人工复核，而不是不符合。",
    waitingSemantic: "等待 Jev 的回答",
    waitingDetail: "还没有答案。",
    escalatedDetail:
      "因为置信度 {confidence} 低于下限 {floor}，已转为待人工复核。置信度低表示概率分布比较分散——并不表示模型多半答错了。",
    neverNotMetDetail: "never_not_met 阻止了一个「不符合」的判定。",
    pYes: "P(是) {pct}",
    scoreSemantic: "{score} · {level}",
    noGrade: "未填年级",
    age: "{age} 岁",
  },
  state: {
    notProvided: "（未提供）",
    gradeBand: "{name}：通常年龄 {min}–{max} 岁",
  },
  errors: {
    malformed: "Jev 返回了无法解析的响应。",
    requestFailed: "请求失败（{status}）",
  },
};

export const catalogs: Record<Locale, DeepString<typeof en>> = {
  en,
  "zh-CN": zhCN,
};

export type MessagePath = Paths<typeof en>;

type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type Vars = Record<string, string | number>;

export type Translate = (path: MessagePath, vars?: Vars) => string;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "zh-CN";
}

export function detectLocale(): Locale {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (isLocale(saved)) return saved;
  }
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }
  return "en";
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Quota or private mode: in-memory locale still works for this session.
  }
}

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    Object.hasOwn(vars, key) ? String(vars[key]) : `{${key}}`,
  );
}

export function lookup(locale: Locale, path: MessagePath): string {
  const value = path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, catalogs[locale]);
  if (typeof value === "string") return value;
  const fallback = path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, catalogs.en);
  return typeof fallback === "string" ? fallback : path;
}

export function translate(locale: Locale, path: MessagePath, vars?: Vars): string {
  return interpolate(lookup(locale, path), vars);
}

export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.title = translate(locale, "meta.title");
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", translate(locale, "meta.description"));
}
