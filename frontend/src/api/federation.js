/**
 * Cross-Database Federation API Client
 */
import apiClient from './client';

/**
 * Create a virtual schema
 */
export async function createVirtualSchema({ name, connectionIds, description }) {
  const response = await apiClient.post('/federation/schemas', {
    name,
    connection_ids: connectionIds,
    description,
  });
  return response.data;
}

/**
 * List virtual schemas
 */
export async function listVirtualSchemas({ limit, offset } = {}) {
  const params = {};
  if (limit != null) params.limit = limit;
  if (offset != null) params.offset = offset;
  const response = await apiClient.get('/federation/schemas', { params });
  return response.data;
}

/**
 * Get a virtual schema by ID
 */
export async function getVirtualSchema(schemaId) {
  const response = await apiClient.get(`/federation/schemas/${schemaId}`);
  return response.data;
}

/**
 * Get join suggestions for connections
 */
export async function suggestJoins(connectionIds) {
  const response = await apiClient.post('/federation/suggest-joins', {
    connection_ids: connectionIds,
  });
  return response.data;
}

/**
 * Execute a federated query
 */
export async function executeFederatedQuery({ schemaId, query, limit = 100 }) {
  const response = await apiClient.post('/federation/query', {
    virtual_schema_id: schemaId,
    sql: query,
    limit,
  });
  return response.data;
}

/**
 * Delete a virtual schema
 */
export async function deleteVirtualSchema(schemaId) {
  const response = await apiClient.delete(`/federation/schemas/${schemaId}`);
  return response.data;
}

export default {
  createVirtualSchema,
  listVirtualSchemas,
  getVirtualSchema,
  suggestJoins,
  executeFederatedQuery,
  deleteVirtualSchema,
};
