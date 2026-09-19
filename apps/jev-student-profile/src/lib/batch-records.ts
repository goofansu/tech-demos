import type { JevState } from "./types";

export type BatchRecord = {
  id: string;
  name: string;
  state: JevState;
};

const GIVEN = [
  "Aisha",
  "Ben",
  "Cora",
  "Dev",
  "Elena",
  "Farid",
  "Grace",
  "Hiro",
  "Ines",
  "Jules",
  "Kai",
  "Lena",
  "Milo",
  "Noor",
  "Owen",
  "Priya",
  "Quinn",
  "Rosa",
  "Sami",
  "Talia",
  "Uma",
  "Viktor",
  "Willa",
  "Xin",
  "Yara",
] as const;

const FAMILY = ["A.", "B.", "C.", "D."] as const;

type Detail = {
  topic: string;
  attempt: string;
  extra: string;
  subject: string;
};

const DETAILS: Detail[] = [
  {
    topic: "equivalent fractions",
    attempt: "drawing pie charts",
    extra: "the halves and fourths still look the same size to me",
    subject: "math workshop",
  },
  {
    topic: "theme versus plot",
    attempt: "rereading the last chapter",
    extra: "I can retell what happened but not what it means",
    subject: "literature circle",
  },
  {
    topic: "balancing chemical equations",
    attempt: "counting atoms on scrap paper",
    extra: "I keep losing a hydrogen on the right side",
    subject: "lab write-up",
  },
  {
    topic: "citing sources in-text",
    attempt: "copying the example from the handout",
    extra: "I still don't know when a page number is required",
    subject: "research essay",
  },
  {
    topic: "slope-intercept form",
    attempt: "plotting two points on graph paper",
    extra: "the line never matches the equation I wrote",
    subject: "algebra set",
  },
  {
    topic: "the water cycle diagram",
    attempt: "labeling condensation and runoff",
    extra: "I mixed up transpiration and evaporation again",
    subject: "science quiz prep",
  },
  {
    topic: "topic sentences",
    attempt: "underlining the first sentence of each paragraph",
    extra: "my paragraphs still wander into a second idea",
    subject: "persuasive letter",
  },
  {
    topic: "unit rates",
    attempt: "setting up a table of values",
    extra: "I cannot tell which number goes on the bottom",
    subject: "ratio homework",
  },
  {
    topic: "unreliable narrators",
    attempt: "listing what the narrator says vs what others do",
    extra: "I am not sure which version we are supposed to trust",
    subject: "short-story unit",
  },
  {
    topic: "photosynthesis inputs",
    attempt: "making a flowchart from the textbook",
    extra: "I put oxygen on the wrong side of the arrow",
    subject: "biology notes",
  },
  {
    topic: "integer subtraction",
    attempt: "using a number line on my desk",
    extra: "negative minus negative still feels backwards",
    subject: "warm-up set",
  },
  {
    topic: "counterclaims",
    attempt: "adding one sentence that starts with 'however'",
    extra: "it sounds tacked on and does not answer the other side",
    subject: "debate brief",
  },
  {
    topic: "mean versus median",
    attempt: "recalculating the data set twice",
    extra: "I cannot explain when an outlier should change the story",
    subject: "stats mini-lab",
  },
  {
    topic: "imagery in the poem",
    attempt: "highlighting every color word",
    extra: "I still cannot say what the images are doing together",
    subject: "poetry response",
  },
  {
    topic: "Newton's third law pairs",
    attempt: "drawing force arrows on the skateboard sketch",
    extra: "I keep drawing both arrows on the same object",
    subject: "physics demo",
  },
  {
    topic: "comma splices",
    attempt: "splitting every long sentence in two",
    extra: "now the writing sounds choppy and I lost the argument",
    subject: "draft conference",
  },
  {
    topic: "percent decrease",
    attempt: "converting everything to a fraction first",
    extra: "the word problem about the sale price still trips me",
    subject: "quiz corrections",
  },
  {
    topic: "primary vs secondary sources",
    attempt: "sorting the packet into two piles",
    extra: "the newspaper interview feels like it could be either",
    subject: "history project",
  },
  {
    topic: "volume of a cylinder",
    attempt: "plugging numbers into the formula sheet",
    extra: "I used diameter as if it were the radius",
    subject: "geometry practice",
  },
  {
    topic: "character motivation",
    attempt: "tracking what each person wants in a two-column chart",
    extra: "the protagonist's choice in chapter 8 still surprises me",
    subject: "novel study",
  },
];

