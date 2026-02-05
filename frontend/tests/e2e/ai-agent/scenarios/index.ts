/**
 * Test Scenarios for the AI Agent.
 *
 * Each scenario describes a high-level user goal that the AI agent
 * should accomplish autonomously. The agent sees the browser, decides
 * what to click/type, and verifies the results — just like a human
 * test engineer would.
 *
 * Scenarios are organized by category:
 * - connection: Database connection CRUD and testing
 * - template: Template creation, verification, mapping
 * - report: Report generation and download
 * - nl2sql: Natural language to SQL queries
 * - ai_agent: AI agent tasks (research, data analysis, etc.)
 * - schedule: Report scheduling
 * - workflow: Multi-step user workflows
 * - navigation: App navigation and UI integrity
 */
import type { TestScenario } from '../types'

// ═════════════════════════════════════════════════════════════════════
// CONNECTION SCENARIOS
// ═════════════════════════════════════════════════════════════════════

export const createConnectionScenario: TestScenario = {
  id: 'conn-001-create',
  name: 'Create a SQLite database connection',
  goal: `Navigate to the Connections page. Click "Add Data Source" to open the form.
Fill in a connection name like "AI Test Connection". Set the database type to SQLite.
Enter the database path as the sample.db file (look for a file path input).
Click "Test Connection" to verify it works. Then save/add the connection.
Verify the new connection appears in the connections list.`,
  hints: [
    'The "Add Data Source" button opens a drawer/dialog with the connection form',
    'For SQLite, the database path field accepts a filesystem path',
    'Use the test database at: ../backend/testdata/sample.db',
    'After saving, the connection should appear in the list',
  ],
  startUrl: '/connections',
  maxActions: 25,
  successCriteria: [
    {
      description: 'Connection form was submitted successfully',
      check: { check: 'toast_message', expected: 'success' },
    },
    {
      description: 'New connection appears in the list',
      check: { check: 'text_contains', expected: 'AI Test Connection' },
    },
  ],
  backendChecks: [
    {
      description: 'Connection exists in backend',
      endpoint: '/connections',
      method: 'GET',
      expectedStatus: 200,
      responseCheck: {
        path: 'connections',
        operator: 'exists',
        value: true,
      },
    },
  ],
  category: 'connection',
  tags: ['crud', 'happy-path'],
}

export const testConnectionScenario: TestScenario = {
  id: 'conn-002-test',
  name: 'Test an existing database connection',
  goal: `Navigate to Connections. Find an existing connection in the list.
Click on it or find the "Test Connection" action for it.
Verify that the connection test succeeds and shows a success message.`,
  startUrl: '/connections',
  maxActions: 15,
  successCriteria: [
    {
      description: 'Connection test returned success',
      check: { check: 'toast_message', expected: 'successful' },
    },
  ],
  category: 'connection',
  tags: ['validation'],
}

// ═════════════════════════════════════════════════════════════════════
// TEMPLATE SCENARIOS
// ═════════════════════════════════════════════════════════════════════

export const browseTemplatesScenario: TestScenario = {
  id: 'tmpl-001-browse',
  name: 'Browse and inspect templates',
  goal: `Navigate to the Templates page. Look at the list of available templates.
Click on a template to see its details. Check if the template has sections,
a schema/mapping configuration, and preview data. Navigate back to the list.`,
  startUrl: '/templates',
  maxActions: 20,
  successCriteria: [
    {
      description: 'Templates page loaded with template list',
      check: { check: 'url_contains', expected: '/templates' },
    },
  ],
  category: 'template',
  tags: ['read-only', 'exploration'],
}

// ═════════════════════════════════════════════════════════════════════
// REPORT SCENARIOS
// ═════════════════════════════════════════════════════════════════════

