// Automated smoke test for the NEURAPRESS fix:
//  1) libraries load offline
//  2) vector/text-only PDF is preserved losslessly (no size explosion)
//  3) image-heavy PDF gets smaller (capped DPI + quantization)
// Then saves a screenshot. Run with: npm run selftest
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const AUTOSAVE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'neura-save-'));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    backgroundColor: '#030712',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      backgroundThrottling: false
    }
  });

  const log = (...a) => console.log('[SELFTEST]', ...a);
  let pass = true;

  win.webContents.on('console-message', (event, level, message) => {
    if (level >= 2) console.log('[PAGE]', message);
  });

  // Mirror the production save flow: on download, write the file to disk.
  // event.preventDefault() in Electron 29 cancels the item outright, so the
  // redirect must happen via setSavePath() alone, set before the blob finishes.
  win.webContents.session.on('will-download', (event, item) => {
    console.log('[SELFTEST] will-download fired, filename =', item.getFilename(), 'state =', item.getState());
    item.setSavePath(path.join(AUTOSAVE_DIR, item.getFilename()));
  });

  const runScenario = async (label, buildDoc, check) => {
    const prog = await win.webContents.executeJavaScript(`
      (async () => {
        const pdfDoc = await (${buildDoc});
        const bytes = await pdfDoc.save();
        const file = new File([bytes], 'scenario.pdf', { type: 'application/pdf' });
        await loadPdfFile(file);
        return { size: bytes.length, pages: AppState.pageCount };
      })()
    `);
    log(label, 'source bytes =', prog.size);

    await win.webContents.executeJavaScript(
      `document.getElementById('compress-action-btn').click();`
    );

    let result = null;
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 500));
      result = await win.webContents.executeJavaScript(`({
        visible: !document.getElementById('results-hud').classList.contains('hidden'),
        orig: document.getElementById('result-orig-size').textContent,
        final: document.getElementById('result-final-size').textContent,
        saved: document.getElementById('result-saved-percent').textContent,
        strategy: (document.getElementById('result-strategy') || {}).textContent || ''
      })`);
      if (result.visible) break;
    }

    const sizes = await win.webContents.executeJavaScript(
      `({ finalBytes: AppState.compressedBlob.size, origBytes: AppState.originalBytes.length })`
    );
    log(label, 'result =', JSON.stringify(result), '| finalBytes =', sizes.finalBytes);

    const ratio = sizes.finalBytes / Math.max(1, sizes.origBytes);
    const ok = check(ratio, sizes, result);
    log(label, ok ? 'PASS' : 'FAIL', `(ratio ${ratio.toFixed(2)})`);
    if (!ok) pass = false;
  };

  try {
    await win.loadFile(path.join(__dirname, 'index.html'));
    await new Promise((r) => setTimeout(r, 1500));

    const libs = await win.webContents.executeJavaScript(`({
      pdfjs: !!window.pdfjsLib,
      pdflib: !!window.PDFLib,
      tone: !!window.Tone,
      confetti: !!window.confetti,
      tailwind: !!window.tailwind,
      ops: !!(window.pdfjsLib && window.pdfjsLib.OPS)
    })`);
    log('LIBRARIES', JSON.stringify(libs));
    if (!libs.pdfjs || !libs.pdflib || !libs.tailwind) pass = false;

    // --- Scenario A: pure vector/text document (must NOT bloat) ---
    await runScenario(
      'VECTOR-DOC',
      `(async () => {
        const { PDFDocument, rgb } = await getPdfLib();
        const d = await PDFDocument.create();
        for (let p = 1; p <= 6; p++) {
          const pg = d.addPage([595, 842]);
          for (let y = 60; y < 780; y += 45) {
            pg.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.6, color: rgb(0.1, 0.35, 0.55), opacity: 0.35 });
          }
          pg.drawRectangle({ x: 50, y: 700, width: 495, height: 80, color: rgb(0.04, 0.08, 0.16), borderColor: rgb(0, 0.95, 1), borderWidth: 1.5 });
          pg.drawText('NEURAPRESS QUANTUM SPECIMEN // P0' + p, { x: 70, y: 730, size: 15, color: rgb(0, 0.95, 1) });
          for (let i = 0; i < 40; i++) {
            pg.drawText('Lorem ipsum "vector text" legibility line ' + (i + 1) + ' of this preserved page. The quick brown fox jumps over the lazy dog while the PDF engine measured telemetry streams.', { x: 60, y: 640 - i * 14, size: 9, color: rgb(0.2, 0.3, 0.5) });
          }
        }
        return d;
      })()`,
      (ratio) => ratio < 1.5
    );

    // --- Scenario B: image-heavy document (must shrink) ---
    await runScenario(
      'IMAGE-DOC',
      `(async () => {
        const c = document.createElement('canvas');
        c.width = 2200; c.height = 1700;
        const x = c.getContext('2d');
        const g = x.createLinearGradient(0, 0, 2200, 1700);
        g.addColorStop(0, '#062a5a'); g.addColorStop(0.5, '#7c3aed'); g.addColorStop(1, '#0e7490');
        x.fillStyle = g; x.fillRect(0, 0, 2200, 1700);
        for (let i = 0; i < 80; i++) {
          x.beginPath();
          x.arc(100 + ((i * 577) % 2000), 100 + ((i * 383) % 1500), 18 + ((i * 29) % 60), 0, Math.PI * 2);
          x.fillStyle = 'hsla(' + ((i * 47) % 360) + ',80%,60%,0.55)';
          x.fill();
        }
        const jpegDataUrl = c.toDataURL('image/jpeg', 0.95);
        const bin = atob(jpegDataUrl.split(',')[1]);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        const { PDFDocument } = await getPdfLib();
        const d = await PDFDocument.create();
        const pg = d.addPage([1400, 1800]);
        const img = await d.embedJpg(u8);
        pg.drawImage(img, { x: 0, y: 0, width: 1400, height: 1800 });
        return d;
      })()`,
      (ratio) => ratio < 0.92
    );

    await new Promise((r) => setTimeout(r, 600));

    // --- Scenario C: verify the "DOWNLOAD COMPRESSED PDF" button really saves ---
    const savedFile = path.join(AUTOSAVE_DIR, 'scenario_optimized.pdf');
    fs.rmSync(savedFile, { force: true });

    const preClick = await win.webContents.executeJavaScript(`({
      hasBlob: !!AppState.compressedBlob,
      blobSize: AppState.compressedBlob ? AppState.compressedBlob.size : 0,
      fileName: AppState.compressedFileName
    })`);
    log('DOWNLOAD pre-click state', JSON.stringify(preClick));

    await win.webContents.executeJavaScript(
      `document.getElementById('download-btn').click();`
    );

    let saved = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (fs.existsSync(savedFile)) {
        saved = fs.statSync(savedFile).size;
        break;
      }
    }
    if (saved && saved > 0) {
      log('DOWNLOAD TEST PASS, wrote', saved, 'bytes ->', savedFile);
    } else {
      log('DOWNLOAD TEST FAIL, file not written:', savedFile);
      pass = false;
    }

    // --- Scenario D: CLEAR button wipes the loaded document state ---
    await win.webContents.executeJavaScript(
      `document.getElementById('clear-file-btn').click();`
    );
    await new Promise((r) => setTimeout(r, 300));
    const clearState = await win.webContents.executeJavaScript(`({
      statusTag: document.getElementById('doc-status-tag').textContent,
      clearHidden: document.getElementById('clear-file-btn').classList.contains('hidden'),
      btnDisabled: document.getElementById('compress-action-btn').disabled,
      hasBlob: !!AppState.compressedBlob,
      filename: document.getElementById('doc-filename').textContent
    })`);
    log('CLEAR TEST state', JSON.stringify(clearState));
    if (clearState.statusTag === 'AWAITING FILE' && clearState.clearHidden && clearState.btnDisabled && !clearState.hasBlob) {
      log('CLEAR TEST PASS');
    } else {
      log('CLEAR TEST FAIL');
      pass = false;
    }

    await new Promise((r) => setTimeout(r, 300));
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, 'selftest_screenshot.png'), img.toPNG());
    log('SCREENSHOT saved: selftest_screenshot.png');
  } catch (err) {
    log('ERROR', err && err.message ? err.message : String(err));
    pass = false;
  }

  log(pass ? 'SELFTEST PASS' : 'SELFTEST FAIL');
  app.exit(pass ? 0 : 1);
});