## Executive Summary

This Water Quality Analysis Report presents a daily summary of analyser readings for water quality parameters at a treatment or monitoring facility. The report template renders one data row per sensor/parameter, displaying the parameter name, sensor identifier, minimum reading, maximum reading, average reading, and engineering unit over the requested date period. A compliance status line is shown in the report footer.

## Token Inventory

| Token | Type | Resolution | Source |
|---|---|---|---|
| start_date | Scalar | PARAM | User-supplied date range start |
| end_date | Scalar | PARAM | User-supplied date range end |
| compliance_status | Scalar | PARAM | Runtime-injected compliance result |
| row_parameter | Row | UNRESOLVED | No label column in catalog; requires static lookup keyed by field_key |
| row_sensor | Row | UNRESOLVED | No sensor-id display column in catalog; requires static map |
| row_min | Row | neuract__ANALYSER_TABLE.PH_101 | pH sensor channel 1 reading (override authoritative) |
| row_max | Row | neuract__ANALYSER_TABLE.PH_102 | pH sensor channel 2 reading (override authoritative) |
| row_avg | Row | neuract__ANALYSER_TABLE.PH_103 | pH sensor channel 3 reading (override authoritative) |
| row_unit | Row | UNRESOLVED | No engineering-unit column in catalog; requires static lookup |

## Mapping Notes

Per the authoritative `mapping_override`, `row_min`, `row_max`, and `row_avg` are mapped to `PH_101`, `PH_102`, and `PH_103` respectively — three distinct pH sensor channels displayed under the Min/Max/Avg column headings. This is a direct column-read pattern; the template column labels (Min, Max, Avg) are repurposed as display labels for three sensor channels rather than statistical aggregations. `row_parameter`, `row_sensor`, and `row_unit` have no resolvable source in the catalog and must be supplied via static lookup tables or runtime parameters.

## Join & Date Rules

- Primary table: `neuract__ANALYSER_TABLE` (self-join; no secondary table required)
- Date filter: `neuract__ANALYSER_TABLE.timestamp_utc` with optional range parameters `date_from` / `date_to`
- Scalar `start_date` / `end_date` are passed through directly as PARAM values for display in the report header

## Transformations

- No reshape (NONE strategy): PH_101, PH_102, PH_103 are read directly as row values without melting or pivoting
- pH readings formatted to 4 decimal places (domain precision requirement)
- `compliance_status` injected as a runtime PARAM and displayed in the footer compliance line

## Parameters

- **Required:** `start_date` (date), `end_date` (date)
- **Injected/Optional:** `compliance_status` (string), `row_parameter` (string), `row_sensor` (string), `row_unit` (string)

## Unresolved Tokens

`row_parameter`, `row_sensor`, `row_unit` — no label, sensor-ID, or engineering-unit column exists in the catalog. These must be supplied via static lookup tables keyed by `neuract__device_mappings.field_key`, hard-coded literals, or runtime parameters injected by the pipeline operator before template rendering.