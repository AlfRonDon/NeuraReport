import { Box, Typography, Stack, Chip, alpha } from '@mui/material'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { Button } from '../primitives'

export default function ReportBlock({ data, onDownload, onPreview }) {
  const {
    name,
    status,
    format,
    size,
    downloadUrl,
    previewUrl,
    generatedAt,
    rows,
    batches,
  } = data || {}

  const isReady = status === 'completed' || status === 'ready'
  const isFailed = status === 'failed' || status === 'error'

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: isReady
          ? 'success.main'
          : isFailed
          ? 'error.main'
          : 'primary.main',
        bgcolor: isReady
          ? (theme) => alpha(theme.palette.success.main, 0.04)
          : isFailed
          ? (theme) => alpha(theme.palette.error.main, 0.04)
          : (theme) => alpha(theme.palette.primary.main, 0.04),
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: isReady
              ? 'success.main'
              : isFailed
              ? 'error.main'
              : 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AssessmentOutlinedIcon />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle2" fontWeight={600}>
              {name || 'Report'}
            </Typography>
            <Chip
              size="small"
              label={status || 'unknown'}
              color={isReady ? 'success' : isFailed ? 'error' : 'primary'}
            />
            {format && (
              <Chip
                size="small"
                label={format.toUpperCase()}
                variant="outlined"
              />
            )}
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
            {rows && (
              <Typography variant="caption" color="text.secondary">
                {rows.toLocaleString()} rows
              </Typography>
            )}
            {batches && (
              <Typography variant="caption" color="text.secondary">
                {batches} batches
              </Typography>
            )}
            {size && (
              <Typography variant="caption" color="text.secondary">
                {size}
              </Typography>
            )}
            {generatedAt && (
              <Typography variant="caption" color="text.secondary">
                {new Date(generatedAt).toLocaleString()}
              </Typography>
            )}
          </Stack>
        </Box>

        {isReady && (
          <Stack direction="row" spacing={1}>
            {previewUrl && onPreview && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                onClick={() => onPreview(previewUrl)}
              >
                Preview
              </Button>
            )}
            {downloadUrl && onDownload && (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<DownloadIcon />}
                onClick={() => onDownload(downloadUrl)}
              >
                Download
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
