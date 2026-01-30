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

  // Delete single history item
  const deleteHistoryItem = async (id) => {
    try {
      if (window.electronAPI?.deleteHistoryItem) {
        const updatedHistory = await window.electronAPI.deleteHistoryItem(id);
        setHistory(updatedHistory);
      }
    } catch (error) {
      console.error('Failed to delete history item:', error);
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

    // Calculate consecutive day streak
    const uniqueDates = [...new Set(
      history.map((item) => new Date(item.timestamp).toDateString())
    )];
    const dateTimes = uniqueDates.map((d) => new Date(d).getTime());
    dateTimes.sort((a, b) => b - a); // newest first

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayMs = 86400000;

    for (let i = 0; i < dateTimes.length; i++) {
      const expected = today.getTime() - i * dayMs;
      if (dateTimes[i] === expected) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalWords,
      streak,
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
    deleteHistoryItem,
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