export const generateReportScenario: TestScenario = {
  id: 'report-001-generate',
  name: 'Generate a PDF report end-to-end',
  goal: `Navigate to the Reports page. Start a new report generation.
Select a template from the list. Select a database connection as data source.
If parameters are required, fill them in with reasonable test data.
Click "Generate" or "Run Report" to start generation.
Wait for the report job to complete. Verify the report was generated successfully.`,
  hints: [
    'The Reports page has a "Generate Report" or similar button',
    'You need to select both a template and a connection',
    'Report generation may take 30-60 seconds',
    'Look for a progress indicator or job status',
  ],
  startUrl: '/reports',
  maxActions: 35,
  successCriteria: [
    {
      description: 'Report generation was initiated',
      check: { check: 'api_response' },
    },
    {
      description: 'Success feedback shown to user',
      check: { check: 'toast_message', expected: 'report' },
    },
  ],
  backendChecks: [
    {
      description: 'Report run exists in history',
      endpoint: '/reports/runs',
      method: 'GET',
      expectedStatus: 200,
    },
  ],
  category: 'report',
  tags: ['e2e', 'backend-heavy'],
}

// ═════════════════════════════════════════════════════════════════════
// NL2SQL SCENARIOS — Testing the Backend Brain
// ═════════════════════════════════════════════════════════════════════

export const nl2sqlBasicQueryScenario: TestScenario = {
  id: 'nl2sql-001-basic',
  name: 'Natural language to SQL — basic query',
  goal: `Navigate to the Query Builder page. Select a database connection.
Type a natural language question like "Show me all tables" or "What are the total values?".
Click Generate/Submit to let the AI convert it to SQL.
Verify that a SQL query is generated and displayed.
Optionally execute the query and check that results are returned.`,
  hints: [
    'The Query Builder is at /query',
    'You need to select a connection first before querying',
    'The AI will generate SQL from your natural language question',
    'Check that the generated SQL makes sense for the question',
  ],
  startUrl: '/query',
  maxActions: 25,
  successCriteria: [
    {
      description: 'SQL query was generated from natural language',
      check: { check: 'text_contains', expected: 'SELECT' },
    },
  ],
  backendChecks: [
    {
      description: 'NL2SQL endpoint generates valid SQL',
      endpoint: '/nl2sql/generate',
      method: 'POST',
      body: {
        question: 'Show me all records',
        connection_id: '__DYNAMIC__', // filled at runtime
      },
      expectedStatus: 200,
      responseCheck: {
        path: 'sql',
        operator: 'exists',
        value: true,
      },
    },
  ],
  category: 'nl2sql',
  tags: ['ai-brain', 'llm-pipeline'],
}

export const nl2sqlComplexQueryScenario: TestScenario = {
  id: 'nl2sql-002-complex',
  name: 'Natural language to SQL — complex analytical query',
  goal: `Navigate to the Query Builder. Select a database connection.
Ask a complex analytical question like "What is the average and total for each category,
sorted by the highest total first?".
Verify the AI generates a SQL query with GROUP BY, aggregation, and ORDER BY.
Execute the query and verify results are displayed in a table.`,
  startUrl: '/query',
  maxActions: 30,
  successCriteria: [
    {
      description: 'Complex SQL with aggregation was generated',
      check: { check: 'text_contains', expected: 'GROUP BY' },
    },
    {
      description: 'Query results were displayed',
      check: { check: 'visible', target: { role: 'table' } },
    },
  ],
  category: 'nl2sql',
  tags: ['ai-brain', 'llm-pipeline', 'advanced'],
}

// ═════════════════════════════════════════════════════════════════════
// AI AGENT SCENARIOS — Testing Agent Pipelines
// ═════════════════════════════════════════════════════════════════════

export const researchAgentScenario: TestScenario = {
  id: 'agent-001-research',
  name: 'Run the Research Agent',
  goal: `Navigate to the Agents page. Find and select the Research Agent.
Enter a research topic like "Impact of AI on software testing".
Set depth to "comprehensive" if available.
Submit the research request.
Wait for the agent to complete (may take a minute).
Verify that a research report is generated with multiple sections.`,
  hints: [
    'The Agents page is at /agents',
    'Research agent accepts a topic and produces a multi-section report',
    'The agent runs asynchronously — watch for progress indicators',
  ],
  startUrl: '/agents',
  maxActions: 30,
  successCriteria: [
    {
      description: 'Research report was generated',
      check: { check: 'text_contains', expected: 'findings' },
    },
  ],
  backendChecks: [
    {
      description: 'Research agent endpoint responds',
      endpoint: '/agents/research',
      method: 'POST',
      body: {
        topic: 'Impact of AI on software testing',
        depth: 'quick',
        max_sections: 3,
      },
      expectedStatus: 200,
    },
  ],
  category: 'ai_agent',
  tags: ['ai-brain', 'llm-pipeline', 'agent'],
}

