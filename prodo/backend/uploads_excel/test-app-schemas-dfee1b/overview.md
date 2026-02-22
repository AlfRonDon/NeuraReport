# Contract Overview: Schemas Report

## Executive Summary
This report displays a simple list of all schemas from the `app_schemas` table. Each row shows the schema ID and name. The template references three additional tokens (`device_table_id`, `version`, `created_at`) that are not present in the `app_schemas` table and have been marked as UNRESOLVED per the mapping override.

## Token Inventory

| Token | Type | Mapped To | Notes |
|-------|------|-----------|-------|
| `row_id` | Row | `app_schemas.id` | Schema unique identifier |
| `row_name` | Row | `app_schemas.name` | Schema name |
| `row_device_table_id` | Row | UNRESOLVED | Not available in catalog |
| `row_version` | Row | UNRESOLVED | Not available in catalog |
| `row_created_at` | Row | UNRESOLVED | Not available in catalog |

## Join & Date Rules
- **Primary Table**: `app_schemas` (standalone, no joins required)
- **Date Filtering**: None — `app_schemas` has no timestamp columns
- **Row Ordering**: Default (ROWID)

## Transformations
No reshaping or computed columns required. Direct column mapping from `app_schemas`.

## Parameters
None required. No filters specified.