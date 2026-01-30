import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved user session
    const savedUser = localStorage.getItem('pabbly_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Simulate login - replace with actual API call
    const userData = {
      id: '1',
      name: email.split('@')[0],
      email: email,
      plan: 'Pro Trial',
      daysUsed: 6,
      totalDays: 14,
    };
    setUser(userData);
    localStorage.setItem('pabbly_user', JSON.stringify(userData));
    return { success: true };
  };

  const signup = async (name, email, password) => {
    // Simulate signup - replace with actual API call
    const userData = {
      id: '1',
      name: name,
      email: email,
      plan: 'Pro Trial',
      daysUsed: 1,
      totalDays: 14,
    };
    setUser(userData);
    localStorage.setItem('pabbly_user', JSON.stringify(userData));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pabbly_user');
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
