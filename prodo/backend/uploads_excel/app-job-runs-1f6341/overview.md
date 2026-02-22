# Job Runs Report — Contract Overview

## Executive Summary
This report displays detailed execution metrics for job runs, sourced directly from the `app_job_runs` table. Each row represents a single job execution with timing, performance, and error statistics.

## Token Inventory
- **Scalars**: 0 (no header-level tokens)
- **Row Tokens**: 9 (one per job run record)
- **Totals**: 0 (no aggregate summaries)

## Mapping Table
| Token | Source Column | Type |
|-------|--------------|------|
| `row_id` | `app_job_runs.id` | Direct |
| `row_job_id` | `app_job_runs.job_id` | Direct |
| `row_started_at` | `app_job_runs.started_at` | Direct |
| `row_stopped_at` | `app_job_runs.stopped_at` | Direct |
| `row_duration_ms` | `app_job_runs.duration_ms` | Direct |
| `row_rows` | `app_job_runs.rows` | Direct |
| `row_read_lat_avg` | `app_job_runs.read_lat_avg` | Direct |
| `row_write_lat_avg` | `app_job_runs.write_lat_avg` | Direct |
| `row_error_pct` | `app_job_runs.error_pct` | Direct |

## Join & Date Rules
- **Primary Table**: `app_job_runs` (self-join, no foreign keys required)
- **Date Column**: `started_at` (natural ordering by execution start time)
- **Ordering**: `started_at DESC` (most recent runs first)

## Transformations
- **Reshape**: None required (flat table structure)
- **Computed Columns**: None (all metrics pre-calculated)
- **Aggregations**: None (detail-level report)

## Parameters
- **Required**: None
- **Optional**: Job ID filter (future enhancement)

## Notes
This is a straightforward detail report with no computed fields or reshaping. All metrics are sourced directly from the job runs table.