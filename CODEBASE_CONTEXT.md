# CODEBASE_CONTEXT.md

> **Auto-generated architectural reference** — v1.4.0 — Last updated: 2026-03-18

---

## 1. Project Overview

This is a **tournament & competitive gaming organization platform** built for managing card-game tournaments (e.g. Union Arena), 1v1 duels, player rankings, and deck management. It supports multiple games via a game-selection system, Swiss and Round Robin tournament formats, Elo-based MMR tracking, and image-based custom deck uploads via Chibisafe.

The primary users are **tournament organizers** (admins who create/manage tournaments, games, and system settings) and **players** (who register, join tournaments, duel, manage decks, and track stats). The application enforces a granular **Role-Based Access Control (RBAC)** system — permissions like `admin.access`, `tournaments.manage_all`, `roles.manage`, etc. are checked server-side on every mutating endpoint.

Core business logic includes: Swiss/Round Robin pairing generation with backtracking to avoid repeat matchups, Elo MMR calculation with K=32, BYE handling, head-to-head tiebreakers, maintenance mode gating, and real-time updates via WebSocket pub/sub.

### v1.4.0 Changes
- **i18n**: Multi-language support (English + Thai) via `react-i18next` with namespace-based translation loading from `/locales/{lng}/{ns}.json`
- **Permission utilities**: Centralized `hasPermission()` / `hasAnyPermission()` / `getUserPermissions()` in `src/utils.ts` — all route handlers refactored to use these
- **WebSocket hook**: `useWebSocket()` hook with auto-reconnect, heartbeat, and topic subscriptions
- **OAuth support**: Provider-agnostic OAuth (Google) via `oauthAccounts` table
- **Site settings**: Admin-configurable branding (site name, logo, footer), feature flags, default language
- **Security**: Auth checks on profile/account endpoints, `requesterId` validation

---

## 2. Tech Stack & Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 18 + TypeScript | SPA with Vite, TailwindCSS, React Router v7, Lucide icons |
| **Backend** | ElysiaJS (Bun runtime) | REST API + WebSocket on a single server |
| **Database** | SQLite via libSQL (Turso) | Drizzle ORM for schema & queries |
| **Image Storage** | Chibisafe | External service for card image uploads/deletions |
| **Deployment** | Docker Compose / Vercel | Backend in Bun container, frontend as static build |
| **PWA** | vite-plugin-pwa + Workbox | Service Worker with cache-first strategy for card images |

### Architecture Pattern

```
┌──────────────────┐     HTTP/WS      ┌──────────────────┐     Drizzle ORM     ┌──────────────┐
│  React Frontend  │ ───────────────▶ │  ElysiaJS API    │ ──────────────────▶ │  libSQL/SQLite│
│  (Vite SPA)      │ ◀─── WebSocket ─ │  (Bun runtime)   │                     │  (Turso)      │
└──────────────────┘                  └──────────────────┘                     └──────────────┘
                                           │
                                           ▼
                                      ┌──────────┐
                                      │ Chibisafe│ (image CDN)
                                      └──────────┘
```

- **No JWT tokens** — Auth is username/password with `Bun.password.hash()`. Sessions stored in `localStorage` with 7-day expiry + `tokenVersion` for server-forced logouts.
- **Real-time** — Single `/ws` WebSocket endpoint with topic-based pub/sub (`leaderboard`, `tournament:{id}`, `duel:{id}`, `duels`, `tournaments`). Backend emits events via a Node `EventEmitter` bridge.

---

## 3. Directory Structure

