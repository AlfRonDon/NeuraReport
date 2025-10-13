import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // Setup nav (left navigation panes)
  setupNav: 'connect', // 'connect' | 'generate' | 'templates'
  setSetupNav: (pane) => set({ setupNav: pane }),

  // Setup flow gating
  setupStep: 'connect', // 'connect' | 'upload' | 'mapping' | 'approve'
  setSetupStep: (step) => set({ setupStep: step }),

  // Connection status
  connection: { status: 'disconnected', lastMessage: null, saved: false, name: '' },
  setConnection: (conn) => set({ connection: { ...get().connection, ...conn } }),

  // Saved connections and active selection
  savedConnections: [], // [{ id, name, db_type, status, lastConnected, summary }]
  setSavedConnections: (connections) =>
    set({ savedConnections: Array.isArray(connections) ? connections : [] }),
  addSavedConnection: (conn) =>
    set((state) => {
      const incoming = conn?.id ? conn : { ...conn, id: conn?.id || `conn_${Date.now()}` }
      const filtered = state.savedConnections.filter((c) => c.id !== incoming.id)
      return { savedConnections: [incoming, ...filtered] }
    }),
  updateSavedConnection: (id, updates) =>
    set((state) => ({
      savedConnections: state.savedConnections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
      activeConnection:
        state.activeConnectionId === id
          ? { ...state.activeConnection, ...updates }
          : state.activeConnection,
    })),
  removeSavedConnection: (id) =>
    set((state) => ({
      savedConnections: state.savedConnections.filter((c) => c.id !== id),
      activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId,
      activeConnection: state.activeConnectionId === id ? null : state.activeConnection,
    })),
  activeConnectionId: null,
  activeConnection: null,
  setActiveConnectionId: (id) =>
    set((state) => ({
      activeConnectionId: id,
      activeConnection: state.savedConnections.find((c) => c.id === id) || null,
    })),
  setActiveConnection: (conn) => set({ activeConnection: conn }),

  // 🔹 Latest verified template id + artifacts (used by Generate Mapping)
  templateId: null,
  setTemplateId: (id) => set({ templateId: id }),
  verifyArtifacts: null, // { pdf_url, png_url, html_url }
  setVerifyArtifacts: (arts) => set({ verifyArtifacts: arts }),

  // 🔹 Preview cache-buster + server-provided HTML URLs
  // Use cacheKey in iframe src as a query param (?v=cacheKey) to force re-fetch.
  cacheKey: 0,
  bumpCache: () => set({ cacheKey: Date.now() }),
  setCacheKey: (value) => set({ cacheKey: value ?? Date.now() }),
  // htmlUrls.final -> report_final.html?ts=...
  // htmlUrls.template -> template_p1.html?ts=...
  htmlUrls: { final: null, template: null },
  setHtmlUrls: (urlsOrUpdater) =>
    set((state) => {
      const next =
        typeof urlsOrUpdater === 'function'
          ? urlsOrUpdater(state.htmlUrls)
          : urlsOrUpdater
      return { htmlUrls: { ...state.htmlUrls, ...next } }
    }),

  resetSetup: () =>
    set({
      setupNav: 'connect',
      setupStep: 'connect',
      connection: { status: 'disconnected', lastMessage: null, saved: false, name: '' },
      lastApprovedTemplate: null,
      templateId: null,
      verifyArtifacts: null,
      activeConnectionId: null,
      activeConnection: null,
      // reset preview URLs so panes don't show stale content after a full reset
      htmlUrls: { final: null, template: null },
      // (leave cacheKey as-is; callers can bumpCache() explicitly when needed)
    }),

  // Templates in app (only approved listed in Generate by default)
  templates: [],
  setTemplates: (templates) => set({ templates }),
  addTemplate: (tpl) => set({ templates: [tpl, ...get().templates] }),

  // Last approved template summary
  lastApprovedTemplate: null,
  setLastApprovedTemplate: (tpl) => set({ lastApprovedTemplate: tpl }),

  runs: [],
  setRuns: (runs) => set({ runs }),

  // Recently downloaded artifacts
  downloads: [],
  addDownload: (item) =>
    set({ downloads: [item, ...get().downloads].slice(0, 20) }),

  hydrated: false,
  setHydrated: (flag = true) => set({ hydrated: !!flag }),
  lastUsed: { connectionId: null, templateId: null },
  setLastUsed: (payload) =>
    set((state) => {
      const next = payload || { connectionId: null, templateId: null }
      const activeConnection = next.connectionId
        ? state.savedConnections.find((c) => c.id === next.connectionId) || state.activeConnection
        : state.activeConnection
      return {
        lastUsed: next,
        activeConnectionId: Object.prototype.hasOwnProperty.call(next, 'connectionId')
          ? next.connectionId
          : state.activeConnectionId,
        activeConnection,
        templateId: Object.prototype.hasOwnProperty.call(next, 'templateId')
          ? next.templateId
          : state.templateId,
      }
    }),
}))

if (typeof window !== 'undefined') {
  window.__NEURA_APP_STORE__ = useAppStore
}
