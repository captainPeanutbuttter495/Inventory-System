---
phase: 4
status: done
date: 2026-06-15
tags: [ci-cd, github-actions, testing, secrets, postgres, django, devops]
---

# Phase 4 — CI/CD (GitHub Actions)

> [!abstract] In one line
> Every push runs the tests in a clean cloud environment, and the Docker image
> only builds **if the tests pass** — automated on `main`/`staging` and on PRs.

## Purpose
This phase teaches the **local/CI boundary**. Phases 2–3 made it work *on my machine*;
Phase 4 proves it works in a **clean, ephemeral environment** that knows nothing about my
laptop — no `.env`, no pre-installed packages, no already-running Postgres. A workflow file
declares that environment from scratch every run, so "it works here" stops being an opinion
and becomes a check. The gate idea (`needs:`) is the core lesson: a failing test must *stop*
the build, automatically, with no human remembering to look.

## The mental model: the runner is a stranger
```
  push / PR to main|staging
        │
        ▼
  ┌─────────────────────── ubuntu-latest (fresh VM) ───────────────────────┐
  │  job: test                              service container: postgres:17  │
  │   checkout → setup-python 3.12          reached at  localhost:5432       │
  │   pip install -r requirements.txt       (NOT "db" — no compose network)  │
  │   generate SECRET_KEY + PG pw at run    POSTGRES_HOST_AUTH_METHOD=trust   │
  │   python manage.py test  ───────────────► creates test_inventory DB      │
  └────────────────────────────┬───────────────────────────────────────────┘
                               │ needs: test  (only if green)
                               ▼
  ┌──────────────────────── job: build ────────────────────────┐
  │   docker build -t inventory:ci backend   (verify it compiles)│
  └─────────────────────────────────────────────────────────────┘
```

## What we did (steps)
1. **`backend/api/tests.py`** — replaced the placeholder with one real test so "tests run"
   isn't vacuous. `HelloViewTests` hits `/` through Django's **in-process test client**
   (no browser, no running server — it routes a fake request through the real URLconf → view):
   ```python
   from django.test import TestCase

   class HelloViewTests(TestCase):
       def test_root_returns_alive_message(self):
           response = self.client.get("/")
           self.assertEqual(response.status_code, 200)
           self.assertContains(response, "Inventory app is alive")
   ```
2. **`.github/workflows/ci.yml`** *(new, at the **repo root** — GitHub only reads workflows
   from `.github/workflows/`, never from `backend/`)*. Triggers on push + PR to `main`/`staging`;
   two jobs, `test` then `build`.
3. **Branch structure** — created `staging`; work happens on `feature/*` → PR → `staging`
   → PR → `main`.
4. Verified the green path on a PR, then **broke the test on purpose** to watch `build` go
   *skipped* — the gate in action.

## The workflow (annotated)
```yaml
on:
  push: { branches: [main, staging] }
  pull_request: { branches: [main, staging] }

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      db:
        image: postgres:17
        env:
          POSTGRES_DB: inventory
          POSTGRES_USER: postgres
          POSTGRES_HOST_AUTH_METHOD: trust   # ephemeral CI DB → no password stored
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres -d inventory"
          --health-interval 5s --health-timeout 5s --health-retries 5
    env:
      POSTGRES_DB: inventory
      POSTGRES_USER: postgres
      POSTGRES_HOST: localhost     # NOT "db"
      POSTGRES_PORT: "5432"
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - name: Generate ephemeral secrets for this run
        run: |
          echo "SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(50))')" >> "$GITHUB_ENV"
          echo "POSTGRES_PASSWORD=$(python -c 'import secrets; print(secrets.token_urlsafe(16))')" >> "$GITHUB_ENV"
      - run: python manage.py test

  build:
    needs: test                    # the entire "build on pass" gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t inventory:ci backend
```

## Why each choice matters
- **`needs: test`** → *the* point of the phase. `build` doesn't start until `test` succeeds;
  if tests fail it shows **skipped**, not failed. That's the automated gate replacing "I'll
  remember to check."
