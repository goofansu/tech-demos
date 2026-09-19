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

function supportState(d: Detail): JevState {
  return {
    teacher_notes: `Has missed recent ${d.subject} work and looked lost on ${d.topic}. Stayed quiet and did not ask for help. ${cap(d.extra)}. Pace is slipping.`,
    student_reflection: `I'm okay at ${d.topic} I guess. I need to do better. I'll try harder next time.`,
    work_sample: `the thing about ${d.topic} is hard, i try ${d.attempt} but it dont work. i think ${d.extra}. the writing is not organized`,
  };
}

function extensionState(d: Detail): JevState {
  return {
    teacher_notes: `Finished the required ${d.subject} work on ${d.topic} early and started an optional extension without being asked. Homework is complete. No concerns about pace.`,
    student_reflection: `My strongest move on ${d.topic} is ${d.attempt}. The gap is that ${d.extra}. Next time I will rewrite the shaky part first and check it against one worked example before I turn it in.`,
    work_sample: `The usual account of ${d.topic} treats it as settled, but the details push back. After ${d.attempt}, the pattern is clearer: ${d.extra}. That compression is the argument; the rest is support.`,
  };
}

function collaborationState(d: Detail): JevState {
  return {
    teacher_notes: `Lights up in ${d.subject} discussion about ${d.topic} and pulls quieter classmates into the talk. After ${d.attempt}, the group moved because they compared steps out loud. Pace is fine.`,
    student_reflection: `I think my strongest skill is talking ${d.topic} through with someone first. I still rush when I have to write alone. Next unit I want to draft with a partner and then check that every paragraph points at the same claim.`,
    work_sample: `We kept returning to ${d.topic} as a group. Someone said ${d.extra}, and that became the hinge. The author — or in this case the class — uses the back-and-forth to arrive at a claim none of us had alone.`,
  };
}

function reflectionState(d: Detail): JevState {
  return {
    teacher_notes: `Works steadily on ${d.subject} and prefers to sit apart when drafting. Assignments on ${d.topic} arrive on time. In groups they do their share but rarely speak up. Pace is fine.`,
    student_reflection: `I'm good at ${d.attempt} on my own. My weakness is that I don't share ideas in groups because I worry they aren't ready. One thing I could try is writing the idea down and reading it out. The gap I still have is that ${d.extra}.`,
    work_sample: `A first pass at ${d.topic} can stop at plot. After ${d.attempt}, the structure is visible: setup, turn, cost. ${cap(d.extra)}, which is why the ending has to do more than recap.`,
  };
}

function mixedState(d: Detail): JevState {
  return {
    teacher_notes: `Kept pace in ${d.subject}. Some of ${d.topic} clicked after ${d.attempt}; some did not. Nothing urgent to flag this week.`,
    student_reflection: `I got through most of ${d.topic}. Some of it clicked and some of it did not: ${d.extra}. I might ask a classmate later, or I might just reread the notes.`,
    work_sample: `${d.topic} is mainly about a change that is hard at first. I tried ${d.attempt}. ${cap(d.extra)}. The theme is that people get used to things.`,
  };
}

const BUILDERS = [supportState, extensionState, collaborationState, reflectionState, mixedState] as const;

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
    teacher_notes: `最近${d.subject}的作业有缺交，在${d.topic}上看起来很懵，也不敢问。${d.extra}。进度已经落后。`,
    student_reflection: `我${d.topic}还可以吧。我得再努力一点。下次会加油。`,
    work_sample: `${d.topic}好难，我试了${d.attempt}可是不行。我觉得${d.extra}。写得也比较乱`,
  };
}

function extensionStateZh(d: DetailZh): JevState {
  return {
    teacher_notes: `提前做完了${d.subject}里${d.topic}的必做部分，没人布置就自己开始做延伸。作业齐全，进度没有问题。`,
    student_reflection: `我在${d.topic}上最稳的一步是${d.attempt}。缺口是${d.extra}。下次我会先改最不稳的那一段，再对照一道例题，然后才交。`,
    work_sample: `通常对${d.topic}的说法把它当成定论，但细节并不配合。经过${d.attempt}之后更清楚：${d.extra}。真正的论点在这个收束里，其余都是支撑。`,
  };
}

function collaborationStateZh(d: DetailZh): JevState {
  return {
    teacher_notes: `在${d.subject}讨论${d.topic}时很投入，还会把话少的同学拉进来。${d.attempt}之后小组靠对照步骤才往前走。进度正常。`,
    student_reflection: `我最强的是先跟别人把${d.topic}讲清楚。一个人写的时候还会写太赶。下一单元我想先和同伴起草，再检查每段是否指向同一个主张。`,
    work_sample: `我们小组一直回到${d.topic}。有人说${d.extra}，这句话成了转折。作者——或者这一次是全班——靠来回讨论才得到谁都没单独想到的结论。`,
  };
}

function reflectionStateZh(d: DetailZh): JevState {
  return {
    teacher_notes: `在${d.subject}里写稿时习惯坐开一点。${d.topic}的作业按时交。小组里会做自己的份，但很少开口。进度正常。`,
    student_reflection: `我一个人做${d.attempt}比较稳。弱项是不敢在小组里说想法，怕还没准备好。我可以先写下来再读出来。仍然存在的缺口是${d.extra}。`,
    work_sample: `第一遍看${d.topic}往往只停在情节。经过${d.attempt}之后结构就清楚了：铺垫、转折、代价。${d.extra}，所以结尾不能只是复述。`,
  };
}

function mixedStateZh(d: DetailZh): JevState {
  return {
    teacher_notes: `${d.subject}里进度跟得上。${d.topic}在${d.attempt}之后有的懂、有的不懂。这周没有需要特别标记的事。`,
    student_reflection: `${d.topic}的大部分我做完了。有的懂，有的不懂：${d.extra}。我可能稍后问同学，也可能再看一遍笔记。`,
    work_sample: `${d.topic}主要讲一种一开始很难的变化。我试了${d.attempt}。${d.extra}。主题大概是人会慢慢习惯。`,
  };
}

const BUILDERS_ZH = [
  supportStateZh,
  extensionStateZh,
  collaborationStateZh,
  reflectionStateZh,
  mixedStateZh,
] as const;

export const BATCH_RECORDS_ZH: BatchRecord[] = interleave(nameAtZh, DETAILS_ZH, BUILDERS_ZH);
