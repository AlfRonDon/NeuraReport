/**
 * Agent Store - Zustand store for AI agents.
 */
import { create } from 'zustand';
import * as agentsApi from '../api/agents';

const useAgentStore = create((set, get) => ({
  // State
  tasks: [],
  currentTask: null,
  agentTypes: [],
  repurposeFormats: [],
  loading: false,
  executing: false,
  error: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Research Agent
  runResearch: async (topic, options = {}) => {
    set({ executing: true, error: null });
    try {
      const task = await agentsApi.runResearchAgent(topic, options);
      set((state) => ({
        tasks: [task, ...state.tasks],
        currentTask: task,
        executing: false,
      }));
      return task;
    } catch (err) {
      set({ error: err.message, executing: false });
      return null;
    }
  },

  // Data Analyst Agent
  runDataAnalysis: async (question, data, options = {}) => {
    set({ executing: true, error: null });
    try {
      const task = await agentsApi.runDataAnalystAgent(question, data, options);
      set((state) => ({
        tasks: [task, ...state.tasks],
        currentTask: task,
        executing: false,
      }));
      return task;
    } catch (err) {
      set({ error: err.message, executing: false });
      return null;
    }
  },

  // Email Draft Agent
  runEmailDraft: async (context, purpose, options = {}) => {
    set({ executing: true, error: null });
    try {
      const task = await agentsApi.runEmailDraftAgent(context, purpose, options);
      set((state) => ({
        tasks: [task, ...state.tasks],
        currentTask: task,
        executing: false,
      }));
      return task;
    } catch (err) {
      set({ error: err.message, executing: false });
      return null;
    }
  },

  // Content Repurpose Agent
  runContentRepurpose: async (content, sourceFormat, targetFormats, options = {}) => {
    set({ executing: true, error: null });
    try {
      const task = await agentsApi.runContentRepurposeAgent(content, sourceFormat, targetFormats, options);
      set((state) => ({
        tasks: [task, ...state.tasks],
        currentTask: task,
        executing: false,
      }));
      return task;
    } catch (err) {
      set({ error: err.message, executing: false });
      return null;
    }
  },

  // Proofreading Agent
  runProofreading: async (text, options = {}) => {
    set({ executing: true, error: null });
    try {
      const task = await agentsApi.runProofreadingAgent(text, options);
      set((state) => ({
        tasks: [task, ...state.tasks],
        currentTask: task,
        executing: false,
      }));
      return task;
    } catch (err) {
      set({ error: err.message, executing: false });
      return null;
    }
  },

  // Task Management
  fetchTasks: async (agentType = null) => {
    set({ loading: true, error: null });
    try {
      const tasks = await agentsApi.listTasks(agentType);
      set({ tasks, loading: false });
      return tasks;
    } catch (err) {
      set({ error: err.message, loading: false });
      return [];
    }
  },

  getTask: async (taskId) => {
    set({ loading: true, error: null });
    try {
      const task = await agentsApi.getTask(taskId);
      set({ currentTask: task, loading: false });
      return task;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // Utility
  fetchAgentTypes: async () => {
    try {
      const response = await agentsApi.listAgentTypes();
      set({ agentTypes: response.types || [] });
      return response.types;
    } catch (err) {
      set({ error: err.message });
      return [];
    }
  },

  fetchRepurposeFormats: async () => {
    try {
      const response = await agentsApi.listRepurposeFormats();
      set({ repurposeFormats: response.formats || [] });
      return response.formats;
    } catch (err) {
      set({ error: err.message });
      return [];
    }
  },

  // Reset
  reset: () => set({
    currentTask: null,
    error: null,
  }),

  clearTasks: () => set({
    tasks: [],
    currentTask: null,
  }),
}));

export default useAgentStore;
