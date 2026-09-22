# jev-admissions-triage 中文版设计

日期：2026-09-21
状态：已确认，待实施

## 1. 背景与目标

`apps/jev-admissions-triage` 目前只有英文。同仓库的 `apps/jev-student-profile`
已经有一套 English / 简体中文 的实现（commit `a794145`），本设计把同一套机制搬到
admissions-triage。

目标：顶栏加 `EN / 简体中文` 切换，切到中文后**界面文案、发给 Jev 的题目、100 份
申请人样本、学校配置全部是中文**。语言选择记在 `localStorage`，刷新后保持。

## 2. 非目标

- 不做第三种语言。`LOCALES` 保持两项，但机制本身不阻止以后加。
- 不做运行时按需加载语言包。两份 catalog 都进 bundle，和 student-profile 一致。
- 不改 `server/evaluate.ts`。服务端不感知语言，`model: "jev-latest"` 不变。
- 不改判定逻辑。阈值、`verdict_map`、`never_not_met`、排序规则一个都不动，
  本次改动对英文界面应当是零行为变化。

## 3. 已确认的决策

1. **翻译范围：全量对齐 student-profile。** UI 文案 + preset 题目（发给 Jev 的
   内容）+ 100 份 applicant + `SCHOOL` 配置都出中文版。
2. **场景设定：直译，学校仍在英国。** `Faria International School` →
   `法瑞亚国际学校`，`country` 仍是 `GB`，`Year 7/9/11` →
   `七年级 / 九年级 / 十一年级`，年龄段不变。36 份手写 planted case 逐条直译，
   每条的判别意图与 `tags` 一一保留。
3. **数据分层：整份镜像。** `admissions-preset.zh-CN.ts` 与
   `applicants.zh-CN.ts` 各存一份完整数据（含 `thresholds`、`verdict_map`、
   `age`、`tags`），与 student-profile 的 `sample.zh-CN.ts` 同构，靠 parity
   测试卡住结构不漂移。

两个已声明并获接受的假设：

- **`applicant.tags` 不翻。** 它是 fixture 的调试标记（`eal_english_medium_beijing`
  这类），不是产品文案，中文界面照样显示英文 tag。
- **`judgment.id` 与 choice option key 不翻。** 它们既是发给 Jev 的 key，也是
  `answers` 回来后的对应依据，翻了会直接破坏答案匹配。只翻 key 旁边的人类可读描述。

## 4. 架构

### 4.1 i18n 机制

`src/lib/i18n.ts` 与 `src/lib/i18n-context.tsx` 从 student-profile 原样移植，
不做"改进"——两个 app 的这一层保持可对读：

- `LOCALES = ["en", "zh-CN"] as const`，`Locale`，`LOCALE_LABELS`
- `LOCALE_KEY = "jev-admissions-triage.locale.v1"`（各 app 独立，不串 key）
- `en` 为源 catalog，`zhCN: DeepString<typeof en>` —— 类型层面保证中文不缺分支
- `Paths<typeof en>` 推导 `MessagePath`，`translate(locale, path, vars)`，
  `interpolate` 处理 `{token}`，`lookup` 在中文缺 key 时回落英文，最后回落 path 本身
- `detectLocale()`：localStorage → `navigator.language` 以 `zh` 开头 → `en`
- `persistLocale()` 用 try/catch 包住（无痕模式下仍能用本次会话的语言）
- `applyDocumentLocale(locale)` 改 `<html lang>`、`document.title`、meta description

`i18n-context.tsx` 提供 `I18nProvider` / `useI18n()` / `RichText`。`RichText`
必须保留：footer 和 preset 描述里有 `<code>systemone</code>`、
`<code>POST /api/evaluate</code>` 这类内联标记，不能用纯字符串插值。

`src/main.tsx` 在 `<App />` 外包一层 `<I18nProvider>`。`index.html` 的
`lang="en"`、`<title>`、meta description 保持为初始值，由 `applyDocumentLocale`
在运行时改写。

