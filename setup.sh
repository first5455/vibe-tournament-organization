#!/usr/bin/env bash
# Cross-platform setup script for Vibe Tournament Organization
# Works on Linux, macOS, and Windows (Git Bash/WSL)

set -e

echo "=== Vibe Tournament Organization - Setup ==="
echo ""

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo "ERROR: Bun is required but not installed."
    echo "Install it from: https://bun.sh"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "[OK] Bun $(bun --version) found"

# Backend setup
echo ""
echo "--- Setting up Backend ---"
cd packages/backend

echo "[1/4] Installing dependencies..."
bun install

if [ ! -f .env ]; then
    echo "[2/4] Creating .env from .env.example..."
    cp .env.example .env
    echo "      Edit packages/backend/.env if you need to change DATABASE_URL or PORT"
else
    echo "[2/4] .env already exists, skipping"
fi

echo "[3/4] Pushing database schema..."
bun run push

echo "[4/4] Seeding admin user and permissions..."
bun run src/scripts/seed_admin.ts

echo "[OK] Backend ready! Default login: admin / root"

# Frontend setup
cd ../../packages/frontend

echo ""
echo "--- Setting up Frontend ---"

echo "[1/2] Installing dependencies..."
bun install

if [ ! -f .env ]; then
    echo "[2/2] Creating .env from .env.example..."
    cp .env.example .env
    echo "      Edit packages/frontend/.env if your backend runs on a different port"
else
    echo "[2/2] .env already exists, skipping"
fi

echo "[OK] Frontend ready!"

cd ../..

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start development:"
echo "  Terminal 1: cd packages/backend  && bun run dev"
echo "  Terminal 2: cd packages/frontend && bun run dev"
echo ""
echo "Backend:  http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo ""
echo "IMPORTANT: Change the default admin password (admin/root) after first login!"
