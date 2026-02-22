# Gateway Configuration Report — Mapping Overview

## Executive Summary
This report displays a comprehensive view of all gateway configurations from the `app_gateways` table. It presents 14 attributes per gateway including identification, network configuration, protocol details, status information, and timestamp metadata.

## Token Inventory
- **Scalars**: 0 tokens (no header-level fields)
- **Row Tokens**: 14 tokens (direct column mappings from `app_gateways`)
- **Totals**: 0 tokens (no aggregate calculations)

## Mapping Table

| Token | Source Column | Type | Notes |
|-------|---------------|------|-------|
| `row_id` | `app_gateways.id` | TEXT | Gateway unique identifier |
| `row_name` | `app_gateways.name` | TEXT | Gateway name |
| `row_host` | `app_gateways.host` | TEXT | Host address (e.g., `opc.tcp://...`) |
| `row_adapter_id` | `app_gateways.adapter_id` | TEXT | Adapter identifier (often empty) |
| `row_nic_hint` | `app_gateways.nic_hint` | TEXT | Network interface hint (often empty) |
| `row_ports_json` | `app_gateways.ports_json` | TEXT | Ports JSON array |
| `row_protocol_hint` | `app_gateways.protocol_hint` | TEXT | Protocol hint (e.g., `opcua`) |
| `row_tags_json` | `app_gateways.tags_json` | TEXT | Tags JSON array |
| `row_status` | `app_gateways.status` | TEXT | Gateway status (e.g., `unknown`) |
| `row_last_ping_json` | `app_gateways.last_ping_json` | TEXT | Last ping result JSON |
| `row_last_tcp_json` | `app_gateways.last_tcp_json` | TEXT | Last TCP test result JSON |
| `row_created_at` | `app_gateways.created_at` | TEXT | Creation timestamp (ISO 8601) |
| `row_updated_at` | `app_gateways.updated_at` | TEXT | Last update timestamp (ISO 8601) |
| `row_last_test_at` | `app_gateways.last_test_at` | TEXT | Last test timestamp |

## Join & Date Rules
- **Join**: Self-join on `app_gateways` (no parent-child relationship required)
- **Parent Table**: `app_gateways`
- **Parent Key**: `id`
- **Child Table**: `app_gateways`
- **Child Key**: `id`
- **Date Columns**: `app_gateways.created_at` — used for time-range filtering when date parameters are provided

## Transformations
- **No Reshape**: All columns are direct mappings from `app_gateways` — no MELT or UNION_ALL operations required.
- **No Computed Columns**: All row tokens map directly to database columns without derivation.
- **No Aggregations**: No totals or summary calculations.

## Parameters
- **No Required Parameters**: This report does not mandate any user-supplied filters.
- **Optional Filters**: Standard date-range filtering can be applied via `created_at` column.