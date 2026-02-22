# Transaction Acknowledgment Report - Mapping Overview

## Executive Summary
This report generates a transaction acknowledgment receipt for successful payment transactions. It displays payment confirmation details including transaction reference, customer account number, bill amount, and bank information. The report is designed as a single-page receipt with no repeating rows or aggregate totals.

## Token Inventory
- **Scalar Tokens**: 14 tokens (all header/static content)
- **Row Tokens**: 0 (no repeating data)
- **Totals**: 0 (no aggregations)

## Mapping Table

| Token | Source | Type | Notes |
|-------|--------|------|-------|
| timestamp | payments.payment_date | Computed | Formatted as YYYY-MM-DD HH:MM:SS |
| logo_url | LITERAL | Constant | Static HMWSSB logo URL |
| organization_name | LITERAL | Constant | "Hyderabad Metropolitan Water Supply & Sewerage Board" |
| organization_subtitle | LITERAL | Constant | "Online Bill Payment" |
| transaction_status | LITERAL | Constant | "Success" |
| transaction_reference_number | payments.transaction_ref | Direct | Payment transaction reference |
| transaction_date_time | payments.payment_date | Computed | Formatted as DD/MM/YYYY HH:MM:SS |
| can_number | customers.customer_id | Direct | Customer Account Number |
| bill_amount | invoices.total_amount | Computed | Formatted as currency with ₹ symbol |
| bank_name | LITERAL | Constant | Static bank name placeholder |
| payment_note | LITERAL | Constant | "This is a computer-generated receipt and does not require a signature." |
| security_warning_text | LITERAL | Constant | Security warning message |
| payment_url | LITERAL | Constant | "https://payment.hmwssb.gov.in" |
| payment_provider | LITERAL | Constant | "BillDesk" |
| page_number | LITERAL | Constant | "Page 1 of 1" |

## Join & Date Rules
- **Primary Join**: invoices → customers (invoices.customer_id = customers.customer_id)
- **Secondary Join**: invoices → payments (invoices.invoice_number = payments.invoice_number)
- **Date Filtering**: None (single transaction receipt)
- **Ordering**: Not applicable (single record)

## Transformations
1. **timestamp**: Format payments.payment_date to "YYYY-MM-DD HH:MM:SS" format
2. **transaction_date_time**: Format payments.payment_date to "DD/MM/YYYY HH:MM:SS" format
3. **bill_amount**: Format invoices.total_amount as currency with 2 decimals

## Parameters
No required parameters. This report displays a single transaction record.