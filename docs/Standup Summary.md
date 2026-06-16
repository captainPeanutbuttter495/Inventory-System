---
type: summary
audience: supervisor / standup
date: 2026-06-15
tags: [summary, standup, devops]
---

# 📋 Standup Summary — InventorySystem (DevOps Learning Project)

> [!abstract] 30-second version
> I built a small full-stack app (Next.js + Tailwind frontend, Django REST API, Postgres)
> purely as a vehicle to learn the **DevOps/deployment layer** end-to-end: containerization,
> multi-service orchestration, CI/CD, and end-to-end browser testing. The whole stack runs
> with one command, and automated tests drive it through a real browser. Just finished the
> final planned phase — **Playwright E2E** — and the key takeaway was understanding *why a
> passing local test suite still doesn't guarantee a working deploy.*

## What this project is
A deliberate, hands-on learning project. The application itself is intentionally simple — an
"inventory items" list — because the **goal is the infrastructure around it**, not the app.
Each phase adds one industry-standard DevOps capability and teaches one concept that commonly
trips people up in real deployments.

## What I accomplished (5 phases)
| Phase | What I built | Skill demonstrated |
|------|--------------|--------------------|
| 1 | Django web app with a working endpoint | Backend app scaffolding |
| 2 | **Dockerized** the app; secrets/config injected at runtime (never hardcoded) | Containerization, 12-factor config |
| 3 | **docker-compose** — app + Postgres database as linked containers, persistent data | Multi-service orchestration, container networking |
| 4 | **CI/CD pipeline** (GitHub Actions) — tests run automatically on every push; the build is blocked unless tests pass; `feature → staging → main` branch flow | Automated quality gates, secrets hygiene |
| 5 | **Next.js + Tailwind frontend + REST API + Playwright E2E tests** driving a real browser; full stack containerized | Full-stack integration, end-to-end testing |

## Most recent work (Phase 5 — this is what I'd demo)
- Built a **React/Next.js + Tailwind** frontend that talks to a **Django REST Framework** API,
  with data persisted in **Postgres** — a realistic decoupled frontend/backend architecture.
- Added **Playwright** end-to-end tests: an automated browser types into the form, clicks, and
  verifies the item survives a page reload (proving the data actually round-trips through the API
  and database, not just the UI).
- **Containerized the frontend** too — now the entire stack (frontend + backend + database)
  starts with a single `docker compose up` command.

## The key insight (most valuable part)
The headline lesson was the **"passes locally ≠ works in production" gap**. I deliberately
reproduced several real-world deployment bugs and learned to spot them:
- Frontend config that gets **frozen at build time**, so changing it at deploy time silently
  does nothing.
- A container that **builds successfully and reports "healthy" but is actually broken** in the
  user's browser (a networking assumption that holds inside Docker but not from the browser).
- Automated tests that pass against the **development server**, not the **production build** you
  actually ship — i.e., a green test suite that doesn't prove the deploy is correct.

Understanding *why* these happen — and how to catch them — was the real outcome.

## Current status & next steps
- ✅ All five planned phases complete; everything runs and is documented.
- ⏭️ Natural next step: run the **Playwright E2E tests inside CI** against the built image — this
  is what would actually close the "tests pass but deploy is broken" gap automatically.
- 📒 Full technical write-ups (purpose, decisions, gotchas) are in this vault — see
  [[Phases Overview]] and the per-phase notes, most recently [[Phase 5 - Playwright E2E]].

## Tech I worked with
Docker · docker-compose · GitHub Actions (CI/CD) · Django + Django REST Framework · PostgreSQL
· Next.js / React · TypeScript · Tailwind CSS · Playwright
