#!/bin/bash

###############################################################################
# Audit Readiness Verification Script
#
# Checks that all prerequisites are met before starting the audit.
###############################################################################

set -e

echo ""
echo "======================================================================"
echo "SEMANTIC AUDIT READINESS CHECK"
echo "======================================================================"
echo ""

READY=true

# Check 1: Master inventory exists
echo -n "✓ Checking master inventory... "
if [ -f "MASTER-ACTION-INVENTORY.json" ]; then
  ACTIONS=$(cat MASTER-ACTION-INVENTORY.json | jq -r '.totalActions')
  echo "OK ($ACTIONS actions)"
else
  echo "MISSING"
  echo "  Run: node -e \"...\" to generate master inventory"
  READY=false
fi

# Check 2: Test spec exists
echo -n "✓ Checking test spec... "
if [ -f "audit-semantic-verification.spec.ts" ]; then
  echo "OK"
else
  echo "MISSING"
  READY=false
fi

# Check 3: Playwright installed
echo -n "✓ Checking Playwright... "
if command -v npx &> /dev/null; then
  if npx playwright --version &> /dev/null; then
    echo "OK"
  else
    echo "NOT INSTALLED"
    echo "  Run: npx playwright install"
    READY=false
  fi
else
  echo "npx not found"
  READY=false
fi

# Check 4: Backend running
echo -n "✓ Checking backend (localhost:8000)... "
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
  echo "OK"
else
  echo "NOT RUNNING"
  echo "  Run: cd backend && python -m uvicorn app.main:app --reload"
  READY=false
fi

# Check 5: Frontend running
echo -n "✓ Checking frontend (localhost:5173)... "
if curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "OK"
else
  echo "NOT RUNNING"
  echo "  Run: cd frontend && npm run dev"
  READY=false
fi

# Check 6: Evidence directory structure
echo -n "✓ Checking evidence directory... "
mkdir -p evidence/semantic-audit/{ledger,defects,network,screenshots,logs}
echo "OK"

# Check 7: Parallel script executable
echo -n "✓ Checking parallel script... "
if [ -x "run-parallel-audit.sh" ]; then
  echo "OK"
else
  if [ -f "run-parallel-audit.sh" ]; then
    chmod +x run-parallel-audit.sh
    echo "OK (fixed permissions)"
  else
    echo "MISSING"
    READY=false
  fi
fi

# Check 8: Analysis script
echo -n "✓ Checking analysis script... "
if [ -f "analyze-audit-results.js" ]; then
  echo "OK"
else
  echo "MISSING"
  READY=false
fi

# Check 9: Disk space
echo -n "✓ Checking disk space... "
AVAILABLE=$(df -h . | awk 'NR==2 {print $4}')
echo "Available: $AVAILABLE"
echo "  (Need ~5GB for evidence files)"

echo ""
echo "======================================================================"

if [ "$READY" = true ]; then
  echo "✅ ALL CHECKS PASSED - READY TO BEGIN AUDIT"
  echo "======================================================================"
  echo ""
  echo "Start the audit with:"
  echo "  ./run-parallel-audit.sh 4    (parallel - 5-6 hours)"
  echo ""
  echo "Or:"
  echo "  npx playwright test audit-semantic-verification.spec.ts    (sequential - 21 hours)"
  echo ""
else
  echo "❌ PREREQUISITES MISSING - Fix issues above before starting"
  echo "======================================================================"
  echo ""
  exit 1
fi
