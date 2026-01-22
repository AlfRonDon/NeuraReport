/**
 * Optimistic Action Utilities
 * Provides optimistic UI updates with automatic rollback on failure
 *
 * UX Laws Addressed:
 * - Optimize perceived speed, not just raw speed
 * - Make every action reversible where possible
 * - Immediate feedback (within 100ms)
 */
import { useCallback, useRef } from 'react'
import { useToast } from '../ToastProvider'
import { useOperationHistory, OperationType } from './OperationHistoryProvider'

/**
 * Create an optimistic action handler
 *
 * @param {Object} config
 * @param {Function} config.optimisticUpdate - Function to apply optimistic update to state
 * @param {Function} config.serverAction - Async function to perform server action
 * @param {Function} config.rollback - Function to rollback the optimistic update
 * @param {string} config.successMessage - Message to show on success
 * @param {string} config.errorMessage - Message to show on error
 * @param {boolean} config.showUndo - Whether to show undo option on success
 * @param {Function} config.undoAction - Function to undo the action (if showUndo is true)
 */
export function createOptimisticAction(config) {
  const {
    optimisticUpdate,
    serverAction,
    rollback,
    successMessage,
    errorMessage = 'Something went wrong. Please try again.',
    showUndo = false,
    undoAction,
    onSuccess,
    onError,
  } = config

  return async (...args) => {
    // Store pre-update state for rollback
    const preUpdateState = rollback ? rollback.getState?.() : null

    // Apply optimistic update immediately
    if (optimisticUpdate) {
      optimisticUpdate(...args)
    }

    try {
      // Perform actual server action
      const result = await serverAction(...args)

      // Success callback
      onSuccess?.(result)

      return { success: true, result }
    } catch (error) {
      // Rollback on failure
      if (rollback) {
        rollback(preUpdateState, ...args)
      }

      // Error callback
      onError?.(error)

      return { success: false, error }
    }
  }
}

/**
 * Hook for optimistic actions with toast feedback
 */
export function useOptimisticAction() {
  const { show, showWithUndo } = useToast()
  const { startOperation, completeOperation, failOperation } = useOperationHistory()
  const pendingActions = useRef(new Map())

  const execute = useCallback(async ({
    label,
    type = OperationType.UPDATE,
    optimisticUpdate,
    serverAction,
    rollback,
    successMessage,
    errorMessage = 'Action failed. Please try again.',
    showUndo = false,
    undoAction,
    undoDuration = 5000,
  }) => {
    // Generate action ID
    const actionId = `action_${Date.now()}_${Math.random().toString(36).slice(2)}`

    // Store rollback state
    const rollbackState = rollback?.getState?.()

    // Apply optimistic update immediately (within 100ms target)
    const optimisticAppliedAt = Date.now()
    if (optimisticUpdate) {
      optimisticUpdate()
    }

    // Track operation
    const operationId = startOperation({
      type,
      label,
      canUndo: showUndo && !!undoAction,
      undoFn: undoAction,
    })

    // Store pending action
    pendingActions.current.set(actionId, {
      rollbackState,
      rollback,
      operationId,
    })

    try {
      // Perform server action
      const result = await serverAction()

      // Verify optimistic update was applied quickly
      const latency = Date.now() - optimisticAppliedAt
      if (latency > 100) {
        console.warn(`Optimistic update latency: ${latency}ms (target: <100ms)`)
      }

      // Complete operation
      completeOperation(operationId, result)

      // Show success feedback with optional undo
      if (successMessage) {
        if (showUndo && undoAction) {
          showWithUndo(successMessage, async () => {
            await undoAction(result)
            show('Action undone', 'info')
          }, { severity: 'success', duration: undoDuration })
        } else {
          show(successMessage, 'success')
        }
      }

      // Cleanup
      pendingActions.current.delete(actionId)

      return { success: true, result }
    } catch (error) {
      // Rollback optimistic update
      const pending = pendingActions.current.get(actionId)
      if (pending?.rollback) {
        pending.rollback(pending.rollbackState)
      }

      // Fail operation
      failOperation(operationId, error)

      // Show error feedback
      const message = error?.userMessage || error?.message || errorMessage
      show(message, 'error')

      // Cleanup
      pendingActions.current.delete(actionId)

      return { success: false, error }
    }
  }, [show, showWithUndo, startOperation, completeOperation, failOperation])

  return { execute }
}

/**
 * Hook for list item deletion with undo
 * Specialized for common delete-with-undo pattern
 */
export function useOptimisticDelete() {
  const { execute } = useOptimisticAction()

  const deleteItem = useCallback(async ({
    itemId,
    itemLabel,
    items,
    setItems,
    deleteAction,
    restoreAction,
    successMessage,
  }) => {
    // Find item index for reinsertion
    const itemIndex = items.findIndex((item) => item.id === itemId)
    const deletedItem = items[itemIndex]

    if (!deletedItem) {
      return { success: false, error: new Error('Item not found') }
    }

    return execute({
      label: `Delete ${itemLabel}`,
      type: OperationType.DELETE,
      optimisticUpdate: () => {
        setItems((prev) => prev.filter((item) => item.id !== itemId))
      },
      serverAction: () => deleteAction(itemId),
      rollback: {
        getState: () => ({ items, index: itemIndex, item: deletedItem }),
        restore: (state) => {
          // Reinsert item at original position
          setItems((prev) => {
            const newItems = [...prev]
            newItems.splice(state.index, 0, state.item)
            return newItems
          })
        },
      },
      successMessage: successMessage || `${itemLabel} deleted`,
      showUndo: true,
      undoAction: async () => {
        if (restoreAction) {
          await restoreAction(deletedItem)
        }
        // Reinsert item
        setItems((prev) => {
          const newItems = [...prev]
          newItems.splice(itemIndex, 0, deletedItem)
          return newItems
        })
      },
    })
  }, [execute])

  return { deleteItem }
}

/**
 * Hook for optimistic create operations
 */
export function useOptimisticCreate() {
  const { execute } = useOptimisticAction()

  const createItem = useCallback(async ({
    tempItem,
    setItems,
    createAction,
    successMessage,
    errorMessage,
  }) => {
    const tempId = `temp_${Date.now()}`
    const optimisticItem = { ...tempItem, id: tempId, _isOptimistic: true }

    return execute({
      label: `Create ${tempItem.name || 'item'}`,
      type: OperationType.CREATE,
      optimisticUpdate: () => {
        setItems((prev) => [...prev, optimisticItem])
      },
      serverAction: async () => {
        const result = await createAction(tempItem)
        // Replace temp item with real item
        setItems((prev) => prev.map((item) =>
          item.id === tempId ? { ...result, _isOptimistic: false } : item
        ))
        return result
      },
      rollback: {
        getState: () => null,
        restore: () => {
          setItems((prev) => prev.filter((item) => item.id !== tempId))
        },
      },
      successMessage,
      errorMessage,
    })
  }, [execute])

  return { createItem }
}
