# Consumption Report Contract

## Executive Summary
This report presents material consumption data for a manufacturing recipe, comparing set weights against achieved weights across multiple bins. The report requires **MELT (unpivot)** transformation to convert 12 bin columns (bin1–bin12) for material names, set weights, and achieved weights into a normalized row-per-material format. Computed fields calculate error metrics, and totals aggregate across all materials.

## Token Inventory

### Scalars (8)
- `plant_name`, `location`, `from_date`, `to_date`, `print_date`, `recipe_code`, `company_name`, `page_info`

### Row Tokens (6)
- `row_sl_no`, `row_material_name`, `row_set_wt`, `row_ach_wt`, `row_error`, `row_error_pct`

### Totals (4)
- `total_set_wt`, `total_ach_wt`, `total_error`, `total_error_pct`

## Mapping Table

| Token | Source | Type |
|-------|--------|------|
| `plant_name` | PARAM:plant_name | Scalar |
| `location` | PARAM:location | Scalar |
| `from_date` | PARAM:from_date | Scalar |
| `to_date` | PARAM:to_date | Scalar |
| `print_date` | PARAM:print_date | Scalar |
| `recipe_code` | PARAM:recipe_code | Scalar |
| `company_name` | CONSTANT | Scalar |
| `page_info` | PARAM:page_info | Scalar |
| `row_sl_no` | computed (row_number) | Row |
| `row_material_name` | MELT(bin1–12_content) | Row |
| `row_set_wt` | MELT(bin1–12_sp) | Row |
| `row_ach_wt` | MELT(bin1–12_act) | Row |
| `row_error` | subtract(row_ach_wt, row_set_wt) | Row |
| `row_error_pct` | divide(row_error, row_set_wt) | Row |
| `total_set_wt` | sum(row_set_wt) | Total |
| `total_ach_wt` | sum(row_ach_wt) | Total |
| `total_error` | sum(row_error) | Total |
| `total_error_pct` | divide(total_error, total_set_wt) | Total |

## Join & Date Rules

- **Primary Table**: `recipes`
- **Date Filter**: `recipes.start_time` (filtered by from_date/to_date parameters)
- **Recipe Filter**: `recipes.recipe_name` matches `recipe_code` parameter
- **No Joins**: Single-table source

## Transformations

### 1. MELT Reshape (Unpivot 12 Bins)
Convert wide-format bin columns into long format:
- **Material Names**: bin1_content → bin12_content → `material_name`
- **Set Weights**: bin1_sp → bin12_sp → `set_wt`
- **Achieved Weights**: bin1_act → bin12_act → `ach_wt`

### 2. Computed Fields (Declarative Operations)
- **row_sl_no**: Row numbering (1-based sequential)
- **row_error**: `subtract(ach_wt, set_wt)`
- **row_error_pct**: `divide(row_error, set_wt)`

### 3. Totals (Aggregations)
- **total_set_wt**: `sum(set_wt)`
- **total_ach_wt**: `sum(ach_wt)`
- **total_error**: `sum(row_error)`
- **total_error_pct**: `divide(total_error, total_set_wt)`

### 4. Ordering
Rows ordered by `material_name ASC` (alphabetical material listing)

## Parameters

### Required
- `plant_name` (string): Plant identifier
- `location` (string): Plant location
- `from_date` (date): Start of date range
- `to_date` (date): End of date range
- `recipe_code` (string): Recipe name filter
- `print_date` (date): Report generation timestamp
- `page_info` (string): Pagination metadata

### Optional
None

## Domain Notes
- Empty/null bin content values should be excluded from final output
- Error percentages formatted as decimals (e.g., 0.0271 for 2.71%)
- Weights formatted with 2 decimal places and thousand separators