#!/usr/bin/env node
/**
 * ag-stack · CLI Entry Point
 *
 * Usage:
 *   ag-stack autoplan "Build a SaaS billing system"
 *   ag-stack review
 *   ag-stack design-review
 *   ag-stack qa
 *   ag-stack security
 *   ag-stack ship [major|minor|patch|micro]
 *   ag-stack investigate "users logged out after 24h"
 *   ag-stack docs
 *   ag-stack run "full goal" --bump minor   ← Full autonomous pipeline
 *   ag-stack run "full goal" --dry-run      ← Preview only
 */

const { OrchestrationEngine } = require('./orchestrator/engine');

const [, , command, ...args] = process.argv;

const HELP = `
ag-stack · Multi-Agent Autonomous Engineering Team

Commands:
  autoplan  "<goal>"              CEO review + execution plan
  design-review                   Designer review of UI changes
  review                          Eng Manager code review
  qa                              QA Lead browser testing
  security                        Security Officer OWASP audit
  ship [major|minor|patch|micro]  Release Manager ship pipeline
  investigate "<bug>"             Detective root cause analysis
  docs                            Doc Engineer sync documentation
  run "<goal>" [--bump level]     Full autonomous pipeline end-to-end
  run "<goal>" --dry-run          Preview plan without executing

Examples:
  ag-stack autoplan "Build a multi-tenant SaaS billing system with Stripe"
  ag-stack investigate "users are logged out after exactly 24 hours"
  ag-stack ship minor
  ag-stack run "Build AI startup MVP" --bump minor
`;

async function main() {
  const engine = new OrchestrationEngine({
    dryRun: args.includes('--dry-run'),
    parallelReview: true,
    maxRetries: 3,
  });

  const bumpLevel = (() => {
    const idx = args.indexOf('--bump');
    return idx !== -1 ? args[idx + 1] : 'patch';
  })();

  try {
    switch (command) {
      case 'autoplan':
      case 'plan': {
        const goal = args.filter(a => !a.startsWith('--')).join(' ');
        if (!goal) { console.error('Usage: ag-stack autoplan "<goal>"'); process.exit(1); }
        await engine.autoplan(goal);
        break;
      }

      case 'design-review':
      case 'dr':
        await engine.designReview();
        break;

      case 'review':
      case 'r':
        await engine.review();
        break;

      case 'qa':
      case 'test':
        await engine.qa();
        break;

      case 'security':
      case 'sec':
        await engine.security();
        break;

      case 'ship':
      case 'release': {
        const bump = args[0]?.match(/^(major|minor|patch|micro)$/) ? args[0] : 'patch';
        await engine.ship(bump);
        break;
      }

      case 'investigate':
      case 'debug': {
        const bug = args.filter(a => !a.startsWith('--')).join(' ');
        if (!bug) { console.error('Usage: ag-stack investigate "<bug description>"'); process.exit(1); }
        await engine.investigate(bug);
        break;
      }

      case 'docs':
        await engine.docs();
        break;

      case 'run':
      case 'pipeline': {
        const goal = args.filter(a => !a.startsWith('--')).join(' ').replace(/--bump\s+\w+/, '').trim();
        if (!goal) { console.error('Usage: ag-stack run "<goal>"'); process.exit(1); }
        await engine.fullPipeline(goal, bumpLevel);
        break;
      }

      case 'help':
      case '--help':
      case '-h':
      case undefined:
        console.log(HELP);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (err) {
    console.error(`\n[ag-stack] Fatal error: ${err.message}`);
    if (process.env.AG_DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
