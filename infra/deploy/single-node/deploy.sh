#!/bin/bash
# VPS Single-Node Deploy Script (Full Containerized)
# Usage: ./deploy.sh [--first-run]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
  echo -e "${YELLOW}First run setup (full containerized)...${NC}"
  
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
  
  # Build & start all containers (PostgreSQL, Redis, API)
  echo "Building and starting all containers..."
  pnpm docker:prod:up:build
  
  # Wait for services to be healthy
  echo "Waiting for services..."
  sleep 15
  
  # Run migrations inside container
  echo "Running database migrations..."
  docker exec vibe-creator-api-prod npx prisma db push
  
  echo -e "${GREEN}First run complete!${NC}"
  echo ""
  echo "Services:"
  pnpm docker:prod:ps
  echo ""
  echo "View logs: pnpm docker:prod:logs"
  exit 0
fi

# Normal deploy (pull, rebuild, restart)
echo "Pulling latest code..."
git pull origin main

echo "Rebuilding containers..."
pnpm docker:prod:up:build

echo "Running migrations..."
docker exec vibe-creator-api-prod npx prisma db push

echo -e "${GREEN}Deploy complete!${NC}"
echo ""
echo "Status:"
pnpm docker:prod:ps
echo ""
echo "View logs: pnpm docker:prod:logs"
