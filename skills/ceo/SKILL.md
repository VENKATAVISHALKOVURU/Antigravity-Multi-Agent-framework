# /autoplan · CEO + Planner

**Strategic review + execution plan. Three lenses: CEO, Designer, Eng Manager.**

Run this before building anything non-trivial. Surfaces only the decisions that require your taste.

---

## When to run
- Starting any new feature
- Changing product direction
- Unsure about scope or approach
- Estimating effort before committing

## What it does

1. **CEO Review** — Is this the right problem? Is the goal concrete? What's the riskiest assumption?
2. **Design Review** (if UI scope) — Is the flow right? Error states? Mobile?
3. **Eng Review** — Architecture fit? N+1 risks? Missing indexes? Auth?
4. **Execution Plan** — Phases, tasks, owners, estimates
5. **Taste Decisions** — Only surfaces decisions that genuinely need your input

## Output

- `.ag/plan.json` — structured execution plan
- `.ag/ceo-verdict.json` — strategic verdict for next agents
- Terminal summary with taste decisions

## Anti-patterns

- Do not ask clarifying questions before running the review
- Do not surface engineering decisions as taste decisions
- Do not produce a plan that is just a restatement of the input
- Do not skip any review stage even for "small" goals
