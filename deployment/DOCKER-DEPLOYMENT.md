# Docker Deployment Guide for Web SSH

Complete guide for deploying Web SSH application using Docker on your VPS.

## Prerequisites

- VPS with Docker and Docker Compose installed
- SSH access to VPS (root@srv991231)
- Domain name (optional, can use IP)

## Project Structure

```
web-ssh/
├── ssh-back/                    # Backend service
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
├── ssh-front/                   # Frontend service
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── nginx.conf
│   └── src/
├── nginx/                       # Nginx reverse proxy config
│   ├── nginx.conf
│   └── conf.d/
│       └── web-ssh.conf
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
└── .env.production             # Production environment variables
```

## Quick Start

### 1. Install Docker on VPS

```bash
# SSH into your VPS
ssh root@srv991231

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 2. Upload Project to VPS

**Option A: Using Git (Recommended)**
```bash
# On VPS
cd /home/ubuntu
git clone <your-repo-url> web-ssh
cd web-ssh
```

**Option B: Using SCP**
```bash
# From your local machine
scp -r D:\react\web-ssh root@srv991231:/home/ubuntu/
```

**Option C: Using rsync (Best for updates)**
```bash
# From your local machine
rsync -avz --exclude 'node_modules' --exclude '.git' \
  D:/react/web-ssh/ root@srv991231:/home/ubuntu/web-ssh/
```

### 3. Configure Environment Variables

```bash
# On VPS
cd /home/ubuntu/web-ssh

# Copy and edit production environment file
cp .env.production .env
nano .env
```

**Update these values in `.env`:**
```env
POSTGRES_USER=webssh
POSTGRES_PASSWORD=your_very_secure_password_here
POSTGRES_DB=webssh
MASTER_KEY=your_32_byte_hex_master_key_generate_new_one
JWT_SECRET=your_random_jwt_secret_generate_new_one
```

**Generate secure keys:**
```bash
# Generate MASTER_KEY (32-byte hex)
openssl rand -hex 32

# Generate JWT_SECRET
openssl rand -base64 48
```

### 4. Update Configuration

**Update Nginx config with your domain:**
```bash
nano nginx/conf.d/web-ssh.conf
# Change: server_name _;
# To:     server_name your-domain.com;
```

**Update Frontend API URL (if needed):**
```bash
# Create frontend environment file
nano ssh-front/.env.production
```

Add:
```env
VITE_API_URL=/api
VITE_WS_URL=/ws
```

### 5. Build and Deploy

```bash
cd /home/ubuntu/web-ssh

# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
```

### 6. Run Database Migrations

```bash
# Run Prisma migrations
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# (Optional) Generate Prisma client if needed
docker compose -f docker-compose.prod.yml exec backend npx prisma generate
```

### 7. Verify Deployment

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Test backend
curl http://localhost/api/health

# Test frontend
curl http://localhost
```

## Service Management

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100
```

### Restart Services
```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart nginx
```

### Stop Services
```bash
# Stop all services
docker compose -f docker-compose.prod.yml stop

# Stop specific service
docker compose -f docker-compose.prod.yml stop backend
```

### Start Services
```bash
# Start all services
docker compose -f docker-compose.prod.yml start

# Start specific service
docker compose -f docker-compose.prod.yml start backend
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart (zero-downtime)
docker compose -f docker-compose.prod.yml up -d --build

# Or rebuild specific service
docker compose -f docker-compose.prod.yml up -d --build backend
```

## SSL/HTTPS Setup

### Option 1: Using Let's Encrypt with Certbot

```bash
# Install certbot
apt-get install -y certbot

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Get certificate
certbot certonly --standalone -d your-domain.com

# Certificate will be at:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# Update docker-compose.prod.yml to mount certificates
```

Add to nginx service in `docker-compose.prod.yml`:
```yaml
nginx:
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

Update `nginx/conf.d/web-ssh.conf` to enable HTTPS section.

```bash
# Restart nginx
docker compose -f docker-compose.prod.yml up -d nginx
```

### Option 2: Manual SSL Certificates

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificates
cp /path/to/cert.pem nginx/ssl/
cp /path/to/key.pem nginx/ssl/

# Update nginx config to enable HTTPS section
nano nginx/conf.d/web-ssh.conf
```

## Backup and Restore

### Backup Database

```bash
# Create backup directory
mkdir -p backups

# Backup PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U webssh webssh > backups/webssh-$(date +%Y%m%d-%H%M%S).sql

