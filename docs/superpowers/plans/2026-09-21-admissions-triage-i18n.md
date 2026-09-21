# jev-admissions-triage 中文版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 本仓库用户的全局约定：**一律 Inline Execution**，不要为实现 / review / 修复派 subagent。

**Goal:** 给 `apps/jev-admissions-triage` 加 English / 简体中文 双语，切到中文后界面文案、发给 Jev 的题目、100 份申请人样本、学校配置全部是中文。

**Architecture:** 照搬 `apps/jev-student-profile` 已有的 i18n 层——两份 catalog（`en` 为源，`zhCN` 受 `DeepString<typeof en>` 约束）+ `Paths<>` 推导出的 `MessagePath` + React context 分发 `t`。数据侧用"整份镜像"：preset、applicants、school 各存中英两份完整数据，靠 parity 测试卡住结构不漂移。产生展示文案的 lib 函数改为接收 `t`，依赖 preset 的函数改为显式接收 `preset`，不再 import 单例。

**Tech Stack:** Bun + Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui；测试用 `bun test`，lint 用 oxlint。

**Spec:** `docs/superpowers/specs/2026-09-21-admissions-triage-i18n-design.md`

## Global Constraints

- **工作目录**：所有命令在 `apps/jev-admissions-triage/` 下跑。三条验收命令：`bun run test`、`bun run lint`、`bun run build`。
- **英文界面零行为变化**。本次改动后英文界面必须与改动前逐字一致，唯一例外是 applicant-mode 那句 "Six field judgments get a four-state verdict" 改为由 `{count}` 生成。
- **判定逻辑一个字都不改**：`thresholds`、`verdict_map`、`never_not_met`、`confidence_floor`、排序规则、`scoreBand` 全部保持原样。
- **不翻的东西**：`judgment.id`、choice 的 option key（`incomplete` / `time_critical` …）、`APPLICANT_STATE_KEYS`、`applicant.id`、`applicant.tags`、`prior_school_country` 国家码。它们是发给 Jev 的 key 或代码标识符，翻了会破坏 `answers` 匹配。
- **localStorage key**：`jev-admissions-triage.locale.v1`（不要复用 student-profile 的 key）。
- **中文场景**：学校仍在英国。`Faria International School` → `法瑞亚国际学校`，`country` 保持 `"GB"`，`current_academic_year` 保持 `2026`。
- **术语表（全程统一，不要临场换词）**：

  | 英文 | 中文 |
  |---|---|
  | Met / Not Met / Needs Review / Missing | 符合 / 不符合 / 待人工复核 / 缺失 |
  | Attention / attention reason | 关注度 / 关注原因 |
  | Confidence / confidence floor | 置信度 / 置信度下限 |
  | Judgment / preset | 判定项 / 预设题组 |
  | Queue / Applicant / Preset（三个 mode） | 队列 / 申请人 / 题组 |
  | Evaluate | 评估 |
  | Fabricated | 虚构 |
  | Noul / Score / Choice（primitive 名） | 保持英文原词 |
  | Year 7 / Year 9 / Year 11 / Year 8 | 七年级 / 九年级 / 十一年级 / 八年级 |
  | EAL support | 英语语言支持 |

- **提交信息**：不要加 `Co-Authored-By: Claude` 或 "Generated with Claude Code" 署名行。

---

### Task 1: i18n 机制、Provider 与顶栏语言切换

**Files:**
- Create: `src/lib/i18n.ts`
- Create: `src/lib/i18n-context.tsx`
- Create: `src/lib/i18n.test.ts`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `index.html`

**Interfaces:**
- Consumes: 无（第一个任务）
- Produces:
  - `LOCALES: readonly ["en", "zh-CN"]`、`type Locale`、`LOCALE_KEY: string`、`LOCALE_LABELS: Record<Locale, string>`
  - `en`（源 catalog）、`zhCN: DeepString<typeof en>`、`catalogs: Record<Locale, DeepString<typeof en>>`
  - `type MessagePath = Paths<typeof en>`、`type Vars = Record<string, string | number>`、`type Translate = (path: MessagePath, vars?: Vars) => string`
  - `isLocale(v: string | null | undefined): v is Locale`、`detectLocale(): Locale`、`persistLocale(locale: Locale): void`
  - `interpolate(template: string, vars?: Vars): string`、`lookup(locale: Locale, path: MessagePath): string`、`translate(locale: Locale, path: MessagePath, vars?: Vars): string`、`applyDocumentLocale(locale: Locale): void`
  - `I18nProvider`、`useI18n(): { locale, setLocale, t }`、`RichText({ path, vars, tokens })`

参考实现直接读 `apps/jev-student-profile/src/lib/i18n.ts` 与 `i18n-context.tsx`，机制部分**原样照抄**（`Paths`、`DeepString`、`interpolate`、`lookup` 的英文回落、`persistLocale` 的 try/catch、`applyDocumentLocale`），只换 `LOCALE_KEY` 和 catalog 内容。

- [ ] **Step 1: 写 catalog parity 测试（会失败，因为 i18n.ts 还不存在）**

创建 `src/lib/i18n.test.ts`：

```ts
import { describe, expect, test } from "bun:test";
import { catalogs, interpolate, translate } from "./i18n";

function paths(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  if (!node || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([key, value]) =>
    paths(value, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).toSorted();
}

describe("i18n catalogs", () => {
  test("English and Simplified Chinese share the same message keys", () => {
    expect(paths(catalogs["zh-CN"])).toEqual(paths(catalogs.en));
  });

  test("each locale keeps the same interpolation placeholders", () => {
    for (const path of paths(catalogs.en)) {
      const enVars = placeholders(translate("en", path as never));
      const zhVars = placeholders(translate("zh-CN", path as never));
      expect(zhVars, path).toEqual(enVars);
    }
  });

  test("interpolate leaves unknown tokens in place", () => {
    expect(interpolate("Hello {name}", { other: "x" })).toBe("Hello {name}");
  });

  test("mode names use the agreed glossary", () => {
    expect(translate("en", "app.queue")).toBe("Queue");
    expect(translate("zh-CN", "app.queue")).toBe("队列");
    expect(translate("zh-CN", "app.applicant")).toBe("申请人");
    expect(translate("zh-CN", "app.preset")).toBe("题组");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/lib/i18n.test.ts`
Expected: FAIL — `Cannot find module './i18n'`

- [ ] **Step 3: 写 `src/lib/i18n.ts`**

机制部分照抄 student-profile。catalog 这一轮只放三个 namespace：

```ts
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
} as const;
```

中文对应：

```ts
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
};
```

注意 footer 原文里的两个 `<code>` 片段（`systemone`、`POST /api/evaluate`）改成 `{systemone}` / `{evaluate}` token，由 `RichText` 还原成 `<code>`。

- [ ] **Step 4: 写 `src/lib/i18n-context.tsx`**

