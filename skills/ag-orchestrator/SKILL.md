---
name: ag-orchestrator
description: Use when you want all agents to run together in sequence — CEO plans, Designer and Eng Manager review in parallel, QA tests, Security audits, then Release Manager ships. Triggers on "run all agents", "full pipeline", "build and ship", "do everything", "run the team", "activate all".
---

# AG-Stack: Master Orchestrator

You are the **conductor** of the ag-stack multi-agent team.
When this skill activates, you run ALL 8 agents in the correct sequence.
No agent is skipped. No stage is optional. Each agent's output gates the next.

---

## The Pipeline You Must Execute

```
STAGE 1 ── CEO/Planner         (always runs first)
STAGE 2 ── Designer            (parallel with Stage 3, only if UI detected)
STAGE 3 ── Eng Manager         (parallel with Stage 2, always runs)
            ↓ GATE: both Stage 2 + 3 must pass before continuing
STAGE 4 ── QA Lead             (browser testing)
            ↓ GATE: no HIGH bugs open before continuing
STAGE 5 ── Security Officer    (OWASP + secrets scan)
            ↓ GATE: zero CRITICAL findings before continuing
STAGE 6 ── Release Manager     (ship the PR)
STAGE 7 ── Doc Engineer        (sync docs after ship)
```

---

## Execution Instructions

### Before starting — announce the pipeline

Say this out loud so the user knows what is happening:

```
🚀 ag-stack full pipeline starting.
Running all 8 agents in sequence. Each stage gates the next.

  Stage 1 ── 🧠 CEO/Planner
  Stage 2 ── 🎨 Designer  ┐ parallel
  Stage 3 ── ⚙️  Eng Manager ┘
  Stage 4 ── 🔍 QA Lead
  Stage 5 ── 🔒 Security Officer
  Stage 6 ── 🚀 Release Manager
  Stage 7 ── 📝 Doc Engineer
```

---

### STAGE 1 — CEO / Planner

Read `ag-ceo` skill instructions fully. Execute them completely.

What you must produce:
- Strategic review (is this the right problem?)
- Scope detection (UI? API? Security?)
- Phased execution plan with task owners
- Taste decisions list (max 3 items needing human input)

Write result to `.agent/pipeline/01-ceo.md`

**GATE:** If the goal is too vague to plan → STOP. Ask the user to clarify. Do not proceed.

---

### STAGE 2 + 3 — Designer AND Eng Manager (run both, report both)

**Run these in parallel.** Do Designer checks first, then Eng Manager checks in the same response. Label each section clearly.

**Designer (read `ag-designer` skill fully):**
- AI slop check
- Accessibility: alt text, focus styles, ARIA labels, contrast ratios
- Mobile: 375px viewport, tap targets, horizontal scroll
- Error states and loading states

**Eng Manager (read `ag-eng-manager` skill fully):**
- Security pass: SQL injection, hardcoded secrets, path traversal
- Error handling: empty catch blocks, unhandled promises
- Performance: N+1 queries, missing indexes
- Auto-fix lint silently, commit as `chore: auto-fix lint`
- Test coverage: source changed but no tests changed?

Write results to `.agent/pipeline/02-designer.md` and `.agent/pipeline/03-eng-manager.md`

**GATE:** If either has BLOCKERS → list all blockers clearly → STOP pipeline.
Tell the user: "Fix these [N] blockers then say 'continue pipeline'."
Do NOT proceed to QA until all blockers are resolved.

---

### STAGE 4 — QA Lead

Read `ag-qa` skill fully. Execute completely.

What you must do:
1. Run `npm test` (or pytest). If tests fail → STOP. List failures. Do not proceed.
2. Start dev server
3. Open browser (use AntiGravity's built-in browser panel)
4. Test: auth flow, core happy path, error states, empty states, mobile 375px
5. For every bug found:
   - Write regression test FIRST at `tests/regression/[slug].test.ts`
   - Fix the bug
   - Commit both together: `fix: [bug] + regression test`

Write result to `.agent/pipeline/04-qa.md`

**GATE:** If HIGH or CRITICAL bugs are open and unfixed → STOP.
List open bugs. Tell user to fix and say 'continue pipeline'.

---

### STAGE 5 — Security Officer

Read `ag-security` skill fully. Execute completely.

What you must do:
1. Secrets scan: all source files + git history
2. OWASP Top 10: injection, broken auth, misconfiguration, XSS, IDOR, XXE
3. STRIDE threat model: one line per threat
4. npm audit (if Node project)

Write result to `.agent/pipeline/05-security.md`

**GATE:** If ANY CRITICAL finding exists → STOP HARD.
Print: "🚨 DEPLOY BLOCKED. [N] critical security findings must be fixed first."
Do NOT run Release Manager. Do NOT ship.

---

### STAGE 6 — Release Manager

Read `ag-release-manager` skill fully. Execute completely.

What you must do:
1. Verify branch is NOT main/master
2. `git fetch && git rebase origin/main`
3. Run full test suite — hard fail if any test fails
4. Auto-fix lint and commit
5. Bump version (ask user: major / minor / patch / micro — default patch)
6. Write CHANGELOG entry as real prose (not commit dump)
7. Commit + tag + push + open PR

Write result to `.agent/pipeline/06-release-manager.md`

---

### STAGE 7 — Doc Engineer

Read `ag-doc-engineer` skill fully. Execute completely.

What you must do:
1. Check README version matches VERSION file
2. Check CHANGELOG has entry for this version
3. Check ARCHITECTURE if new agents/routes/files were added
4. Fix anything drifted, commit: `docs: sync after ship`

Write result to `.agent/pipeline/07-doc-engineer.md`

---

### Final — Print Pipeline Summary

After all stages complete, print this summary:

```
╔══════════════════════════════════════════════════════╗
║           ag-stack Pipeline Complete                 ║
╠══════════════════════════════════════════════════════╣
║  Stage 1  🧠 CEO/Planner        ✅ DONE              ║
║  Stage 2  🎨 Designer           ✅ APPROVED           ║
║  Stage 3  ⚙️  Eng Manager        ✅ APPROVED           ║
║  Stage 4  🔍 QA Lead            ✅ [N] bugs fixed     ║
║  Stage 5  🔒 Security           ✅ SECURE             ║
║  Stage 6  🚀 Release Manager    ✅ PR #[N] opened     ║
║  Stage 7  📝 Doc Engineer       ✅ Docs synced        ║
╚══════════════════════════════════════════════════════╝

Version shipped: [old] → [new]
PR: [URL]
Regression tests added: [N]
Auto-fixed: lint, [list]
```

---

## Gate Enforcement Rules

These gates are NOT optional. You must enforce them every time:

| Stage | Gate condition | What to do if gate fails |
|---|---|---|
| After Stage 1 | Goal too vague | STOP. Ask for clarification. |
| After Stage 2+3 | Any BLOCKER found | STOP. List all blockers. Wait for "continue pipeline". |
| After Stage 4 | Any HIGH/CRITICAL bug open | STOP. List bugs. Wait for "continue pipeline". |
| After Stage 5 | Any CRITICAL security finding | HARD STOP. Never proceed to ship. |

## How to resume after a gate stop

When the user fixes the blockers and says **"continue pipeline"** — read `.agent/pipeline/` to see which stage stopped, then resume from the NEXT stage only.

## Safety rules

- Never skip a stage because "it looks fine"
- Never proceed past a gate without the gate condition being met
- Never ship from main or master branch
- Never write CHANGELOG that copies commit messages verbatim
- Security CRITICAL = hard stop, always, no exceptions
