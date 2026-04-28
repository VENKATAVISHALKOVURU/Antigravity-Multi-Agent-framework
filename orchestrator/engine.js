/**
 * ag-stack · Orchestration Engine
 *
 * The brain. Reads the plan, assigns tasks to agents, runs them in the
 * right order, passes verdicts between them, handles failures.
 *
 * Pipeline (with parallelism where safe):
 *   CEO → [Designer ∥ EngManager] → QA → Security → ReleaseManager
 */

const { CeoAgent }            = require('../agents/ceo');
const { DesignerAgent }       = require('../agents/designer');
const { EngManagerAgent }     = require('../agents/eng-manager');
const { QaAgent }             = require('../agents/qa');
const { SecurityAgent }       = require('../agents/security');
const { ReleaseManagerAgent } = require('../agents/release-manager');
const { DetectiveAgent }      = require('../agents/detective');
const { DocEngineerAgent }    = require('../agents/doc-engineer');
const { RecoveryEngine }      = require('./recovery');
const { Router }              = require('./router');

const fs   = require('fs');
const path = require('path');

class OrchestrationEngine {
  constructor(config = {}) {
    this.config   = { maxRetries: 3, parallelReview: true, dryRun: false, ...config };
    this.recovery = new RecoveryEngine();
    this.router   = new Router();
    this.runLog   = [];
  }

  // ─── Entry points (called by ag.js CLI) ────────────────────────────────────

  async autoplan(goal) {
    this.log('ENGINE', `Starting /autoplan: "${goal}"`);
    const ceo = new CeoAgent();
    const verdict = await this.runWithRetry(() => ceo.run(goal), 'ceo');

    if (verdict.data?.hasUI && !this.config.dryRun) {
      const designer = new DesignerAgent();
      await this.runWithRetry(() => designer.run(), 'designer');
    }

    this.log('ENGINE', '/autoplan complete. Ready to build.');
    return verdict;
  }

  async review() {
    this.log('ENGINE', 'Starting /review (eng-manager)');
    const eng = new EngManagerAgent();
    return this.runWithRetry(() => eng.run(), 'eng-manager');
  }

  async designReview() {
    this.log('ENGINE', 'Starting /design-review');
    const designer = new DesignerAgent();
    return this.runWithRetry(() => designer.run({ skipCeoCheck: true }), 'designer');
  }

  async qa() {
    this.log('ENGINE', 'Starting /qa');
    const qa = new QaAgent();
    return this.runWithRetry(() => qa.run(), 'qa');
  }

  async security() {
    this.log('ENGINE', 'Starting /security');
    const sec = new SecurityAgent();
    return this.runWithRetry(() => sec.run(), 'security');
  }

  async ship(bumpLevel = 'patch') {
    this.log('ENGINE', `Starting /ship (${bumpLevel})`);
    const rm = new ReleaseManagerAgent();
    return this.runWithRetry(() => rm.run(bumpLevel), 'release-manager');
  }

  async investigate(bugReport) {
    this.log('ENGINE', `Starting /investigate: "${bugReport}"`);
    const det = new DetectiveAgent();
    return this.runWithRetry(() => det.run(bugReport), 'detective');
  }

  async docs() {
    this.log('ENGINE', 'Starting /docs');
    const doc = new DocEngineerAgent();
    return this.runWithRetry(() => doc.run(), 'doc-engineer');
  }

  /**
   * Full pipeline: autoplan → review → qa → security → ship
   * Used when user wants end-to-end autonomous execution.
   */
  async fullPipeline(goal, bumpLevel = 'patch') {
    this.log('ENGINE', `Starting FULL PIPELINE: "${goal}"`);
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║         ag-stack · Full Autonomous Pipeline              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    if (this.config.dryRun) {
      this.log('ENGINE', 'DRY RUN — showing plan only, not executing');
    }

    const results = {};

    // Stage 1: CEO plans
    this.printStage(1, 'CEO Planning');
    results.ceo = await this.autoplan(goal);
    if (this.isBlocked(results.ceo)) {
      this.log('ENGINE', 'Pipeline blocked at CEO stage. Resolve blockers and re-run.');
      return results;
    }

    if (this.config.dryRun) {
      this.log('ENGINE', 'Dry run complete. Review the plan above.');
      return results;
    }

    // Stage 2: Parallel — Designer + Eng Manager review
    this.printStage(2, 'Design + Engineering Review (parallel)');
    const hasUI = results.ceo.data?.hasUI;

    if (this.config.parallelReview && hasUI) {
      const [designVerdict, engVerdict] = await Promise.all([
        this.runWithRetry(() => new DesignerAgent().run(), 'designer'),
        this.runWithRetry(() => new EngManagerAgent().run({ skipDesignerCheck: true }), 'eng-manager'),
      ]);
      results.designer = designVerdict;
      results.engManager = engVerdict;
    } else {
      results.engManager = await this.review();
    }

    if (this.isBlocked(results.engManager) || this.isBlocked(results.designer)) {
      this.log('ENGINE', 'Pipeline blocked at review stage. Fix issues and re-run /ship.');
      return results;
    }

    // Stage 3: QA
    this.printStage(3, 'QA — Browser Testing');
    results.qa = await this.qa();
    if (this.isBlocked(results.qa)) {
      this.log('ENGINE', 'Pipeline blocked at QA. Fix bugs and re-run /qa.');
      return results;
    }

    // Stage 4: Security
    this.printStage(4, 'Security Audit');
    results.security = await this.security();
    if (this.isBlocked(results.security)) {
      this.log('ENGINE', 'Pipeline BLOCKED by Security. Fix critical findings before shipping.');
      return results;
    }

    // Stage 5: Ship
    this.printStage(5, 'Release Manager — Ship');
    results.ship = await this.ship(bumpLevel);

    // Final summary
    this.printFinalSummary(results);
    return results;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  async runWithRetry(fn, agentName, retries = null) {
    const maxRetries = retries ?? this.config.maxRetries;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        this.runLog.push({ agent: agentName, attempt, verdict: result?.verdict, ts: new Date().toISOString() });
        return result;
      } catch (err) {
        this.log('RETRY', `${agentName} failed (attempt ${attempt}/${maxRetries}): ${err.message}`);

        if (attempt === maxRetries) {
          this.log('ERROR', `${agentName} failed after ${maxRetries} attempts`);
          const recovered = await this.recovery.handle(agentName, err);
          if (!recovered) throw err;
          return recovered;
        }

        // Exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }

  isBlocked(verdict) {
    return verdict?.verdict === 'BLOCKED' || verdict?.verdict === 'CHANGES_REQUIRED';
  }

  log(level, message) {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] [engine] [${level}] ${message}`);
  }

  printStage(n, name) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(` Stage ${n}: ${name}`);
    console.log(`${'─'.repeat(60)}\n`);
  }

  printFinalSummary(results) {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                   Pipeline Complete                      ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    Object.entries(results).forEach(([agent, verdict]) => {
      if (!verdict) return;
      const status = verdict.verdict === 'APPROVED' ? '✅' : verdict.verdict === 'BLOCKED' ? '🚫' : '⚠️ ';
      console.log(`║  ${status} ${agent.padEnd(20)} ${(verdict.verdict || 'N/A').padEnd(20)}║`);
    });
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Write run log
    const logPath = path.join(process.cwd(), '.ag', 'run-log.json');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.writeFileSync(logPath, JSON.stringify(this.runLog, null, 2));
  }
}

module.exports = { OrchestrationEngine };
