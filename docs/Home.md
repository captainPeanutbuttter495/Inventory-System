# 🏠 InventorySystem — DevOps Learning Log

A throwaway practice project for learning the DevOps layer end to end. The Django app
is deliberately trivial — it's just *something to containerize and test*. The learning
is in the pipeline around it: **Docker → docker-compose + Postgres → CI/CD → E2E**.

> [!info] How to read this vault
> Each phase has its own note with the same shape: **Purpose → What we did → Why it
> matters → Gotchas → Verification**. Start at [[Phases Overview]] for the map, then
> drill into a phase note.

## Map of content
- [[Standup Summary]] — supervisor-facing one-pager (what was built + why it matters)
- [[How This Transfers - vip-website]] — how these lessons map onto the real project
- [[My Backend Role - Tasks, Suggestions & Prep]] — my Django lane: tasks, suggestions, the Docker call
- [[Phases Overview]] — the whole pipeline at a glance + status
- Phase notes:
  - [[Phase 1 - Django Base]] ✅
  - [[Phase 2 - Docker]] ✅
  - [[Phase 3 - docker-compose + Postgres]] ✅
  - [[Phase 4 - CI-CD GitHub Actions]] ✅
  - [[Phase 5 - Playwright E2E]] ✅

## Conventions
- **Platform:** Windows 11, PowerShell. Django lives in `backend/`.
- **One phase at a time** — run it, see it work/break, write it up here, then move on.
- New phase note from [[_templates/Phase Note Template]].

## Tags
`#devops` `#django` `#docker`