**中文字体要补。** 两个 app 的 `src/index.css` 完全一致，`--font-sans` 已经声明了
`"Geist Variable", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", …` 的字体栈，
但 `Noto Sans SC` 这个 webfont 是 student-profile 在 `index.html` 里用 Google Fonts
`<link>` 加载的，admissions-triage 的 `index.html` 没有。不补的话只能靠
`PingFang SC`（macOS）/ `Hiragino Sans GB` 这些系统字体兜底，非 macOS 平台会掉到
默认字体。所以 `index.html` 要加上 `preconnect` 与 Noto Sans SC 的 stylesheet
`<link>`，与 student-profile 一致（它那行里还带了 `Inter`，那是残留——本 app 正文用
`@fontsource-variable/geist`，只取 `Noto Sans SC`）。

### 4.2 消息目录结构

catalog 按界面区域分 namespace，不按组件文件分：

| namespace | 覆盖 |
|---|---|
| `meta` | `<title>`、meta description |
| `app` | 顶栏标题、三个 mode 名、`Mode` / `Language` 的 aria-label、footer |
| `status` | 顶栏 `No API key` 徽章 |
| `keyWarning` | `KeyWarning` 的标题与正文 |
| `floor` | `Confidence floor` 标签与 aria-label |
| `queue` | Queue mode 全部文案：卡片标题/说明、三个按钮、preset 概览、floor 与 cost 说明、进度与耗时、表格 caption 与 9 个列头、行内状态词 |
| `applicant` | Applicant mode 全部文案，14 个字段标签收在 `applicant.fields.*` 下 |
| `preset` | Preset mode 全部文案，含 `queue`/`field`/`never_not_met` 徽章与阈值说明行 |
| `judgment` | `JudgmentCard` 内部：置信度行、below-floor 两种措辞、`never_not_met` 两种措辞、`P(yes)`、分布展开区、per-level 概率 |
| `verdict` | `Met` / `Not Met` / `Needs Review` / `Missing` 四个状态名 |
| `outcome` | `verdicts.ts` 推导出的 `semantic` 与 `detail` 文案 |
| `attentionReason` | 6 个 choice key 的显示名（Queue 的 Why 列现在直接渲染裸 key） |
| `state` | 发给 Jev 的 state 文案：`(not provided)`、年级段描述模板 |
| `errors` | `jev.ts` 的 `malformed` 与 `requestFailed` |

实施时逐文件盘点，不漏 aria-label、`title=` 与 `<caption>`。

一处顺带修掉的硬编码：applicant-mode 的 "Six field judgments get a four-state
verdict" 把 6 写死在句子里，改成由 `FIELD_JUDGMENTS.length` 提供 `{count}`。

### 4.3 分语种数据

| 文件 | 内容 | 导出 |
|---|---|---|
| `src/lib/admissions-preset.zh-CN.ts`（新） | 8 个 judgment 的完整中文版 | `ADMISSIONS_PRESET_ZH: Judgment[]` |
| `src/lib/admissions-preset.ts`（改） | 英文原样保留，加 locale 映射 | `PRESETS: Record<Locale, Judgment[]>`、`presetFor(locale)`、`fieldJudgments(locale)`、`queueJudgments(locale)`、`judgmentById(locale, id)` |
| `src/lib/applicants.zh-CN.ts`（新） | 36 份 planted 直译 + 中文姓名/学校/申请理由/课外活动池，`routineApplicant` 的下标算法照搬 | `APPLICANTS_ZH: Applicant[]` |
| `src/lib/applicants.ts`（改） | 英文原样保留，加 locale 映射 | `APPLICANTS_BY_LOCALE: Record<Locale, Applicant[]>`、`applicantsFor(locale)` |
| `src/lib/school.ts`（改） | 加中文学校配置 | `SCHOOLS: Record<Locale, SchoolConfig>`、`schoolFor(locale)` |

`DEFAULT_CONFIDENCE_FLOOR`、`CONFIDENCE_FLOOR_PRESETS`、`ATTENTION_ID`、
`ATTENTION_REASON_ID`、`APPLICANT_STATE_KEYS`、`REQUIRED_TAGS` 都是语言无关的，
只在 `admissions-preset.ts` / `applicants.ts` 里存一份，中文文件 import 复用。

