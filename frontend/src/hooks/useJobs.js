import { useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { listJobs, getJob } from '../api/client'

export function useJobsList({ activeOnly = false, limit = 25 } = {}) {
  return useQuery({
    queryKey: ['jobs', activeOnly ? 'active' : 'all', limit],
    queryFn: () => listJobs({ activeOnly, limit }),
    refetchInterval: activeOnly ? 3000 : 6000,
    refetchOnWindowFocus: false,
  })
}

export function useJobDetails(jobId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => getJob(jobId),
    enabled: Boolean(jobId) && enabled,
    refetchOnWindowFocus: false,
  })
}

// Canonical terminal statuses - job is done, no more polling needed
const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled'])

export function useTrackedJobs(jobIds = [], { refetchInterval = 4000 } = {}) {
  const ids = Array.isArray(jobIds) ? jobIds.filter(Boolean) : []
  const queries = useQueries({
    queries: ids.map((jobId) => ({
      queryKey: ['jobs', jobId],
      queryFn: () => getJob(jobId),
      enabled: Boolean(jobId),
      refetchOnWindowFocus: false,
      refetchInterval: (data) => {
        const status = (data?.status || '').toLowerCase()
        // Stop polling for terminal statuses
        if (TERMINAL_STATUSES.has(status)) {
          return false
        }
        return refetchInterval
      },
    })),
  })
  return useMemo(() => {
    const jobsById = {}
    queries.forEach((result, index) => {
      const jobId = ids[index]
      if (!jobId) return
      if (result.data) {
        jobsById[jobId] = result.data
      }
    })
    const isFetching = queries.some((query) => query.isFetching)
    return { jobsById, isFetching }
  }, [ids, queries])
}
