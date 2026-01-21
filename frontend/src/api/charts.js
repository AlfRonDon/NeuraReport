/**
 * Auto-Chart Generation API Client
 */
import apiClient from './client';

/**
 * Analyze data for chart recommendations
 * @param {Object} params
 * @param {Array} params.data - Data rows to analyze
 * @param {Object} [params.columnDescriptions] - Optional column descriptions
 * @param {number} [params.maxSuggestions=3] - Max number of suggestions
 */
export async function analyzeData({ data, columnDescriptions, maxSuggestions = 3 }) {
  const response = await apiClient.post('/charts/analyze', {
    data,
    column_descriptions: columnDescriptions || undefined,
    max_suggestions: maxSuggestions,
  });
  return response.data;
}

/**
 * Generate chart configuration
 * @param {Object} params
 * @param {Array} params.data - Data rows
 * @param {string} params.chartType - Chart type (bar, line, pie, etc.)
 * @param {string} params.xField - X-axis field name
 * @param {string[]} params.yFields - Y-axis field names (array)
 * @param {string} [params.title] - Chart title
 */
export async function generateChart({ data, chartType, xField, yFields, title }) {
  const response = await apiClient.post('/charts/generate', {
    data,
    chart_type: chartType,
    x_field: xField,
    y_fields: Array.isArray(yFields) ? yFields : [yFields],
    title,
  });
  return response.data;
}

export default {
  analyzeData,
  generateChart,
};
