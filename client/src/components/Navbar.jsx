import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

function Navbar() {
  const { user, logout } = useAuthStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
  };

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm backdrop-blur-md bg-white/90 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <CloudIcon className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-700">
                  Remote File System
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:items-center space-x-4">
              <Link
                to="/"
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-primary-50"
              >
                Dashboard
              </Link>
            </div>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 text-gray-700 hover:text-primary hover:bg-primary-50 p-2 rounded-lg transition-all duration-200"
              >
                <span className="text-sm font-medium">{user?.name}</span>
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-medium shadow-lg shadow-primary-200">
                  {user?.name?.charAt(0)}
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 transform opacity-100 scale-100 transition-all duration-200 animate-fade-in">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700">
                      <div className="font-medium text-gray-900">{user?.name}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{user?.email}</div>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary flex items-center transition-colors duration-200"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-700 hover:text-primary hover:bg-primary-50 transition-colors duration-200"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" />
              ) : (
                <Bars3Icon className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-100 animate-slide-up">
          <div className="pt-2 pb-3 space-y-1 px-4">
            <Link
              to="/"
              className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors duration-200"
            >
              <HomeIcon className="h-5 w-5 mr-2" />
              Dashboard
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="px-4 py-2">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-white font-medium shadow-lg shadow-primary-200">
                    {user?.name?.charAt(0)}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user?.name}</div>
                  <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                </div>
              </div>
              <div className="mt-3">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors duration-200"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar; 