// Test if we can use drizzle to query
import { db } from './db'
import { customDecks } from './db/schema'

console.log('Testing drizzle connection to custom_decks...')

try {
  const results = await db.select().from(customDecks).all()
  console.log('Successfully queried custom_decks via drizzle!')
  console.log('Results:', results)
} catch (err) {
  console.error('Failed to query via drizzle:', err)
}

// Try with libsql client directly  
import { createClient } from '@libsql/client'

const client = createClient({ 
  url: process.env.DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN
})

try {
  const result = await client.execute('SELECT * FROM custom_decks')
  console.log('\\nSuccessfully queried via libsql client directly!')
  console.log('Results:', result.rows)
} catch (err) {
  console.error('Failed via libsql client:', err)
}
