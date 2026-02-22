# Transaction Acknowledgment Report - Mapping Overview

## Executive Summary
This report generates a payment receipt for HMWSSB water bill transactions. It displays transaction details including status, reference number, amount, and bank information for a single transaction record.

## Token Inventory
- **Scalars**: 8 tokens (bank_name, bill_amount, can_number, generated_datetime, logo_url, transaction_datetime, transaction_reference, transaction_status)
- **Row Tokens**: 0 tokens (no repeating blocks)
- **Totals**: 0 tokens (no aggregations)

## Mapping Table

| Token | Source | Type | Notes |
|-------|--------|------|-------|
| bank_name | transactions.bank_name | Direct | Bank processing the payment |
| bill_amount | transactions.bill_amount | Direct | Payment amount |
| can_number | transactions.can_number | Direct | Consumer account number |
| generated_datetime | transactions.created_at | Computed | Format_date operation for report generation timestamp |
| logo_url | PARAM:logo_url | Parameter | HMWSSB logo image URL |
| transaction_datetime | transactions.transaction_date + transaction_time | Computed | Concatenate date and time fields |
| transaction_reference | transactions.transaction_ref_number | Direct | Unique transaction identifier |
| transaction_status | transactions.transaction_status | Direct | Payment success/failure status |

## Join & Date Rules
- **Primary Table**: transactions (single record fetch)
- **Join Strategy**: Self-join on transactions table (no child table required)
- **Date Column**: transactions.created_at (for metadata)
- **Filters**: None (single transaction lookup by ID or reference)

## Transformations
1. **generated_datetime**: Format transactions.created_at as "DD-MM-YYYY HH:MM:SS" for display
2. **transaction_datetime**: Concatenate transactions.transaction_date and transactions.transaction_time with space separator

## Parameters
- **logo_url** (required): URL path to HMWSSB logo image for header branding