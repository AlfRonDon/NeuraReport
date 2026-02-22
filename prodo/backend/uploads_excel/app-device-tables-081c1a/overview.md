# Device Tables Report - Mapping Contract

## Executive Summary
This report displays all device table records from the `app_device_tables` table. It shows metadata about tables associated with devices, including schema associations, migration status, and health metrics. This is a simple direct mapping with no parameters, filters, or computed fields.

## Token Inventory
- **Scalars**: None
- **Row Tokens**: 9 fields (id, name, schema_id, db_target_id, status, last_migrated_at, schema_hash, mapping_health, device_id)
- **Totals**: None

## Mapping Table
| Token | Source Column | Type |
|-------|--------------|------|
| row_id | app_device_tables.id | Direct |
| row_name | app_device_tables.name | Direct |
| row_schema_id | app_device_tables.schema_id | Direct |
| row_db_target_id | app_device_tables.db_target_id | Direct |
| row_status | app_device_tables.status | Direct |
| row_last_migrated_at | app_device_tables.last_migrated_at | Direct (Timestamp) |
| row_schema_hash | app_device_tables.schema_hash | Direct |
| row_mapping_health | app_device_tables.mapping_health | Direct |
| row_device_id | app_device_tables.device_id | Direct |

## Join & Date Rules
- **Primary Table**: app_device_tables
- **Join Strategy**: Single-table scan (self-join on id)
- **Date Column**: last_migrated_at
- **Filters**: None

## Transformations
- No reshape rules required (single table, direct mapping)
- No computed fields
- No aggregations

## Parameters
- **Required**: None
- **Optional**: None

## Notes
This is a straightforward catalog/inventory report with no business logic or transformations.