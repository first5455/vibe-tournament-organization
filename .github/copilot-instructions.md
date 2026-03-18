## Project Context

Read `CLAUDE.md` for project rules, conventions, and setup instructions.
Read `CODEBASE_CONTEXT.md` for full architecture, data models, API reference, and known quirks.

## Critical Rules

- **Backend requires Bun runtime** (not Node.js) — uses `Bun.password.hash()`
- **Permission checks**: Always use `hasPermission()` / `hasAnyPermission()` from `packages/backend/src/utils.ts`. Never inline the join query.
- **WebSocket**: Always use `useWebSocket()` hook from `packages/frontend/src/hooks/useWebSocket.ts`. Never create raw WebSocket connections in pages.
- **i18n**: All user-facing strings use `react-i18next` with `useTranslation()`. Translation files in `public/locales/{en,th}/`.
- **Error handling in routes**: Use `set.status = 4xx; return { error: '...' }`. Never `throw new Error()`.
- **Never return `passwordHash`** in API responses.
- **Soft-deleted users**: `passwordHash === 'deleted'`. Always filter these in user-listing queries.
- **No JWT**: Auth relies on `requesterId` in request bodies for permission checks. Each endpoint verifies independently.

## Tech Stack

- Backend: Bun + ElysiaJS + Drizzle ORM + libSQL (SQLite/Turso)
- Frontend: React 18 + Vite 5 + TailwindCSS 3 + React Router v7
- Monorepo: `packages/backend/` and `packages/frontend/`

## Style

- Dark theme with zinc color palette
- TypeScript strict — avoid `any` types
- Prefer `const` over `let`, arrow functions
- Use Drizzle ORM for all database operations