export const dataAnalystAgentScenario: TestScenario = {
  id: 'agent-002-data-analyst',
  name: 'Run the Data Analyst Agent',
  goal: `Navigate to the Agents page. Find and select the Data Analysis Agent.
Provide sample data and a question like "What trends do you see in this data?".
Submit the analysis request. Wait for completion.
Verify that the agent provides data insights and chart suggestions.`,
  startUrl: '/agents',
  maxActions: 30,
  successCriteria: [
    {
      description: 'Data analysis results were displayed',
      check: { check: 'text_contains', expected: 'analysis' },
    },
  ],
  category: 'ai_agent',
  tags: ['ai-brain', 'llm-pipeline', 'agent'],
}

// ═════════════════════════════════════════════════════════════════════
// SCHEDULE SCENARIOS
// ═════════════════════════════════════════════════════════════════════

export const createScheduleScenario: TestScenario = {
  id: 'sched-001-create',
  name: 'Create a report schedule',
  goal: `Navigate to the Schedules page. Click to create a new schedule.
Select a template and connection for the scheduled report.
Set a schedule (e.g., daily at 9am or weekly).
Save the schedule. Verify it appears in the schedule list.`,
  startUrl: '/schedules',
  maxActions: 30,
  successCriteria: [
    {
      description: 'Schedule was created and appears in list',
      check: { check: 'toast_message', expected: 'schedule' },
    },
  ],
  category: 'schedule',
  tags: ['crud', 'e2e'],
}

// ═════════════════════════════════════════════════════════════════════
// NAVIGATION & UI INTEGRITY SCENARIOS
// ═════════════════════════════════════════════════════════════════════

export const fullNavigationScenario: TestScenario = {
  id: 'nav-001-full',
  name: 'Navigate all major sections',
  goal: `Starting from the Dashboard, navigate through ALL major sections of the app:
Dashboard → Connections → Templates → Reports → Schedules → Query Builder → Agents → Settings.
For each page, verify it loads correctly (has a heading or expected content).
Take a screenshot of each page. Report any pages that fail to load.`,
  startUrl: '/',
  maxActions: 40,
  successCriteria: [
    {
      description: 'All major pages loaded successfully',
      check: { check: 'text_contains', expected: 'Dashboard' },
    },
  ],
  category: 'navigation',
  tags: ['smoke-test'],
}

// ═════════════════════════════════════════════════════════════════════
// BACKEND BRAIN VERIFICATION — Direct LLM Pipeline Testing
// ═════════════════════════════════════════════════════════════════════

export const backendBrainTemplateVerifyScenario: TestScenario = {
  id: 'brain-001-template-verify',
  name: 'Backend Brain: Template Verification Pipeline',
  goal: `This scenario tests the backend LLM pipeline directly via API calls.
1. Call the template verification endpoint with a test PDF
2. Verify that the LLM extracts the correct HTML structure
3. Verify that the schema is properly inferred
4. Check that placeholders are correctly identified
This tests the core AI brain of the app — the template processing pipeline.`,
  startUrl: '/templates',
  maxActions: 15,
  successCriteria: [
    {
      description: 'Template verification API returns valid HTML',
      check: { check: 'api_response' },
    },
  ],
  backendChecks: [
    {
      description: 'Template list endpoint works',
      endpoint: '/templates',
      method: 'GET',
      expectedStatus: 200,
    },
    {
      description: 'Template catalog endpoint works',
      endpoint: '/templates/catalog',
      method: 'GET',
      expectedStatus: 200,
    },
  ],
  category: 'template',
  tags: ['ai-brain', 'llm-pipeline', 'backend-only'],
}

