/**
 * Data Display Components - Premium Tables & Data Visualization
 * Sophisticated data presentation components with rich interactions
 */

import { forwardRef, useState, useMemo } from 'react'
import {
  Box,
  Typography,
  Stack,
  Chip,
  Avatar,
  AvatarGroup,
  IconButton,
  Checkbox,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  alpha,
  useTheme,
  styled,
  keyframes,
} from '@mui/material'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import FilterListIcon from '@mui/icons-material/FilterList'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import DownloadIcon from '@mui/icons-material/Download'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

// =============================================================================
// DATA TABLE - Premium table component
// =============================================================================

const TableRoot = styled(Box)(({ theme }) => ({
  width: '100%',
  borderRadius: theme.shape.borderRadius * 1.5,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
}))

const TableHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 2.5),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.action.hover, 0.3),
}))

const TableToolbar = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1),
}))

const TableContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  overflowX: 'auto',

  // Custom scrollbar
  '&::-webkit-scrollbar': {
    height: 6,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.text.primary, 0.1),
    borderRadius: 3,
    '&:hover': {
      backgroundColor: alpha(theme.palette.text.primary, 0.2),
    },
  },
}))

const StyledTable = styled('table')(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  borderSpacing: 0,
}))

const TableHead = styled('thead')(({ theme }) => ({
  '& th': {
    padding: theme.spacing(1.5, 2),
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.palette.text.secondary,
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
    backgroundColor: alpha(theme.palette.action.hover, 0.2),
    whiteSpace: 'nowrap',
    userSelect: 'none',
    position: 'relative',

    '&:hover': {
      backgroundColor: alpha(theme.palette.action.hover, 0.4),
    },
  },
}))

const TableBody = styled('tbody')(({ theme }) => ({
  '& tr': {
    transition: 'background-color 0.1s ease',

    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.02),
    },

    '&.selected': {
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
    },
  },

  '& td': {
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    fontSize: '0.875rem',
    color: theme.palette.text.primary,
    verticalAlign: 'middle',
  },
}))

const SortIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  marginLeft: theme.spacing(0.5),
  opacity: active ? 1 : 0,
  transition: 'opacity 0.15s ease',
  color: theme.palette.primary.main,

  'th:hover &': {
    opacity: 0.5,
  },

  '& svg': {
    fontSize: 14,
  },
}))

const ColumnResizer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  width: 4,
  cursor: 'col-resize',
  backgroundColor: 'transparent',
  transition: 'background-color 0.15s ease',

  '&:hover, &.resizing': {
    backgroundColor: theme.palette.primary.main,
  },
}))

