/**
 * Document Store - Zustand store for document editing and collaboration.
 */
import { create } from 'zustand';
import * as documentsApi from '../api/documents';

const useDocumentStore = create((set, get) => ({
  // State
  documents: [],
  currentDocument: null,
  versions: [],
  comments: [],
  collaborators: [],
  loading: false,
  saving: false,
  error: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Fetch all documents
  fetchDocuments: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await documentsApi.listDocuments(params);
      set({ documents: response.documents || [], loading: false });
      return response;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // Create document
  createDocument: async (data) => {
    set({ loading: true, error: null });
    try {
      const document = await documentsApi.createDocument(data);
      set((state) => ({
        documents: [document, ...state.documents],
        currentDocument: document,
        loading: false,
      }));
      return document;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // Get document
  getDocument: async (documentId) => {
    set({ loading: true, error: null });
    try {
      const document = await documentsApi.getDocument(documentId);
      set({ currentDocument: document, loading: false });
      return document;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // Update document
  updateDocument: async (documentId, data) => {
    set({ saving: true, error: null });
    try {
      const document = await documentsApi.updateDocument(documentId, data);
      set((state) => ({
        documents: state.documents.map((d) => (d.id === documentId ? document : d)),
        currentDocument: state.currentDocument?.id === documentId ? document : state.currentDocument,
        saving: false,
      }));
      return document;
    } catch (err) {
      set({ error: err.message, saving: false });
      return null;
    }
  },

  // Delete document
  deleteDocument: async (documentId) => {
    set({ loading: true, error: null });
    try {
      await documentsApi.deleteDocument(documentId);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== documentId),
        currentDocument: state.currentDocument?.id === documentId ? null : state.currentDocument,
        loading: false,
      }));
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // Version History
  fetchVersions: async (documentId) => {
    try {
      const response = await documentsApi.getVersions(documentId);
      set({ versions: response.versions || [] });
      return response.versions;
    } catch (err) {
      set({ error: err.message });
      return [];
    }
  },

  restoreVersion: async (documentId, versionId) => {
    set({ loading: true, error: null });
    try {
      const document = await documentsApi.restoreVersion(documentId, versionId);
      set((state) => ({
        currentDocument: document,
        loading: false,
      }));
      return document;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // Comments
  fetchComments: async (documentId) => {
    try {
      const response = await documentsApi.getComments(documentId);
      set({ comments: response.comments || [] });
      return response.comments;
    } catch (err) {
      set({ error: err.message });
      return [];
    }
  },

  addComment: async (documentId, data) => {
    try {
      const comment = await documentsApi.addComment(documentId, data);
      set((state) => ({
        comments: [...state.comments, comment],
      }));
      return comment;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  resolveComment: async (documentId, commentId, resolved = true) => {
    try {
      await documentsApi.resolveComment(documentId, commentId, resolved);
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId ? { ...c, resolved } : c
        ),
      }));
      return true;
    } catch (err) {
      set({ error: err.message });
      return false;
    }
  },

  // Collaboration
  startCollaboration: async (documentId, data = {}) => {
    try {
      const session = await documentsApi.startCollaboration(documentId, data);
      return session;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  fetchCollaborators: async (documentId) => {
    try {
      const response = await documentsApi.getCollaborators(documentId);
      set({ collaborators: response.collaborators || [] });
      return response.collaborators;
    } catch (err) {
      set({ error: err.message });
      return [];
    }
  },

  // PDF Operations
  mergePdfs: async (documentIds) => {
    set({ loading: true, error: null });
    try {
      const result = await documentsApi.mergePdfs(documentIds);
      set({ loading: false });
      return result;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  addWatermark: async (documentId, data) => {
    set({ loading: true, error: null });
    try {
      const result = await documentsApi.addWatermark(documentId, data);
      set({ loading: false });
      return result;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // AI Writing
  checkGrammar: async (documentId, text, options = {}) => {
    try {
      const result = await documentsApi.checkGrammar(documentId, text, options);
      return result;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  summarize: async (documentId, text, length = 'medium', style = 'paragraph') => {
    try {
      const result = await documentsApi.summarize(documentId, text, length, style);
      return result;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  rewrite: async (documentId, text, tone = 'professional', style = 'clear') => {
    try {
      const result = await documentsApi.rewrite(documentId, text, tone, style);
      return result;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  translate: async (documentId, text, targetLanguage) => {
    try {
      const result = await documentsApi.translate(documentId, text, targetLanguage);
      return result;
    } catch (err) {
      set({ error: err.message });
      return null;
    }
  },

  // Reset
  reset: () => set({
    currentDocument: null,
    versions: [],
    comments: [],
    collaborators: [],
    error: null,
  }),

  clearDocuments: () => set({
    documents: [],
    currentDocument: null,
  }),
}));

export default useDocumentStore;
