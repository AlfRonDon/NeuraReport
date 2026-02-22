# Protocol Types Report — Mapping Contract Overview

## Executive Summary
This report lists all protocol types available in the system. The report is sourced from a single table (`app_protocol_types`) with no joins, parameters, or date filters. It is a simple enumeration of protocol type names.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: `row_protocol_type`
- **Totals**: None

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| `row_protocol_type` | `app_protocol_types.type` | Column |

## Join & Date Rules
- **Parent Table**: `app_protocol_types`
- **Parent Key**: `type`
- **Child Table**: `app_protocol_types`
- **Child Key**: `type`
- **Date Filtering**: Not applicable (no date columns)

## Transformations
- No reshaping required.
- No computed columns.
- No aggregations.

## Parameters
- **Required**: None
- **Optional**: None

This is a straightforward enumeration report with no complex logic.