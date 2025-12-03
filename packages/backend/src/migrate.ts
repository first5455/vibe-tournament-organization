import { migrate } from 'drizzle-orm/libsql/migrator'
import { db } from './db/index'

async function main() {
  console.log('Running migrations...')
  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('Migrations complete!')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed!', err)
    process.exit(1)
  }
}

main()
