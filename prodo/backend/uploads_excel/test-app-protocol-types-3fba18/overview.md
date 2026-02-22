# Protocol Types Report - Mapping Contract

## Executive Summary
This report displays all available protocol types from the application's protocol registry. It is a simple single-column report with no filters, no totals, and no transformations.

## Token Inventory
- **Scalars**: 0 tokens
- **Row Tokens**: 1 token (`row_type`)
- **Totals**: 0 tokens

## Mapping Table

| Token | Source | Type |
|-------|--------|------|
| row_type | app_protocol_types.type | Row |

## Join & Date Rules
- **Primary Table**: `app_protocol_types`
- **Primary Key**: `type`
- **Join Strategy**: Single-table report (self-join)
- **Date Filtering**: None (no date columns in this table)

## Transformations
No reshape, compute, or aggregate operations required.

## Parameters
No parameters required or supported.

## Notes
The `app_protocol_types` table contains exactly 1 column and serves as a simple lookup registry. The report will list all protocol types (e.g., 'modbus', 'opcua', etc.) available in the system.