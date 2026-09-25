# NEURAPRESS // Quantum PDF Compressor

<p align="center">
  <img src="build/icon.png" alt="NEURAPRESS Quantum Emblem" width="128" height="128" />
</p>

<p align="center">
  <strong>Hyper-Quantum Offline Windows Desktop PDF Compression Suite</strong><br>
  <em>Developed by <strong>Tahir Shaikh</strong> • Brand: <strong>Neuron TS Labs</strong></em><br>
  <em>100% Client-Side. Zero Telemetry. Futuristic Quantum HUD Interface.</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-cyan.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Platform-Windows%2064--bit-blue.svg" alt="Platform">
  <img src="https://img.shields.io/badge/Network-100%25%20Offline-success.svg" alt="Offline Ready">
  <img src="https://img.shields.io/badge/Engine-Electron%20%7C%20Python-indigo.svg" alt="Dual Engine">
</p>

---

## Overview

**NEURAPRESS Quantum PDF Compressor** is a native Windows desktop utility designed for ultra-fast, local PDF document optimization and compression. Featuring a responsive, cyberpunk-inspired quantum HUD interface, NEURAPRESS processes PDF streams entirely on your local machine with zero external network connectivity or cloud dependencies.

All engine libraries, rendering modules, icon sets, and typographic assets are vendored locally in `vendor/` to guarantee absolute privacy, compliance, and air-gapped usability.

---

## Key Features

- **100% Air-Gapped & Local:** No files, page content, or analytics ever leave your device. All compression happens locally inside your workstation's memory.
- **Quantum HUD Aesthetics:** Ultra-responsive sci-fi interface featuring real-time diagnostic telemetry, compression velocity gauges, particle bursts, and interactive audio feedback.
- **Adaptive Compression Profiles:**
  - **Overclock / Aggressive:** High-compression downsampling optimized for email attachments and quick sharing.
  - **Balanced / Standard:** Crisp visual balance maintaining typography legibility with substantial file size reduction.
  - **Archival / Pure:** Minimal loss stream compaction suitable for legal, academic, and permanent archives.
- **Dual Execution Modes:**
  - **Electron Desktop Suite:** Full interactive HUD experience with native Windows "Save As" file integration.
  - **Python Native GUI (`standalone_gui.py`):** Lightweight fallback GUI powered by `tkinter` and `pypdf` with zero Node.js runtime requirement.
- **One-Click Native Windows Packaging:** Ready-to-build portable single-binary executables and full NSIS setup installers.

---

## Project Structure

```
neurapress-windows-app/
├── .github/                   # GitHub Issue & PR community templates
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── build/                     # App icons, splash screens, and asset generators
│   ├── icon.ico
│   ├── icon.png
│   └── splash_emblem.png
├── tools/                     # Build tools
│   └── rcedit-x64.exe         # Open-source PE resource editor (MIT)
├── vendor/                    # 100% locally vendored engine libraries
│   ├── fontawesome/           # Font Awesome Free 6.5.1 icons & webfonts
│   ├── fonts/                 # JetBrains Mono, Orbitron, Rajdhani (SIL OFL)
│   ├── Tone.js                # Web Audio synthesis engine (MIT)
│   ├── confetti.browser.min.js# Particle confetti engine (ISC)
│   ├── pdf-lib.min.js         # PDF manipulation library (MIT)
│   ├── pdf.min.js             # Mozilla PDF.js rendering core (Apache 2.0)
│   ├── pdf.worker.min.js      # PDF.js background worker (Apache 2.0)
│   └── tailwind.js            # Tailwind CSS client-side runtime (MIT)
├── after-pack.js              # Electron-builder post-packaging hook
├── build_exe.bat              # Batch script to build Electron .exe files
├── build_full_app.bat         # Production batch build script
├── build_python_exe.bat       # Batch script to compile native Python .exe
├── index.html                 # Main Quantum HUD application UI
├── main.js                    # Electron main process & native dialog handlers
├── make_assets.py             # Procedural asset generator (PIL)
├── package.json               # Node.js project manifest & electron-builder config
├── preload.js                 # Secure Electron context isolation preload
├── run_dev.bat                # Quick-launch development launcher
├── selftest.js                # Automated end-to-end pipeline test
├── splash.html                # Frameless quantum splash boot screen
├── standalone_gui.py          # Standalone Tkinter/Python compression GUI
├── CODE_OF_CONDUCT.md         # Contributor Covenant Code of Conduct
├── CONTRIBUTING.md            # Contribution guidelines & Developer Certificate of Origin
├── DISCLAIMER.md              # Legal disclaimers, data integrity & trademark notices
├── LICENSE                    # Root MIT License
├── SECURITY.md                # Security policy & vulnerability reporting
└── THIRD_PARTY_LICENSES.md    # Complete open-source attribution & license texts
```

