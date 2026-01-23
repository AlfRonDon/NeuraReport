-- HEADER SELECT --
SELECT {row_column_12}
-- ROWS SELECT --
WITH rows AS (
  SELECT neuract__TEMPERATURES.timestamp_utc AS row_column_1,
         neuract__TEMPERATURES.M1A_2_PT100_PV AS row_column_2,
         neuract__TEMPERATURES.M1A_3_PT100_PV AS row_column_3,
         neuract__TEMPERATURES.P3A_PT100_PV AS row_column_4,
         neuract__TEMPERATURES.P4A_PT100_PV AS row_column_5,
         neuract__TEMPERATURES.P5A_PT100_PV AS row_column_6,
         neuract__TEMPERATURES.P6A_PT100_PV AS row_costal_feeds,
         neuract__TEMPERATURES.P8A_PT100_PV AS row_column_8,
         neuract__TEMPERATURES.P8A_3_PT100_PV AS row_column_9,
         neuract__TEMPERATURES.P8A_4_PT100_PV AS row_column_10,
         neuract__TEMPERATURES.P8A_DRY_OUT_PT100_PV AS row_column_11,
         neuract__TEMPERATURES.P9A_DRY_OUT_PT100_PV AS row_column_12,
         neuract__TEMPERATURES.ROOM_PT100_PV AS row_column_13
  FROM neuract__TEMPERATURES
  WHERE (:from_ts IS NULL OR neuract__TEMPERATURES.timestamp_utc >= :from_ts)
  AND (:to_ts IS NULL OR neuract__TEMPERATURES.timestamp_utc <= :to_ts)
)
SELECT * FROM rows
ORDER BY neuract__TEMPERATURES.timestamp_utc ASC;
-- TOTALS SELECT --
SELECT COUNT(*) AS total_rows
FROM rows;
