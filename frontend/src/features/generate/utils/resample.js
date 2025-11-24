const MS_IN_MINUTE = 60 * 1000
const MS_IN_HOUR = 60 * MS_IN_MINUTE
const MS_IN_DAY = 24 * MS_IN_HOUR
const MS_IN_WEEK = 7 * MS_IN_DAY

export const DEFAULT_RESAMPLE_CONFIG = {
  dimension: 'time',
  metric: 'rows',
  aggregation: 'sum',
  bucket: 'auto',
  range: null,
}

export const RESAMPLE_DIMENSION_OPTIONS = [
  { value: 'time', label: 'Time' },
  { value: 'category', label: 'Category' },
  { value: 'batch_index', label: 'Discovery order' },
]

export const RESAMPLE_METRIC_OPTIONS = [
  { value: 'rows', label: 'Rows' },
  { value: 'rows_per_parent', label: 'Rows per parent' },
  { value: 'parent', label: 'Parent rows' },
]

export const RESAMPLE_AGGREGATION_OPTIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'max', label: 'Max' },
  { value: 'min', label: 'Min' },
]

export const RESAMPLE_BUCKET_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'minute', label: 'Minute' },
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

export const RESAMPLE_UNCATEGORIZED_LABEL = 'Uncategorized'

export const clampBrushRange = (range, maxIndex) => {
  if (!Array.isArray(range) || range.length !== 2 || maxIndex < 0) return null
  const start = Math.max(0, Math.min(maxIndex, Number(range[0]) || 0))
  const endRaw = Number(range[1])
  const end = Math.max(start, Math.min(maxIndex, Number.isFinite(endRaw) ? endRaw : maxIndex))
  return [start, end]
}

export const resolveTimeBucket = (metrics, requestedBucket) => {
  if (requestedBucket && requestedBucket !== 'auto') return requestedBucket
  const timestamps = (Array.isArray(metrics) ? metrics : [])
    .map((entry) => Date.parse(entry?.time ?? entry?.timestamp ?? ''))
    .filter((value) => !Number.isNaN(value))
  if (!timestamps.length) return 'day'
  const span = Math.max(...timestamps) - Math.min(...timestamps)
  if (span > 120 * MS_IN_DAY) return 'month'
  if (span > 35 * MS_IN_DAY) return 'week'
  if (span > 7 * MS_IN_DAY) return 'day'
  if (span > 6 * MS_IN_HOUR) return 'hour'
  return 'minute'
}

const truncateTimestampToBucket = (timestamp, bucket) => {
  if (timestamp == null) return null
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  if (bucket === 'month') {
    return new Date(date.getFullYear(), date.getMonth(), 1).setHours(0, 0, 0, 0)
  }
  if (bucket === 'week') {
    const day = date.getDay()
    const diff = date.getDate() - day
    return new Date(date.getFullYear(), date.getMonth(), diff).setHours(0, 0, 0, 0)
  }
  if (bucket === 'day') {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).setHours(0, 0, 0, 0)
  }
  if (bucket === 'hour') {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).setMinutes(0, 0, 0)
  }
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ).setSeconds(0, 0)
}

const formatBucketLabel = (timestamp, bucket) => {
  if (timestamp == null) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  if (bucket === 'month') {
    return date.toLocaleString(undefined, { month: 'short', year: 'numeric' })
  }
  if (bucket === 'week' || bucket === 'day') {
    return date.toLocaleDateString()
  }
  if (bucket === 'hour') {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    })
  }
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export const collectIdsFromSeries = (series, range) => {
  const ids = new Set()
  if (!Array.isArray(series) || !Array.isArray(range)) return ids
  for (let idx = range[0]; idx <= range[1] && idx < series.length; idx += 1) {
    const bucket = series[idx]
    if (!bucket) continue
    const batchIds = Array.isArray(bucket.batchIds) ? bucket.batchIds : []
    batchIds.forEach((id) => ids.add(String(id)))
  }
  return ids
}

