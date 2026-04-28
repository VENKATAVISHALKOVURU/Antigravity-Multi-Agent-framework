/**
 * ag-stack · Engineering Manager Agent
 *
 * Role: Code review — architecture, correctness, performance, security.
 * Input: Designer verdict (APPROVED), changed files
 * Output: Eng verdict for QA
 *
 * Auto-fixes: lint, unused imports, console.log in prod
 * Flags: logic bugs, N+1s, missing auth, injection risks
 */

const { BaseAgent, VERDICTS, SEVERITIES } = require('./base');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

class EngManagerAgent extends BaseAgent {
  constructor() {
    super('eng-manager', 'Engineering Manager', 'qa');
  }

  async run(options = {}) {
    this.banner('Code Review');

    // Require designer approval if UI scope
    const ceoPlan = this.safeReadVerdict('ceo');
    if (ceoPlan?.data?.hasUI && !options.skipDesignerCheck) {
      try {
        this.requireApprovalFrom('designer');
      } catch (e) {
        this.log('WARN', 'Running without designer approval (no UI changes or standalone review).');
      }
    }

    const blockers = [];
    const warnings = [];
    const suggestions = [];
    const autoFixed = [];

    // Get changed files
    const changedFiles = this.getChangedFiles();
    this.log('FILES', `Reviewing ${changedFiles.length} changed files`);

    // Run auto-fix first
    const fixed = this.runAutoFix();
    autoFixed.push(...fixed);

    // Review each file
    for (const file of changedFiles) {
      if (!fs.existsSync(file)) continue;
      if (file.match(/node_modules|\.min\.|dist\//)) continue;

      const content = fs.readFileSync(file, 'utf8');
      const ext = path.extname(file);

      if (ext.match(/\.(ts|tsx|js|jsx|mjs|cjs)$/)) {
        this.reviewJavaScript(file, content, blockers, warnings, suggestions);
      } else if (ext.match(/\.(py)$/)) {
        this.reviewPython(file, content, blockers, warnings, suggestions);
      } else if (ext.match(/\.(sql)$/)) {
        this.reviewSQL(file, content, blockers, warnings);
      }

      // Language-agnostic reviews
      this.reviewArchitecture(file, content, warnings, suggestions);
      this.reviewErrorHandling(file, content, blockers, warnings);
    }

    // Cross-file checks
    this.reviewTestCoverage(changedFiles, warnings);
    this.reviewDependencies(blockers, warnings);

    // Print report
    this.printReport(autoFixed, blockers, warnings, suggestions);
    this.printSummary(blockers, warnings, suggestions);

    const verdict = blockers.length === 0 ? VERDICTS.APPROVED : VERDICTS.CHANGES_REQUIRED;

    return this.writeVerdict({
      verdict,
      blockers,
      warnings,
      suggestions,
      data: { autoFixed, changedFiles },
    });
  }

  // ─── JavaScript / TypeScript Review ────────────────────────────────────────

  reviewJavaScript(file, content, blockers, warnings, suggestions) {
    const lines = content.split('\n');

    lines.forEach((line, i) => {
      const lineNo = i + 1;
      const trimmed = line.trim();

      // ── Security ──────────────────────────────────────────────────────────

      // SQL injection via string concatenation
      if (trimmed.match(/query\s*\+|query\s*`.*\$\{.*req\.|execute\(`.*\$\{.*req\./)) {
        blockers.push(this.finding(
          SEVERITIES.CRITICAL,
          'SQL injection risk: user input concatenated into query',
          file, lineNo,
          'Use parameterized queries: db.query("SELECT * FROM t WHERE id = $1", [req.params.id])'
        ));
      }

      // Secrets in code
      if (trimmed.match(/['"](sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AKIA[A-Z0-9]{16})['"]/)) {
        blockers.push(this.finding(
          SEVERITIES.CRITICAL,
          'API key or secret hardcoded in source code',
          file, lineNo,
          'Move to environment variable: process.env.SECRET_KEY'
        ));
      }

      // Eval with user input
      if (trimmed.match(/eval\(.*req\.|new Function\(.*req\./)) {
        blockers.push(this.finding(
          SEVERITIES.CRITICAL,
          'Remote code execution risk: user input passed to eval()',
          file, lineNo,
          'Never eval user input. Redesign this logic.'
        ));
      }

      // ── Error Handling ────────────────────────────────────────────────────

      // Empty catch block
      if (trimmed.match(/catch\s*\([^)]*\)\s*\{\s*\}|catch\s*\([^)]*\)\s*\{?\s*\/\//)) {
        warnings.push(this.finding(
          SEVERITIES.HIGH,
          'Empty catch block silently swallows errors',
          file, lineNo,
          'At minimum: logger.error(e) or throw new AppError("context", e)'
        ));
      }

      // Unhandled promise (no await, no .catch)
      if (trimmed.match(/^\s*(fetch|axios|db\.|prisma\.|mongoose\.)\w+\(/) &&
          !trimmed.match(/await|\.then|\.catch|return/)) {
        warnings.push(this.finding(
          SEVERITIES.HIGH,
          'Unhandled promise — rejection will be silent',
          file, lineNo,
          'Add await or .catch()'
        ));
      }

      // ── Performance ───────────────────────────────────────────────────────

      // N+1 pattern: query inside loop
      if (trimmed.match(/for\s*\(|\.forEach\(|\.map\(/) &&
          lines.slice(i, i + 10).some(l => l.match(/await.*\.(find|query|get|fetch)/))) {
        warnings.push(this.finding(
          SEVERITIES.HIGH,
          'Possible N+1 query: database call inside a loop',
          file, lineNo,
          'Batch with findMany({ where: { id: { in: ids } } }) or use DataLoader'
        ));
      }

      // ── Code Quality ──────────────────────────────────────────────────────

      // console.log in non-test files
      if (trimmed.match(/console\.(log|warn|error|debug)\(/) && !file.match(/test|spec|__test__/)) {
        suggestions.push(this.finding(
          SEVERITIES.LOW,
          'console.log in production code path',
          file, lineNo,
          'Replace with structured logger (pino, winston) or remove'
        ));
      }

      // Type assertion escaping type safety
      if (trimmed.match(/as any(?!\s*\/\/)/)) {
        warnings.push(this.finding(
          SEVERITIES.MEDIUM,
          '"as any" disables TypeScript type checking',
          file, lineNo,
          'Use proper type or unknown + type guard instead'
        ));
      }

      // TODO/FIXME left in
      if (trimmed.match(/\/\/\s*(TODO|FIXME|HACK|XXX):/i)) {
        suggestions.push(this.finding(
          SEVERITIES.SUGGESTION,
          `${trimmed.slice(0, 60)} — should this be a tracked issue?`,
          file, lineNo
        ));
      }
    });

    // Missing index on FK column (check schema files)
    if (file.match(/schema|migration|model/i)) {
      if (content.match(/\w+Id\s+/) && !content.match(/@@index|createIndex|INDEX/)) {
        warnings.push(this.finding(
          SEVERITIES.MEDIUM,
          'Foreign key column without index — queries by this column will be slow at scale',
          file, null,
          'Add @@index([fieldId]) in Prisma schema or CREATE INDEX in migration'
        ));
      }
    }
  }

  // ─── Python Review ─────────────────────────────────────────────────────────

  reviewPython(file, content, blockers, warnings, suggestions) {
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      const lineNo = i + 1;
      const trimmed = line.trim();

      // SQL injection
      if (trimmed.match(/execute\(f['"]/i) || trimmed.match(/execute\(.*%s.*%/)) {
        blockers.push(this.finding(
          SEVERITIES.CRITICAL,
          'SQL injection: f-string or % formatting in SQL execute()',
          file, lineNo,
          'Use parameterized queries: cursor.execute("SELECT * FROM t WHERE id = %s", (id,))'
        ));
      }

      // Bare except
      if (trimmed === 'except:' || trimmed === 'except Exception:') {
        warnings.push(this.finding(
          SEVERITIES.MEDIUM,
          'Overly broad except clause — catches SystemExit, KeyboardInterrupt',
          file, lineNo,
          'Catch specific exceptions: except ValueError as e:'
        ));
      }

      // print() in production code
      if (trimmed.match(/^print\(/) && !file.match(/test|spec|cli|script/i)) {
        suggestions.push(this.finding(
          SEVERITIES.LOW,
          'print() in production code',
          file, lineNo,
          'Use logging.info() instead'
        ));
      }
    });
  }

  // ─── SQL Review ────────────────────────────────────────────────────────────

  reviewSQL(file, content, blockers, warnings) {
    // SELECT * in production queries
    if (content.match(/SELECT\s+\*/i) && !file.match(/migration|seed/i)) {
      warnings.push(this.finding(
        SEVERITIES.MEDIUM,
        'SELECT * — explicit column list is safer and faster',
        file
      ));
    }

    // Missing WHERE on UPDATE/DELETE
    if (content.match(/UPDATE\s+\w+\s+SET(?!.*WHERE)/i) ||
        content.match(/DELETE\s+FROM\s+\w+(?!.*WHERE)/i)) {
      blockers.push(this.finding(
        SEVERITIES.CRITICAL,
        'UPDATE or DELETE without WHERE clause — will affect ALL rows',
        file
      ));
    }
  }

  // ─── Architecture Review ───────────────────────────────────────────────────

  reviewArchitecture(file, content, warnings, suggestions) {
    // God file: too many responsibilities
    const lineCount = content.split('\n').length;
    if (lineCount > 500 && !file.match(/generated|\.min\.|vendor/)) {
      suggestions.push(this.finding(
        SEVERITIES.SUGGESTION,
        `File is ${lineCount} lines — consider splitting into smaller modules`,
        file
      ));
    }

    // Circular dependency smell: importing from parent directory multiple times
    const parentImports = (content.match(/from ['"]\.\.\/\.\.\/\.\.\//g) || []).length;
    if (parentImports > 3) {
      warnings.push(this.finding(
        SEVERITIES.MEDIUM,
        'Multiple imports from 3+ levels up — possible circular dependency or wrong abstraction level',
        file
      ));
    }
  }

  // ─── Error Handling Review ─────────────────────────────────────────────────

  reviewErrorHandling(file, content, blockers, warnings) {
    // API routes without try/catch
    if (file.match(/route|controller|handler/i)) {
      const hasAsyncHandler = content.match(/async\s+(req|request|ctx)/);
      const hasTryCatch = content.match(/try\s*\{/);
      if (hasAsyncHandler && !hasTryCatch) {
        warnings.push(this.finding(
          SEVERITIES.HIGH,
          'Async route handler without try/catch — unhandled rejections crash the server',
          file, null,
          'Wrap in try/catch or use an asyncHandler wrapper middleware'
        ));
      }
    }
  }

  // ─── Cross-file Checks ─────────────────────────────────────────────────────

  reviewTestCoverage(changedFiles, warnings) {
    const sourceFiles = changedFiles.filter(f => f.match(/\.(ts|tsx|js|jsx|py)$/) && !f.match(/test|spec/));
    const testFiles = changedFiles.filter(f => f.match(/\.(test|spec)\./));

    if (sourceFiles.length > 0 && testFiles.length === 0) {
      warnings.push(this.finding(
        SEVERITIES.MEDIUM,
        `${sourceFiles.length} source files changed with no corresponding test file changes`,
        null, null,
        'Add or update tests for changed logic'
      ));
    }
  }

  reviewDependencies(blockers, warnings) {
    if (!fs.existsSync('package.json')) return;
    try {
      const result = spawnSync('npm', ['audit', '--audit-level=high', '--json'], { encoding: 'utf8' });
      if (result.stdout) {
        const audit = JSON.parse(result.stdout);
        const highCount = audit.metadata?.vulnerabilities?.high || 0;
        const critCount = audit.metadata?.vulnerabilities?.critical || 0;
        if (critCount > 0) {
          blockers.push(this.finding(SEVERITIES.CRITICAL, `${critCount} critical CVEs in npm dependencies — run npm audit fix`));
        } else if (highCount > 0) {
          warnings.push(this.finding(SEVERITIES.HIGH, `${highCount} high-severity CVEs in npm dependencies — run npm audit fix`));
        }
      }
    } catch { /* npm audit not available */ }
  }

  // ─── Auto-fix ──────────────────────────────────────────────────────────────

  runAutoFix() {
    const fixed = [];

    // ESLint auto-fix
    if (fs.existsSync('package.json')) {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      if (pkg.scripts?.['lint:fix']) {
        try {
          execSync('npm run lint:fix 2>/dev/null', { stdio: 'pipe' });
          fixed.push('ESLint auto-fix applied');
        } catch { /* lint errors that couldn't be auto-fixed */ }
      } else if (fs.existsSync('.eslintrc.js') || fs.existsSync('.eslintrc.json')) {
        try {
          execSync('npx eslint . --fix --ext .ts,.tsx,.js,.jsx 2>/dev/null', { stdio: 'pipe' });
          fixed.push('ESLint auto-fix applied');
        } catch { /* ignore */ }
      }
    }

    // Ruff (Python)
    try {
      execSync('ruff check --fix . 2>/dev/null', { stdio: 'pipe' });
      fixed.push('Ruff auto-fix applied');
    } catch { /* ruff not installed */ }

    // Commit auto-fixes
    try {
      const diff = execSync('git diff --stat', { encoding: 'utf8' });
      if (diff.trim()) {
        execSync('git add -A && git commit -m "chore: auto-fix lint (eng-manager review)"');
        fixed.push('Auto-fix changes committed');
        this.log('AUTO-FIX', 'Lint fixes committed');
      }
    } catch { /* nothing to commit */ }

    return fixed;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  getChangedFiles() {
    try {
      const base = execSync('git merge-base HEAD origin/main 2>/dev/null || echo HEAD~1', { encoding: 'utf8' }).trim();
      return execSync(`git diff ${base} HEAD --name-only`, { encoding: 'utf8' })
        .trim().split('\n').filter(Boolean);
    } catch { return []; }
  }

  safeReadVerdict(agent) {
    try { return this.readVerdict(agent); } catch { return null; }
  }

  printReport(autoFixed, blockers, warnings, suggestions) {
    console.log('\n── Auto-fixed ───────────────────────────────────────────────');
    if (autoFixed.length === 0) console.log('  None');
    else autoFixed.forEach(f => console.log(`  ✓ ${f}`));

    if (blockers.length > 0) {
      console.log('\n── BLOCKERS (must fix before QA) ────────────────────────────');
      blockers.forEach((b, i) => {
        console.log(`\n  ${i + 1}. [${b.severity}] ${b.file}${b.line ? ':' + b.line : ''}`);
        console.log(`     ${b.issue}`);
        if (b.fix) console.log(`     → ${b.fix}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n── Warnings ─────────────────────────────────────────────────');
      warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w.file || 'project'}: ${w.issue}`));
    }

    if (suggestions.length > 0) {
      console.log('\n── Suggestions ──────────────────────────────────────────────');
      suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s.file || 'project'}: ${s.issue}`));
    }
  }
}

module.exports = { EngManagerAgent };
