import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Home from './pages/Home';
import Settings from './pages/Settings';

function NotificationBridge() {
  const { showToast } = useToast();

  useEffect(() => {
    // Listen for errors from main process
    if (window.electronAPI?.onError) {
      window.electronAPI.onError((data) => {
        showToast(data.message || 'An error occurred', 'error');
      });
    }

    return () => {
      window.electronAPI?.removeErrorListener?.();
    };
  }, [showToast]);

  return null;
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          bgcolor: 'background.default',
        }}
      >
        Loading...
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          bgcolor: 'background.default',
        }}
      >
        {currentPage === 'home' && <Home />}
        {currentPage === 'settings' && <Settings />}
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ToastProvider>
      <NotificationBridge />
      <AppContent />
    </ToastProvider>
  );
}

export default App;
