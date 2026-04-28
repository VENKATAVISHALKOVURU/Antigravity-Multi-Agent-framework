/**
 * ag-stack · Designer Agent
 *
 * Role: Visual quality review. Catches AI slop. Enforces real UX.
 * Input: CEO verdict (must be APPROVED), changed files
 * Output: Design verdict for Eng Manager
 *
 * Runs as /design-review or automatically after /autoplan when UI scope detected.
 */

const { BaseAgent, VERDICTS, SEVERITIES } = require('./base');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DesignerAgent extends BaseAgent {
  constructor() {
    super('designer', 'Designer', 'eng-manager');
  }

  async run(options = {}) {
    this.banner('Design Review');

    // Require CEO approval first
    let ceoPlan = null;
    if (!options.skipCeoCheck) {
      try {
        ceoPlan = this.readVerdict('ceo');
        if (ceoPlan.verdict !== VERDICTS.APPROVED) {
          this.log('BLOCKED', 'CEO has not approved. Run /autoplan first.');
          process.exit(1);
        }
      } catch (e) {
        this.log('WARN', 'No CEO verdict found. Running standalone design review.');
      }
    }

    const blockers = [];
    const warnings = [];
    const suggestions = [];

    // Get changed files
    const changedFiles = this.getChangedFiles();
    const uiFiles = changedFiles.filter(f =>
      f.match(/\.(tsx|jsx|html|css|scss|vue|svelte)$/)
    );

    this.log('FILES', `${uiFiles.length} UI files to review`);

    if (uiFiles.length === 0) {
      this.log('SKIP', 'No UI files changed. Approving automatically.');
      return this.writeVerdict({ verdict: VERDICTS.APPROVED, blockers, warnings, suggestions });
    }

    // Run all design checks
    for (const file of uiFiles) {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, 'utf8');

      this.checkAISlop(file, content, blockers, warnings);
      this.checkAccessibility(file, content, blockers, warnings);
      this.checkMobileResponsiveness(file, content, blockers, warnings);
      this.checkTypography(file, content, warnings, suggestions);
      this.checkSpacing(file, content, suggestions);
      this.checkColorContrast(file, content, blockers, warnings);
      this.checkErrorStates(file, content, warnings);
      this.checkLoadingStates(file, content, suggestions);
    }

    // Check for design system consistency
    this.checkDesignSystemConsistency(uiFiles, warnings, suggestions);

    this.printSummary(blockers, warnings, suggestions);

    // Print findings
    if (blockers.length > 0) {
      console.log('\n── BLOCKERS (must fix before eng review) ───────────────────');
      blockers.forEach((b, i) => {
        console.log(`\n  ${i + 1}. ${b.file}${b.line ? ':' + b.line : ''}`);
        console.log(`     Issue: ${b.issue}`);
        if (b.fix) console.log(`     Fix:   ${b.fix}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n── WARNINGS (fix before ship) ──────────────────────────────');
      warnings.forEach((w, i) => {
        console.log(`  ${i + 1}. ${w.file}: ${w.issue}`);
      });
    }

    const verdict = blockers.length === 0 ? VERDICTS.APPROVED : VERDICTS.CHANGES_REQUIRED;

    return this.writeVerdict({ verdict, blockers, warnings, suggestions });
  }

  // ─── Design Checks ─────────────────────────────────────────────────────────

  checkAISlop(file, content, blockers, warnings) {
    // Patterns that scream "AI generated default UI"
    const slopPatterns = [
      { pattern: /className=".*bg-blue-500.*rounded.*px-4.*py-2/,    issue: 'Default Tailwind button — no visual character. Design a real button style.' },
      { pattern: /Lorem ipsum/i,                                       issue: 'Lorem ipsum placeholder still in code.' },
      { pattern: /TODO.*placeholder|placeholder.*TODO/i,              issue: 'Placeholder content not replaced.' },
      { pattern: /text-gray-500.*text-sm.*mt-1.*Your (description|subtitle|tagline)/i, issue: 'Generic subtitle copy detected. Write real copy.' },
      { pattern: /Card\s+Title|Section\s+Title|Page\s+Title/,         issue: 'Generic placeholder titles in UI.' },
      { pattern: /<h[1-6][^>]*>Feature [0-9]/i,                       issue: 'Generic "Feature N" heading — replace with real feature names.' },
    ];

    slopPatterns.forEach(({ pattern, issue }) => {
      if (pattern.test(content)) {
        warnings.push(this.finding(SEVERITIES.MEDIUM, issue, file));
      }
    });
  }

  checkAccessibility(file, content, blockers, warnings) {
    // Images without alt text
    const imgNoAlt = /<img(?![^>]*alt=)[^>]*>/g;
    if (imgNoAlt.test(content)) {
      blockers.push(this.finding(
        SEVERITIES.HIGH,
        'img element missing alt attribute — WCAG 2.1 violation',
        file, null,
        'Add alt="" for decorative images, or alt="description" for meaningful images'
      ));
    }

    // Buttons without accessible label
    const btnNoLabel = /<button[^>]*>(\s*<svg|<img|\s*<i\s)/g;
    if (btnNoLabel.test(content)) {
      blockers.push(this.finding(
        SEVERITIES.HIGH,
        'Icon-only button with no accessible label — screen readers cannot describe it',
        file, null,
        'Add aria-label="description" or visually-hidden text inside the button'
      ));
    }

    // Form inputs without labels
    const inputNoLabel = /<input(?![^>]*aria-label)(?![^>]*id=)[^>]*>/g;
    if (inputNoLabel.test(content)) {
      warnings.push(this.finding(
        SEVERITIES.MEDIUM,
        'Form input may be missing an associated label',
        file, null,
        'Add <label htmlFor="id"> or aria-label="description" to each input'
      ));
    }

    // Missing focus styles
    if (content.includes('outline: none') || content.includes('outline:none') ||
        content.includes('outline-none') && !content.includes('focus-visible')) {
      blockers.push(this.finding(
        SEVERITIES.HIGH,
        'focus outline removed — keyboard users cannot see focused element',
        file, null,
        'Replace outline-none with focus-visible:ring-2 focus-visible:ring-offset-2'
      ));
    }
  }

  checkMobileResponsiveness(file, content, blockers, warnings) {
    // Fixed widths that break mobile
    const fixedWidths = /width:\s*[6-9]\d\dpx|width:\s*[1-9]\d{3,}px/g;
    if (fixedWidths.test(content)) {
      warnings.push(this.finding(
        SEVERITIES.MEDIUM,
        'Fixed pixel width detected — likely breaks on mobile (<375px)',
        file, null,
        'Use max-w-* with w-full, or responsive Tailwind prefixes (sm: md: lg:)'
      ));
    }

    // Horizontal overflow
    if (content.includes('overflow-x: scroll') || content.includes('overflow-x:scroll')) {
      warnings.push(this.finding(
        SEVERITIES.LOW,
        'Horizontal scroll explicitly set — test on iPhone 12 viewport',
        file
      ));
    }

    // Missing mobile breakpoints on layout components
    if (file.match(/layout|page|container/i)) {
      if (!content.match(/sm:|md:|lg:|@media/)) {
        warnings.push(this.finding(
          SEVERITIES.MEDIUM,
          'Layout component with no responsive breakpoints',
          file, null,
          'Add sm:/md:/lg: prefixes for flex direction, padding, font size'
        ));
      }
    }
  }

  checkTypography(file, content, warnings, suggestions) {
    // Text that's too small
    const tinyText = /text-xs.*text-gray/g;
    if (tinyText.test(content)) {
      suggestions.push(this.finding(
        SEVERITIES.SUGGESTION,
        'Very small grey text detected — check legibility on low-contrast displays',
        file
      ));
    }

    // Long lines without max-width
    if (content.includes('prose') || content.includes('article')) {
      if (!content.match(/max-w-(prose|[23456789]xl|screen-[a-z]+)/)) {
        suggestions.push(this.finding(
          SEVERITIES.SUGGESTION,
          'Long-form text without max-width — lines may be too long to read comfortably',
          file, null,
          'Add max-w-prose or max-w-2xl to contain reading width'
        ));
      }
    }
  }

  checkSpacing(file, content, suggestions) {
    // Inconsistent spacing patterns
    const hasArbitrarySpacing = /[mp][xylrbt]?-\[[\d.]+(?:px|rem|em)\]/g;
    if (hasArbitrarySpacing.test(content)) {
      suggestions.push(this.finding(
        SEVERITIES.SUGGESTION,
        'Arbitrary spacing values detected — prefer Tailwind scale (4, 6, 8, 12...)',
        file
      ));
    }
  }

  checkColorContrast(file, content, blockers, warnings) {
    // Known low-contrast combinations
    const lowContrast = [
      { pair: ['text-gray-400', 'bg-white'],   ratio: '2.6:1', required: '4.5:1' },
      { pair: ['text-gray-300', 'bg-gray-100'], ratio: '1.6:1', required: '4.5:1' },
      { pair: ['text-yellow-300', 'bg-white'],  ratio: '1.7:1', required: '4.5:1' },
    ];

    lowContrast.forEach(({ pair, ratio, required }) => {
      if (content.includes(pair[0]) && content.includes(pair[1])) {
        blockers.push(this.finding(
          SEVERITIES.HIGH,
          `Likely low contrast: ${pair[0]} on ${pair[1]} — estimated ${ratio} (required ${required})`,
          file, null,
          'Use Tailwind\'s color checker or https://webaim.org/resources/contrastchecker/'
        ));
      }
    });
  }

  checkErrorStates(file, content, warnings) {
    // Forms without error state handling
    if (content.match(/<form|<Form/) && !content.match(/error|invalid|aria-invalid/i)) {
      warnings.push(this.finding(
        SEVERITIES.MEDIUM,
        'Form detected without visible error states',
        file, null,
        'Add error message display under each field and set aria-invalid="true" on invalid inputs'
      ));
    }
  }

  checkLoadingStates(file, content, suggestions) {
    // Async operations without loading feedback
    if (content.match(/async|await|fetch|axios/) && !content.match(/loading|isLoading|isPending|spinner|skeleton/i)) {
      suggestions.push(this.finding(
        SEVERITIES.SUGGESTION,
        'Async operation without loading state feedback',
        file, null,
        'Add loading spinner or skeleton state while async operations complete'
      ));
    }
  }

  checkDesignSystemConsistency(files, warnings, suggestions) {
    // Check if multiple files use inconsistent color approaches
    const usesTailwind = files.some(f => {
      try { return fs.readFileSync(f, 'utf8').includes('className='); } catch { return false; }
    });
    const usesInlineStyles = files.some(f => {
      try { return fs.readFileSync(f, 'utf8').includes('style={{'); } catch { return false; }
    });

    if (usesTailwind && usesInlineStyles) {
      warnings.push(this.finding(
        SEVERITIES.MEDIUM,
        'Mixed styling: some files use Tailwind, others use inline styles',
        null, null,
        'Pick one approach. Prefer Tailwind utilities; use inline styles only for truly dynamic values.'
      ));
    }
  }

  getChangedFiles() {
    try {
      const base = execSync('git merge-base HEAD origin/main 2>/dev/null || echo HEAD~1', { encoding: 'utf8' }).trim();
      return execSync(`git diff ${base} HEAD --name-only`, { encoding: 'utf8' })
        .trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}

module.exports = { DesignerAgent };
