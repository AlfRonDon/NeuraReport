## Data Collection Jobs Report — Contract Overview

### Executive Summary
This report lists all configured data collection jobs from the `app_jobs` table, displaying their name, type, status, enabled state, polling interval, and CPU budget. The reporting period is provided as user-supplied date parameters. The generated timestamp is injected at runtime by the server.

### Token Inventory
| Token | Kind | Source |
|---|---|---|
| date_from | Scalar | PARAM:date_from |
| date_to | Scalar | PARAM:date_to |
| generated_at | Scalar | PARAM:generated_at (server-injected) |
| row_name | Row | app_jobs.name |
| row_type | Row | app_jobs.type |
| row_status | Row | app_jobs.status |
| row_enabled | Row | app_jobs.enabled |
| row_interval_ms | Row | app_jobs.interval_ms |
| row_cpu_budget | Row | app_jobs.cpu_budget |

### Join & Data Rules
- Single table: `app_jobs`. No join required.
- No date filter applied to rows (jobs are configuration records, not time-series).
- `date_from` / `date_to` are display-only parameters shown in the report header.
- `generated_at` is injected by the server at report-generation time.

### Transformations
- No reshape required. Direct column projection from `app_jobs`.
- `row_enabled` (integer 0/1) rendered as-is; display formatting handled by template.

### Parameters
- **date_from** (required): Start of reporting period label.
- **date_to** (required): End of reporting period label.
- **generated_at** (required): Current timestamp, server-injected.