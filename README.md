<div align="center">

<img src="https://img.shields.io/github/stars/VENKATAVISHALKOVURU/Antigravity-Multi-Agent-framework?style=social" />
<img src="https://img.shields.io/badge/AntiGravity-native%20skill-black" />
<img src="https://img.shields.io/badge/agents-8-blueviolet" />
<img src="https://img.shields.io/badge/license-MIT-green" />

# ag-stack

**One AntiGravity skill. 8 agents that run in sequence. Each one verifies the previous before moving forward.**

</div>

---

## Install

```bash
git clone https://github.com/VENKATAVISHALKOVURU/Antigravity-Multi-Agent-framework ~/ag-stack
node ~/ag-stack/install.js
```

Installs to `~/.gemini/antigravity/skills/ag-stack/` — active in **every project** automatically.

**Restart AntiGravity. Done.**

---

## How to use it

Say any of these in AntiGravity chat:

```
"run the full pipeline on [your goal]"
"build and ship [feature]"
"do everything for [task]"
"run all agents"
```

AntiGravity loads the ag-stack skill and runs all 8 agents in sequence.

---

## What actually happens

```
Stage 1   🧠 CEO/Planner       Plan goal. Detect scope. List tasks.
             │
             │  ← GATE: goal must be clear enough to build
             │
Stage 2A  🎨 Designer  ──────┐  run in parallel
Stage 2B  ⚙️  Eng Manager ───┘
             │
             │  ← GATE: both must report 0 blockers before QA runs
             │
Stage 3   🔍 QA Lead          Test in real browser. Write regression test per bug.
             │
             │  ← GATE: no open HIGH bugs before security runs
             │
Stage 4   🔒 Security         OWASP + secrets scan + STRIDE
             │
             │  ← GATE: zero CRITICAL findings or deploy is hard-blocked
             │
Stage 5   🚀 Release Manager  Tests → version bump → changelog → PR
             │
Stage 6   📝 Doc Engineer     Sync README, CHANGELOG, ARCHITECTURE
```

Each gate is real. If Designer finds a blocker → **QA does not run**.
If Security finds a critical → **Release Manager does not run**. Ever.

---

## After a gate blocks

If an agent finds blockers, the pipeline stops and tells you exactly what to fix.

After you fix it, say:
```
"continue pipeline"
```
ag-stack reads `.agent/pipeline/` to see where it stopped and resumes from the next stage. It does not re-run completed stages.

---

## Check pipeline status anytime

```bash
bash .agent/skills/ag-stack/scripts/pipeline-status.sh
```

Output:
```
╔══════════════════════════════════════════════════════════╗
║              ag-stack Pipeline Status                    ║
╠══════════════════════════════════════════════════════════╣
║  1  🧠 CEO/Planner          ✅ COMPLETE                  ║
║  2A 🎨 Designer             🚫 BLOCKED                   ║
║  2B ⚙️  Eng Manager          ✅ COMPLETE                  ║
║  3  🔍 QA Lead              ⬜ NOT RUN                   ║
║  4  🔒 Security Officer     ⬜ NOT RUN                   ║
║  5  🚀 Release Manager      ⬜ NOT RUN                   ║
║  6  📝 Doc Engineer         ⬜ NOT RUN                   ║
╚══════════════════════════════════════════════════════════╝

  Blockers in 02-designer:
    - src/components/Hero.tsx:42 — contrast 2.1:1 → Fix: change #999 to #555
```

---

## What each agent checks

| Agent | What it actually does |
|---|---|
| 🧠 CEO | Strategic review. Scope detection. Phased plan. Surfaces only taste decisions. |
| 🎨 Designer | AI slop detection. WCAG contrast. Mobile 375px. Tap targets. Error/loading states. |
| ⚙️ Eng Manager | SQL injection. Empty catch blocks. N+1 queries. Auto-fixes lint and commits it. |
| 🔍 QA Lead | Opens browser. Clicks every flow. Writes regression test before fixing every bug. |
| 🔒 Security | Scans secrets in code + git history. OWASP Top 10. STRIDE. npm audit. |
| 🚀 Release Manager | Verifies branch ≠ main. Tests pass. Bumps version. Writes real CHANGELOG. Opens PR. |
| 📝 Doc Engineer | Checks README version, CHANGELOG entry, ARCHITECTURE vs actual code. |

---

## Per-project install (instead of global)

```bash
node ~/ag-stack/install.js --project
```

Installs to `.agent/skills/ag-stack/` in your current project only.

---

## Update

```bash
cd ~/ag-stack && git pull && node install.js
# Restart AntiGravity
```

MIT License
