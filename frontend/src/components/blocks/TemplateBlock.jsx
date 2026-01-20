import { Box, Typography, Stack, Chip, alpha } from '@mui/material'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined'
import { Button } from '../primitives'

export default function TemplateBlock({ data, onSelect, onEdit }) {
  const { id, name, status, kind, fields = [], description } = data || {}

  const isApproved = status === 'approved'
  const isPending = status === 'pending'

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: isApproved ? 'success.main' : 'divider',
        bgcolor: isApproved
          ? (theme) => alpha(theme.palette.success.main, 0.04)
          : 'background.default',
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: isApproved ? 'success.main' : 'action.selected',
            color: isApproved ? 'white' : 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <DescriptionOutlinedIcon />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle2" fontWeight={600}>
              {name || 'Template'}
            </Typography>
            <Chip
              size="small"
              label={status || 'unknown'}
              color={isApproved ? 'success' : isPending ? 'warning' : 'default'}
              icon={
                isApproved ? <CheckCircleOutlineIcon /> : isPending ? <PendingOutlinedIcon /> : undefined
              }
            />
            {kind && (
              <Chip
                size="small"
                label={kind.toUpperCase()}
                variant="outlined"
              />
            )}
          </Stack>

          {description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {description}
            </Typography>
          )}

          {fields.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
              {fields.slice(0, 5).map((field, idx) => (
                <Chip
                  key={idx}
                  size="small"
                  label={field}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
              {fields.length > 5 && (
                <Chip
                  size="small"
                  label={`+${fields.length - 5} more`}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={1}>
          {isApproved && onSelect && (
            <Button size="small" variant="contained" onClick={() => onSelect(id)}>
              Use
            </Button>
          )}
          {onEdit && (
            <Button size="small" variant="outlined" onClick={() => onEdit(id)}>
              Edit
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  )
}
