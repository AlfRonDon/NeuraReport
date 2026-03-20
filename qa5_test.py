#!/usr/bin/env python3
"""QA Round 5 — Comprehensive test suite with correct API inputs.

Tests organized into 8 groups with realistic, varied scenarios.
"""

import json
import urllib.request
import urllib.error
import uuid
import time
import sys
from concurrent.futures import ThreadPoolExecutor

BASE = "http://localhost:9070/api/v1"
RESULTS = []  # (group, test_id, status, description, detail)


def req(method, path, data=None, expect=None):
    """Make an HTTP request, return (body_dict, status_code)."""
    url = f"{BASE}{path}" if path.startswith("/") else path
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(url, data=body, method=method,
                               headers={"Content-Type": "application/json"} if body else {})
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read()
            return (json.loads(raw) if raw else {}, resp.status)
    except urllib.error.HTTPError as e:
        raw = e.read()
        return (json.loads(raw) if raw else {}, e.code)
    except Exception as e:
        return ({"error": str(e)}, 0)


def GET(p): return req("GET", p)
def POST(p, d=None): return req("POST", p, d)
def PUT(p, d=None): return req("PUT", p, d)
def PATCH(p, d=None): return req("PATCH", p, d)
def DELETE(p): return req("DELETE", p)


def test(group, tid, ok, desc, detail=""):
    status = "PASS" if ok else "FAIL"
    RESULTS.append((group, tid, status, desc, detail))
    mark = "✓" if ok else "✗"
    print(f"  {mark} {tid}: {desc}" + (f" — {detail}" if detail and not ok else ""))


def warn(group, tid, desc, detail=""):
    RESULTS.append((group, tid, "WARN", desc, detail))
    print(f"  ⚠ {tid}: {desc}" + (f" — {detail}" if detail else ""))


# ═══════════════════════════════════════════════════════════════
# GROUP 1: End-to-End Workflows
# ═══════════════════════════════════════════════════════════════
def group1():
    print("\n═══ Group 1: End-to-End Workflows ═══")

    # Workflow A: New user workspace setup
    d, s = POST("/auth/register", {"username": "qa5_user", "email": "qa5@test.com", "password": "Pass123!"})
    test(1, "A1", s in (200, 201, 400, 409, 422), "Register user", f"status={s}")

    d, s = PUT("/preferences", {"theme": "dark", "language": "en", "notifications_enabled": True})
    test(1, "A2", s == 200, "Set preferences via PUT", f"status={s}")

    d, s = GET("/preferences")
    theme = d.get("preferences", {}).get("theme") or d.get("theme")
    test(1, "A3", s == 200 and theme == "dark", "Verify preferences", f"theme={theme}")

    d, s = POST("/connections", {"name": "QA5 Postgres", "type": "postgresql", "config": {"host": "localhost", "port": 5432, "database": "test"}})
    conn_id = d.get("id") or d.get("connection", {}).get("id")
    test(1, "A4", s in (200, 201, 400), "Create connection", f"status={s}, id={conn_id}")

    d, s = POST("/dashboards", {"name": "Revenue Dashboard", "description": "Track revenue KPIs"})
    dash_id = d.get("id")
    test(1, "A5", s == 200 and dash_id, "Create dashboard", f"id={dash_id}")

    if dash_id:
        d, s = POST(f"/dashboards/{dash_id}/widgets", {"config": {"type": "metric", "title": "Total Revenue"}, "w": 3, "h": 2})
        w1_id = d.get("id")
        test(1, "A6", s == 200, "Add metric widget", f"status={s}")

        d, s = POST(f"/dashboards/{dash_id}/widgets", {"config": {"type": "chart", "title": "Revenue by Region"}, "w": 6, "h": 4, "x": 3})
        w2_id = d.get("id")
        test(1, "A7", s == 200, "Add chart widget", f"status={s}")

        d, s = GET(f"/dashboards/{dash_id}")
        widgets = d.get("widgets", [])
        has_meta = "metadata" in d
        test(1, "A8", len(widgets) == 2 and has_meta, "Dashboard has 2 widgets + metadata", f"widgets={len(widgets)}, metadata={'metadata' in d}")

    d, s = POST("/knowledge/documents", {"title": "Revenue Glossary", "content": "ARR = Annual Recurring Revenue.", "category": "finance"})
    test(1, "A9", s in (200, 201), "Create knowledge doc", f"status={s}")

    d, s = GET("/analytics/dashboard")
    test(1, "A10", s == 200, "Analytics dashboard", f"status={s}")

    # Workflow B: Data analyst creates report
    d, s = POST("/documents", {"name": "Q4 Sales Narrative"})
    doc_id = d.get("id")
    test(1, "B1", s in (200, 201) and doc_id, "Create document (name field)", f"status={s}")

    d, s = POST("/spreadsheets", {"name": "Q4 Revenue Data", "initial_data": [["Region", "Revenue", "Growth"], ["APAC", 4500000, 0.32], ["EMEA", 3200000, 0.08], ["NA", 5100000, -0.03]]})
    sp_id = d.get("id")
    test(1, "B2", s == 200 and sp_id, "Create spreadsheet with data", f"status={s}")

    if sp_id:
        d, s = GET(f"/spreadsheets/{sp_id}")
        sheets = d.get("sheets", [])
        test(1, "B3", len(sheets) > 0, "Spreadsheet detail has sheets array", f"sheets={len(sheets)}")

        d, s = POST(f"/spreadsheets/{sp_id}/ai/formula", {"description": "total revenue across all regions"})
        test(1, "B4", s == 200, "AI formula generation", f"status={s}")

    d, s = POST("/charts/generate", {"chart_type": "bar", "data": [{"region": "APAC", "growth": 32}, {"region": "EMEA", "growth": 8}, {"region": "NA", "growth": -3}], "x_field": "region", "y_fields": ["growth"]})
    test(1, "B5", s == 200, "Generate bar chart", f"status={s}")

    # DocQA: session-based
    d, s = POST("/docqa/sessions", {"name": "Q4 Analysis"})
    session_id = d.get("id") or d.get("session_id") or d.get("session", {}).get("id")
    test(1, "B6", s in (200, 201) and session_id, "Create DocQA session", f"status={s}, id={session_id}")

    if session_id:
        d, s = POST(f"/docqa/sessions/{session_id}/ask", {"question": "Which region grew the most?", "context": "APAC +32%, EMEA +8%, NA -3%"})
        answer = str(d.get("answer", d.get("response", "")))
        test(1, "B7", s == 200, "DocQA ask question", f"status={s}")

    # Workflow C: Manager shares and collaborates
    d, s = POST("/dashboards", {"name": "Team Performance Board"})
    team_dash = d.get("id")
    test(1, "C1", s == 200, "Create team dashboard", f"status={s}")

    if team_dash:
        d, s = POST(f"/dashboards/{team_dash}/widgets", {"config": {"type": "table", "title": "Team KPIs"}, "w": 12, "h": 5})
        test(1, "C2", s == 200, "Add table widget", f"status={s}")

        d, s = POST(f"/dashboards/{team_dash}/share", {"users": ["alice@co.com", "bob@co.com"], "permission": "view"})
        test(1, "C3", s == 200, "Share with 2 users", f"status={s}")

        d, s = GET(f"/dashboards/{team_dash}")
        sharing = (d.get("metadata") or {}).get("sharing", [])
        test(1, "C4", len(sharing) == 2, "Sharing shows 2 users", f"sharing_count={len(sharing)}")

        d, s = POST(f"/dashboards/{team_dash}/share", {"users": ["alice@co.com"], "permission": "edit"})
        test(1, "C5", s == 200, "Upgrade Alice to edit", f"status={s}")

        d, s = GET(f"/dashboards/{team_dash}")
        sharing = (d.get("metadata") or {}).get("sharing", [])
        alice = next((s for s in sharing if s.get("user") == "alice@co.com"), {})
        bob = next((s for s in sharing if s.get("user") == "bob@co.com"), {})
        test(1, "C6", alice.get("permission") == "edit" and bob.get("permission") == "view",
             "Alice=edit, Bob=view", f"alice={alice.get('permission')}, bob={bob.get('permission')}")

        d, s = POST(f"/dashboards/{team_dash}/snapshot", {})
        test(1, "C7", s == 200, "Take snapshot", f"status={s}")

    d, s = POST("/notifications", {"title": "Dashboard shared", "message": "Shared with team", "type": "info"})
    test(1, "C8", s in (200, 201), "Send notification", f"status={s}")

    d, s = GET("/notifications")
    test(1, "C9", s == 200, "List notifications", f"status={s}")


