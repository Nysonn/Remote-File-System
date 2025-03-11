import { useEffect, useState } from 'react';
import { useFileStore } from '../stores/fileStore';
import { useAuthStore } from '../stores/authStore';
import {
  DocumentIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PencilIcon,
  CloudArrowUpIcon,
  FolderIcon,
  XMarkIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import RemoteDeviceSelector from '../components/RemoteDeviceSelector';
import RemoteFileSelector from '../components/RemoteFileSelector';
import RemoteAccessLink from '../components/RemoteAccessLink';
import React from 'react';
import io from 'socket.io-client';

function Dashboard() {
  const { user, isGuest } = useAuthStore();
  const {
    files,
    totalFiles,
    currentPage,
    totalPages,
    isLoading,
    error,
    fetchFiles,
    uploadFile,
    downloadFile,
    deleteFile,
    renameFile
  } = useFileStore();

  const [selectedFile, setSelectedFile] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [remoteFileInfo, setRemoteFileInfo] = useState(null);

  useEffect(() => {
    if (!isGuest) {
      fetchFiles();
    }
  }, [fetchFiles, isGuest]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await uploadFile(file);
      if (!result.success) {
        alert(result.error);
      }
    } catch (error) {
      alert('Failed to upload file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    try {
      const result = await uploadFile(file);
      if (!result.success) {
        alert(result.error);
      }
    } catch (error) {
      alert('Failed to upload file');
    }
  };

  const handleDownload = async (file) => {
    try {
      const result = await downloadFile(file.id, file.filename);
      if (!result.success) {
        alert(result.error);
      }
    } catch (error) {
      alert('Failed to download file');
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete ${file.filename}?`)) {
      return;
    }

    try {
      const result = await deleteFile(file.id);
      if (!result.success) {
        alert(result.error);
      }
    } catch (error) {
      alert('Failed to delete file');
    }
  };

  const handleRename = async (file) => {
    setSelectedFile(file);
    setNewFilename(file.filename);
    setIsRenaming(true);
  };

  const submitRename = async () => {
    if (!selectedFile || !newFilename) return;

    try {
      const result = await renameFile(selectedFile.id, newFilename);
      if (result.success) {
        setIsRenaming(false);
        setSelectedFile(null);
        setNewFilename('');
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('Failed to rename file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle remote file selection
  const handleRemoteFileSelected = (fileData) => {
    console.log('Remote file selected in Dashboard:', fileData);
    
    // Create a unique key for this file to avoid duplicates
    const fileKey = `${fileData.filePath}-${fileData.timestamp || new Date().toISOString()}`;
    
    // Check if we already have this file info (prevent duplicates)
    if (remoteFileInfo && remoteFileInfo.fileKey === fileKey) {
      console.log('Duplicate file selection event, ignoring');
      return;
    }
    
    // Add the unique key to the file data
    const enhancedFileData = {
      ...fileData,
      fileKey
    };
    
    setRemoteFileInfo(enhancedFileData);
    
    // Show a notification
    alert(`Remote file selected: ${fileData.filePath}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isGuest ? 'Remote File Selection' : 'My Files'}
          </h1>
          <p className="text-gray-600">
            {isGuest 
              ? 'Select files to share with the remote device' 
              : `${totalFiles} file${totalFiles !== 1 ? 's' : ''} stored`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          {/* Only show Remote Device Selector for regular users, not guests */}
          {!isGuest && (
            <RemoteDeviceSelector onFileSelected={handleRemoteFileSelected} />
          )}
          
          {/* Upload Button - available for all users */}
          <label
            htmlFor="fileUpload"
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
          >
            <CloudArrowUpIcon className="mr-2 h-5 w-5" />
            {isGuest ? 'Select File to Share' : 'Upload File'}
            <input
              id="fileUpload"
              type="file"
              className="hidden"
              onChange={isGuest ? handleFileChange : handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* Remote File Selector - always visible for guest users */}
      {isGuest ? (
        <RemoteFileSelector />
      ) : null}

      {/* Show RemoteAccessLink only for regular users, not guests */}
      {!isGuest && <RemoteAccessLink />}

      {/* Display remote file info if available - only for regular users */}
      {remoteFileInfo && !isGuest && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex justify-between items-start">
            <div className="flex items-start">
              <CloudIcon className="h-6 w-6 text-blue-500 mr-3 mt-1" />
              <div>
                <h3 className="font-medium">Remote File Selected</h3>
                <p className="text-sm text-gray-600">{remoteFileInfo.filePath}</p>
                {remoteFileInfo.fileSize && (
                  <p className="text-xs text-gray-500">
                    Size: {formatFileSize(remoteFileInfo.fileSize)}
                    {remoteFileInfo.fileType && ` • Type: ${remoteFileInfo.fileType}`}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setRemoteFileInfo(null)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              onClick={() => {
                // Here you would implement the logic to process the remote file
                alert('Processing remote file...');
                setRemoteFileInfo(null);
              }}
            >
              Process File
            </button>
          </div>
        </div>
      )}

      {/* Only show file list for regular users, not guests */}
      {!isGuest && (
        <>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by uploading a file.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {files.map((file) => (
                  <li key={file.id} className="hover:bg-gray-50/50 transition-all duration-200 group">
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="p-3 rounded-xl bg-primary-50 group-hover:bg-primary-100 transition-colors duration-200">
                          <DocumentIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="ml-4 truncate">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary transition-colors duration-200">
                            {file.filename}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-2 rounded-lg hover:bg-primary-50 text-gray-600 hover:text-primary transition-all duration-200"
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleRename(file)}
                          className="p-2 rounded-lg hover:bg-primary-50 text-gray-600 hover:text-primary transition-all duration-200"
                          title="Rename"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-all duration-200"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="inline-flex rounded-xl shadow-lg bg-white border border-gray-200 p-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => fetchFiles(page)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      currentPage === page
                        ? 'bg-primary text-white shadow-lg hover:bg-primary-700'
                        : 'bg-transparent text-gray-700 hover:bg-primary-50 hover:text-primary'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Add a new handler for guest file selection
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Get the socket instance
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
  
  console.log('Guest sending file selection event:', fileData);
  
  // Send file information to all connected devices
  socket.emit('fileSelected', fileData);
  
  // Send again after a short delay to ensure delivery
  setTimeout(() => {
    socket.emit('fileSelected', fileData);
  }, 1000);
  
  alert(`File "${file.name}" selected for sharing`);
};

// Helper function to get socket instance
function getSocket() {
  // Reuse the socket instance from the RemoteDeviceSelector component
  if (window.socketInstance) {
    return window.socketInstance;
  }
  
  // If not available, create a new one
  const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
    rejectUnauthorized: false, // Ignore SSL verification for testing
    transports: ['websocket', 'polling'],
    secure: false, // Allow insecure connections for testing
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });
  
  window.socketInstance = socket;
  
  // Setup event listeners
  socket.on('connect', () => {
    console.log('Socket connected in Dashboard with ID:', socket.id);
    
    // Register this device
    socket.emit('registerDevice', {
      name: window.navigator.platform || 'Unknown Device',
      type: detectDeviceType(),
      isCurrentDevice: true,
      isGuest: useAuthStore.getState().isGuest,
      browser: detectBrowser(),
      timestamp: new Date().toISOString()
    });
  });
  
  return socket;
}

// Detect device type
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

export default Dashboard; 