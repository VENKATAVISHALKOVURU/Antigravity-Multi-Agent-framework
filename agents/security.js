/**
 * ag-stack · Security Officer Agent
 *
 * Role: OWASP Top 10 + STRIDE threat model. Secrets scan. Auth audit.
 * Input: QA verdict (APPROVED)
 * Output: Security verdict for Release Manager
 *
 * CRITICAL findings block all deploys. No exceptions.
 */

const { BaseAgent, VERDICTS, SEVERITIES } = require('./base');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

class SecurityAgent extends BaseAgent {
  constructor() {
    super('security', 'Security Officer', 'release-manager');
  }

  async run(options = {}) {
    this.banner('Security Audit — OWASP Top 10 + STRIDE');

    if (!options.skipQaCheck) {
      try {
        this.requireApprovalFrom('qa');
      } catch {
        this.log('WARN', 'Running without QA approval (standalone security audit).');
      }
    }

    const criticals = [];
    const highs = [];
    const mediums = [];
    const lows = [];

    const allFiles = this.getAllSourceFiles();
    this.log('SCOPE', `Scanning ${allFiles.length} source files`);

    // 1. Secrets scan (most critical — run first)
    this.scanSecrets(allFiles, criticals, highs);

    // 2. OWASP Top 10
    this.checkInjection(allFiles, criticals, highs);
    this.checkBrokenAuth(allFiles, criticals, highs, mediums);
    this.checkSensitiveDataExposure(allFiles, highs, mediums);
    this.checkXXE(allFiles, highs);
    this.checkBrokenAccessControl(allFiles, criticals, highs);
    this.checkSecurityMisconfiguration(allFiles, highs, mediums);
    this.checkXSS(allFiles, criticals, highs, mediums);
    this.checkInsecureDeserialization(allFiles, highs);
    this.checkVulnerableComponents(criticals, highs);

    // 3. STRIDE threat model
    const stride = this.runSTRIDE(allFiles);

    // 4. Git history secrets check
    this.scanGitHistory(criticals);

    // Print report
    this.printSecurityReport(criticals, highs, mediums, lows, stride);
    this.printSummary(criticals, highs, mediums);

    // CRITICAL findings always block
    const verdict = criticals.length === 0 ? VERDICTS.APPROVED : VERDICTS.BLOCKED;

    if (criticals.length > 0) {
      console.log('\n🚨 DEPLOY BLOCKED: Fix all CRITICAL findings before any deployment.\n');
    }

    return this.writeVerdict({
      verdict,
      blockers: criticals,
      warnings: highs,
      suggestions: [...mediums, ...lows],
      data: { stride, totalFindings: criticals.length + highs.length + mediums.length },
    });
  }

  // ─── Secrets Scan ──────────────────────────────────────────────────────────

