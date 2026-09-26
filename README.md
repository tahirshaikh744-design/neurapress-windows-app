# NEURAPRESS // Quantum PDF Compressor

<p align="center">
  <img src="build/icon.png" alt="NEURAPRESS Quantum Emblem" width="128" height="128" />
</p>

<p align="center">
  <strong>Local Selective PDF Optimization & Compression Suite</strong><br>
  <em>Developed by <strong>Tahir Shaikh</strong> • Brand: <strong>Neuron TS Labs</strong></em><br>
  <em>100% Local Processing. Zero Remote Uplinks. Cyberpunk Quantum HUD Interface.</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-cyan.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Platform-Windows%2064--bit-blue.svg" alt="Platform">
  <img src="https://img.shields.io/badge/Network-100%25%20Offline-success.svg" alt="Offline Ready">
  <img src="https://img.shields.io/badge/Engine-Selective%20Optimization-indigo.svg" alt="Selective Engine">
</p>

---

## Overview

**NEURAPRESS Quantum PDF Compressor** is a local Windows desktop utility designed for selective PDF document optimization and compression. Featuring a responsive, cyberpunk-inspired quantum HUD interface, NEURAPRESS processes PDF streams entirely on your local machine with zero external network connectivity or cloud dependencies.

Unlike legacy PDF utilities that flatten entire pages into lossy whole-page JPEG bitmaps, NEURAPRESS implements a **preservation-first selective optimization pipeline**:
- **Preserves Page Topology:** Selectable text, vector linework, forms (AcroForms), bookmarks/outlines, annotations, and hyperlinks are preserved.
- **Selective Image Recompression:** Analyzes individual embedded images, calculates their effective display resolution (DPI) from PDF transformation matrices, and selectively downsamples/re-encodes oversized images using high-quality Lanczos resampling.
- **Structural Optimization:** Eliminates redundant PDF object streams and applies lossless content stream compression.
- **Real Before/After Metrics:** Delivers true measured byte measurements and explicitly reports output growth if a pre-compressed document cannot be further reduced.

---

## Key Features

- **100% Local & Offline:** No files, page content, or analytics ever leave your device. All compression operations run locally inside workstation memory and temporary isolated sandboxes.
- **Preservation-First Architecture:**
  - Searchable text remains searchable and selectable.
  - Vector diagrams, charts, and logos remain sharp vector shapes.
  - Hyperlinks, annotations, bookmarks, and AcroForm fields are preserved.
  - Page dimensions and rotations (portrait/landscape/rotated) are maintained.
- **Adaptive Compression Profiles:**
  - **Balanced Matrix (Default):** Target ~150 DPI, JPEG Quality 70. Recommended for business documents, reports, and manuals. Excellent size reduction while keeping images sharp and text crisp.
  - **Extreme Matrix:** Target ~110 DPI, JPEG Quality 50. Maximum practical reduction for email attachments and storage archiving.
  - **High Fidelity:** Target ~300 DPI, JPEG Quality 85. Conservative optimization preserving fine details in photographs, scans, and technical diagrams.
  - **Manual Calibration:** Full manual control over target DPI (72–300 DPI), JPEG quality (20–95%), metadata stripping, and monochrome conversion.
- **Automatic Keep-Original Protection:** If optimization results in file size growth (e.g., already-optimized JPEG PDFs or small vector documents), NeuraPress preserves your original file by default and reports actual growth percentages without misleading claims.
- **Real-Time Quantum HUD:** Visual progress tracking with stage-weighted execution (Analyzing, Optimizing Images, Structural Optimization, Output Validation), audio acoustic feedback, and live low-memory thumbnail rendering.
- **Electron Security Hardening:** Strict renderer sandboxing, `contextIsolation: true`, `webSecurity: true`, custom application protocol `neurapress://`, and minimal non-leaking IPC bridges.
- **Dual Execution Modes:**
  - **Electron Desktop Suite:** Full interactive HUD experience with native Windows "Save As" file dialogs.
  - **Python Native GUI / CLI (`standalone_gui.py`):** Standalone fallback executable powered by `pypdf` and `Pillow` with zero Node.js runtime requirement.

---

## How Compression Works

The NeuraPress optimization engine processes PDFs through five sequential stages:

```text
Input PDF
    ↓
1. Document Analysis (Catalog, Pages, Encryption, Signatures, Forms, Outlines)
    ↓
2. Image Inspection (Individual Embedded XObjects, Transformation Matrices, Effective DPI)
    ↓
3. Selective Optimization (Target-DPI Lanczos Resampling, JPEG Recompression, Alpha Preservation)
    ↓
4. Structural Compaction (Object Deduplication, Content Stream Flate Compression)
    ↓
5. Output Validation (Integrity Checks, Text Extraction Verification, Geometry Matching)
    ↓
Optimized PDF + Real Byte Statistics
```

