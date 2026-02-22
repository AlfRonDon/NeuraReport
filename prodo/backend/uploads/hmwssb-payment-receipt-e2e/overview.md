# HMWSSB Payment Receipt Mapping Contract

## Executive Summary
This contract generates water bill payment receipts for the Hyderabad Metropolitan Water Supply & Sewerage Board. It displays consumer information, current transaction details, and a complete payment history table.

## Token Inventory
- **Scalars (Header)**: 8 tokens for consumer and transaction details
- **Row Tokens**: 5 tokens for payment history table
- **Totals**: 0 tokens
- **Total Tokens**: 13

## Mapping Table
| Token | Source | Type |
|-------|--------|------|
| can_number | consumers.can_number | Direct |
| consumer_name | key_value.consumer_name | Parameter |
| reference_number | transactions.transaction_ref_number | Direct |
| transaction_date | transactions.transaction_date | Direct |
| transaction_time | transactions.transaction_time | Direct |
| transaction_status | transactions.transaction_status | Direct |
| bill_amount | transactions.bill_amount | Direct |
| bank_name | transactions.bank_name | Direct |
| row_date | transactions.transaction_date | Direct |
| row_reference | transactions.transaction_ref_number | Direct |
| row_amount | transactions.bill_amount | Direct |
| row_status | transactions.transaction_status | Direct |
| row_bank | transactions.bank_name | Direct |

## Join & Filter Rules
- **Primary Join**: consumers (parent) → transactions (child) on `can_number`
- **Date Filtering**: transactions.transaction_date is the operative date column
- **Optional Filters**: None

## Transformations
- No reshape operations required
- No computed columns
- Direct column-to-token mapping throughout

## Parameters
- **consumer_name**: Required string parameter (not available in database, must be provided by user)