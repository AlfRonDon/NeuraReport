#!/usr/bin/env bash
# NeuraReport — Full Pipeline Test Script
# Run: cd ~/desktop/NeuraReport && bash test_pipelines.sh 2>&1 | tee pipeline_results.txt
set -euo pipefail

API="http://localhost:9070/api/v1"
CONN_ID="73e9d384-2697-46af-96b0-f130b43cce55"
RESULTS_DIR="/tmp/nr_pipeline_results"
mkdir -p "$RESULTS_DIR"

pass=0; fail=0; issues=()

run_test() {
    local name="$1" method="$2" path="$3" data="${4:-}"
    local url="${API}${path}"
    local out
    echo ""
    echo "=========================================="
    echo "TEST: $name"
    echo "  $method $path"
    [ -n "$data" ] && echo "  BODY: $(echo "$data" | head -c 200)"
    echo "=========================================="

    local http_code
    local response_file="$RESULTS_DIR/$(echo "$name" | tr ' /' '_').json"

    if [ "$method" = "GET" ]; then
        http_code=$(curl -s -o "$response_file" -w "%{http_code}" "$url" 2>/dev/null) || http_code="CURL_FAIL"
    elif [ "$method" = "POST" ]; then
        http_code=$(curl -s -o "$response_file" -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null) || http_code="CURL_FAIL"
    elif [ "$method" = "PUT" ]; then
        http_code=$(curl -s -o "$response_file" -w "%{http_code}" -X PUT -H "Content-Type: application/json" -d "$data" "$url" 2>/dev/null) || http_code="CURL_FAIL"
    elif [ "$method" = "DELETE" ]; then
        http_code=$(curl -s -o "$response_file" -w "%{http_code}" -X DELETE "$url" 2>/dev/null) || http_code="CURL_FAIL"
    fi

    if [ "$http_code" = "CURL_FAIL" ]; then
        echo "  RESULT: FAIL — curl failed (backend down?)"
        fail=$((fail + 1))
        issues+=("$name: curl failed — backend may be down")
        return 1
    fi

    local body
    body=$(cat "$response_file" 2>/dev/null || echo "(empty)")

    if [[ "$http_code" =~ ^2 ]]; then
        echo "  RESULT: PASS (HTTP $http_code)"
        echo "  RESPONSE: $(echo "$body" | python3 -m json.tool 2>/dev/null | head -30 || echo "$body" | head -c 500)"
        pass=$((pass + 1))
    else
        echo "  RESULT: FAIL (HTTP $http_code)"
        echo "  RESPONSE: $(echo "$body" | head -c 500)"
        fail=$((fail + 1))
        issues+=("$name: HTTP $http_code — $(echo "$body" | head -c 200)")
    fi
    echo ""
}

echo "============================================================"
echo " NeuraReport Pipeline Testing — $(date)"
echo " Backend: $API"
echo " Connection: $CONN_ID"
echo "============================================================"

# ──────────────────────────────────────────────────────────────────
# PIPELINE 0: Health & Bootstrap
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 0: Health & Bootstrap          ║"
echo "╚══════════════════════════════════════════╝"

run_test "Health Detailed" GET "/health/detailed"
run_test "Token Usage" GET "/health/token-usage"
run_test "Scheduler Status" GET "/health/scheduler"
run_test "Bootstrap State" GET "/state/bootstrap"

# ──────────────────────────────────────────────────────────────────
# PIPELINE 1: Connection Management
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 1: Connection Management       ║"
echo "╚══════════════════════════════════════════╝"

run_test "List Connections" GET "/connections"
run_test "Health Check Connection" POST "/connections/${CONN_ID}/health" '{}'
run_test "Get Schema" GET "/connections/${CONN_ID}/schema?include_row_counts=true&include_foreign_keys=true"

