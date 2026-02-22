# Gateways Report — Mapping Contract

## Executive Summary
This report displays all gateways from the `app_gateways` table with their connection details, status, and timestamps. No filtering, aggregation, or reshaping is required.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 6 (gateway_name, host, protocol_hint, status, created_at, updated_at)
- **Totals**: None

## Mapping Table
| Token | Source Column | Type |
|-------|--------------|------|
| row_gateway_name | app_gateways.name | Direct |
| row_host | app_gateways.host | Direct |
| row_protocol_hint | app_gateways.protocol_hint | Direct |
| row_status | app_gateways.status | Direct |
| row_created_at | app_gateways.created_at | Direct (Date) |
| row_updated_at | app_gateways.updated_at | Direct (Date) |

## Join & Date Rules
- **Primary Table**: app_gateways
- **Join Strategy**: Single table, no joins required
- **Date Columns**: created_at, updated_at (both in app_gateways)
- **Ordering**: Natural row order (ROWID)

## Transformations
None required. All tokens map directly to source columns.

## Parameters
None required. This report displays all gateway records without filtering.