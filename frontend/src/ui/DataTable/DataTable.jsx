import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Checkbox,
  IconButton,
  Typography,
  Paper,
  Skeleton,
  alpha,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DataTableToolbar from './DataTableToolbar'
import DataTableEmptyState from './DataTableEmptyState'

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1
  if (b[orderBy] > a[orderBy]) return 1
  return 0
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy)
}

// Helpers for localStorage persistence
const STORAGE_PREFIX = 'neurareport_table_'

function loadPersistedState(key) {
  if (!key) return null
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function savePersistedState(key, state) {
  if (!key) return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(state))
  } catch {
    // Ignore storage errors
  }
}

export default function DataTable({
  columns,
  data = [],
  loading = false,
  selectable = false,
  onRowClick,
  onSelectionChange,
  rowActions,
  emptyState,
  filters,
  searchPlaceholder = 'Search...',
  onSearch,
  actions,
  bulkActions = [],
  onBulkDelete,
  title,
  subtitle,
  defaultSortField,
  defaultSortOrder = 'asc',
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  stickyHeader = false,
  persistKey = null, // Unique key to persist table state to localStorage
}) {
  // Load persisted state if available
  const persisted = loadPersistedState(persistKey)

  const [order, setOrder] = useState(persisted?.order || defaultSortOrder)
  const [orderBy, setOrderBy] = useState(persisted?.orderBy || defaultSortField || columns[0]?.field)
  const [selected, setSelected] = useState([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(persisted?.rowsPerPage || pageSize)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState(persisted?.filters || {})

  // Persist state to localStorage when it changes
  useEffect(() => {
    if (!persistKey) return
    savePersistedState(persistKey, {
      order,
      orderBy,
      rowsPerPage,
      filters: activeFilters,
    })
  }, [persistKey, order, orderBy, rowsPerPage, activeFilters])

  const handleRequestSort = useCallback((property) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }, [order, orderBy])

  const handleSelectAll = useCallback((event) => {
    if (event.target.checked) {
      const newSelected = data.map((row) => row.id)
      setSelected(newSelected)
      onSelectionChange?.(newSelected)
      return
    }
    setSelected([])
    onSelectionChange?.([])
  }, [data, onSelectionChange])

  const handleSelect = useCallback((id) => {
    const selectedIndex = selected.indexOf(id)
    let newSelected = []

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id)
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1))
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1))
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      )
    }

    setSelected(newSelected)
    onSelectionChange?.(newSelected)
  }, [selected, onSelectionChange])

  useEffect(() => {
    if (!selectable) return
    const idSet = new Set()
    data.forEach((row) => {
      if (row?.id != null) {
        idSet.add(row.id)
      }
    })
    const nextSelected = selected.filter((id) => idSet.has(id))
    if (nextSelected.length !== selected.length) {
      setSelected(nextSelected)
      onSelectionChange?.(nextSelected)
    }
  }, [data, selectable, selected, onSelectionChange])

  const handleChangePage = useCallback((_, newPage) => {
    setPage(newPage)
  }, [])

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }, [])

  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    setPage(0)
    onSearch?.(query)
  }, [onSearch])

  const handleRowKeyDown = useCallback((event, row, rowIndex) => {
    if (event.key === 'Enter' && onRowClick) {
      event.preventDefault()
      onRowClick(row)
      return
    }
    if ((event.key === ' ' || event.key === 'Spacebar') && selectable) {
      event.preventDefault()
      handleSelect(row.id)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const dir = event.key === 'ArrowDown' ? 1 : -1
      const rows = event.currentTarget.parentElement?.querySelectorAll('tr[data-row-index]')
      const next = rows?.[rowIndex + dir]
      if (next && typeof next.focus === 'function') {
        next.focus()
      }
    }
  }, [onRowClick, selectable, handleSelect])

  const filteredData = useMemo(() => {
    const filterEntries = Object.entries(activeFilters)
    const baseData = filterEntries.length
      ? data.filter((row) =>
        filterEntries.every(([key, filterValue]) => {
          const cellValue = row[key]
          if (cellValue == null) return false
          if (Array.isArray(cellValue)) {
            return cellValue.includes(filterValue)
          }
          if (typeof cellValue === 'string') {
            return cellValue.toLowerCase() === String(filterValue).toLowerCase()
          }
          return cellValue === filterValue
        })
      )
      : data

    if (!searchQuery) return baseData
    return baseData.filter((row) =>
      columns.some((col) => {
        const value = row[col.field]
        if (value == null) return false
        return String(value).toLowerCase().includes(searchQuery.toLowerCase())
      })
    )
  }, [data, searchQuery, columns, activeFilters])

  const sortedData = useMemo(() => {
    return [...filteredData].sort(getComparator(order, orderBy))
  }, [filteredData, order, orderBy])

  const paginatedData = useMemo(() => {
    return sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [sortedData, page, rowsPerPage])

  const isSelected = (id) => selected.indexOf(id) !== -1
  const numSelected = selected.length
  const rowCount = filteredData.length

  if (!loading && data.length === 0 && emptyState) {
    return (
      <Paper
        elevation={0}
        sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
      >
        <DataTableToolbar
          title={title}
          subtitle={subtitle}
          searchPlaceholder={searchPlaceholder}
          onSearch={handleSearch}
          filters={filters}
          actions={actions}
          bulkActions={bulkActions}
          onBulkDelete={onBulkDelete}
          numSelected={numSelected}
          onFiltersChange={setActiveFilters}
        />
        <DataTableEmptyState {...emptyState} />
      </Paper>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
    >
      <DataTableToolbar
        title={title}
        subtitle={subtitle}
        searchPlaceholder={searchPlaceholder}
        onSearch={handleSearch}
        filters={filters}
        actions={actions}
        bulkActions={bulkActions}
        onBulkDelete={onBulkDelete}
        numSelected={numSelected}
        onFiltersChange={setActiveFilters}
      />

      <TableContainer sx={{ maxHeight: stickyHeader ? 600 : 'none' }}>
        <Table stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={numSelected > 0 && numSelected < rowCount}
                    checked={rowCount > 0 && numSelected === rowCount}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={column.field}
                  align={column.align || 'left'}
                  sx={{
                    fontWeight: 600,
                    width: column.width,
                    minWidth: column.minWidth,
                  }}
                  sortDirection={orderBy === column.field ? order : false}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.field}
                      direction={orderBy === column.field ? order : 'asc'}
                      onClick={() => handleRequestSort(column.field)}
                    >
                      {column.headerName}
                    </TableSortLabel>
                  ) : (
                    column.headerName
                  )}
                </TableCell>
              ))}
              {rowActions && <TableCell align="right" sx={{ width: 60 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: rowsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Skeleton variant="rectangular" width={20} height={20} />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.field}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell>
                      <Skeleton variant="circular" width={24} height={24} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              paginatedData.map((row, rowIndex) => {
                const isItemSelected = isSelected(row.id)

                return (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={(event) => handleRowKeyDown(event, row, rowIndex)}
                    selected={isItemSelected}
                    data-row-index={rowIndex}
                    tabIndex={onRowClick || selectable ? 0 : -1}
                    role={onRowClick ? 'button' : undefined}
                    aria-selected={isItemSelected}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      '&.Mui-selected': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                      },
                    }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isItemSelected}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelect(row.id)
                          }}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.field} align={column.align || 'left'}>
                        {column.renderCell
                          ? column.renderCell(row[column.field], row)
                          : row[column.field]}
                      </TableCell>
                    ))}
                    {rowActions && (
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={pageSizeOptions}
        component="div"
        count={rowCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{ borderTop: 1, borderColor: 'divider' }}
      />
    </Paper>
  )
}
