# Jobs Report — Mapping Contract Overview

## Executive Summary
This report displays all job records from the `app_jobs` table. Each row presents a complete job configuration including metadata, scheduling, status, and operational parameters. No filters, parameters, aggregations, or transformations are required.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 12 (direct column mappings)
- **Totals**: None

## Mapping Table

| Token | Source Column | Type |
|-------|---------------|------|
| row_id | app_jobs.id | TEXT |
| row_name | app_jobs.name | TEXT |
| row_type | app_jobs.type | TEXT |
| row_tables_json | app_jobs.tables_json | TEXT |
| row_columns_json | app_jobs.columns_json | TEXT |
| row_interval_ms | app_jobs.interval_ms | INTEGER |
| row_enabled | app_jobs.enabled | INTEGER |
| row_status | app_jobs.status | TEXT |
| row_batching_json | app_jobs.batching_json | TEXT |
| row_cpu_budget | app_jobs.cpu_budget | TEXT |
| row_triggers_json | app_jobs.triggers_json | TEXT |
| row_metrics_json | app_jobs.metrics_json | TEXT |

## Join & Date Rules
- **Join**: Self-join on app_jobs (no child table)
- **Date Columns**: None (app_jobs has no date/timestamp columns)

## Transformations
- **Reshape**: None
- **Computed Columns**: None
- **Totals**: None

## Parameters
No parameters required. This is a full table dump report.