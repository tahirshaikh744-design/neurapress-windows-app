# Legal Disclaimers & Privacy Notice

**Last Updated:** 2026

Please read this document carefully before using, cloning, or distributing the **NEURAPRESS Quantum PDF Compressor** software repository, created and maintained by **Tahir Shaikh (Neuron TS Labs)**.

---

## 1. Privacy, Data Protection & Offline Guarantee

- **Zero Data Collection:** NEURAPRESS does **not** collect, store, transmit, or monitor any personal data, documents, file paths, device telemetry, or usage metrics.
- **100% Local Execution:** All PDF rendering, analysis, image downsampling, stream re-compression, and file saving operations execute entirely within the local sandbox environment on your machine (via Electron client-side Web Workers, HTML5 Canvas, PDF-Lib, or native Python `pypdf`).
- **No Network Requests:** The software is engineered with offline-vendored dependencies (`vendor/`). It makes zero outbound HTTP/HTTPS requests at runtime. Your confidential documents, legal contracts, financial statements, and medical records never leave your computer.
- **Regulatory Compliance:** Because no data is collected, stored, or processed on external servers, using this software does not trigger external data processor liabilities under GDPR (EU), CCPA (California), HIPAA (US), or similar data protection regulations.

---

## 2. Document Integrity & Data Loss Disclaimer

- **Irreversible Transformations:** PDF compression algorithms may employ lossy image resampling (JPEG/WebP compression), color depth reduction, stream rewriting, and font/metadata pruning. Once compressed, original uncompressed raster data cannot be mathematically recovered from the output file.
- **User Responsibility for Backups:** You are solely responsible for retaining original, uncompressed backup copies of all documents prior to processing.
- **Verification Required:** You must review and verify compressed output files before deleting original documents or submitting them for official, legal, medical, government, or academic use.
- **Disclaimer:** The authors, contributors, and copyright holders assume no liability for any loss of data, corrupted documents, illegible text, altered vector paths, missed deadlines, or formatting degradation resulting from the use of this software.

---

## 3. "AS IS" Warranty Disclaimer

THIS SOFTWARE IS PROVIDED BY THE AUTHORS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT ARE EXPRESSLY DISCLAIMED. 

IN NO EVENT SHALL THE AUTHORS, COPYRIGHT HOLDERS, OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

---

## 4. Trademarks & Non-Affiliation

- **PDF Specification:** "PDF" refers to the Portable Document Format originally created by Adobe Systems and subsequently published as an open international standard by the International Organization for Standardization (ISO 32000-1:2008 / ISO 32000-2:2020).
- **Adobe:** Adobe, Adobe PDF, and Adobe Acrobat are either registered trademarks or trademarks of Adobe Inc. in the United States and/or other countries. NEURAPRESS is an independent open-source project and is **not** affiliated with, sponsored by, authorized by, or endorsed by Adobe Inc.
- **Microsoft & Windows:** Windows, Windows 10, Windows 11, and related logos are trademarks of Microsoft Corporation.
- **Electron:** Electron and the Electron logo are trademarks of the OpenJS Foundation.
- **Other Marks:** All third-party trademarks, service marks, and trade names referenced in this repository belong to their respective owners. Their mention does not imply endorsement, affiliation, or sponsorship.

---

## 5. Security & Responsible Use

You agree not to use NEURAPRESS to process malicious files, exploit system vulnerabilities, or violate any applicable local, state, national, or international laws. The maintainers disclaim any liability for unauthorized or unlawful use of the software.
