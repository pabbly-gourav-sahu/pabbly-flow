import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  MicNone as MicNoneIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

function Home() {
  const { user } = useAuth();
  const { history, getStats, deleteHistoryItem } = useSettings();
  const stats = getStats();
  const theme = useTheme();

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
      {/* Welcome Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1.5, color: theme.palette.text.primary }}>
          Welcome back, {user?.name || 'User'}
        </Typography>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Chip
            icon={<span style={{ fontSize: 16 }}>🔥</span>}
            label={`${stats.streak} days`}
            sx={{
              bgcolor: theme.palette.custom.chipBg,
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              fontSize: 13,
              py: 2,
            }}
          />
          <Chip
            icon={<span style={{ fontSize: 16 }}>📊</span>}
            label={`${stats.totalWords.toLocaleString()} words`}
            sx={{
              bgcolor: theme.palette.custom.chipBg,
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              fontSize: 13,
              py: 2,
            }}
          />
          <Chip
            icon={<span style={{ fontSize: 16 }}>⚡</span>}
            label={`${stats.wpm} WPM`}
            sx={{
              bgcolor: theme.palette.custom.chipBg,
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              fontSize: 13,
              py: 2,
            }}
          />
        </Box>
      </Box>

      {/* Personalization Banner */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: theme.palette.custom.banner,
          p: 3,
          borderRadius: 3,
          mb: 4,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.primary }}>
          Make Flow sound like <em>you</em>
        </Typography>
        <Typography sx={{ color: theme.palette.custom.bannerText, fontSize: 14, mb: 2 }}>
          Flow adapts to how you write in different apps. Personalize your style
          for <strong>messages</strong>, <strong>work chats</strong>,{' '}
          <strong>emails</strong>, and <strong>other apps</strong> so every word
          sounds like you.
        </Typography>
        <Button
          variant="contained"
          sx={{
            bgcolor: theme.palette.custom.buttonBg,
            color: theme.palette.custom.buttonText,
            '&:hover': { bgcolor: theme.palette.custom.buttonHover },
          }}
        >
          Personalize
        </Button>
      </Paper>

      {/* History Section */}
      {Object.keys(groupedHistory).length > 0 ? (
        Object.entries(groupedHistory).map(([date, items]) => (
          <Box key={date} sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 600,
                color: theme.palette.text.secondary,
                letterSpacing: 0.5,
                mb: 1.5,
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
                  borderRadius: 2,
                  '&:hover': {
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
                    minWidth: 70,
                    pt: 0.25,
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
        ))
      ) : (
        /* Empty State */
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: theme.palette.custom.sidebar,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <MicNoneIcon sx={{ fontSize: 40, color: theme.palette.text.secondary }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.primary }}>
            No recordings yet
          </Typography>
          <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14, mb: 3, textAlign: 'center' }}>
            Press your keyboard shortcut to start recording.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default Home;
