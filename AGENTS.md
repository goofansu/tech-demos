# AGENTS.md

Sticky monorepo of small, self-contained JavaScript demos. Humans and agents add new apps under `apps/` without turning this into a shared-framework workspace.

## Layout

- `apps/<name>/` — one demo per folder; install and run **inside that folder**
- `tracking/seen-bookmarks.json` — `{ "proposed": [], "built": [] }` of demo names (folder slug)
- `README.md` — human index; each demo gets a bullet with a **relative link to its folder** and one short sentence
- This file — conventions for future agents

Do not introduce a root bundler, workspace `package.json`, or shared UI kit unless a human asks.

## Adding or changing a demo

1. Put the app in `apps/<kebab-name>/` only. Touch README and `tracking/seen-bookmarks.json` when the demo is real; leave unrelated apps alone.
2. Self-contained: `cd apps/<name> && bun install && bun run dev`.
3. Dev server listens on **port 8000**, or `PORT` if set (`strictPort` is fine).
4. Prefer Bun + a light stack (Vite + vanilla or React).
5. When the demo exists, append its slug to `tracking/seen-bookmarks.json` → `built`, and add a README bullet: `[Title](apps/<name>/) — short description.`
6. Keep README an index. Do not dump runbooks, shape lists, or implementation notes there — those belong in the app or here.

## Peekaboo Bots (`apps/peekaboo-bots/`)

Joyful single-page zoo of Grok-style avatar blobs. Vanilla Vite (no React). Shapes and palettes live in `src/bots.js`; click/keyboard peekaboo in `src/main.js` + `src/style.css`; optional Web Audio chime in `src/audio.js`.

```bash
cd apps/peekaboo-bots && bun install && bun run dev
```

Open `http://localhost:8000/`.

### Product rules

- Show **all 18** silhouettes, each a distinct CSS/SVG clay-like Grok blob (not generic icons): blob, pebble, bean, egg, squircle, tablet, capsule, cylinder, hex, gem, crystal, wedge, shield, dome, arch, cloud, teardrop, leaf.
- Vary **colors** across the grid: black, brown, red, orange, yellow, green, cyan, blue, violet, magenta, gray. Cards label shape + color.
- Every card is a **button**: click or focus + Enter/Space plays peekaboo (hide / duck / cover, then bounce or wiggle back). Hover lifts slightly; cursor pointer. Warm, not scary.
- Honor `prefers-reduced-motion`. Mute toggle for the optional sound.
- Warm playful UI (rounded cards, soft shadows). Title is “Peekaboo Bots” / Grok Bot Zoo.

If you extend this demo, keep it self-contained in `apps/peekaboo-bots/` and keep all 18 shapes working.
