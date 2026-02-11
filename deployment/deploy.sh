#!/bin/bash

# Web SSH Deployment Script
# Run this script on your VPS as root or with sudo

set -e

echo "======================================="
echo "Web SSH Deployment Script"
echo "======================================="

# Variables
BACKEND_DIR="/home/ubuntu/web-ssh"
FRONTEND_DIR="/var/www/web-ssh"
SERVICE_FILE="web-ssh.service"
NGINX_CONFIG="nginx-web-ssh.conf"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or with sudo"
  exit 1
fi

# Create necessary directories
echo "Creating directories..."
mkdir -p $BACKEND_DIR
mkdir -p $FRONTEND_DIR
mkdir -p /var/log/web-ssh

# Set ownership
chown -R ubuntu:ubuntu $BACKEND_DIR
chown -R www-data:www-data $FRONTEND_DIR
chown -R ubuntu:ubuntu /var/log/web-ssh

echo "✓ Directories created"

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "✓ Node.js installed"
else
    echo "✓ Node.js already installed ($(node -v))"
fi

# Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL..."
    apt-get update
    apt-get install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
    echo "✓ PostgreSQL installed"
else
    echo "✓ PostgreSQL already installed"
fi

# Install Redis if not present
if ! command -v redis-cli &> /dev/null; then
    echo "Installing Redis..."
    apt-get install -y redis-server
    systemctl enable redis-server
    systemctl start redis-server
    echo "✓ Redis installed"
else
    echo "✓ Redis already installed"
fi

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
    echo "✓ Nginx installed"
else
    echo "✓ Nginx already installed"
fi

# Copy systemd service file
echo "Installing systemd service..."
cp $SERVICE_FILE /etc/systemd/system/
systemctl daemon-reload
echo "✓ Systemd service installed"

# Copy Nginx configuration
echo "Installing Nginx configuration..."
cp $NGINX_CONFIG /etc/nginx/sites-available/web-ssh
ln -sf /etc/nginx/sites-available/web-ssh /etc/nginx/sites-enabled/
nginx -t
echo "✓ Nginx configuration installed"

echo ""
echo "======================================="
echo "Deployment setup complete!"
echo "======================================="
echo ""
echo "Next steps:"
echo "1. Copy your backend code to: $BACKEND_DIR"
echo "2. Copy your frontend build to: $FRONTEND_DIR"
echo "3. Configure environment variables in: $BACKEND_DIR/ssh-back/.env"
echo "4. Run Prisma migrations: cd $BACKEND_DIR/ssh-back && npx prisma migrate deploy"
echo "5. Update nginx config with your domain/IP"
echo "6. Start the service: systemctl start web-ssh"
echo "7. Reload nginx: systemctl reload nginx"
echo ""
echo "Useful commands:"
echo "  - Check service status: systemctl status web-ssh"
echo "  - View logs: journalctl -u web-ssh -f"
echo "  - Restart service: systemctl restart web-ssh"
echo ""
