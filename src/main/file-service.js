/**
 * NEURAPRESS File Service
 * Temp directory isolation, atomic writes, path validation, and engine binary locator.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const TEMP_PREFIX = 'neurapress-job-';

function createTempJobDir() {
  const baseTmp = os.tmpdir();
  return fs.mkdtempSync(path.join(baseTmp, TEMP_PREFIX));
}

function cleanupTempDir(dirPath) {
  if (!dirPath || typeof dirPath !== 'string') return;
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn('[FileService] Failed to remove temp directory:', dirPath, err.message);
  }
}

function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') return 'document.pdf';
  // Strip null bytes and directory traversal characters
  const clean = path.basename(fileName).replace(/[\x00-\x1f\x80-\x9f\\/?*:|"<>]/g, '_');
  return clean.toLowerCase().endsWith('.pdf') ? clean : `${clean}.pdf`;
}

function validatePathWithinBounds(filePath, allowedBaseDir) {
  if (!filePath || !allowedBaseDir) return false;
  const resolved = path.resolve(filePath);
  const base = path.resolve(allowedBaseDir);
  return resolved.startsWith(base + path.sep) || resolved === base;
}

function atomicCopy(sourcePath, destPath) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file does not exist: ${sourcePath}`);
  }
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const tempDest = `${destPath}.tmp.${Date.now()}`;
  try {
    fs.copyFileSync(sourcePath, tempDest);
    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { force: true });
    }
    fs.renameSync(tempDest, destPath);
  } catch (err) {
    if (fs.existsSync(tempDest)) {
      fs.rmSync(tempDest, { force: true });
    }
    throw err;
  }
}

function getOptimizerScriptPath() {
  const defaultPath = path.join(__dirname, '..', 'engine', 'pdf_optimizer.py');

  if (defaultPath.includes('app.asar')) {
    // 1. Check if unpacked into app.asar.unpacked
    const unpackedPath = defaultPath.replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(unpackedPath)) {
      return unpackedPath;
    }

    // 2. Extract from virtual ASAR to real temporary directory
    try {
      const tempDir = path.join(os.tmpdir(), 'neurapress-engine');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const targetScript = path.join(tempDir, 'pdf_optimizer.py');
      const content = fs.readFileSync(defaultPath);
      if (!fs.existsSync(targetScript) || fs.statSync(targetScript).size !== content.length) {
        fs.writeFileSync(targetScript, content);
      }
      return targetScript;
    } catch (err) {
      console.warn('[FileService] Failed to extract optimizer from ASAR:', err.message);
    }
  }

  return defaultPath;
}

let cachedPythonPath = undefined;

function findPythonExecutable() {
  if (cachedPythonPath !== undefined) {
    return cachedPythonPath;
  }

  // 1. Check if compiled native Windows executable exists
  const candidates = [];
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'NEURAPRESS_Quantum_Native.exe'));
    candidates.push(path.join(process.resourcesPath, 'engine', 'NEURAPRESS_Quantum_Native.exe'));
  }
  candidates.push(path.join(__dirname, '..', '..', 'dist', 'NEURAPRESS_Quantum_Native.exe'));
  candidates.push(path.join(__dirname, '..', '..', 'tools', 'NEURAPRESS_Quantum_Native.exe'));

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      cachedPythonPath = { type: 'exe', path: c };
      return cachedPythonPath;
    }
  }

  // 2. Check system python
  const pythonCmds = ['python', 'python3', 'py'];
  for (const cmd of pythonCmds) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      cachedPythonPath = { type: 'python', path: cmd };
      return cachedPythonPath;
    } catch (e) {
      // not available
    }
  }

  cachedPythonPath = null;
  return cachedPythonPath;
}

module.exports = {
  createTempJobDir,
  cleanupTempDir,
  sanitizeFileName,
  validatePathWithinBounds,
  atomicCopy,
  getOptimizerScriptPath,
  findPythonExecutable
};

