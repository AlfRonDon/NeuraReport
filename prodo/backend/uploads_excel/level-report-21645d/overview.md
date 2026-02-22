## Executive Summary

This report renders a wide time-series table of Level Transmitter (LT) readings from the `neuract__LT_TABLE` source. Each row represents one timestamp snapshot, and each column represents a distinct LT instrument reading. There are no header scalars and no totals — the report is purely a row-by-row tabular dump of sensor values.

## Token Inventory

| Category | Count |
|---|---|
| Scalars | 0 |
| Row tokens | 30 |
| Totals | 0 |

## Mapping Table

| Token | Source |
|---|---|
| row_level_transmitter | neuract__LT_TABLE.timestamp_utc |
| row_lt_105 | neuract__LT_TABLE.LT_105 |
| row_lt_107 | neuract__LT_TABLE.LT_107 |
| row_lt_109 | neuract__LT_TABLE.LT_109 |
| row_lt_111 | neuract__LT_TABLE.LT_111 |
| row_lt_114 | neuract__LT_TABLE.LT_114 |
| row_lt_116 | neuract__LT_TABLE.LT_116 |
| row_lt_118 | neuract__LT_TABLE.LT_118 |
| row_lt_127 | neuract__LT_TABLE.LT_127 |
| row_lt_128 | neuract__LT_TABLE.LT_128 |
| row_lt_129 | neuract__LT_TABLE.LT_129 |
| row_lt_130 | neuract__LT_TABLE.LT_130 |
| row_lt_131 | neuract__LT_TABLE.LT_131 |
| row_lt_120 | neuract__LT_TABLE.LT_120 |
| row_lt_122 | UNRESOLVED — LT_122 absent from catalog (jumps LT_120 → LT_126) |
| row_lt_114_2 | neuract__LT_TABLE.LT_114_2 |
| row_lt_126 | neuract__LT_TABLE.LT_126 |
| row_lt_113 | neuract__LT_TABLE.LT_113 |
| row_lt_134 | neuract__LT_TABLE.LT_134 |
| row_lt_135 | neuract__LT_TABLE.LT_135 |
| row_lt_137 | neuract__LT_TABLE.LT_137 |
| row_lt_138 | neuract__LT_TABLE.LT_138 |
| row_lt_139 | neuract__LT_TABLE.LT_139 |
| row_lt_140 | neuract__LT_TABLE.LT_140 |
| row_lt_142 | neuract__LT_TABLE.LT_142 |
| row_lt_143 | neuract__LT_TABLE.LT_143 |
| row_lt_144 | neuract__LT_TABLE.LT_144 |
| row_lt_146 | neuract__LT_TABLE.LT_146 |
| row_lt_148 | neuract__LT_TABLE.LT_148 |
| row_lt_149 | neuract__LT_TABLE.LT_149 |

## Join & Date Rules

Single-table query on `neuract__LT_TABLE`. Rows are ordered by `timestamp_utc ASC`. The `timestamp_utc` column is the primary date axis and is formatted as a datetime string for display.

## Transformations

No reshape required. All 29 resolved LT columns are direct projections from the same table. `row_level_transmitter` displays the formatted timestamp. All LT readings are numeric sensor values formatted to 2 decimal places.

## Parameters

No key filter parameters are required. Optional date-range filters may be applied against `neuract__LT_TABLE.timestamp_utc` if provided.