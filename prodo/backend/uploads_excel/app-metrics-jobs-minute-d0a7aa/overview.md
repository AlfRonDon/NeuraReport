# Job Metrics Report — Contract Overview

## Executive Summary
This report displays per-minute operational metrics for jobs tracked in the `app_metrics_jobs_minute` table. Each row presents read/write volumes, error counts, latency percentiles (P50, P95), and trigger statistics for a specific job at a given UTC minute. The report has no scalar header parameters and no totals — it is a straightforward tabular extraction suitable for operational dashboards.

## Token Inventory
- **Scalars**: 0
- **Row Tokens**: 13
- **Totals**: 0

## Mapping Table

| Token               | Source Column                          | Type    |
|---------------------|----------------------------------------|---------|
| row_job_id          | app_metrics_jobs_minute.job_id         | string  |
| row_minute_utc      | app_metrics_jobs_minute.minute_utc     | string  |
| row_reads           | app_metrics_jobs_minute.reads          | integer |
| row_read_err        | app_metrics_jobs_minute.read_err       | integer |
| row_writes          | app_metrics_jobs_minute.writes         | integer |
| row_write_err       | app_metrics_jobs_minute.write_err      | integer |
| row_read_p50        | app_metrics_jobs_minute.read_p50       | number  |
| row_read_p95        | app_metrics_jobs_minute.read_p95       | number  |
| row_write_p50       | app_metrics_jobs_minute.write_p50      | number  |
| row_write_p95       | app_metrics_jobs_minute.write_p95      | number  |
| row_triggers        | app_metrics_jobs_minute.triggers       | integer |
| row_fires           | app_metrics_jobs_minute.fires          | integer |
| row_suppressed      | app_metrics_jobs_minute.suppressed     | integer |

## Join & Date Rules
- **Parent Table**: `app_metrics_jobs_minute`
- **Parent Key**: `minute_utc`
- **Child Table**: `app_metrics_jobs_minute` (self-join, no foreign table)
- **Child Key**: `minute_utc`
- **Date Column**: `app_metrics_jobs_minute.minute_utc`
- **Order By**: `minute_utc DESC` (most recent first)

## Transformations
No MELT or UNION_ALL reshaping required. Direct 1:1 column mapping from `app_metrics_jobs_minute`.

## Parameters
None required or optional. Report returns all rows from the metrics table.