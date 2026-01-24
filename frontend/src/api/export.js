/**
 * Export API Client
 * Handles document export and distribution operations.
 */
import { api } from './client';

// ============================================
// Export Formats
// ============================================

export async function exportToPdf(documentId, options = {}) {
  const response = await api.post(`/export/${documentId}/pdf`, options, {
    responseType: options.returnBlob ? 'blob' : 'json',
  });
  return response.data;
}

export async function exportToPdfA(documentId, options = {}) {
  const response = await api.post(`/export/${documentId}/pdfa`, options, {
    responseType: options.returnBlob ? 'blob' : 'json',
  });
  return response.data;
}

export async function exportToDocx(documentId, options = {}) {
  const response = await api.post(`/export/${documentId}/docx`, options, {
    responseType: options.returnBlob ? 'blob' : 'json',
  });
  return response.data;
}

export async function exportToPptx(documentId, options = {}) {
  const response = await api.post(`/export/${documentId}/pptx`, options, {
    responseType: options.returnBlob ? 'blob' : 'json',
  });
  return response.data;
}

export async function exportToEpub(documentId, options = {}) {
  const response = await api.post(`/export/${documentId}/epub`, options, {
    responseType: options.returnBlob ? 'blob' : 'json',
  });
  return response.data;
}

export async function exportToLatex(documentId, options = {}) {
  const response = await api.post(`/export/${documentId}/latex`, options);
  return response.data;
}

export async function exportToMarkdown(documentId, options = {}) {
  const response = await api.post(`/export/${documentId}/markdown`, options);
  return response.data;
}

export async function exportToHtml(documentId, options = {}) {
  const response = await api.post(`/export/${documentId}/html`, options);
  return response.data;
}

// ============================================
// Bulk Export
// ============================================

export async function bulkExport(documentIds, format, options = {}) {
  const response = await api.post('/export/bulk', {
    document_ids: documentIds,
    format,
    ...options,
  });
  return response.data;
}

export async function getBulkExportStatus(jobId) {
  const response = await api.get(`/export/bulk/${jobId}`);
  return response.data;
}

export async function downloadBulkExport(jobId) {
  const response = await api.get(`/export/bulk/${jobId}/download`, {
    responseType: 'blob',
  });
  return response.data;
}

// ============================================
// Distribution
// ============================================

export async function sendEmail(documentId, options) {
  const response = await api.post('/export/distribute/email', {
    document_id: documentId,
    recipients: options.recipients,
    subject: options.subject,
    body: options.body,
    format: options.format || 'pdf',
    include_link: options.includeLink || false,
  });
  return response.data;
}

export async function sendToSlack(documentId, options) {
  const response = await api.post('/export/distribute/slack', {
    document_id: documentId,
    channel: options.channel,
    message: options.message,
    format: options.format || 'pdf',
  });
  return response.data;
}

export async function sendToTeams(documentId, options) {
  const response = await api.post('/export/distribute/teams', {
    document_id: documentId,
    channel: options.channel,
    message: options.message,
    format: options.format || 'pdf',
  });
  return response.data;
}

export async function sendWebhook(documentId, options) {
  const response = await api.post('/export/distribute/webhook', {
    document_id: documentId,
    webhook_url: options.webhookUrl,
    payload: options.payload,
    format: options.format || 'pdf',
  });
  return response.data;
}

export async function publishToPortal(documentId, options = {}) {
  const response = await api.post('/export/distribute/portal', {
    document_id: documentId,
    title: options.title,
    description: options.description,
    visibility: options.visibility || 'private',
    password: options.password,
    expires_at: options.expiresAt,
  });
  return response.data;
}

// ============================================
// Embed
// ============================================

export async function generateEmbedToken(documentId, options = {}) {
  const response = await api.post(`/export/${documentId}/embed`, {
    expires_in: options.expiresIn || 3600,
    allow_download: options.allowDownload || false,
    password_protected: options.passwordProtected || false,
  });
  return response.data;
}

export async function revokeEmbedToken(tokenId) {
  const response = await api.delete(`/export/embed/${tokenId}`);
  return response.data;
}

export async function listEmbedTokens(documentId) {
  const response = await api.get(`/export/${documentId}/embed/tokens`);
  return response.data;
}

// ============================================
// Print
// ============================================

export async function printDocument(documentId, options = {}) {
  const response = await api.post(`/export/${documentId}/print`, {
    copies: options.copies || 1,
    printer: options.printer,
    duplex: options.duplex || false,
    color: options.color !== false,
  });
  return response.data;
}

export async function listPrinters() {
  const response = await api.get('/export/printers');
  return response.data;
}

// ============================================
// Export Jobs
// ============================================

export async function getExportJob(jobId) {
  const response = await api.get(`/export/jobs/${jobId}`);
  return response.data;
}

export async function listExportJobs(options = {}) {
  const response = await api.get('/export/jobs', {
    params: {
      status: options.status,
      limit: options.limit || 20,
    },
  });
  return response.data;
}

export async function cancelExportJob(jobId) {
  const response = await api.post(`/export/jobs/${jobId}/cancel`);
  return response.data;
}
