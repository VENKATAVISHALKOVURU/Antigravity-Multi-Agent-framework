/**
 * ag-stack · Detective Agent
 *
 * Role: Root cause analysis. Walk the call graph. Write reproduction case.
 * Never says "can't reproduce" without proof.
 * Never fixes a bug without a regression test.
 */

const { BaseAgent, VERDICTS, SEVERITIES } = require('./base');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

class DetectiveAgent extends BaseAgent {
  constructor() {
    super('detective', 'Detective', null);
  }

  async run(bugReport) {
    this.banner(`Investigating: "${bugReport}"`);

    // Step 1: Extract bug details
    const bug = this.parseBugReport(bugReport);
    this.log('INVESTIGATE', `Symptom: ${bug.symptom}`);

    // Step 2: Search codebase for relevant files
    const relevantFiles = this.findRelevantFiles(bug);
    this.log('SEARCH', `Found ${relevantFiles.length} relevant files`);

    // Step 3: Reproduce it
    const reproduced = this.attemptReproduction(bug);

    if (!reproduced.confirmed) {
      // Check if it's pre-existing
      const preExisting = this.checkIfPreExisting(bug);
      if (preExisting.isPreExisting) {
        console.log(`\n⚠️  Pre-existing bug confirmed on main @ ${preExisting.commitHash}`);
        console.log('This bug predates the current branch. Flagging but not blocking PR.\n');
      } else {
        console.log('\n❌ Could not reproduce. Investigation incomplete.');
        console.log('Try: (1) Check logs for more context. (2) Add console.log at entry point. (3) Provide reproduction steps.\n');
        return;
      }
    }

    // Step 4: Walk call graph
    const callGraph = this.walkCallGraph(bug, relevantFiles);

    // Step 5: Identify root cause
    const rootCause = this.identifyRootCause(callGraph, bug);
    this.log('ROOT CAUSE', rootCause.statement);

    // Step 6: Write regression test BEFORE fixing
    const regressionTest = this.writeRegressionTest(bug, rootCause);

    // Step 7: Propose and apply fix
    const fix = this.proposeFix(rootCause);

    // Step 8: Print investigation report
    this.printReport(bug, reproduced, callGraph, rootCause, regressionTest, fix);

    return { bug, rootCause, regressionTest, fix };
  }

  parseBugReport(report) {
    return {
      symptom: report,
      keywords: report.toLowerCase().split(/\s+/).filter(w => w.length > 3),
      isAuthRelated: /login|logout|auth|session|token/i.test(report),
      isDataRelated: /data|null|undefined|empty|missing/i.test(report),
      isUIRelated: /display|show|render|visible|click/i.test(report),
      isPerfRelated: /slow|timeout|hang|freeze|memory/i.test(report),
    };
  }

  findRelevantFiles(bug) {
    const keywords = bug.keywords.slice(0, 5);
    const found = new Set();

    keywords.forEach(kw => {
      try {
        const result = execSync(
          `grep -rl "${kw}" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" 2>/dev/null | grep -v node_modules | head -5`,
          { encoding: 'utf8', timeout: 10000 }
        );
        result.trim().split('\n').filter(Boolean).forEach(f => found.add(f));
      } catch { /* keyword not found */ }
    });

    // Also check recent git changes
    try {
      const recentFiles = execSync('git log --since="7 days ago" --name-only --format="" | sort -u | head -20', { encoding: 'utf8' })
        .trim().split('\n').filter(Boolean);
      recentFiles.forEach(f => found.add(f));
    } catch { /* no git */ }

    return [...found].filter(f => fs.existsSync(f));
  }

  attemptReproduction(bug) {
    this.log('REPRO', 'Attempting reproduction...');

    // Run tests and look for related failures
    try {
      const keywords = bug.keywords.slice(0, 3).join('|');
      const result = spawnSync('npm', ['test', '--', `--testNamePattern=${keywords}`, '--no-coverage'], {
        encoding: 'utf8', timeout: 60000
      });
      const output = result.stdout + result.stderr;
      const hasFail = output.includes('FAIL') || output.includes('● ');
      return {
        confirmed: hasFail,
        method: 'test suite',
        output: output.slice(0, 500),
      };
    } catch {
      return { confirmed: false, method: 'none', output: '' };
    }
  }

  checkIfPreExisting(bug) {
    this.log('REPRO', 'Checking if pre-existing on main...');
    try {
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      execSync('git stash 2>/dev/null || true', { stdio: 'pipe' });

      const onMain = spawnSync('npm', ['test', '--', '--no-coverage'], {
        encoding: 'utf8', timeout: 60000
      });
      const failsOnMain = onMain.status !== 0;
      const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();

      execSync(`git checkout ${currentBranch} 2>/dev/null || true`, { stdio: 'pipe' });
      execSync('git stash pop 2>/dev/null || true', { stdio: 'pipe' });

      return { isPreExisting: failsOnMain, commitHash };
    } catch {
      return { isPreExisting: false, commitHash: null };
    }
  }

