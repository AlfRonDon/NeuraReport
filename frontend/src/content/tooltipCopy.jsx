import { Link, Stack, Typography } from '@mui/material'

const createTooltip = ({ why, steps = [], extra = null, link = null }) => (
  <Stack spacing={0.9}>
    <Stack spacing={0.25}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Why you need this
      </Typography>
      <Typography variant="body2">{why}</Typography>
    </Stack>
    {steps.length ? (
      <Stack spacing={0.25}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Steps to perform
        </Typography>
        <Stack component="ol" spacing={0.25} sx={{ pl: 2, mt: 0 }}>
          {steps.map((step, index) => (
            <Typography
              key={`tooltip-step-${index}`}
              component="li"
              variant="body2"
              sx={{ display: 'list-item' }}
            >
              {step}
            </Typography>
          ))}
        </Stack>
      </Stack>
    ) : null}
    {extra ? (
      <Typography variant="body2" color="text.secondary">
        {extra}
      </Typography>
    ) : null}
    {link ? (
      <Link
        href={link.href}
        target="_blank"
        rel="noopener"
        variant="body2"
        sx={{ fontWeight: 600 }}
      >
        {link.label}
      </Link>
    ) : null}
  </Stack>
)

export const TOOLTIP_COPY = {
  connectDatabase: createTooltip({
    why: 'Every report draw pulls live data from this source. A verified connection ensures the pipeline has permissioned access to the right schema and credentials before you invest time mapping templates.',
    steps: [
      'Choose the engine to load the proper defaults (Postgres, MySQL/MariaDB, SQL Server, or SQLite file).',
      'Provide host, port, database name or file path, and credentials. Add SSL or driver overrides in the advanced fields if required by your infrastructure.',
      'Use Test Connection to confirm the app can authenticate and reach the database. Resolve any validation or network errors it surfaces.',
      'Save the connection, then click Select Connection so subsequent template verification and report runs use this data source.',
    ],
    extra: 'Use a read-only service account scoped to the schemas your templates select from. This keeps audit compliance intact and prevents accidental writes.',
  }),
  savedConnections: createTooltip({
    why: 'Saved connections are shared within your workspace so teammates can reuse validated credentials without re-entering them.',
    steps: [
      'Select a connection to make it the active source. The heartbeat badge confirms it is ready for new runs.',
      'Use Test Connection to revalidate credentials when passwords rotate or firewall rules change.',
      'Edit Settings to update connection details, or duplicate the record to branch off a staging variant.',
      'Delete retired connections to keep the list focused; the system will clear the active selection if that source was in use.',
    ],
    extra: 'Latency readings help you spot degraded databases before they impact long-running report jobs.',
  }),
  uploadVerifyTemplate: createTooltip({
    why: 'Verification runs static templates against the active database so you catch missing fields, invalid SQL, or mismatched tokens before approving anything.',
    steps: [
      'Upload a PDF or Excel template. The dropzone auto-detects the format and checks file size limits.',
      'Click Verify Template to queue a sandbox run that hydrates the template with sample data from the selected connection.',
      'Monitor progress in the modal; when complete, review the generated preview and resolve any validation warnings.',
      'Open Review Mapping to confirm each token is mapped to SQL or data fields and address any items flagged for manual fixes.',
    ],
    extra: 'Keep the connection online during verification—the system reads metadata and sample records while the job executes.',
  }),
  templatePicker: createTooltip({
    why: 'Approved templates define what can be executed in a reporting window. Filtering the catalog lets you quickly target the set relevant to your team or campaign.',
    steps: [
      'Filter by tag or name to narrow the library. Tags often represent business units, compliance tiers, or delivery channels.',
      'Open a template card to preview its generated output, review generator assets, and confirm status before selecting it.',
      'Select one or more templates to include them in the next discovery or run cycle. The badge shows when generator assets still need attention.',
    ],
    extra: 'Need to stage new content? Return to Upload & Verify to approve additional templates before they appear here.',
  }),
  runReports: createTooltip({
    why: 'Runs are how the system pulls live data into finished artifacts. Defining the window and key token filters keeps jobs scoped and performant.',
    steps: [
      'Confirm the template selection is ready (generator assets green). Adjust filters or deselect anything still in revision.',
      'Set the reporting window. The platform validates that the end date is after the start date and converts to the pipeline timezone.',
      'Provide required key token values—these act as parameters in the SQL the generator executes.',
      'Use Find Reports to preview matching batches, then Run Reports to queue generation. Monitor progress and download the artifacts when complete.',
    ],
    extra: 'Queued runs respect concurrency limits. Leave the page open or check the Recent Downloads panel to grab outputs later.',
  }),
  recentDownloads: createTooltip({
    why: 'Recent downloads provide a quick trail of the latest artifacts you or your team generated, so you can reopen evidence without re-querying the pipeline.',
    steps: [
      'Open a file to view it in a new tab, or download again if you need to forward it downstream.',
      'Use the metadata row (template name, format, size) to confirm you grabbed the correct batch before sharing.',
      'Retry failed runs directly from this list once you resolve upstream issues like missing parameters or database outages.',
    ],
    extra: 'Entries persist for your session and across teammates, giving visibility into the most recent deliverables.',
  }),
  headerMappings: createTooltip({
    why: 'Mappings translate template placeholders into SQL expressions or dataset references, ensuring every token resolves during generation.',
    steps: [
      'Review the required and optional tokens list. Key tokens drive prompts later in the run wizard.',
      'Inspect the auto-suggested SQL or field mapping, editing expressions to match your schema or apply business logic.',
      'Resolve validation warnings—syntax issues, missing joins, or unmapped tokens—to keep approval unblocked.',
      'Approve when each token preview renders the expected sample data. The generator snapshot updates with your final expressions.',
    ],
    extra: 'Use the expression history dropdown to compare AI-suggested SQL with prior approved versions before finalizing.',
  }),
  uploadTemplate: createTooltip({
    why: 'Uploading a new layout kicks off the verification cycle. Keeping the staged files visible helps you confirm everything queued before you move on.',
    steps: [
      'Select or drag in the PDF or Excel template you want to stage. Multiple uploads queue in order.',
      'Review the staged list to confirm filenames and sizes match what your stakeholders expect.',
      'Proceed to Verify Template to validate mappings and sample output before handing off for approval.',
    ],
    extra: 'Need to swap a file? Remove it here before verification—after approval the template becomes read-only.',
  }),
  llm35Corrections: createTooltip({
    why: 'The corrections assistant rewrites the template HTML and inline constants so the final report matches the PDF source. Clear guidance prevents the model from over-editing your layout.',
    steps: [
      'Describe the issues you see in the preview—call out typos, alignment problems, constants that must be hard-coded, or sections to ignore.',
      'Mention any key tokens or SQL fields that should be referenced when fixing narrative gaps.',
      'Run Corrections and review the updated preview. Repeat until the template layout mirrors the source document.',
      'When satisfied, save and close so the latest instructions are persisted for the approval step.',
    ],
    extra: 'Keep instructions action-oriented (“Inline the company name from page 1 header”) to avoid unexpected structural changes.',
  }),
  llm4Narrative: createTooltip({
    why: 'The Narrative Instructions section generates the contract narrative and business summary the generator assets depend on. The guidance here steers aggregation logic and wording.',
    steps: [
      'Explain the story you expect the narrative to tell—include grouping rules, comparisons, and any regulatory language that must appear.',
      'Call out unresolved placeholders or key tokens and describe how they should be referenced in the write-up.',
      'Note formatting rules such as bullet lists, currency formatting, or threshold-based highlights.',
      'Approve the template only after confirming these instructions produce a narrative your reviewers can sign off on.',
    ],
    extra: 'Share example snippets or prior report phrasing to keep tone consistent across releases.',
  }),
  setupOverview: createTooltip({
    why: 'The setup flow walks new workspaces through the prerequisite steps so report automation is reliable from day one.',
    steps: [
      'Connect a database that mirrors production access levels.',
      'Verify and approve at least one template so the catalog is actionable.',
      'Run a smoke-test report to validate credentials, mappings, and downstream delivery.',
    ],
    extra: 'You can revisit any step later—progress indicators remind you which stages still need attention.',
  }),
}

export default TOOLTIP_COPY
