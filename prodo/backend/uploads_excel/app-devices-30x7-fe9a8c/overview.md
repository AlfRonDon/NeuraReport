# Devices Report — Contract Overview

## Executive Summary

This report displays a simple tabular list of all devices from the `app_devices` table. Each row shows key device attributes including name, protocol, connection status, port number, latency, auto-reconnect setting, and last error message.

- **Data Source**: Single table `app_devices`
- **Row Logic**: One row per device record
- **Filtering**: None (all devices included)
- **Transformations**: None (direct column mapping)
- **Aggregations**: None

---

## Token Inventory

### Scalars (Header Tokens)
_None_

### Row Tokens
- `row_device_name` — Device name
- `row_protocol` — Communication protocol (e.g., Modbus, MQTT)
- `row_status` — Current connection status
- `row_port` — Port number
- `row_latency_ms` — Latency in milliseconds
- `row_auto_reconnect` — Auto-reconnect flag
- `row_last_error` — Last error message

### Totals Tokens
_None_

---

## Mapping Table

| Token | Source | Type |
|-------|--------|------|
| `row_device_name` | `app_devices.name` | Direct |
| `row_protocol` | `app_devices.protocol` | Direct |
| `row_status` | `app_devices.status` | Direct |
| `row_port` | `app_devices.port` | Direct |
| `row_latency_ms` | `app_devices.latency_ms` | Direct |
| `row_auto_reconnect` | `app_devices.auto_reconnect` | Direct |
| `row_last_error` | `app_devices.last_error` | Direct |

---

## Join & Date Rules

- **Join**: Self-join on `app_devices` (no child table)
- **Parent**: `app_devices.id`
- **Child**: `app_devices.id`
- **Date Filtering**: None
- **Row Ordering**: Default row insertion order (`ROWID`)

---

## Transformations

_No reshape, unpivot, or computed columns required. All tokens map directly to source columns._

---

## Parameters

_No user parameters required._