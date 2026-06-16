---
phase: 1
status: done
date: 2026-06-10
tags: [django, devops]
---

# Phase 1 — Django Base

> [!abstract] In one line
> Stand up a minimal Django app with a hello-world endpoint at `/`, so there's a real
> running thing to containerize and test in later phases.

## Purpose
You can't practice Docker / CI / E2E against nothing. Phase 1 just creates the
*subject* — a trivial app that responds at `/`. Intentionally no models, no API surface;
the app is scaffolding, not the point.

## What we did (steps)
1. Django project `config` + app `api` in `backend/` (venv at `backend/venv/`).
2. Wrote a `hello` view in `api/views.py` returning a plain 200 response.
3. Mapped it to `/` in `api/urls.py`.
4. Delegated the project URLs to the app: `config/urls.py` uses `include("api.urls")`.

## Why it matters
- `/` previously showed Django's default welcome page (it appears only when *nothing* is
  routed at `/`). Seeing your own text confirms **your** routing is in control.
- `include()` keeps app routes in the app — the pattern you scale as the project grows.

## Gotchas
- The default welcome page is a *fallback*, not a real route — easy to think "it works"
  when actually nothing is wired up.

## Verification
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py runserver
```
- `http://127.0.0.1:8000/` → "Hello, world! Inventory app is alive." (200)
- `http://127.0.0.1:8000/admin/` → still loads (302 redirect — existing routing intact)
- `python manage.py check` → clean

## Outcome
✅ Hello-world serves at `/`. Ready to containerize → [[Phase 2 - Docker]].
