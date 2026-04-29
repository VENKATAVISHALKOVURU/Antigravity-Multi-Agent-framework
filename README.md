<div align="center">

<img src="https://img.shields.io/github/stars/VENKATAVISHALKOVURU/Antigravity-Multi-Agent-framework?style=social" />
<img src="https://img.shields.io/badge/agents-8-blueviolet" />
<img src="https://img.shields.io/badge/AntiGravity-native-black" />
<img src="https://img.shields.io/badge/license-MIT-green" />
<img src="https://img.shields.io/badge/version-1.0.0-blue" />

# 🚀 ag-stack

### A virtual engineering team inside your AI coding tool.
### 8 specialist agents that plan, design, build, test, audit, and ship — **checking each other's work at every step.**

*Inspired by [Garry Tan's gstack](https://github.com/garrytan/gstack) — rebuilt natively for AntiGravity.*

</div>

---

## The problem

You're vibe coding. You ship fast. But:
- The AI writes SQL injection vulnerabilities nobody catches
- UI looks like default Tailwind — generic, no character
- Tests don't exist until QA finds the bug in production
- "Can't reproduce" is the default answer to every bug report

**ag-stack fixes this by giving your AI coding tool a full engineering team that checks each other.**

---

## How it works

```
Your goal
    │
    ▼
🧠 CEO/Planner      → breaks down goal, strategic review, execution plan
    │
    ├──────────────────────────┐
    ▼                          ▼
🎨 Designer (parallel)    ⚙️ Eng Manager (parallel)
UI/UX, a11y, mobile       code review, security patterns, auto-lint
    │                          │
    └──────────┬───────────────┘
               │  both must approve
               ▼
🔍 QA Lead              → real Chromium browser, clicks every flow, regression tests
               │
               ▼
🔒 Security Officer     → OWASP Top 10 + STRIDE, secrets scan, blocks deploy if CRITICAL
               │
               ▼
🚀 Release Manager      → tests → semver bump → changelog → PR opened
```

Every agent writes a structured verdict. The next agent reads it before acting. **No single agent ships alone.**

---

## The team

| Command | Agent | What it does |
|---|---|---|
| `/autoplan` | 🧠 CEO + Planner | Strategic review → execution plan → only surfaces taste decisions |
| `/design-review` | 🎨 Designer | Catches AI slop UI, enforces a11y, mobile, contrast ratios |
| `/review` | ⚙️ Eng Manager | Code review: N+1s, injection, missing auth, auto-fixes lint |
| `/qa` | 🔍 QA Lead | Real Chromium browser, writes regression test per bug found |
| `/security` | 🔒 Security Officer | OWASP Top 10 + STRIDE, secrets scan, auth audit |
| `/ship` | 🚀 Release Manager | Tests → lint → semver → changelog → PR |
| `/investigate` | 🕵️ Detective | Root cause analysis. Never says "can't reproduce." |
| `/docs` | 📝 Doc Engineer | Keeps README, CHANGELOG, ARCHITECTURE always in sync |

---

## Quick Start

### In AntiGravity (or Cursor, Windsurf, Claude Code)

```bash
# 1. Clone
git clone https://github.com/VENKATAVISHALKOVURU/Antigravity-Multi-Agent-framework

# 2. Drop into your project
cp Antigravity-Multi-Agent-framework/ANTIGRAVITY.md your-project/
cp -r Antigravity-Multi-Agent-framework/memory your-project/

# 3. Open your project in AntiGravity and type:
/autoplan Build a SaaS landing page with Stripe payments and auth
```

The full agent team activates immediately.

### As a CLI

```bash
npm install
node ag.js autoplan "Build a REST API with JWT auth and Postgres"
node ag.js review
node ag.js qa
node ag.js security
node ag.js ship minor

# Full autonomous pipeline end-to-end
node ag.js run "Build AI startup MVP" --bump minor
node ag.js run "Build AI startup MVP" --dry-run   # preview only
```

---

## Works with any AI coding tool

| Tool | How to use |
|---|---|
| **AntiGravity** | Copy `ANTIGRAVITY.md` to project root — auto-loaded |
| **Claude Code** | Rename to `CLAUDE.md` |
| **Cursor** | Add contents to `.cursorrules` |
| **Windsurf** | Add to project context |

---

## What agents actually caught (real session)

Building an AI resume screener — here's what the team found that would have shipped otherwise:

| Finding | Agent | Severity |
|---|---|---|
| OpenAI API key hardcoded in client bundle | 🔒 Security | 🔴 CRITICAL |
| Any user can read any other user's results (IDOR) | 🔒 Security | 🔴 HIGH |
| No rate limit on /upload endpoint | ⚙️ Eng Manager | 🔴 BLOCKER |
| PDF parse fails silently on encrypted files | ⚙️ Eng Manager | 🔴 BLOCKER |
| Score badge contrast ratio 2.1:1 (WCAG needs 4.5:1) | 🎨 Designer | 🟠 BLOCKER |
| Layout breaks on 375px mobile viewport | 🔍 QA Browser | 🟠 HIGH |
| Submit button has no accessible label | 🎨 Designer | 🟠 HIGH |

Every single one would have shipped without ag-stack.

---

## Memory — gets smarter every session

```json
{
  "project": "resume-screener",
  "stack": ["Next.js 14", "Postgres", "OpenAI"],
  "pitfalls": [
    "PDF.js crashes on Node 22 — pin to Node 20",
    "OpenAI streaming does not flush on Vercel Edge — use Node runtime"
  ],
  "conventions": {
    "api_routes": "app/api/**/route.ts",
    "tests": "*.test.ts adjacent to source file"
  }
}
```

Day 30 is meaningfully smarter than Day 1.

---

## Contributing

Each agent is one JS file + one Markdown skill doc. Easy to add new roles.
See [`docs/adding-agents.md`](docs/adding-agents.md).

PRs welcome. If ag-stack caught a bug before it shipped — ⭐ this repo.

---

## License

MIT
