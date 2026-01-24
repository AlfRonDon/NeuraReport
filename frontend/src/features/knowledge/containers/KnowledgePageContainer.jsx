/**
 * Knowledge Library Page Container
 * Document library and knowledge management interface.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Divider,
  Tabs,
  Tab,
  useTheme,
  alpha,
  styled,
} from '@mui/material'
import {
  Search as SearchIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Description as DocIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  LocalOffer as TagIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AutoAwesome as AIIcon,
  AccountTree as GraphIcon,
  QuestionAnswer as FaqIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material'
import useKnowledgeStore from '@/stores/knowledgeStore'
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

const Header = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
}))

const ContentArea = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
}))

const Sidebar = styled(Box)(({ theme }) => ({
  width: 260,
  borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  display: 'flex',
  flexDirection: 'column',
}))

const MainPanel = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(3),
  overflow: 'auto',
}))

const DocumentCard = styled(Card)(({ theme }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
}))

const CollectionItem = styled(ListItem)(({ theme, selected }) => ({
  borderRadius: 8,
  marginBottom: 4,
  backgroundColor: selected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
  },
}))

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
}))

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function KnowledgePageContainer() {
  const theme = useTheme()
  const toast = useToast()
  const { execute } = useInteraction()
  const {
    documents,
    collections,
    tags,
    currentDocument,
    currentCollection,
    searchResults,
    relatedDocuments,
    knowledgeGraph,
    faq,
    stats,
    totalDocuments,
    loading,
    searching,
    error,
    fetchDocuments,
    fetchCollections,
    fetchTags,
    createCollection,
    deleteDocument,
    toggleFavorite,
    searchDocuments,
    autoTag,
    findRelated,
    buildKnowledgeGraph,
    generateFaq,
    fetchStats,
    reset,
  } = useKnowledgeStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [view, setView] = useState('all') // 'all', 'favorites', 'recent'
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)

  useEffect(() => {
    fetchDocuments()
    fetchCollections()
    fetchTags()
    fetchStats()
    return () => reset()
  }, [fetchCollections, fetchDocuments, fetchStats, fetchTags, reset])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      fetchDocuments()
      return
    }

    return execute({
      type: InteractionType.EXECUTE,
      label: 'Search library',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      intent: { source: 'knowledge', query: searchQuery },
      action: () => searchDocuments(searchQuery),
    })
  }, [execute, fetchDocuments, searchDocuments, searchQuery])

  const handleSelectCollection = useCallback((collection) => {
    setSelectedCollection(collection)
    if (collection) {
      fetchDocuments({ collectionId: collection.id })
    } else {
      fetchDocuments()
    }
  }, [fetchDocuments])

  const handleToggleFavorite = useCallback(async (docId) => {
    return execute({
      type: InteractionType.UPDATE,
      label: 'Toggle favorite',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      intent: { source: 'knowledge', documentId: docId },
      action: () => toggleFavorite(docId),
    })
  }, [execute, toggleFavorite])

  const handleDeleteDocument = useCallback(async (docId) => {
    return execute({
      type: InteractionType.DELETE,
      label: 'Delete document',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'knowledge', documentId: docId },
      action: async () => {
        await deleteDocument(docId)
        toast.show('Document deleted', 'success')
      },
    })
  }, [deleteDocument, execute, toast])

  const handleAutoTag = useCallback(async (docId) => {
    return execute({
      type: InteractionType.UPDATE,
      label: 'Auto-tag document',
      reversibility: Reversibility.SYSTEM_MANAGED,
      blocksNavigation: true,
      intent: { source: 'knowledge', documentId: docId },
      action: async () => {
        await autoTag(docId)
        toast.show('Tags generated', 'success')
      },
    })
  }, [autoTag, execute, toast])

  const handleFindRelated = useCallback(async (docId) => {
    return execute({
      type: InteractionType.EXECUTE,
      label: 'Find related documents',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      intent: { source: 'knowledge', documentId: docId },
      action: () => findRelated(docId),
    })
  }, [execute, findRelated])

  const handleBuildGraph = useCallback(async () => {
    return execute({
      type: InteractionType.EXECUTE,
      label: 'Build knowledge graph',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      blocksNavigation: true,
      intent: { source: 'knowledge' },
      action: async () => {
        await buildKnowledgeGraph({ collectionId: selectedCollection?.id })
        toast.show('Knowledge graph built', 'success')
      },
    })
  }, [buildKnowledgeGraph, execute, selectedCollection?.id, toast])

  const handleGenerateFaq = useCallback(async () => {
    return execute({
      type: InteractionType.EXECUTE,
      label: 'Generate FAQ',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      blocksNavigation: true,
      intent: { source: 'knowledge' },
      action: async () => {
        await generateFaq({ collectionId: selectedCollection?.id })
        toast.show('FAQ generated', 'success')
      },
    })
  }, [execute, generateFaq, selectedCollection?.id, toast])

  const handleCreateCollection = useCallback(async () => {
    if (!newCollectionName.trim()) return

    return execute({
      type: InteractionType.CREATE,
      label: 'Create collection',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'knowledge', name: newCollectionName },
      action: async () => {
        await createCollection({ name: newCollectionName })
        toast.show('Collection created', 'success')
        setNewCollectionName('')
        setCreateCollectionOpen(false)
      },
    })
  }, [createCollection, execute, newCollectionName, toast])

  const handleMenuOpen = (event, doc) => {
    setMenuAnchor(event.currentTarget)
    setSelectedDoc(doc)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedDoc(null)
  }

  const displayedDocs = view === 'favorites'
    ? documents.filter((d) => d.is_favorite)
    : searchQuery && searchResults.length > 0
    ? searchResults
    : documents

  return (
    <PageContainer>
      <Header>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FolderOpenIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Knowledge Library
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats?.total_documents || 0} documents in {stats?.total_collections || 0} collections
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ActionButton
              startIcon={<GraphIcon />}
              onClick={handleBuildGraph}
              disabled={loading}
            >
              Knowledge Graph
            </ActionButton>
            <ActionButton
              startIcon={<FaqIcon />}
              onClick={handleGenerateFaq}
              disabled={loading}
            >
              Generate FAQ
            </ActionButton>
          </Box>
        </Box>
      </Header>

      <ContentArea>
        {/* Sidebar */}
        <Sidebar>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Quick Filters */}
          <List dense sx={{ px: 1 }}>
            <CollectionItem
              button
              selected={view === 'all' && !selectedCollection}
              onClick={() => {
                setView('all')
                setSelectedCollection(null)
                fetchDocuments()
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <DocIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="All Documents" />
            </CollectionItem>
            <CollectionItem
              button
              selected={view === 'favorites'}
              onClick={() => {
                setView('favorites')
                setSelectedCollection(null)
                fetchDocuments({ favoritesOnly: true })
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <StarIcon fontSize="small" color="warning" />
              </ListItemIcon>
              <ListItemText primary="Favorites" />
            </CollectionItem>
          </List>

          <Divider sx={{ my: 1 }} />

          {/* Collections */}
          <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              COLLECTIONS
            </Typography>
            <IconButton size="small" onClick={() => setCreateCollectionOpen(true)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
          <List dense sx={{ px: 1, flex: 1, overflow: 'auto' }}>
            {collections.map((collection) => (
              <CollectionItem
                key={collection.id}
                button
                selected={selectedCollection?.id === collection.id}
                onClick={() => handleSelectCollection(collection)}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <FolderIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={collection.name}
                  secondary={`${collection.document_count || 0} docs`}
                />
              </CollectionItem>
            ))}
          </List>

          {/* Tags */}
          <Box sx={{ p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              TAGS
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {tags.slice(0, 10).map((tag) => (
                <Chip
                  key={tag.id}
                  size="small"
                  label={tag.name}
                  sx={{ bgcolor: tag.color || undefined }}
                  onClick={() => fetchDocuments({ tags: [tag.name] })}
                />
              ))}
            </Box>
          </Box>
        </Sidebar>

        {/* Main Panel */}
        <MainPanel>
          <Grid container spacing={2}>
            {displayedDocs.map((doc) => (
              <Grid item xs={12} sm={6} md={4} key={doc.id}>
                <DocumentCard>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                          {doc.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {doc.file_type?.toUpperCase()} - {new Date(doc.updated_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleFavorite(doc.id)}
                      >
                        {doc.is_favorite ? <StarIcon color="warning" /> : <StarBorderIcon />}
                      </IconButton>
                    </Box>
                    {doc.tags?.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                        {doc.tags.slice(0, 3).map((tag) => (
                          <Chip key={tag} size="small" label={tag} variant="outlined" />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, doc)}>
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </DocumentCard>
              </Grid>
            ))}
          </Grid>

          {displayedDocs.length === 0 && !loading && (
            <Box
              sx={{
                height: '50vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderOpenIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No documents found
              </Typography>
            </Box>
          )}
        </MainPanel>
      </ContentArea>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleAutoTag(selectedDoc?.id); handleMenuClose(); }}>
          <ListItemIcon><AIIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Auto-tag</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleFindRelated(selectedDoc?.id); handleMenuClose(); }}>
          <ListItemIcon><SearchIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Find Related</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleDeleteDocument(selectedDoc?.id); handleMenuClose(); }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Collection Dialog */}
      <Dialog open={createCollectionOpen} onClose={() => setCreateCollectionOpen(false)}>
        <DialogTitle>Create Collection</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Collection Name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateCollectionOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCollection}>Create</Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}
    </PageContainer>
  )
}
