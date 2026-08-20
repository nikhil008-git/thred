#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
WS="cmswupgt50009bi8oj8m55wmv"

export EVAL_MODEL_PROVIDER="${EVAL_MODEL_PROVIDER:-openai}"
export EVAL_ANSWER_MODEL="${EVAL_ANSWER_MODEL:-gpt-4o-mini}"
export EVAL_JUDGE_MODEL="${EVAL_JUDGE_MODEL:-gpt-4o-mini}"
export MEMORY_EXTRACTION_PROVIDER="${MEMORY_EXTRACTION_PROVIDER:-openai}"
export MEMORY_EXTRACTION_MODEL="${MEMORY_EXTRACTION_MODEL:-gpt-4o-mini}"

run_eval() {
  local dataset="$1"
  local input="$2"
  local log="$ROOT/reports/eval-${dataset}-$(date +%Y%m%d-%H%M%S).log"
  echo "=== START $dataset $(date -Iseconds) ===" | tee "$log"
  npm run eval --workspace=@repo/evals -- \
    --dataset "$dataset" \
    --input "$input" \
    --workspace "$WS" \
    --stratified 1 \
    --concurrency 1 2>&1 | tee -a "$log"
  echo "=== DONE $dataset $(date -Iseconds) ===" | tee -a "$log"
}

run_eval longmemeval-v2 /private/tmp/thred-benchmarks/longmemeval-data/longmemeval_s_cleaned.json
run_eval beam /private/tmp/thred-benchmarks/beam_100k.json
echo "Remaining eval runs complete."
