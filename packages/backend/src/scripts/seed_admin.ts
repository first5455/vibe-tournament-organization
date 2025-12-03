import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

async function main() {
  console.log('Seeding admin user...')
  
  const username = 'admin'
  const password = 'root'
  
  const existingUser = await db.select().from(users).where(eq(users.username, username)).get()
  
  if (existingUser) {
    console.log('Admin user already exists, updating role...')
    await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, existingUser.id))
      .run()
  } else {
    console.log('Creating admin user...')
    const passwordHash = await Bun.password.hash(password)
    await db.insert(users).values({
      username,
      passwordHash,
      role: 'admin',
    }).run()
  }
  
  console.log('Admin user seeded successfully!')
  process.exit(0)
}

main().catch(console.error)
