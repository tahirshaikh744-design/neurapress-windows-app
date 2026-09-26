# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['standalone_gui.py'],
    pathex=[],
    binaries=[],
    datas=[('src/engine', 'src/engine')],
    hiddenimports=[
        'pypdf',
        'pypdf.generic',
        'pypdf._page',
        'PIL',
        'PIL.Image',
        'PIL.JpegImagePlugin',
        'PIL.PngImagePlugin',
        'PIL.PdfImagePlugin',
        'tkinter',
        'tkinter.ttk',
        'tkinter.filedialog',
        'tkinter.messagebox'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='NEURAPRESS_Quantum_Native',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    icon=['build/icon.ico'],
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
