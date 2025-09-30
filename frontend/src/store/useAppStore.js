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
  savedConnections: [], // [{ id, name, db_type, host, db_name, status, lastConnected }]
  addSavedConnection: (conn) =>
    set({
      savedConnections: [
        { ...conn, id: conn.id || `conn_${Date.now()}` },
        ...get().savedConnections,
      ],
    }),
  updateSavedConnection: (id, updates) =>
    set({
      savedConnections: get().savedConnections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }),
  removeSavedConnection: (id) =>
    set({ savedConnections: get().savedConnections.filter((c) => c.id !== id) }),
  activeConnectionId: null,
  setActiveConnectionId: (id) => set({ activeConnectionId: id }),

  // 🔹 Latest verified template id + artifacts (used by Generate Mapping)
  templateId: null,
  setTemplateId: (id) => set({ templateId: id }),
  verifyArtifacts: null, // { pdf_url, png_url, html_url }
  setVerifyArtifacts: (arts) => set({ verifyArtifacts: arts }),

  // 🔹 Preview cache-buster + server-provided HTML URLs
  // Use cacheKey in iframe src as a query param (?v=cacheKey) to force re-fetch.
  cacheKey: 0,
  bumpCache: () => set({ cacheKey: Date.now() }),
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
}))
