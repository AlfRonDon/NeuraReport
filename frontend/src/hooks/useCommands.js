import { useCallback } from 'react'
import { nanoid } from 'nanoid'
import { useSessionStore, useAppStore } from '../stores'
import { parseCommand, HELP_TEXT } from '../services/commandParser'
import * as api from '../api/client'
import { useInteraction, InteractionType, Reversibility } from '../components/ux/governance'

export function useCommands() {
  const addMessage = useSessionStore((s) => s.addMessage)
  const updateMessage = useSessionStore((s) => s.updateMessage)
  const addBlockToMessage = useSessionStore((s) => s.addBlockToMessage)
  const clearMessages = useSessionStore((s) => s.clearMessages)

  const connection = useAppStore((s) => s.connection)
  const setConnection = useAppStore((s) => s.setConnection)
  const clearConnection = useAppStore((s) => s.clearConnection)
  const templates = useAppStore((s) => s.templates)
  const setTemplates = useAppStore((s) => s.setTemplates)
  const startProcessing = useAppStore((s) => s.startProcessing)
  const finishProcessing = useAppStore((s) => s.finishProcessing)
  const stopProcessing = useAppStore((s) => s.stopProcessing)
  const { execute } = useInteraction()

  const executeCommand = useCallback(
    async (input, sessionId) => {
      const command = parseCommand(input)

      // Add user message
      addMessage(sessionId, 'user', input)

      // Create assistant message (will be updated)
      const msgId = addMessage(sessionId, 'assistant', '', [])
      updateMessage(sessionId, msgId, { streaming: true })

      const controller = startProcessing()

      try {
        switch (command.type) {
          case 'help': {
            updateMessage(sessionId, msgId, {
              content: HELP_TEXT,
              streaming: false,
            })
            break
          }

          case 'clear': {
            clearMessages(sessionId)
            break
          }

          case 'status': {
            const statusText = connection
              ? `Connected to: ${connection.name || connection.type}\nTables: ${connection.tables || 'N/A'}\nTemplates: ${templates.length}`
              : 'Not connected to any database.'
            updateMessage(sessionId, msgId, {
              content: statusText,
              streaming: false,
            })
            if (connection) {
              addBlockToMessage(sessionId, msgId, {
                id: nanoid(),
                type: 'connection',
                data: connection,
              })
            }
            break
          }

          case 'connect': {
            updateMessage(sessionId, msgId, { content: 'Connecting to database...' })
            addBlockToMessage(sessionId, msgId, {
              id: nanoid(),
              type: 'progress',
              data: { stage: 'Testing connection...', progress: 30, indeterminate: true },
            })

            try {
              const connStr = command.params.connectionString
              // Parse connection string - assume format: type://host:port/database or just URL
              const connectResponse = await execute({
                type: InteractionType.CREATE,
                label: 'Connect to database',
                reversibility: Reversibility.FULLY_REVERSIBLE,
                suppressSuccessToast: true,
                suppressErrorToast: true,
                blocksNavigation: false,
                intent: { action: 'connect', connectionString: connStr },
                action: async () => {
                  const result = await api.testConnection({ db_url: connStr })

                  if (!result.ok) {
                    throw new Error(result.detail || 'Connection test failed')
                  }

                  // Persist the connection
                  const connData = await api.upsertConnection({
                    id: result.connection_id,
                    name: result.name || connStr.split('/').pop() || 'Database',
                    dbType: result.db_type,
                    dbUrl: connStr,
                    database: result.database,
                    status: 'connected',
                    latencyMs: result.latency_ms,
                  })

                  return { result, connData }
                },
              })

              if (!connectResponse?.success) {
                throw connectResponse?.error || new Error('Connection test failed')
              }

              const { result, connData } = connectResponse.result || {}

              setConnection({
                id: connData?.id || result?.connection_id,
                name: connData?.name,
                type: connData?.db_type || result?.db_type,
                status: 'connected',
                tables: result?.tables_count || 0,
                latencyMs: result?.latency_ms,
              })

              // Refresh templates after connection
              try {
                const templateList = await api.listApprovedTemplates()
                setTemplates(templateList)
              } catch {
                // Ignore template fetch errors
              }

              updateMessage(sessionId, msgId, {
                content: `Connected successfully to ${connData?.name || connStr}.\nFound ${result?.tables_count || 0} tables. Latency: ${result?.latency_ms}ms`,
                streaming: false,
                blocks: [
                  {
                    id: nanoid(),
                    type: 'connection',
                    data: {
                      status: 'connected',
                      name: connData?.name,
                      type: connData?.db_type || result?.db_type,
                      tables: result?.tables_count,
                      latencyMs: result?.latency_ms,
                    },
                  },
                ],
              })
            } catch (err) {
              updateMessage(sessionId, msgId, {
                content: 'Failed to connect to database.',
                streaming: false,
                blocks: [
                  {
                    id: nanoid(),
                    type: 'error',
                    data: { message: 'Connection failed', detail: err.message },
                  },
                ],
              })
            }
            break
          }

          case 'disconnect': {
            if (connection?.id) {
              const deleteResponse = await execute({
                type: InteractionType.DELETE,
                label: 'Disconnect database',
                reversibility: Reversibility.FULLY_REVERSIBLE,
                suppressSuccessToast: true,
                suppressErrorToast: true,
                blocksNavigation: false,
                intent: { action: 'disconnect', connectionId: connection.id },
                action: async () => api.deleteConnection(connection.id),
              })
              if (!deleteResponse?.success) {
                // Ignore deletion errors
              }
            }
            clearConnection()
            updateMessage(sessionId, msgId, {
              content: 'Disconnected from database.',
              streaming: false,
            })
            break
          }

          case 'list_templates': {
            updateMessage(sessionId, msgId, { content: 'Fetching templates...' })

            try {
              const templateList = await api.listApprovedTemplates()
              setTemplates(templateList)

              if (templateList.length === 0) {
                updateMessage(sessionId, msgId, {
                  content: 'No templates available. Upload a template to get started.',
                  streaming: false,
                })
              } else {
                updateMessage(sessionId, msgId, {
                  content: `Found ${templateList.length} template(s):`,
                  streaming: false,
                  blocks: templateList.map((t) => ({
                    id: nanoid(),
                    type: 'template',
                    data: t,
                  })),
                })
              }
            } catch (err) {
              updateMessage(sessionId, msgId, {
                content: 'Failed to fetch templates.',
                streaming: false,
                blocks: [
                  {
                    id: nanoid(),
                    type: 'error',
                    data: { message: 'Template fetch failed', detail: err.message },
                  },
                ],
              })
            }
            break
          }

          case 'generate':
          case 'query': {
            if (!connection) {
              updateMessage(sessionId, msgId, {
                content: 'Please connect to a database first. Use `/connect <connection-string>` or describe your database.',
                streaming: false,
                blocks: [
                  {
                    id: nanoid(),
                    type: 'error',
                    data: { message: 'No database connection', retryable: false },
                  },
                ],
              })
              break
            }

            updateMessage(sessionId, msgId, { content: 'Processing your request...' })
            const progressBlockId = nanoid()
            addBlockToMessage(sessionId, msgId, {
              id: progressBlockId,
              type: 'progress',
              data: { stage: 'Analyzing request...', progress: 10 },
            })

            try {
              // Check if user specified a template
              const query = command.params.query || input
              const templateMatch = query.match(/template[:\s]+["']?([^"'\s]+)["']?/i)
              const templateId = templateMatch?.[1] || templates[0]?.id

              if (!templateId) {
                updateMessage(sessionId, msgId, {
                  content: 'No template available. Please upload a template first or specify one with `template: <name>`.',
                  streaming: false,
                  blocks: [],
                })
                break
              }

              if (controller.signal.aborted) {
                updateMessage(sessionId, msgId, {
                  content: 'Operation cancelled.',
                  streaming: false,
                  blocks: [],
                })
                break
              }

              // Update progress
              updateMessage(sessionId, msgId, {
                blocks: [
                  {
                    id: progressBlockId,
                    type: 'progress',
                    data: { stage: 'Generating chart suggestions...', progress: 40 },
                  },
                ],
              })

              // Get chart suggestions from AI
              const suggestResponse = await execute({
                type: InteractionType.ANALYZE,
                label: 'Suggest charts',
                reversibility: Reversibility.SYSTEM_MANAGED,
                suppressSuccessToast: true,
                suppressErrorToast: true,
                blocksNavigation: false,
                intent: {
                  action: 'suggest_charts',
                  templateId,
                  connectionId: connection.id,
                },
                action: async () => api.suggestCharts({
                  templateId,
                  connectionId: connection.id,
                  question: query,
                }),
              })

              if (!suggestResponse?.success) {
                throw suggestResponse?.error || new Error('Chart suggestion failed')
              }

              const { charts, sampleData } = suggestResponse.result || {}

              if (controller.signal.aborted) {
                updateMessage(sessionId, msgId, {
                  content: 'Operation cancelled.',
                  streaming: false,
                  blocks: [],
                })
                break
              }

              // Build response blocks
              const responseBlocks = []

              if (charts && charts.length > 0 && sampleData && sampleData.length > 0) {
                // Create chart blocks
                charts.forEach((chart) => {
                  responseBlocks.push({
                    id: nanoid(),
                    type: 'chart',
                    data: {
                      title: chart.title || `${chart.type} Chart`,
                      type: chart.type,
                      xField: chart.xField,
                      yFields: chart.yFields,
                      chartData: sampleData,
                    },
                  })
                })

                // Create table block with sample data
                if (sampleData.length > 0) {
                  const headers = Object.keys(sampleData[0])
                  const rows = sampleData.slice(0, 10).map((row) =>
                    headers.map((h) => String(row[h] ?? ''))
                  )
                  responseBlocks.push({
                    id: nanoid(),
                    type: 'table',
                    data: {
                      title: 'Data Preview',
                      headers,
                      rows,
                      totalRows: sampleData.length,
                    },
                  })
                }
              }

              updateMessage(sessionId, msgId, {
                content: charts?.length
                  ? `Here's what I found for "${query}":`
                  : 'No data found for your query. Try adjusting your parameters.',
                streaming: false,
                blocks: responseBlocks,
              })
            } catch (err) {
              updateMessage(sessionId, msgId, {
                content: 'Failed to process your request.',
                streaming: false,
                blocks: [
                  {
                    id: nanoid(),
                    type: 'error',
                    data: { message: err.message || 'Request failed' },
                  },
                ],
              })
            }
            break
          }

          case 'report': {
            if (!connection) {
              updateMessage(sessionId, msgId, {
                content: 'Please connect to a database first.',
                streaming: false,
                blocks: [
                  {
                    id: nanoid(),
                    type: 'error',
                    data: { message: 'No database connection' },
                  },
                ],
              })
              break
            }

            updateMessage(sessionId, msgId, { content: 'Generating report...' })
            addBlockToMessage(sessionId, msgId, {
              id: nanoid(),
              type: 'progress',
              data: { stage: 'Starting report generation...', progress: 10 },
            })

            try {
              const templateId = command.params.templateId || templates[0]?.id
              if (!templateId) {
                throw new Error('No template specified')
              }

              const reportResponse = await execute({
                type: InteractionType.EXECUTE,
                label: 'Queue report job',
                reversibility: Reversibility.SYSTEM_MANAGED,
                suppressSuccessToast: true,
                suppressErrorToast: true,
                blocksNavigation: false,
                intent: {
                  action: 'run_report',
                  templateId,
                  connectionId: connection.id,
                },
                action: async () => api.runReportAsJob({
                  templateId,
                  connectionId: connection.id,
                  startDate: command.params.startDate,
                  endDate: command.params.endDate,
                }),
              })

              if (!reportResponse?.success) {
                throw reportResponse?.error || new Error('Report job failed')
              }

              const result = reportResponse.result

              updateMessage(sessionId, msgId, {
                content: `Report job started: ${result.job_id}`,
                streaming: false,
                blocks: [
                  {
                    id: nanoid(),
                    type: 'report',
                    data: {
                      jobId: result.job_id,
                      status: result.status || 'queued',
                      templateId,
                    },
                  },
                ],
              })
            } catch (err) {
              updateMessage(sessionId, msgId, {
                content: 'Failed to start report generation.',
                streaming: false,
                blocks: [
                  {
                    id: nanoid(),
                    type: 'error',
                    data: { message: err.message },
                  },
                ],
              })
            }
            break
          }

          default: {
            // Try natural language processing for unknown commands
            updateMessage(sessionId, msgId, {
              content: `I don't understand "${input}". Type /help for available commands, or try:\n- \`/connect <connection-string>\` to connect to a database\n- \`/templates\` to list available templates\n- \`/status\` to check current connection`,
              streaming: false,
            })
          }
        }
      } catch (err) {
        updateMessage(sessionId, msgId, {
          content: 'An error occurred.',
          streaming: false,
          blocks: [
            {
              id: nanoid(),
              type: 'error',
              data: { message: err.message || 'Unknown error' },
            },
          ],
        })
      } finally {
        finishProcessing()
      }
    },
    [
      addMessage,
      updateMessage,
      addBlockToMessage,
      clearMessages,
      connection,
      setConnection,
      clearConnection,
      templates,
      setTemplates,
      startProcessing,
      finishProcessing,
      execute,
    ]
  )

  return {
    executeCommand,
    stopProcessing,
  }
}
