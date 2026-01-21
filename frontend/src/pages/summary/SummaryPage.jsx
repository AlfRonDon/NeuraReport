/**
 * Executive Summary Generation Page
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Divider,
  Slider,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  AutoAwesome as SummaryIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import useSummaryStore from '../../stores/summaryStore';

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal', description: 'Professional, business-appropriate tone' },
  { value: 'conversational', label: 'Conversational', description: 'Friendly, easy-to-read tone' },
  { value: 'technical', label: 'Technical', description: 'Detailed, precise terminology' },
];

const FOCUS_SUGGESTIONS = [
  'Key findings',
  'Financial metrics',
  'Trends',
  'Recommendations',
  'Risks',
  'Opportunities',
  'Performance',
  'Growth',
];

export default function SummaryPage() {
  const {
    summary,
    history,
    loading,
    error,
    generateSummary,
    clearSummary,
    clearHistory,
    reset,
  } = useSummaryStore();

  const [content, setContent] = useState('');
  const [tone, setTone] = useState('formal');
  const [maxSentences, setMaxSentences] = useState(5);
  const [focusAreas, setFocusAreas] = useState([]);
  const [customFocus, setCustomFocus] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  const handleGenerate = async () => {
    if (!content.trim()) return;
    await generateSummary({
      content: content.trim(),
      tone,
      maxSentences,
      focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
    });
  };

  const handleAddFocus = (focus) => {
    if (focusAreas.length < 5 && !focusAreas.includes(focus)) {
      setFocusAreas([...focusAreas, focus]);
    }
  };

  const handleRemoveFocus = (focus) => {
    setFocusAreas(focusAreas.filter((f) => f !== focus));
  };

  const handleAddCustomFocus = () => {
    if (customFocus.trim() && focusAreas.length < 5 && !focusAreas.includes(customFocus.trim())) {
      setFocusAreas([...focusAreas, customFocus.trim()]);
      setCustomFocus('');
    }
  };

  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLoadFromHistory = (item) => {
    setContent(item.contentPreview.replace('...', ''));
    setTone(item.tone);
    setMaxSentences(item.maxSentences);
    setFocusAreas(item.focusAreas || []);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SummaryIcon /> Executive Summary Generator
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate concise executive summaries from your content using AI
          </Typography>
        </Box>
        {history.length > 0 && (
          <Button
            variant="outlined"
            startIcon={showHistory ? <ExpandLessIcon /> : <HistoryIcon />}
            onClick={() => setShowHistory(!showHistory)}
          >
            History ({history.length})
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => reset()}>
          {error}
        </Alert>
      )}

      {/* History Panel */}
      <Collapse in={showHistory}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Recent Summaries</Typography>
            <Button size="small" color="error" onClick={clearHistory}>
              Clear All
            </Button>
          </Box>
          <Grid container spacing={2}>
            {history.map((item) => (
              <Grid item xs={12} md={6} key={item.id}>
                <Card variant="outlined" sx={{ cursor: 'pointer' }} onClick={() => handleLoadFromHistory(item)}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.createdAt).toLocaleString()} - {item.tone}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }} noWrap>
                      {item.summary?.substring(0, 150)}...
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Collapse>

      <Grid container spacing={3}>
        {/* Input Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Content to Summarize
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={12}
              placeholder="Paste your document content, report text, or any content you want to summarize..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary">
              {content.length} / 50,000 characters
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Options */}
            <Typography variant="subtitle2" gutterBottom>
              Summary Options
            </Typography>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Tone</InputLabel>
              <Select value={tone} label="Tone" onChange={(e) => setTone(e.target.value)}>
                {TONE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box>
                      <Typography variant="body2">{opt.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {opt.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Summary Length: {maxSentences} sentences
              </Typography>
              <Slider
                value={maxSentences}
                onChange={(e, val) => setMaxSentences(val)}
                min={2}
                max={15}
                marks={[
                  { value: 2, label: '2' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 15, label: '15' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Focus Areas (optional, max 5)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {focusAreas.map((focus) => (
                  <Chip
                    key={focus}
                    label={focus}
                    size="small"
                    color="primary"
                    onDelete={() => handleRemoveFocus(focus)}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {FOCUS_SUGGESTIONS.filter((f) => !focusAreas.includes(f)).map((focus) => (
                  <Chip
                    key={focus}
                    label={focus}
                    size="small"
                    variant="outlined"
                    onClick={() => handleAddFocus(focus)}
                    disabled={focusAreas.length >= 5}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Add custom focus..."
                  value={customFocus}
                  onChange={(e) => setCustomFocus(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomFocus()}
                  disabled={focusAreas.length >= 5}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddCustomFocus}
                  disabled={!customFocus.trim() || focusAreas.length >= 5}
                >
                  Add
                </Button>
              </Box>
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SummaryIcon />}
              onClick={handleGenerate}
              disabled={!content.trim() || content.length < 10 || loading}
            >
              {loading ? 'Generating...' : 'Generate Summary'}
            </Button>
          </Paper>
        </Grid>

        {/* Output Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Generated Summary</Typography>
              {summary && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                    <IconButton size="small" onClick={handleCopy}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clear">
                    <IconButton size="small" onClick={clearSummary}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>

            {summary ? (
              <Box sx={{ flex: 1 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    minHeight: 200,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <Typography variant="body1">{summary}</Typography>
                </Paper>
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`Tone: ${tone}`} size="small" variant="outlined" />
                  <Chip label={`${maxSentences} sentences`} size="small" variant="outlined" />
                  {focusAreas.map((f) => (
                    <Chip key={f} label={f} size="small" color="primary" variant="outlined" />
                  ))}
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 300,
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <SummaryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    Enter your content and click "Generate Summary" to create an executive summary
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
