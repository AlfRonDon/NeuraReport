/**
 * Connection Store for managing database connections
 */
import { create } from 'zustand';
import { bootstrapState, healthcheckConnection, deleteConnection } from '../api/client';

const useConnectionStore = create((set, get) => ({
  // State
  connections: [],
  loading: false,
  error: null,

  // Actions
  setConnections: (connections) => set({ connections }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Fetch all connections from bootstrap state
  fetchConnections: async () => {
    set({ loading: true, error: null });
    try {
      const data = await bootstrapState();
      const connections = Array.isArray(data?.connections) ? data.connections : [];
      set({ connections, loading: false });
      return connections;
    } catch (err) {
      set({ error: err.message, loading: false });
      return [];
    }
  },

  // Health check a connection
  healthCheck: async (connectionId) => {
    try {
      const result = await healthcheckConnection(connectionId);
      // Update the connection's latency in state
      set((state) => ({
        connections: state.connections.map((conn) =>
          conn.id === connectionId
            ? { ...conn, lastLatencyMs: result.latency_ms, status: 'connected' }
            : conn
        ),
      }));
      return result;
    } catch (err) {
      set((state) => ({
        connections: state.connections.map((conn) =>
          conn.id === connectionId ? { ...conn, status: 'error' } : conn
        ),
      }));
      throw err;
    }
  },

  // Remove a connection
  removeConnection: async (connectionId) => {
    set({ loading: true, error: null });
    try {
      await deleteConnection(connectionId);
      set((state) => ({
        connections: state.connections.filter((conn) => conn.id !== connectionId),
        loading: false,
      }));
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // Get connection by ID
  getConnection: (connectionId) => {
    return get().connections.find((conn) => conn.id === connectionId) || null;
  },

  // Reset state
  reset: () => set({ connections: [], error: null }),
}));

export default useConnectionStore;
