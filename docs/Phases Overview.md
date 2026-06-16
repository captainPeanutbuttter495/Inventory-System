# 🗺️ Phases Overview

The project is a ladder — each rung is one DevOps concept, built on the one below it.
The Django app never grows; the infrastructure around it does.

| # | Phase | The one thing it teaches | Status |
|---|-------|--------------------------|--------|
| 1 | [[Phase 1 - Django Base]] | A running app to wrap everything else around | ✅ Done |
| 2 | [[Phase 2 - Docker]] | Config/secrets live in the **environment**, injected at run time — not baked into code or image | ✅ Done |
| 3 | [[Phase 3 - docker-compose + Postgres]] | Multiple containers talking to each other by **service name** | ✅ Done |
| 4 | [[Phase 4 - CI-CD GitHub Actions]] | Tests gate the build automatically on every push | ✅ Done |
| 5 | [[Phase 5 - Playwright E2E]] | Why "passes locally" ≠ "correct in deploy" | ✅ Done |

## The throughline
Each phase introduces a **boundary** and teaches you to pass things across it correctly:

- **Phase 2** — the *image/runtime* boundary. Secrets must cross it at run time, never be
  sealed inside the image. → [[Phase 2 - Docker]]
- **Phase 3** — the *container-to-container* network boundary. One service finds another
  by DNS service name, not `localhost`. → [[Phase 3 - docker-compose + Postgres]]
- **Phase 4** — the *local/CI* boundary. Code that works on your machine must also build
  and pass in a clean automated environment. → [[Phase 4 - CI-CD GitHub Actions]]
- **Phase 5** — the *test/reality* boundary. A green local test suite can still ship a
  broken deploy. → [[Phase 5 - Playwright E2E]]

Spotting and correctly crossing these boundaries *is* the skill the project is teaching.

## Known debts (tracked, fixed in the phase they belong to)
- ✅ ~~Hardcoded `SECRET_KEY`/`DEBUG`~~ — fixed in [[Phase 2 - Docker]].
- ✅ ~~No git repo yet~~ — initialized with GitHub remote in [[Phase 4 - CI-CD GitHub Actions]]; `.env` gitignored.
- ✅ ~~DRF installed but unused~~ — wired up in [[Phase 5 - Playwright E2E]] (`/api/items/`).
- ⬜ `.env.example` missing the `POSTGRES_*` placeholders — cosmetic docs-drift, add when convenient.
- ⬜ Playwright not in CI yet — [[Phase 5 - Playwright E2E]] debt; needs browsers + the stack in the runner.
- ⬜ Frontend `Dockerfile` unoptimized (no `output: 'standalone'`) — fine for learning; revisit before any real deploy.
- ⬜ Deployed-config values (`ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `NEXT_PUBLIC_API_URL`) need real per-environment values before deploying.

> [!note] App-trivial rule relaxed at Phase 5
> The ladder's premise was "the Django app never grows." Phase 5 broke that on purpose
> (user-directed): a real `Item` model + DRF endpoint + a Next.js/Tailwind frontend, so the
> E2E tests exercise real UI and real FE↔BE deploy-gaps.
