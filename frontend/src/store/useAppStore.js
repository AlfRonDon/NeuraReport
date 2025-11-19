import { create } from 'zustand'

const DISCOVERY_STORAGE_KEY = 'neura.discovery.v1'

const defaultDiscoveryState = { results: {}, meta: null }

const loadDiscoveryFromStorage = () => {
  if (typeof window === 'undefined') return defaultDiscoveryState
  try {
    const raw = window.localStorage.getItem(DISCOVERY_STORAGE_KEY)
    if (!raw) return defaultDiscoveryState
    const parsed = JSON.parse(raw)
    const results =
      parsed && parsed.results && typeof parsed.results === 'object' ? parsed.results : {}
    const meta = parsed && parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : null
    return { results, meta }
  } catch {
    return defaultDiscoveryState
  }
}

const persistDiscoveryToStorage = (results, meta) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      DISCOVERY_STORAGE_KEY,
      JSON.stringify({
        results: results && typeof results === 'object' ? results : {},
        meta: meta && typeof meta === 'object' ? meta : null,
        ts: Date.now(),
      }),
    )
  } catch {
    // swallow storage errors (private mode, quota, etc.)
  }
}

const clearDiscoveryStorage = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DISCOVERY_STORAGE_KEY)
  } catch {
    // swallow
  }
}

const discoveryInitial = loadDiscoveryFromStorage()

export const useAppStore = create((set, get) => ({
  // Setup nav (left navigation panes)
  setupNav: 'connect', // 'connect' | 'generate' | 'templates'
  setSetupNav: (pane) => set({ setupNav: pane }),

  templateKind: 'pdf', // 'pdf' | 'excel'
  setTemplateKind: (kind) =>
    set({ templateKind: kind === 'excel' ? 'excel' : 'pdf' }),

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

  // 🔹 Latest verified template id + artifacts (used by the mapping editor)
  templateId: null,
  setTemplateId: (id) => set({ templateId: id }),
  verifyArtifacts: null, // { pdf_url, png_url, html_url, llm2_html_url, schema_ext_url }
  setVerifyArtifacts: (arts) => set({ verifyArtifacts: arts }),

  // 🔹 Preview cache-buster + server-provided HTML URLs
  // Use cacheKey in iframe src as a query param (?v=cacheKey) to force re-fetch.
  cacheKey: 0,
  bumpCache: () => set({ cacheKey: Date.now() }),
  setCacheKey: (value) => set({ cacheKey: value ?? Date.now() }),
  // htmlUrls.final -> report_final.html?ts=...
  // htmlUrls.template -> template_p1.html?ts=...
  // htmlUrls.llm2 -> template_llm2.html?ts=...
  htmlUrls: { final: null, template: null, llm2: null },
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
      htmlUrls: { final: null, template: null, llm2: null },
      // (leave cacheKey as-is; callers can bumpCache() explicitly when needed)
    }),

  // Templates in app (only approved listed in Generate by default)
  templates: [],
  setTemplates: (templates) => set({ templates }),
  addTemplate: (tpl) => set({ templates: [tpl, ...get().templates] }),
  removeTemplate: (id) =>
    set((state) => {
      const templates = state.templates.filter((tpl) => tpl.id !== id)
      const nextLastUsed =
        state.lastUsed && typeof state.lastUsed === 'object'
          ? { ...state.lastUsed }
          : { connectionId: null, templateId: null }
      if (nextLastUsed.templateId === id) {
        nextLastUsed.templateId = null
      }
      const nextTemplateId = state.templateId === id ? null : state.templateId
      const nextLastApproved =
        state.lastApprovedTemplate?.id === id ? null : state.lastApprovedTemplate
      return {
        templates,
        templateId: nextTemplateId,
        lastUsed: nextLastUsed,
        lastApprovedTemplate: nextLastApproved,
      }
    }),
  updateTemplate: (templateId, updater) =>
    set((state) => {
      if (!templateId || typeof updater !== 'function') return {}
      let changed = false
      const templates = state.templates.map((tpl) => {
        if (tpl?.id !== templateId) {
          return tpl
        }
        const next = updater(tpl) || tpl
        if (next !== tpl) {
          changed = true
          return next
        }
        return tpl
      })
      return changed ? { templates } : {}
    }),

  // Last approved template summary
  lastApprovedTemplate: null,
  setLastApprovedTemplate: (tpl) => set({ lastApprovedTemplate: tpl }),

  // Unified template catalog (company + starter)
  templateCatalog: [],
  setTemplateCatalog: (items) =>
    set({
      templateCatalog: Array.isArray(items) ? items : [],
    }),

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

  // Discovery list sharing
  discoveryResults: discoveryInitial.results,
  discoveryMeta: discoveryInitial.meta,
  discoveryFinding: false,
  setDiscoveryResults: (results, meta) =>
    set((state) => {
      const nextResults =
        results && typeof results === 'object' ? results : defaultDiscoveryState.results
      const nextMeta = meta
        ? { ...(state.discoveryMeta || {}), ...meta }
        : state.discoveryMeta
      persistDiscoveryToStorage(nextResults, nextMeta)
      return { discoveryResults: nextResults, discoveryMeta: nextMeta }
    }),
  setDiscoveryMeta: (meta) =>
    set((state) => {
      if (!meta || typeof meta !== 'object') return {}
      const nextMeta = { ...(state.discoveryMeta || {}), ...meta }
      persistDiscoveryToStorage(state.discoveryResults, nextMeta)
      return { discoveryMeta: nextMeta }
    }),
  clearDiscoveryResults: () =>
    set(() => {
      clearDiscoveryStorage()
      return {
        discoveryResults: defaultDiscoveryState.results,
        discoveryMeta: defaultDiscoveryState.meta,
      }
    }),
  updateDiscoveryBatchSelection: (tplId, batchIdx, selected) =>
    set((state) => {
      const target = state.discoveryResults?.[tplId]
      if (!target || !Array.isArray(target.batches)) return {}
      const nextBatches = target.batches.map((batch, idx) =>
        idx === batchIdx ? { ...batch, selected } : batch,
      )
      const nextResults = {
        ...state.discoveryResults,
        [tplId]: { ...target, batches: nextBatches },
      }
      persistDiscoveryToStorage(nextResults, state.discoveryMeta)
      return { discoveryResults: nextResults }
    }),
  setDiscoveryFinding: (flag = false) => set({ discoveryFinding: !!flag }),
}))

if (typeof window !== 'undefined') {
  window.__NEURA_APP_STORE__ = useAppStore
  window.addEventListener('storage', (event) => {
    if (event.key !== DISCOVERY_STORAGE_KEY) return
    try {
      const parsed = event.newValue ? JSON.parse(event.newValue) : null
      useAppStore.setState({
        discoveryResults:
          parsed && parsed.results && typeof parsed.results === 'object'
            ? parsed.results
            : defaultDiscoveryState.results,
        discoveryMeta:
          parsed && parsed.meta && typeof parsed.meta === 'object'
            ? parsed.meta
            : defaultDiscoveryState.meta,
      })
    } catch {
      useAppStore.setState({
        discoveryResults: defaultDiscoveryState.results,
        discoveryMeta: defaultDiscoveryState.meta,
      })
    }
  })
}
