/**
 * NEURAPRESS Structured Error Hierarchy
 */

const ERROR_CODES = Object.freeze({
  INVALID_PDF: 'INVALID_PDF',
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  ENCRYPTED_UNSUPPORTED: 'ENCRYPTED_UNSUPPORTED',
  SIGNATURE_WARNING: 'SIGNATURE_WARNING',
  UNSUPPORTED_IMAGE: 'UNSUPPORTED_IMAGE',
  IMAGE_DECODE_FAILURE: 'IMAGE_DECODE_FAILURE',
  IMAGE_ENCODE_FAILURE: 'IMAGE_ENCODE_FAILURE',
  OUTPUT_WRITE_FAILURE: 'OUTPUT_WRITE_FAILURE',
  OUTPUT_VALIDATION_FAILURE: 'OUTPUT_VALIDATION_FAILURE',
  CANCELLED: 'CANCELLED',
  OUT_OF_MEMORY: 'OUT_OF_MEMORY',
  UNKNOWN_FAILURE: 'UNKNOWN_FAILURE'
});

class CompressionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'CompressionError';
    this.code = code || ERROR_CODES.UNKNOWN_FAILURE;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CompressionError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

module.exports = {
  ERROR_CODES,
  CompressionError
};
