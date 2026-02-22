# Executive Summary

This report generates a **HMWSSB Payment Receipt** for a single water bill transaction. The user wants a simple, single-record display showing transaction confirmation details including status, reference number, date/time, customer account number (CAN), bill amount, bank name, IP address, and access timestamp.

**Key characteristics:**
- **No reshaping required** — this is a single-row scalar report with no detail rows or totals.
- **Single table source** — all data comes from `transactions` table.
- **Key filter** — `transaction_status` is marked as a key token, meaning reports will typically filter to a specific transaction status (e.g., "Success").
- **No aggregations** — direct passthrough of transaction fields.
- **Date/time concatenation** — `transaction_date_time` combines separate date and time columns.

---

# Token Inventory

**Scalars (9 tokens):**
- `timestamp`
- `transaction_status`
- `transaction_reference_number`
- `transaction_date_time`
- `can_no`
- `bill_amount`
- `bank_name`
- `ip_address`
- `access_time`

**Row tokens:** None

**Totals tokens:** None

---

# Mapping Table

| Token | Source | Type |
|-------|--------|------|
| `timestamp` | `transactions.created_at` | Direct column |
| `transaction_status` | `PARAM:transaction_status` | Parameter (key filter) |
| `transaction_reference_number` | `transactions.transaction_ref_number` | Direct column |
| `transaction_date_time` | `transactions.transaction_date \|\| ' ' \|\| transactions.transaction_time` | DuckDB SQL expression |
| `can_no` | `transactions.can_number` | Direct column |
| `bill_amount` | `transactions.bill_amount` | Direct column |
| `bank_name` | `transactions.bank_name` | Direct column |
| `ip_address` | `transactions.ip_address` | Direct column |
| `access_time` | `transactions.access_timestamp` | Direct column |

---

# Join & Date Rules

**Source table:** `transactions` (single table, no joins required)

**Date columns:** `transactions.transaction_date` (date portion), `transactions.transaction_time` (time portion), `transactions.access_timestamp`, `transactions.created_at`

**Key filter semantics:**
- `transaction_status` is a **required key token** — when provided as a parameter, the SQL must apply `WHERE transactions.transaction_status = :transaction_status`.
- Typical usage: filter to `transaction_status = 'Success'` to show only successful payments.

**No joins:** All data resides in a single `transactions` table.

---

# Transformations

**No reshaping required** — this is a scalar-only report with no row iteration.

**Computed fields:**
1. **`transaction_date_time`** — Concatenate `transactions.transaction_date` and `transactions.transaction_time` with a space separator using DuckDB string concatenation (`||`).

**No totals math** — no aggregations or summary calculations.

---

# Parameters

**Required parameters:**
- `transaction_status` (string) — Acts as a filter on `transactions.transaction_status`. Example: `"Success"`.

**Optional parameters:** None

**Parameter semantics:**
- `transaction_status` is both a **key token** and a **filter parameter**. The mapping uses `PARAM:transaction_status` so the value is passed through to the template, and the SQL entrypoint must also apply `WHERE transactions.transaction_status = :transaction_status` to ensure the correct transaction is retrieved.

---

# Checklist for Step 5 (DuckDB SQL on DataFrame backend)

- [ ] Create a `header` dataset with 9 scalar columns (all from `transactions` table).
- [ ] Apply `WHERE transactions.transaction_status = :transaction_status` filter when `transaction_status` parameter is provided.
- [ ] Compute `transaction_date_time` as `transactions.transaction_date || ' ' || transactions.transaction_time` (DuckDB string concatenation).
- [ ] Select exactly one row from `transactions` table (should be unique per transaction reference number).
- [ ] No `rows` dataset required (empty or omit).
- [ ] No `totals` dataset required (empty or omit).
- [ ] Preserve column order in SELECT: `created_at, transaction_status, transaction_ref_number, (date||time), can_number, bill_amount, bank_name, ip_address, access_timestamp`.
- [ ] Handle NULL values gracefully (use COALESCE if needed, though all fields appear non-null in samples).
- [ ] Return a single-row result for the header dataset.