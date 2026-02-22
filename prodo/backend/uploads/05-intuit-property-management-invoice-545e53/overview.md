# Invoice Report — Mapping Contract Overview

## Executive Summary
This contract generates a standard invoice document from the `invoices`, `invoice_items`, and `customers` tables. The report includes vendor (company) details, billing/shipping addresses, invoice metadata, itemized line items, and a totals section with subtotal, tax, shipping, and final amount.

## Token Inventory
- **Scalars**: 22 tokens (company info, addresses, invoice metadata, customer message, totals)
- **Row Tokens**: 5 tokens (item/service, description, quantity, rate, amount)
- **Totals**: 1 token (total_amount)
- **Constants Inlined**: logo_placeholder_text, logo_text

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| company_name | invoices.vendor_name | Direct |
| company_street_address | PARAM:company_street_address | Parameter |
| company_city_state_zipcode | PARAM:company_city_state_zipcode | Parameter |
| company_phone | PARAM:company_phone | Parameter |
| company_email | PARAM:company_email | Parameter |
| company_website | PARAM:company_website | Parameter |
| bill_to_client_name | customers.customer_name | Direct |
| bill_to_street_address | customers.billing_address | Direct |
| bill_to_city_state_zipcode | (computed) | Concat city/state/postal |
| ship_to_client_name | customers.customer_name | Direct |
| ship_to_street_address | customers.billing_address | Direct |
| ship_to_city_state_zipcode | (computed) | Concat city/state/postal |
| invoice_number | invoices.invoice_number | Direct |
| invoice_date | invoices.issue_date | Direct (date format) |
| payment_terms | PARAM:payment_terms | Parameter |
| due_date | invoices.due_date | Direct (date format) |
| customer_message | invoices.notes | Direct |
| total_subtotal | invoices.subtotal | Direct |
| total_sales_tax | invoices.tax_amount | Direct |
| total_shipping | PARAM:shipping_amount | Parameter |
| total_amount | invoices.total_amount | Direct |
| row_item_service | invoice_items.item_code | Direct |
| row_description | invoice_items.description | Direct |
| row_quantity_hrs | invoice_items.quantity | Direct |
| row_rate | invoice_items.unit_price | Direct |
| row_amount | invoice_items.line_total | Direct |

## Join & Date Rules
- **Parent**: `invoices` (invoice_number)
- **Child**: `invoice_items` (invoice_number)
- **Customer Lookup**: Join `invoices.customer_id` → `customers.customer_id`
- **Date Columns**: `invoices.issue_date`, `invoices.due_date` (format: MM/DD/YYYY)
- **Ordering**: Line items by `invoice_items.line_no ASC`

## Transformations
1. **Address Concatenation**: `bill_to_city_state_zipcode` and `ship_to_city_state_zipcode` computed from `customers.city`, `customers.state`, `customers.postal_code` with format "City, State Zipcode"
2. **Date Formatting**: `invoice_date` and `due_date` formatted as MM/DD/YYYY
3. **Currency Formatting**: All monetary fields (rate, amount, totals) formatted with 2 decimals

## Parameters
- **company_street_address**: Vendor street address (not in catalog)
- **company_city_state_zipcode**: Vendor city/state/zip (not in catalog)
- **company_phone**: Vendor phone (not in catalog)
- **company_email**: Vendor email (not in catalog)
- **company_website**: Vendor website (not in catalog)
- **payment_terms**: Payment terms (e.g., "Net 30", not in catalog)
- **shipping_amount**: Shipping cost (not in catalog)

## Notes
Vendor contact details are not available in the database and must be supplied as runtime parameters. Shipping address is assumed identical to billing address (both use `customers.billing_address`).