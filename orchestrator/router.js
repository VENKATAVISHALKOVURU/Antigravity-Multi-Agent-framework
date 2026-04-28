/**
 * ag-stack · Task Router
 *
 * Looks at a task description and decides which agent owns it.
 * Used by the CEO's execution plan to auto-assign work.
 */

const AGENT_SIGNALS = {
  'designer': [
    'component', 'ui', 'ux', 'layout', 'design', 'style', 'css', 'tailwind',
    'responsive', 'mobile', 'button', 'form', 'modal', 'nav', 'sidebar',
    'page', 'screen', 'visual', 'color', 'typography', 'animation', 'icon',
  ],
  'eng-manager': [
    'api', 'endpoint', 'route', 'database', 'schema', 'migration', 'model',
    'service', 'controller', 'middleware', 'auth', 'jwt', 'session', 'cache',
    'queue', 'worker', 'cron', 'webhook', 'integration', 'refactor', 'review',
  ],
  'qa': [
    'test', 'testing', 'spec', 'e2e', 'unit', 'integration', 'coverage',
    'browser', 'playwright', 'cypress', 'regression', 'bug', 'fix',
    'validate', 'verify', 'check', 'assert',
  ],
  'security': [
    'security', 'auth', 'authorization', 'permission', 'role', 'owasp',
    'injection', 'xss', 'csrf', 'secret', 'credential', 'encrypt', 'hash',
    'token', 'oauth', 'saml', 'audit', 'vulnerability', 'cve',
  ],
  'release-manager': [
    'deploy', 'ship', 'release', 'version', 'changelog', 'ci', 'cd',
    'pipeline', 'build', 'tag', 'pr', 'merge', 'publish', 'rollout',
  ],
  'detective': [
    'debug', 'investigate', 'root cause', 'bug', 'error', 'crash',
    'reproduce', 'trace', 'stack trace', 'failure', 'broken',
  ],
  'doc-engineer': [
    'docs', 'documentation', 'readme', 'changelog', 'architecture',
    'guide', 'tutorial', 'api docs', 'openapi', 'swagger', 'jsdoc',
  ],
  'ceo': [
    'plan', 'design', 'architecture', 'strategy', 'breakdown', 'approach',
    'prioritize', 'scope', 'estimate', 'feature', 'goal', 'objective',
  ],
};

class Router {
  /**
   * Route a task to the best-matching agent.
   * @param {string} task - Task description
   * @returns {string} agentName
   */
  route(task) {
    const lower = task.toLowerCase();
    const scores = {};

    Object.entries(AGENT_SIGNALS).forEach(([agent, signals]) => {
      scores[agent] = signals.filter(signal => lower.includes(signal)).length;
    });

    const best = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .find(([, score]) => score > 0);

    return best ? best[0] : 'eng-manager'; // Default to eng-manager
  }

  /**
   * Route multiple tasks and return an assignment map.
   * @param {Array} tasks - Array of task objects with .task string
   * @returns {Array} tasks with .owner assigned
   */
  routeTasks(tasks) {
    return tasks.map(t => ({
      ...t,
      owner: t.owner || this.route(t.task),
    }));
  }

  /**
   * Return which agents need to run for a given set of changed files.
   * @param {Array} changedFiles
   * @returns {Array} ordered agent names
   */
  agentsForFiles(changedFiles) {
    const needed = new Set(['eng-manager']); // Always runs

    const hasUI = changedFiles.some(f => f.match(/\.(tsx|jsx|css|scss|html|vue|svelte)$/));
    const hasTests = changedFiles.some(f => f.match(/\.test\.|\.spec\./));
    const hasDocs = changedFiles.some(f => f.match(/\.md$|docs\//));
    const hasSecrets = changedFiles.some(f => f.match(/\.env|secret|credential/i));

    if (hasUI) needed.add('designer');
    if (hasTests) needed.add('qa');
    if (hasSecrets) needed.add('security');
    if (hasDocs) needed.add('doc-engineer');

    // Order matters: designer before eng-manager, qa after, security last before release
    const order = ['designer', 'eng-manager', 'qa', 'security', 'doc-engineer'];
    return order.filter(a => needed.has(a));
  }
}

module.exports = { Router };
