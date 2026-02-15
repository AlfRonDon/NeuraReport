/**
 * Connection state slice for Zustand store.
 *
 * Split from the monolithic useAppStore to improve:
 * - Re-render performance (only subscribers of connection data re-render)
 * - Code organization (feature-scoped state)
 * - Testability (can mock individual slices)
 *
 * Based on: Zustand slice pattern (docs.pmnd.rs/zustand)
 */
export const createConnectionSlice = (set, get) => ({
  // State
  connections: [],
  activeConnectionId: null,
  connectionLoading: false,
  connectionError: null,

  // Actions
  setConnections: (connections) => set({ connections }),
  setActiveConnection: (id) => set({ activeConnectionId: id }),
  setConnectionLoading: (loading) => set({ connectionLoading: loading }),
  setConnectionError: (error) => set({ connectionError: error }),

  // Selectors (computed values)
  getActiveConnection: () => {
    const state = get();
    return state.connections.find(c => c.id === state.activeConnectionId) || null;
  },
  getConnectionById: (id) => {
    return get().connections.find(c => c.id === id) || null;
  },
});
