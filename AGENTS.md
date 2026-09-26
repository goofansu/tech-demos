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

Demos are published on the sticky exe.dev VM `tech-demos` at https://tech-demos.exe.xyz (the proxy targets port **8000**, this repo's convention). JS dev servers (Vite, Next.js, …) must allow the deployment hostname, or the proxy returns a host-not-allowed / blocked-request page.

- **Vite ≥ 5**: set `server.allowedHosts` (and `preview.allowedHosts` if using preview) to include `tech-demos.exe.xyz` — or `allowedHosts: true` on this demo VM. Bind so the proxy can reach the server (`host: true` / `0.0.0.0`) and listen on port 8000.
- **Next.js ≥ 15.2**: set `allowedDevOrigins` to include `tech-demos.exe.xyz` (plus port variants if needed) and run `next dev -H 0.0.0.0 -p 8000`.

Traffic flows through the exe.dev HTTPS proxy at https://tech-demos.exe.xyz/; the VM is exposed via `share port` / `share set-public` (see exe.dev proxy docs). Details: https://exe.dev/docs/faq/nextjs-and-friends