# Get first table name from schema for preview
SCHEMA_FILE="$RESULTS_DIR/Get_Schema.json"
FIRST_TABLE=$(python3 -c "
import json, sys
try:
    d = json.load(open('$SCHEMA_FILE'))
    tables = d.get('tables', d.get('schema', {}).get('tables', []))
    if tables:
        print(tables[0].get('name', tables[0].get('table_name', '')))
except: pass
" 2>/dev/null || echo "")

if [ -n "$FIRST_TABLE" ]; then
    run_test "Table Preview ($FIRST_TABLE)" GET "/connections/${CONN_ID}/preview?table=${FIRST_TABLE}&limit=5"
else
    echo "  SKIP: Table Preview — could not determine table name from schema"
fi

# ──────────────────────────────────────────────────────────────────
# PIPELINE 2: Template Management
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 2: Template Management          ║"
echo "╚══════════════════════════════════════════╝"

run_test "List Templates" GET "/templates"
run_test "Template Tags" GET "/templates/tags/all"
run_test "Template Catalog" GET "/templates/catalog"

# Get first template ID
TEMPLATE_LIST="$RESULTS_DIR/List_Templates.json"
TEMPLATE_ID=$(python3 -c "
import json
try:
    d = json.load(open('$TEMPLATE_LIST'))
    templates = d.get('templates', d) if isinstance(d, dict) else d
    if isinstance(templates, list) and templates:
        print(templates[0].get('id', templates[0].get('template_id', '')))
    elif isinstance(templates, dict):
        tl = templates.get('templates', [])
        if tl: print(tl[0].get('id', ''))
except: pass
" 2>/dev/null || echo "")

if [ -n "$TEMPLATE_ID" ]; then
    echo "  Found template: $TEMPLATE_ID"
    run_test "Get Template HTML" GET "/templates/${TEMPLATE_ID}/html"
    run_test "Get Template Keys" GET "/templates/${TEMPLATE_ID}/keys/options?connection_id=${CONN_ID}&limit=50"
else
    echo "  SKIP: No templates found"
fi

# ──────────────────────────────────────────────────────────────────
# PIPELINE 3: Report Discovery & Generation
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 3: Report Discovery & Run       ║"
echo "╚══════════════════════════════════════════╝"

if [ -n "$TEMPLATE_ID" ]; then
    run_test "Report Discover" POST "/reports/discover" "{\"template_id\": \"$TEMPLATE_ID\", \"connection_id\": \"$CONN_ID\", \"start_date\": \"2020-01-01\", \"end_date\": \"2026-12-31\"}"

    # Run a report (this may take time)
    echo "  Running report generation (may take 10-60s)..."
    run_test "Report Run" POST "/reports/run" "{\"template_id\": \"$TEMPLATE_ID\", \"connection_id\": \"$CONN_ID\", \"start_date\": \"2024-01-01\", \"end_date\": \"2024-12-31\", \"xlsx\": true}"

    run_test "Report Runs History" GET "/reports/runs?template_id=${TEMPLATE_ID}&limit=5"
else
    echo "  SKIP: Report pipeline — no template available"
fi

# Try Excel pipeline too
run_test "List Excel Templates" GET "/excel/templates" || true

# ──────────────────────────────────────────────────────────────────
# PIPELINE 4: Jobs
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 4: Jobs                         ║"
echo "╚══════════════════════════════════════════╝"

run_test "List Jobs" GET "/jobs?limit=10"
run_test "Active Jobs" GET "/jobs?active_only=true"
run_test "Dead Letter Queue" GET "/jobs/dead-letter"

# ──────────────────────────────────────────────────────────────────
# PIPELINE 5: Schedules
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 5: Schedules                    ║"
echo "╚══════════════════════════════════════════╝"

run_test "List Schedules" GET "/reports/schedules"

if [ -n "$TEMPLATE_ID" ]; then
    run_test "Create Schedule" POST "/reports/schedules" "{\"template_id\": \"$TEMPLATE_ID\", \"connection_id\": \"$CONN_ID\", \"start_date\": \"2024-01-01\", \"end_date\": \"2024-12-31\", \"frequency\": \"daily\", \"name\": \"Pipeline Test Schedule\", \"active\": false}"

    SCHEDULE_FILE="$RESULTS_DIR/Create_Schedule.json"
    SCHEDULE_ID=$(python3 -c "
import json
try:
    d = json.load(open('$SCHEDULE_FILE'))
    s = d.get('schedule', d)
    print(s.get('id', s.get('schedule_id', '')))
except: pass
" 2>/dev/null || echo "")

    if [ -n "$SCHEDULE_ID" ]; then
        run_test "Get Schedule" GET "/reports/schedules/${SCHEDULE_ID}"
        run_test "Delete Test Schedule" DELETE "/reports/schedules/${SCHEDULE_ID}"
    fi
fi

# ──────────────────────────────────────────────────────────────────
# PIPELINE 6: NL2SQL
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 6: NL2SQL (Query Builder)       ║"
echo "╚══════════════════════════════════════════╝"

run_test "NL2SQL Generate" POST "/nl2sql/generate" "{\"question\": \"What are the average values in the database?\", \"connection_id\": \"$CONN_ID\"}"

# Get generated SQL
NL2SQL_FILE="$RESULTS_DIR/NL2SQL_Generate.json"
GENERATED_SQL=$(python3 -c "
import json
try:
    d = json.load(open('$NL2SQL_FILE'))
    print(d.get('sql', d.get('query', '')))
except: pass
" 2>/dev/null || echo "SELECT 1")

run_test "NL2SQL Execute" POST "/nl2sql/execute" "{\"sql\": \"SELECT COUNT(*) as cnt FROM (SELECT name FROM sqlite_master WHERE type='table')\", \"connection_id\": \"$CONN_ID\"}"
run_test "NL2SQL Execute (datetime fix)" POST "/nl2sql/execute" "{\"sql\": \"SELECT datetime('now', '-24 hours') as yesterday\", \"connection_id\": \"$CONN_ID\"}"
run_test "NL2SQL Execute (date modifier)" POST "/nl2sql/execute" "{\"sql\": \"SELECT DATE('now', '-7 days') as week_ago\", \"connection_id\": \"$CONN_ID\"}"
run_test "NL2SQL Execute (start of month)" POST "/nl2sql/execute" "{\"sql\": \"SELECT datetime('now', 'start of month') as month_start\", \"connection_id\": \"$CONN_ID\"}"

run_test "NL2SQL Save" POST "/nl2sql/save" "{\"name\": \"Pipeline Test Query\", \"sql\": \"SELECT 1 as test\", \"connection_id\": \"$CONN_ID\"}"
run_test "NL2SQL List Saved" GET "/nl2sql/saved"

# Get saved query ID and cleanup
SAVED_FILE="$RESULTS_DIR/NL2SQL_Save.json"
SAVED_ID=$(python3 -c "
import json
try:
    d = json.load(open('$SAVED_FILE'))
    print(d.get('id', d.get('query_id', '')))
except: pass
" 2>/dev/null || echo "")

if [ -n "$SAVED_ID" ]; then
    run_test "NL2SQL Get Saved" GET "/nl2sql/saved/${SAVED_ID}"
fi

# ──────────────────────────────────────────────────────────────────
# PIPELINE 7: Documents
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 7: Documents                    ║"
echo "╚══════════════════════════════════════════╝"

run_test "List Documents" GET "/documents"

# Create a test text file and upload
echo "This is a test document for pipeline testing. It contains sample text about database connections, report generation, and analytics." > /tmp/test_doc.txt

echo "  Uploading test document..."
DOC_UPLOAD=$(curl -s -o "$RESULTS_DIR/Upload_Document.json" -w "%{http_code}" \
    -X POST "${API}/documents/upload" \
    -F "file=@/tmp/test_doc.txt" 2>/dev/null || echo "CURL_FAIL")
echo "  Upload HTTP: $DOC_UPLOAD"
if [ -f "$RESULTS_DIR/Upload_Document.json" ]; then
    echo "  Response: $(cat "$RESULTS_DIR/Upload_Document.json" | head -c 500)"
fi

DOC_ID=$(python3 -c "
import json
try:
    d = json.load(open('$RESULTS_DIR/Upload_Document.json'))
    print(d.get('document_id', d.get('id', '')))
except: pass
" 2>/dev/null || echo "")

if [ -n "$DOC_ID" ]; then
    run_test "Get Document" GET "/documents/${DOC_ID}"
    run_test "Search Documents" POST "/documents/search" "{\"query\": \"database\"}"
fi

# ──────────────────────────────────────────────────────────────────
# PIPELINE 8: Spreadsheets
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 8: Spreadsheets                 ║"
echo "╚══════════════════════════════════════════╝"

run_test "List Spreadsheets" GET "/spreadsheets"
run_test "Create Spreadsheet" POST "/spreadsheets" '{"name": "Pipeline Test Sheet"}'

SHEET_FILE="$RESULTS_DIR/Create_Spreadsheet.json"
SHEET_ID=$(python3 -c "
import json
try:
    d = json.load(open('$SHEET_FILE'))
    print(d.get('id', d.get('spreadsheet_id', '')))
except: pass
" 2>/dev/null || echo "")

if [ -n "$SHEET_ID" ]; then
    run_test "Update Cells" PUT "/spreadsheets/${SHEET_ID}/cells" '{"sheet": 0, "updates": [{"row": 0, "col": 0, "value": "Name"}, {"row": 0, "col": 1, "value": "Score"}, {"row": 1, "col": 0, "value": "Alice"}, {"row": 1, "col": 1, "value": 95}]}'
    run_test "Get Spreadsheet" GET "/spreadsheets/${SHEET_ID}"
    run_test "Export CSV" GET "/spreadsheets/${SHEET_ID}/export?format=csv"
    run_test "Export XLSX" GET "/spreadsheets/${SHEET_ID}/export?format=xlsx"

    # Test CSV import
    echo -e "Col1,Col2,Col3\nA,1,X\nB,2,Y\nC,3,Z" > /tmp/test_import.csv
    echo "  Importing CSV..."
    CSV_IMPORT=$(curl -s -o "$RESULTS_DIR/Import_CSV.json" -w "%{http_code}" \
        -X POST "${API}/spreadsheets/import" \
        -F "file=@/tmp/test_import.csv" 2>/dev/null || echo "CURL_FAIL")
    echo "  Import CSV HTTP: $CSV_IMPORT"
    if [ -f "$RESULTS_DIR/Import_CSV.json" ]; then
        echo "  Response: $(cat "$RESULTS_DIR/Import_CSV.json" | head -c 500)"
    fi

    # Cleanup
    run_test "Delete Test Spreadsheet" DELETE "/spreadsheets/${SHEET_ID}"
fi

# ──────────────────────────────────────────────────────────────────
# PIPELINE 9: Dashboards
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 9: Dashboards                   ║"
echo "╚══════════════════════════════════════════╝"

run_test "List Dashboards" GET "/dashboards"
run_test "Create Dashboard" POST "/dashboards" '{"name": "Pipeline Test Dashboard", "description": "Created by pipeline test"}'

DASH_FILE="$RESULTS_DIR/Create_Dashboard.json"
DASH_ID=$(python3 -c "
import json
try:
    d = json.load(open('$DASH_FILE'))
    print(d.get('id', d.get('dashboard_id', '')))
except: pass
" 2>/dev/null || echo "")

if [ -n "$DASH_ID" ]; then
    run_test "Get Dashboard" GET "/dashboards/${DASH_ID}"
    run_test "Add Widget" POST "/dashboards/${DASH_ID}/widgets" '{"type": "stat", "title": "Test Widget", "config": {"metric": "count", "label": "Total"}}'
    run_test "Dashboard Analytics" GET "/dashboards/${DASH_ID}/analytics"
    run_test "Delete Test Dashboard" DELETE "/dashboards/${DASH_ID}"
fi

# ──────────────────────────────────────────────────────────────────
# PIPELINE 10: Workflows
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 10: Workflows                   ║"
echo "╚══════════════════════════════════════════╝"

run_test "List Workflows" GET "/workflows"
run_test "Create Workflow" POST "/workflows" '{"name": "Pipeline Test Workflow", "description": "Test", "steps": [{"type": "report", "config": {}}]}'

WF_FILE="$RESULTS_DIR/Create_Workflow.json"
WF_ID=$(python3 -c "
import json
try:
    d = json.load(open('$WF_FILE'))
    print(d.get('id', d.get('workflow_id', '')))
except: pass
" 2>/dev/null || echo "")

if [ -n "$WF_ID" ]; then
    run_test "Get Workflow" GET "/workflows/${WF_ID}"
    run_test "Workflow Templates" GET "/workflows/templates"
    run_test "Delete Test Workflow" DELETE "/workflows/${WF_ID}"
fi

# ──────────────────────────────────────────────────────────────────
# PIPELINE 11: Charts
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 11: Charts                      ║"
echo "╚══════════════════════════════════════════╝"

if [ -n "$TEMPLATE_ID" ]; then
    run_test "Chart Suggest" POST "/templates/${TEMPLATE_ID}/charts/suggest" "{\"connection_id\": \"$CONN_ID\", \"include_sample_data\": true}"
    run_test "List Saved Charts" GET "/templates/${TEMPLATE_ID}/charts/saved"
fi

# ──────────────────────────────────────────────────────────────────
# PIPELINE 12: Analytics
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 12: Analytics                    ║"
echo "╚══════════════════════════════════════════╝"

run_test "Analytics Dashboard" GET "/analytics/dashboard"
run_test "Usage Stats (week)" GET "/analytics/usage?period=week"
run_test "Usage Stats (month)" GET "/analytics/usage?period=month"
run_test "Activity Log" GET "/analytics/activity?limit=20"
run_test "Global Search" GET "/analytics/search?q=test&limit=10"
run_test "Favorites" GET "/analytics/favorites"
run_test "Preferences" GET "/analytics/preferences"
run_test "Notifications" GET "/analytics/notifications?limit=20"

# ──────────────────────────────────────────────────────────────────
# PIPELINE 13: Agents
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 13: Agents                      ║"
echo "╚══════════════════════════════════════════╝"

run_test "List Agents" GET "/agents"
run_test "Create Agent" POST "/agents" "{\"name\": \"Pipeline Test Agent\", \"type\": \"data_analyst\", \"connection_id\": \"$CONN_ID\"}"

AGENT_FILE="$RESULTS_DIR/Create_Agent.json"
AGENT_ID=$(python3 -c "
import json
try:
    d = json.load(open('$AGENT_FILE'))
    print(d.get('id', d.get('agent_id', '')))
except: pass
" 2>/dev/null || echo "")

if [ -n "$AGENT_ID" ]; then
    run_test "Get Agent" GET "/agents/${AGENT_ID}"
fi

# ──────────────────────────────────────────────────────────────────
# PIPELINE 14: Knowledge Base
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 14: Knowledge Base              ║"
echo "╚══════════════════════════════════════════╝"

run_test "List Knowledge Items" GET "/knowledge"
run_test "Create Knowledge Item" POST "/knowledge" '{"title": "Pipeline Test Item", "content": "This is a test knowledge item", "tags": ["test", "pipeline"]}'

# ──────────────────────────────────────────────────────────────────
# PIPELINE 15: Design
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 15: Design                      ║"
echo "╚══════════════════════════════════════════╝"

run_test "List Designs" GET "/designs"
run_test "List Brand Kits" GET "/designs/brand-kits"

# ──────────────────────────────────────────────────────────────────
# PIPELINE 16: Settings & Config
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 16: Settings & Config            ║"
echo "╚══════════════════════════════════════════╝"

run_test "Get Settings" GET "/settings"
run_test "System Info" GET "/health/detailed"

# ──────────────────────────────────────────────────────────────────
# PIPELINE 17: Logger Integration
# ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  PIPELINE 17: Logger Integration           ║"
echo "╚══════════════════════════════════════════╝"

run_test "Logger Discover" GET "/logger/discover"

# ──────────────────────────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo " PIPELINE TEST SUMMARY"
echo "============================================================"
echo "  PASSED: $pass"
echo "  FAILED: $fail"
echo "  TOTAL:  $((pass + fail))"
echo ""

if [ ${#issues[@]} -gt 0 ]; then
    echo "ISSUES FOUND:"
    for i in "${!issues[@]}"; do
        echo "  $((i+1)). ${issues[$i]}"
    done
fi

echo ""
echo "Detailed results saved to: $RESULTS_DIR/"
echo "============================================================"
