/** Prebuilt studio voices from the Gemini 3.8 speech guide. */
export const PREBUILT = [
  ["Zephyr", "Bright"],
  ["Puck", "Upbeat"],
  ["Charon", "Informative"],
  ["Kore", "Firm"],
  ["Fenrir", "Excitable"],
  ["Leda", "Youthful"],
  ["Orus", "Firm"],
  ["Aoede", "Breezy"],
  ["Callirrhoe", "Easy-going"],
  ["Autonoe", "Bright"],
  ["Enceladus", "Breathy"],
  ["Iapetus", "Clear"],
  ["Umbriel", "Easy-going"],
  ["Algieba", "Smooth"],
  ["Despina", "Smooth"],
  ["Erinome", "Clear"],
  ["Algenib", "Gravelly"],
  ["Rasalgethi", "Informative"],
  ["Laomedeia", "Upbeat"],
  ["Achernar", "Soft"],
  ["Alnilam", "Firm"],
  ["Schedar", "Even"],
  ["Gacrux", "Mature"],
  ["Pulcherrima", "Forward"],
  ["Achird", "Friendly"],
  ["Zubenelgenubi", "Casual"],
  ["Vindemiatrix", "Gentle"],
  ["Sadachbia", "Lively"],
  ["Sadaltager", "Knowledgeable"],
  ["Sulafat", "Warm"],
].map(([name, trait]) => ({ name, trait }));

export const STYLES = [
  ["", "Plain"],
  ["cheerful and friendly", "Cheerful"],
  ["whispered urgently", "Whisper"],
  ["sarcastic", "Sarcastic"],
  ["out of breath", "Breathless"],
  ["speaking slowly", "Slow"],
  ["speaking rapidly", "Rapid"],
  ["monotone and flat", "Monotone"],
  ["reflective and awe-inspired", "Awe"],
  ["warm and enthusiastic", "Warm"],
  ["calm and reassuring", "Calm"],
  ["high pitch, cheerful and excited inflection", "Bright"],
];

/** Point-in-time vocal events. Sustained delivery belongs in style, not here. */
export const VOCAL_TAGS = [
  ["laugh", "Laugh"],
  ["sigh", "Sigh"],
  ["gasp", "Gasp"],
  ["chuckle", "Chuckle"],
  ["giggle", "Giggle"],
  ["cough", "Cough"],
  ["yawn", "Yawn"],
  ["breath", "Breath"],
  ["sneeze", "Sneeze"],
  ["throat-clearing", "Ahem"],
  ["short pause", "Short pause"],
  ["long pause", "Long pause"],
];

export const SPEAK_PRESETS = [
  {
    id: "hello",
    label: "Greeting",
    voice: "Achird",
    style: "cheerful and friendly",
    format: "wav-24",
    text: "Have a wonderful day. I am glad you stopped by the booth.",
  },
  {
    id: "book",
    label: "Audiobook",
    voice: "Sulafat",
    style: "warm, speaking slowly",
    format: "wav-24",
    text: "The harbor kept its own hours. <short pause> By the time the lamps came on, the water had gone the color of ink. <sigh> She still waited for the boat that never quite arrived.",
  },
  {
    id: "news",
    label: "News",
    voice: "Charon",
    style: "clear and informative",
    format: "wav-24",
    text: "Good evening. A quiet storm is moving along the coast tonight, with rain arriving after midnight and clearing by dawn.",
  },
  {
    id: "ivr",
    label: "Phone menu",
    voice: "Iapetus",
    style: "calm and clear",
    format: "mulaw-8",
    text: "Thank you for calling Harbor Line. For departures, press one. For tickets, press two. To hear this again, stay on the line.",
  },
  {
    id: "whisper",
    label: "Whisper",
    voice: "Enceladus",
    style: "whispered urgently",
    format: "wav-24",
    text: "Wait. <gasp> Did you hear that? <short pause> Stay low, and do not turn on the lamp.",
  },
  {
    id: "emphasis",
    label: "Emphasis",
    voice: "Puck",
    style: "playful and energetic",
    format: "wav-24",
    text: "This is a VERY important point. <laugh> Nobody listens until you say it twice.",
  },
  {
    id: "deadpan",
    label: "Deadpan",
    voice: "Schedar",
    style: "monotone and flat",
    format: "wav-24",
    text: "The meeting has been moved. Again. I am thrilled. <sigh>",
  },
];

