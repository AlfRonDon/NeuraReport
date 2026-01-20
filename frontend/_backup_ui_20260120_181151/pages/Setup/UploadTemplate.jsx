import { useState } from 'react'
import { Box, Typography, Stack, Button, List, ListItem, ListItemText } from '@mui/material'
import Surface from '../../components/layout/Surface.jsx'
import InfoTooltip from '../../components/common/InfoTooltip.jsx'
import TOOLTIP_COPY from '../../content/tooltipCopy.jsx'

export default function UploadTemplate() {
  const [files, setFiles] = useState([])

  const onFileChange = (e) => {
    const selected = Array.from(e.target.files || [])
    setFiles(selected)
  }

  return (
    <Surface>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 2 }}>
        <Typography variant="h6">Upload & Verify Template</Typography>
        <InfoTooltip
          content={TOOLTIP_COPY.uploadTemplate}
          ariaLabel="Upload and verify guidance"
        />
      </Stack>
      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} alignItems="center">
        <Button variant="outlined" component="label">
          Choose PDF
          <input hidden accept="application/pdf" type="file" onChange={onFileChange} />
        </Button>
        <Typography variant="body2" color="text.secondary">Drag-and-drop coming soon</Typography>
      </Stack>
      {!!files.length && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Selected</Typography>
          <List dense>
            {files.map((f) => (
              <ListItem key={f.name} disableGutters>
                <ListItemText primary={f.name} secondary={`${(f.size/1024).toFixed(1)} KB`} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Surface>
  )
}
