#!/bin/bash
# VPS Single-Node Deploy Script
# Usage: ./deploy.sh [--first-run]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/home/app/vibe-creator"
FIRST_RUN=false

# Parse args
if [[ "$1" == "--first-run" ]]; then
  FIRST_RUN=true
fi

echo -e "${GREEN}=== Vibe Creator Deploy ===${NC}"

# Check if in correct directory
if [[ ! -f "package.json" ]]; then
  echo -e "${RED}Error: Run this script from project root${NC}"
  exit 1
fi

# First run setup
if [[ "$FIRST_RUN" == true ]]; then
  echo -e "${YELLOW}First run setup...${NC}"
  
  # Check env files exist
  if [[ ! -f "infra/compose/.env.docker.infra" ]]; then
    echo -e "${RED}Missing: infra/compose/.env.docker.infra${NC}"
    echo "Run: cp infra/compose/.env.docker.infra.example infra/compose/.env.docker.infra"
    exit 1
  fi
  
  if [[ ! -f "infra/compose/apps/api/.env.docker" ]]; then
    echo -e "${RED}Missing: infra/compose/apps/api/.env.docker${NC}"
    echo "Run: cp infra/compose/apps/api/.env.docker.example infra/compose/apps/api/.env.docker"
    exit 1
  fi
  
  # Install dependencies
  echo "Installing dependencies..."
  pnpm install
  
  # Start infrastructure
  echo "Starting PostgreSQL & Redis..."
  pnpm docker:prod:up
  
  # Wait for DB
  echo "Waiting for database..."
  sleep 10
  
  # Generate Prisma client & push schema
  echo "Setting up database..."
  pnpm db:generate
  cd apps/api && npx prisma db push && cd ../..
  
  # Build
  echo "Building..."
  pnpm build
  
  # Setup systemd service
  echo "Installing systemd service..."
  sudo cp infra/deploy/single-node/vibe-api.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable vibe-api
  sudo systemctl start vibe-api
  
  echo -e "${GREEN}First run complete!${NC}"
  exit 0
fi

# Normal deploy (pull & restart)
echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
pnpm install

echo "Building..."
pnpm build

echo "Running migrations..."
cd apps/api && npx prisma db push && cd ../..

echo "Restarting service..."
sudo systemctl restart vibe-api

echo -e "${GREEN}Deploy complete!${NC}"
echo "Check status: sudo systemctl status vibe-api"
echo "View logs: sudo journalctl -u vibe-api -f"
