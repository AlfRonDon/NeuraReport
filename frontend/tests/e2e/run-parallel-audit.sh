#!/bin/bash

###############################################################################
# Parallel Semantic Audit Execution Script
#
# Executes all 2,534 actions across multiple parallel processes
# for faster completion.
#
# Usage:
#   ./run-parallel-audit.sh [num_parallel_jobs]
#
# Example:
#   ./run-parallel-audit.sh 4    # Run 4 parallel batches
#
###############################################################################

set -e

# Configuration
PARALLEL_JOBS=${1:-4}
BATCH_SIZE=50
TOTAL_ACTIONS=2534
TOTAL_BATCHES=$(( (TOTAL_ACTIONS + BATCH_SIZE - 1) / BATCH_SIZE ))

echo "======================================================================"
echo "SEMANTIC BACKEND VERIFICATION AUDIT - PARALLEL EXECUTION"
echo "======================================================================"
echo "Total actions:      $TOTAL_ACTIONS"
echo "Batch size:         $BATCH_SIZE"
echo "Total batches:      $TOTAL_BATCHES"
echo "Parallel jobs:      $PARALLEL_JOBS"
echo "======================================================================"
echo ""

# Create log directory
LOG_DIR="frontend/tests/e2e/evidence/semantic-audit/logs"
mkdir -p "$LOG_DIR"

# Function to run a batch
run_batch() {
  local batch_index=$1
  local log_file="$LOG_DIR/batch-$batch_index.log"

  echo "[$(date +%H:%M:%S)] Starting batch $batch_index..." | tee -a "$log_file"

  RUN_MODE=batch BATCH_INDEX=$batch_index BATCH_SIZE=$BATCH_SIZE \
    npx playwright test audit-semantic-verification.spec.ts \
    >> "$log_file" 2>&1

  local exit_code=$?

  if [ $exit_code -eq 0 ]; then
    echo "[$(date +%H:%M:%S)] ✓ Batch $batch_index complete" | tee -a "$log_file"
  else
    echo "[$(date +%H:%M:%S)] ✗ Batch $batch_index failed (exit code: $exit_code)" | tee -a "$log_file"
  fi

  return $exit_code
}

export -f run_batch
export LOG_DIR
export BATCH_SIZE

# Run batches in parallel using GNU parallel or xargs
if command -v parallel &> /dev/null; then
  echo "Using GNU parallel for execution..."
  seq 0 $((TOTAL_BATCHES - 1)) | parallel -j $PARALLEL_JOBS run_batch {}
else
  echo "GNU parallel not found, using xargs..."
  seq 0 $((TOTAL_BATCHES - 1)) | xargs -I {} -P $PARALLEL_JOBS bash -c 'run_batch {}'
fi

echo ""
echo "======================================================================"
echo "PARALLEL EXECUTION COMPLETE"
echo "======================================================================"
echo "Check logs in: $LOG_DIR"
echo ""

# Generate summary
echo "Generating execution summary..."

node -e "
const fs = require('fs');
const path = require('path');

const ledgerPath = 'frontend/tests/e2e/evidence/semantic-audit/ledger/ACTION-RESOLUTION-LEDGER.json';

if (!fs.existsSync(ledgerPath)) {
  console.log('⚠ Ledger not found. Results may be incomplete.');
  process.exit(1);
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf-8'));

console.log('');
console.log('='.repeat(70));
console.log('EXECUTION SUMMARY');
console.log('='.repeat(70));
console.log('Total actions:       ', ledger.actionsExecuted || 0);
console.log('Passed:              ', ledger.passed || 0);
console.log('Failed:              ', ledger.failed || 0);
console.log('Pass rate:           ', (((ledger.passed || 0) / (ledger.actionsExecuted || 1)) * 100).toFixed(1) + '%');
console.log('='.repeat(70));
console.log('');
console.log('Ledger: ' + ledgerPath);

const defectPath = 'frontend/tests/e2e/evidence/semantic-audit/defects/DEFECT-LIST.json';
if (fs.existsSync(defectPath)) {
  console.log('Defects: ' + defectPath);
}

console.log('');
"

echo "======================================================================"
echo "Review evidence in: frontend/tests/e2e/evidence/semantic-audit/"
echo "======================================================================"
