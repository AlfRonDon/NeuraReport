# Notifications Report — Mapping Contract

## Executive Summary
This report renders system notifications from the `app_notifications` table. It displays a list of notification records filtered by a user-selected date range, with each row showing the notification ID, type, message, target user, read status, and timestamp. The report header includes the reporting period and generation timestamp.

## Token Inventory
| Token | Kind | Source |
|---|---|---|
| date_from | Scalar | PARAM:date_from (user-selected filter) |
| date_to | Scalar | PARAM:date_to (user-selected filter) |
| generated_at | Scalar | PARAM:generated_at (runtime injection) |
| row_id | Row | app_notifications.id |
| row_type | Row | app_notifications.type |
| row_message | Row | app_notifications.message |
| row_user | Row | app_notifications.user |
| row_read | Row | app_notifications.read |
| row_time | Row | app_notifications.time |

## Join & Date Rules
- Single table: `app_notifications` (no join required)
- Date filter: `app_notifications.time` is the date column for range filtering
- `date_from` and `date_to` are user-supplied parameters passed directly into the filter
- `generated_at` is a runtime scalar injected at report generation time (current timestamp)

## Parameters
- **date_from** (required): Start of the reporting period; filters `app_notifications.time >= date_from`
- **date_to** (required): End of the reporting period; filters `app_notifications.time <= date_to`
- **generated_at** (runtime): Current timestamp injected by the report engine, not from the database

## Transformations
- No reshape required; data is a flat list from a single table
- Rows ordered by `app_notifications.time DESC` (most recent first)
- No computed columns; all row values are direct column mappings