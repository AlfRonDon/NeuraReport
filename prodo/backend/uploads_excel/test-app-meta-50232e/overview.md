# Meta Report — Mapping Contract Overview

## Executive Summary
This report displays a simple key-value metadata table from the `app_meta` table. It contains no scalars, no totals, and uses a single-table scan with no joins or aggregations. Each row represents one configuration entry.

## Token Inventory
| Token | Type | Source |
|-------|------|--------|
| `row_key` | row | `app_meta.key` |
| `row_value` | row | `app_meta.value` |

## Join & Date Rules
- **Parent table**: `app_meta` (self-join, no foreign key required)
- **Date filtering**: None — `app_meta` has no timestamp columns
- **Row ordering**: Natural insertion order (ROWID)

## Transformations
- **No reshape**: Direct passthrough of `app_meta` rows
- **No computations**: All columns are direct mappings

## Parameters
None required — this report accepts no user filters or parameters.