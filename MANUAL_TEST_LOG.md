# NeuraReport Manual Feature Validation Log

Date: 2026-01-26
Environment: Windows 11 (PowerShell), Python 3.14.0, backend http://127.0.0.1:8000
Notes: Frontend dependencies not installed yet (npm EPERM). Python full requirements not installed; testing will install/enable deps as needed.

---

## Core/Major Features

### 2. Database Connectivity

Test cases:
- [x] POST /connections/test (valid SQLite path)
- [x] POST /connections (create connection)
- [x] GET /connections (list includes new connection)
- [x] DELETE /connections/{id} (delete connection)
- [x] POST /connections/{id}/health (health check passes)
- [x] GET /connections/{id}/schema (tables + row counts)
- [x] GET /connections/{id}/preview (sample rows)
- [x] POST /connections/test (invalid path traversal blocked)

Results:
- Created SQLite connection to `backend/testdata/sample.db` (id `91f76d0d-74cc-4190-90ca-26c6439d127e`).
- Verified delete removes a second test connection (id `cece5725-c131-4f13-b5f8-1fbefc4a817c`).
- Schema returned 4 tables with row counts; preview returned sample rows.
- Path traversal rejected with 422 validation error.

### 4. Document Management

Test cases:
- [x] POST /documents (create)
- [x] GET /documents (list)
- [x] GET /documents/{id} (retrieve)
- [x] PUT /documents/{id} (update + version increment)
- [x] GET /documents/{id}/versions (version history)
- [x] GET /documents/{id}/versions/{version} (specific version)
- [x] POST /documents/{id}/comments (add comment)
- [x] GET /documents/{id}/comments (list comments)
- [x] PATCH /documents/{id}/comments/{comment_id}/resolve (resolve)
- [x] POST /documents/{id}/collaborate (start session)
- [x] GET /documents/{id}/collaborate/presence (presence list)
- [x] WebSocket /ws/collab/{document_id} (broadcast + presence update)
- [x] POST /documents/{id}/pdf/reorder (reorder pages)
- [x] POST /documents/{id}/pdf/watermark (watermark)
- [x] POST /documents/{id}/pdf/redact (redact region)
- [x] POST /documents/merge (merge PDFs)
- [x] DELETE /documents/{id} (delete)

Results:
- Created/updated/retrieved doc `b6deee6e-86c6-4c9e-aab2-d33869e54602`; version history increments on update.
- Comments create/list/resolve work; resolved comment persists.
- Collaboration session returns correct WS URL (port-aware); WebSocket broadcast verified (alice->bob) and presence API shows active users.
- PDF ops validated with generated PDFs: reorder, watermark (diagonal), redact, and merge all produce outputs under `backend/uploads/pdf_outputs`.
- Delete removes a temp doc and subsequent GET returns 404.
- Fixes applied during testing: Document content coercion (Pydantic model mismatch), collaboration WebSocket endpoint + broadcast send, WS URL base derived from request, diagonal watermark rotation handling.

### 5. Ingestion & Import

Test cases:
- [x] POST /ingestion/upload (single PDF upload)
- [x] POST /ingestion/upload/bulk (multi-file upload)
- [x] POST /ingestion/upload/zip (ZIP ingest)
- [x] POST /ingestion/url (URL ingest)
- [x] POST /ingestion/structured (JSON import)
- [x] POST /ingestion/clip/url (web clip)
- [x] POST /ingestion/clip/selection (selection clip)
- [x] POST /ingestion/watchers (create watcher)
- [x] GET /ingestion/watchers (list watchers)
- [x] GET /ingestion/watchers/{id} (watcher status)
- [x] POST /ingestion/watchers/{id}/scan (scan folder)
- [x] POST /ingestion/watchers/{id}/stop (stop watcher)
- [x] DELETE /ingestion/watchers/{id} (delete watcher)
- [x] POST /ingestion/email/inbox (generate inbox)
- [x] POST /ingestion/email/ingest (ingest .eml)
- [x] POST /ingestion/email/parse (parse .eml)
- [x] POST /ingestion/detect-type (file type detection)
- [x] GET /ingestion/supported-types
- [!] POST /ingestion/transcribe (blocked)
- [!] POST /ingestion/transcribe/voice-memo (blocked)

Results:
- Upload (single/bulk/zip) succeeded with previews and metadata; bulk/zip reported correct counts.
- URL ingest succeeded with GitHub raw file; W3C/RFC URLs returned 404/403 (expected remote restriction).
- Structured JSON import returned column schema and sample rows.
- Web clipper worked for full page + selection; content cleaned and document created.
- Folder watcher created, scanned existing file, auto-ingested, and reported status updates.
- Email inbox generation, ingest, and parse produced document and extracted action items.
- File type detection correctly reported PDF.
- Transcription endpoints return `Whisper not installed` (missing dependency).

### 15. Search Capabilities

Test cases:
- [x] POST /search/index (index docs)
- [x] POST /search/search (full-text)
- [x] POST /search/search (fuzzy)
- [x] POST /search/search/semantic (semantic)
- [x] POST /search/search/regex (regex)
- [x] POST /search/search/regex (invalid pattern rejected)
- [x] POST /search/search/boolean (boolean)
- [x] POST /search/search/replace (dry run + apply)
- [x] GET /search/documents/{id}/similar (similar docs)
- [x] POST /search/saved-searches (save)
- [x] GET /search/saved-searches (list)
- [x] POST /search/saved-searches/{id}/run (run)
- [x] DELETE /search/saved-searches/{id} (delete)
- [x] GET /search/analytics (analytics)
- [x] GET /search/types (types list)

Results:
- Indexed 3 docs; full-text, fuzzy typo tolerance, semantic search, regex, and boolean all return expected matches.
- Regex validation rejects unsupported named-group patterns with 400.
- Search-and-replace updates indexed content when `dry_run=false`.
- Similar-docs returns ranked results.
- Saved search lifecycle (save/list/run/delete) works.
- Analytics now reports no-results queries accurately after fix.
- Fix applied during testing: regex safety pattern escape bug and analytics result tracking.

