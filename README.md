<div align="center">

<img src="https://img.shields.io/github/stars/VENKATAVISHALKOVURU/Antigravity-Multi-Agent-framework?style=social" />
<img src="https://img.shields.io/badge/agents-8-blueviolet" />
<img src="https://img.shields.io/badge/AntiGravity-native-black" />
<img src="https://img.shields.io/badge/Cursor%20%7C%20Windsurf%20%7C%20Claude%20Code-supported-blue" />
<img src="https://img.shields.io/badge/license-MIT-green" />

# ag-stack

**8 specialist AI agents that install into AntiGravity as native Skills.**  
Active in every project. Triggered automatically by what you type. No config needed.

</div>

---

## Install (3 commands, works globally across all projects)

```bash
# 1. Clone the repo
git clone https://github.com/VENKATAVISHALKOVURU/Antigravity-Multi-Agent-framework ~/ag-stack

# 2. Install all 8 agents globally
node ~/ag-stack/install.js --global

# 3. Restart AntiGravity
```

That's it. All 8 agents are now active in **every project** you open in AntiGravity.

**Windows path:** `C:\Users\YourName\.gemini\antigravity\skills\`  
**Mac/Linux path:** `~/.gemini/antigravity/skills/`

---

## How it works after install

AntiGravity reads your request, matches it to the right agent, and activates it automatically.  
You don't type commands. You just describe what you want.

```
You say:  "Plan a SaaS billing feature with Stripe"
          → 🧠 ag-ceo activates: strategic review + phased execution plan

You say:  "Review my code changes before I merge"
          → ⚙️  ag-eng-manager activates: code review, security check, auto-lint

You say:  "Check the UI for accessibility and mobile issues"
          → 🎨 ag-designer activates: a11y audit, contrast, mobile, AI slop check

You say:  "Test the app in a browser and find bugs"
          → 🔍 ag-qa activates: browser testing, regression tests per bug

You say:  "Audit security before I deploy to production"
          → 🔒 ag-security activates: OWASP Top 10 + STRIDE + secrets scan

You say:  "Ship this as a minor release with a PR"
          → 🚀 ag-release-manager activates: tests → version → changelog → PR

You say:  "Investigate why users are being logged out after 24 hours"
          → 🕵️  ag-detective activates: root cause, call graph, regression test

You say:  "Sync the docs after today's changes"
          → 📝 ag-doc-engineer activates: README, CHANGELOG, ARCHITECTURE sync
```

---

## The 8 agents and what makes them different

| Agent | Activates on | What it actually does |
|---|---|---|
| 🧠 **ag-ceo** | "plan", "what should I build", "break this down" | CEO + Designer + Eng review in one pass. Only surfaces taste decisions. |
| 🎨 **ag-designer** | "UI review", "accessibility", "mobile", "looks" | Catches AI slop, WCAG contrast, tap target sizes, missing error states |
| ⚙️ **ag-eng-manager** | "code review", "review PR", "before I merge" | N+1 queries, SQL injection, empty catch blocks, auto-fixes lint |
| 🔍 **ag-qa** | "test", "QA", "find bugs", "browser" | Opens browser, clicks flows, writes regression test for every bug found |
| 🔒 **ag-security** | "security", "before deploy", "audit" | Scans secrets in code + git history, OWASP Top 10, STRIDE model |
| 🚀 **ag-release-manager** | "ship", "release", "open PR", "deploy" | Tests → lint → semver bump → changelog → tag → PR opened |
| 🕵️ **ag-detective** | "investigate", "why is", "root cause", "bug" | Walks call graph, proves root cause, never says "can't reproduce" |
| 📝 **ag-doc-engineer** | "update docs", "sync readme", "documentation" | Diffs code vs docs, updates what drifted, commits the fix |

---

## The pipeline — agents check each other

```
Your goal
    │
    ▼
🧠 CEO/Planner        "Plan a billing system"
    │
    ├─────────────────────────────┐
    ▼                             ▼
🎨 Designer (parallel)      ⚙️ Eng Manager (parallel)
"Check UI/UX"               "Review code"
    │                             │
    └────── both must approve ────┘
                   │
                   ▼
          🔍 QA Lead
          "Test in browser"
                   │
                   ▼
          🔒 Security Officer
          "Audit before ship"
                   │
                   ▼
          🚀 Release Manager
          "Ship the PR"
```

Security CRITICAL findings block the deploy. Always. No exceptions.

---

## What these agents actually caught

Real bugs found during a SaaS session — every one would have shipped without ag-stack:

| Bug | Agent | Severity |
|---|---|---|
| OpenAI API key hardcoded in client-side bundle | 🔒 Security | 🔴 CRITICAL |
| Any user can read any other user's results (IDOR) | 🔒 Security | 🔴 HIGH |
| No rate limit on /upload — trivial to hammer | ⚙️ Eng Manager | 🔴 BLOCKER |
| PDF parse fails silently on encrypted files | ⚙️ Eng Manager | 🔴 BLOCKER |
| CTA button contrast ratio 2.1:1 (WCAG needs 4.5:1) | 🎨 Designer | 🟠 BLOCKER |
| Layout breaks at 375px mobile width | 🔍 QA Browser | 🟠 HIGH |
| Icon-only button with no accessible label | 🎨 Designer | 🟠 HIGH |

---

## Install options

```bash
# Global — active in every project (recommended)
node ~/ag-stack/install.js --global

# Per-project — active only in current folder
node ~/ag-stack/install.js --project

# Update to latest agents
cd ~/ag-stack && git pull && node install.js --global
```

**Where files go:**
- Global (Mac/Linux): `~/.gemini/antigravity/skills/ag-*/SKILL.md`
- Global (Windows): `C:\Users\You\.gemini\antigravity\skills\ag-*\SKILL.md`
- Per project: `.agent/skills/ag-*/SKILL.md`

---

## Works in other AI coding tools too

Same skill files work everywhere because they all use the same SKILL.md format:

| Tool | Install path |
|---|---|
| **AntiGravity** | `~/.gemini/antigravity/skills/` (global) or `.agent/skills/` (project) |
| **Cursor** | `.cursor/skills/` or `.agent/skills/` |
| **Windsurf** | `.agent/skills/` |
| **Claude Code** | `.claude/commands/` |
| **Gemini CLI** | `~/.gemini/skills/` |

---

## File structure

```
ag-stack/
├── install.js                      ← node install.js --global
├── skills/
│   ├── ag-ceo/SKILL.md             ← Strategic planning agent
│   ├── ag-designer/SKILL.md        ← UI/UX review agent
│   ├── ag-eng-manager/SKILL.md     ← Code review agent
│   ├── ag-qa/SKILL.md              ← Browser testing agent
│   ├── ag-security/SKILL.md        ← Security audit agent
│   ├── ag-release-manager/SKILL.md ← Ship pipeline agent
│   ├── ag-detective/SKILL.md       ← Bug investigation agent
│   └── ag-doc-engineer/SKILL.md    ← Documentation sync agent
├── agents/                         ← Node.js agent implementations
├── orchestrator/                   ← Pipeline engine
└── README.md
```

---

If ag-stack caught a bug before it shipped — ⭐ this repo.

MIT License
