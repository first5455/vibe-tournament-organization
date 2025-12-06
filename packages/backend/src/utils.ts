import { db } from './db'
import { users } from './db/schema'
import { sql } from 'drizzle-orm'

export async function getRank(mmr: number): Promise<number> {
  const result = await db.select({
    count: sql<number>`count(*)`
  })
  .from(users)
  .where(sql`${users.mmr} > ${mmr}`)
  .get()

  return (result?.count || 0) + 1
}
