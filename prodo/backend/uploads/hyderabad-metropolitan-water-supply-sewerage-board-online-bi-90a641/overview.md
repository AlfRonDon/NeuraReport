# HMWSSB Online Bill Payment Receipt — Contract Overview

## Executive Summary
This contract generates a water bill payment receipt for Hyderabad Metropolitan Water Supply & Sewerage Board (HMWSSB). The report displays a single transaction acknowledgment with header-level details including transaction status, reference number, timestamp, CAN number, bill amount, bank name, IP address, and access time. No detail rows or totals are required.

## Token Inventory
**Scalars (9):** `timestamp`, `transaction_status`, `transaction_reference_number`, `transaction_date_time`, `can_number`, `bill_amount`, `bank_name`, `ip_address`, `access_time`

**Row Tokens:** None

**Totals:** None

## Mapping Table

| Token | Source | Notes |
|-------|--------|-------|
| `timestamp` | `transactions.created_at` | Format as readable timestamp |
| `transaction_status` | `transactions.transaction_status` | Direct mapping |
| `transaction_reference_number` | `transactions.transaction_ref_number` | Direct mapping |
| `transaction_date_time` | `transactions.transaction_date` | Format as DD/MM/YYYY HH:MM:SS |
| `can_number` | `transactions.can_number` | Direct mapping |
| `bill_amount` | `transactions.bill_amount` | Format as currency with 2 decimals |
| `bank_name` | `transactions.bank_name` | Direct mapping |
| `ip_address` | `transactions.ip_address` | Direct mapping |
| `access_time` | `transactions.access_timestamp` | Format with IST timezone |

## Join & Date Rules
**Primary Table:** `transactions`

**Date Column:** `transactions.created_at` (used for filtering)

**No Joins Required:** Single-table report from transactions only.

## Transformations
1. **Date/Time Formatting:** `timestamp` formatted from `created_at` as human-readable timestamp; `transaction_date_time` formatted from `transaction_date` in DD/MM/YYYY HH:MM:SS format; `access_time` formatted from `access_timestamp` with IST timezone suffix.
2. **Currency Formatting:** `bill_amount` displayed with 2 decimal places.
3. **No Computed Fields:** All tokens are direct mappings or formatted columns.

## Parameters
**Required:** `transaction_ref_number` (to filter the specific transaction)

**Optional:** None for this single-record receipt.