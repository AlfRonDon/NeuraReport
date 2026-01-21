/**
 * Executive Summary API Client
 */
import apiClient from './client';

/**
 * Generate an executive summary from content
 */
export async function generateSummary({ content, tone = 'formal', maxSentences = 5, focusAreas }) {
  const response = await apiClient.post('/summary/generate', {
    content,
    tone,
    max_sentences: maxSentences,
    focus_areas: focusAreas,
  });
  return response.data;
}

/**
 * Generate summary for a specific report
 */
export async function getReportSummary(reportId) {
  const response = await apiClient.get(`/summary/reports/${reportId}`);
  return response.data;
}

export default {
  generateSummary,
  getReportSummary,
};
