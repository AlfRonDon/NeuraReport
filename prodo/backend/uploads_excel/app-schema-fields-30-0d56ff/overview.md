# Schema Fields Report - Mapping Contract Overview

## Executive Summary
This report displays a comprehensive list of schema fields from the application's schema registry. Each row represents a single field definition with its metadata including schema identifier, field key, data type, measurement unit, scale factor, and descriptive text.

## Token Inventory

### Row Tokens (6)
- `row_schema_id` — Schema identifier
- `row_field_key` — Field key/name
- `row_field_type` — Data type of the field
- `row_unit` — Unit of measurement
- `row_scale` — Scale factor
- `row_description` — Field description text

### Scalar Tokens (0)
No header-level tokens present.

### Totals Tokens (0)
No aggregate totals required.

## Mapping Table

| Token | Source Column | Type |
|-------|--------------|------|
| row_schema_id | app_schema_fields.schema_id | Direct |
| row_field_key | app_schema_fields.key | Direct |
| row_field_type | app_schema_fields.type | Direct |
| row_unit | app_schema_fields.unit | Direct |
| row_scale | app_schema_fields.scale | Direct |
| row_description | app_schema_fields.desc_text | Direct |

## Join & Date Rules

**Primary Table:** `app_schema_fields`  
**Join Strategy:** Single-table query (self-join)  
**Date Columns:** None  
**Filters:** None required  

## Transformations

No reshaping, pivoting, or computed columns required. All tokens map directly to source columns.

## Parameters

No required or optional parameters. This report displays all schema fields without filtering.