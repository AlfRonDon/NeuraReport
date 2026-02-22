# Gateway Overview Report — Contract Overview

## Executive Summary
This report lists all network gateways with their connectivity details and status. Data is sourced entirely from the `app_gateways` table. The reporting period (date_from, date_to) is supplied by the user at run time; `generated_at` is injected by the report engine.

## Token Inventory
| Token | Kind | Source |
|---|---|---|
| date_from | scalar | PARAM:date_from (user-supplied) |
| date_to | scalar | PARAM:date_to (user-supplied) |
| generated_at | scalar | Engine-injected timestamp |
| row_name | row | app_gateways.name |
| row_host | row | app_gateways.host |
| row_protocol_hint | row | app_gateways.protocol_hint |
| row_status | row | app_gateways.status |
| row_created_at | row | app_gateways.created_at |
| row_updated_at | row | app_gateways.updated_at |

## Join & Date Rules
- Single table: `app_gateways` — no join required.
- Date columns: `app_gateways.created_at`, `app_gateways.updated_at`.
- Optional date filter: rows where `created_at` falls within [date_from, date_to] if the user provides those params.

## Transformations
- `row_created_at` and `row_updated_at` formatted as `dd-MM-YYYY HH:mm:ss`.
- No reshape needed (single flat table, no MELT or UNION_ALL).

## Parameters
- `date_from` — optional start of reporting period (date string).
- `date_to` — optional end of reporting period (date string).
- `generated_at` — injected by report engine (not a user parameter).