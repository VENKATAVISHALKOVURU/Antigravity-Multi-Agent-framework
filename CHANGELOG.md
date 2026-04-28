# Changelog

## [1.0.0.0] — 2025-01-01

**Initial release: 8-agent autonomous engineering team for AntiGravity.**

ag-stack ships a complete multi-agent framework where specialist agents check each other's work before anything goes to production. CEO plans, Designer and Eng Manager review in parallel, QA tests in a real browser, Security runs OWASP + STRIDE, and the Release Manager ships the PR — all from a single command.

### What's new
- feat(agents): CEO/Planner — strategic review + execution planning
- feat(agents): Designer — AI slop detection, a11y, mobile, contrast
- feat(agents): Engineering Manager — code review, auto-lint, N+1 detection
- feat(agents): QA Lead — Playwright browser testing, regression tests
- feat(agents): Security Officer — OWASP Top 10 + STRIDE threat model
- feat(agents): Release Manager — version bump + changelog + PR
- feat(agents): Detective — root cause analysis, never says "can't reproduce"
- feat(agents): Doc Engineer — keeps all docs in sync
- feat(orchestrator): Engine, Router, Recovery with retry + rollback
- feat(cli): `ag-stack` command with full pipeline support
- feat(memory): Persistent workspace memory across sessions
- feat(skills): Skill docs for every agent
- feat(examples): Full SaaS MVP walkthrough

---