```
vibe-tournament-organization/
├── docker-compose.yml              # Backend + libSQL server + daily backup service
├── Dockerfile                       # Root (unused, per-package Dockerfiles used)
├── CHANGELOG.md                     # Release notes
│
├── packages/
│   ├── backend/
│   │   ├── package.json             # Bun + Elysia + Drizzle deps
│   │   ├── drizzle.config.ts        # Drizzle Kit config (libSQL driver)
│   │   ├── drizzle/                 # Auto-generated migration files
│   │   ├── src/
│   │   │   ├── index.ts             # App entry: mounts all routes, WebSocket, event listeners
│   │   │   ├── db/
│   │   │   │   ├── index.ts         # Drizzle client init (libSQL)
│   │   │   │   ├── schema.ts        # All 13 table definitions
│   │   │   │   └── migrate_games.ts # One-time data migration script
│   │   │   ├── routes/              # 12 Elysia route modules (one per domain)
│   │   │   ├── services/            # Tournament pairing algorithms
│   │   │   │   ├── swiss.ts         # Swiss pairing with backtracking
│   │   │   │   └── round_robin.ts   # Circle-method Round Robin pairing
│   │   │   ├── lib/
│   │   │   │   ├── events.ts        # EventEmitter + event constants
│   │   │   │   └── chibisafe.ts     # Upload/delete images to Chibisafe CDN
│   │   │   ├── utils.ts             # getRank(), hasPermission(), getUserPermissions()
│   │   │   └── scripts/             # One-off migration/debug scripts
│   │   └── vercel.json              # Vercel deployment config
│   │
│   └── frontend/
│       ├── package.json             # React + Vite + Tailwind deps
│       ├── vite.config.ts           # Vite + React plugin + PWA config
│       ├── tailwind.config.js       # Tailwind config (zinc palette)
│       ├── index.html               # SPA entry point
│       ├── src/
│       │   ├── main.tsx             # ReactDOM.createRoot (imports i18n before App)
│       │   ├── App.tsx              # Router, AuthProvider, GameProvider, route guards
│       │   ├── i18n.ts              # i18next config (HTTP backend, language detector)
│       │   ├── types.ts             # Shared TypeScript interfaces
│       │   ├── lib/
│       │   │   ├── api.ts           # Fetch wrapper with auth headers
│       │   │   ├── auth.tsx         # AuthProvider context + useAuth hook
│       │   │   └── utils.ts         # cn() classname merger (clsx + tailwind-merge)
│       │   ├── contexts/
│       │   │   ├── GameContext.tsx   # GameProvider context + useGame hook
│       │   │   └── SiteSettingsContext.tsx  # Branding, feature flags, default language
│       │   ├── hooks/
│       │   │   ├── useWebSocket.ts        # WebSocket with auto-reconnect + heartbeat
│       │   │   ├── useFocusRevalidate.ts  # Refetch data on window focus
│       │   │   └── useRefresh.ts          # Manual refresh trigger
│       │   ├── pages/               # 15 page-level components
│       │   └── components/          # Reusable components + LanguageSwitcher + ui/ + admin/
│       └── public/locales/          # i18n translation files
│           ├── en/                  # English (11 namespace JSON files)
│           └── th/                  # Thai (11 namespace JSON files)
│       └── vercel.json              # SPA rewrite rules
```

---

## 4. Data Models & Database Schema

All tables defined in `packages/backend/src/db/schema.ts` using Drizzle ORM for SQLite.

### RBAC

```typescript
interface Role {
  id: number
  name: string                    // unique
  description: string | null
  isSystem: boolean               // cannot be deleted if true
  createdAt: string
}

interface Permission {
  id: number
  slug: string                    // e.g. 'admin.access', 'tournaments.manage_all'
  description: string | null
}

// Junction: Role ↔ Permission (many-to-many)
interface RolePermission {
  roleId: number                  // → roles.id
  permissionId: number            // → permissions.id
}
```

### Users & Stats

```typescript
interface User {
  id: number
  username: string                // unique
  displayName: string | null
  passwordHash: string            // Bun.password.hash; 'deleted' = soft-deleted
  securityQuestion: string | null
  securityAnswerHash: string | null
  roleId: number | null           // → roles.id
  color: string                   // hex, default '#ffffff'
  avatarUrl: string | null
  tokenVersion: number            // incremented on force-logout
  createdAt: string
}

interface UserGameStats {
  userId: number                  // → users.id  ┐ composite PK
  gameId: number                  // → games.id  ┘
  mmr: number                     // default 1000
  wins: number
  losses: number
  draws: number
  duelWins: number
  duelLosses: number
  duelDraws: number
  tournamentWins: number
  tournamentLosses: number
  tournamentDraws: number
}
```

### Games

```typescript
interface Game {
  id: number
  name: string
  slug: string | null             // unique
  description: string | null
  imageUrl: string | null
  createdAt: string
}
```

### Tournaments & Matches

