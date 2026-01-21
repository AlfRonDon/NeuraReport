import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
  Tooltip,
  alpha,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import CloseIcon from '@mui/icons-material/Close'
import { palette } from '../../theme'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from '../../api/client'

const TYPE_CONFIG = {
  info: {
    icon: InfoOutlinedIcon,
    color: palette.blue[400],
  },
  success: {
    icon: CheckCircleOutlinedIcon,
    color: palette.green[400],
  },
  warning: {
    icon: WarningAmberOutlinedIcon,
    color: palette.yellow[400],
  },
  error: {
    icon: ErrorOutlineIcon,
    color: palette.red[400],
  },
}

const ENTITY_ROUTES = {
  template: (id) => (id ? `/templates/${id}/edit` : '/templates'),
  connection: () => '/connections',
  job: () => '/jobs',
  schedule: () => '/schedules',
  report: () => '/history',
}

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)

  const open = Boolean(anchorEl)

  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const data = await getNotifications({ limit: 20 })
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch and visibility-aware polling
  useEffect(() => {
    fetchNotifications()

    let interval = null
    let isVisible = !document.hidden

    const startPolling = () => {
      if (interval) return
      // Poll for new notifications every 30 seconds when tab is visible
      interval = setInterval(() => {
        if (!polling && isVisible) {
          setPolling(true)
          fetchNotifications(false).finally(() => setPolling(false))
        }
      }, 30000)
    }

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    const handleVisibilityChange = () => {
      isVisible = !document.hidden
      if (isVisible) {
        // Fetch immediately when tab becomes visible, then resume polling
        fetchNotifications(false)
        startPolling()
      } else {
        // Stop polling when tab is hidden to save resources
        stopPolling()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    startPolling()

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchNotifications, polling])

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
    fetchNotifications()
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationClick = async (notification) => {
    const entityTypeRaw = notification.entity_type || notification.entityType
    const entityId = notification.entity_id || notification.entityId
    const normalizedType = entityTypeRaw ? String(entityTypeRaw).toLowerCase().replace(/s$/, '') : ''
    const fallbackRoute =
      normalizedType && ENTITY_ROUTES[normalizedType]
        ? ENTITY_ROUTES[normalizedType](entityId)
        : '/activity'
    const targetRoute = notification.link || fallbackRoute

    // Mark as read if unread
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    }

    // Navigate if link provided
    if (targetRoute) {
      navigate(targetRoute)
      handleClose()
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation()
    try {
      await deleteNotification(notificationId)
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === notificationId)
        if (removed && !removed.read) {
          setUnreadCount((count) => Math.max(0, count - 1))
        }
        return prev.filter((n) => n.id !== notificationId)
      })
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const handleClearAll = async () => {
    try {
      await clearAllNotifications()
      setNotifications([])
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to clear notifications:', err)
    }
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleClick}
          sx={{
            color: palette.scale[400],
            '&:hover': {
              color: palette.scale[100],
              bgcolor: alpha(palette.scale[100], 0.08),
            },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: palette.red[500],
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 600,
                minWidth: 16,
                height: 16,
              },
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsActiveIcon sx={{ fontSize: 20 }} />
            ) : (
              <NotificationsIcon sx={{ fontSize: 20 }} />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 480,
            bgcolor: palette.scale[900],
            border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${alpha(palette.scale[100], 0.08)}`,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: palette.scale[100],
            }}
          >
            Notifications
            {unreadCount > 0 && (
              <Typography
                component="span"
                sx={{
                  ml: 1,
                  fontSize: '0.75rem',
                  color: palette.scale[500],
                }}
              >
                {unreadCount} unread
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Mark all as read">
              <IconButton
                size="small"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                sx={{
                  color: palette.scale[500],
                  '&:hover': { color: palette.scale[100] },
                }}
              >
                <DoneAllIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear all">
              <IconButton
                size="small"
                onClick={handleClearAll}
                disabled={notifications.length === 0}
                sx={{
                  color: palette.scale[500],
                  '&:hover': { color: palette.red[400] },
                }}
              >
                <DeleteSweepIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ maxHeight: 380, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <NotificationsIcon
                sx={{ fontSize: 48, color: palette.scale[700], mb: 1 }}
              />
              <Typography sx={{ color: palette.scale[500], fontSize: '0.875rem' }}>
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notification, index) => {
                const typeConfig = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info
                const Icon = typeConfig.icon

                return (
                  <Box key={notification.id}>
                    {index > 0 && (
                      <Divider sx={{ borderColor: alpha(palette.scale[100], 0.06) }} />
                    )}
                    <ListItem
                      disablePadding
                      secondaryAction={
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteNotification(e, notification.id)}
                          sx={{
                            color: palette.scale[600],
                            opacity: 0,
                            transition: 'opacity 150ms',
                            '.MuiListItem-root:hover &': {
                              opacity: 1,
                            },
                            '&:hover': {
                              color: palette.red[400],
                            },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      }
                    >
                      <ListItemButton
                        onClick={() => handleNotificationClick(notification)}
                        sx={{
                          py: 1.5,
                          px: 2,
                          bgcolor: notification.read
                            ? 'transparent'
                            : alpha(palette.blue[500], 0.05),
                          '&:hover': {
                            bgcolor: alpha(palette.scale[100], 0.05),
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Icon
                            sx={{
                              fontSize: 20,
                              color: typeConfig.color,
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: '0.8125rem',
                                  fontWeight: notification.read ? 400 : 600,
                                  color: palette.scale[100],
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: 200,
                                }}
                              >
                                {notification.title}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '0.6875rem',
                                  color: palette.scale[600],
                                  ml: 1,
                                  flexShrink: 0,
                                }}
                              >
                                {formatTimeAgo(notification.created_at)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Typography
                              sx={{
                                fontSize: '0.75rem',
                                color: palette.scale[500],
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {notification.message}
                            </Typography>
                          }
                        />
                        {!notification.read && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: palette.blue[400],
                              ml: 1,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                  </Box>
                )
              })}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box
            sx={{
              px: 2,
              py: 1,
              borderTop: `1px solid ${alpha(palette.scale[100], 0.08)}`,
              textAlign: 'center',
            }}
          >
            <Button
              size="small"
              onClick={() => {
                navigate('/activity')
                handleClose()
              }}
              sx={{
                fontSize: '0.75rem',
                color: palette.scale[400],
                '&:hover': { color: palette.scale[100] },
              }}
            >
              View Activity Log
            </Button>
          </Box>
        )}
      </Popover>
    </>
  )
}
