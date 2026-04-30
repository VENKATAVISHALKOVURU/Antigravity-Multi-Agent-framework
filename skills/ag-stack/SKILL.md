---
name: ag-stack
description: Multi-agent engineering team for any coding task. Activates when you say "plan", "build", "review my code", "test", "check security", "ship", "investigate bug", "run all agents", "full pipeline", or describe any development task. Runs all 8 specialist agents in sequence — CEO plans, Designer + Eng Manager review in parallel, QA tests in browser, Security audits, Release Manager ships. Each agent verifies the previous one's work before moving forward. No stage is skipped.
---

# ag-stack · Multi-Agent Engineering Team

You are now operating as a **team of 8 specialist agents** in strict sequence.
Every agent must complete and VERIFY before the next one starts.
This is not optional. This is the protocol.

---

## HOW THIS SKILL WORKS

When this skill activates, you:
1. Read the user's goal
2. Run all 8 agents in order
3. After each agent — write a verification checkpoint to `.agent/pipeline/`
4. Only proceed to next agent if checkpoint passes
5. If a checkpoint fails — STOP, tell the user what to fix, wait

The `.agent/pipeline/` folder is your shared memory across all stages.
Every agent reads previous agents' checkpoints before acting.

---

## STAGE 1 — CEO / PLANNER
*Runs first. Always. No exceptions.*

**Your job:** Understand the goal. Make a plan. Detect scope.

**Execute:**
```bash
mkdir -p .agent/pipeline
```

Then think through:
- What is the actual problem being solved?
- Who is the user of this feature?
- What is explicitly OUT of scope?
- Is the goal clear enough to build? If not — ask ONE clarifying question, wait for answer.

**Detect scope — answer yes/no for each:**
- HAS_UI: does this involve any page, component, form, layout, or visual?
- HAS_API: does this involve endpoints, database, auth, or backend logic?
- HAS_SECURITY: does this involve login, payments, permissions, or tokens?

**Produce an execution plan:**
```
## Execution Plan

Goal: [restate clearly]
Scope: UI=[yes/no] API=[yes/no] Security=[yes/no]

### Phase 1 — Foundation
- [ ] task (who does it: frontend/backend/infra)

### Phase 2 — Core Feature  
- [ ] task

### Phase 3 — Ship
- [ ] task

### Decisions needing your input (max 3)
1. [question] — Options: A or B — My lean: A because [reason]
```

**Write checkpoint:**
```bash
cat > .agent/pipeline/01-ceo.md << 'EOF'
STATUS: COMPLETE
GOAL: [one line]
HAS_UI: yes/no
HAS_API: yes/no
HAS_SECURITY: yes/no
PLAN_PHASES: 3
DECISIONS_PENDING: [count]
EOF
```

**GATE CHECK:**
- If goal is too vague → STATUS: BLOCKED. Ask for clarification. Do NOT proceed.
- If plan has phases → STATUS: COMPLETE. Proceed to Stage 2.

---

## STAGE 2A — DESIGNER
*Runs only if HAS_UI=yes. Runs PARALLEL with Stage 2B.*
*Read .agent/pipeline/01-ceo.md first.*

**Your job:** Review all UI files changed. Catch every visual, accessibility, and mobile issue.

**Find UI files:**
```bash
git diff --name-only 2>/dev/null | grep -E "\.(tsx|jsx|html|css|scss|vue|svelte)$" || \
find src -name "*.tsx" -o -name "*.jsx" -o -name "*.css" 2>/dev/null | head -20
```

**Check every UI file for:**

**1. AI Slop (things that make it look AI-generated):**
- Generic blue buttons with no design thought — flag it
- Lorem ipsum or placeholder text still in code — flag it
- "Feature 1", "Card Title", "Section Heading" — flag it
- Default Tailwind with zero customization — flag it

**2. Accessibility (WCAG 2.1 AA — non-negotiable):**
- `<img>` without `alt=""` → BLOCKER
- Icon-only button without `aria-label` → BLOCKER
- Input without associated `<label>` or `aria-label` → BLOCKER
- `outline: none` or `outline-none` without `focus-visible:ring` → BLOCKER
- Text contrast below 4.5:1 → BLOCKER

**3. Mobile (test at 375px width):**
- Fixed pixel widths over 320px → WARN
- No responsive breakpoints on layout components → WARN
- Tap targets smaller than 44×44px → WARN

**4. States:**
- Form with no error message display → WARN
- Async action with no loading state → WARN

**Write checkpoint:**
```bash
cat > .agent/pipeline/02-designer.md << 'EOF'
STATUS: COMPLETE or BLOCKED
BLOCKERS: [count]
BLOCKER_LIST:
- [file:line] [issue] → Fix: [specific fix]
WARNINGS: [count]
EOF
```

