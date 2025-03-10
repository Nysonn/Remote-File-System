const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../utils/logger');
const { handleFileUpload, handleFileDownload, handleFileDelete, handleFileRename, handleListFiles } = require('./handlers');

const PROTO_PATH = path.resolve(__dirname, '../../proto/file_service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const fileService = protoDescriptor.fileservice;

const server = new grpc.Server();

server.addService(fileService.FileService.service, {
  uploadFile: handleFileUpload,
  downloadFile: handleFileDownload,
  deleteFile: handleFileDelete,
  renameFile: handleFileRename,
  listFiles: handleListFiles
});

function setupGrpcServer(port) {
  return new Promise((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          logger.error('Failed to bind gRPC server:', error);
          return reject(error);
        }
        
        server.start();
        logger.info(`gRPC server running at 0.0.0.0:${port}`);
        resolve(port);
      }
    );
  });
}

module.exports = {
  setupGrpcServer
}; 