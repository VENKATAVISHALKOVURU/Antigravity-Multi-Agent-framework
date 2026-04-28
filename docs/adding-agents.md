# Adding a New Agent to ag-stack

This guide walks through creating a new specialist agent from scratch.

---

## Step 1: Create the agent file

```js
// agents/my-agent.js
const { BaseAgent, VERDICTS, SEVERITIES } = require('./base');

class MyAgent extends BaseAgent {
  constructor() {
    super(
      'my-agent',          // Agent name (used in verdict file)
      'My Agent Role',     // Human-readable role description  
      'next-agent-name'    // Who receives this agent's verdict
    );
  }

  async run(options = {}) {
    this.banner('My Agent — doing its thing');

    // 1. Optionally require a previous agent's approval
    // this.requireApprovalFrom('ceo');

    // 2. Read project memory
    const memory = this.readMemory();

    // 3. Do your checks
    const blockers = [];
    const warnings = [];
    const suggestions = [];

    // Add findings:
    // blockers.push(this.finding(SEVERITIES.HIGH, 'issue', 'file.ts', 42, 'how to fix'));
    // warnings.push(this.finding(SEVERITIES.MEDIUM, 'issue', 'file.ts'));
    // suggestions.push(this.finding(SEVERITIES.SUGGESTION, 'nice to have'));

    // 4. Print summary
    this.printSummary(blockers, warnings, suggestions);

    // 5. Write verdict
    const verdict = blockers.length === 0 ? VERDICTS.APPROVED : VERDICTS.CHANGES_REQUIRED;
    return this.writeVerdict({ verdict, blockers, warnings, suggestions });
  }
}

module.exports = { MyAgent };
```

---

## Step 2: Add the skill doc

Create `skills/my-agent/SKILL.md`:

```markdown
# /my-command · My Agent Role

**One sentence: what does this agent do?**

## When to run
- [trigger conditions]

## Checks
- [what it checks]

## Output
- `.ag/my-agent-verdict.json`
- [other outputs]

## Anti-patterns
- [what this agent never does]
```

---

## Step 3: Register in the engine

In `orchestrator/engine.js`:

```js
const { MyAgent } = require('../agents/my-agent');

// Add a method:
async myAgent() {
  this.log('ENGINE', 'Starting /my-command');
  const agent = new MyAgent();
  return this.runWithRetry(() => agent.run(), 'my-agent');
}
```

---

## Step 4: Add CLI command

In `ag.js`:

```js
case 'my-command':
  await engine.myAgent();
  break;
```

---

## Step 5: Add to pipeline (if needed)

If this agent should run automatically in the full pipeline, add it to `fullPipeline()` in `orchestrator/engine.js` in the correct position.

---

## BaseAgent API reference

```js
// Require a previous agent approved before this one runs
this.requireApprovalFrom('eng-manager');

// Read a previous agent's verdict without hard-stopping
const verdict = this.readVerdict('designer');

// Read/write project memory
const memory = this.readMemory();
this.writeMemory({ myKey: 'value' });

// Create a finding object
this.finding(severity, issue, file, line, fix)

// Write verdict output
this.writeVerdict({ verdict, blockers, warnings, suggestions, data })

// Logging
this.log('LEVEL', 'message');
this.banner('Section Title');
this.printSummary(blockers, warnings, suggestions);
```
