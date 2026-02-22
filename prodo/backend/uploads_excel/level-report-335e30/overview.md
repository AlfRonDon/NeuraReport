# Solid Waste Management System Report - Contract Overview

## Executive Summary
This report displays a wide-format time-series snapshot of level transmitter (LT) readings from the **neuract__LT_TABLE**. Each row represents a single timestamp with 30 columns of sensor data.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 30 tokens (row_print_date_time, row_solid_waste_management_system, row_column_3 through row_column_30)
- **Totals**: None

## Mapping Table
| Token | Source Column | Type |
|-------|---------------|------|
| row_print_date_time | neuract__LT_TABLE.timestamp_utc | Timestamp |
| row_solid_waste_management_system | neuract__LT_TABLE.LT_105 | Numeric |
| row_column_3 | neuract__LT_TABLE.LT_107 | Numeric |
| row_column_4 | neuract__LT_TABLE.LT_109 | Numeric |
| row_column_5 | neuract__LT_TABLE.LT_111 | Numeric |
| row_column_6 | neuract__LT_TABLE.LT_114 | Numeric |
| row_column_7 | neuract__LT_TABLE.LT_116 | Numeric |
| row_column_8 | neuract__LT_TABLE.LT_118 | Numeric |
| row_column_9 | neuract__LT_TABLE.LT_127 | Numeric |
| row_column_10 | neuract__LT_TABLE.LT_128 | Numeric |
| row_column_11 | neuract__LT_TABLE.LT_129 | Numeric |
| row_column_12 | neuract__LT_TABLE.LT_130 | Numeric |
| row_column_13 | neuract__LT_TABLE.LT_131 | Numeric |
| row_column_14 | neuract__LT_TABLE.LT_120 | Numeric |
| row_column_15 | neuract__LT_TABLE.LT_112 | Numeric |
| row_column_16 | neuract__LT_TABLE.LT_114_2 | Numeric |
| row_column_17 | neuract__LT_TABLE.LT_126 | Numeric |
| row_column_18 | neuract__LT_TABLE.LT_113 | Numeric |
| row_column_19 | neuract__LT_TABLE.LT_134 | Numeric |
| row_column_20 | neuract__LT_TABLE.LT_135 | Numeric |
| row_column_21 | neuract__LT_TABLE.LT_137 | Numeric |
| row_column_22 | neuract__LT_TABLE.LT_138 | Numeric |
| row_column_23 | neuract__LT_TABLE.LT_139 | Numeric |
| row_column_24 | neuract__LT_TABLE.LT_140 | Numeric |
| row_column_25 | neuract__LT_TABLE.LT_142 | Numeric |
| row_column_26 | neuract__LT_TABLE.LT_143 | Numeric |
| row_column_27 | neuract__LT_TABLE.LT_144 | Numeric |
| row_column_28 | neuract__LT_TABLE.LT_146 | Numeric |
| row_column_29 | neuract__LT_TABLE.LT_148 | Numeric |
| row_column_30 | neuract__LT_TABLE.LT_149 | Numeric |

## Join & Date Rules
- **Primary Table**: neuract__LT_TABLE (self-join, no child table)
- **Date Column for Filtering**: neuract__LT_TABLE.timestamp_utc
- All data sourced from a single table; no multi-table joins required.

## Transformations
- **No Reshape**: Data is already in wide format matching the report structure.
- **No Computed Columns**: All columns are direct mappings.
- **Ordering**: Rows ordered by timestamp_utc descending (most recent first).

## Parameters
- No required parameters (no key_tokens specified).
- Optional time-range filtering available via timestamp_utc.