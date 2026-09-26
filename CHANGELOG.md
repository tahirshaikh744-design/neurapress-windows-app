# Changelog

All notable changes to the **NEURAPRESS Quantum PDF Compressor** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.0.1] - 2026-09-26

### Major Architectural Overhaul & Security Hardening
NeuraPress has been upgraded in-place from a whole-page canvas rasterizer into a production-grade, preservation-first local selective PDF optimization utility. All processing remains 100% local and offline with zero telemetry.

### Added
- **Selective Optimization Engine (`src/engine/pdf_optimizer.py`):**
  - **Topology Inspection:** Inspects catalog topology, mediabox dimensions, page rotations, AcroForms, annotations, and outlines.
  - **Matrix Transform Analysis:** Scans content stream matrix stacks (`cm` operators before `Do`) to calculate the true displayed DPI: `(pixels / displayed_inches)`.
  - **Selective Resampling:** Downsamples only images exceeding target DPI using high-quality Pillow Lanczos filtering (`Resampling.LANCZOS`).
  - **Format Rules:** Preserves PNG alpha channels and transparency masks to eliminate black background artifacts; protects small glyphs/icons (<64px) and inline images.
  - **Structural Compaction:** Deduplicates identical indirect objects (`compress_identical_objects()`) and losslessly compresses content streams (`compress_content_streams()`).
  - **Output Validation:** Automatically re-verifies output page count, geometry, extractable text, and form fields before delivery.
- **Modular Pipeline Architecture (`src/compression/`):**
  - `compression-engine.js`: Subprocess orchestration, JSON event streaming, cooperative cancellation, and atomic temporary directory staging.
  - `compression-profiles.js`: Parameter validation for Balanced Matrix (~150 DPI), Extreme Matrix (~110 DPI), High Fidelity (~300 DPI), and Manual Calibration (72–300 DPI).
  - `compression-stats.js`: Measured byte calculations for actual savings or growth (no static fake percentage ranges).
  - `compression-cancellation.js`: Cooperative `CancellationToken` with automatic scratch cleanup.
  - `compression-errors.js`: Structured error codes (`INVALID_PDF`, `PASSWORD_REQUIRED`, `CANCELLED`, etc.).
  - Modular analyzers: `document-analyzer.js`, `image-analyzer.js`, `image-optimizer.js`, `structural-optimizer.js`, and `fidelity-verifier.js`.
- **Electron Security Hardening:**
  - `webSecurity: true` and `sandbox: true` enforced on all browser windows.
  - Custom local scheme `neurapress://app/` replacing raw `file://` protocol.
  - Restrictive Content Security Policy (CSP) blocking external scripts, frames, and eval.
  - Minimal `preload.js` contextBridge exposing strictly whitelisted APIs with zero raw `ipcRenderer`, `require`, or Node runtime leaks.
  - Navigation guards and child window opening blocks.
- **UI & Telemetry Enhancements (`index.html`):**
  - Target Image DPI (72–300 DPI) and JPEG Quality (20–95%) sliders replacing arbitrary render scale.
  - Remove Metadata toggle and Monochrome mode.
  - Non-blocking security warnings for digital signatures, passwords, and inline images.
  - Real stage tracking (Analyzing, Optimizing Images, Structural Optimization, Validating).
  - ABORT/CANCEL button wired to cooperative cancellation tokens.
  - Bounded thumbnail memory: 50px mini-previews preventing memory exhaustion on 500+ page documents.
  - Automatic Keep-Original Protection: preserves original file by default if output increases in size.
- **Python Engine & Dependencies:**
  - Pinned `requirements.txt`: `pypdf==6.19.0`, `pillow==12.3.0`, `pyinstaller==6.22.3`.
  - Authoritative PyInstaller specification (`NEURAPRESS_Quantum_Native.spec`).
  - 100% thread-safe Tkinter UI in `standalone_gui.py` using `root.after()` and headless CLI support.
- **Automated Regression Suite (`selftest.js`):**
  - 13 comprehensive end-to-end regression tests verifying security, AcroForms, outlines, text preservation, rotation, cancellation, and corrupt file rejection.

---

## [5.0.0] - 2026-09-25

### Initial Release
- Initial public release of NEURAPRESS Quantum PDF Compressor.
- Native Windows 64-bit desktop application with Cyberpunk Quantum HUD theme.
- 100% offline vendored libraries (PDF.js, pdf-lib, Tone.js, Tailwind CSS, Font Awesome Free).
- Dual execution: Electron desktop suite and standalone native Python GUI.
- Portable executable and NSIS installer generation.
- Full MIT License, legal disclaimers, and open-source attribution.
