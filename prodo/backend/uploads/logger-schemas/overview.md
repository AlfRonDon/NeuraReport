# Schema Registry Report — Contract Overview

## Executive Summary
This report lists all registered data schemas from the `app_schemas` table. It is a simple listing report with two row-level tokens (`row_id`, `row_name`) and three scalar header tokens (`date_from`, `date_to`, `generated_at`). There are no totals, no aggregations, and no joins required.

## Token Inventory
| Token | Kind | Source |
|---|---|---|
| date_from | Scalar | PARAM:date_from |
| date_to | Scalar | PARAM:date_to |
| generated_at | Scalar | PARAM:generated_at |
| row_id | Row | app_schemas.id |
| row_name | Row | app_schemas.name |

## Mapping Table
| Token | Mapping | Notes |
|---|---|---|
| date_from | PARAM:date_from | User-supplied reporting period start |
| date_to | PARAM:date_to | User-supplied reporting period end |
| generated_at | PARAM:generated_at | Report generation timestamp |
| row_id | app_schemas.id | Schema unique identifier |
| row_name | app_schemas.name | Schema display name |

## Join & Data Rules
- Single table: `app_schemas` — no join required.
- No date filtering is applied to `app_schemas` (it has no date column).
- `date_from`, `date_to`, `generated_at` are display-only parameters passed through from the user.

## Transformations
- No reshape required — direct column projection from `app_schemas`.

## Parameters
- `date_from` (string/date): Reporting period start — display only.
- `date_to` (string/date): Reporting period end — display only.
- `generated_at` (string): Report generation timestamp — display only.