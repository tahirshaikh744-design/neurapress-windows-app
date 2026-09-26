/**
 * NEURAPRESS Real Compression Statistics Calculation
 * Eliminates static/fake percentages and accurately reports savings and growth.
 */

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes <= 0) return '0.00 KB';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function calculateCompressionStats(originalBytes, outputBytes, extra = {}) {
  const orig = Math.max(0, parseInt(originalBytes, 10) || 0);
  const out = Math.max(0, parseInt(outputBytes, 10) || 0);

  const savedBytes = Math.max(0, orig - out);
  const growthBytes = Math.max(0, out - orig);
  const isGrowth = out > orig;

  const savedPercent = orig > 0 ? Number(((savedBytes / orig) * 100).toFixed(2)) : 0;
  const growthPercent = orig > 0 ? Number(((growthBytes / orig) * 100).toFixed(2)) : 0;

  return {
    inputBytes: orig,
    originalBytes: orig,
    outputBytes: out,
    bytesSaved: savedBytes,
    savedBytes: savedBytes,
    bytesGrown: growthBytes,
    growthBytes: growthBytes,
    savedPercent,
    growthPercent,
    isGrowth,
    outputGrew: isGrowth,
    formattedOriginal: formatBytes(orig),
    formattedOutput: formatBytes(out),
    formattedSaved: formatBytes(savedBytes),
    formattedGrown: formatBytes(growthBytes),
    ...extra
  };
}

module.exports = {
  formatBytes,
  calculateCompressionStats
};
