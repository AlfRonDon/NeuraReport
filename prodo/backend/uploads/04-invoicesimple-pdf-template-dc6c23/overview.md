# Invoice Report — Mapping Contract Overview

## Executive Summary
This contract generates a professional invoice document with vendor/client details, itemized line items, and totals (subtotal, tax, balance due). The report pulls data from three primary tables: `invoices` (header metadata), `customers` (billing recipient), and `invoice_items` (line-level detail). Five tokens remain unresolved due to missing catalog columns (vendor email, vendor address lines, client address line 2, payment terms).

## Token Inventory
- **Scalars (13)**: invoice_date, invoice_number, from_company_name, from_email, from_address_1, from_address_2, to_client_name, to_email, to_address_1, to_address_2, terms, due_date, notes
- **Row Tokens (4)**: row_item_description, row_quantity, row_price, row_amount
- **Totals (3)**: subtotal, tax, balance_due

## Mapping Table

| Token | Source | Notes |
|-------|--------|-------|
| invoice_date | invoices.issue_date | Direct |
| invoice_number | invoices.invoice_number | Direct |
| from_company_name | invoices.vendor_name | Direct |
| from_email | UNRESOLVED | Vendor email not in catalog |
| from_address_1 | UNRESOLVED | Vendor address not in catalog |
| from_address_2 | UNRESOLVED | Vendor address line 2 not in catalog |
| to_client_name | customers.customer_name | Direct |
| to_email | customers.email | Direct |
| to_address_1 | customers.billing_address | Direct |
| to_address_2 | UNRESOLVED | Would need concat of city/state/postal/country |
| terms | UNRESOLVED | Payment terms not in catalog |
| due_date | invoices.due_date | Direct |
| notes | invoices.notes | Direct |
| row_item_description | invoice_items.description | Direct |
| row_quantity | invoice_items.quantity | Direct |
| row_price | invoice_items.unit_price | Direct |
| row_amount | invoice_items.line_total | Direct |
| subtotal | invoices.subtotal | Aggregate passthrough |
| tax | invoices.tax_amount | Aggregate passthrough |
| balance_due | invoices.total_amount | Aggregate passthrough |

## Join & Date Rules
- **Join**: invoices (parent) ← invoice_items (child) via `invoice_number`
- **Date Column**: invoices.issue_date
- **Ordering**: invoice_items.line_no ASC (logical line order)

## Transformations
No reshape rules required — schema is already normalized.

## Parameters
None required. All data sourced directly from tables.

## Notes
- Five tokens are unresolved due to missing vendor contact/address fields in the catalog. These would need to be added to a vendors table or passed as literal parameters in a production implementation.
- `to_address_2` could be resolved via concatenation of customers.city, customers.state, customers.postal_code, customers.country if needed.
- Totals (subtotal, tax, balance_due) are pre-aggregated in the `invoices` table and passed through directly.