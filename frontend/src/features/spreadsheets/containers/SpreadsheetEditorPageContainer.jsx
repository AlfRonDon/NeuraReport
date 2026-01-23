/**
 * Spreadsheet Editor Page Container
 * Excel-like spreadsheet editor with formulas and pivot tables.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tabs,
  Tab,
  useTheme,
  alpha,
  styled,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  TableChart as SpreadsheetIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Functions as FormulaIcon,
  PivotTableChart as PivotIcon,
  AutoAwesome as AIIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  TextFormat as FormatIcon,
} from '@mui/icons-material'
import useSpreadsheetStore from '@/stores/spreadsheetStore'
import { useToast } from '@/components/ToastProvider'
import { useInteraction, InteractionType, Reversibility } from '@/components/ux/governance'

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 64px)',
  backgroundColor: theme.palette.background.default,
}))

const Toolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
}))

const FormulaBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: theme.palette.background.paper,
  gap: theme.spacing(2),
}))

const CellReference = styled(Box)(({ theme }) => ({
  width: 80,
  padding: theme.spacing(0.5, 1),
  backgroundColor: alpha(theme.palette.primary.main, 0.05),
  borderRadius: 4,
  textAlign: 'center',
  fontWeight: 600,
  fontSize: 13,
}))

const SpreadsheetArea = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  backgroundColor: theme.palette.background.default,
}))

const SheetTabs = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  minHeight: 36,
}))

const GridContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '40px repeat(26, 100px)',
  gap: 0,
  padding: theme.spacing(1),
}))

const HeaderCell = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0.5),
  backgroundColor: alpha(theme.palette.primary.main, 0.05),
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  textAlign: 'center',
  fontWeight: 600,
  fontSize: 12,
  userSelect: 'none',
}))

const Cell = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected',
})(({ theme, selected }) => ({
  padding: theme.spacing(0.5),
  border: `1px solid ${selected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.2)}`,
  backgroundColor: selected ? alpha(theme.palette.primary.main, 0.05) : theme.palette.background.paper,
  minHeight: 24,
  fontSize: 13,
  cursor: 'cell',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.02),
  },
}))

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 6,
  textTransform: 'none',
  fontWeight: 500,
  minWidth: 'auto',
}))

const EmptyState = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  textAlign: 'center',
}))

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const COLUMNS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const ROWS = Array.from({ length: 100 }, (_, i) => i + 1)

export default function SpreadsheetEditorPage() {
  const theme = useTheme()
  const toast = useToast()
  const { execute } = useInteraction()
  const {
    spreadsheets,
    currentSpreadsheet,
    activeSheetIndex,
    selectedCells,
    loading,
    saving,
    error,
    fetchSpreadsheets,
    createSpreadsheet,
    getSpreadsheet,
    updateCells,
    addSheet,
    deleteSheet,
    setActiveSheetIndex,
    setSelectedCells,
    createPivotTable,
    generateFormula,
    importCsv,
    exportSpreadsheet,
    reset,
  } = useSpreadsheetStore()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newSpreadsheetName, setNewSpreadsheetName] = useState('')
  const [formulaValue, setFormulaValue] = useState('')
  const [selectedCell, setSelectedCell] = useState({ row: 1, col: 0 })
  const [cellData, setCellData] = useState({})
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchSpreadsheets()
    return () => reset()
  }, [fetchSpreadsheets, reset])

  useEffect(() => {
    if (currentSpreadsheet?.sheets?.[activeSheetIndex]?.data) {
      setCellData(currentSpreadsheet.sheets[activeSheetIndex].data)
    }
  }, [currentSpreadsheet, activeSheetIndex])

  const executeUI = useCallback((label, action, intent = {}) => {
    return execute({
      type: InteractionType.EXECUTE,
      label,
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'spreadsheets', ...intent },
      action,
    })
  }, [execute])

  const handleOpenCreateDialog = useCallback(() => {
    return executeUI('Open create spreadsheet', () => setCreateDialogOpen(true))
  }, [executeUI])

  const handleCloseCreateDialog = useCallback(() => {
    return executeUI('Close create spreadsheet', () => setCreateDialogOpen(false))
  }, [executeUI])

  const handleOpenAiDialog = useCallback(() => {
    return executeUI('Open AI formula', () => setAiDialogOpen(true))
  }, [executeUI])

  const handleCloseAiDialog = useCallback(() => {
    return executeUI('Close AI formula', () => setAiDialogOpen(false))
  }, [executeUI])

  const handleTriggerImport = useCallback(() => {
    return executeUI('Import spreadsheet', () => fileInputRef.current?.click())
  }, [executeUI])

  const handleSelectSpreadsheet = useCallback((spreadsheetId) => {
    return execute({
      type: InteractionType.EXECUTE,
      label: 'Open spreadsheet',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'spreadsheets', spreadsheetId },
      action: async () => {
        await getSpreadsheet(spreadsheetId)
      },
    })
  }, [execute, getSpreadsheet])

  const handleCreateSpreadsheet = useCallback(() => {
    if (!newSpreadsheetName) return undefined
    return execute({
      type: InteractionType.CREATE,
      label: 'Create spreadsheet',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'spreadsheets', name: newSpreadsheetName },
      action: async () => {
        const spreadsheet = await createSpreadsheet({
          name: newSpreadsheetName,
          sheets: [{ name: 'Sheet 1', data: {} }],
        })
        if (spreadsheet) {
          setCreateDialogOpen(false)
          setNewSpreadsheetName('')
          toast.show('Spreadsheet created', 'success')
        }
        return spreadsheet
      },
    })
  }, [createSpreadsheet, execute, newSpreadsheetName, toast])

  const handleCellClick = (row, col) => {
    setSelectedCell({ row, col })
    const cellKey = `${COLUMNS[col]}${row}`
    setFormulaValue(cellData[cellKey]?.formula || cellData[cellKey]?.value || '')
  }

  const handleCellChange = (row, col, value) => {
    const cellKey = `${COLUMNS[col]}${row}`
    const isFormula = value.startsWith('=')
    setCellData((prev) => ({
      ...prev,
      [cellKey]: {
        value: isFormula ? '' : value,
        formula: isFormula ? value : null,
        display: value,
      },
    }))
  }

  const handleFormulaChange = (e) => {
    const value = e.target.value
    setFormulaValue(value)
    handleCellChange(selectedCell.row, selectedCell.col, value)
  }

  const handleSave = useCallback(() => {
    if (!currentSpreadsheet) return undefined
    return execute({
      type: InteractionType.UPDATE,
      label: 'Save spreadsheet',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'spreadsheets', spreadsheetId: currentSpreadsheet.id },
      action: async () => {
        await updateCells(currentSpreadsheet.id, activeSheetIndex, cellData)
        toast.show('Spreadsheet saved', 'success')
      },
    })
  }, [activeSheetIndex, cellData, currentSpreadsheet, execute, toast, updateCells])

  const handleImport = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    execute({
      type: InteractionType.UPLOAD,
      label: 'Import spreadsheet',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'spreadsheets', filename: file.name },
      action: async () => {
        const result = await importCsv(file)
        if (result) {
          toast.show('File imported successfully', 'success')
        }
      },
    }).finally(() => {
      e.target.value = ''
    })
  }, [execute, importCsv, toast])

  const handleExport = useCallback((format) => {
    if (!currentSpreadsheet) return undefined
    return execute({
      type: InteractionType.DOWNLOAD,
      label: 'Export spreadsheet',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'spreadsheets', spreadsheetId: currentSpreadsheet.id, format },
      action: async () => {
        const blob = await exportSpreadsheet(currentSpreadsheet.id, format)
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${currentSpreadsheet.name}.${format}`
          a.click()
          URL.revokeObjectURL(url)
        } else {
          toast.show('Export not available', 'warning')
        }
      },
    })
  }, [currentSpreadsheet, execute, exportSpreadsheet, toast])

  const handleAIFormula = useCallback(() => {
    if (!aiPrompt || !currentSpreadsheet) return undefined
    return execute({
      type: InteractionType.GENERATE,
      label: 'Generate formula',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      blocksNavigation: true,
      intent: { source: 'spreadsheets', spreadsheetId: currentSpreadsheet.id },
      action: async () => {
        const result = await generateFormula(currentSpreadsheet.id, aiPrompt)
        if (result?.formula) {
          setFormulaValue(result.formula)
          handleCellChange(selectedCell.row, selectedCell.col, result.formula)
          toast.show('Formula generated', 'success')
        }
        setAiDialogOpen(false)
        setAiPrompt('')
        return result
      },
    })
  }, [aiPrompt, currentSpreadsheet, execute, generateFormula, selectedCell, toast])

  const handlePivotNotice = useCallback(() => {
    return executeUI('Open pivot table', () => {
      toast.show('Pivot table coming soon', 'info')
    })
  }, [executeUI, toast])

  const handleSelectSheet = useCallback((index) => {
    return executeUI('Switch sheet', () => setActiveSheetIndex(index), { index })
  }, [executeUI, setActiveSheetIndex])

  const handleAddSheet = useCallback(() => {
    if (!currentSpreadsheet) return undefined
    return execute({
      type: InteractionType.UPDATE,
      label: 'Add sheet',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'spreadsheets', spreadsheetId: currentSpreadsheet.id },
      action: async () => {
        const nextIndex = (currentSpreadsheet.sheets?.length || 0) + 1
        await addSheet(currentSpreadsheet.id, `Sheet ${nextIndex}`)
      },
    })
  }, [addSheet, currentSpreadsheet, execute])

  const handleDismissError = useCallback(() => {
    return executeUI('Dismiss spreadsheet error', () => reset())
  }, [executeUI, reset])

  const getCellValue = (row, col) => {
    const cellKey = `${COLUMNS[col]}${row}`
    return cellData[cellKey]?.display || cellData[cellKey]?.value || ''
  }

  return (
    <PageContainer>
      {/* Toolbar */}
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SpreadsheetIcon sx={{ color: 'success.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {currentSpreadsheet?.name || 'Spreadsheets'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {currentSpreadsheet ? (
            <>
              <ActionButton
                size="small"
                startIcon={<UploadIcon />}
                onClick={handleTriggerImport}
              >
                Import
              </ActionButton>
              <ActionButton
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleExport('csv')}
              >
                Export
              </ActionButton>
              <ActionButton
                size="small"
                startIcon={<PivotIcon />}
                onClick={handlePivotNotice}
              >
                Pivot
              </ActionButton>
              <ActionButton
                size="small"
                startIcon={<AIIcon />}
                onClick={handleOpenAiDialog}
              >
                AI Formula
              </ActionButton>
              <ActionButton
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                Save
              </ActionButton>
            </>
          ) : (
            <ActionButton
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              New Spreadsheet
            </ActionButton>
          )}
        </Box>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".csv,.xlsx,.xls"
          onChange={handleImport}
        />
      </Toolbar>

      {currentSpreadsheet ? (
        <>
          {/* Formula Bar */}
          <FormulaBar>
            <CellReference>
              {COLUMNS[selectedCell.col]}{selectedCell.row}
            </CellReference>
            <FormulaIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <TextField
              fullWidth
              size="small"
              value={formulaValue}
              onChange={handleFormulaChange}
              placeholder="Enter value or formula (start with =)"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  fontSize: 13,
                },
              }}
            />
          </FormulaBar>

          {/* Spreadsheet Grid */}
          <SpreadsheetArea>
            <GridContainer>
              {/* Header row */}
              <HeaderCell />
              {COLUMNS.map((col) => (
                <HeaderCell key={col}>{col}</HeaderCell>
              ))}

              {/* Data rows */}
              {ROWS.slice(0, 50).map((row) => (
                <React.Fragment key={row}>
                  <HeaderCell>{row}</HeaderCell>
                  {COLUMNS.map((col, colIndex) => (
                    <Cell
                      key={`${col}${row}`}
                      selected={selectedCell.row === row && selectedCell.col === colIndex}
                      onClick={() => handleCellClick(row, colIndex)}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => handleCellChange(row, colIndex, e.target.textContent)}
                    >
                      {getCellValue(row, colIndex)}
                    </Cell>
                  ))}
                </React.Fragment>
              ))}
            </GridContainer>
          </SpreadsheetArea>

          {/* Sheet Tabs */}
          <SheetTabs>
            {currentSpreadsheet.sheets?.map((sheet, index) => (
              <Chip
                key={index}
                label={sheet.name}
                size="small"
                variant={activeSheetIndex === index ? 'filled' : 'outlined'}
                color={activeSheetIndex === index ? 'primary' : 'default'}
                onClick={() => handleSelectSheet(index)}
                sx={{ mr: 1, borderRadius: 1 }}
              />
            ))}
            <IconButton
              size="small"
              onClick={handleAddSheet}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </SheetTabs>
        </>
      ) : (
        <EmptyState>
          <SpreadsheetIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            No Spreadsheet Selected
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Create a new spreadsheet or import data from a file.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <ActionButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Create Spreadsheet
            </ActionButton>
            <ActionButton
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={handleTriggerImport}
            >
              Import CSV
            </ActionButton>
          </Box>

          {spreadsheets.length > 0 && (
            <Box sx={{ mt: 4, width: '100%', maxWidth: 400 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Recent Spreadsheets
              </Typography>
              {spreadsheets.slice(0, 5).map((ss) => (
                <Paper
                  key={ss.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                  }}
                  variant="outlined"
                  onClick={() => handleSelectSpreadsheet(ss.id)}
                >
                  <SpreadsheetIcon color="success" />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {ss.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ss.sheets?.length || 1} sheets
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </EmptyState>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create New Spreadsheet</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Spreadsheet Name"
            value={newSpreadsheetName}
            onChange={(e) => setNewSpreadsheetName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateSpreadsheet}
            disabled={!newSpreadsheetName || loading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Formula Dialog */}
      <Dialog
        open={aiDialogOpen}
        onClose={handleCloseAiDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon color="primary" />
            Generate Formula with AI
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Describe what you want to calculate in plain English.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            placeholder="e.g., Sum all values in column A where column B equals 'Sales'"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAiDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAIFormula}
            disabled={!aiPrompt}
            startIcon={<AIIcon />}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Alert
          severity="error"
          onClose={handleDismissError}
          sx={{ position: 'fixed', bottom: 16, right: 16, maxWidth: 400 }}
        >
          {error}
        </Alert>
      )}
    </PageContainer>
  )
}
