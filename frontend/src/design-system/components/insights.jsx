/**
 * Insights Components - AI-Powered Insight Display
 * Premium cards for showing insights, alerts, risks, and recommendations
 */

import { forwardRef, useState } from 'react'
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Collapse,
  Avatar,
  LinearProgress,
  alpha,
  useTheme,
  styled,
  keyframes,
} from '@mui/material'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import ShareIcon from '@mui/icons-material/Share'
import FlagIcon from '@mui/icons-material/Flag'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import SecurityIcon from '@mui/icons-material/Security'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'

// =============================================================================
// ANIMATIONS
// =============================================================================

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

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 15px rgba(var(--glow-color), 0.2); }
  50% { box-shadow: 0 0 30px rgba(var(--glow-color), 0.4); }
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

// =============================================================================
// INSIGHT CARD - General insight display
// =============================================================================

const InsightCardRoot = styled(Box, {
  shouldForwardProp: (prop) => !['severity', 'hoverable'].includes(prop),
})(({ theme, severity = 'info', hoverable }) => {
  const severityColors = {
    info: theme.palette.info,
    success: theme.palette.success,
    warning: theme.palette.warning,
    error: theme.palette.error,
    primary: theme.palette.primary,
  }

  const color = severityColors[severity] || severityColors.info

  return {
    position: 'relative',
    padding: theme.spacing(2.5),
    borderRadius: theme.shape.borderRadius * 1.5,
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(color.main, 0.08)
      : alpha(color.main, 0.05),
    border: `1px solid ${alpha(color.main, 0.15)}`,
    overflow: 'hidden',
    animation: `${slideIn} 0.3s ease-out`,
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',

    // Top accent bar
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      background: `linear-gradient(90deg, ${color.main}, ${color.light})`,
    },

    ...(hoverable && {
      cursor: 'pointer',

      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 8px 24px ${alpha(color.main, 0.15)}`,
        borderColor: alpha(color.main, 0.3),

        '& .insight-arrow': {
          transform: 'translateX(4px)',
          opacity: 1,
        },
      },
    }),
  }
})

const InsightIcon = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== 'severity',
})(({ theme, severity = 'info' }) => {
  const severityColors = {
    info: theme.palette.info,
    success: theme.palette.success,
    warning: theme.palette.warning,
    error: theme.palette.error,
    primary: theme.palette.primary,
  }

  const color = severityColors[severity] || severityColors.info

  return {
    width: 40,
    height: 40,
    backgroundColor: alpha(color.main, 0.12),
    color: color.main,
    transition: 'transform 0.25s ease',

    '.MuiBox-root:hover &': {
      transform: 'scale(1.1)',
    },
  }
})

export const InsightCard = forwardRef(function InsightCard(props, ref) {
  const {
    title,
    description,
    severity = 'info',
    icon,
    category,
    confidence,
    actions,
    expandable = false,
    expanded: controlledExpanded,
    onExpandChange,
    hoverable = false,
    onClick,
    onBookmark,
    bookmarked = false,
    sx,
    children,
    ...other
  } = props

  const theme = useTheme()
  const [internalExpanded, setInternalExpanded] = useState(false)
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded

  const handleExpand = () => {
    const newExpanded = !expanded
    setInternalExpanded(newExpanded)
    onExpandChange?.(newExpanded)
  }

  const severityIcons = {
    info: <LightbulbIcon />,
    success: <CheckCircleOutlineIcon />,
    warning: <WarningAmberIcon />,
    error: <ErrorOutlineIcon />,
    primary: <AutoAwesomeIcon />,
  }

  return (
    <InsightCardRoot
      ref={ref}
      severity={severity}
      hoverable={hoverable}
      onClick={hoverable ? onClick : undefined}
      sx={sx}
      {...other}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <InsightIcon severity={severity}>
          {icon || severityIcons[severity]}
        </InsightIcon>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            {category && (
              <Chip
                label={category}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              />
            )}
            {confidence !== undefined && (
              <Typography variant="caption" color="text.tertiary">
                {Math.round(confidence * 100)}% confidence
              </Typography>
            )}
          </Stack>

          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{ mb: 0.5, lineHeight: 1.3 }}
          >
            {title}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              lineHeight: 1.5,
              ...(expandable && !expanded && {
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }),
            }}
          >
            {description}
          </Typography>

          {/* Expandable content */}
          {expandable && (
            <Collapse in={expanded}>
              <Box sx={{ mt: 2 }}>
                {children}
              </Box>
            </Collapse>
          )}

          {/* Actions */}
          {(expandable || actions || onBookmark) && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mt: 1.5 }}
            >
              {expandable && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExpand()
                  }}
                  sx={{
                    p: 0.5,
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {expanded ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </IconButton>
              )}

              {onBookmark && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    onBookmark?.()
                  }}
                  sx={{
                    p: 0.5,
                    color: bookmarked ? 'primary.main' : 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {bookmarked ? (
                    <BookmarkIcon fontSize="small" />
                  ) : (
                    <BookmarkBorderIcon fontSize="small" />
                  )}
                </IconButton>
              )}

              {actions}

              {hoverable && (
                <ArrowForwardIcon
                  className="insight-arrow"
                  sx={{
                    ml: 'auto',
                    fontSize: '1rem',
                    color: 'text.secondary',
                    opacity: 0,
                    transition: 'all 0.2s ease',
                  }}
                />
              )}
            </Stack>
          )}
        </Box>
      </Stack>
    </InsightCardRoot>
  )
})

// =============================================================================
// ALERT CARD - Prominent alerts and notifications
// =============================================================================

const AlertCardRoot = styled(Box, {
  shouldForwardProp: (prop) => !['severity', 'variant'].includes(prop),
})(({ theme, severity = 'info', variant = 'standard' }) => {
  const severityColors = {
    info: theme.palette.info,
    success: theme.palette.success,
    warning: theme.palette.warning,
    error: theme.palette.error,
  }

  const color = severityColors[severity] || severityColors.info

  const baseStyles = {
    position: 'relative',
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius * 1.5,
    overflow: 'hidden',
  }

  if (variant === 'filled') {
    return {
      ...baseStyles,
      backgroundColor: color.main,
      color: color.contrastText,
      boxShadow: `0 4px 12px ${alpha(color.main, 0.3)}`,
    }
  }

  if (variant === 'outlined') {
    return {
      ...baseStyles,
      backgroundColor: 'transparent',
      border: `2px solid ${color.main}`,
      color: color.main,
    }
  }

  // Standard variant
  return {
    ...baseStyles,
    backgroundColor: alpha(color.main, 0.1),
    borderLeft: `4px solid ${color.main}`,
  }
})

export const AlertCard = forwardRef(function AlertCard(props, ref) {
  const {
    title,
    message,
    severity = 'info',
    variant = 'standard',
    icon,
    action,
    onClose,
    sx,
    ...other
  } = props

  const severityIcons = {
    info: <LightbulbIcon />,
    success: <CheckCircleOutlineIcon />,
    warning: <WarningAmberIcon />,
    error: <ErrorOutlineIcon />,
  }

  return (
    <AlertCardRoot
      ref={ref}
      severity={severity}
      variant={variant}
      sx={sx}
      {...other}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ mt: 0.25 }}>
          {icon || severityIcons[severity]}
        </Box>

        <Box sx={{ flex: 1 }}>
          {title && (
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              {title}
            </Typography>
          )}
          <Typography variant="body2">
            {message}
          </Typography>
        </Box>

        {action}
      </Stack>
    </AlertCardRoot>
  )
})

// =============================================================================
// RISK CARD - Risk assessment display
// =============================================================================

const RiskCardRoot = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5),
  borderRadius: theme.shape.borderRadius * 1.5,
  backgroundColor: theme.palette.mode === 'dark'
    ? alpha(theme.palette.error.main, 0.08)
    : alpha(theme.palette.error.main, 0.04),
  border: `1px solid ${alpha(theme.palette.error.main, 0.15)}`,
  transition: 'all 0.25s ease',

  '&:hover': {
    borderColor: alpha(theme.palette.error.main, 0.3),
    boxShadow: `0 4px 16px ${alpha(theme.palette.error.main, 0.1)}`,
  },
}))

const RiskLevel = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'level',
})(({ theme, level }) => {
  const levelColors = {
    low: theme.palette.success.main,
    medium: theme.palette.warning.main,
    high: theme.palette.error.main,
    critical: theme.palette.error.dark,
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1.5),
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: alpha(levelColors[level] || levelColors.medium, 0.15),
    color: levelColors[level] || levelColors.medium,
  }
})

export const RiskCard = forwardRef(function RiskCard(props, ref) {
  const {
    title,
    description,
    level = 'medium', // low, medium, high, critical
    probability,
    impact,
    category,
    mitigation,
    sx,
    ...other
  } = props

  const theme = useTheme()

  const levelLabels = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical',
  }

  return (
    <RiskCardRoot ref={ref} sx={sx} {...other}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: 'error.main',
              }}
            >
              <SecurityIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                {title}
              </Typography>
              {category && (
                <Typography variant="caption" color="text.tertiary">
                  {category}
                </Typography>
              )}
            </Box>
          </Stack>
          <RiskLevel level={level}>
            <FlagIcon sx={{ fontSize: 12 }} />
            {levelLabels[level]}
          </RiskLevel>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>

        {/* Risk metrics */}
        {(probability !== undefined || impact !== undefined) && (
          <Stack direction="row" spacing={3}>
            {probability !== undefined && (
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.tertiary" gutterBottom>
                  Probability
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={probability * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'error.main',
                      borderRadius: 3,
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round(probability * 100)}%
                </Typography>
              </Box>
            )}
            {impact !== undefined && (
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.tertiary" gutterBottom>
                  Impact
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={impact * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'warning.main',
                      borderRadius: 3,
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round(impact * 100)}%
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {/* Mitigation */}
        {mitigation && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.success.main, 0.08),
              border: `1px solid ${alpha(theme.palette.success.main, 0.15)}`,
            }}
          >
            <Typography
              variant="caption"
              fontWeight={600}
              color="success.main"
              sx={{ display: 'block', mb: 0.5 }}
            >
              Recommended Mitigation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {mitigation}
            </Typography>
          </Box>
        )}
      </Stack>
    </RiskCardRoot>
  )
})

// =============================================================================
// OPPORTUNITY CARD - Opportunity display
// =============================================================================

const OpportunityCardRoot = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5),
  borderRadius: theme.shape.borderRadius * 1.5,
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`
    : `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
  transition: 'all 0.25s ease',

  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.15)}`,
  },
}))

