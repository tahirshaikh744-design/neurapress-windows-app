/**
 * NEURAPRESS Document Analyzer
 * Non-destructive pre-compression inspection of document topology, structure, and embedded resources.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { findPythonExecutable, getOptimizerScriptPath } = require('../main/file-service');
const { CompressionError, ERROR_CODES } = require('./compression-errors');

/**
 * Analyzes a PDF document and returns a structured DocumentAnalysis object.
 * Does not modify the input document.
 */
async function analyzeDocument(pdfPath, cancellationToken = null) {
  if (!fs.existsSync(pdfPath)) {
    throw new CompressionError(ERROR_CODES.INVALID_PDF, `File does not exist: ${pdfPath}`);
  }

  const pyInfo = findPythonExecutable();
  if (!pyInfo) {
    // Basic fallback analysis if python is not yet located
    const stat = fs.statSync(pdfPath);
    return {
      fileSize: stat.size,
      pageCount: 1,
      encrypted: false,
      hasForms: false,
      hasAnnotations: false,
      hasOutlines: false,
      hasAttachments: false,
      imageCount: 0,
      inlineImageCount: 0,
      totalImageBytesEstimate: 0,
      warnings: ['Native Python engine not found on PATH. Minimal analysis applied.'],
      pageAnalyses: []
    };
  }

  const optimizerScript = getOptimizerScriptPath();

  const args = pyInfo.type === 'exe'
    ? ['--analyze', '--input', pdfPath]
    : [optimizerScript, '--analyze', '--input', pdfPath];

  const execPath = pyInfo.path;

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      return reject(new CompressionError(ERROR_CODES.UNKNOWN_FAILURE, `Failed to launch analyzer: ${err.message}`));
    }

    if (cancellationToken) {
      cancellationToken.onCancel(() => {
        try {
          child.kill('SIGTERM');
        } catch (e) {}
      });
    }

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    child.on('close', (code) => {
      if (cancellationToken && cancellationToken.isCancelled) {
        return reject(new CompressionError(ERROR_CODES.CANCELLED, 'Analysis cancelled.'));
      }

      // Parse JSON stream
      const lines = stdoutData.split('\n').filter(Boolean);
      let analysisResult = null;
      let errorResult = null;

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed.type === 'analysis') {
            analysisResult = parsed;
          } else if (parsed.type === 'error') {
            errorResult = parsed;
          }
        } catch (e) {
          // not JSON line
        }
      }

      if (errorResult) {
        return reject(new CompressionError(errorResult.code || ERROR_CODES.INVALID_PDF, errorResult.message));
      }

      if (code !== 0 || !analysisResult) {
        const msg = stderrData.trim() || `Analyzer exited with code ${code}`;
        return reject(new CompressionError(ERROR_CODES.INVALID_PDF, msg));
      }

      delete analysisResult.type;
      resolve(analysisResult);
    });

    child.on('error', (err) => {
      reject(new CompressionError(ERROR_CODES.UNKNOWN_FAILURE, `Subprocess fault: ${err.message}`));
    });
  });
}

module.exports = {
  analyzeDocument
};
