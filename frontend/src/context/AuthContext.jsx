import React, { createContext, useContext, useState } from 'react';

// Context তৈরি করা হলো
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // লোকাল স্টোরেজ থেকে সিকিউরলি ডেটা নেওয়ার ফাংশন
  const [user, setUser] = useState(() => {
    try {
      const data = localStorage.getItem('user');
      return data && data !== 'undefined' && data !== 'null' ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  });
  
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = (userData, authToken) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    setUser(userData);
    setToken(authToken);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// কাস্টম হুক (Zustand এর বিকল্প)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};