### 1. Document Analysis
The document is opened locally using `pypdf` and structural metadata is gathered: page dimensions, rotations, fonts, AcroForm fields, interactive annotations, document outlines (bookmarks), and digital signature presence. Password-protected files are detected without crashing.

### 2. Image Inspection
Embedded images within each page's resource dictionary (`/XObject`) are analyzed individually. By parsing content stream transformation matrices (`cm` operators), the engine derives each image's approximate displayed size in inches:

$$\text{Effective DPI} = \frac{\text{Pixel Width}}{\text{Displayed Width (inches)}}$$

Images whose effective DPI is already below the target threshold, or small icons/glyphs (< 64px), are left untouched.

### 3. Selective Image Optimization
For optimizable images:
- **Resampling:** Images exceeding target DPI are downsampled using high-fidelity Pillow `Resampling.LANCZOS` filters.
- **Format-Aware Rules:** JPEG images are re-encoded at profile-specific quality levels. PNG images with alpha channels or transparency are preserved to prevent black background artifacts.
- **Inline Images:** Inline images are detected and preserved without forcing whole-page rasterization.

### 4. Structural Optimization
The engine applies lossless compression to uncompressed page content streams via `compress_content_streams()` and deduplicates identical indirect objects via `compress_identical_objects()`. Unreferenced resources are safely pruned without altering form dictionaries or font descriptors.

### 5. Output Validation
Before presenting the final file to the user, the optimized PDF is reopened with an independent parser:
- Verifies document parses without syntax errors.
- Verifies output page count matches source page count.
- Verifies page dimensions and rotations match.
- Verifies text extraction remains functional on representative pages.
- Verifies AcroForms and annotations remain present where applicable.

---

## Understanding Compression Tradeoffs & Limitations

To maintain transparency and user trust, understand the following engineering realities:

- **Lossy Compression Reduces Image Fidelity:** Lowering target DPI (e.g., in Extreme mode) downsamples raster images. While text and vector graphics remain sharp, photographic details are reduced.
- **Digital Signatures:** Digitally signed PDFs rely on cryptographic hashes over the original document bytes. Any structural modification or image recompression will invalidate existing digital signatures. NeuraPress flags signed documents and alerts the user before processing.
- **Already-Compressed PDFs:** Documents consisting of already optimized JPEGs or pure vector paths cannot always be made smaller. When optimization causes slight file size growth (e.g., from updated object tables), NeuraPress reports growth honestly and keeps the original file.
- **Inline Images:** Some older or non-standard PDF generators embed images directly inside page content streams rather than as independent XObjects. NeuraPress preserves inline images as-is to avoid destructive page rasterization.

---

## Project Structure

```
neurapress-windows-app/
├── src/                       # Production Modular Architecture
│   ├── compression/           # Core Compression Pipeline
│   │   ├── compression-cancellation.js # Cooperative abort controller tokens
│   │   ├── compression-engine.js       # Master orchestrator & subprocess launcher
│   │   ├── compression-errors.js       # Structured error categories & codes
│   │   ├── compression-profiles.js     # Validated profile targets (DPI, Quality)
│   │   ├── compression-stats.js        # Accurate byte savings/growth math
│   │   ├── document-analyzer.js        # Node subprocess analyzer runner
│   │   ├── fidelity-verifier.js        # Integrity verification helper
│   │   ├── image-analyzer.js           # Image DPI & candidate analysis
│   │   ├── image-optimizer.js          # Transparency & format rules
│   │   └── structural-optimizer.js     # Stream compaction rules
│   ├── engine/                # Native Optimization Core
│   │   ├── __init__.py                 # Python engine package init
│   │   └── pdf_optimizer.py            # Selective pypdf + Pillow optimizer
│   └── main/                  # Hardened Electron Services
│       ├── file-service.js             # Sandboxed temp isolation & atomic copy
│       ├── ipc-service.js              # Sender-validated privileged IPC handlers
│       └── security.js                 # neurapress:// protocol, CSP, navigation guards
├── vendor/                    # 100% locally vendored engine libraries
│   ├── fontawesome/           # Font Awesome Free 6.5.1 icons & webfonts
│   ├── fonts/                 # JetBrains Mono, Orbitron, Rajdhani (SIL OFL)
│   ├── Tone.js                # Web Audio synthesis engine (MIT)
│   ├── confetti.browser.min.js# Particle confetti engine (ISC)
│   ├── pdf-lib.min.js         # PDF manipulation library (MIT)
│   ├── pdf.min.js             # Mozilla PDF.js rendering core (Apache 2.0)
│   ├── pdf.worker.min.js      # PDF.js background worker (Apache 2.0)
│   └── tailwind.js            # Tailwind CSS client-side runtime (MIT)
├── build_exe.bat              # Deterministic build script (npm ci + electron-builder)
├── build_python_exe.bat       # Deterministic Python PyInstaller builder
├── NEURAPRESS_Quantum_Native.spec # Authoritative PyInstaller specification
├── index.html                 # Main Quantum HUD application UI
├── main.js                    # Electron main process & security setup
├── package.json               # Node.js manifest & locked dependencies
├── preload.js                 # Minimal contextBridge API (no raw ipcRenderer)
├── requirements.txt           # Pinned Python dependencies (pypdf, Pillow, PyInstaller)
├── selftest.js                # Comprehensive automated regression test suite
├── splash.html                # Frameless quantum splash boot screen
├── standalone_gui.py          # Standalone Tkinter/Python compression GUI & CLI
├── DISCLAIMER.md              # Legal disclaimers & trademark notices
├── LICENSE                    # Root MIT License
├── SECURITY.md                # Security policy & vulnerability reporting
└── THIRD_PARTY_LICENSES.md    # Complete open-source attribution & license texts
```

