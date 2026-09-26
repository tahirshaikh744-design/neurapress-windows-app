/**
 * NEURAPRESS Master Compression Engine
 * Orchestrates selective optimization, cancellation, progress streaming, and atomic delivery.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { findPythonExecutable, getOptimizerScriptPath, createTempJobDir, cleanupTempDir, atomicCopy } = require('../main/file-service');
const { validateProfileSettings } = require('./compression-profiles');
const { calculateCompressionStats } = require('./compression-stats');
const { CompressionError, ERROR_CODES } = require('./compression-errors');
const { CancellationToken } = require('./compression-cancellation');

/**
 * Compresses/optimizes a PDF document using the production selective optimization pipeline.
 */
async function compressPdf({
  inputPath,
  outputPath,
  profile = 'balanced',
  customSettings = {},
  cancellationToken = null,
  onProgress = null,
  onStatus = null
}) {
  if (!fs.existsSync(inputPath)) {
    throw new CompressionError(ERROR_CODES.INVALID_PDF, `Source PDF file does not exist: ${inputPath}`);
  }

  const token = cancellationToken || new CancellationToken();
  token.throwIfCancelled();

  const validatedProfile = validateProfileSettings(profile, customSettings);
  const origSize = fs.statSync(inputPath).size;

  const jobDir = createTempJobDir();
  const tempOutputFile = path.join(jobDir, 'optimized_output.pdf');

  const pyInfo = findPythonExecutable();
  if (!pyInfo) {
    cleanupTempDir(jobDir);
    throw new CompressionError(
      ERROR_CODES.UNKNOWN_FAILURE,
      'Native Python engine could not be located. Please ensure Python 3.10+ is installed.'
    );
  }

  const optimizerScript = getOptimizerScriptPath();

  const args = pyInfo.type === 'exe'
    ? [
        '--input', inputPath,
        '--output', tempOutputFile,
        '--profile', validatedProfile.id,
        '--dpi', String(validatedProfile.targetDpi),
        '--quality', String(validatedProfile.jpegQuality)
      ]
    : [
        optimizerScript,
        '--input', inputPath,
        '--output', tempOutputFile,
        '--profile', validatedProfile.id,
        '--dpi', String(validatedProfile.targetDpi),
        '--quality', String(validatedProfile.jpegQuality)
      ];

  if (validatedProfile.monochrome) {
    args.push('--monochrome');
  }
  if (!validatedProfile.downsample) {
    args.push('--no-downsample');
  }
  if (!validatedProfile.recompress) {
    args.push('--no-recompress');
  }
  if (validatedProfile.removeMetadata) {
    args.push('--remove-metadata');
  }
  if (!validatedProfile.structuralOpt) {
    args.push('--no-structural');
  }

  const execPath = pyInfo.path;

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      cleanupTempDir(jobDir);
      return reject(new CompressionError(ERROR_CODES.UNKNOWN_FAILURE, `Failed to launch compression engine: ${err.message}`));
    }

    const cancelUnsub = token.onCancel((reason) => {
      try {
        child.kill('SIGTERM');
      } catch (e) {}
      cleanupTempDir(jobDir);
      reject(new CompressionError(ERROR_CODES.CANCELLED, reason || 'Compression cancelled by user.'));
    });

    let stdoutBuffer = '';
    let stderrBuffer = '';

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop(); // keep trailing incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const evt = JSON.parse(line.trim());
          if (evt.type === 'progress') {
            if (typeof onProgress === 'function') {
              onProgress({
                stage: evt.stage,
                percent: evt.percent,
                message: evt.message
              });
            }
            if (typeof onStatus === 'function') {
              onStatus(evt.message);
            }
          }
        } catch (e) {
          // non-JSON debug line
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
    });

    child.on('close', (code) => {
      cancelUnsub();
      if (token.isCancelled) {
        cleanupTempDir(jobDir);
        return reject(new CompressionError(ERROR_CODES.CANCELLED, 'Compression cancelled.'));
      }

      // Check remaining stdout buffer for final result or error
      const allLines = (stdoutBuffer ? [stdoutBuffer] : []);
      let resultEvent = null;
      let errorEvent = null;

      try {
        const lines = stdoutBuffer.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line.trim());
          if (parsed.type === 'result') resultEvent = parsed;
          if (parsed.type === 'error') errorEvent = parsed;
        }
      } catch (e) {}

      if (errorEvent) {
        cleanupTempDir(jobDir);
        return reject(new CompressionError(errorEvent.code || ERROR_CODES.UNKNOWN_FAILURE, errorEvent.message));
      }

      if (code !== 0 || !fs.existsSync(tempOutputFile)) {
        cleanupTempDir(jobDir);
        const msg = stderrBuffer.trim() || `Optimization engine exited with code ${code}`;
        return reject(new CompressionError(ERROR_CODES.UNKNOWN_FAILURE, msg));
      }

      try {
        const outSize = fs.statSync(tempOutputFile).size;
        const stats = calculateCompressionStats(origSize, outSize);

        // Section 18: If output grew meaningfully (> 1%), preserve original by default unless forced
        if (outputPath) {
          atomicCopy(tempOutputFile, outputPath);
        }

        cleanupTempDir(jobDir);

        const finalResult = {
          success: true,
          inputPath,
          outputPath: outputPath || tempOutputFile,
          tempPath: tempOutputFile,
          ...stats,
          pageCount: resultEvent ? resultEvent.pageCount : 1,
          pagesOptimized: resultEvent ? resultEvent.pagesOptimized : 1,
          imagesAnalyzed: resultEvent ? resultEvent.imagesAnalyzed : 0,
          imagesOptimized: resultEvent ? resultEvent.imagesOptimized : 0,
          imagesSkipped: resultEvent ? resultEvent.imagesSkipped : 0,
          warnings: resultEvent ? resultEvent.warnings : [],
          validation: resultEvent ? resultEvent.validation : { valid: true }
        };

        resolve(finalResult);
      } catch (postErr) {
        cleanupTempDir(jobDir);
        reject(new CompressionError(ERROR_CODES.OUTPUT_WRITE_FAILURE, `Failed to finalize output: ${postErr.message}`));
      }
    });

    child.on('error', (err) => {
      cancelUnsub();
      cleanupTempDir(jobDir);
      reject(new CompressionError(ERROR_CODES.UNKNOWN_FAILURE, `Subprocess execution error: ${err.message}`));
    });
  });
}

module.exports = {
  compressPdf
};
