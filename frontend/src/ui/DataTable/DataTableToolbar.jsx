import { useState, useCallback } from 'react'
import {
  Box,
  TextField,
  InputAdornment,
  Button,
  Stack,
  Typography,
  Chip,
  Menu,
  MenuItem,
  Divider,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import RefreshIcon from '@mui/icons-material/Refresh'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import ArchiveIcon from '@mui/icons-material/Archive'
import LabelIcon from '@mui/icons-material/Label'
import { palette } from '../../theme'

export default function DataTableToolbar({
  title,
  subtitle,
  searchPlaceholder = 'Search...',
  onSearch,
  filters = [],
  actions = [],
  numSelected = 0,
  onRefresh,
  onBulkDelete,
  bulkActions = [],
  onFiltersChange,
}) {
  const [searchValue, setSearchValue] = useState('')
  const [filterAnchor, setFilterAnchor] = useState(null)
  const [activeFilters, setActiveFilters] = useState({})
  const [moreAnchor, setMoreAnchor] = useState(null)

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value
    setSearchValue(value)
    onSearch?.(value)
  }, [onSearch])

  const handleFilterClick = useCallback((event) => {
    setFilterAnchor(event.currentTarget)
  }, [])

  const handleFilterClose = useCallback(() => {
    setFilterAnchor(null)
  }, [])

  const handleFilterSelect = useCallback((filterKey, value) => {
    setActiveFilters((prev) => {
      const next = {
        ...prev,
        [filterKey]: value,
      }
      onFiltersChange?.(next)
      return next
    })
    handleFilterClose()
  }, [handleFilterClose, onFiltersChange])

  const handleClearFilter = useCallback((filterKey) => {
    setActiveFilters((prev) => {
      const next = { ...prev }
      delete next[filterKey]
      onFiltersChange?.(next)
      return next
    })
  }, [onFiltersChange])

  const handleMoreClick = useCallback((event) => {
    setMoreAnchor(event.currentTarget)
  }, [])

  const handleMoreClose = useCallback(() => {
    setMoreAnchor(null)
  }, [])

  const activeFilterCount = Object.keys(activeFilters).length

  return (
    <Box
      sx={{
        p: 2.5,
        borderBottom: `1px solid ${alpha(palette.scale[100], 0.08)}`,
        bgcolor: palette.scale[1000],
      }}
    >
      {/* Header Row */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          {title && (
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: palette.scale[100],
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography
              sx={{
                fontSize: '0.8125rem',
                color: palette.scale[500],
                mt: 0.25,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1}>
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outlined'}
              color={action.color || 'primary'}
              size="small"
              startIcon={action.icon}
              onClick={action.onClick}
              disabled={action.disabled}
              sx={{
                fontSize: '0.8125rem',
                ...(action.variant === 'contained' && {
                  bgcolor: palette.green[400],
                  color: palette.scale[1100],
                  '&:hover': {
                    bgcolor: palette.green[300],
                  },
                }),
              }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      </Stack>

      {/* Selection Bar */}
      {numSelected > 0 && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            bgcolor: alpha(palette.green[400], 0.15),
            border: `1px solid ${alpha(palette.green[400], 0.3)}`,
            color: palette.green[400],
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
            {numSelected} item{numSelected > 1 ? 's' : ''} selected
          </Typography>
          <Stack direction="row" spacing={1}>
            {bulkActions.map((action, index) => (
              <Button
                key={index}
                size="small"
                variant="outlined"
                startIcon={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
                sx={{
                  color: action.color || palette.scale[300],
                  borderColor: alpha(action.color || palette.scale[300], 0.5),
                  fontSize: '0.75rem',
                  '&:hover': {
                    bgcolor: alpha(action.color || palette.scale[300], 0.1),
                    borderColor: action.color || palette.scale[300],
                  },
                }}
              >
                {action.label}
              </Button>
            ))}
            {onBulkDelete && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                onClick={onBulkDelete}
                sx={{
                  color: palette.red[400],
                  borderColor: alpha(palette.red[400], 0.5),
                  fontSize: '0.75rem',
                  '&:hover': {
                    bgcolor: alpha(palette.red[400], 0.1),
                    borderColor: palette.red[400],
                  },
                }}
              >
                Delete
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {/* Search and Filters Row */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: palette.scale[500] }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: '100%', sm: 280 },
            '& .MuiOutlinedInput-root': {
              bgcolor: palette.scale[900],
            },
          }}
        />

        <Stack direction="row" spacing={1} sx={{ flex: 1 }} flexWrap="wrap">
          {filters.length > 0 && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
                onClick={handleFilterClick}
                sx={{
                  color: activeFilterCount > 0 ? palette.green[400] : palette.scale[400],
                  borderColor: activeFilterCount > 0
                    ? alpha(palette.green[400], 0.5)
                    : alpha(palette.scale[100], 0.15),
                  '&:hover': {
                    borderColor: activeFilterCount > 0
                      ? palette.green[400]
                      : alpha(palette.scale[100], 0.25),
                  },
                }}
              >
                Filters
                {activeFilterCount > 0 && (
                  <Chip
                    label={activeFilterCount}
                    size="small"
                    sx={{
                      ml: 1,
                      height: 18,
                      minWidth: 18,
                      bgcolor: palette.green[400],
                      color: palette.scale[1100],
                      fontSize: '0.65rem',
                      fontWeight: 600,
                    }}
                  />
                )}
              </Button>

              <Menu
                anchorEl={filterAnchor}
                open={Boolean(filterAnchor)}
                onClose={handleFilterClose}
                slotProps={{
                  paper: {
                    sx: {
                      width: 220,
                      bgcolor: palette.scale[900],
                      border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
                    },
                  },
                }}
              >
                {filters.map((filter, idx) => (
                  <Box key={filter.key}>
                    <Typography
                      sx={{
                        px: 2,
                        py: 1,
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: palette.scale[500],
                      }}
                    >
                      {filter.label}
                    </Typography>
                    {filter.options.map((option) => (
                      <MenuItem
                        key={option.value}
                        selected={activeFilters[filter.key] === option.value}
                        onClick={() => handleFilterSelect(filter.key, option.value)}
                        sx={{
                          fontSize: '0.8125rem',
                          color: palette.scale[200],
                          '&.Mui-selected': {
                            bgcolor: alpha(palette.green[400], 0.1),
                            color: palette.green[400],
                          },
                        }}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                    {idx < filters.length - 1 && (
                      <Divider sx={{ my: 0.5, borderColor: alpha(palette.scale[100], 0.08) }} />
                    )}
                  </Box>
                ))}
              </Menu>
            </>
          )}

          {/* Active Filter Chips */}
          {Object.entries(activeFilters).map(([key, value]) => {
            const filter = filters.find((f) => f.key === key)
            const option = filter?.options.find((o) => o.value === value)
            return (
              <Chip
                key={key}
                label={`${filter?.label}: ${option?.label}`}
                size="small"
                onDelete={() => handleClearFilter(key)}
                sx={{
                  bgcolor: alpha(palette.scale[100], 0.08),
                  color: palette.scale[200],
                  '& .MuiChip-deleteIcon': {
                    color: palette.scale[500],
                    '&:hover': {
                      color: palette.scale[100],
                    },
                  },
                }}
              />
            )
          })}
        </Stack>

        <Stack direction="row" spacing={0.5}>
          {onRefresh && (
            <Tooltip title="Refresh" arrow>
              <IconButton
                size="small"
                onClick={onRefresh}
                sx={{
                  color: palette.scale[500],
                  '&:hover': {
                    color: palette.scale[100],
                    bgcolor: alpha(palette.scale[100], 0.08),
                  },
                }}
              >
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            size="small"
            onClick={handleMoreClick}
            sx={{
              color: palette.scale[500],
              '&:hover': {
                color: palette.scale[100],
                bgcolor: alpha(palette.scale[100], 0.08),
              },
            }}
          >
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>

        <Menu
          anchorEl={moreAnchor}
          open={Boolean(moreAnchor)}
          onClose={handleMoreClose}
          slotProps={{
            paper: {
              sx: {
                width: 180,
                bgcolor: palette.scale[900],
                border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
              },
            },
          }}
        >
          <MenuItem
            onClick={handleMoreClose}
            sx={{ fontSize: '0.8125rem', color: palette.scale[200] }}
          >
            Export CSV
          </MenuItem>
          <MenuItem
            onClick={handleMoreClose}
            sx={{ fontSize: '0.8125rem', color: palette.scale[200] }}
          >
            Export JSON
          </MenuItem>
          <Divider sx={{ my: 0.5, borderColor: alpha(palette.scale[100], 0.08) }} />
          <MenuItem
            onClick={handleMoreClose}
            sx={{ fontSize: '0.8125rem', color: palette.scale[200] }}
          >
            Column Settings
          </MenuItem>
        </Menu>
      </Stack>
    </Box>
  )
}
