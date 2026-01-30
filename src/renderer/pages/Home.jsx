import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

function Home() {
  const { user } = useAuth();
  const { history, getStats, isRecording, toggleRecording } = useSettings();
  const stats = getStats();

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

  return (
    <Box sx={{ p: 4, maxWidth: 900 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1.5 }}>
          Welcome back, {user?.name || 'User'}
        </Typography>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Chip
            icon={<span style={{ fontSize: 16 }}>🔥</span>}
            label={`${stats.streak} days`}
            sx={{
              bgcolor: 'white',
              border: '1px solid #e5e2de',
              fontSize: 13,
              py: 2,
            }}
          />
          <Chip
            icon={<span style={{ fontSize: 16 }}>📊</span>}
            label={`${stats.totalWords.toLocaleString()} words`}
            sx={{
              bgcolor: 'white',
              border: '1px solid #e5e2de',
              fontSize: 13,
              py: 2,
            }}
          />
          <Chip
            icon={<span style={{ fontSize: 16 }}>⚡</span>}
            label={`${stats.wpm} WPM`}
            sx={{
              bgcolor: 'white',
              border: '1px solid #e5e2de',
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
          bgcolor: '#fef9e6',
          p: 3,
          borderRadius: 3,
          mb: 4,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Make Flow sound like <em>you</em>
        </Typography>
        <Typography sx={{ color: '#666', fontSize: 14, mb: 2 }}>
          Flow adapts to how you write in different apps. Personalize your style
          for <strong>messages</strong>, <strong>work chats</strong>,{' '}
          <strong>emails</strong>, and <strong>other apps</strong> so every word
          sounds like you.
        </Typography>
        <Button
          variant="contained"
          onClick={toggleRecording}
          sx={{
            bgcolor: isRecording ? '#e53935' : '#1a1a1a',
            '&:hover': { bgcolor: isRecording ? '#c62828' : '#333' },
          }}
        >
          {isRecording ? 'Stop recording' : 'Start now'}
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
                color: '#999',
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
                  border: '1px solid #e5e2de',
                  borderRadius: 2,
                  '&:hover': {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    color: '#999',
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
                    color: '#1a1a1a',
                  }}
                >
                  {item.text}
                </Typography>
              </Paper>
            ))}
          </Box>
        ))
      ) : (
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              color: '#999',
              letterSpacing: 0.5,
              mb: 1.5,
            }}
          >
            TODAY
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              border: '1px solid #e5e2de',
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography sx={{ color: '#999', fontSize: 14 }}>
              No transcriptions yet. Press your shortcut to start recording!
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );
}

export default Home;