```typescript
interface Tournament {
  id: number
  name: string
  status: 'pending' | 'active' | 'completed'
  type: 'swiss' | 'round_robin'
  totalRounds: number             // default 3
  currentRound: number            // default 0
  createdBy: number               // → users.id
  gameId: number | null           // → games.id
  winnerId: number | null         // → users.id
  startDate: string | null
  endDate: string | null
  createdAt: string
}

interface Participant {
  id: number
  tournamentId: number            // → tournaments.id
  userId: number | null           // null for guest players
  guestName: string | null
  score: number
  deckId: number | null           // → decks.id
  tieBreakers: { buchholz: number }
  dropped: boolean
  note: string | null
}

interface Match {
  id: number
  tournamentId: number            // → tournaments.id
  roundNumber: number
  player1Id: number | null        // → participants.id
  player2Id: number | null        // → participants.id
  winnerId: number | null         // → participants.id
  result: string | null           // e.g. "2-0"
  firstPlayerId: number | null    // who went first
  isBye: boolean
  player1MmrChange: number | null
  player2MmrChange: number | null
  createdAt: string
}
```

### Decks

```typescript
interface Deck {
  id: number
  userId: number                  // → users.id
  name: string
  link: string | null
  color: string                   // hex
  gameId: number | null           // → games.id
  createdAt: string
}

interface CustomDeck {
  id: number
  userId: number                  // → users.id
  name: string
  description: string | null
  gameId: number | null           // → games.id
  createdAt: string
  updatedAt: string
}

interface CustomDeckCard {
  id: number
  customDeckId: number            // → customDecks.id (CASCADE delete)
  cardName: string | null
  imageUrl: string                // Chibisafe URL
  chibisafeUuid: string | null    // for deletion via Chibisafe API
  quantity: number
  sortOrder: number
  createdAt: string
}
```

### Duels & Settings

```typescript
interface DuelRoom {
  id: number
  name: string
  status: 'open' | 'ready' | 'active' | 'completed'
  player1Id: number               // → users.id
  player2Id: number | null        // → users.id
  winnerId: number | null         // → users.id
  result: string | null
  player1Note: string | null
  player2Note: string | null
  firstPlayerId: number | null
  rematchRoomId: number | null
  player1MmrChange: number | null
  player2MmrChange: number | null
  player1DeckId: number | null    // → decks.id
  player2DeckId: number | null    // → decks.id
  gameId: number | null           // → games.id
  createdAt: string
}

interface SystemSetting {
  key: string                     // PK: 'maintenance_mode' | 'maintenance_message' |
                                  //     'default_role_id' | 'owner_role_id' |
                                  //     'site_name' | 'site_logo_url' | 'footer_text' |
                                  //     'default_language' | 'enable_oauth' | 'enable_registration'
  value: string
  updatedAt: string
}

interface OAuthAccount {
  id: number
  userId: number                  // → users.id
  provider: string                // e.g. 'google'
  providerAccountId: string       // external user ID
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
}
```

### Entity Relationships

```
User ──1:N──▶ Deck
User ──1:N──▶ CustomDeck ──1:N──▶ CustomDeckCard
User ──1:N──▶ UserGameStats ◀──N:1── Game
User ──M:1──▶ Role ──M:N──▶ Permission
User ──1:N──▶ OAuthAccount
Game ──1:N──▶ Tournament ──1:N──▶ Participant ──1:N──▶ Match
Game ──1:N──▶ DuelRoom
User ──1:N──▶ Participant (or guest via guestName)
```

---

## 5. Core Modules & Component API

### Backend Routes

All routes are Elysia plugins mounted on the main app in `src/index.ts`.

---

#### `routes/auth.ts` — prefix: `/auth`

| Method | Path | Body / Query | Returns | Side Effects |
|--------|------|-------------|---------|-------------|
| `POST` | `/register` | `{ username, password, displayName?, securityQuestion?, securityAnswer? }` | `{ user }` | Creates user, assigns default role, initializes MMR for all games |
| `POST` | `/recovery-question` | `{ username }` | `{ question }` | — |
| `POST` | `/reset-password` | `{ username, securityAnswer, newPassword }` | `{ success }` | Updates password hash |
| `POST` | `/login` | `{ username, password }` | `{ user }` (incl. `assignedRole`, `permissions[]`, `tokenVersion`) | — |
| `PUT`  | `/profile` | `{ userId, username?, displayName?, password?, color?, avatarUrl? }` | `{ user }` | Updates user profile |
| `DELETE` | `/account` | `{ userId }` | `{ success }` | Hard-deletes user (may fail on FK constraints) |

---

