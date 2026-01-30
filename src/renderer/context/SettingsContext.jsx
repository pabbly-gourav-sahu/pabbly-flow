import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SettingsContext = createContext(null);

const defaultSettings = {
  shortcut: 'CommandOrControl+Shift+.',
  whisperModel: 'base',
  language: 'auto',
  sttServerUrl: 'http://localhost:8000/transcribe',
  autoPaste: true,
  translateToEnglish: false,
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);

  // Load settings from electron-store
  const loadSettings = useCallback(async () => {
    try {
      if (window.electronAPI?.getSettings) {
        const savedSettings = await window.electronAPI.getSettings();
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  // Load history from electron-store (persistent)
  const loadHistory = useCallback(async () => {
    try {
      if (window.electronAPI?.getHistory) {
        const savedHistory = await window.electronAPI.getHistory();
        setHistory(savedHistory || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadHistory();

    // Listen for recording state changes from main process
    if (window.electronAPI?.onRecordingState) {
      window.electronAPI.onRecordingState((data) => {
        setIsRecording(data.isRecording);
      });
    }

    // Listen for new transcriptions from main process
    if (window.electronAPI?.onTranscription) {
      window.electronAPI.onTranscription(async (data) => {
        // Add to electron-store and update state
        if (window.electronAPI?.addToHistory) {
          const updatedHistory = await window.electronAPI.addToHistory({
            text: data.text,
            timestamp: data.timestamp,
          });
          setHistory(updatedHistory);
        }
      });
    }

    return () => {
      window.electronAPI?.removeRecordingStateListener?.();
      window.electronAPI?.removeTranscriptionListener?.();
    };
  }, [loadSettings, loadHistory]);

  // Update settings in electron-store
  const updateSettings = async (newSettings) => {
    try {
      if (window.electronAPI?.saveSettings) {
        await window.electronAPI.saveSettings(newSettings);
      }
      setSettings(newSettings);
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return { success: false, error };
    }
  };

  // Add to history (electron-store)
  const addToHistory = async (text) => {
    try {
      if (window.electronAPI?.addToHistory) {
        const updatedHistory = await window.electronAPI.addToHistory({
          text,
          timestamp: new Date().toISOString(),
        });
        setHistory(updatedHistory);
      }
    } catch (error) {
      console.error('Failed to add to history:', error);
    }
  };

  // Clear history (electron-store)
  const clearHistory = async () => {
    try {
      if (window.electronAPI?.clearHistory) {
        await window.electronAPI.clearHistory();
      }
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  // Calculate stats from history
  const getStats = useCallback(() => {
    const totalWords = history.reduce((acc, item) => {
      return acc + (item.text?.split(/\s+/).filter(Boolean).length || 0);
    }, 0);

    // Calculate streak
    const today = new Date().toDateString();
    const hasToday = history.some(
      (item) => new Date(item.timestamp).toDateString() === today
    );

    return {
      totalWords,
      streak: hasToday ? 1 : 0,
      wpm: history.length > 0 ? Math.round(totalWords / history.length * 10) : 0,
    };
  }, [history]);

  const toggleRecording = () => {
    if (window.electronAPI?.toggleRecording) {
      window.electronAPI.toggleRecording();
    }
  };

  const value = {
    settings,
    loading,
    updateSettings,
    history,
    addToHistory,
    clearHistory,
    getStats,
    isRecording,
    toggleRecording,
  };

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
