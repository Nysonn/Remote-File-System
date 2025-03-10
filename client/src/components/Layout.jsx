import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import Navbar from './Navbar';
import io from 'socket.io-client';
import { useFileStore } from '../stores/fileStore';
import React from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function Layout() {
  const { user } = useAuthStore();
  const { fetchFiles } = useFileStore();

  useEffect(() => {
    const socket = io(API_URL, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('fileUploaded', (data) => {
      if (data.owner === user?.email) {
        fetchFiles();
      }
    });

    socket.on('fileDeleted', (data) => {
      if (data.owner === user?.email) {
        fetchFiles();
      }
    });

    socket.on('fileRenamed', (data) => {
      if (data.owner === user?.email) {
        fetchFiles();
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    return () => {
      socket.disconnect();
    };
  }, [user, fetchFiles]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-50 blur-3xl -z-10"></div>
          <div className="relative z-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Layout; 