#### `routes/users.ts` — prefix: `/users`

| Method | Path | Body / Query | Returns |
|--------|------|-------------|---------|
| `GET` | `/search?q=` | `{ q: string }` | `User[]` (max 10, excludes soft-deleted) |
| `POST` | `/` | `{ requesterId, username, password?, displayName? }` | `{ user }` | Requires `users.create` permission |
| `GET` | `/leaderboard?gameId=` | `{ gameId?: string }` | `LeaderboardEntry[]` (with MMR, rank, stats) |
| `GET` | `/:id` | — | `{ user }` (with stats[], role, permissions) |
| `GET` | `/:id/history?gameId=` | `{ gameId?: string }` | `{ history: TournamentEntry[], duels: DuelEntry[] }` |
| `PUT` | `/:id` | `{ requesterId, displayName?, roleId?, color? }` | `{ user }` | Requires `users.manage` permission |
| `PUT` | `/:id/mmr` | `{ requesterId, gameId, mmr }` | `{ success }` | Admin MMR override |
| `DELETE` | `/:id` | `{ requesterId }` | `{ success }` | Soft-delete (sets `passwordHash='deleted'`) |

---

#### `routes/tournaments.ts` — prefix: `/tournaments`

| Method | Path | Body / Query | Returns | Permission |
|--------|------|-------------|---------|-----------|
| `POST` | `/` | `{ name, createdBy, type?, gameId? }` | `{ tournament }` | `tournaments.create` |
| `GET` | `/?gameId=` | — | `Tournament[]` (with participant count, winner name) | — |
| `GET` | `/:id` | — | `{ tournament }` (with game name) | — |
| `POST` | `/:id/join` | `{ userId, deckId? }` | `{ success }` | Tournament must be `pending` |
| `POST` | `/:id/guests` | `{ name, createdBy }` | `{ success }` | Owner or `tournaments.manage_all` |
| `PUT` | `/:id` | `{ name, createdBy }` | `{ success }` | Owner+`manage_own` or `manage_all` |
| `DELETE` | `/:id` | `{ createdBy }` | `{ success }` | Cascades: matches, participants |
| `POST` | `/:id/start` | `{ createdBy, totalRounds? }` | `{ success }` | Generates Round 1 pairings |
| `POST` | `/:id/next-round` | `{ createdBy }` | `{ success }` | Generates next round (Swiss/RR) |
| `POST` | `/:id/complete` | `{ createdBy }` | `{ success }` | Sets winner, finalizes |
| `GET` | `/:id/participants` | — | `Participant[]` (enriched with user/deck info) |
| `PUT` | `/:id/participants/:pid` | `{ deckId?, note?, dropped? }` | `{ success }` |
| `DELETE` | `/:id/participants/:pid` | `{ createdBy }` | `{ success }` |
| `GET` | `/:id/matches` | — | `Match[]` (enriched with player names) |

---

#### `routes/matches.ts` — prefix: `/matches`

| Method | Path | Body | Returns | Side Effects |
|--------|------|------|---------|-------------|
| `POST` | `/:id/report` | `{ winnerId, result, reportedBy?, firstPlayerId? }` | `{ success }` | Updates scores, Elo MMR, emits `MATCH_REPORTED` |
| `PUT` | `/:id` | `{ winnerId, result, createdBy, firstPlayerId? }` | `{ success }` | Reverts old MMR, recalculates new MMR |

---

