/**
 * Document Editor Page Container
 * Rich text editor with collaboration, comments, and AI writing features.
 */
import React, { useState, useEffect, useCallback } from 'react'
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
  useTheme,
  alpha,
  styled,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Description as DocIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  Comment as CommentIcon,
  People as CollabIcon,
  Download as DownloadIcon,
  MoreVert as MoreIcon,
  AutoAwesome as AIIcon,
  Spellcheck as GrammarIcon,
  Summarize as SummarizeIcon,
  Edit as RewriteIcon,
  Translate as TranslateIcon,
  PictureAsPdf as PdfIcon,
  Merge as MergeIcon,
  WaterDrop as WatermarkIcon,
} from '@mui/icons-material'
import useDocumentStore from '@/stores/documentStore'
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
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
}))

const EditorArea = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
}))

const EditorPane = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: theme.spacing(4),
  backgroundColor: theme.palette.background.default,
}))

const Sidebar = styled(Box)(({ theme }) => ({
  width: 300,
  flexShrink: 0,
  borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  display: 'flex',
  flexDirection: 'column',
}))

const SidebarHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
}))

const DocumentCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 800,
  margin: '0 auto',
  minHeight: 600,
  backgroundColor: theme.palette.background.paper,
  boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`,
}))

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
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

export default function DocumentEditorPage() {
  const theme = useTheme()
  const toast = useToast()
  const { execute } = useInteraction()
  const {
    documents,
    currentDocument,
    versions,
    comments,
    loading,
    saving,
    error,
    fetchDocuments,
    createDocument,
    getDocument,
    updateDocument,
    deleteDocument,
    fetchVersions,
    fetchComments,
    addComment,
    checkGrammar,
    summarize,
    rewrite,
    translate,
    reset,
  } = useDocumentStore()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const [documentContent, setDocumentContent] = useState('')
  const [aiMenuAnchor, setAiMenuAnchor] = useState(null)
  const [selectedText, setSelectedText] = useState('')
  const [showVersions, setShowVersions] = useState(false)
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    fetchDocuments()
    return () => reset()
  }, [fetchDocuments, reset])

  useEffect(() => {
    if (currentDocument) {
      setDocumentContent(
        currentDocument.content?.content
          ?.map((block) => block.content?.[0]?.text || '')
          .join('\n') || ''
      )
    }
  }, [currentDocument])

  const executeUI = useCallback((label, action, intent = {}) => {
    return execute({
      type: InteractionType.EXECUTE,
      label,
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'documents', ...intent },
      action,
    })
  }, [execute])

  const closeAiMenu = useCallback(() => {
    setAiMenuAnchor(null)
  }, [])

  const handleOpenCreateDialog = useCallback(() => {
    return executeUI('Open create document', () => setCreateDialogOpen(true))
  }, [executeUI])

  const handleCloseCreateDialog = useCallback(() => {
    return executeUI('Close create document', () => setCreateDialogOpen(false))
  }, [executeUI])

  const handleCreateDocument = useCallback(() => {
    if (!newDocName) return undefined
    return execute({
      type: InteractionType.CREATE,
      label: 'Create document',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'documents', name: newDocName },
      action: async () => {
        const doc = await createDocument({
          name: newDocName,
          content: { type: 'doc', content: [] },
        })
        if (doc) {
          setCreateDialogOpen(false)
          setNewDocName('')
          toast.show('Document created', 'success')
        }
        return doc
      },
    })
  }, [createDocument, execute, newDocName, toast])

  const handleSave = useCallback(() => {
    if (!currentDocument) return undefined
    return execute({
      type: InteractionType.UPDATE,
      label: 'Save document',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'documents', documentId: currentDocument.id },
      action: async () => {
        const result = await updateDocument(currentDocument.id, {
          content: {
            type: 'doc',
            content: documentContent.split('\n').map((text) => ({
              type: 'paragraph',
              content: text ? [{ type: 'text', text }] : [],
            })),
          },
        })
        if (result) {
          toast.show('Document saved', 'success')
        }
        return result
      },
    })
  }, [currentDocument, documentContent, execute, toast, updateDocument])

  const handleAIAction = useCallback((action) => {
    closeAiMenu()
    const text = selectedText || documentContent
    if (!text || !currentDocument) return undefined

    const labelMap = {
      grammar: 'Check grammar',
      summarize: 'Summarize document',
      rewrite: 'Rewrite text',
      translate: 'Translate text',
    }

    return execute({
      type: InteractionType.ANALYZE,
      label: labelMap[action] || 'Run AI action',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      blocksNavigation: true,
      intent: { source: 'documents', action, documentId: currentDocument.id },
      action: async () => {
        let result
        switch (action) {
          case 'grammar':
            result = await checkGrammar(currentDocument.id, text)
            if (result) toast.show('Grammar check complete', 'success')
            break
          case 'summarize':
            result = await summarize(currentDocument.id, text)
            if (result) toast.show('Summary generated', 'success')
            break
          case 'rewrite':
            result = await rewrite(currentDocument.id, text)
            if (result) toast.show('Text rewritten', 'success')
            break
          case 'translate':
            result = await translate(currentDocument.id, text, 'Spanish')
            if (result) toast.show('Translation complete', 'success')
            break
        }
        return result
      },
    })
  }, [checkGrammar, closeAiMenu, currentDocument, documentContent, execute, rewrite, selectedText, summarize, toast, translate])

  const handleToggleVersions = useCallback(() => {
    if (!currentDocument) return undefined
    return executeUI('Toggle version history', () => {
      const next = !showVersions
      setShowVersions(next)
      setShowComments(false)
      if (next) fetchVersions(currentDocument.id)
    }, { documentId: currentDocument.id, open: !showVersions })
  }, [currentDocument, executeUI, fetchVersions, showVersions])

  const handleToggleComments = useCallback(() => {
    if (!currentDocument) return undefined
    return executeUI('Toggle comments', () => {
      const next = !showComments
      setShowComments(next)
      setShowVersions(false)
      if (next) fetchComments(currentDocument.id)
    }, { documentId: currentDocument.id, open: !showComments })
  }, [currentDocument, executeUI, fetchComments, showComments])

  const handleOpenAiMenu = useCallback((event) => {
    const anchor = event.currentTarget
    return executeUI('Open AI tools', () => setAiMenuAnchor(anchor))
  }, [executeUI])

  const handleCloseAiMenu = useCallback(() => {
    return executeUI('Close AI tools', () => setAiMenuAnchor(null))
  }, [executeUI])

  const handleSelectDocument = useCallback((docId) => {
    return execute({
      type: InteractionType.EXECUTE,
      label: 'Open document',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      suppressErrorToast: true,
      intent: { source: 'documents', documentId: docId },
      action: async () => {
        await getDocument(docId)
      },
    })
  }, [execute, getDocument])

  const handleDismissError = useCallback(() => {
    return executeUI('Dismiss document error', () => reset())
  }, [executeUI, reset])

  return (
    <PageContainer>
      {/* Toolbar */}
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DocIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {currentDocument?.name || 'Documents'}
          </Typography>
          {currentDocument && (
            <Chip
              size="small"
              label={`v${currentDocument.version}`}
              sx={{ borderRadius: 1 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {currentDocument ? (
            <>
              <ActionButton
                variant="outlined"
                size="small"
                startIcon={<HistoryIcon />}
                onClick={handleToggleVersions}
              >
                History
              </ActionButton>
              <ActionButton
                variant="outlined"
                size="small"
                startIcon={<CommentIcon />}
                onClick={handleToggleComments}
              >
                Comments
              </ActionButton>
              <ActionButton
                variant="outlined"
                size="small"
                startIcon={<AIIcon />}
                onClick={handleOpenAiMenu}
              >
                AI Tools
              </ActionButton>
              <ActionButton
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </ActionButton>
            </>
          ) : (
            <ActionButton
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              New Document
            </ActionButton>
          )}
        </Box>
      </Toolbar>

      {/* Editor Area */}
      <EditorArea>
        {currentDocument ? (
          <>
            <EditorPane>
              <DocumentCard elevation={0}>
                <TextField
                  fullWidth
                  multiline
                  minRows={20}
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  onSelect={(e) => {
                    const selection = window.getSelection()?.toString()
                    if (selection) setSelectedText(selection)
                  }}
                  placeholder="Start writing your document..."
                  variant="standard"
                  InputProps={{
                    disableUnderline: true,
                    sx: {
                      fontSize: 16,
                      lineHeight: 1.8,
                    },
                  }}
                />
              </DocumentCard>
            </EditorPane>

            {/* Sidebar for versions/comments */}
            {(showVersions || showComments) && (
              <Sidebar>
                <SidebarHeader>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {showVersions ? 'Version History' : 'Comments'}
                  </Typography>
                </SidebarHeader>
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {showVersions && versions.map((v) => (
                    <Paper
                      key={v.id}
                      sx={{
                        p: 2,
                        mb: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                      }}
                      variant="outlined"
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Version {v.version}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(v.created_at).toLocaleString()}
                      </Typography>
                    </Paper>
                  ))}
                  {showComments && comments.map((c) => (
                    <Paper
                      key={c.id}
                      sx={{ p: 2, mb: 1 }}
                      variant="outlined"
                    >
                      <Typography variant="body2">{c.text}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.author_name || 'Anonymous'}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </Sidebar>
            )}
          </>
        ) : (
          <EmptyState>
            <DocIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              No Document Selected
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Create a new document or select one from your library.
            </Typography>
            <ActionButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Create Document
            </ActionButton>

            {documents.length > 0 && (
              <Box sx={{ mt: 4, width: '100%', maxWidth: 400 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Recent Documents
                </Typography>
                {documents.slice(0, 5).map((doc) => (
                  <Paper
                    key={doc.id}
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
                    onClick={() => handleSelectDocument(doc.id)}
                  >
                    <DocIcon color="primary" />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {doc.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </EmptyState>
        )}
      </EditorArea>

      {/* AI Tools Menu */}
      <Menu
        anchorEl={aiMenuAnchor}
        open={Boolean(aiMenuAnchor)}
        onClose={handleCloseAiMenu}
      >
        <MenuItem onClick={() => handleAIAction('grammar')}>
          <ListItemIcon><GrammarIcon /></ListItemIcon>
          <ListItemText>Check Grammar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAIAction('summarize')}>
          <ListItemIcon><SummarizeIcon /></ListItemIcon>
          <ListItemText>Summarize</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAIAction('rewrite')}>
          <ListItemIcon><RewriteIcon /></ListItemIcon>
          <ListItemText>Rewrite</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAIAction('translate')}>
          <ListItemIcon><TranslateIcon /></ListItemIcon>
          <ListItemText>Translate</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Document Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create New Document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Document Name"
            value={newDocName}
            onChange={(e) => setNewDocName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateDocument}
            disabled={!newDocName || loading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Alert */}
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
