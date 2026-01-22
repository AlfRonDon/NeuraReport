/**
 * Zustand store for Natural Language to SQL feature
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useQueryStore = create(
  persist(
    (set, get) => ({
      // Current query state
      currentQuestion: '',
      generatedSQL: '',
      explanation: '',
      confidence: 0,
      warnings: [],

      // Results
      results: null,
      columns: [],
      totalCount: null,
      executionTimeMs: null,

      // Execution options
      includeTotal: false,

      // UI state
      isGenerating: false,
      isExecuting: false,
      error: null,

      // Saved queries
      savedQueries: [],

      // History
      queryHistory: [],

      // Selected connection
      selectedConnectionId: null,
      selectedTables: [],

      // Actions
      setCurrentQuestion: (question) => set({ currentQuestion: question }),

      setGeneratedSQL: (sql) => set({ generatedSQL: sql }),

      setSelectedConnection: (connectionId) => set({ selectedConnectionId: connectionId, selectedTables: [] }),

      setSelectedTables: (tables) => set({ selectedTables: tables }),

      setGenerationResult: ({ sql, explanation, confidence, warnings, originalQuestion }) =>
        set({
          generatedSQL: sql,
          explanation,
          confidence,
          warnings: warnings || [],
          currentQuestion: originalQuestion,
          error: null,
        }),

      setExecutionResult: ({ columns, rows, rowCount, totalCount, executionTimeMs, truncated }) =>
        set({
          results: rows,
          columns,
          totalCount,
          executionTimeMs,
          error: null,
        }),

      setIncludeTotal: (includeTotal) => set({ includeTotal: Boolean(includeTotal) }),

      setError: (error) => set({ error, isGenerating: false, isExecuting: false }),

      setIsGenerating: (isGenerating) => set({ isGenerating }),

      setIsExecuting: (isExecuting) => set({ isExecuting }),

      clearResults: () =>
        set({
          results: null,
          columns: [],
          totalCount: null,
          executionTimeMs: null,
        }),

      clearAll: () =>
        set({
          currentQuestion: '',
          generatedSQL: '',
          explanation: '',
          confidence: 0,
          warnings: [],
          results: null,
          columns: [],
          totalCount: null,
          executionTimeMs: null,
          error: null,
        }),

      setSavedQueries: (queries) => set({ savedQueries: queries }),

      addSavedQuery: (query) =>
        set((state) => ({
          savedQueries: [query, ...state.savedQueries],
        })),

      removeSavedQuery: (queryId) =>
        set((state) => ({
          savedQueries: state.savedQueries.filter((q) => q.id !== queryId),
        })),

      setQueryHistory: (history) => set({ queryHistory: history }),

      addToHistory: (entry) =>
        set((state) => ({
          queryHistory: [entry, ...state.queryHistory].slice(0, 100),
        })),

      // Load saved query into editor
      loadSavedQuery: (query) =>
        set({
          currentQuestion: query.original_question || '',
          generatedSQL: query.sql,
          selectedConnectionId: query.connection_id,
          explanation: '',
          confidence: 0,
          warnings: [],
          results: null,
          columns: [],
          error: null,
        }),
    }),
    {
      name: 'neura-query-store',
      partialize: (state) => ({
        selectedConnectionId: state.selectedConnectionId,
        queryHistory: state.queryHistory.slice(0, 20), // Only persist recent history
      }),
    }
  )
)

export default useQueryStore
