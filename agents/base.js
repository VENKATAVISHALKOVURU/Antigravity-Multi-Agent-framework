/**
 * ag-stack · Base Agent
 *
 * Every agent in the team extends this class.
 * Defines: verdict schema, handoff protocol, memory access, logging.
 */

const fs = require('fs');
const path = require('path');

// ─── Verdict schema ───────────────────────────────────────────────────────────
// Every agent outputs a verdict in this shape.
// The next agent in the pipeline reads this before acting.
const VERDICTS = {
  APPROVED: 'APPROVED',
  CHANGES_REQUIRED: 'CHANGES_REQUIRED',
  BLOCKED: 'BLOCKED',           // Hard stop — do not proceed
  NEEDS_INPUT: 'NEEDS_INPUT',   // Waiting on human taste decision
};

const SEVERITIES = {
  CRITICAL: 'CRITICAL',   // Must fix before any deploy
  HIGH: 'HIGH',           // Must fix before next release
  MEDIUM: 'MEDIUM',       // Fix in next sprint
  LOW: 'LOW',             // Nice to have
  SUGGESTION: 'SUGGESTION',
};

class BaseAgent {
  constructor(name, role, handoffTarget) {
    this.name = name;
    this.role = role;
    this.handoffTarget = handoffTarget; // Which agent receives this verdict
    this.memoryPath = path.join(process.cwd(), 'memory', 'workspace.json');
    this.verdictPath = path.join(process.cwd(), '.ag', `${name}-verdict.json`);
    this.logs = [];
  }

  // ─── Memory ──────────────────────────────────────────────────────────────

  readMemory() {
    try {
      if (fs.existsSync(this.memoryPath)) {
        return JSON.parse(fs.readFileSync(this.memoryPath, 'utf8'));
      }
    } catch (e) {
      this.log('WARN', `Could not read memory: ${e.message}`);
    }
    return {};
  }

  writeMemory(updates) {
    const current = this.readMemory();
    const updated = { ...current, ...updates, lastUpdated: new Date().toISOString() };
    fs.mkdirSync(path.dirname(this.memoryPath), { recursive: true });
    fs.writeFileSync(this.memoryPath, JSON.stringify(updated, null, 2));
  }

  // ─── Verdict ─────────────────────────────────────────────────────────────

  /**
   * Write a structured verdict for the next agent to read.
   *
   * @param {string} verdict - One of VERDICTS
   * @param {Array}  blockers - Must-fix items before proceeding
   * @param {Array}  warnings - Should-fix items
   * @param {Array}  suggestions - Nice-to-have items
   * @param {Object} data - Any extra structured data for the next agent
   */
  writeVerdict({ verdict, blockers = [], warnings = [], suggestions = [], data = {} }) {
    const output = {
      agent: this.name,
      role: this.role,
      verdict,
      timestamp: new Date().toISOString(),
      approved_for: verdict === VERDICTS.APPROVED ? this.handoffTarget : null,
      blockers,
      warnings,
      suggestions,
      data,
    };

    fs.mkdirSync(path.dirname(this.verdictPath), { recursive: true });
    fs.writeFileSync(this.verdictPath, JSON.stringify(output, null, 2));

    this.log('VERDICT', `${verdict} → ${this.handoffTarget || 'human'}`);
    return output;
  }

  /**
   * Read the verdict from a previous agent.
   * @param {string} agentName - Which agent's verdict to read
   */
  readVerdict(agentName) {
    const verdictPath = path.join(process.cwd(), '.ag', `${agentName}-verdict.json`);
    if (!fs.existsSync(verdictPath)) {
      throw new Error(`No verdict found from ${agentName}. Run /${agentName} first.`);
    }
    return JSON.parse(fs.readFileSync(verdictPath, 'utf8'));
  }

  /**
   * Require that a previous agent approved before this agent runs.
   * Hard-stops if the previous agent blocked or required changes.
   */
  requireApprovalFrom(agentName) {
    const verdict = this.readVerdict(agentName);
    if (verdict.verdict !== VERDICTS.APPROVED) {
      this.log('BLOCKED', `${agentName} has not approved. Verdict: ${verdict.verdict}`);
      if (verdict.blockers.length > 0) {
        console.log('\nBlockers to resolve:');
        verdict.blockers.forEach((b, i) => {
          console.log(`  ${i + 1}. [${b.severity}] ${b.issue}`);
          if (b.fix) console.log(`     Fix: ${b.fix}`);
        });
      }
      process.exit(1);
    }
    this.log('OK', `${agentName} approved. Proceeding.`);
    return verdict;
  }

  // ─── Logging ─────────────────────────────────────────────────────────────

  log(level, message) {
    const ts = new Date().toISOString().slice(11, 19);
    const line = `[${ts}] [${this.name}] [${level}] ${message}`;
    this.logs.push(line);
    console.log(line);
  }

  banner(title) {
    const line = '─'.repeat(60);
    console.log(`\n${line}`);
    console.log(` ${this.role.toUpperCase()} · ${title}`);
    console.log(`${line}\n`);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Create a finding object (used in blockers/warnings/suggestions arrays).
   */
  finding(severity, issue, file = null, line = null, fix = null) {
    return { severity, issue, file, line, fix };
  }

  /**
   * Print a final summary table.
   */
  printSummary(blockers, warnings, suggestions) {
    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log(`│ ${this.name.padEnd(20)} Summary`.padEnd(61) + '│');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log(`│  Blockers:    ${String(blockers.length).padEnd(43)}│`);
    console.log(`│  Warnings:    ${String(warnings.length).padEnd(43)}│`);
    console.log(`│  Suggestions: ${String(suggestions.length).padEnd(43)}│`);
    console.log('└─────────────────────────────────────────────────────────┘\n');
  }
}

module.exports = { BaseAgent, VERDICTS, SEVERITIES };
