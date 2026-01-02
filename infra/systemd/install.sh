#!/bin/bash
# BuildOS - systemd Unit Installer

set -e

echo "⚙️  Installing systemd unit for BuildOS..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root"
    exit 1
fi

# Copy service file
cp buildos.service /etc/systemd/system/

echo "✅ Copied buildos.service to /etc/systemd/system/"

# Reload systemd
systemctl daemon-reload

echo "✅ Reloaded systemd"

# Enable service (start on boot)
systemctl enable buildos.service

echo "✅ Enabled buildos.service"

echo ""
echo "systemd unit installed successfully!"
echo ""
echo "Usage:"
echo "  Start:   systemctl start buildos"
echo "  Stop:    systemctl stop buildos"
echo "  Restart: systemctl restart buildos"
echo "  Status:  systemctl status buildos"
echo "  Logs:    journalctl -u buildos -f"
