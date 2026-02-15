/**
 * Template state slice for Zustand store.
 */
export const createTemplateSlice = (set, get) => ({
  templates: [],
  activeTemplateId: null,
  templateLoading: false,
  templateError: null,

  setTemplates: (templates) => set({ templates }),
  setActiveTemplate: (id) => set({ activeTemplateId: id }),
  setTemplateLoading: (loading) => set({ templateLoading: loading }),
  setTemplateError: (error) => set({ templateError: error }),

  getActiveTemplate: () => {
    const state = get();
    return state.templates.find(t => t.id === state.activeTemplateId) || null;
  },
});
