# QA Round 6 — Manual Exploratory Testing

**Date**: 2026-02-23
**Method**: Intelligent manual QA — reading actual response bodies, reasoning about data quality, testing logical consistency, verifying AI outputs against expectations.

## Bugs Found & Fixed

### FIXED: Dashboard /stats reports total_widgets=0, total_favorites=0
- **Severity**: Medium
- **Endpoint**: `GET /api/v1/dashboards/stats`
- **Problem**: `get_stats()` looked for `state["dashboard_widgets"]` (non-existent key) instead of counting widgets inside each dashboard. Favorites counted only "dashboards" bucket (always empty since favorites doesn't support dashboards).
- **Fix**: Iterate dashboards and `sum(len(d.get("widgets", [])))` for widgets. Count all favorite types with `sum(len(v) for v in favs.values())`.
- **Before**: `{"total_dashboards": 95, "total_widgets": 0, "total_favorites": 0}`
- **After**: `{"total_dashboards": 95, "total_widgets": 110, "total_favorites": 8}`

### FIXED (prior round): Dashboard metadata not persisting on PUT
- Was found by background regression agent and fixed in the same session.

## Bugs Found — Not Fixed (Design/Low Priority)

### L1: Knowledge list returns raw array instead of wrapped object
- **Severity**: Low
- **Endpoint**: `GET /api/v1/knowledge/documents`
- **Problem**: Returns `[{...}, {...}]` instead of `{"documents": [{...}]}`. Every other list endpoint wraps in an object with pagination metadata.
- **Impact**: Frontend works fine (handles both), but inconsistent API contract.

### L2: Favorites silently drops dashboards/documents (added: false)
- **Severity**: Low
- **Endpoint**: `POST /api/v1/favorites`
- **Problem**: The validator accepts "dashboards" and "documents" as valid entity types (they're in the allowed list), but `add_favorite()` returns `{"added": false}` without storing them. No error returned. The error message for truly invalid types even lists "dashboards" and "documents" as valid.
- **Impact**: Confusing behavior — API says "ok" but doesn't save.

### L3: Knowledge search returns 0 results for content that exists
- **Severity**: Low-Medium
- **Endpoint**: `GET /api/v1/knowledge/search?query=...`
- **Problem**: Searching for "python" after creating a doc titled "Python Best Practices" returns 0 results. Search may not index title/content properly, or index isn't updated on doc creation.
- **Impact**: Search is effectively non-functional for newly created docs.

### INFO: DocAI entity extraction / classification / compare are stub quality
- **Severity**: Info (not a bug)
- **Root cause**: spaCy is not installed in dev environment. Falls back to regex-only extraction (only matches `$N` and `N%` patterns). Classification returns "other" with 0.1 confidence for all inputs. Compare returns 0% similarity for related texts.
- **Impact**: DocAI features degrade severely without spaCy, but this is expected for dev environments.

## What Was Verified as Working Correctly

| Area | Status | Notes |
|------|--------|-------|
| Timestamps | Correct | Valid ISO-8601 UTC, created_at immutable, updated_at changes on update |
| Pagination math | Correct | Total matches actual count, no page overlap, offset/limit slicing correct |
| Sort order | Correct | Newest-first (updated_at DESC), with minor undefined order for same-second items |
| Cross-endpoint consistency | Correct | Dashboard from list vs detail returns identical data |
| Orphan cleanup | Correct | Deleted dashboard → 404, favorites don't leak, snapshots 404 |
| Concurrent writes | Safe | 5 simultaneous updates → no data loss, 5 concurrent widget adds → all 5 present |
| AI formula generation | Excellent | Valid Excel syntax, accurate logic, useful alternatives and explanations |
| AI explain formula | Excellent | Correct step-by-step VLOOKUP breakdown, component analysis, practical warnings |
| AI anomaly detection | Excellent | Found both obvious outliers (9999, 100000), accurate ranges and summary |
| Color contrast (WCAG) | Correct | Black/white=21:1, red/white=4.0, same-color=1.0 — all mathematically accurate |
| Accessible color suggestions | Correct | All suggestions meet AA threshold (>=4.5 contrast ratio) |
| Error message quality | Excellent | Clear field location, error type, expected format, custom validator messages |
| Notification lifecycle | Correct | Create → list → read status, proper IDs and timestamps |
| Dashboard metadata merge | Correct | Custom metadata + sharing metadata coexist after fix |

## Test Count

| Category | Tests | Issues |
|----------|-------|--------|
| Timestamps & state | 6 | 0 |
| AI output quality | 5 | 1 (DocAI stub — expected) |
| Pagination & sorting | 4 | 0 |
| Orphan data | 3 | 0 |
| Concurrency | 2 | 0 |
| WCAG / design system | 3 | 0 |
| Error messages | 6 | 0 |
| Stats accuracy | 2 | 1 (FIXED) |
| Knowledge search | 3 | 1 (not fixed) |
| Favorites behavior | 2 | 1 (not fixed) |
| Cross-endpoint | 2 | 0 |
| **Total** | **38** | **4 found, 2 fixed** |
