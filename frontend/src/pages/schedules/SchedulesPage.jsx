import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box,
  Container,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { DataTable } from '../../ui/DataTable'
import { ConfirmModal } from '../../ui/Modal'
import { useAppStore } from '../../store/useAppStore'
import { useToast } from '../../components/ToastProvider'
import * as api from '../../api/client'

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const FREQUENCY_INTERVALS = {
  daily: 1440,
  weekly: 10080,
  monthly: 43200,
}

const extractDateOnly = (value) => {
  if (!value) return ''
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

const buildDateTime = (dateValue, endOfDay = false) => {
  if (!dateValue) return ''
  const time = endOfDay ? '23:59:59' : '00:00:00'
  return `${dateValue} ${time}`
}

const parseEmailList = (raw) => {
  if (!raw) return []
  return raw
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const formatEmailList = (list) => {
  if (!Array.isArray(list)) return ''
  return list.filter(Boolean).join(', ')
}

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function ScheduleDialog({
  open,
  onClose,
  schedule,
  templates,
  connections,
  defaultTemplateId,
  defaultConnectionId,
  onSave,
  onError,
}) {
  const [form, setForm] = useState({
    name: '',
    templateId: '',
    connectionId: '',
    startDate: '',
    endDate: '',
    frequency: 'daily',
    emailRecipients: '',
    emailSubject: '',
    emailMessage: '',
    active: true,
  })
  const [saving, setSaving] = useState(false)
  const editing = Boolean(schedule)

  useEffect(() => {
    if (schedule) {
      setForm({
        name: schedule.name || '',
        templateId: schedule.template_id || '',
        connectionId: schedule.connection_id || '',
        startDate: extractDateOnly(schedule.start_date),
        endDate: extractDateOnly(schedule.end_date),
        frequency: schedule.frequency || 'daily',
        emailRecipients: formatEmailList(schedule.email_recipients),
        emailSubject: schedule.email_subject || '',
        emailMessage: schedule.email_message || '',
        active: schedule.active !== false,
      })
      return
    }
    const fallbackTemplate = defaultTemplateId || templates[0]?.id || ''
    const fallbackConnection = defaultConnectionId || connections[0]?.id || ''
    setForm({
      name: '',
      templateId: fallbackTemplate,
      connectionId: fallbackConnection,
      startDate: '',
      endDate: '',
      frequency: 'daily',
      emailRecipients: '',
      emailSubject: '',
      emailMessage: '',
      active: true,
    })
  }, [schedule, templates, connections, open, defaultTemplateId, defaultConnectionId])

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    const intervalMinutes = FREQUENCY_INTERVALS[form.frequency] || FREQUENCY_INTERVALS.daily
    const emailRecipients = parseEmailList(form.emailRecipients)
    const startDate = buildDateTime(form.startDate)
    const endDate = buildDateTime(form.endDate, true)

    // Validate date range: end date must be >= start date
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      onError?.('End date must be on or after start date')
      return
    }

    // Validate email format if recipients are provided
    if (emailRecipients.length > 0) {
      const invalidEmail = emailRecipients.find((email) => !isValidEmail(email))
      if (invalidEmail) {
        onError?.(`Invalid email address: ${invalidEmail}`)
        return
      }
    }

    setSaving(true)
    try {
      await onSave({
        name: form.name,
        templateId: form.templateId,
        connectionId: form.connectionId,
        startDate,
        endDate,
        frequency: form.frequency,
        intervalMinutes,
        emailRecipients: emailRecipients.length ? emailRecipients : undefined,
        emailSubject: form.emailSubject || undefined,
        emailMessage: form.emailMessage || undefined,
        active: form.active,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const disableSave = saving
    || !form.name
    || !form.templateId
    || !form.connectionId
    || !form.startDate
    || !form.endDate

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Edit Schedule' : 'Create Schedule'}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Schedule Name"
            value={form.name}
            onChange={handleChange('name')}
            fullWidth
            required
          />

          <FormControl fullWidth required>
            <InputLabel>Template</InputLabel>
            <Select
              value={form.templateId}
              onChange={handleChange('templateId')}
              label="Template"
              disabled={editing}
            >
              {templates.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name || t.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel>Connection</InputLabel>
            <Select
              value={form.connectionId}
              onChange={handleChange('connectionId')}
              label="Connection"
              disabled={editing}
            >
              {connections.map((conn) => (
                <MenuItem key={conn.id} value={conn.id}>
                  {conn.name || conn.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={handleChange('startDate')}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={handleChange('endDate')}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
          </Stack>

          <FormControl fullWidth>
            <InputLabel>Frequency</InputLabel>
            <Select
              value={form.frequency}
              onChange={handleChange('frequency')}
              label="Frequency"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Email recipients"
            value={form.emailRecipients}
            onChange={handleChange('emailRecipients')}
            placeholder="ops@example.com, finance@example.com"
            helperText="Comma or semicolon separated list"
            fullWidth
          />
          <TextField
            label="Email subject"
            value={form.emailSubject}
            onChange={handleChange('emailSubject')}
            fullWidth
          />
          <TextField
            label="Email message"
            value={form.emailMessage}
            onChange={handleChange('emailMessage')}
            multiline
            minRows={2}
            fullWidth
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.active}
                onChange={handleChange('active')}
              />
            }
            label="Active"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={disableSave}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function SchedulesPage() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const templates = useAppStore((s) => s.templates)
  const setTemplates = useAppStore((s) => s.setTemplates)
  const savedConnections = useAppStore((s) => s.savedConnections)
  const activeConnectionId = useAppStore((s) => s.activeConnectionId)

  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingSchedule, setDeletingSchedule] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [menuSchedule, setMenuSchedule] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const didLoadSchedulesRef = useRef(false)
  const didLoadTemplatesRef = useRef(false)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const schedulesData = await api.listSchedules()
      setSchedules(schedulesData || [])
    } catch (err) {
      toast.show(err.message || 'Failed to load schedules', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (didLoadSchedulesRef.current) return
    didLoadSchedulesRef.current = true
    fetchSchedules()
  }, [fetchSchedules])

  const fetchTemplates = useCallback(async () => {
    if (templates.length > 0) return
    try {
      const templatesData = await api.listApprovedTemplates()
      if (Array.isArray(templatesData) && templatesData.length > 0) {
        setTemplates(templatesData)
      }
    } catch (err) {
      toast.show(err.message || 'Failed to load templates', 'error')
    }
  }, [templates.length, setTemplates, toast])

  useEffect(() => {
    if (didLoadTemplatesRef.current) return
    didLoadTemplatesRef.current = true
    fetchTemplates()
  }, [fetchTemplates])

  const templateParam = searchParams.get('template')
  const defaultTemplateId = templateParam || templates[0]?.id || ''
  const defaultConnectionId = activeConnectionId || savedConnections[0]?.id || ''

  useEffect(() => {
    if (!templateParam) return
    setEditingSchedule(null)
    setDialogOpen(true)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('template')
    setSearchParams(nextParams, { replace: true })
  }, [templateParam, searchParams, setSearchParams])

  const handleOpenMenu = useCallback((event, schedule) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setMenuSchedule(schedule)
  }, [])

  const handleCloseMenu = useCallback(() => {
    setMenuAnchor(null)
    setMenuSchedule(null)
  }, [])

  const handleAddSchedule = useCallback(() => {
    setEditingSchedule(null)
    setDialogOpen(true)
  }, [])

  const handleEditSchedule = useCallback(() => {
    setEditingSchedule(menuSchedule)
    setDialogOpen(true)
    handleCloseMenu()
  }, [menuSchedule, handleCloseMenu])

  const handleDeleteClick = useCallback(() => {
    setDeletingSchedule(menuSchedule)
    setDeleteConfirmOpen(true)
    handleCloseMenu()
  }, [menuSchedule, handleCloseMenu])

  const handleToggleSchedule = useCallback(
    async (schedule, nextActive) => {
      if (!schedule) return
      setTogglingId(schedule.id)
      try {
        await api.updateSchedule(schedule.id, { active: nextActive })
        toast.show(`Schedule ${nextActive ? 'enabled' : 'paused'}`, 'success')
        await fetchSchedules()
      } catch (err) {
        toast.show(err.message || 'Failed to update schedule', 'error')
      } finally {
        setTogglingId(null)
      }
    },
    [toast, fetchSchedules]
  )

  const handleToggleEnabled = useCallback(async () => {
    if (!menuSchedule) return
    const currentActive = menuSchedule.active ?? menuSchedule.enabled ?? true
    const nextActive = !currentActive
    await handleToggleSchedule(menuSchedule, nextActive)
    handleCloseMenu()
  }, [menuSchedule, handleCloseMenu, handleToggleSchedule])

  const handleSaveSchedule = useCallback(
    async (data) => {
      try {
        if (editingSchedule) {
          await api.updateSchedule(editingSchedule.id, data)
          toast.show('Schedule updated', 'success')
        } else {
          await api.createSchedule(data)
          toast.show('Schedule created', 'success')
        }
        fetchSchedules()
      } catch (err) {
        toast.show(err.message || 'Failed to save schedule', 'error')
        throw err
      }
    },
    [editingSchedule, toast, fetchSchedules]
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingSchedule) return
    try {
      await api.deleteSchedule(deletingSchedule.id)
      toast.show('Schedule deleted', 'success')
      fetchSchedules()
    } catch (err) {
      toast.show(err.message || 'Failed to delete schedule', 'error')
    } finally {
      setDeleteConfirmOpen(false)
      setDeletingSchedule(null)
    }
  }, [deletingSchedule, toast, fetchSchedules])

  const columns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Schedule',
        renderCell: (value, row) => (
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {value || row.id}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {templates.find((t) => t.id === row.template_id)?.name
                || row.template_name
                || row.template_id}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'frequency',
        headerName: 'Frequency',
        width: 120,
        renderCell: (value) => {
          const option = FREQUENCY_OPTIONS.find((opt) => opt.value === value)
          const label = option?.label || value || 'daily'
          return (
            <Chip label={label} size="small" variant="outlined" />
          )
        },
      },
      {
        field: 'enabled',
        headerName: 'Status',
        width: 100,
        renderCell: (value, row) => {
          const active = row.active ?? value ?? true
          return (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch
                size="small"
                checked={active}
                disabled={togglingId === row.id}
                onChange={(e) => {
                  e.stopPropagation()
                  handleToggleSchedule(row, e.target.checked)
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {active ? 'Active' : 'Paused'}
              </Typography>
            </Stack>
          )
        },
      },
      {
        field: 'last_run',
        headerName: 'Last Run',
        width: 180,
        renderCell: (value, row) => {
          const lastRun = value || row.last_run_at
          return lastRun ? new Date(lastRun).toLocaleString() : 'Never'
        },
      },
      {
        field: 'next_run',
        headerName: 'Next Run',
        width: 180,
        renderCell: (value, row) => {
          const active = row.active ?? row.enabled ?? true
          const nextRun = value || row.next_run_at
          return active && nextRun ? new Date(nextRun).toLocaleString() : '-'
        },
      },
    ],
    [templates, handleToggleSchedule, togglingId]
  )

  const filters = useMemo(
    () => [
      {
        key: 'frequency',
        label: 'Frequency',
        options: FREQUENCY_OPTIONS,
      },
      {
        key: 'active',
        label: 'Status',
        options: [
          { value: true, label: 'Active' },
          { value: false, label: 'Paused' },
        ],
      },
    ],
    []
  )

  const menuScheduleActive = menuSchedule?.active ?? menuSchedule?.enabled ?? true

  return (
    <Box sx={{ py: 3 }}>
      <Container maxWidth="xl">
        <DataTable
          title="Scheduled Reports"
          subtitle="Automate report generation on a schedule"
          columns={columns}
          data={schedules}
          loading={loading}
          searchPlaceholder="Search schedules..."
          filters={filters}
          actions={[
            {
              label: 'Create Schedule',
              icon: <AddIcon />,
              variant: 'contained',
              onClick: handleAddSchedule,
            },
          ]}
          rowActions={(row) => (
            <IconButton size="small" onClick={(e) => handleOpenMenu(e, row)}>
              <MoreVertIcon />
            </IconButton>
          )}
          emptyState={{
            icon: ScheduleIcon,
            title: 'No schedules yet',
            description:
              'Create a schedule to automatically generate reports on a recurring basis.',
            actionLabel: 'Create Schedule',
            onAction: handleAddSchedule,
          }}
        />

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleCloseMenu}
        >
          <MenuItem onClick={handleEditSchedule}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleToggleEnabled}>
            <ListItemIcon>
              {menuScheduleActive ? (
                <PauseIcon fontSize="small" />
              ) : (
                <PlayArrowIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText>
              {menuScheduleActive ? 'Pause' : 'Enable'}
            </ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>

        <ScheduleDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          schedule={editingSchedule}
          templates={templates}
          connections={savedConnections}
          defaultTemplateId={defaultTemplateId}
          defaultConnectionId={defaultConnectionId}
          onSave={handleSaveSchedule}
          onError={(msg) => toast.show(msg, 'error')}
        />

        <ConfirmModal
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Schedule"
          message={`Are you sure you want to delete "${deletingSchedule?.name || deletingSchedule?.id}"? This action cannot be undone.`}
          confirmLabel="Delete"
          severity="error"
        />
      </Container>
    </Box>
  )
}
