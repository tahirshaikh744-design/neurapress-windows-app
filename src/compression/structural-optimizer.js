/**
 * NEURAPRESS Structural Optimizer
 * PDF content stream compression and identical object merging configuration.
 */

const STRUCTURAL_DEFAULTS = Object.freeze({
  compressContentStreams: true,
  removeDuplicates: true,
  removeUnreferenced: true,
  stripMetadata: false
});

function getStructuralPlan(profile) {
  if (!profile.structuralOpt) {
    return {
      enabled: false,
      compressContentStreams: false,
      removeDuplicates: false,
      removeUnreferenced: false,
      stripMetadata: false
    };
  }

  return {
    enabled: true,
    compressContentStreams: true,
    removeDuplicates: true,
    removeUnreferenced: true,
    stripMetadata: Boolean(profile.removeMetadata)
  };
}

module.exports = {
  STRUCTURAL_DEFAULTS,
  getStructuralPlan
};