export const backendBrainChartSuggestionsScenario: TestScenario = {
  id: 'brain-002-chart-suggest',
  name: 'Backend Brain: Chart Suggestion Pipeline',
  goal: `Test the AI chart suggestion pipeline by providing sample data
and verifying the LLM suggests appropriate chart types.
Use the charts API endpoint with sample tabular data.
Verify the response includes chart type, configuration, and reasoning.`,
  startUrl: '/templates',
  maxActions: 10,
  successCriteria: [
    {
      description: 'Chart suggestions API returns recommendations',
      check: { check: 'api_response' },
    },
  ],
  backendChecks: [
    {
      description: 'Chart suggestions endpoint returns valid suggestions',
      endpoint: '/charts/suggest',
      method: 'POST',
      body: {
        data: [
          { category: 'Sales', value: 100 },
          { category: 'Marketing', value: 75 },
          { category: 'Engineering', value: 120 },
        ],
        context: 'Department budget comparison',
      },
      expectedStatus: 200,
    },
  ],
  category: 'template',
  tags: ['ai-brain', 'llm-pipeline', 'backend-only'],
}

// ═════════════════════════════════════════════════════════════════════
// AGENTS V2 — Advanced Agent Pipelines
// ═════════════════════════════════════════════════════════════════════

export const agentsV2EmailDraftScenario: TestScenario = {
  id: 'agent-003-email-draft',
  name: 'Run the Email Draft Agent (v2)',
  goal: `Navigate to the Agents page. Find and select the Email Draft agent.
Enter a prompt like "Write a follow-up email to a client about their quarterly report".
Set the tone to "professional" if available.
Submit the request and verify an email draft is generated.`,
  startUrl: '/agents',
  maxActions: 25,
  successCriteria: [
    {
      description: 'Email draft was generated',
      check: { check: 'text_contains', expected: 'email' },
    },
  ],
  backendChecks: [
    {
      description: 'Agents v2 email-draft endpoint responds',
      endpoint: '/agents/v2/email-draft',
      method: 'POST',
      body: {
        prompt: 'Write a follow-up email about a quarterly report',
        tone: 'professional',
      },
      expectedStatus: 200,
    },
    {
      description: 'Agents v2 types endpoint lists available agents',
      endpoint: '/agents/v2/types',
      method: 'GET',
      expectedStatus: 200,
    },
  ],
  category: 'ai_agent',
  tags: ['ai-brain', 'llm-pipeline', 'agent', 'agents-v2'],
}

export const agentsV2ContentRepurposeScenario: TestScenario = {
  id: 'agent-004-content-repurpose',
  name: 'Run the Content Repurpose Agent (v2)',
  goal: `Navigate to the Agents page. Find the Content Repurpose agent.
Provide some sample content and ask to repurpose it for a different format.
Submit and verify the repurposed content is generated.`,
  startUrl: '/agents',
  maxActions: 25,
  successCriteria: [
    {
      description: 'Repurposed content was generated',
      check: { check: 'text_contains', expected: 'content' },
    },
  ],
  backendChecks: [
    {
      description: 'Agents v2 content-repurpose endpoint responds',
      endpoint: '/agents/v2/content-repurpose',
      method: 'POST',
      body: {
        content: 'AI is transforming software testing with autonomous agents.',
        target_format: 'social_media',
      },
      expectedStatus: 200,
    },
    {
      description: 'Agents v2 repurpose formats endpoint lists formats',
      endpoint: '/agents/v2/formats/repurpose',
      method: 'GET',
      expectedStatus: 200,
    },
  ],
  category: 'ai_agent',
  tags: ['ai-brain', 'llm-pipeline', 'agent', 'agents-v2'],
}

