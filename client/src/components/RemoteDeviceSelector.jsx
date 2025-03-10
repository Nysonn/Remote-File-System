import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ComputerDesktopIcon, DevicePhoneMobileIcon, ServerIcon } from '@heroicons/react/24/outline';
import React from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create a singleton socket instance
let socket;

function getSocket() {
  if (!socket) {
    socket = io(API_URL);
  }
  return socket;
}

function RemoteDeviceSelector({ onDeviceSelect, onFileSelected }) {
  const [devices, setDevices] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    // Register this device when component mounts
    const deviceInfo = {
      name: window.navigator.platform || 'Unknown Device',
      type: detectDeviceType(),
      isCurrentDevice: true
    };
    
    socket.emit('registerDevice', deviceInfo);

    // Listen for device list updates
    socket.on('deviceList', (deviceList) => {
      // Filter out current device
      const otherDevices = deviceList.filter(device => !device.isCurrentDevice);
      setDevices(otherDevices);
    });

    // Listen for file selection events
    socket.on('fileSelected', (data) => {
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
    });

    return () => {
      // Clean up listeners when component unmounts
      socket.off('deviceList');
      socket.off('fileSelected');
      socket.off('folderOpened');
      socket.off('folderOpenError');
    };
  }, [onFileSelected]);

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
    }, 2000);
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
            <div className="px-4 py-2 text-sm text-gray-700 border-b">
              Available Devices ({devices.length})
            </div>
            
            {devices.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                No devices found. Make sure other devices are connected to the same network and have the application open.
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
                    <span className="ml-3">{device.name}</span>
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