从 `apps/jev-student-profile/src/lib/i18n-context.tsx` 原样复制，不改一行（它不含任何 app 专有内容）。

- [ ] **Step 5: 跑测试确认通过**

Run: `bun test src/lib/i18n.test.ts`
Expected: PASS（4 个 test）

- [ ] **Step 6: `main.tsx` 包 Provider**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./lib/i18n-context";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
```

- [ ] **Step 7: `index.html` 补中文字体**

在 `<link rel="icon" …>` 之后插入（`--font-sans` 已经声明了 `"Noto Sans SC"`，缺的只是 webfont 本身）：

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
```

`lang="en"`、`<title>`、meta description 保持不动，由 `applyDocumentLocale` 运行时改写。

- [ ] **Step 8: `App.tsx` 顶栏加语言切换**

- `MODES` 常量从 `{ id, label }` 改成 `{ id: Mode; path: MessagePath }`，三项分别指向 `app.queue` / `app.applicant` / `app.preset`。
- 组件顶部 `const { locale, setLocale, t } = useI18n();`
- `<h1>` 用 `t("app.title")`，`aria-label="Mode"` 用 `t("app.mode")`。
- 在 Mode nav 之后、`<StatusBadge>` 之前插入语言 nav，**结构照抄 student-profile 的 App.tsx**（`aria-label={t("app.language")}`，`LOCALES.map`，`aria-pressed={locale === id}`，按钮文字 `id === "en" ? "EN" : LOCALE_LABELS[id]`，同一套 `cn()` class）。
- footer 改用 `<RichText path="app.footer" tokens={{ systemone: <code className="font-mono">systemone</code>, evaluate: <code className="font-mono">POST /api/evaluate</code> }} />`。
- `StatusBadge` 内部用 `t("status.noKey")`。

这一轮 `applicants` / `SCHOOL` / preset 仍用英文单例，不要动——数据分语种是 Task 2–4 的事。

- [ ] **Step 9: 验证**

Run: `bun run test && bun run lint && bun run build`
Expected: 全绿。

手动确认：`bun run dev` 打开页面，顶栏出现 `EN / 简体中文`；点中文后标题、模式名、footer、`<title>` 变中文，其余内容仍是英文（预期中的半成品状态）；刷新后语言保持。

- [ ] **Step 10: Commit**

```bash
git add src/lib/i18n.ts src/lib/i18n-context.tsx src/lib/i18n.test.ts src/main.tsx src/App.tsx index.html
git commit -m "feat(admissions-triage): add the i18n layer and header language toggle"
```

---

### Task 2: 中文 preset 数据

**Files:**
- Create: `src/lib/admissions-preset.zh-CN.ts`
- Modify: `src/lib/admissions-preset.ts`
- Modify: `src/lib/i18n.test.ts`

**Interfaces:**
- Consumes: `Locale`（Task 1）
- Produces:
  - `ADMISSIONS_PRESET_ZH: Judgment[]`（`admissions-preset.zh-CN.ts`）
  - `PRESETS: Record<Locale, Judgment[]>`、`presetFor(locale: Locale): Judgment[]`、`fieldJudgments(locale: Locale): Judgment[]`、`queueJudgments(locale: Locale): Judgment[]`、`judgmentById(locale: Locale, id: string): Judgment | undefined`
  - 保留 `ADMISSIONS_PRESET`（= 英文，`PRESETS.en`）、`FIELD_JUDGMENTS`、`QUEUE_JUDGMENTS`、`DEFAULT_CONFIDENCE_FLOOR`、`CONFIDENCE_FLOOR_PRESETS`、`ATTENTION_ID`、`ATTENTION_REASON_ID`、`APPLICANT_STATE_KEYS` 原样导出，本任务不动任何调用方

- [ ] **Step 1: 写 preset parity 测试（会失败）**

追加到 `src/lib/i18n.test.ts`：

```ts
import { PRESETS } from "./admissions-preset";
import type { Locale } from "./i18n";

describe("preset parity across locales", () => {
  const en = PRESETS.en;
  const zh = PRESETS["zh-CN"];

  test("same judgment ids in the same order", () => {
    expect(zh.map((j) => j.id)).toEqual(en.map((j) => j.id));
  });

  test("structure and calibration are identical", () => {
    for (const [i, source] of en.entries()) {
      const target = zh[i];
      expect(target.primitive, source.id).toBe(source.primitive);
      expect(target.role, source.id).toBe(source.role);
      expect(target.reads, source.id).toEqual(source.reads);
      expect(target.never_not_met, source.id).toBe(source.never_not_met);
      expect(target.confidence_floor, source.id).toBe(source.confidence_floor);
    }
  });

  test("noul thresholds, score maps and choice keys match", () => {
    for (const [i, source] of en.entries()) {
      const target = zh[i];
      if (source.primitive === "noul" && target.primitive === "noul") {
        expect(target.thresholds, source.id).toEqual(source.thresholds);
        expect(Object.keys(target.criteria).toSorted()).toEqual(["false", "true"]);
      }
      if (source.primitive === "score" && target.primitive === "score") {
        expect(target.verdict_map, source.id).toEqual(source.verdict_map);
        expect(target.levels.length, source.id).toBe(source.levels.length);
      }
      if (source.primitive === "choice" && target.primitive === "choice") {
        expect(Object.keys(target.options), source.id).toEqual(Object.keys(source.options));
      }
    }
  });

  test("every Chinese judgment has translated prose", () => {
    const cjk = /[一-鿿]/;
    for (const judgment of zh) {
      expect(cjk.test(judgment.label), `${judgment.id} label`).toBe(true);
      expect(cjk.test(judgment.question), `${judgment.id} question`).toBe(true);
    }
  });

  test("presetFor returns the locale's preset", () => {
    const locales: Locale[] = ["en", "zh-CN"];
    for (const locale of locales) {
      expect(presetFor(locale)).toBe(PRESETS[locale]);
    }
  });
});
```

