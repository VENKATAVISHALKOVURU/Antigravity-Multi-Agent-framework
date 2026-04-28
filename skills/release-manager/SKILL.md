# /ship · Release Manager

**Tests → lint → version → changelog → docs → PR. One command.**

Never ships a broken build. Never silently continues past a failure.

---

## Pipeline

1. **Pre-flight** — Must be on a feature branch (never main/master)
2. **Sync** — `git fetch && git rebase origin/main`
3. **Tests** — Hard fail if any test fails. Run /debug to investigate.
4. **Lint fix** — Auto-fix and commit if anything changes
5. **Version bump** — `major.minor.patch.micro` from VERSION file
6. **Changelog** — Real prose entry, not a bullet dump of commit messages
7. **Docs sync** — README, ARCHITECTURE, ANTIGRAVITY.md checked
8. **Commit + tag** — `v{version}` tag created
9. **Push + PR** — Branch pushed, PR opened via `gh` CLI or manual URL

## Changelog format (mandatory)

```markdown
## [version] — YYYY-MM-DD

**[10-14 word headline: what shipped and why it matters]**

[3-5 sentence lead. Concrete. No AI vocabulary.]

### New
- feat(scope): description

### Fixed
- fix(scope): description
```

## Failure behavior

- Hard stop on any failure — never silently continues
- Prints exactly what failed and why
- Never ships with failing tests

## Anti-patterns
- Never push to main directly
- Never skip tests "because the change is small"
- Never write CHANGELOG that is just a copy of commit messages
- Never leave [TODO] or [PLACEHOLDER] in CHANGELOG
