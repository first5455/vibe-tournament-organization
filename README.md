# Vibe Tournament Organization

A modern tournament organization platform built for speed and flexibility.

> This project was made by **Google Antigravity** using **AI Vibe Coding** with **Gemini 3 Pro** + **Claude 4.5**.

> NOTE: This Project is use for fun. Don't expected for any updated and many bugs

## Tech Stack

### Backend
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
![ElysiaJS](https://img.shields.io/badge/ElysiaJS-23c45e?style=for-the-badge&logo=elysia&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)

*   **Runtime**: Bun
*   **Framework**: ElysiaJS
*   **Database**: SQLite (LibSQL / Turso)
*   **ORM**: Drizzle ORM

### Frontend
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

*   **Framework**: React 18
*   **Build Tool**: Vite 5
*   **Styling**: Tailwind CSS 3
*   **Language**: TypeScript
*   **i18n**: react-i18next (English + Thai)

## Structure

```
vibe-tournament-organization/
├── packages/
│   ├── backend/    # ElysiaJS API server, Database schema & migrations
│   └── frontend/   # React + Vite application
├── docker-compose.yml
├── setup.sh        # Cross-platform setup script
├── CLAUDE.md       # AI assistant rules (Claude Code)
├── .cursorrules    # AI assistant rules (Cursor)
├── .windsurfrules  # AI assistant rules (Windsurf)
├── CODEBASE_CONTEXT.md  # Full architecture reference
└── README.md
```

## Prerequisites

- [Bun](https://bun.sh) (required for backend — uses `Bun.password.hash`)

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
```

## Quick Setup

### One-command setup (Linux/macOS/Git Bash)

```bash
./setup.sh
```

This will install deps, create `.env` files, push the DB schema, and seed the admin user.

### Manual setup

#### Backend

```bash
cd packages/backend
bun install
cp .env.example .env        # edit if needed
bun run push                 # create database tables
bun run src/scripts/seed_admin.ts  # seed roles, permissions, admin user
bun run dev                  # http://localhost:3000
```

#### Frontend

```bash
cd packages/frontend
bun install                  # or: npm install
cp .env.example .env         # edit VITE_API_URL if backend port differs
bun run dev                  # http://localhost:5173
```

Default admin login: `admin` / `root` — **change immediately after first login**.

## Environment Variables

### Backend (`packages/backend/.env`)

```env
PORT=3000                    # Server port
DATABASE_URL=file:local.db   # SQLite file or Turso URL
TURSO_AUTH_TOKEN=            # Required for remote Turso DB
CHIBISAFE_URL=               # Chibisafe instance for image uploads
CHIBISAFE_API_KEY=           # Chibisafe API key
```

### Frontend (`packages/frontend/.env`)

```env
VITE_API_URL=http://localhost:3000    # Backend API URL
VITE_WS_URL=ws://localhost:3000/ws   # WebSocket URL
VITE_USE_WEBSOCKETS=false            # Enable real-time updates
VITE_CHIBISAFE_URL=                  # Chibisafe URL for image display
```

## Docker

```bash
docker compose up -d
```

This starts the backend (port 8080), libSQL database server, and a daily backup service.

For the frontend, build and serve separately or use the frontend Dockerfile:

```bash
cd packages/frontend
docker build --build-arg VITE_API_URL=https://your-api.com --build-arg VITE_WS_URL=wss://your-api.com/ws -t tournament-frontend .
```

## AI-Assisted Development

This project includes configuration files for multiple AI coding assistants:

| File | IDE/Tool |
|------|----------|
| `CLAUDE.md` | Claude Code (Anthropic) |
| `.cursorrules` | Cursor |
| `.windsurfrules` | Windsurf |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `CODEBASE_CONTEXT.md` | Shared architecture reference (all tools) |

All AI config files reference `CLAUDE.md` and `CODEBASE_CONTEXT.md` as the source of truth. When updating project conventions, update `CLAUDE.md` — the other files point to it.

## License

This project is licensed under the **WTFPL** (Do What The Fuck You Want To Public License) - see the [LICENSE](LICENSE) file for details.
