/**
 * Premium Data Table Empty State
 * Beautiful empty state with animations and call-to-action
 */
import {
  Box,
  Typography,
  Button,
  useTheme,
  alpha,
  styled,
  keyframes,
} from '@mui/material'
import { Inbox as InboxIcon, Add as AddIcon } from '@mui/icons-material'

// =============================================================================
// ANIMATIONS
// =============================================================================

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
`

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const EmptyContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(8, 4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  backgroundColor: 'transparent',
  position: 'relative',
  overflow: 'hidden',
  animation: `${fadeIn} 0.5s ease-out`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    height: 400,
    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 70%)`,
    pointerEvents: 'none',
  },
}))

const IconContainer = styled(Box)(({ theme }) => ({
  width: 80,
  height: 80,
  borderRadius: 24,
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.secondary.main, 0.06)})`,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(3),
  position: 'relative',
  animation: `${float} 3s infinite ease-in-out`,
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: -1,
    borderRadius: 25,
    padding: 1,
    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, transparent)`,
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    pointerEvents: 'none',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
    animation: `${pulse} 2s infinite ease-in-out`,
    zIndex: -1,
  },
}))

const StyledIcon = styled(Box)(({ theme }) => ({
  fontSize: 32,
  color: theme.palette.primary.main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const Title = styled(Typography)(({ theme }) => ({
  fontSize: '1.125rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(0.5),
  letterSpacing: '-0.01em',
}))

const Description = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
  maxWidth: 360,
  marginBottom: theme.spacing(3),
  lineHeight: 1.6,
}))

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  padding: theme.spacing(1.25, 3),
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
  color: '#fff',
  boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
  },
  '&:active': {
    transform: 'translateY(0)',
  },
}))

const SecondaryButton = styled(Button)(({ theme }) => ({
  borderRadius: 12,
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  padding: theme.spacing(1.25, 3),
  color: theme.palette.text.secondary,
  borderColor: alpha(theme.palette.divider, 0.2),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    color: theme.palette.primary.main,
  },
}))

const DecorativeDots = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginTop: theme.spacing(4),
  '& span': {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: alpha(theme.palette.text.primary, 0.1),
    '&:nth-of-type(2)': {
      backgroundColor: alpha(theme.palette.primary.main, 0.3),
    },
  },
}))

const IllustrationLines = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 40,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  opacity: 0.3,
  '& span': {
    height: 4,
    borderRadius: 2,
    backgroundColor: alpha(theme.palette.text.primary, 0.1),
    '&:nth-of-type(1)': { width: 120 },
    '&:nth-of-type(2)': { width: 80, marginLeft: 20 },
    '&:nth-of-type(3)': { width: 100, marginLeft: 10 },
  },
}))

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DataTableEmptyState({
  icon: Icon = InboxIcon,
  title = 'No data',
  description,
  action,
  actionLabel,
  onAction,
  secondaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  const theme = useTheme()

  return (
    <EmptyContainer>
      <IconContainer>
        <StyledIcon as={Icon} />
      </IconContainer>

      <Title>{title}</Title>

      {description && <Description>{description}</Description>}

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {(action || onAction) && (
          <ActionButton
            onClick={onAction}
            startIcon={action?.icon || <AddIcon />}
          >
            {actionLabel || action?.label || 'Get Started'}
          </ActionButton>
        )}

        {(secondaryAction || onSecondaryAction) && (
          <SecondaryButton
            variant="outlined"
            onClick={onSecondaryAction}
            startIcon={secondaryAction?.icon}
          >
            {secondaryActionLabel || secondaryAction?.label || 'Learn More'}
          </SecondaryButton>
        )}
      </Box>

      <DecorativeDots>
        <span />
        <span />
        <span />
      </DecorativeDots>
    </EmptyContainer>
  )
}
