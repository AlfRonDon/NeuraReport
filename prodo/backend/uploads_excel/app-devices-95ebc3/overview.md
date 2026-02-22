# Devices Report — Mapping Contract

## Executive Summary
This report displays a single table listing all device records from `app_devices`. Each row shows device configuration details including connection protocol, status, network parameters, and associated gateway.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 9 (id, name, protocol, status, latency_ms, auto_reconnect, unit_id, port, gateway_id)
- **Totals**: None

## Mapping Table
| Token | Source Column | Type |
|-------|---------------|------|
| row_id | app_devices.id | direct |
| row_name | app_devices.name | direct |
| row_protocol | app_devices.protocol | direct |
| row_status | app_devices.status | direct |
| row_latency_ms | app_devices.latency_ms | direct |
| row_auto_reconnect | app_devices.auto_reconnect | direct |
| row_unit_id | app_devices.unit_id | direct |
| row_port | app_devices.port | direct |
| row_gateway_id | app_devices.gateway_id | direct |

## Join & Date Rules
- **Parent Table**: app_devices
- **Parent Key**: id
- **Child Table**: app_devices (single-table report)
- **Child Key**: id
- **Date Columns**: None (no date filtering required)

## Transformations
- **Reshape**: None (direct column mapping)
- **Computed Columns**: None
- **Aggregations**: None

## Parameters
- **Required**: None
- **Optional**: None

All tokens map directly to `app_devices` columns with no filtering, reshaping, or computation.