import { useState, useCallback, useMemo, useRef } from 'react'
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
  FormHelperText,
  CircularProgress,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { testConnection } from '../../api/client'
import {
  validateRequired,
  validateMinLength,
  validateMaxLength,
  combineValidators,
} from '../../utils/validation'

const DB_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', port: 5432 },
  { value: 'mysql', label: 'MySQL', port: 3306 },
  { value: 'mssql', label: 'SQL Server', port: 1433 },
  { value: 'sqlite', label: 'SQLite', port: null },
]

// Field validators
const validators = {
  name: combineValidators(
    (v) => validateRequired(v, 'Connection name'),
    (v) => validateMinLength(v, 2, 'Connection name'),
    (v) => validateMaxLength(v, 100, 'Connection name')
  ),
  host: (value, allValues) => {
    if (allValues.db_type === 'sqlite') return { valid: true, error: null }
    return combineValidators(
      (v) => validateRequired(v, 'Host'),
      (v) => validateMaxLength(v, 255, 'Host')
    )(value)
  },
  database: combineValidators(
    (v) => validateRequired(v, 'Database name'),
    (v) => validateMaxLength(v, 255, 'Database name')
  ),
  port: (value) => {
    const port = parseInt(value, 10)
    if (isNaN(port) || port < 1 || port > 65535) {
      return { valid: false, error: 'Port must be between 1 and 65535' }
    }
    return { valid: true, error: null }
  },
}

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
  const [touched, setTouched] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // 'success' | 'error' | null
  const submitDebounceRef = useRef(false)

  const handleChange = useCallback((field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }
      // Validate on change if field was already touched
      if (touched[field] && validators[field]) {
        const result = validators[field](value, newData)
        setFieldErrors((e) => ({ ...e, [field]: result.error }))
      }
      return newData
    })
    setError(null)
  }, [touched])

  const handleBlur = useCallback((field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    if (validators[field]) {
      const result = validators[field](formData[field], formData)
      setFieldErrors((prev) => ({ ...prev, [field]: result.error }))
    }
  }, [formData])

  const handleDbTypeChange = useCallback((event) => {
    const dbType = event.target.value
    const typeConfig = DB_TYPES.find((t) => t.value === dbType)
    setFormData((prev) => ({
      ...prev,
      db_type: dbType,
      port: typeConfig?.port || prev.port,
    }))
    setTestResult(null)
  }, [])

  const buildConnectionUrl = useCallback(() => {
    if (formData.db_type === 'sqlite') {
      return `sqlite:///${formData.database}`
    }
    const auth = formData.username
      ? `${formData.username}${formData.password ? `:${formData.password}` : ''}@`
      : ''
    return `${formData.db_type}://${auth}${formData.host}:${formData.port}/${formData.database}`
  }, [formData])

  const handleTestConnection = useCallback(async () => {
    // Validate required fields first
    const requiredErrors = {}
    if (!formData.database.trim()) {
      requiredErrors.database = 'Database is required to test'
    }
    if (formData.db_type !== 'sqlite' && !formData.host.trim()) {
      requiredErrors.host = 'Host is required to test'
    }

    if (Object.keys(requiredErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...requiredErrors }))
      setTouched((prev) => ({ ...prev, database: true, host: true }))
      return
    }

    setTesting(true)
    setTestResult(null)
    setError(null)

    try {
      const db_url = buildConnectionUrl()
      const result = await testConnection({ db_url })
      if (result?.status === 'healthy' || result?.healthy) {
        setTestResult('success')
      } else {
        setTestResult('error')
        setError(result?.message || result?.error || 'Connection test failed')
      }
    } catch (err) {
      setTestResult('error')
      setError(err.message || 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }, [formData, buildConnectionUrl])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()

    // Debounce protection against double-submit
    if (submitDebounceRef.current) return
    submitDebounceRef.current = true
    setTimeout(() => { submitDebounceRef.current = false }, 1000)

    // Mark all fields as touched
    const allTouched = { name: true, host: true, database: true, port: true }
    setTouched(allTouched)

    // Validate all fields
    const errors = {}
    let hasErrors = false

    for (const [field, validator] of Object.entries(validators)) {
      const result = validator(formData[field], formData)
      if (!result.valid) {
        errors[field] = result.error
        hasErrors = true
      }
    }

    setFieldErrors(errors)

    if (hasErrors) {
      const firstError = Object.values(errors).find(Boolean)
      setError(firstError || 'Please fix the errors above')
      return
    }

    const db_url = buildConnectionUrl()

    onSave({
      ...formData,
      db_url,
    })
  }, [formData, onSave, buildConnectionUrl])

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
          onBlur={handleBlur('name')}
          placeholder="My Database"
          required
          fullWidth
          error={touched.name && Boolean(fieldErrors.name)}
          helperText={touched.name && fieldErrors.name}
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
              onBlur={handleBlur('host')}
              placeholder="localhost"
              required
              sx={{ flex: 2 }}
              error={touched.host && Boolean(fieldErrors.host)}
              helperText={touched.host && fieldErrors.host}
            />
            <TextField
              label="Port"
              type="number"
              value={formData.port}
              onChange={handleChange('port')}
              onBlur={handleBlur('port')}
              sx={{ flex: 1 }}
              error={touched.port && Boolean(fieldErrors.port)}
              helperText={touched.port && fieldErrors.port}
            />
          </Stack>
        )}

        <TextField
          label={isSqlite ? 'Database Path' : 'Database Name'}
          value={formData.database}
          onChange={handleChange('database')}
          onBlur={handleBlur('database')}
          placeholder={isSqlite ? '/path/to/database.db' : 'mydatabase'}
          required
          fullWidth
          error={touched.database && Boolean(fieldErrors.database)}
          helperText={touched.database && fieldErrors.database}
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

        {/* Test Connection Result */}
        {testResult && (
          <Alert
            severity={testResult === 'success' ? 'success' : 'error'}
            icon={testResult === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}
            onClose={() => setTestResult(null)}
          >
            {testResult === 'success'
              ? 'Connection successful! Database is reachable.'
              : error || 'Connection failed'}
          </Alert>
        )}

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="text"
            onClick={handleTestConnection}
            disabled={loading || testing}
            startIcon={testing ? <CircularProgress size={16} /> : null}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
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
