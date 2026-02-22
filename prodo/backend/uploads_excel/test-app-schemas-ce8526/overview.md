# Schemas Report — Mapping Overview

## Executive Summary
This report lists all schemas registered in the system. Each row displays a schema's unique identifier and name. No aggregations, filters, or transformations are required.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: `row_id`, `row_name`
- **Totals**: None

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| row_id | app_schemas.id | Direct |
| row_name | app_schemas.name | Direct |

## Join & Date Rules
- **Parent Table**: app_schemas
- **Join Strategy**: Single-table report (no joins required)
- **Date Filtering**: None — app_schemas has no date columns
- **Ordering**: Natural order (ROWID)

## Transformations
None required. Direct column-to-token mapping.

## Parameters
None required. This is an unrestricted listing of all schemas.