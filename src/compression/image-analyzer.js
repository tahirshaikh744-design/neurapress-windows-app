/**
 * NEURAPRESS Image Analyzer
 * Analyzes embedded image resources, calculates effective DPI, and inspects color channels.
 */

function calculateEffectiveDpi(pixelWidth, pixelHeight, displayedWidthInches, displayedHeightInches) {
  if (!displayedWidthInches || !displayedHeightInches || displayedWidthInches <= 0 || displayedHeightInches <= 0) {
    return null;
  }
  const dpiX = pixelWidth / displayedWidthInches;
  const dpiY = pixelHeight / displayedHeightInches;
  return {
    dpiX: Math.round(dpiX),
    dpiY: Math.round(dpiY),
    conservativeDpi: Math.round(Math.min(dpiX, dpiY))
  };
}

function isImageOptimizationCandidate(imageMeta, targetDpi = 150) {
  if (!imageMeta) return false;
  if (imageMeta.isInline) return false; // Inline images preserved without whole-page rasterization

  const { width, height, bytes } = imageMeta;

  // Tiny images (icons, logos, bullets < 64x64 or < 2KB) are kept
  if (width < 64 && height < 64) return false;
  if (bytes && bytes < 2048) return false;

  // If effective DPI is known and already conservative, skip downsampling
  if (imageMeta.effectiveDpi && imageMeta.effectiveDpi <= (targetDpi * 1.15)) {
    return false;
  }

  return true;
}

module.exports = {
  calculateEffectiveDpi,
  isImageOptimizationCandidate
};
