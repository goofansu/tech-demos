/** Soft clay palettes for Grok-style avatar blobs. */
export const PALETTES = {
  black: {
    base: "#2c2c34",
    light: "#6a6a78",
    dark: "#16161c",
    blush: "#7a4e58",
    ink: "#0d0d12",
  },
  brown: {
    base: "#8b5a3c",
    light: "#c48a5e",
    dark: "#5a3824",
    blush: "#d07070",
    ink: "#2a1810",
  },
  red: {
    base: "#e24a4a",
    light: "#f08080",
    dark: "#b03030",
    blush: "#ff9a9a",
    ink: "#4a1010",
  },
  orange: {
    base: "#f08a3a",
    light: "#ffb46a",
    dark: "#c06018",
    blush: "#ff8a78",
    ink: "#4a2808",
  },
  yellow: {
    base: "#efc43c",
    light: "#ffe07a",
    dark: "#c09418",
    blush: "#f0a060",
    ink: "#4a3808",
  },
  green: {
    base: "#4cb86a",
    light: "#7ad890",
    dark: "#2e8a48",
    blush: "#e87888",
    ink: "#10301c",
  },
  cyan: {
    base: "#3cc8c8",
    light: "#7ae0e0",
    dark: "#1a9a9a",
    blush: "#e08090",
    ink: "#0c3030",
  },
  blue: {
    base: "#4a7ee8",
    light: "#7aa8ff",
    dark: "#2a58b8",
    blush: "#e07090",
    ink: "#102048",
  },
  violet: {
    base: "#7b5ce8",
    light: "#a890ff",
    dark: "#5538b8",
    blush: "#e080b0",
    ink: "#20104a",
  },
  magenta: {
    base: "#d84a9a",
    light: "#f078c0",
    dark: "#a82870",
    blush: "#ff90b8",
    ink: "#401028",
  },
  gray: {
    base: "#8a8a96",
    light: "#b8b8c4",
    dark: "#5a5a66",
    blush: "#c88898",
    ink: "#222228",
  },
};

/**
 * Distinct silhouettes + eye placement.
 * Paths live in a 200×210 viewBox; faces sit in the upper-middle of each body.
 */
export const SHAPES = {
  blob: {
    path: "M108 30 C140 18 174 44 176 78 C178 104 164 118 170 144 C176 170 146 186 116 180 C92 176 80 192 56 176 C30 158 24 128 32 100 C40 72 18 56 42 38 C66 20 82 38 108 30 Z",
    eyes: { y: 96, spread: 24, rx: 15, ry: 17 },
  },
  pebble: {
    path: "M34 108 C32 74 58 50 100 48 C148 46 172 72 170 108 C168 142 140 162 100 164 C56 166 36 140 34 108 Z",
    eyes: { y: 100, spread: 26, rx: 16, ry: 16 },
  },
  bean: {
    path: "M58 48 C88 18 156 28 170 88 C182 140 148 184 96 176 C58 170 36 144 48 114 C64 80 34 74 58 48 Z",
    eyes: { y: 96, spread: 22, rx: 14, ry: 16 },
  },
  egg: {
    path: "M100 26 C140 26 160 72 160 114 C160 162 134 184 100 184 C66 184 40 162 40 114 C40 72 60 26 100 26 Z",
    eyes: { y: 108, spread: 22, rx: 15, ry: 17 },
  },
  squircle: {
    path: "M100 30 C154 30 170 46 170 100 C170 154 154 170 100 170 C46 170 30 154 30 100 C30 46 46 30 100 30 Z",
    eyes: { y: 96, spread: 24, rx: 15, ry: 16 },
  },
  tablet: {
    path: "M28 72 C28 50 48 40 72 40 L128 40 C152 40 172 50 172 72 L172 128 C172 150 152 160 128 160 L72 160 C48 160 28 150 28 128 Z",
    eyes: { y: 96, spread: 28, rx: 15, ry: 16 },
  },
  capsule: {
    path: "M64 58 C64 28 82 18 100 18 C118 18 136 28 136 58 L136 152 C136 182 118 192 100 192 C82 192 64 182 64 152 Z",
    eyes: { y: 96, spread: 18, rx: 13, ry: 16 },
  },
  cylinder: {
    path: "M52 66 C52 44 148 44 148 66 L148 150 C148 172 52 172 52 150 Z",
    extraTop: true,
    eyes: { y: 104, spread: 22, rx: 14, ry: 15 },
  },
  hex: {
    path: "M100 28 L156 58 C162 62 166 70 166 78 L166 132 C166 140 162 148 156 152 L100 182 L44 152 C38 148 34 140 34 132 L34 78 C34 70 38 62 44 58 Z",
    eyes: { y: 100, spread: 24, rx: 14, ry: 16 },
  },
  gem: {
    path: "M100 20 C108 20 164 88 172 100 C164 112 108 190 100 190 C92 190 36 112 28 100 C36 88 92 20 100 20 Z",
    eyes: { y: 100, spread: 22, rx: 14, ry: 16 },
  },
  crystal: {
    path: "M100 16 L150 72 L140 168 L100 196 L60 168 L50 72 Z",
    eyes: { y: 108, spread: 18, rx: 12, ry: 15 },
  },
  wedge: {
    path: "M100 26 C112 26 178 148 172 164 C164 182 36 182 28 164 C22 148 88 26 100 26 Z",
    eyes: { y: 118, spread: 22, rx: 14, ry: 15 },
  },
  shield: {
    path: "M100 22 C152 22 170 40 170 72 C170 124 140 164 100 188 C60 164 30 124 30 72 C30 40 48 22 100 22 Z",
    eyes: { y: 92, spread: 22, rx: 14, ry: 16 },
  },
  dome: {
    path: "M26 142 C26 70 50 26 100 26 C150 26 174 70 174 142 C174 162 150 168 100 168 C50 168 26 162 26 142 Z",
    eyes: { y: 100, spread: 26, rx: 15, ry: 16 },
  },
  arch: {
    path: "M38 182 L38 92 C38 40 68 20 100 20 C132 20 162 40 162 92 L162 182 C162 190 38 190 38 182 Z",
    eyes: { y: 88, spread: 22, rx: 14, ry: 16 },
  },
  cloud: {
    path: "M52 122 C28 120 24 86 54 80 C54 50 92 40 112 62 C126 36 168 48 166 80 C194 84 196 124 168 128 C170 160 122 172 100 154 C76 174 40 156 52 122 Z",
    eyes: { y: 104, spread: 26, rx: 15, ry: 16 },
  },
  teardrop: {
    path: "M100 18 C110 42 164 92 164 132 C164 168 136 186 100 186 C64 186 36 168 36 132 C36 92 90 42 100 18 Z",
    eyes: { y: 118, spread: 22, rx: 14, ry: 16 },
  },
  leaf: {
    path: "M112 20 C164 48 184 102 152 154 C130 182 88 186 58 160 C24 122 30 68 74 40 C90 28 100 22 112 20 Z",
    eyes: { y: 100, spread: 20, rx: 13, ry: 15 },
  },
};

