/**
 * Visualization API Client
 * Handles diagram and chart generation.
 */
import { api } from './client';

// ============================================
// Diagram Generation
// ============================================

export async function generateFlowchart(data, options = {}) {
  const response = await api.post('/visualization/diagrams/flowchart', {
    description: data,
    title: options.title || null,
  });
  return response.data;
}

export async function generateMindmap(data, options = {}) {
  const response = await api.post('/visualization/diagrams/mindmap', {
    content: data,
    title: options.title || null,
    max_depth: options.maxDepth || 3,
  });
  return response.data;
}

export async function generateOrgChart(data, options = {}) {
  const response = await api.post('/visualization/diagrams/org-chart', {
    org_data: data,
    title: options.title || null,
  });
  return response.data;
}

export async function generateTimeline(data, options = {}) {
  const response = await api.post('/visualization/diagrams/timeline', {
    events: data,
    title: options.title || null,
  });
  return response.data;
}

export async function generateGantt(data, options = {}) {
  const response = await api.post('/visualization/diagrams/gantt', {
    tasks: data,
    title: options.title || null,
  });
  return response.data;
}

export async function generateNetworkGraph(data, options = {}) {
  const response = await api.post('/visualization/diagrams/network', {
    relationships: data,
    title: options.title || null,
  });
  return response.data;
}

export async function generateKanban(data, options = {}) {
  const response = await api.post('/visualization/diagrams/kanban', {
    items: data,
    columns: options.columns || null,
    title: options.title || null,
  });
  return response.data;
}

export async function generateSequenceDiagram(data, options = {}) {
  const response = await api.post('/visualization/diagrams/sequence', {
    interactions: data,
    title: options.title || null,
  });
  return response.data;
}

export async function generateWordcloud(data, options = {}) {
  const response = await api.post('/visualization/diagrams/wordcloud', {
    text: data,
    max_words: options.maxWords || 100,
    title: options.title || null,
  });
  return response.data;
}

// ============================================
// Chart Generation
// ============================================

export async function tableToChart(tableData, options = {}) {
  const response = await api.post('/visualization/charts/from-table', {
    data: tableData,
    chart_type: options.chartType || 'bar',
    x_column: options.xColumn || null,
    y_columns: options.yColumns || null,
    title: options.title || null,
  });
  return response.data;
}

export async function generateSparklines(data, valueColumns, options = {}) {
  const response = await api.post('/visualization/charts/sparklines', {
    data,
    value_columns: valueColumns,
  });
  return response.data;
}

// ============================================
// Export
// ============================================

export async function exportDiagramAsMermaid(diagramId) {
  const response = await api.get(`/visualization/diagrams/${diagramId}/mermaid`);
  return response.data;
}

export async function exportDiagramAsSvg(diagramId) {
  const response = await api.get(`/visualization/diagrams/${diagramId}/svg`);
  return response.data;
}

export async function exportDiagramAsPng(diagramId) {
  const response = await api.get(`/visualization/diagrams/${diagramId}/png`, {
    responseType: 'blob',
  });
  return response.data;
}

// ============================================
// Diagram Types
// ============================================

export async function listDiagramTypes() {
  const response = await api.get('/visualization/types/diagrams');
  return response.data;
}

export async function listChartTypes() {
  const response = await api.get('/visualization/types/charts');
  return response.data;
}
