/**
 * Premium Data Table Component
 * Sophisticated table with glassmorphism, animations, and advanced interactions
 */
import { Fragment, useState, useMemo, useCallback, useEffect } from 'react'
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
  Skeleton,
  Tooltip,
  Fade,
  Collapse,
  useTheme,
  alpha,
  styled,
  keyframes,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  ArrowUpward as SortAscIcon,
  ArrowDownward as SortDescIcon,
} from '@mui/icons-material'
import DataTableToolbar from './DataTableToolbar'
import DataTableEmptyState from './DataTableEmptyState'

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const TableWrapper = styled(Box)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.7),
  backdropFilter: 'blur(20px)',
  borderRadius: 16,
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  overflow: 'hidden',
  boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.06)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
  },
}))

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  '&::-webkit-scrollbar': {
    width: 8,
    height: 8,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.text.primary, 0.1),
    borderRadius: 4,
    '&:hover': {
      backgroundColor: alpha(theme.palette.text.primary, 0.2),
    },
  },
}))

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  '& .MuiTableCell-head': {
    backgroundColor: alpha(theme.palette.background.paper, 0.5),
    backdropFilter: 'blur(10px)',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    padding: theme.spacing(1.5, 2),
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
    },
  },
}))

const StyledTableRow = styled(TableRow, {
  shouldForwardProp: (prop) => !['rowIndex', 'isClickable'].includes(prop),
})(({ theme, rowIndex, isClickable }) => ({
  animation: `${fadeInUp} 0.4s ease-out`,
  animationDelay: `${rowIndex * 0.03}s`,
  animationFillMode: 'both',
  transition: 'all 0.2s ease',
  cursor: isClickable ? 'pointer' : 'default',
  '& .MuiTableCell-body': {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
    padding: theme.spacing(1.5, 2),
    fontSize: 14,
    transition: 'all 0.2s ease',
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    '& .MuiTableCell-body': {
      color: theme.palette.text.primary,
    },
    '& .row-actions': {
      opacity: 1,
      transform: 'translateX(0)',
    },
  },
  '&.Mui-selected': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.12),
    },
  },
  '&:last-child .MuiTableCell-body': {
    borderBottom: 'none',
  },
}))

const RowActionsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: theme.spacing(0.5),
  opacity: 0.5,
  transform: 'translateX(4px)',
  transition: 'all 0.2s ease',
}))

const StyledCheckbox = styled(Checkbox)(({ theme }) => ({
  color: alpha(theme.palette.text.primary, 0.3),
  padding: theme.spacing(0.5),
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
  },
  '&.Mui-checked': {
    color: theme.palette.primary.main,
  },
  '&.MuiCheckbox-indeterminate': {
    color: theme.palette.primary.main,
  },
}))

const StyledTableSortLabel = styled(TableSortLabel)(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&:hover': {
    color: theme.palette.primary.main,
  },
  '&.Mui-active': {
    color: theme.palette.primary.main,
    '& .MuiTableSortLabel-icon': {
      color: theme.palette.primary.main,
    },
  },
  '& .MuiTableSortLabel-icon': {
    fontSize: 16,
    transition: 'all 0.2s ease',
  },
}))

const SkeletonRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1.5, 2),
  gap: theme.spacing(2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
  animation: `${pulse} 1.5s infinite ease-in-out`,
}))

const ShimmerSkeleton = styled(Skeleton)(({ theme }) => ({
  background: `linear-gradient(
    90deg,
    ${alpha(theme.palette.text.primary, 0.06)} 0%,
    ${alpha(theme.palette.text.primary, 0.12)} 50%,
    ${alpha(theme.palette.text.primary, 0.06)} 100%
  )`,
  backgroundSize: '200% 100%',
  animation: `${shimmer} 1.5s infinite`,
  borderRadius: 6,
}))

const StyledPagination = styled(TablePagination)(({ theme }) => ({
  borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.3),
  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
    fontSize: 13,
    color: theme.palette.text.secondary,
  },
  '& .MuiTablePagination-select': {
    borderRadius: 8,
    fontSize: 13,
  },
  '& .MuiTablePagination-actions': {
    '& .MuiIconButton-root': {
      color: theme.palette.text.secondary,
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        color: theme.palette.primary.main,
      },
      '&.Mui-disabled': {
        color: alpha(theme.palette.text.primary, 0.2),
      },
    },
  },
}))

const ExpandableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.3),
  '& .MuiTableCell-body': {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
  },
}))

