/**
 * Spreadsheets API Client
 * Handles spreadsheet operations, formulas, pivot tables, and AI features.
 */
import { api } from './client';

// ============================================
// Spreadsheet CRUD
// ============================================

export async function createSpreadsheet(data) {
  const response = await api.post('/spreadsheets', data);
  return response.data;
}

export async function getSpreadsheet(spreadsheetId) {
  const response = await api.get(`/spreadsheets/${spreadsheetId}`);
  return response.data;
}

export async function updateSpreadsheet(spreadsheetId, data) {
  const response = await api.put(`/spreadsheets/${spreadsheetId}`, data);
  return response.data;
}

export async function deleteSpreadsheet(spreadsheetId) {
  const response = await api.delete(`/spreadsheets/${spreadsheetId}`);
  return response.data;
}

export async function listSpreadsheets(params = {}) {
  const response = await api.get('/spreadsheets', { params });
  return response.data;
}

// ============================================
// Cell Operations
// ============================================

export async function updateCells(spreadsheetId, sheetIndex, updates) {
  const response = await api.put(`/spreadsheets/${spreadsheetId}/cells`, { updates }, {
    params: { sheet_index: sheetIndex },
  });
  return response.data;
}

export async function getCellRange(spreadsheetId, sheetIndex, startCell, endCell) {
  const response = await api.get(`/spreadsheets/${spreadsheetId}/cells`, {
    params: { sheet_index: sheetIndex, start: startCell, end: endCell },
  });
  return response.data;
}

// ============================================
// Sheet Operations
// ============================================

export async function addSheet(spreadsheetId, name) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/sheets`, { name });
  return response.data;
}

export async function deleteSheet(spreadsheetId, sheetIndex) {
  const response = await api.delete(`/spreadsheets/${spreadsheetId}/sheets/${sheetIndex}`);
  return response.data;
}

export async function renameSheet(spreadsheetId, sheetId, newName) {
  const response = await api.put(`/spreadsheets/${spreadsheetId}/sheets/${sheetId}/rename`, null, {
    params: { name: newName },
  });
  return response.data;
}

export async function freezePanes(spreadsheetId, sheetId, rows, columns) {
  const response = await api.put(`/spreadsheets/${spreadsheetId}/sheets/${sheetId}/freeze`, {
    rows,
    cols: columns,
  });
  return response.data;
}

// ============================================
// Formatting
// ============================================

export async function addConditionalFormat(spreadsheetId, sheetIndex, format) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/sheets/${sheetIndex}/conditional-format`, format);
  return response.data;
}

export async function removeConditionalFormat(spreadsheetId, sheetIndex, formatId) {
  const response = await api.delete(`/spreadsheets/${spreadsheetId}/sheets/${sheetIndex}/conditional-formats/${formatId}`);
  return response.data;
}

export async function addDataValidation(spreadsheetId, sheetIndex, validation) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/sheets/${sheetIndex}/validation`, validation);
  return response.data;
}

// ============================================
// Pivot Tables
// ============================================

export async function createPivotTable(spreadsheetId, config) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/pivot`, config);
  return response.data;
}

export async function updatePivotTable(spreadsheetId, pivotId, config) {
  const response = await api.put(`/spreadsheets/${spreadsheetId}/pivot/${pivotId}`, config);
  return response.data;
}

export async function deletePivotTable(spreadsheetId, pivotId) {
  const response = await api.delete(`/spreadsheets/${spreadsheetId}/pivot/${pivotId}`);
  return response.data;
}

export async function refreshPivotTable(spreadsheetId, pivotId) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/pivot/${pivotId}/refresh`);
  return response.data;
}

// ============================================
// Formula Engine
// ============================================

export async function evaluateFormula(spreadsheetId, formula, sheetIndex = 0) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/evaluate`, null, {
    params: { formula, sheet_index: sheetIndex },
  });
  return response.data;
}

export async function validateFormula(formula) {
  const response = await api.post('/spreadsheets/formula/validate', { formula });
  return response.data;
}

export async function listFunctions() {
  const response = await api.get('/spreadsheets/formula/functions');
  return response.data;
}

// ============================================
// Import/Export
// ============================================

export async function importCsv(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(options).forEach(([key, value]) => {
    formData.append(key, value);
  });
  const response = await api.post('/spreadsheets/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function importExcel(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(options).forEach(([key, value]) => {
    formData.append(key, value);
  });
  const response = await api.post('/spreadsheets/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function exportSpreadsheet(spreadsheetId, format) {
  const response = await api.get(`/spreadsheets/${spreadsheetId}/export`, {
    params: { format },
    responseType: 'blob',
  });
  return response.data;
}

// ============================================
// AI Features
// ============================================

export async function generateFormula(spreadsheetId, description, options = {}) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/ai/formula`, {
    description,
    available_columns: options.availableColumns || [],
    sheet_context: options.context || null,
  });
  return response.data;
}

export async function explainFormula(spreadsheetId, formula) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/ai/explain`, null, {
    params: { formula },
  });
  return response.data;
}

export async function suggestDataCleaning(spreadsheetId, sheetIndex = 0, column = null) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/ai/clean`, null, {
    params: { sheet_index: sheetIndex, column },
  });
  return response.data;
}

export async function detectAnomalies(spreadsheetId, column, options = {}) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/ai/anomalies`, null, {
    params: {
      column,
      sheet_index: options.sheetIndex || 0,
      sensitivity: options.sensitivity || 'medium',
    },
  });
  return response.data;
}

export async function predictColumn(spreadsheetId, targetDescription, basedOnColumns, options = {}) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/ai/predict`, null, {
    params: {
      target_description: targetDescription,
      based_on_columns: Array.isArray(basedOnColumns) ? basedOnColumns.join(',') : basedOnColumns,
      sheet_index: options.sheetIndex || 0,
    },
  });
  return response.data;
}

export async function suggestFormulas(spreadsheetId, options = {}) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/ai/suggest`, null, {
    params: {
      sheet_index: options.sheetIndex || 0,
      analysis_goals: options.analysisGoals || null,
    },
  });
  return response.data;
}

// ============================================
// Collaboration
// ============================================

export async function startSpreadsheetCollaboration(spreadsheetId, data = {}) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/collaborate`, data);
  return response.data;
}

export async function getSpreadsheetCollaborators(spreadsheetId) {
  const response = await api.get(`/spreadsheets/${spreadsheetId}/collaborators`);
  return response.data;
}
