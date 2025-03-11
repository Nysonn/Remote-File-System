import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { DocumentIcon, FolderIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import React from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Reuse the same socket instance from RemoteDeviceSelector
let socket;

function getSocket() {
  if (!socket) {
    socket = io(API_URL, {
      rejectUnauthorized: false, // Ignore SSL verification for testing
      transports: ['websocket', 'polling'],
      secure: false, // Allow insecure connections for testing
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      withCredentials: true
    });
    // Store the socket instance globally for access from other components
    window.socketInstance = socket;
    
    // Setup global error handlers
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
  }
  return socket;
}

function RemoteFileSelector() {
  const [isActive, setIsActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceDevice, setSourceDevice] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);
  const { isGuest } = useAuthStore();

  useEffect(() => {
    const socket = getSocket();

    // Register this device when component mounts
    const deviceInfo = {
      name: window.navigator.platform || 'Unknown Device',
      type: detectDeviceType(),
      isCurrentDevice: true,
      isGuest: isGuest,
      browser: detectBrowser(),
      timestamp: new Date().toISOString()
    };
    
    // Register device when connected
    const registerDevice = () => {
      console.log('Registering device with socket ID:', socket.id);
      socket.emit('registerDevice', deviceInfo);
    };
    
    if (socket.connected) {
      registerDevice();
    }
    
    socket.on('connect', () => {
      registerDevice();
    });

    // Listen for folder opened events
    socket.on('folderOpened', (data) => {
      console.log('Folder opened event received:', data);
      setIsActive(true);
      setSourceDevice(data.sourceDevice);
      
      // Automatically trigger file selection dialog
      if (fileInputRef.current) {
        setTimeout(() => {
          fileInputRef.current.click();
        }, 500);
      }
    });

    return () => {
      // Clean up listeners when component unmounts
      socket.off('folderOpened');
    };
  }, [isGuest]);

  // If this is a guest user, we don't need to show the file selector UI
  // as it's handled directly in the Dashboard component
  if (isGuest) {
    return null;
  }

  // Detect device type based on user agent
  function detectDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod|windows phone/i.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  // Detect browser
  function detectBrowser() {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf("Chrome") > -1) return "Chrome";
    if (userAgent.indexOf("Safari") > -1) return "Safari";
    if (userAgent.indexOf("Firefox") > -1) return "Firefox";
    if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident") > -1) return "IE";
    if (userAgent.indexOf("Edge") > -1) return "Edge";
    return "Unknown";
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Send file information back to the requesting device
    sendFileInfo(file);
  };

  const sendFileInfo = (file) => {
    setIsSending(true);
    
    const socket = getSocket();
    
    // Create file data to send
    const fileData = {
      filePath: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified,
      // Add a timestamp to ensure uniqueness
      timestamp: new Date().toISOString()
    };
    
    // If we know which device requested the file, send it directly to that device
    if (sourceDevice) {
      fileData.targetDevice = sourceDevice;
    }
    
    console.log('Sending file selection event:', fileData);
    
    // Try sending multiple times to ensure delivery
    socket.emit('fileSelected', fileData);
    
    // Send again after a short delay
    setTimeout(() => {
      socket.emit('fileSelected', fileData);
      setIsSending(false);
    }, 1000);
  };

  const handleCancel = () => {
    setIsActive(false);
    setSelectedFile(null);
    setSourceDevice(null);
  };

  const handleSendFile = () => {
    if (!selectedFile) return;
    
    setIsSending(true);
    
    // Send file information back to the requesting device
    sendFileInfo(selectedFile);
    
    alert('File selection confirmed. The file information has been sent to the requesting device.');
    setIsActive(false);
    setSelectedFile(null);
    setSourceDevice(null);
    setIsSending(false);
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Remote File Selection</h3>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          Another device is requesting you to select a file. Please choose a file to share.
        </p>
        
        <div className="mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          
          {selectedFile ? (
            <div className="border rounded-md p-3 flex items-center">
              <DocumentIcon className="h-8 w-8 text-blue-500 mr-3" />
              <div className="overflow-hidden">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center"
            >
              <FolderIcon className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">Click to select a file</p>
              <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
            </button>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            onClick={handleSendFile}
            disabled={!selectedFile || isSending}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md flex items-center ${
              selectedFile && !isSending
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-blue-300 cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              'Send File'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default RemoteFileSelector; 