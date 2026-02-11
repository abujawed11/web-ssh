# Web SSH VPS Deployment Guide

This guide will help you deploy the Web SSH application on your VPS.

## Prerequisites

- VPS with Ubuntu (or Debian-based Linux)
- Root or sudo access
- Domain name (optional, can use IP address)

## Directory Structure

```
/home/ubuntu/web-ssh/          # Backend application
├── ssh-back/                   # Backend Node.js code
│   ├── src/
│   ├── .env                    # Environment variables
│   └── package.json
└── ssh-front/                  # Frontend source (optional, for rebuilds)

/var/www/web-ssh/               # Frontend build files (served by nginx)
├── index.html
├── assets/
└── ...

/etc/systemd/system/            # Systemd service
└── web-ssh.service

/etc/nginx/sites-available/     # Nginx configuration
└── web-ssh
```

## Deployment Steps

### 1. Prepare Your VPS

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies (if using deploy.sh, this is automatic)
sudo apt install -y nodejs npm postgresql redis-server nginx
```

### 2. Upload Files to VPS

**Option A: Using Git (Recommended)**
```bash
# On your VPS
cd /home/ubuntu
git clone <your-repo-url> web-ssh
cd web-ssh
```

**Option B: Using SCP/SFTP**
```bash
# From your local machine
scp -r ssh-back root@srv991231:/home/ubuntu/web-ssh/
scp -r deployment root@srv991231:/home/ubuntu/web-ssh/
```

### 3. Run Deployment Script

```bash
# On your VPS
cd /home/ubuntu/web-ssh/deployment
chmod +x deploy.sh
sudo ./deploy.sh
```

This script will:
- Install Node.js, PostgreSQL, Redis, and Nginx
- Create necessary directories
- Copy systemd and nginx configuration files
- Set proper permissions

### 4. Setup Backend

```bash
cd /home/ubuntu/web-ssh/ssh-back

# Install dependencies
npm install --production

# Create .env file
cp .env.example .env
nano .env  # Edit with your actual values
```

**Example .env file:**
```env
PORT=8080
DATABASE_URL="postgresql://webssh_user:your_password@localhost:5432/webssh?schema=public"
REDIS_URL="redis://localhost:6379"
MASTER_KEY="your-32-byte-hex-master-key"
JWT_SECRET="your-random-jwt-secret"
NODE_ENV=production
```

**Setup PostgreSQL Database:**
```bash
# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE webssh;
CREATE USER webssh_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE webssh TO webssh_user;
\q
EOF

# Run Prisma migrations
cd /home/ubuntu/web-ssh/ssh-back
npx prisma migrate deploy
npx prisma generate
```

### 5. Build and Deploy Frontend

```bash
# Build frontend locally or on VPS
cd /home/ubuntu/web-ssh/ssh-front
npm install
npm run build

# Copy build files to nginx directory
sudo cp -r dist/* /var/www/web-ssh/
sudo chown -R www-data:www-data /var/www/web-ssh
```

**Important: Update Frontend API URL**

Before building, make sure your frontend is pointing to the correct backend URL. Check your frontend code (usually in a config file or environment variable) and update it to use your domain/IP with `/api` prefix.

Example in React (vite.config.js or .env):
```env
VITE_API_URL=http://your-domain.com/api
VITE_WS_URL=ws://your-domain.com/ws
```

### 6. Configure Nginx

```bash
# Edit nginx config to add your domain
sudo nano /etc/nginx/sites-available/web-ssh
# Replace "your-domain.com" with your actual domain or IP

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 7. Start the Backend Service

```bash
# Enable service to start on boot
sudo systemctl enable web-ssh

# Start the service
sudo systemctl start web-ssh

# Check status
sudo systemctl status web-ssh
```

### 8. Setup Firewall (Optional but Recommended)

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH access
sudo ufw enable
```

### 9. Setup SSL Certificate (Optional but Recommended)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

## Useful Commands

### Service Management
```bash
# Check service status
sudo systemctl status web-ssh

# View logs (live)
sudo journalctl -u web-ssh -f

# View logs (last 100 lines)
sudo journalctl -u web-ssh -n 100

# Restart service
sudo systemctl restart web-ssh

# Stop service
sudo systemctl stop web-ssh
```

### Nginx Management
```bash
# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# Check nginx status
sudo systemctl status nginx
```

### Database Management
```bash
# Access PostgreSQL
sudo -u postgres psql webssh

# Backup database
pg_dump -U webssh_user webssh > backup.sql

# Restore database
psql -U webssh_user webssh < backup.sql
```

### Redis Management
```bash
# Access Redis CLI
redis-cli

# Check Redis status
sudo systemctl status redis-server
```

## Troubleshooting

### Backend won't start
```bash
# Check logs
sudo journalctl -u web-ssh -n 50

# Check if port 8080 is already in use
sudo netstat -tlnp | grep 8080

# Verify .env file exists and has correct values
cat /home/ubuntu/web-ssh/ssh-back/.env
```

### Frontend shows blank page
```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify build files exist
ls -la /var/www/web-ssh/

# Check browser console for errors
```

### WebSocket connection fails
- Verify nginx WebSocket proxy configuration
- Check that backend is running and accessible on port 8080
- Check browser console for WebSocket errors

### Database connection fails
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
psql -U webssh_user -d webssh -h localhost
```

## Updates and Redeployment

### Update Backend Code
```bash
cd /home/ubuntu/web-ssh
git pull  # If using git
cd ssh-back
npm install --production
sudo systemctl restart web-ssh
```

### Update Frontend Code
```bash
cd /home/ubuntu/web-ssh/ssh-front
git pull  # If using git
npm install
npm run build
sudo cp -r dist/* /var/www/web-ssh/
sudo systemctl reload nginx
```

## Security Recommendations

1. **Use strong passwords** for database and environment variables
2. **Enable firewall** (ufw) and only allow necessary ports
3. **Use SSL/TLS** certificates (Let's Encrypt)
4. **Regular updates**: Keep your system and dependencies updated
5. **Backup regularly**: Database and configuration files
6. **Restrict SSH access**: Use key-based authentication, disable root login
7. **Monitor logs**: Regularly check application and system logs

## Monitoring

### Setup Log Rotation
```bash
# Create logrotate config
sudo nano /etc/logrotate.d/web-ssh
```

Add:
```
/var/log/web-ssh/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
}
```

---

**Need help?** Check the logs first, then review the configuration files.
