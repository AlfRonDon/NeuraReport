# Flow Meter Report – Executive Summary

This report displays flow meter readings and totalizer values from the **neuract__FM_TABLE** dataset. The template captures 13 columns: a timestamp column followed by 6 flow rate columns (FM_101 through FM_106) and their corresponding totalizer columns.

## Token Inventory

| Category | Count | Description |
|----------|-------|-------------|
| Scalars | 0 | No header-level scalar tokens |
| Row Tokens | 13 | Timestamp + 6 flow rates + 6 totalizers |
| Totals | 0 | No aggregate totals required |

## Mapping Table

| Token | Source Column | Notes |
|-------|---------------|-------|
| row_print_date_time | neuract__FM_TABLE.timestamp_utc | Requires date+time formatting |
| row_solid_waste_management_system | neuract__FM_TABLE.FM_101 | Flow rate for FM_101 |
| row_column_3 | neuract__FM_TABLE.FM_102 | Flow rate for FM_102 |
| row_column_4 | neuract__FM_TABLE.FM_103 | Flow rate for FM_103 |
| row_column_5 | neuract__FM_TABLE.FM_104 | Flow rate for FM_104 |
| row_column_6 | neuract__FM_TABLE.FM_105 | Flow rate for FM_105 |
| row_column_7 | neuract__FM_TABLE.FM_106 | Flow rate for FM_106 |
| row_column_8 | neuract__FM_TABLE.FM_101_TOTALIZER | Totalizer for FM_101 |
| row_column_9 | neuract__FM_TABLE.FM_102_TOTALIZER | Totalizer for FM_102 |
| row_column_10 | neuract__FM_TABLE.FM_103_TOTALIZER | Totalizer for FM_103 |
| row_column_11 | neuract__FM_TABLE.FM_104_TOTALIZER | Totalizer for FM_104 |
| row_column_12 | neuract__FM_TABLE.FM_105_TOTALIZER | Totalizer for FM_105 |
| row_column_13 | neuract__FM_TABLE.FM_106_TOTALIZER | Totalizer for FM_106 |

## Join & Date Rules

- **Parent Table**: neuract__FM_TABLE (self-join, no child)
- **Date Column**: neuract__FM_TABLE.timestamp_utc
- **No reshaping required**: Direct row-by-row mapping from source table

## Transformations

1. **Date Formatting**: `row_print_date_time` formats `timestamp_utc` as `DD-MM-YYYY HH:MM:SS`
2. **Number Formatting**: All flow rate and totalizer columns formatted to 2 decimal places

## Parameters

No required filter parameters. Users may optionally filter by time range via the date_columns mechanism.