export const LANGUAGES = [
  {
    id: "en",
    label: "English",
    text: "The late train is kinder than it looks. There is always one more seat by the window.",
  },
  {
    id: "es",
    label: "Español",
    text: "El tren de la noche es más amable de lo que parece. Siempre queda un asiento junto a la ventana.",
  },
  {
    id: "fr",
    label: "Français",
    text: "Le train du soir est plus gentil qu'il n'en a l'air. Il reste toujours une place près de la fenêtre.",
  },
  {
    id: "de",
    label: "Deutsch",
    text: "Der Abendzug ist freundlicher, als er aussieht. Am Fenster ist immer noch ein Platz frei.",
  },
  {
    id: "pt",
    label: "Português",
    text: "O trem da noite é mais gentil do que parece. Sempre sobra um lugar junto à janela.",
  },
  {
    id: "ja",
    label: "日本語",
    text: "夜の電車は、見た目より優しい。窓際の席が、いつも一つ残っています。",
  },
  {
    id: "ko",
    label: "한국어",
    text: "밤 기차는 보이는 것보다 다정하다. 창가 자리는 언제나 하나 남아 있다.",
  },
  {
    id: "zh",
    label: "中文",
    text: "夜班列车比看上去更温和。靠窗的座位，总还留着一个。",
  },
  {
    id: "hi",
    label: "हिन्दी",
    text: "रात की ट्रेन दिखती है उससे ज़्यादा नरमी रखती है। खिड़की के पास एक सीट हमेशा बच जाती है।",
  },
  {
    id: "ar",
    label: "العربية",
    text: "قطار الليل ألطف مما يبدو. دائمًا يبقى مقعد واحد بجانب النافذة.",
  },
];

