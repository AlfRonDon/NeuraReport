# Schemas Report — Overview

## Executive Summary
This report displays a table of all schemas in the system. Each row represents a schema record with its ID, name, device table ID, version, and creation timestamp.

## Token Inventory
**Row Tokens (5):**
- `row_id` — Schema ID
- `row_name` — Schema name
- `row_device_table_id` — Device table identifier
- `row_version` — Schema version
- `row_created_at` — Creation timestamp

**Scalars:** None  
**Totals:** None

## Mapping Table
| Token | Source | Notes |
|-------|--------|-------|
| `row_id` | `app_schemas.id` | Primary key |
| `row_name` | `app_schemas.name` | Schema name |
| `row_device_table_id` | `UNRESOLVED` | Not found in app_schemas |
| `row_version` | `UNRESOLVED` | Not found in app_schemas |
| `row_created_at` | `UNRESOLVED` | Not found in app_schemas |

## Join & Date Rules
- **Primary Table:** `app_schemas`
- **Join:** Self-join on `id` (no child table)
- **Date Filtering:** None (no date columns identified)
- **Ordering:** By `id` ascending (default)

## Transformations
No reshape or computed columns.

## Parameters
None required.