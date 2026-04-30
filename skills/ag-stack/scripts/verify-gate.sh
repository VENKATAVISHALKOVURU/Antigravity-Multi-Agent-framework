#!/usr/bin/env bash
# ag-stack · Gate Verifier
# Usage: bash verify-gate.sh [stage-number]
# Exit 0 = gate passed, proceed. Exit 1 = gate failed, stop.

STAGE=${1:-"all"}
PIPELINE_DIR=".agent/pipeline"
FAILED=0

check_stage() {
  local file="$PIPELINE_DIR/$1"
  local label="$2"

  if [ ! -f "$file" ]; then
    echo "  ❌ $label — checkpoint missing ($file not found)"
    FAILED=1
    return
  fi

  local status=$(grep "^STATUS:" "$file" | awk '{print $2}')

  if [ "$status" = "COMPLETE" ]; then
    echo "  ✅ $label — verified"
  elif [ "$status" = "BLOCKED" ]; then
    echo "  🚫 $label — BLOCKED"
    echo "     Issues:"
    grep -A 20 "_LIST:" "$file" | grep "^-" | head -10 | sed 's/^/     /'
    FAILED=1
  else
    echo "  ⚠️  $label — status unknown ($status)"
    FAILED=1
  fi
}

echo ""
echo "── ag-stack Gate Check ──────────────────────────────────────"

case "$STAGE" in
  "1"|"after-ceo")
    check_stage "01-ceo.md" "CEO/Planner"
    ;;
  "2"|"after-review")
    check_stage "02-designer.md"    "Designer"
    check_stage "03-eng-manager.md" "Eng Manager"
    ;;
  "3"|"after-qa")
    check_stage "02-designer.md"    "Designer"
    check_stage "03-eng-manager.md" "Eng Manager"
    check_stage "04-qa.md"          "QA Lead"
    ;;
  "4"|"after-security")
    check_stage "04-qa.md"          "QA Lead"
    check_stage "05-security.md"    "Security Officer"
    ;;
  "5"|"after-ship")
    check_stage "05-security.md"    "Security Officer"
    check_stage "06-release-manager.md" "Release Manager"
    ;;
  "all"|*)
    check_stage "01-ceo.md"             "CEO/Planner"
    check_stage "02-designer.md"        "Designer"
    check_stage "03-eng-manager.md"     "Eng Manager"
    check_stage "04-qa.md"              "QA Lead"
    check_stage "05-security.md"        "Security Officer"
    check_stage "06-release-manager.md" "Release Manager"
    check_stage "07-doc-engineer.md"    "Doc Engineer"
    ;;
esac

echo "────────────────────────────────────────────────────────────"

if [ "$FAILED" -eq 0 ]; then
  echo "  ✅ All gates passed. Pipeline can proceed."
  echo ""
  exit 0
else
  echo "  🚫 Gate failed. Fix issues above before continuing."
  echo "  After fixing, say: 'continue pipeline'"
  echo ""
  exit 1
fi
