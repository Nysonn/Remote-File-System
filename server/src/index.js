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

const app = express();
const httpServer = createServer(app);

// Setup Socket.IO with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Store socket.io instance in app for use in routes
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors());
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Store device information when a client connects
  socket.on('registerDevice', (deviceInfo) => {
    // Store the device info with the socket id
    socket.deviceInfo = {
      ...deviceInfo,
      id: socket.id,
      lastSeen: new Date()
    };
    
    logger.info(`Device registered: ${socket.id}`, socket.deviceInfo);
    
    // Broadcast updated device list to all clients
    const connectedDevices = Array.from(io.sockets.sockets.values())
      .filter(s => s.deviceInfo)
      .map(s => s.deviceInfo);
      
    io.emit('deviceList', connectedDevices);
  });

  // Handle remote folder open requests
  socket.on('openFolder', (data) => {
    logger.info(`Received command to open folder: ${data.folderPath}`);
    
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
    logger.info(`File selected: ${data.filePath}`);
    
    // If targetDevice is specified, forward the selection to that device
    if (data.targetDevice) {
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.id === data.targetDevice);
        
      if (targetSocket) {
        targetSocket.emit('fileSelected', data);
      }
    } else {
      // Broadcast to all clients
      io.emit('fileSelected', data);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    
    // Broadcast updated device list to all clients
    const connectedDevices = Array.from(io.sockets.sockets.values())
      .filter(s => s.deviceInfo)
      .map(s => s.deviceInfo);
      
    io.emit('deviceList', connectedDevices);
  });
});

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
    httpServer.listen(PORT, () => {
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