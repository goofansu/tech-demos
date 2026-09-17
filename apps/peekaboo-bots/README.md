# Peekaboo Bots

Joyful single-page zoo of Grok-style avatar blobs. Vanilla Vite (no React).

## Run

```bash
cd apps/peekaboo-bots && bun install && bun run dev
```

Open `http://localhost:8000/` (or `PORT` if set).

## Architecture

- `src/bots.js` — shapes and palettes
- `src/main.js` + `src/style.css` — click/keyboard peekaboo interactions and styling
- `src/audio.js` — optional Web Audio chime

## Product rules

- Show **all 18** silhouettes, each a distinct CSS/SVG clay-like Grok blob (not generic icons): blob, pebble, bean, egg, squircle, tablet, capsule, cylinder, hex, gem, crystal, wedge, shield, dome, arch, cloud, teardrop, leaf.
- Vary **colors** across the grid: black, brown, red, orange, yellow, green, cyan, blue, violet, magenta, gray. Cards label shape + color.
- Every card is a **button**: click or focus + Enter/Space plays peekaboo (hide / duck / cover, then bounce or wiggle back). Hover lifts slightly; cursor pointer. Warm, not scary.
- Honor `prefers-reduced-motion`. Mute toggle for the optional sound.
- Warm playful UI (rounded cards, soft shadows). Title is “Peekaboo Bots” / Grok Bot Zoo.

If you extend this demo, keep it self-contained in `apps/peekaboo-bots/` and keep all 18 shapes working.
