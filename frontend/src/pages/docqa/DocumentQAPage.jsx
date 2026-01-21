/**
 * Document Q&A Chat Page
 */
import React, { useState, useEffect, useRef } from 'react';
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
  Avatar,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Description as DocIcon,
  Send as SendIcon,
  Person as UserIcon,
  SmartToy as BotIcon,
  QuestionAnswer as QAIcon,
  FormatQuote as QuoteIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import useDocQAStore from '../../stores/docqaStore';

export default function DocumentQAPage() {
  const {
    sessions,
    currentSession,
    messages,
    loading,
    asking,
    error,
    fetchSessions,
    createSession,
    getSession,
    deleteSession,
    addDocument,
    removeDocument,
    askQuestion,
    clearHistory,
    reset,
  } = useDocQAStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addDocDialogOpen, setAddDocDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [question, setQuestion] = useState('');
  const messagesEndRef = useRef(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    };
    reader.readAsText(file);
  };

  const handleAskQuestion = async () => {
    if (!currentSession || !question.trim()) return;
    const q = question;
    setQuestion('');
    await askQuestion(currentSession.id, q);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  // Show loading during initial fetch
  if (initialLoading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <QAIcon />
          <Typography variant="h4">Document Q&A</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto', height: 'calc(100vh - 100px)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QAIcon /> Document Q&A
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Ask questions about your documents using AI
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

      <Grid container spacing={2} sx={{ height: 'calc(100% - 80px)' }}>
        {/* Sessions & Documents Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Typography variant="subtitle1" gutterBottom>
              Sessions
            </Typography>
            <List dense>
              {sessions.map((session) => (
                <ListItem
                  key={session.id}
                  button
                  selected={currentSession?.id === session.id}
                  onClick={() => getSession(session.id)}
                >
                  <ListItemIcon>
                    <QAIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={session.name}
                    secondary={`${session.documents?.length || 0} docs`}
                    primaryTypographyProps={{ noWrap: true }}
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

            {currentSession && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">Documents</Typography>
                  <IconButton size="small" onClick={() => setAddDocDialogOpen(true)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                <List dense>
                  {currentSession.documents?.map((doc) => (
                    <ListItem key={doc.id}>
                      <ListItemIcon>
                        <DocIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.name}
                        primaryTypographyProps={{ noWrap: true, fontSize: 13 }}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={() => removeDocument(currentSession.id, doc.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Paper>
        </Grid>

        {/* Chat Area */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {currentSession ? (
              <>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">{currentSession.name}</Typography>
                  {messages.length > 0 && (
                    <Button
                      size="small"
                      startIcon={<ClearIcon />}
                      onClick={() => clearHistory(currentSession.id)}
                    >
                      Clear Chat
                    </Button>
                  )}
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {messages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <QAIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography color="text.secondary">
                        {currentSession.documents?.length > 0
                          ? 'Ask a question about your documents'
                          : 'Add documents to start asking questions'}
                      </Typography>
                    </Box>
                  ) : (
                    messages.map((msg, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          gap: 2,
                          mb: 3,
                          flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main',
                          }}
                        >
                          {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
                        </Avatar>
                        <Box
                          sx={{
                            maxWidth: '70%',
                            bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100',
                            p: 2,
                            borderRadius: 2,
                          }}
                        >
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </Typography>

                          {/* Citations */}
                          {msg.citations?.length > 0 && (
                            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                <QuoteIcon fontSize="small" /> Sources
                              </Typography>
                              {msg.citations.map((cit, cidx) => (
                                <Box key={cidx} sx={{ mb: 1 }}>
                                  <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                                    {cit.document_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                                    "{cit.quote?.substring(0, 100)}..."
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {/* Follow-up questions */}
                          {msg.metadata?.follow_up_questions?.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" color="text.secondary">
                                Suggested follow-ups:
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                {msg.metadata.follow_up_questions.map((fq, fqidx) => (
                                  <Chip
                                    key={fqidx}
                                    label={fq}
                                    size="small"
                                    onClick={() => setQuestion(fq)}
                                    sx={{ cursor: 'pointer' }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Input Area */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      placeholder="Ask a question about your documents..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={asking || !currentSession.documents?.length}
                      multiline
                      maxRows={3}
                    />
                    <Button
                      variant="contained"
                      onClick={handleAskQuestion}
                      disabled={!question.trim() || asking || !currentSession.documents?.length}
                      sx={{ minWidth: 100 }}
                    >
                      {asking ? <CircularProgress size={24} /> : <SendIcon />}
                    </Button>
                  </Box>
                </Box>
              </>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <QAIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    Select a session or create a new one to start
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create Q&A Session</DialogTitle>
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
          <TextField
            fullWidth
            label="Document Name"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
            sx={{ mb: 2 }}
          >
            Upload File
            <input type="file" hidden onChange={handleFileUpload} accept=".txt,.md,.json,.csv" />
          </Button>
          <TextField
            fullWidth
            multiline
            rows={12}
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
