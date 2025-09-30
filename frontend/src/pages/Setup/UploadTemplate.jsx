import { useState } from 'react'
import { Box, Paper, Typography, Stack, Button, List, ListItem, ListItemText } from '@mui/material'

export default function UploadTemplate() {
  const [files, setFiles] = useState([])

  const onFileChange = (e) => {
    const selected = Array.from(e.target.files || [])
    setFiles(selected)
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Upload & Verify Template</Typography>
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
    </Paper>
  )
}

