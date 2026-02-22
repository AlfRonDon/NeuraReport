## Executive Summary

The **Pressure Transmitter Report** displays time-stamped pressure readings (KG/CM²) from 31 pressure transmitters across the Solid Waste Management System. Each row in `neuract__PT_TABLE` corresponds to one measurement record; columns represent individual transmitter tags (PT-105 through PT-154). The row label (`row_pressure_meter`) is derived from the `timestamp_utc` column formatted as DD/MM/YYYY. Report header fields `print_date` and `print_time` are user-supplied parameters injected at generation time.

## Token Inventory

| Token | Type | Source |
|---|---|---|
| print_date | Scalar | PARAM:print_date |
| print_time | Scalar | PARAM:print_time |
| row_pressure_meter | Row | neuract__PT_TABLE.timestamp_utc → format_date(%d/%m/%Y) |
| row_pt_105 | Row | neuract__PT_TABLE.PT_105 |
| row_pt_107 | Row | neuract__PT_TABLE.PT_107 |
| row_pt_109 | Row | neuract__PT_TABLE.PT_109 |
| row_pt_111 | Row | neuract__PT_TABLE.PT_111 |
| row_pt_114 | Row | neuract__PT_TABLE.PT_114 |
| row_pt_115 | Row | neuract__PT_TABLE.PT_115 |
| row_pt_117 | Row | neuract__PT_TABLE.PT_117 |
| row_pt_125 | Row | neuract__PT_TABLE.PT_125 |
| row_pt_121 | Row | neuract__PT_TABLE.PT_121 |
| row_pt_119 | Row | neuract__PT_TABLE.PT_119 |
| row_pt_123 | Row | neuract__PT_TABLE.PT_123 |
| row_pt_127 | Row | neuract__PT_TABLE.PT_127 |
| row_pt_129 | Row | neuract__PT_TABLE.PT_129 |
| row_pt_131 | Row | neuract__PT_TABLE.PT_131 |
| row_pt_132 | Row | neuract__PT_TABLE.PT_132 |
| row_pt_133 | Row | neuract__PT_TABLE.PT_133 |
| row_pt_135 | Row | neuract__PT_TABLE.PT_135 |
| row_pt_136 | Row | neuract__PT_TABLE.PT_136 |
| row_pt_140 | Row | neuract__PT_TABLE.PT_140 |
| row_pt_141 | Row | neuract__PT_TABLE.PT_141 |
| row_pt_142 | Row | neuract__PT_TABLE.PT_142 |
| row_pt_138 | Row | neuract__PT_TABLE.PT_138 |
| row_pt_139 | Row | neuract__PT_TABLE.PT_139 |
| row_pt_147 | Row | neuract__PT_TABLE.PT_147 |
| row_pt_148 | Row | neuract__PT_TABLE.PT_148 |
| row_pt_143 | Row | neuract__PT_TABLE.PT_143 |
| row_pt_145 | Row | neuract__PT_TABLE.PT_145 |
| row_ph_146 | Row | neuract__PT_TABLE.PT_146 (HTML label PH-146; catalog column is PT_146) |
| row_pt_149 | Row | neuract__PT_TABLE.PT_149 |
| row_pt_151 | Row | neuract__PT_TABLE.PT_151 |
| row_pt_154 | Row | neuract__PT_TABLE.PT_154 |

## Mapping Table

All 32 row tokens map directly to wide-format columns in `neuract__PT_TABLE`. No MELT or UNION_ALL reshape is required — the source table is already in columnar wide format with one row per timestamp and one column per transmitter.

## Join & Date Rules

Single table: `neuract__PT_TABLE`. Primary date column: `timestamp_utc`. Rows ordered by `timestamp_utc ASC`.

## Transformations

- `row_pressure_meter`: ISO timestamp from `timestamp_utc` formatted to `%d/%m/%Y` via `format_date` declarative op.
- All pressure value tokens: formatted to 4 decimal places via `number(4)` formatter.

## Parameters

- `print_date` (required): Generation date shown in header — passed through as-is.
- `print_time` (required): Generation time shown in header — passed through as-is.