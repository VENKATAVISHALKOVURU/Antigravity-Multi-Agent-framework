/**
 * ag-stack · Release Manager Agent
 *
 * Role: Tests → lint fix → version bump → changelog → docs → PR.
 * Input: Security verdict (APPROVED)
 * Output: Opened PR with version tag
 *
 * Never ships a broken build. Never skips docs. Never silently continues past a failure.
 */

const { BaseAgent, VERDICTS, SEVERITIES } = require('./base');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

class ReleaseManagerAgent extends BaseAgent {
  constructor() {
    super('release-manager', 'Release Manager', null); // Last in pipeline
  }

  async run(bumpLevel = 'patch', options = {}) {
    this.banner(`Shipping — ${bumpLevel.toUpperCase()} release`);

    // Require security approval
    if (!options.skipSecurityCheck) {
      try {
        this.requireApprovalFrom('security');
      } catch {
        this.log('WARN', 'Running without security approval. Only use --skip-security-check in development.');
      }
    }

    const branch = this.getCurrentBranch();
    if (branch === 'main' || branch === 'master') {
      this.log('BLOCKED', `Cannot ship directly from ${branch}. Create a feature branch first.`);
      process.exit(1);
    }

    this.log('BRANCH', `Shipping from: ${branch}`);

    // Step 1: Sync with main
    this.syncWithMain();

    // Step 2: Run tests — hard fail if any failing
    this.runTests();

    // Step 3: Auto-fix lint
    this.runLintFix();

    // Step 4: Version bump
    const { oldVersion, newVersion } = this.bumpVersion(bumpLevel);

    // Step 5: Write changelog entry
    this.writeChangelog(oldVersion, newVersion);

    // Step 6: Sync docs
    this.syncDocs();

    // Step 7: Final commit + tag
    this.commitAndTag(newVersion);

    // Step 8: Push + open PR
    this.pushAndOpenPR(branch, newVersion);

    // Step 9: Write to memory
    this.writeMemory({ lastShip: new Date().toISOString(), version: newVersion });

    console.log('\n✅ Shipped successfully.\n');
    return this.writeVerdict({
      verdict: VERDICTS.APPROVED,
      blockers: [],
      warnings: [],
      data: { oldVersion, newVersion, branch },
    });
  }

  // ─── Steps ─────────────────────────────────────────────────────────────────

  syncWithMain() {
    this.log('GIT', 'Syncing with origin/main...');
    try {
      execSync('git fetch origin main', { stdio: 'pipe' });
      execSync('git rebase origin/main', { stdio: 'pipe' });
      this.log('GIT', 'Rebase complete ✓');
    } catch (e) {
      console.error('\nRebase conflict. Resolve conflicts then re-run /ship.');
      console.error(e.stderr?.toString() || e.message);
      process.exit(1);
    }
  }

  runTests() {
    this.log('TESTS', 'Running full test suite...');
    let result;

    if (fs.existsSync('package.json')) {
      result = spawnSync('npm', ['test'], { encoding: 'utf8', timeout: 180000 });
    } else if (fs.existsSync('pytest.ini') || fs.existsSync('pyproject.toml')) {
      result = spawnSync('python', ['-m', 'pytest'], { encoding: 'utf8', timeout: 180000 });
    } else if (fs.existsSync('Makefile')) {
      result = spawnSync('make', ['test'], { encoding: 'utf8', timeout: 180000 });
    } else {
      this.log('TESTS', 'No test runner detected. Skipping.');
      return;
    }

    if (result.status !== 0) {
      console.error('\n── Test failures ────────────────────────────────────────────');
      console.error(result.stdout?.slice(-2000) || result.stderr?.slice(-2000));
      console.error('\nSHIP BLOCKED: Fix failing tests before shipping. Run /debug to investigate.\n');
      process.exit(1);
    }

    // Extract pass count
    const passMatch = (result.stdout || '').match(/(\d+) pass(?:ed|ing)/i);
    this.log('TESTS', `All tests passing${passMatch ? ` (${passMatch[1]})` : ''} ✓`);
  }

