#!/bin/bash
# ============================================================
# Lyra Pi 5 Setup Script
# ============================================================
# Installs everything needed for Option C (desktop agent) AND
# Option B (Ollama local AI) on a Raspberry Pi 5.
#
# Run as your normal user (not root):
#   chmod +x pi-setup.sh && ./pi-setup.sh
# ============================================================

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[lyra]${NC} $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $1"; }

# ── System packages ──────────────────────────────────────────
info "Updating apt..."
sudo apt-get update -qq

info "Installing system dependencies..."
sudo apt-get install -y \
  python3 python3-pip python3-venv python3-tk python3-dev \
  scrot xdotool x11-utils \
  curl wget git unzip \
  libatlas-base-dev libjpeg-dev libpng-dev

# ── Python virtual env ───────────────────────────────────────
VENV_DIR="$HOME/.lyra-agent-env"
if [ ! -d "$VENV_DIR" ]; then
  info "Creating Python venv at $VENV_DIR..."
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
pip install --upgrade pip -q
pip install pyautogui pillow requests pyscreenshot -q
info "Python deps installed."

# ── Write .env file ──────────────────────────────────────────
ENV_FILE="$HOME/.lyra-agent.env"
if [ ! -f "$ENV_FILE" ]; then
  info "Creating $ENV_FILE — fill in your credentials."
  cat > "$ENV_FILE" <<'EOF'
# Lyra Agent credentials
# Get your user ID and agent key from https://aitaskflo.com/account
LYRA_URL=https://aitaskflo.com
LYRA_USER=YOUR_USER_ID
LYRA_KEY=YOUR_AGENT_KEY
DISPLAY=:0
EOF
  warn "Edit $ENV_FILE and set your LYRA_USER and LYRA_KEY before starting."
fi

# ── Systemd service for Option C (desktop agent) ─────────────
AGENT_SCRIPT="$(dirname "$(realpath "$0")")/lyra-agent.py"
SERVICE_FILE="$HOME/.config/systemd/user/lyra-agent.service"
mkdir -p "$(dirname "$SERVICE_FILE")"

info "Writing systemd user service for desktop agent..."
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Lyra Desktop Agent
After=graphical-session.target

[Service]
Type=simple
EnvironmentFile=$ENV_FILE
Environment=DISPLAY=:0
ExecStart=$VENV_DIR/bin/python $AGENT_SCRIPT
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
info "Service file written: $SERVICE_FILE"
info "Start with:  systemctl --user start lyra-agent"
info "Enable auto-start: systemctl --user enable lyra-agent"

# ── Option B: Ollama ─────────────────────────────────────────
echo ""
read -r -p "Install Ollama for local AI (Option B)? [y/N] " install_ollama
if [[ "$install_ollama" =~ ^[Yy]$ ]]; then
  if ! command -v ollama &> /dev/null; then
    info "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
  else
    info "Ollama already installed."
  fi

  # Pull a lightweight model good for Pi 5 (8GB RAM)
  info "Pulling llama3.2:3b (fast, fits in Pi 5 RAM)..."
  ollama pull llama3.2:3b

  # Optional: also pull a coding-focused model
  read -r -p "Also pull qwen2.5-coder:3b (good for coding tasks)? [y/N] " pull_coder
  if [[ "$pull_coder" =~ ^[Yy]$ ]]; then
    ollama pull qwen2.5-coder:3b
  fi

  # Ollama systemd service (if not already running)
  if ! systemctl is-active --quiet ollama 2>/dev/null; then
    info "Enabling Ollama service..."
    sudo systemctl enable ollama
    sudo systemctl start ollama
  fi

  # Get Pi's local IP for the .env hint
  PI_IP=$(hostname -I | awk '{print $1}')
  info "Ollama is running on this Pi at: http://${PI_IP}:11434"
  info ""
  info "In your aitaskflo .env.local on the server, add:"
  echo "  OLLAMA_URL=http://${PI_IP}:11434"
  info "Then Lyra will use your Pi for local AI inference."
fi

# ── Done ─────────────────────────────────────────────────────
echo ""
info "Setup complete!"
echo ""
echo "  Option C (Desktop Agent):"
echo "    1. Edit ~/.lyra-agent.env with your user ID and key"
echo "    2. systemctl --user start lyra-agent"
echo "    3. Watch logs: journalctl --user -fu lyra-agent"
echo ""
echo "  Option B (Ollama on Pi):"
echo "    Add OLLAMA_URL=http://<pi-ip>:11434 to your server's .env.local"
echo ""