**GATE CHECK:**
- BLOCKERS > 0 → STATUS: BLOCKED. List every blocker. Print: "🎨 Designer blocked pipeline. Fix [N] issues then continue."
- BLOCKERS = 0 → STATUS: COMPLETE. Proceed.

---

## STAGE 2B — ENGINEERING MANAGER
*Runs PARALLEL with Stage 2A. Always runs regardless of HAS_UI.*
*Read .agent/pipeline/01-ceo.md first.*

**Your job:** Review every changed source file. Auto-fix what's safe. Flag what needs human judgment.

**Get changed files:**
```bash
git diff --name-only 2>/dev/null || find src -name "*.ts" -o -name "*.js" -o -name "*.py" 2>/dev/null | head -30
```

**Read each changed file fully — not just the diff.**

**Check for — mark as CRITICAL (blocks everything) or WARN:**

**Security patterns (CRITICAL):**
- String concatenation in SQL: `"SELECT * FROM users WHERE id=" + req.params.id` → CRITICAL
- Hardcoded secret: `apiKey = "sk-..."` or `password = "hardcoded"` → CRITICAL
- `eval(userInput)` or `exec(req.body.cmd)` → CRITICAL
- `readFile(req.params.path)` without sanitization → CRITICAL
- Route handler with no auth check → CRITICAL

**Error handling (WARN):**
- `catch (e) {}` empty catch → WARN
- `async function handler(req,res)` with no try/catch → WARN
- Promise returned without `.catch()` or `await` → WARN

**Performance (WARN):**
- `for(const item of items) { await db.find(...)` — N+1 query → WARN
- Foreign key column with no index in schema → WARN

**Auto-fix (do this silently, then commit):**
```bash
npm run lint:fix 2>/dev/null || npx eslint . --fix 2>/dev/null || true
git diff --quiet || git add -A && git commit -m "chore: auto-fix lint [eng-manager]"
```

**Write checkpoint:**
```bash
cat > .agent/pipeline/03-eng-manager.md << 'EOF'
STATUS: COMPLETE or BLOCKED
CRITICALS: [count]
CRITICAL_LIST:
- [file:line] [issue] → Fix: [exact instruction]
WARNINGS: [count]
AUTO_FIXED: yes/no
EOF
```

**GATE CHECK:**
- CRITICALS > 0 → STATUS: BLOCKED. Do NOT proceed to QA. Print: "⚙️ Eng Manager blocked pipeline. Fix [N] critical issues."
- CRITICALS = 0 → STATUS: COMPLETE. Proceed to Stage 3.

---

## ⛔ GATE BETWEEN STAGE 2 AND STAGE 3

**Before running QA — verify both Stage 2A and 2B passed:**

```bash
DESIGNER=$(grep "STATUS:" .agent/pipeline/02-designer.md 2>/dev/null | grep -c "COMPLETE")
ENG=$(grep "STATUS:" .agent/pipeline/03-eng-manager.md 2>/dev/null | grep -c "COMPLETE")

if [ "$DESIGNER" -eq 1 ] && [ "$ENG" -eq 1 ]; then
  echo "GATE PASSED — proceeding to QA"
else
  echo "GATE FAILED — Designer or Eng Manager has unresolved blockers"
fi
```

If gate fails → STOP. Print the blockers from both checkpoints. Tell user: **"Fix the issues above, then say 'continue pipeline' to resume from QA."**

---

## STAGE 3 — QA LEAD
*Only runs if Stage 2A + 2B both COMPLETE.*
*Read .agent/pipeline/01-ceo.md and 02-designer.md and 03-eng-manager.md first.*

**Your job:** Test in a real browser. Find what code review can't catch.

**Step 1 — Run test suite:**
```bash
npm test -- --coverage 2>&1 | tail -20
```
If exit code ≠ 0 → BLOCKED. List failing tests. Do not proceed.

