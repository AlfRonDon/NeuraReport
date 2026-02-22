# Invoice Report — Mapping Overview

## Executive Summary
This invoice report combines invoice header information, customer billing/shipping addresses, line item details, and financial totals. The report supports a single invoice with multiple line items, displaying subtotals, discounts, tax calculations, and final amounts.

## Token Inventory
- **Scalars (13)**: invoice_date, invoice_number, bill_to, ship_to, remarks, subtotal, discount, subtotal_less_discount, tax_rate, total_tax, shipping_handling, other, total
- **Row Tokens (2)**: row_description, row_total
- **Totals (0)**: None

## Mapping Table

| Token | Source | Type |
|-------|--------|------|
| invoice_date | invoices.issue_date | Direct |
| invoice_number | invoices.invoice_number | Direct |
| bill_to | Computed (concat: customer_name, billing_address, city, state, postal_code) | Computed |
| ship_to | Computed (concat: customer_name, billing_address, city, state, postal_code) | Computed |
| row_description | invoice_items.description | Direct |
| row_total | invoice_items.line_total | Direct |
| remarks | invoices.notes | Direct |
| subtotal | invoices.subtotal | Direct |
| discount | invoices.discount_amount | Direct |
| subtotal_less_discount | Computed (subtotal - discount) | Computed |
| tax_rate | Computed (tax_amount / subtotal) | Computed |
| total_tax | invoices.tax_amount | Direct |
| shipping_handling | Literal (0.00) | Literal |
| other | Literal (0.00) | Literal |
| total | invoices.total_amount | Direct |

## Join & Date Rules
- **Primary Join**: invoices ↔ invoice_items on invoice_number
- **Customer Join**: invoices ↔ customers on customer_id (for bill_to/ship_to)
- **Date Column**: invoices.issue_date (no filtering required)
- **Ordering**: invoice_items.line_no ASC

## Transformations
1. **bill_to / ship_to**: Concatenate customer name and full billing address with newlines
2. **subtotal_less_discount**: Subtract discount_amount from subtotal
3. **tax_rate**: Divide tax_amount by subtotal (formatted as percentage)
4. **shipping_handling / other**: Default to 0.00 (not present in data)

## Parameters
None — this template expects a specific invoice_number to be pre-filtered or passed externally.