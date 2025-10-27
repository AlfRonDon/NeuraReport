## 2025-10-21T13:39:06Z - template_initial_html

```json
{
  "id": "chatcmpl-CT6pjo4KymdRdNmbaulJVENxKQdsI",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\" />\n<title>Consumption report</title>\n<style>\n  @page { size: A4; margin: 14mm 16mm 18mm 16mm; }\n  :root{\n    --col-1-w: 16mm;   /* Sl. No. */\n    --col-2-w: 92mm;   /* Material name */\n    --col-3-w: 28mm;   /* Set. wt(Kg) */\n    --col-4-w: 28mm;   /* Ach. wt(Kg) */\n    --col-5-w: 24mm;   /* Error(Kg) */\n    --col-6-w: 20mm;   /* Error % */\n    --row-pad: 3.5px;\n    --gap-y: 6mm;\n    --hair: 1px;\n  }\n  html, body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color:#000; }\n  h1 {\n    font-family: \"Times New Roman\", Times, serif;\n    font-size: 18pt;\n    font-weight: 700;\n    text-align: center;\n    margin: 6mm 0 3mm 0;\n  }\n\n  /* Header box */\n  #report-header { margin-bottom: 2mm; }\n  #meta-box{\n    border: 1px solid #000;\n    padding: 0;\n  }\n  #meta-box table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    font-size: 10.5pt;\n  }\n  #meta-box td{\n    padding: 2.5mm 3mm;\n    vertical-align: top;\n  }\n  #meta-box tr + tr td{ border-top: 1px solid #000; }\n  #meta-box .left { width: 70%; }\n  #meta-box .right { text-align: right; white-space: nowrap; }\n  #title-rule { border-bottom: 1px solid #000; margin-bottom: 3mm; }\n\n  /* Main table */\n  #data-table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    border: 1px solid #000;\n    font-size: 10.5pt;\n  }\n  #data-table col.c1{ width: var(--col-1-w); }\n  #data-table col.c2{ width: var(--col-2-w); }\n  #data-table col.c3{ width: var(--col-3-w); }\n  #data-table col.c4{ width: var(--col-4-w); }\n  #data-table col.c5{ width: var(--col-5-w); }\n  #data-table col.c6{ width: var(--col-6-w); }\n\n  #data-table th, #data-table td{\n    border: 1px solid #000;\n    padding: var(--row-pad) 5px;\n    line-height: 1.25;\n  }\n  #data-table th{\n    background: #f2f2f2;\n    font-weight: 600;\n    text-align: left;\n  }\n  #data-table td.num, #data-table th.num{ text-align: right; }\n  #data-table td.center{ text-align: center; }\n\n  /* Totals row */\n  #data-table tfoot td{\n    background: #f7f7f7;\n    font-weight: 600;\n  }\n\n  /* Footer */\n  #page-footer{\n    position: fixed;\n    bottom: 10mm;\n    left: 16mm;\n    right: 16mm;\n    font-size: 9.5pt;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n  }\n  #page-footer .center { flex: 1; text-align: center; }\n</style>\n</head>\n<body>\n\n<section id=\"report-header\">\n  <div id=\"meta-box\">\n    <table>\n      <tr>\n        <td class=\"left\">Plant name  : {plant_name}</td>\n        <td class=\"right\">From  Date: {from_date}  To {to_date}</td>\n      </tr>\n      <tr>\n        <td class=\"left\">Location    : {location}</td>\n        <td class=\"right\"></td>\n      </tr>\n      <tr>\n        <td class=\"left\">Print Date  : {print_date}</td>\n        <td class=\"right\">Recipe code : {recipe_code}</td>\n      </tr>\n    </table>\n  </div>\n\n  <h1>{report_title}</h1>\n  <div id=\"title-rule\"></div>\n</section>\n\n<table id=\"data-table\">\n  <colgroup>\n    <col class=\"c1\"><col class=\"c2\"><col class=\"c3\"><col class=\"c4\"><col class=\"c5\"><col class=\"c6\">\n  </colgroup>\n  <thead>\n    <tr>\n      <th data-label=\"sl_no\">Sl. No.</th>\n      <th data-label=\"material_name\">Material name</th>\n      <th data-label=\"set_wt\">Set. wt(Kg)</th>\n      <th data-label=\"ach_wt\">Ach. wt(Kg)</th>\n      <th data-label=\"error_kg\">Error(Kg)</th>\n      <th data-label=\"error_pct\">Error %</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td class=\"center\">{sl_no}</td>\n      <td>{material_name}</td>\n      <td class=\"num\">{set_wt}</td>\n      <td class=\"num\">{ach_wt}</td>\n      <td class=\"num\">{error_kg}</td>\n      <td class=\"num\">{error_pct}</td>\n    </tr>\n  </tbody>\n  <tfoot>\n    <tr>\n      <td colspan=\"2\">Total</td>\n      <td class=\"num\">{total_set_wt}</td>\n      <td class=\"num\">{total_ach_wt}</td>\n      <td class=\"num\">{total_error_kg}</td>\n      <td class=\"num\">{total_error_pct}</td>\n    </tr>\n  </tfoot>\n</table>\n\n<footer id=\"page-footer\">\n  <div>{company_name}</div>\n  <div class=\"center\">{page_label}</div>\n  <div></div>\n</footer>\n\n</body>\n</html>\n<!--END_HTML-->\n\n<!--BEGIN_SCHEMA_JSON-->\n{\n  \"scalars\": [\n    \"plant_name\",\n    \"location\",\n    \"from_date\",\n    \"to_date\",\n    \"print_date\",\n    \"recipe_code\",\n    \"report_title\",\n    \"company_name\",\n    \"page_label\"\n  ],\n  \"row_tokens\": [\n    \"sl_no\",\n    \"material_name\",\n    \"set_wt\",\n    \"ach_wt\",\n    \"error_kg\",\n    \"error_pct\"\n  ],\n  \"totals\": [\n    \"total_set_wt\",\n    \"total_ach_wt\",\n    \"total_error_kg\",\n    \"total_error_pct\"\n  ],\n  \"notes\": \"\"\n}\n<!--END_SCHEMA_JSON-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761053815,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 4631,
    "prompt_tokens": 1544,
    "total_tokens": 6175,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 3072,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T13:41:23Z - template_fix_html_call2

```json
{
  "id": "chatcmpl-CT6ryFLdj3ryRvK91MuryF9HKiTxD",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n<title>Consumption report</title>\n<style>\n  @page { size: A4; margin: 14mm 16mm 18mm 16mm; }\n  :root{\n    /* Column widths must equal printable width (178mm) */\n    --col-1-w: 12.5mm;  /* Sl. No. */\n    --col-2-w: 89.5mm;  /* Material name */\n    --col-3-w: 26mm;    /* Set. wt(Kg) */\n    --col-4-w: 26mm;    /* Ach. wt(Kg) */\n    --col-5-w: 14mm;    /* Error(Kg) */\n    --col-6-w: 10mm;    /* Error % */\n    --row-pad-y: 1.2mm;\n    --row-pad-x: 2.8mm;\n    --hair: 1px;\n  }\n\n  html, body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color:#000; }\n  h1 {\n    font-family: \"Times New Roman\", Times, serif;\n    font-size: 18pt;\n    font-weight: 700;\n    text-align: center;\n    margin: 4mm 0 2mm 0;\n  }\n\n  /* Header box */\n  #report-header { margin-bottom: 3mm; }\n  #meta-box{\n    border: 1px solid #000;\n    padding: 0;\n  }\n  #meta-box table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    font-size: 10pt;\n  }\n  #meta-box td{\n    padding: 2mm 3mm;\n    vertical-align: top;\n  }\n  #meta-box tr + tr td{ border-top: 1px solid #000; }\n  #meta-box .left { width: 70%; }\n  #meta-box .right { text-align: right; white-space: nowrap; }\n  #title-rule { border-bottom: 1px solid #000; margin-bottom: 3mm; }\n\n  /* Main table */\n  #data-table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    border: 1px solid #000;\n    font-size: 10pt;\n    font-variant-numeric: tabular-nums;\n  }\n  #data-table col.c1{ width: var(--col-1-w); }\n  #data-table col.c2{ width: var(--col-2-w); }\n  #data-table col.c3{ width: var(--col-3-w); }\n  #data-table col.c4{ width: var(--col-4-w); }\n  #data-table col.c5{ width: var(--col-5-w); }\n  #data-table col.c6{ width: var(--col-6-w); }\n\n  #data-table th, #data-table td{\n    border: 1px solid #000;\n    padding: var(--row-pad-y) var(--row-pad-x);\n    line-height: 1.25;\n  }\n  #data-table thead th{\n    background: #e9e9e9;\n    font-weight: 600;\n    white-space: nowrap;\n    text-align: left;\n  }\n  #data-table thead th.num{ text-align: right; }\n  #data-table td.num{ text-align: right; }\n  #data-table td.center, #data-table thead th.center{ text-align: center; }\n\n  /* Totals row */\n  #data-table tfoot td{\n    background: #f0f0f0;\n    font-weight: 600;\n  }\n  #data-table tfoot td:first-child{ text-align: left; }\n\n  /* Pagination stability */\n  #data-table tbody tr{ break-inside: avoid; page-break-inside: avoid; }\n\n  /* Footer */\n  #page-footer{\n    position: fixed;\n    bottom: 12mm;\n    left: 16mm;\n    right: 16mm;\n    font-size: 9.5pt;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n  }\n  #page-footer .center { flex: 1; text-align: center; }\n</style>\n</head>\n<body>\n\n<section id=\"report-header\">\n  <div id=\"meta-box\">\n    <table>\n      <tr>\n        <td class=\"left\">Plant name  : {plant_name}</td>\n        <td class=\"right\">From  Date: {from_date}  To {to_date}</td>\n      </tr>\n      <tr>\n        <td class=\"left\">Location    : {location}</td>\n        <td class=\"right\"></td>\n      </tr>\n      <tr>\n        <td class=\"left\">Print Date  : {print_date}</td>\n        <td class=\"right\">Recipe code : {recipe_code}</td>\n      </tr>\n    </table>\n  </div>\n\n  <h1>{report_title}</h1>\n  <div id=\"title-rule\"></div>\n</section>\n\n<table id=\"data-table\">\n  <colgroup>\n    <col class=\"c1\" /><col class=\"c2\" /><col class=\"c3\" /><col class=\"c4\" /><col class=\"c5\" /><col class=\"c6\" />\n  </colgroup>\n  <thead>\n    <tr>\n      <th class=\"center\" data-label=\"sl_no\">Sl. No.</th>\n      <th data-label=\"material_name\">Material name</th>\n      <th class=\"num\" data-label=\"set_wt\">Set. wt(Kg)</th>\n      <th class=\"num\" data-label=\"ach_wt\">Ach. wt(Kg)</th>\n      <th class=\"num\" data-label=\"error_kg\">Error(Kg)</th>\n      <th class=\"num\" data-label=\"error_pct\">Error %</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td class=\"center\">{sl_no}</td>\n      <td>{material_name}</td>\n      <td class=\"num\">{set_wt}</td>\n      <td class=\"num\">{ach_wt}</td>\n      <td class=\"num\">{error_kg}</td>\n      <td class=\"num\">{error_pct}</td>\n    </tr>\n  </tbody>\n  <tfoot>\n    <tr>\n      <td colspan=\"2\">Total</td>\n      <td class=\"num\">{total_set_wt}</td>\n      <td class=\"num\">{total_ach_wt}</td>\n      <td class=\"num\">{total_error_kg}</td>\n      <td class=\"num\">{total_error_pct}</td>\n    </tr>\n  </tfoot>\n</table>\n\n<footer id=\"page-footer\">\n  <div>{company_name}</div>\n  <div class=\"center\">{page_label}</div>\n  <div></div>\n</footer>\n\n</body>\n</html>\n<!--END_HTML-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761053954,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 4733,
    "prompt_tokens": 3705,
    "total_tokens": 8438,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 3200,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T13:43:35Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CT6uWWRbLpsAJ6F68ZafO790FGgk9",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"location\": \"params.location\",\n    \"print_date\": \"params.print_date\",\n    \"recipe_code\": \"params.recipe_code\",\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt\": \"UNRESOLVED\",\n    \"ach_wt\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_pct\": \"UNRESOLVED\",\n    \"total_set_wt\": \"(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp))\",\n    \"total_error_pct\": \"(((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / NULLIF((recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp), 0))\",\n    \"page_label\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"report_title\": \"Consumption report\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt\": \"11,800.00\",\n    \"ach_wt\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_pct\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\",\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_label\": \"Page 1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_pct\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761054112,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 4913,
    "prompt_tokens": 3713,
    "total_tokens": 8626,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 3776,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T13:44:37Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CT6uVhfyIUjhXoZlaOaIGV6nbQDNc",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"location\": \"params.location\",\n    \"print_date\": \"params.print_date\",\n    \"recipe_code\": \"params.recipe_code\",\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt\": \"UNRESOLVED\",\n    \"ach_wt\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_pct\": \"UNRESOLVED\",\n    \"total_set_wt\": \"SUM(COALESCE(recipes.bin1_sp,0) + COALESCE(recipes.bin2_sp,0) + COALESCE(recipes.bin3_sp,0) + COALESCE(recipes.bin4_sp,0) + COALESCE(recipes.bin5_sp,0) + COALESCE(recipes.bin6_sp,0) + COALESCE(recipes.bin7_sp,0) + COALESCE(recipes.bin8_sp,0) + COALESCE(recipes.bin9_sp,0) + COALESCE(recipes.bin10_sp,0) + COALESCE(recipes.bin11_sp,0) + COALESCE(recipes.bin12_sp,0))\",\n    \"total_ach_wt\": \"SUM(COALESCE(recipes.bin1_act,0) + COALESCE(recipes.bin2_act,0) + COALESCE(recipes.bin3_act,0) + COALESCE(recipes.bin4_act,0) + COALESCE(recipes.bin5_act,0) + COALESCE(recipes.bin6_act,0) + COALESCE(recipes.bin7_act,0) + COALESCE(recipes.bin8_act,0) + COALESCE(recipes.bin9_act,0) + COALESCE(recipes.bin10_act,0) + COALESCE(recipes.bin11_act,0) + COALESCE(recipes.bin12_act,0))\",\n    \"total_error_kg\": \"SUM((COALESCE(recipes.bin1_act,0) - COALESCE(recipes.bin1_sp,0)) + (COALESCE(recipes.bin2_act,0) - COALESCE(recipes.bin2_sp,0)) + (COALESCE(recipes.bin3_act,0) - COALESCE(recipes.bin3_sp,0)) + (COALESCE(recipes.bin4_act,0) - COALESCE(recipes.bin4_sp,0)) + (COALESCE(recipes.bin5_act,0) - COALESCE(recipes.bin5_sp,0)) + (COALESCE(recipes.bin6_act,0) - COALESCE(recipes.bin6_sp,0)) + (COALESCE(recipes.bin7_act,0) - COALESCE(recipes.bin7_sp,0)) + (COALESCE(recipes.bin8_act,0) - COALESCE(recipes.bin8_sp,0)) + (COALESCE(recipes.bin9_act,0) - COALESCE(recipes.bin9_sp,0)) + (COALESCE(recipes.bin10_act,0) - COALESCE(recipes.bin10_sp,0)) + (COALESCE(recipes.bin11_act,0) - COALESCE(recipes.bin11_sp,0)) + (COALESCE(recipes.bin12_act,0) - COALESCE(recipes.bin12_sp,0)))\",\n    \"total_error_pct\": \"UNRESOLVED\",\n    \"page_label\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"report_title\": \"Consumption report\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt\": \"11,800.00\",\n    \"ach_wt\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_pct\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\",\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_label\": \"Page 1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_pct\",\n      \"total_error_pct\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_sp\",\"recipes.bin2_sp\",\"recipes.bin3_sp\",\"recipes.bin4_sp\",\"recipes.bin5_sp\",\"recipes.bin6_sp\",\"recipes.bin7_sp\",\"recipes.bin8_sp\",\"recipes.bin9_sp\",\"recipes.bin10_sp\",\"recipes.bin11_sp\",\"recipes.bin12_sp\"] },\n      \"total_ach_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_act\",\"recipes.bin2_act\",\"recipes.bin3_act\",\"recipes.bin4_act\",\"recipes.bin5_act\",\"recipes.bin6_act\",\"recipes.bin7_act\",\"recipes.bin8_act\",\"recipes.bin9_act\",\"recipes.bin10_act\",\"recipes.bin11_act\",\"recipes.bin12_act\"] },\n      \"total_error_kg\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_act\",\"recipes.bin2_act\",\"recipes.bin3_act\",\"recipes.bin4_act\",\"recipes.bin5_act\",\"recipes.bin6_act\",\"recipes.bin7_act\",\"recipes.bin8_act\",\"recipes.bin9_act\",\"recipes.bin10_act\",\"recipes.bin11_act\",\"recipes.bin12_act\",\"recipes.bin1_sp\",\"recipes.bin2_sp\",\"recipes.bin3_sp\",\"recipes.bin4_sp\",\"recipes.bin5_sp\",\"recipes.bin6_sp\",\"recipes.bin7_sp\",\"recipes.bin8_sp\",\"recipes.bin9_sp\",\"recipes.bin10_sp\",\"recipes.bin11_sp\",\"recipes.bin12_sp\"] }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761054111,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6571,
    "prompt_tokens": 3713,
    "total_tokens": 10284,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5184,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T13:46:01Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CT6wDjCfSzt4uCTOEE9gUVc6eK9En",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"location\": \"params.location\",\n    \"print_date\": \"params.print_date\",\n    \"recipe_code\": \"params.recipe_code\",\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt\": \"UNRESOLVED\",\n    \"ach_wt\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_pct\": \"UNRESOLVED\",\n    \"total_set_wt\": \"(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp))\",\n    \"total_error_pct\": \"(( (recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) ) / NULLIF((recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp), 0))\",\n    \"page_label\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"report_title\": \"Consumption report\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt\": \"11,800.00\",\n    \"ach_wt\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_pct\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\",\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_label\": \"Page 1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_pct\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_sp\",\"recipes.bin2_sp\",\"recipes.bin3_sp\",\"recipes.bin4_sp\",\"recipes.bin5_sp\",\"recipes.bin6_sp\",\"recipes.bin7_sp\",\"recipes.bin8_sp\",\"recipes.bin9_sp\",\"recipes.bin10_sp\",\"recipes.bin11_sp\",\"recipes.bin12_sp\"] },\n      \"total_ach_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_act\",\"recipes.bin2_act\",\"recipes.bin3_act\",\"recipes.bin4_act\",\"recipes.bin5_act\",\"recipes.bin6_act\",\"recipes.bin7_act\",\"recipes.bin8_act\",\"recipes.bin9_act\",\"recipes.bin10_act\",\"recipes.bin11_act\",\"recipes.bin12_act\"] }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761054217,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6137,
    "prompt_tokens": 3756,
    "total_tokens": 9893,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5056,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 3584
    }
  }
}
```

## 2025-10-21T13:48:08Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CT6xErAzYg6WdQiaT2L2r2WTJVoCi",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"sl_no\": \"ROW_NUMBER() OVER (ORDER BY recipes.id)\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt\": \"UNRESOLVED\",\n    \"ach_wt\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_pct\": \"UNRESOLVED\",\n    \"total_set_wt\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_error_pct\": \"CASE WHEN SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN NULL ELSE (SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\",\n    \"plant_name\": \"params.plant_name\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"location\": \"params.location\",\n    \"print_date\": \"params.print_date\",\n    \"recipe_code\": \"recipes.recipe_name\",\n    \"page_label\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"report_title\": \"Consumption report\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt\": \"11,800.00\",\n    \"ach_wt\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_pct\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\",\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_label\": \"Page 1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_pct\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761054280,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 8828,
    "prompt_tokens": 3756,
    "total_tokens": 12584,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 7616,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 3584
    }
  }
}
```

## 2025-10-21T14:01:59Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CT7AY9AokaYRJ5h5uBDuxZc0OKkc6",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"location\": \"params.location\",\n    \"print_date\": \"params.print_date\",\n    \"recipe_code\": \"recipes.recipe_name\",\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt\": \"UNRESOLVED\",\n    \"ach_wt\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_pct\": \"UNRESOLVED\",\n    \"total_set_wt\": \"(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp))\",\n    \"total_error_pct\": \"(((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) * 100.0) / NULLIF((recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp), 0)\",\n    \"page_label\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"report_title\": \"Consumption report\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt\": \"11,800.00\",\n    \"ach_wt\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_pct\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\",\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_label\": \"Page 1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_pct\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761055106,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6262,
    "prompt_tokens": 3713,
    "total_tokens": 9975,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5120,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 3584
    }
  }
}
```

## 2025-10-21T14:02:11Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CT7AYaW0bNZv9rnEYucFmBCFDNFeS",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"location\": \"params.location\",\n    \"print_date\": \"params.print_date\",\n    \"recipe_code\": \"params.recipe_code\",\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"recipes.recipe_name\",\n    \"set_wt\": \"(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"ach_wt\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"error_kg\": \"((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp))\",\n    \"error_pct\": \"CASE WHEN (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN 0 ELSE 100.0 * ((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\",\n    \"total_set_wt\": \"(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp))\",\n    \"total_error_pct\": \"CASE WHEN (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN 0 ELSE 100.0 * ((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\",\n    \"page_label\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"report_title\": \"Consumption report\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt\": \"11,800.00\",\n    \"ach_wt\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_pct\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\",\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_label\": \"Page 1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\"\n    ],\n    \"hints\": {\n      \"set_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_sp\",\"recipes.bin2_sp\",\"recipes.bin3_sp\",\"recipes.bin4_sp\",\"recipes.bin5_sp\",\"recipes.bin6_sp\",\"recipes.bin7_sp\",\"recipes.bin8_sp\",\"recipes.bin9_sp\",\"recipes.bin10_sp\",\"recipes.bin11_sp\",\"recipes.bin12_sp\"] },\n      \"ach_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_act\",\"recipes.bin2_act\",\"recipes.bin3_act\",\"recipes.bin4_act\",\"recipes.bin5_act\",\"recipes.bin6_act\",\"recipes.bin7_act\",\"recipes.bin8_act\",\"recipes.bin9_act\",\"recipes.bin10_act\",\"recipes.bin11_act\",\"recipes.bin12_act\"] },\n      \"total_set_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_sp\",\"recipes.bin2_sp\",\"recipes.bin3_sp\",\"recipes.bin4_sp\",\"recipes.bin5_sp\",\"recipes.bin6_sp\",\"recipes.bin7_sp\",\"recipes.bin8_sp\",\"recipes.bin9_sp\",\"recipes.bin10_sp\",\"recipes.bin11_sp\",\"recipes.bin12_sp\"] },\n      \"total_ach_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_act\",\"recipes.bin2_act\",\"recipes.bin3_act\",\"recipes.bin4_act\",\"recipes.bin5_act\",\"recipes.bin6_act\",\"recipes.bin7_act\",\"recipes.bin8_act\",\"recipes.bin9_act\",\"recipes.bin10_act\",\"recipes.bin11_act\",\"recipes.bin12_act\"] }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761055106,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6691,
    "prompt_tokens": 3713,
    "total_tokens": 10404,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 4928,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 3584
    }
  }
}
```

## 2025-10-21T14:04:30Z - llm_call_3_5

```json
{
  "id": "chatcmpl-CT7ErlXf7PcsnPGaZUJ6ixUDXupDA",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"final_template_html\": \"\\n<html>\\n<head>\\n<meta charset=\\\"utf-8\\\" />\\n<title>Consumption report</title>\\n<style>\\n  @page { size: A4; margin: 14mm 16mm 18mm 16mm; }\\n  :root{\\n    /* Column widths must equal printable width (178mm) */\\n    --col-1-w: 14mm;   /* Sl. No. */\\n    --col-2-w: 84mm;   /* Material name */\\n    --col-3-w: 26mm;   /* Set. wt(Kg) */\\n    --col-4-w: 26mm;   /* Ach. wt(Kg) */\\n    --col-5-w: 16mm;   /* Error(Kg) */\\n    --col-6-w: 12mm;   /* Error % */\\n    --row-pad-y: 1.2mm;\\n    --row-pad-x: 2.8mm;\\n    --hair: 1px;\\n  }\\n\\n  html, body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color:#000; }\\n  h1 {\\n    font-family: \\\"Times New Roman\\\", Times, serif;\\n    font-size: 18pt;\\n    font-weight: 700;\\n    text-align: center;\\n    margin: 4mm 0 2mm 0;\\n  }\\n\\n  /* Header box */\\n  #report-header { margin-bottom: 3mm; }\\n  #meta-box{\\n    border: 1px solid #000;\\n    padding: 0;\\n  }\\n  #meta-box table{\\n    width: 100%;\\n    border-collapse: collapse;\\n    table-layout: fixed;\\n    font-size: 10pt;\\n  }\\n  #meta-box td{\\n    padding: 2mm 3mm;\\n    vertical-align: top;\\n  }\\n  #meta-box tr + tr td{ border-top: 1px solid #000; }\\n  #meta-box .left { width: 70%; }\\n  #meta-box .right { text-align: right; white-space: nowrap; }\\n  #title-rule { border-bottom: 1px solid #000; margin-bottom: 3mm; }\\n\\n  /* Main table */\\n  #data-table{\\n    width: 100%;\\n    border-collapse: collapse;\\n    table-layout: fixed;\\n    border: 1px solid #000;\\n    font-size: 10pt;\\n    font-variant-numeric: tabular-nums;\\n  }\\n  #data-table col.c1{ width: var(--col-1-w); }\\n  #data-table col.c2{ width: var(--col-2-w); }\\n  #data-table col.c3{ width: var(--col-3-w); }\\n  #data-table col.c4{ width: var(--col-4-w); }\\n  #data-table col.c5{ width: var(--col-5-w); }\\n  #data-table col.c6{ width: var(--col-6-w); }\\n\\n  #data-table th, #data-table td{\\n    border: 1px solid #000;\\n    padding: var(--row-pad-y) var(--row-pad-x);\\n    line-height: 1.25;\\n  }\\n  #data-table thead th{\\n    background: #e9e9e9;\\n    font-weight: 600;\\n    white-space: nowrap;\\n    text-align: left;\\n  }\\n  #data-table thead th.num{ text-align: right; }\\n  #data-table td.num{ text-align: right; }\\n  #data-table td.center, #data-table thead th.center{ text-align: center; }\\n\\n  /* Totals row */\\n  #data-table tfoot td{\\n    background: #f0f0f0;\\n    font-weight: 600;\\n  }\\n  #data-table tfoot td:first-child{ text-align: left; }\\n\\n  /* Pagination stability */\\n  #data-table tbody tr{ break-inside: avoid; page-break-inside: avoid; }\\n\\n  /* Footer */\\n  #page-footer{\\n    position: fixed;\\n    bottom: 12mm;\\n    left: 16mm;\\n    right: 16mm;\\n    font-size: 9.5pt;\\n    display: flex;\\n    align-items: center;\\n    justify-content: space-between;\\n  }\\n  #page-footer .center { flex: 1; text-align: center; }\\n</style>\\n</head>\\n<body>\\n\\n<section id=\\\"report-header\\\">\\n  <div id=\\\"meta-box\\\">\\n    <table>\\n      <tr>\\n        <td class=\\\"left\\\">Plant name  : SSR AQUA</td>\\n        <td class=\\\"right\\\">From  Date: {from_date}  To {to_date}</td>\\n      </tr>\\n      <tr>\\n        <td class=\\\"left\\\">Location    : Gudivada</td>\\n        <td class=\\\"right\\\"></td>\\n      </tr>\\n      <tr>\\n        <td class=\\\"left\\\">Print Date  : {print_date}</td>\\n        <td class=\\\"right\\\">Recipe code : {recipe_code}</td>\\n      </tr>\\n    </table>\\n  </div>\\n\\n  <h1>Consumption report</h1>\\n  <div id=\\\"title-rule\\\"></div>\\n</section>\\n\\n<table id=\\\"data-table\\\">\\n  <colgroup>\\n    <col class=\\\"c1\\\" /><col class=\\\"c2\\\" /><col class=\\\"c3\\\" /><col class=\\\"c4\\\" /><col class=\\\"c5\\\" /><col class=\\\"c6\\\" />\\n  </colgroup>\\n  <thead>\\n    <tr>\\n      <th class=\\\"center\\\" data-label=\\\"sl_no\\\">Sl. No.</th>\\n      <th data-label=\\\"material_name\\\">Material name</th>\\n      <th class=\\\"num\\\" data-label=\\\"set_wt\\\">Set. wt(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"ach_wt\\\">Ach. wt(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"error_kg\\\">Error(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"error_pct\\\">Error %</th>\\n    </tr>\\n  </thead>\\n  <tbody>\\n    <tr>\\n      <td class=\\\"center\\\">{sl_no}</td>\\n      <td>{material_name}</td>\\n      <td class=\\\"num\\\">{set_wt}</td>\\n      <td class=\\\"num\\\">{ach_wt}</td>\\n      <td class=\\\"num\\\">{error_kg}</td>\\n      <td class=\\\"num\\\">{error_pct}</td>\\n    </tr>\\n  </tbody>\\n  <tfoot>\\n    <tr>\\n      <td colspan=\\\"2\\\">Total</td>\\n      <td class=\\\"num\\\">{total_set_wt}</td>\\n      <td class=\\\"num\\\">{total_ach_wt}</td>\\n      <td class=\\\"num\\\">{total_error_kg}</td>\\n      <td class=\\\"num\\\">{total_error_pct}</td>\\n    </tr>\\n  </tfoot>\\n</table>\\n\\n<footer id=\\\"page-footer\\\">\\n  <div>Indian Industrial Machines Pvt. Ltd.</div>\\n  <div class=\\\"center\\\">{page_label}</div>\\n  <div></div>\\n</footer>\\n\\n</body>\\n</html>\",\n  \"page_summary\": \"Adjusted the main table column widths to provide more consistent space while keeping the total printable width at 178mm. New widths (in order): 14mm (Sl. No.), 84mm (Material name), 26mm (Set. wt), 26mm (Ach. wt), 16mm (Error Kg), 12mm (Error %). Inlined constants based on mapping INPUT_SAMPLE: plant_name = \\\"SSR AQUA\\\" and location = \\\"Gudivada\\\". All other placeholders remain dynamic: from_date, to_date, and print_date are LATER_SELECTED; recipe_code maps to recipes.recipe_name; row fields sl_no, material_name, set_wt, ach_wt, error_kg, and error_pct remain UNRESOLVED; totals fields remain tokenized with SQL expressions for aggregation; page_label is LATER_SELECTED. No changes were made to the DOM structure, repeat rows, or data regions.\"\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761055373,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 3716,
    "prompt_tokens": 5210,
    "total_tokens": 8926,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 1792,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T14:10:27Z - contract_build_v2

```json
{
  "id": "chatcmpl-CT7HfwCxXuVMbljLEUoXe4gQdsrdL",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"overview_md\": \"Executive Summary\\n- Goal: Build a Consumption report that lists per-material Set/Achieved weights and error metrics by unpivoting bin1..bin12 columns from recipes, grouped by material name, with totals at the footer.\\n- Reshape: UNION ALL the 12 bin columns (content/sp/act) into a long form, drop blanks/zero-only entries, then group by trimmed material name.\\n- Grouping & Ordering: Group rows by TRIM(material_name). Order rows case-insensitively by material_name, with numeric tie-breakers for stability. Provide sequential Sl. No. based on that order.\\n- Filters: Required equality filter on recipe_code -> recipes.recipe_name. Optional date range filter on recipes.start_time using from_date/to_date (inclusive) when provided.\\n- Totals: Compute from the aggregated row dataset to ensure consistency with filters and reshape.\\n\\nToken Inventory (dynamic)\\n- Scalars: plant_name, location, from_date, to_date, print_date, recipe_code, report_title, company_name, page_label\\n- Row tokens: sl_no, material_name, set_wt, ach_wt, error_kg, error_pct\\n- Totals: total_set_wt, total_ach_wt, total_error_kg, total_error_pct\\n\\nMapping Table\\n- plant_name -> PARAM:plant_name\\n- location -> PARAM:location\\n- from_date -> PARAM:from_date\\n- to_date -> PARAM:to_date\\n- print_date -> PARAM:print_date\\n- recipe_code -> PARAM:recipe_code\\n- report_title -> 'Consumption report'\\n- company_name -> 'Indian Industrial Machines Pvt. Ltd.'\\n- page_label -> PARAM:page_label\\n- sl_no -> rows.sl_no\\n- material_name -> rows.material_name\\n- set_wt -> rows.set_wt\\n- ach_wt -> rows.ach_wt\\n- error_kg -> rows.error_kg\\n- error_pct -> rows.error_pct\\n- total_set_wt -> totals.total_set_wt\\n- total_ach_wt -> totals.total_ach_wt\\n- total_error_kg -> totals.total_error_kg\\n- total_error_pct -> totals.total_error_pct\\n\\nJoin & Date Rules\\n- Tables: single-table source recipes (no joins required).\\n- Date column: recipes.start_time is the canonical date for filtering.\\n- Date filter semantics: when from_date and to_date are both supplied, apply recipes.start_time BETWEEN :from_date AND :to_date (inclusive). If only one bound is provided, apply the corresponding single-sided predicate.\\n\\nTransformations\\n- Unpivot/Union: Create a staging dataset long_bins via UNION ALL across bin1..bin12 with columns (recipe_id, recipe_name, start_time, end_time, material_name, set_wt_kg, ach_wt_kg, bin_index).\\n- Pre-aggregation filters: Apply required recipe_code equality and optional date range filters to recipes before UNION. In the long form, drop rows where TRIM(material_name) IS NULL/empty and where both COALESCE(set_wt_kg,0)=0 AND COALESCE(ach_wt_kg,0)=0.\\n- Aggregation (rows dataset): GROUP BY TRIM(material_name). Compute:\\n  - set_wt = SUM(long_bins.set_wt_kg)\\n  - ach_wt = SUM(long_bins.ach_wt_kg)\\n  - error_kg = SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\\n  - error_pct = CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE ((SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) * 100.0) / SUM(long_bins.set_wt_kg) END\\n- Numbering: sl_no = ROW_NUMBER() OVER (ORDER BY UPPER(material_name) ASC, set_wt DESC, ach_wt DESC, material_name ASC)\\n- Totals: Compute from rows:\\n  - total_set_wt = SUM(rows.set_wt)\\n  - total_ach_wt = SUM(rows.ach_wt)\\n  - total_error_kg = SUM(rows.error_kg)\\n  - total_error_pct = (SUM(rows.error_kg) * 100.0) / NULLIF(SUM(rows.set_wt), 0)\\n\\nParameters\\n- Required: recipe_code (string). Downstream SQL must apply equality predicate recipes.recipe_name = :recipe_code in all entrypoints (rows/totals/parent) when value is supplied.\\n- Optional filters: from_date, to_date (date/datetime strings). Only apply when non-empty; inclusive semantics when both provided.\\n- Pass-through (header only): plant_name, location, print_date, page_label. Not used in SQL.\\n\\nChecklist for Step 5\\n- Datasets columns order must match schema lists exactly.\\n- Build long_bins via UNION ALL over bins 1..12 using only catalog columns; include bin_index 1..12 for tie-breaks.\\n- Apply filters before aggregation: required recipe_name equality; optional date range on recipes.start_time; drop blank materials and zero-only rows.\\n- Group by TRIM(material_name) and compute row metrics with COALESCE/NULLIF guards as specified.\\n- Ordering: ORDER BY UPPER(material_name) ASC, set_wt DESC, ach_wt DESC, material_name ASC; generate sl_no via ROW_NUMBER() over the same ordering.\\n- Totals must be computed from the rows dataset to mirror all filters/reshape.\\n- Use only columns from the allow-list; no additional tables/columns.\\n\",\n  \"step5_requirements\": {\n    \"datasets\": {\n      \"header\": {\n        \"description\": \"One-row header dataset for top-of-page fields; mainly pass-through parameters and constants.\",\n        \"columns\": [\n          \"plant_name\",\n          \"location\",\n          \"from_date\",\n          \"to_date\",\n          \"print_date\",\n          \"recipe_code\",\n          \"report_title\",\n          \"company_name\",\n          \"page_label\"\n        ]\n      },\n      \"rows\": {\n        \"description\": \"Detail rows by material after unpivoting bin1..bin12 from recipes and aggregating.\",\n        \"columns\": [\n          \"sl_no\",\n          \"material_name\",\n          \"set_wt\",\n          \"ach_wt\",\n          \"error_kg\",\n          \"error_pct\"\n        ],\n        \"grouping\": [\n          \"Group by TRIM(material_name) from the long_bins staging dataset.\",\n          \"Before grouping, filter out rows where TRIM(material_name) IS NULL or '' and where COALESCE(set_wt_kg,0)=0 AND COALESCE(ach_wt_kg,0)=0.\",\n          \"Apply required equality filter recipes.recipe_name = :recipe_code and optional date predicates on recipes.start_time prior to UNION/aggregation.\"\n        ],\n        \"ordering\": [\n          \"Stable sort: ORDER BY UPPER(material_name) ASC, set_wt DESC, ach_wt DESC, material_name ASC.\",\n          \"sl_no = ROW_NUMBER() OVER the same ORDER BY to ensure deterministic numbering.\"\n        ]\n      },\n      \"totals\": {\n        \"description\": \"Aggregate totals computed from the rows dataset to reflect all filters and reshaping.\",\n        \"columns\": [\n          \"total_set_wt\",\n          \"total_ach_wt\",\n          \"total_error_kg\",\n          \"total_error_pct\"\n        ]\n      }\n    },\n    \"semantics\": \"Key token recipe_code is a required user selection. SQL must apply equality predicate on recipes.recipe_name when provided. from_date/to_date are optional; when provided, apply inclusive range on recipes.start_time (both sides if both present, single-sided otherwise). Pass-through parameters plant_name, location, print_date, and page_label are only used for header rendering. All filters must be applied consistently to header (if needed), rows, and totals datasets.\",\n    \"parameters\": {\n      \"required\": [\n        {\n          \"name\": \"recipe_code\",\n          \"type\": \"string\"\n        }\n      ],\n      \"optional\": [\n        {\n          \"name\": \"from_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"to_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"plant_name\",\n          \"type\": \"string\"\n        },\n        {\n          \"name\": \"location\",\n          \"type\": \"string\"\n        },\n        {\n          \"name\": \"print_date\",\n          \"type\": \"string\"\n        },\n        {\n          \"name\": \"page_label\",\n          \"type\": \"string\"\n        }\n      ]\n    },\n    \"transformations\": [\n      \"Create long_bins (staging) via UNION ALL across the 12 bin columns of recipes, selecting: recipe_id=recipes.id, recipe_name=recipes.recipe_name, start_time=recipes.start_time, end_time=recipes.end_time, material_name=TRIM(recipes.binN_content), set_wt_kg=CAST(recipes.binN_sp AS NUMERIC), ach_wt_kg=CAST(recipes.binN_act AS NUMERIC), bin_index=N.\",\n      \"Apply filters before UNION/aggregation: recipes.recipe_name = :recipe_code (required), and optional date predicates on recipes.start_time using :from_date/:to_date when supplied.\",\n      \"In long_bins, drop rows with TRIM(material_name) IS NULL OR TRIM(material_name) = '' and where COALESCE(set_wt_kg,0)=0 AND COALESCE(ach_wt_kg,0)=0.\",\n      \"Aggregate rows by TRIM(material_name). Compute set_wt = SUM(set_wt_kg), ach_wt = SUM(ach_wt_kg), error_kg = SUM(ach_wt_kg) - SUM(set_wt_kg), error_pct = CASE WHEN SUM(set_wt_kg)=0 THEN NULL ELSE ((SUM(ach_wt_kg) - SUM(set_wt_kg)) * 100.0) / SUM(set_wt_kg) END.\",\n      \"Compute sl_no using ROW_NUMBER() OVER (ORDER BY UPPER(material_name) ASC, set_wt DESC, ach_wt DESC, material_name ASC).\",\n      \"Totals math mirrors row expressions: total_set_wt = SUM(rows.set_wt), total_ach_wt = SUM(rows.ach_wt), total_error_kg = SUM(rows.error_kg), total_error_pct = (SUM(rows.error_kg) * 100.0) / NULLIF(SUM(rows.set_wt), 0).\"\n    ]\n  },\n  \"contract\": {\n    \"tokens\": {\n      \"scalars\": [\n        \"plant_name\",\n        \"location\",\n        \"from_date\",\n        \"to_date\",\n        \"print_date\",\n        \"recipe_code\",\n        \"report_title\",\n        \"company_name\",\n        \"page_label\"\n      ],\n      \"row_tokens\": [\n        \"sl_no\",\n        \"material_name\",\n        \"set_wt\",\n        \"ach_wt\",\n        \"error_kg\",\n        \"error_pct\"\n      ],\n      \"totals\": [\n        \"total_set_wt\",\n        \"total_ach_wt\",\n        \"total_error_kg\",\n        \"total_error_pct\"\n      ]\n    },\n    \"mapping\": {\n      \"plant_name\": \"PARAM:plant_name\",\n      \"location\": \"PARAM:location\",\n      \"from_date\": \"PARAM:from_date\",\n      \"to_date\": \"PARAM:to_date\",\n      \"print_date\": \"PARAM:print_date\",\n      \"recipe_code\": \"PARAM:recipe_code\",\n      \"report_title\": \"'Consumption report'\",\n      \"company_name\": \"'Indian Industrial Machines Pvt. Ltd.'\",\n      \"page_label\": \"PARAM:page_label\",\n      \"sl_no\": \"rows.sl_no\",\n      \"material_name\": \"rows.material_name\",\n      \"set_wt\": \"rows.set_wt\",\n      \"ach_wt\": \"rows.ach_wt\",\n      \"error_kg\": \"rows.error_kg\",\n      \"error_pct\": \"rows.error_pct\",\n      \"total_set_wt\": \"totals.total_set_wt\",\n      \"total_ach_wt\": \"totals.total_ach_wt\",\n      \"total_error_kg\": \"totals.total_error_kg\",\n      \"total_error_pct\": \"totals.total_error_pct\"\n    },\n    \"unresolved\": [],\n    \"join\": {\n      \"parent_table\": \"recipes\",\n      \"parent_key\": \"id\",\n      \"child_table\": null,\n      \"child_key\": null\n    },\n    \"date_columns\": {\n      \"recipes\": \"start_time\"\n    },\n    \"filters\": {\n      \"required\": {\n        \"recipe_code\": \"recipes.recipe_name\"\n      },\n      \"optional\": {\n        \"from_date\": \"recipes.start_time\",\n        \"to_date\": \"recipes.start_time\"\n      }\n    },\n    \"reshape_rules\": [\n      {\n        \"purpose\": \"Produce rows dataset from wide bin columns\",\n        \"strategy\": \"UNION_ALL\",\n        \"explain\": \"Union bin1..bin12 columns into a long form with material content and weights; trim material names; drop blanks and zero-only rows; then group by material_name.\",\n        \"columns\": [\n          {\n            \"as\": \"material_name\",\n            \"from\": [\n              \"recipes.bin1_content\",\n              \"recipes.bin2_content\",\n              \"recipes.bin3_content\",\n              \"recipes.bin4_content\",\n              \"recipes.bin5_content\",\n              \"recipes.bin6_content\",\n              \"recipes.bin7_content\",\n              \"recipes.bin8_content\",\n              \"recipes.bin9_content\",\n              \"recipes.bin10_content\",\n              \"recipes.bin11_content\",\n              \"recipes.bin12_content\"\n            ]\n          },\n          {\n            \"as\": \"set_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_sp\",\n              \"recipes.bin2_sp\",\n              \"recipes.bin3_sp\",\n              \"recipes.bin4_sp\",\n              \"recipes.bin5_sp\",\n              \"recipes.bin6_sp\",\n              \"recipes.bin7_sp\",\n              \"recipes.bin8_sp\",\n              \"recipes.bin9_sp\",\n              \"recipes.bin10_sp\",\n              \"recipes.bin11_sp\",\n              \"recipes.bin12_sp\"\n            ]\n          },\n          {\n            \"as\": \"ach_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_act\",\n              \"recipes.bin2_act\",\n              \"recipes.bin3_act\",\n              \"recipes.bin4_act\",\n              \"recipes.bin5_act\",\n              \"recipes.bin6_act\",\n              \"recipes.bin7_act\",\n              \"recipes.bin8_act\",\n              \"recipes.bin9_act\",\n              \"recipes.bin10_act\",\n              \"recipes.bin11_act\",\n              \"recipes.bin12_act\"\n            ]\n          }\n        ]\n      }\n    ],\n    \"row_computed\": {\n      \"material_name\": \"TRIM(long_bins.material_name)\",\n      \"set_wt\": \"SUM(long_bins.set_wt_kg)\",\n      \"ach_wt\": \"SUM(long_bins.ach_wt_kg)\",\n      \"error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"error_pct\": \"CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE ((SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) * 100.0) / SUM(long_bins.set_wt_kg) END\"\n    },\n    \"totals_math\": {\n      \"total_set_wt\": \"SUM(rows.set_wt)\",\n      \"total_ach_wt\": \"SUM(rows.ach_wt)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_pct\": \"(SUM(rows.error_kg) * 100.0) / NULLIF(SUM(rows.set_wt), 0)\"\n    },\n    \"formatters\": {\n      \"set_wt\": \"number(2)\",\n      \"ach_wt\": \"number(2)\",\n      \"error_kg\": \"number(2)\",\n      \"error_pct\": \"number(4)\",\n      \"total_set_wt\": \"number(2)\",\n      \"total_ach_wt\": \"number(2)\",\n      \"total_error_kg\": \"number(2)\",\n      \"total_error_pct\": \"number(4)\",\n      \"print_date\": \"date(DD/MM/YYYY)\"\n    },\n    \"order_by\": {\n      \"rows\": [\n        \"UPPER(rows.material_name) ASC\",\n        \"rows.set_wt DESC\",\n        \"rows.ach_wt DESC\",\n        \"rows.material_name ASC\"\n      ]\n    },\n    \"notes\": \"Only the recipes table is in scope. Equality on recipe_code uses recipes.recipe_name. Date filters apply to recipes.start_time and are inclusive when both bounds are present. Error % is expressed as percent (x100).\"\n  },\n  \"validation\": {\n    \"unknown_tokens\": [],\n    \"unknown_columns\": [],\n    \"token_coverage\": {\n      \"scalars_mapped_pct\": 100,\n      \"row_tokens_mapped_pct\": 100,\n      \"totals_mapped_pct\": 100\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761055547,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 9706,
    "prompt_tokens": 8886,
    "total_tokens": 18592,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 6080,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T14:12:43Z - generator_assets_v1

```json
{
  "id": "chatcmpl-CT7MBiClgsaqaelaX867c0tgp8JUo",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "```json\n{\n  \"contract\": {\n    \"tokens\": {\n      \"scalars\": [\n        \"plant_name\",\n        \"location\",\n        \"from_date\",\n        \"to_date\",\n        \"print_date\",\n        \"recipe_code\",\n        \"report_title\",\n        \"company_name\",\n        \"page_label\"\n      ],\n      \"row_tokens\": [\n        \"sl_no\",\n        \"material_name\",\n        \"set_wt\",\n        \"ach_wt\",\n        \"error_kg\",\n        \"error_pct\"\n      ],\n      \"totals\": [\n        \"total_set_wt\",\n        \"total_ach_wt\",\n        \"total_error_kg\",\n        \"total_error_pct\"\n      ]\n    },\n    \"mapping\": {\n      \"plant_name\": \"PARAM:plant_name\",\n      \"location\": \"PARAM:location\",\n      \"from_date\": \"PARAM:from_date\",\n      \"to_date\": \"PARAM:to_date\",\n      \"print_date\": \"PARAM:print_date\",\n      \"recipe_code\": \"PARAM:recipe_code\",\n      \"report_title\": \"'Consumption report'\",\n      \"company_name\": \"'Indian Industrial Machines Pvt. Ltd.'\",\n      \"page_label\": \"PARAM:page_label\",\n      \"sl_no\": \"rows.sl_no\",\n      \"material_name\": \"rows.material_name\",\n      \"set_wt\": \"rows.set_wt\",\n      \"ach_wt\": \"rows.ach_wt\",\n      \"error_kg\": \"rows.error_kg\",\n      \"error_pct\": \"rows.error_pct\",\n      \"total_set_wt\": \"totals.total_set_wt\",\n      \"total_ach_wt\": \"totals.total_ach_wt\",\n      \"total_error_kg\": \"totals.total_error_kg\",\n      \"total_error_pct\": \"totals.total_error_pct\"\n    },\n    \"unresolved\": [],\n    \"join\": {\n      \"parent_table\": \"recipes\",\n      \"parent_key\": \"id\",\n      \"child_table\": \"recipes\",\n      \"child_key\": \"id\"\n    },\n    \"date_columns\": {\n      \"recipes\": \"start_time\"\n    },\n    \"filters\": {\n      \"required\": {\n        \"recipe_code\": \"recipes.recipe_name\"\n      },\n      \"optional\": {\n        \"from_date\": \"recipes.start_time\",\n        \"to_date\": \"recipes.start_time\"\n      }\n    },\n    \"reshape_rules\": [\n      {\n        \"purpose\": \"Produce rows dataset from wide bin columns\",\n        \"strategy\": \"UNION_ALL\",\n        \"explain\": \"Union bin1..bin12 columns into a long form with material content and weights; trim material names; drop blanks and zero-only rows; then group by material_name.\",\n        \"columns\": [\n          {\n            \"as\": \"material_name\",\n            \"from\": [\n              \"recipes.bin1_content\",\n              \"recipes.bin2_content\",\n              \"recipes.bin3_content\",\n              \"recipes.bin4_content\",\n              \"recipes.bin5_content\",\n              \"recipes.bin6_content\",\n              \"recipes.bin7_content\",\n              \"recipes.bin8_content\",\n              \"recipes.bin9_content\",\n              \"recipes.bin10_content\",\n              \"recipes.bin11_content\",\n              \"recipes.bin12_content\"\n            ]\n          },\n          {\n            \"as\": \"set_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_sp\",\n              \"recipes.bin2_sp\",\n              \"recipes.bin3_sp\",\n              \"recipes.bin4_sp\",\n              \"recipes.bin5_sp\",\n              \"recipes.bin6_sp\",\n              \"recipes.bin7_sp\",\n              \"recipes.bin8_sp\",\n              \"recipes.bin9_sp\",\n              \"recipes.bin10_sp\",\n              \"recipes.bin11_sp\",\n              \"recipes.bin12_sp\"\n            ]\n          },\n          {\n            \"as\": \"ach_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_act\",\n              \"recipes.bin2_act\",\n              \"recipes.bin3_act\",\n              \"recipes.bin4_act\",\n              \"recipes.bin5_act\",\n              \"recipes.bin6_act\",\n              \"recipes.bin7_act\",\n              \"recipes.bin8_act\",\n              \"recipes.bin9_act\",\n              \"recipes.bin10_act\",\n              \"recipes.bin11_act\",\n              \"recipes.bin12_act\"\n            ]\n          }\n        ]\n      }\n    ],\n    \"row_computed\": {\n      \"material_name\": \"TRIM(long_bins.material_name)\",\n      \"set_wt\": \"SUM(long_bins.set_wt_kg)\",\n      \"ach_wt\": \"SUM(long_bins.ach_wt_kg)\",\n      \"error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"error_pct\": \"CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE ((SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) * 100.0) / SUM(long_bins.set_wt_kg) END\"\n    },\n    \"totals_math\": {\n      \"total_set_wt\": \"SUM(rows.set_wt)\",\n      \"total_ach_wt\": \"SUM(rows.ach_wt)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_pct\": \"(SUM(rows.error_kg) * 100.0) / NULLIF(SUM(rows.set_wt), 0)\"\n    },\n    \"formatters\": {\n      \"set_wt\": \"number(2)\",\n      \"ach_wt\": \"number(2)\",\n      \"error_kg\": \"number(2)\",\n      \"error_pct\": \"number(4)\",\n      \"total_set_wt\": \"number(2)\",\n      \"total_ach_wt\": \"number(2)\",\n      \"total_error_kg\": \"number(2)\",\n      \"total_error_pct\": \"number(4)\",\n      \"print_date\": \"date(DD/MM/YYYY)\"\n    },\n    \"order_by\": {\n      \"rows\": [\n        \"UPPER(rows.material_name) ASC\",\n        \"rows.set_wt DESC\",\n        \"rows.ach_wt DESC\",\n        \"rows.material_name ASC\"\n      ]\n    },\n    \"notes\": \"Only the recipes table is in scope. Equality on recipe_code uses recipes.recipe_name. Date filters apply to recipes.start_time and are inclusive when both bounds are present. Error % is expressed as percent (x100).\",\n    \"header_tokens\": [\n      \"plant_name\",\n      \"location\",\n      \"from_date\",\n      \"to_date\",\n      \"print_date\",\n      \"recipe_code\",\n      \"report_title\",\n      \"company_name\",\n      \"page_label\"\n    ],\n    \"row_tokens\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_pct\"\n    ],\n    \"totals\": {\n      \"total_set_wt\": \"totals.total_set_wt\",\n      \"total_ach_wt\": \"totals.total_ach_wt\",\n      \"total_error_kg\": \"totals.total_error_kg\",\n      \"total_error_pct\": \"totals.total_error_pct\"\n    },\n    \"row_order\": [\n      \"UPPER(rows.material_name) ASC\",\n      \"rows.set_wt DESC\",\n      \"rows.ach_wt DESC\",\n      \"rows.material_name ASC\"\n    ],\n    \"literals\": {}\n  },\n  \"sql_pack\": {\n    \"dialect\": \"sqlite\",\n    \"script\": \"-- HEADER SELECT --\\nSELECT plant_name, location, from_date, to_date, print_date, recipe_code, report_title, company_name, page_label\\nFROM (SELECT :plant_name as plant_name, :location as location, :from_date as from_date, :to_date as to_date, :print_date as print_date, :recipe_code as recipe_code, 'Consumption report' as report_title, 'Indian Industrial Machines Pvt. Ltd.' as company_name, :page_label as page_label ) as header\\n-- ROWS SELECT --\\nSELECT ROW_NUMBER() OVER (ORDER BY UPPER(material_name) ASC, set_wt DESC, ach_wt DESC, material_name ASC) as sl_no, material_name, set_wt, ach_wt, error_kg, error_pct\\nFROM (SELECT TRIM(long_bins.material_name) as material_name, SUM(long_bins.set_wt_kg) as set_wt, SUM(long_bins.ach_wt_kg) as ach_wt, SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) as error_kg, CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE ((SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) * 100.0) / SUM(long_bins.set_wt_kg) END as error_pct\\nFROM (\\n  SELECT recipes.id as recipe_id, recipes.recipe_name as recipe_name, recipes.start_time as start_time, recipes.end_time as end_time,\\n    recipes.bin1_content as material_name, CAST(recipes.bin1_sp AS NUMERIC) as set_wt_kg, CAST(recipes.bin1_act AS NUMERIC) as ach_wt_kg\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin2_content, CAST(recipes.bin2_sp AS NUMERIC), CAST(recipes.bin2_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin3_content, CAST(recipes.bin3_sp AS NUMERIC), CAST(recipes.bin3_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin4_content, CAST(recipes.bin4_sp AS NUMERIC), CAST(recipes.bin4_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin5_content, CAST(recipes.bin5_sp AS NUMERIC), CAST(recipes.bin5_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin6_content, CAST(recipes.bin6_sp AS NUMERIC), CAST(recipes.bin6_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin7_content, CAST(recipes.bin7_sp AS NUMERIC), CAST(recipes.bin7_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin8_content, CAST(recipes.bin8_sp AS NUMERIC), CAST(recipes.bin8_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin9_content, CAST(recipes.bin9_sp AS NUMERIC), CAST(recipes.bin9_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin10_content, CAST(recipes.bin10_sp AS NUMERIC), CAST(recipes.bin10_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin11_content, CAST(recipes.bin11_sp AS NUMERIC), CAST(recipes.bin11_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin12_content, CAST(recipes.bin12_sp AS NUMERIC), CAST(recipes.bin12_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n) as long_bins\\nGROUP BY TRIM(long_bins.material_name)) as rows\\n-- TOTALS SELECT --\\nSELECT SUM(rows.set_wt) as total_set_wt, SUM(rows.ach_wt) as total_ach_wt, SUM(rows.error_kg) as total_error_kg, (SUM(rows.error_kg) * 100.0) / NULLIF(SUM(rows.set_wt), 0) as total_error_pct\\nFROM (SELECT TRIM(long_bins.material_name) as material_name, SUM(long_bins.set_wt_kg) as set_wt, SUM(long_bins.ach_wt_kg) as ach_wt, SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) as error_kg, CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE ((SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) * 100.0) / SUM(long_bins.set_wt_kg) END as error_pct\\nFROM (\\n  SELECT recipes.id as recipe_id, recipes.recipe_name as recipe_name, recipes.start_time as start_time, recipes.end_time as end_time,\\n    recipes.bin1_content as material_name, CAST(recipes.bin1_sp AS NUMERIC) as set_wt_kg, CAST(recipes.bin1_act AS NUMERIC) as ach_wt_kg\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin2_content, CAST(recipes.bin2_sp AS NUMERIC), CAST(recipes.bin2_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin3_content, CAST(recipes.bin3_sp AS NUMERIC), CAST(recipes.bin3_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin4_content, CAST(recipes.bin4_sp AS NUMERIC), CAST(recipes.bin4_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin5_content, CAST(recipes.bin5_sp AS NUMERIC), CAST(recipes.bin5_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin6_content, CAST(recipes.bin6_sp AS NUMERIC), CAST(recipes.bin6_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin7_content, CAST(recipes.bin7_sp AS NUMERIC), CAST(recipes.bin7_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin8_content, CAST(recipes.bin8_sp AS NUMERIC), CAST(recipes.bin8_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin9_content, CAST(recipes.bin9_sp AS NUMERIC), CAST(recipes.bin9_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin10_content, CAST(recipes.bin10_sp AS NUMERIC), CAST(recipes.bin10_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin11_content, CAST(recipes.bin11_sp AS NUMERIC), CAST(recipes.bin11_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n  UNION ALL\\n  SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time,\\n    recipes.bin12_content, CAST(recipes.bin12_sp AS NUMERIC), CAST(recipes.bin12_act AS NUMERIC)\\n  FROM recipes\\n  WHERE recipes.recipe_name = :recipe_code\\n) as long_bins\\nGROUP BY TRIM(long_bins.material_name)) as rows;\",\n    \"entrypoints\": {\n      \"header\": \"SELECT plant_name, location, from_date, to_date, print_date, recipe_code, report_title, company_name, page_label FROM (SELECT :plant_name as plant_name, :location as location, :from_date as from_date, :to_date as to_date, :print_date as print_date, :recipe_code as recipe_code, 'Consumption report' as report_title, 'Indian Industrial Machines Pvt. Ltd.' as company_name, :page_label as page_label ) as header\",\n      \"rows\": \"SELECT ROW_NUMBER() OVER (ORDER BY UPPER(material_name) ASC, set_wt DESC, ach_wt DESC, material_name ASC) as sl_no, material_name, set_wt, ach_wt, error_kg, error_pct FROM (SELECT TRIM(long_bins.material_name) as material_name, SUM(long_bins.set_wt_kg) as set_wt, SUM(long_bins.ach_wt_kg) as ach_wt, SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) as error_kg, CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE ((SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) * 100.0) / SUM(long_bins.set_wt_kg) END as error_pct FROM (SELECT recipes.id as recipe_id, recipes.recipe_name as recipe_name, recipes.start_time as start_time, recipes.end_time as end_time, recipes.bin1_content as material_name, CAST(recipes.bin1_sp AS NUMERIC) as set_wt_kg, CAST(recipes.bin1_act AS NUMERIC) as ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin2_content, CAST(recipes.bin2_sp AS NUMERIC), CAST(recipes.bin2_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin3_content, CAST(recipes.bin3_sp AS NUMERIC), CAST(recipes.bin3_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin4_content, CAST(recipes.bin4_sp AS NUMERIC), CAST(recipes.bin4_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin5_content, CAST(recipes.bin5_sp AS NUMERIC), CAST(recipes.bin5_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin6_content, CAST(recipes.bin6_sp AS NUMERIC), CAST(recipes.bin6_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin7_content, CAST(recipes.bin7_sp AS NUMERIC), CAST(recipes.bin7_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin8_content, CAST(recipes.bin8_sp AS NUMERIC), CAST(recipes.bin8_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin9_content, CAST(recipes.bin9_sp AS NUMERIC), CAST(recipes.bin9_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin10_content, CAST(recipes.bin10_sp AS NUMERIC), CAST(recipes.bin10_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin11_content, CAST(recipes.bin11_sp AS NUMERIC), CAST(recipes.bin11_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin12_content, CAST(recipes.bin12_sp AS NUMERIC), CAST(recipes.bin12_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code) as long_bins GROUP BY TRIM(long_bins.material_name)) as rows\",\n      \"totals\": \"SELECT SUM(rows.set_wt) as total_set_wt, SUM(rows.ach_wt) as total_ach_wt, SUM(rows.error_kg) as total_error_kg, (SUM(rows.error_kg) * 100.0) / NULLIF(SUM(rows.set_wt), 0) as total_error_pct FROM (SELECT TRIM(long_bins.material_name) as material_name, SUM(long_bins.set_wt_kg) as set_wt, SUM(long_bins.ach_wt_kg) as ach_wt, SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) as error_kg, CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE ((SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) * 100.0) / SUM(long_bins.set_wt_kg) END as error_pct FROM (SELECT recipes.id as recipe_id, recipes.recipe_name as recipe_name, recipes.start_time as start_time, recipes.end_time as end_time, recipes.bin1_content as material_name, CAST(recipes.bin1_sp AS NUMERIC) as set_wt_kg, CAST(recipes.bin1_act AS NUMERIC) as ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin2_content, CAST(recipes.bin2_sp AS NUMERIC), CAST(recipes.bin2_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin3_content, CAST(recipes.bin3_sp AS NUMERIC), CAST(recipes.bin3_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin4_content, CAST(recipes.bin4_sp AS NUMERIC), CAST(recipes.bin4_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin5_content, CAST(recipes.bin5_sp AS NUMERIC), CAST(recipes.bin5_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin6_content, CAST(recipes.bin6_sp AS NUMERIC), CAST(recipes.bin6_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin7_content, CAST(recipes.bin7_sp AS NUMERIC), CAST(recipes.bin7_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin8_content, CAST(recipes.bin8_sp AS NUMERIC), CAST(recipes.bin8_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin9_content, CAST(recipes.bin9_sp AS NUMERIC), CAST(recipes.bin9_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin10_content, CAST(recipes.bin10_sp AS NUMERIC), CAST(recipes.bin10_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin11_content, CAST(recipes.bin11_sp AS NUMERIC), CAST(recipes.bin11_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code UNION ALL SELECT recipes.id, recipes.recipe_name, recipes.start_time, recipes.end_time, recipes.bin12_content, CAST(recipes.bin12_sp AS NUMERIC), CAST(recipes.bin12_act AS NUMERIC) FROM recipes WHERE recipes.recipe_name = :recipe_code) as long_bins GROUP BY TRIM(long_bins.material_name)) as rows\"\n    },\n    \"params\": {\n      \"required\": [\n        \"recipe_code\"\n      ],\n      \"optional\": [\n        \"from_date\",\n        \"to_date\",\n        \"plant_name\",\n        \"location\",\n        \"print_date\",\n        \"page_label\"\n      ]\n    },\n    \"notes\": \"\",\n  },\n  \"output_schemas\": {\n    \"header\": [\n      \"plant_name\",\n      \"location\",\n      \"from_date\",\n      \"to_date\",\n      \"print_date\",\n      \"recipe_code\",\n      \"report_title\",\n      \"company_name\",\n      \"page_label\"\n    ],\n    \"rows\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_pct\"\n    ],\n    \"totals\": [\n      \"total_set_wt\",\n      \"total_ach_wt\",\n      \"total_error_kg\",\n      \"total_error_pct\"\n    ]\n  },\n  \"needs_user_fix\": [],\n  \"dry_run\": null,\n  \"summary\": {\n    \"dialect\": \"sqlite\",\n    \"params\": {\n      \"required\": [\n        \"recipe_code\"\n      ],\n      \"optional\": [\n        \"from_date\",\n        \"to_date\",\n        \"plant_name\",\n        \"location\",\n        \"print_date\",\n        \"page_label\"\n      ]\n    },\n    \"notes\": \"All filters must be applied consistently to header (if needed), rows, and totals datasets.\"\n  }\n}\n```",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761055827,
  "model": "gpt-4o-mini-2024-07-18",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": "fp_560af6e559",
  "usage": {
    "completion_tokens": 5798,
    "prompt_tokens": 7451,
    "total_tokens": 13249,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 0,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T15:42:16Z - template_initial_html

```json
{
  "id": "chatcmpl-CT8kWQgEJ50ZSqiAuhW19P2vjsVbI",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>{report_title}</title>\n<style>\n  @page { size: A4; margin: 14mm 16mm; }\n  :root{\n    --col-1-w: 18mm;\n    --col-2-w: 90mm;\n    --col-3-w: 28mm;\n    --col-4-w: 28mm;\n    --col-5-w: 24mm;\n    --col-6-w: 20mm;\n    --row-pad-v: 3.2mm;\n    --cell-pad-h: 3.2mm;\n    --rule: 1px solid #000;\n  }\n  *{ box-sizing: border-box; }\n  body{ font-family: Arial, Helvetica, sans-serif; font-size: 12px; color:#000; }\n  h1,h2,h3,p{ margin:0; }\n  .grid{\n    width:100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  .grid th,\n  .grid td{\n    border: var(--rule);\n    padding: calc(var(--row-pad-v) - 1mm) var(--cell-pad-h);\n    vertical-align: middle;\n    line-height: 1.25;\n  }\n  #report-header{\n    margin-bottom: 6mm;\n  }\n  #report-header .pad{\n    padding: 2.5mm var(--cell-pad-h);\n    border: var(--rule);\n  }\n  #report-header .right{ text-align: right; }\n  #report-header .title-row td{\n    padding: 3.2mm 0 4mm 0;\n    border-left: var(--rule);\n    border-right: var(--rule);\n    border-top: var(--rule);\n    border-bottom: none;\n  }\n  #report-header .title{\n    font-family: \"Times New Roman\", Times, serif;\n    font-size: 20px;\n    font-weight: 700;\n    text-align: center;\n  }\n  #report-header .below-title td{\n    border-left: var(--rule);\n    border-right: var(--rule);\n    border-top: none;\n    border-bottom: var(--rule);\n    padding: 2.5mm var(--cell-pad-h);\n  }\n\n  #data-table th{\n    background: #fff;\n    font-weight: 700;\n    text-align: left;\n  }\n  #data-table th:nth-child(1){ text-align: center; }\n  #data-table td:nth-child(1){ text-align: center; }\n  #data-table th:nth-child(3),\n  #data-table th:nth-child(4),\n  #data-table th:nth-child(5),\n  #data-table th:nth-child(6){ text-align: right; }\n  #data-table td:nth-child(3),\n  #data-table td:nth-child(4),\n  #data-table td:nth-child(5),\n  #data-table td:nth-child(6){ text-align: right; }\n  #data-table td{ padding-top: var(--row-pad-v); padding-bottom: var(--row-pad-v); }\n  #data-table tfoot td{\n    font-weight: 700;\n    background:#fff;\n  }\n\n  /* Column widths */\n  #data-table col.col-1{ width: var(--col-1-w); }\n  #data-table col.col-2{ width: var(--col-2-w); }\n  #data-table col.col-3{ width: var(--col-3-w); }\n  #data-table col.col-4{ width: var(--col-4-w); }\n  #data-table col.col-5{ width: var(--col-5-w); }\n  #data-table col.col-6{ width: var(--col-6-w); }\n\n  /* Footer */\n  #page-footer{\n    position: fixed;\n    left: 16mm;\n    right: 16mm;\n    bottom: 10mm;\n    font-size: 11px;\n  }\n  #page-footer .left{ float:left; }\n  #page-footer .center{ text-align: center; }\n  .muted{ color:#000; }\n</style>\n</head>\n<body>\n\n<table id=\"report-header\" class=\"grid\">\n  <colgroup>\n    <col style=\"width: 60%;\">\n    <col style=\"width: 40%;\">\n  </colgroup>\n  <tbody>\n    <tr>\n      <td class=\"pad\">\n        <strong>Plant name</strong> : {plant_name}\n      </td>\n      <td class=\"pad right\">\n        <strong>From Date</strong>: {from_date} &nbsp;&nbsp; <strong>To</strong> {to_date}\n      </td>\n    </tr>\n    <tr>\n      <td class=\"pad\">\n        <strong>Location</strong> &nbsp;&nbsp;: {location}\n      </td>\n      <td class=\"pad right\">\n        <!-- intentional blank to mirror spacing -->\n      </td>\n    </tr>\n    <tr class=\"title-row\">\n      <td class=\"title\" colspan=\"2\">{report_title}</td>\n    </tr>\n    <tr class=\"below-title\">\n      <td>\n        <strong>Print Date</strong> : {print_date}\n      </td>\n      <td class=\"right\">\n        <strong>Recipe code</strong> : {recipe_code}\n      </td>\n    </tr>\n  </tbody>\n</table>\n\n<table id=\"data-table\" class=\"grid\">\n  <colgroup>\n    <col class=\"col-1\">\n    <col class=\"col-2\">\n    <col class=\"col-3\">\n    <col class=\"col-4\">\n    <col class=\"col-5\">\n    <col class=\"col-6\">\n  </colgroup>\n  <thead>\n    <tr>\n      <th data-label=\"sl_no\">Sl. No.</th>\n      <th data-label=\"material_name\">Material name</th>\n      <th data-label=\"set_wt\">Set. wt(Kg)</th>\n      <th data-label=\"ach_wt\">Ach. wt(Kg)</th>\n      <th data-label=\"error_kg\">Error(Kg)</th>\n      <th data-label=\"error_pct\">Error %</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>{row_sl_no}</td>\n      <td>{row_material_name}</td>\n      <td>{row_set_wt}</td>\n      <td>{row_ach_wt}</td>\n      <td>{row_error_kg}</td>\n      <td>{row_error_pct}</td>\n    </tr>\n  </tbody>\n  <tfoot id=\"report-totals\">\n    <tr>\n      <td></td>\n      <td><strong>Total</strong></td>\n      <td>{total_set_wt}</td>\n      <td>{total_ach_wt}</td>\n      <td>{total_error_kg}</td>\n      <td>{total_error_pct}</td>\n    </tr>\n  </tfoot>\n</table>\n\n<div id=\"page-footer\">\n  <div class=\"left muted\">{company_name}</div>\n  <div class=\"center muted\">{page_number}</div>\n</div>\n\n</body>\n</html>\n<!--END_HTML-->\n\n<!--BEGIN_SCHEMA_JSON-->\n{\n  \"scalars\": [\n    \"plant_name\",\n    \"location\",\n    \"from_date\",\n    \"to_date\",\n    \"recipe_code\",\n    \"print_date\",\n    \"report_title\",\n    \"company_name\",\n    \"page_number\"\n  ],\n  \"row_tokens\": [\n    \"row_sl_no\",\n    \"row_material_name\",\n    \"row_set_wt\",\n    \"row_ach_wt\",\n    \"row_error_kg\",\n    \"row_error_pct\"\n  ],\n  \"totals\": [\n    \"total_set_wt\",\n    \"total_ach_wt\",\n    \"total_error_kg\",\n    \"total_error_pct\"\n  ],\n  \"notes\": \"\"\n}\n<!--END_SCHEMA_JSON-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761061180,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 5567,
    "prompt_tokens": 1544,
    "total_tokens": 7111,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 3840,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T15:43:53Z - template_fix_html_call2

```json
{
  "id": "chatcmpl-CT8nAm3LxXq1PWQ2VwjMNMIO5T8pw",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n<title>{report_title}</title>\n<style>\n  @page { size: A4; margin: 14mm 16mm; }\n  :root{\n    --col-1-w: 12.8mm;\n    --col-2-w: 89.2mm;\n    --col-3-w: 19mm;\n    --col-4-w: 19mm;\n    --col-5-w: 19mm;\n    --col-6-w: 19mm;\n    --row-pad-v: 2.4mm;\n    --cell-pad-h: 2.8mm;\n    --rule: 1px solid #000;\n  }\n\n  *{ box-sizing: border-box; }\n  body{\n    font-family: Arial, Helvetica, sans-serif;\n    font-size: 12px;\n    color:#000;\n    margin:0;\n  }\n  h1,h2,h3,p{ margin:0; }\n\n  .grid{\n    width:100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  .grid th,\n  .grid td{\n    border: var(--rule);\n    padding: var(--row-pad-v) var(--cell-pad-h);\n    vertical-align: middle;\n    line-height: 1.2;\n  }\n\n  /* Header block */\n  #report-header{ margin-bottom: 3.5mm; }\n  #report-header .pad{\n    padding: 2.2mm var(--cell-pad-h);\n  }\n  #report-header .right{ text-align: right; white-space: nowrap; }\n  #report-header .title-row td{\n    border-left: var(--rule);\n    border-right: var(--rule);\n    border-top: var(--rule);\n    border-bottom: none;\n    padding: 3mm 0 3.2mm 0;\n  }\n  #report-header .title{\n    font-family: \"Times New Roman\", Times, serif;\n    font-size: 20px;\n    font-weight: 700;\n    text-align: center;\n    letter-spacing: 0.1px;\n  }\n  #report-header .below-title td{\n    border-left: var(--rule);\n    border-right: var(--rule);\n    border-top: var(--rule);\n    border-bottom: var(--rule);\n    padding: 2.2mm var(--cell-pad-h);\n  }\n\n  /* Data table */\n  #data-table{ font-variant-numeric: tabular-nums; }\n  #data-table th{\n    background:#fff;\n    font-weight:700;\n    text-align: left;\n    padding-top: 2mm;\n    padding-bottom: 2mm;\n    white-space: nowrap;\n  }\n  #data-table thead th{\n    border-top: var(--rule);\n  }\n  #data-table th:nth-child(1),\n  #data-table td:nth-child(1){ text-align: center; }\n  #data-table th:nth-child(3),\n  #data-table th:nth-child(4),\n  #data-table th:nth-child(5),\n  #data-table th:nth-child(6){ text-align: right; }\n  #data-table td:nth-child(3),\n  #data-table td:nth-child(4),\n  #data-table td:nth-child(5),\n  #data-table td:nth-child(6){ text-align: right; }\n  #data-table td{\n    padding-top: var(--row-pad-v);\n    padding-bottom: var(--row-pad-v);\n  }\n  #data-table tfoot td{\n    font-weight: 700;\n    background:#fff;\n    border-top: 2px solid #000;\n  }\n\n  /* Column widths */\n  #data-table col.col-1{ width: var(--col-1-w); }\n  #data-table col.col-2{ width: var(--col-2-w); }\n  #data-table col.col-3{ width: var(--col-3-w); }\n  #data-table col.col-4{ width: var(--col-4-w); }\n  #data-table col.col-5{ width: var(--col-5-w); }\n  #data-table col.col-6{ width: var(--col-6-w); }\n\n  /* Footer */\n  #page-footer{\n    position: fixed;\n    left: 16mm;\n    right: 16mm;\n    bottom: 10mm;\n    font-size: 11px;\n    line-height: 1;\n  }\n  #page-footer .left{ float:left; }\n  #page-footer .center{ text-align: center; }\n  .muted{ color:#000; }\n\n  /* Pagination stability */\n  .batch-block{ break-inside: avoid; page-break-inside: avoid; }\n</style>\n</head>\n<body>\n\n<table id=\"report-header\" class=\"grid\">\n  <colgroup>\n    <col style=\"width: 60%;\" />\n    <col style=\"width: 40%;\" />\n  </colgroup>\n  <tbody>\n    <tr>\n      <td class=\"pad\">\n        <strong>Plant name</strong> : {plant_name}\n      </td>\n      <td class=\"pad right\">\n        <strong>From Date</strong>: {from_date}  <strong>To</strong> {to_date}\n      </td>\n    </tr>\n    <tr>\n      <td class=\"pad\">\n        <strong>Location</strong>  : {location}\n      </td>\n      <td class=\"pad right\">\n        \n      </td>\n    </tr>\n    <tr class=\"title-row\">\n      <td class=\"title\" colspan=\"2\">{report_title}</td>\n    </tr>\n    <tr class=\"below-title\">\n      <td>\n        <strong>Print Date</strong> : {print_date}\n      </td>\n      <td class=\"right\">\n        <strong>Recipe code</strong> : {recipe_code}\n      </td>\n    </tr>\n  </tbody>\n</table>\n\n<table id=\"data-table\" class=\"grid\">\n  <colgroup>\n    <col class=\"col-1\" />\n    <col class=\"col-2\" />\n    <col class=\"col-3\" />\n    <col class=\"col-4\" />\n    <col class=\"col-5\" />\n    <col class=\"col-6\" />\n  </colgroup>\n  <thead>\n    <tr>\n      <th data-label=\"sl_no\">Sl. No.</th>\n      <th data-label=\"material_name\">Material name</th>\n      <th data-label=\"set_wt\">Set. wt(Kg)</th>\n      <th data-label=\"ach_wt\">Ach. wt(Kg)</th>\n      <th data-label=\"error_kg\">Error(Kg)</th>\n      <th data-label=\"error_pct\">Error %</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>{row_sl_no}</td>\n      <td>{row_material_name}</td>\n      <td>{row_set_wt}</td>\n      <td>{row_ach_wt}</td>\n      <td>{row_error_kg}</td>\n      <td>{row_error_pct}</td>\n    </tr>\n  </tbody>\n  <tfoot id=\"report-totals\">\n    <tr>\n      <td></td>\n      <td><strong>Total</strong></td>\n      <td>{total_set_wt}</td>\n      <td>{total_ach_wt}</td>\n      <td>{total_error_kg}</td>\n      <td>{total_error_pct}</td>\n    </tr>\n  </tfoot>\n</table>\n\n<div id=\"page-footer\">\n  <div class=\"left muted\">{company_name}</div>\n  <div class=\"center muted\">{page_number}</div>\n</div>\n\n</body>\n</html>\n<!--END_HTML-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761061344,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 4502,
    "prompt_tokens": 3863,
    "total_tokens": 8365,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 2816,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T15:46:55Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CT8pO9bn8mItL0CjEW8zgSONANekm",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"print_date\": \"params.print_date\",\n    \"recipe_code\": \"params.recipe_code\",\n    \"row_sl_no\": \"UNRESOLVED\",\n    \"row_material_name\": \"UNRESOLVED\",\n    \"row_set_wt\": \"UNRESOLVED\",\n    \"row_ach_wt\": \"UNRESOLVED\",\n    \"row_error_kg\": \"UNRESOLVED\",\n    \"row_error_pct\": \"UNRESOLVED\",\n    \"total_set_wt\": \"(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp))\",\n    \"total_error_pct\": \"(((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / NULLIF((recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp), 0) * 100.0)\",\n    \"page_number\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"report_title\": \"Consumption report\",\n    \"plant_name\": \"SSR AQUA\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"row_sl_no\": \"1\",\n    \"row_material_name\": \"CM 100 + DORB 100 KRR\",\n    \"row_set_wt\": \"11,800.00\",\n    \"row_ach_wt\": \"11,803.20\",\n    \"row_error_kg\": \"3.20\",\n    \"row_error_pct\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\",\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_number\": \"Page 1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"row_sl_no\",\n      \"row_material_name\",\n      \"row_set_wt\",\n      \"row_ach_wt\",\n      \"row_error_kg\",\n      \"row_error_pct\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761061482,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6347,
    "prompt_tokens": 3841,
    "total_tokens": 10188,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5184,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T15:47:01Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CT8pO6qFTQebfgO4FjEpUFujyXfYa",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_weight\": \"UNRESOLVED\",\n    \"achieved_weight\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_percent\": \"UNRESOLVED\",\n\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"print_date\": \"params.print_date\",\n    \"recipe_code\": \"params.recipe_code\",\n    \"page_number\": \"To Be Selected...\",\n\n    \"row_sl_no\": \"UNRESOLVED\",\n    \"row_material_name\": \"UNRESOLVED\",\n    \"row_set_wt\": \"UNRESOLVED\",\n    \"row_ach_wt\": \"UNRESOLVED\",\n    \"row_error_kg\": \"UNRESOLVED\",\n    \"row_error_pct\": \"UNRESOLVED\",\n\n    \"total_set_wt\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_error_pct\": \"CASE WHEN SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN NULL ELSE (SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\"\n  },\n  \"token_samples\": {\n    \"report_title\": \"Consumption report\",\n    \"plant_name\": \"SSR AQUA\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n\n    \"row_sl_no\": \"1\",\n    \"row_material_name\": \"CM 100 + DORB 100 KRR\",\n    \"row_set_wt\": \"11,800.00\",\n    \"row_ach_wt\": \"11,803.20\",\n    \"row_error_kg\": \"3.20\",\n    \"row_error_pct\": \"0.0271\",\n\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\",\n\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_number\": \"Page 1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_weight\",\n      \"achieved_weight\",\n      \"error_kg\",\n      \"error_percent\",\n      \"row_sl_no\",\n      \"row_material_name\",\n      \"row_set_wt\",\n      \"row_ach_wt\",\n      \"row_error_kg\",\n      \"row_error_pct\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_sp\",\"recipes.bin2_sp\",\"recipes.bin3_sp\",\"recipes.bin4_sp\",\"recipes.bin5_sp\",\"recipes.bin6_sp\",\"recipes.bin7_sp\",\"recipes.bin8_sp\",\"recipes.bin9_sp\",\"recipes.bin10_sp\",\"recipes.bin11_sp\",\"recipes.bin12_sp\"] },\n      \"total_ach_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_act\",\"recipes.bin2_act\",\"recipes.bin3_act\",\"recipes.bin4_act\",\"recipes.bin5_act\",\"recipes.bin6_act\",\"recipes.bin7_act\",\"recipes.bin8_act\",\"recipes.bin9_act\",\"recipes.bin10_act\",\"recipes.bin11_act\",\"recipes.bin12_act\"] },\n      \"total_error_kg\": { \"op\": \"DIFF_OF_SUMS\", \"over_act\": [\"recipes.bin1_act\",\"recipes.bin2_act\",\"recipes.bin3_act\",\"recipes.bin4_act\",\"recipes.bin5_act\",\"recipes.bin6_act\",\"recipes.bin7_act\",\"recipes.bin8_act\",\"recipes.bin9_act\",\"recipes.bin10_act\",\"recipes.bin11_act\",\"recipes.bin12_act\"], \"over_sp\": [\"recipes.bin1_sp\",\"recipes.bin2_sp\",\"recipes.bin3_sp\",\"recipes.bin4_sp\",\"recipes.bin5_sp\",\"recipes.bin6_sp\",\"recipes.bin7_sp\",\"recipes.bin8_sp\",\"recipes.bin9_sp\",\"recipes.bin10_sp\",\"recipes.bin11_sp\",\"recipes.bin12_sp\"] },\n      \"total_error_pct\": { \"op\": \"RATIO_OF_DIFF_TO_SUM\", \"numerator_over_act\": [\"recipes.bin1_act\",\"recipes.bin2_act\",\"recipes.bin3_act\",\"recipes.bin4_act\",\"recipes.bin5_act\",\"recipes.bin6_act\",\"recipes.bin7_act\",\"recipes.bin8_act\",\"recipes.bin9_act\",\"recipes.bin10_act\",\"recipes.bin11_act\",\"recipes.bin12_act\"], \"denominator_over_sp\": [\"recipes.bin1_sp\",\"recipes.bin2_sp\",\"recipes.bin3_sp\",\"recipes.bin4_sp\",\"recipes.bin5_sp\",\"recipes.bin6_sp\",\"recipes.bin7_sp\",\"recipes.bin8_sp\",\"recipes.bin9_sp\",\"recipes.bin10_sp\",\"recipes.bin11_sp\",\"recipes.bin12_sp\"] }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761061482,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 7018,
    "prompt_tokens": 3841,
    "total_tokens": 10859,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5440,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 3712
    }
  }
}
```

## 2025-10-21T15:50:12Z - llm_call_3_5

```json
{
  "id": "chatcmpl-CT8t5QuU43oMdILhTl74FupWvRc5b",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"final_template_html\": \"\\n<html>\\n<head>\\n<meta charset=\\\"utf-8\\\" />\\n<title>Consumption report</title>\\n<style>\\n  @page { size: A4; margin: 14mm 16mm; }\\n  :root{\\n    /* Adjusted column widths to provide ample and consistent space (sum = 178mm printable width) */\\n    --col-1-w: 13mm;   /* Sl. No. */\\n    --col-2-w: 85mm;   /* Material name */\\n    --col-3-w: 20mm;   /* Set. wt(Kg) */\\n    --col-4-w: 20mm;   /* Ach. wt(Kg) */\\n    --col-5-w: 20mm;   /* Error(Kg) */\\n    --col-6-w: 20mm;   /* Error % */\\n\\n    /* Spacing tweaks to mirror PDF */\\n    --row-pad-v: 2.8mm;\\n    --cell-pad-h: 3.2mm;\\n    --rule: 1px solid #000;\\n  }\\n\\n  *{ box-sizing: border-box; }\\n  body{\\n    font-family: Arial, Helvetica, sans-serif;\\n    font-size: 12px;\\n    color:#000;\\n    margin:0;\\n  }\\n  h1,h2,h3,p{ margin:0; }\\n\\n  .grid{\\n    width:100%;\\n    border-collapse: collapse;\\n    table-layout: fixed;\\n  }\\n  .grid th,\\n  .grid td{\\n    border: var(--rule);\\n    padding: var(--row-pad-v) var(--cell-pad-h);\\n    vertical-align: middle;\\n    line-height: 1.2;\\n  }\\n\\n  /* Header block */\\n  #report-header{ margin-bottom: 3.5mm; }\\n  #report-header .pad{\\n    padding: 2.6mm var(--cell-pad-h);\\n  }\\n  #report-header .right{ text-align: right; white-space: nowrap; }\\n  #report-header .title-row td{\\n    border-left: var(--rule);\\n    border-right: var(--rule);\\n    border-top: var(--rule);\\n    border-bottom: none;\\n    padding: 3mm 0 3.2mm 0;\\n  }\\n  #report-header .title{\\n    font-family: \\\"Times New Roman\\\", Times, serif;\\n    font-size: 20px;\\n    font-weight: 700;\\n    text-align: center;\\n    letter-spacing: 0.1px;\\n  }\\n  #report-header .below-title td{\\n    border-left: var(--rule);\\n    border-right: var(--rule);\\n    border-top: var(--rule);\\n    border-bottom: var(--rule);\\n    padding: 2.4mm var(--cell-pad-h);\\n  }\\n\\n  /* Data table */\\n  #data-table{ font-variant-numeric: tabular-nums; }\\n  #data-table th{\\n    background:#fff;\\n    font-weight:700;\\n    text-align: left;\\n    padding-top: 2.6mm;\\n    padding-bottom: 2.6mm;\\n    white-space: nowrap;\\n  }\\n  #data-table thead th{\\n    border-top: var(--rule);\\n  }\\n  #data-table th:nth-child(1),\\n  #data-table td:nth-child(1){ text-align: center; }\\n  #data-table th:nth-child(3),\\n  #data-table th:nth-child(4),\\n  #data-table th:nth-child(5),\\n  #data-table th:nth-child(6){ text-align: right; }\\n  #data-table td:nth-child(3),\\n  #data-table td:nth-child(4),\\n  #data-table td:nth-child(5),\\n  #data-table td:nth-child(6){ text-align: right; white-space: nowrap; }\\n  #data-table td{\\n    padding-top: var(--row-pad-v);\\n    padding-bottom: var(--row-pad-v);\\n  }\\n  #data-table tfoot td{\\n    font-weight: 700;\\n    background:#fff;\\n    border-top: 2px solid #000;\\n  }\\n\\n  /* Column widths */\\n  #data-table col.col-1{ width: var(--col-1-w); }\\n  #data-table col.col-2{ width: var(--col-2-w); }\\n  #data-table col.col-3{ width: var(--col-3-w); }\\n  #data-table col.col-4{ width: var(--col-4-w); }\\n  #data-table col.col-5{ width: var(--col-5-w); }\\n  #data-table col.col-6{ width: var(--col-6-w); }\\n\\n  /* Footer */\\n  #page-footer{\\n    position: fixed;\\n    left: 16mm;\\n    right: 16mm;\\n    bottom: 10mm;\\n    font-size: 11px;\\n    line-height: 1;\\n  }\\n  #page-footer .left{ float:left; }\\n  #page-footer .center{ text-align: center; }\\n  .muted{ color:#000; }\\n\\n  /* Pagination stability */\\n  .batch-block{ break-inside: avoid; page-break-inside: avoid; }\\n</style>\\n</head>\\n<body>\\n\\n<table id=\\\"report-header\\\" class=\\\"grid\\\">\\n  <colgroup>\\n    <col style=\\\"width: 60%;\\\" />\\n    <col style=\\\"width: 40%;\\\" />\\n  </colgroup>\\n  <tbody>\\n    <tr>\\n      <td class=\\\"pad\\\">\\n        <strong>Plant name</strong> : SSR AQUA\\n      </td>\\n      <td class=\\\"pad right\\\">\\n        <strong>From Date</strong>: {from_date}  <strong>To</strong> {to_date}\\n      </td>\\n    </tr>\\n    <tr>\\n      <td class=\\\"pad\\\">\\n        <strong>Location</strong>  : Gudivada\\n      </td>\\n      <td class=\\\"pad right\\\">\\n        \\n      </td>\\n    </tr>\\n    <tr class=\\\"title-row\\\">\\n      <td class=\\\"title\\\" colspan=\\\"2\\\">Consumption report</td>\\n    </tr>\\n    <tr class=\\\"below-title\\\">\\n      <td>\\n        <strong>Print Date</strong> : {print_date}\\n      </td>\\n      <td class=\\\"right\\\">\\n        <strong>Recipe code</strong> : {recipe_code}\\n      </td>\\n    </tr>\\n  </tbody>\\n</table>\\n\\n<table id=\\\"data-table\\\" class=\\\"grid\\\">\\n  <colgroup>\\n    <col class=\\\"col-1\\\" />\\n    <col class=\\\"col-2\\\" />\\n    <col class=\\\"col-3\\\" />\\n    <col class=\\\"col-4\\\" />\\n    <col class=\\\"col-5\\\" />\\n    <col class=\\\"col-6\\\" />\\n  </colgroup>\\n  <thead>\\n    <tr>\\n      <th data-label=\\\"sl_no\\\">Sl. No.</th>\\n      <th data-label=\\\"material_name\\\">Material name</th>\\n      <th data-label=\\\"set_wt\\\">Set. wt(Kg)</th>\\n      <th data-label=\\\"ach_wt\\\">Ach. wt(Kg)</th>\\n      <th data-label=\\\"error_kg\\\">Error(Kg)</th>\\n      <th data-label=\\\"error_pct\\\">Error %</th>\\n    </tr>\\n  </thead>\\n  <tbody>\\n    <tr>\\n      <td>{row_sl_no}</td>\\n      <td>{row_material_name}</td>\\n      <td>{row_set_wt}</td>\\n      <td>{row_ach_wt}</td>\\n      <td>{row_error_kg}</td>\\n      <td>{row_error_pct}</td>\\n    </tr>\\n  </tbody>\\n  <tfoot id=\\\"report-totals\\\">\\n    <tr>\\n      <td></td>\\n      <td><strong>Total</strong></td>\\n      <td>{total_set_wt}</td>\\n      <td>{total_ach_wt}</td>\\n      <td>{total_error_kg}</td>\\n      <td>{total_error_pct}</td>\\n    </tr>\\n  </tfoot>\\n</table>\\n\\n<div id=\\\"page-footer\\\">\\n  <div class=\\\"left muted\\\">Indian Industrial Machines Pvt. Ltd.</div>\\n  <div class=\\\"center muted\\\">{page_number}</div>\\n</div>\\n\\n</body>\\n</html>\",\n  \"page_summary\": \"Adjusted CSS only to improve readability and mirror the reference PDF while preserving DOM, data regions, and tokens. Column widths now sum to the printable width (178 mm): Sl. No. 13 mm, Material name 85 mm, and each numeric column (Set. wt, Ach. wt, Error(Kg), Error %) 20 mm for consistent numeric space. Increased horizontal and vertical paddings (cell-pad-h 3.2 mm, row-pad-v 2.8 mm) and slightly larger header row padding for clearer separation. No structural changes were made. Inlined constants based on mapping: plant_name = \\\"SSR AQUA\\\" and location = \\\"Gudivada\\\". All other placeholders remain dynamic: from_date, to_date, print_date, recipe_code, page_number, row_sl_no, row_material_name, row_set_wt, row_ach_wt, row_error_kg, row_error_pct, total_set_wt, total_ach_wt, total_error_kg, total_error_pct. Reference sample values (not inlined) suggest: from_date 24/03/2024, to_date 24/03/2024, print_date 25/03/2024, recipe_code GANGADHAR-2024, totals around 80,000.00 set vs 80,016.00 achieved with 16.00 kg difference and 0.0200 in the Error % column. Note on interpretation: the \\\"Error %\\\" sample values appear as decimal fractions (e.g., 0.0271) rather than 0\u2013100 percentages; confirm whether to multiply by 100 for display. Footer company name is a constant string already present; page_number remains a token (sample: \\\"Page 1 of 1\\\"). No unresolved tokens were inadvertently replaced beyond the two constants, and repeat/row prototypes were left untouched.\"\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761061711,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 5667,
    "prompt_tokens": 6027,
    "total_tokens": 11694,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 3264,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T16:01:05Z - contract_build_v2

```json
{
  "id": "chatcmpl-CT8zyEkbVZGNUOmUd254iHA5781Yj",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"overview_md\": \"Executive Summary\\n- Goal: Build a Consumption report for a specific recipe code and date range using recipes table bin columns (bin1..bin12 for content/setpoint/actual). Rows list materials with set/achieved weights and error metrics; totals aggregate across all materials.\\n- Reshaping: Unpivot recipes.bin{1..12}_{content,sp,act} into a long form (long_bins), drop blank material names, normalize names via UPPER(TRIM(...)), then aggregate per normalized material name. The report expects Error % as a decimal fraction (e.g., 0.0200), not multiplied by 100.\\n- Filters: Required recipe_code equality against recipes.recipe_name and required date range filter on recipes.start_time between from_date and to_date (inclusive). These apply to header, rows, and totals.\\n- Totals: Totals compute using authoritative mapping_override expressions that sum across bin columns, with NULLIF/CASE protection for divide-by-zero in Error %.\\n\\nToken Inventory\\n- Scalars: plant_name, location, from_date, to_date, recipe_code, print_date, report_title, company_name, page_number\\n- Rows: row_sl_no, row_material_name, row_set_wt, row_ach_wt, row_error_kg, row_error_pct\\n- Totals: total_set_wt, total_ach_wt, total_error_kg, total_error_pct\\n\\nMapping Table\\n- plant_name -> PARAM:plant_name (pass-through)\\n- location -> PARAM:location (pass-through)\\n- from_date -> PARAM:from_date (required; drives date filter)\\n- to_date -> PARAM:to_date (required; drives date filter)\\n- recipe_code -> PARAM:recipe_code (required; equals recipes.recipe_name)\\n- print_date -> PARAM:print_date (pass-through)\\n- report_title -> 'Consumption report' (SQL literal)\\n- company_name -> 'Indian Industrial Machines Pvt. Ltd.' (SQL literal)\\n- page_number -> PARAM:page_number (pass-through)\\n- row_sl_no -> ROW_NUMBER() OVER (ORDER BY UPPER(TRIM(long_bins.material_name)) ASC)\\n- row_material_name -> UPPER(TRIM(long_bins.material_name))\\n- row_set_wt -> SUM(long_bins.set_wt_kg)\\n- row_ach_wt -> SUM(long_bins.ach_wt_kg)\\n- row_error_kg -> SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\\n- row_error_pct -> CASE WHEN SUM(long_bins.set_wt_kg) = 0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) END\\n- total_set_wt -> SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\\n- total_ach_wt -> SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\\n- total_error_kg -> SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\\n- total_error_pct -> CASE WHEN SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN NULL ELSE (SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\\n\\nJoin & Date Rules\\n- Tables: Single table recipes; no child tables or joins.\\n- Primary key: recipes.id (not displayed but can be used for stability).\\n- Date column: recipes.start_time.\\n- Date filter semantics: Apply inclusive range over recipes.start_time between from_date and to_date. For SQL compilation: treat from_date and to_date as dates; apply start_time >= from_date at 00:00:00 and < (to_date + 1 day) or an equivalent inclusive predicate supported by the target dialect.\\n\\nTransformations\\n- Unpivot/Union: Create CTE long_bins with columns (recipe_id, recipe_name, ts, material_name, set_wt_kg, ach_wt_kg) as UNION ALL of 12 SELECTs mapping from recipes.binX_content, recipes.binX_sp, recipes.binX_act. Apply required filters (date range, recipe_code) to the base recipes before unpivoting to avoid unnecessary rows.\\n- Cleaning: In long_bins, drop rows where TRIM(material_name) IS NULL or equals ''.\\n- Aggregation (rows dataset): Group by normalized material name: UPPER(TRIM(material_name)). Compute set/achieved sums and error metrics. Compute row_sl_no via ROW_NUMBER() over the sorted aggregated rows.\\n- Totals: Use authoritative expressions over the recipes bin columns for total_set_wt, total_ach_wt, total_error_kg, and total_error_pct, mirroring mapping_override. Error % is a fraction, not multiplied by 100.\\n\\nParameters\\n- Required: from_date (date), to_date (date), recipe_code (string). These must filter all entrypoints (header, rows, totals) with equality for recipe_code and inclusive date range on recipes.start_time.\\n- Optional/Pass-through: plant_name (string), location (string), print_date (date), page_number (string), report_title (string via SQL literal), company_name (string via SQL literal). Optional parameters do not drive filters.\\n- Examples: from_date=2024-03-24, to_date=2024-03-24, recipe_code='GANGADHAR-2024'.\\n\\nChecklist for Step 5\\n- Use only catalog columns from recipes.* enumerated in the allow-list.\\n- Build CTE long_bins via UNION ALL of bin1..bin12 mappings, filtering recipes by date range and recipe_code first.\\n- Drop rows with blank/NULL material_name prior to grouping.\\n- Normalize material name as UPPER(TRIM(material_name)) for grouping; display the normalized name.\\n- Rows grouping: by UPPER(TRIM(long_bins.material_name)).\\n- Rows ordering: ORDER BY row_material_name ASC; assign row_sl_no with ROW_NUMBER() over the same order.\\n- Totals must use the provided mapping_override expressions and the same filters; protect division by zero via CASE.\\n- Error % should remain a decimal fraction (e.g., 0.0200), not multiplied by 100.\\n- Ensure equality filter for recipe_code is applied on recipes.recipe_name when the parameter is supplied (required).\\n- Date filter is inclusive from from_date to to_date across all datasets.\\n- Column orders in datasets must follow the schema arrays exactly.\",\n  \"step5_requirements\": {\n    \"datasets\": {\n      \"header\": {\n        \"description\": \"One-row header dataset\",\n        \"columns\": [\n          \"plant_name\",\n          \"location\",\n          \"from_date\",\n          \"to_date\",\n          \"recipe_code\",\n          \"print_date\",\n          \"report_title\",\n          \"company_name\",\n          \"page_number\"\n        ]\n      },\n      \"rows\": {\n        \"description\": \"Detail rows dataset aggregated by normalized material name\",\n        \"columns\": [\n          \"row_sl_no\",\n          \"row_material_name\",\n          \"row_set_wt\",\n          \"row_ach_wt\",\n          \"row_error_kg\",\n          \"row_error_pct\"\n        ],\n        \"grouping\": [\n          \"Group by normalized material name: UPPER(TRIM(long_bins.material_name)).\",\n          \"Drop rows where TRIM(long_bins.material_name) IS NULL or equals ''.\",\n          \"Apply filters (recipes.start_time date range and recipes.recipe_name = :recipe_code) before unpivot and grouping to minimize rows.\"\n        ],\n        \"ordering\": [\n          \"Primary: row_material_name ASC (case-normalized, upper-cased).\",\n          \"Tie-breakers (deterministic): row_set_wt DESC, row_ach_wt DESC.\"\n        ]\n      },\n      \"totals\": {\n        \"description\": \"Aggregate totals dataset computed directly from recipes bin columns\",\n        \"columns\": [\n          \"total_set_wt\",\n          \"total_ach_wt\",\n          \"total_error_kg\",\n          \"total_error_pct\"\n        ]\n      }\n    },\n    \"semantics\": \"recipe_code is a required key filter and must be applied as equality to recipes.recipe_name in all entrypoints. from_date and to_date are required and define an inclusive date range on recipes.start_time. Optional parameters (plant_name, location, print_date, page_number) are pass-through tokens and do not influence filtering. Error % is a decimal fraction; do not multiply by 100.\",\n    \"parameters\": {\n      \"required\": [\n        {\n          \"name\": \"from_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"to_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"recipe_code\",\n          \"type\": \"string\"\n        }\n      ],\n      \"optional\": [\n        {\n          \"name\": \"plant_name\",\n          \"type\": \"string\"\n        },\n        {\n          \"name\": \"location\",\n          \"type\": \"string\"\n        },\n        {\n          \"name\": \"print_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"page_number\",\n          \"type\": \"string\"\n        }\n      ]\n    },\n    \"transformations\": [\n      \"Create CTE long_bins as UNION ALL of 12 SELECTs from recipes, each selecting: recipe_id=recipes.id, recipe_name=recipes.recipe_name, ts=recipes.start_time, material_name=recipes.binX_content, set_wt_kg=recipes.binX_sp, ach_wt_kg=recipes.binX_act.\",\n      \"Apply required filters to recipes (recipes.start_time between from_date and to_date, recipes.recipe_name = :recipe_code) before unpivot.\",\n      \"Filter out blank materials in long_bins where TRIM(material_name) IS NULL or equals ''.\",\n      \"Rows dataset: SELECT normalized material name UPPER(TRIM(long_bins.material_name)) AS row_material_name, SUM(set_wt_kg) AS row_set_wt, SUM(ach_wt_kg) AS row_ach_wt, compute row_error_kg and row_error_pct, and compute row_sl_no as ROW_NUMBER() OVER (ORDER BY row_material_name ASC).\",\n      \"Totals dataset: Use exact mapping_override expressions over recipes bin columns. Mirror them in totals_math to ensure runtime consistency.\",\n      \"Guard divisions with CASE/NULLIF to avoid divide-by-zero in row_error_pct and total_error_pct.\"\n    ]\n  },\n  \"contract\": {\n    \"tokens\": {\n      \"scalars\": [\n        \"plant_name\",\n        \"location\",\n        \"from_date\",\n        \"to_date\",\n        \"recipe_code\",\n        \"print_date\",\n        \"report_title\",\n        \"company_name\",\n        \"page_number\"\n      ],\n      \"row_tokens\": [\n        \"row_sl_no\",\n        \"row_material_name\",\n        \"row_set_wt\",\n        \"row_ach_wt\",\n        \"row_error_kg\",\n        \"row_error_pct\"\n      ],\n      \"totals\": [\n        \"total_set_wt\",\n        \"total_ach_wt\",\n        \"total_error_kg\",\n        \"total_error_pct\"\n      ]\n    },\n    \"mapping\": {\n      \"plant_name\": \"PARAM:plant_name\",\n      \"location\": \"PARAM:location\",\n      \"from_date\": \"PARAM:from_date\",\n      \"to_date\": \"PARAM:to_date\",\n      \"recipe_code\": \"PARAM:recipe_code\",\n      \"print_date\": \"PARAM:print_date\",\n      \"report_title\": \"'Consumption report'\",\n      \"company_name\": \"'Indian Industrial Machines Pvt. Ltd.'\",\n      \"page_number\": \"PARAM:page_number\",\n      \"row_sl_no\": \"ROW_NUMBER() OVER (ORDER BY UPPER(TRIM(long_bins.material_name)) ASC)\",\n      \"row_material_name\": \"UPPER(TRIM(long_bins.material_name))\",\n      \"row_set_wt\": \"SUM(long_bins.set_wt_kg)\",\n      \"row_ach_wt\": \"SUM(long_bins.ach_wt_kg)\",\n      \"row_error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"row_error_pct\": \"CASE WHEN SUM(long_bins.set_wt_kg) = 0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) END\",\n      \"total_set_wt\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n      \"total_ach_wt\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n      \"total_error_kg\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n      \"total_error_pct\": \"CASE WHEN SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN NULL ELSE (SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\"\n    },\n    \"unresolved\": [],\n    \"join\": {\n      \"parent_table\": \"recipes\",\n      \"parent_key\": \"id\",\n      \"child_table\": null,\n      \"child_key\": null\n    },\n    \"date_columns\": {\n      \"recipes\": \"start_time\"\n    },\n    \"filters\": {\n      \"required\": {\n        \"recipe_code\": \"recipes.recipe_name\",\n        \"from_date\": \"recipes.start_time\",\n        \"to_date\": \"recipes.start_time\"\n      },\n      \"optional\": {}\n    },\n    \"reshape_rules\": [\n      {\n        \"purpose\": \"Produce long-form rows prior to aggregation\",\n        \"strategy\": \"UNION_ALL\",\n        \"explain\": \"Union bin1..bin12 columns into long form, trim material names, drop blanks before grouping. Apply required filters to recipes first.\",\n        \"columns\": [\n          {\n            \"as\": \"material_name\",\n            \"from\": [\n              \"recipes.bin1_content\",\n              \"recipes.bin2_content\",\n              \"recipes.bin3_content\",\n              \"recipes.bin4_content\",\n              \"recipes.bin5_content\",\n              \"recipes.bin6_content\",\n              \"recipes.bin7_content\",\n              \"recipes.bin8_content\",\n              \"recipes.bin9_content\",\n              \"recipes.bin10_content\",\n              \"recipes.bin11_content\",\n              \"recipes.bin12_content\"\n            ]\n          },\n          {\n            \"as\": \"set_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_sp\",\n              \"recipes.bin2_sp\",\n              \"recipes.bin3_sp\",\n              \"recipes.bin4_sp\",\n              \"recipes.bin5_sp\",\n              \"recipes.bin6_sp\",\n              \"recipes.bin7_sp\",\n              \"recipes.bin8_sp\",\n              \"recipes.bin9_sp\",\n              \"recipes.bin10_sp\",\n              \"recipes.bin11_sp\",\n              \"recipes.bin12_sp\"\n            ]\n          },\n          {\n            \"as\": \"ach_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_act\",\n              \"recipes.bin2_act\",\n              \"recipes.bin3_act\",\n              \"recipes.bin4_act\",\n              \"recipes.bin5_act\",\n              \"recipes.bin6_act\",\n              \"recipes.bin7_act\",\n              \"recipes.bin8_act\",\n              \"recipes.bin9_act\",\n              \"recipes.bin10_act\",\n              \"recipes.bin11_act\",\n              \"recipes.bin12_act\"\n            ]\n          }\n        ]\n      }\n    ],\n    \"row_computed\": {\n      \"row_error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"row_error_pct\": \"CASE WHEN SUM(long_bins.set_wt_kg) = 0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) END\"\n    },\n    \"totals_math\": {\n      \"total_set_wt\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n      \"total_ach_wt\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n      \"total_error_kg\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n      \"total_error_pct\": \"CASE WHEN SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN NULL ELSE (SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\"\n    },\n    \"formatters\": {\n      \"row_set_wt\": \"number(2)\",\n      \"row_ach_wt\": \"number(2)\",\n      \"row_error_kg\": \"number(2)\",\n      \"row_error_pct\": \"decimal(4)\",\n      \"total_set_wt\": \"number(2)\",\n      \"total_ach_wt\": \"number(2)\",\n      \"total_error_kg\": \"number(2)\",\n      \"total_error_pct\": \"decimal(4)\",\n      \"print_date\": \"date(DD/MM/YYYY)\"\n    },\n    \"order_by\": {\n      \"rows\": [\n        \"row_material_name ASC\",\n        \"row_set_wt DESC\",\n        \"row_ach_wt DESC\"\n      ]\n    },\n    \"notes\": \"Use only recipes.* columns in the catalog. Error % is a fraction (0\u20131), not multiplied by 100. Apply required filters (recipe_code equality to recipes.recipe_name and inclusive date range on recipes.start_time) to header, rows, and totals.\"\n  },\n  \"validation\": {\n    \"unknown_tokens\": [],\n    \"unknown_columns\": [],\n    \"token_coverage\": {\n      \"scalars_mapped_pct\": 100,\n      \"row_tokens_mapped_pct\": 100,\n      \"totals_mapped_pct\": 100\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761062138,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 12313,
    "prompt_tokens": 10560,
    "total_tokens": 22873,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 7296,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-21T16:03:36Z - generator_assets_v1

```json
{
  "id": "chatcmpl-CT95G8wgt6bMvxnuvaidzbfDKHr3O",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"contract\": {\n    \"tokens\": {\n      \"scalars\": [\n        \"plant_name\",\n        \"location\",\n        \"from_date\",\n        \"to_date\",\n        \"recipe_code\",\n        \"print_date\",\n        \"report_title\",\n        \"company_name\",\n        \"page_number\"\n      ],\n      \"row_tokens\": [\n        \"row_sl_no\",\n        \"row_material_name\",\n        \"row_set_wt\",\n        \"row_ach_wt\",\n        \"row_error_kg\",\n        \"row_error_pct\"\n      ],\n      \"totals\": [\n        \"total_set_wt\",\n        \"total_ach_wt\",\n        \"total_error_kg\",\n        \"total_error_pct\"\n      ]\n    },\n    \"mapping\": {\n      \"plant_name\": \"PARAM:plant_name\",\n      \"location\": \"PARAM:location\",\n      \"from_date\": \"PARAM:from_date\",\n      \"to_date\": \"PARAM:to_date\",\n      \"recipe_code\": \"PARAM:recipe_code\",\n      \"print_date\": \"PARAM:print_date\",\n      \"report_title\": \"'Consumption report'\",\n      \"company_name\": \"'Indian Industrial Machines Pvt. Ltd.'\",\n      \"page_number\": \"PARAM:page_number\",\n      \"row_sl_no\": \"ROW_NUMBER() OVER (ORDER BY UPPER(TRIM(long_bins.material_name)) ASC)\",\n      \"row_material_name\": \"UPPER(TRIM(long_bins.material_name))\",\n      \"row_set_wt\": \"SUM(long_bins.set_wt_kg)\",\n      \"row_ach_wt\": \"SUM(long_bins.ach_wt_kg)\",\n      \"row_error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"row_error_pct\": \"CASE WHEN SUM(long_bins.set_wt_kg) = 0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) END\",\n      \"total_set_wt\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n      \"total_ach_wt\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n      \"total_error_kg\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n      \"total_error_pct\": \"CASE WHEN SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN NULL ELSE (SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\"\n    },\n    \"join\": {\n      \"parent_table\": \"recipes\",\n      \"parent_key\": \"id\",\n      \"child_table\": \"recipes\",\n      \"child_key\": \"id\"\n    },\n    \"date_columns\": {\n      \"recipes\": \"start_time\"\n    },\n    \"filters\": {\n      \"required\": {\n        \"recipe_code\": \"recipes.recipe_name\",\n        \"from_date\": \"recipes.start_time\",\n        \"to_date\": \"recipes.start_time\"\n      },\n      \"optional\": {}\n    },\n    \"reshape_rules\": [\n      {\n        \"purpose\": \"Produce long-form rows prior to aggregation\",\n        \"strategy\": \"UNION_ALL\",\n        \"explain\": \"Union bin1..bin12 columns into long form, trim material names, drop blanks before grouping. Apply required filters to recipes first.\",\n        \"columns\": [\n          {\n            \"as\": \"material_name\",\n            \"from\": [\n              \"recipes.bin1_content\",\n              \"recipes.bin2_content\",\n              \"recipes.bin3_content\",\n              \"recipes.bin4_content\",\n              \"recipes.bin5_content\",\n              \"recipes.bin6_content\",\n              \"recipes.bin7_content\",\n              \"recipes.bin8_content\",\n              \"recipes.bin9_content\",\n              \"recipes.bin10_content\",\n              \"recipes.bin11_content\",\n              \"recipes.bin12_content\"\n            ]\n          },\n          {\n            \"as\": \"set_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_sp\",\n              \"recipes.bin2_sp\",\n              \"recipes.bin3_sp\",\n              \"recipes.bin4_sp\",\n              \"recipes.bin5_sp\",\n              \"recipes.bin6_sp\",\n              \"recipes.bin7_sp\",\n              \"recipes.bin8_sp\",\n              \"recipes.bin9_sp\",\n              \"recipes.bin10_sp\",\n              \"recipes.bin11_sp\",\n              \"recipes.bin12_sp\"\n            ]\n          },\n          {\n            \"as\": \"ach_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_act\",\n              \"recipes.bin2_act\",\n              \"recipes.bin3_act\",\n              \"recipes.bin4_act\",\n              \"recipes.bin5_act\",\n              \"recipes.bin6_act\",\n              \"recipes.bin7_act\",\n              \"recipes.bin8_act\",\n              \"recipes.bin9_act\",\n              \"recipes.bin10_act\",\n              \"recipes.bin11_act\",\n              \"recipes.bin12_act\"\n            ]\n          }\n        ]\n      }\n    ],\n    \"row_computed\": {\n      \"row_error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"row_error_pct\": \"CASE WHEN SUM(long_bins.set_wt_kg) = 0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) END\"\n    },\n    \"totals_math\": {\n      \"total_set_wt\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n      \"total_ach_wt\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n      \"total_error_kg\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n      \"total_error_pct\": \"CASE WHEN SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN NULL ELSE (SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\"\n    },\n    \"formatters\": {\n      \"row_set_wt\": \"number(2)\",\n      \"row_ach_wt\": \"number(2)\",\n      \"row_error_kg\": \"number(2)\",\n      \"row_error_pct\": \"decimal(4)\",\n      \"total_set_wt\": \"number(2)\",\n      \"total_ach_wt\": \"number(2)\",\n      \"total_error_kg\": \"number(2)\",\n      \"total_error_pct\": \"decimal(4)\",\n      \"print_date\": \"date(DD/MM/YYYY)\"\n    },\n    \"order_by\": {\n      \"rows\": [\n        \"row_material_name ASC\",\n        \"row_set_wt DESC\",\n        \"row_ach_wt DESC\"\n      ]\n    },\n    \"header_tokens\": [\n      \"plant_name\",\n      \"location\",\n      \"from_date\",\n      \"to_date\",\n      \"recipe_code\",\n      \"print_date\",\n      \"report_title\",\n      \"company_name\",\n      \"page_number\"\n    ],\n    \"row_tokens\": [\n      \"row_sl_no\",\n      \"row_material_name\",\n      \"row_set_wt\",\n      \"row_ach_wt\",\n      \"row_error_kg\",\n      \"row_error_pct\"\n    ],\n    \"totals\": {\n      \"total_set_wt\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n      \"total_ach_wt\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n      \"total_error_kg\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n      \"total_error_pct\": \"CASE WHEN SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN NULL ELSE (SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\"\n    },\n    \"row_order\": [\n      \"row_material_name ASC\",\n      \"row_set_wt DESC\",\n      \"row_ach_wt DESC\"\n    ]\n  },\n  \"sql_pack\": {\n    \"dialect\": \"sqlite\",\n    \"script\": \"-- HEADER SELECT --\\nSELECT plant_name, location, from_date, to_date, recipe_code, print_date, report_title, company_name, page_number\\nFROM recipes\\nWHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n-- ROWS SELECT --\\nSELECT row_sl_no, row_material_name, row_set_wt, row_ach_wt, row_error_kg, row_error_pct\\nFROM (\\n  WITH long_bins AS (\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin1_content AS material_name, recipes.bin1_sp AS set_wt_kg, recipes.bin1_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n    UNION ALL\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin2_content AS material_name, recipes.bin2_sp AS set_wt_kg, recipes.bin2_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n    UNION ALL\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin3_content AS material_name, recipes.bin3_sp AS set_wt_kg, recipes.bin3_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n    UNION ALL\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin4_content AS material_name, recipes.bin4_sp AS set_wt_kg, recipes.bin4_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n    UNION ALL\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin5_content AS material_name, recipes.bin5_sp AS set_wt_kg, recipes.bin5_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n    UNION ALL\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin6_content AS material_name, recipes.bin6_sp AS set_wt_kg, recipes.bin6_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n    UNION ALL\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin7_content AS material_name, recipes.bin7_sp AS set_wt_kg, recipes.bin7_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n    UNION ALL\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin8_content AS material_name, recipes.bin8_sp AS set_wt_kg, recipes.bin8_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n    UNION ALL\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin9_content AS material_name, recipes.bin9_sp AS set_wt_kg, recipes.bin9_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n    UNION ALL\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin10_content AS material_name, recipes.bin10_sp AS set_wt_kg, recipes.bin10_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n    UNION ALL\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin11_content AS material_name, recipes.bin11_sp AS set_wt_kg, recipes.bin11_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n    UNION ALL\\n    SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts,\\n    recipes.bin12_content AS material_name, recipes.bin12_sp AS set_wt_kg, recipes.bin12_act AS ach_wt_kg\\n    FROM recipes\\n    WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\\n  )\\n  SELECT row_sl_no, row_material_name, SUM(set_wt_kg) AS row_set_wt, SUM(ach_wt_kg) AS row_ach_wt, row_error_kg, row_error_pct\\n  FROM long_bins\\n  WHERE TRIM(material_name) IS NOT NULL AND TRIM(material_name) <> ''\\n  GROUP BY UPPER(TRIM(material_name))\\n  ORDER BY row_material_name ASC, row_set_wt DESC, row_ach_wt DESC\\n-- TOTALS SELECT --\\nSELECT total_set_wt, total_ach_wt, total_error_kg, total_error_pct\\nFROM recipes\\nWHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\",\n    \"entrypoints\": {\n      \"header\": \"SELECT plant_name, location, from_date, to_date, recipe_code, print_date, report_title, company_name, page_number FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\",\n      \"rows\": \"WITH long_bins AS (SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin1_content AS material_name, recipes.bin1_sp AS set_wt_kg, recipes.bin1_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1 UNION ALL SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin2_content AS material_name, recipes.bin2_sp AS set_wt_kg, recipes.bin2_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1 UNION ALL SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin3_content AS material_name, recipes.bin3_sp AS set_wt_kg, recipes.bin3_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1 UNION ALL SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin4_content AS material_name, recipes.bin4_sp AS set_wt_kg, recipes.bin4_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1 UNION ALL SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin5_content AS material_name, recipes.bin5_sp AS set_wt_kg, recipes.bin5_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1 UNION ALL SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin6_content AS material_name, recipes.bin6_sp AS set_wt_kg, recipes.bin6_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1 UNION ALL SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin7_content AS material_name, recipes.bin7_sp AS set_wt_kg, recipes.bin7_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1 UNION ALL SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin8_content AS material_name, recipes.bin8_sp AS set_wt_kg, recipes.bin8_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1 UNION ALL SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin9_content AS material_name, recipes.bin9_sp AS set_wt_kg, recipes.bin9_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1 UNION ALL SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin10_content AS material_name, recipes.bin10_sp AS set_wt_kg, recipes.bin10_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1 UNION ALL SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin11_content AS material_name, recipes.bin11_sp AS set_wt_kg, recipes.bin11_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1 UNION ALL SELECT recipes.id AS recipe_id, recipes.recipe_name, recipes.start_time AS ts, recipes.bin12_content AS material_name, recipes.bin12_sp AS set_wt_kg, recipes.bin12_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1) SELECT row_sl_no, row_material_name, SUM(set_wt_kg) AS row_set_wt, SUM(ach_wt_kg) AS row_ach_wt, row_error_kg, row_error_pct FROM long_bins WHERE TRIM(material_name) IS NOT NULL AND TRIM(material_name) <> '' GROUP BY UPPER(TRIM(material_name)) ORDER BY row_material_name ASC, row_set_wt DESC, row_ach_wt DESC\",\n      \"totals\": \"SELECT total_set_wt, total_ach_wt, total_error_kg, total_error_pct FROM recipes WHERE recipes.recipe_name = :recipe_code AND recipes.start_time >= :from_date AND recipes.start_time < :to_date + 1\"\n    },\n    \"params\": {\n      \"required\": [\n        \"from_date\",\n        \"to_date\",\n        \"recipe_code\"\n      ],\n      \"optional\": [\n        \"plant_name\",\n        \"location\",\n        \"print_date\",\n        \"page_number\"\n      ]\n    }\n  },\n  \"dialect\": \"sqlite\",\n  \"invalid\": false\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761062466,
  "model": "gpt-4o-mini-2024-07-18",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": "fp_560af6e559",
  "usage": {
    "completion_tokens": 5496,
    "prompt_tokens": 9457,
    "total_tokens": 14953,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 0,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-22T21:08:19Z - template_initial_html

```json
{
  "id": "chatcmpl-CTaL7XeVvAOD1OYuD7fBORB5z7ANi",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>{report_title}</title>\n<style>\n  @page { size: A4; margin: 14mm; }\n  :root{\n    --row-gap: 2.5mm;\n    --col-slno-w: 16mm;\n    --col-material-w: 92mm;\n    --col-set-w: 30mm;\n    --col-ach-w: 30mm;\n    --col-errkg-w: 26mm;\n    --col-errpct-w: 22mm;\n  }\n  html,body{font-family:\"Times New Roman\", serif; color:#000; font-size:12pt; line-height:1.25;}\n  h1{font-size:20pt; margin: 0; font-weight: bold; text-align:center;}\n  small{font-size:10pt;}\n\n  /* Header box */\n  #report-header{\n    border:1px solid #000;\n    padding:6mm 7mm;\n    margin-bottom:6mm;\n  }\n  #header-row{\n    display:grid;\n    grid-template-columns: 1fr 1fr;\n    column-gap: 10mm;\n    align-items:start;\n  }\n  #header-left table,\n  #header-right table{\n    width:100%;\n    border-collapse:collapse;\n  }\n  #header-left td,\n  #header-right td{\n    padding: 1mm 0;\n    vertical-align:top;\n  }\n  #header-left td.label,\n  #header-right td.label{\n    width:32mm;\n    white-space:nowrap;\n  }\n  #title-wrap{\n    margin-top: 2mm;\n    margin-bottom: 2mm;\n  }\n  #title-rule{\n    border-top:1px solid #000;\n    margin-top: 3mm;\n  }\n\n  /* Main data table */\n  #data-table{\n    width:100%;\n    border-collapse:collapse;\n    table-layout:fixed;\n    font-variant-numeric: tabular-nums;\n  }\n  #data-table th, #data-table td{\n    border:1px solid #000;\n    padding:3.5mm 3mm;\n    vertical-align:middle;\n  }\n  #data-table thead th{\n    text-align:center;\n    font-weight:bold;\n    white-space:nowrap;\n  }\n  /* Column widths */\n  #data-table col.slno{width:var(--col-slno-w);}\n  #data-table col.material{width:var(--col-material-w);}\n  #data-table col.set{width:var(--col-set-w);}\n  #data-table col.ach{width:var(--col-ach-w);}\n  #data-table col.errkg{width:var(--col-errkg-w);}\n  #data-table col.errpct{width:var(--col-errpct-w);}\n\n  /* Alignments */\n  .ta-right{text-align:right;}\n  .ta-center{text-align:center;}\n\n  /* Totals */\n  #report-totals td{\n    font-weight:bold;\n  }\n\n  /* Footer */\n  footer{\n    position:fixed;\n    bottom:10mm;\n    left:14mm;\n    right:14mm;\n    display:flex;\n    justify-content:space-between;\n    font-size:10pt;\n  }\n</style>\n</head>\n<body>\n  <section id=\"report-header\">\n    <div id=\"header-row\">\n      <div id=\"header-left\">\n        <table>\n          <tr>\n            <td class=\"label\">Plant name</td>\n            <td>: {plant_name}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Location</td>\n            <td>: {location}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Print Date</td>\n            <td>: {print_date}</td>\n          </tr>\n        </table>\n      </div>\n      <div id=\"header-right\">\n        <table>\n          <tr>\n            <td class=\"label\">From Date</td>\n            <td>: {from_date}&nbsp;&nbsp;&nbsp;&nbsp;To {to_date}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Recipe code</td>\n            <td>: {recipe_code}</td>\n          </tr>\n        </table>\n      </div>\n    </div>\n    <div id=\"title-wrap\">\n      <h1>{report_title}</h1>\n    </div>\n    <div id=\"title-rule\"></div>\n  </section>\n\n  <table id=\"data-table\">\n    <colgroup>\n      <col class=\"slno\">\n      <col class=\"material\">\n      <col class=\"set\">\n      <col class=\"ach\">\n      <col class=\"errkg\">\n      <col class=\"errpct\">\n    </colgroup>\n    <thead>\n      <tr>\n        <th data-label=\"sl_no\">Sl. No.</th>\n        <th data-label=\"material_name\">Material name</th>\n        <th data-label=\"set_wt_kg\">Set. wt(Kg)</th>\n        <th data-label=\"ach_wt_kg\">Ach. wt(Kg)</th>\n        <th data-label=\"error_kg\">Error(Kg)</th>\n        <th data-label=\"error_pct\">Error %</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <td class=\"ta-center\">{sl_no}</td>\n        <td>{material_name}</td>\n        <td class=\"ta-right\">{set_wt_kg}</td>\n        <td class=\"ta-right\">{ach_wt_kg}</td>\n        <td class=\"ta-right\">{error_kg}</td>\n        <td class=\"ta-right\">{error_pct}</td>\n      </tr>\n    </tbody>\n    <tfoot id=\"report-totals\">\n      <tr>\n        <td colspan=\"2\" class=\"ta-center\">Total</td>\n        <td class=\"ta-right\">{total_set_wt_kg}</td>\n        <td class=\"ta-right\">{total_ach_wt_kg}</td>\n        <td class=\"ta-right\">{total_error_kg}</td>\n        <td class=\"ta-right\">{total_error_pct}</td>\n      </tr>\n    </tfoot>\n  </table>\n\n  <footer>\n    <div>Indian Industrial Machines Pvt. Ltd.</div>\n    <div>Page {page_no} of {page_total}</div>\n  </footer>\n</body>\n</html>\n<!--END_HTML-->\n\n<!--BEGIN_SCHEMA_JSON-->\n{\n  \"scalars\": [\n    \"report_title\",\n    \"plant_name\",\n    \"location\",\n    \"print_date\",\n    \"from_date\",\n    \"to_date\",\n    \"recipe_code\",\n    \"page_no\",\n    \"page_total\"\n  ],\n  \"row_tokens\": [\n    \"sl_no\",\n    \"material_name\",\n    \"set_wt_kg\",\n    \"ach_wt_kg\",\n    \"error_kg\",\n    \"error_pct\"\n  ],\n  \"totals\": [\n    \"total_set_wt_kg\",\n    \"total_ach_wt_kg\",\n    \"total_error_kg\",\n    \"total_error_pct\"\n  ],\n  \"notes\": \"\"\n}\n<!--END_SCHEMA_JSON-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761167237,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 4052,
    "prompt_tokens": 1544,
    "total_tokens": 5596,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 2496,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-22T21:09:55Z - template_fix_html_call2

```json
{
  "id": "chatcmpl-CTaMpYShXtlyMed1Nx3o3WrbprSIT",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n<title>{report_title}</title>\n<style>\n  @page { size: A4; margin: 14mm; }\n  :root{\n    --row-gap: 2.5mm;\n\n    /* Column widths must sum to page content width (~182mm) */\n    --col-slno-w: 12mm;\n    --col-material-w: 86mm;\n    --col-set-w: 28mm;\n    --col-ach-w: 28mm;\n    --col-errkg-w: 16mm;\n    --col-errpct-w: 12mm;\n  }\n\n  html,body{\n    font-family:\"Times New Roman\", serif;\n    color:#000;\n    font-size:11pt;\n    line-height:1.25;\n  }\n  h1{\n    font-size:16.5pt;\n    margin:0;\n    font-weight:bold;\n    text-align:center;\n    line-height:1.15;\n  }\n  small{font-size:9.5pt;}\n\n  /* Header box */\n  #report-header{\n    border:1px solid #000;\n    padding:4.8mm 6mm 4.2mm;\n    margin-bottom:2.8mm;\n  }\n  #header-row{\n    display:grid;\n    grid-template-columns: 1fr 1fr;\n    column-gap: 18mm;\n    align-items:start;\n  }\n  #header-left table,\n  #header-right table{\n    width:100%;\n    border-collapse:collapse;\n    table-layout:fixed;\n  }\n  #header-left td,\n  #header-right td{\n    padding:0.7mm 0;\n    vertical-align:top;\n  }\n  #header-left td.label,\n  #header-right td.label{\n    width:30mm;\n    white-space:nowrap;\n  }\n  #title-wrap{\n    margin-top:2mm;\n    margin-bottom:1.4mm;\n  }\n  #title-rule{\n    border-top:1px solid #000;\n    margin-top:2mm;\n  }\n\n  /* Main data table */\n  #data-table{\n    width:100%;\n    border-collapse:collapse;\n    table-layout:fixed;\n    font-variant-numeric: tabular-nums;\n  }\n  #data-table th, #data-table td{\n    border:1px solid #000;\n    vertical-align:middle;\n  }\n  #data-table thead th{\n    text-align:center;\n    font-weight:bold;\n    white-space:nowrap;\n    padding:2mm 2mm 2mm 2mm;\n    font-size:11pt;\n  }\n  #data-table tbody td{\n    padding:1.8mm 2mm;\n    font-size:11pt;\n  }\n  #data-table tfoot td{\n    padding:2mm 2mm;\n  }\n\n  /* Column widths */\n  #data-table col.slno{width:var(--col-slno-w);}\n  #data-table col.material{width:var(--col-material-w);}\n  #data-table col.set{width:var(--col-set-w);}\n  #data-table col.ach{width:var(--col-ach-w);}\n  #data-table col.errkg{width:var(--col-errkg-w);}\n  #data-table col.errpct{width:var(--col-errpct-w);}\n\n  /* Alignments */\n  .ta-right{text-align:right;}\n  .ta-center{text-align:center;}\n\n  /* Totals */\n  #report-totals td{\n    font-weight:bold;\n  }\n\n  /* Footer */\n  footer{\n    position:fixed;\n    bottom:10.5mm;\n    left:14mm;\n    right:14mm;\n    display:flex;\n    justify-content:space-between;\n    font-size:9.5pt;\n  }\n\n  /* Prevent table breaks inside one logical block (future multiple rows) */\n  tbody, tfoot{break-inside:avoid; page-break-inside:avoid;}\n</style>\n</head>\n<body>\n  <section id=\"report-header\">\n    <div id=\"header-row\">\n      <div id=\"header-left\">\n        <table>\n          <tr>\n            <td class=\"label\">Plant name</td>\n            <td>: {plant_name}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Location</td>\n            <td>: {location}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Print Date</td>\n            <td>: {print_date}</td>\n          </tr>\n        </table>\n      </div>\n      <div id=\"header-right\">\n        <table>\n          <tr>\n            <td class=\"label\">From Date</td>\n            <td>: {from_date}&nbsp;&nbsp;&nbsp;&nbsp;To {to_date}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Recipe code</td>\n            <td>: {recipe_code}</td>\n          </tr>\n        </table>\n      </div>\n    </div>\n    <div id=\"title-wrap\">\n      <h1>{report_title}</h1>\n    </div>\n    <div id=\"title-rule\"></div>\n  </section>\n\n  <table id=\"data-table\">\n    <colgroup>\n      <col class=\"slno\" />\n      <col class=\"material\" />\n      <col class=\"set\" />\n      <col class=\"ach\" />\n      <col class=\"errkg\" />\n      <col class=\"errpct\" />\n    </colgroup>\n    <thead>\n      <tr>\n        <th data-label=\"sl_no\">Sl. No.</th>\n        <th data-label=\"material_name\">Material name</th>\n        <th data-label=\"set_wt_kg\">Set. wt(Kg)</th>\n        <th data-label=\"ach_wt_kg\">Ach. wt(Kg)</th>\n        <th data-label=\"error_kg\">Error(Kg)</th>\n        <th data-label=\"error_pct\">Error %</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <td class=\"ta-center\">{sl_no}</td>\n        <td>{material_name}</td>\n        <td class=\"ta-right\">{set_wt_kg}</td>\n        <td class=\"ta-right\">{ach_wt_kg}</td>\n        <td class=\"ta-right\">{error_kg}</td>\n        <td class=\"ta-right\">{error_pct}</td>\n      </tr>\n    </tbody>\n    <tfoot id=\"report-totals\">\n      <tr>\n        <td colspan=\"2\" class=\"ta-center\">Total</td>\n        <td class=\"ta-right\">{total_set_wt_kg}</td>\n        <td class=\"ta-right\">{total_ach_wt_kg}</td>\n        <td class=\"ta-right\">{total_error_kg}</td>\n        <td class=\"ta-right\">{total_error_pct}</td>\n      </tr>\n    </tfoot>\n  </table>\n\n  <footer>\n    <div>Indian Industrial Machines Pvt. Ltd.</div>\n    <div>Page {page_no} of {page_total}</div>\n  </footer>\n</body>\n</html>\n<!--END_HTML-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761167343,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 3473,
    "prompt_tokens": 3697,
    "total_tokens": 7170,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 1920,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-22T21:12:11Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CTaNz2FBAYEo09OO28iYixO5zVtn3",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"print_date\": \"params.print_date\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"recipe_code\": \"params.recipe_code\",\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt_kg\": \"UNRESOLVED\",\n    \"ach_wt_kg\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_pct\": \"UNRESOLVED\",\n    \"total_set_wt_kg\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt_kg\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"SUM((recipes.bin1_act - recipes.bin1_sp) + (recipes.bin2_act - recipes.bin2_sp) + (recipes.bin3_act - recipes.bin3_sp) + (recipes.bin4_act - recipes.bin4_sp) + (recipes.bin5_act - recipes.bin5_sp) + (recipes.bin6_act - recipes.bin6_sp) + (recipes.bin7_act - recipes.bin7_sp) + (recipes.bin8_act - recipes.bin8_sp) + (recipes.bin9_act - recipes.bin9_sp) + (recipes.bin10_act - recipes.bin10_sp) + (recipes.bin11_act - recipes.bin11_sp) + (recipes.bin12_act - recipes.bin12_sp))\",\n    \"total_error_pct\": \"100 * SUM((recipes.bin1_act - recipes.bin1_sp) + (recipes.bin2_act - recipes.bin2_sp) + (recipes.bin3_act - recipes.bin3_sp) + (recipes.bin4_act - recipes.bin4_sp) + (recipes.bin5_act - recipes.bin5_sp) + (recipes.bin6_act - recipes.bin6_sp) + (recipes.bin7_act - recipes.bin7_sp) + (recipes.bin8_act - recipes.bin8_sp) + (recipes.bin9_act - recipes.bin9_sp) + (recipes.bin10_act - recipes.bin10_sp) + (recipes.bin11_act - recipes.bin11_sp) + (recipes.bin12_act - recipes.bin12_sp)) / NULLIF(SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp), 0)\",\n    \"page_no\": \"To Be Selected...\",\n    \"page_total\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"report_title\": \"Consumption report\",\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt_kg\": \"11,800.00\",\n    \"ach_wt_kg\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_pct\": \"0.0271\",\n    \"total_set_wt_kg\": \"80,000.00\",\n    \"total_ach_wt_kg\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\",\n    \"page_no\": \"1\",\n    \"page_total\": \"1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt_kg\",\n      \"ach_wt_kg\",\n      \"error_kg\",\n      \"error_pct\"\n    ],\n    \"hints\": {\n      \"total_set_wt_kg\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt_kg\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761167415,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6906,
    "prompt_tokens": 3698,
    "total_tokens": 10604,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5696,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 3584
    }
  }
}
```

## 2025-10-22T21:12:18Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CTaNzY8DRCum21NnLcdBy7MXblW9d",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"print_date\": \"params.print_date\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"recipe_code\": \"params.recipe_code\",\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"recipes.recipe_name\",\n    \"set_wt_kg\": \"recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp\",\n    \"ach_wt_kg\": \"recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act\",\n    \"error_kg\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"error_pct\": \"CASE WHEN (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) <> 0 THEN ((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) ELSE NULL END\",\n    \"total_set_wt_kg\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt_kg\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"SUM((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp))\",\n    \"total_error_pct\": \"CASE WHEN SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) <> 0 THEN (SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) ELSE NULL END\",\n    \"page_no\": \"To Be Selected...\",\n    \"page_total\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"report_title\": \"Consumption report\",\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt_kg\": \"11,800.00\",\n    \"ach_wt_kg\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_pct\": \"0.0271\",\n    \"total_set_wt_kg\": \"80,000.00\",\n    \"total_ach_wt_kg\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\",\n    \"page_no\": \"1\",\n    \"page_total\": \"1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\"\n    ],\n    \"hints\": {\n      \"set_wt_kg\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"ach_wt_kg\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      },\n      \"total_set_wt_kg\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt_kg\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761167415,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 7339,
    "prompt_tokens": 3698,
    "total_tokens": 11037,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5440,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-22T21:19:04Z - llm_call_3_5

```json
{
  "id": "chatcmpl-CTaVaY6jQvrzoOHA5fUCDhaDXCPsm",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"final_template_html\": \"\\n<html>\\n<head>\\n<meta charset=\\\"utf-8\\\" />\\n<title>Consumption report</title>\\n<style>\\n  @page { size: A4; margin: 14mm; }\\n  :root{\\n    --row-gap: 2.5mm;\\n\\n    /* Column widths must sum to page content width (~182mm) */\\n    --col-slno-w: 12mm;\\n    --col-material-w: 78mm;\\n    --col-set-w: 30mm;\\n    --col-ach-w: 30mm;\\n    --col-errkg-w: 18mm;\\n    --col-errpct-w: 14mm;\\n  }\\n\\n  html,body{\\n    font-family:\\\"Times New Roman\\\", serif;\\n    color:#000;\\n    font-size:11pt;\\n    line-height:1.25;\\n  }\\n  h1{\\n    font-size:16.5pt;\\n    margin:0;\\n    font-weight:bold;\\n    text-align:center;\\n    line-height:1.15;\\n  }\\n  small{font-size:9.5pt;}\\n\\n  /* Header box */\\n  #report-header{\\n    border:1px solid #000;\\n    padding:4.8mm 6mm 4.2mm;\\n    margin-bottom:2.8mm;\\n  }\\n  #header-row{\\n    display:grid;\\n    grid-template-columns: 1fr 1fr;\\n    column-gap: 18mm;\\n    align-items:start;\\n  }\\n  #header-left table,\\n  #header-right table{\\n    width:100%;\\n    border-collapse:collapse;\\n    table-layout:fixed;\\n  }\\n  #header-left td,\\n  #header-right td{\\n    padding:0.7mm 0;\\n    vertical-align:top;\\n  }\\n  #header-left td.label,\\n  #header-right td.label{\\n    width:30mm;\\n    white-space:nowrap;\\n  }\\n  #title-wrap{\\n    margin-top:2mm;\\n    margin-bottom:1.4mm;\\n  }\\n\\n  /* Main data table */\\n  #data-table{\\n    width:100%;\\n    border-collapse:collapse;\\n    table-layout:fixed;\\n    font-variant-numeric: tabular-nums;\\n  }\\n  #data-table th, #data-table td{\\n    border:1px solid #000;\\n    vertical-align:middle;\\n  }\\n  #data-table thead th{\\n    text-align:center;\\n    font-weight:bold;\\n    white-space:nowrap;\\n    padding:2mm 2mm 2mm 2mm;\\n    font-size:11pt;\\n  }\\n  #data-table tbody td{\\n    padding:1.8mm 2mm;\\n    font-size:11pt;\\n  }\\n  #data-table tfoot td{\\n    padding:2mm 2mm;\\n  }\\n\\n  /* Column widths */\\n  #data-table col.slno{width:var(--col-slno-w);}\\n  #data-table col.material{width:var(--col-material-w);}\\n  #data-table col.set{width:var(--col-set-w);}\\n  #data-table col.ach{width:var(--col-ach-w);}\\n  #data-table col.errkg{width:var(--col-errkg-w);}\\n  #data-table col.errpct{width:var(--col-errpct-w);}\\n\\n  /* Alignments */\\n  .ta-right{text-align:right;}\\n  .ta-center{text-align:center;}\\n\\n  /* Totals */\\n  #report-totals td{\\n    font-weight:bold;\\n  }\\n\\n  /* Footer */\\n  footer{\\n    position:fixed;\\n    bottom:10.5mm;\\n    left:14mm;\\n    right:14mm;\\n    display:flex;\\n    justify-content:space-between;\\n    font-size:9.5pt;\\n  }\\n\\n  /* Prevent table breaks inside one logical block (future multiple rows) */\\n  tbody, tfoot{break-inside:avoid; page-break-inside:avoid;}\\n</style>\\n</head>\\n<body>\\n  <section id=\\\"report-header\\\">\\n    <div id=\\\"header-row\\\">\\n      <div id=\\\"header-left\\\">\\n        <table>\\n          <tr>\\n            <td class=\\\"label\\\">Plant name</td>\\n            <td>: SSR AQUA</td>\\n          </tr>\\n          <tr>\\n            <td class=\\\"label\\\">Location</td>\\n            <td>: Gudivada</td>\\n          </tr>\\n          <tr>\\n            <td class=\\\"label\\\">Print Date</td>\\n            <td>: {print_date}</td>\\n          </tr>\\n        </table>\\n      </div>\\n      <div id=\\\"header-right\\\">\\n        <table>\\n          <tr>\\n            <td class=\\\"label\\\">From Date</td>\\n            <td>: {from_date}\u00a0\u00a0\u00a0\u00a0To {to_date}</td>\\n          </tr>\\n          <tr>\\n            <td class=\\\"label\\\">Recipe code</td>\\n            <td>: {recipe_code}</td>\\n          </tr>\\n        </table>\\n      </div>\\n    </div>\\n    <div id=\\\"title-wrap\\\">\\n      <h1>Consumption report</h1>\\n    </div>\\n  </section>\\n\\n  <table id=\\\"data-table\\\">\\n    <colgroup>\\n      <col class=\\\"slno\\\" />\\n      <col class=\\\"material\\\" />\\n      <col class=\\\"set\\\" />\\n      <col class=\\\"ach\\\" />\\n      <col class=\\\"errkg\\\" />\\n      <col class=\\\"errpct\\\" />\\n    </colgroup>\\n    <thead>\\n      <tr>\\n        <th data-label=\\\"sl_no\\\">Sl. No.</th>\\n        <th data-label=\\\"material_name\\\">Material name</th>\\n        <th data-label=\\\"set_wt_kg\\\">Set. wt(Kg)</th>\\n        <th data-label=\\\"ach_wt_kg\\\">Ach. wt(Kg)</th>\\n        <th data-label=\\\"error_kg\\\">Error(Kg)</th>\\n        <th data-label=\\\"error_pct\\\">Error %</th>\\n      </tr>\\n    </thead>\\n    <tbody>\\n      <tr>\\n        <td class=\\\"ta-center\\\">{sl_no}</td>\\n        <td>{material_name}</td>\\n        <td class=\\\"ta-right\\\">{set_wt_kg}</td>\\n        <td class=\\\"ta-right\\\">{ach_wt_kg}</td>\\n        <td class=\\\"ta-right\\\">{error_kg}</td>\\n        <td class=\\\"ta-right\\\">{error_pct}</td>\\n      </tr>\\n    </tbody>\\n    <tfoot id=\\\"report-totals\\\">\\n      <tr>\\n        <td colspan=\\\"2\\\" class=\\\"ta-center\\\">Total</td>\\n        <td class=\\\"ta-right\\\">{total_set_wt_kg}</td>\\n        <td class=\\\"ta-right\\\">{total_ach_wt_kg}</td>\\n        <td class=\\\"ta-right\\\">{total_error_kg}</td>\\n        <td class=\\\"ta-right\\\">{total_error_pct}</td>\\n      </tr>\\n    </tfoot>\\n  </table>\\n\\n  <footer>\\n    <div>Indian Industrial Machines Pvt. Ltd.</div>\\n    <div>Page {page_no} of {page_total}</div>\\n  </footer>\\n</body>\\n</html>\",\n  \"page_summary\": \"Applied user-requested changes: removed the horizontal rule under the title by deleting the #title-rule element; widened narrow table columns via CSS variables so headers fit without overflow. New column widths (sum 182mm): sl_no 12mm, material_name 78mm, set_wt_kg 30mm, ach_wt_kg 30mm, error_kg 18mm, error_pct 14mm. Constants inlined from INPUT_SAMPLE: plant_name = \\\"SSR AQUA\\\" and location = \\\"Gudivada\\\". All other tokens remain dynamic: print_date, from_date, to_date, recipe_code, sl_no, material_name, set_wt_kg, ach_wt_kg, error_kg, error_pct, total_set_wt_kg, total_ach_wt_kg, total_error_kg, total_error_pct, page_no, and page_total. Totals fields are still bound to SQL expressions; date and pagination fields are LATER_SELECTED. No numeric totals or dates were inlined beyond those constants, and there are no computed values resolved at this step.\"\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761167886,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 4096,
    "prompt_tokens": 5418,
    "total_tokens": 9514,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 2112,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-22T21:23:02Z - contract_build_v2

```json
{
  "id": "chatcmpl-CTaXDbBDQePCFQwTX9hQDyIowr5ia",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"overview_md\": \"Executive Summary\\n- Goal: Build a consumption report by material for a selected recipe code and date range, derived from 12 per-batch bin columns in recipes. We must UNPIVOT the bin content/weights into long form, filter, then aggregate by material name to produce row-level set/ach weights and error metrics, plus overall totals.\\n- Reshaping: UNION ALL across recipes.bin1..bin12 for content (material), set (sp), and achieved (act) weights into a long_bins staging set. Drop blank/NULL material names before grouping.\\n- Grouping: Aggregate by normalized material name (TRIM) to compute per-material sums.\\n- Totals: Compute totals from the rows dataset (not directly from base columns) to guarantee consistency.\\n- Filters: Required key filter on recipe_code (equals recipes.recipe_name) and required date range filter on recipes.start_time between from_date and to_date (inclusive). These apply in header, rows, and totals entrypoints.\\n\\nToken Inventory\\n- Scalars: report_title, plant_name, location, print_date, from_date, to_date, recipe_code, page_no, page_total\\n- Row tokens: sl_no, material_name, set_wt_kg, ach_wt_kg, error_kg, error_pct\\n- Totals: total_set_wt_kg, total_ach_wt_kg, total_error_kg, total_error_pct\\n\\nMapping Table\\n- report_title -> PARAM:report_title\\n- plant_name -> PARAM:plant_name\\n- location -> PARAM:location\\n- print_date -> PARAM:print_date\\n- from_date -> PARAM:from_date\\n- to_date -> PARAM:to_date\\n- recipe_code -> PARAM:recipe_code\\n- page_no -> PARAM:page_no\\n- page_total -> PARAM:page_total\\n- sl_no -> ROW_NUMBER() OVER (ORDER BY rows.material_name ASC)\\n- material_name -> TRIM(long_bins.material_name)\\n- set_wt_kg -> SUM(long_bins.set_wt_kg)\\n- ach_wt_kg -> SUM(long_bins.ach_wt_kg)\\n- error_kg -> SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\\n- error_pct -> (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / NULLIF(SUM(long_bins.set_wt_kg), 0)\\n- total_set_wt_kg -> SUM(rows.set_wt_kg)\\n- total_ach_wt_kg -> SUM(rows.ach_wt_kg)\\n- total_error_kg -> SUM(rows.error_kg)\\n- total_error_pct -> SUM(rows.error_kg) / NULLIF(SUM(rows.set_wt_kg), 0)\\n\\nJoin & Date Rules\\n- Tables: Single source table recipes; no joins required.\\n- Date column: recipes.start_time. Apply DATE(recipes.start_time) BETWEEN :from_date AND :to_date in all entrypoints (header/rows/totals). This is dialect-friendly for sqlite/postgres.\\n- Key filter: recipe_code is required; apply recipes.recipe_name = :recipe_code in all entrypoints.\\n\\nTransformations\\n- Unpivot/Union strategy: Create a long_bins staging set via UNION ALL of 12 SELECTs, one per bin index i in 1..12, projecting material_name from recipes.bin{i}_content, set_wt_kg from recipes.bin{i}_sp, and ach_wt_kg from recipes.bin{i}_act. Apply required filters on recipes before the UNION to minimize data.\\n- Pre-aggregation filtering: Exclude rows where TRIM(material_name) IS NULL or TRIM(material_name) = ''. Optionally exclude rows where COALESCE(set_wt_kg,0)=0 AND COALESCE(ach_wt_kg,0)=0.\\n- Aggregation: Group by TRIM(material_name); compute set_wt_kg, ach_wt_kg via SUM; compute error_kg and error_pct using identical SQL expressions shown above.\\n- Row numbering: sl_no computed as ROW_NUMBER() OVER (ORDER BY rows.material_name ASC) after aggregation to ensure stable numbering aligned with display order.\\n- Totals: Derived from rows dataset sums to maintain consistency across entrypoints; total_error_pct uses the weighted logic SUM(error_kg)/NULLIF(SUM(set_wt_kg),0).\\n\\nParameters\\n- Required: from_date (date), to_date (date), recipe_code (string). These drive mandatory filters; equality on recipe_code and DATE-range predicate must be applied in header/rows/totals queries.\\n- Optional/pass-through: report_title (string), plant_name (string), location (string), print_date (date), page_no (integer), page_total (integer). These do not affect SQL filtering; they are for display.\\n- Examples: from_date=2024-03-24, to_date=2024-03-24, recipe_code='GANGADHAR-2024'.\\n\\nChecklist for Step 5\\n- Datasets\\n  - header columns (in order): report_title, plant_name, location, print_date, from_date, to_date, recipe_code, page_no, page_total\\n  - rows columns (in order): sl_no, material_name, set_wt_kg, ach_wt_kg, error_kg, error_pct\\n  - totals columns (in order): total_set_wt_kg, total_ach_wt_kg, total_error_kg, total_error_pct\\n- Apply filters before UNPIVOT: recipes.recipe_name = :recipe_code and DATE(recipes.start_time) BETWEEN :from_date AND :to_date.\\n- Exclude blank materials: NULL/empty TRIM(material_name) rows removed prior to grouping.\\n- Group by TRIM(long_bins.material_name).\\n- Ordering: ORDER BY material_name ASC; sl_no must use the same ORDER BY.\\n- NULLIF guard: Use NULLIF(SUM(set_wt_kg),0) in percent calculations to avoid divide-by-zero.\\n- Totals computed from rows dataset using identical expressions.\\n- Only reference allowed catalog columns from recipes.* when touching base tables.\\n\",\n  \"step5_requirements\": {\n    \"datasets\": {\n      \"header\": {\n        \"description\": \"One-row header dataset with pass-through display fields and selected parameter values.\",\n        \"columns\": [\n          \"report_title\",\n          \"plant_name\",\n          \"location\",\n          \"print_date\",\n          \"from_date\",\n          \"to_date\",\n          \"recipe_code\",\n          \"page_no\",\n          \"page_total\"\n        ]\n      },\n      \"rows\": {\n        \"description\": \"Detail rows aggregated by material name from unpivoted bin columns across matching recipes.\",\n        \"columns\": [\n          \"sl_no\",\n          \"material_name\",\n          \"set_wt_kg\",\n          \"ach_wt_kg\",\n          \"error_kg\",\n          \"error_pct\"\n        ],\n        \"grouping\": [\n          \"Group by normalized material name: TRIM(long_bins.material_name)\",\n          \"Drop records where TRIM(long_bins.material_name) IS NULL or = '' before grouping.\",\n          \"Optional pre-agg drop: COALESCE(long_bins.set_wt_kg,0) + COALESCE(long_bins.ach_wt_kg,0) <> 0 to avoid empty lines.\"\n        ],\n        \"ordering\": [\n          \"ORDER BY material_name ASC\",\n          \"sl_no computed as ROW_NUMBER() OVER (ORDER BY material_name ASC) to match this order\"\n        ]\n      },\n      \"totals\": {\n        \"description\": \"Totals aggregated from the rows dataset to ensure consistency.\",\n        \"columns\": [\n          \"total_set_wt_kg\",\n          \"total_ach_wt_kg\",\n          \"total_error_kg\",\n          \"total_error_pct\"\n        ]\n      }\n    },\n    \"semantics\": \"Required filters: recipe_code (equality on recipes.recipe_name) and date range (DATE(recipes.start_time) BETWEEN :from_date AND :to_date) must be applied in header, rows, and totals entrypoints. Optional/pass-through parameters (report_title, plant_name, location, print_date, page_no, page_total) are not used for filtering. Only apply optional filters if non-empty, but note there are no optional table filters in this report.\",\n    \"parameters\": {\n      \"required\": [\n        {\n          \"name\": \"from_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"to_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"recipe_code\",\n          \"type\": \"string\"\n        }\n      ],\n      \"optional\": [\n        {\n          \"name\": \"report_title\",\n          \"type\": \"string\"\n        },\n        {\n          \"name\": \"plant_name\",\n          \"type\": \"string\"\n        },\n        {\n          \"name\": \"location\",\n          \"type\": \"string\"\n        },\n        {\n          \"name\": \"print_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"page_no\",\n          \"type\": \"integer\"\n        },\n        {\n          \"name\": \"page_total\",\n          \"type\": \"integer\"\n        }\n      ]\n    },\n    \"transformations\": [\n      \"Build long_bins via UNION ALL of 12 SELECTs: for i in 1..12 select recipes.bin{i}_content AS material_name, recipes.bin{i}_sp AS set_wt_kg, recipes.bin{i}_act AS ach_wt_kg from recipes filtered by recipe_code and date range.\",\n      \"Pre-aggregation filters: remove rows where TRIM(material_name) IS NULL or ''. Optionally remove rows where both set_wt_kg and ach_wt_kg are zero.\",\n      \"Aggregate rows by TRIM(material_name) to compute set_wt_kg = SUM(long_bins.set_wt_kg), ach_wt_kg = SUM(long_bins.ach_wt_kg).\",\n      \"Compute error_kg = SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg).\",\n      \"Compute error_pct = (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / NULLIF(SUM(long_bins.set_wt_kg), 0).\",\n      \"Compute sl_no as ROW_NUMBER() OVER (ORDER BY material_name ASC) in the final projection after aggregation.\",\n      \"Totals math mirrors rows aggregation: total_set_wt_kg = SUM(rows.set_wt_kg), total_ach_wt_kg = SUM(rows.ach_wt_kg), total_error_kg = SUM(rows.error_kg), total_error_pct = SUM(rows.error_kg) / NULLIF(SUM(rows.set_wt_kg), 0).\"\n    ]\n  },\n  \"contract\": {\n    \"tokens\": {\n      \"scalars\": [\n        \"report_title\",\n        \"plant_name\",\n        \"location\",\n        \"print_date\",\n        \"from_date\",\n        \"to_date\",\n        \"recipe_code\",\n        \"page_no\",\n        \"page_total\"\n      ],\n      \"row_tokens\": [\n        \"sl_no\",\n        \"material_name\",\n        \"set_wt_kg\",\n        \"ach_wt_kg\",\n        \"error_kg\",\n        \"error_pct\"\n      ],\n      \"totals\": [\n        \"total_set_wt_kg\",\n        \"total_ach_wt_kg\",\n        \"total_error_kg\",\n        \"total_error_pct\"\n      ]\n    },\n    \"mapping\": {\n      \"report_title\": \"PARAM:report_title\",\n      \"plant_name\": \"PARAM:plant_name\",\n      \"location\": \"PARAM:location\",\n      \"print_date\": \"PARAM:print_date\",\n      \"from_date\": \"PARAM:from_date\",\n      \"to_date\": \"PARAM:to_date\",\n      \"recipe_code\": \"PARAM:recipe_code\",\n      \"page_no\": \"PARAM:page_no\",\n      \"page_total\": \"PARAM:page_total\",\n      \"sl_no\": \"ROW_NUMBER() OVER (ORDER BY rows.material_name ASC)\",\n      \"material_name\": \"TRIM(long_bins.material_name)\",\n      \"set_wt_kg\": \"SUM(long_bins.set_wt_kg)\",\n      \"ach_wt_kg\": \"SUM(long_bins.ach_wt_kg)\",\n      \"error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"error_pct\": \"(SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / NULLIF(SUM(long_bins.set_wt_kg), 0)\",\n      \"total_set_wt_kg\": \"SUM(rows.set_wt_kg)\",\n      \"total_ach_wt_kg\": \"SUM(rows.ach_wt_kg)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_pct\": \"SUM(rows.error_kg) / NULLIF(SUM(rows.set_wt_kg), 0)\"\n    },\n    \"unresolved\": [],\n    \"join\": {\n      \"parent_table\": \"recipes\",\n      \"parent_key\": \"id\",\n      \"child_table\": null,\n      \"child_key\": null\n    },\n    \"date_columns\": {\n      \"recipes\": \"start_time\"\n    },\n    \"filters\": {\n      \"required\": {\n        \"recipe_code\": \"recipes.recipe_name\",\n        \"date_range\": \"DATE(recipes.start_time) BETWEEN :from_date AND :to_date\"\n      },\n      \"optional\": {}\n    },\n    \"reshape_rules\": [\n      {\n        \"purpose\": \"Produce rows dataset from per-bin columns\",\n        \"strategy\": \"UNION_ALL\",\n        \"explain\": \"Union bin1..bin12 columns into a long form, apply filters first, trim material names, and drop blanks before grouping.\",\n        \"columns\": [\n          {\n            \"as\": \"material_name\",\n            \"from\": [\n              \"recipes.bin1_content\",\n              \"recipes.bin2_content\",\n              \"recipes.bin3_content\",\n              \"recipes.bin4_content\",\n              \"recipes.bin5_content\",\n              \"recipes.bin6_content\",\n              \"recipes.bin7_content\",\n              \"recipes.bin8_content\",\n              \"recipes.bin9_content\",\n              \"recipes.bin10_content\",\n              \"recipes.bin11_content\",\n              \"recipes.bin12_content\"\n            ]\n          },\n          {\n            \"as\": \"set_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_sp\",\n              \"recipes.bin2_sp\",\n              \"recipes.bin3_sp\",\n              \"recipes.bin4_sp\",\n              \"recipes.bin5_sp\",\n              \"recipes.bin6_sp\",\n              \"recipes.bin7_sp\",\n              \"recipes.bin8_sp\",\n              \"recipes.bin9_sp\",\n              \"recipes.bin10_sp\",\n              \"recipes.bin11_sp\",\n              \"recipes.bin12_sp\"\n            ]\n          },\n          {\n            \"as\": \"ach_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_act\",\n              \"recipes.bin2_act\",\n              \"recipes.bin3_act\",\n              \"recipes.bin4_act\",\n              \"recipes.bin5_act\",\n              \"recipes.bin6_act\",\n              \"recipes.bin7_act\",\n              \"recipes.bin8_act\",\n              \"recipes.bin9_act\",\n              \"recipes.bin10_act\",\n              \"recipes.bin11_act\",\n              \"recipes.bin12_act\"\n            ]\n          }\n        ]\n      }\n    ],\n    \"row_computed\": {\n      \"row_error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"row_error_pct\": \"(SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / NULLIF(SUM(long_bins.set_wt_kg), 0)\"\n    },\n    \"totals_math\": {\n      \"total_set_wt_kg\": \"SUM(rows.set_wt_kg)\",\n      \"total_ach_wt_kg\": \"SUM(rows.ach_wt_kg)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_pct\": \"SUM(rows.error_kg) / NULLIF(SUM(rows.set_wt_kg), 0)\"\n    },\n    \"formatters\": {\n      \"error_pct\": \"percent(2)\",\n      \"total_error_pct\": \"percent(2)\",\n      \"print_date\": \"date(YYYY-MM-DD)\"\n    },\n    \"order_by\": {\n      \"rows\": [\n        \"material_name ASC\"\n      ]\n    },\n    \"notes\": \"All base columns must come from the recipes table per the provided catalog. Apply required filters (recipe_code equality and DATE(recipes.start_time) BETWEEN :from_date AND :to_date) before UNPIVOT. Grouping is by TRIM(material_name). sl_no uses the same ORDER BY as the final rows output. Totals are derived from the rows dataset to maintain consistency with displayed rows.\"\n  },\n  \"validation\": {\n    \"unknown_tokens\": [],\n    \"unknown_columns\": [],\n    \"token_coverage\": {\n      \"scalars_mapped_pct\": 100,\n      \"row_tokens_mapped_pct\": 100,\n      \"totals_mapped_pct\": 100\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761167987,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 9853,
    "prompt_tokens": 9207,
    "total_tokens": 19060,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 6208,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-22T21:25:12Z - generator_assets_v1

```json
{
  "id": "chatcmpl-CTaaMvtXD2nPC0bajk2VMfaQWvufy",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"contract\": {\n    \"tokens\": {\n      \"scalars\": [\n        \"report_title\",\n        \"plant_name\",\n        \"location\",\n        \"print_date\",\n        \"from_date\",\n        \"to_date\",\n        \"recipe_code\",\n        \"page_no\",\n        \"page_total\"\n      ],\n      \"row_tokens\": [\n        \"sl_no\",\n        \"material_name\",\n        \"set_wt_kg\",\n        \"ach_wt_kg\",\n        \"error_kg\",\n        \"error_pct\"\n      ],\n      \"totals\": [\n        \"total_set_wt_kg\",\n        \"total_ach_wt_kg\",\n        \"total_error_kg\",\n        \"total_error_pct\"\n      ]\n    },\n    \"mapping\": {\n      \"report_title\": \"PARAM:report_title\",\n      \"plant_name\": \"PARAM:plant_name\",\n      \"location\": \"PARAM:location\",\n      \"print_date\": \"PARAM:print_date\",\n      \"from_date\": \"PARAM:from_date\",\n      \"to_date\": \"PARAM:to_date\",\n      \"recipe_code\": \"PARAM:recipe_code\",\n      \"page_no\": \"PARAM:page_no\",\n      \"page_total\": \"PARAM:page_total\",\n      \"sl_no\": \"ROW_NUMBER() OVER (ORDER BY rows.material_name ASC)\",\n      \"material_name\": \"TRIM(long_bins.material_name)\",\n      \"set_wt_kg\": \"SUM(long_bins.set_wt_kg)\",\n      \"ach_wt_kg\": \"SUM(long_bins.ach_wt_kg)\",\n      \"error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"error_pct\": \"(SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / NULLIF(SUM(long_bins.set_wt_kg), 0)\",\n      \"total_set_wt_kg\": \"SUM(rows.set_wt_kg)\",\n      \"total_ach_wt_kg\": \"SUM(rows.ach_wt_kg)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_pct\": \"SUM(rows.error_kg) / NULLIF(SUM(rows.set_wt_kg), 0)\"\n    },\n    \"join\": {\n      \"parent_table\": \"recipes\",\n      \"parent_key\": \"id\",\n      \"child_table\": \"recipes\",\n      \"child_key\": \"id\"\n    },\n    \"date_columns\": {\n      \"recipes\": \"start_time\"\n    },\n    \"filters\": {\n      \"required\": {\n        \"recipe_code\": \"recipes.recipe_name\",\n        \"date_range\": \"DATE(recipes.start_time) BETWEEN :from_date AND :to_date\"\n      },\n      \"optional\": {}\n    },\n    \"reshape_rules\": [\n      {\n        \"purpose\": \"Produce rows dataset from per-bin columns\",\n        \"strategy\": \"UNION_ALL\",\n        \"explain\": \"Union bin1..bin12 columns into a long form, apply filters first, trim material names, and drop blanks before grouping.\",\n        \"columns\": [\n          {\n            \"as\": \"material_name\",\n            \"from\": [\n              \"recipes.bin1_content\",\n              \"recipes.bin2_content\",\n              \"recipes.bin3_content\",\n              \"recipes.bin4_content\",\n              \"recipes.bin5_content\",\n              \"recipes.bin6_content\",\n              \"recipes.bin7_content\",\n              \"recipes.bin8_content\",\n              \"recipes.bin9_content\",\n              \"recipes.bin10_content\",\n              \"recipes.bin11_content\",\n              \"recipes.bin12_content\"\n            ]\n          },\n          {\n            \"as\": \"set_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_sp\",\n              \"recipes.bin2_sp\",\n              \"recipes.bin3_sp\",\n              \"recipes.bin4_sp\",\n              \"recipes.bin5_sp\",\n              \"recipes.bin6_sp\",\n              \"recipes.bin7_sp\",\n              \"recipes.bin8_sp\",\n              \"recipes.bin9_sp\",\n              \"recipes.bin10_sp\",\n              \"recipes.bin11_sp\",\n              \"recipes.bin12_sp\"\n            ]\n          },\n          {\n            \"as\": \"ach_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_act\",\n              \"recipes.bin2_act\",\n              \"recipes.bin3_act\",\n              \"recipes.bin4_act\",\n              \"recipes.bin5_act\",\n              \"recipes.bin6_act\",\n              \"recipes.bin7_act\",\n              \"recipes.bin8_act\",\n              \"recipes.bin9_act\",\n              \"recipes.bin10_act\",\n              \"recipes.bin11_act\",\n              \"recipes.bin12_act\"\n            ]\n          }\n        ]\n      }\n    ],\n    \"row_computed\": {\n      \"row_error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"row_error_pct\": \"(SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / NULLIF(SUM(long_bins.set_wt_kg), 0)\"\n    },\n    \"totals_math\": {\n      \"total_set_wt_kg\": \"SUM(rows.set_wt_kg)\",\n      \"total_ach_wt_kg\": \"SUM(rows.ach_wt_kg)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_pct\": \"SUM(rows.error_kg) / NULLIF(SUM(rows.set_wt_kg), 0)\"\n    },\n    \"formatters\": {\n      \"error_pct\": \"percent(2)\",\n      \"total_error_pct\": \"percent(2)\",\n      \"print_date\": \"date(YYYY-MM-DD)\"\n    },\n    \"order_by\": {\n      \"rows\": [\n        \"material_name ASC\"\n      ]\n    },\n    \"header_tokens\": [\n      \"report_title\",\n      \"plant_name\",\n      \"location\",\n      \"print_date\",\n      \"from_date\",\n      \"to_date\",\n      \"recipe_code\",\n      \"page_no\",\n      \"page_total\"\n    ],\n    \"row_tokens\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt_kg\",\n      \"ach_wt_kg\",\n      \"error_kg\",\n      \"error_pct\"\n    ],\n    \"totals\": {\n      \"total_set_wt_kg\": \"SUM(rows.set_wt_kg)\",\n      \"total_ach_wt_kg\": \"SUM(rows.ach_wt_kg)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_pct\": \"SUM(rows.error_kg) / NULLIF(SUM(rows.set_wt_kg), 0)\"\n    },\n    \"row_order\": [\n      \"material_name ASC\"\n    ]\n  },\n  \"sql_pack\": {\n    \"dialect\": \"sqlite\",\n    \"script\": \"-- HEADER SELECT --\\nSELECT PARAM:report_title AS report_title, PARAM:plant_name AS plant_name, PARAM:location AS location, PARAM:print_date AS print_date, PARAM:from_date AS from_date, PARAM:to_date AS to_date, PARAM:recipe_code AS recipe_code, PARAM:page_no AS page_no, PARAM:page_total AS page_total\\n-- ROWS SELECT --\\nSELECT ROW_NUMBER() OVER (ORDER BY rows.material_name ASC) AS sl_no,\\n  TRIM(long_bins.material_name) AS material_name,\\n  SUM(long_bins.set_wt_kg) AS set_wt_kg,\\n  SUM(long_bins.ach_wt_kg) AS ach_wt_kg,\\n  SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) AS error_kg,\\n  (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / NULLIF(SUM(long_bins.set_wt_kg), 0) AS error_pct\\nFROM (SELECT recipes.bin1_content AS material_name, recipes.bin1_sp AS set_wt_kg, recipes.bin1_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin2_content AS material_name, recipes.bin2_sp AS set_wt_kg, recipes.bin2_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin3_content AS material_name, recipes.bin3_sp AS set_wt_kg, recipes.bin3_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin4_content AS material_name, recipes.bin4_sp AS set_wt_kg, recipes.bin4_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin5_content AS material_name, recipes.bin5_sp AS set_wt_kg, recipes.bin5_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin6_content AS material_name, recipes.bin6_sp AS set_wt_kg, recipes.bin6_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin7_content AS material_name, recipes.bin7_sp AS set_wt_kg, recipes.bin7_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin8_content AS material_name, recipes.bin8_sp AS set_wt_kg, recipes.bin8_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin9_content AS material_name, recipes.bin9_sp AS set_wt_kg, recipes.bin9_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin10_content AS material_name, recipes.bin10_sp AS set_wt_kg, recipes.bin10_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin11_content AS material_name, recipes.bin11_sp AS set_wt_kg, recipes.bin11_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin12_content AS material_name, recipes.bin12_sp AS set_wt_kg, recipes.bin12_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date) AS long_bins\\nGROUP BY TRIM(long_bins.material_name)\\nORDER BY material_name ASC\\n-- TOTALS SELECT --\\nSELECT SUM(rows.set_wt_kg) AS total_set_wt_kg,\\n  SUM(rows.ach_wt_kg) AS total_ach_wt_kg,\\n  SUM(rows.error_kg) AS total_error_kg,\\n  SUM(rows.error_kg) / NULLIF(SUM(rows.set_wt_kg), 0) AS total_error_pct\\nFROM (SELECT ROW_NUMBER() OVER (ORDER BY rows.material_name ASC) AS sl_no,\\n  TRIM(long_bins.material_name) AS material_name,\\n  SUM(long_bins.set_wt_kg) AS set_wt_kg,\\n  SUM(long_bins.ach_wt_kg) AS ach_wt_kg,\\n  SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) AS error_kg,\\n  (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / NULLIF(SUM(long_bins.set_wt_kg), 0) AS error_pct\\nFROM (SELECT recipes.bin1_content AS material_name, recipes.bin1_sp AS set_wt_kg, recipes.bin1_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin2_content AS material_name, recipes.bin2_sp AS set_wt_kg, recipes.bin2_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin3_content AS material_name, recipes.bin3_sp AS set_wt_kg, recipes.bin3_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin4_content AS material_name, recipes.bin4_sp AS set_wt_kg, recipes.bin4_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin5_content AS material_name, recipes.bin5_sp AS set_wt_kg, recipes.bin5_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin6_content AS material_name, recipes.bin6_sp AS set_wt_kg, recipes.bin6_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin7_content AS material_name, recipes.bin7_sp AS set_wt_kg, recipes.bin7_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin8_content AS material_name, recipes.bin8_sp AS set_wt_kg, recipes.bin8_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin9_content AS material_name, recipes.bin9_sp AS set_wt_kg, recipes.bin9_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin10_content AS material_name, recipes.bin10_sp AS set_wt_kg, recipes.bin10_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin11_content AS material_name, recipes.bin11_sp AS set_wt_kg, recipes.bin11_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin12_content AS material_name, recipes.bin12_sp AS set_wt_kg, recipes.bin12_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date) AS long_bins\\nGROUP BY TRIM(long_bins.material_name)\\nORDER BY material_name ASC) AS rows\\n\",\n    \"entrypoints\": {\n      \"header\": \"SELECT PARAM:report_title AS report_title, PARAM:plant_name AS plant_name, PARAM:location AS location, PARAM:print_date AS print_date, PARAM:from_date AS from_date, PARAM:to_date AS to_date, PARAM:recipe_code AS recipe_code, PARAM:page_no AS page_no, PARAM:page_total AS page_total\",\n      \"rows\": \"SELECT ROW_NUMBER() OVER (ORDER BY rows.material_name ASC) AS sl_no,\\n  TRIM(long_bins.material_name) AS material_name,\\n  SUM(long_bins.set_wt_kg) AS set_wt_kg,\\n  SUM(long_bins.ach_wt_kg) AS ach_wt_kg,\\n  SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) AS error_kg,\\n  (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / NULLIF(SUM(long_bins.set_wt_kg), 0) AS error_pct\\nFROM (SELECT recipes.bin1_content AS material_name, recipes.bin1_sp AS set_wt_kg, recipes.bin1_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin2_content AS material_name, recipes.bin2_sp AS set_wt_kg, recipes.bin2_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin3_content AS material_name, recipes.bin3_sp AS set_wt_kg, recipes.bin3_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin4_content AS material_name, recipes.bin4_sp AS set_wt_kg, recipes.bin4_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin5_content AS material_name, recipes.bin5_sp AS set_wt_kg, recipes.bin5_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin6_content AS material_name, recipes.bin6_sp AS set_wt_kg, recipes.bin6_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin7_content AS material_name, recipes.bin7_sp AS set_wt_kg, recipes.bin7_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin8_content AS material_name, recipes.bin8_sp AS set_wt_kg, recipes.bin8_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin9_content AS material_name, recipes.bin9_sp AS set_wt_kg, recipes.bin9_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin10_content AS material_name, recipes.bin10_sp AS set_wt_kg, recipes.bin10_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin11_content AS material_name, recipes.bin11_sp AS set_wt_kg, recipes.bin11_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin12_content AS material_name, recipes.bin12_sp AS set_wt_kg, recipes.bin12_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date) AS long_bins\\nGROUP BY TRIM(long_bins.material_name)\\nORDER BY material_name ASC\",\n      \"totals\": \"SELECT SUM(rows.set_wt_kg) AS total_set_wt_kg,\\n  SUM(rows.ach_wt_kg) AS total_ach_wt_kg,\\n  SUM(rows.error_kg) AS total_error_kg,\\n  SUM(rows.error_kg) / NULLIF(SUM(rows.set_wt_kg), 0) AS total_error_pct\\nFROM (SELECT ROW_NUMBER() OVER (ORDER BY rows.material_name ASC) AS sl_no,\\n  TRIM(long_bins.material_name) AS material_name,\\n  SUM(long_bins.set_wt_kg) AS set_wt_kg,\\n  SUM(long_bins.ach_wt_kg) AS ach_wt_kg,\\n  SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) AS error_kg,\\n  (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / NULLIF(SUM(long_bins.set_wt_kg), 0) AS error_pct\\nFROM (SELECT recipes.bin1_content AS material_name, recipes.bin1_sp AS set_wt_kg, recipes.bin1_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin2_content AS material_name, recipes.bin2_sp AS set_wt_kg, recipes.bin2_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin3_content AS material_name, recipes.bin3_sp AS set_wt_kg, recipes.bin3_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin4_content AS material_name, recipes.bin4_sp AS set_wt_kg, recipes.bin4_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin5_content AS material_name, recipes.bin5_sp AS set_wt_kg, recipes.bin5_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin6_content AS material_name, recipes.bin6_sp AS set_wt_kg, recipes.bin6_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin7_content AS material_name, recipes.bin7_sp AS set_wt_kg, recipes.bin7_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin8_content AS material_name, recipes.bin8_sp AS set_wt_kg, recipes.bin8_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin9_content AS material_name, recipes.bin9_sp AS set_wt_kg, recipes.bin9_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin10_content AS material_name, recipes.bin10_sp AS set_wt_kg, recipes.bin10_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin11_content AS material_name, recipes.bin11_sp AS set_wt_kg, recipes.bin11_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date\\nUNION ALL\\nSELECT recipes.bin12_content AS material_name, recipes.bin12_sp AS set_wt_kg, recipes.bin12_act AS ach_wt_kg FROM recipes WHERE recipes.recipe_name = :recipe_code AND DATE(recipes.start_time) BETWEEN :from_date AND :to_date) AS long_bins\\nGROUP BY TRIM(long_bins.material_name)\\nORDER BY material_name ASC) AS rows\"\n    },\n    \"params\": {\n      \"required\": [\n        \"from_date\",\n        \"to_date\",\n        \"recipe_code\"\n      ],\n      \"optional\": [\n        \"report_title\",\n        \"plant_name\",\n        \"location\",\n        \"print_date\",\n        \"page_no\",\n        \"page_total\"\n      ]\n    }\n  },\n  \"dialect\": \"sqlite\",\n  \"invalid\": false\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761168182,
  "model": "gpt-4o-mini-2024-07-18",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": "fp_560af6e559",
  "usage": {
    "completion_tokens": 5351,
    "prompt_tokens": 7341,
    "total_tokens": 12692,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 0,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-23T06:47:34Z - template_initial_html

```json
{
  "id": "chatcmpl-CTjNDif817HDrxNFBsbjNqF9biEZz",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Batch report</title>\n<style>\n  @page { size: A4; margin: 12mm 12mm 16mm 14mm; }\n  :root{\n    --header-gap: 4mm;\n    --kv-label-w: 34mm;\n    --kv-col-gap: 2mm;\n    --mini-col-1: 22mm;  /* Scale */\n    --mini-col-2: 26mm;  /* Start time */\n    --mini-col-3: 20mm;  /* Dur(sec) */\n    --bin-w: 16mm;\n    --mat-w: 74mm;\n    --set-w: 24mm;\n    --ach-w: 24mm;\n    --err-w: 22mm;\n    --errp-w: 18mm;\n    --dur-w: 26mm;\n    --row-gap: 2.5mm;\n  }\n  *{ box-sizing: border-box; }\n  body{\n    font-family: \"Times New Roman\", serif;\n    font-size: 11pt;\n    color:#000;\n    line-height: 1.25;\n  }\n  #report-header{\n    width:100%;\n  }\n  #report-header .top-grid{\n    width:100%;\n    border-collapse: separate;\n    border-spacing:0;\n  }\n  #report-header .top-grid td{\n    vertical-align: top;\n    padding: 0;\n  }\n  #report-header .left-block p,\n  #report-header .right-block p{\n    margin: 0 0 1.8mm 0;\n    white-space: nowrap;\n  }\n  #report-header .right-block{\n    text-align: right;\n  }\n  #report-header .title-row{\n    margin-top: 1mm;\n    display: grid;\n    grid-template-columns: 1fr auto 1fr;\n    align-items: center;\n  }\n  #report-header .title-row .title{\n    font-weight: 700;\n    font-size: 16pt;\n    text-align: center;\n  }\n  #report-header .print-date{\n    margin-top: var(--header-gap);\n    padding: 1mm 0 1.2mm 0;\n    border-top: 1px solid #000;\n    border-bottom: 1px solid #000;\n    font-weight: 600;\n  }\n  #report-header .print-date span.label{ font-weight: 700; }\n  /* Key/Value tables inside blocks */\n  .kv{\n    border-collapse: collapse;\n    table-layout: fixed;\n    width: 100%;\n  }\n  .kv td{\n    padding: 0.8mm 0;\n    vertical-align: top;\n  }\n  .kv td.label{\n    width: var(--kv-label-w);\n  }\n  .kv td.sep{\n    width: 3mm;\n    text-align: center;\n  }\n  .kv td.value{\n    padding-left: var(--kv-col-gap);\n    width: auto;\n    white-space: nowrap;\n  }\n  /* Small scale time table */\n  .mini-grid{\n    border-collapse: collapse;\n    table-layout: fixed;\n    width: calc(var(--mini-col-1) + var(--mini-col-2) + var(--mini-col-3) + var(--mini-col-1) + var(--mini-col-2) + var(--mini-col-3));\n    margin-left: auto;\n    font-size: 10pt;\n  }\n  .mini-grid th, .mini-grid td{\n    border:1px solid #000;\n    padding: 1mm 1.2mm;\n    text-align: left;\n  }\n  .mini-grid th[data-label]{\n    font-weight: 700;\n    text-align: left;\n  }\n  .mini-grid col.c1{ width: var(--mini-col-1); }\n  .mini-grid col.c2{ width: var(--mini-col-2); }\n  .mini-grid col.c3{ width: var(--mini-col-3); }\n  .mini-grid col.c4{ width: var(--mini-col-1); }\n  .mini-grid col.c5{ width: var(--mini-col-2); }\n  .mini-grid col.c6{ width: var(--mini-col-3); }\n  /* Main data grid */\n  #data-table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    margin-top: 2mm;\n    font-size: 10.5pt;\n  }\n  #data-table col.c-bin{ width: var(--bin-w); }\n  #data-table col.c-mat{ width: var(--mat-w); }\n  #data-table col.c-set{ width: var(--set-w); }\n  #data-table col.c-ach{ width: var(--ach-w); }\n  #data-table col.c-err{ width: var(--err-w); }\n  #data-table col.c-errp{ width: var(--errp-w); }\n  #data-table col.c-dur{ width: var(--dur-w); }\n  #data-table th, #data-table td{\n    border:1px solid #000;\n    padding: 1.2mm 1.6mm;\n  }\n  #data-table thead th{\n    font-weight: 700;\n    text-align: left;\n  }\n  #data-table td.num, #data-table th.num{\n    text-align: right;\n  }\n  #data-table tfoot td{\n    font-weight: 700;\n  }\n  /* Block layout */\n  .batch-block{\n    margin-top: 4mm;\n    page-break-inside: avoid;\n  }\n  .block-head{\n    display: grid;\n    grid-template-columns: 1fr auto;\n    column-gap: 6mm;\n    align-items: start;\n  }\n  .block-head .left-details{\n    padding-right: 2mm;\n  }\n  .block-head h3{\n    margin: 0 0 1mm 0;\n    font-size: 12pt;\n    font-weight: 700;\n  }\n  /* Footer */\n  #report-footer{\n    position: fixed;\n    left: 12mm; right: 12mm; bottom: 8mm;\n    font-size: 10.5pt;\n    color:#000;\n  }\n  #report-footer .left{ float:left; }\n  #report-footer .center{ text-align:center; }\n</style>\n</head>\n<body>\n\n<section id=\"report-header\">\n  <table class=\"top-grid\">\n    <tr>\n      <td class=\"left-block\" style=\"width:60%;\">\n        <p>Plant name : <span>{plant_name}</span></p>\n        <p>Location : <span>{location}</span></p>\n      </td>\n      <td class=\"right-block\" style=\"width:40%;\">\n        <p>Date: <span>{date}</span></p>\n        <p>Recipe : <span>{recipe}</span></p>\n        <p>Shift No: <span>{shift_no}</span></p>\n      </td>\n    </tr>\n  </table>\n\n  <div class=\"title-row\" aria-hidden=\"true\">\n    <div></div>\n    <div class=\"title\">Batch report</div>\n    <div></div>\n  </div>\n\n  <div class=\"print-date\">\n    <span class=\"label\">Print Date</span> : <span>{print_date}</span>\n  </div>\n</section>\n\n<!-- BEGIN:BLOCK_REPEAT batches -->\n<section class='batch-block'>\n  <div class=\"block-head\">\n    <div class=\"left-details\">\n      <table class=\"kv\">\n        <tr>\n          <td class=\"label\">Batch No</td><td class=\"sep\">:</td><td class=\"value\">{batch_no}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Batch Date</td><td class=\"sep\">:</td><td class=\"value\">{batch_date}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Shift No</td><td class=\"sep\">:</td><td class=\"value\">{batch_shift_no}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe Name</td><td class=\"sep\">:</td><td class=\"value\">{recipe_name}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe Code</td><td class=\"sep\">:</td><td class=\"value\">{recipe_code}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe No</td><td class=\"sep\">:</td><td class=\"value\">{recipe_no}</td>\n        </tr>\n      </table>\n    </div>\n    <div class=\"right-mini\">\n      <table class=\"mini-grid\">\n        <colgroup>\n          <col class=\"c1\"><col class=\"c2\"><col class=\"c3\">\n          <col class=\"c4\"><col class=\"c5\"><col class=\"c6\">\n        </colgroup>\n        <thead>\n          <tr>\n            <th data-label=\"scale\">Scale</th>\n            <th data-label=\"start_time\">Start time</th>\n            <th data-label=\"duration_sec\">Dur(sec)</th>\n            <th data-label=\"scale_2\">Scale</th>\n            <th data-label=\"start_time_2\">Start time</th>\n            <th data-label=\"duration_sec_2\">Dur(sec)</th>\n          </tr>\n        </thead>\n        <tbody>\n          <tr>\n            <td>{scale1_name}</td>\n            <td>{scale1_start_time}</td>\n            <td class=\"num\">{scale1_dur_sec}</td>\n            <td>{scale2_name}</td>\n            <td>{scale2_start_time}</td>\n            <td class=\"num\">{scale2_dur_sec}</td>\n          </tr>\n        </tbody>\n      </table>\n    </div>\n  </div>\n\n  <table id=\"data-table\">\n    <colgroup>\n      <col class=\"c-bin\">\n      <col class=\"c-mat\">\n      <col class=\"c-set\">\n      <col class=\"c-ach\">\n      <col class=\"c-err\">\n      <col class=\"c-errp\">\n      <col class=\"c-dur\">\n    </colgroup>\n    <thead>\n      <tr>\n        <th data-label=\"bin_no\">Bin No</th>\n        <th data-label=\"material_name\">Material Name</th>\n        <th data-label=\"set_wt_kg\" class=\"num\">Set wt(Kg)</th>\n        <th data-label=\"ach_wt_kg\" class=\"num\">Ach wt(Kg)</th>\n        <th data-label=\"error_kg\" class=\"num\">Error(Kg)</th>\n        <th data-label=\"error_percent\" class=\"num\">Error %</th>\n        <th data-label=\"dosing_dur_sec\" class=\"num\">Dosine Dur (sec)</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <td>{bin_no}</td>\n        <td>{material_name}</td>\n        <td class=\"num\">{set_wt_kg}</td>\n        <td class=\"num\">{ach_wt_kg}</td>\n        <td class=\"num\">{error_kg}</td>\n        <td class=\"num\">{error_percent}</td>\n        <td class=\"num\">{dosing_dur_sec}</td>\n      </tr>\n    </tbody>\n    <tfoot>\n      <tr>\n        <td colspan=\"2\">Total :</td>\n        <td class=\"num\">{total_set_wt}</td>\n        <td class=\"num\">{total_ach_wt}</td>\n        <td class=\"num\">{total_error_kg}</td>\n        <td class=\"num\">{total_error_percent}</td>\n        <td class=\"num\">{total_dosing_dur}</td>\n      </tr>\n    </tfoot>\n  </table>\n</section>\n<!-- END:BLOCK_REPEAT -->\n\n<section id=\"report-footer\">\n  <div class=\"left\">{footer_company}</div>\n  <div class=\"center\">Page {page_number} of {page_count}</div>\n</section>\n\n</body>\n</html>\n<!--END_HTML-->\n\n<!--BEGIN_SCHEMA_JSON-->\n{\n  \"scalars\": [\n    \"plant_name\",\n    \"location\",\n    \"date\",\n    \"recipe\",\n    \"shift_no\",\n    \"print_date\",\n    \"batch_no\",\n    \"batch_date\",\n    \"batch_shift_no\",\n    \"recipe_name\",\n    \"recipe_code\",\n    \"recipe_no\",\n    \"scale1_name\",\n    \"scale1_start_time\",\n    \"scale1_dur_sec\",\n    \"scale2_name\",\n    \"scale2_start_time\",\n    \"scale2_dur_sec\",\n    \"footer_company\",\n    \"page_number\",\n    \"page_count\"\n  ],\n  \"row_tokens\": [\n    \"bin_no\",\n    \"material_name\",\n    \"set_wt_kg\",\n    \"ach_wt_kg\",\n    \"error_kg\",\n    \"error_percent\",\n    \"dosing_dur_sec\"\n  ],\n  \"totals\": [\n    \"total_set_wt\",\n    \"total_ach_wt\",\n    \"total_error_kg\",\n    \"total_error_percent\",\n    \"total_dosing_dur\"\n  ],\n  \"notes\": \"\"\n}\n<!--END_SCHEMA_JSON-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761201963,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 5256,
    "prompt_tokens": 1544,
    "total_tokens": 6800,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 2368,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-23T06:49:14Z - template_fix_html_call2

```json
{
  "id": "chatcmpl-CTjOpp83eL42p2vWHR2xU1YvIfurB",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n<title>Batch report</title>\n<style>\n  @page { size: A4; margin: 12mm 12mm 16mm 14mm; }\n  :root{\n    --header-gap: 3.2mm;\n    --kv-label-w: 32mm;\n    --kv-col-gap: 2.2mm;\n\n    /* Mini time grid (right) */\n    --mini-col-1: 22mm;  /* Scale */\n    --mini-col-2: 26mm;  /* Start time */\n    --mini-col-3: 18mm;  /* Dur(sec) */\n\n    /* Main table columns - sum to page content width (~184mm) */\n    --bin-w: 12mm;\n    --mat-w: 76mm;\n    --set-w: 20mm;\n    --ach-w: 20mm;\n    --err-w: 18mm;\n    --errp-w: 14mm;\n    --dur-w: 24mm;\n\n    --row-gap: 2.5mm;\n  }\n  *{ box-sizing: border-box; }\n  body{\n    font-family: \"Times New Roman\", serif;\n    font-size: 11pt;\n    color:#000;\n    line-height: 1.25;\n    font-variant-numeric: tabular-nums;\n  }\n\n  /* Header */\n  #report-header{ width:100%; }\n  #report-header .top-grid{\n    width:100%;\n    border-collapse: separate;\n    border-spacing:0;\n  }\n  #report-header .top-grid td{ vertical-align: top; padding: 0; }\n  #report-header .left-block p,\n  #report-header .right-block p{\n    margin: 0 0 1.6mm 0;\n    white-space: nowrap;\n  }\n  #report-header .right-block{ text-align: right; }\n  #report-header .title-row{\n    margin-top: 1.2mm;\n    display: grid;\n    grid-template-columns: 1fr auto 1fr;\n    align-items: center;\n  }\n  #report-header .title-row .title{\n    font-weight: 700;\n    font-size: 16pt;\n    text-align: center;\n  }\n  #report-header .print-date{\n    margin-top: var(--header-gap);\n    padding: 1mm 0 1.2mm 0;\n    border-top: 1px solid #000;\n    border-bottom: 1px solid #000;\n    font-weight: 600;\n  }\n  #report-header .print-date span.label{ font-weight: 700; }\n\n  /* Key/Value tables inside blocks */\n  .kv{ border-collapse: collapse; table-layout: fixed; width: 100%; }\n  .kv td{ padding: 0.6mm 0; vertical-align: top; }\n  .kv td.label{ width: var(--kv-label-w); }\n  .kv td.sep{ width: 3mm; text-align: center; }\n  .kv td.value{ padding-left: var(--kv-col-gap); width: auto; white-space: nowrap; }\n\n  /* Small scale time table (right) */\n  .mini-grid{\n    border-collapse: collapse;\n    table-layout: fixed;\n    width: calc(var(--mini-col-1) + var(--mini-col-2) + var(--mini-col-3) + var(--mini-col-1) + var(--mini-col-2) + var(--mini-col-3));\n    margin-left: auto;\n    font-size: 10pt;\n  }\n  .mini-grid th, .mini-grid td{\n    border:1px solid #000;\n    padding: 0.9mm 1.2mm;\n    text-align: left;\n    line-height: 1.15;\n  }\n  .mini-grid th[data-label]{ font-weight: 700; text-align: left; }\n  .mini-grid col.c1{ width: var(--mini-col-1); }\n  .mini-grid col.c2{ width: var(--mini-col-2); }\n  .mini-grid col.c3{ width: var(--mini-col-3); }\n  .mini-grid col.c4{ width: var(--mini-col-1); }\n  .mini-grid col.c5{ width: var(--mini-col-2); }\n  .mini-grid col.c6{ width: var(--mini-col-3); }\n\n  /* Main data grid */\n  #data-table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    margin-top: 2mm;\n    font-size: 10pt;\n    line-height: 1.18;\n  }\n  #data-table col.c-bin{ width: var(--bin-w); }\n  #data-table col.c-mat{ width: var(--mat-w); }\n  #data-table col.c-set{ width: var(--set-w); }\n  #data-table col.c-ach{ width: var(--ach-w); }\n  #data-table col.c-err{ width: var(--err-w); }\n  #data-table col.c-errp{ width: var(--errp-w); }\n  #data-table col.c-dur{ width: var(--dur-w); }\n  #data-table th, #data-table td{\n    border:1px solid #000;\n    padding: 1.1mm 1.6mm;\n  }\n  #data-table thead th{\n    font-weight: 700;\n    text-align: left;\n    white-space: normal;\n  }\n  #data-table td.num, #data-table th.num{ text-align: right; }\n  #data-table tfoot td{ font-weight: 700; }\n\n  /* Block layout */\n  .batch-block{\n    margin-top: 4mm;\n    break-inside: avoid;\n    page-break-inside: avoid;\n  }\n  .block-head{\n    display: grid;\n    grid-template-columns: 1fr auto;\n    column-gap: 6mm;\n    align-items: start;\n  }\n  .block-head .left-details{ padding-right: 2mm; }\n  .block-head h3{ margin: 0 0 1mm 0; font-size: 12pt; font-weight: 700; }\n\n  /* Footer */\n  #report-footer{\n    position: fixed;\n    left: 12mm; right: 12mm; bottom: 8mm;\n    font-size: 10.5pt;\n    color:#000;\n  }\n  #report-footer .left{ float:left; }\n  #report-footer .center{ text-align:center; }\n</style>\n</head>\n<body>\n\n<section id=\"report-header\">\n  <table class=\"top-grid\">\n    <tr>\n      <td class=\"left-block\" style=\"width:60%;\">\n        <p>Plant name : <span>{plant_name}</span></p>\n        <p>Location : <span>{location}</span></p>\n      </td>\n      <td class=\"right-block\" style=\"width:40%;\">\n        <p>Date: <span>{date}</span></p>\n        <p>Recipe : <span>{recipe}</span></p>\n        <p>Shift No: <span>{shift_no}</span></p>\n      </td>\n    </tr>\n  </table>\n\n  <div class=\"title-row\">\n    <div></div>\n    <div class=\"title\">Batch report</div>\n    <div></div>\n  </div>\n\n  <div class=\"print-date\">\n    <span class=\"label\">Print Date</span> : <span>{print_date}</span>\n  </div>\n</section>\n\n<!-- BEGIN:BLOCK_REPEAT batches -->\n<section class=\"batch-block\">\n  <div class=\"block-head\">\n    <div class=\"left-details\">\n      <table class=\"kv\">\n        <tr>\n          <td class=\"label\">Batch No</td><td class=\"sep\">:</td><td class=\"value\">{batch_no}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Batch Date</td><td class=\"sep\">:</td><td class=\"value\">{batch_date}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Shift No</td><td class=\"sep\">:</td><td class=\"value\">{batch_shift_no}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe Name</td><td class=\"sep\">:</td><td class=\"value\">{recipe_name}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe Code</td><td class=\"sep\">:</td><td class=\"value\">{recipe_code}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe No</td><td class=\"sep\">:</td><td class=\"value\">{recipe_no}</td>\n        </tr>\n      </table>\n    </div>\n    <div class=\"right-mini\">\n      <table class=\"mini-grid\">\n        <colgroup>\n          <col class=\"c1\" /><col class=\"c2\" /><col class=\"c3\" />\n          <col class=\"c4\" /><col class=\"c5\" /><col class=\"c6\" />\n        </colgroup>\n        <thead>\n          <tr>\n            <th data-label=\"scale\">Scale</th>\n            <th data-label=\"start_time\">Start time</th>\n            <th data-label=\"duration_sec\">Dur(sec)</th>\n            <th data-label=\"scale_2\">Scale</th>\n            <th data-label=\"start_time_2\">Start time</th>\n            <th data-label=\"duration_sec_2\">Dur(sec)</th>\n          </tr>\n        </thead>\n        <tbody>\n          <tr>\n            <td>{scale1_name}</td>\n            <td>{scale1_start_time}</td>\n            <td class=\"num\">{scale1_dur_sec}</td>\n            <td>{scale2_name}</td>\n            <td>{scale2_start_time}</td>\n            <td class=\"num\">{scale2_dur_sec}</td>\n          </tr>\n        </tbody>\n      </table>\n    </div>\n  </div>\n\n  <table id=\"data-table\">\n    <colgroup>\n      <col class=\"c-bin\" />\n      <col class=\"c-mat\" />\n      <col class=\"c-set\" />\n      <col class=\"c-ach\" />\n      <col class=\"c-err\" />\n      <col class=\"c-errp\" />\n      <col class=\"c-dur\" />\n    </colgroup>\n    <thead>\n      <tr>\n        <th data-label=\"bin_no\">Bin No</th>\n        <th data-label=\"material_name\">Material Name</th>\n        <th data-label=\"set_wt_kg\" class=\"num\">Set wt(Kg)</th>\n        <th data-label=\"ach_wt_kg\" class=\"num\">Ach wt(Kg)</th>\n        <th data-label=\"error_kg\" class=\"num\">Error(Kg)</th>\n        <th data-label=\"error_percent\" class=\"num\">Error %</th>\n        <th data-label=\"dosing_dur_sec\" class=\"num\">Dosine Dur (sec)</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <td>{bin_no}</td>\n        <td>{material_name}</td>\n        <td class=\"num\">{set_wt_kg}</td>\n        <td class=\"num\">{ach_wt_kg}</td>\n        <td class=\"num\">{error_kg}</td>\n        <td class=\"num\">{error_percent}</td>\n        <td class=\"num\">{dosing_dur_sec}</td>\n      </tr>\n    </tbody>\n    <tfoot>\n      <tr>\n        <td colspan=\"2\">Total :</td>\n        <td class=\"num\">{total_set_wt}</td>\n        <td class=\"num\">{total_ach_wt}</td>\n        <td class=\"num\">{total_error_kg}</td>\n        <td class=\"num\">{total_error_percent}</td>\n        <td class=\"num\">{total_dosing_dur}</td>\n      </tr>\n    </tfoot>\n  </table>\n</section>\n<!-- END:BLOCK_REPEAT -->\n\n<section id=\"report-footer\">\n  <div class=\"left\">{footer_company}</div>\n  <div class=\"center\">Page {page_number} of {page_count}</div>\n</section>\n\n</body>\n</html>\n<!--END_HTML-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761202063,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6285,
    "prompt_tokens": 5037,
    "total_tokens": 11322,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 3584,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-23T06:52:59Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CTjSU66MN7CPdP7zX887V0vBT1ZBS",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"date\": \"params.date\",\n    \"recipe\": \"params.recipe\",\n    \"shift_no\": \"params.shift_no\",\n    \"print_date\": \"params.print_date\",\n    \"batch_no\": \"batch_header.batch_no\",\n    \"batch_date\": \"batch_header.batch_date\",\n    \"batch_shift_no\": \"batch_header.shift_no\",\n    \"recipe_name\": \"batch_header.recipe_name\",\n    \"recipe_code\": \"batch_header.recipe_code\",\n    \"recipe_no\": \"batch_header.recipe_no\",\n    \"scale\": \"UNRESOLVED\",\n    \"start_time\": \"UNRESOLVED\",\n    \"duration_sec\": \"UNRESOLVED\",\n    \"scale_2\": \"UNRESOLVED\",\n    \"start_time_2\": \"UNRESOLVED\",\n    \"duration_sec_2\": \"UNRESOLVED\",\n    \"scale1_name\": \"UNRESOLVED\",\n    \"scale1_start_time\": \"UNRESOLVED\",\n    \"scale1_dur_sec\": \"UNRESOLVED\",\n    \"scale2_name\": \"UNRESOLVED\",\n    \"scale2_start_time\": \"UNRESOLVED\",\n    \"scale2_dur_sec\": \"UNRESOLVED\",\n    \"bin_no\": \"batch_materials.bin_no\",\n    \"material_name\": \"batch_materials.material_name\",\n    \"set_wt_kg\": \"batch_materials.set_wt\",\n    \"ach_wt_kg\": \"batch_materials.ach_wt\",\n    \"error_kg\": \"batch_materials.error_kg\",\n    \"error_percent\": \"batch_materials.error_pct\",\n    \"dosing_dur_sec\": \"batch_materials.dosing_dur_sec\",\n    \"total_set_wt\": \"SUM(batch_materials.set_wt)\",\n    \"total_ach_wt\": \"SUM(batch_materials.ach_wt)\",\n    \"total_error_kg\": \"SUM(batch_materials.error_kg)\",\n    \"total_error_percent\": \"CASE WHEN SUM(batch_materials.set_wt)=0 THEN NULL ELSE (SUM(batch_materials.error_kg)/SUM(batch_materials.set_wt))*100 END\",\n    \"total_dosing_dur\": \"SUM(batch_materials.dosing_dur_sec)\",\n    \"page_number\": \"To Be Selected...\",\n    \"page_count\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"date\": \"24/03/2024\",\n    \"recipe\": \"GANGADHAR-2024\",\n    \"shift_no\": \"1\",\n    \"print_date\": \"25/03/2024\",\n    \"batch_no\": \"032024-1650\",\n    \"batch_date\": \"24/03/2024\",\n    \"batch_shift_no\": \"1\",\n    \"recipe_name\": \"GANGADHAR-24\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"recipe_no\": \"1\",\n    \"scale1_name\": \"Main1\",\n    \"scale1_start_time\": \"6:49:16\",\n    \"scale1_dur_sec\": \"441\",\n    \"scale2_name\": \"Main2\",\n    \"scale2_start_time\": \"6:49:19\",\n    \"scale2_dur_sec\": \"602\",\n    \"bin_no\": \"7\",\n    \"material_name\": \"DORB (COM) KRR\",\n    \"set_wt_kg\": \"200.00\",\n    \"ach_wt_kg\": \"202.10\",\n    \"error_kg\": \"2.10\",\n    \"error_percent\": \"1.05\",\n    \"dosing_dur_sec\": \"35\",\n    \"total_set_wt\": \"1,000.00\",\n    \"total_ach_wt\": \"999.30\",\n    \"total_error_kg\": \"-0.70\",\n    \"total_error_percent\": \"-0.07\",\n    \"total_dosing_dur\": \"975\",\n    \"footer_company\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_number\": \"1\",\n    \"page_count\": \"29\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"scale\",\n      \"start_time\",\n      \"duration_sec\",\n      \"scale_2\",\n      \"start_time_2\",\n      \"duration_sec_2\",\n      \"scale1_name\",\n      \"scale1_start_time\",\n      \"scale1_dur_sec\",\n      \"scale2_name\",\n      \"scale2_start_time\",\n      \"scale2_dur_sec\"\n    ],\n    \"hints\": {}\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761202290,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6502,
    "prompt_tokens": 4741,
    "total_tokens": 11243,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5504,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 4608
    }
  }
}
```

## 2025-10-23T06:53:15Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CTjSTWE7IpP8I7nzyhmWzhXb95b0A",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"date\": \"params.date\",\n    \"recipe\": \"params.recipe\",\n    \"shift_no\": \"params.shift_no\",\n    \"print_date\": \"params.print_date\",\n    \"batch_no\": \"batch_header.batch_no\",\n    \"batch_date\": \"batch_header.batch_date\",\n    \"batch_shift_no\": \"batch_header.shift_no\",\n    \"recipe_name\": \"batch_header.recipe_name\",\n    \"recipe_code\": \"batch_header.recipe_code\",\n    \"recipe_no\": \"batch_header.recipe_no\",\n    \"scale\": \"UNRESOLVED\",\n    \"start_time\": \"batch_header.scale_start_time\",\n    \"duration_sec\": \"batch_header.duration_sec\",\n    \"scale_2\": \"UNRESOLVED\",\n    \"start_time_2\": \"UNRESOLVED\",\n    \"duration_sec_2\": \"UNRESOLVED\",\n    \"scale1_name\": \"UNRESOLVED\",\n    \"scale1_start_time\": \"batch_header.scale_start_time\",\n    \"scale1_dur_sec\": \"batch_header.duration_sec\",\n    \"scale2_name\": \"UNRESOLVED\",\n    \"scale2_start_time\": \"UNRESOLVED\",\n    \"scale2_dur_sec\": \"UNRESOLVED\",\n    \"bin_no\": \"batch_materials.bin_no\",\n    \"material_name\": \"batch_materials.material_name\",\n    \"set_wt_kg\": \"batch_materials.set_wt\",\n    \"ach_wt_kg\": \"batch_materials.ach_wt\",\n    \"error_kg\": \"batch_materials.error_kg\",\n    \"error_percent\": \"batch_materials.error_pct\",\n    \"dosing_dur_sec\": \"batch_materials.dosing_dur_sec\",\n    \"total_set_wt\": \"SUM(batch_materials.set_wt)\",\n    \"total_ach_wt\": \"SUM(batch_materials.ach_wt)\",\n    \"total_error_kg\": \"SUM(batch_materials.error_kg)\",\n    \"total_error_percent\": \"CASE WHEN SUM(batch_materials.set_wt) = 0 THEN NULL ELSE SUM(batch_materials.error_kg) / SUM(batch_materials.set_wt) * 100 END\",\n    \"total_dosing_dur\": \"SUM(batch_materials.dosing_dur_sec)\",\n    \"page_number\": \"To Be Selected...\",\n    \"page_count\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"date\": \"24/03/2024\",\n    \"recipe\": \"GANGADHAR-2024\",\n    \"shift_no\": \"1\",\n    \"print_date\": \"25/03/2024\",\n    \"batch_no\": \"032024-1650\",\n    \"batch_date\": \"24/03/2024\",\n    \"batch_shift_no\": \"1\",\n    \"recipe_name\": \"GANGADHAR-24\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"recipe_no\": \"1\",\n    \"scale1_name\": \"Main1\",\n    \"scale1_start_time\": \"6:49:16\",\n    \"scale1_dur_sec\": \"441\",\n    \"scale2_name\": \"Main2\",\n    \"scale2_start_time\": \"6:49:19\",\n    \"scale2_dur_sec\": \"602\",\n    \"bin_no\": \"7\",\n    \"material_name\": \"DORB (COM) KRR\",\n    \"set_wt_kg\": \"200.00\",\n    \"ach_wt_kg\": \"202.10\",\n    \"error_kg\": \"2.10\",\n    \"error_percent\": \"1.05\",\n    \"dosing_dur_sec\": \"35\",\n    \"total_set_wt\": \"1,000.00\",\n    \"total_ach_wt\": \"999.30\",\n    \"total_error_kg\": \"-0.70\",\n    \"total_error_percent\": \"-0.07\",\n    \"total_dosing_dur\": \"975\",\n    \"footer_company\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_number\": \"1\",\n    \"page_count\": \"29\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"scale\",\n      \"scale_2\",\n      \"scale1_name\",\n      \"scale2_name\",\n      \"start_time_2\",\n      \"duration_sec_2\",\n      \"scale2_start_time\",\n      \"scale2_dur_sec\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": { \"op\": \"SUM\", \"over\": [\"batch_materials.set_wt\"] },\n      \"total_ach_wt\": { \"op\": \"SUM\", \"over\": [\"batch_materials.ach_wt\"] },\n      \"total_error_kg\": { \"op\": \"SUM\", \"over\": [\"batch_materials.error_kg\"] },\n      \"total_dosing_dur\": { \"op\": \"SUM\", \"over\": [\"batch_materials.dosing_dur_sec\"] }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761202289,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6466,
    "prompt_tokens": 4741,
    "total_tokens": 11207,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5376,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-23T11:13:56Z - template_initial_html

```json
{
  "id": "chatcmpl-CTnXOQWQ9hRgYDHVPusbQT9vIM99Y",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Batch report</title>\n<style>\n  @page {\n    size: A4;\n    margin: 14mm 16mm;\n  }\n  :root{\n    --label-w: 34mm;\n    --colon-w: 4mm;\n    --col-bin-w: 16mm;\n    --col-mat-w: 80mm;\n    --col-num-w: 24mm;\n    --row-gap: 2mm;\n  }\n  *{box-sizing:border-box;}\n  body{\n    font-family: \"Times New Roman\", serif;\n    font-size: 11pt;\n    line-height: 1.25;\n    color:#000;\n    margin:0;\n  }\n  #report-header{\n    display:grid;\n    grid-template-columns: 1fr auto 1fr;\n    align-items:end;\n    column-gap: 6mm;\n    margin-bottom: 6mm;\n  }\n  #report-header .left,\n  #report-header .right{\n    font-size: 11pt;\n  }\n  #report-header .left .row,\n  #report-header .right .row{\n    display:flex;\n    gap: 4mm;\n  }\n  #report-header .title{\n    text-align:center;\n    font-size: 18pt;\n    font-weight: 700;\n  }\n  #report-header .print{\n    grid-column: 1 / 2;\n    margin-top: 4mm;\n    font-weight: 700;\n  }\n\n  /* Generic tables */\n  table{\n    width:100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  .grid{\n    border:1px solid #000;\n  }\n  .grid th, .grid td{\n    border:1px solid #000;\n    padding: 3.5pt 5pt;\n    vertical-align: middle;\n  }\n  th{\n    font-weight:700;\n  }\n  .num, td.num{\n    text-align: right;\n  }\n\n  /* Meta area (left K/V + right scale grid) */\n  .meta-wrap{\n    margin-bottom: 4mm;\n  }\n  .meta{\n    border:1px solid #000;\n  }\n  .meta td{\n    border-right:1px solid #000;\n    vertical-align: top;\n    padding:0;\n  }\n  .meta td:last-child{\n    border-right:0;\n  }\n  .kv{\n    width:100%;\n    border-collapse: separate;\n    border-spacing:0;\n    table-layout: fixed;\n  }\n  .kv td{\n    border:0;\n    padding: 3.5pt 5pt;\n  }\n  .kv td.label{ width: var(--label-w); }\n  .kv td.colon{ width: var(--colon-w); text-align:center; }\n  .scale-grid{\n    width:100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  .scale-grid th, .scale-grid td{\n    border:1px solid #000;\n    padding: 3.5pt 5pt;\n    text-align:left;\n  }\n  .scale-grid .num{ text-align:right; }\n\n  /* Main data table (bins/materials) */\n  #data-table th[data-label]{ white-space: nowrap; }\n  #data-table th:nth-child(1){ width: var(--col-bin-w); }\n  #data-table th:nth-child(2){ width: var(--col-mat-w); }\n  #data-table th:nth-child(3),\n  #data-table th:nth-child(4),\n  #data-table th:nth-child(5),\n  #data-table th:nth-child(6),\n  #data-table th:nth-child(7){ width: var(--col-num-w); }\n  #data-table tfoot td{\n    font-weight:700;\n    background:#fff;\n  }\n  #data-table tfoot td.label{\n    text-align:right;\n    padding-right:8pt;\n  }\n\n  /* Footer */\n  footer{\n    margin-top: 8mm;\n    display:flex;\n    justify-content: space-between;\n    align-items:center;\n    font-size:10pt;\n  }\n  footer .center{\n    flex:1;\n    text-align:center;\n  }\n</style>\n</head>\n<body>\n\n<header id=\"report-header\">\n  <div class=\"left\">\n    <div class=\"row\"><div>Plant name</div><div>:</div><div>{plant_name}</div></div>\n    <div class=\"row\"><div>Location</div><div>:</div><div>{location}</div></div>\n  </div>\n  <div class=\"title\">Batch report</div>\n  <div class=\"right\" style=\"text-align:right\">\n    <div class=\"row\" style=\"justify-content:flex-end; gap:4mm\"><div>Date</div><div>:</div><div>{header_date}</div></div>\n    <div class=\"row\" style=\"justify-content:flex-end; gap:4mm\"><div>Recipe</div><div>:</div><div>{recipe}</div></div>\n    <div class=\"row\" style=\"justify-content:flex-end; gap:4mm\"><div>Shift No</div><div>:</div><div>{hdr_shift_no}</div></div>\n  </div>\n  <div class=\"print\">Print Date : {print_date}</div>\n</header>\n\n<!-- BEGIN:BLOCK_REPEAT batches -->\n<section class='batch-block'>\n\n  <div class=\"meta-wrap\">\n    <table class=\"meta\" style=\"width:100%; table-layout:fixed\">\n      <colgroup>\n        <col style=\"width:56%\">\n        <col style=\"width:44%\">\n      </colgroup>\n      <tr>\n        <td>\n          <table class=\"kv\">\n            <tr>\n              <td class=\"label\">Batch No</td><td class=\"colon\">:</td><td>{batch_no}</td>\n            </tr>\n            <tr>\n              <td class=\"label\">Batch Date</td><td class=\"colon\">:</td><td>{batch_date}</td>\n            </tr>\n            <tr>\n              <td class=\"label\">Shift No</td><td class=\"colon\">:</td><td>{batch_shift_no}</td>\n            </tr>\n            <tr>\n              <td class=\"label\">Recipe Name</td><td class=\"colon\">:</td><td>{recipe_name}</td>\n            </tr>\n            <tr>\n              <td class=\"label\">Recipe Code</td><td class=\"colon\">:</td><td>{recipe_code}</td>\n            </tr>\n            <tr>\n              <td class=\"label\">Recipe No</td><td class=\"colon\">:</td><td>{recipe_no}</td>\n            </tr>\n          </table>\n        </td>\n        <td>\n          <table class=\"scale-grid\">\n            <thead>\n              <tr>\n                <th data-label=\"scale_l\">Scale</th>\n                <th data-label=\"start_time_l\">Start time</th>\n                <th data-label=\"dur_l\">Dur(sec)</th>\n                <th data-label=\"scale_r\">Scale</th>\n                <th data-label=\"start_time_r\">Start time</th>\n                <th data-label=\"dur_r\">Dur(sec)</th>\n              </tr>\n            </thead>\n            <tbody>\n              <tr>\n                <td>{scale1_name}</td>\n                <td>{scale1_start_time}</td>\n                <td class=\"num\">{scale1_dur}</td>\n                <td>{scale2_name}</td>\n                <td>{scale2_start_time}</td>\n                <td class=\"num\">{scale2_dur}</td>\n              </tr>\n            </tbody>\n          </table>\n        </td>\n      </tr>\n    </table>\n  </div>\n\n  <table id=\"data-table\" class=\"grid\">\n    <thead>\n      <tr>\n        <th data-label=\"bin_no\">Bin No</th>\n        <th data-label=\"material_name\">Material Name</th>\n        <th class=\"num\" data-label=\"set_wt\">Set wt(Kg)</th>\n        <th class=\"num\" data-label=\"ach_wt\">Ach wt(Kg)</th>\n        <th class=\"num\" data-label=\"error_kg\">Error(Kg)</th>\n        <th class=\"num\" data-label=\"error_pct\">Error %</th>\n        <th class=\"num\" data-label=\"dosing_dur\">Dosine Dur (sec)</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <td class=\"num\">{bin_no}</td>\n        <td>{material_name}</td>\n        <td class=\"num\">{set_wt}</td>\n        <td class=\"num\">{ach_wt}</td>\n        <td class=\"num\">{error_kg}</td>\n        <td class=\"num\">{error_pct}</td>\n        <td class=\"num\">{dosing_dur_sec}</td>\n      </tr>\n    </tbody>\n    <tfoot id=\"report-totals\">\n      <tr>\n        <td colspan=\"2\" class=\"label\">Total :</td>\n        <td class=\"num\">{set_total}</td>\n        <td class=\"num\">{ach_total}</td>\n        <td class=\"num\">{error_total}</td>\n        <td class=\"num\">{error_pct_total}</td>\n        <td class=\"num\">{dosing_total}</td>\n      </tr>\n    </tfoot>\n  </table>\n\n</section>\n<!-- END:BLOCK_REPEAT -->\n\n<footer>\n  <div>Indian Industrial Machines Pvt. Ltd.</div>\n  <div class=\"center\">Page {page_no} of {page_count}</div>\n  <div></div>\n</footer>\n\n</body>\n</html>\n<!--END_HTML-->\n\n<!--BEGIN_SCHEMA_JSON-->\n{\n  \"scalars\": [\n    \"plant_name\",\n    \"location\",\n    \"header_date\",\n    \"recipe\",\n    \"hdr_shift_no\",\n    \"print_date\",\n    \"batch_no\",\n    \"batch_date\",\n    \"batch_shift_no\",\n    \"recipe_name\",\n    \"recipe_code\",\n    \"recipe_no\",\n    \"scale1_name\",\n    \"scale1_start_time\",\n    \"scale1_dur\",\n    \"scale2_name\",\n    \"scale2_start_time\",\n    \"scale2_dur\",\n    \"page_no\",\n    \"page_count\"\n  ],\n  \"row_tokens\": [\n    \"bin_no\",\n    \"material_name\",\n    \"set_wt\",\n    \"ach_wt\",\n    \"error_kg\",\n    \"error_pct\",\n    \"dosing_dur_sec\"\n  ],\n  \"totals\": [\n    \"set_total\",\n    \"ach_total\",\n    \"error_total\",\n    \"error_pct_total\",\n    \"dosing_total\"\n  ],\n  \"notes\": \"\"\n}\n<!--END_SCHEMA_JSON-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761217970,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 5784,
    "prompt_tokens": 1544,
    "total_tokens": 7328,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 3456,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-23T11:15:16Z - template_fix_html_call2

```json
{
  "id": "chatcmpl-CTnYkr5j0cxuPVuljfAaeHPvfkrrC",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n<title>Batch report</title>\n<style>\n  @page{\n    size:A4;\n    margin:14mm 16mm;\n  }\n  :root{\n    --label-w: 30mm;\n    --colon-w: 4mm;\n    --col-bin-w: 12mm;\n    --col-mat-w: 60mm;\n    --col-num-w: 21.2mm; /* 5 numeric columns; sums to printable width */\n    --row-gap: 2.2mm;\n    --rule: 0.6pt;\n  }\n  *{box-sizing:border-box;}\n  html,body{height:100%;}\n  body{\n    font-family:\"Times New Roman\", serif;\n    font-size:11pt;\n    line-height:1.22;\n    color:#000;\n    margin:0;\n    font-variant-numeric: tabular-nums;\n  }\n\n  /* Header */\n  #report-header{\n    display:grid;\n    grid-template-columns: 1fr auto 1fr;\n    align-items:end;\n    column-gap: 6mm;\n    margin-bottom: 5mm;\n  }\n  #report-header .left,\n  #report-header .right{\n    font-size:11pt;\n  }\n  #report-header .left .row,\n  #report-header .right .row{\n    display:flex;\n    gap: 4mm;\n    white-space:nowrap;\n  }\n  #report-header .title{\n    text-align:center;\n    font-size:18pt;\n    font-weight:700;\n  }\n  #report-header .print{\n    grid-column:1/2;\n    margin-top:4mm;\n    font-weight:700;\n  }\n\n  /* Generic tables */\n  table{width:100%; border-collapse:collapse; table-layout:fixed;}\n  th{font-weight:700;}\n  .grid{border:var(--rule) solid #000;}\n  .grid th,.grid td{\n    border:var(--rule) solid #000;\n    padding:2.5pt 4.5pt;\n    vertical-align:middle;\n  }\n  .grid thead th{ text-align:center; }\n  .grid thead th:nth-child(1),\n  .grid thead th:nth-child(2){ text-align:left; }\n\n  .num, td.num{ text-align:right; }\n\n  /* Meta area */\n  .meta-wrap{ margin-bottom: 2.5mm; }\n  .meta{\n    width:100%;\n    border:var(--rule) solid #000;\n  }\n  .meta > tbody > tr > td{\n    border-right:var(--rule) solid #000;\n    vertical-align:top;\n    padding:0;\n  }\n  .meta > tbody > tr > td:last-child{ border-right:0; }\n\n  .kv{\n    width:100%;\n    border-collapse:separate;\n    border-spacing:0;\n    table-layout:fixed;\n  }\n  .kv td{ border:0; padding:2.5pt 4.5pt; }\n  .kv td.label{ width:var(--label-w); }\n  .kv td.colon{ width:var(--colon-w); text-align:center; }\n\n  .scale-grid{\n    width:100%;\n    border-collapse:collapse;\n    table-layout:fixed;\n  }\n  .scale-grid th,.scale-grid td{\n    border:var(--rule) solid #000;\n    padding:2.5pt 4.5pt;\n  }\n  .scale-grid th{ text-align:center; }\n  .scale-grid td{ text-align:left; }\n  .scale-grid .num{ text-align:right; }\n\n  /* Data table */\n  #data-table th[data-label]{ white-space:nowrap; }\n  #data-table colgroup col:nth-child(1){ width: var(--col-bin-w); }\n  #data-table colgroup col:nth-child(2){ width: var(--col-mat-w); }\n  #data-table colgroup col:nth-child(n+3){ width: var(--col-num-w); }\n\n  #data-table tfoot td{\n    font-weight:700;\n    background:#fff;\n  }\n  #data-table tfoot td.label{\n    text-align:right;\n    padding-right:8pt;\n  }\n\n  /* Pagination stability */\n  .batch-block{ break-inside:avoid; page-break-inside:avoid; margin-bottom: var(--row-gap); }\n\n  /* Footer */\n  footer{\n    margin-top:8mm;\n    display:flex;\n    justify-content:space-between;\n    align-items:center;\n    font-size:10pt;\n  }\n  footer .center{ flex:1; text-align:center; }\n</style>\n</head>\n<body>\n\n<header id=\"report-header\">\n  <div class=\"left\">\n    <div class=\"row\"><div>Plant name</div><div>:</div><div>{plant_name}</div></div>\n    <div class=\"row\"><div>Location</div><div>:</div><div>{location}</div></div>\n  </div>\n  <div class=\"title\">Batch report</div>\n  <div class=\"right\" style=\"text-align:right\">\n    <div class=\"row\" style=\"justify-content:flex-end; gap:4mm\"><div>Date</div><div>:</div><div>{header_date}</div></div>\n    <div class=\"row\" style=\"justify-content:flex-end; gap:4mm\"><div>Recipe</div><div>:</div><div>{recipe}</div></div>\n    <div class=\"row\" style=\"justify-content:flex-end; gap:4mm\"><div>Shift No</div><div>:</div><div>{hdr_shift_no}</div></div>\n  </div>\n  <div class=\"print\">Print Date : {print_date}</div>\n</header>\n\n<!-- BEGIN:BLOCK_REPEAT batches -->\n<section class=\"batch-block\">\n\n  <div class=\"meta-wrap\">\n    <table class=\"meta\">\n      <colgroup>\n        <col style=\"width:56%\">\n        <col style=\"width:44%\">\n      </colgroup>\n      <tbody>\n        <tr>\n          <td>\n            <table class=\"kv\">\n              <tbody>\n                <tr><td class=\"label\">Batch No</td><td class=\"colon\">:</td><td>{batch_no}</td></tr>\n                <tr><td class=\"label\">Batch Date</td><td class=\"colon\">:</td><td>{batch_date}</td></tr>\n                <tr><td class=\"label\">Shift No</td><td class=\"colon\">:</td><td>{batch_shift_no}</td></tr>\n                <tr><td class=\"label\">Recipe Name</td><td class=\"colon\">:</td><td>{recipe_name}</td></tr>\n                <tr><td class=\"label\">Recipe Code</td><td class=\"colon\">:</td><td>{recipe_code}</td></tr>\n                <tr><td class=\"label\">Recipe No</td><td class=\"colon\">:</td><td>{recipe_no}</td></tr>\n              </tbody>\n            </table>\n          </td>\n          <td>\n            <table class=\"scale-grid\">\n              <thead>\n                <tr>\n                  <th data-label=\"scale_l\">Scale</th>\n                  <th data-label=\"start_time_l\">Start time</th>\n                  <th data-label=\"dur_l\">Dur(sec)</th>\n                  <th data-label=\"scale_r\">Scale</th>\n                  <th data-label=\"start_time_r\">Start time</th>\n                  <th data-label=\"dur_r\">Dur(sec)</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr>\n                  <td>{scale1_name}</td>\n                  <td>{scale1_start_time}</td>\n                  <td class=\"num\">{scale1_dur}</td>\n                  <td>{scale2_name}</td>\n                  <td>{scale2_start_time}</td>\n                  <td class=\"num\">{scale2_dur}</td>\n                </tr>\n              </tbody>\n            </table>\n          </td>\n        </tr>\n      </tbody>\n    </table>\n  </div>\n\n  <table id=\"data-table\" class=\"grid\">\n    <colgroup>\n      <col>\n      <col>\n      <col>\n      <col>\n      <col>\n      <col>\n      <col>\n    </colgroup>\n    <thead>\n      <tr>\n        <th data-label=\"bin_no\">Bin No</th>\n        <th data-label=\"material_name\">Material Name</th>\n        <th class=\"num\" data-label=\"set_wt\">Set wt(Kg)</th>\n        <th class=\"num\" data-label=\"ach_wt\">Ach wt(Kg)</th>\n        <th class=\"num\" data-label=\"error_kg\">Error(Kg)</th>\n        <th class=\"num\" data-label=\"error_pct\">Error %</th>\n        <th class=\"num\" data-label=\"dosing_dur\">Dosine Dur (sec)</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <td class=\"num\">{bin_no}</td>\n        <td>{material_name}</td>\n        <td class=\"num\">{set_wt}</td>\n        <td class=\"num\">{ach_wt}</td>\n        <td class=\"num\">{error_kg}</td>\n        <td class=\"num\">{error_pct}</td>\n        <td class=\"num\">{dosing_dur_sec}</td>\n      </tr>\n    </tbody>\n    <tfoot id=\"report-totals\">\n      <tr>\n        <td colspan=\"2\" class=\"label\">Total :</td>\n        <td class=\"num\">{set_total}</td>\n        <td class=\"num\">{ach_total}</td>\n        <td class=\"num\">{error_total}</td>\n        <td class=\"num\">{error_pct_total}</td>\n        <td class=\"num\">{dosing_total}</td>\n      </tr>\n    </tfoot>\n  </table>\n\n</section>\n<!-- END:BLOCK_REPEAT -->\n\n<footer>\n  <div>Indian Industrial Machines Pvt. Ltd.</div>\n  <div class=\"center\">Page {page_no} of {page_count}</div>\n  <div></div>\n</footer>\n\n</body>\n</html>\n<!--END_HTML-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761218054,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 5030,
    "prompt_tokens": 4470,
    "total_tokens": 9500,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 2816,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T08:24:33Z - template_initial_html

```json
{
  "id": "chatcmpl-CU7KerObimleK9qWjdMuf6AJcoRYw",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Batch report</title>\n<style>\n  @page {\n    size: A4;\n    margin: 12mm 14mm;\n  }\n  :root{\n    --font-main: \"Times New Roman\", Times, serif;\n    --label-w: 38mm;\n    --gap-h: 2.2mm;\n\n    --col-bin-w: 16mm;\n    --col-material-w: 88mm;\n    --col-set-w: 24mm;\n    --col-ach-w: 24mm;\n    --col-errkg-w: 24mm;\n    --col-errpct-w: 18mm;\n    --col-dur-w: 28mm;\n\n    --scale-col-w: 25mm;\n    --scale-time-w: 32mm;\n    --scale-dur-w: 22mm;\n  }\n  html, body { font-family: var(--font-main); font-size: 12px; color: #000; }\n  body { line-height: 1.2; }\n\n  /* Header */\n  #report-header { margin-bottom: 6mm; }\n  #report-header .top-grid{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  #report-header .top-grid td{ vertical-align: top; }\n  #report-header .left-kv{\n    width: 60%;\n  }\n  #report-header .right-kv{\n    width: 40%;\n  }\n  .kv{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  .kv td{\n    padding: 1mm 0;\n  }\n  .kv td.label{\n    width: var(--label-w);\n    white-space: nowrap;\n  }\n  .kv td.sep{ width: 4mm; text-align: center; }\n  .title{\n    text-align: center;\n    font-weight: bold;\n    font-size: 18px;\n    margin: 2mm 0 3mm 0;\n  }\n  .print-date{\n    margin: 2mm 0 3mm 0;\n    font-weight: bold;\n  }\n\n  /* Small scale table in batch header */\n  .scale-table{\n    width: 100%;\n    border: 1px solid #000;\n    border-collapse: collapse;\n    table-layout: fixed;\n    margin-top: 1mm;\n    font-size: 12px;\n  }\n  .scale-table th, .scale-table td{\n    border: 1px solid #000;\n    padding: 1.5mm 2mm;\n    text-align: left;\n    vertical-align: middle;\n    white-space: nowrap;\n  }\n  .scale-table th{\n    font-weight: bold;\n    text-align: left;\n  }\n  .scale-col    { width: var(--scale-col-w); }\n  .scale-time   { width: var(--scale-time-w); }\n  .scale-dur    { width: var(--scale-dur-w); text-align: right; }\n\n  /* Batch info box on the left */\n  .batch-kv{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    margin-bottom: 2mm;\n  }\n  .batch-kv td{ padding: 1.2mm 0; vertical-align: top; }\n  .batch-kv td.label{ width: var(--label-w); }\n  .batch-kv td.sep{ width: 4mm; text-align: center; }\n\n  /* Main data grid */\n  #data-table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    margin-top: 1mm;\n    font-size: 12px;\n  }\n  #data-table th, #data-table td{\n    border: 1px solid #000;\n    padding: 1.8mm 2mm;\n    vertical-align: middle;\n  }\n  #data-table th{ font-weight: bold; text-align: left; }\n  #data-table th[data-label=\"Bin No\"], #data-table td.bin{ width: var(--col-bin-w); text-align: right; }\n  #data-table th[data-label=\"Material Name\"], #data-table td.material{ width: var(--col-material-w); text-align: left; }\n  #data-table th[data-label=\"Set wt(Kg)\"], #data-table td.set{ width: var(--col-set-w); text-align: right; }\n  #data-table th[data-label=\"Ach wt(Kg)\"], #data-table td.ach{ width: var(--col-ach-w); text-align: right; }\n  #data-table th[data-label=\"Error(Kg)\"], #data-table td.errkg{ width: var(--col-errkg-w); text-align: right; }\n  #data-table th[data-label=\"Error %\"], #data-table td.errpct{ width: var(--col-errpct-w); text-align: right; }\n  #data-table th[data-label=\"Dosine Dur (sec)\"], #data-table td.dur{ width: var(--col-dur-w); text-align: right; }\n\n  #report-totals td{\n    border-top: 1px solid #000;\n    font-weight: bold;\n  }\n  #report-totals td.label{\n    text-align: right;\n  }\n\n  /* Layout helpers */\n  .row{ display: flex; gap: 8mm; }\n  .col{ flex: 1 1 0; }\n  .section{ margin-bottom: 6mm; }\n  .muted{ color: #000; }\n\n  /* Footer */\n  #page-footer{\n    position: fixed;\n    bottom: 10mm;\n    left: 14mm;\n    right: 14mm;\n    font-size: 12px;\n  }\n  #page-footer .footer-grid{\n    width: 100%;\n    table-layout: fixed;\n    border-collapse: collapse;\n  }\n  #page-footer td{ padding-top: 2mm; }\n  #page-footer td.center{ text-align: center; }\n  #page-footer td.right{ text-align: right; }\n</style>\n</head>\n<body>\n\n<section id=\"report-header\">\n  <table class=\"top-grid\">\n    <tr>\n      <td class=\"left-kv\">\n        <table class=\"kv\">\n          <tr>\n            <td class=\"label\">Plant name</td><td class=\"sep\">:</td>\n            <td>{plant_name}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Location</td><td class=\"sep\">:</td>\n            <td>{location}</td>\n          </tr>\n        </table>\n      </td>\n      <td class=\"right-kv\">\n        <table class=\"kv\">\n          <tr>\n            <td class=\"label\">Date</td><td class=\"sep\">:</td>\n            <td>{header_date}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Recipe</td><td class=\"sep\">:</td>\n            <td>{header_recipe}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Shift No</td><td class=\"sep\">:</td>\n            <td>{header_shift_no}</td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n\n  <div class=\"title\">Batch report</div>\n\n  <div class=\"print-date\">\n    Print Date  :  {print_date}\n  </div>\n</section>\n\n<!-- BEGIN:BLOCK_REPEAT batches -->\n<section class='batch-block'>\n\n  <div class=\"row section\">\n    <div class=\"col\">\n      <table class=\"batch-kv\">\n        <tr>\n          <td class=\"label\">Batch No</td><td class=\"sep\">:</td><td>{batch_no}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Batch Date</td><td class=\"sep\">:</td><td>{batch_date}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Shift No</td><td class=\"sep\">:</td><td>{batch_shift_no}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe Name</td><td class=\"sep\">:</td><td>{batch_recipe_name}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe Code</td><td class=\"sep\">:</td><td>{batch_recipe_code}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe No</td><td class=\"sep\">:</td><td>{batch_recipe_no}</td>\n        </tr>\n      </table>\n    </div>\n    <div class=\"col\">\n      <table class=\"scale-table\">\n        <colgroup>\n          <col class=\"scale-col\"><col class=\"scale-time\"><col class=\"scale-dur\">\n          <col class=\"scale-col\"><col class=\"scale-time\"><col class=\"scale-dur\">\n        </colgroup>\n        <thead>\n          <tr>\n            <th class=\"scale-col\" data-label=\"Scale\">Scale</th>\n            <th class=\"scale-time\" data-label=\"Start time\">Start time</th>\n            <th class=\"scale-dur\" data-label=\"Dur(sec)\">Dur(sec)</th>\n            <th class=\"scale-col\" data-label=\"Scale\">Scale</th>\n            <th class=\"scale-time\" data-label=\"Start time\">Start time</th>\n            <th class=\"scale-dur\" data-label=\"Dur(sec)\">Dur(sec)</th>\n          </tr>\n        </thead>\n        <tbody>\n          <tr>\n            <td>{main1_scale}</td>\n            <td>{main1_start_time}</td>\n            <td style=\"text-align:right\">{main1_dur}</td>\n            <td></td><td></td><td></td>\n          </tr>\n          <tr>\n            <td></td><td></td><td></td>\n            <td>{main2_scale}</td>\n            <td>{main2_start_time}</td>\n            <td style=\"text-align:right\">{main2_dur}</td>\n          </tr>\n        </tbody>\n      </table>\n    </div>\n  </div>\n\n  <table id=\"data-table\">\n    <colgroup>\n      <col style=\"width: var(--col-bin-w)\">\n      <col style=\"width: var(--col-material-w)\">\n      <col style=\"width: var(--col-set-w)\">\n      <col style=\"width: var(--col-ach-w)\">\n      <col style=\"width: var(--col-errkg-w)\">\n      <col style=\"width: var(--col-errpct-w)\">\n      <col style=\"width: var(--col-dur-w)\">\n    </colgroup>\n    <thead>\n      <tr>\n        <th data-label=\"Bin No\">Bin No</th>\n        <th data-label=\"Material Name\">Material Name</th>\n        <th data-label=\"Set wt(Kg)\">Set wt(Kg)</th>\n        <th data-label=\"Ach wt(Kg)\">Ach wt(Kg)</th>\n        <th data-label=\"Error(Kg)\">Error(Kg)</th>\n        <th data-label=\"Error %\">Error %</th>\n        <th data-label=\"Dosine Dur (sec)\">Dosine Dur (sec)</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <td class=\"bin\">{bin_no}</td>\n        <td class=\"material\">{material_name}</td>\n        <td class=\"set\">{set_wt}</td>\n        <td class=\"ach\">{ach_wt}</td>\n        <td class=\"errkg\">{error_kg}</td>\n        <td class=\"errpct\">{error_pct}</td>\n        <td class=\"dur\">{dosing_dur_sec}</td>\n      </tr>\n    </tbody>\n    <tfoot id=\"report-totals\">\n      <tr>\n        <td colspan=\"2\" class=\"label\">Total :</td>\n        <td class=\"set\">{total_set_wt}</td>\n        <td class=\"ach\">{total_ach_wt}</td>\n        <td class=\"errkg\">{total_error_kg}</td>\n        <td class=\"errpct\">{total_error_pct}</td>\n        <td class=\"dur\">{total_dosing_dur}</td>\n      </tr>\n    </tfoot>\n  </table>\n\n</section>\n<!-- END:BLOCK_REPEAT -->\n\n<section id=\"page-footer\">\n  <table class=\"footer-grid\">\n    <tr>\n      <td>Indian Industrial Machines Pvt. Ltd.</td>\n      <td class=\"center\">Page {page_no} of {page_count}</td>\n      <td class=\"right\"></td>\n    </tr>\n  </table>\n</section>\n\n</body>\n</html>\n<!--END_HTML-->\n\n<!--BEGIN_SCHEMA_JSON-->\n{\n  \"scalars\": [\n    \"plant_name\",\n    \"location\",\n    \"header_date\",\n    \"header_recipe\",\n    \"header_shift_no\",\n    \"print_date\",\n    \"page_no\",\n    \"page_count\",\n    \"batch_no\",\n    \"batch_date\",\n    \"batch_shift_no\",\n    \"batch_recipe_name\",\n    \"batch_recipe_code\",\n    \"batch_recipe_no\",\n    \"main1_scale\",\n    \"main1_start_time\",\n    \"main1_dur\",\n    \"main2_scale\",\n    \"main2_start_time\",\n    \"main2_dur\"\n  ],\n  \"row_tokens\": [\n    \"bin_no\",\n    \"material_name\",\n    \"set_wt\",\n    \"ach_wt\",\n    \"error_kg\",\n    \"error_pct\",\n    \"dosing_dur_sec\"\n  ],\n  \"totals\": [\n    \"total_set_wt\",\n    \"total_ach_wt\",\n    \"total_error_kg\",\n    \"total_error_pct\",\n    \"total_dosing_dur\"\n  ],\n  \"notes\": \"\"\n}\n<!--END_SCHEMA_JSON-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761294060,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6404,
    "prompt_tokens": 1544,
    "total_tokens": 7948,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 3392,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T08:27:17Z - template_fix_html_call2

```json
{
  "id": "chatcmpl-CU7OIwChOtw6O7f1omZrbn81pni2F",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n<title>Batch report</title>\n<style>\n  @page { size: A4; margin: 12mm 14mm; }\n\n  :root{\n    --font-main: \"Times New Roman\", Times, serif;\n\n    --label-w: 36mm;\n    --kv-sep-w: 4mm;\n\n    /* Main grid column widths (must sum to page width) */\n    --col-bin-w: 12mm;\n    --col-material-w: 72mm;\n    --col-set-w: 20mm;\n    --col-ach-w: 20mm;\n    --col-errkg-w: 20mm;\n    --col-errpct-w: 14mm;\n    --col-dur-w: 24mm;\n\n    /* Scale small table (right block) */\n    --scale-col-w: 15mm;\n    --scale-time-w: 22mm;\n    --scale-dur-w: 12mm;\n\n    --rule: 0.2mm;            /* hairline rules like reference */\n    --pad-v: 1.4mm;\n    --pad-h: 2mm;\n  }\n\n  html, body { font-family: var(--font-main); font-size: 12px; color: #000; }\n  body { line-height: 1.2; font-variant-numeric: tabular-nums; }\n\n  /* Header */\n  #report-header { margin-bottom: 5.5mm; }\n  #report-header .top-grid{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  #report-header .top-grid td{ vertical-align: top; }\n  #report-header .left-kv{ width: 45%; }\n  #report-header .right-kv{ width: 55%; }\n  .kv{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  .kv td{ padding: 1.1mm 0; }\n  .kv td.label{ width: var(--label-w); white-space: nowrap; }\n  .kv td.sep{ width: var(--kv-sep-w); text-align: center; }\n\n  .title{\n    text-align: center;\n    font-weight: bold;\n    font-size: 20px;\n    margin: 2mm 0 3mm 0;\n  }\n  .print-date{\n    margin: 0 0 1.5mm 0;\n    font-weight: bold;\n  }\n\n  /* Batch info + scale table row */\n  .row{ display: flex; gap: 6mm; }\n  .col{ flex: 1 1 0; }\n  .section{ margin-bottom: 4.5mm; }\n\n  .batch-kv{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    margin-bottom: 1mm;\n  }\n  .batch-kv td{ padding: 1mm 0; vertical-align: top; }\n  .batch-kv td.label{ width: var(--label-w); }\n  .batch-kv td.sep{ width: var(--kv-sep-w); text-align: center; }\n\n  .scale-table{\n    width: 100%;\n    border: var(--rule) solid #000;\n    border-collapse: collapse;\n    table-layout: fixed;\n    margin-top: 0.2mm;\n    font-size: 12px;\n  }\n  .scale-table th, .scale-table td{\n    border: var(--rule) solid #000;\n    padding: var(--pad-v) var(--pad-h);\n    text-align: left;\n    vertical-align: middle;\n    white-space: nowrap;\n  }\n  .scale-table th{ font-weight: bold; }\n  .scale-col  { width: var(--scale-col-w); }\n  .scale-time { width: var(--scale-time-w); }\n  .scale-dur  { width: var(--scale-dur-w); text-align: right; }\n\n  /* Main data grid */\n  #data-table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    margin-top: 1mm;\n    font-size: 12px;\n  }\n  #data-table th, #data-table td{\n    border: var(--rule) solid #000;\n    padding: calc(var(--pad-v) + 0.2mm) var(--pad-h);\n    vertical-align: middle;\n  }\n  #data-table th{ font-weight: bold; text-align: left; }\n\n  /* Column alignments and widths */\n  #data-table th[data-label=\"Bin No\"], #data-table td.bin{ width: var(--col-bin-w); text-align: right; }\n  #data-table th[data-label=\"Material Name\"], #data-table td.material{ width: var(--col-material-w); text-align: left; }\n  #data-table th[data-label=\"Set wt(Kg)\"], #data-table td.set{ width: var(--col-set-w); text-align: right; }\n  #data-table th[data-label=\"Ach wt(Kg)\"], #data-table td.ach{ width: var(--col-ach-w); text-align: right; }\n  #data-table th[data-label=\"Error(Kg)\"], #data-table td.errkg{ width: var(--col-errkg-w); text-align: right; }\n  #data-table th[data-label=\"Error %\"], #data-table td.errpct{ width: var(--col-errpct-w); text-align: right; }\n  #data-table th[data-label=\"Dosine Dur (sec)\"], #data-table td.dur{ width: var(--col-dur-w); text-align: right; }\n\n  #report-totals td{\n    border-top: var(--rule) solid #000;\n    font-weight: bold;\n  }\n  #report-totals td.label{ text-align: right; }\n\n  /* Pagination stability */\n  .batch-block{ break-inside: avoid; page-break-inside: avoid; margin-bottom: 6mm; }\n\n  /* Footer */\n  #page-footer{\n    position: fixed;\n    bottom: 10mm;\n    left: 14mm;\n    right: 14mm;\n    font-size: 12px;\n  }\n  #page-footer .footer-grid{\n    width: 100%;\n    table-layout: fixed;\n    border-collapse: collapse;\n  }\n  #page-footer td{ padding-top: 2mm; }\n  #page-footer td.center{ text-align: center; }\n  #page-footer td.right{ text-align: right; }\n</style>\n</head>\n<body>\n\n<section id=\"report-header\">\n  <table class=\"top-grid\">\n    <tr>\n      <td class=\"left-kv\">\n        <table class=\"kv\">\n          <tr>\n            <td class=\"label\">Plant name</td><td class=\"sep\">:</td>\n            <td>{plant_name}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Location</td><td class=\"sep\">:</td>\n            <td>{location}</td>\n          </tr>\n        </table>\n      </td>\n      <td class=\"right-kv\">\n        <table class=\"kv\">\n          <tr>\n            <td class=\"label\">Date</td><td class=\"sep\">:</td>\n            <td>{header_date}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Recipe</td><td class=\"sep\">:</td>\n            <td>{header_recipe}</td>\n          </tr>\n          <tr>\n            <td class=\"label\">Shift No</td><td class=\"sep\">:</td>\n            <td>{header_shift_no}</td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n\n  <div class=\"title\">Batch report</div>\n\n  <div class=\"print-date\">Print Date  :  {print_date}</div>\n</section>\n\n<!-- BEGIN:BLOCK_REPEAT batches -->\n<section class=\"batch-block\">\n\n  <div class=\"row section\">\n    <div class=\"col\">\n      <table class=\"batch-kv\">\n        <tr>\n          <td class=\"label\">Batch No</td><td class=\"sep\">:</td><td>{batch_no}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Batch Date</td><td class=\"sep\">:</td><td>{batch_date}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Shift No</td><td class=\"sep\">:</td><td>{batch_shift_no}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe Name</td><td class=\"sep\">:</td><td>{batch_recipe_name}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe Code</td><td class=\"sep\">:</td><td>{batch_recipe_code}</td>\n        </tr>\n        <tr>\n          <td class=\"label\">Recipe No</td><td class=\"sep\">:</td><td>{batch_recipe_no}</td>\n        </tr>\n      </table>\n    </div>\n    <div class=\"col\">\n      <table class=\"scale-table\">\n        <colgroup>\n          <col class=\"scale-col\" /><col class=\"scale-time\" /><col class=\"scale-dur\" />\n          <col class=\"scale-col\" /><col class=\"scale-time\" /><col class=\"scale-dur\" />\n        </colgroup>\n        <thead>\n          <tr>\n            <th class=\"scale-col\" data-label=\"Scale\">Scale</th>\n            <th class=\"scale-time\" data-label=\"Start time\">Start time</th>\n            <th class=\"scale-dur\" data-label=\"Dur(sec)\">Dur(sec)</th>\n            <th class=\"scale-col\" data-label=\"Scale\">Scale</th>\n            <th class=\"scale-time\" data-label=\"Start time\">Start time</th>\n            <th class=\"scale-dur\" data-label=\"Dur(sec)\">Dur(sec)</th>\n          </tr>\n        </thead>\n        <tbody>\n          <tr>\n            <td>{main1_scale}</td>\n            <td>{main1_start_time}</td>\n            <td style=\"text-align:right\">{main1_dur}</td>\n            <td></td><td></td><td></td>\n          </tr>\n          <tr>\n            <td></td><td></td><td></td>\n            <td>{main2_scale}</td>\n            <td>{main2_start_time}</td>\n            <td style=\"text-align:right\">{main2_dur}</td>\n          </tr>\n        </tbody>\n      </table>\n    </div>\n  </div>\n\n  <table id=\"data-table\">\n    <colgroup>\n      <col style=\"width: var(--col-bin-w)\" />\n      <col style=\"width: var(--col-material-w)\" />\n      <col style=\"width: var(--col-set-w)\" />\n      <col style=\"width: var(--col-ach-w)\" />\n      <col style=\"width: var(--col-errkg-w)\" />\n      <col style=\"width: var(--col-errpct-w)\" />\n      <col style=\"width: var(--col-dur-w)\" />\n    </colgroup>\n    <thead>\n      <tr>\n        <th data-label=\"Bin No\">Bin No</th>\n        <th data-label=\"Material Name\">Material Name</th>\n        <th data-label=\"Set wt(Kg)\">Set wt(Kg)</th>\n        <th data-label=\"Ach wt(Kg)\">Ach wt(Kg)</th>\n        <th data-label=\"Error(Kg)\">Error(Kg)</th>\n        <th data-label=\"Error %\">Error %</th>\n        <th data-label=\"Dosine Dur (sec)\">Dosine Dur (sec)</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr>\n        <td class=\"bin\">{bin_no}</td>\n        <td class=\"material\">{material_name}</td>\n        <td class=\"set\">{set_wt}</td>\n        <td class=\"ach\">{ach_wt}</td>\n        <td class=\"errkg\">{error_kg}</td>\n        <td class=\"errpct\">{error_pct}</td>\n        <td class=\"dur\">{dosing_dur_sec}</td>\n      </tr>\n    </tbody>\n    <tfoot id=\"report-totals\">\n      <tr>\n        <td colspan=\"2\" class=\"label\">Total :</td>\n        <td class=\"set\">{total_set_wt}</td>\n        <td class=\"ach\">{total_ach_wt}</td>\n        <td class=\"errkg\">{total_error_kg}</td>\n        <td class=\"errpct\">{total_error_pct}</td>\n        <td class=\"dur\">{total_dosing_dur}</td>\n      </tr>\n    </tfoot>\n  </table>\n\n</section>\n<!-- END:BLOCK_REPEAT -->\n\n<section id=\"page-footer\">\n  <table class=\"footer-grid\">\n    <tr>\n      <td>Indian Industrial Machines Pvt. Ltd.</td>\n      <td class=\"center\">Page {page_no} of {page_count}</td>\n      <td class=\"right\"></td>\n    </tr>\n  </table>\n</section>\n\n</body>\n</html>\n<!--END_HTML-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761294286,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 5886,
    "prompt_tokens": 5165,
    "total_tokens": 11051,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 3008,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T08:30:44Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CU7S34J4vFtPWlutUcVuv4SJgTk0M",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"header_date\": \"To Be Selected...\",\n    \"header_recipe\": \"params.header_recipe\",\n    \"header_shift_no\": \"params.header_shift_no\",\n    \"print_date\": \"To Be Selected...\",\n    \"batch_no\": \"UNRESOLVED\",\n    \"batch_date\": \"UNRESOLVED\",\n    \"batch_shift_no\": \"UNRESOLVED\",\n    \"batch_recipe_name\": \"recipes.recipe_name\",\n    \"batch_recipe_code\": \"UNRESOLVED\",\n    \"batch_recipe_no\": \"UNRESOLVED\",\n    \"main1_scale\": \"UNRESOLVED\",\n    \"main1_start_time\": \"UNRESOLVED\",\n    \"main1_dur\": \"UNRESOLVED\",\n    \"main2_scale\": \"UNRESOLVED\",\n    \"main2_start_time\": \"UNRESOLVED\",\n    \"main2_dur\": \"UNRESOLVED\",\n    \"bin_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt\": \"UNRESOLVED\",\n    \"ach_wt\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_pct\": \"UNRESOLVED\",\n    \"dosing_dur_sec\": \"UNRESOLVED\",\n    \"total_set_wt\": \"(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"((recipes.bin1_act - recipes.bin1_sp) + (recipes.bin2_act - recipes.bin2_sp) + (recipes.bin3_act - recipes.bin3_sp) + (recipes.bin4_act - recipes.bin4_sp) + (recipes.bin5_act - recipes.bin5_sp) + (recipes.bin6_act - recipes.bin6_sp) + (recipes.bin7_act - recipes.bin7_sp) + (recipes.bin8_act - recipes.bin8_sp) + (recipes.bin9_act - recipes.bin9_sp) + (recipes.bin10_act - recipes.bin10_sp) + (recipes.bin11_act - recipes.bin11_sp) + (recipes.bin12_act - recipes.bin12_sp))\",\n    \"total_error_pct\": \"(((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) * 100\",\n    \"total_dosing_dur\": \"UNRESOLVED\",\n    \"page_no\": \"To Be Selected...\",\n    \"page_count\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"header_date\": \"24/03/2024\",\n    \"header_recipe\": \"GANGADHAR-2024\",\n    \"header_shift_no\": \"1\",\n    \"print_date\": \"25/03/2024\",\n    \"batch_no\": \"032024-1650\",\n    \"batch_date\": \"24/03/2024\",\n    \"batch_shift_no\": \"1\",\n    \"batch_recipe_name\": \"GANGADHAR-24\",\n    \"batch_recipe_code\": \"GANGADHAR-2024\",\n    \"batch_recipe_no\": \"1\",\n    \"main1_scale\": \"Main1\",\n    \"main1_start_time\": \"6:49:16\",\n    \"main1_dur\": \"441\",\n    \"main2_scale\": \"Main2\",\n    \"main2_start_time\": \"6:49:19\",\n    \"main2_dur\": \"602\",\n    \"bin_no\": \"7\",\n    \"material_name\": \"DORB (COM) KRR\",\n    \"set_wt\": \"200.00\",\n    \"ach_wt\": \"202.10\",\n    \"error_kg\": \"2.10\",\n    \"error_pct\": \"1.05\",\n    \"dosing_dur_sec\": \"35\",\n    \"total_set_wt\": \"1,000.00\",\n    \"total_ach_wt\": \"999.30\",\n    \"total_error_kg\": \"-0.70\",\n    \"total_error_pct\": \"-0.07\",\n    \"total_dosing_dur\": \"975\",\n    \"page_no\": \"1\",\n    \"page_count\": \"29\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"batch_no\",\n      \"batch_date\",\n      \"batch_shift_no\",\n      \"batch_recipe_code\",\n      \"batch_recipe_no\",\n      \"main1_scale\",\n      \"main1_start_time\",\n      \"main1_dur\",\n      \"main2_scale\",\n      \"main2_start_time\",\n      \"main2_dur\",\n      \"bin_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_pct\",\n      \"dosing_dur_sec\",\n      \"total_dosing_dur\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761294519,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 8272,
    "prompt_tokens": 5025,
    "total_tokens": 13297,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 6720,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T08:33:31Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CU7U7fakJAEbkuIphKObsbaq4GAE9",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"header_date\": \"To Be Selected...\",\n    \"header_recipe\": \"recipes.recipe_name\",\n    \"header_shift_no\": \"To Be Selected...\",\n    \"print_date\": \"To Be Selected...\",\n    \"batch_no\": \"UNRESOLVED\",\n    \"batch_date\": \"UNRESOLVED\",\n    \"batch_shift_no\": \"UNRESOLVED\",\n    \"batch_recipe_name\": \"recipes.recipe_name\",\n    \"batch_recipe_code\": \"UNRESOLVED\",\n    \"batch_recipe_no\": \"UNRESOLVED\",\n    \"main1_scale\": \"UNRESOLVED\",\n    \"main1_start_time\": \"UNRESOLVED\",\n    \"main1_dur\": \"UNRESOLVED\",\n    \"main2_scale\": \"UNRESOLVED\",\n    \"main2_start_time\": \"UNRESOLVED\",\n    \"main2_dur\": \"UNRESOLVED\",\n    \"bin_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt\": \"UNRESOLVED\",\n    \"ach_wt\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_pct\": \"UNRESOLVED\",\n    \"dosing_dur_sec\": \"UNRESOLVED\",\n    \"total_set_wt\": \"COALESCE(recipes.bin1_sp,0) + COALESCE(recipes.bin2_sp,0) + COALESCE(recipes.bin3_sp,0) + COALESCE(recipes.bin4_sp,0) + COALESCE(recipes.bin5_sp,0) + COALESCE(recipes.bin6_sp,0) + COALESCE(recipes.bin7_sp,0) + COALESCE(recipes.bin8_sp,0) + COALESCE(recipes.bin9_sp,0) + COALESCE(recipes.bin10_sp,0) + COALESCE(recipes.bin11_sp,0) + COALESCE(recipes.bin12_sp,0)\",\n    \"total_ach_wt\": \"COALESCE(recipes.bin1_act,0) + COALESCE(recipes.bin2_act,0) + COALESCE(recipes.bin3_act,0) + COALESCE(recipes.bin4_act,0) + COALESCE(recipes.bin5_act,0) + COALESCE(recipes.bin6_act,0) + COALESCE(recipes.bin7_act,0) + COALESCE(recipes.bin8_act,0) + COALESCE(recipes.bin9_act,0) + COALESCE(recipes.bin10_act,0) + COALESCE(recipes.bin11_act,0) + COALESCE(recipes.bin12_act,0)\",\n    \"total_error_kg\": \"(COALESCE(recipes.bin1_act,0) + COALESCE(recipes.bin2_act,0) + COALESCE(recipes.bin3_act,0) + COALESCE(recipes.bin4_act,0) + COALESCE(recipes.bin5_act,0) + COALESCE(recipes.bin6_act,0) + COALESCE(recipes.bin7_act,0) + COALESCE(recipes.bin8_act,0) + COALESCE(recipes.bin9_act,0) + COALESCE(recipes.bin10_act,0) + COALESCE(recipes.bin11_act,0) + COALESCE(recipes.bin12_act,0)) - (COALESCE(recipes.bin1_sp,0) + COALESCE(recipes.bin2_sp,0) + COALESCE(recipes.bin3_sp,0) + COALESCE(recipes.bin4_sp,0) + COALESCE(recipes.bin5_sp,0) + COALESCE(recipes.bin6_sp,0) + COALESCE(recipes.bin7_sp,0) + COALESCE(recipes.bin8_sp,0) + COALESCE(recipes.bin9_sp,0) + COALESCE(recipes.bin10_sp,0) + COALESCE(recipes.bin11_sp,0) + COALESCE(recipes.bin12_sp,0))\",\n    \"total_error_pct\": \"CASE WHEN (COALESCE(recipes.bin1_sp,0) + COALESCE(recipes.bin2_sp,0) + COALESCE(recipes.bin3_sp,0) + COALESCE(recipes.bin4_sp,0) + COALESCE(recipes.bin5_sp,0) + COALESCE(recipes.bin6_sp,0) + COALESCE(recipes.bin7_sp,0) + COALESCE(recipes.bin8_sp,0) + COALESCE(recipes.bin9_sp,0) + COALESCE(recipes.bin10_sp,0) + COALESCE(recipes.bin11_sp,0) + COALESCE(recipes.bin12_sp,0)) = 0 THEN NULL ELSE (((COALESCE(recipes.bin1_act,0) + COALESCE(recipes.bin2_act,0) + COALESCE(recipes.bin3_act,0) + COALESCE(recipes.bin4_act,0) + COALESCE(recipes.bin5_act,0) + COALESCE(recipes.bin6_act,0) + COALESCE(recipes.bin7_act,0) + COALESCE(recipes.bin8_act,0) + COALESCE(recipes.bin9_act,0) + COALESCE(recipes.bin10_act,0) + COALESCE(recipes.bin11_act,0) + COALESCE(recipes.bin12_act,0)) - (COALESCE(recipes.bin1_sp,0) + COALESCE(recipes.bin2_sp,0) + COALESCE(recipes.bin3_sp,0) + COALESCE(recipes.bin4_sp,0) + COALESCE(recipes.bin5_sp,0) + COALESCE(recipes.bin6_sp,0) + COALESCE(recipes.bin7_sp,0) + COALESCE(recipes.bin8_sp,0) + COALESCE(recipes.bin9_sp,0) + COALESCE(recipes.bin10_sp,0) + COALESCE(recipes.bin11_sp,0) + COALESCE(recipes.bin12_sp,0))) * 100.0) / (COALESCE(recipes.bin1_sp,0) + COALESCE(recipes.bin2_sp,0) + COALESCE(recipes.bin3_sp,0) + COALESCE(recipes.bin4_sp,0) + COALESCE(recipes.bin5_sp,0) + COALESCE(recipes.bin6_sp,0) + COALESCE(recipes.bin7_sp,0) + COALESCE(recipes.bin8_sp,0) + COALESCE(recipes.bin9_sp,0) + COALESCE(recipes.bin10_sp,0) + COALESCE(recipes.bin11_sp,0) + COALESCE(recipes.bin12_sp,0)) END\",\n    \"total_dosing_dur\": \"UNRESOLVED\",\n    \"page_no\": \"To Be Selected...\",\n    \"page_count\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"header_date\": \"24/03/2024\",\n    \"header_recipe\": \"GANGADHAR-2024\",\n    \"header_shift_no\": \"1\",\n    \"print_date\": \"25/03/2024\",\n    \"batch_no\": \"032024-1650\",\n    \"batch_date\": \"24/03/2024\",\n    \"batch_shift_no\": \"1\",\n    \"batch_recipe_name\": \"GANGADHAR-24\",\n    \"batch_recipe_code\": \"GANGADHAR-2024\",\n    \"batch_recipe_no\": \"1\",\n    \"main1_scale\": \"Main1\",\n    \"main1_start_time\": \"6:49:16\",\n    \"main1_dur\": \"441\",\n    \"main2_scale\": \"Main2\",\n    \"main2_start_time\": \"6:49:19\",\n    \"main2_dur\": \"602\",\n    \"bin_no\": \"7\",\n    \"material_name\": \"DORB (COM) KRR\",\n    \"set_wt\": \"200.00\",\n    \"ach_wt\": \"202.10\",\n    \"error_kg\": \"2.10\",\n    \"error_pct\": \"1.05\",\n    \"dosing_dur_sec\": \"35\",\n    \"total_set_wt\": \"1,000.00\",\n    \"total_ach_wt\": \"999.30\",\n    \"total_error_kg\": \"-0.70\",\n    \"total_error_pct\": \"-0.07\",\n    \"total_dosing_dur\": \"975\",\n    \"page_no\": \"1\",\n    \"page_count\": \"29\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"batch_no\",\n      \"batch_date\",\n      \"batch_shift_no\",\n      \"batch_recipe_code\",\n      \"batch_recipe_no\",\n      \"main1_scale\",\n      \"main1_start_time\",\n      \"main1_dur\",\n      \"main2_scale\",\n      \"main2_start_time\",\n      \"main2_dur\",\n      \"bin_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_pct\",\n      \"dosing_dur_sec\",\n      \"total_dosing_dur\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761294647,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 9499,
    "prompt_tokens": 5088,
    "total_tokens": 14587,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 7232,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 4992
    }
  }
}
```

## 2025-10-24T08:33:58Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CU7S3Hm2GV335GmosffbYzZDs3wpl",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"header_date\": \"To Be Selected...\",\n    \"header_recipe\": \"params.header_recipe\",\n    \"header_shift_no\": \"params.header_shift_no\",\n    \"print_date\": \"UNRESOLVED\",\n    \"batch_no\": \"UNRESOLVED\",\n    \"batch_date\": \"UNRESOLVED\",\n    \"batch_shift_no\": \"UNRESOLVED\",\n    \"batch_recipe_name\": \"recipes.recipe_name\",\n    \"batch_recipe_code\": \"UNRESOLVED\",\n    \"batch_recipe_no\": \"UNRESOLVED\",\n    \"main1_scale\": \"UNRESOLVED\",\n    \"main1_start_time\": \"UNRESOLVED\",\n    \"main1_dur\": \"UNRESOLVED\",\n    \"main2_scale\": \"UNRESOLVED\",\n    \"main2_start_time\": \"UNRESOLVED\",\n    \"main2_dur\": \"UNRESOLVED\",\n    \"bin_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt\": \"UNRESOLVED\",\n    \"ach_wt\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_pct\": \"UNRESOLVED\",\n    \"dosing_dur_sec\": \"UNRESOLVED\",\n    \"total_set_wt\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_error_pct\": \"CASE WHEN SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN NULL ELSE 100.0 * (SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\",\n    \"total_dosing_dur\": \"UNRESOLVED\",\n    \"page_no\": \"To Be Selected...\",\n    \"page_count\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"header_date\": \"24/03/2024\",\n    \"header_recipe\": \"GANGADHAR-2024\",\n    \"header_shift_no\": \"1\",\n    \"print_date\": \"25/03/2024\",\n    \"batch_no\": \"032024-1650\",\n    \"batch_date\": \"24/03/2024\",\n    \"batch_shift_no\": \"1\",\n    \"batch_recipe_name\": \"GANGADHAR-24\",\n    \"batch_recipe_code\": \"GANGADHAR-2024\",\n    \"batch_recipe_no\": \"1\",\n    \"main1_scale\": \"Main1\",\n    \"main1_start_time\": \"6:49:16\",\n    \"main1_dur\": \"441\",\n    \"main2_scale\": \"Main2\",\n    \"main2_start_time\": \"6:49:19\",\n    \"main2_dur\": \"602\",\n    \"bin_no\": \"7\",\n    \"material_name\": \"DORB (COM) KRR\",\n    \"set_wt\": \"200.00\",\n    \"ach_wt\": \"202.10\",\n    \"error_kg\": \"2.10\",\n    \"error_pct\": \"1.05\",\n    \"dosing_dur_sec\": \"35\",\n    \"total_set_wt\": \"1,000.00\",\n    \"total_ach_wt\": \"999.30\",\n    \"total_error_kg\": \"-0.70\",\n    \"total_error_pct\": \"-0.07\",\n    \"total_dosing_dur\": \"975\",\n    \"page_no\": \"1\",\n    \"page_count\": \"29\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"print_date\",\n      \"batch_no\",\n      \"batch_date\",\n      \"batch_shift_no\",\n      \"batch_recipe_code\",\n      \"batch_recipe_no\",\n      \"main1_scale\",\n      \"main1_start_time\",\n      \"main1_dur\",\n      \"main2_scale\",\n      \"main2_start_time\",\n      \"main2_dur\",\n      \"bin_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_pct\",\n      \"dosing_dur_sec\",\n      \"total_dosing_dur\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      },\n      \"total_error_kg\": {\n        \"op\": \"SUM(ACT)-SUM(SP)\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\",\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_error_pct\": {\n        \"op\": \"PCT_DELTA\",\n        \"over_act\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ],\n        \"over_sp\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761294519,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 10276,
    "prompt_tokens": 5025,
    "total_tokens": 15301,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 8256,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T08:38:33Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CU7XFT9tBQu3A6FJ5sOITvyGUAXKa",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"UNRESOLVED\",\n    \"location\": \"UNRESOLVED\",\n    \"header_date\": \"To Be Selected...\",\n    \"header_recipe\": \"UNRESOLVED\",\n    \"header_shift_no\": \"UNRESOLVED\",\n    \"print_date\": \"To Be Selected...\",\n    \"page_no\": \"To Be Selected...\",\n    \"page_count\": \"To Be Selected...\",\n    \"batch_no\": \"UNRESOLVED\",\n    \"batch_date\": \"UNRESOLVED\",\n    \"batch_shift_no\": \"UNRESOLVED\",\n    \"batch_recipe_name\": \"recipes.recipe_name\",\n    \"batch_recipe_code\": \"UNRESOLVED\",\n    \"batch_recipe_no\": \"UNRESOLVED\",\n    \"main1_scale\": \"UNRESOLVED\",\n    \"main1_start_time\": \"UNRESOLVED\",\n    \"main1_dur\": \"UNRESOLVED\",\n    \"main2_scale\": \"UNRESOLVED\",\n    \"main2_start_time\": \"UNRESOLVED\",\n    \"main2_dur\": \"UNRESOLVED\",\n    \"bin_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt\": \"UNRESOLVED\",\n    \"ach_wt\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_pct\": \"UNRESOLVED\",\n    \"dosing_dur_sec\": \"UNRESOLVED\",\n    \"total_set_wt\": \"(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp))\",\n    \"total_error_pct\": \"(((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) * 100.0) / (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_dosing_dur\": \"UNRESOLVED\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"header_date\": \"24/03/2024\",\n    \"header_recipe\": \"GANGADHAR-2024\",\n    \"header_shift_no\": \"1\",\n    \"print_date\": \"25/03/2024\",\n    \"page_no\": \"1\",\n    \"page_count\": \"29\",\n    \"batch_no\": \"032024-1650\",\n    \"batch_date\": \"24/03/2024\",\n    \"batch_shift_no\": \"1\",\n    \"batch_recipe_name\": \"GANGADHAR-24\",\n    \"batch_recipe_code\": \"GANGADHAR-2024\",\n    \"batch_recipe_no\": \"1\",\n    \"main1_scale\": \"Main1\",\n    \"main1_start_time\": \"6:49:16\",\n    \"main1_dur\": \"441\",\n    \"main2_scale\": \"Main2\",\n    \"main2_start_time\": \"6:49:19\",\n    \"main2_dur\": \"602\",\n    \"bin_no\": \"7\",\n    \"material_name\": \"DORB (COM) KRR\",\n    \"set_wt\": \"200.00\",\n    \"ach_wt\": \"202.10\",\n    \"error_kg\": \"2.10\",\n    \"error_pct\": \"1.05\",\n    \"dosing_dur_sec\": \"35\",\n    \"total_set_wt\": \"1,000.00\",\n    \"total_ach_wt\": \"999.30\",\n    \"total_error_kg\": \"-0.70\",\n    \"total_error_pct\": \"-0.07\",\n    \"total_dosing_dur\": \"975\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"plant_name\",\n      \"location\",\n      \"header_recipe\",\n      \"header_shift_no\",\n      \"batch_no\",\n      \"batch_date\",\n      \"batch_shift_no\",\n      \"batch_recipe_code\",\n      \"batch_recipe_no\",\n      \"main1_scale\",\n      \"main1_start_time\",\n      \"main1_dur\",\n      \"main2_scale\",\n      \"main2_start_time\",\n      \"main2_dur\",\n      \"bin_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_pct\",\n      \"dosing_dur_sec\",\n      \"total_dosing_dur\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761294841,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 7573,
    "prompt_tokens": 5068,
    "total_tokens": 12641,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 6016,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 4992
    }
  }
}
```

## 2025-10-24T09:57:29Z - template_initial_html

```json
{
  "id": "chatcmpl-CU8pBh0joH7G72i1AQKwMyPeftaDs",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>{report_title}</title>\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<style>\n  @page { size: A4; margin: 14mm 15mm; }\n  :root{\n    --col-sl: 14mm;\n    --col-material: 88mm;\n    --col-set: 24mm;\n    --col-ach: 24mm;\n    --col-errkg: 16mm;\n    --col-errpct: 14mm;\n    --row-gap: 2mm;\n    --cell-pad-v: 2mm;\n    --cell-pad-h: 2.5mm;\n    --rule: 1px solid #000;\n  }\n  *{ box-sizing: border-box; }\n  body{\n    font-family: \"Times New Roman\", serif;\n    font-size: 11pt;\n    color:#000;\n    margin:0;\n  }\n  /* Header box */\n  #report-header{\n    border: var(--rule);\n    padding: 6mm 6mm 5mm;\n  }\n  #header-grid{\n    width:100%;\n    border-collapse: collapse;\n  }\n  #header-grid td{\n    vertical-align: top;\n    padding: 0;\n  }\n  .kv{\n    width:100%;\n    border-collapse: collapse;\n  }\n  .kv td{\n    padding: 1mm 0;\n    white-space: nowrap;\n  }\n  .kv .k{ width: 28mm; }\n  .kv .colon{ width: 3mm; text-align:center; }\n  .kv .v{ padding-left: 1mm; }\n  /* Title */\n  .title-wrap{\n    margin-top: 2mm;\n    text-align: center;\n    font-weight: bold;\n  }\n  .title-wrap h1{\n    font-size: 18pt;\n    margin: 2mm 0 1.5mm;\n  }\n  .title-rule{\n    border-top: var(--rule);\n    border-bottom: var(--rule);\n    height:0;\n    margin: 2mm 0 2mm;\n  }\n  /* Data table */\n  #data-table{\n    width:100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    margin-top: 2mm;\n  }\n  #data-table colgroup col:nth-child(1){ width: var(--col-sl); }\n  #data-table colgroup col:nth-child(2){ width: var(--col-material); }\n  #data-table colgroup col:nth-child(3){ width: var(--col-set); }\n  #data-table colgroup col:nth-child(4){ width: var(--col-ach); }\n  #data-table colgroup col:nth-child(5){ width: var(--col-errkg); }\n  #data-table colgroup col:nth-child(6){ width: var(--col-errpct); }\n  #data-table th, #data-table td{\n    border: var(--rule);\n    padding: var(--cell-pad-v) var(--cell-pad-h);\n    line-height: 1.25;\n  }\n  #data-table thead th{\n    font-weight: bold;\n    text-align: left;\n  }\n  #data-table thead th.num,\n  #data-table td.num{\n    text-align: right;\n  }\n  #data-table td.center{ text-align: center; }\n  #data-table td.material{\n    word-wrap: break-word;\n    white-space: normal;\n  }\n  #report-totals td{\n    font-weight: bold;\n    background: #fff;\n  }\n  /* Footer */\n  footer{\n    position: fixed;\n    bottom: 10mm;\n    left: 15mm;\n    right: 15mm;\n    font-size: 10pt;\n  }\n  .foot-grid{\n    width:100%;\n    border-collapse: collapse;\n  }\n  .foot-grid td{\n    padding-top: 8mm;\n    color:#000;\n  }\n  .foot-left{ text-align: left; }\n  .foot-center{ text-align: center; }\n  .foot-right{ text-align: right; }\n</style>\n</head>\n<body>\n\n<section id=\"report-header\">\n  <table id=\"header-grid\">\n    <tr>\n      <td style=\"width:60%\">\n        <table class=\"kv\">\n          <tr>\n            <td class=\"k\">Plant name</td><td class=\"colon\">:</td>\n            <td class=\"v\">{plant_name}</td>\n          </tr>\n          <tr>\n            <td class=\"k\">Location</td><td class=\"colon\">:</td>\n            <td class=\"v\">{location}</td>\n          </tr>\n          <tr>\n            <td class=\"k\">Print Date</td><td class=\"colon\">:</td>\n            <td class=\"v\">{print_date}</td>\n          </tr>\n        </table>\n      </td>\n      <td style=\"width:40%; padding-left: 6mm;\">\n        <table class=\"kv\">\n          <tr>\n            <td class=\"k\">From Date</td><td class=\"colon\">:</td>\n            <td class=\"v\">{from_date}&nbsp;&nbsp;&nbsp;To&nbsp;{to_date}</td>\n          </tr>\n          <tr>\n            <td class=\"k\">Recipe code</td><td class=\"colon\">:</td>\n            <td class=\"v\">{recipe_code}</td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n\n  <div class=\"title-wrap\">\n    <div class=\"title-rule\"></div>\n    <h1>{report_title}</h1>\n    <div class=\"title-rule\"></div>\n  </div>\n</section>\n\n<table id=\"data-table\" aria-label=\"Consumption data table\">\n  <colgroup>\n    <col><col><col><col><col><col>\n  </colgroup>\n  <thead>\n    <tr>\n      <th data-label=\"sl_no\">Sl. No.</th>\n      <th data-label=\"material_name\">Material name</th>\n      <th class=\"num\" data-label=\"set_wt_kg\">Set. wt(Kg)</th>\n      <th class=\"num\" data-label=\"ach_wt_kg\">Ach. wt(Kg)</th>\n      <th class=\"num\" data-label=\"error_kg\">Error(Kg)</th>\n      <th class=\"num\" data-label=\"error_percent\">Error %</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td class=\"center\">{sl_no}</td>\n      <td class=\"material\">{material_name}</td>\n      <td class=\"num\">{set_wt_kg}</td>\n      <td class=\"num\">{ach_wt_kg}</td>\n      <td class=\"num\">{error_kg}</td>\n      <td class=\"num\">{error_percent}</td>\n    </tr>\n  </tbody>\n  <tfoot id=\"report-totals\">\n    <tr>\n      <td colspan=\"2\">Total</td>\n      <td class=\"num\">{total_set_wt}</td>\n      <td class=\"num\">{total_ach_wt}</td>\n      <td class=\"num\">{total_error_kg}</td>\n      <td class=\"num\">{total_error_percent}</td>\n    </tr>\n  </tfoot>\n</table>\n\n<footer>\n  <table class=\"foot-grid\">\n    <tr>\n      <td class=\"foot-left\">{company_name}</td>\n      <td class=\"foot-center\">Page {page_no}</td>\n      <td class=\"foot-right\"></td>\n    </tr>\n  </table>\n</footer>\n\n</body>\n</html>\n<!--END_HTML-->\n\n<!--BEGIN_SCHEMA_JSON-->\n{\n  \"scalars\": [\n    \"report_title\",\n    \"plant_name\",\n    \"location\",\n    \"print_date\",\n    \"from_date\",\n    \"to_date\",\n    \"recipe_code\",\n    \"company_name\",\n    \"page_no\"\n  ],\n  \"row_tokens\": [\n    \"sl_no\",\n    \"material_name\",\n    \"set_wt_kg\",\n    \"ach_wt_kg\",\n    \"error_kg\",\n    \"error_percent\"\n  ],\n  \"totals\": [\n    \"total_set_wt\",\n    \"total_ach_wt\",\n    \"total_error_kg\",\n    \"total_error_percent\"\n  ],\n  \"notes\": \"\"\n}\n<!--END_SCHEMA_JSON-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761299797,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 3939,
    "prompt_tokens": 1544,
    "total_tokens": 5483,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 2112,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T10:01:41Z - template_fix_html_call2

```json
{
  "id": "chatcmpl-CU8rsBJLVExtIwQZYNKyJiXV0EHxi",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n<title>{report_title}</title>\n<meta />\n<style>\n  @page { size: A4; margin: 14mm 15mm; }\n  :root{\n    /* Column geometry tuned to match reference */\n    --col-sl: 12mm;\n    --col-material: 96mm;\n    --col-set: 27mm;\n    --col-ach: 27mm;\n    --col-errkg: 10mm;\n    --col-errpct: 8mm;\n\n    --row-gap: 2mm;\n    --cell-pad-v: 1.9mm;\n    --cell-pad-h: 2.4mm;\n    --rule: 1px solid #000;\n  }\n  *{ box-sizing: border-box; }\n  html, body{ height: 100%; }\n  body{\n    font-family: \"Times New Roman\", serif;\n    font-size: 11pt;\n    color:#000;\n    margin:0;\n  }\n\n  /* Header box */\n  #report-header{\n    border: var(--rule);\n    padding: 6mm 6mm 5mm;\n    break-inside: avoid;\n    page-break-inside: avoid;\n  }\n  #header-grid{\n    width:100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  #header-grid td{\n    vertical-align: top;\n    padding: 0;\n  }\n  .kv{\n    width:100%;\n    border-collapse: collapse;\n  }\n  .kv td{\n    padding: 0.8mm 0;\n    white-space: nowrap;\n  }\n  .kv .k{ width: 30mm; }\n  .kv .colon{ width: 3mm; text-align:center; }\n  .kv .v{ padding-left: 1mm; }\n\n  /* Title */\n  .title-wrap{\n    margin-top: 2mm;\n    text-align: center;\n    font-weight: bold;\n  }\n  .title-wrap h1{\n    font-size: 18pt;\n    margin: 1.6mm 0;\n  }\n  .title-rule{\n    height:0;\n    margin: 1.6mm 0;\n    border: none;\n  }\n  .title-wrap .title-rule:first-child{ border-top: var(--rule); }\n  .title-wrap .title-rule:last-child{ border-bottom: var(--rule); }\n\n  /* Data table */\n  #data-table{\n    width:100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    margin-top: 1.8mm;\n    break-inside: avoid;\n    page-break-inside: avoid;\n  }\n  #data-table colgroup col:nth-child(1){ width: var(--col-sl); }\n  #data-table colgroup col:nth-child(2){ width: var(--col-material); }\n  #data-table colgroup col:nth-child(3){ width: var(--col-set); }\n  #data-table colgroup col:nth-child(4){ width: var(--col-ach); }\n  #data-table colgroup col:nth-child(5){ width: var(--col-errkg); }\n  #data-table colgroup col:nth-child(6){ width: var(--col-errpct); }\n\n  #data-table th, #data-table td{\n    border: var(--rule);\n    padding: var(--cell-pad-v) var(--cell-pad-h);\n    line-height: 1.25;\n    vertical-align: middle;\n  }\n  #data-table thead th{\n    font-weight: bold;\n    text-align: left;\n    white-space: normal;\n  }\n  #data-table thead th.num,\n  #data-table td.num{\n    text-align: right;\n    font-variant-numeric: tabular-nums;\n    -webkit-font-feature-settings: \"tnum\";\n            font-feature-settings: \"tnum\";\n  }\n  #data-table td.center{ text-align: center; }\n  #data-table td.material{\n    word-wrap: break-word;\n    white-space: normal;\n  }\n  #report-totals td{\n    font-weight: bold;\n    background: #fff;\n  }\n\n  /* Footer */\n  footer{\n    position: fixed;\n    bottom: 12mm;\n    left: 15mm;\n    right: 15mm;\n    font-size: 10pt;\n  }\n  .foot-grid{\n    width:100%;\n    border-collapse: collapse;\n  }\n  .foot-grid td{\n    padding-top: 0;\n    color:#000;\n  }\n  .foot-left{ text-align: left; }\n  .foot-center{ text-align: center; }\n  .foot-right{ text-align: right; }\n</style>\n</head>\n<body>\n\n<section id=\"report-header\">\n  <table id=\"header-grid\">\n    <tr>\n      <td style=\"width:60%\">\n        <table class=\"kv\">\n          <tr>\n            <td class=\"k\">Plant name</td><td class=\"colon\">:</td>\n            <td class=\"v\">{plant_name}</td>\n          </tr>\n          <tr>\n            <td class=\"k\">Location</td><td class=\"colon\">:</td>\n            <td class=\"v\">{location}</td>\n          </tr>\n          <tr>\n            <td class=\"k\">Print Date</td><td class=\"colon\">:</td>\n            <td class=\"v\">{print_date}</td>\n          </tr>\n        </table>\n      </td>\n      <td style=\"width:40%; padding-left: 6mm;\">\n        <table class=\"kv\">\n          <tr>\n            <td class=\"k\">From Date</td><td class=\"colon\">:</td>\n            <td class=\"v\">{from_date}   To {to_date}</td>\n          </tr>\n          <tr>\n            <td class=\"k\">Recipe code</td><td class=\"colon\">:</td>\n            <td class=\"v\">{recipe_code}</td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n\n  <div class=\"title-wrap\">\n    <div class=\"title-rule\"></div>\n    <h1>{report_title}</h1>\n    <div class=\"title-rule\"></div>\n  </div>\n</section>\n\n<table id=\"data-table\">\n  <colgroup>\n    <col /><col /><col /><col /><col /><col />\n  </colgroup>\n  <thead>\n    <tr>\n      <th data-label=\"sl_no\">Sl. No.</th>\n      <th data-label=\"material_name\">Material name</th>\n      <th class=\"num\" data-label=\"set_wt_kg\">Set. wt(Kg)</th>\n      <th class=\"num\" data-label=\"ach_wt_kg\">Ach. wt(Kg)</th>\n      <th class=\"num\" data-label=\"error_kg\">Error(Kg)</th>\n      <th class=\"num\" data-label=\"error_percent\">Error %</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td class=\"center\">{sl_no}</td>\n      <td class=\"material\">{material_name}</td>\n      <td class=\"num\">{set_wt_kg}</td>\n      <td class=\"num\">{ach_wt_kg}</td>\n      <td class=\"num\">{error_kg}</td>\n      <td class=\"num\">{error_percent}</td>\n    </tr>\n  </tbody>\n  <tfoot id=\"report-totals\">\n    <tr>\n      <td colspan=\"2\">Total</td>\n      <td class=\"num\">{total_set_wt}</td>\n      <td class=\"num\">{total_ach_wt}</td>\n      <td class=\"num\">{total_error_kg}</td>\n      <td class=\"num\">{total_error_percent}</td>\n    </tr>\n  </tfoot>\n</table>\n\n<footer>\n  <table class=\"foot-grid\">\n    <tr>\n      <td class=\"foot-left\">{company_name}</td>\n      <td class=\"foot-center\">Page {page_no}</td>\n      <td class=\"foot-right\"></td>\n    </tr>\n  </table>\n</footer>\n\n</body>\n</html>\n<!--END_HTML-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761299964,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6893,
    "prompt_tokens": 3942,
    "total_tokens": 10835,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5120,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 3840
    }
  }
}
```

## 2025-10-24T10:04:12Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CU8uTzFmc2HVEyB3maKd9KJyG1ME0",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt_kg\": \"UNRESOLVED\",\n    \"ach_wt_kg\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_percent\": \"UNRESOLVED\",\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"print_date\": \"params.print_date\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"recipe_code\": \"params.recipe_code\",\n    \"total_set_wt\": \"(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp))\",\n    \"total_error_percent\": \"(((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) * 100)\",\n    \"page_no\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"report_title\": \"Consumption report\",\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt_kg\": \"11,800.00\",\n    \"ach_wt_kg\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_percent\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_percent\": \"0.0200\",\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_no\": \"1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt_kg\",\n      \"ach_wt_kg\",\n      \"error_kg\",\n      \"error_percent\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761300125,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 5177,
    "prompt_tokens": 3907,
    "total_tokens": 9084,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 4032,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T10:05:33Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CU8vjDryM5DGtTJeiSU2rFotBZZ3s",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"print_date\": \"UNRESOLVED\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"recipe_code\": \"recipes.recipe_name\",\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt_kg\": \"UNRESOLVED\",\n    \"ach_wt_kg\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_percent\": \"UNRESOLVED\",\n    \"total_set_wt\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"SUM((recipes.bin1_act - recipes.bin1_sp) + (recipes.bin2_act - recipes.bin2_sp) + (recipes.bin3_act - recipes.bin3_sp) + (recipes.bin4_act - recipes.bin4_sp) + (recipes.bin5_act - recipes.bin5_sp) + (recipes.bin6_act - recipes.bin6_sp) + (recipes.bin7_act - recipes.bin7_sp) + (recipes.bin8_act - recipes.bin8_sp) + (recipes.bin9_act - recipes.bin9_sp) + (recipes.bin10_act - recipes.bin10_sp) + (recipes.bin11_act - recipes.bin11_sp) + (recipes.bin12_act - recipes.bin12_sp))\",\n    \"total_error_percent\": \"UNRESOLVED\",\n    \"page_no\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"report_title\": \"Consumption report\",\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt_kg\": \"11,800.00\",\n    \"ach_wt_kg\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_percent\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_percent\": \"0.0200\",\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_no\": \"1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"print_date\",\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt_kg\",\n      \"ach_wt_kg\",\n      \"error_kg\",\n      \"error_percent\",\n      \"total_error_percent\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761300203,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 5478,
    "prompt_tokens": 3907,
    "total_tokens": 9385,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 4480,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 3840
    }
  }
}
```

## 2025-10-24T11:13:40Z - template_initial_html

```json
{
  "id": "chatcmpl-CUA0KqgDlRY8Spv7n4s6wy7wDgNCi",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>{report_title}</title>\n<style>\n  @page { size: A4; margin: 14mm 14mm 16mm 14mm; }\n  :root{\n    --font-body: \"Times New Roman\", serif;\n    --fs-base: 12px;\n    --fs-small: 11px;\n    --fs-title: 22px;\n    --row-gap: 2mm;\n\n    --col-sl: 14mm;\n    --col-material: 84mm;\n    --col-set: 28mm;\n    --col-ach: 28mm;\n    --col-errkg: 22mm;\n    --col-errpct: 18mm;\n  }\n  html, body { font-family: var(--font-body); font-size: var(--fs-base); color: #000; }\n  body { margin: 0; }\n\n  /* Header panel */\n  #report-header{\n    border: 1px solid #000;\n    padding: 4mm 5mm 3mm 5mm;\n    position: relative;\n  }\n  #report-header .topgrid{\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    column-gap: 8mm;\n    align-items: start;\n  }\n  #report-header table{\n    border-collapse: collapse;\n    width: 100%;\n  }\n  #report-header td{\n    padding: 1mm 0;\n    vertical-align: top;\n  }\n  #report-header .kv .k{\n    display: inline-block;\n    min-width: 28mm;\n  }\n  #report-header .kv-right .k{\n    min-width: 22mm;\n  }\n  #report-header .title{\n    text-align: center;\n    font-weight: bold;\n    font-size: var(--fs-title);\n    margin: 1mm 0 1mm 0;\n  }\n  #report-header .rule{\n    border-bottom: 1px solid #000;\n    margin-top: 2mm;\n  }\n\n  /* Main table */\n  #data-table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    margin-top: 3mm;\n    font-size: var(--fs-base);\n  }\n  #data-table col.col-sl{ width: var(--col-sl); }\n  #data-table col.col-material{ width: var(--col-material); }\n  #data-table col.col-set{ width: var(--col-set); }\n  #data-table col.col-ach{ width: var(--col-ach); }\n  #data-table col.col-errkg{ width: var(--col-errkg); }\n  #data-table col.col-errpct{ width: var(--col-errpct); }\n\n  #data-table th, #data-table td{\n    border: 1px solid #000;\n    padding: 2.2mm 2mm;\n  }\n  #data-table thead th{\n    font-weight: bold;\n    text-align: left;\n  }\n  #data-table thead th.num{\n    text-align: right;\n  }\n  #data-table td.num{\n    text-align: right;\n  }\n  #data-table td.center{\n    text-align: center;\n  }\n\n  #data-table tfoot td{\n    font-weight: bold;\n    border-top: 1px solid #000;\n  }\n\n  /* Footer */\n  footer{\n    position: fixed;\n    bottom: 8mm;\n    left: 14mm;\n    right: 14mm;\n    font-size: var(--fs-small);\n    display: flex;\n    justify-content: space-between;\n  }\n</style>\n</head>\n<body>\n\n<section id=\"report-header\">\n  <div class=\"topgrid\">\n    <div>\n      <table class=\"kv\">\n        <tr><td><span class=\"k\">Plant name</span> : {plant_name}</td></tr>\n        <tr><td><span class=\"k\">Location</span> : {location}</td></tr>\n      </table>\n    </div>\n    <div>\n      <table class=\"kv kv-right\">\n        <tr>\n          <td style=\"text-align:right\">\n            <span class=\"k\">From Date</span>: {from_date}\n            &nbsp;&nbsp;&nbsp; To {to_date}\n          </td>\n        </tr>\n      </table>\n    </div>\n  </div>\n\n  <div class=\"title\">{report_title}</div>\n\n  <div class=\"topgrid\" style=\"margin-top: 1mm;\">\n    <div>\n      <table class=\"kv\">\n        <tr><td><span class=\"k\">Print Date</span> : {print_date}</td></tr>\n      </table>\n    </div>\n    <div>\n      <table class=\"kv kv-right\">\n        <tr><td style=\"text-align:right\"><span class=\"k\">Recipe code</span> : {recipe_code}</td></tr>\n      </table>\n    </div>\n  </div>\n  <div class=\"rule\"></div>\n</section>\n\n<table id=\"data-table\">\n  <colgroup>\n    <col class=\"col-sl\">\n    <col class=\"col-material\">\n    <col class=\"col-set\">\n    <col class=\"col-ach\">\n    <col class=\"col-errkg\">\n    <col class=\"col-errpct\">\n  </colgroup>\n  <thead>\n    <tr>\n      <th data-label=\"sl_no\">Sl. No.</th>\n      <th data-label=\"material_name\">Material name</th>\n      <th class=\"num\" data-label=\"set_weight\">Set. wt(Kg)</th>\n      <th class=\"num\" data-label=\"actual_weight\">Ach. wt(Kg)</th>\n      <th class=\"num\" data-label=\"error_kg\">Error(Kg)</th>\n      <th class=\"num\" data-label=\"error_percent\">Error %</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td class=\"center\">{sl_no}</td>\n      <td>{material_name}</td>\n      <td class=\"num\">{set_wt}</td>\n      <td class=\"num\">{ach_wt}</td>\n      <td class=\"num\">{error_kg}</td>\n      <td class=\"num\">{error_percent}</td>\n    </tr>\n  </tbody>\n  <tfoot id=\"report-totals\">\n    <tr>\n      <td colspan=\"2\">Total</td>\n      <td class=\"num\">{total_set_wt}</td>\n      <td class=\"num\">{total_ach_wt}</td>\n      <td class=\"num\">{total_error_kg}</td>\n      <td class=\"num\">{total_error_percent}</td>\n    </tr>\n  </tfoot>\n</table>\n\n<footer>\n  <div>{company_name}</div>\n  <div>{page_info}</div>\n</footer>\n\n</body>\n</html>\n<!--END_HTML-->\n\n<!--BEGIN_SCHEMA_JSON-->\n{\n  \"scalars\": [\"plant_name\",\"location\",\"from_date\",\"to_date\",\"print_date\",\"recipe_code\",\"report_title\",\"company_name\",\"page_info\"],\n  \"row_tokens\": [\"sl_no\",\"material_name\",\"set_wt\",\"ach_wt\",\"error_kg\",\"error_percent\"],\n  \"totals\": [\"total_set_wt\",\"total_ach_wt\",\"total_error_kg\",\"total_error_percent\"],\n  \"notes\": \"\"\n}\n<!--END_SCHEMA_JSON-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761304332,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 3527,
    "prompt_tokens": 1544,
    "total_tokens": 5071,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 1920,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T11:15:28Z - template_initial_html

```json
{
  "id": "chatcmpl-CUA1zvW1pZzmFcSL2uZX6fji5Sov9",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>{report_title}</title>\n<style>\n  @page { size: A4; margin: 14mm 14mm 18mm 14mm; }\n  :root{\n    --font-main: \"Arial\", \"Helvetica\", sans-serif;\n    --title-size: 18px;\n    --label-size: 12px;\n    --text-size: 12px;\n    --row-gap: 2mm;\n\n    --col-sl: 14mm;\n    --col-material: 86mm;\n    --col-set: 28mm;\n    --col-ach: 28mm;\n    --col-err: 22mm;\n    --col-errp: 18mm;\n  }\n  html,body{ font-family: var(--font-main); color:#000; }\n  body{ font-size: var(--text-size); line-height: 1.25; }\n\n  /* Header panel */\n  #report-header{\n    border:1px solid #000;\n    padding: 0;\n    margin-bottom: 6mm;\n  }\n  #report-header table{\n    width:100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  #report-header td{\n    vertical-align: top;\n    padding: 4mm 5mm;\n  }\n  #report-header td.left{\n    width: 62%;\n    border-right:1px solid #000;\n  }\n  #report-header td.right{\n    width: 38%;\n  }\n  .kv{\n    display:block;\n    margin: 0 0 1.5mm 0;\n    white-space: nowrap;\n  }\n  .kv .k{ display:inline-block; min-width: 28mm; }\n  .kv .v{ display:inline-block; font-weight: 600; }\n\n  /* Title */\n  .title-wrap{\n    text-align:center;\n    margin: 2mm 0 4mm 0;\n    font-weight:700;\n    font-size: var(--title-size);\n  }\n  .title-wrap .title{\n    display:inline-block;\n    padding: 1mm 4mm;\n  }\n  .title-rule-top{ border-top:1px solid #000; margin-top: -2mm; }\n  .title-rule-bottom{ border-bottom:1px solid #000; margin-top: 2mm; }\n\n  /* Main data table */\n  #data-table{\n    width:100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    border:1px solid #000;\n  }\n  #data-table th,\n  #data-table td{\n    border-right:1px solid #000;\n    border-bottom:1px solid #000;\n    padding: 3.5mm 3mm;\n  }\n  #data-table th:last-child,\n  #data-table td:last-child{ border-right:none; }\n\n  #data-table thead th{\n    text-align:left;\n    font-weight:700;\n  }\n  #data-table thead th.num{ text-align:right; }\n  #data-table td.num{ text-align:right; }\n  #data-table td.center{ text-align:center; }\n\n  /* Column widths */\n  #data-table col.col-sl{ width: var(--col-sl); }\n  #data-table col.col-material{ width: var(--col-material); }\n  #data-table col.col-set{ width: var(--col-set); }\n  #data-table col.col-ach{ width: var(--col-ach); }\n  #data-table col.col-err{ width: var(--col-err); }\n  #data-table col.col-errp{ width: var(--col-errp); }\n\n  /* Totals row */\n  tfoot td{\n    font-weight:700;\n    padding-top: 3mm;\n    padding-bottom: 3mm;\n  }\n\n  /* Footer */\n  #page-footer{\n    position: fixed;\n    bottom: 8mm;\n    left: 14mm;\n    right: 14mm;\n    font-size: 11px;\n    color:#000;\n  }\n  #page-footer .left{ float:left; }\n  #page-footer .right{ float:right; }\n</style>\n</head>\n<body>\n\n<section id=\"report-header\">\n  <table>\n    <tr>\n      <td class=\"left\">\n        <span class=\"kv\"><span class=\"k\">Plant name</span> : <span class=\"v\">{plant_name}</span></span>\n        <span class=\"kv\"><span class=\"k\">Location</span> : <span class=\"v\">{location}</span></span>\n        <span class=\"kv\"><span class=\"k\">Print Date</span> : <span class=\"v\">{print_date}</span></span>\n      </td>\n      <td class=\"right\">\n        <span class=\"kv\"><span class=\"k\">From Date</span>: <span class=\"v\">{from_date}</span> <span style=\"padding:0 6px;\">To</span> <span class=\"v\">{to_date}</span></span>\n        <span class=\"kv\"><span class=\"k\">Recipe code</span> : <span class=\"v\">{recipe_code}</span></span>\n      </td>\n    </tr>\n  </table>\n</section>\n\n<div class=\"title-wrap\">\n  <div class=\"title\">{report_title}</div>\n  <div class=\"title-rule-bottom\"></div>\n</div>\n\n<table id=\"data-table\">\n  <colgroup>\n    <col class=\"col-sl\">\n    <col class=\"col-material\">\n    <col class=\"col-set\">\n    <col class=\"col-ach\">\n    <col class=\"col-err\">\n    <col class=\"col-errp\">\n  </colgroup>\n  <thead>\n    <tr>\n      <th data-label=\"sl_no\">Sl. No.</th>\n      <th data-label=\"material_name\">Material name</th>\n      <th class=\"num\" data-label=\"set_wt_kg\">Set. wt(Kg)</th>\n      <th class=\"num\" data-label=\"ach_wt_kg\">Ach. wt(Kg)</th>\n      <th class=\"num\" data-label=\"error_kg\">Error(Kg)</th>\n      <th class=\"num\" data-label=\"error_percent\">Error %</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td class=\"center\">{sl_no}</td>\n      <td>{material_name}</td>\n      <td class=\"num\">{set_wt}</td>\n      <td class=\"num\">{ach_wt}</td>\n      <td class=\"num\">{error_kg}</td>\n      <td class=\"num\">{error_percent}</td>\n    </tr>\n  </tbody>\n  <tfoot id=\"report-totals\">\n    <tr>\n      <td colspan=\"2\">Total</td>\n      <td class=\"num\">{total_set_wt}</td>\n      <td class=\"num\">{total_ach_wt}</td>\n      <td class=\"num\">{total_error_kg}</td>\n      <td class=\"num\">{total_error_percent}</td>\n    </tr>\n  </tfoot>\n</table>\n\n<div id=\"page-footer\">\n  <div class=\"left\">{company_name}</div>\n  <div class=\"right\">{page_info}</div>\n</div>\n\n</body>\n</html>\n<!--END_HTML-->\n\n<!--BEGIN_SCHEMA_JSON-->\n{\n  \"scalars\": [\n    \"report_title\",\n    \"plant_name\",\n    \"location\",\n    \"from_date\",\n    \"to_date\",\n    \"print_date\",\n    \"recipe_code\",\n    \"company_name\",\n    \"page_info\"\n  ],\n  \"row_tokens\": [\n    \"sl_no\",\n    \"material_name\",\n    \"set_wt\",\n    \"ach_wt\",\n    \"error_kg\",\n    \"error_percent\"\n  ],\n  \"totals\": [\n    \"total_set_wt\",\n    \"total_ach_wt\",\n    \"total_error_kg\",\n    \"total_error_percent\"\n  ],\n  \"notes\": \"\"\n}\n<!--END_SCHEMA_JSON-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761304435,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 3524,
    "prompt_tokens": 1544,
    "total_tokens": 5068,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 1792,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 1408
    }
  }
}
```

## 2025-10-24T11:18:14Z - template_fix_html_call2

```json
{
  "id": "chatcmpl-CUA3dEvZQCAS6BZRz4BMW5213DtoC",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n<title>{report_title}</title>\n<style>\n  @page { size: A4; margin: 14mm 14mm 18mm 14mm; }\n  :root{\n    --font-main: \"Times New Roman\", Times, serif;\n    --title-size: 19px;\n    --label-size: 11.5px;\n    --text-size: 11.5px;\n\n    /* column widths must sum to printable width */\n    --col-sl: 12mm;\n    --col-material: 88mm;\n    --col-set: 27mm;\n    --col-ach: 27mm;\n    --col-err: 16mm;\n    --col-errp: 12mm;\n  }\n\n  html,body{ font-family: var(--font-main); color:#000; }\n  body{ font-size: var(--text-size); line-height: 1.22; }\n\n  /* Header panel */\n  #report-header{\n    border:1px solid #000;\n    padding: 0;\n    margin-bottom: 2.8mm;\n  }\n  #report-header table{\n    width:100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  #report-header td{\n    vertical-align: top;\n    padding: 2.8mm 5mm;\n  }\n  #report-header td.left{\n    width: 62%;\n    border-right:1px solid #000;\n  }\n  #report-header td.right{\n    width: 38%;\n  }\n  .kv{\n    display:block;\n    margin: 0 0 1.2mm 0;\n    white-space: nowrap;\n    font-size: var(--label-size);\n  }\n  .kv .k{ display:inline-block; min-width: 26mm; }\n  .kv .v{ display:inline-block; font-weight: 600; }\n\n  /* Title */\n  .title-wrap{\n    text-align:center;\n    margin: 0 0 2.6mm 0;\n    font-weight:700;\n    font-size: var(--title-size);\n  }\n  .title-wrap .title{\n    display:inline-block;\n    padding: 0.6mm 3.2mm 0.8mm 3.2mm;\n  }\n  .title-rule-bottom{ border-bottom:1px solid #000; margin-top: 1.8mm; }\n\n  /* Main data table */\n  #data-table{\n    width:100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n    border:1px solid #000;\n    font-variant-numeric: tabular-nums;\n  }\n  #data-table th,\n  #data-table td{\n    border-right:1px solid #000;\n    border-bottom:1px solid #000;\n    padding: 2.25mm 2.6mm;\n  }\n  #data-table th:last-child,\n  #data-table td:last-child{ border-right:none; }\n\n  #data-table thead th{\n    font-weight:700;\n  }\n  /* header alignments to match reference */\n  #data-table thead th{ text-align:left; }\n  #data-table thead th.num{ text-align:center; }\n  #data-table thead th:first-child{ text-align:center; }\n\n  #data-table td.num{ text-align:right; white-space: nowrap; }\n  #data-table td.center{ text-align:center; }\n\n  /* Column widths */\n  #data-table col.col-sl{ width: var(--col-sl); }\n  #data-table col.col-material{ width: var(--col-material); }\n  #data-table col.col-set{ width: var(--col-set); }\n  #data-table col.col-ach{ width: var(--col-ach); }\n  #data-table col.col-err{ width: var(--col-err); }\n  #data-table col.col-errp{ width: var(--col-errp); }\n\n  /* Totals row */\n  tfoot td{\n    font-weight:700;\n    padding-top: 2.2mm;\n    padding-bottom: 2.2mm;\n  }\n\n  /* Footer */\n  #page-footer{\n    position: fixed;\n    bottom: 12mm;\n    left: 14mm;\n    right: 14mm;\n    font-size: 11px;\n    color:#000;\n  }\n  #page-footer .left{ float:left; }\n  #page-footer .right{ float:right; }\n</style>\n</head>\n<body>\n\n<section id=\"report-header\">\n  <table>\n    <tr>\n      <td class=\"left\">\n        <span class=\"kv\"><span class=\"k\">Plant name</span> : <span class=\"v\">{plant_name}</span></span>\n        <span class=\"kv\"><span class=\"k\">Location</span> : <span class=\"v\">{location}</span></span>\n        <span class=\"kv\"><span class=\"k\">Print Date</span> : <span class=\"v\">{print_date}</span></span>\n      </td>\n      <td class=\"right\">\n        <span class=\"kv\"><span class=\"k\">From Date</span>: <span class=\"v\">{from_date}</span> <span style=\"padding:0 6px;\">To</span> <span class=\"v\">{to_date}</span></span>\n        <span class=\"kv\"><span class=\"k\">Recipe code</span> : <span class=\"v\">{recipe_code}</span></span>\n      </td>\n    </tr>\n  </table>\n</section>\n\n<div class=\"title-wrap\">\n  <div class=\"title\">{report_title}</div>\n  <div class=\"title-rule-bottom\"></div>\n</div>\n\n<table id=\"data-table\">\n  <colgroup>\n    <col class=\"col-sl\" />\n    <col class=\"col-material\" />\n    <col class=\"col-set\" />\n    <col class=\"col-ach\" />\n    <col class=\"col-err\" />\n    <col class=\"col-errp\" />\n  </colgroup>\n  <thead>\n    <tr>\n      <th data-label=\"sl_no\">Sl. No.</th>\n      <th data-label=\"material_name\">Material name</th>\n      <th class=\"num\" data-label=\"set_wt_kg\">Set. wt(Kg)</th>\n      <th class=\"num\" data-label=\"ach_wt_kg\">Ach. wt(Kg)</th>\n      <th class=\"num\" data-label=\"error_kg\">Error(Kg)</th>\n      <th class=\"num\" data-label=\"error_percent\">Error %</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td class=\"center\">{sl_no}</td>\n      <td>{material_name}</td>\n      <td class=\"num\">{set_wt}</td>\n      <td class=\"num\">{ach_wt}</td>\n      <td class=\"num\">{error_kg}</td>\n      <td class=\"num\">{error_percent}</td>\n    </tr>\n  </tbody>\n  <tfoot id=\"report-totals\">\n    <tr>\n      <td colspan=\"2\">Total</td>\n      <td class=\"num\">{total_set_wt}</td>\n      <td class=\"num\">{total_ach_wt}</td>\n      <td class=\"num\">{total_error_kg}</td>\n      <td class=\"num\">{total_error_percent}</td>\n    </tr>\n  </tfoot>\n</table>\n\n<div id=\"page-footer\">\n  <div class=\"left\">{company_name}</div>\n  <div class=\"right\">{page_info}</div>\n</div>\n\n</body>\n</html>\n<!--END_HTML-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761304537,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 5945,
    "prompt_tokens": 3879,
    "total_tokens": 9824,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 4288,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T11:23:16Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CUA8Sdb1AnYH15iPSBg2cYZ66MjHR",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt_kg\": \"UNRESOLVED\",\n    \"ach_wt_kg\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_percent\": \"UNRESOLVED\",\n    \"set_wt\": \"UNRESOLVED\",\n    \"ach_wt\": \"UNRESOLVED\",\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"print_date\": \"params.print_date\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"recipe_code\": \"params.recipe_code\",\n    \"page_info\": \"To Be Selected...\",\n    \"total_set_wt\": \"SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_error_percent\": \"CASE WHEN SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN NULL ELSE (SUM(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / SUM(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) END\"\n  },\n  \"token_samples\": {\n    \"report_title\": \"Consumption report\",\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"print_date\": \"25/03/2024\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt\": \"11,800.00\",\n    \"ach_wt\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_percent\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_percent\": \"0.0200\",\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_info\": \"Page 1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_percent\",\n      \"set_wt_kg\",\n      \"ach_wt_kg\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761304836,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 7464,
    "prompt_tokens": 3830,
    "total_tokens": 11294,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 6208,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T11:24:04Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CUA8S0BnmrxrKun7yByMGog47ki0p",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"print_date\": \"params.print_date\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"recipe_code\": \"params.recipe_code\",\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_wt\": \"UNRESOLVED\",\n    \"ach_wt\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_percent\": \"UNRESOLVED\",\n    \"set_wt_kg\": \"UNRESOLVED\",\n    \"ach_wt_kg\": \"UNRESOLVED\",\n    \"total_set_wt\": \"(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp))\",\n    \"total_error_percent\": \"CASE WHEN (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp) = 0 THEN 0 ELSE (((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) * 100 END\",\n    \"page_info\": \"To Be Selected...\"\n  },\n  \"token_samples\": {\n    \"report_title\": \"Consumption report\",\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"print_date\": \"25/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"sl_no\": \"1\",\n    \"material_name\": \"CM 100 + DORB 100 KRR\",\n    \"set_wt\": \"11,800.00\",\n    \"ach_wt\": \"11,803.20\",\n    \"error_kg\": \"3.20\",\n    \"error_percent\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_percent\": \"0.0200\",\n    \"company_name\": \"Indian Industrial Machines Pvt. Ltd.\",\n    \"page_info\": \"Page 1 of 1\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_percent\",\n      \"set_wt_kg\",\n      \"ach_wt_kg\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761304836,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6946,
    "prompt_tokens": 3830,
    "total_tokens": 10776,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5696,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T11:29:02Z - llm_call_3_5

```json
{
  "id": "chatcmpl-CUAEoeClD5cDVHZ2aP5v6MwOqxzph",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"final_template_html\": \"\\n<html>\\n<head>\\n<meta charset=\\\"utf-8\\\" />\\n<title>Consumption report</title>\\n<style>\\n  @page { size: A4; margin: 14mm 14mm 18mm 14mm; }\\n  :root{\\n    --font-main: \\\"Times New Roman\\\", Times, serif;\\n    --title-size: 19px;\\n    --label-size: 11.5px;\\n    --text-size: 11.5px;\\n\\n    /* column widths must sum to printable width */\\n    --col-sl: 12mm;\\n    --col-material: 84mm;\\n    --col-set: 27mm;\\n    --col-ach: 27mm;\\n    --col-err: 18mm;\\n    --col-errp: 14mm;\\n  }\\n\\n  html,body{ font-family: var(--font-main); color:#000; }\\n  body{ font-size: var(--text-size); line-height: 1.22; }\\n\\n  /* Header panel */\\n  #report-header{\\n    border:1px solid #000;\\n    padding: 0;\\n    margin-bottom: 2.8mm;\\n  }\\n  #report-header table{\\n    width:100%;\\n    border-collapse: collapse;\\n    table-layout: fixed;\\n  }\\n  #report-header td{\\n    vertical-align: top;\\n    padding: 2.8mm 5mm;\\n  }\\n  #report-header td.left{\\n    width: 62%;\\n    border-right:1px solid #000;\\n  }\\n  #report-header td.right{\\n    width: 38%;\\n  }\\n  .kv{\\n    display:block;\\n    margin: 0 0 1.2mm 0;\\n    white-space: nowrap;\\n    font-size: var(--label-size);\\n  }\\n  .kv .k{ display:inline-block; min-width: 26mm; }\\n  .kv .v{ display:inline-block; font-weight: 600; }\\n\\n  /* Title */\\n  .title-wrap{\\n    text-align:center;\\n    margin: 0 0 2.6mm 0;\\n    font-weight:700;\\n    font-size: var(--title-size);\\n  }\\n  .title-wrap .title{\\n    display:inline-block;\\n    padding: 0.6mm 3.2mm 0.8mm 3.2mm;\\n  }\\n  .title-rule-bottom{ border-bottom:1px solid #000; margin-top: 1.8mm; }\\n\\n  /* Main data table */\\n  #data-table{\\n    width:100%;\\n    border-collapse: collapse;\\n    table-layout: fixed;\\n    border:1px solid #000;\\n    font-variant-numeric: tabular-nums;\\n  }\\n  #data-table th,\\n  #data-table td{\\n    border-right:1px solid #000;\\n    border-bottom:1px solid #000;\\n    padding: 2.25mm 2.6mm;\\n  }\\n  #data-table th:last-child,\\n  #data-table td:last-child{ border-right:none; }\\n\\n  #data-table thead th{\\n    font-weight:700;\\n  }\\n  /* header alignments to match reference */\\n  #data-table thead th{ text-align:left; }\\n  #data-table thead th.num{ text-align:center; }\\n  #data-table thead th:first-child{ text-align:center; }\\n\\n  #data-table td.num{ text-align:right; white-space: nowrap; }\\n  #data-table td.center{ text-align:center; }\\n\\n  /* Column widths */\\n  #data-table col.col-sl{ width: var(--col-sl); }\\n  #data-table col.col-material{ width: var(--col-material); }\\n  #data-table col.col-set{ width: var(--col-set); }\\n  #data-table col.col-ach{ width: var(--col-ach); }\\n  #data-table col.col-err{ width: var(--col-err); }\\n  #data-table col.col-errp{ width: var(--col-errp); }\\n\\n  /* Totals row */\\n  tfoot td{\\n    font-weight:700;\\n    padding-top: 2.2mm;\\n    padding-bottom: 2.2mm;\\n  }\\n\\n  /* Footer */\\n  #page-footer{\\n    position: fixed;\\n    bottom: 12mm;\\n    left: 14mm;\\n    right: 14mm;\\n    font-size: 11px;\\n    color:#000;\\n  }\\n  #page-footer .left{ float:left; }\\n  #page-footer .right{ float:right; }\\n</style>\\n</head>\\n<body>\\n\\n<section id=\\\"report-header\\\">\\n  <table>\\n    <tr>\\n      <td class=\\\"left\\\">\\n        <span class=\\\"kv\\\"><span class=\\\"k\\\">Plant name</span> : <span class=\\\"v\\\">SSR AQUA</span></span>\\n        <span class=\\\"kv\\\"><span class=\\\"k\\\">Location</span> : <span class=\\\"v\\\">Gudivada</span></span>\\n        <span class=\\\"kv\\\"><span class=\\\"k\\\">Print Date</span> : <span class=\\\"v\\\">{print_date}</span></span>\\n      </td>\\n      <td class=\\\"right\\\">\\n        <span class=\\\"kv\\\"><span class=\\\"k\\\">From Date</span>: <span class=\\\"v\\\">{from_date}</span> <span style=\\\"padding:0 6px;\\\">To</span> <span class=\\\"v\\\">{to_date}</span></span>\\n        <span class=\\\"kv\\\"><span class=\\\"k\\\">Recipe code</span> : <span class=\\\"v\\\">{recipe_code}</span></span>\\n      </td>\\n    </tr>\\n  </table>\\n</section>\\n\\n<div class=\\\"title-wrap\\\">\\n  <div class=\\\"title\\\">Consumption report</div>\\n  <div class=\\\"title-rule-bottom\\\"></div>\\n</div>\\n\\n<table id=\\\"data-table\\\">\\n  <colgroup>\\n    <col class=\\\"col-sl\\\" />\\n    <col class=\\\"col-material\\\" />\\n    <col class=\\\"col-set\\\" />\\n    <col class=\\\"col-ach\\\" />\\n    <col class=\\\"col-err\\\" />\\n    <col class=\\\"col-errp\\\" />\\n  </colgroup>\\n  <thead>\\n    <tr>\\n      <th data-label=\\\"sl_no\\\">Sl. No.</th>\\n      <th data-label=\\\"material_name\\\">Material name</th>\\n      <th class=\\\"num\\\" data-label=\\\"set_wt_kg\\\">Set. wt(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"ach_wt_kg\\\">Ach. wt(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"error_kg\\\">Error(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"error_percent\\\">Error %</th>\\n    </tr>\\n  </thead>\\n  <tbody>\\n    <tr>\\n      <td class=\\\"center\\\">{sl_no}</td>\\n      <td>{material_name}</td>\\n      <td class=\\\"num\\\">{set_wt}</td>\\n      <td class=\\\"num\\\">{ach_wt}</td>\\n      <td class=\\\"num\\\">{error_kg}</td>\\n      <td class=\\\"num\\\">{error_percent}</td>\\n    </tr>\\n  </tbody>\\n  <tfoot id=\\\"report-totals\\\">\\n    <tr>\\n      <td colspan=\\\"2\\\">Total</td>\\n      <td class=\\\"num\\\">{total_set_wt}</td>\\n      <td class=\\\"num\\\">{total_ach_wt}</td>\\n      <td class=\\\"num\\\">{total_error_kg}</td>\\n      <td class=\\\"num\\\">{total_error_percent}</td>\\n    </tr>\\n  </tfoot>\\n</table>\\n\\n<div id=\\\"page-footer\\\">\\n  <div class=\\\"left\\\">Indian Industrial Machines Pvt. Ltd.</div>\\n  <div class=\\\"right\\\">{page_info}</div>\\n</div>\\n\\n</body>\\n</html>\",\n  \"page_summary\": \"Adjusted the data table column widths to prevent overflow in the Error(Kg) and Error % columns. New widths (mm): Sl. No. 12, Material 84, Set. wt 27, Ach. wt 27, Error(Kg) 18, Error % 14. Total remains 182mm to match the printable width, keeping the table within borders. Inlined constants based on mapping: plant_name = \\\"SSR AQUA\\\" and location = \\\"Gudivada\\\". Left dynamic/unresolved tokens intact: print_date, from_date, to_date, recipe_code, sl_no, material_name, set_wt, ach_wt, error_kg, error_percent, totals (SQL-derived) and page_info. Notable totals expressions remain mapped to SQL sums/differences; no numeric values were inlined for totals. Potential uncertainties flagged by sample/inline lists: dates and page_info are still LATER_SELECTED and should be filled at render time.\"\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761305230,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 3757,
    "prompt_tokens": 5324,
    "total_tokens": 9081,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 1664,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T11:33:35Z - contract_build_v2

```json
{
  "id": "chatcmpl-CUAIQgvGgf5Chs1uili0wtW6ChvHk",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"overview_md\": \"Executive Summary\\n- Goal: Build a Consumption report that unpivots 12 bin columns (content/setpoint/actual) from recipes into a long form, groups by material name, and produces row-wise Set/Achieved/Error metrics plus overall totals. Header shows date range, recipe code, print date, and page info.\\n- Key reshaping: UNION ALL across recipes.bin1..bin12 content/sp/act into a staging set, trim and drop blanks, then aggregate by material_name.\\n- Filters: Required date range (from_date/to_date) over recipes.start_time, and required key filter recipe_code = recipes.recipe_name.\\n- Ordering: Case-sensitive alphabetical by material_name; sl_no is ROW_NUMBER over this order.\\n- Totals: Derived by summing rows; percent totals computed from total_error_kg / total_set_wt * 100 with NULLIF guard.\\n\\nToken Inventory\\n- Scalars: report_title, plant_name, location, from_date, to_date, print_date, recipe_code, company_name, page_info\\n- Row tokens: sl_no, material_name, set_wt, ach_wt, error_kg, error_percent\\n- Totals: total_set_wt, total_ach_wt, total_error_kg, total_error_percent\\n\\nMapping Table\\n- report_title -> 'Consumption report'\\n- plant_name -> 'SSR AQUA'\\n- location -> 'Gudivada'\\n- from_date -> PARAM:from_date\\n- to_date -> PARAM:to_date\\n- print_date -> PARAM:print_date\\n- recipe_code -> PARAM:recipe_code\\n- company_name -> 'Indian Industrial Machines Pvt. Ltd.'\\n- page_info -> PARAM:page_info\\n- sl_no -> ROW_NUMBER() OVER (ORDER BY rows.material_name ASC)\\n- material_name -> TRIM(long_bins.material_name)\\n- set_wt -> SUM(long_bins.set_wt_kg)\\n- ach_wt -> SUM(long_bins.ach_wt_kg)\\n- error_kg -> SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\\n- error_percent -> CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) * 100 END\\n- total_set_wt -> SUM(rows.set_wt)\\n- total_ach_wt -> SUM(rows.ach_wt)\\n- total_error_kg -> SUM(rows.error_kg)\\n- total_error_percent -> CASE WHEN SUM(rows.set_wt)=0 THEN NULL ELSE SUM(rows.error_kg) / SUM(rows.set_wt) * 100 END\\n\\nJoin & Date Rules\\n- Tables: single table recipes (no joins).\\n- Date column: recipes.start_time is the driving timestamp; apply inclusive date range filter using from_date/to_date parameters.\\n- Recipe filter: recipe_code parameter must filter recipes.recipe_name by equality.\\n\\nTransformations\\n- Reshape: UNION ALL the 12 bin columns into a staging CTE long_bins with columns (material_name, set_wt_kg, ach_wt_kg) drawn from recipes.bin{n}_content, recipes.bin{n}_sp, recipes.bin{n}_act.\\n- Pre-aggregation filters: only keep rows where TRIM(material_name) is not NULL/empty; apply date and recipe_code filters before unpivot or immediately after selecting recipes.\\n- Aggregation: group by TRIM(material_name) to produce set_wt, ach_wt; compute error_kg and error_percent with NULLIF guards.\\n- Ordering: ORDER BY material_name ASC; assign sl_no as ROW_NUMBER() over this order.\\n- Totals: sum rows for totals; compute total_error_percent from totals with NULLIF guard.\\n\\nParameters\\n- Required: from_date (date), to_date (date), recipe_code (string). Required filters must be applied in all entrypoints (header/rows/totals) when values are supplied.\\n- Optional/pass-through: print_date (date or datetime string), page_info (string). These do not affect SQL filtering.\\n- Constants: report_title, plant_name, location, company_name are provided as SQL literals matching the inlined HTML.\\n\\nChecklist for Step 5\\n- Datasets column orders must match schema exactly.\\n- Build long_bins via UNION ALL across bin1..bin12 content/sp/act from the recipes table only (catalog-allowed columns).\\n- Apply filters before aggregation: DATE(recipes.start_time) between from_date and to_date (inclusive); recipes.recipe_name = :recipe_code.\\n- Drop rows where TRIM(material_name) IS NULL or ''.\\n- Group rows by TRIM(material_name); compute set_wt, ach_wt, error_kg, error_percent using identical expressions as in contract.\\n- Order rows by material_name ASC; compute sl_no via ROW_NUMBER() OVER (ORDER BY rows.material_name ASC).\\n- Totals computed from rows dataset with NULLIF guards; percent values multiplied by 100.\\n- Use only columns from catalog allow-list; no additional tables or columns.\",\n  \"step5_requirements\": {\n    \"datasets\": {\n      \"header\": {\n        \"description\": \"One-row header dataset\",\n        \"columns\": [\n          \"report_title\",\n          \"plant_name\",\n          \"location\",\n          \"from_date\",\n          \"to_date\",\n          \"print_date\",\n          \"recipe_code\",\n          \"company_name\",\n          \"page_info\"\n        ]\n      },\n      \"rows\": {\n        \"description\": \"Detail rows dataset aggregated by material name over selected recipes/date range\",\n        \"columns\": [\n          \"sl_no\",\n          \"material_name\",\n          \"set_wt\",\n          \"ach_wt\",\n          \"error_kg\",\n          \"error_percent\"\n        ],\n        \"grouping\": [\n          \"Group by TRIM(long_bins.material_name).\",\n          \"Deduplicate implicitly through grouping; ignore rows where TRIM(long_bins.material_name) IS NULL or ''.\",\n          \"Filters (date range on recipes.start_time and recipe_code equality) must be applied before grouping.\"\n        ],\n        \"ordering\": [\n          \"ORDER BY material_name ASC for display.\",\n          \"sl_no = ROW_NUMBER() OVER (ORDER BY material_name ASC) to ensure stable numbering.\"\n        ]\n      },\n      \"totals\": {\n        \"description\": \"Aggregate totals dataset derived from rows\",\n        \"columns\": [\n          \"total_set_wt\",\n          \"total_ach_wt\",\n          \"total_error_kg\",\n          \"total_error_percent\"\n        ]\n      }\n    },\n    \"semantics\": \"from_date and to_date are required parameters defining an inclusive date range filter over recipes.start_time (i.e., DATE(recipes.start_time) BETWEEN :from_date AND :to_date). recipe_code is a required key filter applied as equality to recipes.recipe_name. print_date and page_info are pass-through render-time values and do not affect SQL. All required filters must be applied consistently in header, rows, and totals queries.\",\n    \"parameters\": {\n      \"required\": [\n        {\n          \"name\": \"from_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"to_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"recipe_code\",\n          \"type\": \"string\"\n        }\n      ],\n      \"optional\": [\n        {\n          \"name\": \"print_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"page_info\",\n          \"type\": \"string\"\n        }\n      ]\n    },\n    \"transformations\": [\n      \"UNION ALL across bin1..bin12 to produce long_bins(material_name, set_wt_kg, ach_wt_kg) sourced from: content -> recipes.bin{n}_content, set -> recipes.bin{n}_sp, ach -> recipes.bin{n}_act.\",\n      \"Apply filters first: DATE(recipes.start_time) between :from_date and :to_date; recipes.recipe_name = :recipe_code.\",\n      \"Drop rows where TRIM(material_name) IS NULL or ''.\",\n      \"Aggregate rows by TRIM(material_name); compute set_wt = SUM(set_wt_kg), ach_wt = SUM(ach_wt_kg).\",\n      \"Compute error_kg = SUM(ach_wt_kg) - SUM(set_wt_kg).\",\n      \"Compute error_percent = CASE WHEN SUM(set_wt_kg)=0 THEN NULL ELSE (SUM(ach_wt_kg) - SUM(set_wt_kg)) / SUM(set_wt_kg) * 100 END.\",\n      \"Order rows by material_name ASC and assign sl_no via ROW_NUMBER() OVER (ORDER BY material_name ASC).\",\n      \"Totals computed from rows: total_set_wt = SUM(rows.set_wt), total_ach_wt = SUM(rows.ach_wt), total_error_kg = SUM(rows.error_kg), total_error_percent = CASE WHEN SUM(rows.set_wt)=0 THEN NULL ELSE SUM(rows.error_kg) / SUM(rows.set_wt) * 100 END.\"\n    ]\n  },\n  \"contract\": {\n    \"tokens\": {\n      \"scalars\": [\n        \"report_title\",\n        \"plant_name\",\n        \"location\",\n        \"from_date\",\n        \"to_date\",\n        \"print_date\",\n        \"recipe_code\",\n        \"company_name\",\n        \"page_info\"\n      ],\n      \"row_tokens\": [\n        \"sl_no\",\n        \"material_name\",\n        \"set_wt\",\n        \"ach_wt\",\n        \"error_kg\",\n        \"error_percent\"\n      ],\n      \"totals\": [\n        \"total_set_wt\",\n        \"total_ach_wt\",\n        \"total_error_kg\",\n        \"total_error_percent\"\n      ]\n    },\n    \"mapping\": {\n      \"report_title\": \"'Consumption report'\",\n      \"plant_name\": \"'SSR AQUA'\",\n      \"location\": \"'Gudivada'\",\n      \"from_date\": \"PARAM:from_date\",\n      \"to_date\": \"PARAM:to_date\",\n      \"print_date\": \"PARAM:print_date\",\n      \"recipe_code\": \"PARAM:recipe_code\",\n      \"company_name\": \"'Indian Industrial Machines Pvt. Ltd.'\",\n      \"page_info\": \"PARAM:page_info\",\n      \"sl_no\": \"ROW_NUMBER() OVER (ORDER BY rows.material_name ASC)\",\n      \"material_name\": \"TRIM(long_bins.material_name)\",\n      \"set_wt\": \"SUM(long_bins.set_wt_kg)\",\n      \"ach_wt\": \"SUM(long_bins.ach_wt_kg)\",\n      \"error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"error_percent\": \"CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) * 100 END\",\n      \"total_set_wt\": \"SUM(rows.set_wt)\",\n      \"total_ach_wt\": \"SUM(rows.ach_wt)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_percent\": \"CASE WHEN SUM(rows.set_wt)=0 THEN NULL ELSE SUM(rows.error_kg) / SUM(rows.set_wt) * 100 END\"\n    },\n    \"unresolved\": [],\n    \"join\": {\n      \"parent_table\": \"recipes\",\n      \"parent_key\": \"id\",\n      \"child_table\": null,\n      \"child_key\": null\n    },\n    \"date_columns\": {\n      \"recipes\": \"start_time\"\n    },\n    \"filters\": {\n      \"optional\": {}\n    },\n    \"reshape_rules\": [\n      {\n        \"purpose\": \"Produce rows dataset\",\n        \"strategy\": \"UNION_ALL\",\n        \"explain\": \"Union bin1..bin12 columns into long form, trim material names, drop blanks before grouping, then aggregate by material_name.\",\n        \"columns\": [\n          {\n            \"as\": \"material_name\",\n            \"from\": [\n              \"recipes.bin1_content\",\n              \"recipes.bin2_content\",\n              \"recipes.bin3_content\",\n              \"recipes.bin4_content\",\n              \"recipes.bin5_content\",\n              \"recipes.bin6_content\",\n              \"recipes.bin7_content\",\n              \"recipes.bin8_content\",\n              \"recipes.bin9_content\",\n              \"recipes.bin10_content\",\n              \"recipes.bin11_content\",\n              \"recipes.bin12_content\"\n            ]\n          },\n          {\n            \"as\": \"set_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_sp\",\n              \"recipes.bin2_sp\",\n              \"recipes.bin3_sp\",\n              \"recipes.bin4_sp\",\n              \"recipes.bin5_sp\",\n              \"recipes.bin6_sp\",\n              \"recipes.bin7_sp\",\n              \"recipes.bin8_sp\",\n              \"recipes.bin9_sp\",\n              \"recipes.bin10_sp\",\n              \"recipes.bin11_sp\",\n              \"recipes.bin12_sp\"\n            ]\n          },\n          {\n            \"as\": \"ach_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_act\",\n              \"recipes.bin2_act\",\n              \"recipes.bin3_act\",\n              \"recipes.bin4_act\",\n              \"recipes.bin5_act\",\n              \"recipes.bin6_act\",\n              \"recipes.bin7_act\",\n              \"recipes.bin8_act\",\n              \"recipes.bin9_act\",\n              \"recipes.bin10_act\",\n              \"recipes.bin11_act\",\n              \"recipes.bin12_act\"\n            ]\n          }\n        ]\n      }\n    ],\n    \"row_computed\": {\n      \"error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"error_percent\": \"CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) * 100 END\"\n    },\n    \"totals_math\": {\n      \"total_set_wt\": \"SUM(rows.set_wt)\",\n      \"total_ach_wt\": \"SUM(rows.ach_wt)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_percent\": \"CASE WHEN SUM(rows.set_wt)=0 THEN NULL ELSE SUM(rows.error_kg) / SUM(rows.set_wt) * 100 END\"\n    },\n    \"formatters\": {\n      \"set_wt\": \"number(2)\",\n      \"ach_wt\": \"number(2)\",\n      \"error_kg\": \"number(2)\",\n      \"error_percent\": \"percent(4)\",\n      \"total_set_wt\": \"number(2)\",\n      \"total_ach_wt\": \"number(2)\",\n      \"total_error_kg\": \"number(2)\",\n      \"total_error_percent\": \"percent(4)\",\n      \"print_date\": \"date(YYYY-MM-DD)\"\n    },\n    \"order_by\": {\n      \"rows\": [\n        \"material_name ASC\"\n      ]\n    },\n    \"notes\": \"Apply required filters in all datasets: DATE(recipes.start_time) BETWEEN :from_date AND :to_date and recipes.recipe_name = :recipe_code. Exclude long_bins rows where TRIM(material_name) is NULL or empty. Use only the recipes table and columns listed in the catalog.\"\n  },\n  \"validation\": {\n    \"unknown_tokens\": [],\n    \"unknown_columns\": [],\n    \"token_coverage\": {\n      \"scalars_mapped_pct\": 100,\n      \"row_tokens_mapped_pct\": 100,\n      \"totals_mapped_pct\": 100\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761305454,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 8750,
    "prompt_tokens": 8970,
    "total_tokens": 17720,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5440,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T11:35:06Z - generator_assets_v1

```json
{
  "id": "chatcmpl-CUAL2OFvMG3OIHXLUDAFSjTebT539",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"contract\": {\n    \"tokens\": {\n      \"scalars\": [\n        \"report_title\",\n        \"plant_name\",\n        \"location\",\n        \"from_date\",\n        \"to_date\",\n        \"print_date\",\n        \"recipe_code\",\n        \"company_name\",\n        \"page_info\"\n      ],\n      \"row_tokens\": [\n        \"sl_no\",\n        \"material_name\",\n        \"set_wt\",\n        \"ach_wt\",\n        \"error_kg\",\n        \"error_percent\"\n      ],\n      \"totals\": [\n        \"total_set_wt\",\n        \"total_ach_wt\",\n        \"total_error_kg\",\n        \"total_error_percent\"\n      ]\n    },\n    \"mapping\": {\n      \"report_title\": \"'Consumption report'\",\n      \"plant_name\": \"'SSR AQUA'\",\n      \"location\": \"'Gudivada'\",\n      \"from_date\": \"PARAM:from_date\",\n      \"to_date\": \"PARAM:to_date\",\n      \"print_date\": \"PARAM:print_date\",\n      \"recipe_code\": \"PARAM:recipe_code\",\n      \"company_name\": \"'Indian Industrial Machines Pvt. Ltd.'\",\n      \"page_info\": \"PARAM:page_info\",\n      \"sl_no\": \"ROW_NUMBER() OVER (ORDER BY rows.material_name ASC)\",\n      \"material_name\": \"TRIM(long_bins.material_name)\",\n      \"set_wt\": \"SUM(long_bins.set_wt_kg)\",\n      \"ach_wt\": \"SUM(long_bins.ach_wt_kg)\",\n      \"error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"error_percent\": \"CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) * 100 END\",\n      \"total_set_wt\": \"SUM(rows.set_wt)\",\n      \"total_ach_wt\": \"SUM(rows.ach_wt)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_percent\": \"CASE WHEN SUM(rows.set_wt)=0 THEN NULL ELSE SUM(rows.error_kg) / SUM(rows.set_wt) * 100 END\"\n    },\n    \"join\": {\n      \"parent_table\": \"recipes\",\n      \"parent_key\": \"id\",\n      \"child_table\": \"recipes\",\n      \"child_key\": \"id\"\n    },\n    \"date_columns\": {\n      \"recipes\": \"start_time\"\n    },\n    \"filters\": {\n      \"optional\": {}\n    },\n    \"reshape_rules\": [\n      {\n        \"purpose\": \"Produce rows dataset\",\n        \"strategy\": \"UNION_ALL\",\n        \"explain\": \"Union bin1..bin12 columns into long form, trim material names, drop blanks before grouping, then aggregate by material_name.\",\n        \"columns\": [\n          {\n            \"as\": \"material_name\",\n            \"from\": [\n              \"recipes.bin1_content\",\n              \"recipes.bin2_content\",\n              \"recipes.bin3_content\",\n              \"recipes.bin4_content\",\n              \"recipes.bin5_content\",\n              \"recipes.bin6_content\",\n              \"recipes.bin7_content\",\n              \"recipes.bin8_content\",\n              \"recipes.bin9_content\",\n              \"recipes.bin10_content\",\n              \"recipes.bin11_content\",\n              \"recipes.bin12_content\"\n            ]\n          },\n          {\n            \"as\": \"set_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_sp\",\n              \"recipes.bin2_sp\",\n              \"recipes.bin3_sp\",\n              \"recipes.bin4_sp\",\n              \"recipes.bin5_sp\",\n              \"recipes.bin6_sp\",\n              \"recipes.bin7_sp\",\n              \"recipes.bin8_sp\",\n              \"recipes.bin9_sp\",\n              \"recipes.bin10_sp\",\n              \"recipes.bin11_sp\",\n              \"recipes.bin12_sp\"\n            ]\n          },\n          {\n            \"as\": \"ach_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_act\",\n              \"recipes.bin2_act\",\n              \"recipes.bin3_act\",\n              \"recipes.bin4_act\",\n              \"recipes.bin5_act\",\n              \"recipes.bin6_act\",\n              \"recipes.bin7_act\",\n              \"recipes.bin8_act\",\n              \"recipes.bin9_act\",\n              \"recipes.bin10_act\",\n              \"recipes.bin11_act\",\n              \"recipes.bin12_act\"\n            ]\n          }\n        ]\n      }\n    ],\n    \"row_computed\": {\n      \"error_kg\": \"SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)\",\n      \"error_percent\": \"CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) * 100 END\"\n    },\n    \"totals_math\": {\n      \"total_set_wt\": \"SUM(rows.set_wt)\",\n      \"total_ach_wt\": \"SUM(rows.ach_wt)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_percent\": \"CASE WHEN SUM(rows.set_wt)=0 THEN NULL ELSE SUM(rows.error_kg) / SUM(rows.set_wt) * 100 END\"\n    },\n    \"formatters\": {\n      \"set_wt\": \"number(2)\",\n      \"ach_wt\": \"number(2)\",\n      \"error_kg\": \"number(2)\",\n      \"error_percent\": \"percent(4)\",\n      \"total_set_wt\": \"number(2)\",\n      \"total_ach_wt\": \"number(2)\",\n      \"total_error_kg\": \"number(2)\",\n      \"total_error_percent\": \"percent(4)\",\n      \"print_date\": \"date(YYYY-MM-DD)\"\n    },\n    \"order_by\": {\n      \"rows\": [\n        \"material_name ASC\"\n      ]\n    },\n    \"header_tokens\": [\n      \"report_title\",\n      \"plant_name\",\n      \"location\",\n      \"from_date\",\n      \"to_date\",\n      \"print_date\",\n      \"recipe_code\",\n      \"company_name\",\n      \"page_info\"\n    ],\n    \"row_tokens\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_wt\",\n      \"ach_wt\",\n      \"error_kg\",\n      \"error_percent\"\n    ],\n    \"totals\": {\n      \"total_set_wt\": \"SUM(rows.set_wt)\",\n      \"total_ach_wt\": \"SUM(rows.ach_wt)\",\n      \"total_error_kg\": \"SUM(rows.error_kg)\",\n      \"total_error_percent\": \"CASE WHEN SUM(rows.set_wt)=0 THEN NULL ELSE SUM(rows.error_kg) / SUM(rows.set_wt) * 100 END\"\n    },\n    \"row_order\": [\n      \"material_name ASC\"\n    ]\n  },\n  \"sql_pack\": {\n    \"dialect\": \"sqlite\",\n    \"script\": \"-- HEADER SELECT --\\nSELECT 'Consumption report' AS report_title, 'SSR AQUA' AS plant_name, 'Gudivada' AS location, PARAM:from_date AS from_date, PARAM:to_date AS to_date, PARAM:print_date AS print_date, PARAM:recipe_code AS recipe_code, 'Indian Industrial Machines Pvt. Ltd.' AS company_name, PARAM:page_info AS page_info\\n-- ROWS SELECT --\\nSELECT ROW_NUMBER() OVER (ORDER BY rows.material_name ASC) AS sl_no, TRIM(long_bins.material_name) AS material_name, SUM(long_bins.set_wt_kg) AS set_wt, SUM(long_bins.ach_wt_kg) AS ach_wt, SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) AS error_kg, CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) * 100 END AS error_percent\\nFROM recipes\\nJOIN (SELECT TRIM(material_name) as material_name, set_wt_kg, ach_wt_kg FROM (\\n  SELECT recipes.bin1_content AS material_name, recipes.bin1_sp AS set_wt_kg, recipes.bin1_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin2_content AS material_name, recipes.bin2_sp AS set_wt_kg, recipes.bin2_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin3_content AS material_name, recipes.bin3_sp AS set_wt_kg, recipes.bin3_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin4_content AS material_name, recipes.bin4_sp AS set_wt_kg, recipes.bin4_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin5_content AS material_name, recipes.bin5_sp AS set_wt_kg, recipes.bin5_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin6_content AS material_name, recipes.bin6_sp AS set_wt_kg, recipes.bin6_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin7_content AS material_name, recipes.bin7_sp AS set_wt_kg, recipes.bin7_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin8_content AS material_name, recipes.bin8_sp AS set_wt_kg, recipes.bin8_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin9_content AS material_name, recipes.bin9_sp AS set_wt_kg, recipes.bin9_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin10_content AS material_name, recipes.bin10_sp AS set_wt_kg, recipes.bin10_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin11_content AS material_name, recipes.bin11_sp AS set_wt_kg, recipes.bin11_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin12_content AS material_name, recipes.bin12_sp AS set_wt_kg, recipes.bin12_act AS ach_wt_kg FROM recipes\\n) AS long_bins WHERE TRIM(long_bins.material_name) IS NOT NULL AND TRIM(long_bins.material_name) <> '') AS long_bins ON DATE(recipes.start_time) BETWEEN PARAM:from_date AND PARAM:to_date AND recipes.recipe_name = PARAM:recipe_code GROUP BY TRIM(long_bins.material_name)\\nORDER BY material_name ASC\\n-- TOTALS SELECT --\\nSELECT SUM(rows.set_wt) AS total_set_wt, SUM(rows.ach_wt) AS total_ach_wt, SUM(rows.error_kg) AS total_error_kg, CASE WHEN SUM(rows.set_wt)=0 THEN NULL ELSE SUM(rows.error_kg) / SUM(rows.set_wt) * 100 END AS total_error_percent FROM (SELECT ROW_NUMBER() OVER (ORDER BY long_bins.material_name ASC) AS sl_no, TRIM(long_bins.material_name) AS material_name, SUM(long_bins.set_wt_kg) AS set_wt, SUM(long_bins.ach_wt_kg) AS ach_wt, SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) AS error_kg, CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) * 100 END AS error_percent FROM recipes JOIN (SELECT TRIM(material_name) as material_name, set_wt_kg, ach_wt_kg FROM (\\n  SELECT recipes.bin1_content AS material_name, recipes.bin1_sp AS set_wt_kg, recipes.bin1_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin2_content AS material_name, recipes.bin2_sp AS set_wt_kg, recipes.bin2_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin3_content AS material_name, recipes.bin3_sp AS set_wt_kg, recipes.bin3_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin4_content AS material_name, recipes.bin4_sp AS set_wt_kg, recipes.bin4_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin5_content AS material_name, recipes.bin5_sp AS set_wt_kg, recipes.bin5_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin6_content AS material_name, recipes.bin6_sp AS set_wt_kg, recipes.bin6_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin7_content AS material_name, recipes.bin7_sp AS set_wt_kg, recipes.bin7_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin8_content AS material_name, recipes.bin8_sp AS set_wt_kg, recipes.bin8_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin9_content AS material_name, recipes.bin9_sp AS set_wt_kg, recipes.bin9_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin10_content AS material_name, recipes.bin10_sp AS set_wt_kg, recipes.bin10_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin11_content AS material_name, recipes.bin11_sp AS set_wt_kg, recipes.bin11_act AS ach_wt_kg FROM recipes\\n  UNION ALL\\n  SELECT recipes.bin12_content AS material_name, recipes.bin12_sp AS set_wt_kg, recipes.bin12_act AS ach_wt_kg FROM recipes\\n) AS long_bins WHERE TRIM(long_bins.material_name) IS NOT NULL AND TRIM(long_bins.material_name) <> '') AS long_bins ON DATE(recipes.start_time) BETWEEN PARAM:from_date AND PARAM:to_date AND recipes.recipe_name = PARAM:recipe_code GROUP BY TRIM(long_bins.material_name) ORDER BY material_name ASC);\",\n    \"entrypoints\": {\n      \"header\": \"SELECT 'Consumption report' AS report_title, 'SSR AQUA' AS plant_name, 'Gudivada' AS location, PARAM:from_date AS from_date, PARAM:to_date AS to_date, PARAM:print_date AS print_date, PARAM:recipe_code AS recipe_code, 'Indian Industrial Machines Pvt. Ltd.' AS company_name, PARAM:page_info AS page_info\",\n      \"rows\": \"SELECT ROW_NUMBER() OVER (ORDER BY rows.material_name ASC) AS sl_no, TRIM(long_bins.material_name) AS material_name, SUM(long_bins.set_wt_kg) AS set_wt, SUM(long_bins.ach_wt_kg) AS ach_wt, SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) AS error_kg, CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) * 100 END AS error_percent FROM recipes JOIN (SELECT TRIM(material_name) as material_name, set_wt_kg, ach_wt_kg FROM (SELECT recipes.bin1_content AS material_name, recipes.bin1_sp AS set_wt_kg, recipes.bin1_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin2_content AS material_name, recipes.bin2_sp AS set_wt_kg, recipes.bin2_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin3_content AS material_name, recipes.bin3_sp AS set_wt_kg, recipes.bin3_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin4_content AS material_name, recipes.bin4_sp AS set_wt_kg, recipes.bin4_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin5_content AS material_name, recipes.bin5_sp AS set_wt_kg, recipes.bin5_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin6_content AS material_name, recipes.bin6_sp AS set_wt_kg, recipes.bin6_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin7_content AS material_name, recipes.bin7_sp AS set_wt_kg, recipes.bin7_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin8_content AS material_name, recipes.bin8_sp AS set_wt_kg, recipes.bin8_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin9_content AS material_name, recipes.bin9_sp AS set_wt_kg, recipes.bin9_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin10_content AS material_name, recipes.bin10_sp AS set_wt_kg, recipes.bin10_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin11_content AS material_name, recipes.bin11_sp AS set_wt_kg, recipes.bin11_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin12_content AS material_name, recipes.bin12_sp AS set_wt_kg, recipes.bin12_act AS ach_wt_kg FROM recipes) AS long_bins WHERE TRIM(long_bins.material_name) IS NOT NULL AND TRIM(long_bins.material_name) <> '') AS long_bins ON DATE(recipes.start_time) BETWEEN PARAM:from_date AND PARAM:to_date AND recipes.recipe_name = PARAM:recipe_code GROUP BY TRIM(long_bins.material_name) ORDER BY material_name ASC\",\n      \"totals\": \"SELECT SUM(rows.set_wt) AS total_set_wt, SUM(rows.ach_wt) AS total_ach_wt, SUM(rows.error_kg) AS total_error_kg, CASE WHEN SUM(rows.set_wt)=0 THEN NULL ELSE SUM(rows.error_kg) / SUM(rows.set_wt) * 100 END AS total_error_percent FROM (SELECT ROW_NUMBER() OVER (ORDER BY long_bins.material_name ASC) AS sl_no, TRIM(long_bins.material_name) AS material_name, SUM(long_bins.set_wt_kg) AS set_wt, SUM(long_bins.ach_wt_kg) AS ach_wt, SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg) AS error_kg, CASE WHEN SUM(long_bins.set_wt_kg)=0 THEN NULL ELSE (SUM(long_bins.ach_wt_kg) - SUM(long_bins.set_wt_kg)) / SUM(long_bins.set_wt_kg) * 100 END AS error_percent FROM recipes JOIN (SELECT TRIM(material_name) as material_name, set_wt_kg, ach_wt_kg FROM (SELECT recipes.bin1_content AS material_name, recipes.bin1_sp AS set_wt_kg, recipes.bin1_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin2_content AS material_name, recipes.bin2_sp AS set_wt_kg, recipes.bin2_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin3_content AS material_name, recipes.bin3_sp AS set_wt_kg, recipes.bin3_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin4_content AS material_name, recipes.bin4_sp AS set_wt_kg, recipes.bin4_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin5_content AS material_name, recipes.bin5_sp AS set_wt_kg, recipes.bin5_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin6_content AS material_name, recipes.bin6_sp AS set_wt_kg, recipes.bin6_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin7_content AS material_name, recipes.bin7_sp AS set_wt_kg, recipes.bin7_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin8_content AS material_name, recipes.bin8_sp AS set_wt_kg, recipes.bin8_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin9_content AS material_name, recipes.bin9_sp AS set_wt_kg, recipes.bin9_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin10_content AS material_name, recipes.bin10_sp AS set_wt_kg, recipes.bin10_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin11_content AS material_name, recipes.bin11_sp AS set_wt_kg, recipes.bin11_act AS ach_wt_kg FROM recipes UNION ALL SELECT recipes.bin12_content AS material_name, recipes.bin12_sp AS set_wt_kg, recipes.bin12_act AS ach_wt_kg FROM recipes) AS long_bins WHERE TRIM(long_bins.material_name) IS NOT NULL AND TRIM(long_bins.material_name) <> '') AS long_bins ON DATE(recipes.start_time) BETWEEN PARAM:from_date AND PARAM:to_date AND recipes.recipe_name = PARAM:recipe_code GROUP BY TRIM(long_bins.material_name) ORDER BY material_name ASC);\"\n    },\n    \"params\": {\n      \"required\": [\n        {\n          \"name\": \"from_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"to_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"recipe_code\",\n          \"type\": \"string\"\n        }\n      ],\n      \"optional\": [\n        {\n          \"name\": \"print_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"page_info\",\n          \"type\": \"string\"\n        }\n      ]\n    }\n  },\n  \"dialect\": \"sqlite\",\n  \"invalid\": false\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761305616,
  "model": "gpt-4o-mini-2024-07-18",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": "fp_560af6e559",
  "usage": {
    "completion_tokens": 4587,
    "prompt_tokens": 7140,
    "total_tokens": 11727,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 0,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T11:40:04Z - template_initial_html

```json
{
  "id": "chatcmpl-CUAQ7T0rxqBAewWRkNvJ4ufyWg4ZV",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Consumption report</title>\n<style>\n  @page { size: A4; margin: 14mm 16mm; }\n  :root{\n    --font-main: \"Times New Roman\", Georgia, serif;\n    --font-size: 11.5pt;\n    --title-size: 18pt;\n    --row-gap: 2mm;\n    --col-1-w: 16mm;  /* Sl. No. */\n    --col-2-w: 88mm;  /* Material name */\n    --col-3-w: 28mm;  /* Set. wt */\n    --col-4-w: 28mm;  /* Ach. wt */\n    --col-5-w: 24mm;  /* Error Kg */\n    --col-6-w: 20mm;  /* Error % */\n  }\n  html, body { height: 100%; }\n  body{\n    font-family: var(--font-main);\n    font-size: var(--font-size);\n    color: #000;\n  }\n  /* Header box */\n  #report-header{\n    border: 1px solid #000;\n    padding: 6mm 6mm 4mm;\n    margin-bottom: 5mm;\n  }\n  #report-header table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  #report-header td{\n    vertical-align: top;\n    padding: 0;\n  }\n  #report-header .left-block{\n    line-height: 1.35;\n  }\n  #report-header .right-top{\n    text-align: right;\n    white-space: nowrap;\n  }\n  #report-header .title{\n    text-align: center;\n    font-weight: 700;\n    font-size: var(--title-size);\n  }\n  #report-header .recipe{\n    text-align: right;\n    white-space: nowrap;\n  }\n  /* Data table */\n  #data-table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  #data-table col.col-1{ width: var(--col-1-w); }\n  #data-table col.col-2{ width: var(--col-2-w); }\n  #data-table col.col-3{ width: var(--col-3-w); }\n  #data-table col.col-4{ width: var(--col-4-w); }\n  #data-table col.col-5{ width: var(--col-5-w); }\n  #data-table col.col-6{ width: var(--col-6-w); }\n\n  #data-table th, #data-table td{\n    border: 1px solid #000;\n    padding: 2.5mm 2.5mm;\n    line-height: 1.2;\n  }\n  #data-table thead th{\n    font-weight: 700;\n    text-align: left;\n  }\n  #data-table thead th.num{\n    text-align: right;\n  }\n  #data-table tbody td.num{\n    text-align: right;\n  }\n  #data-table tfoot td{\n    font-weight: 700;\n    background: #f7f7f7;\n  }\n  /* Footer */\n  footer{\n    position: fixed;\n    left: 16mm; right: 16mm; bottom: 10mm;\n    font-size: 10pt;\n    color: #000;\n  }\n  footer .bar{\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n  }\n</style>\n</head>\n<body>\n\n<div id=\"report-header\">\n  <table>\n    <colgroup>\n      <col style=\"width:55%\">\n      <col style=\"width:20%\">\n      <col style=\"width:25%\">\n    </colgroup>\n    <tr>\n      <td class=\"left-block\">\n        <div>Plant name : {plant_name}</div>\n        <div>Location : {location}</div>\n      </td>\n      <td></td>\n      <td class=\"right-top\">\n        <div>From&nbsp;Date: {from_date} &nbsp;&nbsp;To {to_date}</div>\n      </td>\n    </tr>\n    <tr>\n      <td class=\"left-block\">\n        <div>Print Date &nbsp;: {print_date}</div>\n      </td>\n      <td class=\"title\" colspan=\"1\">Consumption report</td>\n      <td class=\"recipe\">Recipe code : {recipe_code}</td>\n    </tr>\n  </table>\n</div>\n\n<table id=\"data-table\">\n  <colgroup>\n    <col class=\"col-1\">\n    <col class=\"col-2\">\n    <col class=\"col-3\">\n    <col class=\"col-4\">\n    <col class=\"col-5\">\n    <col class=\"col-6\">\n  </colgroup>\n  <thead>\n    <tr>\n      <th data-label=\"Sl. No.\">Sl. No.</th>\n      <th data-label=\"Material name\">Material name</th>\n      <th class=\"num\" data-label=\"Set. wt(Kg)\">Set. wt(Kg)</th>\n      <th class=\"num\" data-label=\"Ach. wt(Kg)\">Ach. wt(Kg)</th>\n      <th class=\"num\" data-label=\"Error(Kg)\">Error(Kg)</th>\n      <th class=\"num\" data-label=\"Error %\">Error %</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>{row_sl_no}</td>\n      <td>{row_material_name}</td>\n      <td class=\"num\">{row_set_wt}</td>\n      <td class=\"num\">{row_ach_wt}</td>\n      <td class=\"num\">{row_error_kg}</td>\n      <td class=\"num\">{row_error_pct}</td>\n    </tr>\n  </tbody>\n  <tfoot>\n    <tr id=\"report-totals\">\n      <td colspan=\"2\">Total</td>\n      <td class=\"num\">{total_set_wt}</td>\n      <td class=\"num\">{total_ach_wt}</td>\n      <td class=\"num\">{total_error_kg}</td>\n      <td class=\"num\">{total_error_pct}</td>\n    </tr>\n  </tfoot>\n</table>\n\n<footer>\n  <div class=\"bar\">\n    <div>Indian Industrial Machines Pvt. Ltd.</div>\n    <div>Page 1 of 1</div>\n  </div>\n</footer>\n\n</body>\n</html>\n<!--END_HTML-->\n\n<!--BEGIN_SCHEMA_JSON-->\n{\n  \"scalars\": [\"plant_name\",\"location\",\"from_date\",\"to_date\",\"print_date\",\"recipe_code\",\"report_title\"],\n  \"row_tokens\": [\"row_sl_no\",\"row_material_name\",\"row_set_wt\",\"row_ach_wt\",\"row_error_kg\",\"row_error_pct\"],\n  \"totals\": [\"total_set_wt\",\"total_ach_wt\",\"total_error_kg\",\"total_error_pct\"],\n  \"notes\": \"\"\n}\n<!--END_SCHEMA_JSON-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761305931,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 3647,
    "prompt_tokens": 1544,
    "total_tokens": 5191,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 2112,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T11:42:13Z - template_fix_html_call2

```json
{
  "id": "chatcmpl-CUARONL56aFySFeXJP2gaIpz94vdY",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "<!--BEGIN_HTML-->\n<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\" />\n<title>Consumption report</title>\n<style>\n  @page { size: A4; margin: 14mm 16mm; }\n  :root{\n    --font-main: \"Times New Roman\", Georgia, serif;\n    --font-size: 11pt;\n    --title-size: 18pt;\n    --row-gap: 2mm;\n    --col-1-w: 16mm;  /* Sl. No. */\n    --col-2-w: 88mm;  /* Material name */\n    --col-3-w: 28mm;  /* Set. wt */\n    --col-4-w: 28mm;  /* Ach. wt */\n    --col-5-w: 24mm;  /* Error Kg */\n    --col-6-w: 20mm;  /* Error % */\n  }\n  html, body { height: 100%; }\n  body{\n    font-family: var(--font-main);\n    font-size: var(--font-size);\n    color: #000;\n    -webkit-print-color-adjust: exact;\n    print-color-adjust: exact;\n    font-variant-numeric: tabular-nums lining-nums;\n  }\n\n  /* Header box */\n  #report-header{\n    border: 1px solid #000;\n    padding: 6mm 6mm 4.5mm;\n    margin-bottom: 3.5mm;\n    position: relative; /* allow centering title over full box */\n  }\n  #report-header table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  #report-header col.col-l{ width: 52%; }\n  #report-header col.col-c{ width: 18%; }\n  #report-header col.col-r{ width: 30%; }\n\n  #report-header td{\n    vertical-align: top;\n    padding: 0;\n    line-height: 1.35;\n    white-space: nowrap;\n  }\n  #report-header .right-top{\n    text-align: right;\n  }\n  #report-header .title{\n    text-align: center;\n    font-weight: 700;\n    font-size: var(--title-size);\n    line-height: 1;\n    white-space: nowrap;\n    position: absolute;\n    left: 6mm;\n    right: 6mm;\n    top: 9.8mm; /* optically centered between header rows */\n  }\n  #report-header .recipe{\n    text-align: right;\n  }\n\n  /* Data table */\n  #data-table{\n    width: 100%;\n    border-collapse: collapse;\n    table-layout: fixed;\n  }\n  #data-table col.col-1{ width: var(--col-1-w); }\n  #data-table col.col-2{ width: var(--col-2-w); }\n  #data-table col.col-3{ width: var(--col-3-w); }\n  #data-table col.col-4{ width: var(--col-4-w); }\n  #data-table col.col-5{ width: var(--col-5-w); }\n  #data-table col.col-6{ width: var(--col-6-w); }\n\n  #data-table th, #data-table td{\n    border: 1px solid #000;\n    padding: 2mm 2.5mm;\n    line-height: 1.2;\n  }\n  #data-table thead th{\n    font-weight: 700;\n    text-align: left;\n    vertical-align: middle;\n  }\n  #data-table thead th.num{\n    text-align: right;\n  }\n  #data-table tbody td.num,\n  #data-table tfoot td.num{\n    text-align: right;\n  }\n  #data-table tbody td{\n    vertical-align: top;\n  }\n  #data-table tfoot td{\n    font-weight: 700;\n    background: #f2f2f2;\n  }\n\n  /* Pagination stability */\n  #report-header, #data-table { break-inside: avoid; page-break-inside: avoid; }\n\n  /* Footer */\n  footer{\n    position: fixed;\n    left: 16mm; right: 16mm; bottom: 9mm;\n    font-size: 10pt;\n    color: #000;\n  }\n  footer .bar{\n    position: relative;\n    height: 12pt;\n  }\n  footer .bar > :first-child{\n    position: absolute;\n    left: 0;\n  }\n  footer .bar > :last-child{\n    position: absolute;\n    left: 50%;\n    transform: translateX(-50%);\n  }\n</style>\n</head>\n<body>\n\n<div id=\"report-header\">\n  <table>\n    <colgroup>\n      <col class=\"col-l\" />\n      <col class=\"col-c\" />\n      <col class=\"col-r\" />\n    </colgroup>\n    <tr>\n      <td class=\"left-block\">\n        <div>Plant name : {plant_name}</div>\n        <div>Location : {location}</div>\n      </td>\n      <td></td>\n      <td class=\"right-top\">\n        <div>From Date: {from_date} \u00a0\u00a0To {to_date}</div>\n      </td>\n    </tr>\n    <tr>\n      <td class=\"left-block\">\n        <div>Print Date \u00a0: {print_date}</div>\n      </td>\n      <td class=\"title\" colspan=\"1\">Consumption report</td>\n      <td class=\"recipe\">Recipe code : {recipe_code}</td>\n    </tr>\n  </table>\n</div>\n\n<table id=\"data-table\">\n  <colgroup>\n    <col class=\"col-1\" />\n    <col class=\"col-2\" />\n    <col class=\"col-3\" />\n    <col class=\"col-4\" />\n    <col class=\"col-5\" />\n    <col class=\"col-6\" />\n  </colgroup>\n  <thead>\n    <tr>\n      <th data-label=\"Sl. No.\">Sl. No.</th>\n      <th data-label=\"Material name\">Material name</th>\n      <th class=\"num\" data-label=\"Set. wt(Kg)\">Set. wt(Kg)</th>\n      <th class=\"num\" data-label=\"Ach. wt(Kg)\">Ach. wt(Kg)</th>\n      <th class=\"num\" data-label=\"Error(Kg)\">Error(Kg)</th>\n      <th class=\"num\" data-label=\"Error %\">Error %</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>{row_sl_no}</td>\n      <td>{row_material_name}</td>\n      <td class=\"num\">{row_set_wt}</td>\n      <td class=\"num\">{row_ach_wt}</td>\n      <td class=\"num\">{row_error_kg}</td>\n      <td class=\"num\">{row_error_pct}</td>\n    </tr>\n  </tbody>\n  <tfoot>\n    <tr id=\"report-totals\">\n      <td colspan=\"2\">Total</td>\n      <td class=\"num\">{total_set_wt}</td>\n      <td class=\"num\">{total_ach_wt}</td>\n      <td class=\"num\">{total_error_kg}</td>\n      <td class=\"num\">{total_error_pct}</td>\n    </tr>\n  </tfoot>\n</table>\n\n<footer>\n  <div class=\"bar\">\n    <div>Indian Industrial Machines Pvt. Ltd.</div>\n    <div>Page 1 of 1</div>\n  </div>\n</footer>\n\n</body>\n</html>\n<!--END_HTML-->",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761306010,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 5878,
    "prompt_tokens": 3720,
    "total_tokens": 9598,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 4224,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T11:46:29Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CUAV8rDE0oMzpYxRKCqOF8vhWtfh7",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_weight\": \"UNRESOLVED\",\n    \"achieved_weight\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_percent\": \"UNRESOLVED\",\n\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"print_date\": \"params.print_date\",\n    \"recipe_code\": \"params.recipe_code\",\n\n    \"row_sl_no\": \"UNRESOLVED\",\n    \"row_material_name\": \"UNRESOLVED\",\n    \"row_set_wt\": \"UNRESOLVED\",\n    \"row_ach_wt\": \"UNRESOLVED\",\n    \"row_error_kg\": \"UNRESOLVED\",\n    \"row_error_pct\": \"UNRESOLVED\",\n\n    \"total_set_wt\": \"COALESCE(recipes.bin1_sp,0) + COALESCE(recipes.bin2_sp,0) + COALESCE(recipes.bin3_sp,0) + COALESCE(recipes.bin4_sp,0) + COALESCE(recipes.bin5_sp,0) + COALESCE(recipes.bin6_sp,0) + COALESCE(recipes.bin7_sp,0) + COALESCE(recipes.bin8_sp,0) + COALESCE(recipes.bin9_sp,0) + COALESCE(recipes.bin10_sp,0) + COALESCE(recipes.bin11_sp,0) + COALESCE(recipes.bin12_sp,0)\",\n    \"total_ach_wt\": \"COALESCE(recipes.bin1_act,0) + COALESCE(recipes.bin2_act,0) + COALESCE(recipes.bin3_act,0) + COALESCE(recipes.bin4_act,0) + COALESCE(recipes.bin5_act,0) + COALESCE(recipes.bin6_act,0) + COALESCE(recipes.bin7_act,0) + COALESCE(recipes.bin8_act,0) + COALESCE(recipes.bin9_act,0) + COALESCE(recipes.bin10_act,0) + COALESCE(recipes.bin11_act,0) + COALESCE(recipes.bin12_act,0)\",\n    \"total_error_kg\": \"(COALESCE(recipes.bin1_act,0)-COALESCE(recipes.bin1_sp,0)) + (COALESCE(recipes.bin2_act,0)-COALESCE(recipes.bin2_sp,0)) + (COALESCE(recipes.bin3_act,0)-COALESCE(recipes.bin3_sp,0)) + (COALESCE(recipes.bin4_act,0)-COALESCE(recipes.bin4_sp,0)) + (COALESCE(recipes.bin5_act,0)-COALESCE(recipes.bin5_sp,0)) + (COALESCE(recipes.bin6_act,0)-COALESCE(recipes.bin6_sp,0)) + (COALESCE(recipes.bin7_act,0)-COALESCE(recipes.bin7_sp,0)) + (COALESCE(recipes.bin8_act,0)-COALESCE(recipes.bin8_sp,0)) + (COALESCE(recipes.bin9_act,0)-COALESCE(recipes.bin9_sp,0)) + (COALESCE(recipes.bin10_act,0)-COALESCE(recipes.bin10_sp,0)) + (COALESCE(recipes.bin11_act,0)-COALESCE(recipes.bin11_sp,0)) + (COALESCE(recipes.bin12_act,0)-COALESCE(recipes.bin12_sp,0))\",\n    \"total_error_pct\": \"CASE WHEN (COALESCE(recipes.bin1_sp,0)+COALESCE(recipes.bin2_sp,0)+COALESCE(recipes.bin3_sp,0)+COALESCE(recipes.bin4_sp,0)+COALESCE(recipes.bin5_sp,0)+COALESCE(recipes.bin6_sp,0)+COALESCE(recipes.bin7_sp,0)+COALESCE(recipes.bin8_sp,0)+COALESCE(recipes.bin9_sp,0)+COALESCE(recipes.bin10_sp,0)+COALESCE(recipes.bin11_sp,0)+COALESCE(recipes.bin12_sp,0)) = 0 THEN NULL ELSE ((COALESCE(recipes.bin1_act,0)+COALESCE(recipes.bin2_act,0)+COALESCE(recipes.bin3_act,0)+COALESCE(recipes.bin4_act,0)+COALESCE(recipes.bin5_act,0)+COALESCE(recipes.bin6_act,0)+COALESCE(recipes.bin7_act,0)+COALESCE(recipes.bin8_act,0)+COALESCE(recipes.bin9_act,0)+COALESCE(recipes.bin10_act,0)+COALESCE(recipes.bin11_act,0)+COALESCE(recipes.bin12_act,0)) - (COALESCE(recipes.bin1_sp,0)+COALESCE(recipes.bin2_sp,0)+COALESCE(recipes.bin3_sp,0)+COALESCE(recipes.bin4_sp,0)+COALESCE(recipes.bin5_sp,0)+COALESCE(recipes.bin6_sp,0)+COALESCE(recipes.bin7_sp,0)+COALESCE(recipes.bin8_sp,0)+COALESCE(recipes.bin9_sp,0)+COALESCE(recipes.bin10_sp,0)+COALESCE(recipes.bin11_sp,0)+COALESCE(recipes.bin12_sp,0))) / (COALESCE(recipes.bin1_sp,0)+COALESCE(recipes.bin2_sp,0)+COALESCE(recipes.bin3_sp,0)+COALESCE(recipes.bin4_sp,0)+COALESCE(recipes.bin5_sp,0)+COALESCE(recipes.bin6_sp,0)+COALESCE(recipes.bin7_sp,0)+COALESCE(recipes.bin8_sp,0)+COALESCE(recipes.bin9_sp,0)+COALESCE(recipes.bin10_sp,0)+COALESCE(recipes.bin11_sp,0)+COALESCE(recipes.bin12_sp,0)) END\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"print_date\": \"25/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"row_sl_no\": \"1\",\n    \"row_material_name\": \"CM 100 + DORB 100 KRR\",\n    \"row_set_wt\": \"11,800.00\",\n    \"row_ach_wt\": \"11,803.20\",\n    \"row_error_kg\": \"3.20\",\n    \"row_error_pct\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_weight\",\n      \"achieved_weight\",\n      \"error_kg\",\n      \"error_percent\",\n      \"row_sl_no\",\n      \"row_material_name\",\n      \"row_set_wt\",\n      \"row_ach_wt\",\n      \"row_error_kg\",\n      \"row_error_pct\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_sp\",\"recipes.bin2_sp\",\"recipes.bin3_sp\",\"recipes.bin4_sp\",\"recipes.bin5_sp\",\"recipes.bin6_sp\",\"recipes.bin7_sp\",\"recipes.bin8_sp\",\"recipes.bin9_sp\",\"recipes.bin10_sp\",\"recipes.bin11_sp\",\"recipes.bin12_sp\"] },\n      \"total_ach_wt\": { \"op\": \"SUM\", \"over\": [\"recipes.bin1_act\",\"recipes.bin2_act\",\"recipes.bin3_act\",\"recipes.bin4_act\",\"recipes.bin5_act\",\"recipes.bin6_act\",\"recipes.bin7_act\",\"recipes.bin8_act\",\"recipes.bin9_act\",\"recipes.bin10_act\",\"recipes.bin11_act\",\"recipes.bin12_act\"] }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761306242,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6893,
    "prompt_tokens": 3796,
    "total_tokens": 10689,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5056,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T11:46:53Z - llm_call_3_v7

```json
{
  "id": "chatcmpl-CUAV9BAfVHY5nE4LU3B8RRIFAzRSo",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"mapping\": {\n    \"sl_no\": \"UNRESOLVED\",\n    \"material_name\": \"UNRESOLVED\",\n    \"set_weight\": \"UNRESOLVED\",\n    \"achieved_weight\": \"UNRESOLVED\",\n    \"error_kg\": \"UNRESOLVED\",\n    \"error_percent\": \"UNRESOLVED\",\n    \"plant_name\": \"params.plant_name\",\n    \"location\": \"params.location\",\n    \"from_date\": \"To Be Selected...\",\n    \"to_date\": \"To Be Selected...\",\n    \"print_date\": \"params.print_date\",\n    \"recipe_code\": \"recipes.recipe_name\",\n    \"row_sl_no\": \"UNRESOLVED\",\n    \"row_material_name\": \"UNRESOLVED\",\n    \"row_set_wt\": \"UNRESOLVED\",\n    \"row_ach_wt\": \"UNRESOLVED\",\n    \"row_error_kg\": \"UNRESOLVED\",\n    \"row_error_pct\": \"UNRESOLVED\",\n    \"total_set_wt\": \"(recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)\",\n    \"total_ach_wt\": \"(recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act)\",\n    \"total_error_kg\": \"((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp))\",\n    \"total_error_pct\": \"((recipes.bin1_act + recipes.bin2_act + recipes.bin3_act + recipes.bin4_act + recipes.bin5_act + recipes.bin6_act + recipes.bin7_act + recipes.bin8_act + recipes.bin9_act + recipes.bin10_act + recipes.bin11_act + recipes.bin12_act) - (recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp)) / NULLIF((recipes.bin1_sp + recipes.bin2_sp + recipes.bin3_sp + recipes.bin4_sp + recipes.bin5_sp + recipes.bin6_sp + recipes.bin7_sp + recipes.bin8_sp + recipes.bin9_sp + recipes.bin10_sp + recipes.bin11_sp + recipes.bin12_sp), 0)\"\n  },\n  \"token_samples\": {\n    \"plant_name\": \"SSR AQUA\",\n    \"location\": \"Gudivada\",\n    \"from_date\": \"24/03/2024\",\n    \"to_date\": \"24/03/2024\",\n    \"print_date\": \"25/03/2024\",\n    \"recipe_code\": \"GANGADHAR-2024\",\n    \"row_sl_no\": \"1\",\n    \"row_material_name\": \"CM 100 + DORB 100 KRR\",\n    \"row_set_wt\": \"11,800.00\",\n    \"row_ach_wt\": \"11,803.20\",\n    \"row_error_kg\": \"3.20\",\n    \"row_error_pct\": \"0.0271\",\n    \"total_set_wt\": \"80,000.00\",\n    \"total_ach_wt\": \"80,016.00\",\n    \"total_error_kg\": \"16.00\",\n    \"total_error_pct\": \"0.0200\"\n  },\n  \"meta\": {\n    \"unresolved\": [\n      \"sl_no\",\n      \"material_name\",\n      \"set_weight\",\n      \"achieved_weight\",\n      \"error_kg\",\n      \"error_percent\",\n      \"row_sl_no\",\n      \"row_material_name\",\n      \"row_set_wt\",\n      \"row_ach_wt\",\n      \"row_error_kg\",\n      \"row_error_pct\"\n    ],\n    \"hints\": {\n      \"total_set_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_sp\",\n          \"recipes.bin2_sp\",\n          \"recipes.bin3_sp\",\n          \"recipes.bin4_sp\",\n          \"recipes.bin5_sp\",\n          \"recipes.bin6_sp\",\n          \"recipes.bin7_sp\",\n          \"recipes.bin8_sp\",\n          \"recipes.bin9_sp\",\n          \"recipes.bin10_sp\",\n          \"recipes.bin11_sp\",\n          \"recipes.bin12_sp\"\n        ]\n      },\n      \"total_ach_wt\": {\n        \"op\": \"SUM\",\n        \"over\": [\n          \"recipes.bin1_act\",\n          \"recipes.bin2_act\",\n          \"recipes.bin3_act\",\n          \"recipes.bin4_act\",\n          \"recipes.bin5_act\",\n          \"recipes.bin6_act\",\n          \"recipes.bin7_act\",\n          \"recipes.bin8_act\",\n          \"recipes.bin9_act\",\n          \"recipes.bin10_act\",\n          \"recipes.bin11_act\",\n          \"recipes.bin12_act\"\n        ]\n      }\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761306243,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 8060,
    "prompt_tokens": 3796,
    "total_tokens": 11856,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 6848,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 3712
    }
  }
}
```

## 2025-10-24T11:51:25Z - llm_call_3_5

```json
{
  "id": "chatcmpl-CUAaRrC2nYr1u0YgGZLt88unFH50h",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"final_template_html\": \"\\n<html>\\n<head>\\n<meta charset=\\\"utf-8\\\" />\\n<title>Consumption report</title>\\n<style>\\n  @page { size: A4; margin: 14mm 16mm; }\\n  :root{\\n    --font-main: \\\"Times New Roman\\\", Georgia, serif;\\n    --font-size: 11pt;\\n    --title-size: 18pt;\\n    --row-gap: 2mm;\\n    --col-1-w: 16mm;  /* Sl. No. */\\n    --col-2-w: 72mm;  /* Material name (reduced) */\\n    --col-3-w: 28mm;  /* Set. wt */\\n    --col-4-w: 28mm;  /* Ach. wt */\\n    --col-5-w: 24mm;  /* Error Kg */\\n    --col-6-w: 36mm;  /* Error % (increased) */\\n  }\\n  html, body { height: 100%; }\\n  body{\\n    font-family: var(--font-main);\\n    font-size: var(--font-size);\\n    color: #000;\\n    -webkit-print-color-adjust: exact;\\n    print-color-adjust: exact;\\n    font-variant-numeric: tabular-nums lining-nums;\\n  }\\n\\n  /* Header box */\\n  #report-header{\\n    border: 1px solid #000;\\n    padding: 6mm 6mm 4.5mm;\\n    margin-bottom: 3.5mm;\\n    position: relative; /* allow centering title over full box */\\n  }\\n  #report-header table{\\n    width: 100%;\\n    border-collapse: collapse;\\n    table-layout: fixed;\\n  }\\n  #report-header col.col-l{ width: 52%; }\\n  #report-header col.col-c{ width: 18%; }\\n  #report-header col.col-r{ width: 30%; }\\n\\n  #report-header td{\\n    vertical-align: top;\\n    padding: 0;\\n    line-height: 1.35;\\n    white-space: nowrap;\\n  }\\n  #report-header .right-top{\\n    text-align: right;\\n  }\\n  #report-header .title{\\n    text-align: center;\\n    font-weight: 700;\\n    font-size: var(--title-size);\\n    line-height: 1;\\n    white-space: nowrap;\\n    position: absolute;\\n    left: 6mm;\\n    right: 6mm;\\n    top: 9.8mm; /* optically centered between header rows */\\n  }\\n  #report-header .recipe{\\n    text-align: right;\\n  }\\n\\n  /* Data table */\\n  #data-table{\\n    width: 100%;\\n    border-collapse: collapse;\\n    table-layout: fixed;\\n  }\\n  #data-table col.col-1{ width: var(--col-1-w); }\\n  #data-table col.col-2{ width: var(--col-2-w); }\\n  #data-table col.col-3{ width: var(--col-3-w); }\\n  #data-table col.col-4{ width: var(--col-4-w); }\\n  #data-table col.col-5{ width: var(--col-5-w); }\\n  #data-table col.col-6{ width: var(--col-6-w); }\\n\\n  #data-table th, #data-table td{\\n    border: 1px solid #000;\\n    padding: 2mm 2.5mm;\\n    line-height: 1.2;\\n  }\\n  #data-table thead th{\\n    font-weight: 700;\\n    text-align: left;\\n    vertical-align: middle;\\n  }\\n  #data-table thead th.num{\\n    text-align: right;\\n  }\\n  #data-table tbody td.num,\\n  #data-table tfoot td.num{\\n    text-align: right;\\n  }\\n  #data-table tbody td{\\n    vertical-align: top;\\n  }\\n  #data-table tfoot td{\\n    font-weight: 700;\\n  }\\n\\n  /* Pagination stability */\\n  #report-header, #data-table { break-inside: avoid; page-break-inside: avoid; }\\n\\n  /* Footer */\\n  footer{\\n    position: fixed;\\n    left: 16mm; right: 16mm; bottom: 9mm;\\n    font-size: 10pt;\\n    color: #000;\\n  }\\n  footer .bar{\\n    position: relative;\\n    height: 12pt;\\n  }\\n  footer .bar > :first-child{\\n    position: absolute;\\n    left: 0;\\n  }\\n  footer .bar > :last-child{\\n    position: absolute;\\n    left: 50%;\\n    transform: translateX(-50%);\\n  }\\n</style>\\n</head>\\n<body>\\n\\n<div id=\\\"report-header\\\">\\n  <table>\\n    <colgroup>\\n      <col class=\\\"col-l\\\" />\\n      <col class=\\\"col-c\\\" />\\n      <col class=\\\"col-r\\\" />\\n    </colgroup>\\n    <tr>\\n      <td class=\\\"left-block\\\">\\n        <div>Plant name : SSR AQUA</div>\\n        <div>Location : Gudivada</div>\\n      </td>\\n      <td></td>\\n      <td class=\\\"right-top\\\">\\n        <div>From Date: {from_date} \u00a0\u00a0To {to_date}</div>\\n      </td>\\n    </tr>\\n    <tr>\\n      <td class=\\\"left-block\\\">\\n        <div>Print Date \u00a0: {print_date}</div>\\n      </td>\\n      <td class=\\\"title\\\" colspan=\\\"1\\\">Consumption report</td>\\n      <td class=\\\"recipe\\\">Recipe code : {recipe_code}</td>\\n    </tr>\\n  </table>\\n</div>\\n\\n<table id=\\\"data-table\\\">\\n  <colgroup>\\n    <col class=\\\"col-1\\\" />\\n    <col class=\\\"col-2\\\" />\\n    <col class=\\\"col-3\\\" />\\n    <col class=\\\"col-4\\\" />\\n    <col class=\\\"col-5\\\" />\\n    <col class=\\\"col-6\\\" />\\n  </colgroup>\\n  <thead>\\n    <tr>\\n      <th data-label=\\\"Sl. No.\\\">Sl. No.</th>\\n      <th data-label=\\\"Material name\\\">Material name</th>\\n      <th class=\\\"num\\\" data-label=\\\"Set. wt(Kg)\\\">Set. wt(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"Ach. wt(Kg)\\\">Ach. wt(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"Error(Kg)\\\">Error(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"Error %\\\">Error %</th>\\n    </tr>\\n  </thead>\\n  <tbody>\\n    <tr>\\n      <td>{row_sl_no}</td>\\n      <td>{row_material_name}</td>\\n      <td class=\\\"num\\\">{row_set_wt}</td>\\n      <td class=\\\"num\\\">{row_ach_wt}</td>\\n      <td class=\\\"num\\\">{row_error_kg}</td>\\n      <td class=\\\"num\\\">{row_error_pct}</td>\\n    </tr>\\n  </tbody>\\n  <tfoot>\\n    <tr id=\\\"report-totals\\\">\\n      <td colspan=\\\"2\\\">Total</td>\\n      <td class=\\\"num\\\">{total_set_wt}</td>\\n      <td class=\\\"num\\\">{total_ach_wt}</td>\\n      <td class=\\\"num\\\">{total_error_kg}</td>\\n      <td class=\\\"num\\\">{total_error_pct}</td>\\n    </tr>\\n  </tfoot>\\n</table>\\n\\n<footer>\\n  <div class=\\\"bar\\\">\\n    <div>Indian Industrial Machines Pvt. Ltd.</div>\\n    <div>Page {page_no} of {page_count}</div>\\n  </div>\\n</footer>\\n\\n</body>\\n</html>\",\n  \"page_summary\": \"Applied user-requested layout tweaks: reduced the Material name column width and significantly increased Error % width by updating CSS variables (--col-2-w \u2192 72mm, --col-6-w \u2192 36mm). Removed the gray background from the totals row by dropping the background style on #data-table tfoot td. Replaced the static footer text \u201cPage 1 of 1\u201d with placeholder tokens: Page {page_no} of {page_count}.\\nConstants inlined from INPUT_SAMPLE: plant_name \u2192 \u201cSSR AQUA\u201d; location \u2192 \u201cGudivada\u201d. These now render as literals in the header. All other tokens remain dynamic.\\nUnresolved/dynamic fields: from_date, to_date, print_date (marked LATER_SELECTED); recipe_code (mapped to recipes.recipe_name); all row fields {row_sl_no, row_material_name, row_set_wt, row_ach_wt, row_error_kg, row_error_pct}; totals {total_set_wt, total_ach_wt, total_error_kg, total_error_pct} which are mapped to SQL expressions and not inlined.\\nFooter pagination tokens introduced: {page_no}, {page_count} (not present in the original schema; they will need bindings at generation time).\\nSample values observed (for reference only, not inlined unless noted): dates 24/03/2024 (from/to), print date 25/03/2024; recipe_code sample \u201cGANGADHAR-2024\u201d; totals sample values 80,000.00 (set), 80,016.00 (achieved), 16.00 (error kg), 0.0200 (error %). The schema also lists report_title but it is unused in the template. No numerical totals were hardcoded; visual emphasis on totals is now neutral due to background removal.\"\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761306571,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 5160,
    "prompt_tokens": 5159,
    "total_tokens": 10319,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 2880,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

## 2025-10-24T11:54:45Z - llm_call_3_5

```json
{
  "id": "chatcmpl-CUAe1NfYbfmejA5nPGZ05oU9aEoCX",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"final_template_html\": \"\\n<html>\\n<head>\\n<meta charset=\\\"utf-8\\\" />\\n<title>Consumption report</title>\\n<style>\\n  @page { size: A4; margin: 14mm 16mm; }\\n  :root{\\n    --font-main: \\\"Times New Roman\\\", Georgia, serif;\\n    --font-size: 11pt;\\n    --title-size: 18pt;\\n    --row-gap: 2mm;\\n    --col-1-w: 16mm;  /* Sl. No. */\\n    --col-2-w: 70mm;  /* Material name (reduced) */\\n    --col-3-w: 28mm;  /* Set. wt */\\n    --col-4-w: 28mm;  /* Ach. wt */\\n    --col-5-w: 24mm;  /* Error Kg */\\n    --col-6-w: 38mm;  /* Error % (increased) */\\n  }\\n  html, body { height: 100%; }\\n  body{\\n    font-family: var(--font-main);\\n    font-size: var(--font-size);\\n    color: #000;\\n    -webkit-print-color-adjust: exact;\\n    print-color-adjust: exact;\\n    font-variant-numeric: tabular-nums lining-nums;\\n  }\\n\\n  /* Header box */\\n  #report-header{\\n    border: 1px solid #000;\\n    padding: 6mm 6mm 4.5mm;\\n    margin-bottom: 3.5mm;\\n    position: relative; /* allow centering title over full box */\\n  }\\n  #report-header table{\\n    width: 100%;\\n    border-collapse: collapse;\\n    table-layout: fixed;\\n  }\\n  #report-header col.col-l{ width: 52%; }\\n  #report-header col.col-c{ width: 18%; }\\n  #report-header col.col-r{ width: 30%; }\\n\\n  #report-header td{\\n    vertical-align: top;\\n    padding: 0;\\n    line-height: 1.35;\\n    white-space: nowrap;\\n  }\\n  #report-header .right-top{\\n    text-align: right;\\n  }\\n  #report-header .title{\\n    text-align: center;\\n    font-weight: 700;\\n    font-size: var(--title-size);\\n    line-height: 1;\\n    white-space: nowrap;\\n    position: absolute;\\n    left: 6mm;\\n    right: 6mm;\\n    top: 9.8mm; /* optically centered between header rows */\\n  }\\n  #report-header .recipe{\\n    text-align: right;\\n  }\\n\\n  /* Data table */\\n  #data-table{\\n    width: 100%;\\n    border-collapse: collapse;\\n    table-layout: fixed;\\n  }\\n  #data-table col.col-1{ width: var(--col-1-w); }\\n  #data-table col.col-2{ width: var(--col-2-w); }\\n  #data-table col.col-3{ width: var(--col-3-w); }\\n  #data-table col.col-4{ width: var(--col-4-w); }\\n  #data-table col.col-5{ width: var(--col-5-w); }\\n  #data-table col.col-6{ width: var(--col-6-w); }\\n\\n  #data-table th, #data-table td{\\n    border: 1px solid #000;\\n    padding: 2mm 2.5mm;\\n    line-height: 1.2;\\n  }\\n  #data-table thead th{\\n    font-weight: 700;\\n    text-align: left;\\n    vertical-align: middle;\\n  }\\n  #data-table thead th.num{\\n    text-align: right;\\n  }\\n  #data-table tbody td.num,\\n  #data-table tfoot td.num{\\n    text-align: right;\\n  }\\n  #data-table tbody td{\\n    vertical-align: top;\\n  }\\n  #data-table tfoot td{\\n    font-weight: 700;\\n  }\\n\\n  /* Pagination stability */\\n  #report-header, #data-table { break-inside: avoid; page-break-inside: avoid; }\\n\\n  /* Footer */\\n  footer{\\n    position: fixed;\\n    left: 16mm; right: 16mm; bottom: 9mm;\\n    font-size: 10pt;\\n    color: #000;\\n  }\\n  footer .bar{\\n    position: relative;\\n    height: 12pt;\\n  }\\n  footer .bar > :first-child{\\n    position: absolute;\\n    left: 0;\\n  }\\n  footer .bar > :last-child{\\n    position: absolute;\\n    left: 50%;\\n    transform: translateX(-50%);\\n  }\\n</style>\\n</head>\\n<body>\\n\\n<div id=\\\"report-header\\\">\\n  <table>\\n    <colgroup>\\n      <col class=\\\"col-l\\\" />\\n      <col class=\\\"col-c\\\" />\\n      <col class=\\\"col-r\\\" />\\n    </colgroup>\\n    <tr>\\n      <td class=\\\"left-block\\\">\\n        <div>Plant name : SSR AQUA</div>\\n        <div>Location : Gudivada</div>\\n      </td>\\n      <td></td>\\n      <td class=\\\"right-top\\\">\\n        <div>From Date: {from_date} \u00a0\u00a0To {to_date}</div>\\n      </td>\\n    </tr>\\n    <tr>\\n      <td class=\\\"left-block\\\">\\n        <div>Print Date \u00a0: {print_date}</div>\\n      </td>\\n      <td class=\\\"title\\\" colspan=\\\"1\\\">Consumption report</td>\\n      <td class=\\\"recipe\\\">Recipe code : {recipe_code}</td>\\n    </tr>\\n  </table>\\n</div>\\n\\n<table id=\\\"data-table\\\">\\n  <colgroup>\\n    <col class=\\\"col-1\\\" />\\n    <col class=\\\"col-2\\\" />\\n    <col class=\\\"col-3\\\" />\\n    <col class=\\\"col-4\\\" />\\n    <col class=\\\"col-5\\\" />\\n    <col class=\\\"col-6\\\" />\\n  </colgroup>\\n  <thead>\\n    <tr>\\n      <th data-label=\\\"Sl. No.\\\">Sl. No.</th>\\n      <th data-label=\\\"Material name\\\">Material name</th>\\n      <th class=\\\"num\\\" data-label=\\\"Set. wt(Kg)\\\">Set. wt(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"Ach. wt(Kg)\\\">Ach. wt(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"Error(Kg)\\\">Error(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"Error %\\\">Error %</th>\\n    </tr>\\n  </thead>\\n  <tbody>\\n    <tr>\\n      <td>{row_sl_no}</td>\\n      <td>{row_material_name}</td>\\n      <td class=\\\"num\\\">{row_set_wt}</td>\\n      <td class=\\\"num\\\">{row_ach_wt}</td>\\n      <td class=\\\"num\\\">{row_error_kg}</td>\\n      <td class=\\\"num\\\">{row_error_pct}</td>\\n    </tr>\\n  </tbody>\\n  <tfoot>\\n    <tr id=\\\"report-totals\\\">\\n      <td colspan=\\\"2\\\">Total</td>\\n      <td class=\\\"num\\\">{total_set_wt}</td>\\n      <td class=\\\"num\\\">{total_ach_wt}</td>\\n      <td class=\\\"num\\\">{total_error_kg}</td>\\n      <td class=\\\"num\\\">{total_error_pct}</td>\\n    </tr>\\n  </tfoot>\\n</table>\\n\\n<footer>\\n  <div class=\\\"bar\\\">\\n    <div>Indian Industrial Machines Pvt. Ltd.</div>\\n    <div>Page {page_number} of {page_count}</div>\\n  </div>\\n</footer>\\n\\n</body>\\n</html>\",\n  \"page_summary\": \"Applied user-requested layout tweaks: reduced Material name column width to 70mm and expanded Error % column width to 38mm via CSS variables. Removed the gray background from the totals row by deleting the background property in #data-table tfoot td while retaining bold text. Replaced the literal footer text \u201cPage 1 of 1\u201d with placeholder tokens: {page_number} and {page_count}.\\n\\nConstants inlined from INPUT_SAMPLE mapping: Plant name set to \u201cSSR AQUA\u201d and Location set to \u201cGudivada\u201d. All other fields remain as tokens: From/To dates {from_date}, {to_date}; Print Date {print_date}; Recipe code {recipe_code}; row fields {row_sl_no}, {row_material_name}, {row_set_wt}, {row_ach_wt}, {row_error_kg}, {row_error_pct}; totals {total_set_wt}, {total_ach_wt}, {total_error_kg}, {total_error_pct}. Totals still mapped to SQL expressions and will compute downstream. Page numbering now requires values for {page_number} and {page_count}. No other structure or repeat regions were changed.\"\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761306793,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 4062,
    "prompt_tokens": 5159,
    "total_tokens": 9221,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 1920,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 5120
    }
  }
}
```

## 2025-10-24T11:56:59Z - llm_call_3_5

```json
{
  "id": "chatcmpl-CUAfaVhXmHYgvPe6I18P15LgAozMR",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"final_template_html\": \"\\n<html>\\n<head>\\n<meta charset=\\\"utf-8\\\" />\\n<title>Consumption report</title>\\n<style>\\n  @page { size: A4; margin: 14mm 16mm; }\\n  :root{\\n    --font-main: \\\"Times New Roman\\\", Georgia, serif;\\n    --font-size: 11pt;\\n    --title-size: 18pt;\\n    --row-gap: 2mm;\\n    --col-1-w: 16mm;  /* Sl. No. */\\n    --col-2-w: 70mm;  /* Material name (reduced) */\\n    --col-3-w: 28mm;  /* Set. wt */\\n    --col-4-w: 28mm;  /* Ach. wt */\\n    --col-5-w: 24mm;  /* Error Kg */\\n    --col-6-w: 36mm;  /* Error % (increased) */\\n  }\\n  html, body { height: 100%; }\\n  body{\\n    font-family: var(--font-main);\\n    font-size: var(--font-size);\\n    color: #000;\\n    -webkit-print-color-adjust: exact;\\n    print-color-adjust: exact;\\n    font-variant-numeric: tabular-nums lining-nums;\\n  }\\n\\n  /* Header box */\\n  #report-header{\\n    border: 1px solid #000;\\n    padding: 6mm 6mm 4.5mm;\\n    margin-bottom: 3.5mm;\\n    position: relative; /* allow centering title over full box */\\n  }\\n  #report-header table{\\n    width: 100%;\\n    border-collapse: collapse;\\n    table-layout: fixed;\\n  }\\n  #report-header col.col-l{ width: 52%; }\\n  #report-header col.col-c{ width: 18%; }\\n  #report-header col.col-r{ width: 30%; }\\n\\n  #report-header td{\\n    vertical-align: top;\\n    padding: 0;\\n    line-height: 1.35;\\n    white-space: nowrap;\\n  }\\n  #report-header .right-top{\\n    text-align: right;\\n  }\\n  #report-header .title{\\n    text-align: center;\\n    font-weight: 700;\\n    font-size: var(--title-size);\\n    line-height: 1;\\n    white-space: nowrap;\\n    position: absolute;\\n    left: 6mm;\\n    right: 6mm;\\n    top: 9.8mm; /* optically centered between header rows */\\n  }\\n  #report-header .recipe{\\n    text-align: right;\\n  }\\n\\n  /* Data table */\\n  #data-table{\\n    width: 100%;\\n    border-collapse: collapse;\\n    table-layout: fixed;\\n  }\\n  #data-table col.col-1{ width: var(--col-1-w); }\\n  #data-table col.col-2{ width: var(--col-2-w); }\\n  #data-table col.col-3{ width: var(--col-3-w); }\\n  #data-table col.col-4{ width: var(--col-4-w); }\\n  #data-table col.col-5{ width: var(--col-5-w); }\\n  #data-table col.col-6{ width: var(--col-6-w); }\\n\\n  #data-table th, #data-table td{\\n    border: 1px solid #000;\\n    padding: 2mm 2.5mm;\\n    line-height: 1.2;\\n  }\\n  #data-table thead th{\\n    font-weight: 700;\\n    text-align: left;\\n    vertical-align: middle;\\n  }\\n  #data-table thead th.num{\\n    text-align: right;\\n  }\\n  #data-table tbody td.num,\\n  #data-table tfoot td.num{\\n    text-align: right;\\n  }\\n  #data-table tbody td{\\n    vertical-align: top;\\n  }\\n  #data-table tfoot td{\\n    font-weight: 700;\\n  }\\n\\n  /* Pagination stability */\\n  #report-header, #data-table { break-inside: avoid; page-break-inside: avoid; }\\n\\n  /* Footer */\\n  footer{\\n    position: fixed;\\n    left: 16mm; right: 16mm; bottom: 9mm;\\n    font-size: 10pt;\\n    color: #000;\\n  }\\n  footer .bar{\\n    position: relative;\\n    height: 12pt;\\n  }\\n  footer .bar > :first-child{\\n    position: absolute;\\n    left: 0;\\n  }\\n  footer .bar > :last-child{\\n    position: absolute;\\n    left: 50%;\\n    transform: translateX(-50%);\\n  }\\n</style>\\n</head>\\n<body>\\n\\n<div id=\\\"report-header\\\">\\n  <table>\\n    <colgroup>\\n      <col class=\\\"col-l\\\" />\\n      <col class=\\\"col-c\\\" />\\n      <col class=\\\"col-r\\\" />\\n    </colgroup>\\n    <tr>\\n      <td class=\\\"left-block\\\">\\n        <div>Plant name : SSR AQUA</div>\\n        <div>Location : Gudivada</div>\\n      </td>\\n      <td></td>\\n      <td class=\\\"right-top\\\">\\n        <div>From Date: {from_date} \u00a0\u00a0To {to_date}</div>\\n      </td>\\n    </tr>\\n    <tr>\\n      <td class=\\\"left-block\\\">\\n        <div>Print Date  : {print_date}</div>\\n      </td>\\n      <td class=\\\"title\\\" colspan=\\\"1\\\">Consumption report</td>\\n      <td class=\\\"recipe\\\">Recipe code : {recipe_code}</td>\\n    </tr>\\n  </table>\\n</div>\\n\\n<table id=\\\"data-table\\\">\\n  <colgroup>\\n    <col class=\\\"col-1\\\" />\\n    <col class=\\\"col-2\\\" />\\n    <col class=\\\"col-3\\\" />\\n    <col class=\\\"col-4\\\" />\\n    <col class=\\\"col-5\\\" />\\n    <col class=\\\"col-6\\\" />\\n  </colgroup>\\n  <thead>\\n    <tr>\\n      <th data-label=\\\"Sl. No.\\\">Sl. No.</th>\\n      <th data-label=\\\"Material name\\\">Material name</th>\\n      <th class=\\\"num\\\" data-label=\\\"Set. wt(Kg)\\\">Set. wt(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"Ach. wt(Kg)\\\">Ach. wt(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"Error(Kg)\\\">Error(Kg)</th>\\n      <th class=\\\"num\\\" data-label=\\\"Error %\\\">Error %</th>\\n    </tr>\\n  </thead>\\n  <tbody>\\n    <tr>\\n      <td>{row_sl_no}</td>\\n      <td>{row_material_name}</td>\\n      <td class=\\\"num\\\">{row_set_wt}</td>\\n      <td class=\\\"num\\\">{row_ach_wt}</td>\\n      <td class=\\\"num\\\">{row_error_kg}</td>\\n      <td class=\\\"num\\\">{row_error_pct}</td>\\n    </tr>\\n  </tbody>\\n  <tfoot>\\n    <tr id=\\\"report-totals\\\">\\n      <td colspan=\\\"2\\\">Total</td>\\n      <td class=\\\"num\\\">{total_set_wt}</td>\\n      <td class=\\\"num\\\">{total_ach_wt}</td>\\n      <td class=\\\"num\\\">{total_error_kg}</td>\\n      <td class=\\\"num\\\">{total_error_pct}</td>\\n    </tr>\\n  </tfoot>\\n</table>\\n\\n<footer>\\n  <div class=\\\"bar\\\">\\n    <div>Indian Industrial Machines Pvt. Ltd.</div>\\n    <div>Page [page_number] of [page_count]</div>\\n  </div>\\n</footer>\\n\\n</body>\\n</html>\",\n  \"page_summary\": \"Applied the requested layout adjustments: the Material name column width was reduced (col-2-w set to 70mm) and the Error % column width was increased significantly (col-6-w set to 36mm). The gray background on the totals row was removed; totals cells remain bold only. For the footer, the static page string was changed to a neutral placeholder text using square-bracket tags: \u201cPage [page_number] of [page_count]\u201d to avoid introducing new curly-brace tokens. Constants inlined per mapping: plant_name = \u201cSSR AQUA\u201d, location = \u201cGudivada\u201d. All other fields remain dynamic tokens: from_date, to_date, print_date, recipe_code, row_sl_no, row_material_name, row_set_wt, row_ach_wt, row_error_kg, row_error_pct, and totals tokens (total_set_wt, total_ach_wt, total_error_kg, total_error_pct) which are mapped to SQL expressions. Uncertainties: dates and recipe code are unresolved; page markers [page_number]/[page_count] are placeholders and not bound to the token mapping. No repeat structures or row prototypes were altered.\"\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761306890,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6047,
    "prompt_tokens": 5191,
    "total_tokens": 11238,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 3904,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 5120
    }
  }
}
```

## 2025-10-24T12:00:08Z - contract_build_v2

```json
{
  "id": "chatcmpl-CUAi9qaajc7112NKurcErrDI0qknS",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "content": "{\n  \"overview_md\": \"Executive Summary\\n- Goal: Build a consumption report over a date range (from_date/to_date) optionally filtered by a specific recipe_code. Rows list materials used (from 12 recipe bins unpivoted into long form) with Set wt, Ach wt, Error Kg, and Error %. Totals are derived from the rows. Header fields show the selected period, print date, and the (optional) recipe code. Plant name and location were inlined in the HTML, but remain available as pass-through parameters.\\n- Reshaping: Unpivot recipes.bin1..bin12 content/SP/ACT into a long_bins staging set (one row per bin per recipe run). Drop blank/NULL material names before grouping. Group rows by normalized material name (TRIM) across all filtered recipe runs, summing set/achieved weights.\\n- Ordering: Rows sorted by material name (ascending), with stable tie-breakers on set, achieved, and error for deterministic row numbering.\\n- Totals: Computed from the rows dataset to ensure consistency with any filters applied.\\n\\nToken Inventory\\n- Scalars: plant_name, location, from_date, to_date, print_date, recipe_code, report_title\\n- Row tokens: row_sl_no, row_material_name, row_set_wt, row_ach_wt, row_error_kg, row_error_pct\\n- Totals: total_set_wt, total_ach_wt, total_error_kg, total_error_pct\\n\\nMapping Table\\n- plant_name -> PARAM:plant_name (pass-through; not used in SQL filtering)\\n- location -> PARAM:location (pass-through; not used in SQL filtering)\\n- from_date -> PARAM:from_date (required filter lower bound on recipes.start_time)\\n- to_date -> PARAM:to_date (required filter upper bound on recipes.start_time)\\n- print_date -> PARAM:print_date (pass-through for header)\\n- recipe_code -> PARAM:recipe_code (optional filter equals recipes.recipe_name; also header)\\n- report_title -> 'Consumption report' (SQL string literal)\\n- row_sl_no -> ROW_NUMBER() OVER (ORDER BY TRIM(rows.row_material_name) ASC, rows.row_set_wt DESC, rows.row_ach_wt DESC, rows.row_error_kg DESC)\\n- row_material_name -> TRIM(long_bins.material_name)\\n- row_set_wt -> SUM(COALESCE(long_bins.set_wt_kg, 0))\\n- row_ach_wt -> SUM(COALESCE(long_bins.ach_wt_kg, 0))\\n- row_error_kg -> SUM(COALESCE(long_bins.ach_wt_kg, 0)) - SUM(COALESCE(long_bins.set_wt_kg, 0))\\n- row_error_pct -> CASE WHEN SUM(COALESCE(long_bins.set_wt_kg, 0)) = 0 THEN NULL ELSE (SUM(COALESCE(long_bins.ach_wt_kg, 0)) - SUM(COALESCE(long_bins.set_wt_kg, 0))) / NULLIF(SUM(COALESCE(long_bins.set_wt_kg, 0)), 0) END\\n- total_set_wt -> SUM(rows.row_set_wt)\\n- total_ach_wt -> SUM(rows.row_ach_wt)\\n- total_error_kg -> SUM(rows.row_error_kg)\\n- total_error_pct -> SUM(rows.row_error_kg) / NULLIF(SUM(rows.row_set_wt), 0)\\n\\nJoin & Date Rules\\n- Tables: recipes (only). No child tables.\\n- Date column: recipes.start_time is the primary filter column.\\n- Date filter semantics: inclusive range on calendar date. Apply WHERE CAST/convert recipes.start_time to date and ensure recipes.start_time::date BETWEEN :from_date AND :to_date (Postgres) or date(recipes.start_time) BETWEEN :from_date AND :to_date (SQLite). Call 5 should generate the dialect-appropriate cast using the provided date_columns hint.\\n- Optional filter: recipe_code applies equality predicate recipes.recipe_name = :recipe_code only when the parameter is provided and non-empty.\\n\\nTransformations\\n- Stage: base_recipes: recipes filtered by date range and optional recipe code.\\n- Stage: long_bins (UNION ALL): 12 SELECTs projecting columns: material_name, set_wt_kg, ach_wt_kg, bin_index from the respective binX_* columns of base_recipes. Apply TRIM to content at projection time for normalization.\\n- Pre-aggregation filter: Drop rows where TRIM(material_name) IS NULL or '' (blank content). Keep zero weights to preserve accurate error math (they will be summed; percent guards prevent divide-by-zero).\\n- Rows dataset (grouped): group by TRIM(material_name). Compute row_set_wt, row_ach_wt, row_error_kg, row_error_pct using the exact expressions listed above. Compute row_sl_no via ROW_NUMBER() over the final ordered result.\\n- Totals dataset: derived by summing the rows dataset, mirroring the totals_math contract expressions to keep results consistent with filters and grouping.\\n\\nParameters\\n- Required: from_date (date), to_date (date), print_date (date or string to display as-is in header)\\n- Optional: recipe_code (string; when non-empty, enforce equality filter on recipes.recipe_name), plant_name (string; header-only pass-through, not used in SQL), location (string; header-only pass-through, not used in SQL)\\n- report_title is not a parameter; it is a fixed SQL literal ('Consumption report').\\n\\nChecklist for Step 5\\n- Use only recipes.* columns provided in catalog.\\n- Apply required date filter on recipes.start_time (inclusive on date) before unpivoting.\\n- Apply optional equality filter recipes.recipe_name = :recipe_code only when non-empty.\\n- Build long_bins via UNION ALL of bin1..bin12 projections: (material_name, set_wt_kg, ach_wt_kg, bin_index).\\n- Drop rows with blank TRIM(material_name) before grouping.\\n- Group rows by TRIM(material_name). Compute sums with COALESCE guards; use NULLIF guard in percentage.\\n- Order rows by row_material_name ASC, tie-breakers: row_set_wt DESC, row_ach_wt DESC, row_error_kg DESC; compute row_sl_no with ROW_NUMBER() over this ordering.\\n- Totals computed from rows dataset using totals_math. Keep expressions identical between mapping and row_computed/totals_math.\\n- Preserve exact token names and ordering from schema. Ensure stability across SQLite/Postgres.\\n\",\n  \"step5_requirements\": {\n    \"datasets\": {\n      \"header\": {\n        \"description\": \"One-row header dataset (pass-through parameters plus derived title)\",\n        \"columns\": [\n          \"plant_name\",\n          \"location\",\n          \"from_date\",\n          \"to_date\",\n          \"print_date\",\n          \"recipe_code\",\n          \"report_title\"\n        ]\n      },\n      \"rows\": {\n        \"description\": \"Detail rows aggregated by normalized material name across filtered recipe runs\",\n        \"columns\": [\n          \"row_sl_no\",\n          \"row_material_name\",\n          \"row_set_wt\",\n          \"row_ach_wt\",\n          \"row_error_kg\",\n          \"row_error_pct\"\n        ],\n        \"grouping\": [\n          \"Group by material_name_norm = TRIM(long_bins.material_name) after dropping blanks.\",\n          \"Aggregate sums across all filtered recipes and bins: row_set_wt = SUM(COALESCE(set_wt_kg,0)), row_ach_wt = SUM(COALESCE(ach_wt_kg,0)).\",\n          \"Compute row_error_kg and row_error_pct from those sums using identical expressions to row_computed.\"\n        ],\n        \"ordering\": [\n          \"ORDER BY row_material_name ASC, row_set_wt DESC, row_ach_wt DESC, row_error_kg DESC.\",\n          \"row_sl_no = ROW_NUMBER() OVER the same ORDER BY for a stable, 1-based sequence.\"\n        ]\n      },\n      \"totals\": {\n        \"description\": \"Aggregate totals derived from the rows dataset\",\n        \"columns\": [\n          \"total_set_wt\",\n          \"total_ach_wt\",\n          \"total_error_kg\",\n          \"total_error_pct\"\n        ]\n      }\n    },\n    \"semantics\": \"from_date and to_date are required and filter recipes.start_time by calendar date inclusive. recipe_code is optional; apply an equality predicate only when non-empty. plant_name and location are optional header-only parameters (not used in SQL filters). print_date is required for display but does not affect SQL. Totals must be computed from the rows dataset to ensure consistency with all filters.\",\n    \"parameters\": {\n      \"required\": [\n        {\n          \"name\": \"from_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"to_date\",\n          \"type\": \"date\"\n        },\n        {\n          \"name\": \"print_date\",\n          \"type\": \"date\"\n        }\n      ],\n      \"optional\": [\n        {\n          \"name\": \"recipe_code\",\n          \"type\": \"string\"\n        },\n        {\n          \"name\": \"plant_name\",\n          \"type\": \"string\"\n        },\n        {\n          \"name\": \"location\",\n          \"type\": \"string\"\n        }\n      ]\n    },\n    \"transformations\": [\n      \"Filter base_recipes from recipes by date (recipes.start_time within [from_date, to_date]) and optional recipe_code = :recipe_code (only when non-empty).\",\n      \"UNION ALL unpivot across 12 bins into long_bins(material_name, set_wt_kg, ach_wt_kg, bin_index) using recipes.binX_content, recipes.binX_sp, recipes.binX_act and bin_index=X.\",\n      \"Pre-aggregation filter: WHERE TRIM(material_name) IS NOT NULL AND TRIM(material_name) <> ''.\",\n      \"Rows dataset: GROUP BY TRIM(material_name). Compute row_set_wt = SUM(COALESCE(set_wt_kg,0)); row_ach_wt = SUM(COALESCE(ach_wt_kg,0)).\",\n      \"Row-level computed: row_error_kg = SUM(COALESCE(ach_wt_kg,0)) - SUM(COALESCE(set_wt_kg,0)); row_error_pct = CASE WHEN SUM(COALESCE(set_wt_kg,0))=0 THEN NULL ELSE (SUM(COALESCE(ach_wt_kg,0)) - SUM(COALESCE(set_wt_kg,0))) / NULLIF(SUM(COALESCE(set_wt_kg,0)),0) END.\",\n      \"Row numbering: row_sl_no = ROW_NUMBER() OVER (ORDER BY row_material_name ASC, row_set_wt DESC, row_ach_wt DESC, row_error_kg DESC).\",\n      \"Totals math: total_set_wt = SUM(rows.row_set_wt); total_ach_wt = SUM(rows.row_ach_wt); total_error_kg = SUM(rows.row_error_kg); total_error_pct = SUM(rows.row_error_kg) / NULLIF(SUM(rows.row_set_wt),0).\"\n    ]\n  },\n  \"contract\": {\n    \"tokens\": {\n      \"scalars\": [\n        \"plant_name\",\n        \"location\",\n        \"from_date\",\n        \"to_date\",\n        \"print_date\",\n        \"recipe_code\",\n        \"report_title\"\n      ],\n      \"row_tokens\": [\n        \"row_sl_no\",\n        \"row_material_name\",\n        \"row_set_wt\",\n        \"row_ach_wt\",\n        \"row_error_kg\",\n        \"row_error_pct\"\n      ],\n      \"totals\": [\n        \"total_set_wt\",\n        \"total_ach_wt\",\n        \"total_error_kg\",\n        \"total_error_pct\"\n      ]\n    },\n    \"mapping\": {\n      \"plant_name\": \"PARAM:plant_name\",\n      \"location\": \"PARAM:location\",\n      \"from_date\": \"PARAM:from_date\",\n      \"to_date\": \"PARAM:to_date\",\n      \"print_date\": \"PARAM:print_date\",\n      \"recipe_code\": \"PARAM:recipe_code\",\n      \"report_title\": \"'Consumption report'\",\n      \"row_sl_no\": \"ROW_NUMBER() OVER (ORDER BY TRIM(rows.row_material_name) ASC, rows.row_set_wt DESC, rows.row_ach_wt DESC, rows.row_error_kg DESC)\",\n      \"row_material_name\": \"TRIM(long_bins.material_name)\",\n      \"row_set_wt\": \"SUM(COALESCE(long_bins.set_wt_kg, 0))\",\n      \"row_ach_wt\": \"SUM(COALESCE(long_bins.ach_wt_kg, 0))\",\n      \"row_error_kg\": \"SUM(COALESCE(long_bins.ach_wt_kg, 0)) - SUM(COALESCE(long_bins.set_wt_kg, 0))\",\n      \"row_error_pct\": \"CASE WHEN SUM(COALESCE(long_bins.set_wt_kg, 0)) = 0 THEN NULL ELSE (SUM(COALESCE(long_bins.ach_wt_kg, 0)) - SUM(COALESCE(long_bins.set_wt_kg, 0))) / NULLIF(SUM(COALESCE(long_bins.set_wt_kg, 0)), 0) END\",\n      \"total_set_wt\": \"SUM(rows.row_set_wt)\",\n      \"total_ach_wt\": \"SUM(rows.row_ach_wt)\",\n      \"total_error_kg\": \"SUM(rows.row_error_kg)\",\n      \"total_error_pct\": \"SUM(rows.row_error_kg) / NULLIF(SUM(rows.row_set_wt), 0)\"\n    },\n    \"unresolved\": [],\n    \"join\": {\n      \"parent_table\": \"recipes\",\n      \"parent_key\": \"id\",\n      \"child_table\": null,\n      \"child_key\": null\n    },\n    \"date_columns\": {\n      \"recipes\": \"start_time\"\n    },\n    \"filters\": {\n      \"optional\": {\n        \"recipe_code\": \"recipes.recipe_name\"\n      }\n    },\n    \"reshape_rules\": [\n      {\n        \"purpose\": \"Filter base recipes\",\n        \"strategy\": \"BASE_FILTER\",\n        \"explain\": \"Apply date and optional recipe filters before reshaping to minimize rows.\",\n        \"where\": [\n          \"recipes.start_time cast to date is BETWEEN :from_date AND :to_date (inclusive)\",\n          \"AND recipes.recipe_name = :recipe_code when :recipe_code is non-empty\"\n        ]\n      },\n      {\n        \"purpose\": \"Produce rows dataset\",\n        \"strategy\": \"UNION_ALL\",\n        \"explain\": \"Unpivot bin1..bin12 columns into long form, trim material names, drop blanks before grouping\",\n        \"columns\": [\n          {\n            \"as\": \"material_name\",\n            \"from\": [\n              \"recipes.bin1_content\",\n              \"recipes.bin2_content\",\n              \"recipes.bin3_content\",\n              \"recipes.bin4_content\",\n              \"recipes.bin5_content\",\n              \"recipes.bin6_content\",\n              \"recipes.bin7_content\",\n              \"recipes.bin8_content\",\n              \"recipes.bin9_content\",\n              \"recipes.bin10_content\",\n              \"recipes.bin11_content\",\n              \"recipes.bin12_content\"\n            ]\n          },\n          {\n            \"as\": \"set_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_sp\",\n              \"recipes.bin2_sp\",\n              \"recipes.bin3_sp\",\n              \"recipes.bin4_sp\",\n              \"recipes.bin5_sp\",\n              \"recipes.bin6_sp\",\n              \"recipes.bin7_sp\",\n              \"recipes.bin8_sp\",\n              \"recipes.bin9_sp\",\n              \"recipes.bin10_sp\",\n              \"recipes.bin11_sp\",\n              \"recipes.bin12_sp\"\n            ]\n          },\n          {\n            \"as\": \"ach_wt_kg\",\n            \"from\": [\n              \"recipes.bin1_act\",\n              \"recipes.bin2_act\",\n              \"recipes.bin3_act\",\n              \"recipes.bin4_act\",\n              \"recipes.bin5_act\",\n              \"recipes.bin6_act\",\n              \"recipes.bin7_act\",\n              \"recipes.bin8_act\",\n              \"recipes.bin9_act\",\n              \"recipes.bin10_act\",\n              \"recipes.bin11_act\",\n              \"recipes.bin12_act\"\n            ]\n          }\n        ]\n      }\n    ],\n    \"row_computed\": {\n      \"row_error_kg\": \"SUM(COALESCE(long_bins.ach_wt_kg, 0)) - SUM(COALESCE(long_bins.set_wt_kg, 0))\",\n      \"row_error_pct\": \"CASE WHEN SUM(COALESCE(long_bins.set_wt_kg, 0)) = 0 THEN NULL ELSE (SUM(COALESCE(long_bins.ach_wt_kg, 0)) - SUM(COALESCE(long_bins.set_wt_kg, 0))) / NULLIF(SUM(COALESCE(long_bins.set_wt_kg, 0)), 0) END\"\n    },\n    \"totals_math\": {\n      \"total_set_wt\": \"SUM(rows.row_set_wt)\",\n      \"total_ach_wt\": \"SUM(rows.row_ach_wt)\",\n      \"total_error_kg\": \"SUM(rows.row_error_kg)\",\n      \"total_error_pct\": \"SUM(rows.row_error_kg) / NULLIF(SUM(rows.row_set_wt), 0)\"\n    },\n    \"formatters\": {\n      \"row_set_wt\": \"decimal(2)\",\n      \"row_ach_wt\": \"decimal(2)\",\n      \"row_error_kg\": \"decimal(2)\",\n      \"row_error_pct\": \"percent(2)\",\n      \"total_set_wt\": \"decimal(2)\",\n      \"total_ach_wt\": \"decimal(2)\",\n      \"total_error_kg\": \"decimal(2)\",\n      \"total_error_pct\": \"percent(2)\",\n      \"print_date\": \"date(DD/MM/YYYY)\"\n    },\n    \"order_by\": {\n      \"rows\": [\n        \"row_material_name ASC\",\n        \"row_set_wt DESC\",\n        \"row_ach_wt DESC\",\n        \"row_error_kg DESC\"\n      ]\n    },\n    \"notes\": \"Use only recipes.* columns. Inclusive date filter on recipes.start_time by date. Optional filter recipes.recipe_name = :recipe_code only when non-empty. Unpivot bins 1..12. Drop blank material names. Group by trimmed material name. Compute percent with NULLIF guard. Compute Sl. No. with ROW_NUMBER() over the final ordering.\"\n  },\n  \"validation\": {\n    \"unknown_tokens\": [],\n    \"unknown_columns\": [],\n    \"token_coverage\": {\n      \"scalars_mapped_pct\": 100,\n      \"row_tokens_mapped_pct\": 100,\n      \"totals_mapped_pct\": 100\n    }\n  }\n}",
        "refusal": null,
        "role": "assistant",
        "annotations": [],
        "audio": null,
        "function_call": null,
        "tool_calls": null
      }
    }
  ],
  "created": 1761307049,
  "model": "gpt-5-2025-08-07",
  "object": "chat.completion",
  "service_tier": "default",
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 9577,
    "prompt_tokens": 8640,
    "total_tokens": 18217,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5568,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    }
  }
}
```

