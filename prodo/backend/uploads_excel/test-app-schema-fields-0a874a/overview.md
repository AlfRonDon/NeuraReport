# Schema Fields Report — Mapping Overview

## Executive Summary
This report displays a comprehensive inventory of all fields defined in application schemas. Each row represents a single schema field with its identifier, key name, data type, unit of measurement, scaling factor, and descriptive text. The report pulls directly from the `app_schema_fields` table with a straightforward one-to-one mapping — no aggregations, no parameters, no joins required.

## Token Inventory

### Row Tokens (6)
- `row_schema_id` — Schema identifier
- `row_key` — Field key name
- `row_type` — Data type (REAL, float, boolean, etc.)
- `row_unit` — Measurement unit (V, A, °C, %, etc.)
- `row_scale` — Scaling factor
- `row_desc_text` — Field description text

### Scalar Tokens (0)
None.

### Totals Tokens (0)
None.

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

**Join Strategy**: Single-table report (self-join)  
- Parent table: `app_schema_fields`  
- Parent key: `schema_id`  
- Child table: `app_schema_fields` (same)  
- Child key: `schema_id`

**Date Columns**: None (no date filtering required)

**Ordering**: Default row order by `ROWID` (insertion order)

## Transformations

None. All tokens map directly to source columns with no computed fields, reshapes, or aggregations.

## Parameters

**Required**: None  
**Optional**: None  

This report accepts no user-supplied parameters and displays all schema fields unconditionally.