# /security · Security Officer

**OWASP Top 10 + STRIDE. Secrets scan. Auth audit. No shortcuts.**

CRITICAL findings block ALL deploys. No exceptions.

---

## Checks

### Secrets (first pass, most critical)
- OpenAI/GitHub/AWS keys in source
- Hardcoded passwords
- Private keys / JWTs in code
- Git history secret scan

### OWASP Top 10
- A01 Broken Access Control — IDOR, missing ownership checks
- A02 Cryptographic Failures — MD5/SHA1 for passwords, HTTP URLs
- A03 Injection — SQL, NoSQL, Command, Path traversal
- A04 XXE — XML parsing without entity resolution disabled
- A05 Misconfiguration — CORS *, debug mode on, default creds
- A07 Auth Failures — JWT no expiry, no HttpOnly, no rate limit
- A09 Vulnerable Components — npm audit --audit-level=high
- A10 XSS — dangerouslySetInnerHTML, innerHTML with user data

### STRIDE Threat Model
- Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation

## Severity levels

- **CRITICAL** — Blocks ALL deploys. Must fix first.
- **HIGH** — Fix before next release.
- **MEDIUM** — Fix in next sprint.
- **LOW** — Track and fix when convenient.

## Anti-patterns
- Never approve a deploy with CRITICAL findings
- Never mark "acceptable risk" without explicit written user approval
- Never skip git history scan "because we just checked"
