import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ComputerDesktopIcon, DevicePhoneMobileIcon, ServerIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import React from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create a singleton socket instance
let socket;

function getSocket() {
  if (!socket) {
    socket = io(API_URL, {
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
    
    socket.on('connect_timeout', () => {
      console.error('Socket connection timeout');
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket reconnection attempt ${attemptNumber}`);
    });
    
    socket.on('reconnect_error', (err) => {
      console.error('Socket reconnection error:', err);
    });
    
    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
    });
    
    socket.on('connect', () => {
      console.log('Socket connected with ID:', socket.id);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  }
  return socket;
}

function RemoteDeviceSelector({ onDeviceSelect, onFileSelected }) {
  const [devices, setDevices] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    const socket = getSocket();

    // Check connection status
    if (socket.connected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('connecting');
      socket.connect();
    }

    // Register this device when component mounts
    const deviceInfo = {
      name: window.navigator.platform || 'Unknown Device',
      type: detectDeviceType(),
      isCurrentDevice: true,
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
      setConnectionStatus('connected');
      registerDevice();
      // Request device list
      socket.emit('discoverDevices');
    });
    
    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setDevices([]);
    });

    // Listen for device registration confirmation
    socket.on('deviceRegistered', (data) => {
      console.log('Device registered:', data);
      // Request device list
      socket.emit('discoverDevices');
    });

    // Listen for device list updates
    socket.on('deviceList', (deviceList) => {
      console.log('Received device list:', deviceList);
      // Filter out current device
      const otherDevices = deviceList.filter(device => !device.isCurrentDevice && device.id !== socket.id);
      setDevices(otherDevices);
      setIsRefreshing(false);
    });

    // Listen for file selection events
    socket.on('fileSelected', (data) => {
      console.log('File selection event received:', data);
      if (onFileSelected) {
        onFileSelected(data);
      }
      setIsOpen(false);
    });

    // Listen for folder opened events
    socket.on('folderOpened', (data) => {
      console.log('Remote folder opened:', data.folderPath);
    });

    // Listen for folder open errors
    socket.on('folderOpenError', (data) => {
      console.error('Error opening remote folder:', data.error);
      alert(`Failed to open folder on remote device: ${data.error}`);
      setIsConnecting(false);
    });

    // Test connection with ping
    socket.emit('ping', {}, (response) => {
      if (response && response.success) {
        console.log('Ping successful:', response);
      }
    });

    // Refresh device list periodically
    const refreshInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('discoverDevices');
      }
    }, 10000);

    return () => {
      // Clean up listeners when component unmounts
      socket.off('deviceList');
      socket.off('fileSelected');
      socket.off('folderOpened');
      socket.off('folderOpenError');
      socket.off('deviceRegistered');
      clearInterval(refreshInterval);
    };
  }, [onFileSelected]);

  // Manually refresh device list
  const refreshDeviceList = () => {
    setIsRefreshing(true);
    const socket = getSocket();
    socket.emit('discoverDevices');
    
    // Timeout to reset refreshing state if no response
    setTimeout(() => {
      setIsRefreshing(false);
    }, 5000);
  };

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

  // Get icon based on device type
  function getDeviceIcon(type) {
    switch (type) {
      case 'mobile':
        return <DevicePhoneMobileIcon className="h-5 w-5 text-gray-500" />;
      case 'desktop':
        return <ComputerDesktopIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ServerIcon className="h-5 w-5 text-gray-500" />;
    }
  }

  // Handle device selection
  const handleDeviceSelect = (device) => {
    setSelectedDevice(device);
    setIsConnecting(true);

    // Send command to open Documents folder on selected device
    const socket = getSocket();
    
    // Default paths for different OS types
    let folderPath;
    if (device.name.includes('Win')) {
      folderPath = 'C:\\Users\\Public\\Documents';
    } else if (device.name.includes('Mac')) {
      folderPath = '/Users/Shared/Documents';
    } else {
      folderPath = '/home/Documents';
    }

    console.log(`Sending openFolder command to device ${device.id}`);
    socket.emit('openFolder', { 
      folderPath,
      targetDevice: device.id
    });

    // Notify parent component
    if (onDeviceSelect) {
      onDeviceSelect(device);
    }

    // Reset connecting state after a delay
    setTimeout(() => {
      setIsConnecting(false);
    }, 5000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <ServerIcon className="mr-2 h-5 w-5" />
        Select Remote Device
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-gray-700 border-b flex justify-between items-center">
              <span>Available Devices ({devices.length})</span>
              <button 
                onClick={refreshDeviceList}
                className="text-blue-600 hover:text-blue-800"
                disabled={isRefreshing}
              >
                <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {connectionStatus !== 'connected' && (
              <div className="px-4 py-2 text-sm text-yellow-700 bg-yellow-50">
                {connectionStatus === 'connecting' 
                  ? 'Connecting to server...' 
                  : 'Disconnected from server. Trying to reconnect...'}
              </div>
            )}
            
            {devices.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                No devices found. Make sure other devices are connected to the same network and have the application open.
                <div className="mt-2 text-xs text-gray-400">
                  Connection status: {connectionStatus}
                </div>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => handleDeviceSelect(device)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    disabled={isConnecting}
                  >
                    {getDeviceIcon(device.type)}
                    <div className="ml-3">
                      <div>{device.name}</div>
                      <div className="text-xs text-gray-500">
                        {device.ip ? `IP: ${device.ip}` : ''}
                        {device.browser ? ` • ${device.browser}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isConnecting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-center">Connecting to {selectedDevice?.name}...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RemoteDeviceSelector; 