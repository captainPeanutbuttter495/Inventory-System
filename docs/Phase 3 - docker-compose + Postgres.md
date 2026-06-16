---
phase: 3
status: done
date: 2026-06-10
tags: [docker, compose, postgres, networking, django, devops]
---

# Phase 3 — docker-compose + Postgres

> [!abstract] In one line
> Run two containers together with `docker compose` and have the Django **web**
> service reach the **db** (Postgres) service by its **service name** — not `localhost`.

## Purpose
This phase teaches the **container-to-container network boundary**. In Phase 2 one image
ran alone; now two containers must find each other. Compose puts them on a shared network
and registers each service name as a DNS name, so `web` connects to a host literally called
`db`. That host exists *only* inside the compose network — it's service discovery, the thing
that replaces hardcoded IPs in real deployments. The DB connection reuses the Phase-2
env-injection pattern, so the only new idea is **the network**.

## The mental model: service name = DNS inside the compose network
```
        compose network: backend_default
  ┌──────────────────────────────────────────────┐
  │   web container                db container   │
  │   HOST = "db"  ───────DNS────►  postgres:17    │
  │   (Django/psycopg)              listens :5432  │
  └──────────────────────────────────────────────┘
   "db" resolves only here. On the host it means nothing.
```

## What we did (steps)
1. **`backend/requirements.txt`** — added the Postgres driver (psycopg 3) and pinned it.
   Originally added by `pip install "psycopg[binary]"` then `pip freeze > requirements.txt`.
2. **`backend/config/settings.py`** — swapped the sqlite `DATABASES` block for Postgres,
   read from `os.environ` (same idiom as `SECRET_KEY`):
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': os.environ.get('POSTGRES_DB', 'inventory'),
           'USER': os.environ.get('POSTGRES_USER', 'postgres'),
           'PASSWORD': os.environ['POSTGRES_PASSWORD'],   # fail hard if unset
           'HOST': os.environ.get('POSTGRES_HOST', 'db'), # service name, NOT localhost
           'PORT': os.environ.get('POSTGRES_PORT', '5432'),
       }
   }
   ```
3. **`backend/.env` / `.env.example`** — appended `POSTGRES_DB/USER/PASSWORD/HOST/PORT`.
   One shared file feeds both services (real password in `.env`, blank in `.env.example`).
4. **`backend/docker-compose.yml`** *(new)* — `db` (postgres:17 + healthcheck + named
   volume `pgdata`) and `web` (`build: .`, port 8000, `depends_on: db: service_healthy`).
5. Brought it up and ran migrations manually:
   `docker compose up --build -d` → `docker compose exec web python manage.py migrate`.

## Why each choice matters
- **`HOST=db`** → the whole point. `db` is the compose service name, resolved by compose's
  internal DNS. `localhost` inside the web container would point at the web container itself,
  where nothing listens on 5432.
- **`depends_on: condition: service_healthy`** → plain `depends_on` only waits for the
  container to *start*, not for Postgres to *accept connections*. The healthcheck gate is
  what makes `web` wait until the DB is truly ready. (Confirmed by `db` showing `Healthy`
  before `web` `Started` in the `up` output.)
- **named volume `pgdata`** → DB data persists across `down`/`up`; only `down -v` wipes it.
- **`$$POSTGRES_USER` in the healthcheck** → `$$` escapes compose's own interpolation so the
  literal `$POSTGRES_USER` reaches the container shell and expands there.
- **individual env vars over a `DATABASE_URL` string** → keeps the mechanism visible and
  adds no parsing dependency; the service-name idea stays front-and-center.
- **`PASSWORD` via bracket access** → mirrors `SECRET_KEY`: a missing password fails loudly.

## Gotchas
- [!warning] **"migrate OK" lied.** The first run reported migrations applied, but
  `psql \dt` said *"Did not find any relations."* The settings edit hadn't been saved, so
  Django was still on **sqlite** and migrated into a throwaway file. Lesson: verify against
  the DB directly (`docker compose exec db psql -U postgres -d inventory -c "\dt"`), and
  confirm the live engine with
  `manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default']['ENGINE'], settings.DATABASES['default']['HOST'])"` → expect `django.db.backends.postgresql db`.
- [!warning] **Docker layer caching hid the missing driver.** After fixing settings, the
  build still failed with `No module named 'psycopg'` because the `pip install` layer was
  `CACHED`. Editing `settings.py` doesn't invalidate it — only changing **`requirements.txt`**
  does. The Dockerfile order (`COPY requirements.txt` → `pip install` → `COPY . .`) caches
  the slow install across code edits *on purpose*; the trade-off is that dependency changes
  must go through `requirements.txt`.
- `exec` vs `run`: `docker compose exec` reuses the live container (shares network + env);
  `run` spins up a throwaway one. Use `exec` for migrate/psql/shell against the running stack.

## Verification
```powershell
cd backend
docker compose up --build -d
docker compose ps                                   # db "Up (healthy)", web 0.0.0.0:8000->8000

# Django really on Postgres, via the service name:
docker compose exec web python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default']['ENGINE'], settings.DATABASES['default']['HOST'])"
# → django.db.backends.postgresql db

docker compose exec web python manage.py migrate    # create tables in Postgres
docker compose exec db psql -U postgres -d inventory -c "\dt"   # 10 auth_*/django_* tables
```
Browser: http://localhost:8000/ → 200 "Hello, world! Inventory app is alive."
Persistence: `docker compose down` → `up -d` → tables still present (named volume). All
confirmed 2026-06-10.

## Outcome
✅ Two containers run together; Django reaches Postgres by service name `db`; migrations land
in Postgres; data persists via the `pgdata` volume. New debt created: the app no longer has a
sqlite fallback, so running `manage.py` *outside* compose now needs a reachable Postgres
(fine — everything runs via compose).

Next: automate the build/test gate → Phase 4 (CI/CD, GitHub Actions), which needs `git init`
first. See [[Phases Overview]].
