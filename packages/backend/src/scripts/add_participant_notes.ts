import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Running migration: Add notes to participants...')

  try {
    // Add note column
    await db.run(sql`ALTER TABLE participants ADD COLUMN note text`)
    console.log('Added note column')
  } catch (e: any) {
    if (e.message.includes('duplicate column name')) {
      console.log('note column already exists')
    } else {
      console.error('Error adding note column:', e)
    }
  }

  console.log('Migration completed.')
}

main().catch(console.error)
