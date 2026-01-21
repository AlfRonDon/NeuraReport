import { useState, useCallback, useEffect } from 'react'
import { IconButton, Tooltip, CircularProgress, alpha } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import * as api from '../api/client'
import { palette } from '../theme'

/**
 * A reusable favorite toggle button.
 * @param {Object} props
 * @param {string} props.entityType - 'templates' or 'connections'
 * @param {string} props.entityId - The ID of the entity
 * @param {boolean} [props.initialFavorite] - Initial favorite state (if known)
 * @param {function} [props.onToggle] - Callback when favorite is toggled (isFavorite) => void
 * @param {'small' | 'medium'} [props.size] - Button size
 */
export default function FavoriteButton({
  entityType,
  entityId,
  initialFavorite,
  onToggle,
  size = 'small',
}) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite ?? false)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(initialFavorite !== undefined)

  // Check favorite status on mount if not provided
  useEffect(() => {
    if (checked || !entityId) return

    let cancelled = false
    api.checkFavorite(entityType, entityId)
      .then((result) => {
        if (!cancelled) {
          setIsFavorite(result.isFavorite)
          setChecked(true)
        }
      })
      .catch(() => {
        // Ignore errors on initial check
        if (!cancelled) setChecked(true)
      })

    return () => { cancelled = true }
  }, [entityType, entityId, checked])

  // Update if initialFavorite prop changes
  useEffect(() => {
    if (initialFavorite !== undefined) {
      setIsFavorite(initialFavorite)
      setChecked(true)
    }
  }, [initialFavorite])

  const handleToggle = useCallback(async (e) => {
    e.stopPropagation()
    if (loading || !entityId) return

    setLoading(true)
    const nextFavorite = !isFavorite

    // Optimistic update
    setIsFavorite(nextFavorite)

    try {
      if (nextFavorite) {
        await api.addFavorite(entityType, entityId)
      } else {
        await api.removeFavorite(entityType, entityId)
      }
      onToggle?.(nextFavorite)
    } catch {
      // Revert on error
      setIsFavorite(!nextFavorite)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId, isFavorite, loading, onToggle])

  const iconSize = size === 'small' ? 18 : 22

  return (
    <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
      <IconButton
        size={size}
        onClick={handleToggle}
        disabled={loading}
        sx={{
          color: isFavorite ? palette.yellow[400] : palette.scale[500],
          '&:hover': {
            color: isFavorite ? palette.yellow[300] : palette.yellow[400],
            bgcolor: alpha(palette.yellow[400], 0.1),
          },
        }}
      >
        {loading ? (
          <CircularProgress size={iconSize - 4} sx={{ color: palette.yellow[400] }} />
        ) : isFavorite ? (
          <StarIcon sx={{ fontSize: iconSize }} />
        ) : (
          <StarBorderIcon sx={{ fontSize: iconSize }} />
        )}
      </IconButton>
    </Tooltip>
  )
}
