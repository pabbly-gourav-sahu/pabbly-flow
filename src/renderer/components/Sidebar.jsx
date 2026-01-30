import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { useTheme as useAppTheme } from '../context/ThemeContext';
import { useTheme } from '@mui/material/styles';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

function Sidebar({ currentPage, onNavigate }) {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const [sttConnected, setSttConnected] = useState(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        if (window.electronAPI?.checkSttHealth) {
          const healthy = await window.electronAPI.checkSttHealth();
          setSttConnected(healthy);
        }
      } catch {
        setSttConnected(false);
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        width: 240,
        bgcolor: theme.palette.custom.sidebar,
        borderRight: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        WebkitAppRegion: 'drag',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            bgcolor: '#4f8cff',
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
            P
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 600, fontSize: 16, color: theme.palette.text.primary }}>
          Pabbly Flow
        </Typography>
      </Box>

      {/* Navigation */}
      <List sx={{ px: 1, WebkitAppRegion: 'no-drag' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                onClick={() => onNavigate(item.id)}
                sx={{
                  borderRadius: 2,
                  bgcolor: isActive ? theme.palette.custom.activeItemBg : 'transparent',
                  boxShadow: isActive
                    ? mode === 'dark'
                      ? '0 1px 3px rgba(0,0,0,0.3)'
                      : '0 1px 3px rgba(0,0,0,0.08)'
                    : 'none',
                  '&:hover': {
                    bgcolor: isActive ? theme.palette.custom.activeItemBg : theme.palette.custom.sidebarHover,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Icon
                    sx={{
                      fontSize: 20,
                      color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* STT Status */}
      <Box
        sx={{
          mt: 'auto',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          WebkitAppRegion: 'no-drag',
        }}
      >
        <DotIcon
          sx={{
            fontSize: 10,
            color: sttConnected === null
              ? theme.palette.text.secondary
              : sttConnected
                ? '#4caf50'
                : '#e53935',
          }}
        />
        <Typography
          sx={{
            fontSize: 12,
            color: theme.palette.text.secondary,
            fontWeight: 500,
          }}
        >
          {sttConnected === null
            ? 'Checking...'
            : sttConnected
              ? 'STT Connected'
              : 'STT Offline'}
        </Typography>
      </Box>
    </Box>
  );
}

export default Sidebar;
