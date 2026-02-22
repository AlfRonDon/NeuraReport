# Notifications Report Contract

## Executive Summary
This report displays a simple notification list from the `app_notifications` table. Each row shows a notification's ID, type, message, associated user, read status, and timestamp. No aggregations, parameters, or transformations are required.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 6 (row_id, row_type, row_message, row_user, row_read, row_time)
- **Totals**: None

## Mapping Table

| Token         | Source Column              | Type   |
|---------------|----------------------------|--------|
| row_id        | app_notifications.id       | Direct |
| row_type      | app_notifications.type     | Direct |
| row_message   | app_notifications.message  | Direct |
| row_user      | app_notifications.user     | Direct |
| row_read      | app_notifications.read     | Direct |
| row_time      | app_notifications.time     | Direct |

## Join & Date Rules
- **Primary Table**: app_notifications
- **Join Strategy**: Single table, self-join on id
- **Date Columns**: app_notifications.time
- **Filters**: None

## Transformations
No reshaping, computed columns, or aggregations required. Direct column passthrough.

## Parameters
No parameters required or supported.