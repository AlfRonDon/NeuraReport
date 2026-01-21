import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Box,
  IconButton,
  Badge,
  Popover,
  Typography,
  Stack,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  alpha,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import CloseIcon from '@mui/icons-material/Close'
import { useNavigate } from 'react-router-dom'
import * as api from '../api/client'
import { palette } from '../theme'

const TYPE_CONFIG = {
  success: { icon: CheckCircleIcon, color: palette.green[400] },
  info: { icon: InfoIcon, color: palette.blue[400] },
  warning: { icon: WarningIcon, color: palette.yellow[400] },
  error: { icon: ErrorIcon, color: palette.red[400] },
}

function NotificationItem({ notification, onMarkRead, onDelete }) {
  const navigate = useNavigate()
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info
  const Icon = config.icon

  const handleClick = useCallback(() => {
    if (!notification.read) {
      onMarkRead(notification.id)
    }
    if (notification.link) {
      navigate(notification.link)
    }
  }, [notification, onMarkRead, navigate])

  const handleDelete = useCallback((e) => {
    e.stopPropagation()
    onDelete(notification.id)
  }, [notification.id, onDelete])

  return (
    <ListItem
      onClick={handleClick}
      sx={{
        px: 2,
        py: 1.5,
        cursor: notification.link ? 'pointer' : 'default',
        bgcolor: notification.read ? 'transparent' : alpha(config.color, 0.05),
        borderLeft: notification.read ? 'none' : `3px solid ${config.color}`,
        transition: 'all 150ms',
        '&:hover': {
          bgcolor: alpha(palette.scale[100], 0.05),
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <Icon sx={{ fontSize: 20, color: config.color }} />
      </ListItemIcon>
      <ListItemText
        primary={notification.title}
        secondary={
          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{ color: palette.scale[400] }}>
              {notification.message}
            </Typography>
            <Typography variant="caption" sx={{ color: palette.scale[600], fontSize: '0.6875rem' }}>
              {new Date(notification.created_at).toLocaleString()}
            </Typography>
          </Stack>
        }
        primaryTypographyProps={{
          fontSize: '0.8125rem',
          fontWeight: notification.read ? 400 : 600,
          color: palette.scale[100],
        }}
      />
      <IconButton
        size="small"
        onClick={handleDelete}
        sx={{
          color: palette.scale[600],
          '&:hover': { color: palette.red[400] },
        }}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </ListItem>
  )
}

export default function NotificationCenter() {
  const [anchorEl, setAnchorEl] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const pollIntervalRef = useRef(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications({ limit: 50 })
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await api.getUnreadNotificationCount()
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      // Ignore errors for background polling
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    // Poll for unread count every 30 seconds
    pollIntervalRef.current = setInterval(fetchUnreadCount, 30000)
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [fetchUnreadCount])

  const handleOpen = useCallback((event) => {
    setAnchorEl(event.currentTarget)
    setLoading(true)
    fetchNotifications().finally(() => setLoading(false))
  }, [fetchNotifications])

  const handleClose = useCallback(() => {
    setAnchorEl(null)
  }, [])

  const handleMarkRead = useCallback(async (id) => {
    try {
      await api.markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification read:', err)
    }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all notifications read:', err)
    }
  }, [])

  const handleDelete = useCallback(async (id) => {
    try {
      await api.deleteNotification(id)
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id)
        if (removed && !removed.read) {
          setUnreadCount((c) => Math.max(0, c - 1))
        }
        return prev.filter((n) => n.id !== id)
      })
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }, [])

  const handleClearAll = useCallback(async () => {
    try {
      await api.clearAllNotifications()
      setNotifications([])
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to clear notifications:', err)
    }
  }, [])

  const open = Boolean(anchorEl)

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          color: palette.scale[400],
          '&:hover': { color: palette.scale[100] },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.625rem',
              height: 16,
              minWidth: 16,
            },
          }}
        >
          {unreadCount > 0 ? (
            <NotificationsIcon sx={{ fontSize: 22 }} />
          ) : (
            <NotificationsNoneIcon sx={{ fontSize: 22 }} />
          )}
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 480,
              bgcolor: palette.scale[950],
              border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
              borderRadius: 2,
            },
          },
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${alpha(palette.scale[100], 0.08)}` }}
        >
          <Typography sx={{ fontWeight: 600, color: palette.scale[100], fontSize: '0.9375rem' }}>
            Notifications
          </Typography>
          <Stack direction="row" spacing={0.5}>
            {unreadCount > 0 && (
              <IconButton
                size="small"
                onClick={handleMarkAllRead}
                title="Mark all as read"
                sx={{ color: palette.scale[500] }}
              >
                <DoneAllIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
            {notifications.length > 0 && (
              <IconButton
                size="small"
                onClick={handleClearAll}
                title="Clear all"
                sx={{ color: palette.scale[500] }}
              >
                <DeleteSweepIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Stack>
        </Stack>

        {/* Content */}
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: 40, color: palette.scale[700], mb: 1 }} />
            <Typography sx={{ color: palette.scale[500], fontSize: '0.875rem' }}>
              No notifications
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 400, overflow: 'auto' }}>
            {notifications.map((notification, index) => (
              <Box key={notification.id}>
                <NotificationItem
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                />
                {index < notifications.length - 1 && (
                  <Divider sx={{ borderColor: alpha(palette.scale[100], 0.06) }} />
                )}
              </Box>
            ))}
          </List>
        )}
      </Popover>
    </>
  )
}
