# Notifications Report — Mapping Contract

## Executive Summary
This report displays a simple notification log table with six columns: ID, type, message, user, read status, and timestamp. All data is sourced from the `app_notifications` table with no aggregations, computations, or parameters required.

## Token Inventory
| Token         | Category | Source Mapping           |
|---------------|----------|-------------------------|
| row_id        | Row      | app_notifications.id    |
| row_type      | Row      | app_notifications.type  |
| row_message   | Row      | app_notifications.message |
| row_user      | Row      | app_notifications.user  |
| row_read      | Row      | app_notifications.read  |
| row_time      | Row      | app_notifications.time  |

## Join & Date Rules
- **Primary Table**: `app_notifications` (self-join on `id`)
- **Date Column**: `app_notifications.time` — used for optional time-range filtering
- **No Parameters**: This report requires no user-supplied filters

## Transformations
- **No Reshape**: Single table, direct column mapping, no MELT or UNION_ALL required
- **No Computations**: All row tokens map directly to source columns
- **No Aggregations**: This is a detail report with no totals row

## Row Ordering
Rows are ordered by `app_notifications.id ASC` (natural insertion order).