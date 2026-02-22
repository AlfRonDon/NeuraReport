# Jobs Report — Mapping Overview

## Executive Summary
This report displays all job records from the `app_jobs` table in a simple tabular format. Each row shows a job's configuration, runtime state, and timestamps. No aggregations, no parameters, no filters — a straightforward full-table dump.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 13 (id, name, device_table_id, schema_id, gateway_id, interval_sec, protocol, enabled, status, last_run_at, error_count, created_at, updated_at)
- **Totals**: None

## Mapping Table
| Token | Source Column | Notes |
|-------|---------------|-------|
| row_id | app_jobs.id | Primary key |
| row_name | app_jobs.name | Job display name |
| row_device_table_id | app_jobs.device_table_id | Direct reference |
| row_schema_id | app_jobs.schema_id | Direct reference |
| row_gateway_id | app_jobs.gateway_id | Direct reference |
| row_interval_sec | app_jobs.interval_sec | Direct reference |
| row_protocol | app_jobs.protocol | Direct reference |
| row_enabled | app_jobs.enabled | Boolean flag |
| row_status | app_jobs.status | Runtime state |
| row_last_run_at | app_jobs.last_run_at | Timestamp |
| row_error_count | app_jobs.error_count | Error counter |
| row_created_at | app_jobs.created_at | Timestamp |
| row_updated_at | app_jobs.updated_at | Timestamp |

## Join & Date Rules
- **Join**: Self-join on app_jobs (no child table)
- **Date Column**: None (no date filtering needed for this simple dump)
- **Filters**: None

## Transformations
None. All columns map 1:1 to `app_jobs` table columns.

## Parameters
None required or optional.

## Ordering
Rows ordered by `app_jobs.id ASC` (default primary key order).