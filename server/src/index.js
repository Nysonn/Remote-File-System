require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { setupGrpcServer } = require('./grpc/server');
const { setupDatabase } = require('./config/database');
const { logger } = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const networkRoutes = require('./routes/networkRoutes');

const app = express();
const httpServer = createServer(app);

// Setup Socket.IO with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  secure: false // Allow insecure connections for testing
});

// Store connected devices
const connectedDevices = new Map();

// Store socket.io instance in app for use in routes
app.set('io', io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for development
}));
app.use(cors({
  origin: "*", // Allow all origins for testing
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/network', networkRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id} from IP: ${socket.handshake.address}`);

  // Store device information when a client connects
  socket.on('registerDevice', (deviceInfo) => {
    // Store the device info with the socket id
    const enhancedDeviceInfo = {
      ...deviceInfo,
      id: socket.id,
      ip: socket.handshake.address,
      lastSeen: new Date()
    };
    
    socket.deviceInfo = enhancedDeviceInfo;
    connectedDevices.set(socket.id, enhancedDeviceInfo);
    
    logger.info(`Device registered: ${socket.id}`, socket.deviceInfo);
    
    // Broadcast updated device list to all clients
    broadcastDeviceList();
    
    // Acknowledge registration
    socket.emit('deviceRegistered', { 
      success: true, 
      deviceId: socket.id,
      message: 'Device registered successfully'
    });
  });

  // Handle remote folder open requests
  socket.on('openFolder', (data) => {
    logger.info(`Received command to open folder: ${data.folderPath}`);
    
    // If targetDevice is specified, forward the command to that device
    if (data.targetDevice) {
      const targetSocket = io.sockets.sockets.get(data.targetDevice);
        
      if (targetSocket) {
        logger.info(`Forwarding openFolder command to device: ${data.targetDevice}`);
        targetSocket.emit('folderOpened', { 
          folderPath: data.folderPath,
          sourceDevice: socket.id
        });
        return;
      } else {
        logger.warn(`Target device not found: ${data.targetDevice}`);
        socket.emit('folderOpenError', { error: 'Target device not found or disconnected' });
        return;
      }
    }
    
    // Determine the OS-specific command to open the folder
    const os = require('os');
    const { exec } = require('child_process');
    let command;
    
    if (os.platform() === 'win32') {
      command = `explorer "${data.folderPath}"`;
    } else if (os.platform() === 'darwin') {
      command = `open "${data.folderPath}"`;
    } else {
      command = `xdg-open "${data.folderPath}"`;
    }

    // Execute the command to open the folder
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error opening folder: ${error}`);
        socket.emit('folderOpenError', { error: error.message });
        return;
      }
      logger.info(`Folder opened successfully.`);
      // Notify the sender that the folder is open
      socket.emit('folderOpened', { folderPath: data.folderPath });
    });
  });

  // Handle file selection notification
  socket.on('fileSelected', (data) => {
    logger.info(`File selected: ${data.filePath} by device: ${socket.id}`);
    
    // Add source device info if not already present
    const fileData = {
      ...data,
      sourceDevice: data.sourceDevice || socket.id,
      sourceDeviceName: data.sourceDeviceName || socket.deviceInfo?.name || 'Unknown Device',
      timestamp: data.timestamp || new Date().toISOString()
    };
    
    // If targetDevice is specified, forward the selection to that device
    if (data.targetDevice) {
      const targetSocket = io.sockets.sockets.get(data.targetDevice);
        
      if (targetSocket) {
        logger.info(`Forwarding fileSelected event to specific device: ${data.targetDevice}`);
        targetSocket.emit('fileSelected', fileData);
      } else {
        logger.warn(`Target device not found: ${data.targetDevice}`);
        // Try broadcasting instead
        logger.info(`Broadcasting fileSelected event to all devices as fallback`);
        io.emit('fileSelected', fileData);
      }
    } else {
      // Broadcast to all clients (including the sender for debugging)
      logger.info(`Broadcasting fileSelected event to all devices`);
      io.emit('fileSelected', fileData);
    }
  });

  // Handle explicit device discovery request
  socket.on('discoverDevices', () => {
    logger.info(`Device discovery requested by: ${socket.id}`);
    broadcastDeviceList();
  });

  // Handle ping request (for connection testing)
  socket.on('ping', (data, callback) => {
    if (typeof callback === 'function') {
      callback({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Pong from server'
      });
    } else {
      socket.emit('pong', {
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Pong from server'
      });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    
    // Remove from connected devices
    connectedDevices.delete(socket.id);
    
    // Broadcast updated device list to all clients
    broadcastDeviceList();
  });
  
  // Send initial device list to the newly connected client
  broadcastDeviceList();
});

// Function to broadcast the device list to all clients
function broadcastDeviceList() {
  const deviceList = Array.from(connectedDevices.values());
  logger.info(`Broadcasting device list: ${deviceList.length} devices`);
  io.emit('deviceList', deviceList);
}

// Error handling
app.use(errorHandler);

// Start servers
const PORT = process.env.PORT || 3000;
const GRPC_PORT = process.env.GRPC_PORT || 50051;

async function startServer() {
  try {
    // Initialize database
    await setupDatabase();
    
    // Start gRPC server
    await setupGrpcServer(GRPC_PORT);
    
    // Start HTTP server
    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`HTTP Server running on port ${PORT}`);
      logger.info(`gRPC Server running on port ${GRPC_PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start servers:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

startServer(); 