---
title: My Backend Role — Tasks, Suggestions & Prep
audience: self / standup prep
date: 2026-06-15
tags: [backend, django, vip-website, standup, role, prep]
---

# 🧭 My Backend Role — Tasks, Suggestions & Prep

> [!abstract] In one line
> I was assigned the **Django/backend** lane for `vip-website` in the 2026-06-15 standup. This
> note pins down (1) my concrete tasks, (2) suggestions worth raising, (3) my read on the
> "no Docker for the front end" call, and (4) what to rehearse on `InventorySystem` first.
> Companion to [[How This Transfers - vip-website]], which is the porting backlog.

## Where I sit
- **Me → Django/backend.** Duane → front end. Supervisor helps both; eventually I dip into the
  front end too "to learn more." This split was offered, not forced — fine to swap later.
- The supervisor is **formalizing everything** (sitemap, wireframes, design tokens, naming
  conventions) *specifically so the AI has strict, no-guesswork requirements*. The backend needs
  the same discipline → that's the through-line for my suggestions below.
- Flow: `feature/*` → PR → code review → `staging` → QA → `main` (= production). Tooling: Django +
  Django ORM, Postgres, Playwright for endpoint/E2E, **Docker only for the backend**, maybe Redis
  caching later. Deploy: **ECS** (backend) + **S3** (files), front end on **AWS Amplify**.

---

## 1. My tasks (from the standup's phased plan)

> [!note] Almost all of Phase 1.5 is *porting*, not learning
> Phases 1–5 of [[Phases Overview]] already built this shape. See
> [[How This Transfers - vip-website]] for the 1:1 mapping.

**Phase 1.5 — Django foundation (parallel to the front-end launch; *not* a launch dependency):**
- Django project + API structure, **backend Docker** (the DB connection is why it's worth it),
  env configuration, initial endpoints, **models + migrations**, **seed data**, **API docs**.

**Phase 2 — FE↔BE integration ("get fancy"):**
- Projects/resources + **asset metadata**, **download tracking** (the supervisor's preferred
  national-challenge engagement metric), event system, CRUD, publish workflows, search/filtering,
  archive states. Front end flips from local data → an **API client**.

**Phase 3 — grand vision (later):**
- One Django backend serving multiple clients (web, iOS, React Native), calendar + event system,
  document-repo system, **inventory loaner system**, and a **rate limiter** (DDoS / S3-cost
  protection).

---

## 2. Suggestions I can raise (high-value, credible)
- **Offer the rehearsal as a ready-made backlog.** [[How This Transfers - vip-website]] is already
  an ordered backend to-do list (Docker → CI/CD → tests). vip-website is ~"Phase 3" today
  (Postgres via compose); its biggest gaps — **no CI workflows, zero tests** — are exactly the
  rungs I already climbed here.
- **API-contract-first** is the backend analog of their "design tokens / mindless components"
  discipline. Publish a **DRF/OpenAPI schema** early so Duane builds the API client against a
  documented contract while I fill in the backend → real parallel work, and it gives the AI the
  same "no guesswork" strictness the supervisor is chasing.
- **Download tracking is cheap to start in Phase 1.** Phase 1 serves the ~8 files *locally* (not
  S3 yet), so a small "increment + log on download" endpoint delivers the metric he explicitly
  cares about — *without* the S3 per-request charge he flagged.
- **Rate limiting is cost-control, not gold-plating.** DRF has built-in throttling; pair it with
  the AWS-side limit. Worth scoping early given the "bot downloads a file a million times = a few
  thousand dollars" scenario he raised.
- **Carry the secrets-hygiene lesson into vip-website CI from day one** — ephemeral CI secrets +
  `POSTGRES_HOST_AUTH_METHOD: trust` for the throwaway DB. (GitGuardian lesson: scanners flag by
  *pattern*, not by whether the value is really secret. See [[Phase 4 - CI-CD GitHub Actions]].)

---

## 3. "No Docker for the front end" — my read: **largely agree; don't push back hard**

The supervisor explicitly invited pushback, so a *reasoned agreement* is the strong move here.

- The front end deploys to **AWS Amplify, which builds Next itself** — a front-end Docker image
  **wouldn't be the prod artifact**. [[Phase 5 - Playwright E2E]] already documented exactly this.
- For a team editing TSX, `npm install` + `next dev` is simpler and faster; Docker adds
  volume-mount / HMR / rebuild friction for little gain in local dev.
- The one real upside of containerizing — **environment parity** — is mostly recoverable *without*
  Docker by pinning Node (`.nvmrc` / `engines`) and committing the lockfile.
- **Backend Docker stays correct** — it has a database/service dependency, which is precisely the
  case where containerization earns its keep.

> [!tip] How to say it
> "Agree — front end on Amplify means a Docker image wouldn't even be the shipped artifact, and we
> get parity more cheaply by pinning Node + committing the lockfile. Backend keeps Docker because
> of the DB dependency. One caveat: if we ever add a CI job that runs the **built** front-end
> artifact reproducibly, a lightweight image could help *then* — not now."

That framing reads as judgment (knowing *when* to containerize), not cargo-culting Docker
everywhere — which is the more senior signal.

---

## 4. What to rehearse on InventorySystem first (ranked menu)
Candidate "Phase 6+" — recommendations to green-light, not committed work yet.

1. **Playwright in CI against the built image** *(top pick)* — closes InventorySystem's one open
   debt ([[Phases Overview]]) and maps 1:1 to vip-website's zero-tests gap. Highest signal,
   smallest lift.
2. **API contract + docs** — add `drf-spectacular`, publish the OpenAPI schema, rehearse "front
   end develops against the contract." Directly enables the parallel-work suggestion above.
3. **Grow the API realistically** — file/asset metadata + a download-count endpoint + DRF
   throttling. One tight rehearsal of vip-website's document-repo + download-metric + rate-limiter.
4. **AWS deploy path** *(stretch)* — containerized Django → ECS, files in S3. Closest to the real
   infra, heaviest lift; do after 1–3.

---

## Logistics noted in the standup
- **Juneteenth (Fri)** building closed → approved to work remote Thursday to make up hours.
- **Laptop:** supervisor is sorting a replacement for the library loaner; new one by Wednesday.
- **Kevin Grovensky's AI coding work group** (weekly, hybrid, ~2pm) — approved as *work time*
  ("part of the training"). Give the supervisor updates; he wants to join a later session.

## See also
[[Home]] · [[How This Transfers - vip-website]] · [[Standup Summary]] · [[Phases Overview]] ·
[[Phase 4 - CI-CD GitHub Actions]] · [[Phase 5 - Playwright E2E]]
