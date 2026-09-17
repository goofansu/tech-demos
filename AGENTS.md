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
7. Demos may keep their own `apps/<name>/README.md` for product rules and implementation details.
