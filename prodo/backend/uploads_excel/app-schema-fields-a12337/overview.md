# Schema Fields Report — Mapping Contract

## Executive Summary
This report displays a table of schema field definitions from the `app_schema_fields` catalog table. Each row represents a single field with its properties: schema ID, key, type, unit, scale, and description.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 6 (row_schema_id, row_key, row_type, row_unit, row_scale, row_description)
- **Totals**: None

## Mapping Table
| Token | Source |
|-------|--------|
| row_schema_id | app_schema_fields.schema_id |
| row_key | app_schema_fields.key |
| row_type | app_schema_fields.type |
| row_unit | app_schema_fields.unit |
| row_scale | app_schema_fields.scale |
| row_description | app_schema_fields.desc_text |

## Join & Date Rules
- **Parent Table**: app_schema_fields
- **Parent Key**: schema_id (primary identifier)
- **Child Table**: app_schema_fields (no join required)
- **Child Key**: schema_id
- **Date Columns**: None

## Transformations
No reshape or pivot operations required. Direct one-to-one column mapping from catalog.

## Parameters
No parameters required. This is a straightforward schema field listing with no filters.

## Row Ordering
Rows are ordered by default insertion order (ROWID).