#### `routes/duels.ts` — prefix: `/duels`

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET` | `/?admin=&requesterId=&gameId=` | — | `DuelRoom[]` (enriched) |
| `POST` | `/` | `{ player1Id, name?, gameId?, ... }` | `{ duel }` |
| `POST` | `/:id/join` | `{ userId, deckId? }` | `{ success }` |
| `PUT` | `/:id/players` | `{ userId, targetUserId?, deckId }` | `{ success }` |
| `POST` | `/:id/ready` | `{ userId }` | `{ success }` |
| `POST` | `/:id/start` | `{ userId }` | `{ success }` |
| `POST` | `/:id/report` | `{ player1Score, player2Score, reportedBy }` | `{ success }` | Elo MMR update |
| `PUT` | `/:id` | `{ winnerId, result, ... }` | `{ success }` | Admin edit with MMR revert/recalc |
| `DELETE` | `/:id` | `{ userId }` | `{ success }` |
| `POST` | `/:id/rematch` | `{ userId }` | `{ duel }` |
| `PUT` | `/:id/notes` | `{ userId, note }` | `{ success }` |

---

#### `routes/decks.ts` — prefix: `/decks`

| Method | Path | Body / Query | Returns |
|--------|------|-------------|---------|
| `GET` | `/?userId=&gameId=` | — | `Deck[]` (with winRate, totalGames, firstWinRate stats) |
| `POST` | `/` | `{ requesterId, userId, name, link?, color?, gameId }` | `{ deck }` |
| `PUT` | `/:id` | `{ requesterId, name?, link?, color? }` | `{ deck }` |
| `DELETE` | `/:id` | `{ requesterId }` | `{ success }` |

---

#### `routes/custom-decks.ts` — prefix: `/custom-decks`

| Method | Path | Body / Query | Returns |
|--------|------|-------------|---------|
| `POST` | `/upload-image` | `{ requesterId, imageData (base64), fileName? }` | `{ url, uuid }` |
| `GET` | `/?userId=&gameId=` | — | `CustomDeck[]` (with card counts) |
| `GET` | `/admin-all?requesterId=&gameId=` | — | `CustomDeck[]` (all users, requires `custom_decks.view_all`) |
| `GET` | `/:id` | — | `CustomDeck` (with cards array) |
| `POST` | `/` | `{ requesterId, userId, name, description?, gameId? }` | `{ deck }` |
| `PUT` | `/:id` | `{ requesterId, name?, description? }` | `{ deck }` |
| `DELETE` | `/:id` | `{ requesterId }` | `{ success }` | Deletes images from Chibisafe |
| `POST` | `/:id/cards` | `{ requesterId, cardName?, imageUrl, chibisafeUuid?, quantity? }` | `{ card }` |
| `PUT` | `/:id/cards/:cardId` | `{ requesterId, cardName?, quantity?, sortOrder? }` | `{ card }` |
| `DELETE` | `/:id/cards/:cardId` | `{ requesterId }` | `{ success }` |
| `POST` | `/:id/export` | — | `{ deckName, cards[] }` |

---

#### `routes/games.ts` — prefix: `/games`

| Method | Path | Body | Returns | Permission |
|--------|------|------|---------|-----------|
| `GET` | `/` | — | `Game[]` | — |
| `POST` | `/` | `{ name, slug?, description?, imageUrl?, requesterId }` | `Game` | `games.manage` |
| `PUT` | `/:id` | `{ name?, slug?, description?, imageUrl?, requesterId }` | `Game` | `games.manage` |
| `DELETE` | `/:id?requesterId=` | — | `{ success }` | `games.manage` |

---

#### `routes/admin.ts` — prefix: `/admin` (guarded: `admin.access`)

| Method | Path | Query | Returns |
|--------|------|-------|---------|
| `DELETE` | `/data?requesterId=&gameId=` | — | `{ success }` | Wipes tournaments/duels/stats (global or per-game) |
| `POST` | `/reset-leaderboard?requesterId=&gameId=` | — | `{ success }` | Resets MMR to 1000 |
| `POST` | `/force-logout-all?requesterId=` | — | `{ success }` | Increments all `tokenVersion` |

---

#### `routes/roles.ts` — prefix: `/roles`

| Method | Path | Body | Permission |
|--------|------|------|-----------|
| `GET` | `/` | — | — |
| `GET` | `/:id` | — | — (returns role + permissions) |
| `POST` | `/` | `{ name, description?, isSystem?, requesterId }` | `roles.manage` |
| `PUT` | `/:id` | `{ name, description?, isSystem?, requesterId }` | `roles.manage` |
| `DELETE` | `/:id` | `{ requesterId }` | `roles.manage` (blocks system roles) |
| `POST` | `/:id/permissions` | `{ permissionIds[], requesterId }` | `roles.manage` |

---

#### `routes/permissions.ts` — prefix: `/permissions`

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/` | `Permission[]` |

---

#### `routes/settings.ts` — prefix: `/settings`

| Method | Path | Body | Permission |
|--------|------|------|-----------|
| `GET` | `/` | — | — (returns maintenance status, branding, feature flags, default language) |
| `POST` | `/` | `{ userId, maintenanceMode?, maintenanceMessage?, defaultRoleId?, ownerRoleId?, siteName?, siteLogoUrl?, footerText?, defaultLanguage?, enableOAuth?, enableRegistration? }` | `settings.manage` |

