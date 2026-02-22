# Job Errors Minute Report - Mapping Overview

## Executive Summary
This report displays error occurrences aggregated by minute for each job. It pulls directly from the `app_job_errors_minute` table, showing job ID, error code, timestamp, occurrence count, and the last error message.

## Token Inventory

| Token | Type | Source |
|-------|------|--------|
| `row_job_id` | row | app_job_errors_minute.job_id |
| `row_code` | row | app_job_errors_minute.code |
| `row_minute_utc` | row | app_job_errors_minute.minute_utc |
| `row_count` | row | app_job_errors_minute.count |
| `row_last_message` | row | app_job_errors_minute.last_message |

## Join & Date Rules
- **Primary Table**: `app_job_errors_minute` (single table query)
- **Date Column**: `minute_utc` (TEXT type, contains UTC timestamps for time-range filtering)
- **Join**: Self-join (single table, no relationships required)

## Transformations
- No reshape, computed columns, or aggregations required
- Direct column mapping from source table to row tokens

## Parameters
- **Optional**: Time range filters can be applied via `minute_utc`
- No required user parameters

## Ordering
Default ordering by ROWID (insertion order) preserves chronological error sequence.