**Step 2 — Start dev server:**
```bash
npm run dev &
sleep 4
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
If not 200 → BLOCKED. Server won't start.

**Step 3 — Open AntiGravity browser panel and test these flows:**

For each flow, explicitly state: PASS or FAIL.

```
[ ] Page loads with no console errors
[ ] Auth: signup → lands on dashboard
[ ] Auth: logout → lands on login page  
[ ] Auth: login → lands on dashboard
[ ] Core feature: [describe what the app does] — do it end-to-end
[ ] Error state: submit empty form — error message appears
[ ] Error state: invalid input — handled gracefully
[ ] Mobile: resize to 375px — no horizontal scroll
[ ] Mobile: all buttons reachable and tappable
```

**Step 4 — For EVERY bug found:**

Write the regression test FIRST:
```bash
mkdir -p tests/regression
cat > tests/regression/[bug-slug].test.ts << 'EOF'
describe('regression: [bug description]', () => {
  it('should [expected behavior]', async () => {
    // TODO: fill in reproduction + assertion
    expect(true).toBe(true);
  });
});
EOF
git add tests/regression/[bug-slug].test.ts
git commit -m "test(regression): [bug description]"
```

Then fix the bug. Then verify regression test passes. Then commit fix.

**Write checkpoint:**
```bash
cat > .agent/pipeline/04-qa.md << 'EOF'
STATUS: COMPLETE or BLOCKED
TESTS_PASSING: yes/no
SERVER_RUNNING: yes/no
FLOWS_TESTED: [count]
BUGS_FOUND: [count]
BUGS_FIXED: [count]
BUGS_OPEN: [count]
OPEN_BUG_LIST:
- [description] [severity: HIGH/MED/LOW]
EOF
```

**GATE CHECK:**
- TESTS_PASSING=no → BLOCKED
- BUGS_OPEN with severity HIGH → BLOCKED. Print: "🔍 QA blocked pipeline. [N] open bugs. Fix then say 'continue pipeline'."
- All clear → STATUS: COMPLETE. Proceed to Stage 4.

---

## ⛔ GATE BETWEEN STAGE 3 AND STAGE 4

```bash
QA=$(grep "STATUS:" .agent/pipeline/04-qa.md 2>/dev/null | grep -c "COMPLETE")
if [ "$QA" -eq 1 ]; then echo "GATE PASSED"; else echo "GATE FAILED — QA incomplete"; fi
```

---

## STAGE 4 — SECURITY OFFICER
*Only runs if QA is COMPLETE.*
*Read all previous checkpoints first.*

**Your job:** Find security vulnerabilities before they reach production.

**Step 1 — Secrets scan (run this first, most critical):**
```bash
grep -rn \
  -e "sk-[a-zA-Z0-9]\{20,\}" \
  -e "ghp_[a-zA-Z0-9]\{36\}" \
  -e "AKIA[A-Z0-9]\{16\}" \
  -e "password\s*=\s*['\"][^'\"]\{6,\}" \
  -e "secret\s*=\s*['\"][^'\"]\{8,\}" \
  --include="*.ts" --include="*.js" --include="*.py" --include="*.env" \
  . 2>/dev/null | grep -v node_modules | grep -v ".example"
```
Any result → CRITICAL. "Rotate the exposed credential immediately."

**Step 2 — Git history secrets check:**
```bash
git log --all -p 2>/dev/null | grep "^+" | grep -iE "(password|secret|apikey|token)\s*=" | head -10
```

**Step 3 — OWASP checks:**

- **Injection:** `grep -rn "query\s*+" --include="*.ts" --include="*.js" . | grep -v node_modules`
- **Broken auth:** `grep -rn "jwt.sign(" --include="*.ts" . | grep -v "expiresIn"` → missing expiry = WARN
- **IDOR:** `grep -rn "findById(req.params" --include="*.ts" . | grep -v "userId"` → no ownership check = CRITICAL
- **CORS:** `grep -rn "origin: '\*'" --include="*.ts" . | grep -v node_modules` → wildcard = WARN
- **XSS:** `grep -rn "dangerouslySetInnerHTML" --include="*.tsx" . | grep -v "DOMPurify"` → WARN
- **Rate limiting:** `grep -rn "'/login\|'/auth\|'/signup'" --include="*.ts" . | grep -v "rateLimit\|limiter"` → no rate limit = WARN

**Step 4 — npm audit:**
```bash
npm audit --audit-level=high 2>/dev/null | tail -10
```

**Write checkpoint:**
```bash
cat > .agent/pipeline/05-security.md << 'EOF'
STATUS: COMPLETE or BLOCKED
CRITICALS: [count]
CRITICAL_LIST:
- [finding] at [file:line] → Fix: [instruction]
HIGHS: [count]
MEDIUMS: [count]
STRIDE:
- Spoofing: PASS/FAIL
- Tampering: PASS/FAIL
- Repudiation: PASS/FAIL
- Info Disclosure: PASS/FAIL
- DoS: PASS/FAIL
- Elevation: PASS/FAIL
EOF
```

**GATE CHECK:**
- CRITICALS > 0 → STATUS: BLOCKED. HARD STOP. Print: "🚨 Security blocked deploy. [N] critical vulnerabilities. These MUST be fixed. Deploy is blocked."
- CRITICALS = 0 → STATUS: COMPLETE. Proceed to Stage 5.

---

## ⛔ GATE BETWEEN STAGE 4 AND STAGE 5

```bash
SEC=$(grep "STATUS:" .agent/pipeline/05-security.md 2>/dev/null | grep -c "COMPLETE")
if [ "$SEC" -eq 1 ]; then echo "GATE PASSED"; else echo "GATE FAILED — Security has critical findings"; fi
```

Security gate is ABSOLUTE. No exceptions. No "ship it and fix later."

---

## STAGE 5 — RELEASE MANAGER
*Only runs if Security is COMPLETE.*
*Read all checkpoints. Verify everything before touching git.*

**Your job:** Ship cleanly. Version bump. Changelog. PR.

**Step 1 — Branch check:**
```bash
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"
```
If branch = `main` or `master` → STOP. "Create a feature branch first. Never ship from main."

**Step 2 — Sync:**
```bash
git fetch origin main 2>/dev/null
git rebase origin/main 2>/dev/null || echo "REBASE CONFLICT — resolve and re-run"
```

**Step 3 — Final test run:**
```bash
npm test 2>&1 | tail -10
```
If fails → STOP. Do not ship.

**Step 4 — Version bump:**
```bash
# Read current version
cat VERSION 2>/dev/null || node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "0.0.0"
```
Ask user: **"Bump level: patch / minor / major? (default: patch)"**
Compute new version. Write to VERSION and package.json.

**Step 5 — Write CHANGELOG entry:**
```bash
git log $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD --oneline 2>/dev/null | head -20
```
Write a real entry — not a copy of commit messages. Real prose. What changed. Why it matters.
Format:
```markdown
## [VERSION] — YYYY-MM-DD

