---
title: How This Transfers — vip-website
status: reference
date: 2026-06-15
tags: [devops, transfer, nextjs, prisma, postgres, docker, ci-cd, playwright, vip-website]
---

# How This Transfers — vip-website

> [!abstract] In one line
> The DevOps layer we practiced on a throwaway Django app maps **almost 1:1** onto
> `vip-website` — a *real* Next.js 16 + Prisma + Postgres app. The frontend, the database,
> and the docs habit are already the same shape; the gaps it's missing (**app Dockerfile,
> CI/CD, any tests**) are exactly the four rungs this project climbed. Three details change
> because its backend is Next.js API routes (not Django) and it deploys to **AWS Amplify**.

## Why this note exists
InventorySystem was never the point — it was a flight simulator. The supervisor flagged
**Docker, a CI/CD pipeline, and Playwright testing**, so we built a deliberately trivial app
just to wrap those three things around it ([[Phases Overview]]). This note maps each lesson
onto `vip-website` (`C:\Users\mbg91918\vip-website`; the app lives in `vip-web/`) so the
practice converts into real work instead of evaporating.

## The two stacks, side by side
| Layer | InventorySystem (practice) | vip-website (real) |
|---|---|---|
| Frontend | Next.js + Tailwind v4 + TS, App Router | **Next.js 16 + React 19 + Tailwind v4 + TS**, App Router — same family |
| Backend | Django + DRF `/api/items/`, **separate** service | **Next.js API routes** (`/api/projects`, `/api/health/db`) — *colocated, no 2nd service* |
| DB access | Django ORM + `manage.py migrate` | **Prisma 7** + `prisma migrate` |
| Database | `postgres:17` via compose (`db`) | `postgres:17-alpine` via compose (`db`) — same idea |
| Docker | **Full stack** containerized (frontend + web + db) | **DB only** — no app `Dockerfile`, no `.dockerignore` |
| CI/CD | GitHub Actions `test`→`build` gate; feature→staging→main | **None** — but branches already exist (`main`, `staging`, `feature/*`) |
| Tests / E2E | `@playwright/test` (add-item-survives-reload) | **Zero** tests, no framework |
| Deploy target | self-hosted Docker (hypothetical) | **AWS Amplify** (`vip-web/VIP-Innovation-Hub/aws_integration_plan.md`) |
| Docs | Obsidian vault `docs/` | Obsidian vault `VIP-Innovation-Hub/` — same habit |

> [!tip] Read the table as a to-do list
> Everywhere the right column says *"None / Zero / DB only,"* that's a rung we already climbed
> on the left. The transfer work is mostly **porting**, not learning from scratch.

## Phase-by-phase transfer

### [[Phase 2 - Docker]] → containerize the Next app
- **Carries over:** the multi-stage build pattern and the **"env vars are injected, never baked
  into the image"** discipline. `vip-web` has *no* `Dockerfile` and *no* `.dockerignore` today.
- **Changes:** one image, not two — the backend is inside Next, so there's no separate `web`
  service to containerize. Our [[Phase 5 - Playwright E2E]] frontend `Dockerfile`
  (`node:24-slim`, multi-stage) is a near-drop-in starting point; `vip-web` should add Next's
  `output: 'standalone'` (the optimization we deferred) since it's a real app.
- **Concrete next step:** add `vip-web/Dockerfile` + `vip-web/.dockerignore` for local/CI parity.
- **Caveat (see below):** Amplify *builds Next itself*, so this Docker image is for **CI + local
  parity**, not the prod artifact.

### [[Phase 3 - docker-compose + Postgres]] → already climbed
- **Carries over:** vip-website *already does this.* `vip-web/docker-compose.yml` runs
  `postgres:17-alpine` as service `db` with a named volume, and the app reaches it through a
  **service-name connection string** (`DATABASE_URL`) — the exact pattern Phase 3 taught, with
  Prisma in the seat Django's ORM had.
- **Optional:** add an *app* service to compose so the whole stack comes up with one command
  (full-stack parity, like our `db`+`web`+`frontend`). Nice-to-have, not a gap.

### [[Phase 4 - CI-CD GitHub Actions]] → the highest-value gap
- **The gap:** vip-website already has the **branch flow** (`main`, `staging`, `feature/*`) but
  **no `.github/workflows/` at all** — nothing runs on push.
- **Carries over directly:** the `test`→`build` **gate** (`build` runs only on `needs: test`),
  fired on push/PR to `main`+`staging`, with a **Postgres service container** in the runner.
- **Maps to a Next shape:** there's no `manage.py test`, so the `test` job becomes
  `npm ci` → `npm run lint` → `npx tsc --noEmit` / `next build` → `prisma migrate deploy`
  against the Postgres service. `build` (Docker build, or later the Amplify build) gates on it.
