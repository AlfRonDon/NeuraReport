# Batch Report Contract - DataFrame Pipeline

## Executive Summary
This report displays batch manufacturing data organized by batches, showing material dispensing details with set weights, achieved weights, errors, and deviation durations. The report includes:
- Page-level header information (plant, location, recipe, part description, shift)
- Repeating batch blocks with batch-level metadata
- Material detail rows within each batch
- Totals row per batch summarizing weights, errors, and deviation duration

## Token Inventory
### Scalars (9 tokens)
- plant_name, report_date, location, recipe_name, part_description, shift_number
- footer_company, page_number, total_pages

### Row Tokens (7 tokens)
- row_bth_no, row_material_name, row_set_wt, row_ach_wt, row_error, row_error_pct, row_deviate_dur

### Totals (5 tokens)
- total_set_wt, total_ach_wt, total_error, total_error_pct, total_deviate_dur

### Block-Level Batch Metadata (17 tokens)
- batch_number, batch_date, shift_no, recipe_name_batch, recipe_code
- scale_1, scale_2, man1_value, man2_value
- start_time_1, start_time_2, date_scr_1, date_scr_2

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| plant_name | PARAM:plant_name | Parameter |
| report_date | PARAM:report_date | Parameter |
| location | PARAM:location | Parameter |
| recipe_name | PARAM:recipe_name | Parameter |
| part_description | PARAM:part_description | Parameter |
| shift_number | PARAM:shift_number | Parameter |
| footer_company | PARAM:footer_company | Parameter |
| page_number | PARAM:page_number | Parameter |
| total_pages | PARAM:total_pages | Parameter |
| row_bth_no | recipes.rowid | Direct (reshaped) |
| row_material_name | recipes.bin{N}_content | MELT reshape |
| row_set_wt | recipes.bin{N}_sp | MELT reshape |
| row_ach_wt | recipes.bin{N}_act | MELT reshape |
| row_error | Computed | subtract(ach_wt, set_wt) |
| row_error_pct | Computed | divide(error, set_wt) * 100 |
| row_deviate_dur | UNRESOLVED | Not in catalog |
| total_set_wt | Computed | sum(row_set_wt) |
| total_ach_wt | Computed | sum(row_ach_wt) |
| total_error | Computed | sum(row_error) |
| total_error_pct | Computed | divide(total_error, total_set_wt) * 100 |
| total_deviate_dur | Computed | sum(row_deviate_dur) |

## Join & Date Rules
- **Primary table**: recipes
- **No joins required**: Single table with wide bin columns
- **Date columns**: recipes.start_time, recipes.end_time
- **Filter semantics**: Optional filters on recipe_name, date range

## Transformations
### MELT Reshape (bins 1-12)
The recipes table contains 12 bin columns in wide format:
- bin{1..12}_content (material names)
- bin{1..12}_sp (set point weights)
- bin{1..12}_act (actual weights)

These must be melted into rows where each bin becomes a material row with columns:
- bin_number (1-12)
- material_name (from bin{N}_content)
- set_wt (from bin{N}_sp)
- ach_wt (from bin{N}_act)

### Computed Fields (Declarative)
- **row_error**: subtract operation (ach_wt - set_wt)
- **row_error_pct**: divide operation (error / set_wt) with percentage formatting
- **row_deviate_dur**: UNRESOLVED (not in catalog)

### Totals (Declarative Aggregations)
- **total_set_wt**: sum aggregation over row_set_wt
- **total_ach_wt**: sum aggregation over row_ach_wt
- **total_error**: sum aggregation over row_error
- **total_error_pct**: divide operation (total_error / total_set_wt) * 100
- **total_deviate_dur**: sum aggregation over row_deviate_dur (if available)

## Parameters
### Required
- plant_name (string)
- report_date (date)
- location (string)
- recipe_name (string)
- part_description (string)
- shift_number (string)

### Optional
- footer_company (string, default: "")
- page_number (integer, default: 1)
- total_pages (integer, default: 1)