# Contributing to NEURAPRESS Quantum PDF Compressor

Thank you for your interest in contributing to **NEURAPRESS Quantum PDF Compressor**, an open-source project created and maintained by **Tahir Shaikh (Neuron TS Labs)**! We welcome community contributions, bug reports, and enhancements.

---

## 1. Code of Conduct

All contributors and participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) in all project spaces.

---

## 2. Developer Certificate of Origin (DCO) & Licensing

To protect the project, users, and all contributors against intellectual property and copyright disputes, all contributions must comply with the **Developer Certificate of Origin (DCO Version 1.1)**:

```text
By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

By submitting a Pull Request, you agree that your contributions are licensed under the repository's [MIT License](LICENSE).

---

## 3. Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v9.0.0 or higher
- **Python (Optional)**: 3.10+ (if testing or modifying the standalone Python GUI)

### Getting Started

1. **Fork and Clone the Repository:**
   ```bash
   git clone https://github.com/<your-username>/neurapress-windows-app.git
   cd neurapress-windows-app
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Launch in Development Mode:**
   ```bash
   npm start
   ```
   *(or double-click `run_dev.bat` on Windows)*

4. **Run Smoke & Pipeline Tests:**
   ```bash
   npm run selftest
   ```

---

## 4. Submitting Pull Requests

1. **Create a Feature Branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Offline-First Rule:** NEURAPRESS is strictly offline. **Do not introduce runtime network calls, external CDNs, tracking pixels, or remote telemetry.** Any new dependencies must either be vendored locally or bundled into the application without runtime internet requirements.
3. **Commit Cleanly:** Write concise, descriptive commit messages.
4. **Push and Open PR:** Push your branch to your fork and submit a PR to the `main` branch. Describe the changes and reference any related issue numbers.