---

### Backend Services

#### `services/swiss.ts`
- `generatePairings(tournamentId, roundNumber)` — Sorts by score+MMR, uses recursive backtracking to avoid repeat matchups. Falls back to adjacent pairing if no valid solution.
- `findPairings(pool, playedAgainst, receivedBye)` — Recursive solver. Bye goes to lowest-scored player who hasn't had one.

#### `services/round_robin.ts`
- `generatePairings(tournamentId, roundNumber)` — Circle method. Fixed player at index 0, rotates rest. Handles odd player counts with BYE matches.

### Backend Lib

#### `lib/events.ts`
- `events: EventEmitter` — Bridge between route handlers and WebSocket broadcasting.
- Events: `MATCH_REPORTED`, `TOURNAMENT_UPDATED`, `TOURNAMENT_CREATED`, `TOURNAMENT_DELETED`, `DUEL_UPDATED`, `DUEL_CREATED`

#### `lib/chibisafe.ts`
- `uploadToChibisafe(fileBuffer, fileName) → { url, uuid }` — Uploads image via Chibisafe REST API.
- `deleteFromChibisafe(uuid) → void` — Deletes image by UUID.

---

### Frontend Pages

| Page | Route | Responsibility |
|------|-------|---------------|
| `Login.tsx` | `/login` | Username/password login |
| `Register.tsx` | `/register` | Registration with optional security question |
| `ForgotPassword.tsx` | `/forgot-password` | Password reset via security question |
| `GameSelectPage.tsx` | `/select-game` | Game picker (required before accessing app) |
| `Dashboard.tsx` | `/` | Active/pending tournaments list, create tournament |
| `TournamentView.tsx` | `/tournaments/:id` | Full tournament lifecycle: join, start, pairings, results, standings |
| `Leaderboard.tsx` | `/leaderboard` | MMR rankings for selected game |
| `Profile.tsx` | `/profile` | Edit own profile (name, avatar, color, password) |
| `UserProfilePage.tsx` | `/users/:id` | View any user's profile, stats, match history |
| `DecksPage.tsx` | `/decks` | Manage text-based decks (name, link, color) |
| `CustomDeckUploadPage.tsx` | `/custom-decks` | Image-based deck builder with Chibisafe uploads |
| `DuelDashboard.tsx` | `/duels` | Browse/create 1v1 duel rooms |
| `DuelRoom.tsx` | `/duels/:id` | Duel lifecycle: join, ready, start, report, rematch |
| `AdminPortal.tsx` | `/admin` | Admin panel: user/role/permission/game/settings management |
| `MaintenancePage.tsx` | (conditional) | Shown when maintenance mode is enabled |

### Frontend Components

| Component | Purpose |
|-----------|---------|
| `Layout.tsx` | Sidebar nav, header, game switcher, responsive shell |
| `GameSwitcher.tsx` | Dropdown to switch active game |
| `MatchCard.tsx` | Renders a single match with score reporting UI |
| `DeckCard.tsx` | Deck display card with win-rate stats |
| `DeckModal.tsx` | Create/edit deck modal |
| `UserAvatar.tsx` | Renders user avatar with fallback initials |
| `UserLabel.tsx` | Colored username display |
| `UserSearchSelect.tsx` | Searchable user picker (debounced API search) |
| `UserProfileDialog.tsx` | Quick-view user profile popup |
| `ProfileSettingsDialog.tsx` | Profile edit dialog |
| `CreateUserDialog.tsx` | Admin: create new user |
| `EditMMRDialog.tsx` | Admin: override user MMR |

---

## 6. Global State & Context

### AuthProvider (`lib/auth.tsx`)

```typescript
interface AuthContextType {
  user: User | null
  login(token: string, user: User): void
  logout(): void
  updateUser(user: Partial<User>): void
  refreshUser(): Promise<void>
  isLoading: boolean
}
```

- **Storage**: `localStorage` keys: `token`, `user` (JSON), `sessionExpiry` (7-day TTL).
- **Init**: On mount, rehydrates from `localStorage`, then calls `GET /users/:id` to refresh permissions.
- **Force Logout**: Compares `tokenVersion` — if server incremented it (via admin), user is logged out.
- **`useAuth()` hook**: Returns context + `hasPermission(slug: string): boolean`.