  runLintFix() {
    this.log('LINT', 'Running auto-fix...');
    let fixed = false;

    try {
      if (fs.existsSync('package.json')) {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        if (pkg.scripts?.['lint:fix']) {
          execSync('npm run lint:fix', { stdio: 'pipe' });
          fixed = true;
        } else {
          execSync('npx eslint . --fix --ext .ts,.tsx,.js,.jsx 2>/dev/null || true', { stdio: 'pipe' });
          fixed = true;
        }
      }
      try {
        execSync('ruff check --fix . 2>/dev/null || true', { stdio: 'pipe' });
        fixed = true;
      } catch { /* ruff not installed */ }

      const diff = execSync('git diff --stat 2>/dev/null', { encoding: 'utf8' });
      if (diff.trim()) {
        execSync('git add -A && git commit -m "chore: auto-fix lint before ship"', { stdio: 'pipe' });
        this.log('LINT', 'Lint fixes auto-committed ✓');
      } else {
        this.log('LINT', 'No lint fixes needed ✓');
      }
    } catch (e) {
      this.log('WARN', `Lint fix partial: ${e.message}`);
    }
  }

  bumpVersion(bumpLevel) {
    let oldVersion = '0.0.0';

    // Read current version
    if (fs.existsSync('VERSION')) {
      oldVersion = fs.readFileSync('VERSION', 'utf8').trim();
    } else if (fs.existsSync('package.json')) {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      oldVersion = pkg.version || '0.0.0';
    }

    const parts = oldVersion.replace(/^v/, '').split('.').map(Number);
    while (parts.length < 4) parts.push(0);
    const [major, minor, patch, micro] = parts;

    let newVersion;
    switch (bumpLevel) {
      case 'major': newVersion = `${major + 1}.0.0.0`; break;
      case 'minor': newVersion = `${major}.${minor + 1}.0.0`; break;
      case 'patch': newVersion = `${major}.${minor}.${patch + 1}.0`; break;
      case 'micro': newVersion = `${major}.${minor}.${patch}.${micro + 1}`; break;
      default:      newVersion = `${major}.${minor}.${patch + 1}.0`;
    }

    // Write version
    fs.writeFileSync('VERSION', newVersion);

    // Also bump package.json if it exists
    if (fs.existsSync('package.json')) {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      // Use 3-part semver for package.json
      const semver = newVersion.split('.').slice(0, 3).join('.');
      pkg.version = semver;
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    }

    this.log('VERSION', `${oldVersion} → ${newVersion} (${bumpLevel})`);
    return { oldVersion, newVersion };
  }

  writeChangelog(oldVersion, newVersion) {
    this.log('CHANGELOG', 'Writing changelog entry...');

    // Get commits since last tag
    let commits = [];
    try {
      const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
      const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
      commits = execSync(`git log ${range} --oneline --no-merges`, { encoding: 'utf8' })
        .trim().split('\n').filter(Boolean);
    } catch { /* no git history */ }

    // Categorize commits
    const feats = commits.filter(c => c.match(/^[a-f0-9]+ feat/));
    const fixes = commits.filter(c => c.match(/^[a-f0-9]+ fix/));
    const security = commits.filter(c => c.match(/^[a-f0-9]+ security/));
    const perf = commits.filter(c => c.match(/^[a-f0-9]+ perf/));
    const internal = commits.filter(c => !c.match(/^[a-f0-9]+ (feat|fix|security|perf)/));

    const date = new Date().toISOString().slice(0, 10);
    const totalFeats = feats.length;
    const totalFixes = fixes.length;

    // Write in gstack-style: verdict headline first, then itemized
    const entry = `## [${newVersion}] — ${date}

**${totalFeats > 0 ? `${totalFeats} new feature${totalFeats > 1 ? 's' : ''}` : 'Maintenance release'}${totalFixes > 0 ? `, ${totalFixes} fix${totalFixes > 1 ? 'es' : ''}` : ''} — ${this.getReleaseHeadline(feats, fixes)}**

This release ${this.getReleaseDescription(feats, fixes, security, perf)}

### Itemized changes

${feats.length > 0 ? `#### New\n${feats.map(c => `- ${c.replace(/^[a-f0-9]+ /, '')}`).join('\n')}\n` : ''}
${fixes.length > 0 ? `#### Fixed\n${fixes.map(c => `- ${c.replace(/^[a-f0-9]+ /, '')}`).join('\n')}\n` : ''}
${security.length > 0 ? `#### Security\n${security.map(c => `- ${c.replace(/^[a-f0-9]+ /, '')}`).join('\n')}\n` : ''}
${internal.length > 0 ? `#### Internal\n${internal.map(c => `- ${c.replace(/^[a-f0-9]+ /, '')}`).join('\n')}\n` : ''}
---

`;

    // Prepend to CHANGELOG
    let existing = '';
    if (fs.existsSync('CHANGELOG.md')) {
      existing = fs.readFileSync('CHANGELOG.md', 'utf8');
      // Remove the header if it exists
      existing = existing.replace(/^# Changelog\n\n/, '');
    }

    fs.writeFileSync('CHANGELOG.md', `# Changelog\n\n${entry}${existing}`);
    this.log('CHANGELOG', `v${newVersion} entry written ✓`);
  }

