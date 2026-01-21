/**
 * Document Q&A Chat API Client
 */
import apiClient from './client';

/**
 * Create a Q&A session
 */
export async function createSession(name) {
  const response = await apiClient.post('/docqa/sessions', { name });
  return response.data;
}

/**
 * List all Q&A sessions
 */
export async function listSessions() {
  const response = await apiClient.get('/docqa/sessions');
  return response.data;
}

/**
 * Get a Q&A session
 */
export async function getSession(sessionId) {
  const response = await apiClient.get(`/docqa/sessions/${sessionId}`);
  return response.data;
}

/**
 * Delete a Q&A session
 */
export async function deleteSession(sessionId) {
  const response = await apiClient.delete(`/docqa/sessions/${sessionId}`);
  return response.data;
}

/**
 * Add document to session
 */
export async function addDocument(sessionId, { name, content, pageCount }) {
  const response = await apiClient.post(`/docqa/sessions/${sessionId}/documents`, {
    name,
    content,
    page_count: pageCount,
  });
  return response.data;
}

/**
 * Remove document from session
 */
export async function removeDocument(sessionId, documentId) {
  const response = await apiClient.delete(`/docqa/sessions/${sessionId}/documents/${documentId}`);
  return response.data;
}

/**
 * Ask a question
 */
export async function askQuestion(sessionId, { question, includeCitations = true, maxResponseLength = 2000 }) {
  const response = await apiClient.post(`/docqa/sessions/${sessionId}/ask`, {
    question,
    include_citations: includeCitations,
    max_response_length: maxResponseLength,
  });
  return response.data;
}

/**
 * Get chat history
 */
export async function getChatHistory(sessionId, limit = 50) {
  const response = await apiClient.get(`/docqa/sessions/${sessionId}/history`, {
    params: { limit },
  });
  return response.data;
}

/**
 * Clear chat history
 */
export async function clearHistory(sessionId) {
  const response = await apiClient.delete(`/docqa/sessions/${sessionId}/history`);
  return response.data;
}

export default {
  createSession,
  listSessions,
  getSession,
  deleteSession,
  addDocument,
  removeDocument,
  askQuestion,
  getChatHistory,
  clearHistory,
};