export const agentsV2ProofreadingScenario: TestScenario = {
  id: 'agent-005-proofreading',
  name: 'Run the Proofreading Agent (v2)',
  goal: `Navigate to the Agents page. Find the Proofreading agent.
Provide text with intentional errors for proofreading.
Submit and verify corrections are suggested.`,
  startUrl: '/agents',
  maxActions: 25,
  successCriteria: [
    {
      description: 'Proofreading results were generated',
      check: { check: 'text_contains', expected: 'proofread' },
    },
  ],
  backendChecks: [
    {
      description: 'Agents v2 proofreading endpoint responds',
      endpoint: '/agents/v2/proofreading',
      method: 'POST',
      body: {
        content: 'Their are many erors in this sentance that needs too be fixed.',
      },
      expectedStatus: 200,
    },
    {
      description: 'Agents v2 health check passes',
      endpoint: '/agents/v2/health',
      method: 'GET',
      expectedStatus: 200,
    },
    {
      description: 'Agents v2 stats endpoint responds',
      endpoint: '/agents/v2/stats',
      method: 'GET',
      expectedStatus: 200,
    },
  ],
  category: 'ai_agent',
  tags: ['ai-brain', 'llm-pipeline', 'agent', 'agents-v2'],
}

// ═════════════════════════════════════════════════════════════════════
// DOCUMENT INTELLIGENCE — DocQA, Summary, Synthesis, DocAI
// ═════════════════════════════════════════════════════════════════════

export const docqaScenario: TestScenario = {
  id: 'docqa-001-chat',
  name: 'Document Q&A — Chat with Documents',
  goal: `Navigate to the Document Q&A page (/docqa).
Look for ways to start a Q&A session or upload a document.
If a session exists, ask a question about the documents.
Verify that the AI responds with an answer.`,
  startUrl: '/docqa',
  maxActions: 25,
  successCriteria: [
    {
      description: 'DocQA page loaded',
      check: { check: 'url_contains', expected: '/docqa' },
    },
  ],
  backendChecks: [
    {
      description: 'DocQA sessions list endpoint responds',
      endpoint: '/docqa/sessions',
      method: 'GET',
      expectedStatus: 200,
    },
  ],
  category: 'docqa',
  tags: ['ai-brain', 'llm-pipeline', 'document-intelligence'],
}

export const summaryScenario: TestScenario = {
  id: 'summary-001-generate',
  name: 'Document Summary — Generate Executive Summary',
  goal: `Navigate to the Summary page (/summary).
Look for an option to generate a summary from content.
Provide some sample text or select a document.
Submit and verify a summary is generated.`,
  startUrl: '/summary',
  maxActions: 25,
  successCriteria: [
    {
      description: 'Summary page loaded',
      check: { check: 'url_contains', expected: '/summary' },
    },
  ],
  backendChecks: [
    {
      description: 'Summary generate endpoint responds',
      endpoint: '/summary/generate',
      method: 'POST',
      body: {
        content: 'Artificial intelligence has revolutionized software testing. Automated test generation, visual regression testing, and AI-powered bug detection are now common practices. These tools help teams ship faster with fewer bugs.',
        style: 'executive',
      },
      expectedStatus: 200,
    },
  ],
  category: 'ai_agent',
  tags: ['ai-brain', 'llm-pipeline', 'document-intelligence'],
}

export const synthesisScenario: TestScenario = {
  id: 'synthesis-001-session',
  name: 'Multi-Document Synthesis — Create Session',
  goal: `Navigate to the Synthesis page (/synthesis).
Look for an option to create a new synthesis session.
If available, create a session and add documents.
Verify the synthesis UI loads correctly.`,
  startUrl: '/synthesis',
  maxActions: 25,
  successCriteria: [
    {
      description: 'Synthesis page loaded',
      check: { check: 'url_contains', expected: '/synthesis' },
    },
  ],
  backendChecks: [
    {
      description: 'Synthesis sessions list endpoint responds',
      endpoint: '/synthesis/sessions',
      method: 'GET',
      expectedStatus: 200,
    },
  ],
  category: 'ai_agent',
  tags: ['ai-brain', 'llm-pipeline', 'document-intelligence'],
}