export const OpportunityCard = forwardRef(function OpportunityCard(props, ref) {
  const {
    title,
    description,
    potentialValue,
    effort,
    category,
    timeframe,
    actionLabel = 'Explore',
    onAction,
    sx,
    ...other
  } = props

  const theme = useTheme()

  const effortLabels = {
    low: { label: 'Low Effort', color: 'success' },
    medium: { label: 'Medium Effort', color: 'warning' },
    high: { label: 'High Effort', color: 'error' },
  }

  return (
    <OpportunityCardRoot ref={ref} sx={sx} {...other}>
      <Stack spacing={2}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.primary.main} 100%)`,
              }}
            >
              <RocketLaunchIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                {title}
              </Typography>
              {category && (
                <Chip
                  label={category}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.6rem',
                    mt: 0.5,
                  }}
                />
              )}
            </Box>
          </Stack>

          {potentialValue && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.tertiary">
                Potential Value
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{
                  color: 'success.main',
                  lineHeight: 1,
                }}
              >
                {potentialValue}
              </Typography>
            </Box>
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={2}>
          {effort && (
            <Chip
              label={effortLabels[effort]?.label || effort}
              size="small"
              color={effortLabels[effort]?.color || 'default'}
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
          {timeframe && (
            <Typography variant="caption" color="text.tertiary">
              Timeframe: {timeframe}
            </Typography>
          )}
          {onAction && (
            <Box
              component="button"
              onClick={onAction}
              sx={{
                ml: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 2,
                py: 0.75,
                border: 'none',
                borderRadius: 2,
                bgcolor: 'success.main',
                color: 'success.contrastText',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',

                '&:hover': {
                  bgcolor: 'success.dark',
                  transform: 'translateX(2px)',
                },
              }}
            >
              {actionLabel}
              <ArrowForwardIcon sx={{ fontSize: 16 }} />
            </Box>
          )}
        </Stack>
      </Stack>
    </OpportunityCardRoot>
  )
})

// =============================================================================
// ACTION ITEM CARD - Recommended actions
// =============================================================================

const ActionItemRoot = styled(Box, {
  shouldForwardProp: (prop) => !['priority', 'completed'].includes(prop),
})(({ theme, priority = 'medium', completed }) => {
  const priorityColors = {
    low: theme.palette.info.main,
    medium: theme.palette.warning.main,
    high: theme.palette.error.main,
  }

  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius * 1.5,
    backgroundColor: completed
      ? alpha(theme.palette.success.main, 0.05)
      : theme.palette.background.paper,
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    borderLeft: `3px solid ${completed ? theme.palette.success.main : priorityColors[priority]}`,
    opacity: completed ? 0.7 : 1,
    transition: 'all 0.2s ease',

    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.02),
      borderColor: alpha(theme.palette.primary.main, 0.1),
    },
  }
})

export const ActionItemCard = forwardRef(function ActionItemCard(props, ref) {
  const {
    title,
    description,
    priority = 'medium',
    dueDate,
    assignee,
    completed = false,
    onToggle,
    onEdit,
    sx,
    ...other
  } = props

  const theme = useTheme()

  return (
    <ActionItemRoot
      ref={ref}
      priority={priority}
      completed={completed}
      sx={sx}
      {...other}
    >
      <IconButton
        size="small"
        onClick={onToggle}
        sx={{
          mt: 0.25,
          color: completed ? 'success.main' : 'text.secondary',
          '&:hover': { color: 'primary.main' },
        }}
      >
        {completed ? (
          <CheckCircleOutlineIcon />
        ) : (
          <AssignmentTurnedInIcon />
        )}
      </IconButton>

      <Box sx={{ flex: 1 }}>
        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{
            textDecoration: completed ? 'line-through' : 'none',
            color: completed ? 'text.secondary' : 'text.primary',
          }}
        >
          {title}
        </Typography>

        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            {description}
          </Typography>
        )}

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ mt: 1 }}
        >
          <Chip
            label={priority.charAt(0).toUpperCase() + priority.slice(1)}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          />
          {dueDate && (
            <Typography variant="caption" color="text.tertiary">
              Due: {dueDate}
            </Typography>
          )}
          {assignee && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Avatar sx={{ width: 18, height: 18, fontSize: '0.65rem' }}>
                {assignee[0]}
              </Avatar>
              <Typography variant="caption" color="text.secondary">
                {assignee}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Box>
    </ActionItemRoot>
  )
})

// =============================================================================
// INSIGHT LIST - Container for multiple insights
// =============================================================================

export const InsightList = forwardRef(function InsightList(props, ref) {
  const { children, title, count, sx, ...other } = props
  const theme = useTheme()

  return (
    <Box ref={ref} sx={sx} {...other}>
      {title && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
          {count !== undefined && (
            <Chip
              label={count}
              size="small"
              sx={{
                height: 24,
                fontWeight: 600,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            />
          )}
        </Stack>
      )}
      <Stack spacing={2}>
        {children}
      </Stack>
    </Box>
  )
})

export default {
  InsightCard,
  AlertCard,
  RiskCard,
  OpportunityCard,
  ActionItemCard,
  InsightList,
}
