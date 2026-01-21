/**
 * Multi-Document Synthesis Page
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Description as DocIcon,
  Warning as WarningIcon,
  AutoAwesome as SynthesizeIcon,
  ExpandMore as ExpandMoreIcon,
  Merge as MergeIcon,
} from '@mui/icons-material';
import useSynthesisStore from '../../stores/synthesisStore';

export default function SynthesisPage() {
  const {
    sessions,
    currentSession,
    inconsistencies,
    synthesisResult,
    loading,
    error,
    fetchSessions,
    createSession,
    getSession,
    deleteSession,
    addDocument,
    removeDocument,
    findInconsistencies,
    synthesize,
    reset,
  } = useSynthesisStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addDocDialogOpen, setAddDocDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docType, setDocType] = useState('text');
  const [outputFormat, setOutputFormat] = useState('structured');
  const [focusTopics, setFocusTopics] = useState('');

  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      await fetchSessions();
      setInitialLoading(false);
    };
    init();
    return () => reset();
  }, [fetchSessions, reset]);

  const handleCreateSession = async () => {
    if (!newSessionName) return;
    await createSession(newSessionName);
    setCreateDialogOpen(false);
    setNewSessionName('');
  };

  const handleAddDocument = async () => {
    if (!currentSession || !docName || !docContent) return;
    await addDocument(currentSession.id, {
      name: docName,
      content: docContent,
      docType,
    });
    setAddDocDialogOpen(false);
    setDocName('');
    setDocContent('');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setDocName(file.name);
      setDocContent(e.target.result);

      // Set doc type based on file extension
      const ext = file.name.split('.').pop().toLowerCase();
      if (['pdf'].includes(ext)) setDocType('pdf');
      else if (['xlsx', 'xls'].includes(ext)) setDocType('excel');
      else if (['doc', 'docx'].includes(ext)) setDocType('word');
      else if (['json'].includes(ext)) setDocType('json');
      else setDocType('text');
    };
    reader.readAsText(file);
  };

  const handleSynthesize = async () => {
    if (!currentSession) return;
    await synthesize(currentSession.id, {
      focusTopics: focusTopics ? focusTopics.split(',').map(t => t.trim()) : undefined,
      outputFormat,
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  // Show loading during initial fetch
  if (initialLoading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <MergeIcon />
          <Typography variant="h4">Multi-Document Synthesis</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MergeIcon /> Multi-Document Synthesis
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Combine information from multiple documents with AI-powered analysis
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Session
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => reset()}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Sessions List */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sessions
            </Typography>
            {sessions.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No sessions yet
              </Typography>
            ) : (
              <List dense>
                {sessions.map((session) => (
                  <ListItem
                    key={session.id}
                    button
                    selected={currentSession?.id === session.id}
                    onClick={() => getSession(session.id)}
                  >
                    <ListItemIcon>
                      <MergeIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={session.name}
                      secondary={`${session.documents?.length || 0} docs`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={9}>
          {currentSession ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Documents */}
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Documents ({currentSession.documents?.length || 0})
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setAddDocDialogOpen(true)}
                  >
                    Add Document
                  </Button>
                </Box>

                {currentSession.documents?.length === 0 ? (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    Add documents to begin synthesis
                  </Typography>
                ) : (
                  <Grid container spacing={2}>
                    {currentSession.documents?.map((doc) => (
                      <Grid item xs={12} sm={6} md={4} key={doc.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <DocIcon color="primary" />
                              <Typography variant="subtitle2" noWrap>
                                {doc.name}
                              </Typography>
                            </Box>
                            <Chip size="small" label={doc.doc_type} />
                          </CardContent>
                          <CardActions>
                            <IconButton
                              size="small"
                              onClick={() => removeDocument(currentSession.id, doc.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Paper>

              {/* Analysis Actions */}
              {currentSession.documents?.length >= 2 && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Analysis
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Output Format</InputLabel>
                        <Select
                          value={outputFormat}
                          label="Output Format"
                          onChange={(e) => setOutputFormat(e.target.value)}
                        >
                          <MenuItem value="structured">Structured</MenuItem>
                          <MenuItem value="narrative">Narrative</MenuItem>
                          <MenuItem value="comparison">Comparison</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Focus Topics (comma-separated)"
                        value={focusTopics}
                        onChange={(e) => setFocusTopics(e.target.value)}
                        placeholder="revenue, growth, risks"
                      />
                    </Grid>
                  </Grid>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={loading ? <CircularProgress size={20} /> : <WarningIcon />}
                      onClick={() => findInconsistencies(currentSession.id)}
                      disabled={loading}
                    >
                      Find Inconsistencies
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={20} /> : <SynthesizeIcon />}
                      onClick={handleSynthesize}
                      disabled={loading}
                    >
                      Synthesize
                    </Button>
                  </Box>
                </Paper>
              )}

              {/* Inconsistencies */}
              {inconsistencies.length > 0 && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon color="warning" /> Inconsistencies Found ({inconsistencies.length})
                  </Typography>
                  {inconsistencies.map((item, idx) => (
                    <Accordion key={idx} variant="outlined">
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Chip
                            size="small"
                            label={item.severity}
                            color={getSeverityColor(item.severity)}
                          />
                          <Typography>{item.field_or_topic}</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {item.description}
                        </Typography>
                        {item.suggested_resolution && (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            <strong>Suggestion:</strong> {item.suggested_resolution}
                          </Alert>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Paper>
              )}

              {/* Synthesis Result */}
              {synthesisResult && (
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Synthesis Result
                  </Typography>
                  <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {synthesisResult.synthesis?.title}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {synthesisResult.synthesis?.executive_summary}
                    </Typography>

                    {synthesisResult.synthesis?.key_insights && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Key Insights</Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {synthesisResult.synthesis.key_insights.map((insight, idx) => (
                            <li key={idx}><Typography variant="body2">{insight}</Typography></li>
                          ))}
                        </ul>
                      </Box>
                    )}

                    {synthesisResult.synthesis?.sections && (
                      <Box>
                        {synthesisResult.synthesis.sections.map((section, idx) => (
                          <Box key={idx} sx={{ mb: 2 }}>
                            <Typography variant="subtitle1">{section.heading}</Typography>
                            <Typography variant="body2">{section.content}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Paper>
              )}
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <MergeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">
                Select a session or create a new one to begin
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create Synthesis Session</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Session Name"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateSession} disabled={!newSessionName}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Document Dialog */}
      <Dialog open={addDocDialogOpen} onClose={() => setAddDocDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Document</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Document Name"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={docType}
                label="Type"
                onChange={(e) => setDocType(e.target.value)}
              >
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
                <MenuItem value="word">Word</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
            sx={{ mb: 2 }}
          >
            Upload File
            <input type="file" hidden onChange={handleFileUpload} />
          </Button>
          <TextField
            fullWidth
            multiline
            rows={10}
            label="Document Content"
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            placeholder="Paste document content or upload a file..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDocDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddDocument}
            disabled={!docName || !docContent}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