---

## Getting Started

### Prerequisites

- **Node.js** (v18.0.0 to v24.x): [nodejs.org](https://nodejs.org/)
- **npm** (v9.0.0 or higher)
- **Windows 10 / 11 (64-bit)**
- **Python 3.10+** with `pip` (for native Python optimization engine)

### Setup & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/neurapress-windows-app.git
   cd neurapress-windows-app
   ```

2. **Install locked dependencies:**
   ```bash
   # Install Node dependencies deterministically
   npm ci

   # Install pinned Python engine dependencies
   pip install -r requirements.txt
   ```

3. **Run the desktop app:**
   ```bash
   npm start
   ```

4. **Run automated selftest suite:**
   ```bash
   npm test
   # or
   npm run selftest
   ```

---

## Building Executables

### Option A: Electron Desktop Suite

Run the automated build script:
```bash
build_exe.bat
```
Or build specific targets via npm:
```bash
# Compile standalone portable executable (single .exe):
npm run build:portable

# Compile NSIS Windows installer setup:
npm run build:installer

# Compile both targets:
npm run build:all
```
Generated binaries will be located in the `dist/` directory.

### Option B: Standalone Python Native Binary

To compile the lightweight native Python fallback executable using the authoritative PyInstaller spec:
```bash
build_python_exe.bat
```
Output executable: `dist/NEURAPRESS_Quantum_Native.exe`.

### Windows Code Signing

- **Development Builds:** Unsigned development binaries can be run on Windows systems with standard developer settings.
- **Production Code Signing:** To produce signed binaries using `electron-builder`, supply standard code-signing environment variables before running the build:
  ```bash
  set CSC_LINK=path\to\your_certificate.pfx
  set CSC_KEY_PASSWORD=your_certificate_password
  npm run build:all
  ```
  Private signing credentials must never be committed to repository source control.

---

## Privacy & Security

- **Strict Local Execution:** All document buffers and streams are parsed and modified locally in temporary sandboxed workspaces.
- **Sandboxed Electron Architecture:**
  - `webSecurity: true` enforced on all renderer windows.
  - `sandbox: true` enabled across all renderer processes.
  - `nodeIntegration: false` and `contextIsolation: true`.
  - Minimal `preload.js` exposing strictly whitelisted methods via `contextBridge`.
  - No direct exposure of `ipcRenderer`, `require`, `process`, `fs`, or `child_process` to renderer scripts.
  - Custom local scheme `neurapress://app/` replaces raw `file://` protocol.
  - Restrictive Content Security Policy (CSP) blocking external scripts and eval.
  - Navigation guards and child window opening blocks.

---

## Legal & Compliance

### Project License
NEURAPRESS Quantum PDF Compressor is released under the **[MIT License](LICENSE)**.  
Copyright © 2026 **Tahir Shaikh (Neuron TS Labs)**.

### Third-Party Licenses & Attribution
This software bundles and redistributes several open-source libraries, fonts, and utilities under permissible licenses (Apache-2.0, MIT, SIL OFL 1.1, ISC, BSD-3-Clause, and CC BY 4.0). Full license texts and copyright attributions are documented in **[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)**.

### Disclaimers & Trademarks
- "PDF" is a registered trademark of Adobe Systems Incorporated / ISO standard (ISO 32000). NEURAPRESS is an independent open-source project and is not affiliated with Adobe Inc.
- Users are advised to retain backup copies of original files prior to compression.
- For complete terms regarding liability limitations, data integrity, and trademark notices, please review **[DISCLAIMER.md](DISCLAIMER.md)**.
- For security vulnerability reporting guidelines, please review **[SECURITY.md](SECURITY.md)**.

---

## Author & Maintainer

- **Author / Sole Contributor:** Tahir Shaikh
- **Brand:** Neuron TS Labs
- **GitHub:** [@tahirshaikh744-design](https://github.com/tahirshaikh744-design)
- **Contact:** tahirshaikh744@gmail.com

---

## Contributing

We welcome contributions! Please review our **[Contributing Guidelines](CONTRIBUTING.md)** and **[Code of Conduct](CODE_OF_CONDUCT.md)** before submitting pull requests. All contributions are subject to the Developer Certificate of Origin (DCO).