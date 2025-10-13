import { useEffect } from 'react'
import { bootstrapState } from '../api/client'
import { useAppStore } from '../store/useAppStore'

const CACHE_KEY = 'neura:persistent-cache'

const safeConnectionCache = (conn) => ({
  id: conn?.id ?? null,
  name: conn?.name ?? '',
  status: conn?.status ?? 'unknown',
  summary: conn?.summary ?? null,
  db_type: conn?.db_type ?? 'sqlite',
  lastConnected: conn?.lastConnected ?? null,
  lastLatencyMs: typeof conn?.lastLatencyMs === 'number' ? conn.lastLatencyMs : null,
  tags: Array.isArray(conn?.tags) ? conn.tags : [],
})

const safeTemplateCache = (tpl) => ({
  id: tpl?.id ?? null,
  name: tpl?.name ?? '',
  status: tpl?.status ?? 'draft',
  tags: Array.isArray(tpl?.tags) ? tpl.tags : [],
})

export const loadPersistedCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      connections: Array.isArray(parsed?.connections) ? parsed.connections : [],
      templates: Array.isArray(parsed?.templates) ? parsed.templates : [],
      lastUsed: parsed?.lastUsed || { connectionId: null, templateId: null },
    }
  } catch {
    return null
  }
}

export const savePersistedCache = ({ connections, templates, lastUsed }) => {
  try {
    const payload = {
      connections: Array.isArray(connections) ? connections.map(safeConnectionCache) : [],
      templates: Array.isArray(templates) ? templates.map(safeTemplateCache) : [],
      lastUsed: lastUsed || { connectionId: null, templateId: null },
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota errors */
  }
}

export function useBootstrapState() {
  const {
    hydrated,
    setHydrated,
    setSavedConnections,
    setTemplates,
    setLastUsed,
    setConnection,
  } = useAppStore()

  useEffect(() => {
    if (hydrated) return

    const cached = loadPersistedCache()
    if (cached) {
      setSavedConnections(cached.connections || [])
      setTemplates(cached.templates || [])
      setLastUsed(cached.lastUsed || { connectionId: null, templateId: null })
      const active =
        cached.lastUsed?.connectionId &&
        (cached.connections || []).find((c) => c.id === cached.lastUsed.connectionId)
      if (active) {
        setConnection({
          status: active.status || 'connected',
          saved: true,
          name: active.name,
          lastMessage: active.status,
          lastConnectedAt: active.lastConnected,
        })
      }
    }

    let cancelled = false
    const hydrate = async () => {
      try {
        const data = await bootstrapState()
        if (cancelled || !data) return
        const connections = Array.isArray(data.connections) ? data.connections : []
        const templates = Array.isArray(data.templates) ? data.templates : []
        setSavedConnections(connections)
        const lastUsed = data.last_used
          ? {
              connectionId: data.last_used.connection_id ?? null,
              templateId: data.last_used.template_id ?? null,
            }
          : { connectionId: null, templateId: null }

        setTemplates(templates)
        setLastUsed(lastUsed)

        const active =
          lastUsed.connectionId &&
          connections.find((c) => c.id === lastUsed.connectionId)
        if (active) {
          setConnection({
            status: active.status || 'connected',
            saved: true,
            name: active.name,
            lastMessage: active.status,
            lastConnectedAt: active.lastConnected,
          })
        }

        savePersistedCache({
          connections,
          templates,
          lastUsed,
        })
      } catch (err) {
        if (!cached) {
          setTemplates([])
        }
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }

    hydrate()
    return () => {
      cancelled = true
    }
  }, [
    hydrated,
    setHydrated,
    setSavedConnections,
    setTemplates,
    setLastUsed,
    setConnection,
  ])
}
