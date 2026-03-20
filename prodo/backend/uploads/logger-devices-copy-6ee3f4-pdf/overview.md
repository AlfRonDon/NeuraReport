## Device Inventory Report — Contract Overview

### Executive Summary
This report renders a flat inventory of all registered PLC/IoT devices from the `app_devices` table. Each row represents one device, showing its name, protocol, connection status, port, latency, auto-reconnect setting, and last error. The reporting period is supplied by the user as parameters (`date_from`, `date_to`); `generated_at` is injected server-side at run time.

### Token Inventory
| Token | Kind | Source |
|---|---|---|
| `date_from` | Scalar | PARAM:date_from |
| `date_to` | Scalar | PARAM:date_to |
| `generated_at` | Scalar | PARAM:generated_at (server-injected) |
| `row_name` | Row | app_devices.name |
| `row_protocol` | Row | app_devices.protocol |
| `row_status` | Row | app_devices.status |
| `row_port` | Row | app_devices.port |
| `row_latency_ms` | Row | app_devices.latency_ms |
| `row_auto_reconnect` | Row | app_devices.auto_reconnect |
| `row_last_error` | Row | app_devices.last_error |

### Join & Data Rules
- Single table: `app_devices`. No join required.
- No date filtering applied to the device rows (inventory is a full snapshot); `date_from`/`date_to` are display-only header tokens passed as parameters.
- No totals section.

### Parameters
- `date_from` — display string for the start of the reporting period.
- `date_to` — display string for the end of the reporting period.
- `generated_at` — server-injected timestamp string (current datetime at generation).

### Transformations
- No reshape required (single flat table, no MELT or UNION_ALL).
- No computed columns.
- `row_latency_ms` formatted to 1 decimal place.
- `row_port` displayed as integer.
- `row_auto_reconnect` displayed as-is (boolean/integer flag from DB).