# Job Runs Report - Mapping Overview

## Executive Summary
This report displays detailed job execution metrics from the `app_job_runs` table. Each row represents a single job run with timing, performance, and error statistics.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 8 (job_id, started_at, stopped_at, duration_ms, rows_written, read_lat_avg, write_lat_avg, error)
- **Totals**: None

## Mapping Table
| Token | Source Column | Type |
|-------|---------------|------|
| row_job_id | app_job_runs.job_id | Direct |
| row_started_at | app_job_runs.started_at | Direct |
| row_stopped_at | app_job_runs.stopped_at | Direct |
| row_duration_ms | app_job_runs.duration_ms | Direct |
| row_rows_written | app_job_runs.rows | Direct |
| row_read_lat_avg | app_job_runs.read_lat_avg | Direct |
| row_write_lat_avg | app_job_runs.write_lat_avg | Direct |
| row_error | app_job_runs.error_pct | Direct |

## Join & Date Rules
- **Primary Table**: app_job_runs
- **Primary Key**: id
- **No Child Join**: Single-table report
- **Date Column**: started_at (for optional filtering)
- **Default Ordering**: ROWID ascending

## Transformations
- No reshape rules required
- No computed columns
- No aggregations

## Parameters
- **Required**: None
- **Optional**: None (filters can be applied to date ranges if needed)