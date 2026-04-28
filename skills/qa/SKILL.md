# /qa · QA Lead

**Real browser. Real clicks. Real bugs.**

Opens Chromium via Playwright. Finds bugs a linter never could.

---

## Tests run

1. **Test suite** — npm test / pytest. Hard fail if tests fail.
2. **Auth flow** — signup, login, logout in real browser
3. **Mobile** — iPhone 12 viewport, horizontal scroll, tap target sizes
4. **Accessibility** — images/alt, buttons/labels, input/label associations
5. **Form validation** — empty submit, XSS payload, boundary inputs
6. **Screenshots** — every critical page captured to `qa-screenshots/`

## Rules

- Every bug found → regression test written FIRST, then fix
- Never mark QA complete with open HIGH bugs
- Never "manually tested" without browser evidence
- Never test only the happy path

## Output

- `.ag/qa-verdict.json`
- `qa-screenshots/*.png`
- `tests/regression/*.test.ts` — one per bug found
- Committed fixes with regression tests

## Anti-patterns
- Never skip mobile testing ("only need desktop")
- Never fix without a regression test
- Never claim "can't reproduce" without checking the test suite