export const DataTable = forwardRef(function DataTable(props, ref) {
  const {
    title,
    columns = [],
    data = [],
    selectable = false,
    selectedRows = [],
    onSelectionChange,
    sortable = true,
    sortBy,
    sortDirection = 'asc',
    onSort,
    searchable = false,
    onSearch,
    toolbar,
    emptyMessage = 'No data available',
    loading = false,
    stickyHeader = false,
    rowKey = 'id',
    onRowClick,
    renderRowActions,
    expandable = false,
    renderExpandedRow,
    sx,
    ...other
  } = props

  const theme = useTheme()
  const [expandedRows, setExpandedRows] = useState(new Set())

  const allSelected = data.length > 0 && selectedRows.length === data.length
  const someSelected = selectedRows.length > 0 && !allSelected

  const toggleRowExpanded = (rowId) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId)
    } else {
      newExpanded.add(rowId)
    }
    setExpandedRows(newExpanded)
  }

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([])
    } else {
      onSelectionChange?.(data.map(row => row[rowKey]))
    }
  }

  const handleSelectRow = (rowId) => {
    if (selectedRows.includes(rowId)) {
      onSelectionChange?.(selectedRows.filter(id => id !== rowId))
    } else {
      onSelectionChange?.([...selectedRows, rowId])
    }
  }

  return (
    <TableRoot ref={ref} sx={sx} {...other}>
      {(title || searchable || toolbar) && (
        <TableHeader>
          <Stack direction="row" alignItems="center" spacing={2}>
            {title && (
              <Typography variant="subtitle1" fontWeight={600}>
                {title}
              </Typography>
            )}
            {selectedRows.length > 0 && (
              <Chip
                size="small"
                label={`${selectedRows.length} selected`}
                onDelete={() => onSelectionChange?.([])}
                sx={{ height: 24 }}
              />
            )}
          </Stack>

          <TableToolbar>
            {searchable && (
              <Tooltip title="Search">
                <IconButton size="small" onClick={() => onSearch?.()} aria-label="Search">
                  <SearchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {toolbar}
            <Tooltip title="Filter">
              <IconButton size="small" aria-label="Filter">
                <FilterListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Columns">
              <IconButton size="small" aria-label="Columns">
                <ViewColumnIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton size="small" aria-label="Download">
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </TableToolbar>
        </TableHeader>
      )}

      <TableContainer>
        <StyledTable>
          <TableHead>
            <tr>
              {expandable && <th style={{ width: 40 }} />}
              {selectable && (
                <th style={{ width: 48 }}>
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                    sx={{ p: 0 }}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.field}
                  style={{
                    width: col.width,
                    minWidth: col.minWidth,
                    cursor: sortable && col.sortable !== false ? 'pointer' : 'default',
                  }}
                  onClick={() => {
                    if (sortable && col.sortable !== false) {
                      onSort?.(col.field, sortBy === col.field && sortDirection === 'asc' ? 'desc' : 'asc')
                    }
                  }}
                >
                  <Stack direction="row" alignItems="center">
                    {col.headerName || col.field}
                    {sortable && col.sortable !== false && (
                      <SortIndicator active={sortBy === col.field}>
                        {sortDirection === 'asc' ? (
                          <ArrowUpwardIcon />
                        ) : (
                          <ArrowDownwardIcon />
                        )}
                      </SortIndicator>
                    )}
                  </Stack>
                </th>
              ))}
              {renderRowActions && <th style={{ width: 60 }} />}
            </tr>
          </TableHead>

          <TableBody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0) + (renderRowActions ? 1 : 0)}
                  style={{ textAlign: 'center', padding: theme.spacing(6) }}
                >
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowId = row[rowKey]
                const isSelected = selectedRows.includes(rowId)
                const isExpanded = expandedRows.has(rowId)

                return (
                  <>
                    <tr
                      key={rowId}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => onRowClick?.(row)}
                      style={{
                        cursor: onRowClick ? 'pointer' : 'default',
                        animation: `${slideIn} 0.2s ease`,
                        animationDelay: `${rowIndex * 20}ms`,
                        animationFillMode: 'backwards',
                      }}
                    >
                      {expandable && (
                        <td style={{ width: 40 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleRowExpanded(rowId)
                            }}
                            sx={{ p: 0.5 }}
                          >
                            {isExpanded ? (
                              <ExpandMoreIcon fontSize="small" />
                            ) : (
                              <ChevronRightIcon fontSize="small" />
                            )}
                          </IconButton>
                        </td>
                      )}
                      {selectable && (
                        <td style={{ width: 48 }}>
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleSelectRow(rowId)
                            }}
                            sx={{ p: 0 }}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.field}>
                          {col.renderCell
                            ? col.renderCell({ row, value: row[col.field] })
                            : row[col.field]}
                        </td>
                      ))}
                      {renderRowActions && (
                        <td>
                          {renderRowActions(row)}
                        </td>
                      )}
                    </tr>
                    {expandable && renderExpandedRow && (
                      <tr>
                        <td
                          colSpan={columns.length + (selectable ? 1 : 0) + 1 + (renderRowActions ? 1 : 0)}
                          style={{ padding: 0 }}
                        >
                          <Collapse in={isExpanded}>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                              {renderExpandedRow(row)}
                            </Box>
                          </Collapse>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </TableBody>
        </StyledTable>
      </TableContainer>
    </TableRoot>
  )
})

// =============================================================================
// DATA LIST - Premium list display
// =============================================================================

const ListRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
}))