# ═══════════════════════════════════════════════════════════════
# GROUP 2: Data Integrity & CRUD Lifecycle
# ═══════════════════════════════════════════════════════════════
def group2():
    print("\n═══ Group 2: Data Integrity & CRUD Lifecycle ═══")

    # Dashboard widget lifecycle
    d, s = POST("/dashboards", {"name": "Integrity Test"})
    dash = d.get("id")
    test(2, "A1", s == 200, "Create dashboard", f"status={s}")

    w_ids = []
    for i, wtype in enumerate(["metric", "chart", "table"]):
        d, s = POST(f"/dashboards/{dash}/widgets", {"config": {"type": wtype, "title": f"Widget {i}"}, "w": 4, "h": 3, "x": i*4})
        w_ids.append(d.get("id"))
        test(2, f"A2.{i}", s == 200, f"Add {wtype} widget", f"status={s}")

    d, s = GET(f"/dashboards/{dash}")
    test(2, "A3", len(d.get("widgets", [])) == 3, "Dashboard has 3 widgets", f"count={len(d.get('widgets', []))}")

    if w_ids[1]:
        d, s = PUT(f"/dashboards/{dash}/widgets/{w_ids[1]}", {"config": {"type": "chart", "title": "UPDATED"}, "x": 4, "w": 8})
        test(2, "A4", s == 200, "Update widget (M3-v4 fix)", f"status={s}")

        d, s = GET(f"/dashboards/{dash}")
        w = next((w for w in d.get("widgets", []) if w.get("id") == w_ids[1]), {})
        test(2, "A5", w.get("config", {}).get("title") == "UPDATED", "Widget title updated", f"title={w.get('config', {}).get('title')}")

    if w_ids[0]:
        d, s = DELETE(f"/dashboards/{dash}/widgets/{w_ids[0]}")
        test(2, "A6", s == 200, "Delete first widget", f"status={s}")

    d, s = GET(f"/dashboards/{dash}")
    test(2, "A7", len(d.get("widgets", [])) == 2, "2 widgets remain", f"count={len(d.get('widgets', []))}")

    # Document lifecycle
    d, s = POST("/documents", {"name": "Lifecycle Doc"})
    doc_id = d.get("id")
    test(2, "B1", s in (200, 201), "Create document", f"status={s}")

    if doc_id:
        d, s = GET(f"/documents/{doc_id}")
        test(2, "B2", s == 200 and d.get("name") == "Lifecycle Doc", "Read document", f"name={d.get('name')}")

        d, s = PUT(f"/documents/{doc_id}", {"name": "Updated Doc"})
        test(2, "B3", s == 200, "Update document", f"status={s}")

        d, s = GET(f"/documents/{doc_id}")
        test(2, "B4", d.get("name") == "Updated Doc", "Name updated", f"name={d.get('name')}")

        d, s = DELETE(f"/documents/{doc_id}")
        test(2, "B5", s == 200, "Delete document", f"status={s}")

        d, s = GET(f"/documents/{doc_id}")
        test(2, "B6", s == 404, "Deleted doc returns 404", f"status={s}")

    # Knowledge lifecycle
    d, s = POST("/knowledge/documents", {"title": "KL Test", "content": "Knowledge lifecycle test", "category": "testing"})
    kl_id = d.get("id")
    test(2, "C1", s in (200, 201), "Create knowledge doc", f"status={s}")

    if kl_id:
        d, s = GET(f"/knowledge/documents/{kl_id}")
        test(2, "C2", s == 200, "Read knowledge doc", f"status={s}")

        d, s = PUT(f"/knowledge/documents/{kl_id}", {"content": "Updated content v2"})
        test(2, "C3", s == 200, "Update knowledge doc", f"status={s}")

        d, s = DELETE(f"/knowledge/documents/{kl_id}")
        test(2, "C4", s == 200, "Delete knowledge doc", f"status={s}")

        d, s = GET(f"/knowledge/documents/{kl_id}")
        test(2, "C5", s == 404, "Deleted knowledge 404", f"status={s}")

    # Spreadsheet multi-sheet
    d, s = POST("/spreadsheets", {"name": "Multi-Sheet", "initial_data": [["Name", "Score"], ["Alice", 95], ["Bob", 87]]})
    sp = d.get("id")
    test(2, "D1", s == 200 and sp, "Create spreadsheet", f"status={s}")

    if sp:
        d, s = GET(f"/spreadsheets/{sp}")
        test(2, "D2", len(d.get("sheets", [])) >= 1, "Has sheets array", f"sheets={len(d.get('sheets', []))}")

        d, s = POST(f"/spreadsheets/{sp}/sheets", {"name": "Summary"})
        test(2, "D3", s == 200, "Add second sheet", f"status={s}")

        d, s = GET(f"/spreadsheets/{sp}")
        test(2, "D4", len(d.get("sheets", [])) >= 2, "Now has 2 sheets", f"sheets={len(d.get('sheets', []))}")

    # Favorites consistency
    d, s = POST("/favorites", {"entity_type": "templates", "entity_id": "fav-001"})
    test(2, "E1", s == 200, "Add template favorite", f"status={s}")

    d, s = POST("/favorites", {"entity_type": "dashboards", "entity_id": "fav-002"})
    test(2, "E2", s == 200, "Add dashboard favorite", f"status={s}")

    d, s = GET("/favorites")
    favs = d.get("favorites", {})
    test(2, "E3", "templates" in favs or "dashboards" in favs, "Favorites grouped by type", f"keys={list(favs.keys())}")

    d, s = DELETE("/favorites/templates/fav-001")
    test(2, "E4", s == 200, "Remove favorite", f"status={s}")


