/**
 * ag-stack · CEO / Planner Agent
 *
 * Role: Strategic review + execution plan.
 * Input: Raw user goal (string)
 * Output: plan.json + verdict for Designer + Eng Manager
 *
 * Runs automatically as the first stage of /autoplan.
 * Never skips strategic review, even for "simple" goals.
 */

const { BaseAgent, VERDICTS, SEVERITIES } = require('./base');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CeoAgent extends BaseAgent {
  constructor() {
    super('ceo', 'CEO / Planner', 'designer+eng-manager');
  }

  async run(goal) {
    this.banner('Strategic Review + Execution Planning');
    this.log('START', `Goal received: "${goal}"`);

    // 1. Read project memory
    const memory = this.readMemory();
    if (memory.project) {
      this.log('MEMORY', `Project: ${memory.project} | Stack: ${(memory.stack || []).join(', ')}`);
    }

    // 2. Strategic review
    const strategy = this.strategicReview(goal, memory);

    // 3. Detect scope for routing
    const hasUI = this.detectUIScope(goal);
    const hasAPI = this.detectAPIScope(goal);
    const hasSecurity = this.detectSecurityScope(goal);

    this.log('SCOPE', `UI: ${hasUI} | API: ${hasAPI} | Security: ${hasSecurity}`);

    // 4. Decompose into tasks
    const plan = this.decomposeTasks(goal, strategy, { hasUI, hasAPI, hasSecurity });

    // 5. Write plan.json
    const planPath = path.join(process.cwd(), '.ag', 'plan.json');
    fs.mkdirSync(path.dirname(planPath), { recursive: true });
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    this.log('PLAN', `Written to .ag/plan.json — ${plan.tasks.length} tasks across ${plan.phases.length} phases`);

    // 6. Surface taste decisions
    if (plan.tasteDecisions.length > 0) {
      console.log('\n── Taste decisions (need your input) ──────────────────────');
      plan.tasteDecisions.forEach((d, i) => {
        console.log(`\n  ${i + 1}. ${d.question}`);
        d.options.forEach((o, j) => console.log(`     ${['A', 'B', 'C'][j]}) ${o}`));
        console.log(`     My lean: ${d.lean}`);
      });
      console.log('');
    }

    // 7. Write verdict
    const verdict = this.writeVerdict({
      verdict: strategy.proceed ? VERDICTS.APPROVED : VERDICTS.NEEDS_INPUT,
      blockers: strategy.blockers,
      warnings: strategy.warnings,
      suggestions: [],
      data: { plan, hasUI, hasAPI, hasSecurity },
    });

    // 8. Update memory
    this.writeMemory({
      lastGoal: goal,
      lastPlan: new Date().toISOString(),
      currentPhase: 'planning',
    });

    this.printSummary(strategy.blockers, strategy.warnings, []);

    return verdict;
  }

  strategicReview(goal, memory) {
    // CEO-level questions every goal must answer
    const blockers = [];
    const warnings = [];

    // Is the goal concrete enough to execute?
    if (goal.split(' ').length < 5) {
      blockers.push(this.finding(
        SEVERITIES.HIGH,
        'Goal is too vague to plan. Add: who the user is, what they can do, and what success looks like.',
        null, null,
        'Example: "Build a SaaS app where freelancers track invoices and clients pay online via Stripe"'
      ));
    }

    // Does it conflict with existing project direction?
    if (memory.projectDirection && !goal.toLowerCase().includes(memory.project?.toLowerCase())) {
      warnings.push(this.finding(
        SEVERITIES.MEDIUM,
        `This goal may conflict with existing project direction: "${memory.projectDirection}"`,
        null, null,
        'Confirm this is additive to the existing product, not a pivot.'
      ));
    }

    this.log('CEO', 'Strategic review complete.');
    return { proceed: blockers.length === 0, blockers, warnings };
  }

  detectUIScope(goal) {
    const uiTerms = ['ui', 'page', 'screen', 'component', 'dashboard', 'form', 'button',
      'modal', 'sidebar', 'nav', 'layout', 'frontend', 'landing', 'design'];
    const matches = uiTerms.filter(t => goal.toLowerCase().includes(t));
    return matches.length >= 1;
  }

  detectAPIScope(goal) {
    const apiTerms = ['api', 'endpoint', 'rest', 'graphql', 'webhook', 'backend',
      'server', 'database', 'db', 'auth', 'service'];
    return apiTerms.some(t => goal.toLowerCase().includes(t));
  }

  detectSecurityScope(goal) {
    const secTerms = ['auth', 'login', 'payment', 'stripe', 'password', 'token',
      'jwt', 'oauth', 'permission', 'role', 'admin'];
    return secTerms.some(t => goal.toLowerCase().includes(t));
  }

  decomposeTasks(goal, strategy, scope) {
    // Build structured plan based on detected scope
    const phases = [];
    const tasks = [];
    const tasteDecisions = [];

    // Phase 1: Foundation
    phases.push({ id: 'foundation', name: 'Foundation', estimateHours: 2 });
    tasks.push(
      { id: 't1', phase: 'foundation', owner: 'eng-manager', task: 'Set up project structure and dependencies', priority: 1 },
      { id: 't2', phase: 'foundation', owner: 'eng-manager', task: 'Configure environment and secrets management', priority: 1 },
      { id: 't3', phase: 'foundation', owner: 'eng-manager', task: 'Initialize database schema and migrations', priority: 2 },
    );

    // Phase 2: Core feature
    phases.push({ id: 'core', name: 'Core Feature', estimateHours: 4 });

    if (scope.hasAPI) {
      tasks.push(
        { id: 't4', phase: 'core', owner: 'eng-manager', task: 'Design and implement API endpoints', priority: 1 },
        { id: 't5', phase: 'core', owner: 'eng-manager', task: 'Implement business logic layer', priority: 2 },
        { id: 't6', phase: 'core', owner: 'eng-manager', task: 'Add input validation and error handling', priority: 2 },
      );
    }

    if (scope.hasUI) {
      tasks.push(
        { id: 't7', phase: 'core', owner: 'designer', task: 'Create component architecture and design system', priority: 1 },
        { id: 't8', phase: 'core', owner: 'designer', task: 'Build responsive layout and navigation', priority: 2 },
        { id: 't9', phase: 'core', owner: 'designer', task: 'Implement core user flows and error states', priority: 2 },
      );
      tasteDecisions.push({
        question: 'Visual style: clean minimal (white space, subtle borders) vs bold/branded (strong colors, prominent CTAs)?',
        options: ['Clean minimal — focus on content', 'Bold branded — focus on conversion', 'Match existing brand guidelines'],
        lean: 'Clean minimal — works for most B2B SaaS'
      });
    }

    if (scope.hasSecurity) {
      tasks.push(
        { id: 't10', phase: 'core', owner: 'security', task: 'Implement authentication and session management', priority: 1 },
        { id: 't11', phase: 'core', owner: 'security', task: 'Add authorization middleware and role checks', priority: 1 },
      );
    }

    // Phase 3: Quality + Ship
    phases.push({ id: 'ship', name: 'Quality + Ship', estimateHours: 3 });
    tasks.push(
      { id: 't12', phase: 'ship', owner: 'qa', task: 'Write and run unit + integration tests', priority: 1 },
      { id: 't13', phase: 'ship', owner: 'qa', task: 'Browser-based QA on all critical flows', priority: 1 },
      { id: 't14', phase: 'ship', owner: 'security', task: 'Security audit: OWASP Top 10 check', priority: 1 },
      { id: 't15', phase: 'ship', owner: 'release-manager', task: 'Ship: version bump + changelog + PR', priority: 2 },
    );

    return {
      goal,
      generatedAt: new Date().toISOString(),
      phases,
      tasks,
      tasteDecisions,
      totalEstimateHours: phases.reduce((sum, p) => sum + p.estimateHours, 0),
      agentPipeline: ['ceo', scope.hasUI ? 'designer' : null, 'eng-manager', 'qa', 'security', 'release-manager'].filter(Boolean),
    };
  }
}

module.exports = { CeoAgent };
