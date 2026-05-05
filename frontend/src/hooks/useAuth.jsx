import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authService from '../services/auth';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await authService.me();
        if (mounted && res?.success) setUser(res.data.user);
      } catch (err) {
        // not authenticated
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  async function handleSignup({ name, email, password }) {
    try {
      const res = await authService.signup({ name, email, password });
      if (res?.success) {
        setUser(res.data.user);
        toast.success('Signup successful');
        return { ok: true };
      }
      toast.error(res.message || 'Signup failed');
      return { ok: false, message: res.message };
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Signup failed');
      return { ok: false, message: err.message };
    }
  }

  async function handleLogin({ email, password }) {
    try {
      const res = await authService.login({ email, password });
      if (res?.success) {
        setUser(res.data.user);
        toast.success('Login successful');
        return { ok: true };
      }
      toast.error(res.message || 'Login failed');
      return { ok: false, message: res.message };
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Login failed');
      return { ok: false, message: err.message };
    }
  }

  async function handleLogout() {
    try {
      const res = await authService.logout();
      setUser(null);
      toast.success(res?.message || 'Logged out');
      return { ok: true };
    } catch (err) {
      toast.error('Logout failed');
      return { ok: false };
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login: handleLogin, signup: handleSignup, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
