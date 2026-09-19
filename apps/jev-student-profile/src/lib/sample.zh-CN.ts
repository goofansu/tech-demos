import type { Rubric, SampleStudent } from "./types";

export const SAMPLE_RUBRIC_ZH: Rubric = {
  name: "八年级学习者画像",
  inputs: [
    {
      key: "teacher_notes",
      label: "教师观察记录",
      placeholder: "课堂、小组活动和测评中的观察……",
      multiline: true,
    },
    {
      key: "student_reflection",
      label: "学生自我反思",
      placeholder: "学生对自己学习的书面反思……",
      multiline: true,
    },
    {
      key: "work_sample",
      label: "作业摘录",
      placeholder: "近期作业中的一小段文字……",
      multiline: true,
    },
  ],
  fields: [
    {
      id: "learning_style",
      type: "choice",
      label: "主导学习方式",
      instructions: "根据 `teacher_notes` 和 `student_reflection`，这名学生最依赖哪种学习方式？",
      options: [
        { key: "collaborative", description: "在讨论和小组活动中学得最好，会被同伴带动。" },
        { key: "independent", description: "更喜欢独自、按自己的节奏工作，私下把问题想清楚。" },
        { key: "hands_on", description: "需要动手、实验或身体活动才能理解概念。" },
        { key: "mixed", description: "没有一种方式占主导，会随任务调整。" },
      ],
      minConfidence: 0.35,
    },
    {
      id: "writing_quality",
      type: "score",
      label: "写作质量",
      instructions:
        "只根据 `work_sample` 中的文字对照各等级评分。如果 `work_sample` 缺失或为空，请给出最低等级。",
      levels: [
        "没有写作样本，或思路难以跟上；语法错误频繁，影响理解。",
        "有想法但组织松散；错误比较明显。",
        "结构清楚，有中心观点和支撑；只有少量错误。",
        "组织严谨、目的明确、用词准确；错误很少。",
      ],
      meetsAt: 2,
    },
    {
      id: "self_awareness",
      type: "score",
      label: "元认知自我觉察",
      instructions: "`student_reflection` 在多大程度上准确说出了自己的优势、不足和下一步？",
      levels: [
        "反思空泛或缺失，没有点出具体优势或不足。",
        "提到了一项优势或不足，但没有具体的下一步。",
        "点出了具体的优势和不足，并提出了可行的下一步。",
      ],
      meetsAt: 1.5,
    },
    {
      id: "needs_support",
      type: "noul",
      label: "需要额外支持",
      instructions: "`teacher_notes` 是否描述了学生落后或游离的持续性模式（而不是一次偶发）？",
      criteriaTrue: "反复缺交作业、跨主题的困惑，或一段时间里的退缩。",
      criteriaFalse: "只是偶发的疏漏，或者学生跟得上进度。",
      yesAt: 0.6,
    },
    {
      id: "ready_for_extension",
      type: "noul",
      label: "适合拓展任务",
      instructions: "`teacher_notes` 或 `work_sample` 是否表明学生提前完成核心任务，或超出了要求？",
      criteriaTrue: "提前完成、主动提出更深的问题，或在未被要求时拓展任务。",
      criteriaFalse: "核心任务需要用完全部时间，或尚未完成。",
      yesAt: 0.65,
    },
  ],
  conditions: [
    {
      id: "advanced_writing_track",
      label: "建议进入高阶写作轨道",
      tone: "positive",
      clauses: [
        { fieldId: "writing_quality", op: ">=", value: "2.5" },
        { fieldId: "ready_for_extension", op: ">=", value: "0.65" },
      ],
    },
    {
      id: "check_in",
      label: "安排一次支持性沟通",
      tone: "attention",
      clauses: [{ fieldId: "needs_support", op: ">=", value: "0.6" }],
    },
    {
      id: "reflection_coaching",
      label: "辅导反思习惯",
      tone: "neutral",
      clauses: [{ fieldId: "self_awareness", op: "<", value: "1.5" }],
    },
    {
      id: "group_project_lead",
      label: "适合担任小组项目负责人",
      tone: "positive",
      clauses: [
        { fieldId: "learning_style", op: "is", value: "collaborative" },
        { fieldId: "needs_support", op: "<", value: "0.4" },
      ],
    },
  ],
};

export const SAMPLE_STUDENTS_ZH: SampleStudent[] = [
  {
    id: "maya",
    name: "林小雅",
    state: {
      teacher_notes:
        "小雅多数任务会提前完成，然后不等人提醒就开始做选做的拓展题。她在研讨课上很投入，常常把比较安静的同学拉进讨论。作业一直按时交齐。进度方面没有担心。",
      student_reflection:
        "我觉得自己最擅长的是搭建论点，尤其是能先和别人把思路说清楚的时候。我还是会把结尾写得很仓促，有时也会重复自己。下一单元我想先起草结尾，再检查每一段是否都指向它。",
      work_sample:
        "尽管叙述者一再坚称自己“毫不在意”，这个词在三个场景中反复出现，反而暗示了相反的情况。每次它出现，周围的句子就变得更短，仿佛她能躲藏的空间正在消失。作者用这种压缩，在从不点明的情况下写出了焦虑。",
    },
  },
  {
    id: "dev",
    name: "陈浩",
    state: {
      teacher_notes:
        "最近六次作业里陈浩缺交了四次，开学以来课堂上也很沉默。分数和比例两个单元他都显得困惑，却都没有主动求助。当我们用教具或做实验式活动时，他会参与进来。",
      student_reflection: "数学我还行吧。我需要再努力一点。下次我会更认真。",
      work_sample:
        "故事讲一个男孩搬到新镇子，他一开始不喜欢，后来交到朋友。我觉得主题是改变很难。作者用男孩先难过后高兴来表现这一点",
    },
  },
  {
    id: "sofia",
    name: "苏晴",
    state: {
      teacher_notes:
        "苏晴做事稳，起草时喜欢坐得离小组远一点；独立作业时会要耳机。作业按时交，内容完整。小组项目里她会完成自己的部分，但很少发言。进度正常，没有需要标记的问题。",
      student_reflection:
        "我擅长规划作文，也喜欢自己做研究。我的不足是不太在小组里分享想法，因为怕它们还不够成熟。我可以试着先把想法写下来再读出来，而不是临场说。",
      work_sample:
        "市政府把拓宽道路说成进步，但数据讲的是更复杂的故事。两年内交通流量上升了 18%，平均通勤时间却只减少了不到一分钟。如果目标是更快出行，这个项目没有达成；如果目标是更多汽车，它成功了。",
    },
  },
];
