import { defineConfig } from 'drizzle-kit'

const base = {
  schema: './src/db/schema.ts',
  out: './drizzle',
}

export default defineConfig(
  process.env.TURSO_AUTH_TOKEN
    ? {
        ...base,
        dialect: 'turso',
        dbCredentials: {
          url: process.env.DATABASE_URL || 'file:local.db',
          authToken: process.env.TURSO_AUTH_TOKEN,
        },
      }
    : {
        ...base,
        dialect: 'sqlite',
        dbCredentials: {
          url: process.env.DATABASE_URL || 'file:local.db',
        },
      }
)
