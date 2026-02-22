## Executive Summary

This report renders flow meter readings from `neuract__FM_TABLE`, displaying one row per timestamped reading. Each row shows the formatted timestamp (FLOW METER column), six instantaneous flow readings (FM-101 through FM-106), and their six corresponding cumulative totalizer values (FM-101 TOTALIZER through FM-106 TOTALIZER). No header scalars or totals rows are defined.

## Token Inventory

| Token | Source Column | Role |
|---|---|---|
| row_flow_meter | neuract__FM_TABLE.timestamp_utc | Row label — formatted datetime |
| row_fm_101 | neuract__FM_TABLE.FM_101 | Instantaneous flow reading |
| row_fm_102 | neuract__FM_TABLE.FM_102 | Instantaneous flow reading |
| row_fm_103 | neuract__FM_TABLE.FM_103 | Instantaneous flow reading |
| row_fm_104 | neuract__FM_TABLE.FM_104 | Instantaneous flow reading |
| row_fm_105 | neuract__FM_TABLE.FM_105 | Instantaneous flow reading |
| row_fm_106 | neuract__FM_TABLE.FM_106 | Instantaneous flow reading |
| row_fm_101_totalizer | neuract__FM_TABLE.FM_101_TOTALIZER | Cumulative totalizer |
| row_fm_102_totalizer | neuract__FM_TABLE.FM_102_TOTALIZER | Cumulative totalizer |
| row_fm_103_totalizer | neuract__FM_TABLE.FM_103_TOTALIZER | Cumulative totalizer |
| row_fm_104_totalizer | neuract__FM_TABLE.FM_104_TOTALIZER | Cumulative totalizer |
| row_fm_105_totalizer | neuract__FM_TABLE.FM_105_TOTALIZER | Cumulative totalizer |
| row_fm_106_totalizer | neuract__FM_TABLE.FM_106_TOTALIZER | Cumulative totalizer |

## Join & Date Rules

- Single table: `neuract__FM_TABLE`, self-joined on `rowid`.
- Date column: `timestamp_utc`; used for ordering and optional date-range filtering.
- `row_flow_meter` is derived via `format_date` on `timestamp_utc` with format `%d-%m-%Y %H:%M:%S`.
- Rows ordered by `timestamp_utc ASC`.

## Transformations

- **row_flow_meter**: `format_date` applied to `timestamp_utc` → `%d-%m-%Y %H:%M:%S`
- **FM-101 to FM-106**: formatted to 2 decimal places.
- **FM-101 TOTALIZER to FM-106 TOTALIZER**: formatted to 2 decimal places.

## Parameters

- Optional: `date_from` and `date_to` — filter `neuract__FM_TABLE.timestamp_utc` to a date range. No required parameters.