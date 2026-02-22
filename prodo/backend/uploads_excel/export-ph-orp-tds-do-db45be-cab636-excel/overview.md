## Executive Summary

This report renders wide-format water quality analyser readings (PH, ORP, TDS, DO) from `neuract__ANALYSER_TABLE` for the **SOLID WASTE MANAGEMENT SYSTEM**. Each row represents one measurement event (timestamp); columns cover 10 instruments: ORP-101/102/103, PH-101/102/103/104, TDS-101/102, DO-101. No joins, no reshaping — data is already in the required wide columnar layout.

`print_date` and `print_time` are system-injected at render time from the server clock; they have no database source. The catalog column `D0_101` uses a digit zero (not the letter O) — verified and mapped accordingly.

## Token Inventory

| Token | Type | Source |
|---|---|---|
| print_date | scalar | System-injected render date |
| print_time | scalar | System-injected render time |
| row_analysers | row | neuract__ANALYSER_TABLE.timestamp_utc (formatted) |
| row_orp_101 | row | neuract__ANALYSER_TABLE.ORP_101 |
| row_orp_102 | row | neuract__ANALYSER_TABLE.ORP_102 |
| row_orp_103 | row | neuract__ANALYSER_TABLE.ORP_103 |
| row_ph_101 | row | neuract__ANALYSER_TABLE.PH_101 |
| row_ph_102 | row | neuract__ANALYSER_TABLE.PH_102 |
| row_ph_103 | row | neuract__ANALYSER_TABLE.PH_103 |
| row_ph_104 | row | neuract__ANALYSER_TABLE.PH_104 |
| row_tds_101 | row | neuract__ANALYSER_TABLE.TDS_101 |
| row_tds_102 | row | neuract__ANALYSER_TABLE.TDS_102 |
| row_do_101 | row | neuract__ANALYSER_TABLE.D0_101 |

## Join & Date Rules

- **Single table**: `neuract__ANALYSER_TABLE` — no join required.
- **Date column**: `timestamp_utc` (ISO 8601 with +05:30 offset).
- **Optional filters**: `date_from` / `date_to` on `timestamp_utc` enable day-wise or month-wise slicing as noted in footer conditions.

## Transformations

- `row_analysers` → `format_date` on `timestamp_utc` using `%d-%m-%Y %H:%M:%S`.
- ORP and TDS readings formatted to 3 decimal places; PH and DO readings to 2 decimal places.
- No MELT or UNION_ALL reshape — table is already wide-format.

## Parameters

- `print_date` / `print_time`: system-injected at render time (no DB source).
- Optional: `date_from`, `date_to` for time-range filtering.