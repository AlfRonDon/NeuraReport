-- HEADER SELECT --
SELECT
  CASE WHEN NULLIF(PARAM:from_date, '') IS NULL
       THEN ''
       ELSE strftime('%d-%m-%Y', datetime(PARAM:from_date, '+330 minutes'))
  END AS report_from_date,
  CASE WHEN NULLIF(PARAM:to_date, '') IS NULL
       THEN ''
       ELSE strftime('%d-%m-%Y', datetime(PARAM:to_date, '+330 minutes'))
  END AS report_to_date,
  strftime('%d-%m-%Y', 'now', 'localtime') AS print_date;

-- ROWS SELECT --
WITH filtered AS (
  SELECT
    datetime(neuract__Flowmeters.timestamp_utc, '+330 minutes') AS reading_time,
    date(datetime(neuract__Flowmeters.timestamp_utc, '+330 minutes')) AS reading_date,
    neuract__Flowmeters.*
  FROM neuract__Flowmeters
  WHERE date(datetime(neuract__Flowmeters.timestamp_utc, '+330 minutes')) >= date(datetime(PARAM:from_date, '+330 minutes'))
    AND date(datetime(neuract__Flowmeters.timestamp_utc, '+330 minutes')) <= date(datetime(PARAM:to_date, '+330 minutes'))
),
start_of_day AS (
  SELECT
    reading_date,
    reading_time,
    BASEMENT_TO_TOB_RAW_WATER_FM_1,
    LIMEPLANT_TO_ETP_FM_2,
    DI_RAW_INLET_FM_3,
    DI_SCRUBBERS_FM_4,
    PHASE_2_RAW_WATER_FM_5,
    TW_TO_EARTH_PITS_FM_6,
    RW_PHASE_2_SCRUBBER_LINE_FM_7,
    TW_ADMIN_FM_8,
    SOFT_TO_COOLING_TOWERS_FM_9,
    RW_ADMIN_FM_10,
    RW_UTILITY_TOILETS_FM_11,
    TW_UTILITY_TOILETS_FM_12,
    STORAGE_TO_PHASE_1_FM_13,
    HMWSSB_PHASE_1_FM_14,
    POND_TO_TOPCON_FM_15,
    HMWSSB_TO_TOPCON_FM_16,
    BASEMENT_TO_TOB_TREATED_WATER_FM_17,
    RAW_TO_UTILITY_TOILETS_2_FM_18,
    CONDENSED_LINE_FM_19,
    TW_SHED_B_TOILETS_FM_20,
    RW_TO_SHED_B_TOILETS_FM_21,
    COOLING_TOWERS_TO_RO_FM_22,
    P2_ZLD_TO_TOPCON_ZLD_FM_23
  FROM (
    SELECT
      filtered.*,
      ROW_NUMBER() OVER (
        PARTITION BY reading_date
        ORDER BY reading_time ASC
      ) AS rn
    FROM filtered
  )
  WHERE rn = 1
),
end_of_day AS (
  SELECT
    reading_date,
    reading_time,
    BASEMENT_TO_TOB_RAW_WATER_FM_1,
    LIMEPLANT_TO_ETP_FM_2,
    DI_RAW_INLET_FM_3,
    DI_SCRUBBERS_FM_4,
    PHASE_2_RAW_WATER_FM_5,
    TW_TO_EARTH_PITS_FM_6,
    RW_PHASE_2_SCRUBBER_LINE_FM_7,
    TW_ADMIN_FM_8,
    SOFT_TO_COOLING_TOWERS_FM_9,
    RW_ADMIN_FM_10,
    RW_UTILITY_TOILETS_FM_11,
    TW_UTILITY_TOILETS_FM_12,
    STORAGE_TO_PHASE_1_FM_13,
    HMWSSB_PHASE_1_FM_14,
    POND_TO_TOPCON_FM_15,
    HMWSSB_TO_TOPCON_FM_16,
    BASEMENT_TO_TOB_TREATED_WATER_FM_17,
    RAW_TO_UTILITY_TOILETS_2_FM_18,
    CONDENSED_LINE_FM_19,
    TW_SHED_B_TOILETS_FM_20,
    RW_TO_SHED_B_TOILETS_FM_21,
    COOLING_TOWERS_TO_RO_FM_22,
    P2_ZLD_TO_TOPCON_ZLD_FM_23
  FROM (
    SELECT
      filtered.*,
      ROW_NUMBER() OVER (
        PARTITION BY reading_date
        ORDER BY reading_time DESC
      ) AS rn
    FROM filtered
  )
  WHERE rn = 1
),
diffed AS (
  SELECT
    end_of_day.reading_date,
    COALESCE(end_of_day.BASEMENT_TO_TOB_RAW_WATER_FM_1 - start_of_day.BASEMENT_TO_TOB_RAW_WATER_FM_1, 0) AS row_basement_to_tob_raw_water_fm_1,
    COALESCE(end_of_day.LIMEPLANT_TO_ETP_FM_2 - start_of_day.LIMEPLANT_TO_ETP_FM_2, 0) AS row_limeplant_to_etp_fm_2,
    COALESCE(end_of_day.DI_RAW_INLET_FM_3 - start_of_day.DI_RAW_INLET_FM_3, 0) AS row_di_raw_inlet_fm_3,
    COALESCE(end_of_day.DI_SCRUBBERS_FM_4 - start_of_day.DI_SCRUBBERS_FM_4, 0) AS row_di_scrubbers_fm_4,
    COALESCE(end_of_day.PHASE_2_RAW_WATER_FM_5 - start_of_day.PHASE_2_RAW_WATER_FM_5, 0) AS row_phase_2_raw_water_fm_5,
    COALESCE(end_of_day.TW_TO_EARTH_PITS_FM_6 - start_of_day.TW_TO_EARTH_PITS_FM_6, 0) AS row_tw_to_earth_pits_fm_6,
    COALESCE(end_of_day.RW_PHASE_2_SCRUBBER_LINE_FM_7 - start_of_day.RW_PHASE_2_SCRUBBER_LINE_FM_7, 0) AS row_rw_phase_2_scrubber_line_fm_7,
    COALESCE(end_of_day.TW_ADMIN_FM_8 - start_of_day.TW_ADMIN_FM_8, 0) AS row_tw_admin_fm_8,
    COALESCE(end_of_day.SOFT_TO_COOLING_TOWERS_FM_9 - start_of_day.SOFT_TO_COOLING_TOWERS_FM_9, 0) AS row_soft_to_cooling_towers_fm_9,
    COALESCE(end_of_day.RW_ADMIN_FM_10 - start_of_day.RW_ADMIN_FM_10, 0) AS row_rw_admin_fm_10,
    COALESCE(end_of_day.RW_UTILITY_TOILETS_FM_11 - start_of_day.RW_UTILITY_TOILETS_FM_11, 0) AS row_rw_utility_toilets_fm_11,
    COALESCE(end_of_day.TW_UTILITY_TOILETS_FM_12 - start_of_day.TW_UTILITY_TOILETS_FM_12, 0) AS row_tw_utility_toilets_fm_12,
    COALESCE(end_of_day.STORAGE_TO_PHASE_1_FM_13 - start_of_day.STORAGE_TO_PHASE_1_FM_13, 0) AS row_storage_to_phase_1_fm_13,
    COALESCE(end_of_day.HMWSSB_PHASE_1_FM_14 - start_of_day.HMWSSB_PHASE_1_FM_14, 0) AS row_hmwssb_phase_1_fm_14,
    COALESCE(end_of_day.POND_TO_TOPCON_FM_15 - start_of_day.POND_TO_TOPCON_FM_15, 0) AS row_pond_to_topcon_fm_15,
    COALESCE(end_of_day.HMWSSB_TO_TOPCON_FM_16 - start_of_day.HMWSSB_TO_TOPCON_FM_16, 0) AS row_hmwssb_to_topcon_fm_16,
    COALESCE(end_of_day.BASEMENT_TO_TOB_TREATED_WATER_FM_17 - start_of_day.BASEMENT_TO_TOB_TREATED_WATER_FM_17, 0) AS row_basement_to_tob_treated_water_fm_17,
    COALESCE(end_of_day.RAW_TO_UTILITY_TOILETS_2_FM_18 - start_of_day.RAW_TO_UTILITY_TOILETS_2_FM_18, 0) AS row_raw_to_utility_toilets_2_fm_18,
    COALESCE(end_of_day.CONDENSED_LINE_FM_19 - start_of_day.CONDENSED_LINE_FM_19, 0) AS row_condensed_line_fm_19,
    COALESCE(end_of_day.TW_SHED_B_TOILETS_FM_20 - start_of_day.TW_SHED_B_TOILETS_FM_20, 0) AS row_tw_shed_b_toilets_fm_20,
    COALESCE(end_of_day.RW_TO_SHED_B_TOILETS_FM_21 - start_of_day.RW_TO_SHED_B_TOILETS_FM_21, 0) AS row_rw_to_shed_b_toilets_fm_21,
    COALESCE(end_of_day.COOLING_TOWERS_TO_RO_FM_22 - start_of_day.COOLING_TOWERS_TO_RO_FM_22, 0) AS row_cooling_towers_to_ro_fm_22,
    COALESCE(end_of_day.P2_ZLD_TO_TOPCON_ZLD_FM_23 - start_of_day.P2_ZLD_TO_TOPCON_ZLD_FM_23, 0) AS row_p2_zld_to_topcon_zld_fm_23
  FROM end_of_day
  JOIN start_of_day ON end_of_day.reading_date = start_of_day.reading_date
)

