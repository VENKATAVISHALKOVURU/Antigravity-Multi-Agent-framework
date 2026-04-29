<div align="center">

<img src="https://img.shields.io/github/stars/VENKATAVISHALKOVURU/Antigravity-Multi-Agent-framework?style=social" />
<img src="https://img.shields.io/badge/agents-9-blueviolet" />
<img src="https://img.shields.io/badge/AntiGravity-native-black" />
<img src="https://img.shields.io/badge/license-MIT-green" />

# ag-stack

**9 specialist AI agents that install into AntiGravity as native Skills.**  
One phrase triggers the full team. Every agent runs in sequence. Each one gates the next.

</div>

---

## Install (3 commands)

```bash
git clone https://github.com/VENKATAVISHALKOVURU/Antigravity-Multi-Agent-framework ~/ag-stack
node ~/ag-stack/install.js --global
# Restart AntiGravity
```

Global install path: `~/.gemini/antigravity/skills/` (Mac/Linux)  
Windows: `C:\Users\YourName\.gemini\antigravity\skills\`

---

## What activates all agents at once

Say any of these in AntiGravity chat:

```
"run the full pipeline"
"build and ship this"
"do everything"
"run the team"
"activate all agents"
```

The **ag-orchestrator** skill fires and chains all 8 agents in sequence:

```
🧠 CEO/Planner          → strategic review + execution plan
        │
   ┌────┴────┐
   ▼         ▼
🎨 Designer  ⚙️ Eng Manager   ← both run in parallel
   └────┬────┘
        │  ← GATE: both must approve before QA runs
        ▼
🔍 QA Lead              → browser testing + regression tests
        │  ← GATE: no open HIGH bugs before security runs
        ▼
🔒 Security Officer     → OWASP + STRIDE + secrets scan
        │  ← GATE: zero CRITICAL findings or deploy is blocked
        ▼
🚀 Release Manager      → tests → version bump → changelog → PR
        │
        ▼
📝 Doc Engineer         → syncs README, CHANGELOG, ARCHITECTURE
```

**Gates are enforced.** If Designer finds a BLOCKER — QA doesn't run until it's fixed.
If Security finds a CRITICAL — the deploy is hard-blocked. No exceptions.

---

## Or trigger individual agents

You can also trigger just one agent by describing what you need:

| What you say | Agent that activates |
|---|---|
| "Plan a SaaS billing feature" | 🧠 ag-ceo |
| "Review my code changes" | ⚙️ ag-eng-manager |
| "Check UI for accessibility" | 🎨 ag-designer |
| "Test the app in a browser" | 🔍 ag-qa |
| "Audit security before deploy" | 🔒 ag-security |
| "Ship this as a minor release" | 🚀 ag-release-manager |
| "Investigate this bug" | 🕵️ ag-detective |
| "Sync documentation" | 📝 ag-doc-engineer |

---

## The 9 skills installed

```
~/.gemini/antigravity/skills/
├── ag-orchestrator/SKILL.md   ← chains ALL agents in sequence (the conductor)
├── ag-ceo/SKILL.md            ← strategic planning + task breakdown
├── ag-designer/SKILL.md       ← UI/UX, a11y, mobile, AI slop detection
├── ag-eng-manager/SKILL.md    ← code review, security patterns, auto-lint
├── ag-qa/SKILL.md             ← browser testing, regression tests per bug
├── ag-security/SKILL.md       ← OWASP Top 10 + STRIDE + secrets scan
├── ag-release-manager/SKILL.md← semver + changelog + PR pipeline
├── ag-detective/SKILL.md      ← root cause analysis, never "can't reproduce"
└── ag-doc-engineer/SKILL.md   ← keeps README/CHANGELOG/ARCH in sync
```

---

## What the agents actually caught (real session)

| Bug | Agent | Would it have shipped? |
|---|---|---|
| OpenAI API key hardcoded in client bundle | 🔒 Security | Yes |
| Any user can read any other user's data | 🔒 Security | Yes |
| No rate limit on /upload endpoint | ⚙️ Eng Manager | Yes |
| PDF parse fails on encrypted files | ⚙️ Eng Manager | Yes |
| CTA button contrast 2.1:1 (needs 4.5:1) | 🎨 Designer | Yes |
| Layout breaks at 375px mobile | 🔍 QA Browser | Yes |
| Icon button with no accessible label | 🎨 Designer | Yes |

---

## Update

```bash
cd ~/ag-stack && git pull && node install.js --global
# Restart AntiGravity
```

MIT License — if ag-stack caught a bug before it shipped, ⭐ this repo.
