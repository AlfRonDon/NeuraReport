# Jobs Report — Mapping Overview

## Executive Summary
This report displays all scheduled jobs in the system, showing their name, type, status, enablement state, polling interval, and CPU budget allocation. The report is a straightforward table with no filters, computations, or totals.

## Token Inventory
- **Scalars**: 0 tokens
- **Row Tokens**: 6 tokens (job_name, type, status, enabled, interval_ms, cpu_budget)
- **Totals**: 0 tokens

## Mapping Table
| Token              | Source Column           | Notes                          |
|--------------------|-------------------------|--------------------------------|
| row_job_name       | app_jobs.name           | Job identifier                 |
| row_type           | app_jobs.type           | Job type classification        |
| row_status         | app_jobs.status         | Current job status             |
| row_enabled        | app_jobs.enabled        | Boolean enablement flag        |
| row_interval_ms    | app_jobs.interval_ms    | Polling interval in milliseconds |
| row_cpu_budget     | app_jobs.cpu_budget     | CPU budget allocation          |

## Join & Date Rules
- **Parent Table**: app_jobs
- **Parent Key**: id
- **No Child Table**: Self-join (app_jobs.id = app_jobs.id)
- **No Date Filtering**: Report displays all jobs regardless of date

## Transformations
No reshape, MELT, or UNION_ALL operations required. Direct column mapping.

## Parameters
No user-supplied parameters required. All jobs are displayed.

## Ordering
Rows ordered by job ID (ROWID) in ascending order by default.