import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';

const ThemeContext = createContext(null);

function buildTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#90caf9' : '#1a1a1a',
      },
      secondary: {
        main: '#4f8cff',
      },
      background: {
        default: mode === 'dark' ? '#121212' : '#faf9f7',
        paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
      },
      divider: mode === 'dark' ? '#333' : '#e5e2de',
      text: {
        primary: mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
        secondary: mode === 'dark' ? '#aaa' : '#666',
      },
      // Custom tokens for sidebar and cards
      custom: {
        sidebar: mode === 'dark' ? '#1a1a1a' : '#f5f3f0',
        sidebarHover: mode === 'dark' ? '#252525' : '#f0ede9',
        border: mode === 'dark' ? '#333' : '#e5e2de',
        cardHover: mode === 'dark' ? '0 2px 8px rgba(255,255,255,0.05)' : '0 2px 8px rgba(0,0,0,0.08)',
        banner: mode === 'dark' ? '#332b00' : '#fef9e6',
        bannerText: mode === 'dark' ? '#ccc' : '#666',
        chipBg: mode === 'dark' ? '#2a2a2a' : 'white',
        activeItemBg: mode === 'dark' ? '#2a2a2a' : 'white',
        buttonBg: mode === 'dark' ? '#e0e0e0' : '#1a1a1a',
        buttonHover: mode === 'dark' ? '#fff' : '#333',
        buttonText: mode === 'dark' ? '#121212' : '#fff',
      },
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
    },
  });
}

export function ThemeProviderWrapper({ children }) {
  const [mode, setMode] = useState('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        if (window.electronAPI?.getTheme) {
          const savedMode = await window.electronAPI.getTheme();
          if (savedMode === 'dark' || savedMode === 'light') {
            setMode(savedMode);
          }
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setLoaded(true);
      }
    }
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    try {
      if (window.electronAPI?.setTheme) {
        await window.electronAPI.setTheme(newMode);
      }
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const theme = useMemo(() => buildTheme(mode), [mode]);

  const value = { mode, toggleTheme };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProviderWrapper');
  }
  return context;
}
