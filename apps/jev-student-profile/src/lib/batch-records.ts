export type BatchRecord = {
  id: string;
  name: string;
  text: string;
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

function supportText(d: Detail): string {
  return `I'm lost on ${d.topic}. I tried ${d.attempt}, but ${d.extra}. I fell behind in ${d.subject} and I am nervous to ask in front of everyone. Can someone walk me through the first step?`;
}

function extensionText(d: Detail): string {
  return `I finished the required work on ${d.topic} during ${d.subject} and still had time, so I started an extension: I compared two extra examples after ${d.attempt}. ${d.extra.charAt(0).toUpperCase()}${d.extra.slice(1)}, which made me want a harder prompt. I already outlined what I would try next without being asked.`;
}

function collaborationText(d: Detail): string {
  return `In our group for ${d.subject} I kept the talk going about ${d.topic}. After ${d.attempt}, I asked two classmates to explain their steps out loud so we could compare. ${d.extra.charAt(0).toUpperCase()}${d.extra.slice(1)}, and talking it through with peers is what actually moved us. I would rather keep this as a discussion than write alone.`;
}

function reflectionText(d: Detail): string {
  return `My strongest move on ${d.topic} is ${d.attempt} — that part of ${d.subject} felt clear. The gap is that ${d.extra}. Next time I will rewrite the shaky part first and then check it against one worked example before I turn it in.`;
}

function mixedText(d: Detail): string {
  return `I got through most of ${d.topic} in ${d.subject} after ${d.attempt}. Some of it clicked and some of it did not: ${d.extra}. I might ask a classmate later, or I might just reread the notes. Nothing urgent, just a regular week.`;
}

const BUILDERS = [supportText, extensionText, collaborationText, reflectionText, mixedText] as const;

export const BATCH_RECORDS_EN: BatchRecord[] = BUILDERS.flatMap((build, kind) =>
  DETAILS.map((detail, i) => {
    const index = kind * DETAILS.length + i;
    return { id: idAt(index), name: nameAt(index), text: build(detail) };
  }),
);

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

function supportTextZh(d: DetailZh): string {
  return `我在${d.topic}上完全卡住了。我试过${d.attempt}，可是${d.extra}。我在${d.subject}里已经落后了，也不敢当着大家问。能不能先带我走第一步？`;
}

function extensionTextZh(d: DetailZh): string {
  return `我在${d.subject}里提前做完了${d.topic}的必做部分，还剩时间，就开始做延伸：在${d.attempt}之后又对比了两个额外例子。${d.extra}，这让我想要更难的题目。我已经自己列了下一步要试什么，没有等人布置。`;
}

function collaborationTextZh(d: DetailZh): string {
  return `在${d.subject}的小组里，我一直带着大家讨论${d.topic}。${d.attempt}之后，我让两个同学把步骤说出来，好对照。${d.extra}，但跟同伴讲清楚之后我们才往前走。我更想继续讨论，而不是一个人写。`;
}

function reflectionTextZh(d: DetailZh): string {
  return `我在${d.topic}上最稳的一步是${d.attempt}——${d.subject}的这部分我觉得清楚。缺口是${d.extra}。下次我会先改最不稳的那一段，再对照一道例题，然后才交。`;
}

function mixedTextZh(d: DetailZh): string {
  return `我在${d.subject}里靠${d.attempt}把${d.topic}的大部分做完了。有的懂，有的不懂：${d.extra}。我可能稍后问同学，也可能再看一遍笔记。没什么紧急的，就是平常的一周。`;
}

const BUILDERS_ZH = [
  supportTextZh,
  extensionTextZh,
  collaborationTextZh,
  reflectionTextZh,
  mixedTextZh,
] as const;

export const BATCH_RECORDS_ZH: BatchRecord[] = BUILDERS_ZH.flatMap((build, kind) =>
  DETAILS_ZH.map((detail, i) => {
    const index = kind * DETAILS_ZH.length + i;
    return { id: idAt(index), name: nameAtZh(index), text: build(detail) };
  }),
);
