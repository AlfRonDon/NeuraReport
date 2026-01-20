import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Connection state
      connection: null, // { id, name, type, status, tables }

      // Templates state
      templates: [], // Array of template objects

      // UI state
      sidebarOpen: true,
      commandPaletteOpen: false,
      settingsOpen: false,

      // Processing state
      isProcessing: false,
      abortController: null,

      // Connection actions
      setConnection: (connection) => {
        set({ connection })
      },

      clearConnection: () => {
        set({ connection: null })
      },

      // Template actions
      setTemplates: (templates) => {
        set({ templates })
      },

      addTemplate: (template) => {
        set((state) => ({
          templates: [...state.templates, template],
        }))
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }))
      },

      removeTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }))
      },

      // UI actions
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }))
      },

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open })
      },

      openCommandPalette: () => {
        set({ commandPaletteOpen: true })
      },

      closeCommandPalette: () => {
        set({ commandPaletteOpen: false })
      },

      openSettings: () => {
        set({ settingsOpen: true })
      },

      closeSettings: () => {
        set({ settingsOpen: false })
      },

      // Processing actions
      startProcessing: () => {
        const controller = new AbortController()
        set({ isProcessing: true, abortController: controller })
        return controller
      },

      stopProcessing: () => {
        const { abortController } = get()
        if (abortController) {
          abortController.abort()
        }
        set({ isProcessing: false, abortController: null })
      },

      finishProcessing: () => {
        set({ isProcessing: false, abortController: null })
      },
    }),
    {
      name: 'neura-app',
      partialize: (state) => ({
        connection: state.connection,
        templates: state.templates,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
