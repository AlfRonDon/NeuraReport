# Device Tables Report — Mapping Contract Overview

## Executive Summary
This report displays a flat listing of all device tables from the `app_device_tables` table. Each row represents a single device table with its metadata including ID, name, schema reference, database target, migration status, and health indicators.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 9 (id, name, schema_id, db_target_id, status, last_migrated_at, schema_hash, mapping_health, device_id)
- **Totals**: None

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| row_id | app_device_tables.id | Direct |
| row_name | app_device_tables.name | Direct |
| row_schema_id | app_device_tables.schema_id | Direct |
| row_db_target_id | app_device_tables.db_target_id | Direct |
| row_status | app_device_tables.status | Direct |
| row_last_migrated_at | app_device_tables.last_migrated_at | Direct |
| row_schema_hash | app_device_tables.schema_hash | Direct |
| row_mapping_health | app_device_tables.mapping_health | Direct |
| row_device_id | app_device_tables.device_id | Direct |

## Join & Date Rules
- **Primary Table**: app_device_tables
- **Join Strategy**: Single-table query (no joins required)
- **Date Column**: app_device_tables.last_migrated_at (timestamp for time-range filtering)
- **Key**: app_device_tables.id

## Transformations
- **Reshape**: None (flat single-table structure)
- **Computed Columns**: None
- **Aggregations**: None

## Parameters
- **Required**: None
- **Optional**: None (future: could add status filter, device_id filter)

## Ordering
- Default: by ROWID (insertion order)
- Alternative: by last_migrated_at DESC for most-recent-first