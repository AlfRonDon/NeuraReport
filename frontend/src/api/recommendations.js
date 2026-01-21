/**
 * Template Recommendations API Client
 */
import apiClient from './client';

/**
 * Get template recommendations based on data
 */
export async function getRecommendations({ dataDescription, dataColumns, industry, outputFormat }) {
  const response = await apiClient.post('/recommendations/templates', {
    data_description: dataDescription,
    data_columns: dataColumns,
    industry,
    output_format: outputFormat,
  });
  return response.data;
}

/**
 * Get template catalog
 */
export async function getCatalog() {
  const response = await apiClient.get('/recommendations/catalog');
  return response.data;
}

export default {
  getRecommendations,
  getCatalog,
};