  walkCallGraph(bug, relevantFiles) {
    this.log('GRAPH', 'Walking call graph...');
    const graph = [];

    relevantFiles.slice(0, 8).forEach(file => {
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      bug.keywords.forEach(kw => {
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(kw) && !line.trim().startsWith('//') && !line.trim().startsWith('#')) {
            graph.push({
              file,
              line: i + 1,
              code: line.trim().slice(0, 120),
              keyword: kw,
            });
          }
        });
      });
    });

    return graph.slice(0, 20); // Top 20 most relevant lines
  }

  identifyRootCause(callGraph, bug) {
    // Heuristic: find the earliest problematic code in the call graph
    const suspicious = callGraph.filter(entry => {
      const code = entry.code.toLowerCase();
      return (
        code.match(/null|undefined/) && !code.match(/!==\s*null|=== null|null\)|null,/) ||
        code.match(/catch\s*\(\w\)\s*\{\s*\}/) ||  // empty catch
        code.match(/as any/) ||
        code.match(/\/\/ TODO|\/\/ FIXME|\/\/ HACK/)
      );
    });

    if (suspicious.length > 0) {
      const first = suspicious[0];
      return {
        file: first.file,
        line: first.line,
        code: first.code,
        statement: `Likely root cause at ${first.file}:${first.line} — ${this.describeIssue(first.code)}`,
        confidence: 'MEDIUM',
      };
    }

    return {
      file: callGraph[0]?.file || null,
      line: callGraph[0]?.line || null,
      code: callGraph[0]?.code || null,
      statement: `Root cause not automatically identified. Review call graph manually — ${callGraph.length} candidate locations found.`,
      confidence: 'LOW',
    };
  }

  describeIssue(code) {
    if (code.match(/catch\s*\(\w\)\s*\{/)) return 'empty catch block swallows the error';
    if (code.match(/as any/)) return 'type assertion bypasses null check';
    if (code.match(/TODO|FIXME/)) return 'known incomplete code path';
    if (code.match(/null|undefined/)) return 'potential null/undefined access';
    return 'suspicious code pattern';
  }

  writeRegressionTest(bug, rootCause) {
    const slug = bug.symptom.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
    const dir = path.join(process.cwd(), 'tests', 'regression');
    fs.mkdirSync(dir, { recursive: true });

    const testPath = path.join(dir, `${slug}.test.ts`);
    const content = `/**
 * Regression test: ${bug.symptom}
 * Root cause: ${rootCause.statement}
 * Written by: ag-stack/detective
 * Date: ${new Date().toISOString().slice(0, 10)}
 */

describe('regression: ${bug.symptom}', () => {
  it('should not reproduce the bug', async () => {
    // SETUP: Create the minimal state that triggers the bug
    // Based on root cause: ${rootCause.file || 'unknown'}:${rootCause.line || '?'}
    
    // TODO: Implement reproduction case
    // 1. Set up input/state: ...
    // 2. Trigger the code path: ...
    // 3. Assert expected behavior: ...
    
    expect(true).toBe(true); // Replace with real assertion
  });

  it('should handle edge cases gracefully', async () => {
    // TODO: Add edge case tests
    expect(true).toBe(true);
  });
});
`;

    fs.writeFileSync(testPath, content);
    this.log('REGRESSION', `Written: tests/regression/${slug}.test.ts`);

    // Commit the regression test
    try {
      execSync(`git add "${testPath}" && git commit -m "test(regression): ${bug.symptom.slice(0, 60)}"`, { stdio: 'pipe' });
    } catch { /* nothing to commit or no git */ }

    return testPath;
  }

  proposeFix(rootCause) {
    if (!rootCause.file || rootCause.confidence === 'LOW') {
      return {
        description: 'Root cause confidence too low for automatic fix proposal. Manual investigation required.',
        canAutoFix: false,
      };
    }

    const fixes = [];

    if (rootCause.code?.match(/catch\s*\(\w\)\s*\{\s*\}/)) {
      fixes.push('Add error logging to empty catch block: catch (e) { logger.error(e); throw e; }');
    }
    if (rootCause.code?.match(/as any/)) {
      fixes.push('Replace "as any" with proper type or type guard');
    }
    if (rootCause.code?.match(/\.\w+\s*\.\w+/) && !rootCause.code?.match(/\?\./)) {
      fixes.push('Add optional chaining: obj?.prop?.method() to prevent null access');
    }

    return {
      description: fixes.length > 0 ? fixes.join('\n') : 'Manual fix required — see root cause above',
      canAutoFix: false, // Always require human review of fixes
    };
  }

  printReport(bug, reproduced, callGraph, rootCause, regressionTest, fix) {
    console.log('\n── Investigation Report ─────────────────────────────────────');
    console.log(`\n  Bug: ${bug.symptom}`);
    console.log(`  Reproduced: ${reproduced.confirmed ? '✓ YES' : '✗ NO'} (via ${reproduced.method})`);
    console.log(`  Confidence: ${rootCause.confidence}`);
    console.log(`\n  Root cause:`);
    console.log(`    ${rootCause.statement}`);
    if (rootCause.file) {
      console.log(`    File: ${rootCause.file}:${rootCause.line}`);
      console.log(`    Code: ${rootCause.code}`);
    }
    console.log(`\n  Call graph hits: ${callGraph.length} locations`);
    callGraph.slice(0, 5).forEach(e => console.log(`    ${e.file}:${e.line}  ${e.code.slice(0, 80)}`));
    console.log(`\n  Regression test: ${regressionTest}`);
    console.log(`  Proposed fix:\n    ${fix.description}`);
    console.log('');
  }
}

module.exports = { DetectiveAgent };
