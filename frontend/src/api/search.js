/**
 * Search API Client
 * Handles search and discovery operations.
 */
import { api } from './client';

// ============================================
// Core Search
// ============================================

export async function search(query, options = {}) {
  const response = await api.post('/search/search', {
    query,
    search_type: options.searchType || 'fulltext',
    filters: options.filters || null,
    sort_by: options.sortBy || 'relevance',
    page: options.page || 1,
    page_size: options.pageSize || 20,
    highlight: options.highlight !== false,
    facets: options.facets || null,
  });
  return response.data;
}

export async function semanticSearch(query, options = {}) {
  const response = await api.post('/search/search/semantic', {
    query,
    filters: options.filters || null,
    limit: options.limit || 20,
  });
  return response.data;
}

export async function regexSearch(pattern, options = {}) {
  const response = await api.post('/search/search/regex', {
    pattern,
    case_sensitive: options.caseSensitive || false,
    filters: options.filters || null,
  });
  return response.data;
}

export async function booleanSearch(query, options = {}) {
  const response = await api.post('/search/search/boolean', {
    query,
    filters: options.filters || null,
  });
  return response.data;
}

// ============================================
// Search & Replace
// ============================================

export async function searchAndReplace(searchQuery, replaceWith, options = {}) {
  const response = await api.post('/search/search/replace', {
    search_query: searchQuery,
    replace_with: replaceWith,
    scope: options.scope || 'all',
    preview_only: options.previewOnly !== false,
    case_sensitive: options.caseSensitive || false,
  });
  return response.data;
}

// ============================================
// Similar Documents
// ============================================

export async function findSimilar(documentId, options = {}) {
  const response = await api.get(`/search/documents/${documentId}/similar`, {
    params: {
      limit: options.limit || 10,
      min_similarity: options.minSimilarity || 0.5,
    },
  });
  return response.data;
}

// ============================================
// Index Management
// ============================================

export async function indexDocument(documentId, content, metadata = {}) {
  const response = await api.post('/search/index', {
    document_id: documentId,
    content,
    metadata,
  });
  return response.data;
}

export async function removeFromIndex(documentId) {
  const response = await api.delete(`/search/index/${documentId}`);
  return response.data;
}

export async function reindexAll() {
  const response = await api.post('/search/index/reindex');
  return response.data;
}

// ============================================
// Saved Searches
// ============================================

export async function saveSearch(name, query, options = {}) {
  const response = await api.post('/search/saved-searches', {
    name,
    query,
    search_type: options.searchType || 'fulltext',
    filters: options.filters || null,
    is_alert: options.isAlert || false,
    alert_frequency: options.alertFrequency || null,
  });
  return response.data;
}

export async function listSavedSearches() {
  const response = await api.get('/search/saved-searches');
  return response.data;
}

export async function getSavedSearch(searchId) {
  const response = await api.get(`/search/saved-searches/${searchId}`);
  return response.data;
}

export async function deleteSavedSearch(searchId) {
  const response = await api.delete(`/search/saved-searches/${searchId}`);
  return response.data;
}

export async function runSavedSearch(searchId) {
  const response = await api.post(`/search/saved-searches/${searchId}/run`);
  return response.data;
}

// ============================================
// Analytics
// ============================================

export async function getSearchAnalytics(options = {}) {
  const response = await api.get('/search/analytics', {
    params: {
      days: options.days || 30,
    },
  });
  return response.data;
}
