/**
 * Document Q&A Chat Store
 */
import { create } from 'zustand';
import * as docqaApi from '../api/docqa';

const useDocQAStore = create((set, get) => ({
  // State
  sessions: [],
  currentSession: null,
  messages: [],
  loading: false,
  asking: false,
  error: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Fetch all sessions
  fetchSessions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await docqaApi.listSessions();
      set({ sessions: response.sessions || [], loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Create session
  createSession: async (name) => {
    set({ loading: true, error: null });
    try {
      const response = await docqaApi.createSession(name);
      const session = response.session;
      set((state) => ({
        sessions: [...state.sessions, session],
        currentSession: session,
        messages: [],
        loading: false,
      }));
      return session;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // Get session
  getSession: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      const response = await docqaApi.getSession(sessionId);
      set({
        currentSession: response.session,
        messages: response.session?.messages || [],
        loading: false,
      });
      return response.session;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // Delete session
  deleteSession: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      await docqaApi.deleteSession(sessionId);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
        messages: state.currentSession?.id === sessionId ? [] : state.messages,
        loading: false,
      }));
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // Add document
  addDocument: async (sessionId, documentData) => {
    set({ loading: true, error: null });
    try {
      const response = await docqaApi.addDocument(sessionId, documentData);
      await get().getSession(sessionId);
      set({ loading: false });
      return response.document;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // Remove document
  removeDocument: async (sessionId, documentId) => {
    set({ loading: true, error: null });
    try {
      await docqaApi.removeDocument(sessionId, documentId);
      await get().getSession(sessionId);
      set({ loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // Ask question
  askQuestion: async (sessionId, question, options = {}) => {
    // Add user message optimistically
    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
      citations: [],
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      asking: true,
      error: null,
    }));

    try {
      const response = await docqaApi.askQuestion(sessionId, {
        question,
        ...options,
      });

      // Replace temp message with actual and add assistant response
      set((state) => ({
        messages: [
          ...state.messages.filter((m) => m.id !== userMessage.id),
          { ...userMessage, id: response.response?.message?.id || userMessage.id },
          response.response?.message,
        ].filter(Boolean),
        asking: false,
      }));

      return response.response;
    } catch (err) {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== userMessage.id),
        error: err.message,
        asking: false,
      }));
      return null;
    }
  },

  // Clear history
  clearHistory: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      await docqaApi.clearHistory(sessionId);
      set({ messages: [], loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // Reset state
  reset: () => set({
    currentSession: null,
    messages: [],
    error: null,
  }),
}));

export default useDocQAStore;
