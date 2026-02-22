# Devices Report Mapping Contract

## Executive Summary
This report displays a comprehensive list of all registered devices in the system, showing their communication protocol, connection status, performance metrics, and gateway associations.

## Token Inventory
- **Scalar Tokens**: None
- **Row Tokens**: 11 (id, name, protocol, params_json, status, latency_ms, last_error, auto_reconnect, unit_id, port, gateway_id)
- **Totals Tokens**: None

## Mapping Table
| Token | Source Column | Type |
|-------|---------------|------|
| row_id | app_devices.id | TEXT |
| row_name | app_devices.name | TEXT |
| row_protocol | app_devices.protocol | TEXT |
| row_params_json | app_devices.params_json | TEXT |
| row_status | app_devices.status | TEXT |
| row_latency_ms | app_devices.latency_ms | REAL |
| row_last_error | app_devices.last_error | TEXT |
| row_auto_reconnect | app_devices.auto_reconnect | INTEGER |
| row_unit_id | app_devices.unit_id | REAL |
| row_port | app_devices.port | INTEGER |
| row_gateway_id | app_devices.gateway_id | TEXT |

## Join & Date Rules
- **Primary Table**: app_devices
- **Join Strategy**: Single table query (no joins required)
- **Date Columns**: None (app_devices has no date/timestamp columns)
- **Ordering**: ROWID (natural insertion order)

## Transformations
- No reshape operations required
- No computed columns
- No aggregations

## Parameters
- None required (no key_tokens specified)
- No optional filters defined