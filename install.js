#!/usr/bin/env node
/**
 * ag-stack installer
 * Run: npx ag-stack-install
 * or:  node install.js [--global | --project]
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync } = require('child_process');

const args     = process.argv.slice(2);
const isGlobal = args.includes('--global') || !args.includes('--project');

const GLOBAL_PATH  = path.join(os.homedir(), '.gemini', 'antigravity', 'skills');
const PROJECT_PATH = path.join(process.cwd(), '.agent', 'skills');
const TARGET       = isGlobal ? GLOBAL_PATH : PROJECT_PATH;

const SKILLS_SRC = path.join(__dirname, 'skills');

const AGENTS = [
  'ag-ceo', 'ag-designer', 'ag-eng-manager',
  'ag-qa', 'ag-security', 'ag-release-manager',
  'ag-detective', 'ag-doc-engineer'
];

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║         ag-stack · AntiGravity Skills Installer     ║');
console.log('╚══════════════════════════════════════════════════════╝\n');
console.log(`Installing ${isGlobal ? 'GLOBALLY' : 'for this project'} → ${TARGET}\n`);

fs.mkdirSync(TARGET, { recursive: true });

let installed = 0;
for (const agent of AGENTS) {
  const src  = path.join(SKILLS_SRC, agent);
  const dest = path.join(TARGET, agent);
  if (!fs.existsSync(src)) { console.log(`  ⚠ Skipping ${agent} (not found in ${src})`); continue; }
  fs.mkdirSync(dest, { recursive: true });
  // Copy SKILL.md and scripts/ if present
  const files = fs.readdirSync(src);
  for (const f of files) {
    const s = path.join(src, f);
    const d = path.join(dest, f);
    if (fs.statSync(s).isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      for (const sf of fs.readdirSync(s)) {
        fs.copyFileSync(path.join(s, sf), path.join(d, sf));
      }
    } else {
      fs.copyFileSync(s, d);
    }
  }
  console.log(`  ✓ ${agent}`);
  installed++;
}

console.log(`\n✅ ${installed}/8 agents installed to:\n   ${TARGET}`);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  NEXT STEP: Restart AntiGravity');
console.log('  Then just describe what you want in natural language:');
console.log('');
console.log('  "Plan a SaaS billing feature"    → 🧠 CEO/Planner');
console.log('  "Review my code changes"          → ⚙️  Eng Manager');
console.log('  "Check UI for issues"             → 🎨 Designer');
console.log('  "Test the app in browser"         → 🔍 QA Lead');
console.log('  "Audit security before deploy"    → 🔒 Security');
console.log('  "Ship this as a minor release"    → 🚀 Release Manager');
console.log('  "Investigate this bug"            → 🕵️  Detective');
console.log('  "Sync all documentation"          → 📝 Doc Engineer');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
