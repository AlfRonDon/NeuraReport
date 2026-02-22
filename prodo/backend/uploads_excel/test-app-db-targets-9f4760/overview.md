# Db Targets Report - Mapping Contract Overview

## Executive Summary
This report displays database connection targets with their configuration details and status information. It's a simple list-style report showing one row per database target with no aggregations or computed fields.

## Token Inventory

### Row Tokens (5)
- `row_id` - Database target identifier
- `row_provider` - Database provider type (postgresql, mysql, etc.)
- `row_conn` - Connection string
- `row_status` - Connection status
- `row_last_msg` - Last message or error from the connection

### Scalar Tokens
None

### Totals Tokens
None

## Mapping Table

| Token | Source Column | Type |
|-------|--------------|------|
| row_id | app_db_targets.id | Direct |
| row_provider | app_db_targets.provider | Direct |
| row_conn | app_db_targets.conn | Direct |
| row_status | app_db_targets.status | Direct |
| row_last_msg | app_db_targets.last_msg | Direct |

## Join & Date Rules

- **Primary Table**: app_db_targets
- **Join Strategy**: Single table, no joins required
- **Date Filtering**: No date columns identified in app_db_targets (id, provider, conn, status, last_msg are all non-date fields)
- **Ordering**: Natural row order (ROWID)

## Transformations

No reshaping, computations, or aggregations required. This is a straightforward columnar mapping.

## Parameters

No required or optional parameters.