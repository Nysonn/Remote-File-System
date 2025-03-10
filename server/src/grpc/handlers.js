const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { logger } = require('../utils/logger');
const { File } = require('../models/file');
const { AppError } = require('../middleware/errorHandler');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const handleFileUpload = async (call, callback) => {
  let fileMetadata = null;
  const chunks = [];

  call.on('data', async (chunk) => {
    if (chunk.metadata) {
      fileMetadata = chunk.metadata;
    } else if (chunk.chunk) {
      chunks.push(chunk.chunk);
    }
  });

  call.on('end', async () => {
    try {
      if (!fileMetadata) {
        throw new AppError(400, 'No file metadata provided');
      }

      const fileBuffer = Buffer.concat(chunks);
      const filePath = path.join(UPLOAD_DIR, fileMetadata.filename);
      
      await writeFile(filePath, fileBuffer);
      
      const file = await File.create({
        filename: fileMetadata.filename,
        path: filePath,
        size: fileMetadata.size,
        mimeType: fileMetadata.mime_type,
        owner: fileMetadata.owner
      });

      callback(null, {
        file_id: file.id.toString(),
        message: 'File uploaded successfully',
        success: true
      });
    } catch (error) {
      logger.error('File upload error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: error.message
      });
    }
  });
};

const handleFileDownload = async (call) => {
  try {
    const { file_id } = call.request;
    
    const file = await File.findByPk(file_id);
    if (!file) {
      throw new AppError(404, 'File not found');
    }

    // Send metadata first
    call.write({
      metadata: {
        filename: file.filename,
        mime_type: file.mimeType,
        size: file.size,
        created_at: file.createdAt.toISOString(),
        updated_at: file.updatedAt.toISOString(),
        owner: file.owner
      }
    });

    // Read and stream file content
    const fileContent = await readFile(file.path);
    const chunkSize = 64 * 1024; // 64KB chunks
    
    for (let i = 0; i < fileContent.length; i += chunkSize) {
      const chunk = fileContent.slice(i, i + chunkSize);
      call.write({ chunk });
    }
    
    call.end();
  } catch (error) {
    logger.error('File download error:', error);
    call.destroy({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
};

const handleFileDelete = async (call, callback) => {
  try {
    const { file_id } = call.request;
    
    const file = await File.findByPk(file_id);
    if (!file) {
      throw new AppError(404, 'File not found');
    }

    await unlink(file.path);
    await file.destroy();

    callback(null, {
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('File deletion error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
};

const handleFileRename = async (call, callback) => {
  try {
    const { file_id, new_filename } = call.request;
    
    const file = await File.findByPk(file_id);
    if (!file) {
      throw new AppError(404, 'File not found');
    }

    const newPath = path.join(UPLOAD_DIR, new_filename);
    await rename(file.path, newPath);
    
    file.filename = new_filename;
    file.path = newPath;
    await file.save();

    callback(null, {
      success: true,
      message: 'File renamed successfully'
    });
  } catch (error) {
    logger.error('File rename error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
};

const handleListFiles = async (call, callback) => {
  try {
    const { directory, page = 1, limit = 10 } = call.request;
    
    const offset = (page - 1) * limit;
    const files = await File.findAndCountAll({
      where: directory ? { path: { [Op.like]: `${directory}%` } } : {},
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    callback(null, {
      files: files.rows.map(file => ({
        filename: file.filename,
        mime_type: file.mimeType,
        size: file.size,
        created_at: file.createdAt.toISOString(),
        updated_at: file.updatedAt.toISOString(),
        owner: file.owner
      })),
      total_count: files.count,
      has_more: offset + files.rows.length < files.count
    });
  } catch (error) {
    logger.error('List files error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message
    });
  }
};

module.exports = {
  handleFileUpload,
  handleFileDownload,
  handleFileDelete,
  handleFileRename,
  handleListFiles
}; 