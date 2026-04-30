#!/usr/bin/env bash
# ag-stack · Pipeline Status
# Usage: bash pipeline-status.sh
# Shows which stages are done, which are blocked, which haven't run yet.

PIPELINE_DIR=".agent/pipeline"

stage_icon() {
  local file="$PIPELINE_DIR/$1"
  if [ ! -f "$file" ]; then
    echo "⬜ NOT RUN"
    return
  fi
  local status=$(grep "^STATUS:" "$file" | awk '{print $2}')
  case "$status" in
    "COMPLETE") echo "✅ COMPLETE" ;;
    "BLOCKED")  echo "🚫 BLOCKED" ;;
    *)          echo "⚠️  UNKNOWN" ;;
  esac
}

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              ag-stack Pipeline Status                   ║"
echo "╠══════════════════════════════════════════════════════════╣"
printf "║  1  🧠 CEO/Planner          %-30s║\n" "$(stage_icon '01-ceo.md')"
printf "║  2A 🎨 Designer             %-30s║\n" "$(stage_icon '02-designer.md')"
printf "║  2B ⚙️  Eng Manager          %-30s║\n" "$(stage_icon '03-eng-manager.md')"
printf "║  3  🔍 QA Lead              %-30s║\n" "$(stage_icon '04-qa.md')"
printf "║  4  🔒 Security Officer     %-30s║\n" "$(stage_icon '05-security.md')"
printf "║  5  🚀 Release Manager      %-30s║\n" "$(stage_icon '06-release-manager.md')"
printf "║  6  📝 Doc Engineer         %-30s║\n" "$(stage_icon '07-doc-engineer.md')"
echo "╚══════════════════════════════════════════════════════════╝"

# Show blocker details if any stage is blocked
for f in 01-ceo 02-designer 03-eng-manager 04-qa 05-security 06-release-manager 07-doc-engineer; do
  if [ -f "$PIPELINE_DIR/${f}.md" ]; then
    status=$(grep "^STATUS:" "$PIPELINE_DIR/${f}.md" | awk '{print $2}')
    if [ "$status" = "BLOCKED" ]; then
      echo ""
      echo "  Blockers in ${f}:"
      grep -A 20 "_LIST:" "$PIPELINE_DIR/${f}.md" | grep "^-" | sed 's/^/    /'
    fi
  fi
done
echo ""
