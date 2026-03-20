# Consumption Report Contract

## Executive Summary
This report displays material consumption data for a recipe-based batching system. The report requires **unpivoting** 12 bin columns (content, setpoint, actual) from a single recipe row into multiple detail rows, one per bin. Computed fields calculate error (achieved - set) and error percentage. Totals aggregate across all bins.

## Token Inventory
**Scalars (9):** plant_name, location, from_date, to_date, print_date, recipe_code, company_name, page_number, total_pages  
**Row Tokens (6):** row_sl_no, row_material_name, row_set_wt, row_ach_wt, row_error_kg, row_error_pct  
**Totals (4):** total_set_wt, total_ach_wt, total_error_kg, total_error_pct

## Mapping Table
| Token | Source | Notes |
|-------|--------|-------|
| plant_name | PARAM:plant_name | User-provided |
| location | PARAM:location | User-provided |
| from_date | PARAM:from_date | User-provided |
| to_date | PARAM:to_date | User-provided |
| print_date | PARAM:print_date | User-provided |
| recipe_code | recipes.recipe_name | Selected recipe |
| company_name | PARAM:company_name | Constant |
| page_number | PARAM:page_number | Pagination |
| total_pages | PARAM:total_pages | Pagination |
| row_sl_no | (computed) | Sequential numbering 1..N |
| row_material_name | recipes.bin{N}_content | Unpivoted |
| row_set_wt | recipes.bin{N}_sp | Unpivoted |
| row_ach_wt | recipes.bin{N}_act | Unpivoted |
| row_error_kg | (computed) | row_ach_wt - row_set_wt |
| row_error_pct | (computed) | row_error_kg / row_set_wt |
| total_set_wt | (aggregate) | sum(row_set_wt) |
| total_ach_wt | (aggregate) | sum(row_ach_wt) |
| total_error_kg | (aggregate) | sum(row_error_kg) |
| total_error_pct | (computed) | total_error_kg / total_set_wt |

## Join & Date Rules
- **Primary Table:** recipes
- **No joins required** (single-table unpivot)
- **Date Column:** recipes.start_time (for filtering from_date to to_date)
- **Filter Semantics:** Recipe must fall within user-specified date range

## Transformations
1. **MELT Operation:** Unpivot 12 bin triplets (bin1_content + bin1_sp + bin1_act, ..., bin12_content + bin12_sp + bin12_act) into rows with columns: material_name, set_wt, ach_wt
2. **Row Enumeration:** Generate row_sl_no as sequential 1-based index
3. **Row Computed Fields:**
   - row_error_kg = subtract(row_ach_wt, row_set_wt)
   - row_error_pct = divide(row_error_kg, row_set_wt)
4. **Totals Aggregation:**
   - total_set_wt = sum(row_set_wt)
   - total_ach_wt = sum(row_ach_wt)
   - total_error_kg = sum(row_error_kg)
   - total_error_pct = divide(total_error_kg, total_set_wt)

## Parameters
**Required:**
- from_date (date): Start of date range filter
- to_date (date): End of date range filter
- plant_name (string): Plant identifier
- location (string): Location identifier
- print_date (string): Report generation date

**Optional:**
- company_name (string): Defaults to "Indian Industrial Machines Pvt. Ltd."
- page_number (integer): Defaults to 1
- total_pages (integer): Defaults to 1