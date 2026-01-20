Executive Summary
- Build a simple time-series temperature report from neuract__TEMPERATURES with one detail row per timestamp and 12 sensor PV columns plus the timestamp.
- No totals or aggregations; this is a direct select of columns with stable ordering by timestamp_utc ASC.
- The header displays a value using {row_column_12}; per current mapping this is neuract__TEMPERATURES.P9A_DRY_OUT_PT100_PV (a sensor PV). This may be an intentional reuse; we leave it as-is.

Token Inventory
- Row tokens (13): row_column_1, row_column_2, row_column_3, row_column_4, row_column_5, row_column_6, row_costal_feeds, row_column_8, row_column_9, row_column_10, row_column_11, row_column_12, row_column_13
- Scalars: none
- Totals: none

Mapping Table
| Token | Source |
| --- | --- |
| row_column_1 | neuract__TEMPERATURES.timestamp_utc |
| row_column_2 | neuract__TEMPERATURES.M1A_2_PT100_PV |
| row_column_3 | neuract__TEMPERATURES.M1A_3_PT100_PV |
| row_column_4 | neuract__TEMPERATURES.P3A_PT100_PV |
| row_column_5 | neuract__TEMPERATURES.P4A_PT100_PV |
| row_column_6 | neuract__TEMPERATURES.P5A_PT100_PV |
| row_costal_feeds | neuract__TEMPERATURES.P6A_PT100_PV |
| row_column_8 | neuract__TEMPERATURES.P8A_PT100_PV |
| row_column_9 | neuract__TEMPERATURES.P8A_3_PT100_PV |
| row_column_10 | neuract__TEMPERATURES.P8A_4_PT100_PV |
| row_column_11 | neuract__TEMPERATURES.P8A_DRY_OUT_PT100_PV |
| row_column_12 | neuract__TEMPERATURES.P9A_DRY_OUT_PT100_PV |
| row_column_13 | neuract__TEMPERATURES.ROOM_PT100_PV |

Join & Date Rules
- Tables: single-source neuract__TEMPERATURES; no joins required.
- Date column: neuract__TEMPERATURES.timestamp_utc.
- Optional time window filtering: apply timestamp_utc >= :from_ts when provided; apply timestamp_utc <= :to_ts when provided. Both are inclusive and only applied when non-empty.

Transformations
- Direct select (no unpivot, no aggregation). Each source row becomes one output row.
- No computed row fields; no totals math.
- Ordering: ORDER BY neuract__TEMPERATURES.timestamp_utc ASC for stable output.

Parameters
- Optional: from_ts (timestamp), to_ts (timestamp). When provided, apply inclusive filters on neuract__TEMPERATURES.timestamp_utc. When blank or null, do not apply the corresponding predicate.
- No required parameters and no key token filters for this template.

Checklist for Step 5
- Use only columns from neuract__TEMPERATURES listed in the catalog allow-list.
- Produce rows with tokens in the exact schema order.
- Apply optional time filters before selecting rows; both are inclusive.
- No grouping/aggregation; 1:1 pass-through of rows.
- Enforce stable ordering by neuract__TEMPERATURES.timestamp_utc ASC in both order_by.rows and row_order.
- Keep all dynamic tokens unchanged; do not rename any token.
- Note that the header displays {row_column_12}, mapped to P9A_DRY_OUT_PT100_PV.