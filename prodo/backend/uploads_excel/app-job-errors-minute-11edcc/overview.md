# Job Errors Report — Mapping Contract Overview

## Executive Summary
This report displays job error events aggregated by minute, showing job ID, error code, timestamp, occurrence count, and last error message. Data is sourced from the `app_job_errors_minute` table with no joins, transformations, or parameters required.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 5 (job_id, code, minute_utc, count, last_message)
- **Totals**: None

## Mapping Table
| Token | Source Column | Type |
|-------|---------------|------|
| row_job_id | app_job_errors_minute.job_id | Direct |
| row_code | app_job_errors_minute.code | Direct |
| row_minute_utc | app_job_errors_minute.minute_utc | Direct |
| row_count | app_job_errors_minute.count | Direct |
| row_last_message | app_job_errors_minute.last_message | Direct |

## Join & Date Rules
- **Primary Table**: app_job_errors_minute (no child tables)
- **Join Key**: job_id = job_id (self-join placeholder)
- **Date Column**: app_job_errors_minute.minute_utc
- **Ordering**: ROWID (default insertion order)

## Transformations
None required — all tokens map directly to existing columns.

## Parameters
None required — report displays all error records unfiltered.