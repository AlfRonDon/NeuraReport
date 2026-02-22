# Solid Waste Management System Report - Mapping Overview

## Executive Summary
This report displays real-time analyser data from the Solid Waste Management System. The template contains a single data row with 11 columns showing timestamp and 10 different sensor readings (ORP, PH, TDS, and DO measurements).

## Token Inventory
- **Scalars**: 0 tokens
- **Row Tokens**: 11 tokens (timestamp + 10 sensor readings)
- **Totals**: 0 tokens

## Mapping Table
| Token | Source Column | Type |
|-------|--------------|------|
| row_print_date_time | neuract__ANALYSER_TABLE.timestamp_utc | Timestamp |
| row_solid_waste_management_system | neuract__ANALYSER_TABLE.ORP_101 | ORP Sensor |
| row_column_3 | neuract__ANALYSER_TABLE.ORP_102 | ORP Sensor |
| row_column_4 | neuract__ANALYSER_TABLE.PH_101 | PH Sensor |
| row_column_5 | neuract__ANALYSER_TABLE.PH_102 | PH Sensor |
| row_column_6 | neuract__ANALYSER_TABLE.ORP_103 | ORP Sensor |
| row_column_7 | neuract__ANALYSER_TABLE.PH_103 | PH Sensor |
| row_column_8 | neuract__ANALYSER_TABLE.TDS_101 | TDS Sensor |
| row_column_9 | neuract__ANALYSER_TABLE.PH_104 | PH Sensor |
| row_column_10 | neuract__ANALYSER_TABLE.TDS_102 | TDS Sensor |
| row_column_11 | neuract__ANALYSER_TABLE.D0_101 | Dissolved Oxygen Sensor |

## Join & Date Rules
- **Primary Table**: neuract__ANALYSER_TABLE
- **Join Strategy**: Single table (no join required)
- **Date Column**: neuract__ANALYSER_TABLE.timestamp_utc
- **Time Range Filtering**: Enabled on timestamp_utc

## Transformations
No reshape, MELT, or UNION_ALL operations required. Direct column mapping from ANALYSER_TABLE.

## Parameters
No required or optional parameters. All data sourced directly from the analyser table.