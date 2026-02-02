/**
 * Design Page Container
 * Brand kit and theme management interface.
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Divider,
  List,
  MenuItem,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  useTheme,
  alpha,
  styled,
} from '@mui/material'
import { figmaGrey } from '@/app/theme'
import {
  Palette as PaletteIcon,
  Brush as BrushIcon,
  FormatColorFill as ColorIcon,
  TextFields as FontIcon,
  Image as ImageIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Star as DefaultIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material'
import useDesignStore from '@/stores/designStore'
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
  padding: theme.spacing(3),
  overflow: 'auto',
}))

const BrandKitCard = styled(Card)(({ theme, isDefault }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: isDefault ? `2px solid ${theme.palette.mode === 'dark' ? figmaGrey[1000] : figmaGrey[1100]}` : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 24px ${alpha(theme.palette.text.primary, 0.15)}`,
  },
}))

const ColorSwatch = styled(Box)(({ color }) => ({
  width: 40,
  height: 40,
  borderRadius: 8,
  backgroundColor: color,
  border: '2px solid rgba(0,0,0,0.1)',
  cursor: 'pointer',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'scale(1.1)',
  },
}))

const ThemeCard = styled(Paper)(({ theme, isActive }) => ({
  padding: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: isActive ? `2px solid ${theme.palette.mode === 'dark' ? figmaGrey[1000] : figmaGrey[1100]}` : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.05) : figmaGrey[200],
  },
}))

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
}))

// =============================================================================
// COLOR SCHEMES
// =============================================================================

const COLOR_SCHEMES = [
  { name: 'Complementary', value: 'complementary' },
  { name: 'Analogous', value: 'analogous' },
  { name: 'Triadic', value: 'triadic' },
  { name: 'Split-Complementary', value: 'split-complementary' },
  { name: 'Tetradic', value: 'tetradic' },
]

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DesignPageContainer() {
  const theme = useTheme()
  const toast = useToast()
  const { execute } = useInteraction()
  const {
    brandKits,
    themes,
    currentBrandKit,
    currentTheme,
    defaultBrandKit,
    activeTheme,
    fonts,
    loading,
    error,
    fetchBrandKits,
    fetchThemes,
    fetchFonts,
    createBrandKit,
    updateBrandKit,
    deleteBrandKit,
    setDefaultBrandKit,
    createTheme,
    updateTheme,
    deleteTheme,
    setActiveTheme,
    generateColorPalette,
    uploadLogo,
    reset,
  } = useDesignStore()

  const [activeTab, setActiveTab] = useState(0) // 0: Brand Kits, 1: Themes, 2: Colors
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState('brandKit') // 'brandKit' or 'theme'
  const [formData, setFormData] = useState({
    name: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#6366f1',
    fontFamily: 'Inter',
  })
  const [baseColor, setBaseColor] = useState('#3b82f6')
  const [colorScheme, setColorScheme] = useState('complementary')
  const [generatedPalette, setGeneratedPalette] = useState(null)

  useEffect(() => {
    fetchBrandKits()
    fetchThemes()
    fetchFonts()
    return () => reset()
  }, [fetchBrandKits, fetchFonts, fetchThemes, reset])

  const handleCreateBrandKit = useCallback(async () => {
    if (!formData.name.trim()) return

    return execute({
      type: InteractionType.CREATE,
      label: 'Create brand kit',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'design', name: formData.name },
      action: async () => {
        await createBrandKit({
          name: formData.name,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          font_family: formData.fontFamily,
        })
        toast.show('Brand kit created', 'success')
        setCreateDialogOpen(false)
        setFormData({ name: '', primaryColor: '#3b82f6', secondaryColor: '#6366f1', fontFamily: 'Inter' })
      },
    })
  }, [createBrandKit, execute, formData, toast])

  const handleCreateTheme = useCallback(async () => {
    if (!formData.name.trim()) return

    return execute({
      type: InteractionType.CREATE,
      label: 'Create theme',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'design', name: formData.name },
      action: async () => {
        await createTheme({
          name: formData.name,
          colors: {
            primary: formData.primaryColor,
            secondary: formData.secondaryColor,
          },
          typography: {
            fontFamily: formData.fontFamily,
          },
        })
        toast.show('Theme created', 'success')
        setCreateDialogOpen(false)
        setFormData({ name: '', primaryColor: '#3b82f6', secondaryColor: '#6366f1', fontFamily: 'Inter' })
      },
    })
  }, [createTheme, execute, formData, toast])

  const handleSetDefault = useCallback(async (brandKitId) => {
    return execute({
      type: InteractionType.UPDATE,
      label: 'Set default brand kit',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      intent: { source: 'design', brandKitId },
      action: async () => {
        await setDefaultBrandKit(brandKitId)
        toast.show('Default brand kit updated', 'success')
      },
    })
  }, [execute, setDefaultBrandKit, toast])

  const handleSetActiveTheme = useCallback(async (themeId) => {
    return execute({
      type: InteractionType.UPDATE,
      label: 'Set active theme',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      intent: { source: 'design', themeId },
      action: async () => {
        await setActiveTheme(themeId)
        toast.show('Active theme updated', 'success')
      },
    })
  }, [execute, setActiveTheme, toast])

  const handleDeleteBrandKit = useCallback(async (brandKitId) => {
    return execute({
      type: InteractionType.DELETE,
      label: 'Delete brand kit',
      reversibility: Reversibility.SYSTEM_MANAGED,
      intent: { source: 'design', brandKitId },
      action: async () => {
        await deleteBrandKit(brandKitId)
        toast.show('Brand kit deleted', 'success')
      },
    })
  }, [deleteBrandKit, execute, toast])

  const handleGeneratePalette = useCallback(async () => {
    return execute({
      type: InteractionType.GENERATE,
      label: 'Generate color palette',
      reversibility: Reversibility.FULLY_REVERSIBLE,
      suppressSuccessToast: true,
      intent: { source: 'design', baseColor, colorScheme, action: 'generate_palette' },
      action: async () => {
        const palette = await generateColorPalette(baseColor, colorScheme)
        if (palette) {
          setGeneratedPalette(palette)
          toast.show('Palette generated', 'success')
        }
        return palette
      },
    })
  }, [baseColor, colorScheme, generateColorPalette, toast, execute])

  const handleCopyColor = (color) => {
    navigator.clipboard.writeText(color)
    toast.show(`Copied ${color}`, 'success')
  }

  const openCreateDialog = (mode) => {
    setDialogMode(mode)
    setCreateDialogOpen(true)
  }

  return (
    <PageContainer>
      <Header>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PaletteIcon sx={{ color: 'text.secondary', fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Design System
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage brand kits, themes, and color palettes
              </Typography>
            </Box>
          </Box>
          <ActionButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openCreateDialog(activeTab === 0 ? 'brandKit' : 'theme')}
          >
            {activeTab === 0 ? 'New Brand Kit' : 'New Theme'}
          </ActionButton>
        </Box>
      </Header>

      <ContentArea>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
          <Tab icon={<BrushIcon />} label="Brand Kits" iconPosition="start" />
          <Tab icon={<ColorIcon />} label="Themes" iconPosition="start" />
          <Tab icon={<PaletteIcon />} label="Color Generator" iconPosition="start" />
        </Tabs>

        {/* Brand Kits Tab */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {brandKits.map((kit) => (
              <Grid item xs={12} sm={6} md={4} key={kit.id}>
                <BrandKitCard isDefault={kit.is_default}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {kit.name}
                      </Typography>
                      {kit.is_default && (
                        <Chip size="small" label="Default" icon={<DefaultIcon />} sx={{ bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.text.primary, 0.1) : figmaGrey[400], color: 'text.secondary' }} />
                      )}
                    </Box>

                    {/* Color Preview */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <ColorSwatch color={kit.primary_color} onClick={() => handleCopyColor(kit.primary_color)} data-testid="brand-kit-primary-color" />
                      <ColorSwatch color={kit.secondary_color} onClick={() => handleCopyColor(kit.secondary_color)} data-testid="brand-kit-secondary-color" />
                      {kit.colors?.map((c, i) => (
                        <ColorSwatch key={i} color={c.value} onClick={() => handleCopyColor(c.value)} data-testid={`brand-kit-color-${i}`} />
                      ))}
                    </Box>

                    {/* Font */}
                    <Typography variant="body2" color="text.secondary">
                      <FontIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                      {kit.font_family || 'System Default'}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    {!kit.is_default && (
                      <Button size="small" onClick={() => handleSetDefault(kit.id)} data-testid="set-default-brand-kit">
                        Set Default
                      </Button>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <IconButton size="small" onClick={() => handleDeleteBrandKit(kit.id)} data-testid="delete-brand-kit" aria-label="Delete brand kit">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </BrandKitCard>
              </Grid>
            ))}

            {brandKits.length === 0 && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <BrushIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No brand kits yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create a brand kit to maintain consistent branding
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        )}

        {/* Themes Tab */}
        {activeTab === 1 && (
          <Grid container spacing={2}>
            {themes.map((t) => (
              <Grid item xs={12} sm={6} md={4} key={t.id}>
                <ThemeCard isActive={t.is_active}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {t.name}
                    </Typography>
                    {t.is_active && <CheckIcon sx={{ color: 'text.secondary' }} />}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <ColorSwatch color={t.colors?.primary || '#3b82f6'} data-testid="theme-primary-color" />
                    <ColorSwatch color={t.colors?.secondary || '#6366f1'} data-testid="theme-secondary-color" />
                    <ColorSwatch color={t.colors?.background || '#ffffff'} data-testid="theme-background-color" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    {!t.is_active && (
                      <Button size="small" onClick={() => handleSetActiveTheme(t.id)} data-testid="activate-theme">
                        Activate
                      </Button>
                    )}
                  </Box>
                </ThemeCard>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Color Generator Tab */}
        {activeTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Generate Color Palette
                </Typography>
                <TextField
                  fullWidth
                  label="Base Color"
                  type="color"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <ColorSwatch color={baseColor} sx={{ mr: 1, width: 24, height: 24 }} />
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  select
                  label="Color Scheme"
                  value={colorScheme}
                  onChange={(e) => setColorScheme(e.target.value)}
                  sx={{ mb: 3 }}
                  SelectProps={{ native: false }}
                >
                  {COLOR_SCHEMES.map((scheme) => (
                    <MenuItem key={scheme.value} value={scheme.value}>
                      {scheme.name}
                    </MenuItem>
                  ))}
                </TextField>
                <ActionButton
                  variant="contained"
                  fullWidth
                  onClick={handleGeneratePalette}
                  disabled={loading}
                >
                  Generate Palette
                </ActionButton>
              </Paper>
            </Grid>
            <Grid item xs={12} md={8}>
              {generatedPalette ? (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Generated Palette
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {generatedPalette.colors?.map((color, index) => (
                      <Box key={index} sx={{ textAlign: 'center' }}>
                        <ColorSwatch
                          color={color}
                          sx={{ width: 60, height: 60, mb: 1 }}
                          onClick={() => handleCopyColor(color)}
                          data-testid={`generated-color-${index}`}
                        />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {color}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              ) : (
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">
                    Generated palette will appear here
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        )}
      </ContentArea>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'brandKit' ? 'Create Brand Kit' : 'Create Theme'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="color"
                label="Primary Color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="color"
                label="Secondary Color"
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
              />
            </Grid>
          </Grid>
          <TextField
            fullWidth
            label="Font Family"
            value={formData.fontFamily}
            onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={dialogMode === 'brandKit' ? handleCreateBrandKit : handleCreateTheme}
          >
            Create
          </Button>
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
