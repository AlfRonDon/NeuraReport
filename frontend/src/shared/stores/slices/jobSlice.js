/**
 * Job tracking state slice for Zustand store.
 */
export const createJobSlice = (set, get) => ({
  jobs: [],
  activeJobId: null,
  jobPollingEnabled: false,

  setJobs: (jobs) => set({ jobs }),
  addJob: (job) => set(state => ({ jobs: [...state.jobs, job] })),
  updateJob: (jobId, updates) => set(state => ({
    jobs: state.jobs.map(j => j.id === jobId ? { ...j, ...updates } : j),
  })),
  removeJob: (jobId) => set(state => ({
    jobs: state.jobs.filter(j => j.id !== jobId),
  })),
  setJobPolling: (enabled) => set({ jobPollingEnabled: enabled }),

  getJobById: (id) => get().jobs.find(j => j.id === id) || null,
  getPendingJobs: () => get().jobs.filter(j => ['queued', 'running'].includes(j.status)),
});
