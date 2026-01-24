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
    data,
    title: options.title || null,
    orientation: options.orientation || 'vertical',
    style: options.style || 'default',
  });
  return response.data;
}

export async function generateMindmap(data, options = {}) {
  const response = await api.post('/visualization/diagrams/mindmap', {
    data,
    title: options.title || null,
    max_depth: options.maxDepth || null,
    style: options.style || 'default',
  });
  return response.data;
}

export async function generateOrgChart(data, options = {}) {
  const response = await api.post('/visualization/diagrams/org-chart', {
    data,
    title: options.title || null,
    show_photos: options.showPhotos || false,
    style: options.style || 'default',
  });
  return response.data;
}

export async function generateTimeline(data, options = {}) {
  const response = await api.post('/visualization/diagrams/timeline', {
    data,
    title: options.title || null,
    date_format: options.dateFormat || 'YYYY-MM-DD',
    style: options.style || 'default',
  });
  return response.data;
}

export async function generateGantt(data, options = {}) {
  const response = await api.post('/visualization/diagrams/gantt', {
    data,
    title: options.title || null,
    show_dependencies: options.showDependencies !== false,
    show_progress: options.showProgress !== false,
    style: options.style || 'default',
  });
  return response.data;
}

export async function generateNetworkGraph(data, options = {}) {
  const response = await api.post('/visualization/diagrams/network', {
    data,
    title: options.title || null,
    layout: options.layout || 'force',
    show_labels: options.showLabels !== false,
    style: options.style || 'default',
  });
  return response.data;
}

export async function generateKanban(data, options = {}) {
  const response = await api.post('/visualization/diagrams/kanban', {
    data,
    title: options.title || null,
    columns: options.columns || null,
    style: options.style || 'default',
  });
  return response.data;
}

export async function generateSequenceDiagram(data, options = {}) {
  const response = await api.post('/visualization/diagrams/sequence', {
    data,
    title: options.title || null,
    style: options.style || 'default',
  });
  return response.data;
}

export async function generateWordcloud(data, options = {}) {
  const response = await api.post('/visualization/diagrams/wordcloud', {
    data,
    title: options.title || null,
    max_words: options.maxWords || 100,
    min_frequency: options.minFrequency || 1,
    colormap: options.colormap || 'viridis',
  });
  return response.data;
}

// ============================================
// Chart Generation
// ============================================

export async function tableToChart(tableData, options = {}) {
  const response = await api.post('/visualization/charts/from-table', {
    table_data: tableData,
    chart_type: options.chartType || 'auto',
    x_column: options.xColumn || null,
    y_columns: options.yColumns || null,
    title: options.title || null,
  });
  return response.data;
}

export async function generateSparklines(data, options = {}) {
  const response = await api.post('/visualization/charts/sparklines', {
    data,
    width: options.width || 100,
    height: options.height || 30,
    color: options.color || '#3b82f6',
    show_min_max: options.showMinMax || false,
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
