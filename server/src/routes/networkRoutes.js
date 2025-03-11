const express = require('express');
const os = require('os');
const { logger } = require('../utils/logger');

const router = express.Router();

// Utility async error wrapper
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Get all IP addresses of the server
router.get('/ip', asyncHandler(async (req, res) => {
  try {
    const networkInterfaces = os.networkInterfaces();
    const ipAddresses = [];
    
    // Get all IPv4 addresses
    Object.keys(networkInterfaces).forEach((interfaceName) => {
      const interfaces = networkInterfaces[interfaceName];
      interfaces.forEach((iface) => {
        // Include all IPv4 addresses, but mark internal ones
        if (iface.family === 'IPv4') {
          ipAddresses.push(iface.address);
        }
      });
    });
    
    // Add client's perceived server address
    const clientAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (clientAddress && !ipAddresses.includes(clientAddress)) {
      ipAddresses.push(clientAddress);
    }
    
    // Add localhost as a fallback
    if (!ipAddresses.includes('127.0.0.1')) {
      ipAddresses.push('127.0.0.1');
    }
    
    if (!ipAddresses.includes('localhost')) {
      ipAddresses.push('localhost');
    }
    
    // Sort IPs to prioritize non-internal addresses
    const sortedIps = ipAddresses.sort((a, b) => {
      // Prioritize 192.168.* addresses (common for hotspots)
      if (a.startsWith('192.168.') && !b.startsWith('192.168.')) return -1;
      if (!a.startsWith('192.168.') && b.startsWith('192.168.')) return 1;
      
      // Then prioritize other non-localhost addresses
      if ((a === '127.0.0.1' || a === 'localhost') && (b !== '127.0.0.1' && b !== 'localhost')) return 1;
      if ((a !== '127.0.0.1' && a !== 'localhost') && (b === '127.0.0.1' || b === 'localhost')) return -1;
      
      return 0;
    });
    
    logger.info(`Retrieved IP addresses: ${sortedIps.join(', ')}`);
    res.json({ ipAddresses: sortedIps });
  } catch (error) {
    logger.error('Error getting IP addresses:', error);
    res.status(500).json({ error: 'Failed to get IP addresses' });
  }
}));

module.exports = router; 