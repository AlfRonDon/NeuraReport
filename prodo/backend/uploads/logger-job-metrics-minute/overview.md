## Job Metrics Report — Contract Overview

### Executive Summary
This report renders per-minute read/write performance metrics grouped by job. Data is sourced exclusively from `app_metrics_jobs_minute`. The reporting period (`date_from`, `date_to`) is supplied as user parameters; `generated_at` is injected at runtime.

### Token Inventory
| Token | Type | Source |
|---|---|---|
| date_from | scalar | PARAM:date_from |
| date_to | scalar | PARAM:date_to |
| generated_at | scalar | PARAM:generated_at (runtime inject) |
| row_job_id | row | app_metrics_jobs_minute.job_id |
| row_minute_utc | row | app_metrics_jobs_minute.minute_utc |
| row_reads | row | app_metrics_jobs_minute.reads |
| row_read_err | row | app_metrics_jobs_minute.read_err |
| row_writes | row | app_metrics_jobs_minute.writes |
| row_write_err | row | app_metrics_jobs_minute.write_err |
| row_read_p50 | row | app_metrics_jobs_minute.read_p50 |
| row_read_p95 | row | app_metrics_jobs_minute.read_p95 |
| row_write_p50 | row | app_metrics_jobs_minute.write_p50 |
| row_write_p95 | row | app_metrics_jobs_minute.write_p95 |

### Join & Date Rules
- Single table: `app_metrics_jobs_minute` (self-join)
- Date filter: `minute_utc` column filtered between `date_from` and `date_to`
- Ordering: `job_id ASC`, `minute_utc ASC`

### Transformations
- No reshaping required; all columns map directly from a single table
- `generated_at` injected as runtime scalar (current UTC timestamp)
- `row_minute_utc` formatted as ISO datetime string

### Parameters
- `date_from` — start of reporting window (inclusive)
- `date_to` — end of reporting window (inclusive)
- `generated_at` — runtime-injected report generation timestamp