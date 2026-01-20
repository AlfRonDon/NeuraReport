import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

const createMessage = (role, content, blocks = []) => ({
  id: nanoid(),
  role, // 'user' | 'assistant' | 'system'
  content,
  blocks, // Array of block types: connection, template, chart, table, progress, error
  timestamp: Date.now(),
  streaming: false,
})

const createSession = (title = 'New Session') => ({
  id: nanoid(),
  title,
  messages: [
    createMessage(
      'system',
      'Welcome to NeuraReport. Connect a database, upload a template, or describe what you want to generate.'
    ),
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export const useSessionStore = create(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      // Computed
      getActiveSession: () => {
        const { sessions, activeSessionId } = get()
        return sessions.find((s) => s.id === activeSessionId) || null
      },

      getSession: (id) => {
        return get().sessions.find((s) => s.id === id) || null
      },

      // Actions
      createSession: (title) => {
        const session = createSession(title)
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
        }))
        return session.id
      },

      setActiveSession: (id) => {
        set({ activeSessionId: id })
      },

      deleteSession: (id) => {
        set((state) => {
          const sessions = state.sessions.filter((s) => s.id !== id)
          const activeSessionId =
            state.activeSessionId === id
              ? sessions[0]?.id || null
              : state.activeSessionId
          return { sessions, activeSessionId }
        })
      },

      renameSession: (id, title) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, title, updatedAt: Date.now() } : s
          ),
        }))
      },

      addMessage: (sessionId, role, content, blocks = []) => {
        const message = createMessage(role, content, blocks)
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [...s.messages, message],
                  updatedAt: Date.now(),
                }
              : s
          ),
        }))
        return message.id
      },

      updateMessage: (sessionId, messageId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                  updatedAt: Date.now(),
                }
              : s
          ),
        }))
      },

      appendToMessage: (sessionId, messageId, content) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId
                      ? { ...m, content: m.content + content }
                      : m
                  ),
                }
              : s
          ),
        }))
      },

      addBlockToMessage: (sessionId, messageId, block) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId
                      ? { ...m, blocks: [...m.blocks, block] }
                      : m
                  ),
                }
              : s
          ),
        }))
      },

      updateBlockInMessage: (sessionId, messageId, blockId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId
                      ? {
                          ...m,
                          blocks: m.blocks.map((b) =>
                            b.id === blockId ? { ...b, ...updates } : b
                          ),
                        }
                      : m
                  ),
                }
              : s
          ),
        }))
      },

      clearMessages: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [
                    createMessage(
                      'system',
                      'Session cleared. Ready for new commands.'
                    ),
                  ],
                  updatedAt: Date.now(),
                }
              : s
          ),
        }))
      },
    }),
    {
      name: 'neura-sessions',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    }
  )
)

export { createMessage }
