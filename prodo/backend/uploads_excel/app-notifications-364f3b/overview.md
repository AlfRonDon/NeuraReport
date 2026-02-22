# Notifications Report Contract

## Executive Summary
This report displays a simple notification list from the `app_notifications` table. All six row tokens map directly to columns in the source table with no transformations, aggregations, or parameters required.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 6 (id, type, message, user, read, time)
- **Totals**: None

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| row_id | app_notifications.id | Direct |
| row_type | app_notifications.type | Direct |
| row_message | app_notifications.message | Direct |
| row_user | app_notifications.user | Direct |
| row_read | app_notifications.read | Direct |
| row_time | app_notifications.time | Direct |

## Join & Date Rules
- **Primary Table**: app_notifications
- **Join Strategy**: Single-table query (parent = child)
- **Date Column**: app_notifications.time
- **Filters**: None

## Transformations
- **Reshape**: None required
- **Computed Columns**: None
- **Aggregations**: None

## Parameters
No parameters required. This is a full-table report with no filtering logic.