- **`POSTGRES_HOST: localhost`, not `db`** → the mirror-image of [[Phase 3 - docker-compose + Postgres]].
  In compose, `db` was a DNS name on a shared network. In CI there's **no compose** — the
  service container publishes 5432 to the *runner host*, so the app reaches it at `localhost`.
  Same Postgres, different networking model. This is the classic thing that breaks when compose
  config is copy-pasted into CI.
- **Postgres needed even though the view doesn't touch the DB** → `manage.py test` *always*
  builds a `test_inventory` database before running any test, and `settings.py` is Postgres-only
  and hard-fails without `POSTGRES_PASSWORD`. The service satisfies the test *runner*, not the
  assertion.
- **Generate secrets at runtime + `trust` auth** → keeps **zero secret-shaped literals** in the
  repo (see Gotcha). The ephemeral `SECRET_KEY` is genuinely *better* than a hardcoded dummy;
  `trust` lets the throwaway DB accept connections so the generated password just needs to
  *exist* (Django reads it) without being a real credential.
- **`working-directory: backend`** → `manage.py` and `requirements.txt` live in `backend/`,
  but the workflow file and `docker build` context (`backend`) are addressed from the repo root.
- **Python 3.12** → matches the Dockerfile's `python:3.12-slim` so CI tests the same interpreter
  the image ships.

## Gotchas
- [!warning] **GitGuardian failed the push over the secrets.** The first draft had
  `SECRET_KEY: ci-not-a-real-secret` and `POSTGRES_PASSWORD: postgres` as literals. Scanners
  flag by **pattern, not by truth** — they can't know a value is throwaway, and treating any
  secret-shaped literal as a leak is the correct *habit* (a real key committed once lives in
  git history forever). Fix = don't commit secret-shaped literals at all: **generate them at
  runtime** into `$GITHUB_ENV` and let the ephemeral DB use `POSTGRES_HOST_AUTH_METHOD: trust`.
  (Real-world alternative for genuinely-non-secret defaults: a GitGuardian allowlist / inline
  `# ggignore` — legitimate, but generate-at-runtime is the more transferable habit.)
- [!warning] **`$GITHUB_ENV` only affects *later* steps, not the current one.** Writing
  `SECRET_KEY=...` to it exports the var for subsequent steps; the step that writes it can't see
  it. That's why the generate step comes *before* `manage.py test`. Also used `secrets.token_urlsafe`
  (URL-safe, no `=`/`$`) so the value doesn't break the `KEY=VALUE` line — Django's own
  `get_random_secret_key()` includes shell-special chars and would.
- [!warning] **Service-container env vs. step-generated values.** A service container is
  configured *before* any step runs, so it can't read a value a step generates. That's the real
  reason the DB uses `trust` instead of a generated password on the server side — the password
  only needs to exist on the *client* (Django) side, where a step can set it.

## Verification
```powershell
# Local sanity (the exact test CI runs):
cd backend
docker compose up -d db
docker compose exec web python manage.py test     # → Ran 1 test ... OK
```
Then push a `feature/*` branch and open a PR into `staging`. GitHub → **Actions**: `test`
brings up the `postgres:17` service, installs deps, runs the test; `build` then runs
`docker build`. Both ✅ on the PR. **Gate proof:** assert a wrong string, push → `test` red,
`build` *skipped*; revert. All confirmed 2026-06-15.

## Outcome
✅ Tests run automatically on every push/PR to `main`/`staging`; the image build is gated on
them passing; `feature → staging → main` flow in place; no secrets in source (GitGuardian-clean).
Debt cleared: the repo is git-initialized with a GitHub remote. Minor docs-drift noted:
`backend/.env.example` still omits the `POSTGRES_*` placeholders.

Next: the *test/reality* boundary — a green suite can still ship a broken deploy → Phase 5
(Playwright E2E). Decisions to make up front: Python (`pytest-playwright`) vs Node/TS, and
whether to stand up a real front-end so the browser tests exercise actual UI. See [[Phases Overview]].
