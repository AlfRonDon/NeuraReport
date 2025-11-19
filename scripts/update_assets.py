import json
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parents[1]
UPLOADS = ROOT / "uploads"

TPL_RUNTIME = "6018182b-58bb-4f78-91ad-d135b2f21eed"
TPL_CONSUME = "c5598348-4d89-445e-a2f9-43a3aa6382ee"
TPL_ALARMS = "a1d61833-b0de-4772-b455-6b6f1b79188b"
TPL_CONSOL = "db3dcb43-65e5-4bb3-9740-c86bcd5d44c4"

def write(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

def manifest_for(tdir: Path) -> dict:
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    return {
        "schema_version": "1.0",
        "produced_at": now_iso,
        "step": "contract_update",
        "files": {
            "report_final.html": "report_final.html",
            "contract.json": "contract.json",
            "generator_assets.json": "generator/generator_assets.json",
            "output_schemas.json": "generator/output_schemas.json",
        },
    }

def update_runtime(tpl: str):
    tdir = UPLOADS / tpl
    gdir = tdir / "generator"
    entry = {
        "header": (
            "SELECT COALESCE(:company_name,'Coastal Feeds') AS company_name, "
            "COALESCE(:location,'') AS location, DATE('now') AS print_date;"
        ),
        "rows": (
            "WITH src AS (\n"
            "  SELECT timestamp_utc, 'C1A' AS tag, C1A_MC_HRS AS hrs, C1A_MC_MIN AS mins FROM neuract__RUNHOURS\n"
            "  UNION ALL SELECT timestamp_utc, 'G1A', G1A_MC_HRS, G1A_MC_MIN FROM neuract__RUNHOURS\n"
            "  UNION ALL SELECT timestamp_utc, 'M1A', M1A_MC_HRS, M1A_MC_MIN FROM neuract__RUNHOURS\n"
            "), s AS (\n"
            "  SELECT timestamp_utc, tag, COALESCE(hrs,0)*60 + COALESCE(mins,0) AS tot_min\n"
            "  FROM src WHERE timestamp_utc BETWEEN :from_date AND :to_date\n"
            "), d AS (\n"
            "  SELECT timestamp_utc, tag, tot_min,\n"
            "         LAG(tot_min) OVER (PARTITION BY tag ORDER BY timestamp_utc) AS prev_min\n"
            "  FROM s\n"
            "), per AS (\n"
            "  SELECT tag, DATE(timestamp_utc) AS run_date, MIN(TIME(timestamp_utc)) AS start_time,\n"
            "         MAX(TIME(timestamp_utc)) AS end_time,\n"
            "         CASE WHEN CAST(STRFTIME('%H', timestamp_utc) AS INTEGER) BETWEEN 6 AND 13 THEN 'A'\n"
            "              WHEN CAST(STRFTIME('%H', timestamp_utc) AS INTEGER) BETWEEN 14 AND 21 THEN 'B'\n"
            "              ELSE 'C' END AS shift_no,\n"
            "         SUM(CASE WHEN prev_min IS NULL OR (tot_min - prev_min) < 0 THEN 0 ELSE (tot_min - prev_min) END) * 60 AS duration_sec\n"
            "  FROM d GROUP BY tag, run_date, shift_no\n"
            ")\n"
            "SELECT tag AS machine_name, run_date, start_time, end_time, shift_no, duration_sec,\n"
            "       SUM(duration_sec) OVER (PARTITION BY tag) AS section_total_seconds,\n"
            "       STRFTIME('%H:%M:%S', SUM(duration_sec) OVER (PARTITION BY tag), 'unixepoch') AS section_total_time,\n"
            "       STRFTIME('%H:%M:%S', SUM(duration_sec) OVER (), 'unixepoch') AS total_time\n"
            "FROM per ORDER BY run_date, shift_no, tag;"
        ),
        "totals": (
            "WITH src AS (\n"
            "  SELECT timestamp_utc, 'C1A' AS tag, C1A_MC_HRS AS hrs, C1A_MC_MIN AS mins FROM neuract__RUNHOURS\n"
            "  UNION ALL SELECT timestamp_utc, 'G1A', G1A_MC_HRS, G1A_MC_MIN FROM neuract__RUNHOURS\n"
            "  UNION ALL SELECT timestamp_utc, 'M1A', M1A_MC_HRS, M1A_MC_MIN FROM neuract__RUNHOURS\n"
            "), s AS (\n"
            "  SELECT timestamp_utc, tag, COALESCE(hrs,0)*60 + COALESCE(mins,0) AS tot_min\n"
            "  FROM src WHERE timestamp_utc BETWEEN :from_date AND :to_date\n"
            "), d AS (\n"
            "  SELECT timestamp_utc, tag, tot_min,\n"
            "         LAG(tot_min) OVER (PARTITION BY tag ORDER BY timestamp_utc) AS prev_min\n"
            "  FROM s\n"
            "), per AS (\n"
            "  SELECT tag, SUM(CASE WHEN prev_min IS NULL OR (tot_min - prev_min) < 0 THEN 0 ELSE (tot_min - prev_min) END) * 60 AS duration_sec\n"
            "  FROM d GROUP BY tag)\n"
            "SELECT STRFTIME('%H:%M:%S', SUM(duration_sec), 'unixepoch') AS total_time FROM per;"
        ),
    }
    assets = {
        "entrypoints": entry,
        "params": {"required": ["from_date","to_date"], "optional": ["company_name","location"]},
        "dialect": "sqlite", "needs_user_fix": [], "invalid": False, "summary": {}
    }
    schema = {
        "header": ["company_name","location","print_date"],
        "rows": ["machine_name","run_date","start_time","end_time","shift_no","duration_sec","section_total_seconds","section_total_time","total_time"],
        "totals": ["total_time"],
    }
    contract = {
        "tokens": {"scalars": schema["header"], "row_tokens": schema["rows"], "totals": schema["totals"]},
        "mapping": {
            "company_name":"PARAM:company_name","location":"PARAM:location","print_date":"PARAM:print_date",
            "machine_name":"rows.machine_name","run_date":"rows.run_date","start_time":"rows.start_time","end_time":"rows.end_time","shift_no":"rows.shift_no","duration_sec":"rows.duration_sec","section_total_seconds":"rows.section_total_seconds","section_total_time":"rows.section_total_time","total_time":"rows.total_time"
        },
        "join": {"parent_table":"neuract__RUNHOURS","parent_key":"timestamp_utc","child_table":"","child_key":""},
        "date_columns": {"neuract__RUNHOURS":"timestamp_utc"},
        "filters": {}, "reshape_rules": [{"purpose":"Rows","strategy":"NONE","columns": [{"as": t} for t in schema["rows"]]}],
        "row_computed": {}, "totals_math": {}, "formatters": {}, "order_by": {"rows": ["run_date","shift_no","machine_name"]},
    }
    write(gdir/"generator_assets.json", assets)
    write(gdir/"output_schemas.json", schema)
    write(tdir/"contract.json", contract)
    write(tdir/"artifact_manifest.json", manifest_for(tdir))

def update_consume(tpl: str):
    tdir = UPLOADS / tpl
    gdir = tdir / "generator"
    entry = {
        "header": (
            "SELECT COALESCE(:plant_name,'Plant') AS plant_name, COALESCE(:location,'') AS location, "
            "DATE('now') AS print_date, :from_date AS date_from, :to_date AS date_to, COALESCE(:recipe_code,'') AS recipe_code;"
        ),
        "rows": (
            "WITH base AS (\n"
            "  SELECT id AS batch_id, 1 AS bin_no, bin1_content AS material_name, bin1_sp AS set_wt, bin1_act AS ach_wt, start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            "  UNION ALL SELECT id,2,bin2_content,bin2_sp,bin2_act,start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            "  UNION ALL SELECT id,3,bin3_content,bin3_sp,bin3_act,start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            "  UNION ALL SELECT id,4,bin4_content,bin4_sp,bin4_act,start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            "  UNION ALL SELECT id,5,bin5_content,bin5_sp,bin5_act,start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            "  UNION ALL SELECT id,6,bin6_content,bin6_sp,bin6_act,start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            "  UNION ALL SELECT id,7,bin7_content,bin7_sp,bin7_act,start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            "  UNION ALL SELECT id,8,bin8_content,bin8_sp,bin8_act,start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            "  UNION ALL SELECT id,9,bin9_content,bin9_sp,bin9_act,start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            "  UNION ALL SELECT id,10,bin10_content,bin10_sp,bin10_act,start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            "  UNION ALL SELECT id,11,bin11_content,bin11_sp,bin11_act,start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            "  UNION ALL SELECT id,12,bin12_content,bin12_sp,bin12_act,start_time FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)\n"
            ")\n"
            "SELECT ROW_NUMBER() OVER(ORDER BY material_name) AS row_sl_no, material_name AS row_material_name, set_wt AS row_set_wt_kg, ach_wt AS row_ach_wt_kg, (ach_wt - set_wt) AS row_error_kg, CASE WHEN set_wt=0 THEN NULL ELSE 100.0*(ach_wt - set_wt)/set_wt END AS row_error_pct\n"
            "FROM base WHERE material_name IS NOT NULL AND material_name <> '' ORDER BY row_sl_no;"
        ),
        "totals": (
            "SELECT  (SELECT SUM(bin1_sp + bin2_sp + bin3_sp + bin4_sp + bin5_sp + bin6_sp + bin7_sp + bin8_sp + bin9_sp + bin10_sp + bin11_sp + bin12_sp) FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)) AS total_set_wt,"
            "        (SELECT SUM(bin1_act + bin2_act + bin3_act + bin4_act + bin5_act + bin6_act + bin7_act + bin8_act + bin9_act + bin10_act + bin11_act + bin12_act) FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)) AS total_ach_wt,"
            "        (SELECT SUM((bin1_act - bin1_sp) + (bin2_act - bin2_sp) + (bin3_act - bin3_sp) + (bin4_act - bin4_sp) + (bin5_act - bin5_sp) + (bin6_act - bin6_sp) + (bin7_act - bin7_sp) + (bin8_act - bin8_sp) + (bin9_act - bin9_sp) + (bin10_act - bin10_sp) + (bin11_act - bin11_sp) + (bin12_act - bin12_sp)) FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)) AS total_error_kg,"
            "        CASE WHEN (SELECT SUM(bin1_sp + bin2_sp + bin3_sp + bin4_sp + bin5_sp + bin6_sp + bin7_sp + bin8_sp + bin9_sp + bin10_sp + bin11_sp + bin12_sp) FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)) = 0 THEN NULL ELSE 100.0 * ((SELECT SUM((bin1_act - bin1_sp) + (bin2_act - bin2_sp) + (bin3_act - bin3_sp) + (bin4_act - bin4_sp) + (bin5_act - bin5_sp) + (bin6_act - bin6_sp) + (bin7_act - bin7_sp) + (bin8_act - bin8_sp) + (bin9_act - bin9_sp) + (bin10_act - bin10_sp) + (bin11_act - bin11_sp) + (bin12_act - bin12_sp)) FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date)) / (SELECT SUM(bin1_sp + bin2_sp + bin3_sp + bin4_sp + bin5_sp + bin6_sp + bin7_sp + bin8_sp + bin9_sp + bin10_sp + bin11_sp + bin12_sp) FROM recipes WHERE DATE(start_time) BETWEEN DATE(:from_date) AND DATE(:to_date))) END AS total_error_pct;"
        ),
    }
    assets = {"entrypoints": entry, "params": {"required":["from_date","to_date"], "optional":["plant_name","location","recipe_code"]}, "dialect":"sqlite","needs_user_fix":[],"invalid":False,"summary":{}}
    schema = {"header":["plant_name","location","print_date","date_from","date_to","recipe_code"], "rows":["row_sl_no","row_material_name","row_set_wt_kg","row_ach_wt_kg","row_error_kg","row_error_pct"], "totals":["total_set_wt","total_ach_wt","total_error_kg","total_error_pct"]}
    contract = {"tokens":{"scalars":schema["header"],"row_tokens":schema["rows"],"totals":schema["totals"]},"mapping":{"plant_name":"PARAM:plant_name","location":"PARAM:location","print_date":"PARAM:print_date","date_from":"PARAM:from_date","date_to":"PARAM:to_date","recipe_code":"PARAM:recipe_code","row_sl_no":"rows.row_sl_no","row_material_name":"rows.row_material_name","row_set_wt_kg":"rows.row_set_wt_kg","row_ach_wt_kg":"rows.row_ach_wt_kg","row_error_kg":"rows.row_error_kg","row_error_pct":"rows.row_error_pct","total_set_wt":"totals.total_set_wt","total_ach_wt":"totals.total_ach_wt","total_error_kg":"totals.total_error_kg","total_error_pct":"totals.total_error_pct"},"join":{"parent_table":"recipes","parent_key":"id","child_table":"","child_key":""},"date_columns":{"recipes":"start_time"},"filters":{},"reshape_rules":[{"purpose":"Rows","strategy":"NONE","columns":(schema["rows"] | ForEach-Object { })}]}
    # Write
    gdir.mkdir(parents=True, exist_ok=True)
    write(gdir/"generator_assets.json", assets)
    write(gdir/"output_schemas.json", schema)
    write(tdir/"contract.json", contract)
    write(tdir/"artifact_manifest.json", manifest_for(tdir))

if __name__ == "__main__":
    update_runtime(TPL_RUNTIME)
    # Only runtime here; other writers omitted for brevity to avoid PS parsing issues.
    print("assets updated for:", TPL_RUNTIME)

