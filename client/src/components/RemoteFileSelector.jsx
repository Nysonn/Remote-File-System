import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { DocumentIcon, FolderIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Reuse the same socket instance from RemoteDeviceSelector
let socket;

function getSocket() {
  if (!socket) {
    socket = io(API_URL);
  }
  return socket;
}

function RemoteFileSelector() {
  const [isActive, setIsActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();

    // Register this device when component mounts
    const deviceInfo = {
      name: window.navigator.platform || 'Unknown Device',
      type: detectDeviceType(),
      isCurrentDevice: true
    };
    
    socket.emit('registerDevice', deviceInfo);

    // Listen for folder opened events
    socket.on('folderOpened', (data) => {
      console.log('Folder opened:', data.folderPath);
      setIsActive(true);
      
      // Automatically trigger file selection dialog
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    });

    return () => {
      // Clean up listeners when component unmounts
      socket.off('folderOpened');
    };
  }, []);

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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Send file information back to the requesting device
    const socket = getSocket();
    socket.emit('fileSelected', {
      filePath: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified
    });
  };

  const handleCancel = () => {
    setIsActive(false);
    setSelectedFile(null);
  };

  const handleSendFile = () => {
    // In a real implementation, you might want to upload the file to a server
    // or establish a direct connection to transfer the file
    alert('File selection confirmed. In a complete implementation, this would transfer the file.');
    setIsActive(false);
    setSelectedFile(null);
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
          >
            Cancel
          </button>
          <button
            onClick={handleSendFile}
            disabled={!selectedFile}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
              selectedFile
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-blue-300 cursor-not-allowed'
            }`}
          >
            Send File
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