顶部 import 补上 `presetFor`。

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/lib/i18n.test.ts`
Expected: FAIL — `PRESETS` / `presetFor` 未导出。

- [ ] **Step 3: 写 `src/lib/admissions-preset.zh-CN.ts`**

结构与 `admissions-preset.ts` 一一对应：同样 8 个 `const`，同样的 `id` / `primitive` / `role` / `reads` / `never_not_met`，`thresholds` 与 `verdict_map` 逐字照抄，`confidence_floor` 从 `./admissions-preset` import `DEFAULT_CONFIDENCE_FLOOR` 复用。只翻 `label`、`question`、`criteria.true/false`、`levels[]`、`options[key].what/not_for/examples[]`。

翻译时要保住的语义（这些句子是在教模型怎么判，翻丢了 demo 就不成立）：

- `extracurricular` 的 "Similar length is not similar depth" —— 必须保留"篇幅相近 ≠ 深度相近"这层对比，以及"钢琴、游泳、象棋"对"具名乐器 + 年数 + 乐团 + 考级"的例子。
- `reason_for_applying` 的 "Long but empty prose that could name any school is generic" —— 保留"换个校名也成立就是套话"。
- `eal_support` 的北京例子 —— 保留"英文授课国际校的中文母语学生"与"本地语言学校的中文母语学生"是两回事，以及"非英语母语是资源信号，绝不是拒录理由"。
- `academic_fit` 的 "A 13-year-old applying to Year 9 is ordinary; the same age applying to Year 11 is not, unless the prior school's system explains the placement" —— 年级名按术语表译。
- `attention` 的整段最长 —— 必须保留"单一时间压力轴"、"不要去数缺失字段"、"三个琐碎空缺不自动比一个严重学术问题更糟"、"薄但完整的档案可能比单点硬伤更重要"，以及 level 0–3 的四段界定。
- `attention_reason` 六个选项的 `not_for` 互斥说明（`incomplete` vs `ambiguous`、`time_critical` vs `exceptional`、`concerning` vs `ambiguous`、`exceptional` vs routine）—— 这些是防止模型硬套的护栏，逐条翻。

一个已翻好的样例，照这个粒度做其余 7 个：

```ts
const PRIOR_SCHOOL: NoulJudgment = {
  id: "prior_school",
  label: "原就读学校的可辨识度",
  primitive: "noul",
  role: "field",
  reads: ["prior_school"],
  question:
    "这是否是一所知名国际学校、有历史的独立学校，或其他有明确办学声誉的学校？",
  criteria: {
    true: "有具体校名且声誉可查——国际学校、独立学校，或在当地办学多年且广为人知",
    false: "无法辨识、名称笼统，或模糊到无法指向某一所具体学校",
  },
  never_not_met: false,
  thresholds: { met: 0.75, not_met: 0.25 },
  confidence_floor: DEFAULT_CONFIDENCE_FLOOR,
};
```

文件末尾导出：

```ts
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
```

- [ ] **Step 4: `admissions-preset.ts` 加 locale 映射**

在文件末尾追加（已有导出全部保留不动）：

```ts
import type { Locale } from "./i18n";
import { ADMISSIONS_PRESET_ZH } from "./admissions-preset.zh-CN";

export const PRESETS: Record<Locale, Judgment[]> = {
  en: ADMISSIONS_PRESET,
  "zh-CN": ADMISSIONS_PRESET_ZH,
};

export function presetFor(locale: Locale): Judgment[] {
  return PRESETS[locale];
}

export function fieldJudgments(locale: Locale): Judgment[] {
  return presetFor(locale).filter((j) => j.role === "field");
}

