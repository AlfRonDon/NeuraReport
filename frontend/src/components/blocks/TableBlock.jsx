import { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  alpha,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'

export default function TableBlock({ data }) {
  const { title, headers = [], rows = [], totalRows, description } = data || {}
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  const displayRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const handleDownloadCSV = useCallback(() => {
    if (!headers.length || !rows.length) return

    // Escape CSV values that contain commas, quotes, or newlines
    const escapeCSV = (val) => {
      if (val == null) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Build CSV content
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n')

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title || 'table'}-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [title, headers, rows])

  if (!headers.length || !rows.length) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No table data available</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <TableChartOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          <Typography variant="subtitle2" fontWeight={600}>
            {title || 'Table'}
          </Typography>
          <Chip
            size="small"
            label={`${totalRows || rows.length} rows`}
            variant="outlined"
          />
        </Stack>
        <IconButton size="small" onClick={handleDownloadCSV} title="Download as CSV">
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Table */}
      <TableContainer sx={{ maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {headers.map((header, idx) => (
                <TableCell
                  key={idx}
                  sx={{
                    fontWeight: 600,
                    bgcolor: (theme) => alpha(theme.palette.action.hover, 0.5),
                    borderBottom: 2,
                    borderColor: 'divider',
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRows.map((row, rowIdx) => (
              <TableRow
                key={rowIdx}
                hover
                sx={{
                  '&:last-child td': { borderBottom: 0 },
                }}
              >
                {row.map((cell, cellIdx) => (
                  <TableCell key={cellIdx}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {cell}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={totalRows || rows.length}
        page={page}
        onPageChange={(e, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
        rowsPerPageOptions={[5, 10, 25]}
        sx={{ borderTop: 1, borderColor: 'divider' }}
      />

      {/* Description */}
      {description && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', px: 2, pb: 1 }}
        >
          {description}
        </Typography>
      )}
    </Box>
  )
}
