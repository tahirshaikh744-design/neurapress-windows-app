/**
 * NEURAPRESS Hardened IPC Service
 * Validates message senders, enforces argument schemas, and dispatches compression jobs safely.
 */

const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { isTrustedSender } = require('./security');
const { createTempJobDir, cleanupTempDir, atomicCopy, sanitizeFileName } = require('./file-service');
const { analyzeDocument } = require('../compression/document-analyzer');
const { compressPdf } = require('../compression/compression-engine');
const { CancellationToken } = require('../compression/compression-cancellation');
const { CompressionError, ERROR_CODES } = require('../compression/compression-errors');

const activeJobs = new Map(); // jobId -> { token, tempDir }

function registerIpcHandlers(mainWindow) {
  // 1. Analyze PDF
  ipcMain.handle('pdf:analyze', async (event, payload) => {
    if (!isTrustedSender(event)) {
      throw new CompressionError(ERROR_CODES.UNKNOWN_FAILURE, 'Unauthorized IPC invocation.');
    }

    if (!payload || typeof payload !== 'object') {
      throw new CompressionError(ERROR_CODES.INVALID_PDF, 'Invalid analyze payload.');
    }

    let targetPath = payload.filePath;
    let jobDir = null;

    if (!targetPath && payload.buffer) {
      jobDir = createTempJobDir();
      const safeName = sanitizeFileName(payload.fileName || 'input.pdf');
      targetPath = path.join(jobDir, safeName);
      fs.writeFileSync(targetPath, Buffer.from(payload.buffer));
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      if (jobDir) cleanupTempDir(jobDir);
      throw new CompressionError(ERROR_CODES.INVALID_PDF, 'Could not access target PDF path.');
    }

    try {
      const result = await analyzeDocument(targetPath);
      result.filePath = targetPath;
      return result;
    } finally {
      // Retain or cleanup if temporary
    }
  });

  // 2. Start Compression Pipeline
  ipcMain.handle('pdf:compress', async (event, payload) => {
    if (!isTrustedSender(event)) {
      throw new CompressionError(ERROR_CODES.UNKNOWN_FAILURE, 'Unauthorized IPC invocation.');
    }

    const { jobId, filePath, buffer, fileName, profile, customSettings } = payload || {};
    if (!jobId || typeof jobId !== 'string') {
      throw new CompressionError(ERROR_CODES.INVALID_PDF, 'Missing required jobId.');
    }

    const jobDir = createTempJobDir();
    const token = new CancellationToken();
    activeJobs.set(jobId, { token, jobDir });

    let inputPath = filePath;
    if (!inputPath && buffer) {
      const safeName = sanitizeFileName(fileName || 'source.pdf');
      inputPath = path.join(jobDir, safeName);
      fs.writeFileSync(inputPath, Buffer.from(buffer));
    }

    if (!inputPath || !fs.existsSync(inputPath)) {
      cleanupTempDir(jobDir);
      activeJobs.delete(jobId);
      throw new CompressionError(ERROR_CODES.INVALID_PDF, 'No valid input file provided for compression.');
    }

    const tempOutputPath = path.join(jobDir, 'optimized.pdf');

    try {
      const result = await compressPdf({
        inputPath,
        outputPath: tempOutputPath,
        profile,
        customSettings,
        cancellationToken: token,
        onProgress: (p) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send(`pdf:progress:${jobId}`, p);
          }
        },
        onStatus: (msg) => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send(`pdf:status:${jobId}`, msg);
          }
        }
      });

      // Keep jobDir alive so user can save the resulting file
      return {
        ...result,
        jobId,
        tempPath: tempOutputPath
      };
    } catch (err) {
      cleanupTempDir(jobDir);
      activeJobs.delete(jobId);
      throw err instanceof CompressionError ? err : new CompressionError(ERROR_CODES.UNKNOWN_FAILURE, err.message);
    }
  });

  // 3. Cancel Compression Pipeline
  ipcMain.handle('pdf:cancel', async (event, jobId) => {
    if (!isTrustedSender(event)) return { success: false };

    const job = activeJobs.get(jobId);
    if (job) {
      job.token.cancel('User requested cancellation.');
      cleanupTempDir(job.jobDir);
      activeJobs.delete(jobId);
      return { success: true };
    }
    return { success: false, reason: 'Job not found.' };
  });

  // 4. Save Optimized File via Native Dialog
  ipcMain.handle('pdf:save-as', async (event, payload) => {
    if (!isTrustedSender(event)) {
      throw new CompressionError(ERROR_CODES.UNKNOWN_FAILURE, 'Unauthorized IPC invocation.');
    }

    const { tempPath, suggestedName } = payload || {};
    if (!tempPath || !fs.existsSync(tempPath)) {
      throw new CompressionError(ERROR_CODES.INVALID_PDF, 'Optimized binary file not found on disk.');
    }

    const safeSuggested = sanitizeFileName(suggestedName || 'optimized_document.pdf');
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;

    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save Compressed PDF Document',
      defaultPath: safeSuggested,
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (canceled || !filePath) {
      return { canceled: true };
    }

    try {
      atomicCopy(tempPath, filePath);
      return {
        canceled: false,
        success: true,
        filePath,
        fileName: path.basename(filePath)
      };
    } catch (err) {
      throw new CompressionError(ERROR_CODES.OUTPUT_WRITE_FAILURE, `Failed to save file: ${err.message}`);
    }
  });
}

function cleanupAllJobs() {
  for (const [id, job] of activeJobs.entries()) {
    try {
      job.token.cancel('Application shutting down.');
      cleanupTempDir(job.jobDir);
    } catch (e) {}
  }
  activeJobs.clear();
}

module.exports = {
  registerIpcHandlers,
  cleanupAllJobs
};
