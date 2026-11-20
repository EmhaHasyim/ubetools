#!/usr/bin/env bash
# Regenerate every committed raster icon from the source logo with ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."

src=assets/logo-source.png
white() {
	magick "$src" -strip -trim +repage -background white -alpha remove -alpha off \
		-gravity center -extent 1087x1087 "$@"
}
white -resize 512x512 -define avif:quality=55 static/logo-512.avif
white -resize 192x192 -define png:compression-level=9 static/icon-192.png
white -resize 512x512 -define png:compression-level=9 static/icon-512.png
white -resize 180x180 -define png:compression-level=9 static/apple-touch-icon.png
white -resize 32x32 -define png:compression-level=9 static/favicon-32x32.png
white \( -clone 0 -resize 16x16 \) \( -clone 0 -resize 32x32 \) \( -clone 0 -resize 48x48 \) \
	-delete 0 -define png:compression-level=9 static/favicon.ico
magick "$src" -strip -trim +repage -background none -alpha on -gravity center \
	-extent 1087x1087 -resize 64x64 -define png:compression-level=9 static/logo-64.png
magick "$src" -strip -trim +repage -alpha on \
	-gravity center -resize 280x280 -background '#2563EB' -alpha remove -alpha off \
	-extent 512x512 -define png:compression-level=9 static/icon-maskable-512.png