export const docaiClassifyScenario: TestScenario = {
  id: 'docai-001-classify',
  name: 'Document AI — Classification & Entity Extraction',
  goal: `This tests the Document AI brain endpoints directly.
Navigate to a document-related page and verify the DocAI pipeline works.`,
  startUrl: '/documents',
  maxActions: 15,
  successCriteria: [
    {
      description: 'Documents page loaded',
      check: { check: 'url_contains', expected: '/documents' },
    },
  ],
  backendChecks: [
    {
      description: 'DocAI classify endpoint responds',
      endpoint: '/docai/classify',
      method: 'POST',
      body: {
        content: 'INVOICE #12345\nDate: 2024-01-15\nBill To: Acme Corp\nTotal: $5,000.00',
      },
      expectedStatus: 200,
    },
    {
      description: 'DocAI entity extraction endpoint responds',
      endpoint: '/docai/entities',
      method: 'POST',
      body: {
        content: 'John Smith from Acme Corporation signed the contract on January 15, 2024 in New York.',
      },
      expectedStatus: 200,
    },
  ],
  category: 'ai_agent',
  tags: ['ai-brain', 'llm-pipeline', 'document-intelligence', 'backend-only'],
}

// ═════════════════════════════════════════════════════════════════════
// DATA ENRICHMENT & RECOMMENDATIONS
// ═════════════════════════════════════════════════════════════════════

export const enrichmentScenario: TestScenario = {
  id: 'enrichment-001-sources',
  name: 'Data Enrichment — Sources & Preview',
  goal: `Navigate to the Enrichment page (/enrichment).
Explore the available enrichment sources.
If possible, configure an enrichment source and preview results.`,
  startUrl: '/enrichment',
  maxActions: 25,
  successCriteria: [
    {
      description: 'Enrichment page loaded',
      check: { check: 'url_contains', expected: '/enrichment' },
    },
  ],
  backendChecks: [
    {
      description: 'Enrichment sources endpoint responds',
      endpoint: '/enrichment/sources',
      method: 'GET',
      expectedStatus: 200,
    },
    {
      description: 'Enrichment source-types endpoint responds',
      endpoint: '/enrichment/source-types',
      method: 'GET',
      expectedStatus: 200,
    },
    {
      description: 'Enrichment cache stats endpoint responds',
      endpoint: '/enrichment/cache/stats',
      method: 'GET',
      expectedStatus: 200,
    },
  ],
  category: 'ai_agent',
  tags: ['ai-brain', 'llm-pipeline', 'data-enrichment'],
}

export const recommendationsScenario: TestScenario = {
  id: 'recommendations-001-templates',
  name: 'AI Recommendations — Template Suggestions',
  goal: `This tests the AI recommendation engine that suggests templates.
Navigate to the Templates page and verify the recommendation pipeline works.`,
  startUrl: '/templates',
  maxActions: 15,
  successCriteria: [
    {
      description: 'Templates page loaded',
      check: { check: 'url_contains', expected: '/templates' },
    },
  ],
  backendChecks: [
    {
      description: 'Recommendations catalog endpoint responds',
      endpoint: '/recommendations/catalog',
      method: 'GET',
      expectedStatus: 200,
    },
    {
      description: 'Recommendations templates endpoint responds',
      endpoint: '/recommendations/templates',
      method: 'GET',
      expectedStatus: 200,
    },
  ],
  category: 'template',
  tags: ['ai-brain', 'llm-pipeline', 'recommendations'],
}

// ═════════════════════════════════════════════════════════════════════
// AI SERVICES — Content Generation, Grammar, Formulas
// ═════════════════════════════════════════════════════════════════════

export const aiContentGenerationScenario: TestScenario = {
  id: 'ai-001-generate',
  name: 'AI Services — Content Generation & Health',
  goal: `Test the core AI content generation pipeline.
Navigate to a document-related page and verify AI services are operational.`,
  startUrl: '/documents',
  maxActions: 15,
  successCriteria: [
    {
      description: 'Documents page loaded',
      check: { check: 'url_contains', expected: '/documents' },
    },
  ],
  backendChecks: [
    {
      description: 'AI generate endpoint responds',
      endpoint: '/ai/generate',
      method: 'POST',
      body: {
        prompt: 'Write a brief introduction about data analytics',
      },
      expectedStatus: 200,
    },
    {
      description: 'AI health check passes',
      endpoint: '/ai/health',
      method: 'GET',
      expectedStatus: 200,
    },
    {
      description: 'AI tones list endpoint responds',
      endpoint: '/ai/tones',
      method: 'GET',
      expectedStatus: 200,
    },
  ],
  category: 'ai_agent',
  tags: ['ai-brain', 'llm-pipeline', 'ai-services'],
}

