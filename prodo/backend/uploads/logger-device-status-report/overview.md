# Logger Device Status Report — Mapping Contract Overview

## Executive Summary
This report lists all IoT/PLC logger devices with their connectivity status, protocol, port, latency, auto-reconnect flag, and last error message. It is filtered by a user-supplied date range (`date_from` / `date_to`) and stamped with a runtime-generated timestamp (`generated_at`). All row data comes directly from the `app_devices` table with no joins or reshaping required.

## Token Inventory
| Token | Kind | Source |
|---|---|---|
| `date_from` | scalar | PARAM:date_from |
| `date_to` | scalar | PARAM:date_to |
| `generated_at` | scalar | UNRESOLVED (runtime inject) |
| `row_id` | row | app_devices.id |
| `row_name` | row | app_devices.name |
| `row_protocol` | row | app_devices.protocol |
| `row_status` | row | app_devices.status |
| `row_port` | row | app_devices.port |
| `row_latency_ms` | row | app_devices.latency_ms |
| `row_auto_reconnect` | row | app_devices.auto_reconnect |
| `row_last_error` | row | app_devices.last_error |

## Join & Date Rules
- Single table: `app_devices` — no join needed.
- `date_from` and `date_to` are user-supplied parameters for the reporting period header display; they do not filter rows (devices are not time-scoped in this catalog).
- `generated_at` is injected at runtime by the report engine.

## Transformations
- No reshape required — straight columnar select from `app_devices`.
- `row_latency_ms` formatted to 1 decimal place.
- Rows ordered by device id ascending.

## Parameters
- `date_from` (required, date) — reporting period start, displayed in header.
- `date_to` (required, date) — reporting period end, displayed in header.