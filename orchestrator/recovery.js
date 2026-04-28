/**
 * ag-stack · Recovery Engine
 *
 * Handles agent failures. Classifies errors, attempts recovery,
 * decides when to escalate to human vs retry vs rollback.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RECOVERABLE = {
  'ENOENT':           'missing_file',
  'MODULE_NOT_FOUND': 'missing_dep',
  'EACCES':           'permission',
  'ETIMEDOUT':        'timeout',
  'ECONNREFUSED':     'server_down',
};

class RecoveryEngine {
  async handle(agentName, error) {
    const errorType = this.classify(error);
    console.log(`\n[recovery] Handling ${errorType} from ${agentName}`);

    switch (errorType) {
      case 'missing_dep':
        return this.installMissingDep(error);
      case 'missing_file':
        return this.handleMissingFile(error);
      case 'timeout':
        return this.handleTimeout(agentName);
      case 'server_down':
        return this.handleServerDown();
      case 'test_failure':
        return this.handleTestFailure(error);
      default:
        return this.escalate(agentName, error);
    }
  }

  classify(error) {
    const msg = error.message || '';
    if (msg.includes('Cannot find module') || msg.includes('MODULE_NOT_FOUND')) return 'missing_dep';
    if (msg.includes('ENOENT'))       return 'missing_file';
    if (msg.includes('EACCES'))       return 'permission';
    if (msg.includes('ETIMEDOUT'))    return 'timeout';
    if (msg.includes('ECONNREFUSED')) return 'server_down';
    if (msg.includes('test') && msg.includes('fail')) return 'test_failure';
    return 'unknown';
  }

  async installMissingDep(error) {
    const match = error.message.match(/Cannot find module '([^']+)'/);
    if (!match) return null;

    const pkg = match[1].split('/')[0]; // Get base package name
    console.log(`[recovery] Installing missing dependency: ${pkg}`);

    try {
      execSync(`npm install ${pkg} --save 2>/dev/null`, { stdio: 'pipe', timeout: 60000 });
      console.log(`[recovery] Installed ${pkg} ✓`);
      return { recovered: true, action: `installed ${pkg}` };
    } catch (e) {
      console.error(`[recovery] Could not install ${pkg}: ${e.message}`);
      return null;
    }
  }

  async handleMissingFile(error) {
    const match = error.message.match(/ENOENT.*'([^']+)'/);
    if (!match) return null;

    const filePath = match[1];
    console.log(`[recovery] Missing file: ${filePath}`);

    // If it's a directory, create it
    if (!path.extname(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
      return { recovered: true, action: `created directory ${filePath}` };
    }

    return null; // Can't auto-create arbitrary files
  }

  async handleTimeout(agentName) {
    console.log(`[recovery] ${agentName} timed out. Will retry with extended timeout.`);
    return { recovered: false, action: 'retry_with_timeout' };
  }

  async handleServerDown() {
    console.log('[recovery] Server appears down. Waiting 5s before retry...');
    await new Promise(r => setTimeout(r, 5000));
    return { recovered: false, action: 'waited_for_server' };
  }

  async handleTestFailure(error) {
    console.log('[recovery] Test failure detected. Running /investigate to find root cause...');
    // Don't auto-fix — escalate to detective
    return null;
  }

  async escalate(agentName, error) {
    console.log(`\n[recovery] Could not auto-recover from ${agentName} failure.`);
    console.log(`Error: ${error.message}`);
    console.log('\nManual steps:');
    console.log('  1. Check the error message above');
    console.log('  2. Fix the issue in your code');
    console.log(`  3. Re-run: ag-stack ${agentName}`);
    return null;
  }

  /**
   * Create a rollback snapshot before risky operations.
   */
  async createSnapshot(name) {
    const snapshotDir = path.join(process.cwd(), '.ag', 'snapshots');
    fs.mkdirSync(snapshotDir, { recursive: true });

    try {
      const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      const snapshot = { name, hash, ts: new Date().toISOString() };
      fs.writeFileSync(
        path.join(snapshotDir, `${name}.json`),
        JSON.stringify(snapshot, null, 2)
      );
      console.log(`[recovery] Snapshot created: ${name} @ ${hash.slice(0, 8)}`);
      return snapshot;
    } catch {
      return null;
    }
  }

  /**
   * Roll back to a named snapshot.
   */
  async rollback(name) {
    const snapshotPath = path.join(process.cwd(), '.ag', 'snapshots', `${name}.json`);
    if (!fs.existsSync(snapshotPath)) {
      console.error(`[recovery] No snapshot found: ${name}`);
      return false;
    }

    const { hash } = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    try {
      execSync(`git reset --hard ${hash}`, { stdio: 'pipe' });
      console.log(`[recovery] Rolled back to ${hash.slice(0, 8)} ✓`);
      return true;
    } catch (e) {
      console.error(`[recovery] Rollback failed: ${e.message}`);
      return false;
    }
  }
}

module.exports = { RecoveryEngine };
