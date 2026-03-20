# Batch Report Contract Overview

## Executive Summary
This report displays batching operations with **repeating batch blocks**, each showing material dispensing from up to 12 bins. The template uses a BLOCK_REPEAT directive around batch metadata and a detail table. The core challenge is **unpivoting** 12 wide bin columns (bin1_content through bin12_content, bin1_sp through bin12_sp, bin1_act through bin12_act) into narrow row format, computing error metrics, and aggregating totals per batch.

**Key Transformations:**
- MELT reshape: bin1–12 content/SP/ACT → rows with bin_number, material_name, set_wt_kg, act_wt_kg
- Row-level computed fields: error_kg (subtract), error_pct (divide + multiply)
- Totals: sum set_wt, sum act_wt, sum error_kg; computed total_error_pct from totals
- Multi-value tokens (scale_1, scale_2, start_time_1, start_time_2, date_sec_1, date_sec_2) remain UNRESOLVED (no catalog source)
- Batch grouping tokens (batch_no, recipe_code, recipe_no, batch_date) remain UNRESOLVED (no catalog source)

## Token Inventory
**Scalars (8):** plant_name, location, print_date, report_date, recipe_name_header, shift_no, page_number, total_pages  
**Row tokens (7):** row_bth_no, row_material_name, row_set_wt_kg, row_act_wt_kg, row_error_kg, row_error_pct, row_deviate_dur_sec  
**Totals (5):** total_set_wt_kg, total_act_wt_kg, total_error_kg, total_error_pct, total_deviate_dur_sec  
**Block tokens (15, not in schema but in template):** batch_no, scale_1, scale_2, batch_date, start_time_1, start_time_2, shift_no_batch, date_sec_1, date_sec_2, recipe_name, recipe_code, recipe_no (these are UNRESOLVED)

## Mapping Table
| Token | Source | Notes |
|-------|--------|-------|
| plant_name | PARAM:plant_name | User-supplied header |
| location | PARAM:location | User-supplied header |
| print_date | PARAM:print_date | User-supplied header |
| report_date | PARAM:report_date | User-supplied header |
| recipe_name_header | recipes.recipe_name | From main recipe table |
| shift_no | PARAM:shift_no | User-supplied header |
| page_number | PARAM:page_number | Pagination (LATER_SELECTED in override, treating as PARAM) |
| total_pages | PARAM:total_pages | Pagination |
| row_bth_no | computed | Sequential bin number 1–12 from reshape |
| row_material_name | recipes.bin{N}_content | Melted from bin1_content…bin12_content |
| row_set_wt_kg | recipes.bin{N}_sp | Melted from bin1_sp…bin12_sp |
| row_act_wt_kg | recipes.bin{N}_act | Melted from bin1_act…bin12_act |
| row_error_kg | computed | subtract(act_wt_kg, set_wt_kg) |
| row_error_pct | computed | divide(error_kg, set_wt_kg) × 100 |
| row_deviate_dur_sec | UNRESOLVED | No catalog column for deviation duration |
| total_set_wt_kg | computed | sum(row_set_wt_kg) |
| total_act_wt_kg | computed | sum(row_act_wt_kg) |
| total_error_kg | computed | sum(row_error_kg) |
| total_error_pct | computed | divide(total_error_kg, total_set_wt_kg) × 100 |
| total_deviate_dur_sec | UNRESOLVED | sum not possible without row source |
| batch_no | UNRESOLVED | Batch identifier not in catalog |
| scale_1 | UNRESOLVED | Scale name not in catalog |
| scale_2 | UNRESOLVED | Scale name not in catalog |
| batch_date | UNRESOLVED | Date field not in catalog |
| start_time_1 | UNRESOLVED | Start time not in catalog |
| start_time_2 | UNRESOLVED | Start time not in catalog |
| shift_no_batch | PARAM:shift_no | Re-use header shift_no |
| date_sec_1 | UNRESOLVED | Duration in seconds not in catalog |
| date_sec_2 | UNRESOLVED | Duration in seconds not in catalog |
| recipe_name | recipes.recipe_name | Same as header |
| recipe_code | UNRESOLVED | Recipe code not in catalog |
| recipe_no | UNRESOLVED | Recipe number not in catalog |

## Join & Date Rules
- **Single table:** recipes (no child table, no join)
- **Date column:** recipes.start_time (if filtering by date range)
- **No explicit join:** all data from one wide recipes row per batch
- **Filters:** Optional filter by recipe_name, shift_no (via params)

## Transformations
1. **MELT reshape (bin1–12 → rows):**
   - Unpivot bin1_content, bin2_content, …, bin12_content → material_name
   - Unpivot bin1_sp, bin2_sp, …, bin12_sp → set_wt_kg
   - Unpivot bin1_act, bin2_act, …, bin12_act → act_wt_kg
   - Generate bin_number column (1, 2, …, 12) for row_bth_no
   - Purpose: Convert 12 wide bin columns into 12 narrow rows per recipe batch

2. **Row-level computed fields:**
   - row_error_kg = subtract(row_act_wt_kg, row_set_wt_kg)
   - row_error_pct = divide(row_error_kg, row_set_wt_kg) then multiply by 100

3. **Totals aggregation:**
   - total_set_wt_kg = sum(row_set_wt_kg)
   - total_act_wt_kg = sum(row_act_wt_kg)
   - total_error_kg = sum(row_error_kg)
   - total_error_pct = divide(total_error_kg, total_set_wt_kg) × 100

4. **Ordering:**
   - Rows ordered by bin_number ASC (1–12 sequential)

5. **Formatting:**
   - Numeric columns: 2 decimals for weights, 2 decimals for percentages

## Parameters
**Required:**
- plant_name (string)
- location (string)
- print_date (date, format DD/MM/YYYY)
- report_date (date, format DD/MM/YYYY)
- shift_no (string)
- total_pages (integer)

**Optional:**
- Filter by recipe_name (exact match)
- Filter by date range on recipes.start_time

## Unresolved Tokens (22)
The following tokens have no catalog source and will render as empty unless additional tables are provided:
- batch_no, scale_1, scale_2, batch_date, start_time_1, start_time_2, date_sec_1, date_sec_2, recipe_code, recipe_no (batch metadata)
- row_deviate_dur_sec, total_deviate_dur_sec (deviation duration)

## Domain Notes
- This is a **batch dispensing report** for a recipe execution system.
- Each recipe has 12 bins; not all bins may be used (empty bins will have null content/SP/ACT).
- The reshape should filter out rows where material_name is null or empty.
- Error % = (Actual - Setpoint) / Setpoint × 100 (can be positive or negative).
- The template uses BLOCK_REPEAT for multiple batches, but the catalog shows only one recipes table. The downstream pipeline must handle iteration over multiple recipe rows if generating multi-batch reports.