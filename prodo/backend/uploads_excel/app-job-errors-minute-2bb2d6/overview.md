# Job Errors Minute Report - Contract Overview

## Executive Summary
This report displays job error statistics aggregated by minute, showing error codes, timestamps, occurrence counts, and the most recent error message for each job.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 5 (job_id, error_code, minute_utc, count, last_message)
- **Totals**: None

## Mapping Table
| Token | Source Column | Type |
|-------|--------------|------|
| row_job_id | app_job_errors_minute.job_id | Direct |
| row_error_code | app_job_errors_minute.code | Direct |
| row_minute_utc | app_job_errors_minute.minute_utc | Direct |
| row_count | app_job_errors_minute.count | Direct |
| row_last_message | app_job_errors_minute.last_message | Direct |

## Join & Date Rules
- **Primary Table**: app_job_errors_minute
- **Primary Key**: job_id, code, minute_utc (composite)
- **No child tables** - single table query
- **Date Column**: app_job_errors_minute.minute_utc

## Transformations
None - direct column mapping from source table.

## Parameters
None defined - report shows all error records without filtering.