<div align="center">

<img src="https://img.shields.io/github/stars/VENKATAVISHALKOVURU/Antigravity-Multi-Agent-framework?style=social" />
<img src="https://img.shields.io/badge/agents-8-blueviolet" />
<img src="https://img.shields.io/badge/AntiGravity-native-black" />
<img src="https://img.shields.io/badge/works%20in-Cursor%20%7C%20Windsurf%20%7C%20Claude%20Code-blue" />
<img src="https://img.shields.io/badge/license-MIT-green" />

# ag-stack

**8 specialist AI agents that live inside AntiGravity (and Cursor, Windsurf, Claude Code).**  
They plan, design, build, test, audit, and ship — checking each other's work at every step.

</div>

---

## Install in 30 seconds

```bash
# Clone once anywhere on your machine
git clone https://github.com/VENKATAVISHALKOVURU/Antigravity-Multi-Agent-framework ~/ag-stack

# Install globally — works in ALL your projects
bash ~/ag-stack/install/install.sh --global

# OR install just for current project
bash ~/ag-stack/install/install.sh --project
```

**Restart AntiGravity. The agents are now active.** No config. No API keys. No setup.

---

## How it activates

AntiGravity automatically reads skill files from:
- **Global:** `~/.gemini/antigravity/skills/` — active in every project
- **Per project:** `.agent/skills/` — active only in that project

The installer drops all 8 agent skill files into whichever location you choose.  
When you describe a task, AntiGravity picks the right agent automatically.

```
You type:  "Plan a SaaS billing feature with Stripe"
           → ag-ceo activates: strategic review + execution plan

You type:  "Review my code changes"  
           → ag-eng-manager activates: code review + auto-lint

You type:  "Test the app in a browser"
           → ag-qa activates: Playwright browser testing

You type:  "Check security before I deploy"
           → ag-security activates: OWASP Top 10 + STRIDE audit

You type:  "Ship this as a patch release"
           → ag-release-manager activates: tests → version → changelog → PR
```

No slash commands needed. Just describe what you want.

---

## The 8 agents

| Agent | Activates when you say... | What it does |
|---|---|---|
| 🧠 **ag-ceo** | "plan", "break down", "what should I build" | Strategic review + phased execution plan |
| 🎨 **ag-designer** | "review UI", "check accessibility", "mobile" | Catches AI slop, a11y, contrast, mobile bugs |
| ⚙️ **ag-eng-manager** | "review code", "check PR", "before I merge" | Code review: N+1s, injection, missing auth, auto-lint |
| 🔍 **ag-qa** | "test this", "QA", "browser testing" | Real browser testing + regression tests per bug |
| 🔒 **ag-security** | "security audit", "check before deploy" | OWASP Top 10 + STRIDE + secrets scan |
| 🚀 **ag-release-manager** | "ship this", "open a PR", "release" | Tests → semver → changelog → PR |
| 🕵️ **ag-detective** | "investigate", "root cause", "why is this broken" | Traces bugs to source. Never says "can't reproduce." |
| 📝 **ag-doc-engineer** | "update docs", "sync readme" | Keeps all docs current after every change |

---

## How agents check each other

Each agent writes a structured verdict before the next one runs:

```
🧠 CEO approves the plan
        ↓
🎨 Designer reviews UI     ⚙️ Eng Manager reviews code   (parallel)
        ↓                          ↓
        └──────── both approve ────┘
                        ↓
              🔍 QA tests in browser
                        ↓
              🔒 Security audits code
                        ↓
              🚀 Release Manager ships
```

No single agent has unchecked authority. A security CRITICAL blocks the deploy — always.

---

## Works in all AI coding tools

| Tool | How skills load |
|---|---|
| **AntiGravity** | `~/.gemini/antigravity/skills/` or `.agent/skills/` — auto-detected |
| **Cursor** | Copy `.agent/skills/` into project, or add to `.cursorrules` |
| **Windsurf** | Same as Cursor — `.agent/skills/` in project root |
| **Claude Code** | Skills auto-load from `.agent/skills/` |

---

## Real bugs these agents caught

| Bug | Agent | Would it have shipped? |
|---|---|---|
| OpenAI API key hardcoded in client bundle | 🔒 Security | Yes — 100% |
| Any user can read any other user's data (IDOR) | 🔒 Security | Yes |
| No rate limit on /upload — trivial to DDoS | ⚙️ Eng Manager | Yes |
| PDF parse fails silently on encrypted files | ⚙️ Eng Manager | Yes |
| CTA button contrast ratio 2.1:1 (need 4.5:1) | 🎨 Designer | Yes |
| Layout breaks at 375px mobile | 🔍 QA Browser | Yes |
| Submit button has no accessible label | 🎨 Designer | Yes |

---

## Update

```bash
cd ~/ag-stack
git pull
bash install/install.sh --global  # re-installs updated skills
```

---

## Contributing

Each agent is a single `SKILL.md` file in `skills/agent-name/`. Easy to improve, fork, or add new roles.

If ag-stack caught a bug before it shipped — ⭐ this repo.

---

MIT License
