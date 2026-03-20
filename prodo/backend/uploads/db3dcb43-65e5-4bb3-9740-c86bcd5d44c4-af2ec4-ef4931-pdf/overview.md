## Batch Consolidation Report

- Counts how many batches (rows in recipes) exist per recipe_name within the requested date range.
- Header echoes the selected plant/location/date range plus optional recipe code filter and print date.
- Rows list recipe name/code, the earliest recipe id (recipe no), and the batch count; totals sum the batch counts.
- Key token row_recipe_code maps to recipes.recipe_name so Find Reports and dropdown filters work from the DB directly.
