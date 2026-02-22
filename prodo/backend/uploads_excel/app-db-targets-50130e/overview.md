# Db Targets Report - Mapping Overview

## Executive Summary
This report displays a simple list of database connection targets from the `app_db_targets` table. Each row represents a registered database connection with its provider type, connection details, current status, and last diagnostic message. No filters, no aggregations, no transformations—just a straightforward read of all active database targets.

## Token Inventory
- **Scalars**: 0 (no header-level tokens)
- **Row Tokens**: 5 (target_id, provider, connection_string, status, last_message)
- **Totals**: 0 (no summary row)

## Mapping Table
| Token                    | Source Mapping           | Type    |
|--------------------------|--------------------------|----------|
| row_target_id            | app_db_targets.id        | Column  |
| row_provider             | app_db_targets.provider  | Column  |
| row_connection_string    | app_db_targets.conn      | Column  |
| row_status               | app_db_targets.status    | Column  |
| row_last_message         | app_db_targets.last_msg  | Column  |

## Join & Date Rules
- **Parent Table**: app_db_targets (primary data source)
- **Join Strategy**: Single-table read, no parent-child relationship required
- **Date Columns**: None specified
- **Ordering**: Default ROWID ascending (natural insertion order)

## Transformations
- **Reshape**: None—columns map 1:1 from source table to output tokens
- **Computed Columns**: None
- **Aggregations**: None

## Parameters
- **Required**: None
- **Optional**: None (this report lists all targets unconditionally)

## Notes
This is a diagnostic/administrative report intended for monitoring registered database connections. All fields are directly sourced from the app_db_targets table without modification.