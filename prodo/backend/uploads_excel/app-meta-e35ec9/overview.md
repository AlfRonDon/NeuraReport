# Meta Report Mapping Contract

## Executive Summary
This report displays application metadata as a simple key-value table. It reads directly from the `app_meta` table with no aggregation, filtering, or computation.

## Token Inventory
- **Row Tokens**: 2 (row_key, row_value)
- **Scalar Tokens**: 0
- **Totals Tokens**: 0

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| row_key | app_meta.key | Direct |
| row_value | app_meta.value | Direct |

## Join & Date Rules
- **Primary Table**: app_meta
- **Join Strategy**: Single table, no joins required
- **Date Columns**: None
- **Filters**: None

## Transformations
- No reshape operations required
- No computed columns
- No aggregations

## Parameters
- **Required**: None
- **Optional**: None

This is a straightforward metadata dump report with direct column mapping.