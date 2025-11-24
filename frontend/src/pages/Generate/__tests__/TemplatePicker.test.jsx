import { describe, expect, beforeEach, afterEach, vi, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'

import TemplatePicker from '../../../features/generate/components/TemplatePicker.jsx'
import theme from '../../../theme.js'
import { ToastProvider } from '../../../components/ToastProvider.jsx'
import { useAppStore } from '../../../store/useAppStore.js'

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined, isLoading: false, isFetching: false, isError: false, error: null }),
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
}))

vi.mock('../../../api/client', () => ({
  isMock: false,
  withBase: (url) => url,
  deleteTemplate: vi.fn(),
  importTemplateZip: vi.fn(),
  fetchTemplateKeyOptions: vi.fn(async () => ({ keys: {} })),
  listApprovedTemplates: vi.fn(async () => []),
  getTemplateCatalog: vi.fn(async () => []),
  templateExportZipUrl: (id) => `/templates/${id}/export.zip`,
  recommendTemplates: vi.fn(async () => []),
  discoverReports: vi.fn(),
  runReport: vi.fn(),
  normalizeRunArtifacts: vi.fn(),
}))

const baseTemplate = {
  status: 'approved',
  artifacts: {},
  generator: {},
  mappingKeys: [],
  tags: [],
}

const renderPicker = () =>
  render(
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <TemplatePicker
          selected={[]}
          onToggle={() => {}}
          outputFormats={{}}
          setOutputFormats={() => {}}
          tagFilter={[]}
          setTagFilter={() => {}}
          onEditTemplate={() => {}}
        />
      </ToastProvider>
    </ThemeProvider>,
  )

describe('TemplatePicker last-edit chips', () => {
  const iso = '2025-11-18T14:32:00Z'

  beforeEach(() => {
    useAppStore.setState((state) => ({
      ...state,
      templates: [
        {
          ...baseTemplate,
          id: 'tpl-ai',
          name: 'AI Template',
          source: 'company',
          generator: { summary: { lastEditType: 'ai', lastEditAt: iso } },
        },
        {
          ...baseTemplate,
          id: 'tpl-manual',
          name: 'Manual Template',
          source: 'company',
          generator: { summary: { lastEditType: 'manual', lastEditAt: iso } },
        },
        {
          ...baseTemplate,
          id: 'tpl-undo',
          name: 'Undo Template',
          source: 'company',
          generator: { summary: { lastEditType: 'undo', lastEditAt: iso } },
        },
        {
          ...baseTemplate,
          id: 'tpl-fresh',
          name: 'Fresh Template',
          source: 'company',
          generator: {},
        },
        {
          ...baseTemplate,
          id: 'tpl-starter',
          name: 'Starter Template',
          source: 'starter',
          generator: { summary: { lastEditType: 'ai', lastEditAt: iso } },
        },
      ],
      templateCatalog: [],
    }))
  })

  afterEach(() => {
    useAppStore.setState((state) => ({ ...state, templates: [], templateCatalog: [] }))
  })

  it('renders last-edit chips for company templates only', () => {
    renderPicker()

    const expectChip = (label) =>
      screen.getByText((content) => content.includes(label) && content.includes('2025-11-18'))
    expect(expectChip('AI edit')).toBeInTheDocument()
    expect(expectChip('Manual edit')).toBeInTheDocument()
    expect(expectChip('Undo')).toBeInTheDocument()
    expect(screen.getByText('Not edited yet')).toBeInTheDocument()

    const starterHeading = screen.getByText('Starter Template')
    const starterCard = starterHeading.closest('.MuiCard-root')
    expect(starterCard).not.toBeNull()
    if (starterCard) {
      expect(within(starterCard).queryByText(/edit/i)).toBeNull()
    }
  })
})
