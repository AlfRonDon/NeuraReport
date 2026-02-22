# Devices Report — Mapping Overview

## Executive Summary
This report presents a comprehensive list of all devices registered in the system, including their connectivity details, status, and configuration parameters. It pulls data directly from the `app_devices` table without any joins, filtering, or aggregations.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 11 (id, name, protocol, status, latency_ms, auto_reconnect, unit_id, port, gateway_id, last_error, params_json)
- **Totals**: None

## Mapping Table
| Token | Source Column | Notes |
|-------|---------------|-------|
| row_id | app_devices.id | Device unique identifier |
| row_name | app_devices.name | Device name |
| row_protocol | app_devices.protocol | Communication protocol (modbus, opcua, etc.) |
| row_status | app_devices.status | Current device status |
| row_latency_ms | app_devices.latency_ms | Network latency in milliseconds |
| row_auto_reconnect | app_devices.auto_reconnect | Auto-reconnection flag (0/1) |
| row_unit_id | app_devices.unit_id | Modbus unit ID |
| row_port | app_devices.port | Network port number |
| row_gateway_id | app_devices.gateway_id | Associated gateway identifier |
| row_last_error | app_devices.last_error | Most recent error code |
| row_params_json | app_devices.params_json | JSON configuration parameters |

## Join & Date Rules
- **Join**: Self-join on app_devices (no relationships required)
- **Date Columns**: None (no date filtering needed)

## Transformations
- No reshape, computed columns, or aggregations required
- Direct column mapping from app_devices table

## Parameters
- No required or optional parameters
- No user-supplied filters