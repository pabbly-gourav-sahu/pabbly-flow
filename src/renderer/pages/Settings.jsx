import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  Tune as TuneIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: TuneIcon },
  { id: 'account', label: 'Account', icon: PersonIcon },
];

const LANGUAGES = [
  { value: 'auto', label: 'Auto Detect' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi / Hinglish' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
];

function Settings() {
  const { user, logout } = useAuth();
  const { settings, updateSettings, clearHistory } = useSettings();
  const [activeTab, setActiveTab] = useState('general');
  const [shortcutDialog, setShortcutDialog] = useState(false);
  const [languageDialog, setLanguageDialog] = useState(false);
  const [microphoneDialog, setMicrophoneDialog] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(settings.language || 'auto');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [newShortcut, setNewShortcut] = useState('');
  const [microphones, setMicrophones] = useState([]);
  const [selectedMic, setSelectedMic] = useState('default');

  // Load microphones on mount
  useEffect(() => {
    loadMicrophones();
  }, []);

  // Update selected language when settings change
  useEffect(() => {
    setSelectedLanguage(settings.language || 'auto');
  }, [settings.language]);

  const loadMicrophones = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      setMicrophones(audioInputs);
    } catch (error) {
      console.error('Failed to load microphones:', error);
    }
  };

  const formatShortcut = (shortcut) => {
    if (!shortcut) return 'Not set';
    return shortcut
      .replace('CommandOrControl', 'Ctrl')
      .replace('Command', 'Cmd')
      .replace('Control', 'Ctrl')
      .replace(/\+/g, ' + ');
  };

  const getLanguageLabel = (value) => {
    return LANGUAGES.find((l) => l.value === value)?.label || 'Auto Detect';
  };

  const getMicrophoneLabel = () => {
    if (selectedMic === 'default') return 'Auto-detect (Default)';
    const mic = microphones.find(m => m.deviceId === selectedMic);
    return mic?.label || 'Auto-detect (Default)';
  };

  // Handle keyboard shortcut recording - supports F-keys, single keys with modifiers
  const handleShortcutKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const keys = [];

    // Check modifiers
    if (e.ctrlKey || e.metaKey) keys.push('CommandOrControl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');

    // Get the actual key
    let keyName = '';
    const key = e.key;
    const code = e.code;

    // Skip if only modifier is pressed
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      return;
    }

    // Handle F-keys (F1-F12)
    if (code.startsWith('F') && /^F\d+$/.test(code)) {
      keyName = code; // F1, F2, etc.
    }
    // Handle letter keys
    else if (code.startsWith('Key')) {
      keyName = code.replace('Key', '');
    }
    // Handle digit keys
    else if (code.startsWith('Digit')) {
      keyName = code.replace('Digit', '');
    }
    // Handle special keys
    else if (key === ' ') {
      keyName = 'Space';
    }
    else if (key.length === 1) {
      keyName = key.toUpperCase();
    }
    else {
      // Other special keys like Enter, Escape, etc.
      keyName = key;
    }

    if (keyName) {
      keys.push(keyName);
    }

    // Valid shortcut: F-key alone OR modifier + key
    if (keys.length === 1 && keys[0].startsWith('F') && /^F\d+$/.test(keys[0])) {
      // Single F-key is valid
      setNewShortcut(keys[0]);
    } else if (keys.length >= 2) {
      // Modifier + key combination
      setNewShortcut(keys.join('+'));
    }
  };

  const handleSaveShortcut = async () => {
    if (newShortcut) {
      const result = await updateSettings({ ...settings, shortcut: newShortcut });
      if (result.success) {
        setToast({ open: true, message: 'Shortcut updated! Restart app for changes.', severity: 'success' });
      } else {
        setToast({ open: true, message: 'Failed to save shortcut', severity: 'error' });
      }
    }
    setShortcutDialog(false);
    setNewShortcut('');
  };

  const handleSaveLanguage = async () => {
    const result = await updateSettings({ ...settings, language: selectedLanguage });
    if (result.success) {
      setToast({ open: true, message: 'Language updated!', severity: 'success' });
    } else {
      setToast({ open: true, message: 'Failed to save language', severity: 'error' });
    }
    setLanguageDialog(false);
  };

  const handleSaveMicrophone = async () => {
    // For now, just close the dialog - mic is handled by the recorder
    setToast({ open: true, message: 'Microphone updated!', severity: 'success' });
    setMicrophoneDialog(false);
  };

  const handleToggleAutoPaste = async () => {
    const newValue = !settings.autoPaste;
    const result = await updateSettings({ ...settings, autoPaste: newValue });
    if (result.success) {
      setToast({
        open: true,
        message: `Auto paste ${newValue ? 'enabled' : 'disabled'}`,
        severity: 'success',
      });
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all transcription history?')) {
      await clearHistory();
      setToast({ open: true, message: 'History cleared!', severity: 'success' });
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', p: 2 }}>
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flex: 1,
          border: '1px solid #e5e2de',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* Settings Sidebar */}
        <Box
          sx={{
            width: 200,
            bgcolor: '#f5f3f0',
            borderRight: '1px solid #e5e2de',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              color: '#999',
              letterSpacing: 0.5,
              mb: 2,
              px: 1,
            }}
          >
            SETTINGS
          </Typography>

          <List disablePadding>
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <ListItem key={tab.id} disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton
                    onClick={() => setActiveTab(tab.id)}
                    sx={{
                      borderRadius: 2,
                      bgcolor: isActive ? 'white' : 'transparent',
                      '&:hover': {
                        bgcolor: isActive ? 'white' : '#f0ede9',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Icon
                        sx={{
                          fontSize: 18,
                          color: isActive ? '#1a1a1a' : '#666',
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={tab.label}
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

          <Typography
            sx={{
              mt: 'auto',
              fontSize: 12,
              color: '#999',
              px: 1,
            }}
          >
            Flow v1.0.0
          </Typography>
        </Box>

        {/* Settings Content */}
        <Box sx={{ flex: 1, p: 4, overflow: 'auto' }}>
          {activeTab === 'general' && (
            <>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                General
              </Typography>

              {/* Keyboard Shortcuts */}
              <Paper
                elevation={0}
                sx={{ border: '1px solid #e5e2de', borderRadius: 2, mb: 1.5 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500, mb: 0.5 }}>
                      Keyboard shortcuts
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#666' }}>
                      Press{' '}
                      <Box
                        component="span"
                        sx={{
                          bgcolor: '#f5f3f0',
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 1,
                          fontFamily: 'monospace',
                          fontSize: 12,
                        }}
                      >
                        {formatShortcut(settings.shortcut)}
                      </Box>{' '}
                      to start/stop recording
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setNewShortcut('');
                      setShortcutDialog(true);
                    }}
                    sx={{
                      borderColor: '#e5e2de',
                      color: '#1a1a1a',
                      '&:hover': { bgcolor: '#f5f3f0', borderColor: '#e5e2de' },
                    }}
                  >
                    Change
                  </Button>
                </Box>
              </Paper>

              {/* Microphone */}
              <Paper
                elevation={0}
                sx={{ border: '1px solid #e5e2de', borderRadius: 2, mb: 1.5 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500, mb: 0.5 }}>
                      Microphone
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#666' }}>
                      {getMicrophoneLabel()}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      loadMicrophones();
                      setMicrophoneDialog(true);
                    }}
                    sx={{
                      borderColor: '#e5e2de',
                      color: '#1a1a1a',
                      '&:hover': { bgcolor: '#f5f3f0', borderColor: '#e5e2de' },
                    }}
                  >
                    Change
                  </Button>
                </Box>
              </Paper>

              {/* Language */}
              <Paper
                elevation={0}
                sx={{ border: '1px solid #e5e2de', borderRadius: 2, mb: 1.5 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500, mb: 0.5 }}>
                      Languages
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#666' }}>
                      {getLanguageLabel(settings.language)}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSelectedLanguage(settings.language || 'auto');
                      setLanguageDialog(true);
                    }}
                    sx={{
                      borderColor: '#e5e2de',
                      color: '#1a1a1a',
                      '&:hover': { bgcolor: '#f5f3f0', borderColor: '#e5e2de' },
                    }}
                  >
                    Change
                  </Button>
                </Box>
              </Paper>

              {/* Auto Paste */}
              <Paper
                elevation={0}
                sx={{ border: '1px solid #e5e2de', borderRadius: 2 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500, mb: 0.5 }}>
                      Auto Paste
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#666' }}>
                      Automatically paste transcribed text at cursor position
                    </Typography>
                  </Box>
                  <Switch
                    checked={settings.autoPaste ?? true}
                    onChange={handleToggleAutoPaste}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#4caf50',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        bgcolor: '#4caf50',
                      },
                    }}
                  />
                </Box>
              </Paper>
            </>
          )}

          {activeTab === 'account' && (
            <>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                Account
              </Typography>

              {/* Profile */}
              <Paper
                elevation={0}
                sx={{ border: '1px solid #e5e2de', borderRadius: 2, mb: 1.5 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500, mb: 0.5 }}>
                      Profile
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#666' }}>
                      {user?.email || 'Not logged in'}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: '#e5e2de',
                      color: '#1a1a1a',
                      '&:hover': { bgcolor: '#f5f3f0', borderColor: '#e5e2de' },
                    }}
                  >
                    Edit
                  </Button>
                </Box>
              </Paper>

              {/* Clear History */}
              <Paper
                elevation={0}
                sx={{ border: '1px solid #e5e2de', borderRadius: 2, mb: 1.5 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500, mb: 0.5 }}>
                      Clear History
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#666' }}>
                      Delete all your transcription history
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleClearHistory}
                    sx={{
                      borderColor: '#ffcdd2',
                      color: '#e53935',
                      bgcolor: '#ffebee',
                      '&:hover': { bgcolor: '#ffcdd2', borderColor: '#ffcdd2' },
                    }}
                  >
                    Clear
                  </Button>
                </Box>
              </Paper>

              {/* Logout */}
              <Paper
                elevation={0}
                sx={{ border: '1px solid #e5e2de', borderRadius: 2 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500, mb: 0.5 }}>
                      Logout
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: '#666' }}>
                      Sign out of your account
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleLogout}
                    sx={{
                      borderColor: '#e5e2de',
                      color: '#1a1a1a',
                      '&:hover': { bgcolor: '#f5f3f0', borderColor: '#e5e2de' },
                    }}
                  >
                    Logout
                  </Button>
                </Box>
              </Paper>
            </>
          )}
        </Box>
      </Paper>

      {/* Shortcut Dialog */}
      <Dialog
        open={shortcutDialog}
        onClose={() => {
          setShortcutDialog(false);
          setNewShortcut('');
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Change Keyboard Shortcut</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: '#666', fontSize: 14 }}>
            Press the key combination you want to use.
            <br />
            Examples: <strong>F6</strong>, <strong>Ctrl+Shift+Space</strong>, <strong>Ctrl+M</strong>
          </Typography>
          <TextField
            fullWidth
            placeholder="Press keys..."
            value={newShortcut ? formatShortcut(newShortcut) : ''}
            onKeyDown={handleShortcutKeyDown}
            autoFocus
            InputProps={{
              readOnly: true,
              sx: {
                fontFamily: 'monospace',
                textAlign: 'center',
                fontSize: 16,
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#4f8cff',
                    borderWidth: 2,
                  },
                },
              },
            }}
          />
          <Typography sx={{ mt: 2, color: '#999', fontSize: 12 }}>
            Current: {formatShortcut(settings.shortcut)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShortcutDialog(false);
              setNewShortcut('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveShortcut}
            disabled={!newShortcut}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#333' } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Microphone Dialog */}
      <Dialog
        open={microphoneDialog}
        onClose={() => setMicrophoneDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Select Microphone</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <Select
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
            >
              <MenuItem value="default">Auto-detect (Default)</MenuItem>
              {microphones.map((mic) => (
                <MenuItem key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {microphones.length === 0 && (
            <Typography sx={{ mt: 2, color: '#999', fontSize: 13 }}>
              No microphones detected. Please check your permissions.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMicrophoneDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveMicrophone}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#333' } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Language Dialog */}
      <Dialog
        open={languageDialog}
        onClose={() => setLanguageDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Select Language</DialogTitle>
        <DialogContent>
          <RadioGroup
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <FormControlLabel
                key={lang.value}
                value={lang.value}
                control={<Radio />}
                label={lang.label}
                sx={{
                  border: '1px solid #e5e2de',
                  borderRadius: 2,
                  mb: 1,
                  mx: 0,
                  px: 1,
                  bgcolor: selectedLanguage === lang.value ? '#f5f3f0' : 'transparent',
                  '&:hover': { bgcolor: '#f5f3f0' },
                }}
              />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLanguageDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveLanguage}
            sx={{ bgcolor: '#1a1a1a', '&:hover': { bgcolor: '#333' } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Settings;
