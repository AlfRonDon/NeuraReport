# Machine runtime report build notes

- Source table: `neuract__RUNHOURS` inside `Coastal feeds/test - Copy.db`.
- Machine names correspond to every column apart from `timestamp_utc` (224 columns detected).
- Whenever consecutive readings differ, we emit an interval row with run date, start/end times, duration (sec) and HH:MM:SS.
- Totals aggregate the duration of all emitted intervals (respecting optional filters).
- Optional parameters: `from_ts`, `to_ts`, `machine_name`, `company_title`.