/** One of each shape, colors cycled so neighbors stay distinct. */
export const GALLERY = [
  ["blob", "cyan"],
  ["pebble", "brown"],
  ["bean", "red"],
  ["egg", "yellow"],
  ["squircle", "violet"],
  ["tablet", "gray"],
  ["capsule", "magenta"],
  ["cylinder", "orange"],
  ["hex", "green"],
  ["gem", "blue"],
  ["crystal", "black"],
  ["wedge", "yellow"],
  ["shield", "blue"],
  ["dome", "orange"],
  ["arch", "violet"],
  ["cloud", "gray"],
  ["teardrop", "magenta"],
  ["leaf", "green"],
];

export function renderBotSvg(shapeName, colorName) {
  const shape = SHAPES[shapeName];
  const pal = PALETTES[colorName];
  const uid = `${shapeName}-${colorName}`;
  const { y, spread, rx, ry } = shape.eyes;
  const left = 100 - spread;
  const right = 100 + spread;
  const pupilR = Math.max(6, Math.round(rx * 0.52));
  const sparkR = Math.max(2, Math.round(pupilR * 0.38));

  const cylinderLid = shape.extraTop
    ? `<ellipse class="cyl-lid" cx="100" cy="64" rx="48" ry="18" fill="${pal.light}" />
       <ellipse cx="100" cy="64" rx="48" ry="18" fill="none" stroke="${pal.dark}" stroke-opacity="0.22" stroke-width="2" />`
    : "";

  return `
    <svg viewBox="0 0 200 210" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="body-${uid}" x1="28%" y1="8%" x2="78%" y2="92%">
          <stop offset="0%" stop-color="${pal.light}" />
          <stop offset="42%" stop-color="${pal.base}" />
          <stop offset="100%" stop-color="${pal.dark}" />
        </linearGradient>
        <radialGradient id="shine-${uid}" cx="34%" cy="28%" r="48%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
          <stop offset="55%" stop-color="#ffffff" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
        <clipPath id="clip-${uid}">
          <path d="${shape.path}" />
        </clipPath>
      </defs>
      <ellipse class="ground-shadow" cx="100" cy="200" rx="54" ry="8" />
      <g class="actor-body">
        <path class="silhouette" d="${shape.path}" fill="url(#body-${uid})" />
        ${cylinderLid}
        <g clip-path="url(#clip-${uid})">
          <path d="${shape.path}" fill="url(#shine-${uid})" />
          <ellipse class="blush" cx="${left - 2}" cy="${y + ry + 6}" rx="${rx * 0.7}" ry="${ry * 0.38}" fill="${pal.blush}" />
          <ellipse class="blush" cx="${right + 2}" cy="${y + ry + 6}" rx="${rx * 0.7}" ry="${ry * 0.38}" fill="${pal.blush}" />
        </g>
        <g class="face">
          <g class="eye left">
            <ellipse cx="${left}" cy="${y}" rx="${rx}" ry="${ry}" fill="#f7f4ef" />
            <circle class="pupil" cx="${left + 2}" cy="${y + 2}" r="${pupilR}" fill="${pal.ink}" />
            <circle class="glint" cx="${left + 5}" cy="${y - 3}" r="${sparkR}" fill="#fff" />
          </g>
          <g class="eye right">
            <ellipse cx="${right}" cy="${y}" rx="${rx}" ry="${ry}" fill="#f7f4ef" />
            <circle class="pupil" cx="${right + 2}" cy="${y + 2}" r="${pupilR}" fill="${pal.ink}" />
            <circle class="glint" cx="${right + 5}" cy="${y - 3}" r="${sparkR}" fill="#fff" />
          </g>
        </g>
      </g>
    </svg>
  `;
}
