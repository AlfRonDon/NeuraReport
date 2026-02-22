# Schema Fields Report — Contract Overview

## Executive Summary
This report lists all field definitions stored in `app_schema_fields`, one row per field. Each row shows the schema identifier, field key, data type, unit of measurement, scale factor, and human-readable description. The report header carries a user-supplied date range and a runtime-injected generation timestamp.

## Token Inventory
| Token | Kind | Source |
|---|---|---|
| date_from | Scalar | PARAM (user-supplied) |
| date_to | Scalar | PARAM (user-supplied) |
| generated_at | Scalar | Runtime injection (not in DB) |
| row_schema_id | Row | app_schema_fields.schema_id |
| row_key | Row | app_schema_fields.key |
| row_type | Row | app_schema_fields.type |
| row_unit | Row | app_schema_fields.unit |
| row_scale | Row | app_schema_fields.scale |
| row_desc_text | Row | app_schema_fields.desc_text |

## Mapping Table
| Token | Mapped To |
|---|---|
| date_from | PARAM:date_from |
| date_to | PARAM:date_to |
| generated_at | UNRESOLVED (runtime-injected by engine) |
| row_schema_id | app_schema_fields.schema_id |
| row_key | app_schema_fields.key |
| row_type | app_schema_fields.type |
| row_unit | app_schema_fields.unit |
| row_scale | app_schema_fields.scale |
| row_desc_text | app_schema_fields.desc_text |

## Join & Ordering
- Single table: `app_schema_fields` (no join needed; self-joined for contract compliance).
- Default ordering: `schema_id ASC`, `key ASC` for stable, alphabetical output.

## Transformations
- `row_scale`: format as number with 4 decimal places for display consistency.
- `generated_at`: injected at runtime by the report engine (current timestamp); not stored in DB.

## Parameters
- `date_from` / `date_to`: user-supplied date strings used for header display only (no row filtering against dates in this table).