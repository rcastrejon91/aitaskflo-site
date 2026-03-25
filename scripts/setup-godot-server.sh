#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# setup-godot-server.sh
# Installs Godot 4.4 (headless) + Web export templates on Ubuntu.
# Run once on the DigitalOcean server as root.
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

GODOT_VERSION="4.4"
GODOT_RELEASE="stable"
GODOT_DIR="/opt/godot"
INSTALL_BIN="/usr/local/bin/godot4"

GODOT_URL="https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}-${GODOT_RELEASE}/Godot_v${GODOT_VERSION}-${GODOT_RELEASE}_linux.x86_64.zip"
TEMPLATES_URL="https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}-${GODOT_RELEASE}/Godot_v${GODOT_VERSION}-${GODOT_RELEASE}_export_templates.tpz"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Godot ${GODOT_VERSION} Headless + Web Templates Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Dependencies ──────────────────────────────────────────────────
echo "[1/5] Installing dependencies…"
apt-get update -qq
apt-get install -y -qq unzip wget libfontconfig1 libxi6 libglu1-mesa

# ── Download Godot headless ───────────────────────────────────────
echo "[2/5] Downloading Godot ${GODOT_VERSION} headless…"
mkdir -p "$GODOT_DIR"
wget -q --show-progress -O "$GODOT_DIR/godot.zip" "$GODOT_URL"
unzip -q -o "$GODOT_DIR/godot.zip" -d "$GODOT_DIR"
GODOT_BIN=$(find "$GODOT_DIR" -name "Godot_v*_linux.x86_64" | head -1)
chmod +x "$GODOT_BIN"
ln -sf "$GODOT_BIN" "$INSTALL_BIN"
echo "   ✓ Installed to $INSTALL_BIN"

# ── Download export templates ─────────────────────────────────────
echo "[3/5] Downloading export templates (this is large ~500MB)…"
wget -q --show-progress -O "$GODOT_DIR/templates.tpz" "$TEMPLATES_URL"

# ── Install export templates ──────────────────────────────────────
echo "[4/5] Installing export templates…"
TEMPLATES_DIR="$HOME/.local/share/godot/export_templates/${GODOT_VERSION}.${GODOT_RELEASE}"
mkdir -p "$TEMPLATES_DIR"
unzip -q -o "$GODOT_DIR/templates.tpz" -d "$GODOT_DIR/templates_tmp"
cp "$GODOT_DIR/templates_tmp/templates/"* "$TEMPLATES_DIR/"
rm -rf "$GODOT_DIR/templates_tmp"
echo "   ✓ Templates installed to $TEMPLATES_DIR"

# ── Smoke test ────────────────────────────────────────────────────
echo "[5/5] Smoke test…"
"$INSTALL_BIN" --version
echo "   ✓ Godot working"

# ── Create public/games dir ───────────────────────────────────────
APP_DIR="/var/www/aitaskflo"
if [ -d "$APP_DIR" ]; then
  mkdir -p "$APP_DIR/public/games"
  echo "   ✓ Created $APP_DIR/public/games"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done! Godot ${GODOT_VERSION} headless is ready."
echo "  Lyra will now auto-export games to HTML5 after builds."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
