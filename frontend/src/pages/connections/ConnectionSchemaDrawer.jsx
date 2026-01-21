import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Stack,
  Typography,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  LinearProgress,
  alpha,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Drawer } from '../../ui/Drawer'
import * as api from '../../api/client'
import { palette } from '../../theme'

const formatRowCount = (value) => {
  if (value == null) return 'n/a'
  return value.toLocaleString()
}

export default function ConnectionSchemaDrawer({ open, onClose, connection }) {
  const [schema, setSchema] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [previewState, setPreviewState] = useState({})

  const fetchSchema = useCallback(async () => {
    if (!connection?.id) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.getConnectionSchema(connection.id, {
        includeRowCounts: true,
        includeForeignKeys: true,
      })
      setSchema(result)
    } catch (err) {
      setError(err.message || 'Failed to load schema')
    } finally {
      setLoading(false)
    }
  }, [connection?.id])

  useEffect(() => {
    if (open) {
      fetchSchema()
    }
  }, [open, fetchSchema])

  const filteredTables = useMemo(() => {
    const tables = schema?.tables || []
    const query = filter.trim().toLowerCase()
    if (!query) return tables
    return tables.filter((table) => table.name.toLowerCase().includes(query))
  }, [schema, filter])

  const handlePreview = useCallback(async (tableName) => {
    if (!connection?.id || !tableName) return
    setPreviewState((prev) => ({
      ...prev,
      [tableName]: { ...(prev[tableName] || {}), loading: true, error: null },
    }))
    try {
      const result = await api.getConnectionTablePreview(connection.id, {
        table: tableName,
        limit: 6,
      })
      setPreviewState((prev) => ({
        ...prev,
        [tableName]: {
          loading: false,
          error: null,
          columns: result.columns || [],
          rows: result.rows || [],
        },
      }))
    } catch (err) {
      setPreviewState((prev) => ({
        ...prev,
        [tableName]: { ...(prev[tableName] || {}), loading: false, error: err.message || 'Preview failed' },
      }))
    }
  }, [connection?.id])

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Connection Schema"
      subtitle={connection?.name || connection?.summary || 'Database overview'}
      width={680}
      actions={(
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button variant="outlined" onClick={fetchSchema} startIcon={<RefreshIcon />}>
            Refresh
          </Button>
        </Stack>
      )}
    >
      <Stack spacing={2}>
        <TextField
          label="Filter tables"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="small"
          fullWidth
        />
        {loading && <LinearProgress />}
        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={fetchSchema}>
                Retry
              </Button>
            }
          >
            {error === 'Failed to load schema'
              ? 'Unable to connect to database. Please verify the connection is active and try again.'
              : error}
          </Alert>
        )}
        {!loading && !error && (
          <Typography variant="body2" color="text.secondary">
            {schema?.table_count || 0} tables found
          </Typography>
        )}
        {filteredTables.map((table) => {
          const preview = previewState[table.name] || {}
          return (
            <Accordion key={table.name} disableGutters sx={{ bgcolor: palette.scale[1000] }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: palette.scale[500] }} />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontWeight: 600 }}>{table.name}</Typography>
                  <Chip
                    size="small"
                    label={`${formatRowCount(table.row_count)} rows`}
                    sx={{
                      bgcolor: alpha(palette.scale[100], 0.08),
                      color: palette.scale[300],
                    }}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Columns
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>PK</TableCell>
                          <TableCell>Required</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(table.columns || []).map((column) => (
                          <TableRow key={column.name}>
                            <TableCell>{column.name}</TableCell>
                            <TableCell>{column.type || '-'}</TableCell>
                            <TableCell>{column.pk ? 'Yes' : '-'}</TableCell>
                            <TableCell>{column.notnull ? 'Yes' : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>

                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2">Preview</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handlePreview(table.name)}
                      >
                        Load preview
                      </Button>
                    </Stack>
                    {preview.loading && <LinearProgress sx={{ mt: 1 }} />}
                    {preview.error && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {preview.error}
                      </Alert>
                    )}
                    {preview.rows && preview.rows.length > 0 && (
                      <Table size="small" sx={{ mt: 1 }}>
                        <TableHead>
                          <TableRow>
                            {(preview.columns || []).map((col) => (
                              <TableCell key={col}>{col}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {preview.rows.map((row, idx) => (
                            <TableRow key={`${table.name}-row-${idx}`}>
                              {(preview.columns || []).map((col) => (
                                <TableCell key={`${table.name}-${idx}-${col}`}>
                                  {row[col] == null ? '-' : String(row[col])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    {!preview.loading && preview.rows && preview.rows.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        No rows returned.
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Stack>
    </Drawer>
  )
}