  scanSecrets(files, criticals, highs) {
    this.log('SCAN', 'Scanning for exposed secrets...');

    const secretPatterns = [
      { pattern: /sk-[a-zA-Z0-9]{20,}/,       label: 'OpenAI API key' },
      { pattern: /ghp_[a-zA-Z0-9]{36}/,        label: 'GitHub personal access token' },
      { pattern: /AKIA[A-Z0-9]{16}/,            label: 'AWS access key ID' },
      { pattern: /eyJhbGciOiJIUzI1NiJ[^'"]{20,}/, label: 'Hardcoded JWT token' },
      { pattern: /stripe[_-]?(secret|sk)[_-]?(?:key|test|live)['":\s]*[:=]\s*['"]sk_/i, label: 'Stripe secret key' },
      { pattern: /password\s*[:=]\s*['"][^'"]{6,}['"]/i, label: 'Hardcoded password' },
      { pattern: /private[_-]?key\s*[:=]\s*['"][^'"]{10,}/i, label: 'Hardcoded private key' },
      { pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, label: 'Private key in source' },
    ];

    const skipPaths = /node_modules|\.git|dist|build|coverage|\.min\.|test.*fixture|mock|example/;

    files.filter(f => !skipPaths.test(f)).forEach(file => {
      let content;
      try { content = fs.readFileSync(file, 'utf8'); } catch { return; }

      secretPatterns.forEach(({ pattern, label }) => {
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (pattern.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('#')) {
            criticals.push(this.finding(
              SEVERITIES.CRITICAL,
              `${label} exposed in source code`,
              file, i + 1,
              'IMMEDIATELY: (1) Rotate the credential. (2) Move to env var: process.env.SECRET_NAME. (3) Add to .gitignore if in .env file.'
            ));
          }
        });
      });
    });
  }

  // ─── OWASP A03: Injection ──────────────────────────────────────────────────

  checkInjection(files, criticals, highs) {
    this.log('OWASP', 'A03: Injection...');

    files.forEach(file => {
      let content;
      try { content = fs.readFileSync(file, 'utf8'); } catch { return; }
      const lines = content.split('\n');

      lines.forEach((line, i) => {
        const lineNo = i + 1;

        // SQL injection
        if (line.match(/query\s*[+]\s*|query\s*`[^`]*\$\{[^}]*req\./)) {
          criticals.push(this.finding(
            SEVERITIES.CRITICAL, 'SQL injection: user input concatenated into query',
            file, lineNo, 'Use parameterized queries: db.query("SELECT * FROM t WHERE id = $1", [req.params.id])'
          ));
        }

        // Command injection
        if (line.match(/exec\([^)]*req\.|spawn\([^)]*req\.|execSync\([^)]*req\./)) {
          criticals.push(this.finding(
            SEVERITIES.CRITICAL, 'Command injection: user input passed to shell exec',
            file, lineNo, 'Never pass user input to exec(). Use a whitelist of allowed commands.'
          ));
        }

        // NoSQL injection
        if (line.match(/\.(find|findOne|update|delete)\(\s*req\.(body|query|params)/)) {
          highs.push(this.finding(
            SEVERITIES.HIGH, 'NoSQL injection: raw request data passed to database query',
            file, lineNo, 'Validate and sanitize: const { id } = z.object({ id: z.string().uuid() }).parse(req.params)'
          ));
        }

        // Path traversal
        if (line.match(/readFile\([^)]*req\.|createReadStream\([^)]*req\./)) {
          criticals.push(this.finding(
            SEVERITIES.CRITICAL, 'Path traversal: user input in file read operation',
            file, lineNo, 'Validate path against a whitelist of allowed directories'
          ));
        }
      });
    });
  }

  // ─── OWASP A07: Auth Failures ──────────────────────────────────────────────

  checkBrokenAuth(files, criticals, highs, mediums) {
    this.log('OWASP', 'A07: Auth Failures...');

    files.forEach(file => {
      let content;
      try { content = fs.readFileSync(file, 'utf8'); } catch { return; }

      // JWT without expiry
      if (content.match(/jwt\.sign\(/) && !content.match(/expiresIn|exp:/)) {
        highs.push(this.finding(
          SEVERITIES.HIGH, 'JWT signed without expiry — tokens valid forever',
          file, null, 'Add expiresIn: jwt.sign(payload, secret, { expiresIn: "24h" })'
        ));
      }

      // Session without HttpOnly
      if (content.match(/cookie|session/) && !content.match(/httpOnly.*true|HttpOnly/)) {
        mediums.push(this.finding(
          SEVERITIES.MEDIUM, 'Cookie set without HttpOnly flag — XSS can steal session',
          file, null, 'Set cookie options: { httpOnly: true, secure: true, sameSite: "strict" }'
        ));
      }

      // Missing rate limit on auth endpoints
      if (file.match(/login|signin|auth|password/i) && content.match(/router\.|app\.post/)) {
        if (!content.match(/rateLimit|throttle|limiter/)) {
          highs.push(this.finding(
            SEVERITIES.HIGH, 'Auth endpoint without rate limiting — brute force attack vector',
            file, null, 'Add rate limiter: app.use("/auth", rateLimit({ windowMs: 15*60*1000, max: 20 }))'
          ));
        }
      }
    });
  }

  // ─── OWASP A02: Sensitive Data ─────────────────────────────────────────────

  checkSensitiveDataExposure(files, highs, mediums) {
    this.log('OWASP', 'A02: Sensitive Data Exposure...');

    files.forEach(file => {
      let content;
      try { content = fs.readFileSync(file, 'utf8'); } catch { return; }

      // Passwords returned in API response
      if (content.match(/res\.json\(.*user|return.*user/) && content.match(/password/)) {
        highs.push(this.finding(
          SEVERITIES.HIGH, 'User object with password field potentially returned in API response',
          file, null, 'Explicitly exclude: const { password, ...safeUser } = user; return safeUser;'
        ));
      }

      // Logging sensitive data
      if (content.match(/console\.log\(.*password|logger\.(info|debug)\(.*password/i)) {
        highs.push(this.finding(
          SEVERITIES.HIGH, 'Password logged to console/logger — appears in log files',
          file, null, 'Remove logging of sensitive fields'
        ));
      }
    });
  }

  // ─── OWASP A04: XXE ────────────────────────────────────────────────────────

  checkXXE(files, highs) {
    this.log('OWASP', 'A04: XXE...');
    files.forEach(file => {
      let content;
      try { content = fs.readFileSync(file, 'utf8'); } catch { return; }
      if (content.match(/xml2js|xmlparser|DOMParser.*xml/i) && !content.match(/noEnt|resolveEntities.*false/)) {
        highs.push(this.finding(
          SEVERITIES.HIGH, 'XML parsing without entity resolution disabled — XXE risk',
          file, null, 'Disable external entities: parser.parseStringPromise(xml, { explicitArray: false })'
        ));
      }
    });
  }

  // ─── OWASP A01: Broken Access Control ─────────────────────────────────────

  checkBrokenAccessControl(files, criticals, highs) {
    this.log('OWASP', 'A01: Broken Access Control...');
    files.forEach(file => {
      let content;
      try { content = fs.readFileSync(file, 'utf8'); } catch { return; }

      // Direct object reference without ownership check
      if (content.match(/findById\(req\.params\.id\)|getById\(req\.params\.id\)/) &&
          !content.match(/userId|ownerId|user\.id|req\.user/)) {
        highs.push(this.finding(
          SEVERITIES.HIGH, 'IDOR: resource accessed by ID without ownership verification',
          file, null, 'Add ownership check: if (record.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" })'
        ));
      }
    });
  }

  // ─── OWASP A05: Misconfiguration ──────────────────────────────────────────

  checkSecurityMisconfiguration(files, highs, mediums) {
    this.log('OWASP', 'A05: Security Misconfiguration...');
    files.forEach(file => {
      let content;
      try { content = fs.readFileSync(file, 'utf8'); } catch { return; }

      // CORS wildcard
      if (content.match(/origin:\s*['"]\*['"]/)) {
        mediums.push(this.finding(
          SEVERITIES.MEDIUM, 'CORS allows all origins (*) — restrict to known domains',
          file, null, 'origin: ["https://yourapp.com", "https://www.yourapp.com"]'
        ));
      }

      // Debug mode on
      if (content.match(/DEBUG\s*[:=]\s*true|debug:\s*true/i) && !file.match(/test|dev|local/i)) {
        highs.push(this.finding(
          SEVERITIES.HIGH, 'Debug mode enabled in production config',
          file, null, 'Set DEBUG=false and NODE_ENV=production in production environment'
        ));
      }
    });
  }

  // ─── OWASP A03: XSS ───────────────────────────────────────────────────────

  checkXSS(files, criticals, highs, mediums) {
    this.log('OWASP', 'A03: XSS...');
    files.forEach(file => {
      let content;
      try { content = fs.readFileSync(file, 'utf8'); } catch { return; }

      if (content.match(/dangerouslySetInnerHTML=\{\{.*__html/)) {
        highs.push(this.finding(
          SEVERITIES.HIGH, 'dangerouslySetInnerHTML with potentially unsafe content',
          file, null, 'Sanitize with DOMPurify: dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}'
        ));
      }

      if (content.match(/document\.write\(|innerHTML\s*=\s*[^'"]/)) {
        criticals.push(this.finding(
          SEVERITIES.CRITICAL, 'innerHTML or document.write with dynamic content — XSS vector',
          file, null, 'Use textContent for text, or sanitize HTML with DOMPurify'
        ));
      }
    });
  }

  checkInsecureDeserialization(files, highs) {
    files.forEach(file => {
      let content;
      try { content = fs.readFileSync(file, 'utf8'); } catch { return; }
      if (content.match(/JSON\.parse\(req\.|eval\(req\./)) {
        highs.push(this.finding(
          SEVERITIES.HIGH, 'Deserializing raw user input without validation',
          file, null, 'Validate against schema before parsing: z.object({...}).parse(JSON.parse(input))'
        ));
      }
    });
  }

  checkVulnerableComponents(criticals, highs) {
    this.log('DEPS', 'Checking dependencies for known CVEs...');
    if (fs.existsSync('package.json')) {
      const result = spawnSync('npm', ['audit', '--audit-level=moderate', '--json'], {
        encoding: 'utf8', timeout: 30000
      });
      try {
        const audit = JSON.parse(result.stdout || '{}');
        const vuln = audit.metadata?.vulnerabilities || {};
        if ((vuln.critical || 0) > 0) {
          criticals.push(this.finding(SEVERITIES.CRITICAL,
            `${vuln.critical} critical CVE(s) in npm dependencies`, null, null, 'Run: npm audit fix --force'));
        } else if ((vuln.high || 0) > 0) {
          highs.push(this.finding(SEVERITIES.HIGH,
            `${vuln.high} high-severity CVE(s) in npm dependencies`, null, null, 'Run: npm audit fix'));
        }
      } catch { /* audit parse failed */ }
    }
  }

  // ─── STRIDE ────────────────────────────────────────────────────────────────

  runSTRIDE(files) {
    const allContent = files.map(f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');

    return {
      spoofing:    allContent.match(/jwt|session|cookie|oauth/i) ? 'MITIGATED' : 'REVIEW',
      tampering:   allContent.match(/checksum|hmac|signature|integrity/i) ? 'MITIGATED' : 'REVIEW',
      repudiation: allContent.match(/audit|log|trail/i) ? 'MITIGATED' : 'MISSING',
      infoDisclose:allContent.match(/helmet|csp|x-frame|hsts/i) ? 'MITIGATED' : 'REVIEW',
      dos:         allContent.match(/rateLimit|throttle|limiter/i) ? 'MITIGATED' : 'MISSING',
      elevation:   allContent.match(/role|permission|authorize|policy/i) ? 'MITIGATED' : 'REVIEW',
    };
  }

  scanGitHistory(criticals) {
    try {
      const log = execSync(
        'git log --all -p --diff-filter=A -- "*.env" "*.key" "*.pem" 2>/dev/null | grep "^+" | head -20',
        { encoding: 'utf8', timeout: 10000 }
      );
      if (log.match(/password|secret|key|token/i)) {
        criticals.push(this.finding(
          SEVERITIES.CRITICAL,
          'Possible secret committed to git history',
          null, null,
          'Run: git log --all -p | grep -E "(password|secret|key|token)" to identify and use git-filter-repo to remove'
        ));
      }
    } catch { /* no git or no history */ }
  }

  getAllSourceFiles() {
    try {
      return execSync(
        'find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.env*" \\) | grep -v node_modules | grep -v .git | grep -v dist | grep -v build',
        { encoding: 'utf8', timeout: 10000 }
      ).trim().split('\n').filter(Boolean);
    } catch { return []; }
  }

  printSecurityReport(criticals, highs, mediums, lows, stride) {
    console.log('\n── Security Audit Report ────────────────────────────────────');

    if (criticals.length > 0) {
      console.log('\n  🚨 CRITICAL (block all deploys):');
      criticals.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.file || 'project'}${c.line ? ':' + c.line : ''}`);
        console.log(`     ${c.issue}`);
        if (c.fix) console.log(`     Fix: ${c.fix}`);
      });
    }

    if (highs.length > 0) {
      console.log('\n  ⚠️  HIGH (fix before next release):');
      highs.forEach((h, i) => console.log(`  ${i + 1}. ${h.file || 'project'}: ${h.issue}`));
    }

    if (mediums.length > 0) {
      console.log('\n  ℹ️  MEDIUM (fix in next sprint):');
      mediums.forEach((m, i) => console.log(`  ${i + 1}. ${m.issue}`));
    }

    console.log('\n── STRIDE Threat Model ──────────────────────────────────────');
    Object.entries(stride).forEach(([threat, status]) => {
      const icon = status === 'MITIGATED' ? '✓' : status === 'REVIEW' ? '?' : '✗';
      console.log(`  ${icon} ${threat.padEnd(15)} ${status}`);
    });

    const verdict = criticals.length === 0 && highs.filter(h => h.severity === SEVERITIES.CRITICAL).length === 0
      ? '✅ SECURE — clear to ship' : '🚫 NEEDS WORK — fix findings above';
    console.log(`\n  Verdict: ${verdict}\n`);
  }
}

module.exports = { SecurityAgent };
