const CITIES = {
  lisbon: {
    city: "Lisbon",
    weather: "24°C, Atlantic haze, light west wind",
    flight: "TP 198 from the studio hub, 2 hours 40 minutes, seat 14A held until 18:00",
    table: "Cervejaria Ramiro, 20:30, two seats by the tiles",
    note: "Tram 28 is crowded after 16:00. Walk Alfama in the morning.",
  },
  kyoto: {
    city: "Kyoto",
    weather: "19°C, clear, cedar-scented evening",
    flight: "JL 416, overnight, arrives 09:10 local",
    table: "A counter at the Nishiki market, 12:30",
    note: "Fushimi Inari is quieter just after dawn.",
  },
  "mexico city": {
    city: "Mexico City",
    weather: "22°C, high cloud, light rain after 17:00",
    flight: "AM 002, afternoon arrival into Benito Juárez",
    table: "Contramar, 14:00, a shared tostada order",
    note: "Chapultepec is the easy walk if the rain holds off.",
  },
  reykjavik: {
    city: "Reykjavik",
    weather: "8°C, low cloud, wind off the bay",
    flight: "FI 440, morning departure, window seat on the left",
    table: "A fish counter on Hverfisgata, 19:00",
    note: "The pool at Sundhöllin opens early.",
  },
  nairobi: {
    city: "Nairobi",
    weather: "25°C, bright, a short afternoon shower",
    flight: "KQ 101, evening arrival",
    table: "A nyama choma table in Kilimani, 20:00",
    note: "The giraffe centre is a short hop if the morning is free.",
  },
  oaxaca: {
    city: "Oaxaca",
    weather: "27°C, dry sun, cool after dark",
    flight: "A connection through Mexico City, landing mid-afternoon",
    table: "A mole tasting at 19:30 in Jalatlaco",
    note: "Saturday market day in Tlacolula is the one to keep.",
  },
};

export const TOOLS = [
  {
    name: "stage_clock",
    label: "Studio clock",
    latencyMs: 0,
    detail: "Current time. Returns immediately.",
    run: readClock,
  },
  {
    name: "city_desk",
    label: "City desk",
    latencyMs: 2800,
    detail: "Weather, one flight, and a table. Takes a few seconds.",
    run: cityDesk,
  },
  {
    name: "signal_scan",
    label: "Signal scan",
    latencyMs: 4500,
    detail: "Three sensor readings and a verdict. Takes several seconds.",
    run: signalScan,
  },
];

export function functionDeclarations(behavior) {
  return [
    {
      name: "stage_clock",
      description:
        "Returns the studio clock for an IANA timezone. Use this whenever the user asks what time it is.",
      behavior,
      parameters: {
        type: "OBJECT",
        properties: {
          timezone: {
            type: "STRING",
            description: "IANA timezone such as Asia/Tokyo. Use UTC when the user does not name one.",
          },
        },
      },
    },
    {
      name: "city_desk",
      description:
        "Looks up a staged weekend brief for a city: weather, one sample flight, and a restaurant table. Takes a few seconds. Use this for trip planning.",
      behavior,
      parameters: {
        type: "OBJECT",
        properties: {
          city: { type: "STRING", description: "City name, such as Lisbon." },
        },
        required: ["city"],
      },
    },
    {
      name: "signal_scan",
      description:
        "Runs a staged diagnostic on a named system and returns three sensor readings plus a verdict. Takes several seconds.",
      behavior,
      parameters: {
        type: "OBJECT",
        properties: {
          system: { type: "STRING", description: "Name of the system to scan." },
        },
        required: ["system"],
      },
    },
  ];
}

export function readClock(args = {}) {
  const timezone = String(args.timezone || "UTC").trim() || "UTC";
  const now = args.now instanceof Date ? args.now : new Date();
  try {
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short",
    }).format(now);
    return { timezone, time, iso: now.toISOString(), fixture: true };
  } catch {
    return { error: `Unknown timezone: ${timezone}`, timezone };
  }
}

export function cityDesk(args = {}) {
  const raw = String(args.city || "").trim();
  const key = raw.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  const hit = Object.entries(CITIES).find(([name]) => key.includes(name));
  if (hit) return { ...hit[1], fixture: true };
  const city = raw.slice(0, 80) || "somewhere";
  return {
    city,
    weather: "Mild and unsettled, 18°C",
    flight: "A studio hop via the hub, arriving late afternoon",
    table: "A counter seat at the market hall, 19:15",
    note: "This city is outside the fixture book, so the desk returned a labeled sketch.",
    fixture: false,
  };
}

export function signalScan(args = {}) {
  const system = String(args.system || "unnamed system").trim().slice(0, 80) || "unnamed system";
  const n = hash(system);
  const vibration = n % 5 === 0 ? "high" : "steady";
  return {
    system,
    readings: [
      { sensor: "voltage", value: `${220 + (n % 17)} V` },
      { sensor: "humidity", value: `${42 + (n % 28)}%` },
      { sensor: "vibration", value: vibration },
    ],
    verdict: vibration === "high" ? "Hold the vents. Vibration is high." : "Safe to open the vents.",
    fixture: true,
  };
}

export async function runTool(name, args = {}, options = {}) {
  const spec = TOOLS.find((tool) => tool.name === name);
  if (!spec) return { error: `Unknown tool: ${name}` };
  const result = spec.run(args);
  const latencyMs = options.latency === false ? 0 : spec.latencyMs;
  if (latencyMs > 0) await delay(latencyMs);
  return { ...result, latencyMs };
}

export function hash(text) {
  let n = 0;
  const value = String(text).toLowerCase();
  for (let i = 0; i < value.length; i += 1) n = (n * 33 + value.charCodeAt(i)) >>> 0;
  return n;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
