# Database Targets Report — Contract Overview

## Executive Summary
This report lists all database target configurations from the `app_db_targets` table. It is a simple single-table listing with no joins, no aggregations, and no totals. Three scalar tokens represent the reporting period and generation timestamp; five row tokens map directly to columns in `app_db_targets`.

## Token Inventory
| Token | Kind | Source |
|---|---|---|
| date_from | Scalar | PARAM:date_from (user-supplied) |
| date_to | Scalar | PARAM:date_to (user-supplied) |
| generated_at | Scalar | PARAM:generated_at (runtime injection) |
| row_id | Row | app_db_targets.id |
| row_provider | Row | app_db_targets.provider |
| row_conn | Row | app_db_targets.conn |
| row_status | Row | app_db_targets.status |
| row_last_msg | Row | app_db_targets.last_msg |

## Mapping Table
| Token | Mapping | Notes |
|---|---|---|
| date_from | PARAM:date_from | User-selected reporting period start |
| date_to | PARAM:date_to | User-selected reporting period end |
| generated_at | PARAM:generated_at | System-injected current timestamp |
| row_id | app_db_targets.id | Unique target identifier |
| row_provider | app_db_targets.provider | Database provider (e.g. postgresql) |
| row_conn | app_db_targets.conn | Connection string |
| row_status | app_db_targets.status | Current connection status |
| row_last_msg | app_db_targets.last_msg | Last status/error message |

## Join & Date Rules
- Single table: `app_db_targets`. No join needed.
- No date-based filtering on the table itself (date_from/date_to are display-only scalars representing the reporting period chosen by the user).
- Default ordering: by `app_db_targets.id ASC`.

## Transformations
- No reshape required. Data is sourced directly from a single flat table.
- No computed columns needed.
- No totals or aggregations.

## Parameters
- `date_from` (required, date): Start of the reporting period — display only.
- `date_to` (required, date): End of the reporting period — display only.
- `generated_at` (required, string): Current timestamp injected at report generation time.