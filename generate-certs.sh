#!/bin/bash

# Script to generate SSL certificates for localhost and local IP access

echo "🔒 SSL Certificate Generator for Vite Dev Server"
echo "================================================"
echo ""

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null
then
    echo "❌ mkcert is not installed."
    echo ""
    echo "Please install it first:"
    echo "  macOS:   brew install mkcert"
    echo "  Linux:   See https://github.com/FiloSottile/mkcert#installation"
    echo ""
    exit 1
fi

# Get local IP address
echo "🔍 Detecting local IP address..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
else
    echo "⚠️  Unable to automatically detect IP on this OS"
    LOCAL_IP=""
fi

if [ -z "$LOCAL_IP" ]; then
    echo "⚠️  Could not auto-detect IP address."
    read -p "Please enter your local IP address manually: " LOCAL_IP
fi

echo "✅ Local IP: $LOCAL_IP"
echo ""

# Backup existing certificates if they exist
if [ -f "localhost-key.pem" ] || [ -f "localhost.pem" ]; then
    echo "📦 Backing up existing certificates..."
    BACKUP_DIR="certs-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    [ -f "localhost-key.pem" ] && mv localhost-key.pem "$BACKUP_DIR/"
    [ -f "localhost.pem" ] && mv localhost.pem "$BACKUP_DIR/"
    echo "✅ Backed up to: $BACKUP_DIR"
    echo ""
fi

# Install mkcert CA if not already done
echo "🔧 Setting up mkcert certificate authority..."
mkcert -install

echo ""
echo "🔨 Generating certificates for:"
echo "   - localhost"
echo "   - 127.0.0.1"
echo "   - ::1"
echo "   - $LOCAL_IP"
echo ""

# Generate certificates
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 ::1 "$LOCAL_IP"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Certificates generated successfully!"
    echo ""
    echo "📝 You can now access your dev server at:"
    echo "   https://localhost:3000"
    echo "   https://127.0.0.1:3000"
    echo "   https://$LOCAL_IP:3000"
    echo ""
    echo "🚀 Run 'npm run dev' to start your server"
else
    echo ""
    echo "❌ Certificate generation failed"
    exit 1
fi
