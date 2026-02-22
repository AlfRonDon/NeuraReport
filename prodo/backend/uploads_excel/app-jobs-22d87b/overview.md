# Jobs Report — DataFrame Pipeline Mapping

## Executive Summary
This report displays all jobs in the system with their configuration details: name, type, status, enabled state, polling interval, and CPU budget allocation.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 6 tokens (job_name, type, status, enabled, interval_ms, cpu_budget)
- **Totals**: None

## Mapping Table
| Token | Source Column | Type |
|-------|---------------|------|
| row_job_name | app_jobs.name | Direct |
| row_type | app_jobs.type | Direct |
| row_status | app_jobs.status | Direct |
| row_enabled | app_jobs.enabled | Direct |
| row_interval_ms | app_jobs.interval_ms | Direct |
| row_cpu_budget | app_jobs.cpu_budget | Direct |

## Join & Date Rules
- **Primary Table**: app_jobs
- **Primary Key**: app_jobs.id
- **No Child Table**: Self-join on app_jobs.id
- **Date Columns**: None specified

## Transformations
- No reshape, MELT, or UNION_ALL operations required
- No computed columns
- No totals calculations

## Parameters
- **Required**: None
- **Optional**: None

All data is sourced directly from the app_jobs table with no filtering, grouping, or aggregation.