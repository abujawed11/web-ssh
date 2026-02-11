# Web SSH - Quick Deployment Guide

Choose your deployment method:

## 🐳 Docker Deployment (Recommended)

**Easiest and most portable deployment method**

### Quick Start

1. **Upload to VPS:**
   ```bash
   # From local machine
   rsync -avz --exclude 'node_modules' --exclude '.git' \
     . root@srv991231:/home/ubuntu/web-ssh/
   ```

2. **Deploy:**
   ```bash
   # On VPS
   cd /home/ubuntu/web-ssh
   chmod +x deployment/docker-deploy.sh
   sudo deployment/docker-deploy.sh
   ```

3. **Done!** Your app is running at `http://your-vps-ip`

📖 **Full Guide:** [deployment/DOCKER-DEPLOYMENT.md](deployment/DOCKER-DEPLOYMENT.md)

---

## 📦 Systemd Deployment (Traditional)

**Direct deployment without Docker**

### Quick Start

1. **Upload to VPS:**
   ```bash
   scp -r ssh-back root@srv991231:/home/ubuntu/web-ssh/
   scp -r deployment root@srv991231:/home/ubuntu/web-ssh/
   ```

2. **Deploy:**
   ```bash
   # On VPS
   cd /home/ubuntu/web-ssh/deployment
   chmod +x deploy.sh
   sudo ./deploy.sh
   ```

3. **Build frontend:**
   ```bash
   cd /home/ubuntu/web-ssh/ssh-front
   npm install && npm run build
   sudo cp -r dist/* /var/www/web-ssh/
   ```

4. **Start services:**
   ```bash
   sudo systemctl start web-ssh
   sudo systemctl reload nginx
   ```

📖 **Full Guide:** [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md)

---

## 📋 What's Included

### Docker Files
- `ssh-back/Dockerfile` - Backend container
- `ssh-front/Dockerfile` - Frontend container (multi-stage)
- `docker-compose.prod.yml` - Production configuration
- `nginx/` - Nginx reverse proxy configs
- `.env.production` - Environment template

### Systemd Files
- `deployment/web-ssh.service` - Systemd service
- `deployment/nginx-web-ssh.conf` - Nginx config
- `deployment/deploy.sh` - Auto deployment script

### Documentation
- `deployment/DOCKER-DEPLOYMENT.md` - Complete Docker guide
- `deployment/DEPLOYMENT.md` - Complete systemd guide

---

## 🚀 Architecture

### Docker Setup
```
Internet → Nginx (port 80/443)
           ↓
           ├─→ Frontend (React/Vite)
           ├─→ Backend API (/api → Node.js:8080)
           └─→ WebSocket (/ws → Node.js:8080)
                ↓
                ├─→ PostgreSQL
                └─→ Redis
```

### Systemd Setup
```
Internet → Nginx (port 80/443)
           ↓
           ├─→ Frontend (/var/www/web-ssh/)
           └─→ Backend API & WS → Node.js:8080
                                   ↓
                                   ├─→ PostgreSQL
                                   └─→ Redis
```

---

## 🔐 Security Checklist

- [ ] Change default passwords in `.env`
- [ ] Generate secure MASTER_KEY: `openssl rand -hex 32`
- [ ] Generate secure JWT_SECRET: `openssl rand -base64 48`
- [ ] Enable firewall (ports 22, 80, 443)
- [ ] Set up SSL/HTTPS (Let's Encrypt recommended)
- [ ] Disable root SSH login
- [ ] Set up automated backups

---

## 📞 Support

- **Docker Issues**: See [deployment/DOCKER-DEPLOYMENT.md](deployment/DOCKER-DEPLOYMENT.md)
- **Systemd Issues**: See [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md)
- **General Issues**: Check logs and troubleshooting sections

---

## 🎯 Quick Commands

### Docker
```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart
docker compose -f docker-compose.prod.yml restart

# Update
docker compose -f docker-compose.prod.yml up -d --build

# Backup DB
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U webssh webssh > backup.sql
```

### Systemd
```bash
# View logs
sudo journalctl -u web-ssh -f

# Restart
sudo systemctl restart web-ssh

# Status
sudo systemctl status web-ssh
```

---

**Choose Docker** if you want easy deployment, isolation, and portability.
**Choose Systemd** if you prefer traditional deployment or have specific requirements.
