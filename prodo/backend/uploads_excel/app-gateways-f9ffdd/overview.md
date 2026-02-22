# Gateways Report — Mapping Contract

## Executive Summary
This report displays all gateway records from the `app_gateways` table in a tabular format. Each row represents a single gateway with its configuration, status, and timestamp metadata. No aggregations, computations, or parameters are required.

## Token Inventory
- **Scalars**: 0 tokens
- **Row Tokens**: 10 tokens
- **Totals**: 0 tokens

## Mapping Table

| Token | Source | Type |
|-------|--------|------|
| row_id | app_gateways.id | Direct Column |
| row_name | app_gateways.name | Direct Column |
| row_host | app_gateways.host | Direct Column |
| row_adapter_id | app_gateways.adapter_id | Direct Column |
| row_nic_hint | app_gateways.nic_hint | Direct Column |
| row_protocol_hint | app_gateways.protocol_hint | Direct Column |
| row_status | app_gateways.status | Direct Column |
| row_created_at | app_gateways.created_at | Direct Column |
| row_updated_at | app_gateways.updated_at | Direct Column |
| row_last_test_at | app_gateways.last_test_at | Direct Column |

## Join & Date Rules
- **Primary Table**: app_gateways (self-join, no child table required)
- **Primary Key**: id
- **Date Column**: created_at (for filtering if needed)
- **Ordering**: id ASC (natural insertion order)

## Transformations
No reshape, unpivot, or MELT operations required. This is a straightforward single-table row listing.

## Parameters
None required. This report displays all gateway records without user-supplied filters.