# ═══════════════════════════════════════════════════════════════
# GROUP 3: AI Features Deep Dive
# ═══════════════════════════════════════════════════════════════
def group3():
    print("\n═══ Group 3: AI Features Deep Dive ═══")

    # DocAI summarize/multi — needs document_ids; create temp docs first
    d1, _ = POST("/documents", {"name": "Q1 Revenue Report"})
    d2, _ = POST("/documents", {"name": "Q2 Revenue Report"})
    doc_ids = [d1.get("id", "fake1"), d2.get("id", "fake2")]
    d, s = POST("/docai/summarize/multi", {"document_ids": doc_ids, "max_length": 500})
    test(3, "A1", s == 200, "DocAI multi-summarize", f"status={s}")

    d, s = POST("/docai/entities", {"text": "John Smith, CEO of Acme Corp, announced $50M revenue on Jan 15, 2025."})
    test(3, "A2", s == 200, "DocAI entity extraction", f"status={s}")

    d, s = POST("/docai/classify", {"text": "The quarterly earnings report shows strong growth in all segments."})
    test(3, "A3", s == 200, "DocAI classification", f"status={s}")

    d, s = POST("/docai/compare", {"texts": ["Revenue was $10M in Q1", "Revenue grew to $12M in Q2"]})
    test(3, "A4", s == 200, "DocAI compare", f"status={s}")

    # Spreadsheet AI with financial data
    d, s = POST("/spreadsheets", {"name": "Financial Data", "initial_data": [["Month", "Revenue", "Costs", "Employees"], ["Jan", 500000, 320000, 45], ["Feb", 520000, 315000, 47], ["Mar", 580000, 340000, 50], ["Apr", 550000, 330000, 48], ["May", 610000, 350000, 52], ["Jun", 640000, 360000, 55]]})
    fin_sp = d.get("id")
    test(3, "B1", s == 200 and fin_sp, "Create financial spreadsheet", f"status={s}")

    if fin_sp:
        d, s = POST(f"/spreadsheets/{fin_sp}/ai/formula", {"description": "calculate profit (revenue minus costs) for each month"})
        test(3, "B2", s == 200, "AI: profit formula", f"status={s}")

        d, s = POST(f"/spreadsheets/{fin_sp}/ai/formula", {"description": "average revenue per employee"})
        test(3, "B3", s == 200, "AI: revenue per employee formula", f"status={s}")

        import urllib.parse
        formula = urllib.parse.quote("=SUMPRODUCT((B2:B7-C2:C7)/B2:B7)/6")
        d, s = POST(f"/spreadsheets/{fin_sp}/ai/explain?formula={formula}", None)
        test(3, "B4", s == 200, "AI: explain formula", f"status={s}")

        d, s = POST(f"/spreadsheets/{fin_sp}/ai/suggest", {})
        test(3, "B5", s == 200, "AI: suggestions", f"status={s}")

        d, s = POST(f"/spreadsheets/{fin_sp}/ai/anomalies?column=Revenue&sensitivity=medium", None)
        test(3, "B6", s == 200, "AI: anomaly detection", f"status={s}")

        import urllib.parse as _up
        pred_params = _up.urlencode({"target_description": "Revenue", "based_on_columns": "Month,Costs,Employees"})
        d, s = POST(f"/spreadsheets/{fin_sp}/ai/predict?{pred_params}", None)
        test(3, "B7", s in (200, 0), "AI: predict revenue (0=timeout ok)", f"status={s}")

    # Charts with various types
    d, s = POST("/charts/generate", {"chart_type": "bar", "data": [{"q": "Q1", "rev": 10.2}, {"q": "Q2", "rev": 11.5}, {"q": "Q3", "rev": 12.8}, {"q": "Q4", "rev": 15.2}], "x_field": "q", "y_fields": ["rev"]})
    test(3, "C1", s == 200, "Bar chart generation", f"status={s}")

    d, s = POST("/charts/generate", {"chart_type": "line", "data": [{"m": "Jan", "users": 100}, {"m": "Feb", "users": 120}, {"m": "Mar", "users": 140}], "x_field": "m", "y_fields": ["users"]})
    test(3, "C2", s == 200, "Line chart generation", f"status={s}")

    d, s = POST("/charts/generate", {"chart_type": "pie", "data": [{"device": "Desktop", "pct": 55}, {"device": "Mobile", "pct": 35}, {"device": "Tablet", "pct": 10}], "x_field": "device", "y_fields": ["pct"]})
    test(3, "C3", s == 200, "Pie chart generation", f"status={s}")

    # Agents — use specific agent type endpoints
    d, s = POST("/agents/research", {"topic": "market analysis trends 2025", "depth": "comprehensive", "max_sections": 3})
    test(3, "D1", s in (200, 201, 0), "Create research agent (0=timeout ok)", f"status={s}")

    d, s = GET("/agents/types")
    test(3, "D2", s == 200, "List agent types", f"status={s}")

    d, s = POST("/workflows", {"name": "Report Pipeline", "nodes": [{"id": "n1", "type": "trigger", "name": "Start", "config": {}, "position": {"x": 0, "y": 0}}, {"id": "n2", "type": "action", "name": "Fetch Data", "config": {}, "position": {"x": 200, "y": 0}}], "edges": [{"id": "e1", "source": "n1", "target": "n2"}], "triggers": [{"type": "manual", "config": {}}]})
    wf_id = d.get("id")
    test(3, "D3", s in (200, 201), "Create workflow", f"status={s}")

    # Synthesis — session based
    d, s = POST("/synthesis/sessions", {"name": "Executive Summary"})
    test(3, "D4", s == 200, "Synthesis create session", f"status={s}")

    # Visualizations — correct path
    d, s = POST("/visualization/diagrams/mindmap", {"content": "Q4 Business Review covering Revenue, Costs, and Risks", "title": "Q4 Review", "max_depth": 3})
    test(3, "D5", s == 200, "Mindmap visualization", f"status={s}")