export function queueJudgments(locale: Locale): Judgment[] {
  return presetFor(locale).filter((j) => j.role === "queue");
}
```

`judgmentById` 改签名为 `(locale: Locale, id: string)`，内部 `presetFor(locale).find(...)`。全仓库搜一遍 `judgmentById(` 确认没有遗漏调用方（预期为 0 处，它目前未被使用）。

⚠️ `admissions-preset.zh-CN.ts` 要 import `DEFAULT_CONFIDENCE_FLOOR`，而 `admissions-preset.ts` 要 import `ADMISSIONS_PRESET_ZH`——这是循环 import。TypeScript + Vite 能处理（`DEFAULT_CONFIDENCE_FLOOR` 是 const 且先于数组求值），但为了干净，把 `DEFAULT_CONFIDENCE_FLOOR` 与 `CONFIDENCE_FLOOR_PRESETS` 提到新文件 `src/lib/floor.ts`，两侧都从那里 import，`admissions-preset.ts` 再 re-export 以免改动现有调用方：

```ts
// src/lib/floor.ts
export const DEFAULT_CONFIDENCE_FLOOR = 0.6;
export const CONFIDENCE_FLOOR_PRESETS = [0.5, 0.6, 0.7] as const;
```

```ts
// admissions-preset.ts 顶部
import { CONFIDENCE_FLOOR_PRESETS, DEFAULT_CONFIDENCE_FLOOR } from "./floor";
export { CONFIDENCE_FLOOR_PRESETS, DEFAULT_CONFIDENCE_FLOOR };
```

- [ ] **Step 5: 跑测试确认通过**

Run: `bun test`
Expected: PASS，`i18n.test.ts` 新增 5 个 test 全过，其余测试不受影响。

- [ ] **Step 6: Commit**

```bash
git add src/lib/admissions-preset.zh-CN.ts src/lib/admissions-preset.ts src/lib/floor.ts src/lib/i18n.test.ts
git commit -m "feat(admissions-triage): add the Simplified Chinese admissions preset"
```

---

### Task 3: 中文 school 与 100 份中文 applicant

**Files:**
- Create: `src/lib/applicants.zh-CN.ts`
- Modify: `src/lib/school.ts`
- Modify: `src/lib/applicants.ts`
- Modify: `src/lib/i18n.test.ts`

**Interfaces:**
- Consumes: `Locale`（Task 1）
- Produces:
  - `SCHOOLS: Record<Locale, SchoolConfig>`、`schoolFor(locale: Locale): SchoolConfig`，保留 `SCHOOL`（= 英文）与 `gradeBand(school, grade)` 不变
  - `APPLICANTS_ZH: Applicant[]`（100 份）
  - `APPLICANTS_BY_LOCALE: Record<Locale, Applicant[]>`、`applicantsFor(locale: Locale): Applicant[]`，保留 `APPLICANTS`（= 英文）、`APPLICANT_COUNT`、`REQUIRED_TAGS`
  - `applicantsWithTag(tag: string, locale?: Locale): Applicant[]`（`locale` 默认 `"en"`，现有调用方无需改）

- [ ] **Step 1: 写 school + applicants parity 测试（会失败）**

追加到 `src/lib/i18n.test.ts`：

```ts
import { APPLICANTS_BY_LOCALE, REQUIRED_TAGS, applicantsFor, applicantsWithTag } from "./applicants";
import { SCHOOLS, gradeBand, schoolFor } from "./school";

describe("school parity across locales", () => {
  test("same number of grade bands with the same ages", () => {
    const en = SCHOOLS.en;
    const zh = SCHOOLS["zh-CN"];
    expect(zh.country).toBe(en.country);
    expect(zh.current_academic_year).toBe(en.current_academic_year);
    expect(zh.grades.map((g) => [g.min_age, g.max_age])).toEqual(
      en.grades.map((g) => [g.min_age, g.max_age]),
    );
    expect(zh.grades.map((g) => g.name)).not.toEqual(en.grades.map((g) => g.name));
  });
});

describe("applicant parity across locales", () => {
  const en = APPLICANTS_BY_LOCALE.en;
  const zh = APPLICANTS_BY_LOCALE["zh-CN"];

  test("both locales ship the same 100 ids in the same order", () => {
    expect(zh).toHaveLength(100);
    expect(zh.map((a) => a.id)).toEqual(en.map((a) => a.id));
  });

  test("language-independent fields are identical", () => {
    for (const [i, source] of en.entries()) {
      const target = zh[i];
      expect(target.age, source.id).toBe(source.age);
      expect(target.tags, source.id).toEqual(source.tags);
      expect(target.prior_school_country, source.id).toBe(source.prior_school_country);
      expect(target.application_status, source.id).toBe(source.application_status);
    }
  });

  test("each Chinese grade resolves to the same configured band index", () => {
    const enSchool = schoolFor("en");
    const zhSchool = schoolFor("zh-CN");
    for (const [i, source] of en.entries()) {
      const target = zh[i];
      const enIndex = enSchool.grades.indexOf(gradeBand(enSchool, source.grade)!);
      const zhIndex = zhSchool.grades.indexOf(gradeBand(zhSchool, target.grade)!);
      expect(zhIndex, `${source.id} ${source.grade} → ${target.grade}`).toBe(enIndex);
    }
  });

  test("the unconfigured-grade fixture is unconfigured in both locales", () => {
    const enGhost = applicantsWithTag("unconfigured_grade", "en")[0];
    const zhGhost = applicantsWithTag("unconfigured_grade", "zh-CN")[0];
    expect(enGhost.id).toBe(zhGhost.id);
    expect(gradeBand(schoolFor("en"), enGhost.grade)).toBeUndefined();
    expect(gradeBand(schoolFor("zh-CN"), zhGhost.grade)).toBeUndefined();
  });

  test("every required planted tag is covered in Chinese too", () => {
    for (const tag of REQUIRED_TAGS) {
      expect(applicantsWithTag(tag, "zh-CN").length, tag).toBeGreaterThan(0);
    }
  });

  test("prose fields are actually translated", () => {
    const cjk = /[一-鿿]/;
    for (const applicant of zh) {
      for (const key of ["reason_for_applying", "extracurricular", "officer_notes"] as const) {
        const value = applicant[key];
        if (value === null || value.trim() === "") continue;
        expect(cjk.test(value), `${applicant.id}.${key}`).toBe(true);
      }
    }
  });

  test("applicantsFor returns the locale's fixtures", () => {
    expect(applicantsFor("en")).toBe(APPLICANTS_BY_LOCALE.en);
    expect(applicantsFor("zh-CN")).toBe(APPLICANTS_BY_LOCALE["zh-CN"]);
  });
});
```

注意第三个 test 里 `gradeBand(...)!` 在 grade 为 `null` 或未配置时会是 `undefined`，`indexOf(undefined!)` 返回 `-1`，两边同为 `-1` 即视为一致——这正是想要的行为。

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/lib/i18n.test.ts`
Expected: FAIL — `SCHOOLS` / `APPLICANTS_BY_LOCALE` 未导出。

- [ ] **Step 3: `school.ts` 加中文学校**

```ts
import type { Locale } from "./i18n";

export const SCHOOL_ZH: SchoolConfig = {
  name: "法瑞亚国际学校",
  country: "GB",
  current_academic_year: 2026,
  grades: [
    { name: "七年级", min_age: 11, max_age: 12 },
    { name: "九年级", min_age: 13, max_age: 14 },
    { name: "十一年级", min_age: 15, max_age: 16 },
  ],
};

export const SCHOOLS: Record<Locale, SchoolConfig> = {
  en: SCHOOL,
  "zh-CN": SCHOOL_ZH,
};

export function schoolFor(locale: Locale): SchoolConfig {
  return SCHOOLS[locale];
}
```

`formatGradeBands` 这一轮先不动（Task 5 再改成接收 `t`）。

- [ ] **Step 4: 写 `src/lib/applicants.zh-CN.ts`**

结构照抄 `applicants.ts`：同样的 `idOf`、`base`、`PLANTED`（36 份）、五个池（`FIRST`/`LAST`/`ROUTINE_SCHOOLS`/`ROUTINE_REASONS`/`ROUTINE_ACTIVITIES`）、`GRADES`、`routineApplicant`、`buildApplicants`。**下标算术逐字照抄**（`index % GRADES.length`、`(index * 3) % LAST.length`、`index % 7`、`index % 5`、`index % 11`），池的长度必须与英文一致（`FIRST` 20、`LAST` 20、`ROUTINE_SCHOOLS` 10、`ROUTINE_REASONS` 4、`ROUTINE_ACTIVITIES` 4、`GRADES` 6），否则第 37–100 份的 `age` / `tags` 会对不上，parity 测试会红。

`GRADES` 中文版（年龄与顺序不变）：

```ts
const GRADES: { name: string; age: number }[] = [
  { name: "七年级", age: 11 },
  { name: "七年级", age: 12 },
  { name: "九年级", age: 13 },
  { name: "九年级", age: 14 },
  { name: "十一年级", age: 15 },
  { name: "十一年级", age: 16 },
];
```

`ROUTINE_SCHOOLS` 的校名是真实国际学校专有名词，**保留英文原名不译**，`country` 不变——这样 `prior_school_country` parity 自动成立，中文界面里出现英文校名也符合真实招生场景。`FIRST`/`LAST` 换成 20 个中文名 + 20 个中文姓（保持各 20 项）。

36 份 planted 逐条直译，几条必须保住判别意图的：

| id / tag | 英文 | 中文要保住的东西 |
|---|---|---|
| A-0003 `school_misspelled` | `Dulwitch College`（Dulwich 错拼） | 给一个**同性质的错拼**：`德威公学北亰校区`（"京"错成"亰"）。不要换成一个陌生校名——测的是"看着像真校名但拼错了" |
| A-0005 `school_local_language` | `北京市第四中学` | 原样保留，它本来就是中文校名 |
| A-0004 `school_vague` | `a school in Beijing` | `北京的一所学校`，模糊程度等价 |
| `unconfigured_grade` | `Year 8` | `八年级`，且**不得**出现在 `SCHOOL_ZH.grades` 里 |
| `age_two_years_off` / `age_system_explained` | `age` 数字 | 数字一个不改，只翻 `officer_notes` |
| `eal_english_medium_beijing` | `language: "Mandarin"`, `second_language: "English"` | 译为 `中文` / `英语`，`prior_school` 保留 `Dulwich College Beijing`——英文授课国际校这层信息不能丢 |
| `english_in_non_english_country` | 英语母语 + 非英语国家码 | 语言名译中文，国家码不变 |
| `attention_time_critical` | `deadline` / `competing_offer` 文案 | 时间压力的具体天数照搬（"5 days"→"5 天"、"10-day offer"→"10 天有效期的 offer"） |

姓名列（`Blank Prior`、`Deadline Dani`、`Year Eleven at Thirteen` 这类说明性假名）译成同样自解释的中文名，例如 `原校空白`、`截止丹妮`、`十三岁报十一年级`。

- [ ] **Step 5: `applicants.ts` 加 locale 映射**

文件末尾追加（已有导出保留）：

```ts
import type { Locale } from "./i18n";
import { APPLICANTS_ZH } from "./applicants.zh-CN";

export const APPLICANTS_BY_LOCALE: Record<Locale, Applicant[]> = {
  en: APPLICANTS,
  "zh-CN": APPLICANTS_ZH,
};

export function applicantsFor(locale: Locale): Applicant[] {
  return APPLICANTS_BY_LOCALE[locale];
}
```

`applicantsWithTag` 改为：

```ts
export function applicantsWithTag(tag: string, locale: Locale = "en"): Applicant[] {
  return applicantsFor(locale).filter((row) => row.tags.includes(tag));
}
```

`applicantById` 同样加 `locale: Locale = "en"` 第二参。

- [ ] **Step 6: 跑测试确认通过**

Run: `bun test`
Expected: PASS。若 "each Chinese grade resolves to the same configured band index" 红了，先查中文 `GRADES` 顺序和 planted 的 `grade` 字面量是否与 `SCHOOL_ZH.grades[].name` 完全一致（全角/半角、"十一年级" vs "11年级"）。

- [ ] **Step 7: Commit**

```bash
git add src/lib/applicants.zh-CN.ts src/lib/applicants.ts src/lib/school.ts src/lib/i18n.test.ts
git commit -m "feat(admissions-triage): add the Simplified Chinese school config and 100 applicants"
```

---

### Task 4: App 按语言取数据，切语言清空 results

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `applicantsFor`（Task 3）、`schoolFor`（Task 3）、`useI18n`（Task 1）
- Produces: `App` 内部状态按 locale 切换，`QueueMode` / `ApplicantMode` / `PresetMode` 收到的 `school`、`applicants` 是当前语言的

- [ ] **Step 1: 改 `App.tsx`**

- `applicants` 初值改为 `() => applicantsFor(locale).map(cloneApplicant)`。
- `selectedId` 初值改为 `applicantsFor(locale)[0]?.id ?? "A-0001"`。
- `SCHOOL` 直接引用改为 `const school = schoolFor(locale);`，传给三个 mode。
- `PresetMode` 增加 `school` 与 `preset` 两个 prop（Task 8 会用到；这一轮先把 `school` 传进去，`preset` 等 Task 5 统一）。
- 新增 `changeLocale`：

```tsx
const changeLocale = (next: Locale) => {
  if (next === locale) return;
  setApplicants(applicantsFor(next).map(cloneApplicant));
  setResults({});
  setLocale(next);
};
```

语言按钮的 `onClick` 从 `setLocale(id)` 改为 `changeLocale(id)`。`selectedId` 不重置——两个语种 id 一致。`confidenceFloor` 不重置。

- [ ] **Step 2: 验证**

Run: `bun run test && bun run lint && bun run build`
Expected: 全绿。

手动确认：`bun run dev`，Queue 里跑几行 Evaluate → 切到中文 → 申请人姓名/年级变中文、结果被清空、进度归零；Preset mode 里学校名显示 `法瑞亚国际学校`、年级段显示中文；切回 EN 恢复英文样本。

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(admissions-triage): swap fixtures with the locale and drop stale results"
```

---

### Task 5: lib 层文案本地化

**Files:**
- Modify: `src/lib/i18n.ts`（加 `verdict` / `outcome` / `state` / `errors` 四个 namespace）
- Modify: `src/lib/verdicts.ts`、`src/lib/format.ts`、`src/lib/fields.ts`、`src/lib/request.ts`、`src/lib/school.ts`、`src/lib/jev.ts`、`src/lib/types.ts`
- Modify: `src/lib/verdicts.test.ts`、`src/lib/request.test.ts`、`src/lib/applicants.test.ts`
- Modify: 调用方 `src/components/queue/queue-mode.tsx`、`src/components/applicant/applicant-mode.tsx`、`src/components/shared/judgment-card.tsx`（只补参数，文案留到 Task 6–8）

**Interfaces:**
- Consumes: `Translate`、`translate`、`detectLocale`（Task 1）；`presetFor`（Task 2）
- Produces:
  - `verdictLabel(verdict: VerdictState, t: Translate): string`（`format.ts`，取代 `VERDICT_LABEL` 常量；`VERDICT_TONE` 保持常量不动）
  - `applicantContext(applicant: Applicant, t: Translate): string`
  - `missingFieldCount(applicant: Applicant, preset: Judgment[]): number`
  - `formatGradeBands(school: SchoolConfig, t: Translate): string`
  - `applicantState(applicant: Applicant, school: SchoolConfig, t: Translate): JevState`
  - `applicableJudgments(applicant: Applicant, school: SchoolConfig, preset: Judgment[]): Judgment[]`
  - `buildRequest(applicant: Applicant, school: SchoolConfig, preset: Judgment[], t: Translate): EvaluateRequest`
  - `deriveJudgment(judgment: Judgment, applicant: Applicant, school: SchoolConfig, answer: JevAnswer | undefined, confidenceFloor: number, t: Translate): JudgmentOutcome`
  - `deriveOutcomes(applicant: Applicant, school: SchoolConfig, answers: Record<string, JevAnswer> | undefined, confidenceFloor: number, preset: Judgment[], t: Translate): JudgmentOutcome[]`
  - `types.ts` 删除 `MISSING_STATE_LABEL` 与 `NO_API_KEY_MESSAGE` 两个常量

- [ ] **Step 1: 先加 catalog 的四个 namespace**

`en` 侧（中文按术语表对译，`{token}` 名与数量必须一致）：

```ts
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
```

中文 `state.notProvided` 用 `"（未提供）"`，`state.gradeBand` 用 `"{name}：通常年龄 {min}–{max} 岁"`。

- [ ] **Step 2: 写 lib 本地化测试（会失败）**

追加到 `src/lib/i18n.test.ts`：

```ts
import { deriveJudgment } from "./verdicts";
import { buildRequest } from "./request";
import { verdictLabel } from "./format";
import type { MessagePath, Vars } from "./i18n";

const tEn = (path: MessagePath, vars?: Vars) => translate("en", path, vars);
const tZh = (path: MessagePath, vars?: Vars) => translate("zh-CN", path, vars);

describe("localized lib output", () => {
  test("verdict labels follow the glossary", () => {
    expect(verdictLabel("needs_review", tEn)).toBe("Needs Review");
    expect(verdictLabel("needs_review", tZh)).toBe("待人工复核");
    expect(verdictLabel("not_met", tZh)).toBe("不符合");
  });

  test("a missing field explains itself in the active locale", () => {
    const zhApplicants = applicantsFor("zh-CN");
    const blank = zhApplicants.find((a) => a.prior_school === null);
    if (!blank) throw new Error("fixture");
    const judgment = presetFor("zh-CN").find((j) => j.id === "prior_school")!;
    const outcome = deriveJudgment(judgment, blank, schoolFor("zh-CN"), undefined, 0.6, tZh);
    expect(outcome.verdict).toBe("missing");
    expect(outcome.semantic).toContain("Jev");
    expect(/[一-鿿]/.test(outcome.detail)).toBe(true);
  });

  test("the Chinese request carries Chinese questions and a Chinese missing label", () => {
    const zhApplicants = applicantsFor("zh-CN");
    const blank = zhApplicants.find((a) => a.prior_school === null)!;
    const request = buildRequest(blank, schoolFor("zh-CN"), presetFor("zh-CN"), tZh);
    expect(request.state.prior_school).toBe("（未提供）");
    expect(request.questions.prior_school).toBeUndefined();
    expect(request.questions.attention).toBeDefined();
    expect(/[一-鿿]/.test(request.state.school_grade_bands)).toBe(true);
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `bun test src/lib/i18n.test.ts`
Expected: FAIL — `verdictLabel` 未导出、`deriveJudgment` / `buildRequest` 参数个数不符。

- [ ] **Step 4: 改 lib**

`format.ts`：

```ts
export function verdictLabel(verdict: VerdictState, t: Translate): string {
  return t(`verdict.${verdict}` as MessagePath);
}

export function applicantContext(applicant: Applicant, t: Translate): string {
  const bits = [
    applicant.grade ?? t("outcome.noGrade"),
    applicant.age !== null ? t("outcome.age", { age: applicant.age }) : null,
    applicant.prior_school,
  ].filter(Boolean);
  return bits.join(" · ");
}
```

`VERDICT_LABEL` 常量删除，`VERDICT_TONE` 原样保留。

`school.ts`：`formatGradeBands(school, t)` 内部改为 `school.grades.map((g) => t("state.gradeBand", { name: g.name, min: g.min_age, max: g.max_age })).join("; ")`。

`fields.ts`：`missingFieldCount(applicant, preset)`，内部 `preset.filter(...)` 取代 `ADMISSIONS_PRESET.filter(...)`。`omitReason` / `isMissingInput` / `isUnconfiguredPrerequisite` 不变。

`request.ts`：`applicantState` / `applicableJudgments` / `buildRequest` 按上面的 Produces 加参；`fieldText` 的 `MISSING_STATE_LABEL` 改为传入的 `t("state.notProvided")`（`fieldText(value, missing: string)`）。

`verdicts.ts`：`deriveJudgment` 末尾加 `t`，把六处硬编码串换成 `t("outcome.…")`；`semanticFor(judgment, answer, t)`；escalated 那段用 `t("outcome.escalatedDetail", { confidence: confidence?.toFixed(2) ?? "", floor: floor.toFixed(2) })`。`deriveOutcomes` 加 `preset` 与 `t`，内部遍历 `preset` 而非 `ADMISSIONS_PRESET`。

`jev.ts`：照抄 student-profile 的做法，函数内 `const locale = detectLocale();`，两处错误串换成 `translate(locale, "errors.malformed")` / `translate(locale, "errors.requestFailed", { status: res.status })`。`evaluate` 签名不变。

`types.ts`：删 `MISSING_STATE_LABEL` 与 `NO_API_KEY_MESSAGE`。

- [ ] **Step 5: 调用方补参（文案暂不翻）**

三个组件里加 `const { locale, t } = useI18n();` 与 `const preset = presetFor(locale);`，把新参数传进 `deriveOutcomes` / `buildRequest` / `missingFieldCount` / `applicantContext`，`VERDICT_LABEL[x]` 改 `verdictLabel(x, t)`。组件自身的英文文案这一轮**不动**。

- [ ] **Step 6: 更新既有测试**

三个测试文件顶部加：

```ts
import { translate, type MessagePath, type Vars } from "./i18n";
const tEn = (path: MessagePath, vars?: Vars) => translate("en", path, vars);
```

- `verdicts.test.ts`：每个 `deriveJudgment(...)` 调用末尾补 `tEn`。断言内容一字不改。
- `request.test.ts`：`buildRequest(x, SCHOOL)` → `buildRequest(x, SCHOOL, ADMISSIONS_PRESET, tEn)`；`applicableJudgments(x, SCHOOL)` → 补 `ADMISSIONS_PRESET`；`import { MISSING_STATE_LABEL } from "./types"` 删掉，改用 `translate("en", "state.notProvided")`。
- `applicants.test.ts`：现有断言改为跑 `applicantsFor("en")`，然后**整组复制一份**跑 `applicantsFor("zh-CN")`（id、tag 覆盖、每个 attention reason 至少两例这三组断言对中文同样成立）。

- [ ] **Step 7: 跑全量测试**

Run: `bun run test && bun run lint && bun run build`
Expected: 全绿。英文断言一条都不该改内容——如果改了，说明本地化动了英文措辞，回去修。

- [ ] **Step 8: Commit**

```bash
git add src/lib src/components
git commit -m "feat(admissions-triage): route lib-produced copy through the locale catalog"
```

---

### Task 6: Queue mode 本地化

**Files:**
- Modify: `src/lib/i18n.ts`（加 `queue` / `floor` / `keyWarning` / `attentionReason` namespace）
- Modify: `src/components/queue/queue-mode.tsx`、`src/components/shared/floor-control.tsx`、`src/components/shared/key-warning.tsx`
- Modify: `src/lib/i18n.test.ts`

**Interfaces:**
- Consumes: `useI18n`（Task 1）、`verdictLabel` / `applicantContext` / `missingFieldCount`（Task 5）
- Produces: catalog 新增 `queue.*`、`floor.label`、`keyWarning.title/body`、`attentionReason.{incomplete,ambiguous,time_critical,exceptional,concerning,other}`

要翻的英文串（逐条从文件里核，别漏 `aria-label`、`title=`、`<caption>`）：

- `floor-control.tsx`：`"Confidence floor"`（同时是可见文字与 `aria-label`）
- `key-warning.tsx`：`"No API key"` + 那段 `"Add a TypeSafe API key on the server and reload. …"`
- `queue-mode.tsx`：卡片标题 `"Queue"`、说明 `"100 fabricated applicants. …"`、按钮 `"Evaluating…"` / `"Evaluate all"` / `"Stop"` / `"Reset"`、`"Admissions preset"`、`"{count} judgments"`、`"concurrency {n}"`、floor 说明段、成本说明段、`"{seconds}s elapsed"`、`"avg {ms} ms"`、`"{cost} est."`、Meter 的 `"{done} of {total}"`、`<caption>"Admissions queue sorted by attention"`、九个列头（`ID` / `Applicant` / `Grade` / `Miss` / `Attention` / `Why` / `Conf` / `Status` / `ms`）、行内 `"idle"` / `"error"` / `"done"` / `STATUS_TONE` 对应的状态词、`title={`${reviewCount} ${VERDICT_LABEL.needs_review}`}`、空值 `"—"`（`"—"` 是符号，不入 catalog）

列头 `ID` / `ms` 保持英文（它们是单位/标识符）；`Miss` / `Conf` 这类缩写译成 `缺失` / `置信度`。

- [ ] **Step 1: 写 attentionReason 测试（会失败）**

追加到 `src/lib/i18n.test.ts`：

```ts
describe("attention reason labels", () => {
  const keys = ["incomplete", "ambiguous", "time_critical", "exceptional", "concerning", "other"] as const;

  test("every choice option key has a display label in both locales", () => {
    const optionKeys = Object.keys(
      (presetFor("en").find((j) => j.id === "attention_reason") as { options: Record<string, unknown> }).options,
    );
    expect(optionKeys).toEqual([...keys]);
    for (const key of keys) {
      expect(translate("en", `attentionReason.${key}` as MessagePath)).not.toBe(`attentionReason.${key}`);
      expect(/[一-鿿]/.test(translate("zh-CN", `attentionReason.${key}` as MessagePath))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/lib/i18n.test.ts`
Expected: FAIL — `attentionReason.*` 回落成 path 字符串。

- [ ] **Step 3: 加 catalog 并改三个组件**

`attentionReason` 中文：`incomplete` 资料不全 / `ambiguous` 需要权衡 / `time_critical` 时间紧迫 / `exceptional` 值得争取 / `concerning` 存在疑虑 / `other` 其他。

Queue 的 Why 列把 `{reason}` 改成 `t(\`attentionReason.${reason}\` as MessagePath)`，badge 的 tone 判断（`reason === "other" ? "outline" : "choice"`）保持按 key 判断，不要改成按译文判断。

- [ ] **Step 4: 跑测试确认通过**

Run: `bun run test && bun run lint && bun run build`
Expected: 全绿。

手动确认：中文下 Queue 表头、按钮、说明、Why 列徽章全中文；英文下与改动前逐字一致。

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/lib/i18n.test.ts src/components/queue src/components/shared
git commit -m "feat(admissions-triage): localize Queue mode, the floor control and the key warning"
```

---

### Task 7: Applicant mode 与 JudgmentCard 本地化

**Files:**
- Create: `src/lib/grades.ts`
- Modify: `src/lib/i18n.ts`（加 `applicant` / `judgment` namespace）
- Modify: `src/components/applicant/applicant-mode.tsx`、`src/components/shared/judgment-card.tsx`
- Modify: `src/lib/i18n.test.ts`

**Interfaces:**
- Consumes: `useI18n`、`verdictLabel`、`applicantContext`、`fieldJudgments`（Task 2）
- Produces: catalog 新增 `applicant.*`（14 个字段标签收在 `applicant.fields.*`）与 `judgment.*`；`gradeOptions(locale: Locale): string[]`（`src/lib/grades.ts`）

⚠️ `gradeOptions` 放在 `src/lib/grades.ts`，**不要**从 `applicant-mode.tsx` 导出。两个原因：现有测试全部用相对路径 import，`@/` 别名在 `bun test` 下未验证过；且把 `.tsx` 组件拖进测试会连带加载整棵 React 组件树。

要翻的串：

- `applicant-mode.tsx`：`"Applicant"`、`aria-label="Fabricated applicant"`、`"Fabricated record. Empty fields become Missing in code and never reach Jev."`、14 个 `Field label`（Name / Applied grade / Age / First language / Second language / Prior school / Prior school country / Extracurricular / Reason for applying / Siblings / Deadline / Competing offer / Scholarship / Officer notes）、年级下拉的空选项 `"(not provided)"`（复用 `state.notProvided`）、`"Evaluating…"` / `"Evaluate applicant"`、`"Restore fixture"`、`"Ready to evaluate this file"`、`"Asking Jev…"`、`"Evaluation failed"`、`"{in} in / {out} out"`、`"Queue metadata"`、`"Attention orders the batch. The reason says why — other is kept, not remapped."`、`"Request sent to Jev"`、`"Request that would be sent ({asked} of {total} questions)"`
- **顺带修掉的硬编码**：`"Six field judgments get a four-state verdict. Attention and attention reason stay queue metadata — they are not rejection scores."` 改成 `t("applicant.readyBody", { count: fieldJudgments(locale).length })`，英文文案变成 `"{count} field judgments get a four-state verdict. …"`。
- 年级下拉 `GRADES = ["Year 7", "Year 8", "Year 9", "Year 11", ""]` 移到 `src/lib/grades.ts` 的 `gradeOptions(locale)`，中文为 `["七年级", "八年级", "九年级", "十一年级", ""]`。第二项故意不在 `SCHOOL_ZH.grades` 里。
- `judgment-card.tsx`：`"Confidence {value}"`、`" — below floor, routed to Needs Review"`、`" — below floor; the distribution is spread, not that the answer is probably wrong"`、`"never_not_met replaced Not Met with Needs Review."`、`"Protected judgment — cannot be Not Met."`、`"P(yes)"`、`"Probability yes"`、`"{choice} · confidence {value} · show distribution"`、`"Probability {key}"`、`"Weighted score (not rounded)"`、`"Confidence"`、`"Fractional score"`、`"Per-level probabilities"`、`"Level {n} probability"`

- [ ] **Step 1: 写年级下拉测试（会失败）**

追加到 `src/lib/i18n.test.ts`：

```ts
import { gradeOptions } from "./grades";

describe("applicant grade options", () => {
  test("each locale offers one deliberately unconfigured grade", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const school = schoolFor(locale);
      const options = gradeOptions(locale).filter((g) => g !== "");
      const unconfigured = options.filter((g) => gradeBand(school, g) === undefined);
      expect(unconfigured, locale).toHaveLength(1);
    }
  });

  test("every configured band is offered", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const offered = gradeOptions(locale);
      for (const band of schoolFor(locale).grades) {
        expect(offered, `${locale} ${band.name}`).toContain(band.name);
      }
    }
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/lib/i18n.test.ts`
Expected: FAIL — `Cannot find module './grades'`

- [ ] **Step 3: 写 `src/lib/grades.ts`，加 catalog，翻两个组件**

```ts
import type { Locale } from "./i18n";

const GRADE_OPTIONS: Record<Locale, string[]> = {
  en: ["Year 7", "Year 8", "Year 9", "Year 11", ""],
  "zh-CN": ["七年级", "八年级", "九年级", "十一年级", ""],
};

/** The second entry is deliberately outside the school's configured bands. */
export function gradeOptions(locale: Locale): string[] {
  return GRADE_OPTIONS[locale];
}
```

`applicant-mode.tsx` 删掉本地的 `GRADES` 常量，改用 `gradeOptions(locale)`。

- [ ] **Step 4: 跑测试确认通过**

Run: `bun run test && bun run lint && bun run build`
Expected: 全绿。

手动确认：中文下 Applicant 表单 14 个标签、两个按钮、右侧空态/加载/错误三态、Queue metadata 卡片、JudgmentCard 里的置信度行与分布展开区全中文；`Request that would be sent` 展开后 `questions` 的 `instructions` 是中文，而 key 仍是 `prior_school` / `attention_reason` 这些英文标识符。

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts src/lib/i18n.test.ts src/lib/grades.ts src/components/applicant src/components/shared/judgment-card.tsx
git commit -m "feat(admissions-triage): localize Applicant mode and the judgment cards"
```

---

### Task 8: Preset mode 本地化

**Files:**
- Modify: `src/lib/i18n.ts`（加 `preset` namespace）
- Modify: `src/components/preset/preset-mode.tsx`
- Modify: `src/App.tsx`（给 `PresetMode` 补 `school` / `preset` prop）

**Interfaces:**
- Consumes: `useI18n`、`presetFor`（Task 2）、`schoolFor`（Task 3）、`serializeChoiceOption`（未改动）
- Produces: catalog 新增 `preset.*`

要翻的串：

- 卡片标题 `"Admissions preset"`、说明 `"Fixed questions for Faria International School. This is not a rubric authoring product — wording lives in one source file. {reads} documents intent and generation; every question still sees the whole state."`（`<code>reads</code>` 用 `RichText` 的 token）
- 学校名那行 `"{name} · {country} · {year}"` 直接用数据，无需 catalog
- `"Configured grades: {list}. An applied grade outside this list becomes Needs Review, never Not Met."`，其中 `{list}` 的每项是 `"{name} (ages {min}–{max})"` → 中文 `"{name}（{min}–{max} 岁）"`
- `"Floor {value} applies to every judgment. Compare 0.5 / 0.6 / 0.7 on the Queue after a batch — verdicts recompute from stored distributions."`
- 徽章 `"queue"` / `"field"` → `队列` / `字段`；`"never_not_met"` 保持英文（它是代码里的字段名）
- `"Intends to read {keys} — documentation only, not model-level scoping."`
- noul 三行：`"true: {text}"` / `"false: {text}"` / `"Met ≥ {value}"` + `" · Not Met ≤ {value}"` / `" · otherwise Needs Review"`

`PresetMode` 当前直接 import `ADMISSIONS_PRESET` 和 `SCHOOL`，改为从 props 收 `preset` 与 `school`，`App.tsx` 传 `presetFor(locale)` / `schoolFor(locale)`。

- [ ] **Step 1: 加 catalog 并改组件**

- [ ] **Step 2: 验证**

Run: `bun run test && bun run lint && bun run build`
Expected: 全绿。

手动确认：中文下 Preset mode 的 8 张卡片标题与题干是中文；score 的等级列表、choice 的六个选项描述是中文；`verdict_map` 映射出的 `met` / `needs_review` / `not_met` 仍显示为代码值（它们是 `VerdictState` 字面量，不翻）。

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n.ts src/components/preset src/App.tsx
git commit -m "feat(admissions-triage): localize Preset mode"
```

---

### Task 9: 文档与全量验收

**Files:**
- Modify: `apps/jev-admissions-triage/README.md`
- Modify: `README.md`（仓库根）

- [ ] **Step 1: app README 加 Language 一节**

放在 `## Run` 的脚本说明之后、`## Modes` 之前，口径对齐 `apps/jev-student-profile/README.md` 第 24–26 行：

```markdown
## Language

**English** and **Simplified Chinese**. Use the header language toggle. The
preset questions, the 100 fabricated applicants, and the school config all
swap with the locale, so the state and questions sent to Jev are in the
selected language. Switching clears any batch results — stored answers came
from the other locale's questions. The choice is remembered in
`localStorage`.
```

`## Rules the UI must keep` 末尾追加一条：

```markdown
- Both locales ship the same judgment ids, thresholds, verdict maps, and
  applicant ids/tags. `src/lib/i18n.test.ts` is what holds the two mirrors
  together — if you add a judgment or a fixture, add it on both sides.
```

- [ ] **Step 2: 根 README 更新 bullet**

```markdown
- [Admissions Triage](apps/jev-admissions-triage/) — Sort 100 fabricated applications by Jev attention, then inspect calibrated field verdicts (English and Simplified Chinese).
```

- [ ] **Step 3: 全量验收**

Run（在 `apps/jev-admissions-triage/`）：`bun run test && bun run lint && bun run build`

手动过一遍 spec 第 7 节的验收标准：

- 顶栏可切换，刷新后语言保持
- 中文下界面无残留英文散文（`systemone`、`POST /api/evaluate`、`never_not_met`、ROUTINE_SCHOOLS 的校名、tag 这些是有意保留的英文）
- `Request that would be sent` 展开后 `state` 与 `questions` 内容是中文，key 仍是英文标识符
- 切语言后 results 清空，重新 Evaluate 正常返回并渲染
- 用 `git diff` 抽查英文界面是否逐字未变（唯一例外：`applicant.readyBody` 的 `{count}`）

- [ ] **Step 4: Commit**

```bash
git add README.md apps/jev-admissions-triage/README.md
git commit -m "docs: note the Simplified Chinese build of the admissions triage demo"
```

---

## 自审记录

**Spec 覆盖**：spec 第 4.1 节 → Task 1；4.2 catalog 分 namespace → Task 1/5/6/7/8 分别落地；4.3 分语种数据 → Task 2（preset）、Task 3（school + applicants）；4.4 接口变更表 8 行 → Task 5 全部覆盖；4.5 切换语言清空 results → Task 4；第 5 节文件清单 18 改 5 新 → 各任务的 Files 合起来与之一致，额外多出两个文件：`src/lib/floor.ts`（Task 2 为打断 `admissions-preset.ts` ↔ `admissions-preset.zh-CN.ts` 的循环 import 新增）与 `src/lib/grades.ts`（Task 7 把年级下拉从组件里抽出来，好让测试不必 import `.tsx`）。两个都是 spec 未预见的实施细节；第 6 节测试策略 → Task 1/2/3/5/6/7 的测试步骤覆盖 catalog/preset/applicants 三组 parity + 防漏翻；第 7 节验收标准 → Task 9 Step 3 逐条过。

**未覆盖项**：无。

**类型一致性**：`presetFor` / `schoolFor` / `applicantsFor` 三个取数函数在 Task 2/3 定义，Task 4–8 按同名使用；`verdictLabel(verdict, t)` 在 Task 5 定义，Task 6/7 按此签名调用；`deriveOutcomes` 的六参顺序（applicant, school, answers, floor, preset, t）在 Task 5 固定，Task 6/7 一致；`gradeOptions(locale)` 在 Task 7 定义并同任务使用。