// ═════════════════════════════════════════════════════════════════════
// FULL E2E WORKFLOW — The Ultimate Test
// ═════════════════════════════════════════════════════════════════════

export const fullWorkflowScenario: TestScenario = {
  id: 'workflow-001-full-e2e',
  name: 'Full E2E: Connection → Template → Report',
  goal: `Complete the full report generation workflow from scratch:
1. Go to Connections and create a new SQLite connection to the test database
2. Go to Templates and pick an existing template (or verify one exists)
3. Go to Reports and generate a report using the connection and template
4. Wait for the report to complete
5. Verify the report was generated successfully
This is the core value proposition of NeuraReport — test it end-to-end.`,
  hints: [
    'Start with connections, then templates, then reports',
    'You may need to wait for template verification to complete',
    'Report generation involves the LLM pipeline for data mapping and formatting',
  ],
  startUrl: '/connections',
  maxActions: 50,
  successCriteria: [
    {
      description: 'Connection was created',
      check: { check: 'text_contains', expected: 'connection' },
    },
    {
      description: 'Report generation was initiated',
      check: { check: 'toast_message', expected: 'report' },
    },
  ],
  category: 'workflow',
  tags: ['e2e', 'full-workflow', 'critical-path'],
}

// ═════════════════════════════════════════════════════════════════════
// COMPREHENSIVE AUDIT — AI explores every page like the button audit
// ═════════════════════════════════════════════════════════════════════

/** All routes in the app — the agent will visit every one */
export const ALL_ROUTES = [
  '/', '/dashboard', '/connections', '/templates', '/reports',
  '/schedules', '/jobs', '/activity', '/history', '/settings',
  '/query', '/enrichment', '/federation', '/synthesis', '/docqa',
  '/summary', '/documents', '/spreadsheets', '/dashboard-builder',
  '/connectors', '/workflows', '/agents', '/search', '/visualization',
  '/knowledge', '/design', '/ingestion', '/analyze', '/stats', '/ops',
  '/setup/wizard', '/analyze/legacy',
]

export const comprehensiveAuditScenario: TestScenario = {
  id: 'audit-001-all-pages',
  name: 'Comprehensive Audit: Visit every page and test all interactions',
  goal: `Visit EVERY page in the application and test all interactive elements.
For each page:
1. Navigate to the page
2. Take a screenshot
3. Identify all buttons, links, inputs, and interactive elements
4. Click each button and verify it does something sensible (opens a dialog, navigates, shows data)
5. Fill in any forms with test data and verify form validation works
6. Check for console errors and broken UI
7. Verify that the page heading and content match what's expected
8. Note any API calls triggered by actions

Pages to visit (in order): ${ALL_ROUTES.join(', ')}

After visiting all pages, provide a summary of:
- Total pages visited
- Total actions performed
- Any failures or issues found
- Pages that loaded correctly vs ones with problems`,
  hints: [
    'Use the sidebar navigation to move between pages',
    'On each page, systematically click every visible button',
    'Skip "Notifications" buttons to avoid hangs',
    'Take screenshots before and after major interactions',
    'If a button opens a dialog, close it before continuing',
    'Press Escape to dismiss any open overlays',
  ],
  startUrl: '/',
  maxActions: 500, // large budget for comprehensive exploration
  successCriteria: [
    {
      description: 'All major pages were visited',
      check: { check: 'text_contains', expected: 'Dashboard' },
    },
  ],
  category: 'navigation',
  tags: ['comprehensive-audit', 'full-coverage'],
}

