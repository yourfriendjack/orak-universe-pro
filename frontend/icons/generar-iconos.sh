#!/bin/bash
# Genera todos los íconos PWA desde orak-logo.svg
SVG="$(dirname "$0")/orak-logo.svg"
OUT="$(dirname "$0")"

SIZES=(72 96 128 144 152 192 384 512)

echo "Generando íconos ORAK..."
for SIZE in "${SIZES[@]}"; do
  convert -background none -resize "${SIZE}x${SIZE}" "$SVG" "${OUT}/icon-${SIZE}.png"
  echo "  ✦ icon-${SIZE}.png"
done
echo "Listo."
