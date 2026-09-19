export const LOCALES = ["en", "zh-CN"] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_KEY = "jev-student-profile.locale.v1";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

export const en = {
  meta: {
    title: "Student Profile Rubric Builder · TypeSafe Jev",
    description:
      "Build a student profile rubric from Choice, Score and Noul questions, then evaluate it with one TypeSafe Jev call.",
  },
  app: {
    title: "Student Profile Rubric Builder",
    subtitle: "{name} · {count} questions · TypeSafe Jev only",
    mode: "Mode",
    run: "Run",
    author: "Author",
    language: "Language",
    footer:
      "Jev is asked every question in one {systemone} request; thresholds and conditions are evaluated in code. The API key stays on the server behind {evaluate}.",
  },
  status: {
    noKey: "No API key",
  },
  author: {
    rubric: "Rubric",
    rubricHint: "Saved to this browser automatically. Reset restores the bundled sample.",
    reset: "Reset to sample",
    rubricName: "Rubric name",
    fixBefore: "Fix before running:",
    questionsTitle: "Questions ({count})",
    questionsHint:
      "Every question is sent in a single Jev {systemone} call. Jev answers; your thresholds decide.",
    addQuestion: "+ Question",
    noQuestions: "No questions yet.",
    payloadPreview: "Jev {questions} payload preview",
    defaultQuestion: "Question {n}",
  },
  inputs: {
    title: "Student inputs",
    hint: "Keys of the {state} object sent to Jev. Reference them in instructions with backticks, e.g. {example}.",
    add: "+ Input",
    empty: "No inputs yet. Add one to describe the student.",
    label: "Label",
    key: "Key",
    placeholder: "Placeholder",
    multiline: "Multi-line",
    remove: "Remove input",
    defaultLabel: "New input",
  },
  questions: {
    moveUp: "Move up",
    moveDown: "Move down",
    remove: "Remove",
    label: "Label",
    id: "Question id",
    idHint: "Used as the key in the Jev request.",
    type: "Type",
    typeNoul: "Noul (yes/no)",
    typeChoice: "Choice",
    typeScore: "Score",
    instructions: "Instructions",
    helpNoul: "Yes/no. Jev returns the probability the statement is true (0–1).",
    helpChoice:
      "Pick one of N unordered options. Returns the pick, a probability per option, and confidence.",
    helpScore:
      "Position on an ordered scale. Returns a fractional score, probability per level, and confidence. Say what to do if a cited input is empty.",
    defaultOther: "None of the above fit.",
    defaultLow: "Low",
    defaultMedium: "Medium",
    defaultHigh: "High",
  },
  noul: {
    criteriaTrue: "Criteria · true (optional)",
    criteriaFalse: "Criteria · false (optional)",
    yesAt: "Yes at ≥",
    probability: "Probability",
  },
  choice: {
    options: "Options ({count}) — key + what belongs to it",
    add: "+ Option",
    key: "Option key",
    description: "Option description",
    descriptionPlaceholder: "Describe what belongs to this option (and what does not).",
    remove: "Remove option",
    confidentWhen: "Confident when confidence ≥",
    confidentHint: "Below this the pick is flagged as uncertain.",
  },
  score: {
    levels: "Levels ({count}/10), low → high. Describe situations, not degrees.",
    add: "+ Level",
    level: "Level {n}",
    placeholder: "What does a student at this level look like?",
    remove: "Remove level",
    meetsWhen: "Meets level when score ≥",
    meetsHint: "Fractional score, 0–{max}.",
  },
  conditions: {
    title: "Profile conditions",
    hint: "Outcomes derived in code from Jev's answers. Every clause must hold (AND) for a condition to fire.",
    add: "+ Condition",
    empty: "No conditions yet. Add one to turn answers into profile outcomes.",
    outcomeLabel: "Outcome label",
    tone: "Tone",
    tonePositive: "Positive",
    toneNeutral: "Neutral",
    toneAttention: "Attention",
    remove: "Remove",
    andClause: "+ AND clause",
    firesAs: "Fires as",
    untitled: "(untitled)",
    defaultLabel: "New outcome",
    question: "Question",
    operator: "Operator",
    option: "Option",
    value: "Value",
    removeClause: "Remove clause",
    missing: "(missing: {id})",
    when: "WHEN",
    and: "AND",
    opIs: "is",
    opIsNot: "is not",
    fieldType: "{label} · {type}",
  },
  run: {
    student: "Student",
    studentHint:
      "This becomes the Jev {state}. Blank fields stay in the payload as empty strings so a cited key is not silently dropped.",
    sampleStudent: "Sample student",
    sample: "Sample · {name}",
    blank: "Blank",
    studentName: "Student name (not sent to Jev)",
    namePlaceholder: "Name",
    defaultStudent: "Student",
    noApiKey: "No API key",
    noApiKeyBody:
      "No API key is set, so we can't ask Jev yet. Add a TypeSafe API key on the server and reload this page.",
    rubricProblems: "The rubric has problems. ",
    fixInAuthor: "Fix them in Author mode",
    evaluating: "Evaluating…",
    evaluate: "Evaluate {count} questions",
    readyTitle: "Ready to evaluate",
    readyBody:
      "Jev returns a calibrated probability distribution per question. The cards on this side show every probability, the confidence, and how your thresholds interpret them.",
    asking: "Asking Jev…",
    failed: "Evaluation failed",
    requestSent: "Request sent to {path}",
    modelLabel: "model",
    tokens: "{in} in / {out} out tokens",
  },
  answers: {
    noAnswer: "No answer returned for this question.",
    pYes: "P(yes)",
    probabilityYes: "Probability of yes",
    threshold: "threshold {pct}",
    pick: "Pick",
    confidence: "confidence",
    probability: "{key} probability",
    scoreRange: "Score (0–{max})",
    fractionalScore: "Fractional score",
    meetsAt: "meets at {value}",
    levelProbability: "Level {n} probability",
  },
  profile: {
    title: "Profile · {name}",
    hint: "Outcomes computed in code from the thresholds and conditions you authored.",
    firedCount: "{fired} of {total} fired",
    noConditions: "No conditions defined. Add some in Author mode.",
    noneFired: "No conditions fired for this student.",
    unanswered: " (unanswered)",
  },
  problems: {
    needInput: "Add at least one input field.",
    inputKey: 'Input key "{key}" must be alphanumeric/underscore.',
    empty: "(empty)",
    needQuestion: "Add at least one question.",
    untitled: "(untitled)",
    badId: '"{name}": id must be alphanumeric/underscore.',
    duplicateId: 'Duplicate question id "{id}".',
    needInstructions: '"{name}": instructions are required.',
    choiceMin: '"{name}": choice needs at least 2 options.',
    choiceUnique: '"{name}": option keys must be unique.',
    scoreLevels: '"{name}": score needs 2–10 levels.',
    scoreText: '"{name}": every level needs text.',
    noulCriteria: '"{name}": give both true and false criteria, or neither.',
    missingQuestion: 'Condition "{label}" references a missing question.',
  },
  verdicts: {
    yes: "Yes",
    no: "No",
    noulDetail: "{actual} {op} {threshold} threshold",
    confident: "Confident pick",
    uncertain: "Uncertain",
    choiceDetail: "confidence {actual} {op} {threshold}",
    meets: "Meets level",
    below: "Below level",
    scoreDetail: "score {actual} {op} {threshold}",
  },
  errors: {
    malformed: "Malformed server response",
    requestFailed: "Request failed ({status})",
  },
} as const;

