import { API_BASE } from "./client";

/**
 * POST /templates/verify
 * Body: multipart/form-data { file, connection_id }
 * Returns: { template_id, schema, artifacts: { pdf_url, png_url, html_url } }
 */
export async function verifyTemplate(file, connectionId) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("connection_id", connectionId);
  const res = await fetch(`${API_BASE}/templates/verify`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Verify template failed");
  }
  return res.json();
}

/**
 * POST /templates/{template_id}/mapping/preview?connection_id=...
 * Returns: { mapping, errors, schema_info, catalog, html_url }
 * Note: connection_id is passed as a QUERY param (FastAPI route expects it that way).
 */
export async function mappingPreview(templateId, connectionId) {
  const url = `${API_BASE}/templates/${encodeURIComponent(
    templateId
  )}/mapping/preview?connection_id=${encodeURIComponent(connectionId || "")}`;

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Mapping preview failed");
  }
  return res.json();
}

/**
 * POST /templates/{template_id}/mapping/approve
 * Body: { mapping }
 * Returns:
 * {
 *   ok, saved,
 *   final_html_path,
 *   final_html_url,      // /uploads/<tid>/report_final.html?ts=...
 *   template_html_url,   // /uploads/<tid>/template_p1.html?ts=...
 *   token_map_size
 * }
 */
export async function approveMapping(templateId, mapping) {
  const res = await fetch(
    `${API_BASE}/templates/${encodeURIComponent(templateId)}/mapping/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Approve mapping failed");
  }
  return res.json();
}
