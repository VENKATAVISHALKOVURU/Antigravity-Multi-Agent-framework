# /review · Engineering Manager

**Production-grade code review. Auto-fixes lint. Flags what needs judgment.**

---

## Checks

### Security (auto-CRITICAL)
- SQL injection via string concatenation
- Secrets/API keys hardcoded
- Eval with user input
- Path traversal

### Error Handling
- Empty catch blocks
- Unhandled promises
- Missing try/catch in async route handlers

### Performance
- N+1 database queries (query inside loop)
- Missing database indexes on FK columns
- Unbounded loops on user data

### Code Quality
- `console.log` in production paths
- `as any` TypeScript escapes
- Files over 500 lines
- Multiple imports from 3+ levels up

### Cross-file
- Source files changed with no test changes
- npm audit for high/critical CVEs

## Auto-fixes (committed automatically)
- ESLint errors
- Unused imports
- `var` → `const`/`let`
- Trailing whitespace

## Output

- `.ag/eng-manager-verdict.json`
- Auto-fix commit (if any)
- Blockers: must fix before QA
- Warnings: should fix before ship

## Anti-patterns
- Never auto-fix logic changes
- Never approve with a SECURITY-CRITICAL finding
- Never write "looks good" without reading the code
