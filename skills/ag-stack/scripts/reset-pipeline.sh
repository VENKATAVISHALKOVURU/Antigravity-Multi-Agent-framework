#!/usr/bin/env bash
# ag-stack · Reset Pipeline
# Usage: bash reset-pipeline.sh [stage-number]
# With no arg: resets everything. With stage number: resets from that stage onward.

PIPELINE_DIR=".agent/pipeline"
FROM_STAGE=${1:-0}

FILES=(
  "01-ceo.md"
  "02-designer.md"
  "03-eng-manager.md"
  "04-qa.md"
  "05-security.md"
  "06-release-manager.md"
  "07-doc-engineer.md"
)

echo "Resetting pipeline from stage $FROM_STAGE..."

for i in "${!FILES[@]}"; do
  stage=$((i + 1))
  if [ "$stage" -ge "$FROM_STAGE" ] || [ "$FROM_STAGE" -eq 0 ]; then
    rm -f "$PIPELINE_DIR/${FILES[$i]}"
    echo "  ✓ Cleared stage $stage: ${FILES[$i]}"
  fi
done

echo "Done. Run 'continue pipeline' in AntiGravity to resume."
