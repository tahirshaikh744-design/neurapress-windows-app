// electron-builder afterPack hook: embeds the custom icon + version info into
// the packaged app exe AFTER win-unpacked is produced but BEFORE portable/NSIS
// targets are assembled. This is required because signAndEditExecutable=false
// is used to avoid the winCodeSign extraction failure on machines without
// symlink privileges (SeCreateSymbolicLinkPrivilege), and that flag otherwise
// skips the rcedit icon-embedding step entirely.
const path = require('path');
const { execFileSync } = require('child_process');

const RCEDIT = process.env.NEURAPRESS_RCEDIT || path.join(__dirname, 'tools', 'rcedit-x64.exe');

module.exports = async function afterPack(context) {
  const { packager, appOutDir, electronPlatformName } = context;
  if (electronPlatformName !== 'win32') return;

  const exe = path.join(appOutDir, `${packager.appInfo.productFilename}.exe`);
  const ico = path.join(packager.projectDir, 'build', 'icon.ico');

  execFileSync(RCEDIT, [
    exe,
    '--set-icon', ico,
    '--set-version-string', 'ProductName', 'NEURAPRESS Quantum PDF Compressor',
    '--set-version-string', 'FileDescription', 'Hyper-Quantum Local PDF Compressor',
    '--set-version-string', 'CompanyName', 'Neuron TS Labs',
    '--set-version-string', 'LegalCopyright', 'Copyright \u00A9 2026 Tahir Shaikh (Neuron TS Labs)',
    '--set-version-string', 'ProductVersion', '5.0.0',
    '--set-version-string', 'FileVersion', '5.0.0',
    '--set-file-version', '5.0.0',
    '--set-product-version', '5.0.0',
  ], { stdio: 'pipe' });

  console.log('[afterPack] icon + version embedded ->', exe);
};