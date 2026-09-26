/**
 * NEURAPRESS Compression Cancellation Token
 * Provides clean cooperative cancellation across long-running pipelines and subprocesses.
 */

const { CompressionError, ERROR_CODES } = require('./compression-errors');

class CancellationToken {
  constructor() {
    this.isCancelled = false;
    this.reason = null;
    this.handlers = new Set();
  }

  cancel(reason = 'Operation was cancelled by user.') {
    if (this.isCancelled) return;
    this.isCancelled = true;
    this.reason = reason;

    for (const handler of this.handlers) {
      try {
        handler(reason);
      } catch (err) {
        console.error('[CancellationToken] Handler fault:', err);
      }
    }
    this.handlers.clear();
  }

  onCancel(callback) {
    if (typeof callback !== 'function') return () => {};
    if (this.isCancelled) {
      callback(this.reason);
      return () => {};
    }
    this.handlers.add(callback);
    return () => this.handlers.delete(callback);
  }

  throwIfCancelled() {
    if (this.isCancelled) {
      throw new CompressionError(ERROR_CODES.CANCELLED, this.reason || 'Compression cancelled.');
    }
  }
}

module.exports = {
  CancellationToken
};
