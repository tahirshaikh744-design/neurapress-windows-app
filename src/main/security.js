/**
 * NEURAPRESS Electron Security Hardening Module
 * Protocol registration, Content Security Policy, navigation guards, and sender validation.
 */

const { protocol, session } = require('electron');
const path = require('path');
const fs = require('fs');

const SCHEME = 'neurapress';
const APP_HOST = 'app';
const APP_ROOT = path.resolve(__dirname, '..', '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.json': 'application/json; charset=utf-8'
};

const RESTRICTIVE_CSP = [
  "default-src 'self' neurapress:",
  "script-src 'self' neurapress: 'unsafe-inline'",
  "style-src 'self' neurapress: 'unsafe-inline'",
  "img-src 'self' neurapress: data: blob:",
  "font-src 'self' neurapress: data:",
  "worker-src 'self' neurapress: blob:",
  "connect-src 'self' neurapress:",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ');

/**
 * Must be invoked BEFORE app.whenReady().
 */
function registerPrivilegedSchemes() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true
      }
    }
  ]);
}

/**
 * Configure secure local protocol handler and response headers.
 */
function setupSecurity(targetSession = session.defaultSession) {
  // 1. Handle neurapress:// protocol
  protocol.handle(SCHEME, (request) => {
    try {
      const url = new URL(request.url);
      if (url.host !== APP_HOST) {
        return new Response('Not Found', { status: 404 });
      }

      let reqPath = decodeURIComponent(url.pathname);
      if (reqPath === '/' || reqPath === '') {
        reqPath = '/index.html';
      }

      const safeRelativePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
      const filePath = path.join(APP_ROOT, safeRelativePath);

      // Path traversal security check
      if (!filePath.startsWith(APP_ROOT + path.sep) && filePath !== APP_ROOT) {
        console.warn('[Security] Blocked path traversal attempt:', request.url);
        return new Response('Forbidden', { status: 403 });
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return new Response('Not Found', { status: 404 });
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const fileBuffer = fs.readFileSync(filePath);

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Security-Policy': RESTRICTIVE_CSP,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        }
      });
    } catch (err) {
      console.error('[Security] Protocol handler error:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  });

  // 2. Enforce strict CSP headers on all local responses
  targetSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [RESTRICTIVE_CSP],
        'X-Content-Type-Options': ['nosniff']
      }
    });
  });

  // 3. Deny all permission requests (camera, mic, geolocation, notifications)
  targetSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });
}

/**
 * Harden a BrowserWindow instance against unexpected navigation and popups.
 */
function hardenWindow(window) {
  if (!window || window.isDestroyed()) return;

  // Block unexpected window openings and popups
  window.webContents.setWindowOpenHandler(({ url }) => {
    // Only permit explicit external links to open in external OS browser
    if (url.startsWith('https://') || url.startsWith('http://')) {
      const { shell } = require('electron');
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Block in-window navigation away from the app
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!navigationUrl.startsWith(`${SCHEME}://${APP_HOST}/`)) {
      event.preventDefault();
      console.warn('[Security] Intercepted unauthorized navigation to:', navigationUrl);
    }
  });
}

/**
 * Validate that an IPC invocation originates from a trusted app frame.
 */
function isTrustedSender(event) {
  if (!event || !event.senderFrame) return false;
  const url = event.senderFrame.url || '';
  return url.startsWith(`${SCHEME}://${APP_HOST}/`) || url === `${SCHEME}://${APP_HOST}/index.html`;
}

module.exports = {
  SCHEME,
  APP_HOST,
  RESTRICTIVE_CSP,
  registerPrivilegedSchemes,
  setupSecurity,
  hardenWindow,
  isTrustedSender
};
