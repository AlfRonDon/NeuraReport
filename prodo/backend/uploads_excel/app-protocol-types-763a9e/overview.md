# Protocol Types Report Contract

## Executive Summary
This report lists all available protocol types from the `app_protocol_types` table. It is a simple enumeration report with a single row-repeating token.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: `row_protocol_type`
- **Totals**: None

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| `row_protocol_type` | `app_protocol_types.type` | Direct Column |

## Join & Date Rules
- **Parent Table**: `app_protocol_types`
- **Parent Key**: `type`
- **Child Table**: `app_protocol_types` (self-join)
- **Child Key**: `type`
- **Date Columns**: None

## Transformations
No reshape or computed columns required. Direct column mapping only.

## Parameters
No parameters required or optional for this report.