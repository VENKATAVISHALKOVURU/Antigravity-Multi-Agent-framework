# Example: SaaS MVP — AI Resume Screener

**Goal given to ag-stack:**
```
Build an AI-powered resume screener: upload PDF, extract skills, score against job description, rank candidates
```

**Result:** Production-ready Next.js app with auth, file upload, OpenAI scoring, and Stripe billing — shipped in one session.

---

## Session transcript

### 1. Plan

```bash
$ ag-stack autoplan "Build an AI-powered resume screener: upload PDF, score against job description, rank candidates"
```

**CEO Review:**
> Problem is real — hiring managers spend 23 seconds per resume. AI screening saves 4+ hours per role. Market validated. Proceed.
> Riskiest assumption: OpenAI scoring quality. Recommend: run manual comparison on first 50 resumes before full rollout.

**Design Review:**
> 2-step flow: (1) Upload JD + resumes, (2) View ranked results. Clean.
> Missing: empty state when no resumes uploaded. Missing: error state for corrupt PDF.
> Suggestion: show "AI is analyzing..." with progress, not blank spinner.

**Eng Review:**
> Architecture fits Next.js App Router.
> Rate limit /upload or you'll get hammered on launch day.
> Use job queue (BullMQ) for scoring — don't block the upload response.
> Missing: pagination on results if > 50 candidates.

**Taste decisions:**
1. Ranking algorithm: LLM score vs rule-based scoring?
   > My lean: LLM score — more accurate, worth the latency with async queue

**Execution plan:**
```
Phase 1 — Foundation (2h)
  ✓ Next.js 14 App Router + TypeScript
  ✓ Postgres + Prisma schema
  ✓ NextAuth.js (Google OAuth)
  ✓ Environment config

Phase 2 — Core Feature (4h)
  ✓ PDF upload endpoint (multer + S3)
  ✓ BullMQ job queue for scoring
  ✓ OpenAI scoring worker
  ✓ Results display with ranking
  
Phase 3 — Polish + Ship (2h)
  ✓ Error states + empty states
  ✓ Mobile responsive
  ✓ Tests + QA
  ✓ Deploy to Vercel
```

---

### 2. Design review after building

```bash
$ ag-stack design-review
```

**Blockers:**
- `src/components/ResultsTable.tsx:67` — Score badge contrast 2.1:1 (need 4.5:1)
  → Fixed: changed `text-gray-400` to `text-gray-700`

**Warnings:**
- Upload button has no loading state
  → Fixed: added `isUploading` state with spinner

---

### 3. Code review

```bash
$ ag-stack review
```

**Auto-fixed:**
- 4 ESLint errors committed

**Blocker:**
- `app/api/upload/route.ts:23` — No rate limiting on upload endpoint
  → Fixed: added `@upstash/ratelimit` (10 req/min per user)

**Blocker:**
- `app/api/upload/route.ts:45` — PDF.js fails silently on encrypted PDFs
  → Fixed: wrapped in try/catch with user-facing error message

---

### 4. QA

```bash
$ ag-stack qa
```

**Browser tested:**
- Upload flow (3 test PDFs) ✓
- Login via Google OAuth ✓
- Results display ✓
- Empty state (no resumes) ✓

**Bug found:**
- Score display wraps incorrectly at 375px
- Regression test written: `tests/regression/score-display-mobile.test.ts`
- Bug fixed + committed

**Coverage:** 91%

---

### 5. Security

```bash
$ ag-stack security
```

**CRITICAL (fixed before continuing):**
- OpenAI API key exposed in client bundle
  → Fixed: moved to server-side env var

**HIGH (fixed):**
- No ownership check on GET /api/results/:id
  → Fixed: added `if (result.userId !== session.user.id) return 403`

**STRIDE:**
- All 6 threats mitigated ✓

---

### 6. Ship

```bash
$ ag-stack ship minor
```

```
✓ 47 tests passing
✓ Version: 0.1.0 → 0.2.0
✓ CHANGELOG updated
✓ Docs synced
✓ PR #7 opened
✓ Live at https://resume-screener.vercel.app
```

---

## What the agents caught (that a solo dev would likely miss)

| Issue | Agent | Severity |
|---|---|---|
| OpenAI key in client bundle | Security | CRITICAL |
| Missing IDOR check on results | Security | HIGH |
| No rate limit on upload | Eng Manager | BLOCKER |
| Silent PDF parse failure | Eng Manager | BLOCKER |
| Score badge WCAG contrast | Designer | BLOCKER |
| Mobile layout at 375px | QA (browser) | HIGH |
| Missing loading state | Designer | WARNING |
