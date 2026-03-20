## Executive Summary
The Tank Level Status Report renders a point-in-time snapshot of water tank fill levels across 9 tanks at a water treatment facility. All sensor data originates from `neuract__LT_TABLE`, which stores per-tank level percentages in **wide format** (one instrument-tag column per tank). The pipeline selects the relevant timestamp row(s), **melts** the wide table into long format (one row per tank), attaches static human-readable tank name labels and engineering capacity constants (kL) as positional literal columns, then computes each tank's current volume as `row_level × row_capacity ÷ 100`. The snapshot timestamp is a scalar header field.

## Token Inventory
| Token | Type | Source |
|---|---|---|
| `timestamp` | scalar | `neuract__LT_TABLE.timestamp_utc` — formatted display |
| `row_tank_name` | row | Static literal strings embedded in reshape definition |
| `row_level` | row | `neuract__LT_TABLE.LT_112–LT_128` via MELT (level %) |
| `row_capacity` | row | Static engineering constants (kL) in reshape definition |
| `row_current_vol` | row | Computed: `row_level × row_capacity ÷ 100` (kL) |

## Mapping Table
| Token | Resolved To | Notes |
|---|---|---|
| `timestamp` | `neuract__LT_TABLE.timestamp_utc` | Scalar header; format_date applied |
| `row_tank_name` | UNRESOLVED | Human-readable labels; static literals in reshape |
| `row_level` | `neuract__LT_TABLE.LT_112` (representative) | MELT across 9 LT columns |
| `row_capacity` | UNRESOLVED | Fixed kL values; static literals in reshape |
| `row_current_vol` | UNRESOLVED | Declarative multiply/divide in row_computed |

## Join & Date Rules
- **Single table**: `neuract__LT_TABLE` (self-join on `rowid`)
- **Date column**: `timestamp_utc`
- **Optional filters**: `date_from`, `date_to` for snapshot time-range selection
- **Typical use**: Query the latest single row by timestamp to render a point-in-time snapshot

## Transformations
1. **MELT**: Unpivot 9 wide LT columns (`LT_112`, `LT_113`, `LT_114`, `LT_116`, `LT_118`, `LT_120`, `LT_126`, `LT_127`, `LT_128`) into one row per tank
2. **Static Tank Names**: Literal strings per reshape position (e.g., "Raw Water Tank (LT_112)", "Settling Tank (LT_113)")
3. **Static Capacities**: Literal kL values per reshape position (500, 300, 450, 200, 600, 150, 250, 100, 100 kL)
4. **Current Volume**: `row_current_vol = (row_level × row_capacity) ÷ 100`
5. **Timestamp Formatting**: `format_date` applied to `timestamp_utc` with `%d-%m-%Y %H:%M:%S`

## Parameters
- **date_from** (optional): Lower-bound datetime for snapshot row selection
- **date_to** (optional): Upper-bound datetime for snapshot row selection