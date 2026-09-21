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
