#!/bin/bash
# BuildOS - Nginx Configuration Installer

set -e

echo "🔧 Installing Nginx configuration for BuildOS..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root"
    exit 1
fi

# Backup existing configs (if any)
BACKUP_DIR="/etc/nginx/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "/etc/nginx/sites-available/buildos.designcorp.eu.conf" ]; then
    cp /etc/nginx/sites-available/buildos.designcorp.eu.conf "$BACKUP_DIR/"
    echo "📦 Backed up existing buildos config to $BACKUP_DIR"
fi

if [ -f "/etc/nginx/sites-available/operator.buildos.designcorp.eu.conf" ]; then
    cp /etc/nginx/sites-available/operator.buildos.designcorp.eu.conf "$BACKUP_DIR/"
    echo "📦 Backed up existing operator config to $BACKUP_DIR"
fi

# Copy new configs
cp buildos.designcorp.eu.conf /etc/nginx/sites-available/
cp operator.buildos.designcorp.eu.conf /etc/nginx/sites-available/

echo "✅ Copied config files to /etc/nginx/sites-available/"

# Create symlinks
ln -sf /etc/nginx/sites-available/buildos.designcorp.eu.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/operator.buildos.designcorp.eu.conf /etc/nginx/sites-enabled/

echo "✅ Created symlinks in /etc/nginx/sites-enabled/"

# Test configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

echo "✅ Nginx configuration installed successfully!"
echo ""
echo "Next steps:"
echo "1. Install SSL certificates: certbot --nginx -d buildos.designcorp.eu -d operator.buildos.designcorp.eu"
echo "2. Check status: systemctl status nginx"