const ListItemRoot = styled(Box, {
  shouldForwardProp: (prop) => !['selected', 'hoverable', 'variant'].includes(prop),
})(({ theme, selected, hoverable = true, variant = 'default' }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.shape.borderRadius * 1.5,
  cursor: hoverable ? 'pointer' : 'default',
  transition: 'all 0.15s ease',
  backgroundColor: selected
    ? alpha(theme.palette.primary.main, 0.08)
    : 'transparent',
  border: `1px solid ${selected ? alpha(theme.palette.primary.main, 0.2) : 'transparent'}`,

  ...(hoverable && !selected && {
    '&:hover': {
      backgroundColor: alpha(theme.palette.action.hover, 0.5),
    },
  }),

  ...(variant === 'card' && {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    padding: theme.spacing(2),

    '&:hover': {
      borderColor: alpha(theme.palette.primary.main, 0.2),
      boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.05)}`,
    },
  }),
}))

export const DataListItem = forwardRef(function DataListItem(props, ref) {
  const {
    avatar,
    icon,
    primary,
    secondary,
    tertiary,
    tags,
    status,
    statusColor = 'default',
    actions,
    selected = false,
    onClick,
    draggable = false,
    variant = 'default',
    sx,
    ...other
  } = props

  const theme = useTheme()

  return (
    <ListItemRoot
      ref={ref}
      selected={selected}
      variant={variant}
      onClick={onClick}
      sx={sx}
      {...other}
    >
      {draggable && (
        <DragIndicatorIcon
          sx={{
            fontSize: 18,
            color: 'text.tertiary',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
          }}
        />
      )}

      {avatar && (
        <Avatar
          src={avatar}
          sx={{
            width: 40,
            height: 40,
            border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          {icon}
        </Avatar>
      )}

      {!avatar && icon && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 1.5,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
          }}
        >
          {icon}
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {primary}
          </Typography>
          {tags && tags.map((tag, i) => (
            <Chip
              key={i}
              label={tag}
              size="small"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          ))}
        </Stack>

        {secondary && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {secondary}
          </Typography>
        )}
      </Box>

      {tertiary && (
        <Typography variant="caption" color="text.tertiary" sx={{ flexShrink: 0 }}>
          {tertiary}
        </Typography>
      )}

      {status && (
        <Chip
          label={status}
          size="small"
          color={statusColor}
          sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
        />
      )}

      {actions}
    </ListItemRoot>
  )
})

export const DataList = forwardRef(function DataList(props, ref) {
  const { children, sx, ...other } = props

  return (
    <ListRoot ref={ref} sx={sx} {...other}>
      {children}
    </ListRoot>
  )
})

// =============================================================================
// ENTITY BADGE - Display entity with avatar and status
// =============================================================================

const EntityBadgeRoot = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1.5, 0.5, 0.5),
  borderRadius: 100,
  backgroundColor: alpha(theme.palette.action.hover, 0.5),
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.15s ease',

  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    borderColor: alpha(theme.palette.primary.main, 0.2),
  },
}))

export const EntityBadge = forwardRef(function EntityBadge(props, ref) {
  const {
    name,
    avatar,
    subtitle,
    status,
    statusColor,
    onClick,
    sx,
    ...other
  } = props

  const theme = useTheme()

  return (
    <EntityBadgeRoot
      ref={ref}
      onClick={onClick}
      sx={{ cursor: onClick ? 'pointer' : 'default', ...sx }}
      {...other}
    >
      <Avatar
        src={avatar}
        sx={{
          width: 24,
          height: 24,
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        {name?.[0]}
      </Avatar>
      <Box>
        <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.2 }}>
          {name}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.tertiary" sx={{ lineHeight: 1 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {status && (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: statusColor || 'success.main',
          }}
        />
      )}
    </EntityBadgeRoot>
  )
})

// =============================================================================
// TAG GROUP - Display multiple tags
// =============================================================================

export const TagGroup = forwardRef(function TagGroup(props, ref) {
  const {
    tags = [],
    max = 3,
    size = 'small',
    variant = 'outlined',
    color = 'default',
    sx,
    ...other
  } = props

  const theme = useTheme()
  const visibleTags = tags.slice(0, max)
  const remainingCount = tags.length - max

  return (
    <Stack
      ref={ref}
      direction="row"
      spacing={0.5}
      sx={{ flexWrap: 'wrap', gap: 0.5, ...sx }}
      {...other}
    >
      {visibleTags.map((tag, i) => (
        <Chip
          key={i}
          label={tag.label || tag}
          size={size}
          variant={variant}
          color={tag.color || color}
          sx={{
            height: size === 'small' ? 22 : 28,
            fontSize: size === 'small' ? '0.7rem' : '0.8rem',
          }}
        />
      ))}
      {remainingCount > 0 && (
        <Chip
          label={`+${remainingCount}`}
          size={size}
          variant="filled"
          sx={{
            height: size === 'small' ? 22 : 28,
            fontSize: size === 'small' ? '0.7rem' : '0.8rem',
            bgcolor: alpha(theme.palette.text.primary, 0.08),
            color: 'text.secondary',
          }}
        />
      )}
    </Stack>
  )
})

// =============================================================================
// VALUE DISPLAY - Display value with label
// =============================================================================

const ValueDisplayRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
}))

export const ValueDisplay = forwardRef(function ValueDisplay(props, ref) {
  const {
    label,
    value,
    unit,
    change,
    changeLabel,
    size = 'medium',
    align = 'left',
    sx,
    ...other
  } = props

  const theme = useTheme()
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

  const sizes = {
    small: {
      label: 'caption',
      value: 'body1',
      fontWeight: 600,
    },
    medium: {
      label: 'caption',
      value: 'h6',
      fontWeight: 700,
    },
    large: {
      label: 'body2',
      value: 'h4',
      fontWeight: 800,
    },
  }

  const sizeConfig = sizes[size] || sizes.medium

  return (
    <ValueDisplayRoot
      ref={ref}
      sx={{ textAlign: align, ...sx }}
      {...other}
    >
      <Typography
        variant={sizeConfig.label}
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: '0.03em', mb: 0.25 }}
      >
        {label}
      </Typography>
      <Stack
        direction="row"
        alignItems="baseline"
        spacing={0.5}
        justifyContent={align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'}
      >
        <Typography variant={sizeConfig.value} fontWeight={sizeConfig.fontWeight}>
          {value}
        </Typography>
        {unit && (
          <Typography variant="caption" color="text.secondary">
            {unit}
          </Typography>
        )}
      </Stack>
      {change !== undefined && (
        <Typography
          variant="caption"
          color={trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary'}
          sx={{ mt: 0.5 }}
        >
          {change > 0 ? '+' : ''}{change}%{changeLabel && ` ${changeLabel}`}
        </Typography>
      )}
    </ValueDisplayRoot>
  )
})

export default {
  DataTable,
  DataList,
  DataListItem,
  EntityBadge,
  TagGroup,
  ValueDisplay,
}
