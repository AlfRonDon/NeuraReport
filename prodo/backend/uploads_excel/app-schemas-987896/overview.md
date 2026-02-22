# Schemas Report — Mapping Contract Overview

## Executive Summary
This report produces a simple two-column list of all schemas defined in the system. Each row displays the schema's unique identifier and its human-readable name. No filtering, aggregation, or transformations are required.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 2 (`row_id`, `row_name`)
- **Totals**: None

## Mapping Table
| Token | Source |
|-------|--------|
| row_id | app_schemas.id |
| row_name | app_schemas.name |

## Join & Date Rules
- **Primary Table**: `app_schemas`
- **Join**: Single-table report (self-join on `id`)
- **Date Columns**: None
- **Filters**: None required

## Transformations
- **Reshape**: None — direct column mapping
- **Computed Columns**: None
- **Totals**: None

## Parameters
- **Required**: None
- **Optional**: None

This is a straightforward catalog-style report with no business logic, sorting alphabetically by schema name.