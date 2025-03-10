const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { File } = require('../models/file');
const sanitize = require('sanitize-filename');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : undefined },
  fileFilter: (req, file, cb) => {
    // Add file type restrictions if needed
    cb(null, true);
  }
});

// Utility async error wrapper
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Utility function to safely emit Socket.IO events
const safeEmit = (req, event, data) => {
  try {
    const io = req.app.get('io');
    if (io) {
      io.emit(event, data);
    }
  } catch (error) {
    logger.warn(`Failed to emit ${event} event:`, error);
  }
};

// List files
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const files = await File.findAndCountAll({
    where: { owner: req.user.email },
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });

  res.json({
    files: files.rows,
    totalCount: files.count,
    currentPage: page,
    totalPages: Math.ceil(files.count / limit)
  });
}));

// Upload file
router.post('/upload', verifyToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError(400, 'No file uploaded');
  }

  const file = await File.create({
    filename: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    mimeType: req.file.mimetype,
    owner: req.user.email
  });

  // Use the safe emit function
  safeEmit(req, 'fileUploaded', {
    fileId: file.id,
    filename: file.filename,
    owner: file.owner
  });

  res.status(201).json(file);
}));

// Download file
router.get('/:id/download', verifyToken, asyncHandler(async (req, res) => {
  const file = await File.findOne({
    where: { id: req.params.id, owner: req.user.email }
  });

  if (!file) {
    throw new AppError(404, 'File not found');
  }

  res.download(file.path, file.filename);
}));

// Delete file
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
  const file = await File.findOne({
    where: { id: req.params.id, owner: req.user.email }
  });

  if (!file) {
    throw new AppError(404, 'File not found');
  }

  // Remove file from disk first
  await fs.promises.unlink(file.path);
  await file.destroy();

  // Use the safe emit function
  safeEmit(req, 'fileDeleted', {
    fileId: file.id,
    filename: file.filename,
    owner: file.owner
  });

  res.status(200).json({ message: 'File deleted successfully' });
}));

// Rename file
router.put('/:id/rename', verifyToken, asyncHandler(async (req, res) => {
  const { newFilename } = req.body;

  if (!newFilename) {
    throw new AppError(400, 'New filename is required');
  }

  const file = await File.findOne({
    where: { id: req.params.id, owner: req.user.email }
  });

  if (!file) {
    throw new AppError(404, 'File not found');
  }

  // Sanitize the new filename to prevent directory traversal
  const safeFilename = sanitize(newFilename);
  const oldPath = file.path;
  const newPath = path.join(path.dirname(file.path), safeFilename);

  await fs.promises.rename(oldPath, newPath);

  file.filename = safeFilename;
  file.path = newPath;
  await file.save();

  // Use the safe emit function
  safeEmit(req, 'fileRenamed', {
    fileId: file.id,
    oldFilename: path.basename(oldPath),
    newFilename: safeFilename,
    owner: file.owner
  });

  res.json(file);
}));

module.exports = router; 