**[Bold headline 10-14 words: what shipped and why it matters]**

[2-4 sentences. Concrete. What changed for users. No jargon.]

### New
- feat: ...
### Fixed  
- fix: ...
```

**Step 6 — Commit + tag + push + PR:**
```bash
git add -A
git commit -m "chore(release): ship v[VERSION]"
git tag -a "v[VERSION]" -m "Release v[VERSION]"
git push origin $BRANCH --tags
gh pr create --title "ship: v[VERSION]" --base main 2>/dev/null || \
  echo "PR URL: https://github.com/[org]/[repo]/compare/$BRANCH"
```

**Write checkpoint:**
```bash
cat > .agent/pipeline/06-release-manager.md << 'EOF'
STATUS: COMPLETE
OLD_VERSION: [x.x.x]
NEW_VERSION: [x.x.x]
BRANCH: [branch]
PR_URL: [url or "not opened"]
EOF
```

---

## STAGE 6 — DOC ENGINEER
*Always runs last, after Release Manager.*

**Your job:** Make sure no documentation drifted from the code that just shipped.

**Check:**
```bash
# Version in README matches VERSION file?
grep -o "v[0-9]\+\.[0-9]\+\.[0-9]\+" README.md | head -3
cat VERSION

# CHANGELOG has entry for new version?
head -20 CHANGELOG.md

# Any deleted files still referenced in docs?
git diff --diff-filter=D --name-only 2>/dev/null
```

Fix anything that's out of sync. Commit: `docs: sync after v[VERSION]`

**Write final checkpoint:**
```bash
cat > .agent/pipeline/07-doc-engineer.md << 'EOF'
STATUS: COMPLETE
DOCS_UPDATED: [list]
EOF
```

---

## FINAL SUMMARY — Print after all stages complete

```
╔══════════════════════════════════════════════════════════════╗
║               ag-stack Pipeline Complete                     ║
╠══════════════════════════════════════════════════════════════╣
║  1  🧠 CEO/Planner          ✅  Plan ready                   ║
║  2A 🎨 Designer             ✅  No blockers                  ║
║  2B ⚙️  Eng Manager          ✅  Code reviewed, lint fixed    ║
║  3  🔍 QA Lead              ✅  [N] bugs found + fixed       ║
║  4  🔒 Security             ✅  No critical findings         ║
║  5  🚀 Release Manager      ✅  v[X] shipped, PR opened      ║
║  6  📝 Doc Engineer         ✅  Docs synced                  ║
╚══════════════════════════════════════════════════════════════╝

Version: [old] → [new]
PR: [url]
Bugs fixed: [N] (regression tests added)
Lint auto-fixed: [yes/no]
```

---

## RESUME AFTER A GATE STOP

When user says **"continue pipeline"**:
1. Read all files in `.agent/pipeline/`
2. Find the last COMPLETE stage
3. Resume from the NEXT stage
4. Do not re-run completed stages

---

## ABSOLUTE RULES — NEVER BREAK THESE

1. Never skip a stage because "it looks fine"
2. Never run Stage 3 (QA) if Stage 2A or 2B is BLOCKED
3. Never run Stage 4 (Security) if Stage 3 (QA) is BLOCKED
4. Never run Stage 5 (Release) if Stage 4 (Security) is BLOCKED — EVER
5. Never push to main or master directly
6. Never ship with failing tests
7. Never write "pre-existing bug" without running `git stash && npm test && git stash pop` as proof
8. Never write a CHANGELOG entry that is just a copy of commit messages
9. Always write the regression test BEFORE fixing any bug
10. Security CRITICAL = hard stop, no exceptions, no "fix it later"
