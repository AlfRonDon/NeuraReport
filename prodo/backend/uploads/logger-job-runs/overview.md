# Job Runs Performance Report — Contract Overview

## Executive Summary
This report surfaces per-run performance metrics from the `app_job_runs` table for a user-selected date range. Each row represents one job run with its timing, throughput, latency, and error statistics. No aggregation or totals section is required.

## Token Inventory
| Token | Type | Source |
|---|---|---|
| date_from | Scalar | PARAM:date_from |
| date_to | Scalar | PARAM:date_to |
| generated_at | Scalar | Server-injected at render time |
| row_job_id | Row | app_job_runs.job_id |
| row_started_at | Row | app_job_runs.started_at |
| row_stopped_at | Row | app_job_runs.stopped_at |
| row_duration_ms | Row | app_job_runs.duration_ms |
| row_rows | Row | app_job_runs.rows |
| row_read_lat_avg | Row | app_job_runs.read_lat_avg |
| row_write_lat_avg | Row | app_job_runs.write_lat_avg |
| row_error_pct | Row | app_job_runs.error_pct |

## Join & Filter Rules
- Single table: `app_job_runs` — no join required.
- Filter: `started_at` between `PARAM:date_from` and `PARAM:date_to`.

## Transformations
- `row_started_at` and `row_stopped_at` formatted as `%Y-%m-%d %H:%M:%S`.
- `row_duration_ms` formatted as integer number.
- `row_read_lat_avg` and `row_write_lat_avg` formatted to 4 decimal places.
- `row_error_pct` formatted to 2 decimal places.
- `generated_at` is server-side runtime timestamp injected at render time (not from DB).

## Parameters
- `date_from` (required, date): Start of reporting period, used to filter `started_at`.
- `date_to` (required, date): End of reporting period, used to filter `started_at`.

## Ordering
- Rows ordered by `started_at ASC`.