export const SCENES = [
  {
    id: "podcast",
    label: "Podcast",
    note: "Two hosts, different deliveries, and a listener reaction tucked into the line with pipes.",
    speakers: [
      { name: "Anya", voice: "Kore" },
      { name: "Liam", voice: "Puck" },
    ],
    turns: [
      {
        speaker: "Anya",
        style: "cheerful and curious",
        text: "Liam, the gecko opened the latch again. |oh no| Tell me you saw it.",
      },
      {
        speaker: "Liam",
        style: "delighted",
        text: "I saw it. |no way| He waited until the camera blinked, then nosed the pin.",
      },
      {
        speaker: "Anya",
        style: "warm and amused",
        text: "So we are outsmarted by a reptile. <laugh> That is this week's headline.",
      },
    ],
  },
  {
    id: "launch",
    label: "Launch check",
    note: "Backchannels such as |oh hmm| play as the other person, without a new turn.",
    speakers: [
      { name: "Priya", voice: "Erinome" },
      { name: "Sam", voice: "Achird" },
    ],
    turns: [
      {
        speaker: "Priya",
        style: "focused",
        text: "So the launch is Thursday. |oh hmm| Are we actually ready?",
      },
      {
        speaker: "Sam",
        style: "confident and calm",
        text: "Ready enough. |oh really?| The last blocker cleared this morning.",
      },
      {
        speaker: "Priya",
        style: "decisive",
        text: "Then let's ship it |absolutely| and watch the dashboards.",
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    note: "The same script, two moods. Style is per turn, so the caller can settle down.",
    speakers: [
      { name: "Owen", voice: "Algenib" },
      { name: "Mina", voice: "Achird" },
    ],
    turns: [
      {
        speaker: "Owen",
        style: "frustrated, speaking rapidly",
        text: "I have been on hold forever, and the parcel still says it is on the dock.",
      },
      {
        speaker: "Mina",
        style: "calm and reassuring",
        text: "I see it, Owen. It left the dock this morning and should reach you tomorrow.",
      },
      {
        speaker: "Owen",
        style: "relieved",
        text: "Tomorrow. <sigh> All right. Thank you for actually looking.",
      },
    ],
  },
  {
    id: "story",
    label: "Story beats",
    note: "One narrator. Each beat carries its own style, which is how a long read stays in character.",
    speakers: [{ name: "Narrator", voice: "Sulafat" }],
    turns: [
      {
        speaker: "Narrator",
        style: "warm, speaking slowly",
        text: "The lighthouse kept its lamp covered, as if the sea had asked for quiet.",
      },
      {
        speaker: "Narrator",
        style: "hushed",
        text: "Then a bell rang once, close. <gasp> Too close for any boat she knew.",
      },
      {
        speaker: "Narrator",
        style: "relieved and bright",
        text: "It was only the buoy, knocking the pier. She laughed, and lit the lamp.",
      },
    ],
  },
  {
    id: "lesson",
    label: "Lesson",
    note: "Language is detected per turn. Vocal tags stay in English either way.",
    speakers: [
      { name: "Hana", voice: "Aoede" },
      { name: "Chris", voice: "Orus" },
    ],
    turns: [
      {
        speaker: "Hana",
        style: "encouraging and clear",
        text: "Try it slowly. おはようございます。",
      },
      {
        speaker: "Chris",
        style: "careful, a little unsure",
        text: "おはようございます。 <short pause> Was the first sound too heavy?",
      },
      {
        speaker: "Hana",
        style: "pleased",
        text: "Close, and lighter on the first syllable. Again, with a smile.",
      },
    ],
  },
  {
    id: "chorus",
    label: "Overlap",
    note: "Several pipe marks in one line interleave the two voices. Flash handles this better than Flash-Lite.",
    speakers: [
      { name: "Nia", voice: "Laomedeia" },
      { name: "Jules", voice: "Puck" },
    ],
    turns: [
      {
        speaker: "Nia",
        style: "excited",
        text: "Let's surprise him on three |ok| ready?",
      },
      {
        speaker: "Jules",
        style: "excited",
        text: "One. Two. Three. |happy| happy |birthday| birthday!",
      },
    ],
  },
];

export const PERSONAS = [
  {
    id: "astronomer",
    name: "Warm British astronomer",
    gender: "male",
    language: "en-GB",
    prompt:
      "A warm, thoughtful astronomer in his late 60s with a gentle British accent, speaking with quiet wonder.",
    line: "Look out past the rings of Saturn. Those faint photons left their source millions of years ago.",
    style: "reflective and awe-inspired",
  },
  {
    id: "announcer",
    name: "Midwestern sports desk",
    gender: "female",
    language: "en-US",
    prompt:
      "A crisp, energetic sports announcer in her 30s with a slight Midwestern accent and a quick, smiling delivery.",
    line: "She takes the corner, keeps her line, and the field is wide open from here.",
    style: "excited, speaking rapidly",
  },
  {
    id: "noir",
    name: "Dry noir narrator",
    gender: "male",
    language: "en-US",
    prompt:
      "A dry, low-voiced narrator around 50, unhurried, with a worn American accent and a hint of gravel.",
    line: "The city kept the rain and gave me the bill. I paid it anyway.",
    style: "weary and understated",
  },
  {
    id: "guide",
    name: "Quiet guide",
    gender: "neutral",
    language: "en-US",
    prompt:
      "A calm, androgynous voice in the early 40s, soft but clear, with no strong regional accent, made for quiet guidance.",
    line: "Let the next breath arrive on its own. There is nowhere else you need to be.",
    style: "gentle, speaking slowly",
  },
];

export const DESIGN_LANGUAGES = [
  ["en-US", "English, US"],
  ["en-GB", "English, UK"],
  ["es-ES", "Spanish, Spain"],
  ["es-MX", "Spanish, Mexico"],
  ["fr-FR", "French"],
  ["de-DE", "German"],
  ["pt-BR", "Portuguese, Brazil"],
  ["it-IT", "Italian"],
  ["ja-JP", "Japanese"],
  ["ko-KR", "Korean"],
  ["zh-CN", "Chinese, Simplified"],
  ["hi-IN", "Hindi"],
  ["ar", "Arabic"],
];

export const LIBRARY_LANGUAGES = [
  ["", "Any language"],
  ["en-US", "en-US"],
  ["en-GB", "en-GB"],
  ["es-ES", "es-ES"],
  ["fr-FR", "fr-FR"],
  ["de-DE", "de-DE"],
  ["pt-BR", "pt-BR"],
  ["ja-JP", "ja-JP"],
  ["ko-KR", "ko-KR"],
  ["zh-CN", "zh-CN"],
  ["hi-IN", "hi-IN"],
];

export const LIBRARY_CONTEXTS = ["", "Audiobook", "Conversational", "News"];

export const AUDITION_LINE = "This is a short audition of the selected voice.";
