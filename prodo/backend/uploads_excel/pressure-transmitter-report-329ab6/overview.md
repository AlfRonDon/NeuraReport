# PRESSURE TRANSMITTER REPORT — Mapping Contract

## Executive Summary
This report displays real-time pressure transmitter readings from a Solid Waste Management System. It presents a single-row snapshot of 32 pressure transmitter (PT) values plus a timestamp, sourced from the `neuract__PT_TABLE`. Each column represents a distinct pressure sensor (PT_105 through PT_154) capturing pressure measurements across various points in the system.

## Token Inventory
- **Scalars**: 0
- **Row Tokens**: 32
- **Totals**: 0

## Mapping Table
| Token | Source Column | Type |
|-------|---------------|------|
| row_print_date_time | neuract__PT_TABLE.timestamp_utc | timestamp |
| row_solid_waste_management_system | neuract__PT_TABLE.PT_105 | pressure reading |
| row_column_3 | neuract__PT_TABLE.PT_107 | pressure reading |
| row_column_4 | neuract__PT_TABLE.PT_109 | pressure reading |
| row_column_5 | neuract__PT_TABLE.PT_111 | pressure reading |
| row_column_6 | neuract__PT_TABLE.PT_114 | pressure reading |
| row_column_7 | neuract__PT_TABLE.PT_115 | pressure reading |
| row_column_8 | neuract__PT_TABLE.PT_117 | pressure reading |
| row_column_9 | neuract__PT_TABLE.PT_125 | pressure reading |
| row_column_10 | neuract__PT_TABLE.PT_121 | pressure reading |
| row_column_11 | neuract__PT_TABLE.PT_119 | pressure reading |
| row_column_12 | neuract__PT_TABLE.PT_123 | pressure reading |
| row_column_13 | neuract__PT_TABLE.PT_127 | pressure reading |
| row_column_14 | neuract__PT_TABLE.PT_129 | pressure reading |
| row_column_15 | neuract__PT_TABLE.PT_131 | pressure reading |
| row_column_16 | neuract__PT_TABLE.PT_132 | pressure reading |
| row_column_17 | neuract__PT_TABLE.PT_133 | pressure reading |
| row_column_18 | neuract__PT_TABLE.PT_135 | pressure reading |
| row_column_19 | neuract__PT_TABLE.PT_136 | pressure reading |
| row_column_20 | neuract__PT_TABLE.PT_140 | pressure reading |
| row_column_21 | neuract__PT_TABLE.PT_141 | pressure reading |
| row_column_22 | neuract__PT_TABLE.PT_142 | pressure reading |
| row_column_23 | neuract__PT_TABLE.PT_138 | pressure reading |
| row_column_24 | neuract__PT_TABLE.PT_139 | pressure reading |
| row_column_25 | neuract__PT_TABLE.PT_147 | pressure reading |
| row_column_26 | neuract__PT_TABLE.PT_148 | pressure reading |
| row_column_27 | neuract__PT_TABLE.PT_143 | pressure reading |
| row_column_28 | neuract__PT_TABLE.PT_145 | pressure reading |
| row_column_29 | neuract__PT_TABLE.PT_146 | pressure reading |
| row_column_30 | neuract__PT_TABLE.PT_149 | pressure reading |
| row_column_31 | neuract__PT_TABLE.PT_151 | pressure reading |
| row_column_32 | neuract__PT_TABLE.PT_154 | pressure reading |

## Join & Date Rules
- **Primary Table**: `neuract__PT_TABLE`
- **Join Strategy**: Single-table query (no child join required)
- **Date Column**: `neuract__PT_TABLE.timestamp_utc` — enables time-range filtering for historical snapshots
- **Ordering**: Rows ordered by `timestamp_utc DESC` to show most recent readings first

## Transformations
- **No reshaping required** — direct column-to-token mapping from PT_TABLE
- **Timestamp formatting** — `timestamp_utc` formatted as human-readable date/time for print display
- **Numeric formatting** — pressure values displayed with 2 decimal places

## Parameters
- **Required**: None
- **Optional**: Time range filters applied via `timestamp_utc` column for historical reporting