# Schemas Report – Mapping Overview

## Executive Summary
This report lists all schemas defined in the system. It displays a simple two-column table with schema ID and schema name, with no filters, parameters, grouping, or aggregations.

## Token Inventory
- **Scalars (Header)**: None
- **Row Tokens**: 2
- **Totals**: None

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| `row_schema_id` | `app_schemas.id` | Direct column |
| `row_schema_name` | `app_schemas.name` | Direct column |

## Join & Date Rules
- **Primary Table**: `app_schemas`
- **Join Strategy**: Single-table query (parent = child)
- **Primary Key**: `id`
- **Date Filtering**: Not applicable (no date columns)

## Transformations
- No reshape, MELT, or UNION_ALL operations required.
- No computed columns or aggregations.

## Parameters
- **Required**: None
- **Optional**: None

This is a straightforward read-all query from the `app_schemas` table with default ordering by `ROWID`.