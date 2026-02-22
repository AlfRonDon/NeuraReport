# Metrics Jobs Minute Report

## Executive Summary
This report displays per-minute performance metrics for monitored jobs, including read/write operations, error counts, and latency percentiles (P50, P95). All data is sourced from the `app_metrics_jobs_minute` table with no transformations or aggregations required.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 10 (job_id, minute_utc, reads, read_errors, writes, write_errors, read_p50, read_p95, write_p50, write_p95)
- **Totals**: None

## Mapping Table
| Token | Source Column | Type |
|-------|---------------|------|
| row_job_id | app_metrics_jobs_minute.job_id | Direct |
| row_minute_utc | app_metrics_jobs_minute.minute_utc | Direct |
| row_reads | app_metrics_jobs_minute.reads | Direct |
| row_read_errors | app_metrics_jobs_minute.read_err | Direct |
| row_writes | app_metrics_jobs_minute.writes | Direct |
| row_write_errors | app_metrics_jobs_minute.write_err | Direct |
| row_read_p50 | app_metrics_jobs_minute.read_p50 | Direct |
| row_read_p95 | app_metrics_jobs_minute.read_p95 | Direct |
| row_write_p50 | app_metrics_jobs_minute.write_p50 | Direct |
| row_write_p95 | app_metrics_jobs_minute.write_p95 | Direct |

## Join & Date Rules
- **Parent Table**: app_metrics_jobs_minute
- **Child Table**: app_metrics_jobs_minute (self-join)
- **Join Keys**: job_id (parent) = job_id (child)
- **Date Column**: minute_utc (for temporal filtering)

## Transformations
No reshape, computed columns, or aggregations required. All tokens map directly to catalog columns.

## Parameters
No required or optional parameters. This report displays all available minute-level job metrics.