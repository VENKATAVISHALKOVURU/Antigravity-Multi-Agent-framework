/**
 * ag-stack · Doc Engineer Agent
 *
 * Role: Keep all docs in sync with the code. Nothing drifts.
 * Reads every doc file, diffs against code, updates what changed.
 */

const { BaseAgent, VERDICTS, SEVERITIES } = require('./base');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DocEngineerAgent extends BaseAgent {
  constructor() {
    super('doc-engineer', 'Doc Engineer', null);
  }

  async run(options = {}) {
    this.banner('Documentation Sync');

    const warnings = [];
    const updated = [];

    // Get changed source files
    let changedFiles = [];
    try {
      const base = execSync('git merge-base HEAD origin/main 2>/dev/null || echo HEAD~1', { encoding: 'utf8' }).trim();
      changedFiles = execSync(`git diff ${base} HEAD --name-only`, { encoding: 'utf8' })
        .trim().split('\n').filter(Boolean);
    } catch { /* no git */ }

    this.log('FILES', `${changedFiles.length} files changed since last merge`);

    // Check and update each doc
    updated.push(...this.syncReadme(changedFiles));
    updated.push(...this.syncArchitecture(changedFiles));
    updated.push(...this.syncChangelog());
    updated.push(...this.syncANTIGRAVITY(changedFiles));

    // Check for orphaned docs (docs that reference deleted files)
    this.checkOrphanedRefs(changedFiles, warnings);

    // Commit if anything updated
    try {
      const diff = execSync('git diff --stat 2>/dev/null', { encoding: 'utf8' });
      if (diff.trim()) {
        execSync('git add -A && git commit -m "docs: sync documentation after changes"', { stdio: 'pipe' });
        this.log('GIT', 'Documentation changes committed ✓');
      }
    } catch { /* nothing to commit */ }

    console.log('\n── Doc Sync Report ──────────────────────────────────────────');
    if (updated.length === 0) {
      console.log('  All docs are up to date ✓');
    } else {
      updated.forEach(u => console.log(`  ✓ Updated: ${u}`));
    }
    if (warnings.length > 0) {
      console.log('\n  Warnings:');
      warnings.forEach(w => console.log(`  ⚠ ${w.issue}`));
    }

    return this.writeVerdict({ verdict: VERDICTS.APPROVED, blockers: [], warnings });
  }

  syncReadme(changedFiles) {
    if (!fs.existsSync('README.md')) return [];
    const updated = [];
    const readme = fs.readFileSync('README.md', 'utf8');

    // Check if package.json version drifted
    if (fs.existsSync('package.json') && fs.existsSync('VERSION')) {
      const version = fs.readFileSync('VERSION', 'utf8').trim();
      if (!readme.includes(version)) {
        this.log('README', `Version ${version} not reflected in README`);
        // Update version badge if present
        const updated_readme = readme.replace(/v\d+\.\d+\.\d+(\.\d+)?/g, `v${version}`);
        if (updated_readme !== readme) {
          fs.writeFileSync('README.md', updated_readme);
          updated.push('README.md (version badge)');
        }
      }
    }

    // Check if new CLI commands were added but not documented
    const newRouteFiles = changedFiles.filter(f => f.match(/route|command|cli|cmd/i));
    if (newRouteFiles.length > 0 && !readme.includes('## Commands')) {
      this.log('README', 'New route/command files detected — verify README command list is current');
    }

    return updated;
  }

  syncArchitecture(changedFiles) {
    const updated = [];
    const archPath = 'docs/architecture.md';
    if (!fs.existsSync(archPath)) return [];

    const arch = fs.readFileSync(archPath, 'utf8');

    // If new agent files added, check they're documented
    const newAgents = changedFiles.filter(f => f.match(/agents\/\w+\.js$/));
    newAgents.forEach(agentFile => {
      const name = path.basename(agentFile, '.js');
      if (!arch.includes(name)) {
        this.log('ARCH', `New agent "${name}" not documented in architecture.md`);
        // Append a note
        const note = `\n### ${name} agent\n> Added — document this agent's role and handoff protocol.\n`;
        fs.appendFileSync(archPath, note);
        updated.push(`docs/architecture.md (added ${name})`);
      }
    });

    return updated;
  }

  syncChangelog() {
    const updated = [];
    if (!fs.existsSync('CHANGELOG.md')) {
      fs.writeFileSync('CHANGELOG.md', '# Changelog\n\n> Changes are documented here by the Release Manager after each ship.\n');
      updated.push('CHANGELOG.md (created)');
    }
    return updated;
  }

  syncANTIGRAVITY(changedFiles) {
    const updated = [];
    if (!fs.existsSync('ANTIGRAVITY.md')) return [];

    // If new skills added, check they're in the command table
    const newSkills = changedFiles.filter(f => f.match(/skills\/.*SKILL\.md$/));
    if (newSkills.length > 0) {
      this.log('ANTIGRAVITY', `${newSkills.length} new skills — verify ANTIGRAVITY.md command table`);
    }

    return updated;
  }

  checkOrphanedRefs(changedFiles, warnings) {
    const deletedFiles = changedFiles.filter(f => !fs.existsSync(f));
    if (deletedFiles.length === 0) return;

    const docFiles = ['README.md', 'docs/architecture.md', 'ANTIGRAVITY.md'].filter(f => fs.existsSync(f));
    docFiles.forEach(doc => {
      const content = fs.readFileSync(doc, 'utf8');
      deletedFiles.forEach(deleted => {
        const name = path.basename(deleted);
        if (content.includes(name)) {
          warnings.push(this.finding(
            SEVERITIES.LOW,
            `${doc} references deleted file: ${deleted}`,
            doc, null,
            `Remove or update the reference to ${name}`
          ));
        }
      });
    });
  }
}

module.exports = { DocEngineerAgent };
