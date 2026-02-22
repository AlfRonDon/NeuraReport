# Device Tables Report - Mapping Overview

## Executive Summary
This report provides a comprehensive listing of all device tables tracked in the system, displaying their current status, associated devices, schemas, and database targets. All row tokens directly map to columns from the `app_device_tables` table without requiring any reshaping, joins, or computed transformations.

## Token Inventory
- **Scalar Tokens**: 0
- **Row Tokens**: 7 (all device table attributes)
- **Totals Tokens**: 0

## Mapping Table

| Token                    | Source Column                        | Type   |
|--------------------------|--------------------------------------|--------|
| row_table_name           | app_device_tables.name               | Direct |
| row_device_id            | app_device_tables.device_id          | Direct |
| row_schema_id            | app_device_tables.schema_id          | Direct |
| row_db_target_id         | app_device_tables.db_target_id       | Direct |
| row_status               | app_device_tables.status             | Direct |
| row_mapping_health       | app_device_tables.mapping_health     | Direct |
| row_last_migrated_at     | app_device_tables.last_migrated_at   | Direct |

## Join & Date Rules
- **Primary Table**: app_device_tables (self-join, no child table required)
- **Date Column**: app_device_tables.last_migrated_at
- **No Filters**: This report returns all device tables without user-defined filter parameters

## Transformations
- **Reshape**: None required (simple tabular report)
- **Computed Columns**: None
- **Aggregations**: None

## Parameters
- **Required**: None
- **Optional**: None

This is a straightforward enumeration report with 100% token coverage and no unresolved mappings.