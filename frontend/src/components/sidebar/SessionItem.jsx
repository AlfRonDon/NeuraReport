import { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  alpha,
} from '@mui/material'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'

function formatTimeAgo(timestamp) {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export default function SessionItem({
  session,
  isActive,
  onClick,
  onRename,
  onDelete,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(session.title)

  const handleMenuOpen = useCallback((e) => {
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
  }, [])

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null)
  }, [])

  const handleRename = useCallback(() => {
    handleMenuClose()
    setIsEditing(true)
    setEditTitle(session.title)
  }, [session.title, handleMenuClose])

  const handleDelete = useCallback(() => {
    handleMenuClose()
    onDelete?.(session.id)
  }, [session.id, onDelete, handleMenuClose])

  const handleEditSubmit = useCallback(() => {
    if (editTitle.trim() && editTitle !== session.title) {
      onRename?.(session.id, editTitle.trim())
    }
    setIsEditing(false)
  }, [editTitle, session.id, session.title, onRename])

  const handleEditKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleEditSubmit()
      } else if (e.key === 'Escape') {
        setIsEditing(false)
        setEditTitle(session.title)
      }
    },
    [handleEditSubmit, session.title]
  )

  return (
    <Box
      onClick={!isEditing ? onClick : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.25,
        borderRadius: 2,
        cursor: isEditing ? 'default' : 'pointer',
        bgcolor: isActive
          ? (theme) => alpha(theme.palette.primary.main, 0.1)
          : 'transparent',
        '&:hover': {
          bgcolor: isActive
            ? (theme) => alpha(theme.palette.primary.main, 0.15)
            : 'action.hover',
          '& .session-menu-btn': {
            opacity: 1,
          },
        },
        transition: 'all 150ms ease',
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.5,
          bgcolor: isActive ? 'primary.main' : 'action.selected',
          color: isActive ? 'primary.contrastText' : 'text.secondary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <TextField
            size="small"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleEditKeyDown}
            autoFocus
            fullWidth
            sx={{
              '& .MuiInputBase-root': {
                fontSize: '0.875rem',
              },
            }}
          />
        ) : (
          <>
            <Typography
              variant="body2"
              fontWeight={isActive ? 600 : 500}
              noWrap
              sx={{ color: isActive ? 'primary.main' : 'text.primary' }}
            >
              {session.title}
            </Typography>
            <Typography variant="caption" color="text.disabled" noWrap>
              {formatTimeAgo(session.updatedAt)}
            </Typography>
          </>
        )}
      </Box>

      {/* Menu Button */}
      {!isEditing && (
        <IconButton
          className="session-menu-btn"
          size="small"
          onClick={handleMenuOpen}
          sx={{
            opacity: isActive ? 1 : 0,
            transition: 'opacity 150ms ease',
          }}
        >
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleRename}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  )
}
