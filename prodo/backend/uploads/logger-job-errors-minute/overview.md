## Job Errors Report — Mapping Contract

### Executive Summary
This report presents per-minute error aggregations grouped by job, sourced entirely from the `app_job_errors_minute` table. Each row represents a unique combination of job ID, error code, and UTC minute bucket. The reporting period bounds (`date_from`, `date_to`) are user-supplied parameters; `generated_at` is a runtime timestamp injected at generation time.

### Token Inventory
| Token | Kind | Source |
|---|---|---|
| `date_from` | Scalar | PARAM:date_from |
| `date_to` | Scalar | PARAM:date_to |
| `generated_at` | Scalar | PARAM:generated_at |
| `row_job_id` | Row | app_job_errors_minute.job_id |
| `row_code` | Row | app_job_errors_minute.code |
| `row_minute_utc` | Row | app_job_errors_minute.minute_utc |
| `row_count` | Row | app_job_errors_minute.count |
| `row_last_message` | Row | app_job_errors_minute.last_message |

### Mapping Table
| Token | Mapped Value | Notes |
|---|---|---|
| date_from | PARAM:date_from | User-selected reporting start |
| date_to | PARAM:date_to | User-selected reporting end |
| generated_at | PARAM:generated_at | Injected at generation time |
| row_job_id | app_job_errors_minute.job_id | Job identifier |
| row_code | app_job_errors_minute.code | Error code |
| row_minute_utc | app_job_errors_minute.minute_utc | UTC minute bucket |
| row_count | app_job_errors_minute.count | Errors in that minute |
| row_last_message | app_job_errors_minute.last_message | Most recent error message |

### Join & Date Rules
Single-table report — no join required. Self-join pattern used (parent = child = `app_job_errors_minute`). Date filtering applies `minute_utc` between `date_from` and `date_to`.

### Transformations
No reshape required. Data is already in the correct granularity (one row per job/code/minute). No computed columns needed.

### Parameters
- `date_from` (required, date): Start of reporting period (inclusive)
- `date_to` (required, date): End of reporting period (inclusive)
- `generated_at` (required, string): Report generation timestamp, injected by the system