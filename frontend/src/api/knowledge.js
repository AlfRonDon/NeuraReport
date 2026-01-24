/**
 * Knowledge API Client
 * Handles document library, collections, and knowledge management.
 */
import { api } from './client';

// ============================================
// Documents
// ============================================

export async function addDocument(data) {
  const response = await api.post('/knowledge/library/documents', data);
  return response.data;
}

export async function getDocument(documentId) {
  const response = await api.get(`/knowledge/library/documents/${documentId}`);
  return response.data;
}

export async function listDocuments(options = {}) {
  const response = await api.get('/knowledge/library/documents', {
    params: {
      collection_id: options.collectionId,
      tags: options.tags,
      favorites_only: options.favoritesOnly,
      page: options.page || 1,
      page_size: options.pageSize || 20,
      sort_by: options.sortBy || 'updated_at',
      sort_order: options.sortOrder || 'desc',
    },
  });
  return response.data;
}

export async function updateDocument(documentId, data) {
  const response = await api.put(`/knowledge/library/documents/${documentId}`, data);
  return response.data;
}

export async function deleteDocument(documentId) {
  const response = await api.delete(`/knowledge/library/documents/${documentId}`);
  return response.data;
}

export async function toggleFavorite(documentId) {
  const response = await api.post(`/knowledge/library/documents/${documentId}/favorite`);
  return response.data;
}

// ============================================
// Collections
// ============================================

export async function createCollection(data) {
  const response = await api.post('/knowledge/library/collections', data);
  return response.data;
}

export async function getCollection(collectionId) {
  const response = await api.get(`/knowledge/library/collections/${collectionId}`);
  return response.data;
}

export async function listCollections() {
  const response = await api.get('/knowledge/library/collections');
  return response.data;
}

export async function updateCollection(collectionId, data) {
  const response = await api.put(`/knowledge/library/collections/${collectionId}`, data);
  return response.data;
}

export async function deleteCollection(collectionId) {
  const response = await api.delete(`/knowledge/library/collections/${collectionId}`);
  return response.data;
}

export async function addDocumentToCollection(collectionId, documentId) {
  const response = await api.post(`/knowledge/library/collections/${collectionId}/documents`, {
    document_id: documentId,
  });
  return response.data;
}

export async function removeDocumentFromCollection(collectionId, documentId) {
  const response = await api.delete(`/knowledge/library/collections/${collectionId}/documents/${documentId}`);
  return response.data;
}

// ============================================
// Tags
// ============================================

export async function createTag(name, color = null) {
  const response = await api.post('/knowledge/library/tags', { name, color });
  return response.data;
}

export async function listTags() {
  const response = await api.get('/knowledge/library/tags');
  return response.data;
}

export async function deleteTag(tagId) {
  const response = await api.delete(`/knowledge/library/tags/${tagId}`);
  return response.data;
}

export async function addTagToDocument(documentId, tagId) {
  const response = await api.post(`/knowledge/library/documents/${documentId}/tags`, {
    tag_id: tagId,
  });
  return response.data;
}

export async function removeTagFromDocument(documentId, tagId) {
  const response = await api.delete(`/knowledge/library/documents/${documentId}/tags/${tagId}`);
  return response.data;
}

// ============================================
// Search
// ============================================

export async function searchDocuments(query, options = {}) {
  const response = await api.post('/knowledge/library/search', {
    query,
    collection_id: options.collectionId,
    tags: options.tags,
    date_from: options.dateFrom,
    date_to: options.dateTo,
    page: options.page || 1,
    page_size: options.pageSize || 20,
  });
  return response.data;
}

export async function semanticSearch(query, options = {}) {
  const response = await api.post('/knowledge/library/search/semantic', {
    query,
    limit: options.limit || 10,
    min_similarity: options.minSimilarity || 0.5,
  });
  return response.data;
}

// ============================================
// AI Features
// ============================================

export async function autoTag(documentId) {
  const response = await api.post(`/knowledge/library/documents/${documentId}/auto-tag`);
  return response.data;
}

export async function findRelated(documentId, options = {}) {
  const response = await api.get(`/knowledge/library/documents/${documentId}/related`, {
    params: {
      limit: options.limit || 5,
    },
  });
  return response.data;
}

export async function buildKnowledgeGraph(options = {}) {
  const response = await api.post('/knowledge/library/knowledge-graph', {
    collection_id: options.collectionId,
    max_documents: options.maxDocuments || 100,
    include_entities: options.includeEntities !== false,
  });
  return response.data;
}

export async function generateFaq(options = {}) {
  const response = await api.post('/knowledge/library/faq', {
    collection_id: options.collectionId,
    document_ids: options.documentIds,
    max_questions: options.maxQuestions || 10,
  });
  return response.data;
}

// ============================================
// Analytics
// ============================================

export async function getLibraryStats() {
  const response = await api.get('/knowledge/library/stats');
  return response.data;
}

export async function getDocumentActivity(documentId, options = {}) {
  const response = await api.get(`/knowledge/library/documents/${documentId}/activity`, {
    params: {
      days: options.days || 30,
    },
  });
  return response.data;
}
