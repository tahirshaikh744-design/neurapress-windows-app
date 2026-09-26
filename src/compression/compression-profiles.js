/**
 * NEURAPRESS Compression Profiles Configuration
 * Centralized, validated targets for DPI, JPEG quality, downsampling, and structural compaction.
 */

const PROFILES = Object.freeze({
  extreme: Object.freeze({
    id: 'extreme',
    label: 'HYPER QUANTUM',
    description: 'Maximum crunch for email attachments and quick transmission. High downsampling.',
    targetDpi: 110,
    jpegQuality: 50,
    downsample: true,
    recompress: true,
    monochrome: false,
    structuralOpt: true,
    removeMetadata: false
  }),
  balanced: Object.freeze({
    id: 'balanced',
    label: 'BALANCED MATRIX',
    description: 'Golden ratio. Preserves text and vectors with selectively optimized bitmaps.',
    targetDpi: 150,
    jpegQuality: 70,
    downsample: true,
    recompress: true,
    monochrome: false,
    structuralOpt: true,
    removeMetadata: false
  }),
  studio: Object.freeze({
    id: 'studio',
    label: 'HIGH FIDELITY',
    description: 'Conservative compaction. Preserves fine details, diagrams, and print-ready fidelity.',
    targetDpi: 300,
    jpegQuality: 85,
    downsample: true,
    recompress: true,
    monochrome: false,
    structuralOpt: true,
    removeMetadata: false
  }),
  custom: Object.freeze({
    id: 'custom',
    label: 'MANUAL CALIBRATION',
    description: 'Custom fine-tuned parameters for target DPI, JPEG quality, and monochrome mode.',
    targetDpi: 150,
    jpegQuality: 70,
    downsample: true,
    recompress: true,
    monochrome: false,
    structuralOpt: true,
    removeMetadata: false
  })
});

/**
 * Validates and normalizes user profile settings.
 * Rejects out-of-range or nonsensical values.
 */
function validateProfileSettings(profileId, overrides = {}) {
  const base = PROFILES[profileId] || PROFILES.balanced;
  const merged = { ...base, ...overrides };

  const targetDpi = Math.max(72, Math.min(600, parseInt(merged.targetDpi, 10) || base.targetDpi));
  const jpegQuality = Math.max(15, Math.min(95, parseInt(merged.jpegQuality, 10) || base.jpegQuality));
  const downsample = Boolean(merged.downsample !== undefined ? merged.downsample : base.downsample);
  const recompress = Boolean(merged.recompress !== undefined ? merged.recompress : base.recompress);
  const monochrome = Boolean(merged.monochrome !== undefined ? merged.monochrome : base.monochrome);
  const structuralOpt = Boolean(merged.structuralOpt !== undefined ? merged.structuralOpt : base.structuralOpt);
  const removeMetadata = Boolean(merged.removeMetadata !== undefined ? merged.removeMetadata : base.removeMetadata);

  return {
    id: profileId,
    label: base.label,
    targetDpi,
    jpegQuality,
    downsample,
    recompress,
    monochrome,
    structuralOpt,
    removeMetadata
  };
}

module.exports = {
  PROFILES,
  validateProfileSettings
};