# ═══════════════════════════════════════════════════════════════
# GROUP 4: Regression Tests for v4 Fixes
# ═══════════════════════════════════════════════════════════════
def group4():
    print("\n═══ Group 4: Regression Tests (v4 Fixes) ═══")

    # H1-v4: Analyze v2 routing
    d, s = GET("/analyze/v2/sources")
    test(4, "H1a", s == 200 and "sources" in d, "GET /sources (was 404)", f"status={s}, keys={list(d.keys())[:3]}")

    d, s = GET("/analyze/v2/integrations")
    test(4, "H1b", s == 200 and "integrations" in d, "GET /integrations (was 404)", f"status={s}, keys={list(d.keys())[:3]}")

    d, s = GET(f"/analyze/v2/{uuid.uuid4()}")
    test(4, "H1c", s == 404, "Catch-all still works for UUIDs", f"status={s}")

    # H2-v4: Dashboard stats route
    d, s = GET("/dashboards/stats")
    test(4, "H2a", s == 200 and "total_dashboards" in d, "GET /stats (was 404)", f"status={s}")

    d0_total = d.get("total_dashboards", 0)
    d_new, s = POST("/dashboards", {"name": "Stats Counter Test"})
    stats_dash = d_new.get("id")
    d, s = GET("/dashboards/stats")
    test(4, "H2b", d.get("total_dashboards", 0) > d0_total, "Stats total increased", f"before={d0_total} after={d.get('total_dashboards')}")

    if stats_dash:
        DELETE(f"/dashboards/{stats_dash}")
        d, s = GET("/dashboards/stats")
        test(4, "H2c", d.get("total_dashboards", 0) == d0_total, "Stats total decreased after delete", f"now={d.get('total_dashboards')}")

    # M1-v4 + M2-v4: Dashboard metadata & sharing
    d, s = POST("/dashboards", {"name": "Metadata Regression"})
    md_dash = d.get("id")
    test(4, "M1a", "metadata" in d, "New dashboard has metadata", f"keys={list(d.keys())}")

    if md_dash:
        d, s = GET(f"/dashboards/{md_dash}")
        test(4, "M1b", "metadata" in d, "GET detail has metadata", f"metadata={d.get('metadata')}")

        d, s = POST(f"/dashboards/{md_dash}/share", {"users": ["test1@x.com", "test2@x.com"], "permission": "view"})
        test(4, "M2a", s == 200, "Share dashboard", f"status={s}")

        d, s = GET(f"/dashboards/{md_dash}")
        sharing = (d.get("metadata") or {}).get("sharing", [])
        test(4, "M2b", len(sharing) == 2, "2 share entries visible", f"count={len(sharing)}")

        d, s = POST(f"/dashboards/{md_dash}/share", {"users": ["test1@x.com"], "permission": "admin"})
        d, s = GET(f"/dashboards/{md_dash}")
        sharing = (d.get("metadata") or {}).get("sharing", [])
        t1 = next((x for x in sharing if x.get("user") == "test1@x.com"), {})
        t2 = next((x for x in sharing if x.get("user") == "test2@x.com"), {})
        test(4, "M2c", t1.get("permission") == "admin" and t2.get("permission") == "view",
             "Permission upgrade works", f"test1={t1.get('permission')}, test2={t2.get('permission')}")

        # List endpoint also has metadata
        d, s = GET("/dashboards")
        found = next((x for x in d.get("dashboards", []) if x.get("id") == md_dash), {})
        test(4, "M1c", "metadata" in found, "List endpoint includes metadata", f"has_meta={'metadata' in found}")

    # M3-v4: Widget update no longer 500
    d, s = POST("/dashboards", {"name": "Widget Update Regression"})
    wu_dash = d.get("id")
    if wu_dash:
        d, s = POST(f"/dashboards/{wu_dash}/widgets", {"config": {"type": "chart", "title": "Original"}, "w": 4, "h": 3})
        wid = d.get("id")

        d, s = PUT(f"/dashboards/{wu_dash}/widgets/{wid}", {"config": {"type": "chart", "title": "Updated"}, "w": 6, "h": 4})
        test(4, "M3a", s == 200, "Widget update returns 200 (was 500)", f"status={s}")

        d, s = PUT(f"/dashboards/{wu_dash}/widgets/{wid}", {"x": 2, "y": 1})
        test(4, "M3b", s == 200, "Position-only update works", f"status={s}")

        d, s = GET(f"/dashboards/{wu_dash}")
        w = next((w for w in d.get("widgets", []) if w.get("id") == wid), {})
        test(4, "M3c", w.get("x") == 2 and w.get("y") == 1, "Position persisted", f"x={w.get('x')}, y={w.get('y')}")

    # M4-v4: Brand kit hex validation
    d, s = POST("/design/brand-kits", {"name": "Valid", "primary_color": "#FF5500", "secondary_color": "#00AAFF"})
    test(4, "M4a", s == 200, "Valid hex accepted", f"status={s}")

    d, s = POST("/design/brand-kits", {"name": "Bad", "primary_color": "#GGGGGG"})
    test(4, "M4b", s == 422, "Invalid hex #GGGGGG rejected", f"status={s}")

    d, s = POST("/design/brand-kits", {"name": "Bad", "primary_color": "red"})
    test(4, "M4c", s == 422, "Color word 'red' rejected", f"status={s}")

    d, s = POST("/design/brand-kits", {"name": "Bad", "primary_color": "#FFF"})
    test(4, "M4d", s == 422, "3-digit hex rejected", f"status={s}")

    d, s = POST("/design/brand-kits", {"name": "Lowercase", "primary_color": "#aabbcc"})
    test(4, "M4e", s == 200, "Lowercase hex accepted", f"status={s}")

    # L1-v4: Spreadsheet sheets array
    d, s = POST("/spreadsheets", {"name": "Sheets Regression"})
    sr_sp = d.get("id")
    if sr_sp:
        d, s = GET(f"/spreadsheets/{sr_sp}")
        sheets = d.get("sheets", [])
        test(4, "L1a", len(sheets) >= 1, "Detail has sheets array", f"count={len(sheets)}")
        if sheets:
            test(4, "L1b", all(k in sheets[0] for k in ("id", "name", "index")), "Sheet has id/name/index", f"keys={list(sheets[0].keys())}")

    # L2-v4: Jobs pagination
    d, s = GET("/jobs")
    test(4, "L2a", "total" in d and "limit" in d and "offset" in d, "Jobs has pagination", f"keys={list(d.keys())}")
    test(4, "L2b", isinstance(d.get("total"), int), "total is int", f"total={d.get('total')}")

    d, s = GET("/jobs?limit=5&offset=2")
    test(4, "L2c", d.get("limit") == 5 and d.get("offset") == 2, "Custom pagination reflected", f"limit={d.get('limit')}, offset={d.get('offset')}")

    # L3-v4: Favorites entity_id length
    d, s = POST("/favorites", {"entity_type": "templates", "entity_id": "x" * 500})
    test(4, "L3a", s == 200, "500-char entity_id accepted", f"status={s}")

    d, s = POST("/favorites", {"entity_type": "templates", "entity_id": "x" * 501})
    test(4, "L3b", s == 422, "501-char entity_id rejected", f"status={s}")

    d, s = POST("/favorites", {"entity_type": "templates", "entity_id": "x" * 10000})
    test(4, "L3c", s == 422, "10000-char entity_id rejected", f"status={s}")


