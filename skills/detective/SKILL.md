# /investigate · Detective

**Root cause analysis. Walk the call graph. Never says "can't reproduce."**

---

## Protocol

1. **Parse** — Extract symptom, keywords, context from bug report
2. **Search** — Find relevant files via keyword grep + recent git changes
3. **Reproduce** — Run targeted tests. If fails: confirmed. If passes: check main.
4. **Pre-existing check** — `git stash && npm test && git stash pop`. Need commit hash as evidence.
5. **Call graph** — Walk from error site backwards to origin
6. **Root cause** — One sentence. Concrete. No hedging. No "might be."
7. **Regression test** — Write test BEFORE fixing. Commit it.
8. **Fix** — Apply, verify test passes, commit.

## Root cause statement format

```
ROOT CAUSE: [One sentence. File:line. What it does wrong.]
EVIDENCE: [Code that proves it]
WHY NOW: [What changed that exposed this?]
```

## Anti-patterns (violation = restart from Step 1)

- "I could not reproduce" without running `git stash && npm test && git stash pop`
- "Pre-existing" without a commit hash
- Fixing the symptom instead of root cause
- Root cause contains "might," "possibly," or "could be"
- Fixing before writing the regression test
