import { defineConfig, type Config } from 'drizzle-kit'

const base = {
  schema: './src/db/schema.ts',
  out: './drizzle',
}

let config: Config

if (process.env.TURSO_AUTH_TOKEN) {
  config = {
    ...base,
    dialect: 'turso',
    dbCredentials: {
      url: process.env.DATABASE_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    },
  }
} else {
  config = {
    ...base,
    dialect: 'sqlite',
    // driver: 'first_driver_if_needed', // Optional: might need 'turso' driver if not using dialect? No, dialect 'sqlite' is fine.
    dbCredentials: {
      url: process.env.DATABASE_URL || 'file:local.db',
    },
  }
}

export default defineConfig(config)
