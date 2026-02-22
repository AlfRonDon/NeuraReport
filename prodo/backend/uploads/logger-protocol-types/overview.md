# Protocol Types Report — Contract Overview

## Executive Summary
This report lists all supported communication protocol types from the `app_protocol_types` table. It is a simple enumeration report with a single repeating row token (`row_type`) and three header scalar tokens for the reporting period and generation timestamp. No joins, aggregations, or complex transformations are required.

## Token Inventory
| Token | Kind | Source |
|---|---|---|
| `date_from` | Scalar | PARAM:date_from (user-supplied) |
| `date_to` | Scalar | PARAM:date_to (user-supplied) |
| `generated_at` | Scalar | Server-generated constant at runtime |
| `row_type` | Row | app_protocol_types.type |

## Mapping Table
| Token | Mapped To | Notes |
|---|---|---|
| `date_from` | PARAM:date_from | Reporting period start, display only |
| `date_to` | PARAM:date_to | Reporting period end, display only |
| `generated_at` | PARAM:generated_at | Injected at runtime by server |
| `row_type` | app_protocol_types.type | Protocol type string (e.g. modbus, mqtt) |

## Join & Date Rules
- Single-table query on `app_protocol_types`; no join required.
- No date filtering on the table itself — `date_from`/`date_to` are display-only period labels passed as parameters.
- `generated_at` is a server-injected runtime timestamp, not stored in any catalog column.

## Transformations
- None required. Direct column read from `app_protocol_types.type`.

## Parameters
- `date_from` (required): Start of reporting period for display.
- `date_to` (required): End of reporting period for display.
- `generated_at` (required): Server-injected generation timestamp string.