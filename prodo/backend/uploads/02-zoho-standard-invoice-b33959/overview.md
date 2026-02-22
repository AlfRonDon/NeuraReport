# Invoice Report Mapping Contract

## Executive Summary
This invoice template generates a comprehensive billing document with customer details, line items, tax calculations, and payment tracking. The report combines data from invoices, customers, invoice items, and payments tables to produce a complete invoice with computed balance and tax amounts.

## Token Inventory
- **Scalars (26)**: Company info (4 constants), invoice metadata (12), totals section (10)
- **Row Tokens (7)**: Item line details with quantities, rates, discounts, and amounts
- **Totals (0)**: None (totals are scalar tokens)

## Mapping Table

| Token | Source | Type |
|-------|--------|------|
| invoice_number | invoices.invoice_number | Direct |
| balance_due | Computed: total - payment_made | Computed |
| bill_to_name | customers.customer_name | Direct |
| bill_to_address_line1 | customers.billing_address | Direct |
| bill_to_address_line2 | Computed: city + state | Computed |
| bill_to_address_line3 | Computed: postal_code + state | Computed |
| bill_to_country | customers.country | Direct |
| invoice_date | invoices.issue_date | Direct |
| terms | PARAM:terms | Parameter |
| due_date | invoices.due_date | Direct |
| po_number | PARAM:po_number | Parameter |
| project_name | PARAM:project_name | Parameter |
| row_line_number | invoice_items.line_no | Direct |
| row_item_name | invoice_items.item_code | Direct |
| row_item_description | invoice_items.description | Direct |
| row_qty | invoice_items.quantity | Direct |
| row_rate | invoice_items.unit_price | Direct |
| row_discount | Computed: (qty × rate) - amount | Computed |
| row_amount | invoice_items.line_total | Direct |
| subtotal | invoices.subtotal | Direct |
| tax1_label | PARAM:tax1_label | Parameter |
| tax1_amount | Computed: subtotal × 0.047 | Computed |
| tax2_label | PARAM:tax2_label | Parameter |
| tax2_amount | Computed: subtotal × 0.07 | Computed |
| total | invoices.total_amount | Direct |
| payment_made | payments.amount_paid | Direct |
| balance_due_final | Computed: total - payment_made | Computed |
| notes | invoices.notes | Direct |
| terms_and_conditions | PARAM:terms_and_conditions | Parameter |

## Join & Date Rules
- **Primary Join**: invoices ↔ customers (invoices.customer_id = customers.customer_id)
- **Child Join**: invoices ↔ invoice_items (invoices.invoice_number = invoice_items.invoice_number)
- **Payment Join**: invoices ↔ payments (invoices.invoice_number = payments.invoice_number)
- **Date Column**: invoices.issue_date

## Transformations
1. **Address Line 2**: Concatenate customers.city and customers.state with space separator
2. **Address Line 3**: Concatenate customers.postal_code and customers.state with space separator
3. **Row Discount**: Calculate (qty × rate) - line_total to derive discount amount
4. **Tax Calculations**: Apply fixed rates (4.70% and 7.00%) to subtotal
5. **Balance Due**: Subtract payment_made from total_amount (appears twice: header and footer)

## Parameters
- **terms**: Payment terms (e.g., "Due On Receipt")
- **po_number**: Purchase order reference
- **project_name**: Associated project identifier
- **tax1_label**: First tax description with rate
- **tax2_label**: Second tax description with rate
- **terms_and_conditions**: Footer legal text