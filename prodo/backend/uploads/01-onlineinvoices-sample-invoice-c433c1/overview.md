# Invoice Report — Executive Summary

This contract generates a professional invoice PDF with company header, client details, itemized line items, and comprehensive totals including discounts, taxes, and shipping.

## Token Inventory

- **Scalars (20)**: Company and client information, invoice metadata, totals
- **Row Tokens (4)**: Line item details (description, quantity, unit price, total)
- **Totals (6)**: Subtotal, discount, subtotal less discount, tax, shipping, balance due

## Mapping Table

| Token | Source | Notes |
|-------|--------|-------|
| company_name | invoices.vendor_name | Vendor on invoice |
| company_address | UNRESOLVED | No vendor address in catalog |
| company_phone | UNRESOLVED | No vendor contact in catalog |
| company_email | UNRESOLVED | No vendor contact in catalog |
| invoice_date | invoices.issue_date | |
| invoice_number | invoices.invoice_number | |
| payment_terms | UNRESOLVED | Could compute from due_date - issue_date |
| client_name | customers.customer_name | |
| client_company | UNRESOLVED | No separate company field |
| client_address | customers.billing_address | |
| client_phone | customers.phone | |
| row_description | invoice_items.description | |
| row_qty | invoice_items.quantity | |
| row_unit_price | invoice_items.unit_price | |
| row_total | invoice_items.line_total | |
| remarks_text | invoices.notes | |
| subtotal | invoices.subtotal | SUM(line_total) |
| discount | invoices.discount_amount | |
| subtotal_less_discount | COMPUTED | subtotal - discount |
| tax_rate | COMPUTED | (tax_amount / subtotal) * 100 |
| total_tax | invoices.tax_amount | |
| shipping | UNRESOLVED | No shipping column |
| balance_due | invoices.total_amount | |

## Join & Date Rules

- **Parent**: invoices (invoice_number)
- **Child**: invoice_items (invoice_number)
- **Customer Lookup**: invoices.customer_id → customers.customer_id
- **Date Column**: invoices.issue_date
- **Ordering**: invoice_items.line_no ASC

## Transformations

1. **Subtotal Less Discount**: `subtotal - discount`
2. **Tax Rate**: `(tax_amount / subtotal) * 100`
3. **Totals**: SUM aggregations over line items

## Parameters

None required (report shows all invoices; could filter by invoice_number if needed).