SELECT
  diffed.reading_date AS row_date,
  row_basement_to_tob_raw_water_fm_1,
  row_limeplant_to_etp_fm_2,
  row_di_raw_inlet_fm_3,
  row_di_scrubbers_fm_4,
  row_phase_2_raw_water_fm_5,
  row_tw_to_earth_pits_fm_6,
  row_rw_phase_2_scrubber_line_fm_7,
  row_tw_admin_fm_8,
  row_soft_to_cooling_towers_fm_9,
  row_rw_admin_fm_10,
  row_rw_utility_toilets_fm_11,
  row_tw_utility_toilets_fm_12,
  row_storage_to_phase_1_fm_13,
  row_hmwssb_phase_1_fm_14,
  row_pond_to_topcon_fm_15,
  row_hmwssb_to_topcon_fm_16,
  row_basement_to_tob_treated_water_fm_17,
  row_raw_to_utility_toilets_2_fm_18,
  row_condensed_line_fm_19,
  row_tw_shed_b_toilets_fm_20,
  row_rw_to_shed_b_toilets_fm_21,
  row_cooling_towers_to_ro_fm_22,
  row_p2_zld_to_topcon_zld_fm_23,
  (
        row_basement_to_tob_raw_water_fm_1 +
        row_limeplant_to_etp_fm_2 +
        row_di_raw_inlet_fm_3 +
        row_di_scrubbers_fm_4 +
        row_phase_2_raw_water_fm_5 +
        row_tw_to_earth_pits_fm_6 +
        row_rw_phase_2_scrubber_line_fm_7 +
        row_tw_admin_fm_8 +
        row_soft_to_cooling_towers_fm_9 +
        row_rw_admin_fm_10 +
        row_rw_utility_toilets_fm_11 +
        row_tw_utility_toilets_fm_12 +
        row_storage_to_phase_1_fm_13 +
        row_hmwssb_phase_1_fm_14 +
        row_pond_to_topcon_fm_15 +
        row_hmwssb_to_topcon_fm_16 +
        row_basement_to_tob_treated_water_fm_17 +
        row_raw_to_utility_toilets_2_fm_18 +
        row_condensed_line_fm_19 +
        row_tw_shed_b_toilets_fm_20 +
        row_rw_to_shed_b_toilets_fm_21 +
        row_cooling_towers_to_ro_fm_22 +
        row_p2_zld_to_topcon_zld_fm_23
  ) AS row_total_usage
