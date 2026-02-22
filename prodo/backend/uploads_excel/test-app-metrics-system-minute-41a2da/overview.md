# Metrics System Minute Report

## Executive Summary
This report displays system performance metrics captured per minute, including CPU, memory, disk I/O, network I/O, and process-specific resource utilization. All data originates from the `app_metrics_system_minute` table with no aggregations or computations required.

## Token Inventory

### Row Tokens (10)
- `row_minute_utc` — Timestamp of the measurement (UTC)
- `row_cpu` — System CPU utilization
- `row_mem` — System memory utilization
- `row_disk_rps` — Disk reads per second
- `row_disk_wps` — Disk writes per second
- `row_net_rxps` — Network receive packets per second
- `row_net_txps` — Network transmit packets per second
- `row_proc_cpu` — Process-specific CPU utilization
- `row_proc_rss_mb` — Process resident set size (MB)
- `row_proc_handles` — Process handle count

### Scalar Tokens
None

### Totals Tokens
None

## Mapping Table

| Token | Source Column | Type |
|-------|---------------|------|
| row_minute_utc | app_metrics_system_minute.minute_utc | Direct |
| row_cpu | app_metrics_system_minute.cpu | Direct |
| row_mem | app_metrics_system_minute.mem | Direct |
| row_disk_rps | app_metrics_system_minute.disk_rps | Direct |
| row_disk_wps | app_metrics_system_minute.disk_wps | Direct |
| row_net_rxps | app_metrics_system_minute.net_rxps | Direct |
| row_net_txps | app_metrics_system_minute.net_txps | Direct |
| row_proc_cpu | app_metrics_system_minute.proc_cpu | Direct |
| row_proc_rss_mb | app_metrics_system_minute.proc_rss_mb | Direct |
| row_proc_handles | app_metrics_system_minute.proc_handles | Direct |

## Join & Date Rules

- **Parent Table**: `app_metrics_system_minute`
- **Join Strategy**: Single-table report (self-join on primary key)
- **Date Column**: `app_metrics_system_minute.minute_utc` — filters rows by time range
- **Ordering**: `minute_utc DESC` (most recent metrics first)

## Transformations
No reshape rules, computations, or aggregations required. This is a straightforward tabular export of time-series metrics data.

## Parameters
No required or optional parameters. All filtering is time-range based via the date column.