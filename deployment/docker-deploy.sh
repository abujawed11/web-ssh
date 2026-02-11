#!/bin/bash

# Docker Deployment Script for Web SSH
# Run this on your VPS

set -e

echo "========================================="
echo "Web SSH Docker Deployment Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed ($(docker --version))${NC}"
fi

# Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Installing Docker Compose...${NC}"
    apt-get update
    apt-get install -y docker-compose-plugin
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose already installed ($(docker compose version))${NC}"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    if [ -f .env.production ]; then
        echo -e "${YELLOW}Copying .env.production to .env${NC}"
        cp .env.production .env
        echo -e "${RED}WARNING: Please edit .env file with your secure credentials!${NC}"
        echo -e "${YELLOW}Press Enter to edit .env now, or Ctrl+C to exit...${NC}"
        read
        nano .env
    else
        echo -e "${RED}ERROR: No .env or .env.production file found!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Validate required environment variables
echo -e "${YELLOW}Validating environment variables...${NC}"
source .env

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" == "your_secure_password_here" ]; then
    echo -e "${RED}ERROR: Please set a secure POSTGRES_PASSWORD in .env${NC}"
    exit 1
fi

if [ -z "$MASTER_KEY" ] || [ "$MASTER_KEY" == "your_32_byte_hex_master_key_here" ]; then
    echo -e "${RED}ERROR: Please set MASTER_KEY in .env${NC}"
    echo -e "${YELLOW}Generate one with: openssl rand -hex 32${NC}"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" == "your_random_jwt_secret_here" ]; then
    echo -e "${RED}ERROR: Please set JWT_SECRET in .env${NC}"
    echo -e "${YELLOW}Generate one with: openssl rand -base64 48${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables validated${NC}"

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp  # SSH
    ufw allow 80/tcp  # HTTP
    ufw allow 443/tcp # HTTPS
    echo "y" | ufw enable || true
    echo -e "${GREEN}✓ Firewall configured${NC}"
else
    echo -e "${YELLOW}⚠ UFW not installed, skipping firewall configuration${NC}"
fi

# Build Docker images
echo -e "${YELLOW}Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache
echo -e "${GREEN}✓ Docker images built${NC}"

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Services started${NC}"

# Wait for database to be ready
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 10

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy
echo -e "${GREEN}✓ Database migrations completed${NC}"

# Check service status
echo -e "${YELLOW}Checking service status...${NC}"
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Services running:"
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  - Stop services: docker compose -f docker-compose.prod.yml stop"
echo "  - Restart services: docker compose -f docker-compose.prod.yml restart"
echo "  - Update app: docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "Access your application at: http://$(hostname -I | awk '{print $1}')"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Update nginx/conf.d/web-ssh.conf with your domain"
echo "  2. Set up SSL certificates (see DOCKER-DEPLOYMENT.md)"
echo "  3. Test your application"
echo ""
