#!/usr/bin/env bash
# ag-stack installer — installs all 8 agents as native AntiGravity skills
# Usage: bash install.sh [--global | --project]
# Global:  installs to ~/.gemini/antigravity/skills/  (all projects)
# Project: installs to ./.agent/skills/               (this project only)

set -e

REPO="https://github.com/VENKATAVISHALKOVURU/Antigravity-Multi-Agent-framework"
SKILLS_DIR="$(cd "$(dirname "$0")/.." && pwd)/skills"

# Determine install target
if [[ "$1" == "--global" ]]; then
  TARGET="$HOME/.gemini/antigravity/skills"
  echo "Installing ag-stack globally → $TARGET"
elif [[ "$1" == "--project" ]] || [[ -z "$1" ]]; then
  TARGET="$(pwd)/.agent/skills"
  echo "Installing ag-stack for this project → $TARGET"
else
  echo "Usage: bash install.sh [--global | --project]"
  exit 1
fi

mkdir -p "$TARGET"

AGENTS=(ag-ceo ag-designer ag-eng-manager ag-qa ag-security ag-release-manager ag-detective ag-doc-engineer)

for agent in "${AGENTS[@]}"; do
  if [ -d "$SKILLS_DIR/$agent" ]; then
    cp -r "$SKILLS_DIR/$agent" "$TARGET/"
    echo "  ✓ $agent"
  fi
done

echo ""
echo "✅ ag-stack installed. 8 agents ready."
echo ""
echo "Restart your AntiGravity session, then use:"
echo "  'Plan a feature for my app'           → ag-ceo activates"
echo "  'Review my code changes'               → ag-eng-manager activates"
echo "  'Check UI for accessibility issues'    → ag-designer activates"
echo "  'Test the app in a browser'            → ag-qa activates"
echo "  'Audit security before deploying'      → ag-security activates"
echo "  'Ship this feature with a PR'          → ag-release-manager activates"
echo "  'Investigate this bug'                 → ag-detective activates"
echo "  'Sync all documentation'               → ag-doc-engineer activates"
