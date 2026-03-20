## pH Monitoring Trend Report — Contract Overview

### Executive Summary
This report renders time-series pH measurements from four sensor channels (PH_101–PH_104) at Inlet, Process 1, Process 2, and Outlet positions. Every data row originates from a single `neuract__ANALYSER_TABLE` read filtered by an optional time window. Two footer scalars (`avg_ph` and `exceedance_count`) require multi-column, multi-row aggregate logic that cannot be expressed with the available declarative op set and are marked **UNRESOLVED** for pipeline-level implementation.

### Token Inventory
| Token | Type | Source |
|---|---|---|
| `report_date` | Scalar | PARAM:report_date |
| `avg_ph` | Scalar | UNRESOLVED |
| `exceedance_count` | Scalar | UNRESOLVED |
| `row_timestamp` | Row | neuract__ANALYSER_TABLE.timestamp_utc |
| `row_ph_101` | Row | neuract__ANALYSER_TABLE.PH_101 |
| `row_ph_102` | Row | neuract__ANALYSER_TABLE.PH_102 |
| `row_ph_103` | Row | neuract__ANALYSER_TABLE.PH_103 |
| `row_ph_104` | Row | neuract__ANALYSER_TABLE.PH_104 |

### Join & Date Rules
- Single-table read from `neuract__ANALYSER_TABLE`; no cross-table join required.
- Date filter column: `neuract__ANALYSER_TABLE.timestamp_utc`.
- Optional filters `date_from` and `date_to` constrain the time window.

### Transformations
- `row_timestamp`: `format_date` → `%d-%m-%Y %H:%M:%S`.
- `row_ph_101` – `row_ph_104`: `number(4)` precision (pH sensor domain standard).
- `avg_ph`: mean of PH_101, PH_102, PH_103, PH_104 across all filtered rows — **UNRESOLVED** (no declarative op folds a multi-column row-set to a single scalar).
- `exceedance_count`: count of individual channel readings exceeding a user-supplied `ph_threshold` — **UNRESOLVED** (requires threshold comparison logic in pipeline code).
- Rows ordered ascending by `timestamp_utc`.

### Parameters
| Name | Required | Type | Purpose |
|---|---|---|---|
| `report_date` | Yes | date | Display date in report header |
| `date_from` | No | date | Start of time window filter |
| `date_to` | No | date | End of time window filter |
| `ph_threshold` | No | number | Threshold for exceedance_count computation |