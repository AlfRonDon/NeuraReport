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
  const response = await api.put(`/spreadsheets/${spreadsheetId}/cells`, {
    sheet_index: sheetIndex,
    updates,
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

export async function renameSheet(spreadsheetId, sheetIndex, newName) {
  const response = await api.put(`/spreadsheets/${spreadsheetId}/sheets/${sheetIndex}`, { name: newName });
  return response.data;
}

export async function freezePanes(spreadsheetId, sheetIndex, rows, columns) {
  const response = await api.put(`/spreadsheets/${spreadsheetId}/sheets/${sheetIndex}/freeze`, {
    frozen_rows: rows,
    frozen_columns: columns,
  });
  return response.data;
}

// ============================================
// Formatting
// ============================================

export async function addConditionalFormat(spreadsheetId, sheetIndex, format) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/sheets/${sheetIndex}/conditional-formats`, format);
  return response.data;
}

export async function removeConditionalFormat(spreadsheetId, sheetIndex, formatId) {
  const response = await api.delete(`/spreadsheets/${spreadsheetId}/sheets/${sheetIndex}/conditional-formats/${formatId}`);
  return response.data;
}

export async function addDataValidation(spreadsheetId, sheetIndex, validation) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/sheets/${sheetIndex}/validations`, validation);
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

export async function evaluateFormula(spreadsheetId, formula, context = {}) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/formula/evaluate`, { formula, context });
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
  const response = await api.post('/spreadsheets/import/csv', formData, {
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
  const response = await api.post('/spreadsheets/import/xlsx', formData, {
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

export async function generateFormula(spreadsheetId, naturalLanguage, context = {}) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/ai/formula`, {
    instruction: naturalLanguage,
    context,
  });
  return response.data;
}

export async function explainFormula(spreadsheetId, formula) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/ai/explain`, { formula });
  return response.data;
}

export async function suggestDataCleaning(spreadsheetId, sheetIndex) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/ai/clean`, { sheet_index: sheetIndex });
  return response.data;
}

export async function detectAnomalies(spreadsheetId, sheetIndex, columns) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/ai/anomalies`, {
    sheet_index: sheetIndex,
    columns,
  });
  return response.data;
}

export async function predictColumn(spreadsheetId, sheetIndex, sourceColumns, targetColumn) {
  const response = await api.post(`/spreadsheets/${spreadsheetId}/ai/predict`, {
    sheet_index: sheetIndex,
    source_columns: sourceColumns,
    target_column: targetColumn,
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
