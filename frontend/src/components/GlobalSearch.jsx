import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Box,
  TextField,
  InputAdornment,
  Popper,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  CircularProgress,
  alpha,
  ClickAwayListener,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import DescriptionIcon from '@mui/icons-material/Description'
import StorageIcon from '@mui/icons-material/Storage'
import WorkIcon from '@mui/icons-material/Work'
import KeyboardIcon from '@mui/icons-material/Keyboard'
import { useNavigate } from 'react-router-dom'
import * as api from '../api/client'
import { palette } from '../theme'

const TYPE_CONFIG = {
  template: { icon: DescriptionIcon, color: palette.green[400], label: 'Template' },
  connection: { icon: StorageIcon, color: palette.blue[400], label: 'Connection' },
  job: { icon: WorkIcon, color: palette.yellow[400], label: 'Job' },
}

function SearchResult({ result, onSelect, isSelected }) {
  const config = TYPE_CONFIG[result.type] || TYPE_CONFIG.template
  const Icon = config.icon

  return (
    <ListItem
      onClick={() => onSelect(result)}
      sx={{
        px: 2,
        py: 1.5,
        cursor: 'pointer',
        bgcolor: isSelected ? alpha(palette.scale[100], 0.08) : 'transparent',
        '&:hover': {
          bgcolor: alpha(palette.scale[100], 0.08),
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '6px',
            bgcolor: alpha(config.color, 0.15),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ fontSize: 14, color: config.color }} />
        </Box>
      </ListItemIcon>
      <ListItemText
        primary={result.name}
        secondary={result.description}
        primaryTypographyProps={{
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: palette.scale[100],
        }}
        secondaryTypographyProps={{
          fontSize: '0.75rem',
          color: palette.scale[500],
        }}
      />
      <Chip
        label={config.label}
        size="small"
        sx={{
          bgcolor: alpha(config.color, 0.1),
          color: config.color,
          fontSize: '0.625rem',
          height: 20,
        }}
      />
    </ListItem>
  )
}

export default function GlobalSearch({
  variant = 'compact',
  enableShortcut = true,
  showShortcutHint = true,
  placeholder,
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const anchorRef = useRef(null)
  const debounceRef = useRef(null)
  const inputPlaceholder = placeholder || (enableShortcut ? 'Search... (Ctrl+K)' : 'Search...')

  // Keyboard shortcut to focus search (Ctrl/Cmd + K)
  useEffect(() => {
    if (!enableShortcut) return undefined
    const handleKeyDown = (e) => {
      if (e.defaultPrevented) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enableShortcut, open])

  // Handle arrow key navigation
  const handleKeyDown = useCallback((e) => {
    if (!open || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    }
  }, [open, results, selectedIndex])

  const handleSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    try {
      const data = await api.globalSearch(searchQuery, { limit: 10 })
      setResults(data.results || [])
      setOpen(data.results?.length > 0)
      setSelectedIndex(-1)
    } catch (err) {
      console.error('Search failed:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = useCallback((e) => {
    const value = e.target.value
    setQuery(value)

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      handleSearch(value)
    }, 300)
  }, [handleSearch])

  const handleSelect = useCallback((result) => {
    setOpen(false)
    setQuery('')
    setResults([])
    if (result.url) {
      navigate(result.url)
    }
  }, [navigate])

  const handleFocus = useCallback(() => {
    if (results.length > 0) {
      setOpen(true)
    }
  }, [results])

  const handleClickAway = useCallback(() => {
    setOpen(false)
  }, [])

  const isCompact = variant === 'compact'

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box ref={anchorRef} sx={{ position: 'relative', width: isCompact ? 240 : 320 }}>
        <TextField
          inputRef={inputRef}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={inputPlaceholder}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? (
                  <CircularProgress size={16} sx={{ color: palette.scale[500] }} />
                ) : (
                  <SearchIcon sx={{ fontSize: 18, color: palette.scale[500] }} />
                )}
              </InputAdornment>
            ),
            endAdornment: isCompact && showShortcutHint && enableShortcut && (
              <InputAdornment position="end">
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                    px: 0.5,
                    py: 0.25,
                    bgcolor: alpha(palette.scale[100], 0.08),
                    borderRadius: 0.5,
                  }}
                >
                  <KeyboardIcon sx={{ fontSize: 12, color: palette.scale[600] }} />
                  <Typography sx={{ fontSize: '0.625rem', color: palette.scale[600] }}>K</Typography>
                </Box>
              </InputAdornment>
            ),
            sx: {
              bgcolor: alpha(palette.scale[100], 0.05),
              borderRadius: 1,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(palette.scale[100], 0.1),
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(palette.scale[100], 0.2),
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: palette.green[400],
              },
              '& input': {
                fontSize: '0.8125rem',
                color: palette.scale[200],
                '&::placeholder': {
                  color: palette.scale[600],
                  opacity: 1,
                },
              },
            },
          }}
        />

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          style={{ width: anchorRef.current?.offsetWidth || 300, zIndex: 1300 }}
        >
          <Paper
            sx={{
              mt: 0.5,
              bgcolor: palette.scale[950],
              border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
              borderRadius: 1,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            {results.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography sx={{ color: palette.scale[500], fontSize: '0.8125rem' }}>
                  No results found
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {results.map((result, index) => (
                  <SearchResult
                    key={`${result.type}-${result.id}`}
                    result={result}
                    onSelect={handleSelect}
                    isSelected={index === selectedIndex}
                  />
                ))}
              </List>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  )
}
