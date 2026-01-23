# Temperature Report Build Notes

- Source table: `neuract__TEMPERATURES` inside `C:\Users\Alfred\NeuraReport\test - Copy (2).db`.
- Temperature columns detected: 12 sensors (PT100 temperature probes).
- Calculation method: **State-Based Delta** (Temperature = Peak - Baseline per day)
  - For each sensor, daily temperature = MAX(reading) - MIN(reading)
  - MIN represents the stable baseline (cooling state)
  - MAX represents the peak after heating cycle
  - Only days with significant temperature change (>10) are included
- Row average: Average temperature delta across all sensors for each day.
- Totals: Maximum temperature delta achieved for each sensor, and overall average.
- Date filtering: Uses `substr(timestamp_utc, 1, 10)` for ISO date extraction (format: YYYY-MM-DD).
- Optional parameters: `from_date`, `to_date` (format: YYYY-MM-DD).