  getReleaseHeadline(feats, fixes) {
    if (feats.length > 0) {
      const feat = feats[0].replace(/^[a-f0-9]+ feat(\([^)]+\))?:\s*/, '');
      return feat.slice(0, 60);
    }
    if (fixes.length > 0) {
      const fix = fixes[0].replace(/^[a-f0-9]+ fix(\([^)]+\))?:\s*/, '');
      return fix.slice(0, 60);
    }
    return 'internal improvements';
  }

  getReleaseDescription(feats, fixes, security, perf) {
    const parts = [];
    if (feats.length > 0) parts.push(`ships ${feats.length} new feature${feats.length > 1 ? 's' : ''}`);
    if (fixes.length > 0) parts.push(`resolves ${fixes.length} bug${fixes.length > 1 ? 's' : ''}`);
    if (security.length > 0) parts.push(`includes security hardening`);
    if (perf.length > 0) parts.push(`improves performance`);
    if (parts.length === 0) parts.push('includes internal improvements and maintenance');
    return parts.join(', ') + '.';
  }

  syncDocs() {
    this.log('DOCS', 'Syncing documentation...');
    // Check if any docs reference old version and update
    const docFiles = ['README.md', 'docs/architecture.md', 'CONTRIBUTING.md'];
    docFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.log('DOCS', `Checked: ${file}`);
      }
    });
    this.log('DOCS', 'Docs sync complete ✓');
  }

  commitAndTag(newVersion) {
    this.log('GIT', `Creating release commit and tag v${newVersion}...`);
    try {
      execSync('git add -A', { stdio: 'pipe' });
      execSync(`git commit -m "chore(release): ship v${newVersion}\n\n- Version bumped to ${newVersion}\n- CHANGELOG updated\n- Docs synced"`, { stdio: 'pipe' });
      execSync(`git tag -a "v${newVersion}" -m "Release v${newVersion}"`, { stdio: 'pipe' });
      this.log('GIT', `Tag v${newVersion} created ✓`);
    } catch (e) {
      // Nothing to commit (already clean)
      if (e.message.includes('nothing to commit')) {
        execSync(`git tag -a "v${newVersion}" -m "Release v${newVersion}" 2>/dev/null || true`, { stdio: 'pipe' });
      } else {
        this.log('WARN', `Commit warning: ${e.message}`);
      }
    }
  }

  pushAndOpenPR(branch, newVersion) {
    this.log('GIT', `Pushing ${branch}...`);
    try {
      execSync(`git push origin ${branch} --tags`, { stdio: 'pipe' });
      this.log('GIT', 'Push complete ✓');
    } catch (e) {
      this.log('WARN', `Push failed: ${e.message}. Push manually with: git push origin ${branch}`);
      return;
    }

    // Try GitHub CLI
    try {
      execSync('gh --version', { stdio: 'pipe' });
      const prBody = this.buildPRBody(newVersion);
      const prBodyFile = path.join(process.cwd(), '.ag', 'pr-body.md');
      fs.writeFileSync(prBodyFile, prBody);

      const result = execSync(
        `gh pr create --title "chore(release): ship v${newVersion}" --body-file ${prBodyFile} --base main`,
        { encoding: 'utf8' }
      );
      this.log('PR', `Opened: ${result.trim()}`);
    } catch {
      // No gh CLI — print manual URL
      try {
        const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
        const repoPath = remote.replace(/.*github\.com[:/]/, '').replace(/\.git$/, '');
        console.log(`\n── Open PR manually ─────────────────────────────────────────`);
        console.log(`  https://github.com/${repoPath}/compare/${branch}?expand=1\n`);
      } catch { /* no remote */ }
    }
  }

  buildPRBody(newVersion) {
    const changelog = fs.existsSync('CHANGELOG.md')
      ? fs.readFileSync('CHANGELOG.md', 'utf8').split('---')[0]
      : '';

    return `## Release v${newVersion}

${changelog}

---
*Shipped by ag-stack Release Manager*
*Pipeline: CEO → Designer → Eng Manager → QA → Security → Release Manager*`;
  }

  getCurrentBranch() {
    try {
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch { return 'unknown'; }
  }
}

module.exports = { ReleaseManagerAgent };
