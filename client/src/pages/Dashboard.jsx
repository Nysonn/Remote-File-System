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
import React from 'react';

function Dashboard() {
  const { user } = useAuthStore();
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
    fetchFiles();
  }, [fetchFiles]);

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
    setRemoteFileInfo(fileData);
    
    // You could implement logic here to download the file from the remote device
    // or process the file information in some way
    alert(`Remote file selected: ${fileData.filePath}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Files</h1>
          <p className="text-gray-600">
            {totalFiles} file{totalFiles !== 1 ? 's' : ''} stored
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          {/* Remote Device Selector */}
          <RemoteDeviceSelector onFileSelected={handleRemoteFileSelected} />
          
          {/* Existing Upload Button */}
          <label
            htmlFor="fileUpload"
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
          >
            <CloudArrowUpIcon className="mr-2 h-5 w-5" />
            Upload File
            <input
              id="fileUpload"
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* Remote File Selector (hidden until activated) */}
      <RemoteFileSelector />

      {/* Display remote file info if available */}
      {remoteFileInfo && (
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

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 animate-fade-in">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <div className="absolute inset-0 animate-pulse bg-primary-50 rounded-full"></div>
          </div>
          <p className="text-sm text-gray-500 mt-4 animate-pulse">Loading your files...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-6 bg-primary-50 rounded-full animate-pulse">
                <CloudIcon className="h-12 w-12 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No files uploaded yet</h3>
              <p className="text-sm text-gray-500">Upload your first file to get started</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {files.map((file) => (
                <li 
                  key={file.id} 
                  className="hover:bg-gray-50/50 transition-all duration-200 group"
                >
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
          )}
        </div>
      )}

      {/* Rename Modal */}
      {isRenaming && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsRenaming(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full animate-fade-in">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg font-semibold text-gray-900" id="modal-title">
                      Rename File
                    </h3>
                    <div className="mt-4">
                      <label htmlFor="newFilename" className="block text-sm font-medium text-gray-700">
                        New filename
                      </label>
                      <input
                        type="text"
                        name="newFilename"
                        id="newFilename"
                        value={newFilename}
                        onChange={(e) => setNewFilename(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={submitRename}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm transition-all duration-200"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRenaming(false);
                    setSelectedFile(null);
                    setNewFilename('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
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
    </div>
  );
}

export default Dashboard; 