function nameAt(index: number): string {
  return `${GIVEN[index % GIVEN.length]} ${FAMILY[Math.floor(index / GIVEN.length)]}`;
}

function idAt(index: number): string {
  return String(index + 1).padStart(3, "0");
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Sample Grade 8 rubric condition ids each interleaved archetype is written to fire. */
export const BATCH_ARCHETYPE_PROFILES = [
  ["check_in", "reflection_coaching"],
  ["advanced_writing_track"],
  ["group_project_lead"],
  ["reflection_coaching"],
  ["advanced_writing_track", "group_project_lead"],
] as const;

function supportState(d: Detail): JevState {
  return {
    teacher_notes: `Has missed four of the last six ${d.subject} submissions and has been quiet in class. Looked lost on ${d.topic} and did not ask for help. ${cap(d.extra)}. Pace has been slipping for weeks, not a one-off.`,
    student_reflection: `I'm okay at ${d.topic} I guess. I need to do better. I'll try harder next time.`,
    work_sample: `the thing about ${d.topic} is hard, i try ${d.attempt} but it dont work. i think ${d.extra}. the writing is not organized and there is no main idea`,
  };
}

function extensionState(d: Detail): JevState {
  return {
    teacher_notes: `Finished the required ${d.subject} work on ${d.topic} ahead of the class and then quietly started the optional extension prompts without being asked. Prefers to figure the next step out privately. Homework is consistently complete. No concerns about pace.`,
    student_reflection: `My strongest move on ${d.topic} is ${d.attempt}. The gap is that ${d.extra}. Next time I will rewrite the shaky part first and check it against one worked example before I turn it in.`,
    work_sample: `The city's decision to treat ${d.topic} as settled was framed as progress, but the data tells a more complicated story. Volume rose 18% within two years, while the outcome that was promised moved by less than a minute. If the goal was a faster result, the project did not achieve it; if the goal was more of the same, it succeeded.`,
  };
}

function collaborationState(d: Detail): JevState {
  return {
    teacher_notes: `Lights up in ${d.subject} discussion about ${d.topic} and often pulls quieter classmates into the conversation. After ${d.attempt}, the group moved because they compared steps out loud. Assignments arrive on time. Pace is fine; nothing to flag.`,
    student_reflection: `I think my strongest skill is talking ${d.topic} through with someone first. I still rush when I have to write alone. Next unit I want to draft with a partner and then check that every paragraph points at the same claim.`,
    work_sample: `We kept returning to ${d.topic} as a group. Someone said ${d.extra}, and that became the hinge. The class uses the back-and-forth to arrive at a claim none of us had alone.`,
  };
}

function coachingState(d: Detail): JevState {
  return {
    teacher_notes: `Works steadily on ${d.subject} and prefers to sit apart when drafting. Assignments on ${d.topic} arrive on time and are complete. In group projects they do their share but rarely speak up. Pace is fine; nothing to flag.`,
    student_reflection: `I'm okay at ${d.topic} I guess. I need to do better. I'll try harder next time.`,
    work_sample: `${d.topic} is mainly about a change that is hard at first. I tried ${d.attempt}. ${cap(d.extra)}. The theme is that people get used to things.`,
  };
}

function leadAndExtendState(d: Detail): JevState {
  return {
    teacher_notes: `Finishes most ${d.subject} tasks on ${d.topic} ahead of the class and then quietly starts the optional extension without being asked. Lights up in seminar discussions and often pulls quieter classmates into the conversation. Homework is consistently complete. No concerns about pace.`,
    student_reflection: `I think my strongest skill is building an argument about ${d.topic}, especially when I can talk it through with someone first. I still rush my conclusions. Next unit I want to draft my ending first after ${d.attempt} and then check that every paragraph points at it. The remaining gap is that ${d.extra}.`,
    work_sample: `Although the narrator insists she is 'unbothered' by ${d.topic}, the repetition of that word across three scenes suggests the opposite. Each time it appears, the sentence around it grows shorter, as if she is running out of room to hide. The author uses this compression to show the claim without ever naming it.`,
  };
}

const BUILDERS = [
  supportState,
  extensionState,
  collaborationState,
  coachingState,
  leadAndExtendState,
] as const;

if (BUILDERS.length !== BATCH_ARCHETYPE_PROFILES.length) {
  throw new Error("Each batch archetype needs an intended sample-rubric profile.");
}

function interleave<D>(
  nameFor: (index: number) => string,
  details: readonly D[],
  builders: ReadonlyArray<(detail: D) => JevState>,
): BatchRecord[] {
  return Array.from({ length: details.length * builders.length }, (_, index) => {
    const kind = index % builders.length;
    const detail = details[Math.floor(index / builders.length)];
    return { id: idAt(index), name: nameFor(index), state: builders[kind](detail) };
  });
}

export const BATCH_RECORDS_EN: BatchRecord[] = interleave(nameAt, DETAILS, BUILDERS);

const GIVEN_ZH = [
  "艾莎",
  "本",
  "可拉",
  "德夫",
  "艾琳娜",
  "法里德",
  "格蕾丝",
  "博",
  "伊内斯",
  "朱尔",
  "凯",
  "莉娜",
  "米洛",
  "努尔",
  "欧文",
  "普里娅",
  "奎因",
  "罗莎",
  "萨米",
  "塔利亚",
  "乌玛",
  "维克多",
  "薇拉",
  "欣",
  "雅拉",
] as const;

const FAMILY_ZH = ["安", "白", "陈", "邓"] as const;

type DetailZh = {
  topic: string;
  attempt: string;
  extra: string;
  subject: string;
};

const DETAILS_ZH: DetailZh[] = [
  { topic: "等值分数", attempt: "画饼图", extra: "我还是觉得二分之一和四分之二看起来一样大", subject: "数学工作坊" },
  { topic: "主题和情节的区别", attempt: "重读最后一章", extra: "我能复述发生了什么，但说不清它在讲什么", subject: "文学圈" },
  { topic: "配平化学方程式", attempt: "在草稿纸上数原子", extra: "右边总是少一个氢", subject: "实验报告" },
  { topic: "文内引用", attempt: "照着手册上的例子抄", extra: "我还是不知道什么时候必须写页码", subject: "研究论文" },
  { topic: "斜截式", attempt: "在坐标纸上描两个点", extra: "画出的直线对不上我写的方程", subject: "代数练习" },
  { topic: "水循环图", attempt: "标注凝结和径流", extra: "我又把蒸腾和蒸发搞反了", subject: "科学测验复习" },
  { topic: "主题句", attempt: "把每段第一句划出来", extra: "我的段落还是会溜到第二个观点", subject: "劝说文" },
  { topic: "单位比率", attempt: "先列一个数值表", extra: "我分不清哪个数该放在下面", subject: "比的作业" },
  { topic: "不可靠叙述者", attempt: "列出叙述者说的和别人做的", extra: "我不确定该信哪一版", subject: "短篇小说单元" },
  { topic: "光合作用的输入", attempt: "按课本画流程图", extra: "我把氧气画到了箭头错的一侧", subject: "生物笔记" },
  { topic: "整数减法", attempt: "在桌上用数轴", extra: "负数减负数还是觉得反了", subject: "课前热身" },
  { topic: "反驳观点", attempt: "加一句以“然而”开头的话", extra: "听起来像硬贴上去的，并没有回应对方", subject: "辩论提纲" },
  { topic: "平均数和中位数", attempt: "把数据算了两遍", extra: "我说不清什么时候异常值该改变结论", subject: "统计小实验" },
  { topic: "诗里的意象", attempt: "标出每个颜色词", extra: "我还是说不清这些意象合在一起在做什么", subject: "诗歌回应" },
  { topic: "牛顿第三定律的力对", attempt: "在滑板草图上画力的箭头", extra: "我总是把两个箭头画在同一个物体上", subject: "物理演示" },
  { topic: "逗号粘连句", attempt: "把每个长句拆成两句", extra: "现在文字很碎，论证也丢了", subject: "草稿面谈" },
  { topic: "百分数减少", attempt: "先全部化成分数", extra: "打折后价格那道应用题还是会绊倒我", subject: "测验订正" },
  { topic: "一手和二手资料", attempt: "把材料分成两堆", extra: "那篇报纸访谈怎么分都觉得两边都能算", subject: "历史课题" },
  { topic: "圆柱体积", attempt: "对着公式纸代入数字", extra: "我把直径当成半径用了", subject: "几何练习" },
  { topic: "人物动机", attempt: "用两栏表追踪每个人想要什么", extra: "第八章主角的选择还是让我意外", subject: "长篇阅读" },
];

function nameAtZh(index: number): string {
  return `${FAMILY_ZH[Math.floor(index / GIVEN_ZH.length)]}${GIVEN_ZH[index % GIVEN_ZH.length]}`;
}

function supportStateZh(d: DetailZh): JevState {
  return {
    teacher_notes: `最近六次${d.subject}作业里缺交了四次，课堂上也很沉默。在${d.topic}上看起来很懵，却没有主动求助。${d.extra}。进度已经落后好几周，不是偶发。`,
    student_reflection: `我${d.topic}还可以吧。我得再努力一点。下次会加油。`,
    work_sample: `${d.topic}好难，我试了${d.attempt}可是不行。我觉得${d.extra}。写得也比较乱，没有中心观点`,
  };
}

function extensionStateZh(d: DetailZh): JevState {
  return {
    teacher_notes: `提前做完了${d.subject}里${d.topic}的必做部分，然后不等人提醒就自己开始做选做的拓展题。更喜欢私下把下一步想清楚。作业一直交齐，进度没有问题。`,
    student_reflection: `我在${d.topic}上最稳的一步是${d.attempt}。缺口是${d.extra}。下次我会先改最不稳的那一段，再对照一道例题，然后才交。`,
    work_sample: `把${d.topic}说成已经定论，听起来像进步，但数据讲的是更复杂的故事。两年内规模上升了 18%，当初承诺的结果却只移动了不到一分钟。如果目标是更快见效，这个项目没有达成；如果目标是更多重复，它成功了。`,
  };
}

function collaborationStateZh(d: DetailZh): JevState {
  return {
    teacher_notes: `在${d.subject}讨论${d.topic}时很投入，还常常把比较安静的同学拉进对话。${d.attempt}之后小组靠对照步骤才往前走。作业按时交。进度正常，没有需要标记的问题。`,
    student_reflection: `我最强的是先跟别人把${d.topic}讲清楚。一个人写的时候还会写太赶。下一单元我想先和同伴起草，再检查每段是否指向同一个主张。`,
    work_sample: `我们小组一直回到${d.topic}。有人说${d.extra}，这句话成了转折。全班靠来回讨论才得到谁都没单独想到的结论。`,
  };
}

function coachingStateZh(d: DetailZh): JevState {
  return {
    teacher_notes: `在${d.subject}里写稿时习惯坐开一点。${d.topic}的作业按时交，内容完整。小组项目里会做自己的份，但很少发言。进度正常，没有需要标记的问题。`,
    student_reflection: `我${d.topic}还可以吧。我得再努力一点。下次会加油。`,
    work_sample: `${d.topic}主要讲一种一开始很难的变化。我试了${d.attempt}。${d.extra}。主题大概是人会慢慢习惯。`,
  };
}

function leadAndExtendStateZh(d: DetailZh): JevState {
  return {
    teacher_notes: `多数${d.subject}里关于${d.topic}的任务会提前完成，然后不等人提醒就开始做选做的拓展题。研讨课上很投入，常常把比较安静的同学拉进讨论。作业一直按时交齐。进度方面没有担心。`,
    student_reflection: `我觉得自己最擅长的是围绕${d.topic}搭建论点，尤其是能先和别人把思路说清楚的时候。我还是会把结尾写得很仓促。下一单元我想先${d.attempt}，再起草结尾，并检查每一段是否都指向它。仍然存在的缺口是${d.extra}。`,
    work_sample: `尽管叙述者一再坚称自己对${d.topic}“毫不在意”，这个词在三个场景中反复出现，反而暗示了相反的情况。每次它出现，周围的句子就变得更短，仿佛能躲藏的空间正在消失。作者用这种压缩，在从不点明的情况下写出了主张。`,
  };
}

const BUILDERS_ZH = [
  supportStateZh,
  extensionStateZh,
  collaborationStateZh,
  coachingStateZh,
  leadAndExtendStateZh,
] as const;

if (BUILDERS_ZH.length !== BATCH_ARCHETYPE_PROFILES.length) {
  throw new Error("Each Chinese batch archetype needs an intended sample-rubric profile.");
}

export const BATCH_RECORDS_ZH: BatchRecord[] = interleave(nameAtZh, DETAILS_ZH, BUILDERS_ZH);