// =============================================================================
// HELPERS
// =============================================================================

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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DataTable({
  columns,
  data = [],
  loading = false,
  selectable = false,
  expandable = false,
  renderExpandedRow,
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
  persistKey = null,
  rowHeight = 'medium', // 'compact', 'medium', 'comfortable'
}) {
  const theme = useTheme()
  const persisted = loadPersistedState(persistKey)

  const [order, setOrder] = useState(persisted?.order || defaultSortOrder)
  const [orderBy, setOrderBy] = useState(persisted?.orderBy || defaultSortField || columns[0]?.field)
  const [selected, setSelected] = useState([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(persisted?.rowsPerPage || pageSize)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState(persisted?.filters || {})
  const [expandedRows, setExpandedRows] = useState(new Set())

  // Persist state
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
      newSelected = [...selected, id]
    } else {
      newSelected = selected.filter((item) => item !== id)
    }

    setSelected(newSelected)
    onSelectionChange?.(newSelected)
  }, [selected, onSelectionChange])

  const handleToggleExpand = useCallback((id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!selectable) return
    const idSet = new Set(data.map((row) => row?.id).filter(Boolean))
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
      if (next?.focus) next.focus()
    }
  }, [onRowClick, selectable, handleSelect])

  const filteredData = useMemo(() => {
    const filterEntries = Object.entries(activeFilters)
    const baseData = filterEntries.length
      ? data.filter((row) =>
          filterEntries.every(([key, filterValue]) => {
            const cellValue = row[key]
            if (cellValue == null) return false
            if (Array.isArray(cellValue)) return cellValue.includes(filterValue)
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

  const isSelected = (id) => selected.includes(id)
  const numSelected = selected.length
  const rowCount = filteredData.length

  const cellPadding = {
    compact: 1,
    medium: 1.5,
    comfortable: 2,
  }[rowHeight] || 1.5

  // Empty state
  if (!loading && data.length === 0 && emptyState) {
    return (
      <TableWrapper>
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
      </TableWrapper>
    )
  }

  return (
    <TableWrapper>
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

      <StyledTableContainer sx={{ maxHeight: stickyHeader ? 600 : 'none' }}>
        <Table stickyHeader={stickyHeader} size={rowHeight === 'compact' ? 'small' : 'medium'}>
          <StyledTableHead>
            <TableRow>
              {expandable && <TableCell sx={{ width: 48 }} />}
              {selectable && (
                <TableCell padding="checkbox" sx={{ width: 48 }}>
                  <StyledCheckbox
                    indeterminate={numSelected > 0 && numSelected < rowCount}
                    checked={rowCount > 0 && numSelected === rowCount}
                    onChange={handleSelectAll}
                    inputProps={{ 'aria-label': 'Select all rows' }}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={column.field}
                  align={column.align || 'left'}
                  sx={{
                    width: column.width,
                    minWidth: column.minWidth,
                  }}
                  sortDirection={orderBy === column.field ? order : false}
                >
                  {column.sortable !== false ? (
                    <StyledTableSortLabel
                      active={orderBy === column.field}
                      direction={orderBy === column.field ? order : 'asc'}
                      onClick={() => handleRequestSort(column.field)}
                    >
                      {column.headerName}
                    </StyledTableSortLabel>
                  ) : (
                    column.headerName
                  )}
                </TableCell>
              ))}
              {rowActions && <TableCell align="right" sx={{ width: 80 }} />}
            </TableRow>
          </StyledTableHead>

          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: rowsPerPage }).map((_, index) => (
                <TableRow key={index}>
                  {expandable && (
                    <TableCell sx={{ p: cellPadding }}>
                      <ShimmerSkeleton variant="circular" width={24} height={24} />
                    </TableCell>
                  )}
                  {selectable && (
                    <TableCell padding="checkbox">
                      <ShimmerSkeleton variant="rectangular" width={18} height={18} sx={{ borderRadius: 0.5 }} />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.field} sx={{ p: cellPadding }}>
                      <ShimmerSkeleton
                        variant="text"
                        width={column.width || '80%'}
                        height={20}
                      />
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell sx={{ p: cellPadding }}>
                      <ShimmerSkeleton variant="circular" width={24} height={24} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              paginatedData.map((row, rowIndex) => {
                const isItemSelected = isSelected(row.id)
                const isExpanded = expandedRows.has(row.id)
                const rowKey = row.id ?? rowIndex

                return (
                  <Fragment key={rowKey}>
                    <StyledTableRow
                      hover
                      onClick={() => onRowClick?.(row)}
                      onKeyDown={(event) => handleRowKeyDown(event, row, rowIndex)}
                      selected={isItemSelected}
                      data-row-index={rowIndex}
                      rowIndex={rowIndex}
                      isClickable={!!onRowClick}
                      tabIndex={onRowClick || selectable ? 0 : -1}
                      role={onRowClick ? 'button' : undefined}
                      aria-selected={selectable ? isItemSelected : undefined}
                    >
                      {expandable && (
                        <TableCell sx={{ p: cellPadding }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleExpand(row.id)
                            }}
                            sx={{
                              transition: 'all 0.2s ease',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              color: isExpanded ? 'primary.main' : 'text.secondary',
                            }}
                          >
                            <ExpandIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                      {selectable && (
                        <TableCell padding="checkbox">
                          <StyledCheckbox
                            checked={isItemSelected}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelect(row.id)
                            }}
                            inputProps={{ 'aria-label': `Select row ${row.id}` }}
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => (
                        <TableCell key={column.field} align={column.align || 'left'} sx={{ p: cellPadding }}>
                          {column.renderCell
                            ? column.renderCell(row[column.field], row)
                            : row[column.field]}
                        </TableCell>
                      ))}
                      {rowActions && (
                        <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ p: cellPadding }}>
                          <RowActionsContainer className="row-actions">
                            {rowActions(row)}
                          </RowActionsContainer>
                        </TableCell>
                      )}
                    </StyledTableRow>

                    {/* Expandable row content */}
                    {expandable && renderExpandedRow && (
                      <ExpandableRow>
                        <TableCell
                          colSpan={columns.length + (selectable ? 2 : 1) + (rowActions ? 1 : 0)}
                          sx={{ p: 0 }}
                        >
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 3 }}>{renderExpandedRow(row)}</Box>
                          </Collapse>
                        </TableCell>
                      </ExpandableRow>
                    )}
                  </>
                )
              })
            )}
          </TableBody>
        </Table>
      </StyledTableContainer>

      <StyledPagination
        rowsPerPageOptions={pageSizeOptions}
        component="div"
        count={rowCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Rows per page:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
      />
    </TableWrapper>
  )
}
