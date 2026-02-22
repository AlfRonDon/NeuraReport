# Job Runs Report — Mapping Overview

## Executive Summary
This report displays a comprehensive log of job execution runs from the `app_job_runs` table. Each row captures a single job execution with timing, performance metrics, and error statistics. The report is a simple tabular list with no aggregations, parameters, or transformations.

## Token Inventory

| Category | Count | Coverage |
|----------|-------|----------|
| Scalars  | 0     | N/A      |
| Rows     | 9     | 100%     |
| Totals   | 0     | N/A      |

## Mapping Table

| Token | Source Column | Type |
|-------|---------------|------|
| `row_id` | `app_job_runs.id` | Direct |
| `row_job_id` | `app_job_runs.job_id` | Direct |
| `row_started_at` | `app_job_runs.started_at` | Direct (timestamp) |
| `row_stopped_at` | `app_job_runs.stopped_at` | Direct (timestamp) |
| `row_duration_ms` | `app_job_runs.duration_ms` | Direct (numeric) |
| `row_rows` | `app_job_runs.rows` | Direct (numeric) |
| `row_read_lat_avg` | `app_job_runs.read_lat_avg` | Direct (numeric) |
| `row_write_lat_avg` | `app_job_runs.write_lat_avg` | Direct (numeric) |
| `row_error_pct` | `app_job_runs.error_pct` | Direct (numeric) |

## Join & Date Rules

- **Primary Table**: `app_job_runs`
- **Primary Key**: `id`
- **Child Table**: None (single-table report)
- **Date Column**: `app_job_runs.started_at` — used for time-range filtering on job start timestamps
- **Default Ordering**: `started_at DESC` (most recent runs first)

## Transformations

None. All columns are direct mappings from the source table.

## Parameters

None required. Optional date-range filters can be applied via `started_at`.