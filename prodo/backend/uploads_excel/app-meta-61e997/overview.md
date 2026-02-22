# Metadata Report — Contract Overview

## Executive Summary
This report displays application metadata as a simple two-column table showing key-value pairs from the `app_meta` table. No parameters, no filters, no aggregations — just a direct listing of all metadata entries.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 2 (row_key, row_value)
- **Totals**: None

## Mapping Table
| Token       | Source Column   | Type   |
|-------------|-----------------|--------|
| row_key     | app_meta.key    | Direct |
| row_value   | app_meta.value  | Direct |

## Join & Date Rules
- **Parent Table**: app_meta (self-join, no relationships needed)
- **Parent Key**: key
- **Child Table**: app_meta
- **Child Key**: key
- **Date Columns**: None
- **Filters**: None

## Transformations
- No reshaping required — single table, direct column mapping
- No computed columns
- No aggregations

## Parameters
- **Required**: None
- **Optional**: None

## Ordering
- Default ordering by ROWID (insertion order)