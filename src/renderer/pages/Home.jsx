import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  MicNone as MicIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  KeyboardVoice as VoiceIcon,
  FiberManualRecord as RecordDot,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

function Home() {
  const { user } = useAuth();
  const { history, getStats, deleteHistoryItem, isRecording, toggleRecording, settings } = useSettings();
  const stats = getStats();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Format shortcut for display
  const formatShortcut = (shortcut) => {
    if (!shortcut) return '';
    return shortcut
      .replace('CommandOrControl', '\u2318')
      .replace('Command', '\u2318')
      .replace('Control', 'Ctrl')
      .replace('Shift', '\u21E7')
      .replace('Alt', '\u2325')
      .replace(/\+/g, ' + ');
  };

  // Group history by date
  const groupedHistory = history.reduce((groups, item) => {
    const date = new Date(item.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey;
    if (date.toDateString() === today.toDateString()) {
      dateKey = 'TODAY';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'YESTERDAY';
    } else {
      dateKey = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }).toUpperCase();
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
    return groups;
  }, {});

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleDelete = (id) => {
    if (deleteHistoryItem) {
      deleteHistoryItem(id);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 900 }}>
      {/* Hero Section */}
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontSize: 14,
            color: theme.palette.text.secondary,
            mb: 0.5,
            fontWeight: 500,
          }}
        >
          {getGreeting()}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 3,
            letterSpacing: -0.5,
          }}
        >
          {user?.name || 'User'}
        </Typography>

        {/* Stats Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: isDark ? '#1a1a1a' : '#fff',
            }}
          >
            <Typography sx={{ fontSize: 24, mb: 0.5 }}>
              {stats.streak}
            </Typography>
            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, fontWeight: 500 }}>
              Day streak
            </Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: isDark ? '#1a1a1a' : '#fff',
            }}
          >
            <Typography sx={{ fontSize: 24, mb: 0.5 }}>
              {stats.totalWords.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, fontWeight: 500 }}>
              Words dictated
            </Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: isDark ? '#1a1a1a' : '#fff',
            }}
          >
            <Typography sx={{ fontSize: 24, mb: 0.5 }}>
              {history.length}
            </Typography>
            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, fontWeight: 500 }}>
              Recordings
            </Typography>
          </Paper>
        </Box>

        {/* Record Action Bar */}
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            px: 3,
            borderRadius: 3,
            border: `1px solid ${isRecording ? 'rgba(229, 57, 53, 0.4)' : theme.palette.divider}`,
            bgcolor: isRecording
              ? (isDark ? 'rgba(229, 57, 53, 0.08)' : 'rgba(229, 57, 53, 0.04)')
              : (isDark ? '#1a1a1a' : '#fff'),
            transition: 'all 0.2s ease',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {isRecording ? (
              <RecordDot
                sx={{
                  fontSize: 16,
                  color: '#e53935',
                  animation: 'pulse-rec 1.5s ease-in-out infinite',
                  '@keyframes pulse-rec': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.3 },
                  },
                }}
              />
            ) : (
              <VoiceIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />
            )}
            <Box>
              <Typography sx={{ fontSize: 14, fontWeight: 500, color: theme.palette.text.primary }}>
                {isRecording ? 'Recording in progress...' : 'Ready to record'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>
                {isRecording
                  ? 'Click stop when you\'re done speaking'
                  : `Press ${formatShortcut(settings?.shortcut)} or click Start`
                }
              </Typography>
            </Box>
          </Box>
          <Button
            onClick={toggleRecording}
            variant="contained"
            disableElevation
            sx={{
              bgcolor: isRecording ? '#e53935' : theme.palette.custom.buttonBg,
              color: isRecording ? '#fff' : theme.palette.custom.buttonText,
              '&:hover': { bgcolor: isRecording ? '#c62828' : theme.palette.custom.buttonHover },
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 0.8,
              borderRadius: 2,
              fontSize: 13,
              minWidth: 100,
            }}
          >
            {isRecording ? 'Stop' : 'Start now'}
          </Button>
        </Paper>
      </Box>

      {/* History Section */}
      {Object.keys(groupedHistory).length > 0 ? (
        <>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 2,
            }}
          >
            Recent Activity
          </Typography>
          {Object.entries(groupedHistory).map(([date, items]) => (
            <Box key={date} sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                  letterSpacing: 0.5,
                  mb: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                {date}
              </Typography>
              {items.map((item) => (
                <Paper
                  key={item.id}
                  elevation={0}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    p: 2,
                    mb: 1,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2.5,
                    bgcolor: isDark ? '#1a1a1a' : '#fff',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      borderColor: isDark ? '#444' : '#ccc',
                      boxShadow: theme.palette.custom.cardHover,
                    },
                    '&:hover .history-actions': {
                      opacity: 1,
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: theme.palette.text.secondary,
                      minWidth: 75,
                      pt: 0.25,
                      fontWeight: 500,
                    }}
                  >
                    {formatTime(item.timestamp)}
                  </Typography>
                  <Typography
                    sx={{
                      flex: 1,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: theme.palette.text.primary,
                    }}
                  >
                    {item.text}
                  </Typography>
                  <Box
                    className="history-actions"
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Tooltip title="Copy">
                      <IconButton size="small" onClick={() => handleCopy(item.text)}>
                        <CopyIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(item.id)}>
                        <DeleteIcon sx={{ fontSize: 16, color: '#e53935' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              ))}
            </Box>
          ))}
        </>
      ) : (
        /* Empty State */
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            px: 4,
            borderRadius: 4,
            border: `1px dashed ${theme.palette.divider}`,
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: isDark ? '#252525' : '#f0ede9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2.5,
            }}
          >
            <MicIcon sx={{ fontSize: 32, color: theme.palette.text.secondary }} />
          </Box>
          <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: 16, color: theme.palette.text.primary }}>
            No recordings yet
          </Typography>
          <Typography sx={{ color: theme.palette.text.secondary, fontSize: 13, textAlign: 'center', maxWidth: 300 }}>
            Press <strong>{formatShortcut(settings?.shortcut)}</strong> anywhere to start dictating, or click Start now above.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

export default Home;
