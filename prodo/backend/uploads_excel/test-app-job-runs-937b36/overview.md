# Job Runs Report — Mapping Contract Overview

## Executive Summary
This report displays execution history for background jobs, showing runtime metrics, error rates, and completion status for each run instance.

## Token Inventory
| Token | Type | Source |
|-------|------|--------|
| row_id | Row | app_job_runs.id |
| row_job_id | Row | app_job_runs.job_id |
| row_status | Row | UNRESOLVED (no status column in app_job_runs) |
| row_started_at | Row | app_job_runs.started_at |
| row_finished_at | Row | app_job_runs.stopped_at |
| row_rows_written | Row | app_job_runs.rows |
| row_duration_ms | Row | app_job_runs.duration_ms |
| row_error_message | Row | app_job_runs.error_pct |
| row_run_type | Row | UNRESOLVED (no run_type in app_job_runs) |

## Join & Date Rules
- **Primary Table**: app_job_runs (self-join on id)
- **Date Column**: app_job_runs.started_at (timestamp filter column)
- **Ordering**: started_at DESC (most recent runs first)

## Transformations
No reshape or computed columns required — direct column mapping.

## Unresolved Tokens
- **row_status**: No status column exists in app_job_runs table
- **row_run_type**: No run_type column exists in app_job_runs table

## Parameters
None required.