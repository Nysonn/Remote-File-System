import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  isGuest: false,

  checkAuth: async () => {
    // Check if this is a remote access request
    const urlParams = new URLSearchParams(window.location.search);
    const remoteAccess = urlParams.get('remote_access');
    
    if (remoteAccess === 'true') {
      // Set up guest authentication
      set({
        user: { name: 'Remote User', email: 'remote@guest.com', role: 'guest' },
        isAuthenticated: true,
        isGuest: true,
        isLoading: false
      });
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      localStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  },

  // Create a guest session for remote access
  createGuestSession: () => {
    set({
      user: { name: 'Remote User', email: 'remote@guest.com', role: 'guest' },
      isAuthenticated: true,
      isGuest: true,
      isLoading: false
    });
    return { success: true };
  },

  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);

      set({
        user,
        token,
        isAuthenticated: true,
        isGuest: false
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      };
    }
  },

  register: async (name, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);

      set({
        user,
        token,
        isAuthenticated: true,
        isGuest: false
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed'
      };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isGuest: false
    });
  }
})); 