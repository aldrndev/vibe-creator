# VPS Single-Node Deployment

Panduan deploy Vibe Creator ke VPS single-node.

## Prerequisites

- Ubuntu 22.04+ / Debian 12+
- Docker & Docker Compose
- Node.js 20+ & pnpm
- Nginx
- Python 3.10+ (untuk Whisper)

## Quick Start

### 1. Setup VPS

```bash
# Install dependencies
sudo apt update && sudo apt install -y docker.io docker-compose nginx certbot python3-pip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pnpm

# Create app user
sudo useradd -m -s /bin/bash app
sudo usermod -aG docker app
```

### 2. Clone & Configure

```bash
sudo su - app
git clone https://github.com/aldrndev/vibe-creator.git
cd vibe-creator

# Copy env files
cp infra/compose/.env.docker.infra.example infra/compose/.env.docker.infra
cp infra/compose/apps/api/.env.docker.example infra/compose/apps/api/.env.docker

# Edit dengan nilai production
nano infra/compose/.env.docker.infra
nano infra/compose/apps/api/.env.docker
```

### 3. Deploy

```bash
chmod +x infra/deploy/single-node/deploy.sh
./infra/deploy/single-node/deploy.sh --first-run
```

### 4. Setup Nginx & SSL

```bash
# Copy nginx config
sudo cp infra/deploy/single-node/nginx.conf /etc/nginx/sites-available/vibe-creator
sudo ln -s /etc/nginx/sites-available/vibe-creator /etc/nginx/sites-enabled/

# Edit domain
sudo nano /etc/nginx/sites-available/vibe-creator

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Restart nginx
sudo systemctl restart nginx
```

### 5. Setup Whisper (Optional)

```bash
cd ~/vibe-creator
python3 -m venv nenv
source nenv/bin/activate
pip install openai-whisper
```

## Commands

| Command                           | Fungsi            |
| --------------------------------- | ----------------- |
| `sudo systemctl status vibe-api`  | Cek status        |
| `sudo systemctl restart vibe-api` | Restart API       |
| `sudo journalctl -u vibe-api -f`  | View logs         |
| `pnpm docker:prod:ps`             | Status containers |
| `pnpm docker:prod:logs`           | Container logs    |

## Update

```bash
cd ~/vibe-creator
./infra/deploy/single-node/deploy.sh
```

## Backup

Database backup otomatis (setup cron):

```bash
crontab -e
# Add:
0 2 * * * docker exec vibe-creator-db-prod pg_dump -U postgres vibe_creator | gzip > /home/app/backups/db-$(date +\%Y\%m\%d).sql.gz
```

## Troubleshooting

### API tidak jalan

```bash
sudo journalctl -u vibe-api -n 50
```

### Database error

```bash
docker logs vibe-creator-db-prod
docker exec vibe-creator-db-prod pg_isready
```

### Disk penuh

```bash
docker system prune -af
```