# Or using docker exec
docker exec web-ssh-postgres pg_dump -U webssh webssh \
  > backups/webssh-$(date +%Y%m%d-%H%M%S).sql
```

### Restore Database

```bash
# Restore from backup
cat backups/webssh-20240121-120000.sql | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U webssh -d webssh
```

### Backup Volumes

```bash
# Backup all volumes
docker run --rm \
  -v web-ssh_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz /data

docker run --rm \
  -v web-ssh_redis_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/redis-data-$(date +%Y%m%d).tar.gz /data
```

## Monitoring

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Specific container stats
docker stats web-ssh-backend web-ssh-frontend web-ssh-nginx
```

### Health Checks

```bash
# Check container health
docker compose -f docker-compose.prod.yml ps

# Inspect specific container health
docker inspect --format='{{json .State.Health}}' web-ssh-backend | jq
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check specific service
docker compose -f docker-compose.prod.yml logs backend

# Check container status
docker compose -f docker-compose.prod.yml ps
```

### Database Connection Issues

```bash
# Check database is running
docker compose -f docker-compose.prod.yml ps postgres

# Connect to database
docker compose -f docker-compose.prod.yml exec postgres psql -U webssh

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres
```

### Frontend Shows Blank Page

```bash
# Check frontend logs
docker compose -f docker-compose.prod.yml logs frontend

# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx

# Verify build files exist
docker compose -f docker-compose.prod.yml exec frontend ls -la /usr/share/nginx/html
```

### Backend API Not Responding

```bash
# Check backend logs
docker compose -f docker-compose.prod.yml logs backend

# Check if backend is listening
docker compose -f docker-compose.prod.yml exec backend netstat -tulpn | grep 8080

# Test backend directly
docker compose -f docker-compose.prod.yml exec backend wget -O- http://localhost:8080/health
```

### Port Already in Use

```bash
# Check what's using port 80
netstat -tulpn | grep :80

# Or use lsof
lsof -i :80

# Kill the process or change docker-compose ports
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Remove stopped containers
docker container prune
```

## Maintenance

### Update Docker Images

```bash
# Pull latest base images
docker compose -f docker-compose.prod.yml pull postgres redis

# Rebuild with new base images
docker compose -f docker-compose.prod.yml build --pull

# Restart with new images
docker compose -f docker-compose.prod.yml up -d
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Full cleanup (careful!)
docker system prune -a --volumes
```

### Auto-restart on System Reboot

Services are configured with `restart: unless-stopped`, so they will automatically start on system reboot.

To verify:
```bash
# Reboot VPS
reboot

# After reboot, check services
docker compose -f docker-compose.prod.yml ps
```

## Security Best Practices

1. **Use strong passwords** in `.env` file
2. **Enable firewall**:
   ```bash
   ufw allow 22/tcp    # SSH
   ufw allow 80/tcp    # HTTP
   ufw allow 443/tcp   # HTTPS
   ufw enable
   ```
3. **Enable SSL/HTTPS** in production
4. **Regular backups** of database and volumes
5. **Keep Docker updated**: `apt-get update && apt-get upgrade`
6. **Monitor logs** regularly
7. **Limit container resources** if needed:
   ```yaml
   backend:
     deploy:
       resources:
         limits:
           cpus: '1'
           memory: 1G
   ```

## Performance Optimization

### Enable Docker Buildkit

```bash
# Add to /etc/environment
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1
```

### Use Docker Layer Caching

Already implemented in Dockerfiles with proper layer ordering.

### Limit Logs

```bash
# Add to docker-compose.prod.yml for each service
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Useful Commands Reference

```bash
# View all containers
docker ps -a

# View all images
docker images

# View all volumes
docker volume ls

# View all networks
docker network ls

# Execute command in container
docker compose -f docker-compose.prod.yml exec backend sh

# Copy files from container
docker cp web-ssh-backend:/app/logs ./logs

# Copy files to container
docker cp ./config.json web-ssh-backend:/app/

# View container details
docker inspect web-ssh-backend

# View real-time resource usage
docker stats

# Export container as image
docker commit web-ssh-backend web-ssh-backup:latest
```

## Production Checklist

- [ ] Update `.env` with secure credentials
- [ ] Configure domain in nginx config
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Test all features
- [ ] Set up monitoring (optional: Prometheus, Grafana)
- [ ] Document any custom configurations
- [ ] Test backup and restore procedures

---

**Need help?** Check logs first, then review container status and network connectivity.
