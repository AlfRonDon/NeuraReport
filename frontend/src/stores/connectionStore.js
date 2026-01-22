/**
 * Connection Store for managing database connections
 */
import { create } from 'zustand';
import { bootstrapState, healthcheckConnection, deleteConnection } from '../api/client';
import { useAppStore } from '../store/useAppStore';

const getAppStore = () => useAppStore.getState();
const normalizeConnections = (connections) =>
  Array.isArray(connections) ? connections : [];

const useConnectionStore = create((set, get) => ({
  // State
  connections: normalizeConnections(getAppStore().savedConnections),
  loading: false,
  error: null,

  // Actions
  setConnections: (connections) => {
    const next = normalizeConnections(connections);
    getAppStore().setSavedConnections(next);
    set({ connections: next });
  },
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Fetch all connections from bootstrap state
  fetchConnections: async () => {
    set({ loading: true, error: null });
    try {
      const data = await bootstrapState();
      const connections = normalizeConnections(data?.connections);
      getAppStore().setSavedConnections(connections);
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
      getAppStore().updateSavedConnection(connectionId, {
        lastLatencyMs: result.latency_ms,
        status: 'connected',
      });
      return result;
    } catch (err) {
      getAppStore().updateSavedConnection(connectionId, { status: 'error' });
      throw err;
    }
  },

  // Remove a connection
  removeConnection: async (connectionId) => {
    set({ loading: true, error: null });
    try {
      await deleteConnection(connectionId);
      getAppStore().removeSavedConnection(connectionId);
      set({ loading: false });
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
  reset: () => {
    getAppStore().setSavedConnections([]);
    set({ connections: [], error: null });
  },
}));

useAppStore.subscribe(
  (state) => state.savedConnections,
  (savedConnections) => {
    useConnectionStore.setState({ connections: normalizeConnections(savedConnections) });
  }
);

export default useConnectionStore;
