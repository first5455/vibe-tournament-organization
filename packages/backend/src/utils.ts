import { db } from './db'
import { users, userGameStats } from './db/schema'
import { sql, and, eq } from 'drizzle-orm'

export async function getRank(mmr: number, gameId?: number): Promise<number> {
  if (!gameId) return 0;

  const result = await db.select({
    count: sql<number>`count(*)`
  })
  .from(userGameStats)
  .where(and(eq(userGameStats.gameId, gameId), sql`${userGameStats.mmr} > ${mmr}`))
  .get()

  return (result?.count || 0) + 1
}
