import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';

const OFFICER_KEY = 'agriledger_officer';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [officer, setOfficer] = useState(() => {
    try { return JSON.parse(localStorage.getItem(OFFICER_KEY)); } catch { return null; }
  });

  const logout = () => {
    setToken(null);
    localStorage.removeItem(OFFICER_KEY);
    setOfficer(null);
  };

  useEffect(() => {
    window.addEventListener('agriledger:logout', logout);
    return () => window.removeEventListener('agriledger:logout', logout);
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.token);
    localStorage.setItem(OFFICER_KEY, JSON.stringify(data.officer));
    setOfficer(data.officer);
  };

  return <AuthContext.Provider value={{ officer, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function RequireAuth({ children }) {
  const { officer } = useAuth();
  return officer && getToken() ? children : <Navigate to="/login" replace />;
}
