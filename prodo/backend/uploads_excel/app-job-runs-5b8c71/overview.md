# Job Runs Report — Mapping Overview

## Executive Summary
This report displays operational metrics for job execution runs, tracking performance indicators including timing, throughput, latency, and error rates. All data is sourced from the `app_job_runs` table with one computed error percentage field.

## Token Inventory
- **Scalars**: (none)
- **Row Tokens**: 8 tokens representing per-run metrics
- **Totals**: (none)

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| `row_job_id` | `app_job_runs.job_id` | Direct |
| `row_started_at` | `app_job_runs.started_at` | Direct |
| `row_stopped_at` | `app_job_runs.stopped_at` | Direct |
| `row_duration_ms` | `app_job_runs.duration_ms` | Direct |
| `row_rows_written` | `app_job_runs.rows` | Direct |
| `row_read_lat_avg` | `app_job_runs.read_lat_avg` | Direct |
| `row_write_lat_avg` | `app_job_runs.write_lat_avg` | Direct |
| `row_error` | `app_job_runs.error_pct` | Computed (formatted as %) |

## Join & Date Rules
- **Join Strategy**: Single-table query on `app_job_runs`
- **Parent Table**: `app_job_runs` (keyed by `id`)
- **Date Columns**: `started_at` for temporal filtering
- **Ordering**: Default ROWID order

## Transformations
- **Error Percentage Formatting**: `app_job_runs.error_pct` (stored as numeric, e.g., 1900.0) formatted as percentage with 2 decimal places

## Parameters
(none required)