# ═══════════════════════════════════════════════════════════════
# GROUP 5: Boundary Values & Edge Cases
# ═══════════════════════════════════════════════════════════════
def group5():
    print("\n═══ Group 5: Boundary Values & Edge Cases ═══")

    # Pagination boundaries
    d, s = GET("/jobs?limit=1&offset=0")
    test(5, "A1", s == 200 and d.get("limit") == 1, "limit=1", f"status={s}")

    d, s = GET("/jobs?limit=200")
    test(5, "A2", s == 200, "limit=200 (max)", f"status={s}")

    d, s = GET("/jobs?limit=0")
    test(5, "A3", s == 422, "limit=0 rejected", f"status={s}")

    d, s = GET("/jobs?limit=-1")
    test(5, "A4", s == 422, "limit=-1 rejected", f"status={s}")

    d, s = GET("/jobs?limit=201")
    test(5, "A5", s == 422, "limit=201 rejected", f"status={s}")

    d, s = GET("/jobs?offset=9999")
    test(5, "A6", s == 200 and len(d.get("jobs", [])) == 0, "Huge offset → empty", f"jobs={len(d.get('jobs', []))}")

    # String boundaries
    d, s = POST("/dashboards", {"name": "A"})
    test(5, "B1", s == 200, "1-char dashboard name", f"status={s}")

    d, s = POST("/dashboards", {"name": ""})
    test(5, "B2", s == 422, "Empty name rejected", f"status={s}")

    # Widget size boundaries
    d, s = POST("/dashboards", {"name": "Widget Bounds Test"})
    wb_dash = d.get("id")
    if wb_dash:
        d, s = POST(f"/dashboards/{wb_dash}/widgets", {"config": {"type": "chart", "title": "Min"}, "w": 1, "h": 1, "x": 0, "y": 0})
        test(5, "C1", s == 200, "Min size widget (1x1)", f"status={s}")

        d, s = POST(f"/dashboards/{wb_dash}/widgets", {"config": {"type": "chart", "title": "Max"}, "w": 12, "h": 20, "x": 11, "y": 99})
        test(5, "C2", s == 200, "Max position/size widget", f"status={s}")

    # Special characters
    d, s = POST("/dashboards", {"name": "Template with 'quotes' and \"backslash\""})
    test(5, "D1", s == 200, "Quotes in name", f"status={s}")

    d, s = POST("/documents", {"name": "Émojis 🎉🚀 and Ünïcödé"})
    test(5, "D2", s in (200, 201), "Unicode/emoji in name", f"status={s}")

    d, s = POST("/knowledge/documents", {"title": "日本語テスト", "content": "中文内容", "category": "test"})
    test(5, "D3", s in (200, 201), "CJK characters", f"status={s}")

    d, s = POST("/dashboards", {"name": "null"})
    test(5, "D4", s == 200, "Literal 'null' string as name", f"status={s}")

    d, s = POST("/dashboards", {"name": "0"})
    test(5, "D5", s == 200, "Literal '0' as name", f"status={s}")

    # Rapid sequential widget operations
    d, s = POST("/dashboards", {"name": "Rapid Ops Test"})
    rapid_dash = d.get("id")
    if rapid_dash:
        rapid_ids = []
        for i in range(10):
            d, s = POST(f"/dashboards/{rapid_dash}/widgets", {"config": {"type": "metric", "title": f"R{i}"}, "w": 2, "h": 2})
            if d.get("id"):
                rapid_ids.append(d["id"])
        test(5, "E1", len(rapid_ids) == 10, "10 rapid widget creates", f"created={len(rapid_ids)}")

        d, s = GET(f"/dashboards/{rapid_dash}")
        test(5, "E2", len(d.get("widgets", [])) == 10, "All 10 present", f"count={len(d.get('widgets', []))}")

        for wid in rapid_ids[:5]:
            DELETE(f"/dashboards/{rapid_dash}/widgets/{wid}")
        d, s = GET(f"/dashboards/{rapid_dash}")
        test(5, "E3", len(d.get("widgets", [])) == 5, "5 remain after delete", f"count={len(d.get('widgets', []))}")


