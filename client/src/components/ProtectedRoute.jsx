import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import React from 'react';
import { CloudIcon } from '@heroicons/react/24/outline';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, isGuest } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="relative">
          <div className="absolute inset-0 bg-primary-50 blur-3xl"></div>
          <div className="relative">
            <div className="flex flex-col items-center">
              <div className="animate-bounce">
                <CloudIcon className="h-16 w-16 text-primary" />
              </div>
              <div className="mt-4 flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="mt-4 text-sm text-gray-500 animate-pulse">Loading your files...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Allow both authenticated users and guests to access protected routes
  if (!isAuthenticated) {
    // Check if this is a remote access request from URL
    const urlParams = new URLSearchParams(window.location.search);
    const remoteAccess = urlParams.get('remote_access');
    
    if (remoteAccess === 'true') {
      // Create a guest session and continue
      useAuthStore.getState().createGuestSession();
      return children;
    }
    
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute; 