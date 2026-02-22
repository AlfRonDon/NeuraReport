# Metrics Jobs Minute Report — Contract Overview

## Executive Summary
This report displays per-minute performance and operational metrics for monitored jobs. It presents a single table with 13 columns tracking read/write operations, latency percentiles, and trigger activity. No aggregations or computed columns are required; all values are direct column mappings.

## Token Inventory
- **Scalars:** 0
- **Row Tokens:** 13
- **Totals:** 0

## Mapping Table
| Token | Source Column | Type |
|-------|--------------|------|
| `row_job_id` | `app_metrics_jobs_minute.job_id` | TEXT |
| `row_minute_utc` | `app_metrics_jobs_minute.minute_utc` | TEXT |
| `row_reads` | `app_metrics_jobs_minute.reads` | TEXT |
| `row_read_err` | `app_metrics_jobs_minute.read_err` | TEXT |
| `row_writes` | `app_metrics_jobs_minute.writes` | TEXT |
| `row_write_err` | `app_metrics_jobs_minute.write_err` | TEXT |
| `row_read_p50` | `app_metrics_jobs_minute.read_p50` | TEXT |
| `row_read_p95` | `app_metrics_jobs_minute.read_p95` | TEXT |
| `row_write_p50` | `app_metrics_jobs_minute.write_p50` | TEXT |
| `row_write_p95` | `app_metrics_jobs_minute.write_p95` | TEXT |
| `row_triggers` | `app_metrics_jobs_minute.triggers` | TEXT |
| `row_fires` | `app_metrics_jobs_minute.fires` | TEXT |
| `row_suppressed` | `app_metrics_jobs_minute.suppressed` | TEXT |

## Join & Date Rules
- **Join:** Self-join on `app_metrics_jobs_minute` (single-table report)
- **Date Column:** `app_metrics_jobs_minute.minute_utc` — time-range filtering enabled
- **Ordering:** Default row ID order (no explicit sort)

## Transformations
No reshape, computed columns, or aggregations required. This is a direct column-to-token mapping.

## Parameters
No required or optional parameters. All data flows directly from `app_metrics_jobs_minute` table.