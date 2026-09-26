# AGENTS.md

Sticky monorepo of small, self-contained JavaScript demos. Humans and agents add new apps under `apps/` without turning this into a shared-framework workspace.

## Layout

- `apps/<name>/` — one demo per folder; install and run **inside that folder**
- `README.md` — human index; each demo gets a bullet with a **relative link to its folder** and one short sentence
- This file — conventions for future agents

Do not introduce a root bundler, workspace `package.json`, or shared UI kit unless a human asks.

## Adding or changing a demo

1. Put the app in `apps/<kebab-name>/` only. Update README when the demo is real; leave unrelated apps alone.
2. Self-contained: `cd apps/<name> && bun install && bun run dev`.
3. Dev server listens on **port 8000**, or `PORT` if set (`strictPort` is fine).
4. Prefer Bun + a light stack (Vite + vanilla or React).
5. When the demo exists, add a README bullet: `[Title](apps/<name>/) — short description.`
6. Keep README an index. Do not dump runbooks, shape lists, or implementation notes there — those belong in the app or here.
7. Demos may keep their own `apps/<name>/README.md` for product rules and implementation details.

## Hosting on exe.dev

The exe.dev HTTPS proxy forwards traffic to port **8000**. Bind dev servers to all interfaces and use `PORT` when set.

- **Vite ≥ 5**: set `server.host: true`, `server.port: Number(process.env.PORT) || 8000`, and `server.allowedHosts: true`. Use the equivalent `preview` settings if serving a preview. For these demos, allowing all hosts is sufficient; do not hard-code exe.dev domains.
- **Next.js ≥ 15.2**: run `next dev -H 0.0.0.0 -p ${PORT:-8000}`. If its origin protection blocks proxy requests, configure `allowedDevOrigins` as described in the exe.dev FAQ rather than committing a VM-specific domain.

See https://exe.dev/docs/faq/nextjs-and-friends.
