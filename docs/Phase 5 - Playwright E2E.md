---
phase: 5
status: done
date: 2026-06-15
tags: [e2e, playwright, nextjs, react, tailwind, drf, cors, docker, devops]
---

# Phase 5 — Playwright E2E (Next.js + Django, integrated)

> [!abstract] In one line
> A real browser drives a real **Next.js** UI that round-trips through a real **Django/DRF**
> API into **Postgres** — and we deliberately surface the cases where a *green local run still
> ships a broken deploy*.

## Purpose
This phase teaches the **test/reality boundary**. Every prior phase proved something in a
controlled place (my laptop, then a clean CI VM). E2E goes the other way: it exercises the
*whole running system* through the same surface a user touches — a browser clicking buttons and
firing real network requests. The lesson isn't "Playwright passes." It's understanding **why a
passing E2E suite is *not* proof the deploy works**: the thing you test locally (dev servers,
dev config) is not the artifact you ship (a built image, prod config, baked-in env).

> [!note] Scope change — the "app stays trivial" rule was relaxed here on purpose
> Phases 1–4 kept the Django app to a single hello-world view. For Phase 5 we (deliberately,
> user-directed) added a **real model + DRF endpoint** and a **real Next.js + Tailwind frontend**,
> because the user's actual job is React/Next.js and a static text page can't teach browser/JS
> behavior or the FE↔BE deploy-gaps. This is a conscious exception, recorded in `CLAUDE.md`.

## The architecture now
```
  Browser (on the HOST)
     │  fetch http://localhost:8000/api/items/   ← runs in the browser, not in a container
     │  (CORS: Django must allow origin :3000)
     ▼
  ┌───────────── docker compose (one network) ─────────────┐
  │  frontend  (Next.js, :3000)   web (Django/DRF, :8000)   │
  │      └─ serves HTML/JS only         │  ItemListCreate    │
  │         API calls happen in         ▼                    │
  │         the browser, NOT here    db (postgres:17, pgdata)│
  └─────────────────────────────────────────────────────────┘
```
Key non-obvious point: the frontend **container** never calls Django. The `fetch` lives in a
Client Component, so it executes in the **browser on the host** → it must use the host-published
`localhost:8000`, *not* the compose service name `web`.

## What we did (steps)
1. **Backend API** — added `Item` model, `ItemSerializer`, and `ItemListCreate`
   (`generics.ListCreateAPIView`) at `/api/items/`; added **`django-cors-headers`**
   (`CORS_ALLOWED_ORIGINS`, env-driven, defaults to `localhost:3000`). First real migration
   (`api/0001_initial.py`).
2. **Frontend** — `create-next-app` (TypeScript, Tailwind v4, App Router) into `frontend/`.
   `app/page.tsx` is a `"use client"` component: `GET` the list, `POST` new items, render them,
   with `data-testid` hooks. API base from `NEXT_PUBLIC_API_URL`.
3. **E2E** — `@playwright/test` in `frontend/`; `playwright.config.ts` (baseURL :3000,
   `webServer: npm run dev`); `tests/items.spec.ts` adds an item and asserts it **survives a
   reload** (proof it persisted server-side, not just in React state).
4. **Containerized the frontend** — multi-stage `Dockerfile` (`node:24-slim`), added a
   `frontend` service to compose. Whole stack now comes up with one `docker compose up --build`.
5. **Surfaced the deploy-gaps** (below) and wrote it all up.

## Why each choice matters
- **`django-cors-headers`** → a browser at `:3000` calling an API at `:8000` is *cross-origin*;
  the browser blocks it unless Django sends `Access-Control-Allow-Origin`. This is the price of
  decoupling the frontend from the backend. Mirror of the [[Phase 3 - docker-compose + Postgres]]
  service-name idea, one layer up: same machine, different *origins*.
- **Client Component, not Server** → it needs `useState`/`onClick`; and we *wanted* the call in
  the browser to make the CORS + service-name lessons real.
- **`data-testid` selectors** → stable hooks that survive copy changes/restyles; don't assert on
  brittle text or CSS classes.
- **Reload-survives assertion** → the one assertion that actually proves the *full* round-trip
  (browser → Django → Postgres), vs. a test that would pass on pure client state.
- **`node:24-slim` not alpine** → this repo is built on Windows; the glibc prebuilt binaries for
  Next's SWC and Tailwind v4's lightningcss resolve far more reliably than musl ones.
