import React from 'react';
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
} from '@mui/icons-material';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

function Sidebar({ currentPage, onNavigate }) {
  return (
    <Box
      sx={{
        width: 240,
        bgcolor: '#f5f3f0',
        borderRight: '1px solid #e5e2de',
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
        <Typography sx={{ fontWeight: 600, fontSize: 16 }}>
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
                  bgcolor: isActive ? 'white' : 'transparent',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  '&:hover': {
                    bgcolor: isActive ? 'white' : '#f0ede9',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Icon
                    sx={{
                      fontSize: 20,
                      color: isActive ? '#1a1a1a' : '#666',
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? '#1a1a1a' : '#666',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

export default Sidebar;