### GameProvider (`contexts/GameContext.tsx`)

```typescript
interface GameContextType {
  games: Game[]
  selectedGame: Game | null
  setSelectedGame(game: Game): void
  refreshGames(): Promise<void>
  isLoading: boolean
}
```

- **Storage**: `localStorage` key: `selectedGameId`.
- **Init**: Fetches `GET /games`, restores selected game from storage or defaults to first.
- **Gate**: `ProtectedRoute` redirects to `/select-game` if no game is selected.

### API Client (`lib/api.ts`)

```typescript
function api(path: string, options?: RequestInit): Promise<any>
```

- Base URL from `VITE_API_URL` env var (default `http://localhost:3000`).
- Attaches `Authorization: Bearer {token}` from `localStorage`.
- `cache: 'no-store'` on all requests.

### WebSocket (`hooks/useWebSocket.ts`)

```typescript
useWebSocket({
  subscriptions: [{ type: 'SUBSCRIBE_TOURNAMENTS' }],
  onMessage: (data) => { if (data.type === 'UPDATE') refresh() },
  enabled: !!selectedGame,
})
```

- Centralized hook with auto-reconnect, heartbeat (`PING`/`PONG`), and cleanup.
- Subscribe by passing subscription objects; hook sends them on connect.
- On update messages, callback triggers REST refresh.
- Enabled via `VITE_USE_WEBSOCKETS=true` env var.

### i18n (`i18n.ts`)

- Uses `react-i18next` with `i18next-http-backend` for runtime translation loading.
- Translations loaded from `/locales/{lng}/{ns}.json` (11 namespaces: common, auth, dashboard, leaderboard, duel, decks, profile, game, maintenance, tournament, admin).
- Language detection: localStorage → navigator fallback.
- Admin-configurable default language via `system_settings.default_language`.

---

## 7. Known Quirks & Rules

1. **Always use Drizzle ORM** for all database queries — never use raw SQL strings except inside `sql` template literals from `drizzle-orm`.

2. **Permission checks are server-side only**. The frontend uses `hasPermission()` for UI gating, but every mutating backend endpoint independently verifies permissions by looking up the requester's role → permissions chain. Never trust the client.

3. **`requesterId` / `createdBy` pattern**: Most mutating endpoints require the caller to send their own user ID in the body/query. This is used for permission lookups. There is no middleware-level auth — each route handler does its own check.

4. **Soft-delete for users**: Setting `passwordHash = 'deleted'` marks a user as soft-deleted. Queries filter these out with `passwordHash != 'deleted'`. The admin "wipe data" endpoint hard-deletes these.

5. **MMR is per-game**: The `userGameStats` table holds separate MMR/W/L/D records per game. When a new game is created, stats rows are initialized for all existing users. When a new user registers, stats are created for all existing games.

6. **BYE matches** are auto-won (score goes to the real player) but should **not** count toward deck winrate calculations.

7. **Tournament type matters**: Swiss uses backtracking pairing to avoid repeat matchups; Round Robin uses circle method. The `type` field on the tournament determines which `services/` module is called.

8. **Event-driven WebSocket updates**: After any mutation (match report, tournament start, duel update), the route handler emits an event via `events.emit()`. The event listener in `index.ts` broadcasts to the appropriate WebSocket topic. Never broadcast directly from route handlers.

9. **Chibisafe integration**: Card images are uploaded to an external Chibisafe instance. UUIDs are stored in `customDeckCards.chibisafeUuid` for cleanup on deletion. Ensure `CHIBISAFE_URL` and `CHIBISAFE_API_KEY` env vars are set.

10. **No JWT auth flow**: Despite storing a `token` key in localStorage, the app does not use JWTs for API authentication. The backend does not validate tokens — it relies on `userId`/`requesterId` in request bodies. Auth is effectively trust-based with client-side session management.

11. **Head-to-head tiebreaker**: In Round Robin, when two players share the same score, the winner of their direct match ranks higher. This is handled in the frontend sorting logic (`TournamentView.tsx`).

12. **Maintenance mode**: When enabled via `systemSettings`, all non-admin users see the `MaintenancePage`. Auth routes (`/login`, `/register`, `/forgot-password`) and `/admin` are exempt.

13. **Bun runtime required**: The backend uses `Bun.password.hash()` and `Bun.password.verify()` — it will not run on Node.js.
