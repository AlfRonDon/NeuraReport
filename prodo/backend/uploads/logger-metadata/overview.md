## System Metadata Report — Contract Overview

### Executive Summary
This report renders all key-value pairs from the `app_meta` table, providing a simple inventory of application-level metadata. The report header shows a configurable date range and a server-injected generation timestamp. No aggregation or totals are required.

### Token Inventory
| Token | Kind | Source |
|---|---|---|
| `date_from` | Scalar | PARAM:date_from |
| `date_to` | Scalar | PARAM:date_to |
| `generated_at` | Scalar | PARAM:generated_at (server-injected) |
| `row_key` | Row | app_meta.key |
| `row_value` | Row | app_meta.value |

### Join & Data Rules
- Single table: `app_meta`. No join needed — parent and child are the same table.
- All rows are returned; no date filtering is applied to `app_meta` (it has no date column).
- `date_from` / `date_to` are header display parameters only, not applied as row filters.
- `generated_at` is a server-injected runtime constant, not a catalog column.

### Parameters
- `date_from` — reporting period start (display only)
- `date_to` — reporting period end (display only)
- `generated_at` — server-injected generation timestamp

### Transformations
- No reshape, computed columns, or totals required.
- Row ordering: natural table order (ROWID).