/** Generate per-page audit scenarios so they can run in parallel */
export function generatePerPageScenarios(): TestScenario[] {
  return ALL_ROUTES.map((route, i) => ({
    id: `page-audit-${String(i).padStart(3, '0')}-${route.replace(/\//g, '') || 'home'}`,
    name: `Page Audit: ${route}`,
    goal: `Navigate to ${route} and test ALL interactive elements on this page — every button, link, tab, input, checkbox, dropdown.
1. Take a screenshot after the page loads
2. Count and identify EVERY button, link, tab, input, checkbox, and dropdown visible on the page
3. Click EACH button one by one. After each click:
   - Check if a dialog/drawer opened (dismiss it with Escape or Cancel)
   - Check if navigation happened (go back if needed)
   - Note any API calls triggered
   - Note any error messages or toasts
4. Fill in EVERY visible form field with test data
5. Click EVERY tab to check each section
6. Open EVERY dropdown and select an option, then reset
7. Scroll down to find elements below the fold and test those too
8. Verify the page doesn't crash or show errors
9. Take a final screenshot
IMPORTANT: Do NOT skip any interactive element. Test them ALL exhaustively.
Report: what works, what's broken, what each button does.`,
    hints: [
      'Skip "Notifications" buttons — they can hang',
      'Press Escape after clicking buttons that open overlays',
      'If you navigate away, use the back button or navigate back to the page',
      'Scroll down to find ALL elements — pages may have content below the fold',
      'Test EVERY button, not just the first few',
    ],
    startUrl: route,
    maxActions: 100,
    successCriteria: [
      {
        description: `Page ${route} loaded successfully`,
        check: { check: 'url_contains', expected: route === '/' ? 'dashboard' : route },
      },
    ],
    category: 'navigation' as const,
    tags: ['per-page-audit', 'comprehensive'],
  }))
}

// ─── Export all scenarios ────────────────────────────────────────────

export const ALL_SCENARIOS: TestScenario[] = [
  // Connection scenarios
  createConnectionScenario,
  testConnectionScenario,
  // Template scenarios
  browseTemplatesScenario,
  // Report scenarios
  generateReportScenario,
  // NL2SQL — tests the AI brain
  nl2sqlBasicQueryScenario,
  nl2sqlComplexQueryScenario,
  // AI Agents v1 — tests agent pipelines
  researchAgentScenario,
  dataAnalystAgentScenario,
  // AI Agents v2 — email, content repurpose, proofreading
  agentsV2EmailDraftScenario,
  agentsV2ContentRepurposeScenario,
  agentsV2ProofreadingScenario,
  // Document Intelligence — DocQA, Summary, Synthesis, DocAI
  docqaScenario,
  summaryScenario,
  synthesisScenario,
  docaiClassifyScenario,
  // Data Enrichment & Recommendations
  enrichmentScenario,
  recommendationsScenario,
  // AI Services — Content Generation
  aiContentGenerationScenario,
  // Schedules
  createScheduleScenario,
  // Navigation
  fullNavigationScenario,
  // Comprehensive audit — covers all pages like the button audit
  comprehensiveAuditScenario,
  // Backend brain verification
  backendBrainTemplateVerifyScenario,
  backendBrainChartSuggestionsScenario,
  // Full workflow
  fullWorkflowScenario,
]

/**
 * Get the full set of scenarios including per-page audits.
 * This is the equivalent of the 2,534-action button audit but
 * driven by an AI brain that makes intelligent decisions.
 */
export function getAllScenariosWithPageAudits(): TestScenario[] {
  return [...ALL_SCENARIOS, ...generatePerPageScenarios()]
}

/** Get scenarios by category */
export function getScenariosByCategory(category: TestScenario['category']): TestScenario[] {
  return ALL_SCENARIOS.filter(s => s.category === category)
}

/** Get scenarios by tag */
export function getScenariosByTag(tag: string): TestScenario[] {
  return ALL_SCENARIOS.filter(s => s.tags?.includes(tag))
}

/** Get only the AI brain / LLM pipeline scenarios */
export function getAIBrainScenarios(): TestScenario[] {
  return getScenariosByTag('ai-brain')
}