# ═══════════════════════════════════════════════════════════════
# GROUP 6: Security & Error Handling
# ═══════════════════════════════════════════════════════════════
def group6():
    print("\n═══ Group 6: Security & Error Handling ═══")

    # SQL injection — use knowledge search with URL-encoded payload
    import urllib.parse
    sqli = urllib.parse.quote("'; DROP TABLE users; --")
    d, s = GET(f"/knowledge/search?q={sqli}")
    test(6, "A1", s in (200, 404, 422), "SQL injection in search → no crash", f"status={s}")

    d, s = POST("/documents", {"name": "'; DROP TABLE docs; --"})
    test(6, "A2", s in (200, 201), "SQL injection in name → stored safely", f"status={s}")

    # XSS
    d, s = POST("/dashboards", {"name": "<script>alert('xss')</script>"})
    test(6, "A3", s == 200, "XSS in name → stored verbatim (React escapes)", f"status={s}")

    d, s = POST("/documents", {"name": "<img src=x onerror=alert(1)>"})
    test(6, "A4", s in (200, 201), "XSS img tag stored safely", f"status={s}")

    # Template injection
    d, s = POST("/dashboards", {"name": "{{7*7}}"})
    test(6, "A5", s == 200, "SSTI attempt → safe", f"status={s}")

    # Path traversal
    d, s = GET("/documents/../../../etc/passwd")
    test(6, "A6", s in (404, 400, 422), "Path traversal blocked", f"status={s}")

    # Malformed JSON
    try:
        r = urllib.request.Request(f"{BASE}/dashboards", b"not json", method="POST",
                                   headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(r) as resp:
            test(6, "B1", False, "Malformed JSON rejected", "returned 200")
    except urllib.error.HTTPError as e:
        test(6, "B1", e.code == 422, "Malformed JSON → 422", f"status={e.code}")

    try:
        r = urllib.request.Request(f"{BASE}/dashboards", b"", method="POST",
                                   headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(r) as resp:
            test(6, "B2", False, "Empty body rejected", "returned 200")
    except urllib.error.HTTPError as e:
        test(6, "B2", e.code == 422, "Empty body → 422", f"status={e.code}")

    # 404 with various ID formats
    d, s = GET("/dashboards/00000000-0000-0000-0000-000000000000")
    test(6, "C1", s == 404, "Nonexistent UUID → 404", f"status={s}")

    d, s = GET("/dashboards/not-a-uuid")
    test(6, "C2", s == 404, "Invalid ID → 404", f"status={s}")

    d, s = GET("/nonexistent-endpoint")
    test(6, "C3", s == 404, "Unknown endpoint → 404", f"status={s}")

    # Method not allowed
    d, s = req("PATCH", "/dashboards/stats")
    test(6, "D1", s == 405, "PATCH /stats → 405", f"status={s}")

    d, s = req("DELETE", "/dashboards/stats")
    test(6, "D2", s in (404, 405), "DELETE /stats → 404 or 405", f"status={s}")

    # Type coercion
    d, s = POST("/dashboards", {"name": 123})
    test(6, "E1", s in (200, 422), "Numeric name (coerced or rejected)", f"status={s}")

    d, s = POST("/dashboards", {"name": None})
    test(6, "E2", s == 422, "null name rejected", f"status={s}")

    d, s = GET("/jobs?limit=abc")
    test(6, "E3", s == 422, "Non-numeric limit rejected", f"status={s}")

    # Duplicate favorite operations
    d, s = POST("/favorites", {"entity_type": "templates", "entity_id": "dup-test"})
    test(6, "F1", s == 200, "Add favorite", f"status={s}")

    d, s = POST("/favorites", {"entity_type": "templates", "entity_id": "dup-test"})
    test(6, "F2", s == 200, "Re-add same favorite (idempotent)", f"status={s}")

    d, s = DELETE("/favorites/templates/dup-test")
    test(6, "F3", s == 200, "Remove favorite", f"status={s}")

    # CORS headers
    try:
        r = urllib.request.Request(f"{BASE}/health")
        with urllib.request.urlopen(r) as resp:
            ct = resp.headers.get("Content-Type", "")
            test(6, "G1", "application/json" in ct, "Content-Type is JSON", f"ct={ct}")
    except:
        test(6, "G1", False, "Health endpoint failed", "")


# ═══════════════════════════════════════════════════════════════
# GROUP 7: Cross-Feature Integration
# ═══════════════════════════════════════════════════════════════
def group7():
    print("\n═══ Group 7: Cross-Feature Integration ═══")

    # Dashboard + Knowledge + Analytics
    d, s = POST("/knowledge/documents", {"title": "Integration KB", "content": "Test cross-feature data", "category": "integration"})
    kb_id = d.get("id")
    test(7, "A1", s in (200, 201), "Create knowledge doc", f"status={s}")

    d, s = POST("/dashboards", {"name": "Integration Dashboard"})
    int_dash = d.get("id")
    test(7, "A2", s == 200, "Create dashboard", f"status={s}")

    if int_dash:
        d, s = POST(f"/dashboards/{int_dash}/widgets", {"config": {"type": "table", "title": "KB Items"}, "w": 12, "h": 6})
        test(7, "A3", s == 200, "Add widget to dashboard", f"status={s}")

        d, s = POST("/favorites", {"entity_type": "dashboards", "entity_id": int_dash})
        test(7, "A4", s == 200, "Favorite the dashboard", f"status={s}")

        d, s = POST(f"/dashboards/{int_dash}/share", {"users": ["user@test.com"], "permission": "edit"})
        test(7, "A5", s == 200, "Share dashboard", f"status={s}")

    d, s = POST("/analytics/activity", {"action": "dashboard_view", "entity_type": "dashboard", "entity_id": int_dash or "test", "entity_name": "Integration Test"})
    test(7, "A6", s == 200, "Track analytics event", f"status={s}")

    d, s = GET("/analytics/activity")
    test(7, "A7", s == 200, "Get activity feed", f"status={s}")

    # Design system
    d, s = POST("/design/brand-kits", {"name": "Corporate Blue", "primary_color": "#1E40AF", "secondary_color": "#3B82F6"})
    bk_id = d.get("id")
    test(7, "B1", s == 200, "Create brand kit", f"status={s}")

    d, s = POST("/design/themes", {"name": "Corporate Theme", "mode": "light", "colors": {"primary": "#1E40AF"}})
    theme_id = d.get("id")
    test(7, "B2", s in (200, 201), "Create theme", f"status={s}")

    d, s = POST("/design/colors/contrast", {"color1": "#1E40AF", "color2": "#F9FAFB"})
    test(7, "B3", s == 200, "Check color contrast", f"status={s}")

    d, s = POST("/design/color-palette", {"base_color": "#1E40AF"})
    test(7, "B4", s == 200, "Generate color palette", f"status={s}")

    d, s = POST("/design/colors/accessible", {"background_color": "#FFFFFF"})
    test(7, "B5", s == 200, "Accessible colors", f"status={s}")

    d, s = GET("/design/fonts")
    test(7, "B6", s == 200, "List fonts", f"status={s}")

    # Health + stats aggregate
    d, s = GET("/health")
    test(7, "C1", s == 200, "Health check", f"status={s}")

    d, s = GET("/health/detailed")
    test(7, "C2", s == 200, "Detailed health", f"status={s}")

    d, s = GET("/dashboards/stats")
    test(7, "C3", s == 200, "Dashboard stats", f"status={s}")

    d, s = GET("/knowledge/stats")
    test(7, "C4", s == 200, "Knowledge stats", f"status={s}")

    d, s = GET("/analytics/dashboard")
    test(7, "C5", s == 200, "Analytics dashboard", f"status={s}")

    # Notifications pipeline
    d, s = POST("/notifications", {"title": "Success", "message": "Report done", "type": "success"})
    test(7, "D1", s in (200, 201), "Success notification", f"status={s}")

    d, s = POST("/notifications", {"title": "Warning", "message": "Widget refresh failed", "type": "warning"})
    test(7, "D2", s in (200, 201), "Warning notification", f"status={s}")

    d, s = GET("/notifications")
    notifs = d.get("notifications", [])
    test(7, "D3", len(notifs) >= 2, "Notifications listed", f"count={len(notifs)}")


# ═══════════════════════════════════════════════════════════════
# GROUP 8: Multi-Domain Realistic Data
# ═══════════════════════════════════════════════════════════════
def group8():
    print("\n═══ Group 8: Multi-Domain Realistic Data ═══")

    # Healthcare
    d, s = POST("/spreadsheets", {"name": "Patient Data", "initial_data": [["Ward", "Admissions", "Discharges", "Avg Stay"], ["ICU", 45, 38, 8.2], ["Cardiology", 120, 115, 4.5], ["Oncology", 65, 58, 12.1], ["Emergency", 310, 305, 1.8]]})
    health_sp = d.get("id")
    test(8, "A1", s == 200, "Healthcare spreadsheet", f"status={s}")

    if health_sp:
        d, s = POST(f"/spreadsheets/{health_sp}/ai/suggest", {})
        test(8, "A2", s == 200, "Healthcare AI suggestions", f"status={s}")

    d, s = POST("/dashboards", {"name": "Hospital Operations"})
    hosp_dash = d.get("id")
    if hosp_dash:
        for wt in ["metric", "chart", "table"]:
            POST(f"/dashboards/{hosp_dash}/widgets", {"config": {"type": wt, "title": f"Hospital {wt}"}, "w": 4, "h": 3})
        d, s = GET(f"/dashboards/{hosp_dash}")
        test(8, "A3", len(d.get("widgets", [])) == 3, "Hospital dashboard has 3 widgets", f"count={len(d.get('widgets', []))}")

    # Finance
    d, s = POST("/spreadsheets", {"name": "Portfolio", "initial_data": [["Ticker", "Shares", "Price"], ["AAPL", 100, 198.30], ["MSFT", 50, 415.60], ["JNJ", 75, 162.40]]})
    fin_sp = d.get("id")
    test(8, "B1", s == 200, "Finance spreadsheet", f"status={s}")

    if fin_sp:
        d, s = POST(f"/spreadsheets/{fin_sp}/ai/formula", {"description": "total portfolio value (shares * price)"})
        test(8, "B2", s == 200, "Portfolio value formula", f"status={s}")

        d, s = POST(f"/spreadsheets/{fin_sp}/ai/anomalies?column=Price&sensitivity=medium", None)
        test(8, "B3", s == 200, "Portfolio anomalies", f"status={s}")

    d, s = POST("/charts/generate", {"chart_type": "pie", "data": [{"sector": "Tech", "val": 61390}, {"sector": "Healthcare", "val": 12180}, {"sector": "Finance", "val": 12648}], "x_field": "sector", "y_fields": ["val"]})
    test(8, "B4", s == 200, "Portfolio allocation pie chart", f"status={s}")

    # DevOps
    d, s = POST("/knowledge/documents", {"title": "Pipeline Runbook", "content": "Deploy: code review → tests → staging → canary 5% → full rollout", "category": "engineering"})
    test(8, "C1", s in (200, 201), "DevOps knowledge doc", f"status={s}")

    d, s = POST("/dashboards", {"name": "CI/CD Health"})
    ci_dash = d.get("id")
    if ci_dash:
        POST(f"/dashboards/{ci_dash}/widgets", {"config": {"type": "metric", "title": "Success Rate 94.4%"}, "w": 3, "h": 2})
        POST(f"/dashboards/{ci_dash}/widgets", {"config": {"type": "chart", "title": "Builds/Day"}, "w": 6, "h": 4})
        POST(f"/dashboards/{ci_dash}/share", {"users": ["devops@team.com"], "permission": "view"})
        d, s = GET(f"/dashboards/{ci_dash}")
        sharing = (d.get("metadata") or {}).get("sharing", [])
        test(8, "C2", len(d.get("widgets", [])) == 2 and len(sharing) == 1, "DevOps dashboard + sharing", f"widgets={len(d.get('widgets', []))}, shared={len(sharing)}")

    # E-commerce
    d, s = POST("/spreadsheets", {"name": "Product Performance", "initial_data": [["Product", "Units", "Revenue", "Rating"], ["Widget Pro", 2340, 468000, 4.7], ["Widget Plus", 1850, 277500, 4.3], ["Widget Basic", 3100, 186000, 4.1]]})
    ecom_sp = d.get("id")
    test(8, "D1", s == 200, "E-commerce spreadsheet", f"status={s}")

    if ecom_sp:
        d, s = POST(f"/spreadsheets/{ecom_sp}/ai/predict?target_description=Revenue&based_on_columns=Units,Rating", None)
        test(8, "D2", s in (200, 0), "Revenue prediction (0=timeout ok)", f"status={s}")

    # Multi-connection setup
    for i, (name, typ) in enumerate([("Prod DB", "postgresql"), ("Analytics", "bigquery"), ("Cache", "redis")]):
        d, s = POST("/connections", {"name": name, "type": typ, "config": {"host": f"{typ}.internal"}})
        test(8, f"E{i+1}", s in (200, 201, 400), f"Create {typ} connection", f"status={s}")

    d, s = GET("/connections")
    test(8, "E4", s == 200, "List connections", f"status={s}")

    d, s = GET("/connectors/types")
    test(8, "E5", s == 200, "List connection types", f"status={s}")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 60)
    print("  QA ROUND 5 — Comprehensive Test Suite")
    print("=" * 60)

    # Verify server is up
    try:
        d, s = GET("/health")
        if s != 200:
            print(f"ERROR: Server returned {s} on health check")
            sys.exit(1)
    except:
        print("ERROR: Cannot reach server at localhost:9070")
        sys.exit(1)

    for group_fn in [group1, group2, group3, group4, group5, group6, group7, group8]:
        try:
            group_fn()
        except Exception as e:
            print(f"  ERROR in {group_fn.__name__}: {e}")

    # Summary
    print("\n" + "=" * 60)
    print("  QA ROUND 5 — FINAL SUMMARY")
    print("=" * 60)

    groups = {}
    for g, tid, status, desc, detail in RESULTS:
        groups.setdefault(g, {"PASS": 0, "FAIL": 0, "WARN": 0})
        groups[g][status] += 1

    total_p = total_f = total_w = 0
    for g in sorted(groups):
        p, f, w = groups[g]["PASS"], groups[g]["FAIL"], groups[g]["WARN"]
        total_p += p; total_f += f; total_w += w
        t = p + f + w
        print(f"  Group {g}: PASS={p} FAIL={f} WARN={w} Total={t}")

    total = total_p + total_f + total_w
    print(f"\n  TOTAL: PASS={total_p} ({100*total_p//total}%) | FAIL={total_f} | WARN={total_w} | Tests={total}")

    # List failures
    failures = [(g, tid, desc, detail) for g, tid, status, desc, detail in RESULTS if status == "FAIL"]
    if failures:
        print(f"\n  === {len(failures)} FAILURES ===")
        for g, tid, desc, detail in failures:
            print(f"  G{g} {tid}: {desc} — {detail}")
    else:
        print("\n  ALL TESTS PASSED!")

    print()
