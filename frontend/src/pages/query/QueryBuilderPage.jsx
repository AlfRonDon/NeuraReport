import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  Stack,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  Collapse,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import SaveIcon from '@mui/icons-material/Save'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import HistoryIcon from '@mui/icons-material/History'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import StorageIcon from '@mui/icons-material/Storage'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'

import { useAppStore } from '../../store/useAppStore'
import useQueryStore from '../../stores/queryStore'
import * as nl2sqlApi from '../../api/nl2sql'
import * as api from '../../api/client'
import DataTable from '../../ui/DataTable/DataTable'
import { palette } from '../../theme'
import ConfirmModal from '../../ui/Modal/ConfirmModal'
import { useToast } from '../../components/ToastProvider'

export default function QueryBuilderPage() {
  const toast = useToast()
  const connections = useAppStore((s) => s.savedConnections)
  const {
    currentQuestion,
    generatedSQL,
    explanation,
    confidence,
    warnings,
    results,
    columns,
    totalCount,
    executionTimeMs,
    isGenerating,
    isExecuting,
    error,
    selectedConnectionId,
    savedQueries,
    queryHistory,
    setCurrentQuestion,
    setGeneratedSQL,
    setSelectedConnection,
    setGenerationResult,
    setExecutionResult,
    setError,
    setIsGenerating,
    setIsExecuting,
    clearResults,
    clearAll,
    setSavedQueries,
    addSavedQuery,
    removeSavedQuery,
    setQueryHistory,
    loadSavedQuery,
  } = useQueryStore()

  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [schema, setSchema] = useState(null)
  const [deleteSavedConfirm, setDeleteSavedConfirm] = useState({ open: false, queryId: null, queryName: '' })
  const [deleteHistoryConfirm, setDeleteHistoryConfirm] = useState({ open: false, entryId: null, question: '' })
  const schemaRequestIdRef = useRef(0)

  // Fetch connections on mount
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const { connections: conns } = await api.listConnections()
        useAppStore.getState().setSavedConnections(conns || [])
      } catch (err) {
        console.error('Failed to fetch connections:', err)
        toast.show('Failed to load connections. Please refresh the page.', 'error')
      }
    }
    fetchConnections()
  }, [toast])

  // Fetch schema when connection changes
  useEffect(() => {
    if (!selectedConnectionId) {
      setSchema(null)
      return
    }

    // Increment request ID to track this specific request
    const requestId = ++schemaRequestIdRef.current

    const fetchSchema = async () => {
      try {
        const result = await api.getConnectionSchema(selectedConnectionId)
        // Only update state if this is still the latest request
        if (requestId === schemaRequestIdRef.current) {
          setSchema(result)
        }
      } catch (err) {
        // Only log error if this is still the latest request
        if (requestId === schemaRequestIdRef.current) {
          console.error('Failed to fetch schema:', err)
          toast.show('Failed to load database schema', 'warning')
        }
      }
    }
    fetchSchema()
  }, [selectedConnectionId, toast])

  // Fetch saved queries on mount
  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const { queries } = await nl2sqlApi.listSavedQueries()
        setSavedQueries(queries || [])
      } catch (err) {
        console.error('Failed to fetch saved queries:', err)
      }
    }
    fetchSaved()
  }, [setSavedQueries])

  // Fetch history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { history } = await nl2sqlApi.getQueryHistory({ limit: 50 })
        setQueryHistory(history || [])
      } catch (err) {
        console.error('Failed to fetch history:', err)
      }
    }
    fetchHistory()
  }, [setQueryHistory])

  const handleGenerate = useCallback(async () => {
    if (!currentQuestion.trim() || !selectedConnectionId) return

    setIsGenerating(true)
    setError(null)
    clearResults()

    try {
      const result = await nl2sqlApi.generateSQL({
        question: currentQuestion,
        connectionId: selectedConnectionId,
      })

      setGenerationResult({
        sql: result.sql,
        explanation: result.explanation,
        confidence: result.confidence,
        warnings: result.warnings,
        originalQuestion: result.original_question,
      })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate SQL')
    } finally {
      setIsGenerating(false)
    }
  }, [currentQuestion, selectedConnectionId, setIsGenerating, setError, clearResults, setGenerationResult])

  const handleExecute = useCallback(async () => {
    if (!generatedSQL.trim() || !selectedConnectionId) return

    setIsExecuting(true)
    setError(null)

    try {
      const result = await nl2sqlApi.executeQuery({
        sql: generatedSQL,
        connectionId: selectedConnectionId,
        limit: 100,
      })

      setExecutionResult({
        columns: result.columns,
        rows: result.rows,
        rowCount: result.row_count,
        totalCount: result.total_count,
        executionTimeMs: result.execution_time_ms,
        truncated: result.truncated,
      })
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to execute query')
    } finally {
      setIsExecuting(false)
    }
  }, [generatedSQL, selectedConnectionId, setIsExecuting, setError, setExecutionResult])

  const handleSave = useCallback(async () => {
    if (!saveName.trim() || !generatedSQL.trim() || !selectedConnectionId) return

    try {
      const result = await nl2sqlApi.saveQuery({
        name: saveName,
        sql: generatedSQL,
        connectionId: selectedConnectionId,
        description: saveDescription || undefined,
        originalQuestion: currentQuestion || undefined,
      })

      addSavedQuery(result.query)
      setShowSaveDialog(false)
      setSaveName('')
      setSaveDescription('')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save query')
    }
  }, [saveName, saveDescription, generatedSQL, selectedConnectionId, currentQuestion, addSavedQuery, setError])

  const handleDeleteSaved = useCallback(
    async (queryId) => {
      try {
        await nl2sqlApi.deleteSavedQuery(queryId)
        removeSavedQuery(queryId)
        toast.show('Query deleted', 'success')
      } catch (err) {
        console.error('Failed to delete query:', err)
        toast.show(err.message || 'Failed to delete query', 'error')
      }
    },
    [removeSavedQuery, toast]
  )

  const handleDeleteHistory = useCallback(
    async (entryId) => {
      if (!entryId) return
      try {
        await nl2sqlApi.deleteQueryHistoryEntry(entryId)
        setQueryHistory(queryHistory.filter((entry) => entry.id !== entryId))
        toast.show('History entry deleted', 'success')
      } catch (err) {
        console.error('Failed to delete history entry:', err)
        toast.show(err.message || 'Failed to delete history entry', 'error')
      }
    },
    [queryHistory, setQueryHistory, toast]
  )

  const handleCopySQL = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedSQL)
      toast.show('SQL copied to clipboard', 'success')
    } catch (err) {
      toast.show('Failed to copy to clipboard', 'error')
    }
  }, [generatedSQL, toast])

  const tableColumns = columns.map((col) => ({
    field: col,
    header: col,
    sortable: true,
  }))

  const executeDisabledReason = !generatedSQL.trim()
    ? 'Generate SQL before executing'
    : !selectedConnectionId
      ? 'Select a connection first'
      : null

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={600} color={palette.scale[50]}>
            Query Builder
          </Typography>
          <Typography variant="body2" color={palette.scale[400]}>
            Ask questions in natural language and get SQL queries
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<BookmarkIcon />}
            onClick={() => setShowSaved(!showSaved)}
            sx={{ borderColor: alpha(palette.scale[100], 0.2) }}
          >
            Saved ({savedQueries.length})
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<HistoryIcon />}
            onClick={() => setShowHistory(!showHistory)}
            sx={{ borderColor: alpha(palette.scale[100], 0.2) }}
          >
            History
          </Button>
        </Stack>
      </Stack>

      {/* Saved Queries Panel */}
      <Collapse in={showSaved}>
        <Paper
          sx={{
            mb: 2,
            p: 2,
            bgcolor: palette.scale[950],
            border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
          }}
        >
          <Typography variant="subtitle2" color={palette.scale[300]} mb={1}>
            Saved Queries
          </Typography>
          {savedQueries.length === 0 ? (
            <Typography variant="body2" color={palette.scale[500]}>
              No saved queries yet
            </Typography>
          ) : (
            <Stack spacing={1}>
              {savedQueries.slice(0, 5).map((q) => (
                <Stack
                  key={q.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: alpha(palette.scale[100], 0.05),
                    '&:hover': { bgcolor: alpha(palette.scale[100], 0.1) },
                  }}
                >
                  <Box sx={{ cursor: 'pointer', flex: 1 }} onClick={() => loadSavedQuery(q)}>
                    <Typography variant="body2" fontWeight={500} color={palette.scale[200]}>
                      {q.name}
                    </Typography>
                    {q.description && (
                      <Typography variant="caption" color={palette.scale[500]}>
                        {q.description}
                      </Typography>
                    )}
                  </Box>
                  <Tooltip title="Delete saved query">
                    <IconButton
                      size="small"
                      onClick={() => setDeleteSavedConfirm({ open: true, queryId: q.id, queryName: q.name })}
                      aria-label="Delete saved query"
                    >
                      <DeleteIcon fontSize="small" sx={{ color: palette.scale[500] }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
      </Collapse>

      {/* History Panel */}
      <Collapse in={showHistory}>
        <Paper
          sx={{
            mb: 2,
            p: 2,
            bgcolor: palette.scale[950],
            border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
          }}
        >
          <Typography variant="subtitle2" color={palette.scale[300]} mb={1}>
            Recent Queries
          </Typography>
          {queryHistory.length === 0 ? (
            <Typography variant="body2" color={palette.scale[500]}>
              No query history yet
            </Typography>
          ) : (
            <Stack spacing={1}>
              {queryHistory.slice(0, 5).map((h) => (
                <Stack
                  key={h.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: alpha(palette.scale[100], 0.05),
                    cursor: 'pointer',
                    '&:hover': { bgcolor: alpha(palette.scale[100], 0.1) },
                  }}
                  onClick={() => {
                    setCurrentQuestion(h.question)
                    setGeneratedSQL(h.sql)
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" color={palette.scale[200]} noWrap>
                      {h.question}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.5}>
                      <Chip
                        size="small"
                        label={`${Math.round(h.confidence * 100)}%`}
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          bgcolor: h.confidence > 0.8 ? alpha(palette.green[500], 0.2) : alpha(palette.yellow[500], 0.2),
                          color: h.confidence > 0.8 ? palette.green[400] : palette.yellow[400],
                        }}
                      />
                      {h.success ? (
                        <Chip
                          size="small"
                          label="Success"
                          sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha(palette.green[500], 0.2), color: palette.green[400] }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Failed"
                          sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha(palette.red[500], 0.2), color: palette.red[400] }}
                        />
                      )}
                    </Stack>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteHistoryConfirm({ open: true, entryId: h.id, question: h.question })
                    }}
                  >
                    <DeleteIcon fontSize="small" sx={{ color: palette.scale[500] }} />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
      </Collapse>

      {/* Connection Selector */}
      <Paper
        sx={{
          mb: 2,
          p: 2,
          bgcolor: palette.scale[950],
          border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
        }}
      >
        <FormControl fullWidth size="small">
          <InputLabel>Database Connection</InputLabel>
          <Select
            value={selectedConnectionId || ''}
            label="Database Connection"
            onChange={(e) => setSelectedConnection(e.target.value)}
            startAdornment={<StorageIcon sx={{ mr: 1, color: palette.scale[500] }} />}
          >
            {connections.map((conn) => (
              <MenuItem key={conn.id} value={conn.id}>
                {conn.name || conn.database_path}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {schema && (
          <Box mt={2}>
            <Typography variant="caption" color={palette.scale[500]}>
              Available tables: {schema.tables?.map((t) => t.name).join(', ')}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Question Input */}
      <Paper
        sx={{
          mb: 2,
          p: 2,
          bgcolor: palette.scale[950],
          border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
        }}
      >
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          placeholder="Ask a question about your data... (e.g., 'Show me all customers who made purchases last month')"
          value={currentQuestion}
          onChange={(e) => setCurrentQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              handleGenerate()
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: palette.scale[900],
            },
          }}
        />
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
          <Typography variant="caption" color={palette.scale[500]}>
            Press Ctrl+Enter to generate
          </Typography>
          <Button
            variant="contained"
            startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
            onClick={handleGenerate}
            disabled={!currentQuestion.trim() || !selectedConnectionId || isGenerating}
            sx={{
              bgcolor: palette.green[600],
              '&:hover': { bgcolor: palette.green[700] },
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate SQL'}
          </Button>
        </Stack>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Generated SQL */}
      {generatedSQL && (
        <Paper
          sx={{
            mb: 2,
            p: 2,
            bgcolor: palette.scale[950],
            border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" color={palette.scale[300]}>
                Generated SQL
              </Typography>
              {confidence > 0 && (
                <Chip
                  size="small"
                  label={`${Math.round(confidence * 100)}% confidence`}
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: confidence > 0.8 ? alpha(palette.green[500], 0.2) : alpha(palette.yellow[500], 0.2),
                    color: confidence > 0.8 ? palette.green[400] : palette.yellow[400],
                  }}
                />
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Copy SQL">
                <IconButton size="small" onClick={handleCopySQL} aria-label="Copy SQL">
                  <ContentCopyIcon fontSize="small" sx={{ color: palette.scale[400] }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Save Query">
                <IconButton size="small" onClick={() => setShowSaveDialog(true)} aria-label="Save Query">
                  <SaveIcon fontSize="small" sx={{ color: palette.scale[400] }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={10}
            value={generatedSQL}
            onChange={(e) => setGeneratedSQL(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: palette.scale[900],
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              },
            }}
          />

          {warnings.length > 0 && (
            <Stack spacing={0.5} mt={1}>
              {warnings.map((w, i) => (
                <Alert key={i} severity="warning" sx={{ py: 0 }}>
                  {w}
                </Alert>
              ))}
            </Stack>
          )}

          {explanation && (
            <Box mt={2} p={1.5} bgcolor={alpha(palette.blue[500], 0.1)} borderRadius={1}>
              <Stack direction="row" alignItems="flex-start" spacing={1}>
                <LightbulbIcon sx={{ color: palette.blue[400], fontSize: 18, mt: 0.25 }} />
                <Typography variant="body2" color={palette.scale[300]}>
                  {explanation}
                </Typography>
              </Stack>
            </Box>
          )}

          <Stack direction="row" justifyContent="flex-end" mt={2}>
            <Tooltip title={executeDisabledReason || ''} disableHoverListener={!executeDisabledReason}>
              <span>
                <Button
                  variant="contained"
                  startIcon={isExecuting ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                  onClick={handleExecute}
                  disabled={Boolean(executeDisabledReason) || isExecuting}
                  sx={{
                    bgcolor: palette.blue[600],
                    '&:hover': { bgcolor: palette.blue[700] },
                  }}
                >
                  {isExecuting ? 'Executing...' : 'Execute Query'}
                </Button>
              </span>
            </Tooltip>
          </Stack>
          {executeDisabledReason && (
            <Typography variant="caption" color={palette.scale[500]} sx={{ mt: 1, display: 'block' }}>
              {executeDisabledReason}
            </Typography>
          )}
        </Paper>
      )}

      {/* Results */}
      {results && (
        <Paper
          sx={{
            p: 2,
            bgcolor: palette.scale[950],
            border: `1px solid ${alpha(palette.scale[100], 0.1)}`,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="subtitle2" color={palette.scale[300]}>
              Results
            </Typography>
            <Stack direction="row" spacing={2}>
              {totalCount !== null && (
                <Typography variant="caption" color={palette.scale[500]}>
                  {totalCount} total rows
                </Typography>
              )}
              {executionTimeMs !== null && (
                <Typography variant="caption" color={palette.scale[500]}>
                  {executionTimeMs}ms
                </Typography>
              )}
            </Stack>
          </Stack>

          <DataTable columns={tableColumns} data={results} pageSize={10} loading={false} />
        </Paper>
      )}

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Query</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              fullWidth
              label="Name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g., Monthly Sales Report"
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description (optional)"
              value={saveDescription}
              onChange={(e) => setSaveDescription(e.target.value)}
              placeholder="What does this query do?"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!saveName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmModal
        open={deleteSavedConfirm.open}
        onClose={() => setDeleteSavedConfirm({ open: false, queryId: null, queryName: '' })}
        onConfirm={() => {
          handleDeleteSaved(deleteSavedConfirm.queryId)
          setDeleteSavedConfirm({ open: false, queryId: null, queryName: '' })
        }}
        title="Delete Saved Query"
        message={`Are you sure you want to delete "${deleteSavedConfirm.queryName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        severity="error"
      />

      <ConfirmModal
        open={deleteHistoryConfirm.open}
        onClose={() => setDeleteHistoryConfirm({ open: false, entryId: null, question: '' })}
        onConfirm={() => {
          handleDeleteHistory(deleteHistoryConfirm.entryId)
          setDeleteHistoryConfirm({ open: false, entryId: null, question: '' })
        }}
        title="Delete History Entry"
        message={`Are you sure you want to delete this history entry? "${deleteHistoryConfirm.question?.substring(0, 50)}${deleteHistoryConfirm.question?.length > 50 ? '...' : ''}"`}
        confirmLabel="Delete"
        severity="warning"
      />
    </Box>
  )
}