---

## Getting Started

### Prerequisites

- **Node.js** (v18.0.0 or higher): [nodejs.org](https://nodejs.org/)
- **npm** (v9.0.0 or higher)
- **Windows 10 / 11 (64-bit)**
- *(Optional)* **Python 3.10+** (only if compiling the standalone Python executable)

### Development Mode

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/neurapress-windows-app.git
   cd neurapress-windows-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the desktop app:**
   ```bash
   npm start
   ```
   *(Alternatively, double-click `run_dev.bat`)*

4. **Run automated pipeline selftest:**
   ```bash
   npm run selftest
   ```

---

## Building Executables

To compile standalone Windows `.exe` files:

### Option A: Electron Desktop Suite (Recommended)

Run the automated build script:
```bash
build_exe.bat
```
Or use the npm script directly:
```bash
# Compile standalone portable executable (no installer needed):
npm run build:portable

# Compile NSIS Windows installer setup:
npm run build:installer

# Compile both targets:
npm run build:all
```
Generated binaries will be located in the `dist/` directory.

### Option B: Standalone Python Native Binary

If you prefer a tiny, Python-based standalone binary without Electron:
```bash
build_python_exe.bat
```
*(Requires Python and pip installed. Runs PyInstaller with `standalone_gui.py`).*

---

## Privacy & Security

- **Zero Cloud Communication:** NEURAPRESS does not establish outbound socket or HTTP connections during document processing.
- **Confidentiality:** Documents loaded into the application exist solely in volatile local memory during processing and are saved directly to your chosen local disk path.
- **Security Policy:** For instructions on reporting security considerations, please consult our [Security Policy](SECURITY.md).

---

## Legal & Compliance

### Project License
NEURAPRESS Quantum PDF Compressor is released under the **[MIT License](LICENSE)**.  
Copyright © 2026 **Tahir Shaikh (Neuron TS Labs)**.

### Third-Party Licenses & Attribution
This software bundles and redistributes several open-source libraries, fonts, and utilities under permissible licenses (Apache-2.0, MIT, SIL OFL 1.1, ISC, BSD-3-Clause, and CC BY 4.0). Full license texts and copyright attributions are meticulously documented in **[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)**.

### Disclaimers & Trademarks
- "PDF" is a registered trademark of Adobe Systems Incorporated / ISO standard (ISO 32000). NEURAPRESS is an independent open-source project and is not affiliated with Adobe Inc.
- Users are advised to retain backup copies of original files prior to compression.
- For complete terms regarding liability limitations, data integrity, and trademark notices, please review **[DISCLAIMER.md](DISCLAIMER.md)**.

---

## Author & Maintainer

- **Author / Sole Contributor:** Tahir Shaikh
- **Brand:** Neuron TS Labs
- **GitHub:** [@tahirshaikh744-design](https://github.com/tahirshaikh744-design)
- **Contact:** tahirshaikh744@gmail.com

---

## Contributing

We welcome contributions! Please review our **[Contributing Guidelines](CONTRIBUTING.md)** and **[Code of Conduct](CODE_OF_CONDUCT.md)** before submitting pull requests. All contributions are subject to the Developer Certificate of Origin (DCO).