- **Reuse the secrets lesson verbatim:** generate ephemeral `DATABASE_URL`/passwords at runtime
  and use `POSTGRES_HOST_AUTH_METHOD: trust` for the throwaway CI DB — **keep secret-shaped
  literals out of source** (the GitGuardian lesson: scanners flag by *pattern*, not by whether
  the value is really secret).

### [[Phase 5 - Playwright E2E]] → the biggest functional add
- **The gap:** vip-website has **zero tests** — yet it's a genuinely clickable app (navbar,
  carousels, the `/source` project showcase, `/launchspace/*` routes) that *needs* E2E far more
  than our toy did.
- **Carries over directly:** `@playwright/test`, the `data-testid` selector discipline (don't
  assert on copy or CSS classes), and the **"survives a reload"** pattern — drive
  `/source` (or any page that lists projects), assert data from `/api/projects` →
  **Prisma → Postgres** renders, reload, assert it persists. That proves the full round-trip,
  not just React state.
- **Headline takeaway to carry over:** the **test/reality boundary** — a green local E2E
  validates dev build + dev config, *never* the shipped artifact. This matters *more* on a real
  app heading to Amplify.

## What changes because vip-website is different
> [!warning] Three divergences that change the details (not the lessons)
> 1. **Backend = Next.js API routes, not Django.** No second container; CI runs lint/build/
>    migrate instead of `manage.py test`. The Phase-5 **CORS / service-name** lesson is *dormant*
>    here because the browser calls **same-origin** `/api/*` — but it **returns** if/when the API
>    moves to API Gateway + Lambda (the AWS plan), which is exactly the FE↔BE split we modeled
>    with Django.
> 2. **Migrations = Prisma, not Django.** Phase-5's "migrations vanish without a bind-mount"
>    gotcha becomes `prisma migrate dev` (authoring) vs **`prisma migrate deploy`** (CI/prod) —
>    and CI must run migrations against a throwaway Postgres service container.
> 3. **Prod = AWS Amplify, which builds Next itself.** So your Docker work is most valuable for
>    **local parity + CI reproducibility**, *not* the prod artifact. Plan for that, don't expect
>    to `docker run` the same image in prod.

## Which Phase-5 deploy-gaps still apply
The whole point of [[Phase 5 - Playwright E2E]] was naming where *local-pass ≠ deploy-correct*.
On vip-website:
- **`NEXT_PUBLIC_*` is inlined at build time** → still true. On Amplify it's the **build-time env
  config in the Amplify console**; change it and you must rebuild. Same trap, new dashboard.
- **Migrations in a throwaway FS** → run **`prisma migrate deploy` in CI/release**, not ad-hoc.
- **Local-pass ≠ deploy-correct** → test the **built artifact** (`next build && next start` / the
  Docker image), not `next dev`. (And wire Playwright *into CI* — see below.)
- **CORS / service-name** → *currently dormant* (same-origin API routes) but **re-arms** under
  the planned API-Gateway/Lambda split. Keep the lesson on the shelf.
- **`DEBUG`/`ALLOWED_HOSTS`-style prod-only failures** → the Next analog is env that's only set in
  the Amplify environment (DB creds, `DATABASE_URL`); missing there fails in prod, not locally.

## Suggested order to actually adopt (when ready)
Not a task list for today — just the sequence that worked here, lowest-risk first:
1. **`Dockerfile` + `.dockerignore`** for `vip-web` (parity + a build CI can lean on).
2. **GitHub Actions** lint/`tsc`/build/`prisma migrate deploy` gate, Postgres service container,
   ephemeral secrets — on push/PR to `main`+`staging`.
3. **Playwright E2E** for the real pages (`/source`, nav), `data-testid` + reload-survives.
4. **Wire Playwright into CI** — this was InventorySystem's one unpaid debt
   ([[Phases Overview]]); don't repeat it. Install browsers in the runner, bring the stack up,
   point E2E at the **built artifact**, not `next dev`.

## Talking points for the supervisor
- The throwaway project **de-risked exactly the three things you flagged** — Docker, a CI/CD
  pipeline, Playwright — against a stack that turns out to be the *same family* as vip-website
  (Next.js + Tailwind + Postgres).
- vip-website is currently at roughly **"Phase 3"**: it already containerizes Postgres and talks
  to it via a service-name `DATABASE_URL`. The clear next rungs are **CI/CD (it has the branch
  flow but no workflows)** and **any automated tests at all**.
- The most transferable single idea is the **test/reality boundary**: a green local run is *not*
  proof the deploy works — which is doubly true once vip-website is on **AWS Amplify**.
- Net: the practice converts into a concrete, ordered backlog for the real app — porting, not
  inventing.

## See also
[[Home]] · [[Phases Overview]] · [[Standup Summary]] · [[Phase 2 - Docker]] ·
[[Phase 3 - docker-compose + Postgres]] · [[Phase 4 - CI-CD GitHub Actions]] ·
[[Phase 5 - Playwright E2E]]
