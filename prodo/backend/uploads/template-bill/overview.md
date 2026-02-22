# Transaction Acknowledgment Report — Mapping Overview

## Executive Summary
This report displays a single transaction acknowledgment receipt for HMWSSB water bill payments. It presents transaction details including status, reference number, date/time, customer account number (CAN), amount paid, and bank information. The report includes static branding elements (logos, URLs, security notices) that are treated as unresolved constants.

## Token Inventory
- **Scalars**: 11 tokens (7 data-driven, 4 static assets/text)
- **Row Tokens**: 0 (single-record display)
- **Totals**: 0 (no aggregations)

## Mapping Table

| Token | Source | Type | Notes |
|-------|--------|------|-------|
| transaction_status | transactions.transaction_status | Direct | Payment success/failure status |
| transaction_ref | transactions.transaction_ref_number | Direct | Unique reference identifier |
| transaction_date | transactions.transaction_date | Direct | Transaction date (YYYY-MM-DD) |
| transaction_time | transactions.transaction_time | Direct | Transaction time (HH:MM:SS) |
| can_no | transactions.can_number | Direct | Consumer Account Number |
| bill_amount | transactions.bill_amount | Direct | Payment amount in rupees |
| bank_name | transactions.bank_name | Direct | Bank used for payment |
| logo_url | UNRESOLVED | Static Asset | HMWSSB logo image URL |
| billdesk_logo_url | UNRESOLVED | Static Asset | BillDesk payment gateway logo |
| page_url | UNRESOLVED | Static Text | Footer URL constant |
| update_note | UNRESOLVED | Static Text | Security disclaimer message |

## Join & Date Rules
- **Primary Table**: `transactions` (parent)
- **Join Strategy**: Single-table query, no child join required
- **Date Column**: `transactions.transaction_date` (ISO format)
- **Ordering**: By transaction date descending (most recent first)

## Transformations
- **No reshape rules**: Single-record scalar display, no row repetition or melting required
- **No computed columns**: All values are direct mappings from source table
- **No aggregations**: Transaction-level detail report

## Parameters
- **Required**: None (report displays a single transaction record)
- **Optional**: None defined
- **Filter Strategy**: Application layer selects the specific transaction record to display

## Static Elements
Four tokens (`logo_url`, `billdesk_logo_url`, `page_url`, `update_note`) are marked UNRESOLVED as they represent constant branding/UI elements not stored in the database. These should be provided as runtime constants or configured in the application layer.