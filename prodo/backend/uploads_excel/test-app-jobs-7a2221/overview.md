# Jobs Report — Mapping Contract

## Executive Summary
This report displays all data acquisition jobs in the system, showing their configuration, operational status, and runtime metrics. Each row represents a single job with its associated device table, polling interval, protocol, and execution history.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 13 (id, name, device_table_id, schema_id, gateway_id, interval_sec, protocol, enabled, status, last_run_at, error_count, created_at, updated_at)
- **Totals**: None

## Mapping Table

| Token | Source | Notes |
|-------|--------|-------|
| row_id | app_jobs.id | Direct mapping |
| row_name | app_jobs.name | Direct mapping |
| row_device_table_id | Computed | Extract first element from tables_json array |
| row_schema_id | app_device_tables.schema_id | Via LEFT JOIN on device_table_id |
| row_gateway_id | app_devices.gateway_id | Via device_tables → devices chain |
| row_interval_sec | Computed | Convert interval_ms ÷ 1000 |
| row_protocol | app_devices.protocol | Via device_tables → devices chain |
| row_enabled | app_jobs.enabled | Direct mapping |
| row_status | app_jobs.status | Direct mapping |
| row_last_run_at | Computed | MAX(started_at) from app_job_runs |
| row_error_count | Computed | SUM(count) from app_job_errors_minute |
| row_created_at | app_gateways.created_at | Proxy via gateway (jobs table lacks created_at) |
| row_updated_at | app_gateways.updated_at | Proxy via gateway (jobs table lacks updated_at) |

## Join & Date Rules
- **Parent Table**: app_jobs (primary entity)
- **Parent Key**: id
- **Child Table**: app_job_runs (for last_run_at aggregation)
- **Child Key**: job_id
- **Date Columns**: 
  - app_job_runs: started_at (for time-range filtering on execution history)
  - app_gateways: created_at (for gateway timestamp context)

## Transformations
1. **Extract Device Table ID**: Parse first element from app_jobs.tables_json JSON array
2. **Interval Conversion**: Divide app_jobs.interval_ms by 1000 to get seconds
3. **Last Run Aggregation**: MAX(started_at) from app_job_runs grouped by job_id
4. **Error Count Aggregation**: SUM(count) from app_job_errors_minute grouped by job_id
5. **Multi-table Join**: app_jobs → app_device_tables → app_devices → app_gateways for schema_id, gateway_id, protocol, timestamps

## Parameters
None required. All tokens are direct mappings or computed from available data sources.