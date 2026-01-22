/**
 * UX Components Index
 * Premium interaction and usability components
 */

// Core providers
export {
  OperationHistoryProvider,
  useOperationHistory,
  useTrackedOperation,
  OperationStatus,
  OperationType,
} from './OperationHistoryProvider'

// Feedback components
export { default as DisabledTooltip, DisabledReasons, DisabledHints } from './DisabledTooltip'
export { default as NetworkStatusBanner, NetworkIndicator, NetworkStatus } from './NetworkStatusBanner'
export { default as ActivityPanel, ActivityButton } from './ActivityPanel'

// Progress indicators
export {
  FullPageProgress,
  InlineProgress,
  SkeletonLoader,
  OperationComplete,
  StepProgress,
} from './ProgressOverlay'

// Optimistic actions
export {
  createOptimisticAction,
  useOptimisticAction,
  useOptimisticDelete,
  useOptimisticCreate,
} from './OptimisticAction'

// Validation
export {
  ValidationState,
  ValidationRules,
  useFieldValidation,
  ValidatedTextField,
  ValidationFeedback,
  CharacterCounter,
} from './InlineValidator'
