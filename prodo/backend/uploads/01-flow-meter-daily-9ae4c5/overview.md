## Flow Meter Daily Report — Mapping Overview

### Executive Summary
This report renders one row per flow meter (FM_101 through FM_106) showing the instantaneous reading (m³/h), cumulative totalizer (m³), and a static status label. Source data comes exclusively from `neuract__FM_TABLE`, which stores all six meter channels in wide format (one column per meter per timestamp row). A MELT reshape converts the wide schema into six long rows per timestamp. The header displays the report date supplied at runtime as a parameter. The footer total is the sum of all totalizer values across the six meters after reshaping.

### Token Inventory
| Token | Type | Source |
|---|---|---|
| report_date | scalar | PARAM:report_date |
| row_meter_id | row | MELT variable — FM_101..FM_106 column names become row label values |
| row_reading | row | MELT value from FM_101..FM_106 columns |
| row_totalizer | row | MELT value from FM_101_TOTALIZER..FM_106_TOTALIZER columns |
| row_status | row | Constant literal "Active" — no catalog source |
| total_flow | total | SUM of row_totalizer across all melted rows |

### Mapping Table
| Token | Catalog Reference | Notes |
|---|---|---|
| report_date | PARAM:report_date | User-supplied date; displayed in header |
| row_meter_id | neuract__FM_TABLE.FM_101 (representative) | Column names become string labels after MELT |
| row_reading | neuract__FM_TABLE.FM_101 (representative) | Flow rate in m³/h; MELT value |
| row_totalizer | neuract__FM_TABLE.FM_101_TOTALIZER (representative) | Cumulative m³; MELT value |
| row_status | UNRESOLVED | Static constant "Active" — stored in literals |
| total_flow | UNRESOLVED | Computed via totals_math SUM(row_totalizer) |

### Join & Date Rules
- Single table: `neuract__FM_TABLE` (self-join, no secondary table needed)
- Date column: `neuract__FM_TABLE.timestamp_utc` — filter range applied via optional `date_from` / `date_to` parameters
- The `report_date` scalar parameter is passed through for display; the date filter window scopes which rows are included in readings and totals

### Transformations
- **MELT**: Unpivot columns FM_101..FM_106 into `row_reading` (values) and FM_101..FM_106 column name strings into `row_meter_id` (labels); simultaneously unpivot FM_101_TOTALIZER..FM_106_TOTALIZER into `row_totalizer`
- **Constant injection**: `row_status` = "Active" for every melted row (no catalog source; see literals)
- **Aggregate**: `total_flow` = SUM(row_totalizer) across all six melted rows

### Parameters
- `report_date` (required): date string displayed in the report header
- `date_from` / `date_to` (optional): scope the timestamp_utc window for row and total calculations