export const buildResampleComputation = (metrics, config = DEFAULT_RESAMPLE_CONFIG) => {
  const safeMetrics = Array.isArray(metrics) ? metrics : []
  const dimension = config?.dimension || DEFAULT_RESAMPLE_CONFIG.dimension
  const metricKey = config?.metric || DEFAULT_RESAMPLE_CONFIG.metric
  const aggregation = config?.aggregation || DEFAULT_RESAMPLE_CONFIG.aggregation
  const bucketSelection = config?.bucket || DEFAULT_RESAMPLE_CONFIG.bucket
  const resolvedBucket = dimension === 'time' ? resolveTimeBucket(safeMetrics, bucketSelection) : 'none'
  const groupsMap = new Map()

  safeMetrics.forEach((entry, idx) => {
    const batchIndexRaw = entry?.batch_index
    const batchIndex = Number.isFinite(Number(batchIndexRaw)) ? Number(batchIndexRaw) : idx + 1
    const batchId = entry?.batch_id ?? entry?.batchId ?? entry?.id ?? batchIndex
    if (batchId == null) return
    const metricValue = Number(entry?.[metricKey]) || 0
    let groupKey = ''
    let sortValue = 0
    let label = ''
    if (dimension === 'time') {
      const timestamp = Date.parse(entry?.time ?? entry?.timestamp ?? '')
      if (Number.isNaN(timestamp)) return
      const truncated = truncateTimestampToBucket(timestamp, resolvedBucket)
      if (truncated == null) return
      groupKey = `${resolvedBucket}:${truncated}`
      sortValue = truncated
      label = formatBucketLabel(truncated, resolvedBucket)
    } else if (dimension === 'category') {
      const category = entry?.category != null && String(entry.category).trim().length
        ? String(entry.category)
        : RESAMPLE_UNCATEGORIZED_LABEL
      groupKey = `cat:${category}`
      sortValue = category.toLowerCase()
      label = category
    } else {
      groupKey = `idx:${batchIndex}`
      sortValue = batchIndex
      label = `Batch ${batchIndex}`
    }
    const existing = groupsMap.get(groupKey) || {
      key: groupKey,
      label,
      sortValue,
      sum: 0,
      count: 0,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      batchIds: new Set(),
    }
    existing.sum += metricValue
    existing.count += 1
    existing.min = Math.min(existing.min, metricValue)
    existing.max = Math.max(existing.max, metricValue)
    existing.batchIds.add(String(batchId))
    groupsMap.set(groupKey, existing)
  })

  const series = Array.from(groupsMap.values())
    .map((entry) => {
      let value = entry.sum
      if (aggregation === 'avg') {
        value = entry.count ? entry.sum / entry.count : 0
      } else if (aggregation === 'max') {
        value = entry.max === Number.NEGATIVE_INFINITY ? 0 : entry.max
      } else if (aggregation === 'min') {
        value = entry.min === Number.POSITIVE_INFINITY ? 0 : entry.min
      }
      return {
        key: entry.key,
        label: entry.label,
        value,
        sortValue: entry.sortValue,
        batchIds: Array.from(entry.batchIds),
      }
    })
    .sort((a, b) => {
      if (typeof a.sortValue === 'number' && typeof b.sortValue === 'number') {
        return a.sortValue - b.sortValue
      }
      return String(a.sortValue).localeCompare(String(b.sortValue))
    })

  if (!series.length) {
    return {
      series,
      resolvedBucket,
      displayRange: null,
      configRange: null,
      allowedIds: null,
      filterActive: false,
    }
  }

  const maxIndex = series.length - 1
  const hasUserRange = Array.isArray(config?.range) && config.range.length === 2
  const clampedRange = clampBrushRange(hasUserRange ? config.range : [0, maxIndex], maxIndex) ?? [0, maxIndex]
  const coversAll = clampedRange[0] === 0 && clampedRange[1] === maxIndex
  const filterActive = hasUserRange && !coversAll
  const allowedIds = filterActive ? collectIdsFromSeries(series, clampedRange) : null

  return {
    series,
    resolvedBucket,
    displayRange: clampedRange,
    configRange: filterActive ? clampedRange : null,
    allowedIds,
    filterActive,
  }
}
