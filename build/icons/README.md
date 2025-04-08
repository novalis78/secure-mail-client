# Icon Setup for Secure Mail Client

This directory contains application icons for different platforms:

- `icon.png` - Source icon image
- `icon.icns` - macOS icon format
- `icon.ico` - Windows icon format 
- Multiple sized PNGs (16x16, 32x32, etc.) - For Linux platforms

## Generating Icons

If you update the source icon, run the `generate.sh` script to recreate all icon formats:

```bash
cd build/icons
./generate.sh
```

Requirements:
- ImageMagick must be installed for image conversion
- On macOS, the script uses `iconutil` to create .icns files

## Manual Icon Creation (Alternative)

If the script doesn't work, you can use online tools:
- icns: https://cloudconvert.com/png-to-icns
- ico: https://cloudconvert.com/png-to-ico
- PNG resizing: https://resizeimage.net/

## Build Commands

To build for specific platforms:

```bash
npm run build:mac   # macOS builds
npm run build:win   # Windows builds
npm run build:linux # Linux builds
```