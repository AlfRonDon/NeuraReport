import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  Box,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  InputAdornment,
  Divider,
  alpha,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import DocumentScannerOutlinedIcon from '@mui/icons-material/DocumentScannerOutlined'
import AddIcon from '@mui/icons-material/Add'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import HistoryIcon from '@mui/icons-material/History'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import { useAppStore } from '../../store/useAppStore'
import { Kbd } from '../ui'

const COMMANDS = [
  {
    id: 'nav-setup',
    label: 'Go to Setup',
    description: 'Configure database and templates',
    icon: StorageOutlinedIcon,
    action: 'navigate',
    path: '/',
    group: 'Navigation',
  },
  {
    id: 'nav-generate',
    label: 'Go to Generate',
    description: 'Create new reports',
    icon: PlayArrowOutlinedIcon,
    action: 'navigate',
    path: '/generate',
    group: 'Navigation',
  },
  {
    id: 'nav-analyze',
    label: 'Go to Analyze',
    description: 'AI document analysis',
    icon: DocumentScannerOutlinedIcon,
    action: 'navigate',
    path: '/analyze',
    group: 'Navigation',
  },
  {
    id: 'new-report',
    label: 'New Report',
    description: 'Start a new report generation',
    icon: AddIcon,
    action: 'navigate',
    path: '/generate',
    group: 'Actions',
    shortcut: '⌘N',
  },
]

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const templates = useAppStore((s) => s.templates)
  const approvedTemplates = templates.filter((t) => t.status === 'approved')

  // Build full command list including templates
  const allCommands = useMemo(() => {
    const templateCommands = approvedTemplates.slice(0, 5).map((t) => ({
      id: `template-${t.id}`,
      label: t.name,
      description: 'Edit template',
      icon: DescriptionOutlinedIcon,
      action: 'navigate',
      path: `/templates/${t.id}/edit`,
      group: 'Recent Templates',
    }))

    return [...COMMANDS, ...templateCommands]
  }, [approvedTemplates])

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands

    const q = query.toLowerCase()
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.group?.toLowerCase().includes(q)
    )
  }, [allCommands, query])

  // Group commands
  const groupedCommands = useMemo(() => {
    const groups = {}
    filteredCommands.forEach((cmd) => {
      const group = cmd.group || 'Other'
      if (!groups[group]) groups[group] = []
      groups[group].push(cmd)
    })
    return groups
  }, [filteredCommands])

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1))
    }
  }, [filteredCommands.length, selectedIndex])

  // Execute command
  const executeCommand = useCallback(
    (cmd) => {
      if (cmd.action === 'navigate') {
        navigate(cmd.path)
      } else if (typeof cmd.action === 'function') {
        cmd.action()
      }
      onClose()
    },
    [navigate, onClose]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [filteredCommands, selectedIndex, executeCommand, onClose]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      selectedEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  let flatIndex = 0

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          maxHeight: '70vh',
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: (theme) => alpha(theme.palette.background.default, 0.8),
            backdropFilter: 'blur(4px)',
          },
        },
      }}
    >
      {/* Search Input */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          ref={inputRef}
          fullWidth
          placeholder="Search commands..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            sx: {
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
            },
          }}
          sx={{
            '& .MuiInputBase-root': {
              bgcolor: 'action.hover',
              borderRadius: 2,
            },
          }}
        />
      </Box>

      {/* Command List */}
      <Box ref={listRef} sx={{ overflow: 'auto', maxHeight: 400 }}>
        {Object.entries(groupedCommands).map(([groupName, commands], groupIdx) => (
          <Box key={groupName}>
            {groupIdx > 0 && <Divider />}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 2, py: 1, display: 'block', fontWeight: 600 }}
            >
              {groupName}
            </Typography>
            <List dense disablePadding sx={{ pb: 1 }}>
              {commands.map((cmd) => {
                const index = flatIndex++
                const Icon = cmd.icon
                const isSelected = index === selectedIndex

                return (
                  <ListItem key={cmd.id} disablePadding data-index={index}>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      sx={{
                        mx: 1,
                        borderRadius: 1.5,
                        '&.Mui-selected': {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          },
                          '& .MuiListItemIcon-root': {
                            color: 'inherit',
                          },
                          '& .MuiTypography-root': {
                            color: 'inherit',
                          },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Icon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={cmd.label}
                        secondary={cmd.description}
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                        secondaryTypographyProps={{
                          fontSize: '0.75rem',
                          sx: { opacity: isSelected ? 0.8 : 0.6 },
                        }}
                      />
                      {cmd.shortcut && (
                        <Kbd size="small" sx={{ opacity: isSelected ? 1 : 0.5 }}>
                          {cmd.shortcut}
                        </Kbd>
                      )}
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </List>
          </Box>
        ))}

        {filteredCommands.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No commands found</Typography>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'action.hover',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <Typography variant="caption" color="text.secondary">
              navigate
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Kbd>↵</Kbd>
            <Typography variant="caption" color="text.secondary">
              select
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Kbd>esc</Kbd>
            <Typography variant="caption" color="text.secondary">
              close
            </Typography>
          </Box>
        </Box>
      </Box>
    </Dialog>
  )
}
