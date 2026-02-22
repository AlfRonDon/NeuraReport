# DB Targets Report – Mapping Overview

## Executive Summary
This report displays a list of database connection targets from the `app_db_targets` table. Each row shows the ID, provider type, connection name, current status, and the last message received from the connection.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 5 tokens (id, provider, connection, status, last_message)
- **Totals**: None

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| row_id | app_db_targets.id | Direct |
| row_provider | app_db_targets.provider | Direct |
| row_connection | app_db_targets.conn | Direct |
| row_status | app_db_targets.status | Direct |
| row_last_message | app_db_targets.last_msg | Direct |

## Join & Date Rules
- **Parent Table**: app_db_targets (primary data source)
- **Join Strategy**: Single-table query (no join required)
- **Date Columns**: None specified
- **Filters**: None

## Transformations
- **Reshape**: None required (direct column mapping)
- **Computed Columns**: None
- **Aggregations**: None

## Parameters
- **Required**: None
- **Optional**: None

This is a straightforward tabular report with direct column-to-token mapping from the app_db_targets table.