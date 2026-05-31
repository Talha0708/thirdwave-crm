import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Derived state for cleaner UI logic
    const isAuthenticated = !!user;

    // Hydrate from localStorage on mount
    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('token');
            const storedUser  = localStorage.getItem('user');
            if (storedToken && storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (err) {
            console.error('Session restoration failed:', err);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user',  JSON.stringify(res.data.user));
            setUser(res.data.user);
            return res.data;
        } catch (err) {
            // Error টি কম্পোনেন্টে পাঠানোর জন্য re-throw করছি
            throw err;
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        // Hard reset
        window.location.replace('/auth');
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};