- **Dev bind-mount on `web`** (added this phase) → `docker compose exec web makemigrations` was
  writing the migration into the container's throwaway layer, so it never reached the repo
  (`showmigrations` said `(no migrations)` while the table existed). Mounting `.:/app` makes
  generated files land on the host. See Gotcha.

## Gotchas
- [!warning] **Migrations generated in a container vanish without a bind-mount.** `web` had no
  volume, so `makemigrations` wrote `0001_initial.py` into the container FS; the next
  `up --build` discarded it, leaving an **orphaned `api_item` table with no migration file** —
  schema you can't reproduce. Fix: bind-mount the source (`.:/app`), `down -v` to reset, then
  re-`makemigrations` so the file lands in the repo. Commit migrations.
- [!warning] **`NEXT_PUBLIC_*` is inlined at BUILD time, not run time.** The API URL is frozen
  into the JS bundle during `next build`. Setting it at `docker compose up` does *nothing*;
  you must rebuild with a build `arg`. Classic "I changed the env var, why is it still wrong?"
- [!warning] **The browser can't use Docker service names.** Intuition after Phase 3 says "use
  `http://web:8000`." But client-side `fetch` runs in the browser, *outside* the compose network,
  so `web` doesn't resolve — it must be `localhost:8000`. Builds clean, container shows **Up**,
  and it's still broken in the browser.
- [!warning] **`npm run test:e2e` tests the DEV server, not the artifact you ship.** Playwright's
  `webServer` runs `npm run dev` (and `reuseExistingServer` reuses whatever's on :3000). So a
  green suite validates dev build + dev config, not the production image. **This is the phase's
  whole point.**
- [!warning] **E2E has no DB isolation.** Unlike `manage.py test` (which builds a throwaway
  `test_inventory`), Playwright hits the *real* Postgres and leaves rows behind. Use unique names
  (`e2e-widget-<ms>`) so reruns stay reliable.

## The deploy-gap, made concrete
> [!example] Experiment: it builds clean, the container is "Up", and it's still broken
> ```powershell
> cd backend
> # Rebuild the frontend with the "looks-right-in-Docker" value:
> docker compose build --build-arg NEXT_PUBLIC_API_URL=http://web:8000 frontend
> docker compose up -d frontend
> docker compose ps                      # frontend: Up  ← looks perfectly deployed
> ```
> Open http://localhost:3000 (hard-refresh): the page renders, but items never load and
> **Add** fails — browser console shows `net::ERR_NAME_NOT_RESOLVED` for `web`. Nothing in
> `docker compose` errored. **Builds clean + Up ≠ works.** Revert:
> ```powershell
> docker compose build frontend          # back to the compose default (localhost:8000)
> docker compose up -d frontend
> ```

**The catalog of gaps in *this* app** (each a way local-pass ≠ deploy-correct):
- `NEXT_PUBLIC_API_URL` baked at build → wrong/blank URL in a promoted image.
- service-name vs. browser-origin (above).
- Django `DEBUG=False` + empty `ALLOWED_HOSTS` → **400 DisallowedHost** (defaults are the
  production-safe values, so the local `DEBUG=True` run hides this).
- `CORS_ALLOWED_ORIGINS` is env-driven → the deployed frontend's real origin won't be
  `localhost:3000`; forget to set it and every browser call is blocked.
- E2E runs against `npm run dev`, not the built image → green suite, broken artifact.

## Verification
```powershell
# Whole integrated stack, one command:
cd backend
docker compose up -d --build
docker compose ps                         # db (healthy), web, frontend all Up
# Browser: http://localhost:3000 → add an item → refresh → it persists (FE→Django→Postgres)

# E2E (backend must be up; stop any manual `npm run dev` first):
cd ..\frontend
npm run test:e2e                          # both tests green
```
All confirmed 2026-06-15.

## Outcome
✅ Real browser E2E passes against the integrated Next.js + Django + Postgres stack; the whole
thing runs with one `docker compose up`. The deeper deliverable is *naming the gaps*: a green
local E2E validates dev build + dev config, never the shipped artifact.

Debts created (Phase-6+ material, see [[Phases Overview]]):
- Playwright not yet in **CI** (needs browser install + the stack running in the runner, and ideally
  pointing at the built image, not `npm run dev`).
- Frontend `Dockerfile` isn't optimized (no Next `output: 'standalone'`; ships full `node_modules`).
- Deployed-config values (`ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `NEXT_PUBLIC_API_URL`) need
  real per-environment values before any actual deploy.

This is the last planned rung: the project set out to climb Docker → compose → CI → E2E, and the
**test/reality boundary** is now understood, not just passed. See [[Phases Overview]].
