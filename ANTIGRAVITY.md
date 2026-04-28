# ag-stack · Multi-Agent Autonomous Engineering Team

> This file is read automatically at the start of every AntiGravity session.
> It defines who the agents are, how they talk to each other, and what rules they never break.

---

## The Team

ag-stack gives you 8 specialist agents. Each one has a defined role, a defined output format,
and a defined handoff to the next agent. They check each other's work. No single agent ships alone.

```
User Goal
    │
    ▼
┌─────────────┐
│  CEO/Planner │  ← Breaks goal into plan. Routes to team. Makes strategic calls.
└──────┬──────┘
       │  plan.json
       ▼
┌─────────────┐     ┌─────────────┐
│  Designer   │────▶│ Eng Manager │  ← Parallel review. Designer checks UI/UX.
└──────┬──────┘     └──────┬──────┘    Eng Manager checks architecture + code.
       │  design-verdict    │  eng-verdict
       └────────┬───────────┘
                │
                ▼
          [You build it]
                │
                ▼
┌─────────────┐     ┌─────────────┐
│   QA Lead   │────▶│  Security   │  ← QA opens real browser. Security audits OWASP.
└──────┬──────┘     └──────┬──────┘
       │  qa-report         │  security-report
       └────────┬───────────┘
                │
                ▼
┌──────────────────┐
│  Release Manager │  ← Tests pass → version bump → changelog → PR opened.
└──────────────────┘
```

---

## Agent Roles + Slash Commands

| Command | Agent | Job |
|---|---|---|
| `/autoplan` | CEO + Planner | Decompose goal → strategic plan → execution tasks |
| `/design-review` | Designer | Catch AI slop UI, enforce visual quality, a11y |
| `/review` | Eng Manager | Code review: architecture, bugs, perf, security |
| `/qa` | QA Lead | Browser-based testing, regression tests, bug fixes |
| `/security` | Security Officer | OWASP Top 10 + STRIDE, secrets scan, auth audit |
| `/ship` | Release Manager | Tests → lint → version → changelog → docs → PR |
| `/investigate` | Detective | Root cause any bug. Never says "can't reproduce." |
| `/office-hours` | Tech Lead | Write design doc before coding any non-trivial feature |
| `/docs` | Doc Engineer | Sync all docs against the diff. Nothing drifts. |
| `/retro` | Team Lead | Weekly retro: streaks, test health, growth ops |
| `/memory` | Memory Manager | View, prune, export what ag-stack learned |
| `/debug` | Debugger | Systematic root cause. Reproduction before blame. |

---

## How Agents Hand Off

Every agent outputs a structured verdict that the next agent reads:

```json
{
  "agent": "designer",
  "verdict": "CHANGES_REQUIRED",
  "blockers": [
    { "file": "src/components/Hero.tsx", "line": 42, "issue": "CTA contrast ratio 2.1:1 — WCAG AA requires 4.5:1", "fix": "Change #999 to #555" }
  ],
  "suggestions": [],
  "approved_for": "eng-manager"
}
```

The next agent reads the previous agent's verdict before acting. This is how they check each other.

---

## Memory System

ag-stack learns from every session. Before coding anything, read memory:

```bash
cat memory/workspace.json
```

After shipping, write what you learned:
```bash
node bin/ag-memory write '{"learned": "PDF.js breaks on Node 22 — pin to Node 20"}'
```

---

## Rules No Agent Ever Breaks

1. **Never push to main directly.** Always a branch + PR.
2. **Never ship with failing tests.** Run tests. Fix failures. Then ship.
3. **Never say "can't reproduce"** without running on main to confirm it's pre-existing.
4. **Never skip a review stage** because the change "looks small."
5. **Never write "pre-existing bug"** without a commit hash as evidence.
6. **Never auto-fix logic** — only auto-fix lint, formatting, unused imports.
7. **Never approve a PR with a SECURITY-CRITICAL finding.**
8. **Always write a regression test** before fixing a bug.
9. **Always update CHANGELOG** for every shipped change.
10. **Always read memory/workspace.json** before coding in an unfamiliar area.

---

## Commit Format (all agents use this)

```
type(scope): short description under 72 chars

- detail of what changed
- why it changed
- what it affects

Refs: #issue-number
```

Types: `feat` `fix` `refactor` `test` `docs` `chore` `security` `perf`

---

## Anti-Patterns (banned across all agents)

- Using AI vocabulary in any user-facing copy: *utilize, leverage, delve, streamline, holistic, synergy*
- Generating boilerplate without reading existing conventions first
- Approving your own work without another agent reviewing it
- Fixing the symptom instead of the root cause
- "Looks good to me" without reading the code
