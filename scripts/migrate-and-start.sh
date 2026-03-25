#!/bin/sh
set -e

# Ensure data directories exist (volume mount may override Dockerfile mkdir)
mkdir -p data/assets data/exports

npx prisma generate
npx tsx scripts/setup-database.ts
npx tsx scripts/initialize.ts
exec node server.js
