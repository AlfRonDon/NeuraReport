/**
 * Workflows API Client
 * Handles workflow automation, triggers, and execution.
 */
import { api } from './client';

// ============================================
// Workflow CRUD
// ============================================

export async function createWorkflow(data) {
  const response = await api.post('/workflows', data);
  return response.data;
}

export async function getWorkflow(workflowId) {
  const response = await api.get(`/workflows/${workflowId}`);
  return response.data;
}

export async function updateWorkflow(workflowId, data) {
  const response = await api.put(`/workflows/${workflowId}`, data);
  return response.data;
}

export async function deleteWorkflow(workflowId) {
  const response = await api.delete(`/workflows/${workflowId}`);
  return response.data;
}

export async function listWorkflows(params = {}) {
  const response = await api.get('/workflows', { params });
  return response.data;
}

// ============================================
// Workflow Execution
// ============================================

export async function executeWorkflow(workflowId, inputs = {}) {
  const response = await api.post(`/workflows/${workflowId}/execute`, { inputs });
  return response.data;
}

export async function getExecution(workflowId, executionId) {
  const response = await api.get(`/workflows/${workflowId}/executions/${executionId}`);
  return response.data;
}

export async function listExecutions(workflowId, params = {}) {
  const response = await api.get(`/workflows/${workflowId}/executions`, { params });
  return response.data;
}

export async function cancelExecution(workflowId, executionId) {
  const response = await api.post(`/workflows/${workflowId}/executions/${executionId}/cancel`);
  return response.data;
}

export async function retryExecution(workflowId, executionId) {
  const response = await api.post(`/workflows/${workflowId}/executions/${executionId}/retry`);
  return response.data;
}

// ============================================
// Triggers
// ============================================

export async function addTrigger(workflowId, trigger) {
  const response = await api.post(`/workflows/${workflowId}/triggers`, trigger);
  return response.data;
}

export async function updateTrigger(workflowId, triggerId, data) {
  const response = await api.put(`/workflows/${workflowId}/triggers/${triggerId}`, data);
  return response.data;
}

export async function deleteTrigger(workflowId, triggerId) {
  const response = await api.delete(`/workflows/${workflowId}/triggers/${triggerId}`);
  return response.data;
}

export async function enableTrigger(workflowId, triggerId) {
  const response = await api.post(`/workflows/${workflowId}/triggers/${triggerId}/enable`);
  return response.data;
}

export async function disableTrigger(workflowId, triggerId) {
  const response = await api.post(`/workflows/${workflowId}/triggers/${triggerId}/disable`);
  return response.data;
}

// ============================================
// Node Types
// ============================================

export async function listNodeTypes() {
  const response = await api.get('/workflows/node-types');
  return response.data;
}

export async function getNodeTypeSchema(nodeType) {
  const response = await api.get(`/workflows/node-types/${nodeType}/schema`);
  return response.data;
}

// ============================================
// Templates
// ============================================

export async function listWorkflowTemplates(params = {}) {
  const response = await api.get('/workflows/templates', { params });
  return response.data;
}

export async function createFromTemplate(templateId, name) {
  const response = await api.post(`/workflows/templates/${templateId}/create`, { name });
  return response.data;
}

export async function saveAsTemplate(workflowId, name, description = null) {
  const response = await api.post(`/workflows/${workflowId}/save-as-template`, { name, description });
  return response.data;
}

// ============================================
// Approval Workflows
// ============================================

export async function getPendingApprovals(params = {}) {
  const response = await api.get('/workflows/approvals/pending', { params });
  return response.data;
}

export async function approveStep(executionId, stepId, comment = null) {
  const response = await api.post(`/workflows/approvals/${executionId}/${stepId}/approve`, { comment });
  return response.data;
}

export async function rejectStep(executionId, stepId, reason) {
  const response = await api.post(`/workflows/approvals/${executionId}/${stepId}/reject`, { reason });
  return response.data;
}

// ============================================
// Webhooks
// ============================================

export async function createWebhook(workflowId, config) {
  const response = await api.post(`/workflows/${workflowId}/webhooks`, config);
  return response.data;
}

export async function listWebhooks(workflowId) {
  const response = await api.get(`/workflows/${workflowId}/webhooks`);
  return response.data;
}

export async function deleteWebhook(workflowId, webhookId) {
  const response = await api.delete(`/workflows/${workflowId}/webhooks/${webhookId}`);
  return response.data;
}

export async function regenerateWebhookSecret(workflowId, webhookId) {
  const response = await api.post(`/workflows/${workflowId}/webhooks/${webhookId}/regenerate-secret`);
  return response.data;
}

// ============================================
// Logs & Debugging
// ============================================

export async function getExecutionLogs(workflowId, executionId, params = {}) {
  const response = await api.get(`/workflows/${workflowId}/executions/${executionId}/logs`, { params });
  return response.data;
}

export async function debugWorkflow(workflowId, nodeId, testData) {
  const response = await api.post(`/workflows/${workflowId}/debug`, {
    node_id: nodeId,
    test_data: testData,
  });
  return response.data;
}
