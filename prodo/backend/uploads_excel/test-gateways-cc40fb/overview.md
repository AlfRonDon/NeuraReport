# App Gateways Report - Mapping Contract

## Executive Summary
This report lists all application gateways with their configuration details, connection status, and timestamps. It provides a comprehensive inventory of gateway infrastructure including network endpoints, protocol hints, and operational status.

## Token Inventory
- **Scalar Tokens**: None (pure tabular report)
- **Row Tokens**: 10 tokens mapping to app_gateways table columns
- **Totals Tokens**: None

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| row_id | app_gateways.id | TEXT |
| row_name | app_gateways.name | TEXT |
| row_host | app_gateways.host | TEXT |
| row_adapter_id | app_gateways.adapter_id | TEXT |
| row_nic_hint | app_gateways.nic_hint | TEXT |
| row_protocol_hint | app_gateways.protocol_hint | TEXT |
| row_status | app_gateways.status | TEXT |
| row_created_at | app_gateways.created_at | TEXT |
| row_updated_at | app_gateways.updated_at | TEXT |
| row_last_test_at | app_gateways.last_test_at | TEXT |

## Join & Date Rules
- **Primary Table**: app_gateways
- **Join Strategy**: Single table (self-join on id)
- **Date Filtering**: Uses created_at column for time-range queries
- **Ordering**: Natural row order (ROWID)

## Transformations
No reshaping or complex transformations required. Direct column-to-token mapping from app_gateways table.

## Parameters
No required or optional parameters. Report displays all gateways without user-supplied filters.