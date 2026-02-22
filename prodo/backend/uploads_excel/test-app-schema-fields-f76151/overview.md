# Schema Fields Report — Contract Overview

## Executive Summary
This report lists all schema field definitions from the `app_schema_fields` table. It presents a straightforward catalog of field keys, data types, units, scale factors, and descriptions for a given schema. No parameters, filters, aggregations, or transformations are required.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 6 (schema_id, key, type, unit, scale, desc_text)
- **Totals**: None

## Mapping Table
| Token | Source Column | Type |
|-------|---------------|------|
| row_schema_id | app_schema_fields.schema_id | Direct |
| row_key | app_schema_fields.key | Direct |
| row_type | app_schema_fields.type | Direct |
| row_unit | app_schema_fields.unit | Direct |
| row_scale | app_schema_fields.scale | Direct |
| row_desc_text | app_schema_fields.desc_text | Direct |

## Join & Date Rules
- **Join**: Single table (`app_schema_fields`), self-referencing via `schema_id`.
- **Date Columns**: None. The `app_schema_fields` table contains no date/timestamp columns, so `date_columns` is set to `{}`.
- **Filters**: None required.

## Transformations
- **Reshape**: None. Single table, no pivoting or unpivoting needed.
- **Computed Columns**: None.
- **Totals**: None.

## Parameters
- **Required**: None.
- **Optional**: None.

## Notes
This is a simple schema metadata catalog report. All six row tokens map directly to columns in `app_schema_fields`. The report will render all fields for all schemas in the database (unless filtered externally).