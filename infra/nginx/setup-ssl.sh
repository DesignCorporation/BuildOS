#!/bin/bash
# BuildOS - Let's Encrypt SSL Setup

set -e

echo "🔐 Setting up Let's Encrypt SSL for BuildOS..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root"
    exit 1
fi

# Create webroot directory for certbot challenges
mkdir -p /var/www/certbot

# Create temporary Nginx config for ACME challenge (HTTP only)
cat > /etc/nginx/sites-available/buildos-temp.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name buildos.designcorp.eu operator.buildos.designcorp.eu;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'BuildOS - SSL Setup in Progress';
        add_header Content-Type text/plain;
    }
}
EOF

# Enable temp config
ln -sf /etc/nginx/sites-available/buildos-temp.conf /etc/nginx/sites-enabled/

# Disable any existing configs to avoid conflicts
rm -f /etc/nginx/sites-enabled/buildos.designcorp.eu.conf
rm -f /etc/nginx/sites-enabled/operator.buildos.designcorp.eu.conf
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

echo "✅ Temporary Nginx config enabled"

# Get SSL certificates
echo "📜 Requesting SSL certificates from Let's Encrypt..."
certbot certonly --webroot \
    -w /var/www/certbot \
    -d buildos.designcorp.eu \
    -d operator.buildos.designcorp.eu \
    --email info@designcorp.eu \
    --agree-tos \
    --no-eff-email \
    --keep-until-expiring

echo "✅ SSL certificates obtained!"

# Remove temp config
rm -f /etc/nginx/sites-enabled/buildos-temp.conf

# Install final configs with SSL
cd "$(dirname "$0")"
bash install.sh

echo "✅ SSL setup complete!"
echo ""
echo "Certificates installed:"
echo "  - buildos.designcorp.eu"
echo "  - operator.buildos.designcorp.eu"
echo ""
echo "Auto-renewal: certbot renew (runs twice daily via systemd timer)"
