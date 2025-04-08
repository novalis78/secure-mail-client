#!/bin/bash
# Script to generate multiple icon sizes for Linux
# Run this from the build/icons directory

ICON_SOURCE="icon.png"

# Generate various sizes for Linux
convert "$ICON_SOURCE" -resize 16x16 "16x16.png"
convert "$ICON_SOURCE" -resize 32x32 "32x32.png"
convert "$ICON_SOURCE" -resize 48x48 "48x48.png"
convert "$ICON_SOURCE" -resize 64x64 "64x64.png"
convert "$ICON_SOURCE" -resize 128x128 "128x128.png"
convert "$ICON_SOURCE" -resize 256x256 "256x256.png"
convert "$ICON_SOURCE" -resize 512x512 "512x512.png"
convert "$ICON_SOURCE" -resize 1024x1024 "1024x1024.png"

# For macOS we need icns format
# Create temporary iconset directory
mkdir -p app.iconset

# Generate Mac icon set
convert "$ICON_SOURCE" -resize 16x16 app.iconset/icon_16x16.png
convert "$ICON_SOURCE" -resize 32x32 app.iconset/icon_16x16@2x.png
convert "$ICON_SOURCE" -resize 32x32 app.iconset/icon_32x32.png
convert "$ICON_SOURCE" -resize 64x64 app.iconset/icon_32x32@2x.png
convert "$ICON_SOURCE" -resize 128x128 app.iconset/icon_128x128.png
convert "$ICON_SOURCE" -resize 256x256 app.iconset/icon_128x128@2x.png
convert "$ICON_SOURCE" -resize 256x256 app.iconset/icon_256x256.png
convert "$ICON_SOURCE" -resize 512x512 app.iconset/icon_256x256@2x.png
convert "$ICON_SOURCE" -resize 512x512 app.iconset/icon_512x512.png
convert "$ICON_SOURCE" -resize 1024x1024 app.iconset/icon_512x512@2x.png

# Create icns file (requires iconutil - macOS only)
iconutil -c icns app.iconset -o icon.icns

# Remove temporary iconset directory
rm -rf app.iconset

echo "Icons generated successfully!"