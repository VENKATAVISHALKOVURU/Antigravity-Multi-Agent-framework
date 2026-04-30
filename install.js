#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const isProject = process.argv.includes('--project');
const GLOBAL_PATH  = path.join(os.homedir(), '.gemini', 'antigravity', 'skills');
const PROJECT_PATH = path.join(process.cwd(), '.agent', 'skills');
const TARGET       = isProject ? PROJECT_PATH : GLOBAL_PATH;
const SKILL_SRC    = path.join(__dirname, 'skills', 'ag-stack');
const SKILL_DEST   = path.join(TARGET, 'ag-stack');

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║       ag-stack · AntiGravity Skill Installer        ║');
console.log('╚══════════════════════════════════════════════════════╝\n');
console.log(`Mode:   ${isProject ? 'Project only (.agent/skills/)' : 'Global (~/.gemini/antigravity/skills/)'}`);
console.log(`Target: ${SKILL_DEST}\n`);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(SKILL_SRC)) {
  console.error(`ERROR: ${SKILL_SRC} not found`); process.exit(1);
}

fs.mkdirSync(TARGET, { recursive: true });
copyDir(SKILL_SRC, SKILL_DEST);

// Make scripts executable
const scripts = path.join(SKILL_DEST, 'scripts');
if (fs.existsSync(scripts)) {
  fs.readdirSync(scripts).forEach(f => fs.chmodSync(path.join(scripts, f), 0o755));
}

console.log('  ✅ ag-stack installed at:', SKILL_DEST);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  NEXT: Restart AntiGravity, then say:');
console.log('');
console.log('  "run the full pipeline on [your goal]"');
console.log('    → All 8 agents run in sequence with verification gates');
console.log('');
console.log('  "continue pipeline"');
console.log('    → Resumes from where it stopped after you fix blockers');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
