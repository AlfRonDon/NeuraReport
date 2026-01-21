/**
 * Multi-Document Synthesis API Client
 */
import apiClient from './client';

/**
 * Create a synthesis session
 */
export async function createSession(name) {
  const response = await apiClient.post('/synthesis/sessions', { name });
  return response.data;
}

/**
 * List all synthesis sessions
 */
export async function listSessions() {
  const response = await apiClient.get('/synthesis/sessions');
  return response.data;
}

/**
 * Get a synthesis session
 */
export async function getSession(sessionId) {
  const response = await apiClient.get(`/synthesis/sessions/${sessionId}`);
  return response.data;
}

/**
 * Delete a synthesis session
 */
export async function deleteSession(sessionId) {
  const response = await apiClient.delete(`/synthesis/sessions/${sessionId}`);
  return response.data;
}

/**
 * Add document to session
 */
export async function addDocument(sessionId, { name, content, docType = 'text', metadata }) {
  const response = await apiClient.post(`/synthesis/sessions/${sessionId}/documents`, {
    name,
    content,
    doc_type: docType,
    metadata,
  });
  return response.data;
}

/**
 * Remove document from session
 */
export async function removeDocument(sessionId, documentId) {
  const response = await apiClient.delete(`/synthesis/sessions/${sessionId}/documents/${documentId}`);
  return response.data;
}

/**
 * Find inconsistencies in documents
 */
export async function findInconsistencies(sessionId) {
  const response = await apiClient.get(`/synthesis/sessions/${sessionId}/inconsistencies`);
  return response.data;
}

/**
 * Synthesize documents
 */
export async function synthesize(sessionId, { focusTopics, outputFormat = 'structured', includeSources = true, maxLength = 5000 }) {
  const response = await apiClient.post(`/synthesis/sessions/${sessionId}/synthesize`, {
    focus_topics: focusTopics,
    output_format: outputFormat,
    include_sources: includeSources,
    max_length: maxLength,
  });
  return response.data;
}

export default {
  createSession,
  listSessions,
  getSession,
  deleteSession,
  addDocument,
  removeDocument,
  findInconsistencies,
  synthesize,
};
