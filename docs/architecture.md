# ag-stack Architecture

## Overview

ag-stack is a multi-agent autonomous engineering team. It is not a chatbot wrapper or a prompt library. It is an execution framework where specialist agents check each other's work before anything ships.

---

## Agent Pipeline

```
User Goal (string)
     │
     ▼
┌──────────────────────────────────────────────────────┐
│                   CEO / Planner                       │
│  Strategic review → decompose → plan.json → verdict  │
└──────────────────────────┬───────────────────────────┘
                           │ ceo-verdict.json
          ┌────────────────┴────────────────┐
          │                                 │
          ▼ (if UI scope)                   ▼ (always)
┌─────────────────────┐         ┌─────────────────────┐
│      Designer        │         │    Eng Manager       │
│  UI/UX/a11y review  │         │  Code review + lint  │
└──────────┬──────────┘         └──────────┬──────────┘
           │ designer-verdict              │ eng-manager-verdict
           └────────────┬─────────────────┘
                        │ (both must approve)
                        ▼
            ┌─────────────────────┐
            │      QA Lead        │
            │  Browser testing    │
            │  Regression tests   │
            └──────────┬──────────┘
                       │ qa-verdict.json
                       ▼
            ┌─────────────────────┐
            │  Security Officer   │
            │  OWASP + STRIDE     │
            └──────────┬──────────┘
                       │ security-verdict.json
                       ▼
            ┌─────────────────────┐
            │  Release Manager    │
            │  Version + PR + Ship │
            └─────────────────────┘
```

---

## Verdict Schema

Every agent writes a verdict that the next agent reads before acting:

```typescript
interface AgentVerdict {
  agent: string;           // Agent name
  role: string;            // Role description
  verdict: 'APPROVED' | 'CHANGES_REQUIRED' | 'BLOCKED' | 'NEEDS_INPUT';
  timestamp: string;       // ISO 8601
  approved_for: string;    // Next agent name (null if blocked)
  blockers: Finding[];     // Must fix before proceeding
  warnings: Finding[];     // Should fix before ship
  suggestions: Finding[];  // Nice to have
  data: Record<string, any>; // Agent-specific payload
}

interface Finding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SUGGESTION';
  issue: string;           // What is wrong
  file: string | null;     // Which file
  line: number | null;     // Which line
  fix: string | null;      // How to fix it
}
```

Verdicts are written to `.ag/{agent-name}-verdict.json`.

---

## Memory System

Two memory layers:

1. **Session state** (`.ag/*.json`) — per-run verdicts, plan, run log
2. **Persistent workspace** (`memory/workspace.json`) — accumulated project knowledge

`workspace.json` stores:
- Project name and stack
- File/folder conventions
- Known pitfalls (e.g. "PDF.js crashes on Node 22")
- Agent preferences
- History of retros, ships, and plans

---

## Orchestration Engine

`orchestrator/engine.js` coordinates the pipeline:

- **Sequential stages**: CEO → Designer+EngManager → QA → Security → Release
- **Parallel stages**: Designer and EngManager run in parallel when `parallelReview: true`
- **Retry logic**: Each agent has up to `maxRetries` attempts (default: 3)
- **Recovery**: `orchestrator/recovery.js` classifies errors and attempts auto-recovery
- **Dry run**: `--dry-run` flag shows plan without executing

---

## File Layout

```
ag-stack/
├── ag.js                          ← CLI entry point
├── agents/
│   ├── base.js                    ← BaseAgent: verdict schema, memory, logging
│   ├── ceo.js                     ← CEO / Planner
│   ├── designer.js                ← Designer
│   ├── eng-manager.js             ← Engineering Manager
│   ├── qa.js                      ← QA Lead (Playwright browser tests)
│   ├── security.js                ← Security Officer (OWASP + STRIDE)
│   ├── release-manager.js         ← Release Manager
│   ├── detective.js               ← Bug Detective
│   └── doc-engineer.js            ← Doc Engineer
├── orchestrator/
│   ├── engine.js                  ← Pipeline coordinator
│   ├── router.js                  ← Task → agent routing
│   └── recovery.js                ← Error recovery + rollback
├── skills/                        ← Skill documentation (one per agent)
├── memory/
│   ├── workspace.json             ← Persistent project memory
│   └── learnings/                 ← Session notes
├── bin/                           ← CLI scripts
└── .ag/                           ← Runtime state (gitignored)
```

---

## Adding a New Agent

1. Create `agents/my-agent.js` extending `BaseAgent`
2. Add skill doc at `skills/my-agent/SKILL.md`
3. Register in `orchestrator/engine.js`
4. Add CLI command in `ag.js`
5. Document in `docs/architecture.md` (this file)

See `docs/adding-agents.md` for the full guide.