翻译时要保住判别意图的几条 planted case（不完全列举，实施时对着 `tags` 逐条核）：

- `school_misspelled`：英文是 `Dulwitch College`（Dulwich 的错拼）。中文要给
  **同样性质**的错——一个看着像真校名、实际拼错的名字，而不是换成一个陌生校名。
- `school_local_language`：英文里 `北京市第四中学` 本来就是中文校名，中文版保留原样。
- `school_vague`：`a school in Beijing` → `北京的一所学校`，模糊程度要等价。
- `unconfigured_grade`：`Year 8` → `八年级`，两边都必须落在 `SCHOOL.grades` 之外。
- `age_two_years_off` / `age_system_explained`：年龄数字不变，只翻 `officer_notes`。
- `english_in_non_english_country`、`eal_english_medium_beijing`：`language` /
  `second_language` 字段是语言名（`Mandarin` → `中文`、`English` → `英语`），
  翻译后 EAL 判断的对照关系必须仍然成立。

`applicant-mode.tsx` 里的年级下拉 `GRADES = ["Year 7", "Year 8", "Year 9",
"Year 11", ""]` 也要分语种，且第 4 项（`Year 8` / 八年级）保持"故意未配置"。

### 4.4 接口变更

产生**展示文案**的 lib 函数改为接收 `t`，与 student-profile 的
`verdictFor(field, answer, t)` 同一路子；依赖 preset 的函数改为显式接收 preset，
不再 import 单例：

| 函数 | 现在 | 改为 |
|---|---|---|
| `deriveJudgment` | `(judgment, applicant, school, answer, floor)` | 末尾加 `t` |
| `deriveOutcomes` | `(applicant, school, answers, floor)`，内部 import `ADMISSIONS_PRESET` | `(applicant, school, answers, floor, preset, t)` |
| `buildRequest` | `(applicant, school)` | `(applicant, school, preset, t)` |
| `applicableJudgments` | `(applicant, school)` | `(applicant, school, preset)` |
| `missingFieldCount` | `(applicant)` | `(applicant, preset)` |
| `formatGradeBands` | `(school)` | `(school, t)` |
| `applicantContext` | `(applicant)` | `(applicant, t)` |
| `VERDICT_LABEL` 常量 | `Record<VerdictState, string>` | 函数 `verdictLabel(verdict, t)` |

`VERDICT_TONE` 是颜色映射，与语言无关，保持常量。

`omitReason` / `isMissingInput` / `isUnconfiguredPrerequisite` 只看
`judgment.id` 与字段值，id 不翻，因此签名不变。

`evaluate()` 的签名不变：照抄 student-profile 的做法，在函数内部调
`detectLocale()` 再 `translate(locale, "errors.…")`。这样 `jev.ts` 不必被拖进
React context。

`types.ts` 里的 `MISSING_STATE_LABEL` 与 `NO_API_KEY_MESSAGE` 两个常量删除，
内容移进 catalog（`state.notProvided` / `keyWarning.body`）。

### 4.5 切换语言时的状态处理

`App.tsx` 的 `changeLocale(next)` 要同时做三件事：

1. 把 `applicants` 换成 `applicantsFor(next)`
2. **清空 `results`**
3. `setLocale(next)`

第 2 条是必须的：已有 `answers` 是拿另一语种的题目问出来的，`legend` 和
`semantic` 都对不上，留着显示就是错的。`selectedId` 不清——两个语种的
applicant id 完全一致（`A-0001..A-0100`），选中项跨语言稳定。

`confidenceFloor` 是数字，不受语言影响，保留。

这与 student-profile 的取舍不同（那边切语言时会保留用户自己编辑过的 rubric），
原因是这个 app 的 applicant 是固定 fixture，用户的编辑是"改样本"而不是"创作"，
换语种等于换一整套样本，保留旧编辑没有意义。

## 5. 文件清单

**新增（5）**

