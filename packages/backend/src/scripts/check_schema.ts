import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  const result = await db.run(sql`PRAGMA table_info(tournaments)`)
  console.log('Table Info:', result)
}

main()