FROM diffed
WHERE diffed.reading_date >= date(datetime(PARAM:from_date, '+330 minutes'))
  AND diffed.reading_date <= date(datetime(PARAM:to_date, '+330 minutes'))
ORDER BY diffed.reading_date ASC;

-- TOTALS SELECT --
WITH filtered AS (
  SELECT
    datetime(neuract__Flowmeters.timestamp_utc, '+330 minutes') AS reading_time,
    date(datetime(neuract__Flowmeters.timestamp_utc, '+330 minutes')) AS reading_date,
    neuract__Flowmeters.*
  FROM neuract__Flowmeters
  WHERE date(datetime(neuract__Flowmeters.timestamp_utc, '+330 minutes')) >= date(datetime(PARAM:from_date, '+330 minutes'))
    AND date(datetime(neuract__Flowmeters.timestamp_utc, '+330 minutes')) <= date(datetime(PARAM:to_date, '+330 minutes'))
),
start_of_day AS (
  SELECT
    reading_date,
    reading_time,
    BASEMENT_TO_TOB_RAW_WATER_FM_1,
    LIMEPLANT_TO_ETP_FM_2,
    DI_RAW_INLET_FM_3,
    DI_SCRUBBERS_FM_4,
    PHASE_2_RAW_WATER_FM_5,
    TW_TO_EARTH_PITS_FM_6,
    RW_PHASE_2_SCRUBBER_LINE_FM_7,
    TW_ADMIN_FM_8,
    SOFT_TO_COOLING_TOWERS_FM_9,
    RW_ADMIN_FM_10,
    RW_UTILITY_TOILETS_FM_11,
    TW_UTILITY_TOILETS_FM_12,
    STORAGE_TO_PHASE_1_FM_13,
    HMWSSB_PHASE_1_FM_14,
    POND_TO_TOPCON_FM_15,
    HMWSSB_TO_TOPCON_FM_16,
    BASEMENT_TO_TOB_TREATED_WATER_FM_17,
    RAW_TO_UTILITY_TOILETS_2_FM_18,
    CONDENSED_LINE_FM_19,
    TW_SHED_B_TOILETS_FM_20,
    RW_TO_SHED_B_TOILETS_FM_21,
    COOLING_TOWERS_TO_RO_FM_22,
    P2_ZLD_TO_TOPCON_ZLD_FM_23
  FROM (
    SELECT
      filtered.*,
      ROW_NUMBER() OVER (
        PARTITION BY reading_date
        ORDER BY reading_time ASC
      ) AS rn
    FROM filtered
  )
  WHERE rn = 1
),
end_of_day AS (
  SELECT
    reading_date,
    reading_time,
    BASEMENT_TO_TOB_RAW_WATER_FM_1,
    LIMEPLANT_TO_ETP_FM_2,
    DI_RAW_INLET_FM_3,
    DI_SCRUBBERS_FM_4,
    PHASE_2_RAW_WATER_FM_5,
    TW_TO_EARTH_PITS_FM_6,
    RW_PHASE_2_SCRUBBER_LINE_FM_7,
    TW_ADMIN_FM_8,
    SOFT_TO_COOLING_TOWERS_FM_9,
    RW_ADMIN_FM_10,
    RW_UTILITY_TOILETS_FM_11,
    TW_UTILITY_TOILETS_FM_12,
    STORAGE_TO_PHASE_1_FM_13,
    HMWSSB_PHASE_1_FM_14,
    POND_TO_TOPCON_FM_15,
    HMWSSB_TO_TOPCON_FM_16,
    BASEMENT_TO_TOB_TREATED_WATER_FM_17,
    RAW_TO_UTILITY_TOILETS_2_FM_18,
    CONDENSED_LINE_FM_19,
    TW_SHED_B_TOILETS_FM_20,
    RW_TO_SHED_B_TOILETS_FM_21,
    COOLING_TOWERS_TO_RO_FM_22,
    P2_ZLD_TO_TOPCON_ZLD_FM_23
  FROM (
    SELECT
      filtered.*,
      ROW_NUMBER() OVER (
        PARTITION BY reading_date
        ORDER BY reading_time DESC
      ) AS rn
    FROM filtered
  )
  WHERE rn = 1
),
diffed AS (
  SELECT
    end_of_day.reading_date,
    COALESCE(end_of_day.BASEMENT_TO_TOB_RAW_WATER_FM_1 - start_of_day.BASEMENT_TO_TOB_RAW_WATER_FM_1, 0) AS row_basement_to_tob_raw_water_fm_1,
    COALESCE(end_of_day.LIMEPLANT_TO_ETP_FM_2 - start_of_day.LIMEPLANT_TO_ETP_FM_2, 0) AS row_limeplant_to_etp_fm_2,
    COALESCE(end_of_day.DI_RAW_INLET_FM_3 - start_of_day.DI_RAW_INLET_FM_3, 0) AS row_di_raw_inlet_fm_3,
    COALESCE(end_of_day.DI_SCRUBBERS_FM_4 - start_of_day.DI_SCRUBBERS_FM_4, 0) AS row_di_scrubbers_fm_4,
    COALESCE(end_of_day.PHASE_2_RAW_WATER_FM_5 - start_of_day.PHASE_2_RAW_WATER_FM_5, 0) AS row_phase_2_raw_water_fm_5,
    COALESCE(end_of_day.TW_TO_EARTH_PITS_FM_6 - start_of_day.TW_TO_EARTH_PITS_FM_6, 0) AS row_tw_to_earth_pits_fm_6,
    COALESCE(end_of_day.RW_PHASE_2_SCRUBBER_LINE_FM_7 - start_of_day.RW_PHASE_2_SCRUBBER_LINE_FM_7, 0) AS row_rw_phase_2_scrubber_line_fm_7,
    COALESCE(end_of_day.TW_ADMIN_FM_8 - start_of_day.TW_ADMIN_FM_8, 0) AS row_tw_admin_fm_8,
    COALESCE(end_of_day.SOFT_TO_COOLING_TOWERS_FM_9 - start_of_day.SOFT_TO_COOLING_TOWERS_FM_9, 0) AS row_soft_to_cooling_towers_fm_9,
    COALESCE(end_of_day.RW_ADMIN_FM_10 - start_of_day.RW_ADMIN_FM_10, 0) AS row_rw_admin_fm_10,
    COALESCE(end_of_day.RW_UTILITY_TOILETS_FM_11 - start_of_day.RW_UTILITY_TOILETS_FM_11, 0) AS row_rw_utility_toilets_fm_11,
    COALESCE(end_of_day.TW_UTILITY_TOILETS_FM_12 - start_of_day.TW_UTILITY_TOILETS_FM_12, 0) AS row_tw_utility_toilets_fm_12,
    COALESCE(end_of_day.STORAGE_TO_PHASE_1_FM_13 - start_of_day.STORAGE_TO_PHASE_1_FM_13, 0) AS row_storage_to_phase_1_fm_13,
    COALESCE(end_of_day.HMWSSB_PHASE_1_FM_14 - start_of_day.HMWSSB_PHASE_1_FM_14, 0) AS row_hmwssb_phase_1_fm_14,
    COALESCE(end_of_day.POND_TO_TOPCON_FM_15 - start_of_day.POND_TO_TOPCON_FM_15, 0) AS row_pond_to_topcon_fm_15,
    COALESCE(end_of_day.HMWSSB_TO_TOPCON_FM_16 - start_of_day.HMWSSB_TO_TOPCON_FM_16, 0) AS row_hmwssb_to_topcon_fm_16,
    COALESCE(end_of_day.BASEMENT_TO_TOB_TREATED_WATER_FM_17 - start_of_day.BASEMENT_TO_TOB_TREATED_WATER_FM_17, 0) AS row_basement_to_tob_treated_water_fm_17,
    COALESCE(end_of_day.RAW_TO_UTILITY_TOILETS_2_FM_18 - start_of_day.RAW_TO_UTILITY_TOILETS_2_FM_18, 0) AS row_raw_to_utility_toilets_2_fm_18,
    COALESCE(end_of_day.CONDENSED_LINE_FM_19 - start_of_day.CONDENSED_LINE_FM_19, 0) AS row_condensed_line_fm_19,
    COALESCE(end_of_day.TW_SHED_B_TOILETS_FM_20 - start_of_day.TW_SHED_B_TOILETS_FM_20, 0) AS row_tw_shed_b_toilets_fm_20,
    COALESCE(end_of_day.RW_TO_SHED_B_TOILETS_FM_21 - start_of_day.RW_TO_SHED_B_TOILETS_FM_21, 0) AS row_rw_to_shed_b_toilets_fm_21,
    COALESCE(end_of_day.COOLING_TOWERS_TO_RO_FM_22 - start_of_day.COOLING_TOWERS_TO_RO_FM_22, 0) AS row_cooling_towers_to_ro_fm_22,
    COALESCE(end_of_day.P2_ZLD_TO_TOPCON_ZLD_FM_23 - start_of_day.P2_ZLD_TO_TOPCON_ZLD_FM_23, 0) AS row_p2_zld_to_topcon_zld_fm_23
  FROM end_of_day
  JOIN start_of_day ON end_of_day.reading_date = start_of_day.reading_date
)

