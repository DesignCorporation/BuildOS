# BuildOS - Deployment Guide

Complete guide for deploying BuildOS to production.

---

## Table of Contents

1. [Server Requirements](#server-requirements)
2. [Initial Server Setup](#initial-server-setup)
3. [GitHub Configuration](#github-configuration)
4. [Production Deployment](#production-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Maintenance](#maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Server Requirements

### Minimum Specifications
- **OS:** Ubuntu 24.04 LTS (Noble)
- **RAM:** 4GB (8GB recommended)
- **Disk:** 50GB SSD
- **CPU:** 2 cores (4 cores recommended)
- **Network:** Static IP, open ports 80, 443

### Pre-installed
- Docker 29+ & Docker Compose v5+
- Nginx 1.24+
- Certbot 2.9+
- Git 2.43+

---

## Initial Server Setup

### 1. Clone Repository

```bash
# Create production directory
sudo mkdir -p /opt/buildos
sudo chown -R $USER:$USER /opt/buildos

# Clone repository
cd /opt/buildos
git clone git@github.com:DesignCorporation/BuildOS.git .
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required variables:**
```env
POSTGRES_USER=buildos
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=buildos_prod

REDIS_PASSWORD=<redis-password>

MINIO_ROOT_USER=buildos
MINIO_ROOT_PASSWORD=<minio-password>

NEXTAUTH_SECRET=<32-char-secret>
NEXTAUTH_URL=https://buildos.designcorp.eu

IMAGE_TAG=latest
```

### 3. Setup SSL Certificates

```bash
cd /opt/buildos/infra/nginx
sudo bash setup-ssl.sh
```

This script will:
- Create temporary Nginx config for ACME challenge
- Request SSL certificates from Let's Encrypt
- Install final Nginx configs with SSL
- Reload Nginx

**Certificates for:**
- buildos.designcorp.eu
- operator.buildos.designcorp.eu

### 4. Install systemd Unit

```bash
cd /opt/buildos/infra/systemd
sudo bash install.sh
```

This enables BuildOS to:
- Start automatically on boot
- Restart on failure
- Be managed via `systemctl`

### 5. Start BuildOS

```bash
sudo systemctl start buildos
sudo systemctl status buildos
```

Check logs:
```bash
journalctl -u buildos -f
```

---

## GitHub Configuration

### 1. Repository Secrets

Go to: https://github.com/DesignCorporation/BuildOS/settings/secrets/actions

Add the following secrets:

| Secret | Value | Description |
|--------|-------|-------------|
| `PROD_HOST` | `188.34.201.9` | Production server IP |
| `PROD_USER` | `root` | SSH user |
| `PROD_PATH` | `/opt/buildos` | Project path on server |
| `PROD_SSH_KEY` | `<private-key>` | SSH private key for deployment |

**Generate deployment SSH key:**
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/buildos_deploy
cat ~/.ssh/buildos_deploy.pub  # Add to server's authorized_keys
cat ~/.ssh/buildos_deploy       # Add to PROD_SSH_KEY secret
```

### 2. Enable GitHub Container Registry (GHCR)

Images will be pushed to: `ghcr.io/designcorporation/buildos`

No additional configuration needed - uses `GITHUB_TOKEN` automatically.

---

## Production Deployment

### Automated Deployment (Recommended)

Every push to `main` branch triggers automatic deployment:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

**Pipeline steps:**
1. ✅ Lint & Test
2. 🐳 Build Docker image
3. 📦 Push to GHCR
4. 🚀 Deploy to server
5. 🔄 Run migrations
6. ✅ Health check

### Manual Deployment

If needed, deploy manually:

```bash
# SSH to server
ssh root@188.34.201.9

# Navigate to project
cd /opt/buildos

# Pull latest code
git pull origin main

# Pull latest image
docker compose -f docker-compose.prod.yml pull

# Run migrations
docker compose -f docker-compose.prod.yml run --rm web npx prisma migrate deploy

# Restart services
sudo systemctl restart buildos

# Or use docker compose directly
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

---

## CI/CD Pipeline

### Workflows

#### 1. `deploy.yml` (Production Deploy)
**Trigger:** Push to `main`

**Jobs:**
- Test → Build → Deploy

**Features:**
- Automated testing
- Docker image caching
- Zero-downtime deployment
- Health checks

#### 2. `pr-check.yml` (Pull Request Checks)
**Trigger:** PR to `main` or `develop`

**Jobs:**
- Lint & Test
- Security scan (Trivy)

### Monitoring Deployments

View deployments:
- https://github.com/DesignCorporation/BuildOS/actions

Check production logs:
```bash
# SSH to server
ssh root@188.34.201.9

# View BuildOS logs
journalctl -u buildos -f

# View container logs
cd /opt/buildos
docker compose -f docker-compose.prod.yml logs -f web
```

---

## Maintenance

### Update SSL Certificates

Certificates renew automatically via certbot timer.

Manual renewal:
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Database Backup

```bash
# Create backup directory
mkdir -p /opt/buildos/backups

# Backup database
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U buildos buildos_prod > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U buildos buildos_prod < backups/backup_20260102_120000.sql
```

### Update Docker Images

```bash
cd /opt/buildos

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart services
sudo systemctl restart buildos

# Cleanup old images
docker image prune -f
```

### View Logs

```bash
# systemd logs
journalctl -u buildos -f

# Docker logs (all services)
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f postgres
docker compose -f docker-compose.prod.yml logs -f redis
```

### Restart Services

```bash
# Restart all services
sudo systemctl restart buildos

# Restart specific service (zero-downtime)
cd /opt/buildos
docker compose -f docker-compose.prod.yml restart web

# Force recreate
docker compose -f docker-compose.prod.yml up -d --force-recreate web
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status buildos

# Check Docker status
docker ps -a

# Check logs
journalctl -u buildos -n 50

# Verify environment file
cat /opt/buildos/.env
```

### Database Connection Issues

```bash
# Check postgres container
docker compose -f docker-compose.prod.yml ps postgres

# Test connection
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U buildos -d buildos_prod -c "SELECT 1;"

# Check DATABASE_URL
docker compose -f docker-compose.prod.yml exec web \
  printenv DATABASE_URL
```

### Nginx Issues

```bash
# Test config
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/buildos.error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Renew manually
sudo certbot renew --dry-run
sudo certbot renew

# Recreate certificate
sudo certbot delete --cert-name buildos.designcorp.eu
cd /opt/buildos/infra/nginx
sudo bash setup-ssl.sh
```

### Deployment Failed

```bash
# Check GitHub Actions logs
# https://github.com/DesignCorporation/BuildOS/actions

# Verify SSH access
ssh root@188.34.201.9

# Check disk space
df -h

# Check Docker space
docker system df

# Cleanup if needed
docker system prune -a --volumes
```

### Application Errors

```bash
# View application logs
docker compose -f docker-compose.prod.yml logs -f web

# Execute shell in container
docker compose -f docker-compose.prod.yml exec web sh

# Check health endpoint
curl https://buildos.designcorp.eu/api/health

# Restart application
docker compose -f docker-compose.prod.yml restart web
```

---

## Quick Reference

### Common Commands

```bash
# Start BuildOS
sudo systemctl start buildos

# Stop BuildOS
sudo systemctl stop buildos

# Restart BuildOS
sudo systemctl restart buildos

# View status
sudo systemctl status buildos

# View logs
journalctl -u buildos -f

# Manual container management
cd /opt/buildos
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml restart web
docker compose -f docker-compose.prod.yml logs -f
```

### File Locations

```
/opt/buildos/                          # Project root
├── .env                               # Environment variables
├── docker-compose.prod.yml            # Production compose file
├── backups/                           # Database backups
└── infra/
    ├── nginx/                         # Nginx configs
    └── systemd/                       # systemd unit

/etc/nginx/sites-available/            # Nginx vhosts
/etc/letsencrypt/live/                 # SSL certificates
/etc/systemd/system/buildos.service   # systemd unit
/var/log/nginx/                        # Nginx logs
```

---

## Support

- **Documentation:** https://github.com/DesignCorporation/BuildOS/tree/main/docs
- **Issues:** https://github.com/DesignCorporation/BuildOS/issues
- **Email:** info@designcorp.eu
