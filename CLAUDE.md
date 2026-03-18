# CLAUDE.md

> Project rules and conventions for AI-assisted development.
> For full architecture reference, see [CODEBASE_CONTEXT.md](./CODEBASE_CONTEXT.md).

## Project Overview

Tournament & competitive gaming platform — Swiss/Round Robin tournaments, 1v1 duels, Elo MMR, RBAC, deck management. Monorepo with ElysiaJS (Bun) backend + React (Vite) frontend.

## Quick Setup

```bash
# Backend
cd packages/backend
bun install
cp .env.example .env        # edit DATABASE_URL if needed
bun run push                 # create tables
bun run src/scripts/seed_admin.ts  # seed roles/permissions/admin user
bun run dev                  # http://localhost:3000

# Frontend
cd packages/frontend
bun install                  # or npm install
cp .env.example .env         # edit VITE_API_URL if needed
bun run dev                  # http://localhost:5173
```

Default admin: `admin` / `root` — change immediately after first login.

## Tech Stack

- **Backend**: Bun + ElysiaJS + Drizzle ORM + libSQL (SQLite/Turso)
- **Frontend**: React 18 + Vite 5 + TailwindCSS 3 + React Router v7
- **Runtime requirement**: Backend requires **Bun** (uses `Bun.password.hash`)

## Key Conventions

### Backend

1. **Permission checks**: Use the utility functions in `src/utils.ts`:
   ```typescript
   import { hasPermission, hasAnyPermission, getUserPermissions } from '../utils'
   await hasPermission(userId, 'duels.manage')
   await hasAnyPermission(userId, ['admin.access', 'duels.manage'])
   ```
   Do NOT inline permission query joins — always use these utilities.

2. **`requesterId` pattern**: Mutating endpoints require the caller's user ID in body/query. Each route independently verifies permissions. There is no auth middleware.

3. **No JWT**: Auth is session-based via localStorage. The backend does not validate tokens.

4. **Soft-delete users**: `passwordHash = 'deleted'` marks deletion. Filter with `passwordHash != 'deleted'` in queries.

5. **Event-driven WebSocket**: After mutations, emit events via `events.emit(EVENTS.X)` in route handlers. Never broadcast WebSocket messages directly.

6. **Database**: Always use Drizzle ORM. Raw SQL only inside `sql` template literals from `drizzle-orm`.

7. **Error responses**: Use `set.status = 4xx; return { error: '...' }`. Do NOT use `throw new Error()`.

### Frontend

1. **WebSocket hook**: Use `useWebSocket()` from `src/hooks/useWebSocket.ts` for all real-time connections. Do NOT create raw WebSocket connections inline.
   ```typescript
   useWebSocket({
     subscriptions: [{ type: 'SUBSCRIBE_TOURNAMENTS' }],
     onMessage: (data) => { if (data.type === 'UPDATE') refresh() },
     enabled: !!selectedGame,
   })
   ```

2. **i18n**: All user-facing strings use `react-i18next`. Translation files in `public/locales/{en,th}/{namespace}.json`. Use `useTranslation('namespace')` hook.

3. **Styling**: TailwindCSS with zinc color palette. Dark theme (bg-zinc-950).

4. **Auth context**: Use `useAuth()` for user/permissions. Use `hasPermission('slug')` for UI gating.

5. **Game context**: Use `useGame()` for selected game. Routes are gated by game selection.

## Environment Variables

### Backend (`packages/backend/.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | `file:local.db` | SQLite file path or Turso URL |
| `TURSO_AUTH_TOKEN` | No | — | Required for remote Turso DB |
| `PORT` | No | `3000` | Server port |
| `CHIBISAFE_URL` | No | — | Chibisafe instance URL for image uploads |
| `CHIBISAFE_API_KEY` | No | — | Chibisafe API key |

### Frontend (`packages/frontend/.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:3000` | Backend API URL |
| `VITE_WS_URL` | No | `ws://localhost:3000/ws` | WebSocket URL |
| `VITE_USE_WEBSOCKETS` | No | `false` | Enable real-time updates |
| `VITE_CHIBISAFE_URL` | No | — | Chibisafe URL for image display |

## Permission Slugs

```
admin.access           — Access admin portal
users.manage           — CRUD users
roles.manage           — CRUD roles & assign permissions
games.manage           — CRUD games
settings.manage        — Modify system settings
tournaments.manage_own — Manage own tournaments
tournaments.manage_all — Manage all tournaments
duels.manage           — Manage all duels
decks.manage           — Manage all decks
```

## File Structure

```
packages/backend/src/
├── index.ts              # App entry, mounts routes + WebSocket
├── utils.ts              # getRank(), hasPermission(), getUserPermissions()
├── db/
│   ├── index.ts          # Drizzle client init
│   └── schema.ts         # All table definitions
├── routes/               # One file per domain (auth, users, tournaments, etc.)
├── services/             # Swiss & Round Robin pairing algorithms
├── lib/
│   ├── events.ts         # EventEmitter bridge for WebSocket
│   └── chibisafe.ts      # Image upload/delete
└── scripts/              # Seed & migration scripts

packages/frontend/src/
├── main.tsx              # Entry point (i18n init)
├── App.tsx               # Router, providers, route guards
├── i18n.ts               # i18next configuration
├── lib/
│   ├── api.ts            # Fetch wrapper
│   ├── auth.tsx          # AuthProvider + useAuth
│   └── utils.ts          # cn() helper
├── contexts/
│   ├── GameContext.tsx    # Game selection state
│   └── SiteSettingsContext.tsx  # Branding, feature flags, default language
├── hooks/
│   ├── useWebSocket.ts   # WebSocket with auto-reconnect
│   ├── useRefresh.ts     # Manual refresh with cooldown
│   └── useFocusRevalidate.ts
├── pages/                # 15 page components
├── components/           # Reusable UI components
└── public/locales/       # i18n translation files (en/, th/)
```

## Do NOT

- Use `throw new Error()` for auth failures in route handlers
- Inline permission check query joins (use `hasPermission()` utility)
- Create raw WebSocket connections in pages (use `useWebSocket` hook)
- Hardcode user-facing strings (use i18n `t()` function)
- Return `passwordHash` in API responses
- Use `window.location.reload()` (use context updates instead)
- Run backend on Node.js (requires Bun runtime)
