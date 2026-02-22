# Job Runs Report — Mapping Contract

## Executive Summary
This report displays **job execution history** from the `app_job_runs` table, showing runtime metrics (duration, rows processed, latency). Three tokens (`row_status`, `row_error_message`, `row_run_type`) are **unresolved** as the corresponding columns do not exist in the current schema.

## Token Inventory
| Token | Type | Source | Notes |
|-------|------|--------|-------|
| `row_id` | row | `app_job_runs.id` | Primary key |
| `row_job_id` | row | `app_job_runs.job_id` | Foreign key to `app_jobs` |
| `row_status` | row | UNRESOLVED | No status column in `app_job_runs` |
| `row_started_at` | row | `app_job_runs.started_at` | Timestamp (TEXT) |
| `row_finished_at` | row | `app_job_runs.stopped_at` | Timestamp (TEXT) |
| `row_rows_written` | row | `app_job_runs.rows` | Integer |
| `row_duration_ms` | row | `app_job_runs.duration_ms` | Integer |
| `row_error_message` | row | UNRESOLVED | No error column in `app_job_runs` |
| `row_run_type` | row | UNRESOLVED | No type column in `app_job_runs` |

## Join & Date Rules
- **Primary Table**: `app_job_runs` (self-join on `id`)
- **Date Column**: `app_job_runs.started_at` — filters job runs by start time
- **Ordering**: `started_at DESC` (most recent first)

## Transformations
- **None** — direct column mapping, no reshaping or computation required.

## Parameters
- **None** — all tokens map to direct columns or are unresolved.

## Unresolved Tokens
1. `row_status` — requires adding a status column or deriving from `app_jobs.status`
2. `row_error_message` — requires joining with `app_job_errors_minute` or adding an error column
3. `row_run_type` — requires deriving from `app_jobs.type` via join

## Recommendations
- **Option A**: Leave unresolved tokens as-is (will render empty cells)
- **Option B**: Add missing columns to `app_job_runs` schema
- **Option C**: Extend contract to join `app_jobs` for `type` and derive status from run metrics