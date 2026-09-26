/**
 * NEURAPRESS Image Optimizer Decision Rules
 * Encapsulates format conversion, transparency preservation, and downsampling boundaries.
 */

function determineImageOptimizationPlan(imageMeta, profile) {
  const { width, height, mode, format } = imageMeta;
  const targetDpi = profile.targetDpi || 150;
  const jpegQuality = profile.jpegQuality || 70;

  // Rule A: Transparency preservation
  const hasAlpha = mode === 'RGBA' || mode === 'LA' || imageMeta.hasTransparency;
  if (hasAlpha) {
    return {
      action: profile.downsample ? 'downsample_png' : 'keep',
      format: 'PNG',
      targetDpi,
      quality: null,
      preserveAlpha: true
    };
  }

  // Rule B: Line-art, diagrams, UI screenshots
  const isLineArt = format === 'PNG' && (width < 300 || height < 300);
  if (isLineArt) {
    return {
      action: 'keep',
      format: 'PNG',
      targetDpi,
      quality: null,
      preserveAlpha: false
    };
  }

  // Rule C: Photographic content -> JPEG quantization
  return {
    action: profile.downsample ? 'downsample_jpeg' : 'recompress_jpeg',
    format: 'JPEG',
    targetDpi,
    quality: jpegQuality,
    preserveAlpha: false
  };
}

module.exports = {
  determineImageOptimizationPlan
};
