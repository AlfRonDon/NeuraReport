import { API_BASE, withBase, mappingApprove as clientMappingApprove } from "./client";



/**

 * POST /templates/verify (streaming progress)

 * Body: multipart/form-data { file, connection_id, refine_iters? }

 * Returns final event payload once verification completes.

 * Emits progress events via onProgress callback ({ event:'stage', stage, progress, template_id }).

 */

export async function verifyTemplate({ file, connectionId, refineIters = 0, onProgress } = {}) {

  const fd = new FormData();

  fd.append("file", file);

  fd.append("connection_id", connectionId);

  fd.append("refine_iters", String(refineIters ?? 0));



  const res = await fetch(`${API_BASE}/templates/verify`, {

    method: "POST",

    body: fd,

  });



  if (!res.ok || !res.body) {

    let detail;

    try {

      const data = await res.json();

      detail = data?.detail;

    } catch {

      detail = await res.text().catch(() => null);

    }

    throw new Error(detail || "Verify template failed");

  }



  const reader = res.body.getReader();

  const decoder = new TextDecoder();

  let buffer = "";

  let finalEvent = null;



  while (true) {

    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });



    let newlineIndex;

    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {

      const line = buffer.slice(0, newlineIndex).trim();

      buffer = buffer.slice(newlineIndex + 1);

      if (!line) continue;



      let payload;

      try {

        payload = JSON.parse(line);

      } catch {

        continue;

      }



      if (payload.event === "stage") {
        onProgress?.(payload);
      } else if (payload.event === "result") {

        finalEvent = payload;

        onProgress?.(payload);

      } else if (payload.event === "error") {

        try {

          await reader.cancel();

        } catch {

          // ignore cancellation failures

        }

        const err = new Error(payload.detail || "Verification failed");

        err.detail = payload.detail;

        throw err;

      }

    }

  }



  if (buffer.trim()) {

    try {

      const payload = JSON.parse(buffer.trim());

      if (payload.event === "result") {

        finalEvent = payload;

        onProgress?.(payload);

      } else if (payload.event === "error") {

        try {

          await reader.cancel();

        } catch {

          // ignore cancellation failures

        }

        const err = new Error(payload.detail || "Verification failed");

        err.detail = payload.detail;

        throw err;

      }

    } catch {

      // ignore trailing junk

    }

  }



  if (!finalEvent) {

    throw new Error("Verification did not return a result payload");

  }



  const { template_id, schema, artifacts, schema_ext_url } = finalEvent;

  const schemaExtRel = schema_ext_url || artifacts?.schema_ext_url || null;
  const schemaExtUrl = schemaExtRel ? withBase(schemaExtRel) : null;
  const llm2Rel = artifacts?.llm2_html_url || null;
  const llm2Url = llm2Rel ? withBase(llm2Rel) : null;

  const normalized = {
    template_id,
    schema,
    schema_ext_url: schemaExtUrl,
    llm2_html_url: llm2Url,
    artifacts: artifacts
      ? {
          pdf_url: artifacts.pdf_url ? withBase(artifacts.pdf_url) : null,
          png_url: artifacts.png_url ? withBase(artifacts.png_url) : null,
          html_url: artifacts.html_url ? withBase(artifacts.html_url) : null,
          llm2_html_url: llm2Url,
          schema_ext_url: schemaExtUrl,
        }
      : null,
  };

  return normalized;

}



export async function mappingPreview(templateId, connectionId, options = {}) {

  const params = new URLSearchParams({

    connection_id: connectionId ?? "",

  });

  if (Object.prototype.hasOwnProperty.call(options, 'forceRefresh')) {

    params.set('force_refresh', String(options.forceRefresh));

  }



  const url = `${API_BASE}/templates/${encodeURIComponent(

    templateId

  )}/mapping/preview?${params.toString()}`;



  const res = await fetch(url, { method: "POST" });

  if (!res.ok) {

    const err = await res.json().catch(() => ({}));

    throw new Error(err.detail || "Mapping preview failed");

  }

  return res.json();

}



/**

 * POST /templates/{template_id}/mapping/approve (streamed progress)

 * Body: { mapping, connection_id?, user_values_text? }

 * Returns:

 * {

 *   ok, saved,

 *   final_html_path,

 *   final_html_url,      // /uploads/<tid>/report_final.html?ts=...

 *   template_html_url,   // /uploads/<tid>/template_p1.html?ts=...

 *   token_map_size,

 *   contract_ready

 * }

 */

export function approveMapping(templateId, mapping, options = {}) {

  return clientMappingApprove(templateId, mapping, options)

}



export { fetchArtifactManifest, fetchArtifactHead } from "./client"
