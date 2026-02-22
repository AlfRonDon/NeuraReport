# Gateways Report — Mapping Overview

## Executive Summary
This report displays a simple tabular listing of all gateways in the system, showing their connection details, protocol information, and timestamps. No aggregations, no parameters, no filtering.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 6 (gateway_name, host, protocol_hint, status, created_at, updated_at)
- **Totals**: None

## Mapping Table

| Token | Source | Type |
|-------|--------|------|
| row_gateway_name | app_gateways.name | Direct |
| row_host | app_gateways.host | Direct |
| row_protocol_hint | app_gateways.protocol_hint | Direct |
| row_status | app_gateways.status | Direct |
| row_created_at | app_gateways.created_at | Direct |
| row_updated_at | app_gateways.updated_at | Direct |

## Join & Date Rules
- **Parent Table**: app_gateways (self-join, no child)
- **Parent Key**: id
- **Date Column**: app_gateways.created_at (used for ordering)
- **Row Ordering**: Default ROWID (insertion order)

## Transformations
None required. All tokens map directly to columns in the app_gateways table.

## Parameters
None required or optional.