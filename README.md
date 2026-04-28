# ag-stack

> A virtual engineering team for AntiGravity. 8 specialist agents. They plan, design, build, test, audit, and ship — checking each other's work at every step.

Inspired by Garry Tan's [gstack](https://github.com/garrytan/gstack) for Claude Code.
Rebuilt from scratch for AntiGravity's native architecture.

---

## The team

```
Your goal → CEO plans → Designer + Eng Manager review → You build
         → QA tests in real browser → Security audits → Release Manager ships PR
```

| Agent | Command | What it does |
|---|---|---|
| 🧠 CEO / Planner | `/autoplan` | Breaks down your goal. Strategic review. Execution plan. |
| 🎨 Designer | `/design-review` | Catches AI slop. Enforces visual quality and a11y. |
| ⚙️ Eng Manager | `/review` | Code review: architecture, bugs, performance, security. |
| 🔍 QA Lead | `/qa` | Opens real browser. Clicks through flows. Writes regression tests. |
| 🔒 Security Officer | `/security` | OWASP Top 10 + STRIDE. Secrets scan. Auth audit. |
| 🚀 Release Manager | `/ship` | Tests → lint → version → changelog → docs → PR. |
| 🕵️ Detective | `/investigate` | Root cause any bug. Never says "can't reproduce." |
| 📝 Doc Engineer | `/docs` | Syncs README, ARCHITECTURE, CHANGELOG. Nothing drifts. |

---

## Install

```bash
# Install globally
git clone https://github.com/YOUR_USERNAME/ag-stack ~/.ag-stack
cd ~/.ag-stack && bash bin/setup

# Bootstrap into your project
cd your-project
ag-stack-init
```

`ag-stack-init` drops `ANTIGRAVITY.md` into your project root. AntiGravity reads it automatically at the start of every session and loads the full team.

---

## Real example: AI startup from idea to PR

```bash
# 1. Plan it
/autoplan "Build an AI-powered resume screener: upload PDF, score against job description, rank candidates"

# CEO review runs automatically:
# → "Problem is real. Ranking algorithm is the only taste decision. Proceeding."
# → Design review: "2-step flow works. Error state on corrupt PDF missing."
# → Eng review: "Rate limit /upload or you'll get hammered. Use job queue for scoring."
# → Plan output: 3 phases, 11 tasks, 1 question for you

# 2. Write the design doc
/office-hours resume-screener-api
# → docs/design/resume-screener-api.md written with full API contract + data model

# 3. Build the feature (you do this part)

# 4. Code review
/review
# → Auto-fixed: 3 lint errors
# → BLOCKER: missing rate limit on /upload
# → BLOCKER: PDF parse fails on password-protected files
# → Fix these, then continue

# 5. QA in real browser
/qa
# → Browser opens, uploads 3 test PDFs
# → Bug: score display breaks at < 375px width
# → Bug auto-fixed + regression test committed

# 6. Security audit
/security
# → MEDIUM: API key leaking into client bundle
# → Fix: move to server-side env var
# → No criticals — clear to ship

# 7. Ship
/ship minor
# → 47 tests passing
# → Version: 0.1.0 → 0.2.0
# → CHANGELOG written (real prose, not bullet dump)
# → Docs synced
# → PR #12 opened
```

---

## How agents check each other

Every agent writes a structured verdict. The next agent reads it before acting.

```json
{
  "agent": "designer",
  "verdict": "CHANGES_REQUIRED",
  "blockers": [{
    "file": "src/components/Hero.tsx",
    "issue": "CTA contrast 2.1:1 — WCAG AA requires 4.5:1",
    "fix": "Change color #999 to #555"
  }],
  "approved_for": "eng-manager"
}
```

QA can't run until Designer and Eng Manager both approve.
Release Manager can't ship until QA and Security both approve.
This is the check. No single agent has unchecked authority.

---

## Memory — ag-stack gets smarter every session

```bash
/memory list          # See what ag-stack knows about your project
/memory prune         # Remove stale entries
/memory export        # Export for backup or sharing
```

After each session, learnings are written to `memory/workspace.json`:

```json
{
  "project": "resume-screener",
  "stack": ["Next.js 14", "Postgres", "OpenAI", "Vercel"],
  "pitfalls": [
    "PDF.js crashes on Node 22 — pin to Node 20",
    "OpenAI streaming doesn't flush on Vercel Edge — use Node runtime"
  ],
  "conventions": {
    "api_routes": "app/api/**/route.ts",
    "tests": "*.test.ts adjacent to source file"
  }
}
```

Day 30 is meaningfully smarter than Day 1.

---

## Project layout

```
ag-stack/
├── ANTIGRAVITY.md              ← The team contract. Read first every session.
├── agents/
│   ├── base.js                 ← Shared agent interface + verdict schema
│   ├── ceo.js                  ← CEO / Planner
│   ├── designer.js             ← Designer
│   ├── eng-manager.js          ← Eng Manager
│   ├── qa.js                   ← QA Lead
│   ├── security.js             ← Security Officer
│   ├── release-manager.js      ← Release Manager
│   ├── detective.js            ← Bug Detective
│   └── doc-engineer.js         ← Doc Engineer
├── orchestrator/
│   ├── engine.js               ← Execution loop: plan → assign → execute → verify
│   ├── router.js               ← Routes tasks to the right agent
│   ├── handoff.js              ← Manages agent-to-agent verdict passing
│   └── recovery.js             ← Self-healing: retry, rollback, escalate
├── skills/
│   ├── ceo/SKILL.md            ← /autoplan
│   ├── designer/SKILL.md       ← /design-review
│   ├── eng-manager/SKILL.md    ← /review
│   ├── qa/SKILL.md             ← /qa
│   ├── security/SKILL.md       ← /security
│   ├── release-manager/SKILL.md ← /ship
│   ├── detective/SKILL.md      ← /investigate
│   └── doc-engineer/SKILL.md   ← /docs
├── orchestrator/
├── memory/
│   ├── workspace.json          ← Per-project memory (gitignored)
│   └── learnings/              ← Session notes accumulated over time
├── bin/
│   ├── setup                   ← Install script
│   ├── ag-stack-init           ← Bootstrap a project
│   ├── ag-next-version         ← Version bump calculator
│   ├── ag-repro                ← Bug reproduction helper
│   └── ag-memory               ← Memory CLI
├── config/
│   └── ag.config.yaml          ← Team configuration
├── docs/
│   ├── architecture.md
│   ├── adding-agents.md
│   └── adding-skills.md
└── examples/
    ├── saas-mvp/
    ├── rest-api/
    └── ai-startup/
```

---

## Guardrails

- **Never pushes to main directly** — always branch + PR
- **Never ships failing tests** — blocks release, tells you exactly what failed
- **Never skips a review** — even "small" changes go through the pipeline
- **Dry-run mode**: `ag-stack run --dry-run "..."` previews the plan without executing

---

## Philosophy

1. **Roles, not prompts.** Each agent encodes a specific professional perspective. A security officer thinks differently than a designer.
2. **Agents check agents.** No output ships without a second agent reviewing it.
3. **Memory compounds.** The longer you use ag-stack, the better it knows your codebase.
4. **Skills, not tools.** Every capability is a readable Markdown file. No proprietary runtime.
5. **No lazy outputs.** "Can't reproduce," "pre-existing," and "looks fine" are banned without evidence.

---

## License

MIT
