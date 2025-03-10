import { create } from 'zustand';
import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create a singleton socket instance
let socket;

function getSocket() {
  if (!socket) {
    socket = io(API_URL);
  }
  return socket;
}

export const useFileStore = create((set, get) => ({
  files: [],
  totalFiles: 0,
  currentPage: 1,
  totalPages: 1,
  isLoading: false,
  error: null,
  connectedDevices: [],

  // Initialize socket connection and listeners
  initSocketConnection: () => {
    const socket = getSocket();
    
    // Listen for device list updates
    socket.on('deviceList', (deviceList) => {
      set({ connectedDevices: deviceList });
    });
    
    // Listen for file selection events
    socket.on('fileSelected', (fileData) => {
      // You could implement logic here to handle the selected file
      console.log('Remote file selected:', fileData);
    });
    
    // Register this device
    const deviceInfo = {
      name: window.navigator.platform || 'Unknown Device',
      type: detectDeviceType(),
      isCurrentDevice: true
    };
    
    socket.emit('registerDevice', deviceInfo);
  },

  // Get connected devices
  getConnectedDevices: () => {
    return get().connectedDevices;
  },

  // Send command to open folder on remote device
  openRemoteFolder: (deviceId, folderPath) => {
    const socket = getSocket();
    socket.emit('openFolder', { 
      folderPath,
      targetDevice: deviceId
    });
  },

  fetchFiles: async (page = 1, limit = 10) => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/files`, {
        params: { page, limit },
        headers: { Authorization: `Bearer ${token}` }
      });

      set({
        files: response.data.files,
        totalFiles: response.data.totalCount,
        currentPage: page,
        totalPages: response.data.totalPages,
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch files'
      });
    }
  },

  uploadFile: async (file) => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_URL}/api/files/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Update files list with new file
      const files = [...get().files];
      files.unshift(response.data);
      
      set({
        files,
        totalFiles: get().totalFiles + 1,
        isLoading: false,
        error: null
      });

      return { success: true, file: response.data };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to upload file'
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  downloadFile: async (fileId, filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/files/${fileId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to download file'
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  deleteFile: async (fileId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove file from state
      const files = get().files.filter(file => file.id !== fileId);
      set({
        files,
        totalFiles: get().totalFiles - 1,
        error: null
      });

      return { success: true };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to delete file'
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  renameFile: async (fileId, newFilename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/api/files/${fileId}/rename`,
        { newFilename },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Update file in state
      const files = get().files.map(file =>
        file.id === fileId ? response.data : file
      );
      
      set({
        files,
        error: null
      });

      return { success: true, file: response.data };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to rename file'
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  clearError: () => set({ error: null }),

  // Process a remote file
  processRemoteFile: async (fileData) => {
    set({ isLoading: true });
    try {
      // In a real implementation, you would handle the remote file here
      // For example, you might download it from the remote device or
      // process its metadata
      
      // For now, we'll just simulate a successful operation
      setTimeout(() => {
        set({ isLoading: false });
      }, 1000);
      
      return { success: true, message: 'Remote file processed successfully' };
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to process remote file'
      });
      return { success: false, error: error.response?.data?.message };
    }
  }
}));

// Utility function to detect device type
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