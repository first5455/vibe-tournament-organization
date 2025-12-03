import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Running migration: Add security questions to users...')

  try {
    // Add security_question column
    await db.run(sql`ALTER TABLE users ADD COLUMN security_question text`)
    console.log('Added security_question column')
  } catch (e: any) {
    if (e.message.includes('duplicate column name')) {
      console.log('security_question column already exists')
    } else {
      console.error('Error adding security_question:', e)
    }
  }

  try {
    // Add security_answer_hash column
    await db.run(sql`ALTER TABLE users ADD COLUMN security_answer_hash text`)
    console.log('Added security_answer_hash column')
  } catch (e: any) {
    if (e.message.includes('duplicate column name')) {
      console.log('security_answer_hash column already exists')
    } else {
      console.error('Error adding security_answer_hash:', e)
    }
  }

  console.log('Migration completed.')
}

main().catch(console.error)
