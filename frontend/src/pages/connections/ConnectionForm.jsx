import { useState, useCallback } from 'react'
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Button,
  Alert,
  Collapse,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

const DB_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', port: 5432 },
  { value: 'mysql', label: 'MySQL', port: 3306 },
  { value: 'mssql', label: 'SQL Server', port: 1433 },
  { value: 'sqlite', label: 'SQLite', port: null },
]

export default function ConnectionForm({ connection, onSave, onCancel, loading }) {
  const [formData, setFormData] = useState({
    name: connection?.name || '',
    db_type: connection?.db_type || 'postgresql',
    host: connection?.host || 'localhost',
    port: connection?.port || 5432,
    database: connection?.database || '',
    username: connection?.username || '',
    password: '',
    ssl: connection?.ssl ?? true,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = useCallback((field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }, [])

  const handleDbTypeChange = useCallback((event) => {
    const dbType = event.target.value
    const typeConfig = DB_TYPES.find((t) => t.value === dbType)
    setFormData((prev) => ({
      ...prev,
      db_type: dbType,
      port: typeConfig?.port || prev.port,
    }))
  }, [])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError('Connection name is required')
      return
    }

    if (formData.db_type !== 'sqlite' && !formData.host.trim()) {
      setError('Host is required')
      return
    }

    if (!formData.database.trim()) {
      setError('Database name is required')
      return
    }

    // Build connection URL
    let db_url
    if (formData.db_type === 'sqlite') {
      db_url = `sqlite:///${formData.database}`
    } else {
      const auth = formData.username
        ? `${formData.username}${formData.password ? `:${formData.password}` : ''}@`
        : ''
      db_url = `${formData.db_type}://${auth}${formData.host}:${formData.port}/${formData.database}`
    }

    onSave({
      ...formData,
      db_url,
    })
  }, [formData, onSave])

  const isSqlite = formData.db_type === 'sqlite'

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          label="Connection Name"
          value={formData.name}
          onChange={handleChange('name')}
          placeholder="My Database"
          required
          fullWidth
        />

        <FormControl fullWidth>
          <InputLabel>Database Type</InputLabel>
          <Select
            value={formData.db_type}
            onChange={handleDbTypeChange}
            label="Database Type"
          >
            {DB_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {!isSqlite && (
          <Stack direction="row" spacing={2}>
            <TextField
              label="Host"
              value={formData.host}
              onChange={handleChange('host')}
              placeholder="localhost"
              required
              sx={{ flex: 2 }}
            />
            <TextField
              label="Port"
              type="number"
              value={formData.port}
              onChange={handleChange('port')}
              sx={{ flex: 1 }}
            />
          </Stack>
        )}

        <TextField
          label={isSqlite ? 'Database Path' : 'Database Name'}
          value={formData.database}
          onChange={handleChange('database')}
          placeholder={isSqlite ? '/path/to/database.db' : 'mydatabase'}
          required
          fullWidth
        />

        {!isSqlite && (
          <>
            <TextField
              label="Username"
              value={formData.username}
              onChange={handleChange('username')}
              placeholder="postgres"
              fullWidth
            />

            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              placeholder="Enter password"
              fullWidth
            />
          </>
        )}

        {/* Advanced Settings */}
        <Box>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowAdvanced((prev) => !prev)}
            endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ textTransform: 'none', fontWeight: 500 }}
          >
            Advanced Settings
          </Button>

          <Collapse in={showAdvanced}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Stack spacing={2}>
                {!isSqlite && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.ssl}
                        onChange={handleChange('ssl')}
                      />
                    }
                    label="Use SSL"
                  />
                )}
                <Typography variant="caption" color="text.secondary">
                  Additional connection options can be configured here.
                </Typography>
              </Stack>
            </Box>
          </Collapse>
        </Box>

        <Divider />

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {connection ? 'Update Connection' : 'Add Connection'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
