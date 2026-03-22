#!/usr/bin/env bash
# Build The 13th Witch for web and deploy to Next.js public folder.
# Run from anywhere — paths are resolved relative to this script.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME_DIR="$SCRIPT_DIR/13th-witch"
OUT_DIR="$(dirname "$SCRIPT_DIR")/public/game"
GODOT="${GODOT_BIN:-godot}"

echo "🧙 Building The 13th Witch..."
echo "   Game  : $GAME_DIR"
echo "   Output: $OUT_DIR"
echo "   Godot : $($GODOT --version 2>&1 | head -1)"

mkdir -p "$OUT_DIR"

# Export web build (headless — no display required)
"$GODOT" --headless \
  --path "$GAME_DIR" \
  --export-release "Web" \
  "$OUT_DIR/index.html" 2>&1

echo ""
echo "✓ Build complete"
echo "  Play at: http://localhost:80/game/index.html"
