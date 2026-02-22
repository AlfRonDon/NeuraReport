# System Metrics Report — Contract Overview

## Executive Summary
This report renders per-minute system telemetry from the `app_metrics_system_minute` table. Each row represents one UTC minute of CPU, memory, disk, and network usage along with process-level metrics. The reporting period is bounded by user-supplied `date_from` and `date_to` parameters. `generated_at` is injected at runtime as a system scalar (not stored in the database).

## Token Inventory
| Token | Kind | Source |
|---|---|---|
| date_from | scalar | PARAM:date_from |
| date_to | scalar | PARAM:date_to |
| generated_at | scalar | PARAM:generated_at (runtime injection) |
| row_minute_utc | row | app_metrics_system_minute.minute_utc |
| row_cpu | row | app_metrics_system_minute.cpu |
| row_mem | row | app_metrics_system_minute.mem |
| row_disk_rps | row | app_metrics_system_minute.disk_rps |
| row_disk_wps | row | app_metrics_system_minute.disk_wps |
| row_net_rxps | row | app_metrics_system_minute.net_rxps |
| row_net_txps | row | app_metrics_system_minute.net_txps |
| row_proc_cpu | row | app_metrics_system_minute.proc_cpu |
| row_proc_rss_mb | row | app_metrics_system_minute.proc_rss_mb |
| row_proc_handles | row | app_metrics_system_minute.proc_handles |

## Join & Date Rules
- Single table: `app_metrics_system_minute` (self-join).
- Filter rows where `minute_utc` falls within `[date_from, date_to]` inclusive.
- Order rows by `minute_utc ASC`.

## Transformations
- No reshape needed — direct column-to-token mapping, NONE strategy.
- `generated_at` must be injected as a runtime system parameter (current timestamp at generation time).

## Parameters
- `date_from` (required, date): start of reporting window.
- `date_to` (required, date): end of reporting window.
- `generated_at` (required, string): runtime timestamp string injected by the report runner.