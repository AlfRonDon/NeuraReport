# Device Tables Report — Mapping Contract Overview

## Executive Summary
This report lists all device tables tracked in the system, showing each table's name, associated device ID, schema ID, database target ID, migration status, mapping health, and the timestamp of the last migration. It is a straightforward single-table report from `app_device_tables` with date-range parameters supplied by the user.

## Token Inventory
| Token | Kind | Source |
|---|---|---|
| `date_from` | Scalar | PARAM:date_from (user-supplied) |
| `date_to` | Scalar | PARAM:date_to (user-supplied) |
| `generated_at` | Scalar | Runtime constant (report generation timestamp) |
| `row_name` | Row | app_device_tables.name |
| `row_device_id` | Row | app_device_tables.device_id |
| `row_schema_id` | Row | app_device_tables.schema_id |
| `row_db_target_id` | Row | app_device_tables.db_target_id |
| `row_status` | Row | app_device_tables.status |
| `row_mapping_health` | Row | app_device_tables.mapping_health |
| `row_last_migrated_at` | Row | app_device_tables.last_migrated_at |

## Join & Date Rules
- Single-table query on `app_device_tables`; no join required.
- `date_from` and `date_to` filter on `app_device_tables.last_migrated_at` as the date axis.
- `generated_at` is a runtime constant injected at report generation time.

## Transformations
- `row_last_migrated_at` is formatted as a human-readable datetime string.
- No reshape (MELT/UNION_ALL) required — flat single-table structure.

## Parameters
- `date_from` (required, date): Start of the reporting period.
- `date_to` (required, date): End of the reporting period.