type DeepString<T> = T extends string ? string : { [K in keyof T]: DeepString<T[K]> };

export const zhCN: DeepString<typeof en> = {
  meta: {
    title: "学生画像量表构建器 · TypeSafe Jev",
    description: "用 Choice、Score 和 Noul 题目编写学生画像量表，并通过一次 TypeSafe Jev 调用完成评测。",
  },
  app: {
    title: "学生画像量表构建器",
    subtitle: "{name} · {count} 道题 · 仅使用 TypeSafe Jev",
    mode: "模式",
    run: "评测",
    author: "编写",
    language: "语言",
    footer:
      "Jev 在一次 {systemone} 请求中回答全部题目；阈值与条件在代码中判定。API 密钥仅留在服务器的 {evaluate} 接口之后。",
  },
  status: {
    noKey: "未配置 API 密钥",
  },
  author: {
    rubric: "量表",
    rubricHint: "会自动保存在本浏览器。重置将恢复内置示例。",
    reset: "重置为示例",
    rubricName: "量表名称",
    fixBefore: "运行前请先修复：",
    questionsTitle: "题目（{count}）",
    questionsHint: "所有题目会在一次 Jev {systemone} 调用中发送。Jev 作答；由你的阈值做判定。",
    addQuestion: "+ 题目",
    noQuestions: "还没有题目。",
    payloadPreview: "Jev {questions} 请求预览",
    defaultQuestion: "问题 {n}",
  },
  inputs: {
    title: "学生输入",
    hint: "发送给 Jev 的 {state} 对象的键。在说明中用反引号引用，例如 {example}。",
    add: "+ 输入项",
    empty: "还没有输入项。添加一项来描述学生。",
    label: "标签",
    key: "键名",
    placeholder: "占位提示",
    multiline: "多行",
    remove: "移除输入项",
    defaultLabel: "新输入",
  },
  questions: {
    moveUp: "上移",
    moveDown: "下移",
    remove: "移除",
    label: "标签",
    id: "题目 id",
    idHint: "作为 Jev 请求中的键使用。",
    type: "类型",
    typeNoul: "Noul（是/否）",
    typeChoice: "Choice（选择）",
    typeScore: "Score（评分）",
    instructions: "说明",
    helpNoul: "是/否判断。Jev 返回该陈述为真的概率（0–1）。",
    helpChoice: "从 N 个无序选项中选一。返回所选选项、各选项概率以及置信度。",
    helpScore:
      "在有序量表上定位。返回分数、各等级概率以及置信度。请说明引用的输入为空时该如何处理。",
    defaultOther: "以上都不符合。",
    defaultLow: "低",
    defaultMedium: "中",
    defaultHigh: "高",
  },
  noul: {
    criteriaTrue: "判定标准 · 真（可选）",
    criteriaFalse: "判定标准 · 假（可选）",
    yesAt: "判定为是 ≥",
    probability: "概率",
  },
  choice: {
    options: "选项（{count}）— 键名 + 所属含义",
    add: "+ 选项",
    key: "选项键",
    description: "选项描述",
    descriptionPlaceholder: "描述哪些情况属于该选项（以及哪些不属于）。",
    remove: "移除选项",
    confidentWhen: "当置信度 ≥ 时视为确定",
    confidentHint: "低于此值时，所选结果会标记为不确定。",
  },
  score: {
    levels: "等级（{count}/10），由低到高。请描述具体情境，而不是程度词。",
    add: "+ 等级",
    level: "等级 {n}",
    placeholder: "处于该等级的学生是什么样的？",
    remove: "移除等级",
    meetsWhen: "当分数 ≥ 时达到等级",
    meetsHint: "分数为小数，范围 0–{max}。",
  },
  conditions: {
    title: "画像条件",
    hint: "根据 Jev 的回答在代码中推导结果。一条条件的所有子句都必须成立（AND）才会触发。",
    add: "+ 条件",
    empty: "还没有条件。添加一条，把回答转成画像结果。",
    outcomeLabel: "结果标签",
    tone: "语气",
    tonePositive: "积极",
    toneNeutral: "中性",
    toneAttention: "关注",
    remove: "移除",
    andClause: "+ AND 子句",
    firesAs: "触发时显示为",
    untitled: "（未命名）",
    defaultLabel: "新结果",
    question: "题目",
    operator: "运算符",
    option: "选项",
    value: "值",
    removeClause: "移除子句",
    missing: "（缺失：{id}）",
    when: "当",
    and: "且",
    opIs: "是",
    opIsNot: "不是",
    fieldType: "{label} · {type}",
  },
  run: {
    student: "学生",
    studentHint:
      "这里会成为发给 Jev 的 {state}。空白字段仍以空字符串保留在请求中，避免被引用的键被悄悄丢掉。",
    sampleStudent: "示例学生",
    sample: "示例 · {name}",
    blank: "空白",
    studentName: "学生姓名（不会发给 Jev）",
    namePlaceholder: "姓名",
    defaultStudent: "学生",
    noApiKey: "未配置 API 密钥",
    noApiKeyBody: "尚未设置 API 密钥，暂时无法向 Jev 提问。请在服务器上配置 TypeSafe API 密钥后刷新本页。",
    rubricProblems: "当前量表存在问题。",
    fixInAuthor: "前往编写模式修复",
    evaluating: "正在评测…",
    evaluate: "评测 {count} 道题",
    readyTitle: "可以开始评测",
    readyBody:
      "Jev 会为每道题返回校准后的概率分布。右侧卡片展示全部概率、置信度，以及你的阈值如何解读它们。",
    asking: "正在询问 Jev…",
    failed: "评测失败",
    requestSent: "已发送到 {path} 的请求",
    modelLabel: "模型",
    tokens: "输入 {in} / 输出 {out} tokens",
  },
  answers: {
    noAnswer: "这道题没有返回答案。",
    pYes: "P(是)",
    probabilityYes: "为“是”的概率",
    threshold: "阈值 {pct}",
    pick: "所选",
    confidence: "置信度",
    probability: "{key} 的概率",
    scoreRange: "分数（0–{max}）",
    fractionalScore: "分数",
    meetsAt: "达标线 {value}",
    levelProbability: "等级 {n} 的概率",
  },
  profile: {
    title: "画像 · {name}",
    hint: "根据你编写的阈值与条件，在代码中计算得出的结果。",
    firedCount: "已触发 {fired} / {total}",
    noConditions: "尚未定义条件。请在编写模式中添加。",
    noneFired: "这名学生没有触发任何条件。",
    unanswered: "（未作答）",
  },
  problems: {
    needInput: "请至少添加一个输入字段。",
    inputKey: '输入键 "{key}" 必须由字母、数字或下划线组成。',
    empty: "（空）",
    needQuestion: "请至少添加一道题。",
    untitled: "（未命名）",
    badId: '“{name}”：id 必须由字母、数字或下划线组成。',
    duplicateId: '题目 id “{id}” 重复。',
    needInstructions: '“{name}”：必须填写说明。',
    choiceMin: '“{name}”：选择题至少需要 2 个选项。',
    choiceUnique: '“{name}”：选项键必须唯一。',
    scoreLevels: '“{name}”：评分题需要 2–10 个等级。',
    scoreText: '“{name}”：每个等级都需要文字。',
    noulCriteria: '“{name}”：真/假判定标准需同时填写，或都不填。',
    missingQuestion: '条件 “{label}” 引用了不存在的题目。',
  },
  verdicts: {
    yes: "是",
    no: "否",
    noulDetail: "{actual} {op} 阈值 {threshold}",
    confident: "确定选择",
    uncertain: "不确定",
    choiceDetail: "置信度 {actual} {op} {threshold}",
    meets: "达到等级",
    below: "未达等级",
    scoreDetail: "分数 {actual} {op} {threshold}",
  },
  errors: {
    malformed: "服务器响应格式错误",
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
