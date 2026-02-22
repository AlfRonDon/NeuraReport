# System Metrics Report - Mapping Overview

## Executive Summary
This report displays time-series system performance metrics collected at one-minute intervals. The report shows CPU usage, memory consumption, disk I/O rates, network traffic, and process-level resource consumption. All data is sourced from the `app_metrics_system_minute` table with no filtering, aggregation, or reshaping required.

## Token Inventory
- **Scalars**: 0 (no header parameters)
- **Row Tokens**: 10 (all metric columns)
- **Totals**: 0 (no aggregations)

## Mapping Table

| Token | Source Column | Type |
|-------|---------------|------|
| row_minute_utc | app_metrics_system_minute.minute_utc | Timestamp |
| row_cpu | app_metrics_system_minute.cpu | Numeric |
| row_mem | app_metrics_system_minute.mem | Numeric |
| row_disk_rps | app_metrics_system_minute.disk_rps | Numeric |
| row_disk_wps | app_metrics_system_minute.disk_wps | Numeric |
| row_net_rxps | app_metrics_system_minute.net_rxps | Numeric |
| row_net_txps | app_metrics_system_minute.net_txps | Numeric |
| row_proc_cpu | app_metrics_system_minute.proc_cpu | Numeric |
| row_proc_rss_mb | app_metrics_system_minute.proc_rss_mb | Numeric |
| row_proc_handles | app_metrics_system_minute.proc_handles | Numeric |

## Join & Date Rules
- **Primary Table**: app_metrics_system_minute
- **Join Strategy**: Single table, no joins required
- **Primary Key**: minute_utc (timestamp)
- **Date Column**: minute_utc (used for chronological ordering)

## Transformations
- **Reshape**: None required (direct column mapping)
- **Computed Columns**: None
- **Aggregations**: None

## Parameters
- **Required**: None
- **Optional**: None (full table scan, could add date range filters in future)

## Ordering
- Rows sorted by `minute_utc ASC` for chronological display