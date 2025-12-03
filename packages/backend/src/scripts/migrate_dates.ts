import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Running migration: Add dates to tournaments...')

  try {
    // Add startDate column
    await db.run(sql`ALTER TABLE tournaments ADD COLUMN start_date text`)
    console.log('Added start_date column')
  } catch (e: any) {
    if (e.message.includes('duplicate column name')) {
      console.log('start_date column already exists')
    } else {
      console.error('Error adding start_date:', e)
    }
  }

  try {
    // Add endDate column
    await db.run(sql`ALTER TABLE tournaments ADD COLUMN end_date text`)
    console.log('Added end_date column')
  } catch (e: any) {
    if (e.message.includes('duplicate column name')) {
      console.log('end_date column already exists')
    } else {
      console.error('Error adding end_date:', e)
    }
  }

  console.log('Migration completed.')
}

main().catch(console.error)