SELECT
  SUM(diffed.row_basement_to_tob_raw_water_fm_1) AS total_basement_to_tob_raw_water_fm_1,
  SUM(diffed.row_limeplant_to_etp_fm_2) AS total_limeplant_to_etp_fm_2,
  SUM(diffed.row_di_raw_inlet_fm_3) AS total_di_raw_inlet_fm_3,
  SUM(diffed.row_di_scrubbers_fm_4) AS total_di_scrubbers_fm_4,
  SUM(diffed.row_phase_2_raw_water_fm_5) AS total_phase_2_raw_water_fm_5,
  SUM(diffed.row_tw_to_earth_pits_fm_6) AS total_tw_to_earth_pits_fm_6,
  SUM(diffed.row_rw_phase_2_scrubber_line_fm_7) AS total_rw_phase_2_scrubber_line_fm_7,
  SUM(diffed.row_tw_admin_fm_8) AS total_tw_admin_fm_8,
  SUM(diffed.row_soft_to_cooling_towers_fm_9) AS total_soft_to_cooling_towers_fm_9,
  SUM(diffed.row_rw_admin_fm_10) AS total_rw_admin_fm_10,
  SUM(diffed.row_rw_utility_toilets_fm_11) AS total_rw_utility_toilets_fm_11,
  SUM(diffed.row_tw_utility_toilets_fm_12) AS total_tw_utility_toilets_fm_12,
  SUM(diffed.row_storage_to_phase_1_fm_13) AS total_storage_to_phase_1_fm_13,
  SUM(diffed.row_hmwssb_phase_1_fm_14) AS total_hmwssb_phase_1_fm_14,
  SUM(diffed.row_pond_to_topcon_fm_15) AS total_pond_to_topcon_fm_15,
  SUM(diffed.row_hmwssb_to_topcon_fm_16) AS total_hmwssb_to_topcon_fm_16,
  SUM(diffed.row_basement_to_tob_treated_water_fm_17) AS total_basement_to_tob_treated_water_fm_17,
  SUM(diffed.row_raw_to_utility_toilets_2_fm_18) AS total_raw_to_utility_toilets_2_fm_18,
  SUM(diffed.row_condensed_line_fm_19) AS total_condensed_line_fm_19,
  SUM(diffed.row_tw_shed_b_toilets_fm_20) AS total_tw_shed_b_toilets_fm_20,
  SUM(diffed.row_rw_to_shed_b_toilets_fm_21) AS total_rw_to_shed_b_toilets_fm_21,
  SUM(diffed.row_cooling_towers_to_ro_fm_22) AS total_cooling_towers_to_ro_fm_22,
  SUM(diffed.row_p2_zld_to_topcon_zld_fm_23) AS total_p2_zld_to_topcon_zld_fm_23,
  SUM(
        diffed.row_basement_to_tob_raw_water_fm_1 +
        diffed.row_limeplant_to_etp_fm_2 +
        diffed.row_di_raw_inlet_fm_3 +
        diffed.row_di_scrubbers_fm_4 +
        diffed.row_phase_2_raw_water_fm_5 +
        diffed.row_tw_to_earth_pits_fm_6 +
        diffed.row_rw_phase_2_scrubber_line_fm_7 +
        diffed.row_tw_admin_fm_8 +
        diffed.row_soft_to_cooling_towers_fm_9 +
        diffed.row_rw_admin_fm_10 +
        diffed.row_rw_utility_toilets_fm_11 +
        diffed.row_tw_utility_toilets_fm_12 +
        diffed.row_storage_to_phase_1_fm_13 +
        diffed.row_hmwssb_phase_1_fm_14 +
        diffed.row_pond_to_topcon_fm_15 +
        diffed.row_hmwssb_to_topcon_fm_16 +
        diffed.row_basement_to_tob_treated_water_fm_17 +
        diffed.row_raw_to_utility_toilets_2_fm_18 +
        diffed.row_condensed_line_fm_19 +
        diffed.row_tw_shed_b_toilets_fm_20 +
        diffed.row_rw_to_shed_b_toilets_fm_21 +
        diffed.row_cooling_towers_to_ro_fm_22 +
        diffed.row_p2_zld_to_topcon_zld_fm_23
  ) AS total_all_flowmeters
FROM diffed
WHERE diffed.reading_date >= date(datetime(PARAM:from_date, '+330 minutes'))
  AND diffed.reading_date <= date(datetime(PARAM:to_date, '+330 minutes'));
