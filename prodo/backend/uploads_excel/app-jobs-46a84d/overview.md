# Jobs Report Mapping Contract

## Executive Summary
This report displays a simple table listing all jobs from the `app_jobs` table. Each row represents one job record with seven attributes: ID, name, type, interval, enabled status, current status, and CPU budget allocation.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 7 (row_id, row_name, row_type, row_interval_ms, row_enabled, row_status, row_cpu_budget)
- **Totals**: None

## Mapping Table
| Token | Source Column | Notes |
|-------|--------------|-------|
| row_id | app_jobs.id | Job primary key |
| row_name | app_jobs.name | Job name |
| row_type | app_jobs.type | Job type |
| row_interval_ms | app_jobs.interval_ms | Execution interval in milliseconds |
| row_enabled | app_jobs.enabled | Whether job is enabled |
| row_status | app_jobs.status | Current job status |
| row_cpu_budget | app_jobs.cpu_budget | CPU budget allocation |

## Join & Date Rules
- **Parent Table**: app_jobs (primary data source)
- **Join Strategy**: Single table, no child join required
- **Date Columns**: None identified
- **Row Ordering**: ROWID (insertion order)

## Transformations
No transformations required. Direct column mapping from app_jobs table.

## Parameters
No parameters required. This report displays all jobs without filtering.