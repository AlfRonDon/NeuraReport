# Schemas Report — Contract Overview

## Executive Summary
This report generates a simple tabular listing of all application schemas. It displays two columns per schema: the unique schema identifier and the schema name. No filtering, aggregation, or transformations are required.

## Token Inventory
- **Scalar Tokens**: None
- **Row Tokens**: 2 (`row_schema_id`, `row_schema_name`)
- **Totals Tokens**: None

## Mapping Table

| Token | Source | Type |
|-------|--------|------|
| `row_schema_id` | `app_schemas.id` | Direct Column |
| `row_schema_name` | `app_schemas.name` | Direct Column |

## Join & Date Rules
- **Primary Table**: `app_schemas`
- **Join Strategy**: Single-table query (no child table)
- **Date Filtering**: None required
- **Ordering**: Natural row order (`ROWID ASC`)

## Transformations
- **Reshape**: None — direct column-to-token mapping
- **Computed Columns**: None
- **Aggregations**: None

## Parameters
- **Required**: None
- **Optional**: None

This is a straightforward read-all query against the `app_schemas` table with no user input required.