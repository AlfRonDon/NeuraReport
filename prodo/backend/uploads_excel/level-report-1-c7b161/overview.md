# Level Transmitter Report — Contract Overview

## Executive Summary
This report presents time-series readings from Level Transmitter (LT) sensors stored in `neuract__LT_TABLE`. Each database row maps directly to one report row (one timestamp snapshot with up to 27 sensor readings across columns). Three instruments — LT-122, LT-124, and LT-133 — are absent from the catalog and will render as empty cells. No header scalars or totals row are required.

## Token Inventory
| Category | Count |
|---|---|
| Scalars | 0 |
| Row Tokens | 30 (1 timestamp + 26 numeric sensors + 3 unresolved) |
| Totals | 0 |

## Mapping Table
| Token | Source | Format |
|---|---|---|
| row_level_transmitter | neuract__LT_TABLE.timestamp_utc | format_date %d-%m-%Y %H:%M:%S |
| row_lt_105 | neuract__LT_TABLE.LT_105 | number(2) |
| row_lt_107 | neuract__LT_TABLE.LT_107 | number(2) |
| row_lt_109 | neuract__LT_TABLE.LT_109 | number(2) |
| row_lt_111 | neuract__LT_TABLE.LT_111 | number(2) |
| row_lt_114 | neuract__LT_TABLE.LT_114 | number(2) |
| row_lt_116 | neuract__LT_TABLE.LT_116 | number(2) |
| row_lt_118 | neuract__LT_TABLE.LT_118 | number(2) |
| row_lt_120 | neuract__LT_TABLE.LT_120 | number(2) |
| row_lt_122 | UNRESOLVED | LT-122 not in catalog |
| row_lt_124 | UNRESOLVED | LT-124 not in catalog |
| row_lt_126 | neuract__LT_TABLE.LT_126 | number(2) |
| row_lt_127 | neuract__LT_TABLE.LT_127 | number(2) |
| row_lt_128 | neuract__LT_TABLE.LT_128 | number(2) |
| row_lt_129 | neuract__LT_TABLE.LT_129 | number(2) |
| row_lt_130 | neuract__LT_TABLE.LT_130 | number(2) |
| row_lt_131 | neuract__LT_TABLE.LT_131 | number(2) |
| row_lt_133 | UNRESOLVED | LT-133 not in catalog |
| row_lt_134 | neuract__LT_TABLE.LT_134 | number(2) |
| row_lt_135 | neuract__LT_TABLE.LT_135 | number(2) |
| row_lt_137 | neuract__LT_TABLE.LT_137 | number(2) |
| row_lt_138 | neuract__LT_TABLE.LT_138 | number(2) |
| row_lt_139 | neuract__LT_TABLE.LT_139 | number(2) |
| row_lt_140 | neuract__LT_TABLE.LT_140 | number(2) |
| row_lt_142 | neuract__LT_TABLE.LT_142 | number(2) |
| row_lt_143 | neuract__LT_TABLE.LT_143 | number(2) |
| row_lt_144 | neuract__LT_TABLE.LT_144 | number(2) |
| row_lt_146 | neuract__LT_TABLE.LT_146 | number(2) |
| row_lt_148 | neuract__LT_TABLE.LT_148 | number(2) |
| row_lt_149 | neuract__LT_TABLE.LT_149 | number(2) |

## Join & Date Rules
- Single table: `neuract__LT_TABLE` — no join required.
- Date filter on `neuract__LT_TABLE.timestamp_utc` (optional `date_from` / `date_to`).
- Rows ordered by `timestamp_utc ASC`.

## Transformations
- `timestamp_utc` formatted via `row_computed.format_date` with `%d-%m-%Y %H:%M:%S`.
- All 26 resolved LT sensor columns formatted to 2 decimal places via `formatters`.
- No reshape — table is natively wide; each database row maps 1:1 to a report row.

## Parameters
- **Required**: none
- **Optional**: `date_from` (date), `date_to` (date) for time-range filtering.