import { useState, useEffect } from 'react';
import { ClipboardDocumentIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import React from 'react';

function RemoteAccessLink() {
  const [remoteLink, setRemoteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [ipAddresses, setIpAddresses] = useState([]);
  const [selectedIp, setSelectedIp] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch the server's IP addresses
    fetchIpAddresses();
  }, []);

  // Function to fetch IP addresses
  const fetchIpAddresses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to get IP addresses from the server
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/network/ip`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Received IP addresses:', data.ipAddresses);
        
        // Filter out localhost and add it at the end
        const filteredIps = data.ipAddresses.filter(ip => ip !== '127.0.0.1' && ip !== 'localhost');
        
        // Add the current hostname
        const currentHostname = window.location.hostname;
        if (currentHostname !== 'localhost' && !filteredIps.includes(currentHostname)) {
          filteredIps.push(currentHostname);
        }
        
        // Add localhost at the end
        if (!filteredIps.includes('localhost')) {
          filteredIps.push('localhost');
        }
        
        setIpAddresses(filteredIps);
        
        // Set the first IP as the default (preferring non-localhost)
        if (filteredIps.length > 0) {
          setSelectedIp(filteredIps[0]);
          generateRemoteLink(filteredIps[0]);
        }
        
        setIsLoading(false);
      } else {
        throw new Error('Failed to fetch IP addresses from server');
      }
    } catch (error) {
      console.error('Error fetching IP addresses:', error);
      setError('Failed to fetch IP addresses. Using current hostname as fallback.');
      
      // Fallback to using the current hostname
      const hostname = window.location.hostname;
      const ipList = [hostname];
      
      // Add the IP from the URL if it looks like an IP address
      const urlIp = extractIpFromUrl(window.location.href);
      if (urlIp && !ipList.includes(urlIp)) {
        ipList.unshift(urlIp); // Add at the beginning
      }
      
      setIpAddresses(ipList);
      setSelectedIp(ipList[0]);
      generateRemoteLink(ipList[0]);
      setIsLoading(false);
    }
  };

  // Extract IP address from URL if present
  const extractIpFromUrl = (url) => {
    const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
    const match = url.match(ipRegex);
    return match ? match[0] : null;
  };

  // Generate remote link based on selected IP
  const generateRemoteLink = (ip) => {
    const port = window.location.port;
    const protocol = window.location.protocol;
    
    // Create the full URL with the remote_access parameter
    const baseUrl = `${protocol}//${ip}${port ? ':' + port : ''}`;
    const remoteAccessUrl = `${baseUrl}?remote_access=true`;
    
    setRemoteLink(remoteAccessUrl);
  };

  // Handle IP selection change
  const handleIpChange = (e) => {
    const ip = e.target.value;
    setSelectedIp(ip);
    generateRemoteLink(ip);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(remoteLink);
    setCopied(true);
    
    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium text-gray-900">Remote Access Link</h3>
        <button 
          onClick={fetchIpAddresses} 
          className="text-blue-600 hover:text-blue-800"
          disabled={isLoading}
        >
          <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Share this link with other devices to allow them to connect without authentication.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {ipAddresses.length > 1 && (
        <div className="mb-4">
          <label htmlFor="ipSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Select Network Interface:
          </label>
          <select
            id="ipSelect"
            value={selectedIp}
            onChange={handleIpChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {ipAddresses.map((ip) => (
              <option key={ip} value={ip}>
                {ip}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div className="flex items-center">
        <input
          type="text"
          value={remoteLink}
          readOnly
          className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={copyToClipboard}
          className="p-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {copied ? (
            <CheckIcon className="h-5 w-5" />
          ) : (
            <ClipboardDocumentIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      
      {copied && (
        <p className="text-sm text-green-600 mt-2">
          Link copied to clipboard!
        </p>
      )}
      
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <p className="text-sm text-blue-700">
          <strong>Important:</strong> Make sure both devices are on the same network. 
          If the link doesn't work, try using a different network interface from the dropdown above.
        </p>
        <p className="text-sm text-blue-700 mt-2">
          <strong>Tip:</strong> For WiFi hotspot connections, use the IP that starts with 192.168.
        </p>
      </div>
    </div>
  );
}

export default RemoteAccessLink; 