- `src/lib/i18n.ts`
- `src/lib/i18n-context.tsx`
- `src/lib/i18n.test.ts`
- `src/lib/admissions-preset.zh-CN.ts`
- `src/lib/applicants.zh-CN.ts`

**修改（18）**

- `index.html`（加 Noto Sans SC 的 Google Fonts `<link>`）
- `src/main.tsx`、`src/App.tsx`
- `src/components/queue/queue-mode.tsx`
- `src/components/applicant/applicant-mode.tsx`
- `src/components/preset/preset-mode.tsx`
- `src/components/shared/judgment-card.tsx`
- `src/components/shared/floor-control.tsx`
- `src/components/shared/key-warning.tsx`
- `src/lib/admissions-preset.ts`、`applicants.ts`、`school.ts`、`fields.ts`、
  `format.ts`、`verdicts.ts`、`request.ts`、`jev.ts`、`types.ts`

**测试随签名更新（3）**：`applicants.test.ts`、`verdicts.test.ts`、`request.test.ts`
（`sort.test.ts`、`pool.test.ts`、`cost.test.ts` 不碰语言，预期无改动）

**文档（2）**：`apps/jev-admissions-triage/README.md` 加 Language 一节；
根 `README.md` 的 bullet 补 `(English and Simplified Chinese)`。

## 6. 测试策略

选了整份镜像，parity 测试就是防漂移的唯一防线，所以写厚。新建
`src/lib/i18n.test.ts`：

**catalog**

- 两份 catalog 的 key 路径集合完全相等
- 每个 key 在两个语种里的 `{token}` 占位符集合完全相等
- `interpolate` 对未知 token 原样保留
- 抽查若干关键串的实际译文（mode 名、verdict 四态、attentionReason 六项）

**preset parity**

- `id` 序列相等
- 每个 judgment 的 `primitive`、`role`、`reads`、`never_not_met`、
  `confidence_floor` 相等
- noul 的 `thresholds` 深相等；score 的 `verdict_map` 深相等且 `levels.length` 相等
- choice 的 option key 集合相等

**applicants parity**

- `id` 序列相等，长度都是 100
- 每份的 `age`、`tags`、`prior_school_country`、`application_status` 相等
- 每份中文 applicant 的 `grade` 在中文 school 里解析到的 band **下标**，与英文
  那份在英文 school 里解析到的下标相同；解析不到的（`unconfigured_grade`）两边都解析不到
- `REQUIRED_TAGS` 在中文集合里同样全覆盖
- 防漏翻：每份中文 applicant 的 `reason_for_applying`、`extracurricular`、
  `officer_notes` 三个散文字段，非空时必须含至少一个 CJK 字符
  （`/[一-鿿]/`）。校名、语言名等短字段不查——`北京市第四中学` 之外还有
  `Dulwich College Beijing` 这类本就该保留英文的专有名词。

**已有测试的适配**：`verdicts.test.ts` 与 `request.test.ts` 补上 `preset` 与 `t`
两个实参（用 `translate.bind(null, "en")` 造一个 `t`），断言内容不变——英文行为
必须零变化。`applicants.test.ts` 的现有断言改为对 `applicantsFor("en")` 跑，
再加一组同样的断言对 `applicantsFor("zh-CN")` 跑。

**验收**：`bun run test`、`bun run lint`、`bun run build`（内含 `tsc --noEmit`）
三条全绿。

## 7. 验收标准

- 顶栏可在 EN / 简体中文 间切换，选择存活于刷新
- 切到中文后：界面无残留英文散文；Preset mode 展示的 8 道题是中文；Applicant
  mode 的申请人资料是中文；`Request that would be sent` 展开后，`state` 与
  `questions` 的内容是中文，而 `judgment.id`、choice option key、
  `APPLICANT_STATE_KEYS` 仍是英文标识符
- 切语言后 results 清空，重新 Evaluate 能正常返回并渲染
- 英文界面与本次改动前逐字一致（"Six field judgments" 改成由 count 生成那处除外）
- 三条命令全绿
