# Metrics System Minute Report — Mapping Overview

## Executive Summary

This report displays system metrics aggregated by minute from the `app_metrics_system_minute` table. It provides a time-series view of CPU, memory, disk I/O, network I/O, and process-level resource utilization. No filtering, grouping, or aggregation is required—the report simply renders all rows from the metrics table ordered by timestamp.

## Token Inventory

- **Scalars**: 0 tokens
- **Row Tokens**: 10 tokens
- **Totals**: 0 tokens

## Mapping Table

| Token | Source Column | Notes |
|-------|---------------|-------|
| row_minute_utc | app_metrics_system_minute.minute_utc | Timestamp in UTC |
| row_cpu | app_metrics_system_minute.cpu | CPU utilization percentage |
| row_memory | app_metrics_system_minute.mem | Memory utilization percentage |
| row_disk_r_s | app_metrics_system_minute.disk_rps | Disk reads per second |
| row_disk_w_s | app_metrics_system_minute.disk_wps | Disk writes per second |
| row_net_rx_s | app_metrics_system_minute.net_rxps | Network receive packets/sec |
| row_net_tx_s | app_metrics_system_minute.net_txps | Network transmit packets/sec |
| row_proc_cpu | app_metrics_system_minute.proc_cpu | Process-level CPU percentage |
| row_proc_rss_mb | app_metrics_system_minute.proc_rss_mb | Process RSS in megabytes |
| row_proc_handles | app_metrics_system_minute.proc_handles | Process handle count |

## Join & Date Rules

- **Primary Table**: app_metrics_system_minute
- **Join Strategy**: Single-table report; no joins required
- **Date Column**: app_metrics_system_minute.minute_utc
- **Ordering**: minute_utc ASC (chronological)

## Transformations

- No reshaping, unpivoting, or computed columns required
- All metrics are captured as-is from the source table

## Parameters

No required or optional parameters. This report can optionally be filtered by date range at runtime if needed.