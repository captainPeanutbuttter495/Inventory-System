---
phase: 2
status: done
date: 2026-06-10
tags: [docker, secrets, django, devops]
---

# Phase 2 — Docker

> [!abstract] In one line
> Get secrets and config **out of source code** and have them **injected into the
> container at run time** — and prove the built image contains no secret.

## Purpose
The whole phase exists to fix one anti-pattern: configuration baked into code (and worse,
into the image). The success criterion is **propagation** — env vars set *outside* the
image must arrive *inside* the running container, and the image itself must be
config-free. This is the exact class of bug behind a previous broken deploy: a secret
that lived in code instead of the environment.

## The mental model: the image/runtime boundary
```
  BUILD TIME                         RUN TIME
  ┌─────────────────┐                ┌──────────────────────────┐
  │  docker build   │   one image    │  docker run --env-file   │
  │  COPY . .       │ ─────────────► │  SECRET_KEY=... ────────►│  same image,
  │  (NO secrets!)  │  reused as-is  │  DEBUG=... ─────────────►│  configured live
  └─────────────────┘                └──────────────────────────┘
```
One image, built once, with **no** secret inside. Behavior changes only by what you
inject at run time. That's the lesson.

## What we did (steps)
1. **`backend/config/settings.py`** — read config from `os.environ` (plain stdlib, no new
   dependency, so the mechanism stays visible):
   ```python
   import os
   SECRET_KEY = os.environ['SECRET_KEY']  # bracket access → KeyError if missing (fail hard)
   DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')
   ALLOWED_HOSTS = [h for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h]
   ```
2. **`backend/.dockerignore`** — added `.env` / `.env.*` (kept `!.env.example`) so
   `COPY . .` can never bake the secret file into an image layer.
3. **`backend/.env`** *(local only, gitignored, not in image)* — real dev values.
4. **`backend/.env.example`** *(committed)* — template documenting the required vars,
   with no real secret.
5. **`backend/Dockerfile`** — left unchanged on purpose. No `ENV SECRET_KEY=...` line,
   because that would re-bake the secret into a layer. Injection happens at `docker run`.

## Why each choice matters
- **Bracket access, not `.get()`** for `SECRET_KEY` → a missing secret crashes the
  container at startup instead of silently booting misconfigured. Loud failure = the
  lesson is impossible to miss.
- **String compare for `DEBUG`** → env vars are *always strings*, and `bool('False')` is
  `True` (any non-empty string is truthy). Casting would silently flip `DEBUG=False` into
  debug-on. Comparing the lowercased string is the safe idiom.
- **`DEBUG` defaults to `False`** → anything you forget to set lands on the safe
  (production) value, not the risky one.
- **`.dockerignore` over `ENV`** → the secret stays a *runtime* input, never a build
  artifact. `docker history` shows nothing.

## Gotchas
- [!warning] `bool("False") == True`. The single biggest footgun here — never cast env
  strings to bool.
- `COPY . .` will happily copy a `.env` into the image unless `.dockerignore` blocks it.
  Always check.
- `ALLOWED_HOSTS=''.split(',')` returns `['']` (a list with one empty string), not `[]` —
  hence the filter comprehension.

## `--env-file` vs `-e`
- `--env-file .env` → loads every var in the file. Best for the normal run.
- `-e SECRET_KEY=... -e DEBUG=True` → set/override a single var inline. Handy for one-offs.

## Verification
```powershell
cd backend
docker build -t inventory-app .

# Secret is NOT in the image
docker history inventory-app                         # no secret in any layer
docker run --rm inventory-app printenv SECRET_KEY    # prints nothing

# No env → fails hard (the lesson)
docker run --rm inventory-app                        # KeyError: 'SECRET_KEY'

# Env injected at run time → serves + var present in container
docker run --rm --env-file .env -p 8000:8000 inventory-app
docker run --rm --env-file .env inventory-app printenv SECRET_KEY   # prints the key
```
Code-level (venv): with env set, `python manage.py check` → clean; with `SECRET_KEY`
unset → `KeyError` at `settings.py:27`. Both confirmed 2026-06-10.

## Outcome
✅ Config crosses the image/runtime boundary correctly; the image is secret-free; missing
secrets fail loudly. Debt "hardcoded `SECRET_KEY`/`DEBUG`" is cleared.

Next: multiple containers talking to each other → Phase 3 (docker-compose + Postgres),
which reuses this same env-injection pattern for the DB connection string. See
[[Phases Overview]].
